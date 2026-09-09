// client/src/components/Header.jsx
// 48px High-Density Minimalist Institutional Header with Integrated Workspace Tabs & Telemetry

import { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Settings,
  Clock,
  Sparkles,
  Check,
  ChevronDown,
  LayoutDashboard,
  Radar,
  Newspaper,
  Calendar,
  Target,
  Award,
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
  activeTab = 'TERMINAL',
  setActiveTab = () => {},
  newsCount = 0,
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
        now.toISOString().substring(11, 19) + ' UTC'
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

  const tabs = [
    { id: 'TERMINAL', label: 'TERMINAL', icon: LayoutDashboard },
    { id: 'GUIDANCE', label: 'AI GUIDANCE', icon: Sparkles },
    { id: 'MACRO', label: 'MACRO RADAR', icon: Radar },
    { id: 'NEWS', label: 'NEWS WIRE', icon: Newspaper, count: newsCount },
    { id: 'LIQUIDITY', label: 'LIQUIDITY', icon: Target },
    { id: 'COT', label: 'COT POSITIONING', icon: Award },
    { id: 'CALENDAR', label: 'CALENDAR', icon: Calendar },
  ];

  return (
    <header className="terminal-header">
      {/* Left: Sleek Icon + Brand + v3.0 Badge */}
      <div className="header-brand">
        <div className="brand-icon">Au</div>
        <div className="brand-title">
          <span>XAU/USD INTELLIGENCE</span>
          <span className="brand-badge">v3.0</span>
        </div>
      </div>

      {/* Center: Integrated Workspace Tabs Segment Controller */}
      <nav className="header-nav-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`header-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={13} style={{ opacity: isActive ? 1 : 0.65 }} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="tab-count-pill">{tab.count}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: Latency, UTC Clock, Ghost Action Buttons */}
      <div className="header-right" ref={voiceMenuRef} style={{ position: 'relative' }}>
        {/* Latency & Connection */}
        <div className="header-telemetry-item" title={connected ? 'WebSocket Stream Connected' : 'Connecting to Terminal Hub'}>
          <span className={`status-dot ${connected ? 'online' : ''}`} />
          <span>{latency !== null ? `${latency}ms` : connected ? 'LIVE' : 'CONN'}</span>
        </div>

        {/* UTC Clock */}
        <div className="header-telemetry-item" style={{ color: 'var(--text-secondary)' }}>
          <Clock size={12} style={{ opacity: 0.6 }} />
          <span>{utcTime}</span>
        </div>

        {/* Voice Channels Menu Toggle Button */}
        <button
          className={`btn-ghost-icon ${showVoiceMenu ? 'active' : ''}`}
          onClick={() => {
            setVoiceSettings(getVoiceSettings());
            setShowVoiceMenu(!showVoiceMenu);
          }}
          title="Voice channel configuration"
        >
          <Volume2 size={15} style={{ color: audioMuted ? 'var(--text-dim)' : 'var(--cyan-primary)' }} />
        </button>

        {/* Master Audio Mute Button */}
        <button
          className={`btn-ghost-icon ${audioMuted ? 'active' : ''}`}
          onClick={handleToggleAudio}
          title={audioMuted ? 'Unmute voice and audio alerts' : 'Mute all audio alerts'}
        >
          {audioMuted ? <VolumeX size={15} style={{ color: 'var(--bear-primary)' }} /> : <Volume2 size={15} />}
        </button>

        {/* Global Settings */}
        <button
          className="btn-ghost-icon"
          onClick={onOpenSettings}
          title="Terminal Settings & AI Configuration"
        >
          <Settings size={15} />
        </button>

        {/* Voice Channels Popover */}
        {showVoiceMenu && (
          <div
            style={{
              position: 'absolute',
              top: '42px',
              right: '0',
              width: '280px',
              background: '#111620',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.65)',
              zIndex: 200,
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Voice Channels
              </span>
              <span style={{ fontSize: '10px', color: audioMuted ? 'var(--bear-primary)' : 'var(--bull-primary)', fontWeight: 600 }}>
                {audioMuted ? 'MUTED' : 'ACTIVE'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '280px', overflowY: 'auto' }}>
              {channels.map((ch) => {
                const isEnabled = voiceSettings.enabledEvents?.[ch.key] !== false;
                return (
                  <button
                    key={ch.key}
                    onClick={() => handleChannelToggle(ch.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      background: isEnabled ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                      border: '1px solid',
                      borderColor: isEnabled ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      color: isEnabled ? 'var(--text-main)' : 'var(--text-dim)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      textAlign: 'left',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px' }}>{ch.icon}</span>
                      <span>{ch.label}</span>
                    </div>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '3px',
                        border: '1px solid',
                        borderColor: isEnabled ? 'var(--cyan-primary)' : 'var(--border-subtle)',
                        background: isEnabled ? 'var(--cyan-primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isEnabled && <Check size={10} style={{ color: '#0B0E14', strokeWidth: 3 }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
