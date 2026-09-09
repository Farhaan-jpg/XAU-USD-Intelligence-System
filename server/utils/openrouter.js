// server/utils/openrouter.js
// OpenRouter API wrapper for AI news sentiment scoring & macro risk guidance
// Uses auto-fallback free models without hardcoded keyword rules (e.g. no 'war' regex)
// Implements aggressive prompt optimization and in-memory caching to prevent token waste

const axios = require('axios');
const config = require('../config');

const client = axios.create({
  baseURL: config.openrouter.baseUrl || 'https://openrouter.ai/api/v1',
  timeout: 7000,
  headers: {
    'Authorization': `Bearer ${config.openrouter.apiKey}`,
    'HTTP-Referer': 'https://xauusd-pro.local',
    'X-Title': 'XAU/USD Pro Trading Dashboard',
    'Content-Type': 'application/json',
  },
});

// Cache scored headlines to completely prevent redundant token usage
const sentimentCache = new Map();
const MAX_CACHE = 500;

// Ultra-concise prompt to minimize token burn (< 40 tokens per call)
const SENTIMENT_SYSTEM_PROMPT = `You are a gold macro analyst. Classify news impact on XAU/USD gold price. Output JSON ONLY:
{"impact":"HIGH"|"MED"|"LOW","bias":"BULLISH"|"BEARISH"|"NEUTRAL","reasoning":"<10 words"}`;

// Circuit Breaker for rate-limits
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 30 * 60 * 1000; // 30 minutes
let circuitFailures = 0;
let circuitOpenSince = null;

function isCircuitOpen() {
  if (!circuitOpenSince) return false;
  if (Date.now() - circuitOpenSince > CIRCUIT_RESET_MS) {
    circuitFailures = 0;
    circuitOpenSince = null;
    console.log('[OPENROUTER] Circuit breaker reset — retrying AI models');
    return false;
  }
  return true;
}

function recordFailure() {
  circuitFailures++;
  if (circuitFailures >= CIRCUIT_THRESHOLD && !circuitOpenSince) {
    circuitOpenSince = Date.now();
    console.log('[OPENROUTER] Circuit breaker active — pausing AI requests to conserve quota');
  }
}

function recordSuccess() {
  circuitFailures = 0;
  circuitOpenSince = null;
}

/**
 * AI-Only News Sentiment Classifier (Zero keyword regex / rules)
 */
async function scoreNewsItem(headline, summary, source) {
  const cleanHeadline = (headline || '').trim();
  if (!cleanHeadline) return neutralBaseline(headline);

  // Check cache to avoid burning tokens on duplicates
  const cacheKey = cleanHeadline.toLowerCase().slice(0, 100);
  if (sentimentCache.has(cacheKey)) {
    return { ...sentimentCache.get(cacheKey), cached: true };
  }

  if (isCircuitOpen()) {
    return neutralBaseline(cleanHeadline);
  }

  // Ultra-compact input: headline + first 100 chars of summary
  const promptInput = `${cleanHeadline} ${summary ? summary.slice(0, 100) : ''}`.trim();

  // Free auto-fallback model chain
  const freeModels = [
    config.openrouter.model || 'openrouter/free',
    'google/gemma-4-26b-a4b-it:free',
    'nvidia/nemotron-3.5-lightning:free',
    'liquid/lfm-2.5-2.6b:free',
    config.openrouter.fallbackModel || 'nex-agi/nex-n2.5-mini:free',
  ];

  for (const model of freeModels) {
    try {
      const res = await client.post('/chat/completions', {
        model,
        messages: [
          { role: 'system', content: SENTIMENT_SYSTEM_PROMPT },
          { role: 'user', content: promptInput },
        ],
        temperature: 0.1,
        max_tokens: 80, // strictly capped token limit
      });

      const raw = res.data.choices?.[0]?.message?.content;
      if (!raw) continue;

      let parsed;
      try {
        const match = raw.match(/\{[\s\S]*?\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch (_) {}

      if (parsed && parsed.bias) {
        recordSuccess();
        const scored = {
          headline: cleanHeadline,
          impact: ['HIGH', 'MED', 'LOW'].includes(parsed.impact) ? parsed.impact : 'LOW',
          bias: ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(parsed.bias) ? parsed.bias : 'NEUTRAL',
          reasoning: (parsed.reasoning || '').slice(0, 120),
          model,
          scoredAt: new Date().toISOString(),
        };

        sentimentCache.set(cacheKey, scored);
        if (sentimentCache.size > MAX_CACHE) {
          const oldestKey = sentimentCache.keys().next().value;
          sentimentCache.delete(oldestKey);
        }

        return scored;
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 400 || status === 401 || status === 402 || status === 429) {
        recordFailure();
        break; // If key is rate-limited or invalid, don't keep hammering free endpoints
      }
    }
  }

  // Pure neutral baseline if AI models are temporarily unreachable
  return neutralBaseline(cleanHeadline);
}

/**
 * Clean baseline for unrated or pending news items (NO keyword rules)
 */
function neutralBaseline(headline) {
  return {
    headline,
    impact: 'LOW',
    bias: 'NEUTRAL',
    reasoning: 'Neutral market context — no directional bias established by AI.',
    model: 'neutral-baseline',
    scoredAt: new Date().toISOString(),
  };
}

/**
 * Generate AI Market Guidance & Volatility Warnings (NO TRADE SETUPS)
 */
async function generateMarketGuidance(marketData) {
  const { goldPrice, goldChange5m, dxyPrice, dxyChange5m, us10yPrice, gsr, activeSession, nextEvent } = marketData;

  const prompt = `Gold Spot: $${goldPrice} (${goldChange5m > 0 ? '+' : ''}${goldChange5m}% 5m). DXY: ${dxyPrice} (${dxyChange5m}%). US10Y: ${us10yPrice}%. GSR: ${gsr}. Session: ${activeSession}. Next Event: ${nextEvent ? nextEvent.title : 'None imminent'}.
Provide institutional macro guidance and volatility risk warnings for XAU/USD. Output JSON ONLY:
{
  "regime": "ACCUMULATION" | "EXPANSION" | "COMPRESSION" | "DISTRIBUTION",
  "riskLevel": "LOW" | "ELEVATED" | "CRITICAL",
  "guidance": "2 concise sentences explaining macro price driver without trade entry/exit/SL/TP.",
  "warnings": ["Warning 1", "Warning 2"],
  "watchpoints": ["Watchpoint 1", "Watchpoint 2"]
}`;

  const freeModels = [
    config.openrouter.model || 'openrouter/free',
    'google/gemma-4-26b-a4b-it:free',
    'nvidia/nemotron-3.5-lightning:free',
    config.openrouter.fallbackModel || 'nex-agi/nex-n2.5-mini:free',
  ];

  for (const model of freeModels) {
    try {
      const res = await client.post('/chat/completions', {
        model,
        messages: [
          { role: 'system', content: 'You are an institutional macro risk manager. DO NOT provide trade setups, entry prices, stop losses, or profit targets. Provide ONLY macro guidance and risk warnings.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.15,
        max_tokens: 220, // strictly capped
      });

      const raw = res.data.choices?.[0]?.message?.content;
      if (!raw) continue;
      let parsed;
      try {
        const match = raw.match(/\{[\s\S]*?\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch (_) {}

      if (parsed && parsed.guidance) {
        return {
          ...parsed,
          model,
          provider: 'OpenRouter Free Auto-Fallback',
          generatedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 400 || status === 401 || status === 402 || status === 429) {
        break;
      }
    }
  }

  // Algorithmic deterministic market condition fallback
  const dxyDown = parseFloat(dxyChange5m || 0) < -0.01;
  const goldUp = parseFloat(goldChange5m || 0) > 0.01;
  const regime = goldUp && dxyDown ? 'EXPANSION' : Math.abs(parseFloat(goldChange5m || 0)) < 0.02 ? 'COMPRESSION' : 'ACCUMULATION';
  const riskLevel = nextEvent && nextEvent.minsUntil <= 30 ? 'CRITICAL' : 'ELEVATED';

  return {
    regime,
    riskLevel,
    guidance: `Spot Gold is trading in ${regime.toLowerCase()} mode amid ${dxyDown ? 'softening dollar pressure' : 'stabilizing yield curves'}. Institutional intermarket flows are maintaining price discovery with dynamic orderbook absorption.`,
    warnings: [
      nextEvent ? `Upcoming release [${nextEvent.title}] in ${nextEvent.minsUntil}m — anticipate aggressive spread widening and liquidity thinning.` : 'Maintain strict risk parameters against intraday session sweeps.',
      'Exercise caution against chasing breakout exhaustion wicks outside established value areas.',
    ],
    watchpoints: [
      `Monitor Dollar Index (DXY at ${dxyPrice}) for directional divergence against precious metals.`,
      `Track 10-Year Treasury Yield (${us10yPrice}%) real yield impact on gold spot velocity.`,
    ],
    model: 'algorithmic-market-conditions',
    provider: 'Market Intelligence Engine',
    generatedAt: new Date().toISOString(),
  };
}

function updateConfig({ apiKey, model, fallbackModel }) {
  if (apiKey) {
    config.openrouter.apiKey = apiKey;
    client.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
  }
  if (model) config.openrouter.model = model;
  if (fallbackModel) config.openrouter.fallbackModel = fallbackModel;
  circuitFailures = 0;
  circuitOpenSince = null;
  return { model: config.openrouter.model, hasKey: !!config.openrouter.apiKey };
}

module.exports = {
  scoreNewsItem,
  generateMarketGuidance,
  updateConfig,
};
