// client/src/components/EventImpactTracker.jsx
// Post-Event Price Impact Tracker — records and displays real-time price reaction to macro catalysts

import { useState, useEffect } from 'react';
import { Activity, Clock, Zap, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export default function EventImpactTracker({ calendarData = {}, prices = {} }) {
  const [impacts, setImpacts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchImpacts = () => {
    setLoading(true);
    fetch('/api/calendar/impacts')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.impacts) {
          setImpacts(data.impacts);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchImpacts();
    const interval = setInterval(fetchImpacts, 15000);
    return () => clearInterval(interval);
  }, []);

  const upcomingHigh = (calendarData?.upcomingEvents || []).find((e) => e.impact === 'HIGH');

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Activity size={13} style={{ color: 'var(--cyan-primary)' }} />
          POST-EVENT PRICE DISPLACEMENT &amp; VOLATILITY TRACKER
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-ghost-icon"
            onClick={fetchImpacts}
            title="Refresh impacts"
            style={{ width: '22px', height: '22px' }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
            TRACKS T0 &rarr; T+5M &rarr; T+15M &rarr; T+30M
          </span>
        </div>
      </div>

      {upcomingHigh && (
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={14} style={{ color: 'var(--cyan-primary)' }} />
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Next Monitored Catalyst:</span>{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                [{upcomingHigh.currency}] {upcomingHigh.title}
              </span>
            </div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-primary)', fontWeight: 600 }}>
            {upcomingHigh.timeIST || new Date(upcomingHigh.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Impact Records Table */}
      {impacts.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
          No high-impact releases triggered in the active tracking window yet. The engine will automatically snapshot Gold price at T0 and track T+5m, T+15m, and T+30m displacement.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', textAlign: 'left', fontSize: '10px' }}>
                <th style={{ padding: '6px 8px' }}>CATALYST</th>
                <th style={{ padding: '6px 8px' }}>RELEASE</th>
                <th style={{ padding: '6px 8px' }}>T0 PRICE</th>
                <th style={{ padding: '6px 8px' }}>T+5M</th>
                <th style={{ padding: '6px 8px' }}>T+15M</th>
                <th style={{ padding: '6px 8px' }}>NET MOVE</th>
                <th style={{ padding: '6px 8px' }}>REACTION</th>
              </tr>
            </thead>
            <tbody>
              {impacts.map((imp) => {
                const isBull = (imp.netChange || 0) > 0;
                const isBear = (imp.netChange || 0) < 0;

                return (
                  <tr
                    key={imp.eventId || imp.title}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <td style={{ padding: '8px', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                      <span style={{ color: 'var(--gold-primary)', marginRight: '4px' }}>[{imp.currency}]</span>
                      {imp.title}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                      {imp.timeIST || (imp.releaseTime ? new Date(imp.releaseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-')}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--text-main)' }}>
                      ${imp.t0Price ? imp.t0Price.toFixed(2) : '-'}
                    </td>
                    <td style={{ padding: '8px', color: imp.t5Price ? 'var(--text-main)' : 'var(--text-dim)' }}>
                      {imp.t5Price ? `$${imp.t5Price.toFixed(2)}` : 'Measuring...'}
                    </td>
                    <td style={{ padding: '8px', color: imp.t15Price ? 'var(--text-main)' : 'var(--text-dim)' }}>
                      {imp.t15Price ? `$${imp.t15Price.toFixed(2)}` : '-'}
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        fontWeight: 600,
                        color: isBull ? 'var(--bull-primary)' : isBear ? 'var(--bear-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {imp.netChange !== undefined ? `${isBull ? '+' : ''}$${imp.netChange.toFixed(2)} (${imp.netPercent}%)` : '-'}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: isBull ? 'var(--bull-bg)' : isBear ? 'var(--bear-bg)' : 'rgba(255,255,255,0.05)',
                          color: isBull ? 'var(--bull-primary)' : isBear ? 'var(--bear-primary)' : 'var(--text-dim)',
                          border: `1px solid ${isBull ? 'var(--border-bull)' : isBear ? 'var(--border-bear)' : 'transparent'}`,
                        }}
                      >
                        {imp.classification || 'PENDING'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
