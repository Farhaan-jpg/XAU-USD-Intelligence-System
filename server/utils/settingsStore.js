// server/utils/settingsStore.js
// Persistent file-backed store for user settings (survives container restarts if mounted or local disk)

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[SETTINGS-STORE] Notice creating data dir:', err.message);
  }
}

function loadSettings() {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[SETTINGS-STORE] Notice loading settings:', err.message);
  }
  return null;
}

function saveSettings(settings) {
  ensureDataDir();
  try {
    const existing = loadSettings() || {};
    const updated = { ...existing, ...settings, updatedAt: new Date().toISOString() };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  } catch (err) {
    console.warn('[SETTINGS-STORE] Notice saving settings:', err.message);
    return null;
  }
}

module.exports = {
  loadSettings,
  saveSettings,
};
