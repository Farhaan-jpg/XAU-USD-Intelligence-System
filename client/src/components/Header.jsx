// client/src/components/Header.jsx
// Terminal Top Header with Real-Time Telemetry, Active AI Provider, and Audio Controls

import { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Settings,
  Clock,
  Sparkles,
  Sliders,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  isMuted,
  toggleAudioMute,
  getVoiceSettings,
  toggleVoiceEventChannel,
} from '../utils/audioAlerts';

export default function Header({
  connected = false,
  latency = null,
  aiTelemetry = {},
  onOpenSettings,
}) {
  const [audioMuted, setAudioMuted] = useState(isMuted());
  const [utcTime, setUtcTime] = useState('');
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState(getVoiceSettings());

  const voiceMenuRef = useRef(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(
        now.toISOString().replace('T', ' ').substring(11, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close voice channels popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(e.target)) {
        setShowVoiceMenu(false);
      }
    };
    if (showVoiceMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVoiceMenu]);

  const handleToggleAudio = () => {
    const nextMuted = toggleAudioMute();
    setAudioMuted(nextMuted);
  };

  const handleChannelToggle = (channelKey) => {
    const next = toggleVoiceEventChannel(channelKey);
    setVoiceSettings({ ...next });
  };

  const activeModel = aiTelemetry?.gemini?.activeModel || 'gemini-3.6-flash';
  const provider = aiTelemetry?.activeProvider || 'google';

  const channels = [
    { key: 'news', label: 'Breaking News Alerts', icon: '📢' },
    { key: 'calendar', label: 'Economic Calendar Warnings', icon: '📅' },
    { key: 'divergence', label: 'Macro Dollar / Yield Divergence', icon: '⚡' },
    { key: 'liquidity', label: 'Liquidity Sweeps (BSL/SSL)', icon: '🌊' },
    { key: 'volatility', label: 'Volatility Traps & Dumps', icon: '🔥' },
    { key: 'sessions', label: 'Session Opens (London/NY/Asia)', icon: '🕒' },
    { key: 'confluence', label: 'Confluence Bias Squawks', icon: '📊' },
    { key: 'guidance', label: 'AI Market Guidance & Regimes', icon: '🧠' },
  ];

  return (
    <header className="terminal-header" style={{ position: 'relative' }}>
      {/* Brand & Market Identity */}
      <div className="header-brand">
        <div className="brand-icon">Au</div>
        <div>
          <div className="brand-title">
            XAU/USD INTELLIGENCE
            <span className="brand-badge">PRO v3.0</span>
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Badges */}
      <div className="header-telemetry">
        {/* WebSocket Connection Status */}
        <div className={`telemetry-badge ${connected ? 'online' : ''}`}>
          <span className="status-dot" />
          <span>{connected ? 'LIVE STREAM' : 'CONNECTING'}</span>
          {latency !== null && <span>({latency}ms)</span>}
        </div>

        {/* Dynamic Priority AI Model Badge */}
        <div
          className={`telemetry-badge ${
            provider === 'google'
              ? 'ai-gemini'
              : provider === 'openrouter'
              ? 'ai-openrouter'
              : 'ai-quant'
          }`}
          title={`Active Model: ${activeModel} | Provider: ${provider.toUpperCase()}`}
        >
          <Sparkles size={13} />
          <span>
            {provider === 'google'
              ? `GEMINI: ${activeModel.replace('gemini-', '')}`
              : provider === 'openrouter'
              ? 'OPENROUTER'
              : 'QUANT ENGINE'}
          </span>
        </div>

        {/* Global Market UTC Clock */}
        <div className="telemetry-badge">
          <Clock size={13} />
          <span>{utcTime}</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="header-actions" ref={voiceMenuRef}>
        {/* Quick Voice Channels Dropdown Button */}
        <button
          className={`btn-secondary ${showVoiceMenu ? 'active' : ''}`}
          onClick={() => {
            setVoiceSettings(getVoiceSettings());
            setShowVoiceMenu(!showVoiceMenu);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            padding: '5px 10px',
            borderColor: showVoiceMenu ? 'var(--gold-glow)' : 'var(--border-subtle)',
            color: showVoiceMenu ? 'var(--gold-glow)' : 'var(--text-main)',
            cursor: 'pointer',
          }}
          title="Customize individual voice alert channels"
        >
          <Volume2 size={13} style={{ color: audioMuted ? 'var(--text-dim)' : 'var(--gold-glow)' }} />
          <span>Voice Alerts</span>
          <ChevronDown size={11} />
        </button>

        {/* Master Audio Mute Button */}
        <button
          className={`btn-icon ${audioMuted ? '' : 'active'}`}
          onClick={handleToggleAudio}
          title={audioMuted ? 'Sound Alerts: OFF (Click to unmute)' : 'Sound Alerts: ON (Click to mute)'}
          aria-label="Toggle Sound Alerts"
        >
          {audioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Terminal Settings Trigger */}
        <button
          className="btn-icon"
          onClick={onOpenSettings}
          title="Terminal Settings & AI Configuration"
          aria-label="Open Settings"
        >
          <Settings size={16} />
        </button>

        {/* Floating Quick Voice Channels Customization Popover */}
        {showVoiceMenu && (
          <div
            style={{
              position: 'absolute',
              top: '52px',
              right: '20px',
              zIndex: 9999,
              width: '320px',
              background: '#0d1522',
              border: '1px solid var(--border-gold)',
              borderRadius: '10px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Popover Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Volume2 size={14} style={{ color: 'var(--gold-glow)' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                  Voice Alert Channels
                </span>
              </div>
              <button
                onClick={handleToggleAudio}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: audioMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: audioMuted ? 'var(--bear-glow)' : 'var(--bull-glow)',
                  border: `1px solid ${audioMuted ? 'var(--border-bear)' : 'var(--border-bull)'}`,
                  cursor: 'pointer',
                }}
              >
                {audioMuted ? 'MASTER: MUTED' : 'MASTER: ACTIVE'}
              </button>
            </div>

            {/* Channels List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '340px', overflowY: 'auto' }}>
              {channels.map(({ key, label, icon }) => {
                const isEnabled = voiceSettings.enabledEvents && voiceSettings.enabledEvents[key] !== false;
                return (
                  <div
                    key={key}
                    onClick={() => handleChannelToggle(key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: isEnabled ? 'rgba(245, 158, 11, 0.07)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isEnabled ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px' }}>{icon}</span>
                      <span style={{ fontSize: '11px', fontWeight: isEnabled ? 700 : 500, color: isEnabled ? '#fff' : 'var(--text-dim)' }}>
                        {label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        background: isEnabled ? 'var(--bull-glow)' : 'rgba(255, 255, 255, 0.1)',
                        color: isEnabled ? '#000' : 'var(--text-dim)',
                      }}
                    >
                      {isEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer with link to full audio settings */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                Indian Female Squawk (Heera)
              </span>
              <button
                onClick={() => {
                  setShowVoiceMenu(false);
                  onOpenSettings();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gold-glow)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sliders size={11} />
                <span>Audio Tuning & Pitch</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
