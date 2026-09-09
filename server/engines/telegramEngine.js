// server/engines/telegramEngine.js
// Telegram Bot alerting engine
// Sends formatted HIGH-impact news alerts asynchronously

const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

let bot = null;
let isReady = false;

function init() {
  try {
    bot = new TelegramBot(config.telegram.token, { polling: false });
    isReady = true;
    console.log('[TELEGRAM] Bot initialised successfully');
  } catch (err) {
    console.error('[TELEGRAM] Failed to init bot:', err.message);
    isReady = false;
  }
}

/**
 * Send a HIGH-impact news alert to Telegram
 * @param {object} newsItem
 */
async function sendNewsAlert(newsItem) {
  if (!isReady || !bot) {
    console.warn('[TELEGRAM] Bot not ready — skipping alert');
    return;
  }

  const { headline, bias, reasoning, source, impact, scoredAt } = newsItem;

  const biasEmoji = bias === 'BULLISH' ? '🟢' : bias === 'BEARISH' ? '🔴' : '⚪';
  const impactEmoji = impact === 'HIGH' ? '⚡' : impact === 'MED' ? '⚠️' : 'ℹ️';

  const now = scoredAt ? new Date(scoredAt) : new Date();
  const utcTime = now.toUTCString();
  const localTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });

  const message = `${impactEmoji} *[XAU/USD ${impact} IMPACT ALERT]*

📰 *Headline:* ${escapeMarkdown(headline)}

${biasEmoji} *Bias:* ${bias}
📊 *Impact:* ${impact}
💡 *Summary:* ${escapeMarkdown(reasoning)}

🗞️ *Source:* ${escapeMarkdown(source || 'Unknown')}
🕐 *UTC:* ${utcTime}
🕑 *IST:* ${localTime}

_Powered by XAU\\/USD Pro Dashboard_`;

  try {
    await bot.sendMessage(config.telegram.chatId, message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });
    console.log(`[TELEGRAM] ✅ Alert sent: ${headline.substring(0, 60)}...`);
  } catch (err) {
    console.error('[TELEGRAM] Failed to send alert:', err.message);

    // Fallback: try plain text if markdown fails
    try {
      const plainMessage = `⚡ [XAU/USD ${impact} IMPACT ALERT]\n\nHeadline: ${headline}\nBias: ${bias}\nSummary: ${reasoning}\nSource: ${source}\nTime: ${utcTime}`;
      await bot.sendMessage(config.telegram.chatId, plainMessage);
      console.log('[TELEGRAM] ✅ Alert sent (plain text fallback)');
    } catch (plainErr) {
      console.error('[TELEGRAM] Plain text fallback also failed:', plainErr.message);
    }
  }
}

/**
 * Send a calendar pre-event warning
 */
async function sendCalendarAlert(event) {
  if (!isReady || !bot) return;

  const message = `⏰ *[XAU\\/USD PRE\\-EVENT WARNING]*

🗓️ *Event:* ${escapeMarkdown(event.title)}
⏱️ *Time:* T\\-5 minutes
🌍 *Region:* ${escapeMarkdown(event.country || 'US')}
📊 *Expected Impact:* HIGH

_Prepare your positions\\. High volatility expected\\._`;

  try {
    await bot.sendMessage(config.telegram.chatId, message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });
    console.log(`[TELEGRAM] ✅ Calendar alert sent: ${event.title}`);
  } catch (err) {
    console.error('[TELEGRAM] Calendar alert failed:', err.message);
  }
}

/**
 * Send startup confirmation message
 */
async function sendStartupMessage() {
  if (!isReady || !bot) return;

  const message = `🚀 *XAU\\/USD Pro Dashboard Online*

✅ Price Engine: Active
✅ News Engine: Active  
✅ Calendar Engine: Active
✅ AI Sentiment: Active
✅ Telegram Alerts: Active

📊 Monitoring 6 correlated instruments
📰 Tracking 6 news sources
⚡ HIGH impact alerts enabled

_Dashboard started at ${new Date().toUTCString()}_`;

  try {
    await bot.sendMessage(config.telegram.chatId, message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });
    console.log('[TELEGRAM] ✅ Startup message sent');
  } catch (err) {
    console.error('[TELEGRAM] Startup message failed:', err.message);
  }
}

/**
 * Send test alert to verify Telegram credentials
 */
async function sendTestAlert(customToken, customChatId) {
  const tokenToUse = customToken || config.telegram.token;
  const chatToUse = customChatId || config.telegram.chatId;

  if (!tokenToUse || !chatToUse) {
    throw new Error('Telegram Bot Token and Chat ID are required');
  }

  const testBot = new TelegramBot(tokenToUse, { polling: false });
  const msg = `🔔 *[XAU/USD PRO TEST ALERT]*\n\n✅ Connection Successful!\nYour Telegram bot is properly configured to receive real-time Gold scalping signals, AI news analysis, and Tier-1 economic alerts.\n\n🕐 *UTC:* ${new Date().toUTCString()}\n_XAU/USD Pro Trading Terminal_`;

  await testBot.sendMessage(chatToUse, msg, { parse_mode: 'Markdown' });
  return { success: true, message: 'Test message delivered to Telegram' };
}

/**
 * Update Telegram credentials at runtime
 */
function updateConfig(newToken, newChatId) {
  if (newToken) config.telegram.token = newToken;
  if (newChatId) config.telegram.chatId = newChatId;
  init();
  return { isReady };
}

/**
 * Broadcast an AI Trade Setup card to Telegram
 */
async function sendTradeSignal(tradePlan, spotPrice) {
  if (!isReady || !bot) return { success: false, error: 'Telegram bot not configured' };

  const biasEmoji = (tradePlan.bias || '').includes('BUY') ? '🟢 LONG' : '🔴 SHORT';
  const confidence = tradePlan.confidence || 85;

  const message = `🎯 *[XAU/USD INSTITUTIONAL TRADE SETUP]*

⚡ *Action:* ${biasEmoji}
💰 *Spot Ref:* $${spotPrice || '--'}
🚪 *Optimal Entry:* $${tradePlan.entryZone || '--'}
🛑 *Invalidation SL:* $${tradePlan.stopLoss || '--'}
🎯 *Take Profit 1:* $${tradePlan.takeProfit1 || '--'}
🏆 *Take Profit 2:* $${tradePlan.takeProfit2 || '--'}
⚖️ *Risk/Reward:* ${tradePlan.riskReward || '1:2.5'}
🛡️ *Confidence:* ${confidence}%

📝 *Institutional Thesis:*
${escapeMarkdown(tradePlan.narrative || tradePlan.setup || 'High-probability technical confluence setup.')}

⚠️ *Pre-News Scenario:*
${escapeMarkdown(tradePlan.preEventPlaybook || 'Maintain strict risk management ahead of catalysts.')}

🕐 *Timestamp:* ${new Date().toUTCString()}
_Automated from XAU/USD Intelligence System_`;

  try {
    await bot.sendMessage(config.telegram.chatId, message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });
    console.log(`[TELEGRAM] ✅ Trade signal broadcast sent: ${tradePlan.bias}`);
    return { success: true };
  } catch (err) {
    console.error('[TELEGRAM] Trade signal send failed, falling back to plain text:', err.message);
    try {
      const plain = `🎯 [XAU/USD TRADE SETUP]\nAction: ${tradePlan.bias}\nEntry: ${tradePlan.entryZone}\nSL: ${tradePlan.stopLoss}\nTP1: ${tradePlan.takeProfit1}\nTP2: ${tradePlan.takeProfit2}\nRR: ${tradePlan.riskReward}\n\nThesis: ${tradePlan.narrative || ''}\nTime: ${new Date().toUTCString()}`;
      await bot.sendMessage(config.telegram.chatId, plain);
      return { success: true };
    } catch (fallbackErr) {
      return { success: false, error: fallbackErr.message };
    }
  }
}

/**
 * Escape special MarkdownV2 characters
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

module.exports = { init, sendNewsAlert, sendCalendarAlert, sendTradeSignal, sendStartupMessage, sendTestAlert, updateConfig };
