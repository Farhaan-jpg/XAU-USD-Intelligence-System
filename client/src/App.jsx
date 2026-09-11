// client/src/App.jsx
// APEX Terminal — XAU/USD Institutional Intelligence System
// Single-screen unified dashboard, no tabs, zero layout breaks

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

// ── Active Session Helper (pure, no hooks) ─────────────────────────────────
function getActiveSession() {
  const h = new Date().getUTCHours();
  if (h >= 0  && h < 7)  return 'Asian Session';
  if (h >= 7  && h < 12) return 'London Session';
  if (h >= 12 && h < 17) return 'London/NY Overlap';
  if (h >= 17 && h < 21) return 'New York Session';
  return 'Late NY / Pre-Asian';
}

export default function App() {
  const {
    connected, latency, prices,
    newsFeed, calendarData, cotData,
    latestAlert, calendarAlert,
  } = useSocket();

  // ── Modal + Mode States ──────────────────────────────────────────────────
  const [isSettingsOpen,   setIsSettingsOpen]   = useState(false);
  const [isTelemetryOpen,  setIsTelemetryOpen]  = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [isAlertsOpen,     setIsAlertsOpen]     = useState(false);
  const [isShortcutsOpen,  setIsShortcutsOpen]  = useState(false);
  const [focusMode,        setFocusMode]        = useState(false);
  const [aiTelemetry,      setAiTelemetry]      = useState({});
  const [alertsCount,      setAlertsCount]      = useState(0);

  // ── Active Session — safe useRef + interval pattern ──────────────────────
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

  // ── AI telemetry polling every 15s ───────────────────────────────────────
  useEffect(() => {
    const fetchTelemetry = () =>
      fetch('/api/ai/models').then(r => r.json()).then(setAiTelemetry).catch(() => {});
    fetchTelemetry();
    const t = setInterval(fetchTelemetry, 15_000);
    return () => clearInterval(t);
  }, []);

  // ── Custom alerts count sync every 5s ────────────────────────────────────
  const syncAlertsCount = useCallback(() => {
    try {
      const saved = localStorage.getItem('xauusd_custom_alerts');
      const list  = saved ? JSON.parse(saved) : [];
      setAlertsCount(list.filter(a => a.active && !a.triggered).length);
    } catch { setAlertsCount(0); }
  }, []);

  useEffect(() => {
    syncAlertsCount();
    const t = setInterval(syncAlertsCount, 5_000);
    return () => clearInterval(t);
  }, [syncAlertsCount]);

  // ── Browser notification permission ──────────────────────────────────────
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const ask = () => {
        Notification.requestPermission().catch(() => {});
        window.removeEventListener('click', ask);
      };
      window.addEventListener('click', ask, { once: true });
    }
  }, []);

  // ── High-impact news push notification + voice squawk ────────────────────
  const lastNewsId = useRef(null);
  useEffect(() => {
    if (!latestAlert) return;
    const id = latestAlert.id || latestAlert.guid || latestAlert.headline;
    if (id === lastNewsId.current) return;
    lastNewsId.current = id;
    if (
      document.hidden &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      latestAlert.impact === 'HIGH'
    ) {
      try {
        const n = new Notification('🚨 HIGH IMPACT GOLD ALERT', {
          body: `${latestAlert.headline || latestAlert.title || 'Breaking News'}\nBias: ${latestAlert.bias || 'Neutral'}`,
          icon: '/favicon.ico', tag: `news_${id}`,
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch {}
    }
    if (latestAlert.impact === 'HIGH') {
      const headline = latestAlert.headline || latestAlert.title || '';
      if (!headline) return;
      speakSquawk(
        `${latestAlert.bias === 'BEARISH' ? 'Bearish' : latestAlert.bias === 'BULLISH' ? 'Bullish' : 'Breaking'} News Alert for Gold: ${headline}.`,
        { category: 'news', preChime: latestAlert.bias === 'BEARISH' ? 'bearish' : 'flash', dedupeKey: `news_${id}`, cooldownSeconds: 180, priority: true }
      );
    }
  }, [latestAlert]);

  // ── Calendar alert push + squawk ─────────────────────────────────────────
  const lastCalId = useRef(null);
  useEffect(() => {
    if (!calendarAlert?.event) return;
    const ev = calendarAlert.event;
    if (ev.id === lastCalId.current) return;
    lastCalId.current = ev.id;
    const mins = calendarAlert.minutesLeft || 5;
    if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const n = new Notification('📅 ECONOMIC WARNING (T-5 MIN)', {
          body: `[${ev.currency}] ${ev.title} releases in ${mins} minutes.`,
          icon: '/favicon.ico', tag: `cal_${ev.id}`,
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch {}
    }
    speakSquawk(
      `Economic Warning. ${ev.title} for ${ev.currency} releases in ${mins} minutes. Expect elevated volatility.`,
      { category: 'calendar', preChime: 'event', priority: true }
    );
  }, [calendarAlert]);

  // ── Pre-event banner audio ────────────────────────────────────────────────
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

  // ── Executive Snapshot Copy ───────────────────────────────────────────────
  const handleCopySnapshot = useCallback(() => {
    const gold  = prices['GC=F'] || prices['XAUUSD'] || {};
    const p     = parseFloat(gold.price || 0).toFixed(2);
    const ch    = parseFloat(gold.changeDay || gold.change5m || 0).toFixed(2);
    const vwap  = gold.sessionVWAP ? parseFloat(gold.sessionVWAP).toFixed(2) : 'N/A';
    const cvd   = gold.cvd !== undefined ? gold.cvd.toFixed(0) : '0';
    const tps   = typeof gold.tapeSpeed === 'number' ? gold.tapeSpeed.toFixed(1) : '1.2';
    const poc   = gold.volumeProfile?.poc ? parseFloat(gold.volumeProfile.poc).toFixed(2) : 'N/A';
    const utc   = new Date().toISOString().substring(0, 19).replace('T', ' ') + ' UTC';

    const text =
`📊 XAU/USD EXECUTIVE SNAPSHOT (${utc})
────────────────────────────────────────
• Spot Gold: $${p} (${ch > 0 ? '+' : ''}${ch}%)
• Order Flow: ${tps} TPS  |  CVD: ${cvd}
• Session VWAP: $${vwap}  |  VP POC: $${poc}
• Active Session: ${activeSession}
• SMT Divergence: ${gold.smtDivergence?.status || 'NEUTRAL'}
────────────────────────────────────────
XAU/USD Intelligence System`;

    navigator.clipboard?.writeText(text).catch(() => {});
    playChime('chime');
  }, [prices, activeSession]);

  // ── Global Keyboard Shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handle = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      switch (e.key) {
        case 'm': case 'M': e.preventDefault(); toggleAudioMute(); break;
        case 'g': case 'G': e.preventDefault(); window.dispatchEvent(new CustomEvent('refresh_guidance')); break;
        case 's': case 'S': e.preventDefault(); setIsSettingsOpen(v => !v); break;
        case 't': case 'T': e.preventDefault(); setIsTelemetryOpen(v => !v); break;
        case 'b': case 'B': e.preventDefault(); setIsSoundboardOpen(v => !v); break;
        case 'c': case 'C': e.preventDefault(); handleCopySnapshot(); break;
        case 'p': case 'P': e.preventDefault(); setIsAlertsOpen(v => !v); break;
        case 'f': case 'F': e.preventDefault(); setFocusMode(v => !v); break;
        case '?': case 'h': case 'H': e.preventDefault(); setIsShortcutsOpen(v => !v); break;
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`apex-terminal${focusMode ? ' focus-active' : ''}`}>

      {/* ══ STICKY HEADER ════════════════════════════════════════════════ */}
      <Header
        connected={connected}
        latency={latency}
        prices={prices}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTelemetry={() => setIsTelemetryOpen(true)}
        onOpenSoundboard={() => setIsSoundboardOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode(f => !f)}
        alertsCount={alertsCount}
        onCopySnapshot={handleCopySnapshot}
      />

      {/* ══ FULL-WIDTH MACRO ASSET STRIP ═════════════════════════════════ */}
      <MacroRadar prices={prices} />

      {/* ══ MAIN DASHBOARD WORKSPACE ═════════════════════════════════════ */}
      <main className="apex-main">

        {/* T-5 Min High-Impact Event Warning Banner */}
        {showAlertBanner?.title && (
          <div className="event-alert-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={14} style={{ color: 'var(--bear)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bear)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  HIGH IMPACT CATALYST — T-{showAlertBanner.minutesRemaining || 5} MIN
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--t1)', marginTop: '2px' }}>
                  [{showAlertBanner.currency}] {showAlertBanner.title} — Wide spreads expected. Reduce size or stand aside.
                </div>
              </div>
            </div>
            <span style={{
              fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700,
              padding: '3px 10px', borderRadius: '4px', border: '1px solid var(--b-bear)',
              background: 'var(--bear-dim)', color: 'var(--bear)', whiteSpace: 'nowrap',
            }}>DEFENSE MODE</span>
          </div>
        )}

        {/* ── ROW A: Session Timeline (full width) ────────────────── */}
        <SessionClock />

        {/* ── ROW B: Primary Grid — Chart + Liquidity Map & Intelligence Sidebar ─ */}
        <div className="apex-grid-primary">

          {/* LEFT COLUMN — Price Action Chart + SMC Liquidity Map */}
          <div className="apex-col-left">
            <TradingChart prices={prices} />
            <SmartLiquidityRadar prices={prices} />
          </div>

          {/* RIGHT SIDEBAR — Intelligence Stack */}
          <div className="apex-col-right">
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
          </div>
        </div>

        {/* ── ROW C: Session Microstructure, Traps & Correlation Matrix ─ */}
        <div className="apex-grid-micro">
          <AsianRangeBox prices={prices} />
          <VolatilityTrapDetector prices={prices} calendarData={calendarData} />
          <KillzoneTracker prices={prices} />
          <CorrelationMatrix prices={prices} />
        </div>

        {/* ── ROW D: Bottom 3-col — Calendar · Sentiment Stack · News Wire ─ */}
        <div className="apex-grid-bottom">
          <EconomicCalendar calendarData={calendarData} />
          <div className="sentiment-stack">
            <FearGreedGauge
              prices={prices}
              newsFeed={newsFeed}
              calendarData={calendarData}
              cotData={cotData}
            />
            <COTSentimentGauge cotData={cotData} />
          </div>
          <NewsTerminal newsFeed={newsFeed} />
        </div>

      </main>

      {/* ══ MOBILE STICKY EXECUTION DOCK (hidden on desktop) ══════════════ */}
      <MobileTraderDock prices={prices} />

      {/* ══ BLOOMBERG STATUS BAR ════════════════════════════════════════ */}
      <StatusBar
        connected={connected}
        prices={prices}
        newsFeed={newsFeed}
        aiTelemetry={aiTelemetry}
      />

      {/* ══ FOCUS MODE EXIT BANNER ══════════════════════════════════════ */}
      {focusMode && (
        <div
          className="focus-mode-floating-banner"
          onClick={() => setFocusMode(false)}
          title="Press F or click to exit focus mode"
        >
          <EyeOff size={12} />
          <span>FOCUS MODE — PRESS F TO EXIT</span>
        </div>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════════════ */}
      <SettingsModal   isOpen={isSettingsOpen}   onClose={() => setIsSettingsOpen(false)} />
      <TelemetryModal
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        connected={connected} latency={latency} prices={prices}
      />
      <SoundboardModal isOpen={isSoundboardOpen} onClose={() => setIsSoundboardOpen(false)} />
      <PriceAlerts     isOpen={isAlertsOpen}     onClose={() => setIsAlertsOpen(false)} prices={prices} />
      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
}
