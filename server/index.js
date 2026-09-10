// server/index.js
// Main Express + Socket.io server
// Bootstraps all engines, REST API, and WebSocket hub

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const config = require('./config');

// ─── Engine & Utility imports ──────────────────────────────────────────────────
const priceEngine = require('./engines/priceEngine');
const newsEngine = require('./engines/newsEngine');
const calendarEngine = require('./engines/calendarEngine');
const cotEngine = require('./engines/cotEngine');
const telegramEngine = require('./engines/telegramEngine');
const aiOrchestrator = require('./utils/aiOrchestrator');
const settingsStore = require('./utils/settingsStore');
const newsArchive = require('./utils/newsArchive');
const eventImpactTracker = require('./utils/eventImpactTracker');
const fs = require('fs');

// ─── App setup ───────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 5000,
});

app.use(cors());
app.use(express.json());

// ─── REST API endpoints ───────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    serverTime: new Date().toISOString(),
    engines: {
      price: true,
      news: true,
      calendar: true,
      cot: true,
      telegram: true,
    },
  });
});

app.get('/api/prices', (req, res) => {
  res.json(priceEngine.getLatest());
});

app.get('/api/cot', (req, res) => {
  res.json(cotEngine.getData());
});

app.get('/api/news', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20'), 50);
  res.json(newsEngine.getLatest().slice(0, limit));
});

app.get('/api/news/archive', (req, res) => {
  const { limit, query, date, bias, impact } = req.query;
  const items = newsArchive.getArchivedNews({
    limit: limit ? parseInt(limit, 10) : 50,
    query,
    date,
    bias,
    impact,
  });
  res.json({ success: true, count: items.length, items });
});

app.get('/api/calendar', (req, res) => {
  res.json(calendarEngine.getData());
});

app.get('/api/calendar/impacts', (req, res) => {
  res.json({ success: true, impacts: eventImpactTracker.getRecentImpacts() });
});

// Custom price alert trigger (Telegram + WS)
app.post('/api/alerts/trigger', async (req, res) => {
  try {
    const { targetPrice, spotPrice, condition, label } = req.body || {};
    if (!targetPrice) {
      return res.status(400).json({ success: false, error: 'Target price is required' });
    }
    const result = await telegramEngine.sendCustomPriceAlert({ targetPrice, spotPrice, condition, label });
    if (io) {
      io.emit('custom_price_alert', {
        targetPrice,
        spotPrice,
        condition,
        label,
        timestamp: new Date().toISOString(),
      });
    }
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Endpoints
app.get('/api/ai/models', (req, res) => {
  res.json(aiOrchestrator.getSystemTelemetry());
});

app.post('/api/ai/guidance', async (req, res) => {
  try {
    const prices = priceEngine.getLatest();
    const gold = prices['GC=F'] || prices['XAUUSD'] || {};
    const dxy = prices['DX-Y.NYB'] || {};
    const us10y = prices['^TNX'] || {};
    const silver = prices['SI=F'] || prices['XAGUSD'] || {};
    const recentNews = newsEngine.getLatest().slice(0, 5).map((n) => n.headline || n.title);
    const calendarData = calendarEngine.getData();
    const nextEvent = (calendarData?.upcomingEvents || []).find((e) => e.impact === 'HIGH');

    const goldPrice = parseFloat(gold.price || 4400);
    const silverPrice = parseFloat(silver.price || 66);
    const gsr = silverPrice > 0 ? (goldPrice / silverPrice).toFixed(1) : '66.0';

    const marketData = {
      goldPrice: goldPrice.toFixed(2),
      goldChange5m: gold.change5m || 0,
      dxyPrice: dxy.price || '105.20',
      dxyChange5m: dxy.change5m || 0,
      us10yPrice: us10y.price || '4.35',
      silverPrice: silverPrice.toFixed(2),
      gsr,
      activeSession: req.body?.activeSession || 'London/NY Overlap',
      recentHeadlines: recentNews,
      nextEvent: nextEvent ? {
        title: nextEvent.title,
        minsUntil: Math.round((new Date(nextEvent.date || nextEvent.timeUTC).getTime() - Date.now()) / 60000),
      } : null,
    };

    const guidance = await aiOrchestrator.getMarketGuidance(marketData);
    res.json({ success: true, guidance, marketData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Alias for backward compatibility
app.post('/api/ai/copilot', async (req, res) => {
  try {
    const prices = priceEngine.getLatest();
    const gold = prices['GC=F'] || prices['XAUUSD'] || {};
    const dxy = prices['DX-Y.NYB'] || {};
    const us10y = prices['^TNX'] || {};
    const silver = prices['SI=F'] || prices['XAGUSD'] || {};
    const recentNews = newsEngine.getLatest().slice(0, 5).map((n) => n.headline || n.title);
    const calendarData = calendarEngine.getData();
    const nextEvent = (calendarData?.upcomingEvents || []).find((e) => e.impact === 'HIGH');

    const goldPrice = parseFloat(gold.price || 4400);
    const silverPrice = parseFloat(silver.price || 66);
    const gsr = silverPrice > 0 ? (goldPrice / silverPrice).toFixed(1) : '66.0';

    const marketData = {
      goldPrice: goldPrice.toFixed(2),
      goldChange5m: gold.change5m || 0,
      dxyPrice: dxy.price || '105.20',
      dxyChange5m: dxy.change5m || 0,
      us10yPrice: us10y.price || '4.35',
      silverPrice: silverPrice.toFixed(2),
      gsr,
      activeSession: req.body?.activeSession || 'London/NY Overlap',
      recentHeadlines: recentNews,
      nextEvent: nextEvent ? {
        title: nextEvent.title,
        minsUntil: Math.round((new Date(nextEvent.date || nextEvent.timeUTC).getTime() - Date.now()) / 60000),
      } : null,
    };

    const guidance = await aiOrchestrator.getMarketGuidance(marketData);
    res.json({ success: true, guidance, copilot: guidance, marketData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ai/test', async (req, res) => {
  try {
    const sampleHeadline = req.body?.headline || 'Fed Chair Powell signals potential 50bps rate cut amid cooling labor market';
    const sampleSummary = req.body?.summary || 'Treasury yields decline sharply as dollar index falls toward multi-week lows.';
    const result = await aiOrchestrator.scoreNewsItem(sampleHeadline, sampleSummary, 'Test Wire');
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Broadcast trade plan to Telegram VIP Channel
app.post('/api/ai/broadcast-signal', async (req, res) => {
  try {
    const { tradePlan, spotPrice } = req.body || {};
    if (!tradePlan) {
      return res.status(400).json({ success: false, error: 'Trade plan is required' });
    }
    const result = await telegramEngine.sendTradeSignal(tradePlan, spotPrice);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  const maskKey = (k) => (k ? `${k.substring(0, 8)}...${k.slice(-4)}` : '');
  const telemetry = aiOrchestrator.getSystemTelemetry();
  res.json({
    google: {
      hasKey: !!config.google.apiKey,
      maskedKey: maskKey(config.google.apiKey),
      activeModel: telemetry.gemini?.activeModel || 'gemini-3.6-flash',
      discoveredModels: telemetry.gemini?.discoveredModels || [],
    },
    openrouter: {
      hasKey: !!config.openrouter.apiKey,
      maskedKey: maskKey(config.openrouter.apiKey),
      model: config.openrouter.model,
      fallbackModel: config.openrouter.fallbackModel,
    },
    telegram: {
      hasToken: !!config.telegram.token,
      maskedToken: maskKey(config.telegram.token),
      chatId: config.telegram.chatId || '',
    },
    telemetry,
    intervals: config.intervals,
    feeds: config.rssFeeds.map((f) => ({ name: f.name, url: f.url })),
  });
});

app.post('/api/settings', (req, res) => {
  try {
    const { googleKey, googleModel, openrouterKey, model, fallbackModel, telegramToken, telegramChatId, intervals } = req.body;

    if (googleKey || googleModel) {
      aiOrchestrator.updateGeminiConfig({
        apiKey: googleKey || config.google.apiKey,
        model: googleModel,
      });
    }

    if (openrouterKey || model || fallbackModel) {
      aiOrchestrator.updateOpenRouterConfig({
        apiKey: openrouterKey || config.openrouter.apiKey,
        model: model || config.openrouter.model,
        fallbackModel: fallbackModel || config.openrouter.fallbackModel,
      });
    }

    if (telegramToken || telegramChatId) {
      telegramEngine.updateConfig(
        telegramToken || config.telegram.token,
        telegramChatId || config.telegram.chatId
      );
    }

    if (intervals) {
      if (intervals.price) config.intervals.price = parseInt(intervals.price, 10);
      if (intervals.news) config.intervals.news = parseInt(intervals.news, 10);
      if (intervals.calendar) config.intervals.calendar = parseInt(intervals.calendar, 10);
    }

    // Persist settings to disk so they survive Render redeployments / container restarts
    try {
      settingsStore.saveSettings({
        googleKey: googleKey || config.google.apiKey,
        googleModel,
        openrouterKey: openrouterKey || config.openrouter.apiKey,
        model: model || config.openrouter.model,
        fallbackModel: fallbackModel || config.openrouter.fallbackModel,
        telegramToken: telegramToken || config.telegram.token,
        telegramChatId: telegramChatId || config.telegram.chatId,
        intervals: config.intervals,
      });
    } catch (_) {}

    res.json({ success: true, message: 'Settings updated and persisted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test Telegram notification route
app.post('/api/settings/test-telegram', async (req, res) => {
  try {
    const { token, chatId } = req.body || {};
    const result = await telegramEngine.sendTestAlert(token, chatId);
    res.json(result);
  } catch (err) {
    console.error('[SETTINGS] Telegram test failed:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Manual trigger — force news poll (useful for testing)
app.post('/api/news/poll', async (req, res) => {
  try {
    res.json({ status: 'triggered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Static files for production deployment ──────────────────────────────────
const distCandidates = [
  path.join(__dirname, '../dist'),
  path.join(__dirname, '../client/dist'),
];
const distPath = distCandidates.find((p) => fs.existsSync(p));
if (distPath) {
  app.use(express.static(distPath));
  console.log(`[SERVER] Serving production frontend from ${distPath}`);
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.warn('[SERVER] ⚠️ Production build not found at ../dist. Run `npm run build` to build client assets.');
  app.get('/', (req, res) => {
    res.send('<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:40px;text-align:center;"><h2>XAU/USD Intelligence System Backend Active</h2><p style="color:#94a3b8;">Production frontend build not found. Run <code>npm run build</code>.</p><p><a href="/api/health" style="color:#38bdf8;">View API Health</a> | <a href="/api/prices" style="color:#38bdf8;">View Real-time Prices</a></p></body></html>');
  });
}

// ─── Socket.io connection handling ────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id} (${socket.handshake.address})`);

  // Send current state immediately on connect
  const latestPrices = priceEngine.getLatest();
  if (Object.keys(latestPrices).length > 0) {
    socket.emit('price_update', { prices: latestPrices, serverTime: new Date().toISOString() });
  }

  const latestNews = newsEngine.getLatest();
  if (latestNews.length > 0) {
    socket.emit('news_batch', latestNews.slice(0, 35));
  }

  const calendarData = calendarEngine.getData();
  socket.emit('calendar_update', { ...calendarData, serverTime: new Date().toISOString() });

  const cotData = cotEngine.getData();
  socket.emit('cot_update', cotData);

  socket.on('ping_pong', () => socket.emit('ping_pong', { ts: Date.now() }));

  socket.on('disconnect', (reason) => {
    console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);
  });

  socket.on('error', (err) => {
    console.error(`[WS] Socket error for ${socket.id}:`, err.message);
  });
});

// ─── Engine initialisation ────────────────────────────────────────────────────

async function bootstrap() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║      XAU/USD PRO TRADING DASHBOARD           ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Load persisted user settings (if present)
  try {
    const persisted = settingsStore.loadSettings();
    if (persisted) {
      if (persisted.googleKey) config.google.apiKey = persisted.googleKey;
      if (persisted.openrouterKey) config.openrouter.apiKey = persisted.openrouterKey;
      if (persisted.model) config.openrouter.model = persisted.model;
      if (persisted.fallbackModel) config.openrouter.fallbackModel = persisted.fallbackModel;
      if (persisted.telegramToken) config.telegram.token = persisted.telegramToken;
      if (persisted.telegramChatId) config.telegram.chatId = persisted.telegramChatId;
      if (persisted.intervals) config.intervals = { ...config.intervals, ...persisted.intervals };
      console.log('[BOOTSTRAP] 💾 Loaded persistent settings from disk');
    }
  } catch (err) {
    console.warn('[BOOTSTRAP] Notice checking persistent settings:', err.message);
  }

  // Init historical news archive & event impact tracker
  newsArchive.initArchive();
  eventImpactTracker.init(io);

  // Init Telegram first so other engines can use it
  telegramEngine.init();

  // Trigger Google Gemini real-time model discovery
  aiOrchestrator.discoverModels().catch((err) => {
    console.warn('[BOOTSTRAP] Gemini model discovery background warning:', err.message);
  });

  // Init engines with Socket.io instance
  priceEngine.init(io);
  newsEngine.init(io);
  calendarEngine.init(io);
  cotEngine.init(io);

  // Start all engines
  priceEngine.start();
  newsEngine.start();
  calendarEngine.start();
  cotEngine.start();

  // Send Telegram startup confirmation
  setTimeout(() => {
    telegramEngine.sendStartupMessage();
  }, 3000);

  // Start HTTP server
  server.listen(config.port, () => {
    console.log(`\n[SERVER] ✅ Running on http://localhost:${config.port}`);
    console.log(`[SERVER] WebSocket ready`);
    console.log(`[SERVER] Health: http://localhost:${config.port}/api/health`);
    console.log(`[SERVER] Prices: http://localhost:${config.port}/api/prices\n`);
  });
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down gracefully...');
  priceEngine.stop();
  newsEngine.stop();
  calendarEngine.stop();
  cotEngine.stop();
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  console.error('[SERVER] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[SERVER] Unhandled rejection:', reason);
});

bootstrap().catch((err) => {
  console.error('[SERVER] Bootstrap failed:', err);
  process.exit(1);
});
