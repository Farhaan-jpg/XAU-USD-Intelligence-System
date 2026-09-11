// client/src/components/SoundboardModal.jsx
// Audio Squawk Soundboard & Voice Alert Channel Controller
// Manages volume, speech rate, channel toggles, and sound effect tests

import { useState, useEffect } from 'react';
import { Volume2, VolumeX, X, Play, Sliders, BellRing, Sparkles, Check } from 'lucide-react';
import {
  getVoiceSettings,
  updateVoiceSettings,
  toggleVoiceEventChannel,
  speakSquawk,
  playChime,
  isMuted,
  toggleAudioMute,
} from '../utils/audioAlerts';

export default function SoundboardModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(getVoiceSettings());
  const [muted, setMuted] = useState(isMuted());
  const [testingChime, setTestingChime] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getVoiceSettings());
      setMuted(isMuted());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    const updated = updateVoiceSettings({ volume: vol });
    setSettings({ ...updated });
  };

  const handleRateChange = (e) => {
    const rate = parseFloat(e.target.value);
    const updated = updateVoiceSettings({ rate });
    setSettings({ ...updated });
  };

  const handleToggleChannel = (channelKey) => {
    const updated = toggleVoiceEventChannel(channelKey);
    setSettings({ ...updated });
  };

  const handleMuteToggle = () => {
    const nextMuted = toggleAudioMute();
    setMuted(nextMuted);
  };

  const testSquawkVoice = () => {
    speakSquawk('Institutional Gold Trading Terminal active. All real-time telemetry feeds synchronized.', {
      category: 'news',
      preChime: 'flash',
      priority: true,
      cooldownSeconds: 0,
    });
  };

  const testChimeType = (type) => {
    setTestingChime(type);
    playChime(type);
    setTimeout(() => setTestingChime(null), 800);
  };

  const channels = [
    { key: 'news', label: 'Breaking News Wires', icon: '📢', desc: 'High-impact macro & geopolitical news announcements' },
    { key: 'calendar', label: 'Economic Event Warnings', icon: '📅', desc: 'T-5 min red folder economic catalyst releases' },
    { key: 'volatility', label: 'Volatility Surge Alarms', icon: '⚡', desc: 'Rapid price displacement and liquidity expansion' },
    { key: 'liquidity', label: 'Liquidity Sweeps (BSL/SSL)', icon: '🎯', desc: 'Smart money stop runs above/below equal highs and lows' },
    { key: 'divergence', label: 'Macro Divergence Alerts', icon: '📡', desc: 'DXY / 10Y Yields decoupling from spot gold action' },
    { key: 'sessions', label: 'Session Open Squawks', icon: '🕒', desc: 'London, New York, and Asian session transitions' },
    { key: 'guidance', label: 'AI Market Guidance Audits', icon: '🧠', desc: 'Regime changes and institutional execution filters' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window soundboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Volume2 size={16} style={{ color: 'var(--cyan-primary)' }} />
            <span className="modal-title">AUDIO SQUAWK &amp; SOUNDBOARD CONTROLLER</span>
          </div>
          <button className="btn-ghost-icon" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Master Mute & Volume Bar */}
          <div className="soundboard-master-row">
            <button
              className={`mute-toggle-btn ${muted ? 'is-muted' : ''}`}
              onClick={handleMuteToggle}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              <span>{muted ? 'AUDIO MUTED (CLICK TO UNMUTE)' : 'AUDIO ACTIVE'}</span>
            </button>

            <button className="btn-secondary" onClick={testSquawkVoice} disabled={muted} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Play size={12} />
              <span>TEST VOICE SQUAWK</span>
            </button>
          </div>

          {/* Volume and Cadence Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="slider-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Master Volume</span>
                <span className="font-mono" style={{ color: 'var(--text-main)' }}>{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={handleVolumeChange}
                disabled={muted}
                className="sound-range-slider"
              />
            </div>

            <div className="slider-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Speech Cadence / Rate</span>
                <span className="font-mono" style={{ color: 'var(--text-main)' }}>{settings.rate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.85"
                max="1.35"
                step="0.05"
                value={settings.rate}
                onChange={handleRateChange}
                disabled={muted}
                className="sound-range-slider"
              />
            </div>
          </div>

          {/* Sound FX Theme Previews */}
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              CHIME SOUND EFFECT PREVIEWS
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { type: 'flash', label: 'Bloomberg Chime' },
                { type: 'event', label: 'Economic Warning' },
                { type: 'bearish', label: 'Liquidation Drop' },
                { type: 'liquidity', label: 'Liquidity Sweep Ping' },
                { type: 'session', label: 'Session Bell' },
              ].map((c) => (
                <button
                  key={c.type}
                  className={`chime-test-chip ${testingChime === c.type ? 'active' : ''}`}
                  onClick={() => testChimeType(c.type)}
                  disabled={muted}
                >
                  <BellRing size={11} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Channel Selectors */}
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              VOICE SQUAWK CHANNELS &bull; SELECTIVE ROUTING
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {channels.map((ch) => {
                const isEnabled = settings.enabledEvents?.[ch.key] !== false;
                return (
                  <div
                    key={ch.key}
                    onClick={() => handleToggleChannel(ch.key)}
                    className={`sound-channel-item ${isEnabled ? 'enabled' : 'disabled'}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>{ch.icon}</span>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 600, color: isEnabled ? 'var(--text-main)' : 'var(--text-dim)' }}>
                          {ch.label}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {ch.desc}
                        </div>
                      </div>
                    </div>
                    <span className={`channel-toggle-pill ${isEnabled ? 'on' : 'off'}`}>
                      {isEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
