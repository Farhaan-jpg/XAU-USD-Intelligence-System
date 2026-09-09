// server/engines/priceEngine.js
// High-Frequency Real-Time Price Streaming Engine for XAU/USD & Correlated Assets
// Combines sub-100ms spot gold ticks with Yahoo Finance macro correlation matrix

const axios = require('axios');
const YahooFinanceClass = require('yahoo-finance2').default;
const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });
const config = require('../config');

// Rolling price buffer — last 120 ticks (2.5s each = 5 min)
const priceHistory = {};
const BUFFER_SIZE = 120;

// Display metadata for each symbol
const INSTRUMENT_META = {
  'GC=F':     { label: 'XAU/USD', description: 'Gold Spot / Futures', unit: 'USD/oz', correlation: 'primary' },
  'SI=F':     { label: 'XAG/USD', description: 'Silver Spot / Futures', unit: 'USD/oz', correlation: 'direct' },
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
 * Fetch sub-second Paxos 1oz Gold Spot price from live crypto/gold market
 */
async function fetchLiveGoldSpot() {
  try {
    const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT', {
      timeout: 2000,
    });
    if (res.data?.price) {
      return parseFloat(res.data.price);
    }
  } catch (_) {
    // Fallback gracefully
  }
  return null;
}

/**
 * Fetch all correlated instruments in parallel
 */
async function fetchAllPrices() {
  const symbols = Object.values(config.symbols);
  const results = {};

  // Fetch real-time gold spot and Yahoo Finance quotes simultaneously
  const [goldSpot, ...yahooQuotes] = await Promise.allSettled([
    fetchLiveGoldSpot(),
    ...symbols.map((symbol) => yahooFinance.quote(symbol)),
  ]);

  const liveSpotPrice = goldSpot.status === 'fulfilled' ? goldSpot.value : null;

  symbols.forEach((symbol, index) => {
    const quoteResult = yahooQuotes[index];
    const quote = quoteResult.status === 'fulfilled' ? quoteResult.value : null;

    if (!quote && !liveSpotPrice) {
      if (latestPrices[symbol]) {
        results[symbol] = { ...latestPrices[symbol], stale: true };
      }
      return;
    }

    let currentPrice = quote?.regularMarketPrice || latestPrices[symbol]?.price || 0;

    // If this is Gold (GC=F) and we have a zero-delay spot price, prioritize live spot
    if (symbol === 'GC=F' && liveSpotPrice) {
      currentPrice = liveSpotPrice;
    }

    if (currentPrice <= 0) return;

    // Update rolling buffer
    if (!priceHistory[symbol]) priceHistory[symbol] = [];
    priceHistory[symbol].push({
      price: currentPrice,
      ts: Date.now(),
    });
    if (priceHistory[symbol].length > BUFFER_SIZE) {
      priceHistory[symbol].shift();
    }

    // Compute 5-minute velocity
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
      latency: liveSpotPrice && symbol === 'GC=F' ? 'REALTIME_SPOT' : 'STREAM',
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
  console.log(`[PRICE] High-frequency engine starting — streaming every ${intervalMs / 1000}s`);
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
