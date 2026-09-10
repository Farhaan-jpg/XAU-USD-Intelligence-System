// server/config.js
// Centralised configuration loader — reads all secrets from process.env
// Never hardcodes credentials. Validates on startup.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const required = ['OPENROUTER_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.warn(`[CONFIG] ⚠️  Missing environment variables: ${missing.join(', ')}`);
  console.warn('[CONFIG] Telegram alerts and OpenRouter AI will be degraded. Add to .env or Render environment settings.');
  // Non-fatal: dashboard core (prices, calendar, news) continues without these
}

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openrouter/free', // Official Free Models Router (auto-switches across all available free models)
    fallbackModel: 'nvidia/nemotron-3.5-lightning:free',
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
    news: 3500,        // 3.5 seconds (ultra-fast real-time financial wire refresh)
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

  // Reputed Institutional Real-Time RSS News Feeds (Tier-1 Sources)
  rssFeeds: [
    { name: 'Investing.com Gold', url: 'https://www.investing.com/rss/news_25.rss' },
    { name: 'Investing.com Commodities', url: 'https://www.investing.com/rss/commodities.rss' },
    { name: 'Investing.com Economy', url: 'https://www.investing.com/rss/news_14.rss' },
    { name: 'Investing.com Forex', url: 'https://www.investing.com/rss/news_1.rss' },
    { name: 'Al Jazeera Breaking', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'CNBC Commodities', url: 'https://www.cnbc.com/id/19836768/device/rss/rss.html' },
    { name: 'CNBC Economy', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
    { name: 'FXStreet Live', url: 'https://www.fxstreet.com/rss/news' },
    { name: 'ForexLive Instant', url: 'https://www.forexlive.com/feed/news' },
    { name: 'FinancialJuice Wire', url: 'https://www.financialjuice.com/feed.ashx' },
  ],

  // Gold, macro & geopolitical trigger keywords
  goldKeywords: [
    'gold', 'xau', 'silver', 'xag', 'bullion', 'precious metal', 'commodity',
    'federal reserve', 'fed', 'fomc', 'rate cut', 'rate hike', 'interest rate',
    'cpi', 'inflation', 'deflation', 'nfp', 'non-farm', 'payroll', 'jobless',
    'unemployment', 'pce', 'core pce', 'gdp', 'pmi', 'retail sales',
    'treasury', 'yield', 'dollar', 'dxy', 'usd', 'central bank', 'ecb', 'boe', 'boj', 'pboc',
    'china gold', 'safe haven', 'jerome powell', 'powell', 'yellen', 'bessent',
    'recession', 'stagflation', 'hard landing', 'soft landing',
    'ukraine', 'middle east', 'war', 'sanctions', 'oil', 'crude', 'brent', 'wti',
    'risk off', 'risk on', 'bond', 'deficit', 'debt ceiling', 'quantitative', 'qe', 'qt',
    'iran', 'israel', 'lebanon', 'gaza', 'houthi', 'red sea', 'strait of hormuz',
    'missile', 'airstrike', 'strike', 'escalation', 'ceasefire', 'taiwan',
    'russia', 'nato', 'tariff', 'trade war', 'geopolitical', 'opec',
  ],
};

module.exports = config;
