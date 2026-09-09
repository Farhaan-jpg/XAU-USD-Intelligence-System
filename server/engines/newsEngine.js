// server/engines/newsEngine.js
// Ultra-low latency, zero-delay financial & geopolitical news aggregation engine
// Polls 9 live feeds independently, filters for gold & macro relevance, emits instantly

const Parser = require('rss-parser');
const config = require('../config');
const { isGoldRelevant, relevanceScore } = require('../utils/goldFilter');
const aiOrchestrator = require('../utils/aiOrchestrator');
const { keywordFallback } = require('../utils/openrouter');
const telegramEngine = require('./telegramEngine');

const parser = new Parser({
  timeout: 4000, // 4-second hard cutoff to prevent hanging connections
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
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
    const result = await parser.parseURL(feed.url);
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
    // Non-fatal warning — other feeds continue with zero disruption
    // console.warn(`[NEWS] ${feed.name}: ${err.message}`);
    return [];
  }
}

/**
 * Process a single news item with instant 0ms broadcast
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

  // 1. FAST ZERO-DELAY HEURISTIC SCORING (< 0.1ms)
  // Guarantees immediate delivery with zero external network waiting
  const instantSentiment = keywordFallback(rawItem.title, rawItem.summary, rawItem.source);

  const newsItem = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    ...rawItem,
    ...instantSentiment,
    relevanceScore: score,
    processedAt: new Date().toISOString(),
  };

  // 2. BROADCAST IMMEDIATELY TO WEBSOCKET CLIENTS
  if (io) {
    io.emit('news_item', newsItem);
  }

  // Store in memory (latest first)
  latestNews.unshift(newsItem);
  if (latestNews.length > MAX_NEWS) latestNews = latestNews.slice(0, MAX_NEWS);

  // 3. TRIGGER INSTANT TELEGRAM NOTIFICATION FOR HIGH IMPACT
  if (newsItem.impact === 'HIGH') {
    telegramEngine.sendNewsAlert(newsItem).catch((err) =>
      console.error('[NEWS] Telegram alert error:', err.message)
    );
  }

  // 4. ASYNCHRONOUS BACKGROUND AI REFINEMENT (FIRE & FORGET)
  // Priority: Google Gemini -> OpenRouter Fallback -> Quant Heuristic
  aiOrchestrator.scoreNewsItem(rawItem.title, rawItem.summary, rawItem.source)
    .then((aiSentiment) => {
      if (aiSentiment && aiSentiment.reasoning) {
        newsItem.reasoning = aiSentiment.reasoning || newsItem.reasoning;
        newsItem.impact = aiSentiment.impact || newsItem.impact;
        newsItem.bias = aiSentiment.bias || newsItem.bias;
        newsItem.model = aiSentiment.model;
        newsItem.provider = aiSentiment.provider;
        if (io) {
          io.emit('news_item_update', newsItem);
        }
      }
    })
    .catch(() => {
      // Keep instant keyword fallback silently
    });

  return newsItem;
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

  const pollIntervalMs = config.intervals.news || 15000;
  console.log(`[NEWS] Ultra-low-latency engine starting — polling ${config.rssFeeds.length} feeds independently every ${pollIntervalMs / 1000}s`);

  // Stagger each feed by 1.2s to distribute network bandwidth and prevent CPU spikes
  config.rssFeeds.forEach((feed, idx) => {
    // Initial fetch with staggered delay
    const initialDelay = idx * 1200;
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
