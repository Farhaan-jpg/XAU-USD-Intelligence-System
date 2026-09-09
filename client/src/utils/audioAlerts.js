// client/src/utils/audioAlerts.js
// Institutional Voice Squawk Engine & Web Audio API Synth Engine
// Features authentic Indian Female Voice prioritization, speech queueing, and financial text normalization

const SETTINGS_KEY = 'xau_voice_settings';
const MUTE_KEY = 'xau_audio_muted';

const DEFAULT_SETTINGS = {
  voiceUri: 'auto', // 'auto' finds best Indian Female Voice
  volume: 1.0,
  rate: 1.03, // Crisp institutional squawk cadence
  pitch: 1.06, // Clear, pleasant natural female pitch
  enabledEvents: {
    news: true,
    trade_alert: true, // Trade Copilot Setups & Targets
    calendar: true,
    confluence: false, // Disabled by default: prevents repetitive vocal bias chatter, uses subtle chime instead
    divergence: true,
    liquidity: true,
    volatility: true,
    sessions: true,
    guidance: false,
  },
};

let cachedSettings = null;
export function getVoiceSettings() {
  if (cachedSettings) return cachedSettings;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };

      // Migration v2: Silence repetitive market bias voice alerts by default unless explicitly re-enabled
      if (localStorage.getItem('xau_bias_quiet_v2') !== 'migrated') {
        cachedSettings.enabledEvents.confluence = false;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(cachedSettings));
        localStorage.setItem('xau_bias_quiet_v2', 'migrated');
      }

      // Ensure nested enabledEvents has all keys
      cachedSettings.enabledEvents = {
        ...DEFAULT_SETTINGS.enabledEvents,
        ...(cachedSettings.enabledEvents || {}),
      };
      return cachedSettings;
    }
  } catch (_) {}
  cachedSettings = { ...DEFAULT_SETTINGS };
  return cachedSettings;
}

export function updateVoiceSettings(newSettings) {
  const current = getVoiceSettings();
  cachedSettings = {
    ...current,
    ...newSettings,
    enabledEvents: {
      ...current.enabledEvents,
      ...(newSettings.enabledEvents || {}),
    },
  };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(cachedSettings));
  } catch (_) {}
  return cachedSettings;
}

export function toggleVoiceEventChannel(channelKey) {
  const current = getVoiceSettings();
  const currentVal = current.enabledEvents[channelKey] !== false;
  return updateVoiceSettings({
    enabledEvents: {
      ...current.enabledEvents,
      [channelKey]: !currentVal,
    },
  });
}

let isAudioMuted = localStorage.getItem(MUTE_KEY) === 'true';
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isMuted() {
  return isAudioMuted;
}

export function toggleAudioMute() {
  isAudioMuted = !isAudioMuted;
  localStorage.setItem(MUTE_KEY, isAudioMuted ? 'true' : 'false');
  if (isAudioMuted && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  return isAudioMuted;
}

// -------------------------------------------------------------
// Web Audio API Synthesizers (Institutional Floor Chimes)
// -------------------------------------------------------------

/**
 * High-Impact Flash News Alert (Dual Chime: 880Hz -> 1320Hz)
 */
export function playFlashAlert() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1320, now + 0.12);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (_) {}
}

/**
 * Economic Event T-5 Warning (Pulsed Warning Chord)
 */
export function playEventWarning() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    });
  } catch (_) {}
}

/**
 * Institutional Confluence Shift Alert (Deep Sub Chime)
 */
export function playConfluenceAlert() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch (_) {}
}

/**
 * Macro Divergence Alert (Double Beep: 750Hz -> 950Hz)
 */
export function playDivergenceAlert() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.setValueAtTime(950, now + 0.1);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  } catch (_) {}
}

/**
 * Liquidity Sweep Alert (High-Velocity Ping: 1046Hz -> 1568Hz)
 */
export function playLiquiditySweepAlert() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now);
    osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.15);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (_) {}
}

/**
 * Volatility Trap Alert (Descending Warning Pulse: 900Hz -> 450Hz)
 */
export function playTrapAlert() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.25);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  } catch (_) {}
}

/**
 * Bearish Alert (Institutional Descending Warning Chime: 587Hz -> 370Hz)
 */
export function playBearishAlert() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(369.99, now + 0.22); // F#4

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.38);
  } catch (_) {}
}

/**
 * Session Transition Alert (Tri-tone Chime)
 */
export function playSessionAlert() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [440, 554.37, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.05, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  } catch (_) {}
}

// -------------------------------------------------------------
// Voice Detection & Indian Female Voice Prioritization
// -------------------------------------------------------------

/**
 * Scores voices to find the best authentic Indian Female Voice
 */
function scoreIndianFemaleVoice(voice) {
  const name = (voice.name || '').toLowerCase();
  const lang = (voice.lang || '').toLowerCase();

  let score = 0;

  // Exact Indian English or Hindi match
  const isIndianLang = lang.includes('en-in') || lang.includes('en_in') || lang.includes('hi-in');

  if (isIndianLang) {
    score += 50;

    // Microsoft Neerja Online (Natural) is Microsoft's state-of-the-art Indian female voice
    if (name.includes('neerja') && (name.includes('natural') || name.includes('online'))) score += 50;
    else if (name.includes('neerja')) score += 45;
    else if (name.includes('heera')) score += 42; // Microsoft Heera is Windows standard Indian female voice
    else if (name.includes('swara')) score += 38;
    else if (name.includes('kalpana') || name.includes('priya') || name.includes('veena') || name.includes('aditi')) score += 35;
    else if (name.includes('google') && name.includes('india')) score += 32;
    else if (name.includes('female')) score += 30;
    else score += 20;
  } else if (name.includes('india') || name.includes('hindi')) {
    score += 40;
    if (name.includes('female') || name.includes('heera') || name.includes('neerja')) score += 30;
  } else {
    // If no Indian voice is installed, prefer clear natural female voices as fallback
    if (lang.startsWith('en')) {
      if (name.includes('natural') || name.includes('online')) score += 15;
      if (name.includes('zira') || name.includes('jenny') || name.includes('aria') || name.includes('female')) score += 15;
    }
  }

  return score;
}

let loadedVoices = [];
function refreshVoices() {
  if (!('speechSynthesis' in window)) return [];
  loadedVoices = window.speechSynthesis.getVoices() || [];
  return loadedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoices();
  };
}

/**
 * Get all available voices annotated with Indian Female identification
 */
export function getAvailableVoices() {
  const voices = refreshVoices();
  if (!voices || voices.length === 0) return [];

  const scored = voices.map((v) => {
    const score = scoreIndianFemaleVoice(v);
    const isIndian = score >= 50;
    return {
      voice: v,
      name: v.name,
      lang: v.lang,
      score,
      isIndianFemale: isIndian,
      recommended: false,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored.length > 0 && scored[0].score >= 30) {
    scored[0].recommended = true;
  }

  return scored;
}

/**
 * Resolves the chosen voice according to settings
 */
export function resolveSpeechVoice() {
  const settings = getVoiceSettings();
  const voices = refreshVoices();
  if (!voices || voices.length === 0) return null;

  // If user selected a specific voice URI/name
  if (settings.voiceUri && settings.voiceUri !== 'auto') {
    const userVoice = voices.find((v) => v.voiceURI === settings.voiceUri || v.name === settings.voiceUri);
    if (userVoice) return userVoice;
  }

  // Auto-detect highest scoring Indian Female Voice
  let bestVoice = null;
  let highestScore = -1;

  for (const v of voices) {
    const score = scoreIndianFemaleVoice(v);
    if (score > highestScore) {
      highestScore = score;
      bestVoice = v;
    }
  }

  return bestVoice || voices[0];
}

// -------------------------------------------------------------
// Financial Text Normalizer
// -------------------------------------------------------------

/**
 * Converts trading symbols, acronyms, and formats to smooth natural speech
 */
export function normalizeFinancialText(text) {
  if (!text) return '';

  let speech = text;

  // Replace price references: $2350.50 -> 2350 dollars and 50 cents
  speech = speech.replace(/\$([0-9]+)\.([0-9]{2})/g, '$1 dollars and $2 cents');
  speech = speech.replace(/\$([0-9]+)/g, '$1 dollars');

  // Common Financial and Trading acronyms
  speech = speech
    .replace(/\bXAU\/USD\b|\bXAUUSD\b/gi, 'Gold')
    .replace(/\bXAG\/USD\b|\bXAGUSD\b/gi, 'Silver')
    .replace(/\bDXY\b/g, 'D-X-Y')
    .replace(/\bUS10Y\b|\bTNX\b/gi, 'U-S 10-year yield')
    .replace(/\bUS02Y\b/gi, 'U-S 2-year yield')
    .replace(/\bBSL\b/g, 'Buy side liquidity')
    .replace(/\bSSL\b/g, 'Sell side liquidity')
    .replace(/\bFVG\b/g, 'Fair value gap')
    .replace(/\bOB\b/g, 'Order block')
    .replace(/\bbps\b/gi, 'basis points')
    .replace(/\bbp\b/gi, 'basis points')
    .replace(/\bFOMC\b/g, 'F-O-M-C')
    .replace(/\bCPI\b/g, 'C-P-I')
    .replace(/\bNFP\b/g, 'Non-Farm Payrolls')
    .replace(/\bPMI\b/g, 'P-M-I')
    .replace(/\bGDP\b/g, 'G-D-P')
    .replace(/\bCOT\b/g, 'Commitment of Traders')
    .replace(/\bSMC\b/g, 'Smart Money Concepts')
    .replace(/\bICT\b/g, 'I-C-T')
    .replace(/\bT-5m\b|\bT-5min\b/gi, '5 minutes')
    .replace(/\bT-1m\b|\bT-1min\b/gi, '1 minute')
    .replace(/\bvs\b/gi, 'versus')
    .replace(/&/g, 'and');

  // Remove URLs and markdown/bracket characters
  speech = speech
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[*_#`~[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return speech;
}

// -------------------------------------------------------------
// Speech Queue & Chrome Keep-Alive Engine
// -------------------------------------------------------------

const speechQueue = [];
let isSpeaking = false;
let keepAliveTimer = null;
const lastSpokenMap = new Map();

function startKeepAlive() {
  if (keepAliveTimer) return;
  // Chrome stops speech if it takes more than 15s. Toggling pause/resume resets the timer.
  keepAliveTimer = setInterval(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10000);
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function processQueue() {
  if (isAudioMuted || !('speechSynthesis' in window)) {
    speechQueue.length = 0;
    isSpeaking = false;
    stopKeepAlive();
    return;
  }

  if (isSpeaking || speechQueue.length === 0) {
    return;
  }

  const task = speechQueue.shift();
  isSpeaking = true;
  startKeepAlive();

  try {
    const utterance = new SpeechSynthesisUtterance(task.text);
    const settings = getVoiceSettings();

    utterance.volume = task.volume !== undefined ? task.volume : settings.volume;
    utterance.rate = task.rate !== undefined ? task.rate : settings.rate;
    utterance.pitch = task.pitch !== undefined ? task.pitch : settings.pitch;

    const voice = resolveSpeechVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      isSpeaking = false;
      setTimeout(processQueue, 150); // slight breathing room between squawks
    };

    utterance.onerror = (e) => {
      console.warn('[AUDIO] Squawk playback warning:', e.error);
      isSpeaking = false;
      setTimeout(processQueue, 150);
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('[AUDIO] Failed to speak utterance:', err);
    isSpeaking = false;
    stopKeepAlive();
  }
}

/**
 * Institutional Squawk Synthesizer
 * Speaks notifications with Indian Female voice, optional pre-chime, and deduplication
 *
 * @param {string} message - Raw message to speak
 * @param {Object} [options]
 * @param {string} [options.category] - 'news' | 'calendar' | 'confluence' | 'divergence' | 'liquidity' | 'volatility' | 'sessions' | 'guidance'
 * @param {string} [options.preChime] - 'flash' | 'event' | 'confluence' | 'divergence' | 'liquidity' | 'trap' | 'session'
 * @param {boolean} [options.priority] - High priority preemption
 * @param {number} [options.cooldownSeconds] - Deduplication window (default: 25s)
 * @param {number} [options.rate] - Optional rate override
 * @param {number} [options.pitch] - Optional pitch override
 */
export function speakSquawk(message, options = {}) {
  if (isAudioMuted || !('speechSynthesis' in window)) return;
  if (!message || typeof message !== 'string') return;

  const settings = getVoiceSettings();
  const category = options.category;

  // Check if category is enabled in user settings
  if (category && settings.enabledEvents) {
    if ((category === 'trade_alert' || category === 'copilot') && settings.enabledEvents.trade_alert === false) {
      return;
    }
    if (settings.enabledEvents[category] === false) {
      return;
    }
  }

  // Deduplication to prevent voice spam
  const cooldown = (options.cooldownSeconds || 25) * 1000;
  const now = Date.now();
  const cacheKey = options.dedupeKey || `${category || 'general'}_${message.trim().toLowerCase()}`;
  const lastSpoken = lastSpokenMap.get(cacheKey);

  if (lastSpoken && now - lastSpoken < cooldown) {
    return;
  }
  lastSpokenMap.set(cacheKey, now);

  // Clean old keys from map periodically
  if (lastSpokenMap.size > 100) {
    for (const [k, v] of lastSpokenMap.entries()) {
      if (now - v > 60000) lastSpokenMap.delete(k);
    }
  }

  const cleanText = normalizeFinancialText(message);
  if (!cleanText) return;

  // Play pre-roll institutional audio chime if requested
  const preChime = options.preChime;
  let chimeDelay = 0;

  if (preChime) {
    chimeDelay = 220;
    if (preChime === 'flash') playFlashAlert();
    else if (preChime === 'event') playEventWarning();
    else if (preChime === 'confluence') playConfluenceAlert();
    else if (preChime === 'divergence') playDivergenceAlert();
    else if (preChime === 'liquidity') playLiquiditySweepAlert();
    else if (preChime === 'trap') playTrapAlert();
    else if (preChime === 'session') playSessionAlert();
    else if (preChime === 'bearish') playBearishAlert();
  }

  setTimeout(() => {
    if (options.priority) {
      speechQueue.unshift({
        text: cleanText,
        volume: options.volume,
        rate: options.rate,
        pitch: options.pitch,
      });
    } else {
      speechQueue.push({
        text: cleanText,
        volume: options.volume,
        rate: options.rate,
        pitch: options.pitch,
      });
    }
    processQueue();
  }, chimeDelay);
}

/**
 * Instant voice test function for Indian Female Voice
 */
export function testIndianFemaleVoice(customText) {
  if (isAudioMuted) toggleAudioMute(); // Auto-unmute for test
  playFlashAlert();
  setTimeout(() => {
    const text =
      customText ||
      'Gold Intelligence squawk online. Monitoring high impact macro events, smart liquidity pools, and institutional order flows.';
    speakSquawk(text, { priority: true, cooldownSeconds: 0 });
  }, 220);
}
