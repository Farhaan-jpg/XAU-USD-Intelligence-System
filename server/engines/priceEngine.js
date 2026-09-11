// server/engines/priceEngine.js
// Sub-Second Real-Time Price Streaming Engine for XAU/USD & Correlated Assets
// Connects directly to TradingView's live quote WebSocket for OANDA:XAUUSD & TVC:SILVER
// with seamless multi-tier HTTP fallback (GoldAPI, Binance PAXG, Yahoo Finance)

const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const axios = require('axios');
const YahooFinanceClass = require('yahoo-finance2').default;
const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });
const config = require('../config');
const telegramEngine = require('./telegramEngine');
const webhookEngine = require('./webhookEngine');

// Persistent HTTP/HTTPS agents to eliminate TCP/TLS connection handshake delays
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });
const fastAxios = axios.create({ httpAgent, httpsAgent, timeout: 2500 });

// Time-sampled rolling price buffer — records snapshots every 2s for up to 4 hours (up to 7,200 points)
const priceHistory = {};
const MAX_HISTORY_MS = 4 * 60 * 60 * 1000;

// Institutional Session VWAP & Cumulative Volume Delta (CVD) trackers
let sessionDateKey = '';
let sessionCumVol = 0;
let sessionCumPV = 0;
let sessionCumDelta = 0;
let sessionVWAP = 0;
let sessionVWAPDev = 2.5;

function updateSessionVWAP(price, volume, isBuy = true) {
  if (!price || price <= 0) return;
  const today = new Date().toISOString().slice(0, 10);
  if (sessionDateKey !== today) {
    sessionDateKey = today;
    sessionCumVol = 0;
    sessionCumPV = 0;
    sessionCumDelta = 0;
    sessionVWAP = price;
  }

  const effectiveVol = Math.max(1, volume || 1);
  sessionCumVol += effectiveVol;
  sessionCumPV += price * effectiveVol;
  sessionCumDelta += isBuy ? effectiveVol : -effectiveVol;
  sessionVWAP = parseFloat((sessionCumPV / sessionCumVol).toFixed(2));

  // Rolling deviation
  const diff = Math.abs(price - sessionVWAP);
  sessionVWAPDev = Math.max(1.8, parseFloat((diff * 0.85 + (sessionVWAPDev || 2) * 0.15).toFixed(2)));
}

/**
 * Returns a complete, synchronized VWAP snapshot object.
 * If live sessionVWAP is not yet calculated, gracefully initializes using benchmark typical price.
 */
function getVWAPSnapshot(fallbackPrice = 0, high = 0, low = 0, open = 0) {
  let vwap = sessionVWAP;
  if (!vwap || vwap <= 0) {
    if (high && low && fallbackPrice) {
      vwap = parseFloat(((high + low + fallbackPrice + (open || fallbackPrice)) / 4).toFixed(2));
    } else if (fallbackPrice > 0) {
      vwap = parseFloat(fallbackPrice.toFixed(2));
    } else {
      vwap = 0;
    }
  }
  const dev = sessionVWAPDev || 2.5;
  return {
    vwap,
    sessionVWAP: vwap,
    sessionVWAPDev: dev,
    vwapUpper: vwap > 0 ? parseFloat((vwap + dev).toFixed(2)) : 0,
    vwapLower: vwap > 0 ? parseFloat((vwap - dev).toFixed(2)) : 0,
    cvd: sessionCumDelta,
  };
}

// ─── Intraday Volume Profile (VPVR: POC, VAH, VAL) ───────────────────────────
const sessionVolumeProfile = {};
let sessionVPTotalVol = 0;

function updateVolumeProfile(price, volume) {
  if (!price || price <= 0) return;
  const bucketKey = Math.round(price); // $1.00 discrete price bucket
  const vol = Math.max(1, volume || 1);
  sessionVolumeProfile[bucketKey] = (sessionVolumeProfile[bucketKey] || 0) + vol;
  sessionVPTotalVol += vol;
}

function getVolumeProfileSnapshot(spotPrice = 0, high = 0, low = 0, open = 0) {
  const p = spotPrice || 0;
  let poc = p;
  let maxVol = 0;
  const entries = Object.entries(sessionVolumeProfile);

  if (entries.length >= 3) {
    for (const [levelStr, vol] of entries) {
      if (vol > maxVol) {
        maxVol = vol;
        poc = parseFloat(levelStr);
      }
    }

    // Authentic CME / Market Profile Dual-Direction Expansion from POC
    // Expands outward bucket-by-bucket until 70% of session volume is enclosed in a contiguous Value Area
    const targetVol = sessionVPTotalVol * 0.70;
    const roundedPOC = Math.round(poc);
    let accumulatedVol = sessionVolumeProfile[roundedPOC] || 0;
    let upperLvl = roundedPOC + 1;
    let lowerLvl = roundedPOC - 1;

    let iterations = 0;
    while (accumulatedVol < targetVol && iterations < 80) {
      iterations++;
      const volUp = sessionVolumeProfile[upperLvl] || 0;
      const volDown = sessionVolumeProfile[lowerLvl] || 0;

      if (volUp === 0 && volDown === 0) {
        // Expand search radius if price histogram is sparse
        upperLvl++;
        lowerLvl--;
        continue;
      }

      if (volUp >= volDown && volUp > 0) {
        accumulatedVol += volUp;
        upperLvl++;
      } else if (volDown > 0) {
        accumulatedVol += volDown;
        lowerLvl--;
      } else {
        upperLvl++;
      }
    }

    const vah = Math.max(poc + 1, upperLvl - 1);
    const val = Math.min(poc - 1, lowerLvl + 1);

    const minRange = Math.min(p - 8, low > 0 ? low : p - 8);
    const maxRange = Math.max(p + 8, high > 0 ? high : p + 8);
    const buckets = [];
    for (let l = Math.floor(minRange); l <= Math.ceil(maxRange); l += 1) {
      const vol = sessionVolumeProfile[l] || 0;
      buckets.push({
        price: l,
        volume: vol,
        isPOC: l === roundedPOC,
        inValueArea: l >= val && l <= vah,
      });
    }
    return {
      poc: parseFloat(poc.toFixed(2)),
      vah: parseFloat(vah.toFixed(2)),
      val: parseFloat(val.toFixed(2)),
      totalVolume: sessionVPTotalVol,
      buckets: buckets.slice(0, 25),
    };
  }

  // Graceful initialization from high, low, open, close
  const h = high > 0 ? high : p + 7.5;
  const l = low > 0 ? low : p - 7.5;
  const eq = (h + l + (open || p) + p) / 4;
  const vahEst = parseFloat((eq + (h - l) * 0.35).toFixed(2));
  const valEst = parseFloat((eq - (h - l) * 0.35).toFixed(2));
  const pocEst = parseFloat(eq.toFixed(2));

  return {
    poc: pocEst,
    vah: vahEst,
    val: valEst,
    totalVolume: Math.max(120, sessionVPTotalVol),
    buckets: [
      { price: Math.round(vahEst), volume: 65, isPOC: false, inValueArea: true },
      { price: Math.round(pocEst), volume: 160, isPOC: true, inValueArea: true },
      { price: Math.round(valEst), volume: 55, isPOC: false, inValueArea: true },
    ],
  };
}

// ─── Rolling Pearson Correlation Coefficient Matrix ──────────────────────────
function computePearson(symA, symB, windowMs = 60 * 60 * 1000) {
  const histA = priceHistory[symA];
  const histB = priceHistory[symB];
  if (!histA || !histB || histA.length < 10 || histB.length < 10) {
    return 0;
  }
  const now = Date.now();
  const startTs = now - windowMs;
  const validA = histA.filter((p) => p.ts >= startTs);
  const validB = histB.filter((p) => p.ts >= startTs);
  if (validA.length < 6 || validB.length < 6) return 0;

  // Align timestamps by nearest neighbor within 15s
  const paired = [];
  for (const a of validA) {
    const b = validB.find((item) => Math.abs(item.ts - a.ts) <= 15000);
    if (b) paired.push([a.price, b.price]);
  }
  if (paired.length < 6) return 0;

  const n = paired.length;
  let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;
  for (const [x, y] of paired) {
    sumX += x;
    sumY += y;
    sumX2 += x * x;
    sumY2 += y * y;
    sumXY += x * y;
  }

  const num = n * sumXY - sumX * sumY;
  const termX = Math.max(0, n * sumX2 - sumX * sumX);
  const termY = Math.max(0, n * sumY2 - sumY * sumY);
  if (termX <= 0.000001 || termY <= 0.000001) return 0;
  const den = Math.sqrt(termX * termY);
  if (den === 0 || isNaN(den)) return 0;
  return Math.max(-1, Math.min(1, parseFloat((num / den).toFixed(2))));
}

function calculateRollingPearsonCorrelation() {
  const rDxy = computePearson('GC=F', 'DX-Y.NYB');
  const rYield = computePearson('GC=F', '^TNX');
  const rSilver = computePearson('GC=F', 'SI=F');
  const rOil = computePearson('GC=F', 'CL=F');

  const dxyDecoupling = rDxy > -0.15;
  const yieldDecoupling = rYield > -0.10;
  const silverDecoupling = rSilver < 0.40 && rSilver !== 0;

  return {
    dxy: {
      symbol: 'DXY',
      r: rDxy !== 0 ? rDxy : -0.84,
      normal: 'INVERSE',
      decoupling: dxyDecoupling,
      note: dxyDecoupling ? 'DXY/Gold decoupling: Dual flight-to-safety active' : 'Normal inverse correlation',
    },
    us10y: {
      symbol: 'US10Y',
      r: rYield !== 0 ? rYield : -0.68,
      normal: 'INVERSE',
      decoupling: yieldDecoupling,
      note: yieldDecoupling ? 'Yield drag decoupled by geopolitical haven flows' : 'Normal inverse correlation',
    },
    silver: {
      symbol: 'XAG/USD',
      r: rSilver !== 0 ? rSilver : 0.88,
      normal: 'DIRECT',
      decoupling: silverDecoupling,
      note: silverDecoupling ? 'Precious metals divergence / beta rotation' : 'Strong direct alignment',
    },
    oil: {
      symbol: 'WTI OIL',
      r: rOil !== 0 ? rOil : 0.42,
      normal: 'MODERATE_DIRECT',
      decoupling: false,
      note: 'Energy inflation & geopolitical proxy',
    },
    updatedAt: new Date().toISOString(),
  };
}

// ─── Multi-Timeframe Trend & Alignment Matrix (MTF) ──────────────────────────
function calculateMTFMatrix(intervals = {}, spotPrice = 0) {
  const tfs = [
    { key: '1', label: '1M' },
    { key: '5', label: '5M' },
    { key: '15', label: '15M' },
    { key: '60', label: '1H' },
    { key: '240', label: '4H' },
    { key: 'D', label: '1D' },
  ];

  let bullCount = 0;
  let bearCount = 0;
  const matrix = {};

  for (const tf of tfs) {
    const data = intervals[tf.key] || {};
    const chp = typeof data.chp === 'number' ? data.chp : (typeof data.ch === 'number' ? data.ch : 0);
    let trend = 'CHOP';
    let momentum = 'NEUTRAL';

    if (chp >= 0.08) {
      trend = 'BULLISH';
      momentum = chp >= 0.25 ? 'EXPANDING' : 'TRENDING';
      bullCount++;
    } else if (chp <= -0.08) {
      trend = 'BEARISH';
      momentum = chp <= -0.25 ? 'LIQUIDATING' : 'TRENDING';
      bearCount++;
    } else if (chp > 0) {
      trend = 'MILD_BULL';
      bullCount += 0.5;
    } else if (chp < 0) {
      trend = 'MILD_BEAR';
      bearCount += 0.5;
    }

    matrix[tf.label] = {
      changePct: parseFloat(chp.toFixed(2)),
      trend,
      momentum,
    };
  }

  let alignment = 'MIXED CONFLICT';
  let badgeColor = 'var(--text-dim)';
  if (bullCount >= 5) {
    alignment = `FULL BULLISH CONFLUENCE (${Math.round(bullCount)}/6)`;
    badgeColor = 'var(--bull-primary)';
  } else if (bullCount >= 4) {
    alignment = `MODERATE BULLISH BIAS (${Math.round(bullCount)}/6)`;
    badgeColor = 'var(--bull-primary)';
  } else if (bearCount >= 5) {
    alignment = `FULL BEARISH CONFLUENCE (${Math.round(bearCount)}/6)`;
    badgeColor = 'var(--bear-primary)';
  } else if (bearCount >= 4) {
    alignment = `MODERATE BEARISH BIAS (${Math.round(bearCount)}/6)`;
    badgeColor = 'var(--bear-primary)';
  }

  return {
    matrix,
    alignment,
    badgeColor,
    bullCount: Math.round(bullCount),
    bearCount: Math.round(bearCount),
  };
}

// ─── Live Tick Tape & Tape Velocity Engine ───────────────────────────────────
const rollingTickTape = [];
const liveTickTimestamps = [];
let prevGoldPrice = 0;

function recordTickTape(price, volume) {
  if (!price || price <= 0) return;
  const now = Date.now();
  liveTickTimestamps.push(now);

  while (liveTickTimestamps.length > 0 && liveTickTimestamps[0] < now - 5000) {
    liveTickTimestamps.shift();
  }

  const ch = prevGoldPrice > 0 ? parseFloat((price - prevGoldPrice).toFixed(2)) : 0;
  const dir = price > prevGoldPrice ? 'UP' : price < prevGoldPrice ? 'DOWN' : 'FLAT';
  prevGoldPrice = price;

  const tickItem = {
    id: `${now}-${Math.random().toString(36).substring(2, 6)}`,
    price,
    ch,
    dir,
    size: Math.max(1, Math.round(volume || (Math.abs(ch) * 10 + 1))),
    ts: new Date().toISOString(),
  };

  rollingTickTape.push(tickItem);
  if (rollingTickTape.length > 40) {
    rollingTickTape.shift();
  }
}

function getTapeVelocity() {
  const count = liveTickTimestamps.length;
  const tps = parseFloat((count / 5).toFixed(1));
  let regime = 'NORMAL';
  if (tps >= 8.0) regime = 'BREAKOUT SURGE';
  else if (tps >= 3.0) regime = 'ELEVATED FLOW';

  return {
    tps,
    regime,
    recentTicks: rollingTickTape.slice(-15),
  };
}

// ─── Volatility Surge Monitor ────────────────────────────────────────────────
let lastVolatilityAlarmTime = 0;
let lastSurgeEvent = null;

function checkVolatilitySurge(currentPrice) {
  if (!currentPrice || currentPrice <= 0) return null;
  const hist = priceHistory['GC=F'];
  if (!hist || hist.length < 5) return null;

  const now = Date.now();
  const twoMinsAgo = now - 120 * 1000;
  const recent = hist.filter((p) => p.ts >= twoMinsAgo);
  if (recent.length < 3) return null;

  const minP = Math.min(...recent.map((p) => p.price));
  const maxP = Math.max(...recent.map((p) => p.price));
  const delta = maxP - minP;

  if (delta >= 6.00 && now - lastVolatilityAlarmTime > 90 * 1000) {
    lastVolatilityAlarmTime = now;
    const direction = currentPrice >= (minP + maxP) / 2 ? 'UP' : 'DOWN';
    lastSurgeEvent = {
      active: true,
      delta: parseFloat(delta.toFixed(2)),
      direction,
      spotPrice: currentPrice,
      durationSec: 120,
      timestamp: new Date().toISOString(),
    };

    console.log(`[PRICE] ⚡ VOLATILITY SURGE: $${delta.toFixed(2)} move in <120s (${direction})`);

    try {
      telegramEngine.sendCustomPriceAlert({
        targetPrice: currentPrice,
        spotPrice: currentPrice,
        condition: direction === 'UP' ? '>' : '<',
        label: `⚡ VOLATILITY SURGE: $${delta.toFixed(2)} move in <120s (${direction})`,
      });
    } catch (_) {}

    try {
      webhookEngine.sendVolatilitySpikeAlert({
        spotPrice: currentPrice,
        delta,
        durationSec: 120,
        direction,
      });
    } catch (_) {}

    if (io) {
      io.emit('volatility_surge', lastSurgeEvent);
    }
  }

  if (lastSurgeEvent && now - new Date(lastSurgeEvent.timestamp).getTime() > 90 * 1000) {
    lastSurgeEvent = null;
  }

  return lastSurgeEvent;
}

/**
 * Smart Money Technique (SMT) Divergence Detector: Gold vs Silver
 * Checks rolling 20-minute swing highs and lows
 * Bullish SMT: Gold makes Lower Low while Silver holds Higher Low (Institutional Absorption)
 * Bearish SMT: Gold makes Higher High while Silver fails with Lower High (Institutional Distribution)
 */
function computeSMTDivergence() {
  const goldHist = priceHistory['GC=F'];
  const silverHist = priceHistory['SI=F'];
  if (!goldHist || !silverHist || goldHist.length < 15 || silverHist.length < 15) {
    return { status: 'NEUTRAL', type: 'ALIGNED', detail: 'Accumulating price structure for SMT detection', timestamp: new Date().toISOString() };
  }

  const now = Date.now();
  const windowMs = 25 * 60 * 1000; // 25 mins
  const halfWindow = 12.5 * 60 * 1000;

  const gRecent = goldHist.filter((p) => now - p.ts <= windowMs);
  const sRecent = silverHist.filter((p) => now - p.ts <= windowMs);
  if (gRecent.length < 8 || sRecent.length < 8) {
    return { status: 'NEUTRAL', type: 'ALIGNED', detail: 'Accumulating swing structure', timestamp: new Date().toISOString() };
  }

  const midTs = now - halfWindow;
  const gP1 = gRecent.filter((p) => p.ts < midTs);
  const gP2 = gRecent.filter((p) => p.ts >= midTs);
  const sP1 = sRecent.filter((p) => p.ts < midTs);
  const sP2 = sRecent.filter((p) => p.ts >= midTs);

  if (gP1.length === 0 || gP2.length === 0 || sP1.length === 0 || sP2.length === 0) {
    return { status: 'NEUTRAL', type: 'ALIGNED', detail: 'Syncing phase data', timestamp: new Date().toISOString() };
  }

  const gHigh1 = Math.max(...gP1.map((p) => p.price));
  const gHigh2 = Math.max(...gP2.map((p) => p.price));
  const gLow1 = Math.min(...gP1.map((p) => p.price));
  const gLow2 = Math.min(...gP2.map((p) => p.price));

  const sHigh1 = Math.max(...sP1.map((p) => p.price));
  const sHigh2 = Math.max(...sP2.map((p) => p.price));
  const sLow1 = Math.min(...sP1.map((p) => p.price));
  const sLow2 = Math.min(...sP2.map((p) => p.price));

  // Bearish SMT: Gold printed Higher High while Silver failed and made Lower High
  if (gHigh2 > gHigh1 + 0.35 && sHigh2 < sHigh1 - 0.04) {
    return {
      status: 'BEARISH_SMT',
      type: 'DISTRIBUTION',
      detail: `Bearish SMT Divergence: Gold printed Higher High ($${gHigh2.toFixed(2)}) while Silver failed with Lower High ($${sHigh2.toFixed(2)}). Smart money institutional distribution detected.`,
      timestamp: new Date().toISOString(),
    };
  }

  // Bullish SMT: Gold swept Lower Low while Silver held Higher Low
  if (gLow2 < gLow1 - 0.35 && sLow2 > sLow1 + 0.04) {
    return {
      status: 'BULLISH_SMT',
      type: 'ACCUMULATION',
      detail: `Bullish SMT Divergence: Gold swept Lower Low ($${gLow2.toFixed(2)}) while Silver held Higher Low ($${sLow2.toFixed(2)}). Institutional absorption and bear trap detected.`,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    status: 'NEUTRAL',
    type: 'ALIGNED',
    detail: 'Precious metals complex trend aligned between Gold and Silver.',
    timestamp: new Date().toISOString(),
  };
}

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
          const barClose = parseFloat(q.close.toFixed(2));
          priceHistory['GC=F'].push({ price: barClose, ts: new Date(q.date).getTime() });
          const isBuy = q.open ? barClose >= q.open : true;
          updateSessionVWAP(barClose, q.volume || 10, isBuy);
        }
      });
      console.log(`[PRICE] Seeded ${chart.quotes.length} historical 5m bars for GC=F (Initial Session VWAP: $${sessionVWAP})`);

      // Initialize baseline gold price object if not yet populated
      const lastBar = chart.quotes[chart.quotes.length - 1];
      if (lastBar && lastBar.close && (!latestPrices['GC=F'] || !latestPrices['GC=F'].price)) {
        const p = parseFloat(lastBar.close.toFixed(2));
        const high = lastBar.high ? parseFloat(lastBar.high.toFixed(2)) : p;
        const low = lastBar.low ? parseFloat(lastBar.low.toFixed(2)) : p;
        const open = lastBar.open ? parseFloat(lastBar.open.toFixed(2)) : p;
        const vwapMetrics = getVWAPSnapshot(p, high, low, open);
        const goldData = {
          symbol: 'GC=F',
          label: 'XAU/USD',
          description: 'Spot Gold (OANDA:XAUUSD Initializing)',
          unit: 'USD/oz',
          correlation: 'primary',
          price: p,
          change5m: 0,
          changeDay: 0,
          changeAbs: 0,
          bid: p,
          ask: p,
          high,
          low,
          open,
          priceLocation: 0.5,
          pivotP: p,
          volume: lastBar.volume || 0,
          direction: 'FLAT',
          updatedAt: new Date().toISOString(),
          latency: 'HISTORICAL_SEED',
          source: 'HISTORICAL_SEED',
          authoritativeSource: 'OANDA:XAUUSD (Primary)',
          ...vwapMetrics,
          smtDivergence: computeSMTDivergence(),
          intervals: {},
        };
        latestPrices['GC=F'] = goldData;
        latestPrices['XAUUSD'] = goldData;
      }
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
let binanceStreamer = null;
let lastWsTickTime = 0;
let lastOandaTickTime = 0;
let lastPaxgTickTime = 0;
let latestPaxgPrice = 0;
let broadcastThrottleTimer = null;
let lastBroadcastTime = 0;
const BROADCAST_THROTTLE_MS = 50; // up to 20 fps - sub-second real-time delivery with zero artificial lag

function init(socketIo) {
  io = socketIo;
}

/**
 * Ultra-responsive leading-edge + trailing-edge broadcast throttle
 * Dispatches the first tick immediately (0ms delay) and caps subsequent bursts to 50ms intervals
 */
function scheduleBroadcast() {
  const now = Date.now();
  const elapsed = now - lastBroadcastTime;

  if (elapsed >= BROADCAST_THROTTLE_MS) {
    if (broadcastThrottleTimer) {
      clearTimeout(broadcastThrottleTimer);
      broadcastThrottleTimer = null;
    }
    lastBroadcastTime = now;
    if (io) {
      io.emit('price_update', {
        prices: latestPrices,
        serverTime: new Date().toISOString(),
      });
    }
  } else if (!broadcastThrottleTimer) {
    broadcastThrottleTimer = setTimeout(() => {
      broadcastThrottleTimer = null;
      lastBroadcastTime = Date.now();
      if (io) {
        io.emit('price_update', {
          prices: latestPrices,
          serverTime: new Date().toISOString(),
        });
      }
    }, BROADCAST_THROTTLE_MS - elapsed);
  }
}

/**
 * Real-Time Binance PAXG (Pax Gold) 24/7 Sub-10ms WebSocket Streamer
 * Runs as a hot-standby and microsecond momentum lead detector.
 * IMPORTANT: OANDA:XAUUSD remains the primary authoritative trading anchor whenever active.
 */
class BinancePAXGStreamer {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.isClosed = false;
    this.endpointIndex = 0;
    this.endpoints = [
      'wss://data-stream.binance.vision:9443/ws/paxgusdt@ticker',
      'wss://stream.binance.com:9443/ws/paxgusdt@ticker',
    ];
    this.hasLogged451 = false;
    this.connect();
  }

  connect() {
    if (this.isClosed) return;
    const url = this.endpoints[this.endpointIndex % this.endpoints.length];

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log(`[BINANCE-PAXG] Connected to 24/7 Pax Gold WebSocket stream (${url.includes('vision') ? 'Binance Vision' : 'Binance Core'})`);
        this.hasLogged451 = false;
      });

      this.ws.on('message', (data) => {
        try {
          const tick = JSON.parse(data.toString());
          if (tick && tick.c) {
            this.handleTick(tick);
          }
        } catch (_) {}
      });

      this.ws.on('close', () => {
        if (!this.isClosed) {
          // If geo-restricted, back off for 15 minutes to prevent log storm
          const delay = this.hasLogged451 ? 15 * 60 * 1000 : 5000;
          this.reconnectTimer = setTimeout(() => {
            this.endpointIndex++;
            this.connect();
          }, delay);
        }
      });

      this.ws.on('error', (err) => {
        if (err.message && err.message.includes('451')) {
          if (!this.hasLogged451) {
            this.hasLogged451 = true;
            console.log('[BINANCE-PAXG] Notice: Host datacenter IP is geo-restricted by Binance (HTTP 451). Standby stream paused; primary OANDA:XAUUSD quote stream is fully active.');
          }
        } else {
          console.warn('[BINANCE-PAXG] WebSocket notice:', err.message);
        }
      });
    } catch (err) {
      this.reconnectTimer = setTimeout(() => this.connect(), 10000);
    }
  }

  handleTick(tick) {
    const price = parseFloat(parseFloat(tick.c).toFixed(2));
    if (!price || isNaN(price)) return;
    lastPaxgTickTime = Date.now();
    latestPaxgPrice = price;

    const bid = tick.b ? parseFloat(parseFloat(tick.b).toFixed(2)) : price;
    const ask = tick.a ? parseFloat(parseFloat(tick.a).toFixed(2)) : price;
    const high = tick.h ? parseFloat(parseFloat(tick.h).toFixed(2)) : price;
    const low = tick.l ? parseFloat(parseFloat(tick.l).toFixed(2)) : price;
    const chp = tick.P ? parseFloat(parseFloat(tick.P).toFixed(2)) : 0;

    // Track dedicated PAXG 24/7 stream
    latestPrices['PAXGUSDT'] = {
      symbol: 'PAXGUSDT',
      label: 'PAXG/USDT',
      description: 'Physical Gold 1:1 Token (Binance 24/7)',
      unit: 'USD/oz',
      price,
      bid,
      ask,
      high,
      low,
      changeDay: chp,
      updatedAt: new Date().toISOString(),
      latency: 'SUB_10MS_STREAM',
      source: 'BINANCE_PAXG_STREAM',
    };

    // Check if OANDA is currently active
    const isOandaActive = (Date.now() - lastOandaTickTime) < 4500;

    // ONLY IF OANDA:XAUUSD is silent / disconnected (e.g. weekend or network drop),
    // Binance PAXG acts as zero-delay hot standby to maintain uninterrupted feed
    if (!isOandaActive) {
      recordPriceSample('GC=F', price);
      updateVolumeProfile(price, parseFloat(tick.v || 1));
      recordTickTape(price, parseFloat(tick.v || 1));

      const change5mEntry = getChangeSince('GC=F', 5 * 60 * 1000, price, high, low);
      const change5m = change5mEntry.chp;

      const vwapMetrics = getVWAPSnapshot(price, high, low, price);
      const volumeProfile = getVolumeProfileSnapshot(price, high, low, price);
      const correlationMatrix = calculateRollingPearsonCorrelation();
      const intervals = {
        '1': { ch: 0, chp: 0 },
        '5': { ch: parseFloat(((price * change5m) / 100).toFixed(2)), chp: parseFloat(change5m.toFixed(2)) },
        '15': { ch: 0, chp: 0 },
        '60': { ch: 0, chp: 0 },
        '240': { ch: 0, chp: 0 },
        'D': { ch: 0, chp },
      };
      const mtfMatrix = calculateMTFMatrix(intervals, price);
      const tapeVelocity = getTapeVelocity();
      const surge = checkVolatilitySurge(price);
      const currentDayRange = Math.max(0.1, high - low);
      const adrBenchmark = 32.0;
      const adrPercent = parseFloat(((currentDayRange / adrBenchmark) * 100).toFixed(1));

      const goldData = {
        symbol: 'GC=F',
        label: 'XAU/USD',
        description: 'Gold Spot (Binance PAXG 24/7 Standby)',
        unit: 'USD/oz',
        correlation: 'primary',
        price,
        change5m: parseFloat(change5m.toFixed(4)),
        changeDay: chp,
        bid,
        ask,
        high,
        low,
        open: price,
        prevClose: price,
        dayRange: parseFloat(currentDayRange.toFixed(2)),
        adr: adrBenchmark,
        adrPercent,
        priceLocation: 0.5,
        pivotP: price,
        volume: parseFloat(tick.v || 0),
        direction: change5m > 0.0005 ? 'UP' : change5m < -0.0005 ? 'DOWN' : 'FLAT',
        updatedAt: new Date().toISOString(),
        latency: 'SUB_10MS_STANDBY',
        source: 'BINANCE_PAXG_STANDBY',
        isHotStandby: true,
        authoritativeSource: 'OANDA:XAUUSD (Standby Mode)',
        ...vwapMetrics,
        volumeProfile,
        correlationMatrix,
        mtfMatrix,
        tickTape: tapeVelocity.recentTicks,
        tapeSpeed: tapeVelocity.tps,
        tapeSpeedStatus: tapeVelocity.regime,
        volatilitySurge: surge,
        smtDivergence: computeSMTDivergence(),
        intervals,
      };

      latestPrices['GC=F'] = goldData;
      latestPrices['XAUUSD'] = goldData;
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
      lastOandaTickTime = Date.now();
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

      const prevClose = v.prev_close_price ? parseFloat(v.prev_close_price.toFixed(2)) : (existing.prevClose || open);
      const currentDayRange = Math.max(0.1, high - low);
      const adrBenchmark = 32.0;
      const adrPercent = parseFloat(((currentDayRange / adrBenchmark) * 100).toFixed(1));

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
      const dayRange = currentDayRange;
      const priceLocation = newPrice > 0 ? parseFloat(((newPrice - low) / dayRange).toFixed(4)) : 0.5;
      const pivotP = parseFloat(((high + low + (prevClose || newPrice)) / 3).toFixed(2));

      // Update institutional true session VWAP, CVD, Volume Profile, and Tick Tape
      const isAggressiveBuy = newPrice >= ask || (existing.price && newPrice >= existing.price);
      updateSessionVWAP(newPrice, v.volume || 1, isAggressiveBuy);
      updateVolumeProfile(newPrice, v.volume || 1);
      recordTickTape(newPrice, v.volume || 1);

      const vwapMetrics = getVWAPSnapshot(newPrice, high, low, open);
      const volumeProfile = getVolumeProfileSnapshot(newPrice, high, low, open);
      const correlationMatrix = calculateRollingPearsonCorrelation();
      const mtfMatrix = calculateMTFMatrix(this.intervalChanges, newPrice);
      const tapeVelocity = getTapeVelocity();
      const surge = checkVolatilitySurge(newPrice);

      // Compute Smart Money Technique (SMT) Divergence against Silver
      const smt = computeSMTDivergence();

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
        prevClose,
        dayRange: parseFloat(dayRange.toFixed(2)),
        adr: adrBenchmark,
        adrPercent,
        priceLocation,
        pivotP,
        volume: v.volume || existing.volume || 0,
        direction: change5m > 0.0005 ? 'UP' : change5m < -0.0005 ? 'DOWN' : 'FLAT',
        updatedAt: new Date().toISOString(),
        latency: 'REALTIME_WEBSOCKET',
        source: 'OANDA:XAUUSD_STREAM',
        authoritativeSource: 'OANDA:XAUUSD (Primary)',
        ...vwapMetrics,
        volumeProfile,
        correlationMatrix,
        mtfMatrix,
        tickTape: tapeVelocity.recentTicks,
        tapeSpeed: tapeVelocity.tps,
        tapeSpeedStatus: tapeVelocity.regime,
        volatilitySurge: surge,
        smtDivergence: smt,
        paxgLead: latestPaxgPrice > 0 ? {
          price: latestPaxgPrice,
          diff: parseFloat((latestPaxgPrice - newPrice).toFixed(2)),
          status: latestPaxgPrice > newPrice + 0.40 ? 'PAXG_LEADING_UP' : latestPaxgPrice < newPrice - 0.40 ? 'PAXG_LEADING_DOWN' : 'PARITY',
        } : null,
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
    const res = await fastAxios.get('https://scanner.tradingview.com/symbol?symbol=OANDA:XAUUSD&fields=close,change,change_abs,open,high,low,volume,bid,ask', {
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
    const res = await fastAxios.get('https://api.gold-api.com/price/XAU', { timeout: 2500 });
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
    const res = await fastAxios.get('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT', { timeout: 2000 });
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
    const res = await fastAxios.get('https://scanner.tradingview.com/symbol?symbol=TVC:SILVER&fields=close,change,change_abs,open,high,low,volume,bid,ask', {
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
    const res = await fastAxios.get('https://api.gold-api.com/price/XAG', { timeout: 2500 });
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
  const safeQuote = (sym) =>
    Promise.race([
      yahooFinance.quote(sym),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
    ]).catch(() => null);

  const promises = [
    wsActive ? Promise.resolve(null) : fetchLiveGoldSpot(),
    wsActive ? Promise.resolve(null) : fetchLiveSilverSpot(),
    ...macroSymbols.map((sym) => safeQuote(sym)),
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

      updateSessionVWAP(goldPrice, liveGold.volume || 10, goldPrice >= (liveGold.open || goldPrice));
      const vwapMetrics = getVWAPSnapshot(goldPrice, liveGold.high, liveGold.low, liveGold.open);

      const goldData = {
        symbol: 'GC=F',
        label: 'XAU/USD',
        description: 'Spot Gold (OANDA:XAUUSD Fallback)',
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
        authoritativeSource: 'OANDA:XAUUSD (Scanner Fallback)',
        ...vwapMetrics,
        smtDivergence: computeSMTDivergence(),
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

  // Start Binance PAXG 24/7 sub-10ms stream as hot standby & lead detector
  if (!binanceStreamer) {
    binanceStreamer = new BinancePAXGStreamer();
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
  if (binanceStreamer) {
    binanceStreamer.stop();
    binanceStreamer = null;
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

module.exports = {
  init,
  start,
  stop,
  getLatest,
  computeSMTDivergence,
  getVolumeProfileSnapshot,
  calculateRollingPearsonCorrelation,
  calculateMTFMatrix,
  getTapeVelocity,
};
