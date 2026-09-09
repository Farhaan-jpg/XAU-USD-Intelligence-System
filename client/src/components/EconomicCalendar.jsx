// client/src/components/EconomicCalendar.jsx
// Institutional Forex Factory Economic Calendar with Countdown Timers

import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, AlertTriangle } from 'lucide-react';

export default function EconomicCalendar({ calendarData = {} }) {
  const [highOnly, setHighOnly] = useState(true);

  const upcomingEvents = useMemo(() => {
    const events = calendarData?.upcomingEvents || [];
    return highOnly ? events.filter((e) => e.impact === 'HIGH') : events;
  }, [calendarData, highOnly]);

  const nextHighEvent = useMemo(() => {
    const allUpcoming = calendarData?.upcomingEvents || [];
    return allUpcoming.find((e) => e.impact === 'HIGH');
  }, [calendarData]);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <CalendarIcon size={15} />
          ECONOMIC EVENT CALENDAR & VOLATILITY WINDOWS
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`filter-pill ${highOnly ? 'active' : ''}`}
            onClick={() => setHighOnly(!highOnly)}
          >
            {highOnly ? 'HIGH IMPACT ONLY' : 'SHOW ALL EVENTS'}
          </button>
        </div>
      </div>

      {/* Next Major Catalyst Banner */}
      {nextHighEvent && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid var(--border-gold)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} style={{ color: 'var(--gold-glow)' }} />
            <div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                NEXT MAJOR GOLD CATALYST
              </span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                [{nextHighEvent.currency || 'USD'}] {nextHighEvent.title}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              EVENT TIME
            </span>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold-glow)', fontFamily: 'var(--font-mono)' }}>
              {nextHighEvent.timeUTC ? new Date(nextHighEvent.timeUTC).toUTCString().slice(17, 22) + ' UTC' : 'TBD'}
            </div>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
        <table className="calendar-events-table">
          <thead>
            <tr>
              <th>TIME</th>
              <th>CURR</th>
              <th>EVENT</th>
              <th>IMPACT</th>
              <th>FORECAST</th>
              <th>PREVIOUS</th>
            </tr>
          </thead>
          <tbody>
            {upcomingEvents.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>
                  No high-impact events scheduled in the immediate horizon.
                </td>
              </tr>
            ) : (
              upcomingEvents.slice(0, 15).map((e, idx) => {
                const isHigh = e.impact === 'HIGH';
                const isMed = e.impact === 'MED';
                const timeStr = e.timeUTC
                  ? new Date(e.timeUTC).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--';

                return (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{timeStr}</td>
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
                    <td style={{ fontWeight: 600, color: '#fff' }}>{e.title}</td>
                    <td>
                      <span className={`event-impact-badge ${isHigh ? 'high' : isMed ? 'med' : 'low'}`}>
                        {e.impact}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {e.forecast || '--'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
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
