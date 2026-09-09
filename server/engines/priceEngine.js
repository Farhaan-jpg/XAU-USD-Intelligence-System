// server/engines/priceEngine.js
// High-Frequency Real-Time Price Streaming Engine for XAU/USD & Correlated Assets
// Prioritizes authentic OANDA:XAUUSD Spot Gold & TVC:SILVER Spot with multi-tier failover

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

function init(socketIo) {
  io = socketIo;
}

/**
 * Fetch real-time institutional Spot Gold (XAU/USD) with multi-tier failover
 * Level 1: TradingView OANDA:XAUUSD scanner (exact feed matching the workstation chart)
 * Level 2: TradingView TVC:GOLD scanner
 * Level 3: Gold-API.com live spot
 * Level 4: Binance PAXGUSDT spot proxy
 */
async function fetchLiveGoldSpot() {
  // Tier 1: TradingView OANDA:XAUUSD scanner (direct match with TradingView chart)
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
        source: 'OANDA:XAUUSD',
      };
    }
  } catch (_) {}

  // Tier 2: TradingView TVC:GOLD scanner
  try {
    const res = await axios.get('https://scanner.tradingview.com/symbol?symbol=TVC:GOLD&fields=close,change,change_abs,open,high,low,volume,bid,ask', {
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
        source: 'TVC:GOLD',
      };
    }
  } catch (_) {}

  // Tier 3: Gold-API.com live spot
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

  // Tier 4: Binance PAXGUSDT spot proxy
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
 * Fetch real-time institutional Spot Silver (XAG/USD) with multi-tier failover
 * Level 1: TradingView TVC:SILVER scanner
 * Level 2: Gold-API.com live spot silver
 */
async function fetchLiveSilverSpot() {
  // Tier 1: TradingView TVC:SILVER
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
        source: 'TVC:SILVER',
      };
    }
  } catch (_) {}

  // Tier 2: Gold-API.com live spot silver
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
 * Fetch all correlated instruments in parallel
 */
async function fetchAllPrices() {
  const macroSymbols = ['DX-Y.NYB', '^TNX', '^IRX', 'JPY=X', 'CL=F'];
  const results = {};

  // Fetch real-time spot gold, spot silver, and Yahoo Finance macro quotes simultaneously
  const [goldSpotRes, silverSpotRes, ...yahooQuotes] = await Promise.allSettled([
    fetchLiveGoldSpot(),
    fetchLiveSilverSpot(),
    ...macroSymbols.map((sym) => yahooFinance.quote(sym)),
  ]);

  const liveGold = goldSpotRes.status === 'fulfilled' ? goldSpotRes.value : null;
  const liveSilver = silverSpotRes.status === 'fulfilled' ? silverSpotRes.value : null;

  // Process Spot Gold (GC=F key for backward compatibility, plus XAUUSD alias)
  let goldPrice = liveGold?.price || latestPrices['GC=F']?.price || 0;
  if (goldPrice <= 0) {
    try {
      const fallbackQuote = await yahooFinance.quote('GC=F');
      goldPrice = fallbackQuote?.regularMarketPrice || 0;
    } catch (_) {}
  }

  if (goldPrice > 0) {
    if (!priceHistory['GC=F']) priceHistory['GC=F'] = [];
    priceHistory['GC=F'].push({ price: goldPrice, ts: Date.now() });
    if (priceHistory['GC=F'].length > BUFFER_SIZE) priceHistory['GC=F'].shift();

    const buf = priceHistory['GC=F'];
    const oldest = buf[0]?.price;
    const change5m = oldest ? ((goldPrice - oldest) / oldest) * 100 : 0;

    const goldData = {
      symbol: 'GC=F',
      label: 'XAU/USD',
      description: liveGold?.source ? `Spot Gold (${liveGold.source})` : 'Gold Spot',
      unit: 'USD/oz',
      correlation: 'primary',
      price: goldPrice,
      change5m: parseFloat(change5m.toFixed(4)),
      changeDay: liveGold?.changeDay !== undefined ? liveGold.changeDay : (latestPrices['GC=F']?.changeDay || 0),
      changeAbs: liveGold?.changeAbs || 0,
      bid: liveGold?.bid || goldPrice,
      ask: liveGold?.ask || goldPrice,
      high: liveGold?.high || Math.max(latestPrices['GC=F']?.high || goldPrice, goldPrice),
      low: liveGold?.low || Math.min(latestPrices['GC=F']?.low || goldPrice, goldPrice),
      open: liveGold?.open || goldPrice,
      volume: liveGold?.volume || 0,
      direction: change5m > 0.0005 ? 'UP' : change5m < -0.0005 ? 'DOWN' : 'FLAT',
      updatedAt: new Date().toISOString(),
      latency: liveGold ? 'REALTIME_SPOT' : 'STREAM',
      source: liveGold?.source || 'FALLBACK',
    };
    results['GC=F'] = goldData;
    results['XAUUSD'] = goldData;
  }

  // Process Spot Silver (SI=F key for backward compatibility, plus XAGUSD alias)
  let silverPrice = liveSilver?.price || latestPrices['SI=F']?.price || 0;
  if (silverPrice <= 0) {
    try {
      const fallbackQuote = await yahooFinance.quote('SI=F');
      silverPrice = fallbackQuote?.regularMarketPrice || 0;
    } catch (_) {}
  }

  if (silverPrice > 0) {
    if (!priceHistory['SI=F']) priceHistory['SI=F'] = [];
    priceHistory['SI=F'].push({ price: silverPrice, ts: Date.now() });
    if (priceHistory['SI=F'].length > BUFFER_SIZE) priceHistory['SI=F'].shift();

    const buf = priceHistory['SI=F'];
    const oldest = buf[0]?.price;
    const change5m = oldest ? ((silverPrice - oldest) / oldest) * 100 : 0;

    const silverData = {
      symbol: 'SI=F',
      label: 'XAG/USD',
      description: liveSilver?.source ? `Spot Silver (${liveSilver.source})` : 'Silver Spot',
      unit: 'USD/oz',
      correlation: 'direct',
      price: silverPrice,
      change5m: parseFloat(change5m.toFixed(4)),
      changeDay: liveSilver?.changeDay !== undefined ? liveSilver.changeDay : (latestPrices['SI=F']?.changeDay || 0),
      changeAbs: liveSilver?.changeAbs || 0,
      bid: liveSilver?.bid || silverPrice,
      ask: liveSilver?.ask || silverPrice,
      high: liveSilver?.high || Math.max(latestPrices['SI=F']?.high || silverPrice, silverPrice),
      low: liveSilver?.low || Math.min(latestPrices['SI=F']?.low || silverPrice, silverPrice),
      open: liveSilver?.open || silverPrice,
      volume: liveSilver?.volume || 0,
      direction: change5m > 0.0005 ? 'UP' : change5m < -0.0005 ? 'DOWN' : 'FLAT',
      updatedAt: new Date().toISOString(),
      latency: liveSilver ? 'REALTIME_SPOT' : 'STREAM',
      source: liveSilver?.source || 'FALLBACK',
    };
    results['SI=F'] = silverData;
    results['XAGUSD'] = silverData;
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
      latency: 'STREAM',
    };
  });

  return results;
}

async function poll() {
  try {
    const prices = await fetchAllPrices();
    latestPrices = { ...latestPrices, ...prices };

    if (io) {
      io.emit('price_update', {
        prices: latestPrices,
        serverTime: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[PRICE] Polling error:', err.message);
  }
}

function start() {
  if (isRunning) return;
  isRunning = true;
  const intervalMs = config.intervals?.price || 2500;
  console.log(`[PRICE] Real-time spot price engine starting — streaming every ${intervalMs / 1000}s`);
  poll(); // immediate first tick
  pollTimer = setInterval(poll, intervalMs);
}

function stop() {
  if (pollTimer) clearInterval(pollTimer);
  isRunning = false;
}

function getLatest() {
  return latestPrices;
}

module.exports = { init, start, stop, getLatest };
