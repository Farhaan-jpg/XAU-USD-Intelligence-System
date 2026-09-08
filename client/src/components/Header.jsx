// client/src/components/Header.jsx
// Sticky header with brand, live clock, connection status, and latency

import { useState, useEffect } from 'react';

export default function Header({ connected, latency, onOpenSettings }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const utcTime = time.toUTCString().split(' ')[4]; // HH:MM:SS
  const utcDate = time.toUTCString().split(' ').slice(0, 4).join(' ');

  return (
    <header className="header">
      <div className="header-inner">
        {/* Brand */}
        <div className="header-brand">
          <div className="brand-icon">🥇</div>
          <div>
            <div className="brand-name">XAU/USD PRO</div>
            <div className="brand-tagline">Gold Scalper Dashboard</div>
          </div>
        </div>

        {/* Status row */}
        <div className="header-status">
          {/* Connection status */}
          <div className={`status-pill ${connected ? '' : 'connecting'}`}>
            <div className="status-dot" />
            {connected ? 'LIVE' : 'CONNECTING'}
            {latency !== null && connected && (
              <span className="connection-latency" style={{ marginLeft: 4, opacity: 0.7 }}>
                {latency}ms
              </span>
            )}
          </div>

          {/* Engine indicators */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {['PRICE', 'NEWS', 'AI', 'TG'].map((label) => (
              <div
                key={label}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6rem',
                  color: connected ? 'var(--bull-primary)' : 'var(--text-muted)',
                  opacity: connected ? 1 : 0.4,
                  letterSpacing: '0.06em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: 4, height: 4,
                  borderRadius: '50%',
                  background: connected ? 'var(--bull-primary)' : 'var(--bear-primary)',
                }} />
                {label}
              </div>
            ))}
          </div>

          {/* Settings Trigger Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="header-settings-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'rgba(245, 166, 35, 0.1)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--gold-bright)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <span>⚙️</span>
            <span>SETTINGS</span>
          </button>

          {/* Clock */}
          <div className="header-clock">
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>
              {utcTime} UTC
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 1 }}>
              {utcDate}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
