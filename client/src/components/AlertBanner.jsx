// client/src/components/AlertBanner.jsx
// Full-width flashing banner for T-5min pre-event alerts

import { useState, useEffect } from 'react';

export default function AlertBanner({ calendarData }) {
  const [dismissed, setDismissed] = useState(null);

  const countdown = calendarData?.countdown;
  const preEvent = calendarData?.preEventAlert;

  useEffect(() => {
    // Auto-dismiss after 2 minutes
    if (preEvent && countdown?.event?.id) {
      const timer = setTimeout(() => setDismissed(countdown.event.id), 120000);
      return () => clearTimeout(timer);
    }
  }, [preEvent, countdown]);

  if (!preEvent || !countdown?.event) return null;
  if (dismissed === countdown.event.id) return null;

  return (
    <div className="alert-banner">
      <div className="alert-banner-icon">⚡</div>
      <div className="alert-banner-content">
        <div className="alert-banner-title">⚠ HIGH IMPACT EVENT — PREPARE POSITIONS</div>
        <div className="alert-banner-text">
          <strong>{countdown.event.title}</strong> — {countdown.event.description}
        </div>
      </div>
      <div className="alert-banner-countdown">
        {countdown.formatted}
      </div>
      <button
        onClick={() => setDismissed(countdown.event.id)}
        style={{
          background: 'none',
          border: '1px solid rgba(255,152,0,0.3)',
          borderRadius: '4px',
          color: 'var(--alert-primary)',
          cursor: 'pointer',
          padding: '4px 8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          marginLeft: '8px',
        }}
      >
        ✕
      </button>
    </div>
  );
}
