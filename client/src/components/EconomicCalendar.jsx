// client/src/components/EconomicCalendar.jsx
// Tabular Institutional Economic Calendar with Timezone Switcher, Standardized Surprise Index & Live Countdown Engine

import { useState, useEffect, useMemo, memo } from 'react';
import { Calendar as CalendarIcon, Timer, Globe, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function EconomicCalendar({ calendarData = {} }) {
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'HIGH' | 'USD'
  const [tz, setTz] = useState('UTC'); // 'UTC' | 'EST' | 'GMT' | 'IST' | 'LOCAL'
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

  // Convert event UTC timestamp to selected timezone
  const formatEventTime = (isoString) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';

    if (tz === 'UTC') {
      return d.toISOString().slice(11, 16) + ' UTC';
    }
    if (tz === 'EST') {
      // New York (America/New_York)
      return d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }) + ' EST';
    }
    if (tz === 'GMT') {
      // London (Europe/London)
      return d.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }) + ' GMT';
    }
    if (tz === 'IST') {
      // India (Asia/Kolkata)
      return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
    }
    // LOCAL device time
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' LOC';
  };

  return (
    <div className="panel-card panel-card-flex" style={{ height: '100%' }}>
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarIcon size={13} style={{ color: 'var(--cyan-primary)' }} />
          <span className="panel-title">ECONOMIC EVENT CALENDAR</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Timezone Switcher */}
          <div className="calendar-tz-segment">
            <Globe size={10} style={{ opacity: 0.6, marginLeft: '4px' }} />
            {['UTC', 'EST', 'GMT', 'IST', 'LOCAL'].map((t) => (
              <button
                key={t}
                className={`tz-btn ${tz === t ? 'active' : ''}`}
                onClick={() => setTz(t)}
                title={`Switch calendar timezone to ${t}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Impact Filter Pills */}
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
                NEXT CATALYST &bull; [{nextCatalyst.currency}] {formatEventTime(nextCatalyst.date || nextCatalyst.timeUTC)}
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
      <div style={{ maxHeight: '340px', overflowY: 'auto', overflowX: 'auto' }}>
        <table className="calendar-events-table">
          <thead>
            <tr>
              <th style={{ width: '85px' }}>TIME ({tz})</th>
              <th style={{ width: '80px' }}>COUNTDOWN</th>
              <th style={{ width: '45px' }}>CURR</th>
              <th>EVENT CATALYST</th>
              <th style={{ width: '60px', textAlign: 'right' }}>ACTUAL</th>
              <th style={{ width: '60px', textAlign: 'right' }}>FORECAST</th>
              <th style={{ width: '60px', textAlign: 'right' }}>PREVIOUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                  No upcoming events match the active filter.
                </td>
              </tr>
            ) : (
              filteredEvents.map((e, idx) => {
                const eventTime = new Date(e.date || e.timeUTC).getTime();
                const diffMs = eventTime - now;
                const isPast = diffMs <= 0;

                let countdownStr = 'RELEASED';
                if (!isPast) {
                  const m = Math.floor(diffMs / 60000);
                  const h = Math.floor(m / 60);
                  const remM = m % 60;
                  countdownStr = h > 0 ? `${h}h ${remM}m` : `${m}m`;
                }

                const isHigh = e.impact === 'HIGH';
                const isMed = e.impact === 'MED';

                return (
                  <tr key={e.id || idx} className={isHigh ? 'cal-row-high' : ''}>
                    <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {formatEventTime(e.date || e.timeUTC)}
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px', color: isPast ? 'var(--text-dim)' : isHigh ? 'var(--bear-primary)' : 'var(--gold-primary)' }}>
                      {countdownStr}
                    </td>
                    <td>
                      <span className="cal-curr-badge" style={{ color: e.currency === 'USD' ? 'var(--gold-primary)' : 'var(--text-main)' }}>
                        {e.currency}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          className={`cal-impact-dot ${isHigh ? 'high' : isMed ? 'med' : 'low'}`}
                          title={`Impact: ${e.impact}`}
                        />
                        <span style={{ fontWeight: isHigh ? 600 : 500, color: 'var(--text-main)' }}>
                          {e.title}
                        </span>
                        {e.surprise && (
                          <span
                            className={`cal-surprise-tag ${e.surprise.direction === 'HAWKISH' ? 'hawk' : e.surprise.direction === 'DOVISH' ? 'dove' : 'neutral'}`}
                            title={`Standardized Surprise: ${e.surprise.zScore || e.surprise.score}`}
                          >
                            {e.surprise.direction}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 600, color: e.actual ? 'var(--cyan-primary)' : 'var(--text-dim)' }}>
                      {e.actual || '--'}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {e.forecast || '--'}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-dim)' }}>
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

export default memo(EconomicCalendar);
