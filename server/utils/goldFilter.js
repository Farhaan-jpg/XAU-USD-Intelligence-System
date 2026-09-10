// server/utils/goldFilter.js
// Fast keyword-based pre-filter to discard non-gold-relevant news
// Runs BEFORE expensive AI API call to save latency & cost

const config = require('../config');

// Pre-compile patterns for performance with strict word boundaries
const GOLD_PATTERN = new RegExp(
  config.goldKeywords
    .map((k) => `\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    .join('|'),
  'i'
);

// Hard exclusions — news that matches these is never gold-relevant
const EXCLUSION_PATTERN = /\b(sports|entertainment|celebrity|movie|music|game|football|cricket|bollywood|hollywood|weather|recipe|travel|fashion|lifestyle)\b/i;

/**
 * Returns true if the article is potentially relevant to XAU/USD
 * @param {string} title
 * @param {string} [content]
 * @returns {boolean}
 */
function isGoldRelevant(title, content = '') {
  const text = `${title} ${content}`.substring(0, 500); // cap at 500 chars for speed

  if (EXCLUSION_PATTERN.test(text)) return false;
  return GOLD_PATTERN.test(text);
}

/**
 * Score relevance strength (0–100) for prioritisation
 * @param {string} title
 * @param {string} [content]
 * @returns {number}
 */
function relevanceScore(title, content = '') {
  const text = `${title} ${content}`.substring(0, 500);
  const highValueTerms = ['fomc', 'cpi', 'nfp', 'federal reserve', 'rate decision', 'core pce', 'payroll', 'gold', 'xau'];
  let score = 0;
  for (const term of highValueTerms) {
    const reg = new RegExp(`\\b${term}\\b`, 'i');
    if (reg.test(text)) score += 15;
  }
  if (GOLD_PATTERN.test(text)) score += 10;
  return Math.min(score, 100);
}

module.exports = { isGoldRelevant, relevanceScore };
