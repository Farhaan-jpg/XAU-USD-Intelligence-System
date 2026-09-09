// client/src/components/SessionClock.jsx
// 24-Hour Global Market Session Clock & Volatility Regime Tracker

import { useState, useEffect } from 'react';
import { Globe, Flame } from 'lucide-react';

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
      name: 'Tokyo / Asian',
      hours: '00:00 - 09:00 UTC',
      startMins: 0,
      endMins: 9 * 60,
      role: 'Accumulation / Range Formation',
      volatility: 'Low - Med',
    },
    {
      name: 'London',
      hours: '07:00 - 16:00 UTC',
      startMins: 7 * 60,
      endMins: 16 * 60,
      role: 'Liquidity Expansion / Trend Day',
      volatility: 'High',
    },
    {
      name: 'London / NY Overlap',
      hours: '12:00 - 16:00 UTC',
      startMins: 12 * 60,
      endMins: 16 * 60,
      role: 'PEAK GOLD VOLUME & RUNS',
      volatility: 'Extreme Peak',
      isOverlap: true,
    },
    {
      name: 'New York',
      hours: '12:00 - 21:00 UTC',
      startMins: 12 * 60,
      endMins: 21 * 60,
      role: 'US Economic Releases & Fixings',
      volatility: 'High',
    },
  ];

  // Determine active overlap
  const isOverlapActive = totalMins >= 12 * 60 && totalMins <= 16 * 60;
  const currentVolRegime = isOverlapActive
    ? 'PEAK VOLATILITY (LONDON/NY OVERLAP)'
    : totalMins >= 7 * 60 && totalMins <= 21 * 60
    ? 'HIGH LIQUIDITY SESSION'
    : 'NORMAL / ASIAN CONSOLIDATION';

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Globe size={15} />
          GLOBAL SESSION CLOCK & VOLATILITY REGIME
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Flame size={14} style={{ color: isOverlapActive ? 'var(--bear-glow)' : 'var(--gold-glow)' }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: isOverlapActive ? 'var(--bear-glow)' : 'var(--gold-glow)',
              textTransform: 'uppercase',
            }}
          >
            {currentVolRegime}
          </span>
        </div>
      </div>

      <div className="session-clock-strip">
        {sessions.map((s) => {
          const isOpen = totalMins >= s.startMins && totalMins <= s.endMins;
          return (
            <div
              key={s.name}
              className={`session-box ${isOpen ? 'active' : ''}`}
              style={{
                borderColor: s.isOverlap && isOpen ? 'var(--gold-primary)' : undefined,
                background: s.isOverlap && isOpen ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), var(--bg-panel))' : undefined,
              }}
            >
              <div className="session-name">
                <span style={{ color: s.isOverlap ? 'var(--gold-glow)' : '#fff' }}>{s.name}</span>
                <span className={`session-status ${isOpen ? 'open' : 'closed'}`}>
                  {isOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                {s.hours}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Vol: <strong style={{ color: isOpen ? 'var(--bull-glow)' : 'inherit' }}>{s.volatility}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
