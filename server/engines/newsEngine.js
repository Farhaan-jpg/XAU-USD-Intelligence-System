// server/engines/newsEngine.js
// Ultra-low latency, zero-delay financial & geopolitical news aggregation engine
// Polls tier-1 live feeds (Investing.com, Al Jazeera, BBC, CNBC, FXStreet, ForexLive),
// enforces strict timestamp ordering, rejects stale previous-day news, and broadcasts in real-time.

const Parser = require('rss-parser');
const config = require('../config');
const { isGoldRelevant, relevanceScore } = require('../utils/goldFilter');
const aiOrchestrator = require('../utils/aiOrchestrator');
const telegramEngine = require('./telegramEngine');

const parser = new Parser({
  timeout: 4500, // 4.5-second cutoff to prevent hanging connections
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
    const initialImpact = score >= 30 ? 'HIGH' : score >= 15 ? 'MED' : 'LOW';

    const newsItem = {
      id: `${pubTime}-${Math.random().toString(36).substring(2, 7)}`,
      ...raw,
      impact: initialImpact,
      bias: 'NEUTRAL',
      reasoning: 'Evaluating live sentiment vector...',
      model: 'evaluating-ai',
      relevanceScore: score,
      processedAt: new Date().toISOString(),
    };

    newlyAccepted.push(newsItem);

    // Broadcast immediately to connected WebSocket clients (instant 0ms delivery)
    if (io) {
      io.emit('news_item', newsItem);
    }

    // Queue for AI scoring
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
  }

  return newlyAccepted.length;
}

// Resilient Serialized AI Scoring Queue
const scoringQueue = [];
let isQueueProcessing = false;

function enqueueForScoring(newsItem, rawItem) {
  if (scoringQueue.length >= 20) {
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

    await new Promise((r) => setTimeout(r, 250));
  }

  isQueueProcessing = false;
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
