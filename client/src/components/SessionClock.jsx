// client/src/components/SessionClock.jsx
// Linear 24-Hour Global Session Timeline & Volatility Regime Ribbon

import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

export default function SessionClock() {
  const [currentUtcHour, setCurrentUtcHour] = useState(new Date().getUTCHours());
  const [currentUtcMin, setCurrentUtcMin] = useState(new Date().getUTCMinutes());

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentUtcHour(now.getUTCHours());
      setCurrentUtcMin(now.getUTCMinutes());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const totalMins = currentUtcHour * 60 + currentUtcMin;

  const sessions = [
    {
      id: 'asia',
      name: 'Asian / Tokyo',
      hours: '00:00 - 09:00 UTC',
      startMins: 0,
      endMins: 9 * 60,
      volatility: 'Low - Med Range',
    },
    {
      id: 'london',
      name: 'London',
      hours: '07:00 - 16:00 UTC',
      startMins: 7 * 60,
      endMins: 16 * 60,
      volatility: 'High Expansion',
    },
    {
      id: 'overlap',
      name: 'London / NY Overlap',
      hours: '12:00 - 16:00 UTC',
      startMins: 12 * 60,
      endMins: 16 * 60,
      volatility: 'Peak Daily Volume',
      isOverlap: true,
    },
    {
      id: 'ny',
      name: 'New York',
      hours: '12:00 - 21:00 UTC',
      startMins: 12 * 60,
      endMins: 21 * 60,
      volatility: 'High Volatility',
    },
  ];

  const isOverlapActive = totalMins >= 12 * 60 && totalMins <= 16 * 60;
  const currentVolRegime = isOverlapActive
    ? 'PEAK LIQUIDITY (OVERLAP)'
    : totalMins >= 7 * 60 && totalMins <= 21 * 60
    ? 'HIGH LIQUIDITY SESSION'
    : 'ASIAN ACCUMULATION RANGE';

  return (
    <div className="session-linear-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
        <span className="panel-title">
          <Globe size={13} />
          24H GLOBAL SESSION TIMELINE
        </span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: isOverlapActive ? 'var(--gold-primary)' : 'var(--text-dim)',
            letterSpacing: '0.04em',
          }}
        >
          {currentVolRegime}
        </span>
      </div>

      <div className="session-timeline-strip">
        {sessions.map((s) => {
          const isOpen = totalMins >= s.startMins && totalMins <= s.endMins;
          return (
            <div
              key={s.id}
              className={`session-segment ${isOpen ? 'active' : ''}`}
              style={{
                borderColor: s.isOverlap && isOpen ? 'rgba(245, 158, 11, 0.3)' : undefined,
              }}
            >
              <div className="session-segment-header">
                <span className="session-segment-name">
                  {isOpen && <span className="session-dot-pulse" style={{ background: s.isOverlap ? 'var(--gold-primary)' : 'var(--bull-primary)' }} />}
                  <span>{s.name}</span>
                </span>
                <span className="session-segment-hours">{s.hours}</span>
              </div>
              <div className="session-segment-vol">
                {isOpen ? (
                  <span style={{ color: s.isOverlap ? 'var(--gold-primary)' : 'var(--bull-primary)' }}>
                    ACTIVE &bull; {s.volatility}
                  </span>
                ) : (
                  <span>CLOSED &bull; {s.volatility}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
