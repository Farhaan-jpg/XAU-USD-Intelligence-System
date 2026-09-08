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
const telegramEngine = require('./engines/telegramEngine');
const { updateConfig: updateOpenRouterConfig } = require('./utils/openrouter');
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
      telegram: true,
    },
  });
});

app.get('/api/prices', (req, res) => {
  res.json(priceEngine.getLatest());
});

app.get('/api/news', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20'), 50);
  res.json(newsEngine.getLatest().slice(0, limit));
});

app.get('/api/calendar', (req, res) => {
  res.json(calendarEngine.getData());
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  const maskKey = (k) => (k ? `${k.substring(0, 8)}...${k.slice(-4)}` : '');
  res.json({
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
    google: {
      hasKey: !!config.google.apiKey,
      maskedKey: maskKey(config.google.apiKey),
    },
    intervals: config.intervals,
    feeds: config.rssFeeds.map((f) => ({ name: f.name, url: f.url })),
  });
});

app.post('/api/settings', (req, res) => {
  try {
    const { openrouterKey, model, fallbackModel, telegramToken, telegramChatId, intervals } = req.body;

    if (openrouterKey || model || fallbackModel) {
      updateOpenRouterConfig({
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

    res.json({ success: true, message: 'Settings updated successfully' });
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
    socket.emit('news_batch', latestNews.slice(0, 20));
  }

  const calendarData = calendarEngine.getData();
  socket.emit('calendar_update', { ...calendarData, serverTime: new Date().toISOString() });

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

  // Init Telegram first so other engines can use it
  telegramEngine.init();

  // Init engines with Socket.io instance
  priceEngine.init(io);
  newsEngine.init(io);
  calendarEngine.init(io);

  // Start all engines
  priceEngine.start();
  newsEngine.start();
  calendarEngine.start();

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
