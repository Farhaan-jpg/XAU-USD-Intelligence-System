// server/utils/openrouter.js
// OpenRouter API wrapper for sentiment scoring
// Returns structured JSON: { headline, impact, bias, reasoning }

const axios = require('axios');
const config = require('../config');

const client = axios.create({
  baseURL: config.openrouter.baseUrl,
  timeout: 8000,
  headers: {
    'Authorization': `Bearer ${config.openrouter.apiKey}`,
    'HTTP-Referer': 'https://xauusd-pro.local',
    'X-Title': 'XAU/USD Pro Trading Dashboard',
    'Content-Type': 'application/json',
  },
});

const SYSTEM_PROMPT = `You are a quantitative gold (XAU/USD) trading analyst. 
Your job is to analyze financial news headlines and summaries, then output a precise trading signal.

RULES:
- Output ONLY valid JSON, no other text
- impact: HIGH = FOMC, NFP, CPI, PCE, geopolitical escalation, central bank surprise; MED = yield moves, dollar strength moderate; LOW = background noise
- bias: BULLISH = positive for gold price; BEARISH = negative for gold price; NEUTRAL = no directional edge
- reasoning: exactly 1 concise sentence explaining your call

OUTPUT FORMAT:
{
  "headline": "...",
  "impact": "HIGH" | "MED" | "LOW",
  "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
  "reasoning": "one sentence"
}`;

// ── Circuit Breaker ───────────────────────────────────────────────────────────
// Disables AI after N consecutive 4xx failures; resets after RESET_MS
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60 * 60 * 1000; // 1 hour

let circuitFailures = 0;
let circuitOpenSince = null;

function isCircuitOpen() {
  if (!circuitOpenSince) return false;
  if (Date.now() - circuitOpenSince > CIRCUIT_RESET_MS) {
    circuitFailures = 0;
    circuitOpenSince = null;
    console.log('[OPENROUTER] Circuit breaker reset — retrying AI scoring');
    return false;
  }
  return true;
}

function recordFailure() {
  circuitFailures++;
  if (circuitFailures >= CIRCUIT_THRESHOLD && !circuitOpenSince) {
    circuitOpenSince = Date.now();
    const resetAt = new Date(Date.now() + CIRCUIT_RESET_MS).toLocaleTimeString();
    console.log(`[OPENROUTER] ⚡ Circuit breaker OPEN — using keyword fallback until ${resetAt} (resets with daily quota)`);
  }
}

function recordSuccess() {
  circuitFailures = 0;
  circuitOpenSince = null;
}
// ─────────────────────────────────────────────────────────────────────────────

async function scoreNewsItem(headline, summary, source) {
  // Skip AI entirely if circuit is open — instant keyword scoring
  if (isCircuitOpen()) {
    return keywordFallback(headline, summary, source);
  }

  const userContent = `Source: ${source}
Headline: ${headline}
Summary: ${summary || '(no summary available)'}

Analyze the gold (XAU/USD) trading impact of this news item.`;

  // Primary free auto-fallback models list
  const freeModelsList = [
    config.openrouter.model || 'openrouter/free',
    'nvidia/nemotron-3.5-lightning:free',
    'liquid/lfm-2.5-2.6b:free',
    'inclusionai/ling-3.0-flash-fin:free',
    config.openrouter.fallbackModel || 'nex-agi/nex-n2.5-mini:free',
  ];

  // Try OpenRouter auto fallback models
  for (const model of freeModelsList) {
    try {
      const response = await client.post('/chat/completions', {
        model,
        models: freeModelsList, // Enables OpenRouter built-in automatic failover across free models
        route: 'fallback',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const raw = response.data.choices?.[0]?.message?.content;
      if (!raw) throw new Error('Empty response from model');

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('Could not parse JSON from model output');
        }
      }

      // Validate required fields
      if (!parsed.impact || !parsed.bias || !parsed.reasoning) {
        throw new Error('Missing required fields in AI response');
      }

      recordSuccess();
      return {
        headline: parsed.headline || headline,
        impact: ['HIGH', 'MED', 'LOW'].includes(parsed.impact) ? parsed.impact : 'LOW',
        bias: ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(parsed.bias) ? parsed.bias : 'NEUTRAL',
        reasoning: parsed.reasoning,
        model,
        scoredAt: new Date().toISOString(),
      };
    } catch (err) {
      const status = err.response?.status;
      // 402 = no credits, 429 = rate limit, 404 = bad model — count toward circuit
      if (status === 402 || status === 429 || status === 404) {
        recordFailure();
      }
      // Only log individual failures while circuit is still closed
      if (!circuitOpenSince) {
        console.warn(`[OPENROUTER] Model ${model} failed (${status || err.code}): ${err.message}`);
      }
    }
  }

  // Enhanced keyword-based fallback scoring (used when AI is rate-limited/unavailable)
  return keywordFallback(headline, summary, source);
}

/**
 * Comprehensive keyword-based scoring — multi-factor analysis without AI
 */
function keywordFallback(headline, summary, source) {
  const text = `${headline} ${summary}`.toLowerCase();

  // ── Impact detection ─────────────────────────────────────────────
  const HIGH_IMPACT_TERMS = [
    'fomc', 'federal reserve', 'fed decision', 'rate decision', 'rate cut', 'rate hike',
    'nfp', 'non-farm payroll', 'cpi release', 'core cpi', 'core pce', 'pce data',
    'powell', 'geopolitical', 'escalation', 'war', 'central bank buying',
    'emergency meeting', 'crisis', 'recession confirmed',
  ];
  const MED_IMPACT_TERMS = [
    'treasury yield', '10-year', '2-year', 'dollar index', 'dxy', 'jobs data',
    'inflation data', 'pmi data', 'interest rate', 'monetary policy', 'quantitative',
    'gold demand', 'gold reserves', 'china gold', 'etf flows',
  ];

  let impact = 'LOW';
  if (HIGH_IMPACT_TERMS.some((t) => text.includes(t))) impact = 'HIGH';
  else if (MED_IMPACT_TERMS.some((t) => text.includes(t))) impact = 'MED';

  // ── Bias scoring ──────────────────────────────────────────────────
  const BULLISH_TERMS = [
    'rate cut', 'rate cuts', 'dovish', 'safe haven', 'geopolit', 'escalat', 'war',
    'gold surge', 'gold rally', 'gold rises', 'gold climbs', 'gold gains',
    'dollar falls', 'dollar weakens', 'dollar drops', 'yields fall', 'yields drop',
    'inflation rises', 'inflation higher', 'buying gold', 'central bank buying',
    'bullish', 'outperform', 'all-time high', 'record high', 'risk off',
  ];
  const BEARISH_TERMS = [
    'rate hike', 'rate hikes', 'hawkish', 'gold falls', 'gold drops', 'gold slips',
    'gold slides', 'gold retreats', 'gold tumbles', 'gold weakness',
    'dollar strength', 'dollar rises', 'dollar surges', 'yields rise', 'yields surge',
    'strong jobs', 'strong economy', 'nfp beats', 'jobs beat', 'bearish', 'risk on',
    'sell gold', 'outflows', 'etf outflow',
  ];

  let bullScore = 0;
  let bearScore = 0;

  BULLISH_TERMS.forEach((t) => { if (text.includes(t)) bullScore++; });
  BEARISH_TERMS.forEach((t) => { if (text.includes(t)) bearScore++; });

  let bias = 'NEUTRAL';
  let reasoning = `Market-neutral signal — no strong directional catalyst identified for XAU/USD.`;

  if (bullScore > bearScore && bullScore > 0) {
    bias = 'BULLISH';
    const driver = BULLISH_TERMS.find((t) => text.includes(t)) || 'positive catalyst';
    reasoning = `Keyword analysis detected bullish driver (${driver}) — typically supports XAU/USD upside.`;
  } else if (bearScore > bullScore && bearScore > 0) {
    bias = 'BEARISH';
    const driver = BEARISH_TERMS.find((t) => text.includes(t)) || 'bearish pressure';
    reasoning = `Keyword analysis detected bearish pressure (${driver}) — typically suppresses XAU/USD.`;
  }

  return {
    headline,
    impact,
    bias,
    reasoning,
    model: 'keyword-fallback',
    scoredAt: new Date().toISOString(),
  };
}

/**
 * Update OpenRouter settings at runtime
 */
function updateConfig({ apiKey, model, fallbackModel }) {
  if (apiKey) {
    config.openrouter.apiKey = apiKey;
    client.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
  }
  if (model) config.openrouter.model = model;
  if (fallbackModel) config.openrouter.fallbackModel = fallbackModel;
  // Reset circuit breaker so new key/model gets tested
  circuitFailures = 0;
  circuitOpenSince = null;
  console.log('[OPENROUTER] Config updated at runtime. Model:', config.openrouter.model);
  return { model: config.openrouter.model, hasKey: !!config.openrouter.apiKey };
}

module.exports = { scoreNewsItem, updateConfig, keywordFallback };
