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
import RiskCalculator from './components/RiskCalculator';
import NewsTerminal from './components/NewsTerminal';
import EconomicCalendar from './components/EconomicCalendar';
import SettingsModal from './components/SettingsModal';
import StatusBar from './components/StatusBar';
import SmartLiquidityRadar from './components/SmartLiquidityRadar';
import VolatilityTrapDetector from './components/VolatilityTrapDetector';
import COTSentimentGauge from './components/COTSentimentGauge';
import { playFlashAlert, playEventWarning } from './utils/audioAlerts';
import {
  LayoutDashboard,
  Sparkles,
  Radar,
  Newspaper,
  Calendar,
  Calculator,
  AlertTriangle,
  Target,
  Award,
} from 'lucide-react';

export default function App() {
  const { connected, latency, prices, newsFeed, calendarData, cotData, latestAlert } = useSocket();
  const [activeTab, setActiveTab] = useState('TERMINAL'); // 'TERMINAL' | 'COPILOT' | 'MACRO' | 'NEWS' | 'CALENDAR' | 'CALCULATOR'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiTelemetry, setAiTelemetry] = useState({});

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

  // Audio flash when high impact news arrives
  useEffect(() => {
    if (latestAlert && latestAlert.impact === 'HIGH') {
      playFlashAlert();
    }
  }, [latestAlert]);

  // Audio warning when pre-event alert triggers
  const showAlertBanner = calendarData?.preEventAlert;
  useEffect(() => {
    if (showAlertBanner) {
      playEventWarning();
    }
  }, [showAlertBanner]);

  const gold = prices['GC=F'] || {};
  const currentGoldPrice = parseFloat(gold.price || 2350);

  return (
    <div className="app-terminal">
      {/* Sticky Header */}
      <Header
        connected={connected}
        latency={latency}
        aiTelemetry={aiTelemetry}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Navigation Tabs */}
      <nav className="nav-tabs-bar">
        <button
          className={`tab-btn ${activeTab === 'TERMINAL' ? 'active' : ''}`}
          onClick={() => setActiveTab('TERMINAL')}
        >
          <LayoutDashboard size={15} />
          <span>TERMINAL WORKSPACE</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'GUIDANCE' ? 'active' : ''}`}
          onClick={() => setActiveTab('GUIDANCE')}
        >
          <Sparkles size={15} />
          <span>AI MARKET GUIDANCE</span>
          <span className="tab-pill">REGIME</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'MACRO' ? 'active' : ''}`}
          onClick={() => setActiveTab('MACRO')}
        >
          <Radar size={15} />
          <span>MACRO RADAR</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'NEWS' ? 'active' : ''}`}
          onClick={() => setActiveTab('NEWS')}
        >
          <Newspaper size={15} />
          <span>NEWS WIRE</span>
          <span className="tab-pill">{newsFeed.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'LIQUIDITY' ? 'active' : ''}`}
          onClick={() => setActiveTab('LIQUIDITY')}
        >
          <Target size={15} />
          <span>SMART LIQUIDITY</span>
          <span className="tab-pill">SMC</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'COT' ? 'active' : ''}`}
          onClick={() => setActiveTab('COT')}
        >
          <Award size={15} />
          <span>COT POSITIONING</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'CALENDAR' ? 'active' : ''}`}
          onClick={() => setActiveTab('CALENDAR')}
        >
          <Calendar size={15} />
          <span>CALENDAR</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'CALCULATOR' ? 'active' : ''}`}
          onClick={() => setActiveTab('CALCULATOR')}
        >
          <Calculator size={15} />
          <span>RISK & LOTS</span>
        </button>
      </nav>

      {/* Main Workspace Content */}
      <main className="terminal-main">
        {/* T-5 Min Red-Folder Event Warning Banner */}
        {showAlertBanner && (
          <div className="event-alert-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} style={{ color: 'var(--bear-glow)' }} />
              <div>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--bear-glow)' }}>
                  HIGH VOLATILITY WARNING &bull; T-5 MINUTES
                </span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  [{showAlertBanner.currency}] {showAlertBanner.title} scheduled in{' '}
                  {showAlertBanner.minutesRemaining} minutes. Expect aggressive spread widening.
                </div>
              </div>
            </div>
            <span className="event-impact-badge high">URGENT</span>
          </div>
        )}

        {/* Tab 1: Full Institutional Terminal */}
        {activeTab === 'TERMINAL' && (
          <>
            {/* Global Session Clock Strip */}
            <SessionClock />

            {/* Post-News Volatility Trap Detector */}
            <VolatilityTrapDetector prices={prices} calendarData={calendarData} />

            {/* Top Grid: TradingView Chart & Confluence Bias Meter */}
            <div className="grid-terminal-top">
              <TradingChart prices={prices} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <ConfluenceMeter prices={prices} newsFeed={newsFeed} calendarData={calendarData} cotData={cotData} />
                <RiskCalculator currentGoldPrice={currentGoldPrice} />
              </div>
            </div>

            {/* Smart Liquidity & Order Block Radar (ICT / SMC) */}
            <SmartLiquidityRadar prices={prices} />

            {/* Middle Section: Macro Correlation Radar */}
            <MacroRadar prices={prices} />

            {/* CFTC Institutional Speculator vs Commercial Sentiment */}
            <COTSentimentGauge cotData={cotData} />

            {/* Full-Width AI Market Guidance & Volatility Risk Warnings (Zero Trade Setups) */}
            <AIMarketGuidance prices={prices} newsFeed={newsFeed} calendarData={calendarData} />

            {/* Bottom Grid: Real-Time Economic Calendar & Live News Wire Side-by-Side */}
            <div className="grid-terminal-events-news">
              <EconomicCalendar calendarData={calendarData} />
              <NewsTerminal newsFeed={newsFeed} />
            </div>
          </>
        )}

        {/* Tab 2: AI Market Guidance Focus */}
        {activeTab === 'GUIDANCE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AIMarketGuidance prices={prices} newsFeed={newsFeed} calendarData={calendarData} />
            <ConfluenceMeter prices={prices} newsFeed={newsFeed} calendarData={calendarData} cotData={cotData} />
            <RiskCalculator currentGoldPrice={currentGoldPrice} />
          </div>
        )}

        {/* Tab 3: Macro Radar Focus */}
        {activeTab === 'MACRO' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <MacroRadar prices={prices} />
            <SessionClock />
            <TradingChart prices={prices} />
          </div>
        )}

        {/* Tab 4: News Wire Focus */}
        {activeTab === 'NEWS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <NewsTerminal newsFeed={newsFeed} />
          </div>
        )}

        {/* Tab 5: Smart Liquidity & SMC Focus */}
        {activeTab === 'LIQUIDITY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SmartLiquidityRadar prices={prices} />
            <TradingChart prices={prices} />
            <VolatilityTrapDetector prices={prices} calendarData={calendarData} />
          </div>
        )}

        {/* Tab 6: COT Positioning Focus */}
        {activeTab === 'COT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <COTSentimentGauge cotData={cotData} />
            <ConfluenceMeter prices={prices} newsFeed={newsFeed} calendarData={calendarData} cotData={cotData} />
            <MacroRadar prices={prices} />
          </div>
        )}

        {/* Tab 7: Economic Calendar Focus */}
        {activeTab === 'CALENDAR' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <EconomicCalendar calendarData={calendarData} />
            <SessionClock />
          </div>
        )}

        {/* Tab 8: Risk & Lot Calculator Focus */}
        {activeTab === 'CALCULATOR' && (
          <div style={{ maxWidth: '800px', margin: '20px auto', width: '100%' }}>
            <RiskCalculator currentGoldPrice={currentGoldPrice} />
          </div>
        )}
      </main>

      {/* Bottom Status Bar */}
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
