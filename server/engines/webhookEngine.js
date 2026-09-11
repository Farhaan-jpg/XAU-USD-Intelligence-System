// server/engines/webhookEngine.js
// Universal Outbound Webhook Dispatcher for Discord, Slack, and Custom HTTP Endpoints
// Broadcasts high-impact market events, volatility spikes, calendar warnings, and price alerts

const axios = require('axios');
const http = require('http');
const https = require('https');
const config = require('../config');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 20 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 20 });
const fastAxios = axios.create({ httpAgent, httpsAgent, timeout: 4000 });

let webhookConfig = {
  url: process.env.WEBHOOK_URL || '',
  type: process.env.WEBHOOK_TYPE || 'discord', // 'discord' | 'slack' | 'custom'
  enabled: true,
};

function updateConfig(url, type = 'discord', enabled = true) {
  webhookConfig.url = url || '';
  webhookConfig.type = type || 'discord';
  webhookConfig.enabled = enabled !== false;
}

function getConfig() {
  return { ...webhookConfig };
}

/**
 * Format payload according to target platform (Discord Rich Embed vs Slack Block vs JSON)
 */
function formatPayload({ title, description, color, fields = [], footer = 'XAU/USD Intelligence System v3.0' }) {
  const type = (webhookConfig.type || 'discord').toLowerCase();

  if (type === 'discord') {
    // Discord Embed format
    let colorDec = 0xE5A93C; // Default gold
    if (color === 'green' || color === 'bull') colorDec = 0x10B981;
    else if (color === 'red' || color === 'bear') colorDec = 0xF43F5E;
    else if (color === 'cyan') colorDec = 0x38BDF8;
    else if (color === 'purple') colorDec = 0x8B5CF6;

    return {
      username: 'XAU/USD Intelligence Terminal',
      avatar_url: 'https://raw.githubusercontent.com/tradingview/tradingview/master/favicon.ico',
      embeds: [
        {
          title,
          description,
          color: colorDec,
          fields: fields.map((f) => ({ name: f.name, value: String(f.value), inline: f.inline !== false })),
          footer: { text: `${footer} • ${new Date().toISOString().slice(11, 19)} UTC` },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  if (type === 'slack') {
    // Slack Blocks format
    return {
      text: `*${title}*\n${description}`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${title}*\n${description}` },
        },
        ...(fields.length > 0
          ? [
              {
                type: 'section',
                fields: fields.map((f) => ({ type: 'mrkdwn', text: `*${f.name}:*\n${f.value}` })),
              },
            ]
          : []),
      ],
    };
  }

  // Generic / Custom Webhook payload
  return {
    source: 'XAU/USD Intelligence System',
    timestamp: new Date().toISOString(),
    event: title,
    description,
    data: fields.reduce((acc, f) => {
      acc[f.name.toLowerCase().replace(/\s+/g, '_')] = f.value;
      return acc;
    }, {}),
  };
}

/**
 * Dispatch message to configured webhook URL
 */
async function dispatch(eventData) {
  if (!webhookConfig.enabled || !webhookConfig.url) return { success: false, reason: 'unconfigured' };

  try {
    const payload = formatPayload(eventData);
    const res = await fastAxios.post(webhookConfig.url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return { success: true, status: res.status };
  } catch (err) {
    console.warn('[WEBHOOK] Dispatch warning:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * High-Impact News Alert
 */
async function sendNewsAlert(newsItem) {
  const isBull = newsItem.bias === 'BULLISH';
  const isBear = newsItem.bias === 'BEARISH';
  const biasEmoji = isBull ? '🟢 BULLISH FOR GOLD' : isBear ? '🔴 BEARISH FOR GOLD' : '⚪ NEUTRAL';

  return dispatch({
    title: `🚨 HIGH IMPACT NEWS: ${newsItem.source || 'Financial Wire'}`,
    description: `**${newsItem.headline || newsItem.title}**\n\n${newsItem.summary || ''}`,
    color: isBull ? 'green' : isBear ? 'red' : 'gold',
    fields: [
      { name: 'Bias', value: biasEmoji, inline: true },
      { name: 'Impact', value: '🔥 HIGH', inline: true },
      { name: 'Reasoning', value: newsItem.reasoning || 'Macro catalyst', inline: false },
    ],
  });
}

/**
 * T-5 Min Economic Warning
 */
async function sendCalendarAlert(event) {
  return dispatch({
    title: `📅 ECONOMIC WARNING: T-5 MINUTES`,
    description: `High-impact economic catalyst releasing in 5 minutes. Wide spreads and elevated volatility expected.`,
    color: 'red',
    fields: [
      { name: 'Event', value: event.title, inline: true },
      { name: 'Currency', value: `[${event.currency}] ${event.country || ''}`, inline: true },
      { name: 'Forecast', value: event.forecast || '--', inline: true },
      { name: 'Previous', value: event.previous || '--', inline: true },
    ],
  });
}

/**
 * Volatility Surge Alarm
 */
async function sendVolatilitySpikeAlert({ spotPrice, delta, durationSec, direction }) {
  const isUp = direction === 'UP';
  return dispatch({
    title: `⚡ VOLATILITY SURGE ALARM`,
    description: `Gold spot price experienced an aggressive velocity impulse of **${isUp ? '+' : ''}$${delta.toFixed(2)}** in under **${durationSec}s**.`,
    color: isUp ? 'green' : 'red',
    fields: [
      { name: 'Current Spot', value: `$${spotPrice.toFixed(2)}`, inline: true },
      { name: 'Impulse Direction', value: isUp ? '▲ AGGRESSIVE EXPANSION' : '▼ LIQUIDATION CASCADE', inline: true },
      { name: 'Action Protocol', value: 'Maintain active stop armor; avoid premature counter-trend fills.', inline: false },
    ],
  });
}

/**
 * Custom Price Target Alert
 */
async function sendPriceAlert({ targetPrice, spotPrice, condition, label }) {
  const condText = condition === '>' ? 'Crossed Above' : 'Dropped Below';
  return dispatch({
    title: `🎯 PRICE LEVEL TARGET TRIGGERED`,
    description: `Gold spot has **${condText}** your target level of **$${targetPrice.toFixed(2)}**.`,
    color: condition === '>' ? 'green' : 'red',
    fields: [
      { name: 'Target Level', value: `$${targetPrice.toFixed(2)}`, inline: true },
      { name: 'Trigger Spot', value: `$${spotPrice.toFixed(2)}`, inline: true },
      { name: 'Label', value: label || 'Custom Alert', inline: false },
    ],
  });
}

/**
 * Test Webhook Connection
 */
async function sendTestMessage(url, type = 'discord') {
  if (!url) throw new Error('Webhook URL is required');

  const oldUrl = webhookConfig.url;
  const oldType = webhookConfig.type;
  webhookConfig.url = url;
  webhookConfig.type = type;

  try {
    const payload = formatPayload({
      title: '✅ XAU/USD Terminal Webhook Test',
      description: 'Webhook integration is successfully active and streaming real-time alerts.',
      color: 'green',
      fields: [
        { name: 'Status', value: 'ONLINE & VERIFIED', inline: true },
        { name: 'Platform', value: type.toUpperCase(), inline: true },
        { name: 'Timestamp', value: new Date().toISOString(), inline: false },
      ],
    });

    const res = await fastAxios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return { success: true, status: res.status, message: 'Test message sent successfully' };
  } finally {
    webhookConfig.url = oldUrl;
    webhookConfig.type = oldType;
  }
}

module.exports = {
  updateConfig,
  getConfig,
  dispatch,
  sendNewsAlert,
  sendCalendarAlert,
  sendVolatilitySpikeAlert,
  sendPriceAlert,
  sendTestMessage,
};
