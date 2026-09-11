// server/engines/newsEngine.js
// Ultra-low latency, zero-delay financial & geopolitical news aggregation engine
// Polls tier-1 live feeds (Investing.com, Al Jazeera, BBC, CNBC, FXStreet, ForexLive),
// enforces strict timestamp ordering, rejects stale previous-day news, and broadcasts in real-time.

const http = require('http');
const https = require('https');
const Parser = require('rss-parser');
const config = require('../config');
const { isGoldRelevant, relevanceScore } = require('../utils/goldFilter');
const aiOrchestrator = require('../utils/aiOrchestrator');
const telegramEngine = require('./telegramEngine');
const newsArchive = require('../utils/newsArchive');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

const parser = new Parser({
  timeout: 3800, // 3.8-second cutoff to prevent hanging connections
  requestOptions: {
    agent: (parsedUrl) => (parsedUrl.protocol === 'http:' ? httpAgent : httpsAgent),
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  customFields: {
    item: ['media:content', 'description', 'summary', 'content', 'pubDate', 'isoDate', 'dc:date'],
  },
});

let io = null;
let feedTimers = [];
let processedGuids = new Set();
const MAX_GUID_CACHE = 1500;
let latestNews = []; // In-memory store, strictly sorted by publishedAt DESCENDING
const MAX_NEWS = 60;
const MAX_ARTICLE_AGE_MS = 24 * 60 * 60 * 1000; // Reject anything older than 24 hours
let isRunning = false;

function init(socketIo) {
  io = socketIo;
}

/**
 * Robust date parser ensuring valid ISO string and detecting age
 */
function parsePublishDate(rawDate) {
  if (!rawDate) return new Date().toISOString();
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

/**
 * Fetch and parse a single RSS feed with cache-busting
 */
async function fetchFeed(feed) {
  try {
    const cacheBuster = `_t=${Date.now()}`;
    const targetUrl = feed.url.includes('?') ? `${feed.url}&${cacheBuster}` : `${feed.url}?${cacheBuster}`;
    const result = await parser.parseURL(targetUrl);

    return (result.items || []).map((item) => {
      const pubDate = parsePublishDate(item.isoDate || item.pubDate || item.date || item['dc:date']);
      return {
        source: feed.name,
        title: (item.title || '').trim(),
        summary: (item.description || item.summary || item.content || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 450),
        link: item.link || item.guid || '',
        guid: item.guid || item.link || item.title,
        publishedAt: pubDate,
      };
    });
  } catch (err) {
    return [];
  }
}

/**
 * Real-time synchronous institutional NLP classifier for Gold (XAU/USD) news
 * Assigns bias, impact, and reasoning in 0ms without waiting for external API queues
 */
function classifyInstantGoldNews(title, summary, source = '') {
  const text = `${title} ${summary}`.toLowerCase();

  // Bearish signals for Gold (Strength in USD, Yields, Hawkish Central Banks, Ceasefire, Selloffs)
  const bearishPatterns = [
    { regex: /\b(surprise rate hike|emergency hike|hikes 50bps|hikes 75bps|aggressive tightening|shock hike)\b/, weight: 5, reason: 'Aggressive central bank rate hike shock creates heavy headwind for gold' },
    { regex: /\b(rate hike|hike rates|hawkish|higher for longer|delay rate cut|cuts delayed|no rate cut|paring cut)\b/, weight: 4, reason: 'Hawkish Fed interest rate stance reduces bullion appeal' },
    { regex: /\b(dollar (surges|rallies|jumps|strengthens|climbs|firms|hits high)|dxy (surges|rallies|jumps|high)|strong dollar|usd gains)\b/, weight: 4, reason: 'US Dollar surge creates immediate direct headwind for gold' },
    { regex: /\b(yields? (surge|spike|climb|jump|rise)|treasury yields? up|10-year yield jumps)\b/, weight: 3, reason: 'Rising US Treasury yields increase the opportunity cost of holding non-yielding gold' },
    { regex: /\b(cpi (jumps|heats up|accelerates|rises|beats)|hot inflation|inflation stubbornly high)\b/, weight: 3, reason: 'Hotter inflation elevates sticky Fed rate policy expectations' },
    { regex: /\b(nfp beats|strong payrolls|jobs beat|jobless claims drop|unemployment falls)\b/, weight: 3, reason: 'Robust US employment data dampens aggressive easing expectations' },
    { regex: /\b(gold (slumps|plunges|slides|sinks|drops|falls|retreats|tumbl|selloff)|gold bears|liquidation cascade)\b/, weight: 3, reason: 'Technical selling momentum and order book liquidation pressure' },
    { regex: /\b(ceasefire|peace talks|de-escalat|tensions ease|diplomacy|deal reached)\b/, weight: 4, reason: 'Geopolitical de-escalation unwinds safe-haven risk premia' },
    { regex: /\b(risk-on|stocks (rally|surge|jump)|equities surge|wall st gains)\b/, weight: 2, reason: 'Risk-on equity flow diverts institutional capital away from defensive assets' },
  ];

  // Bullish signals for Gold (Weak USD, Rate cuts, Dovish Fed, Geopolitical war/escalation, Safe-haven, CB buying)
  const bullishPatterns = [
    { regex: /\b(emergency rate cut|cuts 50bps|cuts 75bps|slashes rates|cuts 50 bps|inter-meeting cut|massive stimulus)\b/, weight: 5, reason: 'Aggressive emergency monetary easing and jumbo rate cuts directly propel bullion' },
    { regex: /\b(nuclear|closed strait of hormuz|strait of hormuz blocked|oil embargo|declaration of war|expanded war)\b/, weight: 5, reason: 'Severe systemic geopolitical shock drives flight into hard assets' },
    { regex: /\b(rate cut|fed cuts|cuts rates|dovish|monetary easing|easier policy|policy easing)\b/, weight: 4, reason: 'Fed monetary easing and rate cuts directly boost non-yielding bullion demand' },
    { regex: /\b(dollar (slides|drops|plunges|weakens|tumbles|falls|slumps)|weak dollar|dxy (drops|slides|falls|plunges)|usd drops)\b/, weight: 4, reason: 'US Dollar weakness directly inflates dollar-denominated gold purchasing power' },
    { regex: /\b(yields? (plunge|slide|fall|drop|tumble)|treasury yields? sink|10-year yield falls)\b/, weight: 3, reason: 'Falling sovereign yields diminish bond competition against gold reserves' },
    { regex: /\b(cpi cools|inflation slows|inflation eases|ppi cools|soft inflation)\b/, weight: 3, reason: 'Cooling inflation provides room for accelerated central bank rate cuts' },
    { regex: /\b(nfp misses|weak payrolls|jobs miss|unemployment rises|jobless claims jump|labor market slows)\b/, weight: 3, reason: 'Weakening US labor data increases urgency for monetary stimulus' },
    { regex: /\b(war|missile|air strike|attack|drone strike|escalat|iran|israel|middle east conflict|russia|ukraine|houthi|invasion|strait of hormuz)\b/, weight: 4, reason: 'Geopolitical conflict and heightened military risk drive aggressive safe-haven allocation' },
    { regex: /\b(safe[- ]haven|flight to safety|haven demand|geopolitical hedge|stagflation|recession risk)\b/, weight: 3, reason: 'Elevated macroeconomic systemic risk triggers defensive flight to safety' },
    { regex: /\b(central bank|pboc|china buys gold|gold reserves|bullion reserve|physical gold demand|gold buying)\b/, weight: 4, reason: 'Sovereign central bank de-dollarization and structural physical accumulation' },
    { regex: /\b(gold (surges|rallies|jumps|climbs|soars|hits record|record high|all-time high|breaks out))\b/, weight: 3, reason: 'Strong technical breakout and trend-following momentum' },
  ];

  let bullScore = 0;
  let bearScore = 0;
  let bullReasons = [];
  let bearReasons = [];

  for (const p of bullishPatterns) {
    if (p.regex.test(text)) {
      bullScore += p.weight;
      bullReasons.push(p.reason);
    }
  }

  for (const p of bearishPatterns) {
    if (p.regex.test(text)) {
      bearScore += p.weight;
      bearReasons.push(p.reason);
    }
  }

  // Determine Impact
  const highImpactKeywords = /\b(fomc|fed chair|powell|interest rate|cpi|nfp|non-farm|war|iran|israel|missile|nuclear|crisis|emergency|record high|gdp)\b/;
  const medImpactKeywords = /\b(ppi|retail sales|jobless claims|pmi|treasury|bonds|central bank|sanctions|oil|crude)\b/;

  let impact = 'LOW';
  if (highImpactKeywords.test(text) || Math.max(bullScore, bearScore) >= 4) {
    impact = 'HIGH';
  } else if (medImpactKeywords.test(text) || Math.max(bullScore, bearScore) >= 2) {
    impact = 'MED';
  }

  // Determine Directional Bias
  let bias = 'NEUTRAL';
  let reasoning = 'Routine macroeconomic development with balanced multi-directional implications for gold spot.';

  if (bullScore > bearScore && bullScore >= 2) {
    bias = 'BULLISH';
    reasoning = bullReasons[0] || 'Bullish order flow catalyst for gold.';
  } else if (bearScore > bullScore && bearScore >= 2) {
    bias = 'BEARISH';
    reasoning = bearReasons[0] || 'Bearish headwind for gold spot price.';
  } else if (bullScore > 0 && bearScore > 0) {
    bias = 'NEUTRAL';
    reasoning = `Crosscurrent forces: ${bullReasons[0] || 'supportive factors'} countered by ${bearReasons[0] || 'bearish factors'}.`;
  }

  return { bias, impact, reasoning };
}

/**
 * Process a batch of items from a feed, filter out stale news, and maintain strict date ordering
 */
function processFeedItems(rawItems) {
  const now = Date.now();
  const newlyAccepted = [];

  for (const raw of rawItems) {
    if (!raw.title) continue;

    // Deduplication check
    const dedupeKey = raw.guid || raw.link || raw.title;
    if (processedGuids.has(dedupeKey)) continue;

    // Reject stale news: check if published date is older than 24 hours
    const pubTime = new Date(raw.publishedAt).getTime();
    if (now - pubTime > MAX_ARTICLE_AGE_MS) {
      continue;
    }

    // Filter for XAU/USD, macro, energy, or geopolitical relevance
    if (!isGoldRelevant(raw.title, raw.summary)) {
      continue;
    }

    processedGuids.add(dedupeKey);

    const score = relevanceScore(raw.title, raw.summary);
    const instantScoring = classifyInstantGoldNews(raw.title, raw.summary, raw.source);

    const newsItem = {
      id: `${pubTime}-${Math.random().toString(36).substring(2, 7)}`,
      ...raw,
      impact: instantScoring.impact,
      bias: instantScoring.bias,
      reasoning: instantScoring.reasoning,
      model: 'instant-algorithmic-nlp',
      relevanceScore: score,
      processedAt: new Date().toISOString(),
    };

    newlyAccepted.push(newsItem);

    // Broadcast immediately to connected WebSocket clients (instant 0ms delivery)
    if (io) {
      io.emit('news_item', newsItem);
    }

    // High-impact alert trigger
    if (newsItem.impact === 'HIGH') {
      telegramEngine.sendNewsAlert(newsItem).catch((err) =>
        console.error('[NEWS] Telegram alert error:', err.message)
      );
    }

    // Optional background refinement if Gemini key exists
    enqueueForScoring(newsItem, raw);
  }

  // Manage dedupe cache size
  if (processedGuids.size > MAX_GUID_CACHE) {
    const entries = [...processedGuids];
    entries.splice(0, 200).forEach((g) => processedGuids.delete(g));
  }

  if (newlyAccepted.length > 0) {
    // Merge into latestNews and sort strictly by publishedAt DESCENDING (newest first)
    const map = new Map();
    // Insert new items
    newlyAccepted.forEach((item) => map.set(item.guid || item.id, item));
    // Insert existing items
    latestNews.forEach((item) => {
      const k = item.guid || item.id;
      if (!map.has(k)) map.set(k, item);
    });

    latestNews = Array.from(map.values())
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, MAX_NEWS);

    try {
      newsArchive.addItems(newlyAccepted);
    } catch (_) {}
  }

  return newlyAccepted.length;
}

// High-Throughput Concurrent AI Scoring Worker Pool (Zero Artificial Sleep Lag)
const scoringQueue = [];
const CONCURRENT_WORKERS = 3;
let activeWorkers = 0;

function enqueueForScoring(newsItem, rawItem) {
  if (scoringQueue.length >= 30) {
    scoringQueue.shift();
  }
  scoringQueue.push({ newsItem, rawItem });
  processScoringQueue();
}

function processScoringQueue() {
  while (activeWorkers < CONCURRENT_WORKERS && scoringQueue.length > 0) {
    activeWorkers++;
    const task = scoringQueue.shift();
    scoreSingleItem(task).finally(() => {
      activeWorkers--;
      processScoringQueue();
    });
  }
}

async function scoreSingleItem({ newsItem, rawItem }) {
  try {
    const aiSentiment = await aiOrchestrator.scoreNewsItem(rawItem.title, rawItem.summary, rawItem.source);
    if (aiSentiment && aiSentiment.bias) {
      newsItem.reasoning = aiSentiment.reasoning || newsItem.reasoning;
      newsItem.impact = aiSentiment.impact || newsItem.impact;
      newsItem.bias = aiSentiment.bias || newsItem.bias;
      newsItem.model = aiSentiment.model;
      newsItem.provider = aiSentiment.provider;

      try {
        newsArchive.updateItem(newsItem);
      } catch (_) {}

      // Broadcast updated sentiment dynamically to update client market bias
      if (io) {
        io.emit('news_item_update', newsItem);
      }

      // High-impact alert trigger
      if (newsItem.impact === 'HIGH') {
        telegramEngine.sendNewsAlert(newsItem).catch((err) =>
          console.error('[NEWS] Telegram alert error:', err.message)
        );
      }
    }
  } catch (_) {}
}

/**
 * Poll an individual feed
 */
async function pollIndividualFeed(feed) {
  if (!isRunning) return;
  const items = await fetchFeed(feed);
  const count = processFeedItems(items);
  if (count > 0) {
    console.log(`[NEWS] ⚡ ${feed.name}: Processed & streamed ${count} fresh real-time items`);
  }
}

/**
 * Start independent polling cycles for all feeds with staggered jitter
 */
function start() {
  if (isRunning) return;
  isRunning = true;

  // Each individual feed refreshes every 24 seconds, staggered by 2s across 12 feeds
  // This guarantees a new feed check every 2 seconds without hitting 429 rate limits!
  const perFeedIntervalMs = 24000;
  console.log(`[NEWS] Real-time engine starting — streaming ${config.rssFeeds.length} tier-1 feeds with staggered 2s cadence`);

  config.rssFeeds.forEach((feed, idx) => {
    const initialDelay = idx * 2000;
    const initialTimeout = setTimeout(() => {
      pollIndividualFeed(feed);
      const intervalTimer = setInterval(() => {
        pollIndividualFeed(feed);
      }, perFeedIntervalMs);
      feedTimers.push(intervalTimer);
    }, initialDelay);

    feedTimers.push(initialTimeout);
  });
}

function stop() {
  isRunning = false;
  feedTimers.forEach((timer) => clearTimeout(timer) && clearInterval(timer));
  feedTimers = [];
}

function getLatest() {
  // Always return sorted newest-first
  return latestNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

module.exports = { init, start, stop, getLatest };
