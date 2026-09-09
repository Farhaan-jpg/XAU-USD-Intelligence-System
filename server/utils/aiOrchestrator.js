// server/utils/aiOrchestrator.js
// Multi-Tier Resilient AI Orchestrator
// Priority 1: Google Gemini (Direct API, structured JSON)
// Priority 2: OpenRouter Auto-Fallback (Free models, capped tokens, zero token waste)
// Zero keyword-based rules; pure AI-driven evaluation

const gemini = require('./gemini');
const openrouter = require('./openrouter');

let lastScoredProvider = 'ai-engine';
let aiStats = {
  googleCount: 0,
  openrouterCount: 0,
  neutralCount: 0,
  totalScored: 0,
};

/**
 * Score a news item using purely AI models
 */
async function scoreNewsItem(headline, summary, source) {
  aiStats.totalScored++;

  // Tier 1: Try Google Gemini if configured
  try {
    const result = await gemini.scoreWithGemini(headline, summary, source);
    if (result && result.impact && result.bias) {
      aiStats.googleCount++;
      lastScoredProvider = 'Google Gemini';
      return result;
    }
  } catch (_) {}

  // Tier 2: OpenRouter Free Model Fallback
  try {
    const result = await openrouter.scoreNewsItem(headline, summary, source);
    if (result && result.model && !result.model.includes('baseline')) {
      aiStats.openrouterCount++;
      lastScoredProvider = 'OpenRouter Free Model';
      return {
        ...result,
        provider: 'OpenRouter AI',
      };
    }
  } catch (_) {}

  // Tier 3: Pure Neutral Baseline (No artificial keyword bias)
  aiStats.neutralCount++;
  lastScoredProvider = 'Market Neutral Baseline';
  return {
    headline,
    impact: 'LOW',
    bias: 'NEUTRAL',
    reasoning: 'Neutral market context — awaiting further AI directional catalyst.',
    model: 'neutral-baseline',
    provider: 'Market Engine',
    scoredAt: new Date().toISOString(),
  };
}

/**
 * Generate AI Market Guidance & Volatility Warnings (No trade setups)
 */
async function getMarketGuidance(marketData) {
  // Try OpenRouter free models or Google Gemini for market guidance
  try {
    return await openrouter.generateMarketGuidance(marketData);
  } catch (err) {
    console.warn(`[AI-ORCHESTRATOR] Market guidance fallback: ${err.message}`);
    return await openrouter.generateMarketGuidance(marketData);
  }
}

/**
 * Returns overall AI system telemetry
 */
function getSystemTelemetry() {
  const geminiStatus = gemini.getStatus();
  return {
    activeProvider: lastScoredProvider,
    gemini: geminiStatus,
    stats: aiStats,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  scoreNewsItem,
  getMarketGuidance,
  getSystemTelemetry,
  discoverModels: gemini.discoverModels,
  updateGeminiConfig: gemini.updateConfig,
  updateOpenRouterConfig: openrouter.updateConfig,
};
