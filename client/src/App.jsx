// client/src/App.jsx
// Institutional Gold (XAU/USD) Trading Intelligence Workstation v3.0

import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import Header from './components/Header';
import TradingChart from './components/TradingChart';
import ConfluenceMeter from './components/ConfluenceMeter';
import MacroRadar from './components/MacroRadar';
import AIMarketGuidance from './components/AIMarketGuidance';
import SessionClock from './components/SessionClock';
import NewsTerminal from './components/NewsTerminal';
import EconomicCalendar from './components/EconomicCalendar';
import SettingsModal from './components/SettingsModal';
import StatusBar from './components/StatusBar';
import SmartLiquidityRadar from './components/SmartLiquidityRadar';
import VolatilityTrapDetector from './components/VolatilityTrapDetector';
import COTSentimentGauge from './components/COTSentimentGauge';
import { speakSquawk } from './utils/audioAlerts';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  const { connected, latency, prices, newsFeed, calendarData, cotData, latestAlert, calendarAlert } = useSocket();
  const [activeTab, setActiveTab] = useState('TERMINAL'); // 'TERMINAL' | 'GUIDANCE' | 'MACRO' | 'NEWS' | 'LIQUIDITY' | 'COT' | 'CALENDAR'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiTelemetry, setAiTelemetry] = useState({});

  // Compute active trading session from UTC hour for context-aware AI guidance
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

  // Audio warning when pre-event alert triggers on calendar data
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

  // Market Session Transitions
  useEffect(() => {
    const checkSessionTransition = () => {
      const now = new Date();
      const h = now.getUTCHours();
      const m = now.getUTCMinutes();

      if (m === 0) {
        if (h === 7) {
          speakSquawk('London session is now open. European institutional liquidity entering gold market.', {
            category: 'sessions',
            preChime: 'session',
          });
        } else if (h === 12) {
          speakSquawk('London and New York overlap session is now active. Peak daily gold volume and volatility expected.', {
            category: 'sessions',
            preChime: 'session',
            priority: true,
          });
        } else if (h === 0) {
          speakSquawk('Asian session is now active. Monitoring Asian accumulation range and liquidity boundaries.', {
            category: 'sessions',
            preChime: 'session',
          });
        }
      }
    };
    const timer = setInterval(checkSessionTransition, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app-terminal">
      {/* 48px Slim Sticky Institutional Header with Integrated Workspace Tabs */}
      <Header
        connected={connected}
        latency={latency}
        aiTelemetry={aiTelemetry}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        newsCount={newsFeed.length}
      />

      {/* Main Workspace Content */}
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

        {/* Tab 1: Full Institutional Terminal */}
        {activeTab === 'TERMINAL' && (
          <>
            {/* Linear 24H Session Timeline Bar */}
            <SessionClock />

            {/* Post-News Volatility Trap Detector */}
            <VolatilityTrapDetector prices={prices} calendarData={calendarData} />

            {/* Top 12-Column Grid: TradingView Chart + Confluence Bias & SMC */}
            <div className="grid-terminal-top">
              <TradingChart prices={prices} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <ConfluenceMeter prices={prices} newsFeed={newsFeed} calendarData={calendarData} cotData={cotData} />
                <SmartLiquidityRadar prices={prices} />
              </div>
            </div>

            {/* Middle Section: 8-Asset Macro Correlation Ribbon */}
            <MacroRadar prices={prices} />

            {/* CFTC Institutional Speculator vs Commercial Sentiment Stacked Delta Bar */}
            <COTSentimentGauge cotData={cotData} />

            {/* Expandable AI Market Guidance & Volatility Intelligence Panel */}
            <AIMarketGuidance activeSession={activeSession} />

            {/* Bottom Grid: Real-Time Economic Calendar & News Wire */}
            <div className="grid-terminal-events-news">
              <EconomicCalendar calendarData={calendarData} />
              <NewsTerminal newsFeed={newsFeed} />
            </div>
          </>
        )}

        {/* Tab 2: AI Market Guidance Focus */}
        {activeTab === 'GUIDANCE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AIMarketGuidance activeSession={activeSession} />
            <ConfluenceMeter prices={prices} newsFeed={newsFeed} calendarData={calendarData} cotData={cotData} />
            <SmartLiquidityRadar prices={prices} />
          </div>
        )}

        {/* Tab 3: Macro Radar Focus */}
        {activeTab === 'MACRO' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <MacroRadar prices={prices} />
            <SessionClock />
            <TradingChart prices={prices} />
          </div>
        )}

        {/* Tab 4: News Wire Focus */}
        {activeTab === 'NEWS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <NewsTerminal newsFeed={newsFeed} />
          </div>
        )}

        {/* Tab 5: Smart Liquidity & SMC Focus */}
        {activeTab === 'LIQUIDITY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SmartLiquidityRadar prices={prices} />
            <TradingChart prices={prices} />
            <VolatilityTrapDetector prices={prices} calendarData={calendarData} />
          </div>
        )}

        {/* Tab 6: COT Positioning Focus */}
        {activeTab === 'COT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <COTSentimentGauge cotData={cotData} />
            <ConfluenceMeter prices={prices} newsFeed={newsFeed} calendarData={calendarData} cotData={cotData} />
            <MacroRadar prices={prices} />
          </div>
        )}

        {/* Tab 7: Economic Calendar Focus */}
        {activeTab === 'CALENDAR' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <EconomicCalendar calendarData={calendarData} />
            <SessionClock />
          </div>
        )}
      </main>

      {/* Bottom Status Bar (Bloomberg Terminal Style) */}
      <StatusBar
        connected={connected}
        prices={prices}
        newsFeed={newsFeed}
        aiTelemetry={aiTelemetry}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
