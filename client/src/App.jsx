// client/src/App.jsx
// Institutional Gold (XAU/USD) Real-Time Unified Intelligence Workstation v3.0
// Bloomberg / TradingView Pro Level Single-Screen Command Center

import { useState, useEffect, useCallback } from 'react';
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
import MobileAnalyticsCarousel from './components/MobileAnalyticsCarousel';
import { speakSquawk, toggleAudioMute, playChime } from './utils/audioAlerts';
import { AlertTriangle, EyeOff } from 'lucide-react';

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

  // Active Modular View: 'COMMAND_CENTER' (Chart & Order Flow) vs 'MACRO_VIEW' (Calendar & Wire)
  const [activeView, setActiveView] = useState('COMMAND_CENTER');

  // Modals & Mode States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [aiTelemetry, setAiTelemetry] = useState({});
  const [alertsCount, setAlertsCount] = useState(0);

  // Compute active trading session from UTC hour
  const activeSession = (() => {
    const h = new Date().getUTCHours();
    if (h >= 0 && h < 7) return 'Asian Session';
    if (h >= 7 && h < 12) return 'London Session';
    if (h >= 12 && h < 17) return 'London/NY Overlap';
    if (h >= 17 && h < 21) return 'New York Session';
    return 'Late NY / Pre-Asian';
  })();

  // Poll AI Telemetry
  useEffect(() => {
    const fetchTelemetry = () => {
      fetch('/api/ai/models')
        .then((res) => res.json())
        .then((data) => setAiTelemetry(data))
        .catch(() => {});
    };
    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, 15000);
    return () => clearInterval(timer);
  }, []);

  // Sync active custom alerts count
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
    const timer = setInterval(updateAlertsCount, 3000);
    return () => clearInterval(timer);
  }, [updateAlertsCount]);

  // Request browser push notification permission on first interaction
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const ask = () => {
        Notification.requestPermission().catch(() => {});
        window.removeEventListener('click', ask);
      };
      window.addEventListener('click', ask, { once: true });
    }
  }, []);

  // Native Push Notifications when tab is backgrounded
  useEffect(() => {
    if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if (latestAlert && latestAlert.impact === 'HIGH') {
        const headline = latestAlert.headline || latestAlert.title || 'Breaking News';
        try {
          const notif = new Notification('🚨 HIGH IMPACT GOLD ALERT', {
            body: `${headline}\nBias: ${latestAlert.bias || 'Neutral'} | ${latestAlert.source || 'Wire'}`,
            icon: '/favicon.ico',
            tag: `news_${latestAlert.id || latestAlert.guid || headline}`,
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch (_) {}
      }
    }
  }, [latestAlert?.id || latestAlert?.guid || latestAlert?.headline]);

  // Push notification for high impact economic calendar warnings
  useEffect(() => {
    if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if (calendarAlert?.event) {
        const ev = calendarAlert.event;
        try {
          const notif = new Notification('📅 ECONOMIC WARNING (T-5 MIN)', {
            body: `[${ev.currency}] ${ev.title} releases in ${calendarAlert.minutesLeft || 5} minutes. High volatility expected.`,
            icon: '/favicon.ico',
            tag: `cal_${ev.id}`,
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch (_) {}
      }
    }
  }, [calendarAlert?.timestamp]);

  // Copy Executive Snapshot to Clipboard
  const handleCopySnapshot = useCallback(() => {
    const gold = prices['GC=F'] || prices['XAUUSD'] || {};
    const p = parseFloat(gold.price || 0).toFixed(2);
    const ch = parseFloat(gold.changeDay || gold.change5m || 0).toFixed(2);
    const vwap = gold.sessionVWAP ? parseFloat(gold.sessionVWAP).toFixed(2) : 'N/A';
    const cvd = gold.cvd !== undefined ? gold.cvd.toFixed(0) : '0';
    const tps = typeof gold.tapeSpeed === 'number' ? gold.tapeSpeed.toFixed(1) : '1.2';
    const poc = gold.volumeProfile?.poc ? parseFloat(gold.volumeProfile.poc).toFixed(2) : 'N/A';
    const vah = gold.volumeProfile?.vah ? parseFloat(gold.volumeProfile.vah).toFixed(2) : 'N/A';
    const val = gold.volumeProfile?.val ? parseFloat(gold.volumeProfile.val).toFixed(2) : 'N/A';
    const session = gold.session || activeSession;
    const utc = new Date().toISOString().substring(0, 19).replace('T', ' ') + ' UTC';

    const text = `📊 **XAU/USD EXECUTIVE MARKET SNAPSHOT** (${utc})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Spot Gold Price:** $${p} (${ch > 0 ? '+' : ''}${ch}%)
• **Order Flow Velocity:** ${tps} TPS (${gold.tapeSpeedStatus || 'NORMAL'})
• **Session VWAP:** $${vwap} | **CVD:** ${cvd}
• **Intraday VPVR:** POC $${poc} | VAH $${vah} | VAL $${val}
• **Active Session:** ${session}
• **SMT Divergence:** ${gold.smtDivergence?.status || 'NEUTRAL'}
• **Volatility Regime:** ${gold.volatilitySurge ? '🚨 EXPANSION SURGE' : 'STEADY'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Generated by XAU/USD Institutional Intelligence System v3.0*`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
      playChime('chime');
    }
  }, [prices, activeSession]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keystrokes inside input / textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }

      const key = e.key;

      if (key === '1') {
        e.preventDefault();
        setActiveView('COMMAND_CENTER');
      } else if (key === '2') {
        e.preventDefault();
        setActiveView('MACRO_VIEW');
      } else if (key === 'v' || key === 'V') {
        e.preventDefault();
        setActiveView((v) => (v === 'COMMAND_CENTER' ? 'MACRO_VIEW' : 'COMMAND_CENTER'));
      } else if (key === 'm' || key === 'M') {
        e.preventDefault();
        toggleAudioMute();
      } else if (key === 'g' || key === 'G') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('refresh_guidance'));
      } else if (key === 's' || key === 'S') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      } else if (key === 't' || key === 'T') {
        e.preventDefault();
        setIsTelemetryOpen((prev) => !prev);
      } else if (key === 'b' || key === 'B') {
        e.preventDefault();
        setIsSoundboardOpen((prev) => !prev);
      } else if (key === 'c' || key === 'C') {
        e.preventDefault();
        handleCopySnapshot();
      } else if (key === 'p' || key === 'P') {
        e.preventDefault();
        setIsAlertsOpen((prev) => !prev);
      } else if (key === 'f' || key === 'F') {
        e.preventDefault();
        setFocusMode((prev) => !prev);
      } else if (key === '?' || key === 'h' || key === 'H') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (key === 'Escape') {
        setIsSettingsOpen(false);
        setIsTelemetryOpen(false);
        setIsSoundboardOpen(false);
        setIsAlertsOpen(false);
        setIsShortcutsOpen(false);
        setFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopySnapshot]);

  // Voice Squawk when high-impact breaking news arrives
  useEffect(() => {
    if (latestAlert && latestAlert.impact === 'HIGH') {
      const headline = latestAlert.headline || latestAlert.title || '';
      if (!headline) return;
      const isBearish = latestAlert.bias === 'BEARISH';
      const isBullish = latestAlert.bias === 'BULLISH';
      const prefix = isBearish
        ? 'Bearish News Alert for Gold'
        : isBullish
        ? 'Bullish News Alert for Gold'
        : 'Breaking News Alert';

      speakSquawk(`${prefix}: ${headline}. ${isBearish ? 'Downside pressure expected.' : isBullish ? 'Upside catalyst active.' : ''}`, {
        category: 'news',
        preChime: isBearish ? 'bearish' : 'flash',
        dedupeKey: `news_${latestAlert.id || latestAlert.guid || headline}`,
        cooldownSeconds: 180,
        priority: true,
      });
    }
  }, [latestAlert?.id || latestAlert?.guid || latestAlert?.headline]);

  // Audio warning for Economic Calendar Alerts
  useEffect(() => {
    if (calendarAlert?.event) {
      const ev = calendarAlert.event;
      const mins = calendarAlert.minutesLeft || 5;
      speakSquawk(
        `Economic Warning. High-impact event ${ev.title} for ${ev.currency} releases in ${mins} minutes. Expect elevated volatility.`,
        {
          category: 'calendar',
          preChime: 'event',
          priority: true,
        }
      );
    }
  }, [calendarAlert?.timestamp]);

  // Pre-event alert banner on calendar data
  const showAlertBanner = calendarData?.preEventAlert;
  useEffect(() => {
    if (showAlertBanner && showAlertBanner.title) {
      speakSquawk(
        `Economic Warning. ${showAlertBanner.title} imminent in ${showAlertBanner.minutesLeft || 5} minutes.`,
        {
          category: 'calendar',
          preChime: 'event',
        }
      );
    }
  }, [showAlertBanner?.title]);

  return (
    <div className={`app-terminal ${focusMode ? 'focus-mode-active' : ''}`}>
      {/* Institutional Real-Time Telemetry Bar with Modular View Switcher */}
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
        activeView={activeView}
        onSelectView={setActiveView}
      />

      {/* Focus Mode Exit Floating Badge */}
      {focusMode && (
        <div
          onClick={() => setFocusMode(false)}
          className="focus-mode-floating-banner"
          title="Click or press 'F' to exit focus mode"
        >
          <EyeOff size={13} />
          <span>BLOOMBERG FOCUS MODE ACTIVE &bull; PRESS 'F' OR CLICK TO EXIT</span>
        </div>
      )}

      {/* Main Modular Bento-Box Real-Time Command Center */}
      <main className="terminal-main">
        {/* T-5 Min Red-Folder Event Warning Banner */}
        {showAlertBanner && (
          <div
            style={{
              background: 'var(--bear-bg)',
              border: '1px solid var(--border-bear)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              animation: 'pulseGlow 2s infinite',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: 'var(--bear-primary)', flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--bear-primary)', letterSpacing: '0.05em' }}>
                  HIGH IMPACT CATALYST &bull; T-5 MINUTES
                </span>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)' }}>
                  [{showAlertBanner.currency}] {showAlertBanner.title} in{' '}
                  {showAlertBanner.minutesRemaining} minutes. Wide spreads expected.
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '3px',
                background: 'rgba(244, 63, 94, 0.15)',
                color: 'var(--bear-primary)',
                border: '1px solid var(--border-bear)',
              }}
            >
              DEFENSE MODE
            </span>
          </div>
        )}

        {/* ─── VIEW 1: THE COMMAND CENTER (Desktop / Mobile Trader) ─── */}
        {activeView === 'COMMAND_CENTER' && (
          <>
            {/* Linear 24H Global Market Session Timeline Bar */}
            <SessionClock />

            {/* Primary Command Grid: Execution Chart & Liquidity/Confluence */}
            <div className="grid-terminal-top">
              {/* Left Column: Primary Execution Workstation */}
              <div className="terminal-column-left">
                {/* Interactive TradingView Chart with Integrated Tick Tape, MTF Matrix & Volume Profile */}
                <TradingChart prices={prices} />

                {/* Mobile-Responsive Swipeable Carousel for Analytics */}
                <MobileAnalyticsCarousel>
                  <AsianRangeBox prices={prices} />
                  <VolatilityTrapDetector prices={prices} calendarData={calendarData} />
                </MobileAnalyticsCarousel>

                {/* ICT Session Killzones & Real-Time Pearson Correlation Matrix */}
                <div className="grid-sub-2col">
                  <KillzoneTracker prices={prices} />
                  <CorrelationMatrix prices={prices} />
                </div>
              </div>

              {/* Right Column: AI Guidance, Bias Confluence, Smart Liquidity & Sentiment */}
              <div className="terminal-column-right">
                {/* Real-Time Institutional AI Market Guidance & Regimes */}
                <AIMarketGuidance activeSession={activeSession} prices={prices} calendarData={calendarData} />

                {/* Quantitative Institutional Confluence Bias Meter */}
                <ConfluenceMeter prices={prices} newsFeed={newsFeed} calendarData={calendarData} cotData={cotData} />

                {/* Smart Liquidity Radar (BSL, SSL, FVG & Mitigations) */}
                <SmartLiquidityRadar prices={prices} />

                {/* Safe-Haven Gold Fear & Greed Gauge */}
                <FearGreedGauge prices={prices} newsFeed={newsFeed} calendarData={calendarData} cotData={cotData} />
              </div>
            </div>

            {/* 8-Asset Live Macro Correlation Radar */}
            <MacroRadar prices={prices} />
          </>
        )}

        {/* ─── VIEW 2: THE MACRO VIEW (Economic Calendar, News Wire, COT) ─── */}
        {activeView === 'MACRO_VIEW' && (
          <>
            {/* Linear 24H Global Market Session Timeline Bar */}
            <SessionClock />

            {/* Bento Grid: Tabular Economic Calendar & COT / Financial Wire */}
            <div className="macro-view-grid">
              {/* Left: Tabular Economic Event Calendar with Timezone Switcher */}
              <EconomicCalendar calendarData={calendarData} />

              {/* Right: COT Institutional Positioning & Breaking News Wire */}
              <div className="macro-view-sidebar">
                {/* CFTC Institutional COT Speculator vs Commercial Sentiment */}
                <COTSentimentGauge cotData={cotData} />

                {/* Real-Time Financial & Macro Wire */}
                <NewsTerminal newsFeed={newsFeed} />
              </div>
            </div>

            {/* 8-Asset Live Macro Correlation Radar */}
            <MacroRadar prices={prices} />
          </>
        )}
      </main>

      {/* Sticky Mobile Trader Execution Dock (Frozen on Mobile Screens) */}
      <MobileTraderDock prices={prices} />

      {/* Bottom Status Bar (Bloomberg Terminal Style) */}
      <StatusBar
        connected={connected}
        prices={prices}
        newsFeed={newsFeed}
        aiTelemetry={aiTelemetry}
      />

      {/* Institutional Modals */}
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
