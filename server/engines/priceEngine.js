// server/engines/priceEngine.js
// Sub-Second Real-Time Price Streaming Engine for XAU/USD & Correlated Assets
// Connects directly to TradingView's live quote WebSocket for OANDA:XAUUSD & TVC:SILVER
// with seamless multi-tier HTTP fallback (GoldAPI, Binance PAXG, Yahoo Finance)

const WebSocket = require('ws');
const axios = require('axios');
const YahooFinanceClass = require('yahoo-finance2').default;
const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });
const config = require('../config');

// Rolling price buffer — last 120 ticks (2.5s each = 5 min)
const priceHistory = {};
const BUFFER_SIZE = 120;

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
    this.bars = { '1': [], '5': [], '15': [], '60': [], '240': [], 'D': [] };
    this.intervalChanges = {};
    this.connect();
  }

  send(m, p) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({ m, p });
      this.ws.send(`~m~${msg.length}~m~${msg}`);
    }
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
        console.log('[TV-STREAM] Connected to live TradingView quote & chart stream');
        this.send('set_auth_token', ['unauthorized_user_token']);
        this.send('quote_create_session', [this.sessionId]);
        this.send('quote_set_fields', [
          this.sessionId,
          'lp', 'bid', 'ask', 'ch', 'chp', 'high_price', 'low_price', 'open_price', 'volume'
        ]);
        this.send('quote_add_symbols', [this.sessionId, ...this.symbols]);

        // Subscribe to live candlestick series for all workstation chart timeframes
        const intervals = ['1', '5', '15', '60', '240', 'D'];
        intervals.forEach((itv) => {
          const csId = 'cs_' + itv;
          this.send('chart_create_session', [csId, '']);
          this.send('resolve_symbol', [csId, `sym_${itv}`, '={"symbol":"OANDA:XAUUSD","adjustment":"splits"}']);
          this.send('create_series', [csId, `sds_${itv}`, 's1', `sym_${itv}`, itv, 3, '']);
        });
      });

      this.ws.on('message', (data) => {
        const raw = data.toString();
        const chunks = raw.split(/~m~\d+~m~/).filter(Boolean);
        for (const chunk of chunks) {
          if (chunk.startsWith('~h~')) {
            this.send('~m~' + chunk.length + '~m~' + chunk); // heartbeat reply
            continue;
          }
          try {
            const parsed = JSON.parse(chunk);
            if (parsed.m === 'qsd' && parsed.p && parsed.p[1]) {
              const sym = parsed.p[1].n;
              const v = parsed.p[1].v;
              this.handleTick(sym, v);
            } else if (parsed.m === 'timescale_update' || parsed.m === 'du') {
              const cs = parsed.p && parsed.p[0];
              if (cs && cs.startsWith('cs_')) {
                const itv = cs.replace('cs_', '');
                const payload = parsed.p[1];
                const s = payload && payload[`sds_${itv}`]?.s;
                if (s && s.length > 0) {
                  this.handleBarUpdate(itv, s, parsed.m === 'du');
                }
              }
            }
          } catch (_) {}
        }
      });

      this.ws.on('close', () => {
        if (!this.isClosed) {
          console.log('[TV-STREAM] Stream closed, reconnecting in 2s...');
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

  handleBarUpdate(itv, s, isDu) {
    if (!this.bars[itv]) this.bars[itv] = [];

    if (isDu) {
      for (const barItem of s) {
        const lastIdx = this.bars[itv].length - 1;
        if (lastIdx >= 0 && this.bars[itv][lastIdx].i === barItem.i) {
          this.bars[itv][lastIdx] = barItem;
        } else {
          this.bars[itv].push(barItem);
        }
      }
    } else {
      this.bars[itv] = s;
    }

    const bars = this.bars[itv];
    if (!bars || bars.length === 0) return;

    const currentBar = bars[bars.length - 1].v;
    const prevBar = bars.length > 1 ? bars[bars.length - 2].v : null;
    const prevClose = prevBar ? prevBar[4] : currentBar[1];
    const lastClose = currentBar[4];
    const ch = lastClose - prevClose;
    const chp = prevClose > 0 ? (ch / prevClose) * 100 : 0;

    this.intervalChanges[itv] = {
      ch: parseFloat(ch.toFixed(3)),
      chp: parseFloat(chp.toFixed(2)),
      open: currentBar[1],
      high: currentBar[2],
      low: currentBar[3],
      close: lastClose,
      prevClose,
    };

    if (latestPrices['GC=F']) {
      latestPrices['GC=F'].intervals = { ...this.intervalChanges };
      if (itv === '5') {
        latestPrices['GC=F'].change5m = parseFloat(chp.toFixed(4));
      }
      latestPrices['XAUUSD'] = latestPrices['GC=F'];
      scheduleBroadcast();
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

      // Dynamically update active interval bar estimates with latest spot tick
      for (const itv of Object.keys(this.intervalChanges)) {
        const item = this.intervalChanges[itv];
        if (item && item.prevClose) {
          const tickCh = newPrice - item.prevClose;
          const tickChp = (tickCh / item.prevClose) * 100;
          item.ch = parseFloat(tickCh.toFixed(3));
          item.chp = parseFloat(tickChp.toFixed(2));
          item.close = newPrice;
          item.high = Math.max(item.high || newPrice, newPrice);
          item.low = Math.min(item.low || newPrice, newPrice);
        }
      }

      // Buffer
      if (!priceHistory['GC=F']) priceHistory['GC=F'] = [];
      priceHistory['GC=F'].push({ price: newPrice, ts: Date.now() });
      if (priceHistory['GC=F'].length > BUFFER_SIZE) priceHistory['GC=F'].shift();
      const oldest = priceHistory['GC=F'][0]?.price;
      const change5m = oldest ? ((newPrice - oldest) / oldest) * 100 : 0;

      const goldData = {
        symbol: 'GC=F',
        label: 'XAU/USD',
        description: 'Spot Gold (OANDA:XAUUSD)',
        unit: 'USD/oz',
        correlation: 'primary',
        price: newPrice,
        change5m: this.intervalChanges['5']?.chp !== undefined ? this.intervalChanges['5'].chp : parseFloat(change5m.toFixed(4)),
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

      if (!priceHistory['SI=F']) priceHistory['SI=F'] = [];
      priceHistory['SI=F'].push({ price: newPrice, ts: Date.now() });
      if (priceHistory['SI=F'].length > BUFFER_SIZE) priceHistory['SI=F'].shift();
      const oldest = priceHistory['SI=F'][0]?.price;
      const change5m = oldest ? ((newPrice - oldest) / oldest) * 100 : 0;

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

      if (!priceHistory[targetSymbol]) priceHistory[targetSymbol] = [];
      priceHistory[targetSymbol].push({ price: newPrice, ts: Date.now() });
      if (priceHistory[targetSymbol].length > BUFFER_SIZE) priceHistory[targetSymbol].shift();
      const oldest = priceHistory[targetSymbol][0]?.price;
      const change5m = oldest ? ((newPrice - oldest) / oldest) * 100 : 0;
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

  // If WebSocket is active, all 7 assets stream live ticks sub-second with zero delay.
  // We only poll Yahoo Finance if WebSocket is inactive as fallback.
  if (wsActive) {
    return results;
  }

  const promises = [
    fetchLiveGoldSpot(),
    fetchLiveSilverSpot(),
    ...macroSymbols.map((sym) => yahooFinance.quote(sym).catch(() => null)),
  ];

  const [goldSpotRes, silverSpotRes, ...yahooQuotes] = await Promise.allSettled(promises);

  // If WebSocket was inactive, apply HTTP spot fallback
  if (!wsActive) {
    const liveGold = goldSpotRes.status === 'fulfilled' ? goldSpotRes.value : null;
    const liveSilver = silverSpotRes.status === 'fulfilled' ? silverSpotRes.value : null;

    if (liveGold?.price) {
      const goldPrice = liveGold.price;
      if (!priceHistory['GC=F']) priceHistory['GC=F'] = [];
      priceHistory['GC=F'].push({ price: goldPrice, ts: Date.now() });
      if (priceHistory['GC=F'].length > BUFFER_SIZE) priceHistory['GC=F'].shift();
      const oldest = priceHistory['GC=F'][0]?.price;
      const change5m = oldest ? ((goldPrice - oldest) / oldest) * 100 : 0;

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
      if (!priceHistory['SI=F']) priceHistory['SI=F'] = [];
      priceHistory['SI=F'].push({ price: silverPrice, ts: Date.now() });
      if (priceHistory['SI=F'].length > BUFFER_SIZE) priceHistory['SI=F'].shift();
      const oldest = priceHistory['SI=F'][0]?.price;
      const change5m = oldest ? ((silverPrice - oldest) / oldest) * 100 : 0;

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

    const currentPrice = quote?.regularMarketPrice || latestPrices[symbol]?.price || 0;
    if (currentPrice <= 0) return;

    if (!priceHistory[symbol]) priceHistory[symbol] = [];
    priceHistory[symbol].push({ price: currentPrice, ts: Date.now() });
    if (priceHistory[symbol].length > BUFFER_SIZE) priceHistory[symbol].shift();

    const buf = priceHistory[symbol];
    const oldest = buf[0]?.price;
    const change5m = oldest ? ((currentPrice - oldest) / oldest) * 100 : 0;
    const meta = INSTRUMENT_META[symbol] || {};

    results[symbol] = {
      symbol,
      label: meta.label || symbol,
      description: meta.description || '',
      unit: meta.unit || '',
      correlation: meta.correlation || 'unknown',
      price: parseFloat(currentPrice.toFixed(symbol.includes('TNX') || symbol.includes('IRX') ? 3 : 2)),
      change5m: parseFloat(change5m.toFixed(4)),
      changeDay: quote?.regularMarketChangePercent !== undefined ? parseFloat(quote.regularMarketChangePercent.toFixed(2)) : (latestPrices[symbol]?.changeDay || 0),
      bid: quote?.bid || currentPrice,
      ask: quote?.ask || currentPrice,
      high: Math.max(quote?.regularMarketDayHigh || currentPrice, currentPrice),
      low: Math.min(quote?.regularMarketDayLow || currentPrice, currentPrice),
      volume: quote?.regularMarketVolume || 0,
      direction: change5m > 0.0005 ? 'UP' : change5m < -0.0005 ? 'DOWN' : 'FLAT',
      updatedAt: new Date().toISOString(),
      latency: 'FALLBACK_HTTP',
      source: quote?.source || 'YAHOO_FINANCE',
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
