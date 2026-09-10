// server/utils/newsArchive.js
// 7-day historical news archive manager with disk persistence

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../data');
const ARCHIVE_FILE = path.join(DATA_DIR, 'newsArchive.json');
const MAX_ARCHIVE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let memoryArchive = [];
let isInitialized = false;

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[NEWS-ARCHIVE] Notice creating data dir:', err.message);
  }
}

function initArchive() {
  if (isInitialized) return;
  ensureDataDir();
  try {
    if (fs.existsSync(ARCHIVE_FILE)) {
      const raw = fs.readFileSync(ARCHIVE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cutoff = Date.now() - MAX_ARCHIVE_AGE_MS;
        memoryArchive = parsed.filter((item) => new Date(item.publishedAt || item.processedAt).getTime() >= cutoff);
      }
    }
  } catch (err) {
    console.warn('[NEWS-ARCHIVE] Notice initializing archive:', err.message);
    memoryArchive = [];
  }
  isInitialized = true;
}

function saveArchiveToDisk() {
  ensureDataDir();
  try {
    // Keep max 1500 items, strictly sorted by date descending
    const cutoff = Date.now() - MAX_ARCHIVE_AGE_MS;
    memoryArchive = memoryArchive
      .filter((item) => new Date(item.publishedAt || item.processedAt).getTime() >= cutoff)
      .slice(0, 1500);

    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(memoryArchive, null, 2), 'utf8');
  } catch (err) {
    console.warn('[NEWS-ARCHIVE] Notice saving archive:', err.message);
  }
}

function addItems(items) {
  if (!items || items.length === 0) return;
  initArchive();

  const existingIds = new Set(memoryArchive.map((i) => i.id || i.guid || i.link || i.title));
  let added = 0;

  for (const item of items) {
    const key = item.id || item.guid || item.link || item.title;
    if (!existingIds.has(key)) {
      memoryArchive.unshift(item);
      existingIds.add(key);
      added++;
    }
  }

  if (added > 0) {
    // Re-sort descending
    memoryArchive.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    saveArchiveToDisk();
  }
}

function updateItem(updatedItem) {
  if (!updatedItem) return;
  initArchive();
  const key = updatedItem.id || updatedItem.guid || updatedItem.title;
  const idx = memoryArchive.findIndex((i) => (i.id || i.guid || i.title) === key);
  if (idx !== -1) {
    memoryArchive[idx] = { ...memoryArchive[idx], ...updatedItem };
    saveArchiveToDisk();
  }
}

function getArchivedNews({ limit = 50, query = '', date = '', bias = '', impact = '' } = {}) {
  initArchive();
  let results = [...memoryArchive];

  if (date) {
    results = results.filter((i) => (i.publishedAt || '').startsWith(date));
  }

  if (bias && bias !== 'ALL') {
    results = results.filter((i) => i.bias === bias);
  }

  if (impact && impact !== 'ALL') {
    results = results.filter((i) => i.impact === impact);
  }

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (i) =>
        (i.title || i.headline || '').toLowerCase().includes(q) ||
        (i.summary || '').toLowerCase().includes(q) ||
        (i.source || '').toLowerCase().includes(q)
    );
  }

  return results.slice(0, Math.min(limit, 200));
}

module.exports = {
  initArchive,
  addItems,
  updateItem,
  getArchivedNews,
};
