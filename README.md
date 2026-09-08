# 🥇 XAU/USD Pro — Gold Trading Dashboard

> Production-grade real-time trading dashboard and alerting engine for XAU/USD (Gold) scalpers.

## Features

- **📊 Live Price Hub** — 6 correlated instruments (XAU/USD, DXY, XAG/USD, US10Y, US02Y, USD/JPY) with 5-second refresh
- **📡 AI News Sentiment** — 6 RSS feeds filtered for gold relevance, scored by Claude 3.5 Haiku via OpenRouter
- **🗓️ Economic Calendar** — FOMC, CPI, NFP, PCE, PMI with live countdown and T-5min alerts
- **⚡ Telegram Alerts** — Instant HIGH-impact alerts pushed to your Telegram channel
- **🌑 Dark Terminal UI** — Glassmorphism + scanline aesthetic, mobile-responsive

## Quick Start

```bash
# Install all dependencies (server + client)
npm run install:all

# Run in development mode (server + client concurrently)
npm run dev
```

Open `http://localhost:5173` in your browser.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
OPENROUTER_API_KEY=sk-or-v1-...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
PORT=3001
```

## Architecture

```
Server (Node.js + Express + Socket.io)
├── Price Engine   — Yahoo Finance polling every 5s
├── News Engine    — 6 RSS feeds → Gold filter → AI scoring → Telegram
├── Calendar Engine — Economic events + countdown + T-5min alerts
└── Telegram Engine — Bot API for all alerts

Client (Vite + React 18)
├── PriceGrid     — Live 6-cell instrument hub
├── NewsFeed      — Real-time AI-scored news with filter controls
├── Calendar      — Event countdown + upcoming list
└── AlertBanner   — Pre-event full-width warning
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Server health + uptime |
| `GET /api/prices` | Latest price data for all 6 instruments |
| `GET /api/news?limit=20` | Recent gold-relevant news with AI scores |
| `GET /api/calendar` | Upcoming economic events |

## WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `price_update` | Server → Client | Price tick for all 6 instruments |
| `news_item` | Server → Client | New scored news item |
| `news_batch` | Server → Client | Initial news batch on connect |
| `calendar_update` | Server → Client | Calendar + countdown state |

## Tech Stack

- **Backend**: Node.js 20, Express 4, Socket.io 4
- **Frontend**: Vite 5, React 18, Vanilla CSS
- **AI**: OpenRouter → Anthropic Claude 3.5 Haiku
- **Messaging**: Telegram Bot API
- **Data**: Yahoo Finance 2, RSS Parser
