// server/engines/newsEngine.js
// RSS feed aggregation engine
// Polls 6 financial feeds, filters for gold relevance, scores via AI, broadcasts via Socket.io

const Parser = require('rss-parser');
const config = require('../config');
const { isGoldRelevant, relevanceScore } = require('../utils/goldFilter');
const { scoreNewsItem } = require('../utils/openrouter');
const telegramEngine = require('./telegramEngine');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'XAU-Pro-Dashboard/1.0 (financial research)',
  },
  customFields: {
    item: ['media:content', 'description', 'summary', 'content'],
  },
});

let io = null;
let pollTimer = null;
let processedGuids = new Set(); // Deduplicate articles
const MAX_GUID_CACHE = 500;
let latestNews = []; // In-memory store, newest first
const MAX_NEWS = 50;
let isRunning = false;

function init(socketIo) {
  io = socketIo;
}

/**
 * Fetch and parse a single RSS feed
 */
async function fetchFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);
    return (result.items || []).map((item) => ({
      source: feed.name,
      title: item.title || '',
      summary: (item.description || item.summary || item.content || '').replace(/<[^>]+>/g, '').substring(0, 400),
      link: item.link || item.guid || '',
      guid: item.guid || item.link || item.title,
      publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn(`[NEWS] Failed to fetch ${feed.name}: ${err.message}`);
    return [];
  }
}

/**
 * Process a single news item: filter → score → emit
 */
async function processItem(rawItem) {
  // Deduplication
  if (processedGuids.has(rawItem.guid)) return null;
  processedGuids.add(rawItem.guid);

  // Manage cache size
  if (processedGuids.size > MAX_GUID_CACHE) {
    const entries = [...processedGuids];
    entries.splice(0, 100).forEach((g) => processedGuids.delete(g));
  }

  // Gold relevance filter
  if (!isGoldRelevant(rawItem.title, rawItem.summary)) {
    return null;
  }

  const score = relevanceScore(rawItem.title, rawItem.summary);

  // AI sentiment scoring
  const sentiment = await scoreNewsItem(rawItem.title, rawItem.summary, rawItem.source);

  const newsItem = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    ...rawItem,
    ...sentiment,
    relevanceScore: score,
    processedAt: new Date().toISOString(),
  };

  // Emit to all connected clients
  if (io) {
    io.emit('news_item', newsItem);
  }

  // Store in memory
  latestNews.unshift(newsItem);
  if (latestNews.length > MAX_NEWS) latestNews = latestNews.slice(0, MAX_NEWS);

  // Trigger Telegram alert for HIGH impact items
  if (newsItem.impact === 'HIGH') {
    telegramEngine.sendNewsAlert(newsItem).catch((err) =>
      console.error('[NEWS] Telegram alert error:', err.message)
    );
  }

  return newsItem;
}

/**
 * Main polling function — runs every 60s
 */
async function poll() {
  console.log('[NEWS] Polling', config.rssFeeds.length, 'feeds...');

  // Fetch all feeds in parallel
  const feedResults = await Promise.allSettled(
    config.rssFeeds.map((feed) => fetchFeed(feed))
  );

  const allItems = feedResults
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  console.log(`[NEWS] Fetched ${allItems.length} raw items`);

  // Process items concurrently (up to 5 at a time to avoid rate limiting)
  const BATCH_SIZE = 5;
  let processed = 0;
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((item) => processItem(item)));
    processed += results.filter((r) => r.status === 'fulfilled' && r.value !== null).length;
  }

  console.log(`[NEWS] Processed ${processed} new gold-relevant items`);
}

function start() {
  if (isRunning) return;
  isRunning = true;
  console.log('[NEWS] Engine starting — polling every', config.intervals.news / 1000, 's');
  poll(); // immediate first poll
  pollTimer = setInterval(poll, config.intervals.news);
}

function stop() {
  if (pollTimer) clearInterval(pollTimer);
  isRunning = false;
}

function getLatest() {
  return latestNews;
}

module.exports = { init, start, stop, getLatest };
