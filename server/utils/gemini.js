// server/utils/gemini.js
// Google Gemini API Engine with real-time dynamic model discovery and failover
// Priority #1 in the AI cascade

const axios = require('axios');
const config = require('../config');

// In-memory discovered models
let availableModels = [];
let activeModelIndex = 0;
let lastModelDiscoveryTime = 0;
const DISCOVERY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Circuit breaker for Google API (if quota exhausted across all models)
let consecutiveFailures = 0;
const MAX_FAILURES_BEFORE_COOLDOWN = 6;
let cooldownUntil = 0;

const PREFERRED_MODEL_ORDER = [
  'gemini-flash-lite-latest',
  'gemma-4-26b-a4b-it',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
];

/**
 * Fetch available models supporting generateContent from Google API in real time
 */
async function discoverModels(force = false) {
  const apiKey = config.google?.apiKey;
  if (!apiKey) return [];

  const now = Date.now();
  if (!force && availableModels.length > 0 && (now - lastModelDiscoveryTime) < DISCOVERY_CACHE_TTL) {
    return availableModels;
  }

  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      timeout: 7000,
    });

    const allModels = res.data?.models || [];
    const supported = allModels
      .filter((m) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => m.name.replace('models/', ''))
      .filter((m) => {
        const lower = m.toLowerCase();
        const isExcluded = lower.includes('tts') ||
          lower.includes('image') ||
          lower.includes('transcribe') ||
          lower.includes('robotics') ||
          lower.includes('lyria') ||
          lower.includes('deep-research') ||
          lower.includes('computer-use') ||
          lower.includes('banana') ||
          lower.includes('antigravity') ||
          lower.includes('customtools');
        return !isExcluded;
      });

    // Sort by preferred order
    const sorted = [];
    PREFERRED_MODEL_ORDER.forEach((p) => {
      if (supported.includes(p)) sorted.push(p);
    });

    // Add any remaining supported models
    supported.forEach((m) => {
      if (!sorted.includes(m)) {
        sorted.push(m);
      }
    });

    availableModels = sorted.length > 0 ? sorted : PREFERRED_MODEL_ORDER;
    lastModelDiscoveryTime = now;
    console.log(`[GEMINI] Real-time model discovery complete. ${availableModels.length} operational models active: ${availableModels.slice(0, 4).join(', ')}`);
    return availableModels;
  } catch (err) {
    console.warn(`[GEMINI] Model discovery failed (${err.message}). Using fallback list.`);
    if (availableModels.length === 0) {
      availableModels = [...PREFERRED_MODEL_ORDER];
    }
    return availableModels;
  }
}

/**
 * Get current operational model
 */
function getActiveModel() {
  if (availableModels.length === 0) return 'gemini-flash-lite-latest';
  return availableModels[activeModelIndex % availableModels.length];
}

/**
 * Advance to next model on 429/404
 */
function rotateToNextModel() {
  if (availableModels.length > 1) {
    activeModelIndex = (activeModelIndex + 1) % availableModels.length;
    console.log(`[GEMINI] 🔄 Rotating to next operational model: ${getActiveModel()}`);
  }
}

/**
 * Score news item with Google Gemini
 */
async function scoreWithGemini(headline, summary, source) {
  const apiKey = config.google?.apiKey;
  if (!apiKey) throw new Error('Missing GOOGLE_API_KEY');

  if (Date.now() < cooldownUntil) {
    throw new Error('Google Gemini in cooldown due to temporary rate limits');
  }

  // Ensure models are discovered
  if (availableModels.length === 0) {
    await discoverModels();
  }

  const prompt = `You are a quantitative gold (XAU/USD) trading analyst.
Analyze this news item for its direct impact on Gold price (XAU/USD), US Dollar (DXY), and Treasury yields.

Source: ${source}
Headline: ${headline}
Summary: ${summary || '(no summary available)'}

OUTPUT RULES:
- Output valid JSON ONLY:
{
  "impact": "HIGH" | "MED" | "LOW",
  "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
  "reasoning": "crisp 1-sentence explanation"
}`;

  // Try up to 3 candidate models in our pool
  const maxAttempts = Math.min(3, availableModels.length || 1);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentModel = getActiveModel();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 200,
        },
      };

      const res = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      const candidateText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) throw new Error('Empty response from Gemini');

      // Strip potential markdown codefence if present
      const cleaned = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (_) {
        const m = cleaned.match(/\{[\s\S]*?\}/);
        if (m) parsed = JSON.parse(m[0]);
      }

      if (!parsed || !parsed.bias) {
        throw new Error('Incomplete JSON schema returned');
      }

      consecutiveFailures = 0;
      return {
        headline,
        impact: ['HIGH', 'MED', 'LOW'].includes(parsed.impact) ? parsed.impact : 'LOW',
        bias: ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(parsed.bias) ? parsed.bias : 'NEUTRAL',
        reasoning: parsed.reasoning || '',
        model: `gemini/${currentModel}`,
        provider: 'Google Gemini',
        scoredAt: new Date().toISOString(),
      };
    } catch (err) {
      const status = err.response?.status;
      if (status === 429 || status === 404 || status === 400 || status === 503) {
        rotateToNextModel();
      }

      if (attempt === maxAttempts - 1) {
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_FAILURES_BEFORE_COOLDOWN) {
          cooldownUntil = Date.now() + 60 * 1000;
        }
        throw err;
      }
    }
  }

  throw new Error('Gemini model attempts exhausted');
}

/**
 * Generate AI Market Guidance & Volatility Warnings (NO TRADE SETUPS)
 */
async function generateMarketGuidance(marketData) {
  const apiKey = config.google?.apiKey;
  if (!apiKey) throw new Error('Missing GOOGLE_API_KEY');

  const currentModel = getActiveModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

  const prompt = `You are an institutional macro risk manager for XAU/USD gold trading desk.
Analyze this real-time telemetry:
Gold Spot: $${marketData.goldPrice || 'N/A'} (5m velocity: ${marketData.goldChange5m || 0}%)
DXY: ${marketData.dxyPrice || 'N/A'} (5m chg: ${marketData.dxyChange5m || 0}%)
US 10Y Yield: ${marketData.us10yPrice || 'N/A'}%
Session: ${marketData.activeSession || 'N/A'}
Next Event: ${marketData.nextEvent?.title || 'None imminent'} in ${marketData.nextEvent?.minsUntil || 'N/A'}m

DO NOT provide trade setups, entries, stop losses, or price targets.
Output JSON ONLY:
{
  "regime": "ACCUMULATION" | "EXPANSION" | "COMPRESSION" | "DISTRIBUTION",
  "riskLevel": "LOW" | "ELEVATED" | "CRITICAL",
  "guidance": "2 concise sentences explaining macro price driver and market posture.",
  "warnings": ["Warning 1", "Warning 2"],
  "watchpoints": ["Watchpoint 1", "Watchpoint 2"]
}`;

  const res = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.15,
      maxOutputTokens: 300,
    },
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 6000,
  });

  const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const cleaned = (raw || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (_) {
    const m = cleaned.match(/\{[\s\S]*?\}/);
    if (m) parsed = JSON.parse(m[0]);
  }

  if (parsed && parsed.guidance) {
    return {
      ...parsed,
      model: `gemini/${currentModel}`,
      provider: 'Google Gemini',
      generatedAt: new Date().toISOString(),
    };
  }

  throw new Error('Could not parse market guidance JSON');
}

/**
 * Get status of Gemini engine
 */
function getStatus() {
  return {
    hasKey: !!config.google?.apiKey,
    activeModel: getActiveModel(),
    discoveredModels: availableModels,
    inCooldown: Date.now() < cooldownUntil,
    cooldownRemainingMs: Math.max(0, cooldownUntil - Date.now()),
  };
}

/**
 * Update key or force model from settings
 */
function updateConfig({ apiKey, model }) {
  if (apiKey) {
    config.google.apiKey = apiKey;
    consecutiveFailures = 0;
    cooldownUntil = 0;
    discoverModels(true);
  }
  if (model && availableModels.includes(model)) {
    activeModelIndex = availableModels.indexOf(model);
  }
  return getStatus();
}

module.exports = {
  discoverModels,
  scoreWithGemini,
  generateMarketGuidance,
  getStatus,
  updateConfig,
};
