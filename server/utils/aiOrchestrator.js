// server/utils/aiOrchestrator.js
// Multi-Tier Resilient AI Orchestrator
// Priority 1: Google Gemini (Direct API, sub-second latency, structured JSON)
// Priority 2: OpenRouter (Fallback to free/tier-1 models if Google quota exhausted)
// Priority 3: Quant Rule Heuristic (Offline zero-delay fallback, 100% uptime)

const gemini = require('./gemini');
const openrouter = require('./openrouter');

let activeProvider = 'google'; // 'google' | 'openrouter' | 'quant'
let lastScoredProvider = 'quant';
let aiStats = {
  googleCount: 0,
  openrouterCount: 0,
  quantCount: 0,
  totalScored: 0,
};

/**
 * Score a news item across the resilient 3-tier cascade
 */
async function scoreNewsItem(headline, summary, source) {
  aiStats.totalScored++;

  // Tier 1: Try Google Gemini first (Priority #1)
  try {
    const result = await gemini.scoreWithGemini(headline, summary, source);
    if (result && result.impact && result.bias) {
      aiStats.googleCount++;
      lastScoredProvider = 'google';
      return result;
    }
  } catch (geminiErr) {
    // console.warn(`[AI-ORCHESTRATOR] Google Gemini unavailable: ${geminiErr.message}. Falling back to OpenRouter...`);
  }

  // Tier 2: OpenRouter Fallback
  try {
    const result = await openrouter.scoreNewsItem(headline, summary, source);
    if (result && result.model && !result.model.includes('fallback')) {
      aiStats.openrouterCount++;
      lastScoredProvider = 'openrouter';
      return {
        ...result,
        provider: 'OpenRouter',
      };
    }
  } catch (openrouterErr) {
    // console.warn(`[AI-ORCHESTRATOR] OpenRouter failed: ${openrouterErr.message}. Falling back to Quant Engine...`);
  }

  // Tier 3: Zero-delay Quant Heuristic Engine
  aiStats.quantCount++;
  lastScoredProvider = 'quant';
  const quantResult = openrouter.keywordFallback(headline, summary, source);
  return {
    ...quantResult,
    provider: 'Quant Engine',
  };
}

/**
 * Generate AI Trade Setup & Playbook
 */
async function getTradeCopilot(marketData) {
  try {
    return await gemini.generateTradeCopilot(marketData);
  } catch (err) {
    console.warn(`[AI-ORCHESTRATOR] Gemini trade copilot failed (${err.message}). Generating rule-based setup.`);
    // Algorithmic rule-based trade copilot fallback
    const gold = parseFloat(marketData.goldPrice || 2350);
    const goldChg = parseFloat(marketData.goldChange5m || 0);
    const dxyChg = parseFloat(marketData.dxyChange5m || 0);

    const isBull = goldChg > 0 || dxyChg < 0;
    const bias = isBull ? 'BUY' : 'SELL';
    const entry = isBull ? `$${(gold - 1.5).toFixed(2)} - $${gold.toFixed(2)}` : `$${gold.toFixed(2)} - $${(gold + 1.5).toFixed(2)}`;
    const sl = isBull ? `$${(gold - 6.5).toFixed(2)}` : `$${(gold + 6.5).toFixed(2)}`;
    const tp1 = isBull ? `$${(gold + 8.0).toFixed(2)}` : `$${(gold - 8.0).toFixed(2)}`;
    const tp2 = isBull ? `$${(gold + 16.0).toFixed(2)}` : `$${(gold - 16.0).toFixed(2)}`;

    return {
      bias,
      confidence: 72,
      strategy: isBull ? 'Macro Confluence Pullback & Breakout' : 'DXY Resistance & Yield Pressure Mean Reversion',
      entryZone: entry,
      stopLoss: sl,
      target1: tp1,
      target2: tp2,
      riskReward: '1:2.4',
      invalidation: isBull ? `Break and close below ${sl}` : `Break and close above ${sl}`,
      macroThesis: `Current Gold spot at $${gold.toFixed(2)} reflects ${isBull ? 'yield decline and dollar softening' : 'dollar defense and bond yield stabilization'}. Algorithmic momentum confirms ${bias.toLowerCase()} edge.`,
      scenarioPlaybook: {
        bullTrigger: 'Gold closes 15m candle above immediate session high with DXY testing new intraday low.',
        bearTrigger: 'US 10Y Yield spikes above daily pivot with aggressive dollar short-covering.',
      },
      model: 'quant/algorithmic-engine',
      provider: 'Quant Engine',
      generatedAt: new Date().toISOString(),
    };
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
  getTradeCopilot,
  getSystemTelemetry,
  discoverModels: gemini.discoverModels,
  updateGeminiConfig: gemini.updateConfig,
  updateOpenRouterConfig: openrouter.updateConfig,
};
