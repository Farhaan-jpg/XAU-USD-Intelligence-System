// client/src/components/EconomicCalendar.jsx
// Tabular Institutional Economic Calendar with Impact Dots & Live Countdown Engine

import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Timer } from 'lucide-react';

export default function EconomicCalendar({ calendarData = {} }) {
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'HIGH' | 'USD'
  const [now, setNow] = useState(Date.now());

  // 1-Second real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const allEvents = useMemo(() => {
    const raw = calendarData?.events || calendarData?.upcomingEvents || [];
    // Automatically prune completed news events (remove once event time has passed by > 60s)
    return raw.filter((e) => {
      const eventTime = new Date(e.date || e.timeUTC).getTime();
      return eventTime >= (now - 60000);
    });
  }, [calendarData, now]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      if (filterMode === 'HIGH') return e.impact === 'HIGH';
      if (filterMode === 'USD') return e.currency === 'USD';
      return true;
    });
  }, [allEvents, filterMode]);

  const nextCatalyst = useMemo(() => {
    const futureEvents = allEvents.filter((e) => {
      const t = new Date(e.date || e.timeUTC).getTime();
      return t > now;
    });
    return futureEvents.find((e) => e.impact === 'HIGH') || futureEvents[0] || calendarData?.nextEvent || null;
  }, [allEvents, now, calendarData]);

  const catalystCountdown = useMemo(() => {
    if (!nextCatalyst) return null;
    const target = new Date(nextCatalyst.date || nextCatalyst.timeUTC).getTime();
    const diff = Math.max(0, target - now);
    const totalSec = Math.floor(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return {
      formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      isUrgent: diff <= 30 * 60 * 1000 && diff > 0,
    };
  }, [nextCatalyst, now]);

  return (
    <div className="panel-card panel-card-flex" style={{ height: '100%' }}>
      <div className="panel-header">
        <span className="panel-title">
          <CalendarIcon size={13} />
          ECONOMIC EVENT CALENDAR
        </span>

        <div className="filter-pills-row">
          <button
            className={`filter-pill ${filterMode === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterMode('ALL')}
          >
            ALL ({allEvents.length})
          </button>
          <button
            className={`filter-pill ${filterMode === 'HIGH' ? 'active' : ''}`}
            onClick={() => setFilterMode('HIGH')}
          >
            HIGH IMPACT
          </button>
          <button
            className={`filter-pill ${filterMode === 'USD' ? 'active' : ''}`}
            onClick={() => setFilterMode('USD')}
          >
            USD ONLY
          </button>
        </div>
      </div>

      {/* Next Major Catalyst Countdown Bar */}
      {nextCatalyst && (
        <div
          style={{
            background: catalystCountdown?.isUrgent ? 'var(--bear-bg)' : 'rgba(0,0,0,0.2)',
            border: catalystCountdown?.isUrgent ? '1px solid var(--border-bear)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Timer size={15} style={{ color: catalystCountdown?.isUrgent ? 'var(--bear-primary)' : 'var(--gold-primary)' }} />
            <div>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em' }}>
                NEXT CATALYST &bull; {nextCatalyst.currency}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                {nextCatalyst.title}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>
              COUNTDOWN
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: catalystCountdown?.isUrgent ? 'var(--bear-primary)' : 'var(--gold-primary)',
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {catalystCountdown?.formatted || '00:00:00'}
            </div>
          </div>
        </div>
      )}

      {/* Tabular Events View */}
      <div style={{ maxHeight: '380px', overflowY: 'auto', overflowX: 'auto' }}>
        <table className="calendar-events-table">
          <thead>
            <tr>
              <th style={{ width: '70px' }}>TIME (UTC)</th>
              <th style={{ width: '85px' }}>COUNTDOWN</th>
              <th style={{ width: '45px' }}>CURR</th>
              <th>EVENT</th>
              <th style={{ width: '60px' }}>IMPACT</th>
              <th style={{ width: '65px', textAlign: 'right' }}>FORECAST</th>
              <th style={{ width: '65px', textAlign: 'right' }}>PREV</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>
                  No economic events found matching filter.
                </td>
              </tr>
            ) : (
              filteredEvents.slice(0, 30).map((e, idx) => {
                const isHigh = e.impact === 'HIGH';
                const isMed = e.impact === 'MED';
                const eventTimeMs = new Date(e.date || e.timeUTC).getTime();
                const diffMs = eventTimeMs - now;

                let countdownLabel = 'RELEASED';
                let countdownColor = 'var(--cyan-primary)';

                if (diffMs > 0) {
                  const sec = Math.floor(diffMs / 1000);
                  const h = Math.floor(sec / 3600);
                  const m = Math.floor((sec % 3600) / 60);
                  const s = sec % 60;
                  if (h > 24) {
                    const days = Math.floor(h / 24);
                    countdownLabel = `${days}d ${h % 24}h`;
                  } else {
                    countdownLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                  }
                  countdownColor = isHigh ? 'var(--gold-primary)' : 'var(--text-muted)';
                }

                const utcTimeStr = e.date || e.timeUTC
                  ? new Date(e.date || e.timeUTC).toISOString().substring(11, 16)
                  : '--:--';

                return (
                  <tr key={e.id || idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                      {utcTimeStr}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: countdownColor }}>
                      {countdownLabel}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: e.currency === 'USD' ? 'var(--brand-gold)' : 'var(--text-secondary)' }}>
                        {e.currency || 'USD'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-main)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.title}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span className={`impact-dot ${isHigh ? 'high' : isMed ? 'med' : 'low'}`} />
                        <span style={{ fontSize: '10px', color: isHigh ? 'var(--bear-primary)' : isMed ? 'var(--gold-primary)' : 'var(--text-dim)' }}>
                          {e.impact}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--text-muted)' }}>
                      {e.forecast || '--'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--text-dim)' }}>
                      {e.previous || '--'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '6px',
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>FOREX FACTORY &bull; COMPLETED PRUNED</span>
        <span>{filteredEvents.length} UPCOMING</span>
      </div>
    </div>
  );
}
