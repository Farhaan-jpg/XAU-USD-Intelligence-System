// client/src/components/Header.jsx
// APEX Terminal — Institutional Header Bar (single-screen, no view tabs)

import { useState, useEffect, useRef, memo } from 'react';
import {
  Volume2, VolumeX, Settings, Clock, Activity, Zap,
  Radio, Sliders, Copy, Check, Bell, Eye, EyeOff,
  Crosshair, TrendingUp, TrendingDown,
} from 'lucide-react';
import { isMuted, toggleAudioMute } from '../utils/audioAlerts';

function Header({
  connected    = false,
  latency      = null,
  prices       = {},
  onOpenSettings,
  onOpenTelemetry,
  onOpenSoundboard,
  onOpenAlerts,
  focusMode    = false,
  onToggleFocusMode = () => {},
  alertsCount  = 0,
  onCopySnapshot,
}) {
  const [audioMuted, setAudioMuted] = useState(isMuted());
  const [utcTime,    setUtcTime]    = useState('');
  const [copied,     setCopied]     = useState(false);

  // ── Live spot price data ────────────────────────────────────────────────
  const gold      = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);
  const changePct = parseFloat(gold.changeDay || gold.change5m || 0);
  const isUp      = changePct >= 0;
  const tps       = typeof gold.tapeSpeed === 'number' ? gold.tapeSpeed : 1.2;
  const tapeLabel = tps >= 8.0 ? 'SURGE' : tps >= 3.0 ? 'FAST' : 'NORM';
  const tapePill  = tps >= 8.0 ? 'pill-bear' : tps >= 3.0 ? 'pill-gold' : '';

  // ── Tick direction flash ─────────────────────────────────────────────────
  const [tickDir,    setTickDir]    = useState(null);
  const prevPriceRef                = useRef(spotPrice);
  useEffect(() => {
    if (!spotPrice || !prevPriceRef.current || spotPrice === prevPriceRef.current) {
      if (spotPrice) prevPriceRef.current = spotPrice;
      return;
    }
    setTickDir(spotPrice > prevPriceRef.current ? 'up' : 'down');
    prevPriceRef.current = spotPrice;
    const t = setTimeout(() => setTickDir(null), 350);
    return () => clearTimeout(t);
  }, [spotPrice]);

  // ── UTC clock ────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => setUtcTime(new Date().toISOString().substring(11, 19) + ' UTC');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggleAudio = () => setAudioMuted(toggleAudioMute());

  const handleSnapshot = () => {
    if (!onCopySnapshot) return;
    onCopySnapshot();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="apex-header">

      {/* ── Brand ───────────────────────────────────────────── */}
      <div className="hdr-brand">
        <div className="hdr-au-badge">Au</div>
        <div className="hdr-brand-text">
          <span className="hdr-brand-name">XAU/USD INTELLIGENCE</span>
          <span className="hdr-brand-sub">INSTITUTIONAL GOLD TERMINAL</span>
        </div>
      </div>

      {/* ── Live Price Chip ─────────────────────────────────── */}
      {spotPrice > 0 && (
        <div className="hdr-price-chip" title="Live XAU/USD spot price (OANDA primary feed)">
          <span className="hdr-label">SPOT</span>
          <span
            className={`hdr-price-num${tickDir === 'up' ? ' tick-flash-up' : tickDir === 'down' ? ' tick-flash-down' : ''}`}
          >
            ${spotPrice.toFixed(2)}
          </span>
          <span
            className="hdr-price-chg"
            style={{ color: isUp ? 'var(--bull)' : 'var(--bear)' }}
          >
            {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {isUp ? '+' : ''}{changePct.toFixed(2)}%
          </span>
        </div>
      )}

      {/* ── Centre Telemetry Strip ──────────────────────────── */}
      <div className="hdr-telemetry">

        {/* Tape Speed Pill */}
        <div className={`hdr-pill ${tapePill}`} title="Order tape velocity (ticks/sec)">
          <Activity size={10} className={tapeLabel === 'SURGE' ? 'pulse-fast' : ''} />
          <span>{tps.toFixed(1)} TPS · {tapeLabel}</span>
        </div>

        {/* ADR Expansion */}
        {gold.adrPercent !== undefined && (
          <div
            className={`hdr-pill${gold.adrPercent >= 100 ? ' pill-bear' : gold.adrPercent >= 75 ? ' pill-gold' : ''}`}
            title={`Average Daily Range expansion — $${gold.dayRange || 0} of ~$32 benchmark`}
          >
            <span>ADR {gold.adrPercent}% · ${gold.dayRange || 0}</span>
          </div>
        )}

        {/* Volatility Surge */}
        {gold.volatilitySurge && (
          <div className="hdr-pill pill-bear" title="Rapid volatility expansion detected">
            <Zap size={10} />
            <span>VOL SURGE ${parseFloat(gold.volatilitySurge.priceShift || 0).toFixed(1)}</span>
          </div>
        )}

        {/* Active Session */}
        {gold.session && (
          <div className="hdr-pill pill-cyan" title="Current global trading session">
            <Crosshair size={10} />
            <span>{gold.session}</span>
          </div>
        )}

        {/* Session VWAP */}
        {gold.sessionVWAP && (
          <div className="hdr-pill" title="Session VWAP — institutional reference level">
            <span>VWAP ${parseFloat(gold.sessionVWAP).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* ── Right Controls ──────────────────────────────────── */}
      <div className="hdr-controls">

        {/* Connection + Latency */}
        <button
          className="hdr-conn"
          onClick={onOpenTelemetry}
          title="Feed latency, heartbeat & failover — click to inspect"
        >
          <span className={`dot ${connected ? 'live' : ''}`} />
          <span>{latency !== null ? `${latency}ms` : connected ? 'LIVE' : 'OFFLINE'}</span>
          <Radio size={9} style={{ opacity: 0.45 }} />
        </button>

        {/* UTC Clock */}
        <div className="hdr-clock">
          <Clock size={9} />
          <span>{utcTime}</span>
        </div>

        {/* Soundboard */}
        <button
          className="hdr-btn"
          onClick={onOpenSoundboard}
          title="Audio squawk soundboard (B)"
        >
          <Sliders size={13} style={{ color: 'var(--gold)' }} />
        </button>

        {/* Copy Snapshot */}
        <button
          className="hdr-btn"
          onClick={handleSnapshot}
          title="Copy executive intelligence snapshot (C)"
        >
          {copied
            ? <Check size={13} style={{ color: 'var(--bull)' }} />
            : <Copy size={13} />}
        </button>

        {/* Price Alerts */}
        <button
          className="hdr-btn"
          onClick={onOpenAlerts}
          title={`Price level alerts (P)${alertsCount > 0 ? ` — ${alertsCount} active` : ''}`}
          style={{ position: 'relative' }}
        >
          <Bell size={13} style={{ color: alertsCount > 0 ? 'var(--gold)' : undefined }} />
          {alertsCount > 0 && (
            <span style={{
              position: 'absolute', top: '5px', right: '5px',
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'var(--gold)',
            }} />
          )}
        </button>

        {/* Audio Mute */}
        <button
          className={`hdr-btn${audioMuted ? ' muted' : ''}`}
          onClick={handleToggleAudio}
          title={audioMuted ? 'Unmute audio squawks (M)' : 'Mute all audio (M)'}
        >
          {audioMuted
            ? <VolumeX size={13} />
            : <Volume2 size={13} />}
        </button>

        {/* Focus Mode */}
        <button
          className={`hdr-btn${focusMode ? ' active' : ''}`}
          onClick={onToggleFocusMode}
          title={focusMode ? 'Exit focus mode (F)' : 'Enter focus mode (F)'}
        >
          {focusMode ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>

        {/* Settings */}
        <button
          className="hdr-btn"
          onClick={onOpenSettings}
          title="Settings, webhooks & AI configuration (S)"
        >
          <Settings size={13} />
        </button>

      </div>
    </header>
  );
}

export default memo(Header);
