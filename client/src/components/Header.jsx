// client/src/components/Header.jsx
// Institutional Real-Time Executive Header Bar — Single Dashboard, No View Tabs

import { useState, useEffect, useRef, memo } from 'react';
import {
  Volume2, VolumeX, Settings, Clock, Activity, Zap,
  Radio, Sliders, Copy, Check, Bell, Eye, EyeOff,
  Crosshair, TrendingUp, TrendingDown,
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
}) {
  const [audioMuted, setAudioMuted] = useState(isMuted());
  const [utcTime, setUtcTime]       = useState('');
  const [copied, setCopied]         = useState(false);

  // Live spot gold data
  const gold      = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);
  const changePct = parseFloat(gold.changeDay || gold.change5m || 0);
  const isUp      = changePct >= 0;
  const tps       = typeof gold.tapeSpeed === 'number' ? gold.tapeSpeed : 1.2;
  const tapeStatus = gold.tapeSpeedStatus || (tps >= 8.0 ? 'SURGE' : tps >= 3.0 ? 'FAST' : 'NORM');

  // Tick flash direction
  const [tickDir, setTickDir]   = useState(null);
  const prevPriceRef            = useRef(spotPrice);
  useEffect(() => {
    if (spotPrice && prevPriceRef.current && spotPrice !== prevPriceRef.current) {
      setTickDir(spotPrice > prevPriceRef.current ? 'up' : 'down');
      const t = setTimeout(() => setTickDir(null), 320);
      prevPriceRef.current = spotPrice;
      return () => clearTimeout(t);
    }
    if (spotPrice) prevPriceRef.current = spotPrice;
  }, [spotPrice]);

  // UTC clock — updates every second
  useEffect(() => {
    const tick = () => setUtcTime(new Date().toISOString().substring(11, 19) + ' UTC');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
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

  return (
    <header className="terminal-header">

      {/* ── Brand + Spot Ticker ─────────────────────────────────── */}
      <div className="header-brand-group">
        <div className="brand-icon">Au</div>
        <div className="brand-text">
          <div className="brand-title-row">
            <span className="brand-title">XAU/USD INTELLIGENCE</span>
            <span className="brand-badge-pro">PRO</span>
          </div>
          <span className="brand-subtitle">INSTITUTIONAL GOLD TERMINAL</span>
        </div>

        {spotPrice > 0 && (
          <div className="header-spot-ticker" title="Live XAU/USD Spot Price">
            <span
              className={`header-spot-price${tickDir === 'up' ? ' tick-flash-up' : tickDir === 'down' ? ' tick-flash-down' : ''}`}
            >
              ${spotPrice.toFixed(2)}
            </span>
            <span
              className="header-spot-change"
              style={{ color: isUp ? 'var(--bull)' : 'var(--bear)' }}
            >
              {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {isUp ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* ── Center Live Telemetry Pills ─────────────────────────── */}
      <div className="header-center-telemetry">

        {/* Tape Velocity */}
        <div
          className="header-pill"
          title="Aggressive order tape speed (ticks/second)"
          style={{
            borderColor: tapeStatus === 'SURGE' ? 'var(--bear-border)' : tapeStatus === 'FAST' ? 'var(--gold-border)' : undefined,
            color:       tapeStatus === 'SURGE' ? 'var(--bear)' : tapeStatus === 'FAST' ? 'var(--gold)' : undefined,
          }}
        >
          <Activity size={11} className={tapeStatus === 'SURGE' ? 'pulse-fast' : ''} />
          <span>{tps.toFixed(1)} TPS · {tapeStatus}</span>
        </div>

        {/* ADR % */}
        {gold.adrPercent !== undefined && (
          <div
            className="header-pill"
            title={`Average Daily Range expansion — $${gold.dayRange || 0}`}
            style={{
              borderColor: gold.adrPercent >= 100 ? 'var(--bear-border)' : gold.adrPercent >= 75 ? 'var(--gold-border)' : undefined,
              color:       gold.adrPercent >= 100 ? 'var(--bear)' : gold.adrPercent >= 75 ? 'var(--gold)' : undefined,
            }}
          >
            <span>ADR {gold.adrPercent}% · ${gold.dayRange || 0}</span>
          </div>
        )}

        {/* Volatility Surge */}
        {gold.volatilitySurge && (
          <div className="header-pill surge-alert" title="Rapid volatility expansion detected!">
            <Zap size={11} />
            <span>VOL SURGE ${parseFloat(gold.volatilitySurge.priceShift || 0).toFixed(1)}</span>
          </div>
        )}

        {/* Active Session */}
        {gold.session && (
          <div className="header-pill session-pill" title="Current global trading session">
            <Crosshair size={10} />
            <span>{gold.session}</span>
          </div>
        )}
      </div>

      {/* ── Right Controls ──────────────────────────────────────── */}
      <div className="header-right-controls">

        {/* Latency / Connection */}
        <button
          className="header-telemetry-btn"
          onClick={onOpenTelemetry}
          title="Feed latency, heartbeat & failover status"
        >
          <span className={`status-dot ${connected ? 'online' : ''}`} />
          <span>{latency !== null ? `${latency}ms` : connected ? 'LIVE' : 'OFFLINE'}</span>
          <Radio size={10} style={{ opacity: 0.5 }} />
        </button>

        {/* UTC Clock */}
        <div className="header-time-pill">
          <Clock size={10} style={{ opacity: 0.5 }} />
          <span>{utcTime}</span>
        </div>

        {/* Soundboard */}
        <button className="btn-ghost-icon" onClick={onOpenSoundboard} title="Audio squawk soundboard (B)">
          <Sliders size={13} style={{ color: 'var(--gold)' }} />
        </button>

        {/* Copy Snapshot */}
        <button className="btn-ghost-icon" onClick={handleSnapshotClick} title="Copy executive snapshot (C)">
          {copied
            ? <Check size={13} style={{ color: 'var(--bull)' }} />
            : <Copy size={13} />}
        </button>

        {/* Price Alerts */}
        <button
          className="btn-ghost-icon"
          onClick={onOpenAlerts}
          title={`Custom price level alerts (P)${alertsCount > 0 ? ` — ${alertsCount} active` : ''}`}
          style={{ position: 'relative' }}
        >
          <Bell size={13} style={{ color: alertsCount > 0 ? 'var(--gold)' : undefined }} />
          {alertsCount > 0 && (
            <span style={{ position: 'absolute', top: '4px', right: '4px', width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gold)' }} />
          )}
        </button>

        {/* Audio Mute */}
        <button
          className={`btn-ghost-icon${audioMuted ? ' active' : ''}`}
          onClick={handleToggleAudio}
          title={audioMuted ? 'Unmute squawks (M)' : 'Mute all audio (M)'}
        >
          {audioMuted
            ? <VolumeX size={13} style={{ color: 'var(--bear)' }} />
            : <Volume2 size={13} />}
        </button>

        {/* Focus Mode */}
        <button
          className={`btn-ghost-icon${focusMode ? ' active' : ''}`}
          onClick={onToggleFocusMode}
          title={focusMode ? 'Exit focus mode (F)' : 'Enter focus mode (F)'}
        >
          {focusMode
            ? <EyeOff size={13} style={{ color: 'var(--cyan)' }} />
            : <Eye size={13} />}
        </button>

        {/* Settings */}
        <button className="btn-ghost-icon" onClick={onOpenSettings} title="Settings (S)">
          <Settings size={13} />
        </button>
      </div>
    </header>
  );
}

export default memo(Header);
