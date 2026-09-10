// server/utils/eventImpactTracker.js
// Post-Event Price Impact Tracker — records Gold price displacement at T0, T+5m, T+15m, T+30m for high impact catalysts

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../data');
const IMPACT_FILE = path.join(DATA_DIR, 'eventImpacts.json');

let trackedImpacts = [];
let io = null;

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[IMPACT-TRACKER] Notice creating data dir:', err.message);
  }
}

function loadPersistedImpacts() {
  ensureDataDir();
  try {
    if (fs.existsSync(IMPACT_FILE)) {
      const raw = fs.readFileSync(IMPACT_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        trackedImpacts = parsed;
      }
    }
  } catch (err) {
    console.warn('[IMPACT-TRACKER] Notice loading impacts:', err.message);
  }
}

function saveImpacts() {
  ensureDataDir();
  try {
    fs.writeFileSync(IMPACT_FILE, JSON.stringify(trackedImpacts.slice(0, 50), null, 2), 'utf8');
  } catch (err) {
    console.warn('[IMPACT-TRACKER] Notice saving impacts:', err.message);
  }
}

function init(socketIo) {
  io = socketIo;
  loadPersistedImpacts();
}

/**
 * Classify market price displacement
 */
function classifyImpact(netChange, maxRange) {
  if (Math.abs(netChange) >= 12.0) {
    return netChange > 0 ? 'BULLISH_EXPANSION' : 'BEARISH_EXPANSION';
  }
  if (maxRange >= 15.0 && Math.abs(netChange) < 6.0) {
    return 'VOLATILE_WHIPSAW';
  }
  if (Math.abs(netChange) >= 5.0) {
    return netChange > 0 ? 'MODERATE_UP' : 'MODERATE_DOWN';
  }
  return 'MUTED_REACTION';
}

/**
 * Check active events and update tracking
 */
function checkEvents(calendarEvents, currentPrice) {
  if (!currentPrice || !Array.isArray(calendarEvents)) return;

  const now = Date.now();
  const highImpact = calendarEvents.filter((e) => e.impact === 'HIGH' || e.impact === 'MED');

  for (const ev of highImpact) {
    const eventTime = new Date(ev.date).getTime();
    const diffMs = now - eventTime;
    const diffMinutes = diffMs / 60000;

    let existing = trackedImpacts.find((item) => item.eventId === ev.id);

    // If event is around release time (-1 min to +4 mins) and not yet registered
    if (!existing && diffMinutes >= -1 && diffMinutes <= 4) {
      existing = {
        eventId: ev.id,
        title: ev.title,
        currency: ev.currency,
        impact: ev.impact,
        releaseTime: ev.date,
        timeIST: ev.timeIST || '',
        actual: ev.actual || '',
        forecast: ev.forecast || '',
        previous: ev.previous || '',
        t0Price: currentPrice,
        t5Price: null,
        t15Price: null,
        t30Price: null,
        currentPrice,
        maxPrice: currentPrice,
        minPrice: currentPrice,
        netChange: 0,
        netPercent: 0,
        classification: 'PENDING_RELEASE',
        lastUpdated: new Date().toISOString(),
      };
      trackedImpacts.unshift(existing);
      saveImpacts();

      if (io) {
        io.emit('event_impact_update', existing);
      }
    }

    if (existing) {
      // Update max & min seen
      existing.maxPrice = Math.max(existing.maxPrice || currentPrice, currentPrice);
      existing.minPrice = Math.min(existing.minPrice || currentPrice, currentPrice);
      existing.currentPrice = currentPrice;
      existing.actual = ev.actual || existing.actual;

      // Check T+5m
      if (diffMinutes >= 5 && !existing.t5Price) {
        existing.t5Price = currentPrice;
      }
      // Check T+15m
      if (diffMinutes >= 15 && !existing.t15Price) {
        existing.t15Price = currentPrice;
      }
      // Check T+30m
      if (diffMinutes >= 30 && !existing.t30Price) {
        existing.t30Price = currentPrice;
      }

      // Net change from T0
      const base = existing.t0Price || currentPrice;
      existing.netChange = parseFloat((currentPrice - base).toFixed(2));
      existing.netPercent = parseFloat((base > 0 ? (existing.netChange / base) * 100 : 0).toFixed(3));
      const range = (existing.maxPrice || currentPrice) - (existing.minPrice || currentPrice);
      existing.classification = classifyImpact(existing.netChange, range);
      existing.lastUpdated = new Date().toISOString();
    }
  }
}

function getRecentImpacts() {
  return trackedImpacts.slice(0, 20);
}

module.exports = {
  init,
  checkEvents,
  getRecentImpacts,
};
