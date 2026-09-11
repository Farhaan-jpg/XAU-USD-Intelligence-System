// client/src/App.jsx
// XAU/USD Institutional Intelligence System — Single-Screen Unified Dashboard

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import Header from './components/Header';
import TradingChart from './components/TradingChart';
import KillzoneTracker from './components/KillzoneTracker';
import CorrelationMatrix from './components/CorrelationMatrix';
import ConfluenceMeter from './components/ConfluenceMeter';
import MacroRadar from './components/MacroRadar';
import AIMarketGuidance from './components/AIMarketGuidance';
import SessionClock from './components/SessionClock';
import NewsTerminal from './components/NewsTerminal';
import EconomicCalendar from './components/EconomicCalendar';
import SettingsModal from './components/SettingsModal';
import TelemetryModal from './components/TelemetryModal';
import SoundboardModal from './components/SoundboardModal';
import StatusBar from './components/StatusBar';
import SmartLiquidityRadar from './components/SmartLiquidityRadar';
import VolatilityTrapDetector from './components/VolatilityTrapDetector';
import COTSentimentGauge from './components/COTSentimentGauge';
import PriceAlerts from './components/PriceAlerts';
import AsianRangeBox from './components/AsianRangeBox';
import FearGreedGauge from './components/FearGreedGauge';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import MobileTraderDock from './components/MobileTraderDock';
import { speakSquawk, toggleAudioMute, playChime } from './utils/audioAlerts';
import { AlertTriangle, EyeOff } from 'lucide-react';

// ── Utility: compute active trading session from UTC hour ────────────
function getActiveSession() {
  const h = new Date().getUTCHours();
  if (h >= 0 && h < 7)  return 'Asian Session';
  if (h >= 7 && h < 12) return 'London Session';
  if (h >= 12 && h < 17) return 'London/NY Overlap';
  if (h >= 17 && h < 21) return 'New York Session';
  return 'Late NY / Pre-Asian';
}

export default function App() {
  const {
    connected,
    latency,
    prices,
    newsFeed,
    calendarData,
    cotData,
    latestAlert,
    calendarAlert,
  } = useSocket();

  // ── Modals & Mode States ─────────────────────────────────────────
  const [isSettingsOpen, setIsSettingsOpen]     = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen]   = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen]         = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen]   = useState(false);
  const [focusMode, setFocusMode]               = useState(false);
  const [aiTelemetry, setAiTelemetry]           = useState({});
  const [alertsCount, setAlertsCount]           = useState(0);

  // Active session — stored in ref, updated once per minute via timer
  const sessionRef = useRef(getActiveSession());
  const [activeSession, setActiveSession] = useState(sessionRef.current);
  useEffect(() => {
    const timer = setInterval(() => {
      const next = getActiveSession();
      if (next !== sessionRef.current) {
        sessionRef.current = next;
        setActiveSession(next);
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // ── Poll AI Telemetry every 15s ───────────────────────────────────
  useEffect(() => {
    const fetchTelemetry = () => {
      fetch('/api/ai/models')
        .then((r) => r.json())
        .then((d) => setAiTelemetry(d))
        .catch(() => {});
    };
    fetchTelemetry();
    const t = setInterval(fetchTelemetry, 15_000);
    return () => clearInterval(t);
  }, []);

  // ── Sync active custom price alerts count every 5s ────────────────
  const updateAlertsCount = useCallback(() => {
    try {
      const saved = localStorage.getItem('xauusd_custom_alerts');
      if (saved) {
        const list = JSON.parse(saved);
        setAlertsCount(list.filter((a) => a.active && !a.triggered).length);
      } else {
        setAlertsCount(0);
      }
    } catch (_) {
      setAlertsCount(0);
    }
  }, []);

  useEffect(() => {
    updateAlertsCount();
    const t = setInterval(updateAlertsCount, 5_000);
    return () => clearInterval(t);
  }, [updateAlertsCount]);

  // ── Request browser notification permission on first click ────────
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const ask = () => {
        Notification.requestPermission().catch(() => {});
        window.removeEventListener('click', ask);
      };
      window.addEventListener('click', ask, { once: true });
    }
  }, []);

  // ── Push notification for high-impact news (when tab is hidden) ───
  const lastNewsId = useRef(null);
  useEffect(() => {
    if (!latestAlert) return;
    const id = latestAlert.id || latestAlert.guid || latestAlert.headline;
    if (id === lastNewsId.current) return;
    lastNewsId.current = id;
    if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted' && latestAlert.impact === 'HIGH') {
      try {
        const notif = new Notification('🚨 HIGH IMPACT GOLD ALERT', {
          body: `${latestAlert.headline || latestAlert.title || 'Breaking News'}\nBias: ${latestAlert.bias || 'Neutral'}`,
          icon: '/favicon.ico',
          tag: `news_${id}`,
        });
        notif.onclick = () => { window.focus(); notif.close(); };
      } catch (_) {}
    }
    // Voice squawk
    if (latestAlert.impact === 'HIGH') {
      const headline = latestAlert.headline || latestAlert.title || '';
      if (!headline) return;
      const isBear = latestAlert.bias === 'BEARISH';
      const isBull = latestAlert.bias === 'BULLISH';
      speakSquawk(
        `${isBear ? 'Bearish News Alert for Gold' : isBull ? 'Bullish News Alert for Gold' : 'Breaking News Alert'}: ${headline}.`,
        { category: 'news', preChime: isBear ? 'bearish' : 'flash', dedupeKey: `news_${id}`, cooldownSeconds: 180, priority: true }
      );
    }
  }, [latestAlert]);

  // ── Push notification for economic calendar alert ─────────────────
  const lastCalId = useRef(null);
  useEffect(() => {
    if (!calendarAlert?.event) return;
    const ev = calendarAlert.event;
    if (ev.id === lastCalId.current) return;
    lastCalId.current = ev.id;
    const mins = calendarAlert.minutesLeft || 5;
    if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const notif = new Notification('📅 ECONOMIC WARNING (T-5 MIN)', {
          body: `[${ev.currency}] ${ev.title} releases in ${mins} minutes.`,
          icon: '/favicon.ico',
          tag: `cal_${ev.id}`,
        });
        notif.onclick = () => { window.focus(); notif.close(); };
      } catch (_) {}
    }
    speakSquawk(
      `Economic Warning. ${ev.title} for ${ev.currency} releases in ${mins} minutes. Expect elevated volatility.`,
      { category: 'calendar', preChime: 'event', priority: true }
    );
  }, [calendarAlert]);

  // ── Pre-event alert banner audio ──────────────────────────────────
  const showAlertBanner = calendarData?.preEventAlert;
  const lastBannerTitle = useRef(null);
  useEffect(() => {
    if (!showAlertBanner?.title) return;
    if (showAlertBanner.title === lastBannerTitle.current) return;
    lastBannerTitle.current = showAlertBanner.title;
    speakSquawk(
      `Economic Warning. ${showAlertBanner.title} imminent in ${showAlertBanner.minutesLeft || 5} minutes.`,
      { category: 'calendar', preChime: 'event' }
    );
  }, [showAlertBanner?.title]);

  // ── Copy executive snapshot to clipboard ─────────────────────────
  const handleCopySnapshot = useCallback(() => {
    const gold = prices['GC=F'] || prices['XAUUSD'] || {};
    const p   = parseFloat(gold.price || 0).toFixed(2);
    const ch  = parseFloat(gold.changeDay || gold.change5m || 0).toFixed(2);
    const vwap = gold.sessionVWAP ? parseFloat(gold.sessionVWAP).toFixed(2) : 'N/A';
    const cvd  = gold.cvd !== undefined ? gold.cvd.toFixed(0) : '0';
    const tps  = typeof gold.tapeSpeed === 'number' ? gold.tapeSpeed.toFixed(1) : '1.2';
    const poc  = gold.volumeProfile?.poc ? parseFloat(gold.volumeProfile.poc).toFixed(2) : 'N/A';
    const vah  = gold.volumeProfile?.vah ? parseFloat(gold.volumeProfile.vah).toFixed(2) : 'N/A';
    const val  = gold.volumeProfile?.val ? parseFloat(gold.volumeProfile.val).toFixed(2) : 'N/A';
    const utc  = new Date().toISOString().substring(0, 19).replace('T', ' ') + ' UTC';

    const text =
`📊 XAU/USD EXECUTIVE MARKET SNAPSHOT (${utc})
─────────────────────────────────────────
• Spot Gold: $${p} (${ch > 0 ? '+' : ''}${ch}%)
• Order Flow Velocity: ${tps} TPS
• Session VWAP: $${vwap} | CVD: ${cvd}
• VPVR: POC $${poc} | VAH $${vah} | VAL $${val}
• Active Session: ${activeSession}
• SMT Divergence: ${gold.smtDivergence?.status || 'NEUTRAL'}
─────────────────────────────────────────
Generated by XAU/USD Intelligence System`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
      playChime('chime');
    }
  }, [prices, activeSession]);

  // ── Global keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handle = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      switch (e.key) {
        case 'm': case 'M': e.preventDefault(); toggleAudioMute(); break;
        case 'g': case 'G': e.preventDefault(); window.dispatchEvent(new CustomEvent('refresh_guidance')); break;
        case 's': case 'S': e.preventDefault(); setIsSettingsOpen((v) => !v); break;
        case 't': case 'T': e.preventDefault(); setIsTelemetryOpen((v) => !v); break;
        case 'b': case 'B': e.preventDefault(); setIsSoundboardOpen((v) => !v); break;
        case 'c': case 'C': e.preventDefault(); handleCopySnapshot(); break;
        case 'p': case 'P': e.preventDefault(); setIsAlertsOpen((v) => !v); break;
        case 'f': case 'F': e.preventDefault(); setFocusMode((v) => !v); break;
        case '?': case 'h': case 'H': e.preventDefault(); setIsShortcutsOpen((v) => !v); break;
        case 'Escape':
          setIsSettingsOpen(false); setIsTelemetryOpen(false); setIsSoundboardOpen(false);
          setIsAlertsOpen(false); setIsShortcutsOpen(false); setFocusMode(false);
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [handleCopySnapshot]);

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className={`app-terminal${focusMode ? ' focus-mode-active' : ''}`}>

      {/* ── Sticky Institutional Header Bar ───────────────────── */}
      <Header
        connected={connected}
        latency={latency}
        prices={prices}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTelemetry={() => setIsTelemetryOpen(true)}
        onOpenSoundboard={() => setIsSoundboardOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode((f) => !f)}
        alertsCount={alertsCount}
        onCopySnapshot={handleCopySnapshot}
      />

      {/* ── Focus Mode Exit Banner ─────────────────────────────── */}
      {focusMode && (
        <div
          onClick={() => setFocusMode(false)}
          className="focus-mode-floating-banner"
          title="Click or press 'F' to exit focus mode"
        >
          <EyeOff size={13} />
          <span>FOCUS MODE ACTIVE — PRESS F OR CLICK TO EXIT</span>
        </div>
      )}

      {/* ── MAIN UNIFIED SINGLE-SCREEN DASHBOARD ─────────────── */}
      <main className="terminal-main">

        {/* T-5 Min Red-Folder Event Warning Banner */}
        {showAlertBanner?.title && (
          <div className="event-alert-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={15} style={{ color: 'var(--bear)', flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--bear)', letterSpacing: '0.06em' }}>
                  HIGH IMPACT CATALYST — T-{showAlertBanner.minutesRemaining || 5} MINUTES
                </span>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', marginTop: '1px' }}>
                  [{showAlertBanner.currency}] {showAlertBanner.title} — Wide spreads expected
                </div>
              </div>
            </div>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: 'var(--bear)', border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'nowrap' }}>
              DEFENSE MODE
            </span>
          </div>
        )}

        {/* ROW 1 — Session Timeline (full width) */}
        <SessionClock />

        {/* ROW 2 — 8-Asset Macro Radar (full width) */}
        <MacroRadar prices={prices} />

        {/* ROW 3 — Primary Grid: Chart (left) + Intelligence Sidebar (right) */}
        <div className="grid-terminal-top">
          {/* LEFT — Chart + Analytics Stack */}
          <div className="terminal-column-left">
            <TradingChart prices={prices} />

            {/* Asian Range + Volatility Trap — side-by-side */}
            <div className="grid-sub-2col">
              <AsianRangeBox prices={prices} />
              <VolatilityTrapDetector prices={prices} calendarData={calendarData} />
            </div>

            {/* Killzone + Correlation — side-by-side */}
            <div className="grid-sub-2col">
              <KillzoneTracker prices={prices} />
              <CorrelationMatrix prices={prices} />
            </div>
          </div>

          {/* RIGHT — Intelligence Stack */}
          <div className="terminal-column-right">
            <AIMarketGuidance
              activeSession={activeSession}
              prices={prices}
              calendarData={calendarData}
            />
            <ConfluenceMeter
              prices={prices}
              newsFeed={newsFeed}
              calendarData={calendarData}
              cotData={cotData}
            />
            <SmartLiquidityRadar prices={prices} />
            <FearGreedGauge
              prices={prices}
              newsFeed={newsFeed}
              calendarData={calendarData}
              cotData={cotData}
            />
          </div>
        </div>

        {/* ROW 4 — Macro Info: Calendar + COT + News — 3-col grid */}
        <div className="grid-macro-row">
          <EconomicCalendar calendarData={calendarData} />
          <COTSentimentGauge cotData={cotData} />
          <NewsTerminal newsFeed={newsFeed} />
        </div>

      </main>

      {/* ── Sticky Mobile Execution Dock ──────────────────────── */}
      <MobileTraderDock prices={prices} />

      {/* ── Bottom Bloomberg Status Bar ───────────────────────── */}
      <StatusBar
        connected={connected}
        prices={prices}
        newsFeed={newsFeed}
        aiTelemetry={aiTelemetry}
      />

      {/* ── Modals ────────────────────────────────────────────── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <TelemetryModal
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        connected={connected}
        latency={latency}
        prices={prices}
      />
      <SoundboardModal
        isOpen={isSoundboardOpen}
        onClose={() => setIsSoundboardOpen(false)}
      />
      <PriceAlerts
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        prices={prices}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
