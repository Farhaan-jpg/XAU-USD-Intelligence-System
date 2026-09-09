// client/src/components/Header.jsx
// Terminal Top Header with Real-Time Telemetry, Active AI Provider, and Audio Controls

import { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Volume2,
  VolumeX,
  Settings,
  Clock,
  Radio,
  Sparkles,
} from 'lucide-react';
import { isMuted, toggleAudioMute } from '../utils/audioAlerts';

export default function Header({
  connected = false,
  latency = null,
  aiTelemetry = {},
  onOpenSettings,
}) {
  const [audioMuted, setAudioMuted] = useState(isMuted());
  const [utcTime, setUtcTime] = useState('');

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

  const handleToggleAudio = () => {
    const nextMuted = toggleAudioMute();
    setAudioMuted(nextMuted);
  };

  const activeModel = aiTelemetry?.gemini?.activeModel || 'gemini-3.6-flash';
  const provider = aiTelemetry?.activeProvider || 'google';

  return (
    <header className="terminal-header">
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
      <div className="header-actions">
        {/* Audio Alert Toggle */}
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
      </div>
    </header>
  );
}
