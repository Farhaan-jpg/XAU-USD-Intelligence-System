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
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemma-4-26b-a4b-it',
  'gemini-3.8-flash',
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
  if (availableModels.length === 0) return 'gemini-3.6-flash';
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

  const prompt = `You are a quantitative gold (XAU/USD) trading analyst at an institutional hedge fund.
Analyze this news item for its direct impact on Gold price (XAU/USD), US Dollar (DXY), and Treasury yields.

Source: ${source}
Headline: ${headline}
Summary: ${summary || '(no summary available)'}

OUTPUT RULES:
- Output ONLY valid JSON, no surrounding markdown codeblocks, no explanations outside JSON.
- impact: "HIGH" (FOMC, NFP, CPI, PCE, geopolitical war/missile escalation, central bank policy surprise), "MED" (treasury yields move, GDP, PMI, dollar fluctuations), or "LOW" (routine commentary, noise).
- bias: "BULLISH" (drives gold price higher), "BEARISH" (drives gold price lower), or "NEUTRAL" (no clear directional edge).
- reasoning: exactly 1 crisp, highly technical sentence explaining the market transmission mechanism.

JSON Structure:
{
  "impact": "HIGH" | "MED" | "LOW",
  "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
  "reasoning": "string"
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
          maxOutputTokens: 250,
        },
      };

      const res = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 6500,
      });

      const candidateText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) throw new Error('Empty response from Gemini');

      // Strip potential markdown codefence if present
      const cleaned = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (!parsed.impact || !parsed.bias || !parsed.reasoning) {
        throw new Error('Incomplete JSON schema returned');
      }

      consecutiveFailures = 0;
      return {
        headline,
        impact: ['HIGH', 'MED', 'LOW'].includes(parsed.impact) ? parsed.impact : 'LOW',
        bias: ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(parsed.bias) ? parsed.bias : 'NEUTRAL',
        reasoning: parsed.reasoning,
        model: `gemini/${currentModel}`,
        provider: 'Google Gemini',
        scoredAt: new Date().toISOString(),
      };
    } catch (err) {
      const status = err.response?.status;
      console.warn(`[GEMINI] Attempt with ${currentModel} failed (${status || err.code}): ${err.message}`);

      // Rotate model on rate limit or model not found
      if (status === 429 || status === 404 || status === 400) {
        rotateToNextModel();
      }

      if (attempt === maxAttempts - 1) {
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_FAILURES_BEFORE_COOLDOWN) {
          cooldownUntil = Date.now() + 60 * 1000; // 1 min cooldown before trying Google again
          console.warn('[GEMINI] Entering 60s cooldown; handing off to OpenRouter.');
        }
        throw err;
      }
    }
  }

  throw new Error('Gemini model attempts exhausted');
}

/**
 * Generate AI Trade Setup & Playbook based on real-time market confluence
 */
async function generateTradeCopilot(marketData) {
  const apiKey = config.google?.apiKey;
  if (!apiKey) throw new Error('Missing GOOGLE_API_KEY');

  const currentModel = getActiveModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

  const prompt = `You are the Lead Quantitative Gold Trader for a proprietary trading desk.
Analyze the following real-time institutional gold telemetry:

Gold Spot (XAU/USD): $${marketData.goldPrice || 'N/A'}
Gold 5-Min Velocity: ${marketData.goldChange5m || 0}%
DXY Dollar Index: ${marketData.dxyPrice || 'N/A'} (5m chg: ${marketData.dxyChange5m || 0}%)
US 10Y Yield: ${marketData.us10yPrice || 'N/A'}%
Silver (XAG/USD): $${marketData.silverPrice || 'N/A'}
Gold-Silver Ratio (GSR): ${marketData.gsr || 'N/A'}
Active Session: ${marketData.activeSession || 'N/A'}
Key Recent News Headlines:
${(marketData.recentHeadlines || []).slice(0, 4).map((h, i) => `${i + 1}. ${h}`).join('\n') || 'None'}
Upcoming Red-Folder Event: ${marketData.nextEvent?.title || 'None in immediate window'} in ${marketData.nextEvent?.minsUntil || 'N/A'} mins

TASK:
Produce an actionable, institutional-grade trade setup and scenario playbook.
Output ONLY valid JSON.

JSON Structure:
{
  "bias": "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL",
  "confidence": number (50-98),
  "strategy": "string (e.g., Asian Liquidity Sweep & London Expansion)",
  "entryZone": "string (e.g., $2342.50 - $2345.00)",
  "stopLoss": "string (e.g., $2337.80)",
  "target1": "string (e.g., $2354.00)",
  "target2": "string (e.g., $2366.50)",
  "riskReward": "string (e.g., 1:2.8)",
  "invalidation": "string (one concise condition that voids this setup)",
  "macroThesis": "string (two concise sentences summarizing yield/dollar/sentiment confluence)",
  "scenarioPlaybook": {
    "bullTrigger": "string",
    "bearTrigger": "string"
  }
}`;

  const res = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.15,
      maxOutputTokens: 500,
    },
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 9000,
  });

  const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const cleaned = (raw || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return {
    ...parsed,
    model: `gemini/${currentModel}`,
    provider: 'Google Gemini',
    generatedAt: new Date().toISOString(),
  };
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
  generateTradeCopilot,
  getStatus,
  updateConfig,
};
