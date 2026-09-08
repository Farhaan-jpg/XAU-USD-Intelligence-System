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
    news: 15000,       // 15 seconds (zero delay independent feed cycles)
    calendar: 10000,   // 10 seconds
  },

  // Yahoo Finance symbols
  symbols: {
    XAUUSD: 'GC=F',       // Gold Futures (best XAU/USD proxy)
    XAGUSD: 'SI=F',       // Silver Futures
    DXY: 'DX-Y.NYB',      // US Dollar Index
    US10Y: '^TNX',         // 10-Year Treasury Yield
    US02Y: '^IRX',         // 2-Year Treasury (13-week used as proxy)
    USDJPY: 'JPY=X',       // USD/JPY
  },

  // RSS news feed sources
  rssFeeds: [
    { name: 'ForexLive', url: 'https://www.forexlive.com/feed/news' },
    { name: 'FXStreet', url: 'https://www.fxstreet.com/rss/news' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
    { name: 'Investing.com Commodities', url: 'https://www.investing.com/rss/commodities.rss' },
    { name: 'Investing.com Gold', url: 'https://www.investing.com/rss/news_25.rss' },
    { name: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories/' },
    { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
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
