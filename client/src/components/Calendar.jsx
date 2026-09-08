// client/src/components/Calendar.jsx
// Production Forex Factory Economic Calendar — Verified Live Schedule
// Real-time tracking of Tier-1 macro catalysts, exact forecasts, previous data, and live countdowns

import { useState, useEffect } from 'react';

const CURRENCY_FLAGS = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  CNY: '🇨🇳',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  NZD: '🇳🇿',
  CHF: '🇨🇭',
  ALL: '🌐',
};

const IMPACT_STYLES = {
  HIGH: {
    bg: 'rgba(255, 61, 87, 0.15)',
    color: 'var(--bear-bright)',
    border: '1px solid rgba(255, 61, 87, 0.35)',
    icon: '🔴',
  },
  MED: {
    bg: 'rgba(255, 152, 0, 0.12)',
    color: 'var(--alert-primary)',
    border: '1px solid rgba(255, 152, 0, 0.3)',
    icon: '🟠',
  },
  LOW: {
    bg: 'rgba(120, 144, 156, 0.1)',
    color: 'var(--neutral-primary)',
    border: '1px solid rgba(120, 144, 156, 0.2)',
    icon: '🟡',
  },
};

function LiveCountdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;

    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('RELEASED / DUE');
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      if (d > 0) {
        setTimeLeft(`${d}d ${h}h ${m}m`);
      } else {
        setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <div className="countdown-value">{timeLeft || '...'}</div>;
}

export default function Calendar({ calendarData }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'USD' | 'HIGH'
  const [search, setSearch] = useState('');

  const nextEvent = calendarData?.nextEvent;
  const events = calendarData?.events || calendarData?.upcoming || [];

  const filteredEvents = events.filter((e) => {
    if (filter === 'USD' && e.currency !== 'USD') return false;
    if (filter === 'HIGH' && e.impact !== 'HIGH') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (e.title || '').toLowerCase().includes(q) ||
        (e.currency || '').toLowerCase().includes(q) ||
        (e.dateIST || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const nextEventTimeIST = nextEvent?.timeIST || (nextEvent?.date ? new Date(nextEvent.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
  const nextEventDateIST = nextEvent?.dateIST || (nextEvent?.date ? new Date(nextEvent.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '');

  return (
    <div className="card calendar-card">
      {/* Card Header */}
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">🗓️</span>
          Economic Calendar (Forex Factory)
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div className="card-badge" style={{ color: 'var(--gold-primary)', borderColor: 'var(--gold-muted)' }}>
            Asia/Kolkata (IST)
          </div>
          <div className="card-badge">{events.length} Events</div>
        </div>
      </div>

      {/* Next Event Countdown Widget */}
      {nextEvent ? (
        <div className="countdown-widget">
          <div className="countdown-event-info">
            <div className="countdown-event-type" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{CURRENCY_FLAGS[nextEvent.currency] || '🌐'}</span>
              <span>{nextEvent.currency} · {nextEvent.impact} IMPACT</span>
            </div>
            <div className="countdown-event-title" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {nextEvent.title}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.66rem',
              color: 'var(--gold-muted)',
              marginTop: 3,
            }}>
              ⏰ {nextEventDateIST} @ {nextEventTimeIST} IST ({new Date(nextEvent.date).toUTCString().slice(17, 22)} UTC)
            </div>
            {(nextEvent.forecast || nextEvent.previous) && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.64rem',
                color: 'var(--text-secondary)',
                marginTop: 2,
              }}>
                {nextEvent.forecast && <span>Forecast: <strong style={{ color: 'var(--text-primary)' }}>{nextEvent.forecast}</strong> </span>}
                {nextEvent.previous && <span>| Prev: <strong style={{ color: 'var(--text-muted)' }}>{nextEvent.previous}</strong></span>}
              </div>
            )}
          </div>
          <div className="countdown-timer">
            <LiveCountdown targetDate={nextEvent.date} />
            <div className="countdown-label">until release</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.74rem', fontStyle: 'italic' }}>
          No upcoming scheduled events in immediate window
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'USD', label: '🇺🇸 USD Only' },
            { id: 'HIGH', label: '🔴 High Impact' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-btn ${filter === tab.id ? 'active' : ''}`}
              onClick={() => setFilter(tab.id)}
              style={{ padding: '3px 8px', fontSize: '0.64rem' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: 110,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
            padding: '3px 6px',
            fontSize: '0.64rem',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
      </div>

      {/* Events List */}
      <div className="event-list" style={{ maxHeight: 380, overflowY: 'auto' }}>
        {filteredEvents.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
            No events match your filter
          </div>
        ) : (
          filteredEvents.map((e) => {
            const impactStyle = IMPACT_STYLES[e.impact] || IMPACT_STYLES.LOW;
            const isDue = new Date(e.date) <= new Date();

            return (
              <div
                key={e.id}
                className="event-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  transition: 'background 0.15s ease',
                  opacity: isDue ? 0.65 : 1,
                }}
              >
                {/* Left: Date / Time + Flag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.64rem',
                    color: 'var(--gold-muted)',
                    minWidth: 72,
                  }}>
                    <div>{e.dateIST || new Date(e.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {e.timeIST || new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <span style={{ fontSize: '1rem', flexShrink: 0 }} title={e.currency}>
                    {CURRENCY_FLAGS[e.currency] || '🌐'}
                  </span>

                  {/* Title & Description */}
                  <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                    <div style={{
                      fontSize: '0.76rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {e.title}
                    </div>
                    {e.description && (
                      <div style={{
                        fontSize: '0.62rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {e.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actual / Forecast / Prev + Impact Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {/* Forecast & Previous */}
                  <div style={{
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.64rem',
                  }}>
                    {e.actual ? (
                      <div style={{ color: 'var(--bull-primary)', fontWeight: 700 }}>
                        Act: {e.actual}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-primary)' }}>
                        {e.forecast ? `Exp: ${e.forecast}` : ''}
                      </div>
                    )}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.58rem' }}>
                      {e.previous ? `Prv: ${e.previous}` : ''}
                    </div>
                  </div>

                  {/* Impact Tag */}
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: impactStyle.bg,
                      color: impactStyle.color,
                      border: impactStyle.border,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {e.impact}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
