// client/src/components/EconomicCalendar.jsx
// Institutional Forex Factory Economic Calendar with Real-Time Countdown Engine

import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, AlertTriangle, Zap, Timer } from 'lucide-react';

export default function EconomicCalendar({ calendarData = {} }) {
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'HIGH' | 'USD'
  const [now, setNow] = useState(Date.now());

  // 1-Second real-time ticking clock for exact live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const allEvents = useMemo(() => {
    const raw = calendarData?.events || calendarData?.upcomingEvents || [];
    return raw;
  }, [calendarData]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      if (filterMode === 'HIGH') return e.impact === 'HIGH';
      if (filterMode === 'USD') return e.currency === 'USD';
      return true;
    });
  }, [allEvents, filterMode]);

  // Find next upcoming high impact event
  const nextCatalyst = useMemo(() => {
    const futureEvents = allEvents.filter((e) => {
      const t = new Date(e.date || e.timeUTC).getTime();
      return t > now;
    });
    return futureEvents.find((e) => e.impact === 'HIGH') || futureEvents[0] || calendarData?.nextEvent || null;
  }, [allEvents, now, calendarData]);

  // Calculate live countdown string for the next catalyst
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
      minsLeft: Math.round(diff / 60000),
      isUrgent: diff <= 30 * 60 * 1000 && diff > 0,
    };
  }, [nextCatalyst, now]);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <CalendarIcon size={15} />
          ECONOMIC EVENT CALENDAR & VOLATILITY WINDOWS
        </span>

        <div className="filter-pills-row">
          <button
            className={`filter-pill ${filterMode === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterMode('ALL')}
          >
            ALL EVENTS ({allEvents.length})
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

      {/* Next Major Catalyst Real-Time Countdown Hero Banner */}
      {nextCatalyst && (
        <div
          className={`event-catalyst-hero ${catalystCountdown?.isUrgent ? 'urgent' : ''}`}
          style={{
            background: catalystCountdown?.isUrgent
              ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.16), rgba(245, 158, 11, 0.16))'
              : 'linear-gradient(90deg, rgba(245, 158, 11, 0.1), rgba(15, 23, 38, 0.8))',
            border: catalystCountdown?.isUrgent ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-gold)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: catalystCountdown?.isUrgent ? 'var(--bear-bg)' : 'var(--gold-bg)',
                border: catalystCountdown?.isUrgent ? '1px solid var(--border-bear)' : '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: catalystCountdown?.isUrgent ? 'var(--bear-glow)' : 'var(--gold-glow)',
              }}
            >
              <Timer size={18} />
            </div>
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                NEXT MAJOR GOLD CATALYST &bull; {nextCatalyst.currency} {nextCatalyst.impact} IMPACT
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                [{nextCatalyst.currency}] {nextCatalyst.title}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
              COUNTDOWN TO RELEASE
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: catalystCountdown?.isUrgent ? 'var(--bear-glow)' : 'var(--gold-glow)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '1px',
              }}
            >
              {catalystCountdown?.formatted || '00:00:00'}
            </div>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
        <table className="calendar-events-table">
          <thead>
            <tr>
              <th style={{ width: '85px' }}>TIME (UTC)</th>
              <th style={{ width: '105px' }}>COUNTDOWN</th>
              <th style={{ width: '55px' }}>CURR</th>
              <th>EVENT</th>
              <th style={{ width: '80px' }}>IMPACT</th>
              <th style={{ width: '70px', textAlign: 'right' }}>FORECAST</th>
              <th style={{ width: '70px', textAlign: 'right' }}>PREV</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '28px' }}>
                  No events found matching the selected filter.
                </td>
              </tr>
            ) : (
              filteredEvents.slice(0, 25).map((e, idx) => {
                const isHigh = e.impact === 'HIGH';
                const isMed = e.impact === 'MED';
                const eventTimeMs = new Date(e.date || e.timeUTC).getTime();
                const diffMs = eventTimeMs - now;

                let countdownLabel = 'COMPLETED';
                let countdownColor = 'var(--text-dim)';

                if (diffMs > 0) {
                  const sec = Math.floor(diffMs / 1000);
                  const h = Math.floor(sec / 3600);
                  const m = Math.floor((sec % 3600) / 60);
                  const s = sec % 60;
                  if (h > 24) {
                    const days = Math.floor(h / 24);
                    countdownLabel = `in ${days}d ${h % 24}h`;
                  } else {
                    countdownLabel = `in ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                  }
                  countdownColor = isHigh ? 'var(--gold-glow)' : 'var(--text-muted)';
                }

                const utcTimeStr = e.date || e.timeUTC
                  ? new Date(e.date || e.timeUTC).toISOString().substring(11, 16)
                  : '--:--';

                return (
                  <tr key={e.id || idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff' }}>
                      {utcTimeStr}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: countdownColor, fontWeight: 600 }}>
                      {countdownLabel}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: e.currency === 'USD' ? 'var(--gold-glow)' : 'var(--text-main)',
                        }}
                      >
                        {e.currency || 'USD'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#e5e7eb' }}>{e.title}</td>
                    <td>
                      <span className={`event-impact-badge ${isHigh ? 'high' : isMed ? 'med' : 'low'}`}>
                        {e.impact}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {e.forecast || '--'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textAlign: 'right' }}>
                      {e.previous || '--'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
