// server/engines/newsEngine.js
// Ultra-low latency, zero-delay financial & geopolitical news aggregation engine
// Polls 9 live feeds independently, filters for gold & macro relevance, emits instantly

const Parser = require('rss-parser');
const config = require('../config');
const { isGoldRelevant, relevanceScore } = require('../utils/goldFilter');
const aiOrchestrator = require('../utils/aiOrchestrator');
const telegramEngine = require('./telegramEngine');

const parser = new Parser({
  timeout: 3500, // 3.5-second hard cutoff to prevent hanging connections
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  customFields: {
    item: ['media:content', 'description', 'summary', 'content'],
  },
});

let io = null;
let feedTimers = []; // Timers for independent feed pollers
let processedGuids = new Set(); // Deduplication cache
const MAX_GUID_CACHE = 1000;
let latestNews = []; // In-memory store, newest first
const MAX_NEWS = 60;
let isRunning = false;

function init(socketIo) {
  io = socketIo;
}

/**
 * Fetch and parse a single RSS feed with strict timeout
 */
async function fetchFeed(feed) {
  try {
    // Add cache-busting timestamp to bypass intermediary CDN edge caches (Cloudflare, Akamai, etc.)
    const cacheBuster = `_t=${Date.now()}`;
    const targetUrl = feed.url.includes('?') ? `${feed.url}&${cacheBuster}` : `${feed.url}?${cacheBuster}`;
    const result = await parser.parseURL(targetUrl);
    return (result.items || []).map((item) => ({
      source: feed.name,
      title: (item.title || '').trim(),
      summary: (item.description || item.summary || item.content || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 450),
      link: item.link || item.guid || '',
      guid: item.guid || item.link || item.title,
      publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Process a single news item with instant 0ms broadcast & AI model evaluation
 */
function processItemInstantly(rawItem) {
  if (!rawItem.title) return null;

  // Deduplication check
  if (processedGuids.has(rawItem.guid)) return null;
  processedGuids.add(rawItem.guid);

  // Manage cache bounds
  if (processedGuids.size > MAX_GUID_CACHE) {
    const entries = [...processedGuids];
    entries.splice(0, 150).forEach((g) => processedGuids.delete(g));
  }

  // Filter for XAU/USD, macro, or geopolitical relevance
  if (!isGoldRelevant(rawItem.title, rawItem.summary)) {
    return null;
  }

  const score = relevanceScore(rawItem.title, rawItem.summary);
  const initialImpact = score >= 30 ? 'HIGH' : score >= 15 ? 'MED' : 'LOW';

  // 1. INSTANT HEURISTIC BASELINE (UPDATED ASYNCHRONOUSLY BY AI MODEL)
  const newsItem = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    ...rawItem,
    impact: initialImpact,
    bias: 'NEUTRAL',
    reasoning: 'Evaluating via AI sentiment model...',
    model: 'evaluating-ai',
    relevanceScore: score,
    processedAt: new Date().toISOString(),
  };

  // 2. BROADCAST IMMEDIATELY TO WEBSOCKET CLIENTS (ZERO LATENCY)
  if (io) {
    io.emit('news_item', newsItem);
  }

  // Store in memory (latest first)
  latestNews.unshift(newsItem);
  if (latestNews.length > MAX_NEWS) latestNews = latestNews.slice(0, MAX_NEWS);

  // 3. ENQUEUE FOR SERIALIZED ASYNCHRONOUS AI SCORING (PREVENTS RATE-LIMIT BURSTS)
  enqueueForScoring(newsItem, rawItem);

  return newsItem;
}

// Resilient Serialized AI Scoring Queue
const scoringQueue = [];
let isQueueProcessing = false;

function enqueueForScoring(newsItem, rawItem) {
  // Prune backlog if > 15 items to prevent token burn & latency build-up
  if (scoringQueue.length >= 15) {
    scoringQueue.shift();
  }
  scoringQueue.push({ newsItem, rawItem });
  processScoringQueue();
}

async function processScoringQueue() {
  if (isQueueProcessing || scoringQueue.length === 0) return;
  isQueueProcessing = true;

  while (scoringQueue.length > 0) {
    const { newsItem, rawItem } = scoringQueue.shift();
    try {
      const aiSentiment = await aiOrchestrator.scoreNewsItem(rawItem.title, rawItem.summary, rawItem.source);
      if (aiSentiment && aiSentiment.bias) {
        newsItem.reasoning = aiSentiment.reasoning || newsItem.reasoning;
        newsItem.impact = aiSentiment.impact || newsItem.impact;
        newsItem.bias = aiSentiment.bias || newsItem.bias;
        newsItem.model = aiSentiment.model;
        newsItem.provider = aiSentiment.provider;

        // Broadcast updated sentiment dynamically to update market bias
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

    // 250ms spacing between AI calls to prevent 429 rate-limit spikes
    await new Promise((r) => setTimeout(r, 250));
  }

  isQueueProcessing = false;
}

/**
 * Poll an individual feed independently
 */
async function pollIndividualFeed(feed) {
  if (!isRunning) return;
  const items = await fetchFeed(feed);
  let newRelevant = 0;
  for (const item of items) {
    const processed = processItemInstantly(item);
    if (processed) newRelevant++;
  }
  if (newRelevant > 0) {
    console.log(`[NEWS] ⚡ ${feed.name}: Processed & streamed ${newRelevant} new relevant items`);
  }
}

/**
 * Start independent polling cycles for all feeds with staggered jitter
 */
function start() {
  if (isRunning) return;
  isRunning = true;

  const pollIntervalMs = config.intervals.news || 3500;
  console.log(`[NEWS] Ultra-low-latency engine starting — polling ${config.rssFeeds.length} feeds independently every ${pollIntervalMs / 1000}s`);

  // Fast-start feeds with gentle 250ms stagger so all feeds are streaming within 2s
  config.rssFeeds.forEach((feed, idx) => {
    const initialDelay = idx * 250;
    const initialTimeout = setTimeout(() => {
      pollIndividualFeed(feed);
      // Recurring independent timer
      const intervalTimer = setInterval(() => {
        pollIndividualFeed(feed);
      }, pollIntervalMs);
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
  return latestNews;
}

module.exports = { init, start, stop, getLatest };
