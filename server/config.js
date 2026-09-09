// server/config.js
// Centralised configuration loader — reads all secrets from process.env
// Never hardcodes credentials. Validates on startup.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const required = ['OPENROUTER_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[CONFIG] ❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('[CONFIG] Please copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-4-31b-it:free',
    fallbackModel: 'nvidia/nemotron-3-super-120b-a12b:free',
  },

  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },

  google: {
    apiKey: process.env.GOOGLE_API_KEY,
  },

  // Polling intervals (ms) — optimized for zero delay and real-time streaming
  intervals: {
    price: 2500,       // 2.5 seconds (ultra responsive tick streaming)
    news: 8000,        // 8 seconds (fast real-time financial wire refresh)
    calendar: 10000,   // 10 seconds
  },

  // Market proxy symbols
  symbols: {
    XAUUSD: 'GC=F',       // Gold Futures (best XAU/USD proxy)
    XAGUSD: 'SI=F',       // Silver Futures
    DXY: 'DX-Y.NYB',      // US Dollar Index
    US10Y: '^TNX',         // 10-Year Treasury Yield
    US02Y: '^IRX',         // 2-Year Treasury (13-week used as proxy)
    USDJPY: 'JPY=X',       // USD/JPY
    OIL: 'CL=F',           // WTI Crude Oil
  },

  // Reputed Institutional Real-Time RSS News Feeds (No Delayed Aggregators like Yahoo Finance)
  rssFeeds: [
    { name: 'FinancialJuice Wire', url: 'https://www.financialjuice.com/feed.ashx' }, // Real-time institutional financial squawk/breaking wire
    { name: 'ForexLive Instant', url: 'https://www.forexlive.com/feed/news' },         // Fast FX & central bank breaking news
    { name: 'FXStreet Live', url: 'https://www.fxstreet.com/rss/news' },               // Institutional Gold & macro coverage
    { name: 'Reuters Business Wire', url: 'https://feeds.feedburner.com/reuters/businessNews' }, // Global Tier-1 breaking wire
    { name: 'Investing.com Gold', url: 'https://www.investing.com/rss/news_25.rss' },  // Gold specific spot analysis & flow
    { name: 'Investing.com Commodities', url: 'https://www.investing.com/rss/commodities.rss' }, // Metals & energy macro
    { name: 'MarketWatch Top Wire', url: 'https://feeds.marketwatch.com/marketwatch/topstories/' }, // US Treasury & Fed flow
    { name: 'Al Jazeera Breaking', url: 'https://www.aljazeera.com/xml/rss/all.xml' }, // Geopolitical safe-haven escalations
    { name: 'BBC World Wire', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },     // Geopolitics & international sanctions
  ],

  // Gold-relevance trigger keywords
  goldKeywords: [
    'gold', 'xau', 'federal reserve', 'fed', 'fomc', 'rate cut', 'rate hike',
    'interest rate', 'cpi', 'inflation', 'nfp', 'non-farm', 'payroll',
    'treasury', 'yield', 'dollar', 'dxy', 'geopolitical', 'central bank',
    'china gold', 'safe haven', 'precious metal', 'bullion', 'pce', 'core pce',
    'jerome powell', 'powell', 'recession', 'ukraine', 'middle east', 'war',
    'sanctions', 'oil', 'crude', 'risk off', 'risk on', 'silver', 'commodity',
    'bond', 'deficit', 'debt ceiling', 'quantitative', 'qe', 'qt',
    'iran', 'israel', 'lebanon', 'gaza', 'houthi', 'red sea', 'strait of hormuz',
    'missile', 'airstrike', 'strike', 'escalation', 'ceasefire', 'taiwan',
    'russia', 'nato', 'tariff', 'trade war',
  ],
};

module.exports = config;
