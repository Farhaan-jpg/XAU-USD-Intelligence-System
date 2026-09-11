// client/src/components/KillzoneTracker.jsx
// ICT Institutional Session Killzones & London Open Judas Swing Tracker
// Displays active session, countdown to next killzone, and smart money Judas trap status

import { useState, useEffect, useMemo, memo } from 'react';
import { Clock, Crosshair, AlertCircle, ShieldCheck } from 'lucide-react';

const KILLZONES = [
  { id: 'ASIA', name: 'Asian Range Accumulation', shortName: 'ASIA', startUtc: 0, endUtc: 7, color: 'var(--cyan-primary)', desc: 'Initial liquidity bounds established' },
  { id: 'LONDON_JUDAS', name: 'London Open Judas Swing', shortName: 'LONDON JUDAS', startUtc: 7, endUtc: 9, color: 'var(--bear-primary)', desc: 'Fakeout expansion & stop run' },
  { id: 'LONDON_EXPANSION', name: 'London Expansion & Lunch', shortName: 'LONDON EXP', startUtc: 9, endUtc: 12, color: 'var(--cyan-primary)', desc: 'Trend continuation & equilibrium' },
  { id: 'NY_OPEN', name: 'NY Open & Equities Bell', shortName: 'NY OPEN', startUtc: 12, endUtc: 15, color: 'var(--gold-primary)', desc: 'Peak daily volume & London overlap' },
  { id: 'LONDON_CLOSE', name: 'London Fixing & Close', shortName: 'LONDON CLOSE', startUtc: 15, endUtc: 17, color: 'var(--purple-primary)', desc: 'European fixing flows' },
  { id: 'NY_PM', name: 'New York PM & Cash Close', shortName: 'NY PM', startUtc: 17, endUtc: 21, color: 'var(--gold-primary)', desc: 'US settlement & run' },
];

function KillzoneTracker({ prices = {} }) {
  const [utcTime, setUtcTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setUtcTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const gold = prices['GC=F'] || prices['XAUUSD'] || {};

  const killzoneStatus = useMemo(() => {
    const hours = utcTime.getUTCHours() + utcTime.getUTCMinutes() / 60;

    let activeKz = null;
    let nextKz = null;
    let minDiff = Infinity;

    for (let i = 0; i < KILLZONES.length; i++) {
      const kz = KILLZONES[i];
      if (hours >= kz.startUtc && hours < kz.endUtc) {
        activeKz = kz;
      }

      // Calculate time until start
      let diffHours = kz.startUtc - hours;
      if (diffHours <= 0) diffHours += 24;
      if (diffHours < minDiff) {
        minDiff = diffHours;
        nextKz = kz;
      }
    }

    // Countdown formatting
    const totalSec = Math.floor(minDiff * 3600);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const countdown = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    // Judas Trap evaluation: during London Open (07:00 - 09:00 UTC)
    const isJudasWindow = hours >= 7.0 && hours <= 9.0;
    let judasTrapState = null;
    if (isJudasWindow) {
      const change5m = parseFloat(gold.change5m || 0);
      if (change5m <= -0.15) {
        judasTrapState = {
          type: 'BEARISH_JUDAS_SWEEP',
          title: 'London Bearish Judas Run Active',
          note: 'London initial selloff sweeping Asian sell-side stops. Watch for bullish reversal if S1 holds.',
        };
      } else if (change5m >= 0.15) {
        judasTrapState = {
          type: 'BULLISH_JUDAS_SWEEP',
          title: 'London Bullish Judas Run Active',
          note: 'London morning spike pressing Asian buy-side stops. Guard against false breakout bull traps.',
        };
      }
    }

    return { activeKz, nextKz, countdown, judasTrapState };
  }, [utcTime, gold.change5m]);

  return (
    <div className="killzone-card">
      <div className="killzone-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Crosshair size={12} style={{ color: 'var(--gold-primary)' }} />
          <span className="killzone-title">INSTITUTIONAL KILLZONES &amp; SESSIONS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={11} style={{ opacity: 0.6 }} />
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            {utcTime.toISOString().slice(11, 19)} UTC
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 6px', gap: '12px' }}>
        {/* Active Session Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ACTIVE KILLZONE
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: killzoneStatus.activeKz?.color || 'var(--text-main)', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: killzoneStatus.activeKz?.color || 'var(--text-main)', boxShadow: '0 0 6px currentColor' }} />
            <span>{killzoneStatus.activeKz?.name || 'Pre-Market Equilibrium'}</span>
          </div>
        </div>

        {/* Next Catalyst Countdown */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            NEXT: {killzoneStatus.nextKz?.shortName || 'SESSION'}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--gold-primary)',
            background: 'var(--gold-bg)',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid var(--border-gold)',
          }}>
            IN {killzoneStatus.countdown}
          </span>
        </div>
      </div>

      {/* Session Micro-Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px',
        padding: '6px 12px 10px',
      }}>
        {KILLZONES.slice(0, 3).map((kz) => {
          const isActive = killzoneStatus.activeKz?.id === kz.id;
          return (
            <div
              key={kz.id}
              style={{
                background: isActive ? 'rgba(0, 194, 255, 0.08)' : 'rgba(0,0,0,0.25)',
                border: `1px solid ${isActive ? 'var(--cyan-primary)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '5px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1px',
              }}
            >
              <div style={{ fontSize: '9px', fontWeight: 700, color: isActive ? 'var(--cyan-primary)' : 'var(--text-muted)' }}>
                {kz.shortName}
              </div>
              <div style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                {String(kz.startUtc).padStart(2, '0')}:00 - {String(kz.endUtc).padStart(2, '0')}:00 UTC
              </div>
            </div>
          );
        })}
      </div>

      {/* Judas Trap Warning (when active during London Open) */}
      {killzoneStatus.judasTrapState && (
        <div style={{
          margin: '0 12px 10px',
          padding: '6px 10px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: 'var(--gold-primary)',
        }}>
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <div>
            <strong>{killzoneStatus.judasTrapState.title}:</strong> {killzoneStatus.judasTrapState.note}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(KillzoneTracker);
