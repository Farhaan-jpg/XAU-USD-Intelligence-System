// client/src/components/Header.jsx
// Institutional Real-Time Executive Header Bar with Live Telemetry, Tape Speed, Killzone & Quick Modals

import { useState, useEffect, useRef, memo} from 'react';
import {
  Volume2,
  VolumeX,
  Settings,
  Clock,
  Activity,
  Zap,
  Radio,
  Sliders,
  Copy,
  Check,
  Bell,
  Eye,
  EyeOff,
  Crosshair,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  Globe,
} from 'lucide-react';
import { isMuted, toggleAudioMute } from '../utils/audioAlerts';

function Header({
  connected = false,
  latency = null,
  prices = {},
  onOpenSettings,
  onOpenTelemetry,
  onOpenSoundboard,
  onOpenAlerts,
  focusMode = false,
  onToggleFocusMode = () => {},
  alertsCount = 0,
  onCopySnapshot,
  activeView = 'COMMAND_CENTER',
  onSelectView = () => {},
}) {
  const [audioMuted, setAudioMuted] = useState(isMuted());
  const [utcTime, setUtcTime] = useState('');
  const [copied, setCopied] = useState(false);

  // Spot gold real-time flash
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);
  const changePct = parseFloat(gold.changeDay || gold.change5m || 0);
  const isUp = changePct >= 0;

  const [tickDir, setTickDir] = useState(null);
  const prevPriceRef = useRef(spotPrice);

  useEffect(() => {
    if (spotPrice && prevPriceRef.current && spotPrice !== prevPriceRef.current) {
      setTickDir(spotPrice > prevPriceRef.current ? 'up' : 'down');
      const timer = setTimeout(() => setTickDir(null), 300);
      prevPriceRef.current = spotPrice;
      return () => clearTimeout(timer);
    }
    if (spotPrice) prevPriceRef.current = spotPrice;
  }, [spotPrice]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAudio = () => {
    const next = toggleAudioMute();
    setAudioMuted(next);
  };

  const handleSnapshotClick = () => {
    if (onCopySnapshot) {
      onCopySnapshot();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tps = typeof gold.tapeSpeed === 'number' ? gold.tapeSpeed : 1.2;
  const tapeStatus = gold.tapeSpeedStatus || (tps >= 8.0 ? 'SURGE' : tps >= 3.0 ? 'FAST' : 'NORM');

  return (
    <header className="terminal-header">
      {/* Left: Brand + Gold Element + Live Spot Quick Ticker */}
      <div className="header-brand-group">
        <div className="brand-icon">Au</div>
        <div className="brand-text">
          <div className="brand-title-row">
            <span className="brand-title">XAU/USD INTELLIGENCE</span>
            <span className="brand-badge-pro">PRO TERMINAL</span>
          </div>
          <span className="brand-subtitle">INSTITUTIONAL LIQUIDITY & MACRO MONITOR</span>
        </div>

        {/* Real-Time Spot Quick Ticker */}
        {spotPrice > 0 && (
          <div className="header-spot-ticker" title="OANDA Primary Gold Spot Price">
            <span className={`header-spot-price ${tickDir === 'up' ? 'tick-flash-up' : tickDir === 'down' ? 'tick-flash-down' : ''}`}>
              ${spotPrice.toFixed(2)}
            </span>
            <span
              className="header-spot-change"
              style={{ color: isUp ? 'var(--bull-primary)' : 'var(--bear-primary)' }}
            >
              {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {isUp ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Modern Institutional View Switcher */}
      <div className="header-view-segmented" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'COMMAND_CENTER'}
          className={`view-tab-btn ${activeView === 'COMMAND_CENTER' ? 'active' : ''}`}
          onClick={() => onSelectView('COMMAND_CENTER')}
        >
          <LayoutGrid size={12} />
          <span>COMMAND CENTER</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'MACRO_VIEW'}
          className={`view-tab-btn ${activeView === 'MACRO_VIEW' ? 'active' : ''}`}
          onClick={() => onSelectView('MACRO_VIEW')}
        >
          <Globe size={12} />
          <span>MACRO VIEW</span>
        </button>
      </div>

      {/* Center: Real-Time Telemetry & Status Badges */}
      <div className="header-center-telemetry">
        {/* Tape Velocity Pill */}
        <div
          className="header-pill"
          title="Aggressive Tape Speed (Ticks Per Second)"
          style={{
            borderColor: tapeStatus === 'SURGE' ? 'var(--bear-primary)' : tapeStatus === 'FAST' ? 'var(--gold-primary)' : 'var(--border-subtle)',
            color: tapeStatus === 'SURGE' ? 'var(--bear-primary)' : tapeStatus === 'FAST' ? 'var(--gold-primary)' : 'var(--text-secondary)',
          }}
        >
          <Activity size={12} className={tapeStatus === 'SURGE' ? 'pulse-fast' : ''} />
          <span>{tps.toFixed(1)} TPS &bull; {tapeStatus}</span>
        </div>

        {/* Average Daily Range (ADR) Expansion Metric */}
        {gold.adrPercent !== undefined && (
          <div
            className="header-pill"
            title={`Average Daily Range (5D ADR Benchmark: $32.00). Current expansion: $${gold.dayRange || '0.00'}`}
            style={{
              borderColor: gold.adrPercent >= 100 ? 'var(--bear-primary)' : gold.adrPercent >= 75 ? 'var(--gold-primary)' : 'var(--border-subtle)',
              color: gold.adrPercent >= 100 ? 'var(--bear-primary)' : gold.adrPercent >= 75 ? 'var(--gold-primary)' : 'var(--text-secondary)',
            }}
          >
            <span>ADR: {gold.adrPercent}% (${gold.dayRange || 0})</span>
          </div>
        )}

        {/* Volatility Surge Alarm Flag */}
        {gold.volatilitySurge && (
          <div className="header-pill surge-alert" title="Rapid Volatility Expansion Detected!">
            <Zap size={12} />
            <span>VOL SURGE: ${parseFloat(gold.volatilitySurge.priceShift || 0).toFixed(1)}</span>
          </div>
        )}

        {/* Session Status */}
        {gold.session && (
          <div className="header-pill session-pill" title="Current Market Session">
            <Crosshair size={11} />
            <span>{gold.session}</span>
          </div>
        )}
      </div>

      {/* Right: Telemetry Modals, Snapshot, UTC, Quick Controls */}
      <div className="header-right-controls">
        {/* Latency & Connection Status (Click opens Telemetry Modal) */}
        <button
          className="header-telemetry-btn"
          onClick={onOpenTelemetry}
          title="Click to inspect Feed Latency, Standby Failover & Heartbeats"
        >
          <span className={`status-dot ${connected ? 'online' : ''}`} />
          <span>{latency !== null ? `${latency}ms` : connected ? 'LIVE' : 'CONN'}</span>
          <Radio size={11} style={{ opacity: 0.6 }} />
        </button>

        {/* UTC Clock */}
        <div className="header-time-pill">
          <Clock size={11} style={{ opacity: 0.6 }} />
          <span>{utcTime}</span>
        </div>

        {/* Audio Squawk Soundboard Modal */}
        <button
          className="btn-ghost-icon"
          onClick={onOpenSoundboard}
          title="Audio Squawk Soundboard & FX Controls"
        >
          <Sliders size={14} style={{ color: 'var(--gold-primary)' }} />
        </button>

        {/* One-Click Executive Market Snapshot */}
        <button
          className={`btn-ghost-icon ${copied ? 'copied' : ''}`}
          onClick={handleSnapshotClick}
          title="Copy Executive Intelligence Snapshot to Clipboard"
        >
          {copied ? <Check size={14} style={{ color: 'var(--bull-primary)' }} /> : <Copy size={14} />}
        </button>

        {/* Price Alerts Modal */}
        <button
          className="btn-ghost-icon"
          onClick={onOpenAlerts}
          title="Custom Price Level Alerts (P)"
          style={{ position: 'relative' }}
        >
          <Bell size={14} style={{ color: alertsCount > 0 ? 'var(--gold-primary)' : undefined }} />
          {alertsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--gold-primary)',
              }}
            />
          )}
        </button>

        {/* Master Audio Mute Toggle */}
        <button
          className={`btn-ghost-icon ${audioMuted ? 'active' : ''}`}
          onClick={handleToggleAudio}
          title={audioMuted ? 'Unmute voice and audio squawks' : 'Mute all audio squawks'}
        >
          {audioMuted ? <VolumeX size={14} style={{ color: 'var(--bear-primary)' }} /> : <Volume2 size={14} />}
        </button>

        {/* Bloomberg Dark Focus Mode */}
        <button
          className={`btn-ghost-icon ${focusMode ? 'active' : ''}`}
          onClick={onToggleFocusMode}
          title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        >
          {focusMode ? <EyeOff size={14} style={{ color: 'var(--cyan-primary)' }} /> : <Eye size={14} />}
        </button>

        {/* Global Settings Modal */}
        <button
          className="btn-ghost-icon"
          onClick={onOpenSettings}
          title="Settings, Webhooks & AI Key Configuration"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
}

export default memo(Header);
