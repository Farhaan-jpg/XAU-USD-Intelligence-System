// server/engines/priceEngine.js
// Sub-Second Real-Time Price Streaming Engine for XAU/USD & Correlated Assets
// Connects directly to TradingView's live quote WebSocket for OANDA:XAUUSD & TVC:SILVER
// with seamless multi-tier HTTP fallback (GoldAPI, Binance PAXG, Yahoo Finance)

const WebSocket = require('ws');
const axios = require('axios');
const YahooFinanceClass = require('yahoo-finance2').default;
const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });
const config = require('../config');

// Time-sampled rolling price buffer — records snapshots every 2s for up to 4 hours (up to 7,200 points)
const priceHistory = {};
const MAX_HISTORY_MS = 4 * 60 * 60 * 1000;

function recordPriceSample(sym, price) {
  if (!price || isNaN(price)) return;
  const now = Date.now();
  if (!priceHistory[sym]) priceHistory[sym] = [];
  const hist = priceHistory[sym];
  const last = hist[hist.length - 1];
  if (!last || (now - last.ts >= 2000) || (Math.abs(price - last.price) / (last.price || 1)) > 0.0004) {
    hist.push({ price, ts: now });
    const cutoff = now - MAX_HISTORY_MS;
    while (hist.length > 0 && hist[0].ts < cutoff) {
      hist.shift();
    }
  }
}

function getChangeSince(sym, msAgo, currentPrice, high, low) {
  const hist = priceHistory[sym];
  if (!hist || hist.length === 0 || !currentPrice) {
    return { ch: 0, chp: 0, open: currentPrice, close: currentPrice, high, low };
  }
  const now = Date.now();
  const targetTs = now - msAgo;
  let entry = hist.find((p) => p.ts >= targetTs);
  if (!entry) entry = hist[0];
  const diff = currentPrice - entry.price;
  const pct = entry.price > 0 ? (diff / entry.price) * 100 : 0;
  return {
    ch: parseFloat(diff.toFixed(2)),
    chp: parseFloat(pct.toFixed(2)),
    open: entry.price,
    close: currentPrice,
    high,
    low,
  };
}

async function seedHistoricalPrices() {
  try {
    const queryOptions = {
      period1: Math.floor((Date.now() - MAX_HISTORY_MS) / 1000),
      interval: '5m',
    };
    const chart = await yahooFinance.chart('GC=F', queryOptions).catch(() => null);
    if (chart && chart.quotes && chart.quotes.length > 0) {
      if (!priceHistory['GC=F']) priceHistory['GC=F'] = [];
      chart.quotes.forEach((q) => {
        if (q.close && q.date) {
          priceHistory['GC=F'].push({ price: parseFloat(q.close.toFixed(2)), ts: new Date(q.date).getTime() });
        }
      });
      console.log(`[PRICE] Seeded ${chart.quotes.length} historical 5m bars for GC=F`);
    }
  } catch (_) {}
}

// Display metadata for each symbol
const INSTRUMENT_META = {
  'GC=F':     { label: 'XAU/USD', description: 'Gold Spot (OANDA)', unit: 'USD/oz', correlation: 'primary' },
  'SI=F':     { label: 'XAG/USD', description: 'Silver Spot (TVC)', unit: 'USD/oz', correlation: 'direct' },
  'DX-Y.NYB': { label: 'DXY', description: 'US Dollar Index', unit: 'pts', correlation: 'inverse' },
  '^TNX':     { label: 'US10Y', description: '10-Year Treasury Yield', unit: '%', correlation: 'inverse' },
  '^IRX':     { label: 'US02Y', description: '2-Year Treasury Yield', unit: '%', correlation: 'inverse' },
  'JPY=X':    { label: 'USD/JPY', description: 'Dollar Yen', unit: 'pts', correlation: 'mixed' },
  'CL=F':     { label: 'OIL', description: 'WTI Crude Oil', unit: 'USD/bbl', correlation: 'direct' },
};

let io = null;
let pollTimer = null;
let latestPrices = {};
let isRunning = false;
let tvStreamer = null;
let lastWsTickTime = 0;
let broadcastThrottleTimer = null;

function init(socketIo) {
  io = socketIo;
}

/**
 * Throttle socket broadcast to max 4 times per second to keep frontend ultra-responsive
 * without swamping the browser React render loop
 */
function scheduleBroadcast() {
  if (broadcastThrottleTimer) return;
  broadcastThrottleTimer = setTimeout(() => {
    broadcastThrottleTimer = null;
    if (io) {
      io.emit('price_update', {
        prices: latestPrices,
        serverTime: new Date().toISOString(),
      });
    }
  }, 250);
}

/**
 * Real-Time TradingView WebSocket Streamer
 * Connects directly to TradingView's quote session for OANDA:XAUUSD and TVC:SILVER
 * Provides sub-second live ticks matching the workstation chart
 */
class TVStreamer {
  constructor(symbols) {
    this.symbols = symbols;
    this.ws = null;
    this.sessionId = 'qs_' + Math.random().toString(36).substring(2, 10);
    this.reconnectTimer = null;
    this.isClosed = false;
    this.intervalChanges = {};
    this.connect();
  }

  sendRaw(str) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(str);
    }
  }

  send(m, p) {
    const msg = JSON.stringify({ m, p });
    this.sendRaw(`~m~${msg.length}~m~${msg}`);
  }

  connect() {
    if (this.isClosed) return;
    try {
      this.ws = new WebSocket('wss://data.tradingview.com/socket.io/websocket', {
        headers: {
          'Origin': 'https://s.tradingview.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      this.ws.on('open', () => {
        console.log('[TV-STREAM] Connected to live TradingView quote stream for all assets');
        this.send('set_auth_token', ['unauthorized_user_token']);
        this.send('quote_create_session', [this.sessionId]);
        this.send('quote_set_fields', [
          this.sessionId,
          'lp', 'bid', 'ask', 'ch', 'chp', 'high_price', 'low_price', 'open_price', 'volume', 'prev_close_price'
        ]);
        this.send('quote_add_symbols', [this.sessionId, ...this.symbols]);
      });

      this.ws.on('message', (data) => {
        const raw = data.toString();
        const chunks = raw.split(/~m~\d+~m~/).filter(Boolean);
        for (const chunk of chunks) {
          if (chunk.startsWith('~h~')) {
            // Heartbeat pong must be sent raw: ~m~length~m~~h~id
            this.sendRaw(`~m~${chunk.length}~m~${chunk}`);
            continue;
          }
          try {
            const parsed = JSON.parse(chunk);
            if (parsed.m === 'qsd' && parsed.p && parsed.p[1]) {
              const sym = parsed.p[1].n;
              const v = parsed.p[1].v;
              this.handleTick(sym, v);
            }
          } catch (_) {}
        }
      });

      this.ws.on('close', (code, reason) => {
        if (!this.isClosed) {
          console.log(`[TV-STREAM] Stream closed (code ${code}), reconnecting in 2s...`);
          this.reconnectTimer = setTimeout(() => this.connect(), 2000);
        }
      });

      this.ws.on('error', (err) => {
        console.warn('[TV-STREAM] WebSocket notice:', err.message);
      });
    } catch (err) {
      console.error('[TV-STREAM] Connection setup error:', err.message);
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    }
  }
  handleTick(sym, v) {
    if (!v) return;
    lastWsTickTime = Date.now();

    const isGold = sym.includes('XAUUSD');
    const isSilver = sym.includes('SILVER') || sym.includes('XAGUSD');

    if (isGold) {
      const existing = latestPrices['GC=F'] || {};
      const newPrice = v.lp ? parseFloat(v.lp.toFixed(2)) : (v.bid && v.ask ? parseFloat(((v.bid + v.ask) / 2).toFixed(2)) : (v.bid ? parseFloat(v.bid.toFixed(2)) : existing.price));
      if (!newPrice) return;

      const bid = v.bid ? parseFloat(v.bid.toFixed(2)) : (existing.bid || newPrice);
      const ask = v.ask ? parseFloat(v.ask.toFixed(2)) : (existing.ask || newPrice);
      const high = v.high_price ? parseFloat(v.high_price.toFixed(2)) : (existing.high ? Math.max(existing.high, newPrice) : newPrice);
      const low = v.low_price ? parseFloat(v.low_price.toFixed(2)) : (existing.low ? Math.min(existing.low, newPrice) : newPrice);
      const open = v.open_price ? parseFloat(v.open_price.toFixed(2)) : (existing.open || newPrice);
      const chp = v.chp !== undefined ? parseFloat(v.chp.toFixed(2)) : (existing.changeDay || 0);
      const ch = v.ch !== undefined ? parseFloat(v.ch.toFixed(2)) : (existing.changeAbs || 0);

      // Time-sampled buffer
      recordPriceSample('GC=F', newPrice);

      // Compute rolling interval changes from time-sampled price history
      this.intervalChanges = {
        '1': getChangeSince('GC=F', 60 * 1000, newPrice, high, low),
        '5': getChangeSince('GC=F', 5 * 60 * 1000, newPrice, high, low),
        '15': getChangeSince('GC=F', 15 * 60 * 1000, newPrice, high, low),
        '60': getChangeSince('GC=F', 60 * 60 * 1000, newPrice, high, low),
        '240': getChangeSince('GC=F', 240 * 60 * 1000, newPrice, high, low),
        'D': { ch, chp, open, high, low, close: newPrice },
      };

      const change5m = this.intervalChanges['5']?.chp ?? 0;
      const dayRange = Math.max(1, high - low);
      const priceLocation = newPrice > 0 ? parseFloat(((newPrice - low) / dayRange).toFixed(4)) : 0.5;
      const pivotP = parseFloat(((high + low + newPrice) / 3).toFixed(2));

      const goldData = {
        symbol: 'GC=F',
        label: 'XAU/USD',
        description: 'Spot Gold (OANDA:XAUUSD)',
        unit: 'USD/oz',
        correlation: 'primary',
        price: newPrice,
        change5m: parseFloat(change5m.toFixed(4)),
        changeDay: chp,
        changeAbs: ch,
        bid,
        ask,
        high,
        low,
        open,
        priceLocation,
        pivotP,
        volume: v.volume || existing.volume || 0,
        direction: change5m > 0.0005 ? 'UP' : change5m < -0.0005 ? 'DOWN' : 'FLAT',
        updatedAt: new Date().toISOString(),
        latency: 'REALTIME_WEBSOCKET',
        source: 'OANDA:XAUUSD_STREAM',
        intervals: { ...this.intervalChanges },
      };

      latestPrices['GC=F'] = goldData;
      latestPrices['XAUUSD'] = goldData;
      
      // Update real-time retail sentiment flow with live gold price
      try {
        const cotEngine = require('./cotEngine');
        cotEngine.updateWithLivePrice(newPrice, goldData.change5m);
      } catch (_) {}

      // Track post-event price impact on high-impact catalysts
      try {
        const eventImpactTracker = require('../utils/eventImpactTracker');
        const calendarEngine = require('./calendarEngine');
        const calData = calendarEngine.getData();
        if (calData && calData.events) {
          eventImpactTracker.checkEvents(calData.events, newPrice);
        }
      } catch (_) {}

      scheduleBroadcast();
    } else if (isSilver) {
      const existing = latestPrices['SI=F'] || {};
      const newPrice = v.lp ? parseFloat(v.lp.toFixed(2)) : (v.bid && v.ask ? parseFloat(((v.bid + v.ask) / 2).toFixed(2)) : (v.bid ? parseFloat(v.bid.toFixed(2)) : existing.price));
      if (!newPrice) return;

      const bid = v.bid ? parseFloat(v.bid.toFixed(2)) : (existing.bid || newPrice);
      const ask = v.ask ? parseFloat(v.ask.toFixed(2)) : (existing.ask || newPrice);
      const high = v.high_price ? parseFloat(v.high_price.toFixed(2)) : (existing.high ? Math.max(existing.high, newPrice) : newPrice);
      const low = v.low_price ? parseFloat(v.low_price.toFixed(2)) : (existing.low ? Math.min(existing.low, newPrice) : newPrice);
      const open = v.open_price ? parseFloat(v.open_price.toFixed(2)) : (existing.open || newPrice);
      const chp = v.chp !== undefined ? parseFloat(v.chp.toFixed(2)) : (existing.changeDay || 0);
      const ch = v.ch !== undefined ? parseFloat(v.ch.toFixed(2)) : (existing.changeAbs || 0);

      recordPriceSample('SI=F', newPrice);
      const change5mEntry = getChangeSince('SI=F', 5 * 60 * 1000, newPrice, high, low);
      const change5m = change5mEntry.chp;

      const silverData = {
        symbol: 'SI=F',
        label: 'XAG/USD',
        description: 'Spot Silver (TVC:SILVER)',
        unit: 'USD/oz',
        correlation: 'direct',
        price: newPrice,
        change5m: parseFloat(change5m.toFixed(4)),
        changeDay: chp,
        changeAbs: ch,
        bid,
        ask,
        high,
        low,
        open,
        volume: v.volume || existing.volume || 0,
        direction: change5m > 0.0005 ? 'UP' : change5m < -0.0005 ? 'DOWN' : 'FLAT',
        updatedAt: new Date().toISOString(),
        latency: 'REALTIME_WEBSOCKET',
        source: 'TVC:SILVER_STREAM',
      };

      latestPrices['SI=F'] = silverData;
      latestPrices['XAGUSD'] = silverData;
      scheduleBroadcast();
    } else {
      // Real-time macro stream: DXY, US10Y, US02Y, USDJPY, USOIL
      const symbolMap = {
        'TVC:DXY': 'DX-Y.NYB',
        'TVC:US10Y': '^TNX',
        'TVC:US02Y': '^IRX',
        'OANDA:USDJPY': 'JPY=X',
        'TVC:USOIL': 'CL=F',
      };
      const targetSymbol = symbolMap[sym];
      if (!targetSymbol) return;

      const isYield = targetSymbol.includes('TNX') || targetSymbol.includes('IRX');
      const decimals = isYield ? 3 : 2;
      const existing = latestPrices[targetSymbol] || {};
      const newPrice = v.lp !== undefined && v.lp !== null ? parseFloat(v.lp.toFixed(decimals)) :
        (v.bid && v.ask ? parseFloat(((v.bid + v.ask) / 2).toFixed(decimals)) : existing.price);
      if (newPrice === undefined || isNaN(newPrice)) return;

      const bid = v.bid !== undefined && v.bid !== null ? parseFloat(v.bid.toFixed(decimals)) : (existing.bid || newPrice);
      const ask = v.ask !== undefined && v.ask !== null ? parseFloat(v.ask.toFixed(decimals)) : (existing.ask || newPrice);
      const high = v.high_price ? parseFloat(v.high_price.toFixed(decimals)) : (existing.high ? Math.max(existing.high, newPrice) : newPrice);
      const low = v.low_price ? parseFloat(v.low_price.toFixed(decimals)) : (existing.low ? Math.min(existing.low, newPrice) : newPrice);
      const open = v.open_price ? parseFloat(v.open_price.toFixed(decimals)) : (existing.open || newPrice);
      const chp = v.chp !== undefined ? parseFloat(v.chp.toFixed(2)) : (existing.changeDay || 0);
      const ch = v.ch !== undefined ? parseFloat(v.ch.toFixed(decimals)) : (existing.changeAbs || 0);

      recordPriceSample(targetSymbol, newPrice);
      const change5mEntry = getChangeSince(targetSymbol, 5 * 60 * 1000, newPrice, high, low);
      const change5m = change5mEntry.chp;
      const meta = INSTRUMENT_META[targetSymbol] || {};

      latestPrices[targetSymbol] = {
        symbol: targetSymbol,
        label: meta.label || targetSymbol,
        description: meta.description || sym,
        unit: meta.unit || '',
        correlation: meta.correlation || 'unknown',
        price: newPrice,
        change5m: parseFloat(change5m.toFixed(4)),
        changeDay: chp,
        changeAbs: ch,
        bid,
        ask,
        high,
        low,
        open,
        volume: v.volume || existing.volume || 0,
        direction: change5m > 0.0005 ? 'UP' : change5m < -0.0005 ? 'DOWN' : 'FLAT',
        updatedAt: new Date().toISOString(),
        latency: 'REALTIME_WEBSOCKET',
        source: `${sym}_STREAM`,
      };
      scheduleBroadcast();
    }
  }

  stop() {
    this.isClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
  }
}

/**
 * HTTP Fallback Spot Gold Fetcher
 */
async function fetchLiveGoldSpot() {
  // Tier 1: TradingView OANDA scanner
  try {
    const res = await axios.get('https://scanner.tradingview.com/symbol?symbol=OANDA:XAUUSD&fields=close,change,change_abs,open,high,low,volume,bid,ask', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/'
      },
      timeout: 2500,
    });
    const d = res.data;
    if (d && (d.bid || d.close)) {
      const bid = d.bid || d.close;
      const ask = d.ask || d.close;
      const price = (d.bid && d.ask) ? (d.bid + d.ask) / 2 : (d.close || d.bid);
      return {
        price: parseFloat(price.toFixed(2)),
        bid: parseFloat(bid.toFixed(2)),
        ask: parseFloat(ask.toFixed(2)),
        high: parseFloat((d.high || price).toFixed(2)),
        low: parseFloat((d.low || price).toFixed(2)),
        open: parseFloat((d.open || price).toFixed(2)),
        changeDay: typeof d.change === 'number' ? parseFloat(d.change.toFixed(2)) : 0,
        changeAbs: typeof d.change_abs === 'number' ? parseFloat(d.change_abs.toFixed(2)) : 0,
        volume: d.volume || 0,
        source: 'OANDA:XAUUSD_SCANNER',
      };
    }
  } catch (_) {}

  // Tier 2: Gold-API.com live spot
  try {
    const res = await axios.get('https://api.gold-api.com/price/XAU', { timeout: 2500 });
    if (res.data?.price) {
      const p = parseFloat(res.data.price);
      return {
        price: parseFloat(p.toFixed(2)),
        bid: parseFloat(p.toFixed(2)),
        ask: parseFloat(p.toFixed(2)),
        high: parseFloat(p.toFixed(2)),
        low: parseFloat(p.toFixed(2)),
        open: parseFloat(p.toFixed(2)),
        changeDay: 0,
        changeAbs: 0,
        volume: 0,
        source: 'GOLD_API',
      };
    }
  } catch (_) {}

  // Tier 3: Binance PAXGUSDT spot proxy
  try {
    const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT', { timeout: 2000 });
    if (res.data?.price) {
      const p = parseFloat(res.data.price);
      return {
        price: parseFloat(p.toFixed(2)),
        bid: parseFloat(p.toFixed(2)),
        ask: parseFloat(p.toFixed(2)),
        high: parseFloat(p.toFixed(2)),
        low: parseFloat(p.toFixed(2)),
        open: parseFloat(p.toFixed(2)),
        changeDay: 0,
        changeAbs: 0,
        volume: 0,
        source: 'BINANCE_PAXG',
      };
    }
  } catch (_) {}

  return null;
}

/**
 * HTTP Fallback Spot Silver Fetcher
 */
async function fetchLiveSilverSpot() {
  try {
    const res = await axios.get('https://scanner.tradingview.com/symbol?symbol=TVC:SILVER&fields=close,change,change_abs,open,high,low,volume,bid,ask', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/'
      },
      timeout: 2500,
    });
    const d = res.data;
    if (d && (d.bid || d.close)) {
      const bid = d.bid || d.close;
      const ask = d.ask || d.close;
      const price = (d.bid && d.ask) ? (d.bid + d.ask) / 2 : (d.close || d.bid);
      return {
        price: parseFloat(price.toFixed(2)),
        bid: parseFloat(bid.toFixed(2)),
        ask: parseFloat(ask.toFixed(2)),
        high: parseFloat((d.high || price).toFixed(2)),
        low: parseFloat((d.low || price).toFixed(2)),
        open: parseFloat((d.open || price).toFixed(2)),
        changeDay: typeof d.change === 'number' ? parseFloat(d.change.toFixed(2)) : 0,
        changeAbs: typeof d.change_abs === 'number' ? parseFloat(d.change_abs.toFixed(2)) : 0,
        volume: d.volume || 0,
        source: 'TVC:SILVER_SCANNER',
      };
    }
  } catch (_) {}

  try {
    const res = await axios.get('https://api.gold-api.com/price/XAG', { timeout: 2500 });
    if (res.data?.price) {
      const p = parseFloat(res.data.price);
      return {
        price: parseFloat(p.toFixed(2)),
        bid: parseFloat(p.toFixed(2)),
        ask: parseFloat(p.toFixed(2)),
        high: parseFloat(p.toFixed(2)),
        low: parseFloat(p.toFixed(2)),
        open: parseFloat(p.toFixed(2)),
        changeDay: 0,
        changeAbs: 0,
        volume: 0,
        source: 'GOLD_API',
      };
    }
  } catch (_) {}

  return null;
}

/**
 * Periodic macro polling & fallback aggregator
 */
async function fetchAllPrices() {
  const macroSymbols = ['DX-Y.NYB', '^TNX', '^IRX', 'JPY=X', 'CL=F'];
  const results = {};

  const wsActive = Date.now() - lastWsTickTime < 10000;

  // Gold & Silver stream sub-second via WebSocket when active (HTTP fallback only if inactive).
  // Macro instruments (DXY, 10Y, 2Y, USDJPY, OIL) are ALWAYS polled concurrently every cycle to guarantee zero delays.
  const promises = [
    wsActive ? Promise.resolve(null) : fetchLiveGoldSpot(),
    wsActive ? Promise.resolve(null) : fetchLiveSilverSpot(),
    ...macroSymbols.map((sym) => yahooFinance.quote(sym).catch(() => null)),
  ];

  const [goldSpotRes, silverSpotRes, ...yahooQuotes] = await Promise.allSettled(promises);

  // If WebSocket was inactive, apply HTTP spot fallback for Gold & Silver
  if (!wsActive) {
    const liveGold = goldSpotRes.status === 'fulfilled' ? goldSpotRes.value : null;
    const liveSilver = silverSpotRes.status === 'fulfilled' ? silverSpotRes.value : null;

    if (liveGold?.price) {
      const goldPrice = liveGold.price;
      recordPriceSample('GC=F', goldPrice);
      const change5mEntry = getChangeSince('GC=F', 5 * 60 * 1000, goldPrice, liveGold.high, liveGold.low);
      const change5m = change5mEntry.chp;

      const prevIntervals = latestPrices['GC=F']?.intervals || {};
      const changeDayVal = liveGold.changeDay || (latestPrices['GC=F']?.changeDay || 0);
      const changeAbsVal = liveGold.changeAbs || 0;

      const goldData = {
        symbol: 'GC=F',
        label: 'XAU/USD',
        description: 'Spot Gold (OANDA:XAUUSD)',
        unit: 'USD/oz',
        correlation: 'primary',
        price: goldPrice,
        change5m: parseFloat(change5m.toFixed(4)),
        changeDay: changeDayVal,
        changeAbs: changeAbsVal,
        bid: liveGold.bid || goldPrice,
        ask: liveGold.ask || goldPrice,
        high: liveGold.high || goldPrice,
        low: liveGold.low || goldPrice,
        open: liveGold.open || goldPrice,
        volume: liveGold.volume || 0,
        direction: change5m > 0.0005 ? 'UP' : change5m < -0.0005 ? 'DOWN' : 'FLAT',
        updatedAt: new Date().toISOString(),
        latency: 'REALTIME_HTTP',
        source: liveGold.source || 'HTTP_FALLBACK',
        intervals: {
          '1': prevIntervals['1'] || { ch: 0, chp: 0 },
          '5': prevIntervals['5'] || { ch: parseFloat(((goldPrice * change5m) / 100).toFixed(2)), chp: parseFloat(change5m.toFixed(2)) },
          '15': prevIntervals['15'] || { ch: 0, chp: 0 },
          '60': prevIntervals['60'] || { ch: 0, chp: 0 },
          '240': prevIntervals['240'] || { ch: 0, chp: 0 },
          'D': { ch: changeAbsVal, chp: changeDayVal },
        },
      };
      results['GC=F'] = goldData;
      results['XAUUSD'] = goldData;
    }

    if (liveSilver?.price) {
      const silverPrice = liveSilver.price;
      recordPriceSample('SI=F', silverPrice);
      const change5mEntry = getChangeSince('SI=F', 5 * 60 * 1000, silverPrice, liveSilver.high, liveSilver.low);
      const change5m = change5mEntry.chp;

      const silverData = {
        symbol: 'SI=F',
        label: 'XAG/USD',
        description: 'Spot Silver (TVC:SILVER)',
        unit: 'USD/oz',
        correlation: 'direct',
        price: silverPrice,
        change5m: parseFloat(change5m.toFixed(4)),
        changeDay: liveSilver.changeDay || (latestPrices['SI=F']?.changeDay || 0),
        changeAbs: liveSilver.changeAbs || 0,
        bid: liveSilver.bid || silverPrice,
        ask: liveSilver.ask || silverPrice,
        high: liveSilver.high || silverPrice,
        low: liveSilver.low || silverPrice,
        open: liveSilver.open || silverPrice,
        volume: liveSilver.volume || 0,
        direction: change5m > 0.0005 ? 'UP' : change5m < -0.0005 ? 'DOWN' : 'FLAT',
        updatedAt: new Date().toISOString(),
        latency: 'REALTIME_HTTP',
        source: liveSilver.source || 'HTTP_FALLBACK',
      };
      results['SI=F'] = silverData;
      results['XAGUSD'] = silverData;
    }
  }

  // Process Macro Correlation Instruments from Yahoo Finance
  macroSymbols.forEach((symbol, index) => {
    const quoteResult = yahooQuotes[index];
    const quote = quoteResult.status === 'fulfilled' ? quoteResult.value : null;

    if (!quote) {
      if (latestPrices[symbol]) {
        results[symbol] = { ...latestPrices[symbol], stale: true };
      }
      return;
    }

    const existing = latestPrices[symbol] || {};
    const hasRecentWsTick = existing.updatedAt && (Date.now() - new Date(existing.updatedAt).getTime() < 4000) && existing.latency === 'REALTIME_WEBSOCKET';

    const currentPrice = (hasRecentWsTick && existing.price) ? existing.price : (quote?.regularMarketPrice || existing.price || 0);
    if (currentPrice <= 0) return;

    recordPriceSample(symbol, currentPrice);
    const change5mEntry = getChangeSince(symbol, 5 * 60 * 1000, currentPrice, currentPrice, currentPrice);
    const change5m = change5mEntry.chp;
    const meta = INSTRUMENT_META[symbol] || {};
    const changeDay = quote?.regularMarketChangePercent !== undefined 
      ? parseFloat(quote.regularMarketChangePercent.toFixed(2)) 
      : (existing.changeDay || 0);

    results[symbol] = {
      symbol,
      label: meta.label || symbol,
      description: meta.description || '',
      unit: meta.unit || '',
      correlation: meta.correlation || 'unknown',
      price: parseFloat(currentPrice.toFixed(symbol.includes('TNX') || symbol.includes('IRX') ? 3 : 2)),
      change5m: parseFloat(change5m.toFixed(4)),
      changeDay,
      bid: hasRecentWsTick ? (existing.bid || quote?.bid || currentPrice) : (quote?.bid || currentPrice),
      ask: hasRecentWsTick ? (existing.ask || quote?.ask || currentPrice) : (quote?.ask || currentPrice),
      high: Math.max(quote?.regularMarketDayHigh || currentPrice, currentPrice, existing.high || currentPrice),
      low: Math.min(quote?.regularMarketDayLow || currentPrice, currentPrice, existing.low || currentPrice),
      volume: quote?.regularMarketVolume || existing.volume || 0,
      direction: change5m > 0.0005 ? 'UP' : change5m < -0.0005 ? 'DOWN' : 'FLAT',
      updatedAt: new Date().toISOString(),
      latency: hasRecentWsTick ? 'REALTIME_WEBSOCKET' : 'REALTIME_HTTP',
      source: hasRecentWsTick ? (existing.source || 'TVC_STREAM') : (quote?.source || 'YAHOO_FINANCE'),
    };
  });

  return results;
}

async function poll() {
  try {
    const prices = await fetchAllPrices();
    latestPrices = { ...latestPrices, ...prices };
    scheduleBroadcast();
  } catch (err) {
    console.error('[PRICE] Polling error:', err.message);
  }
}

function start() {
  if (isRunning) return;
  isRunning = true;
  console.log('[PRICE] Real-time sub-second WebSocket tick streamer starting...');

  // Start live TradingView quote WebSocket for all 7 assets
  if (!tvStreamer) {
    tvStreamer = new TVStreamer([
      'OANDA:XAUUSD',
      'TVC:SILVER',
      'TVC:DXY',
      'TVC:US10Y',
      'TVC:US02Y',
      'OANDA:USDJPY',
      'TVC:USOIL',
    ]);
  }

  // Seed historical chart bars if available
  seedHistoricalPrices();

  // Immediate first poll for macro instruments
  poll();
  const intervalMs = config.intervals?.price || 2500;
  pollTimer = setInterval(poll, intervalMs);
}

function stop() {
  if (pollTimer) clearInterval(pollTimer);
  if (tvStreamer) {
    tvStreamer.stop();
    tvStreamer = null;
  }
  if (broadcastThrottleTimer) {
    clearTimeout(broadcastThrottleTimer);
    broadcastThrottleTimer = null;
  }
  isRunning = false;
}

function getLatest() {
  return latestPrices;
}

module.exports = { init, start, stop, getLatest };
