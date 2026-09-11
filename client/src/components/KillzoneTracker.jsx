// client/src/components/KillzoneTracker.jsx
// ICT Institutional Session Killzones & London Open Judas Swing Tracker
// Displays active session, countdown to next killzone, and smart money Judas trap status

import { useState, useEffect, useMemo, memo} from 'react';
import { Clock, Crosshair, AlertCircle, ShieldCheck } from 'lucide-react';

const KILLZONES = [
  { id: 'ASIA', name: 'Asian Range Accumulation', startUtc: 0, endUtc: 7, color: 'var(--cyan-primary)', desc: 'Initial liquidity bounds established' },
  { id: 'LONDON_JUDAS', name: 'London Open Judas Swing', startUtc: 7, endUtc: 9, color: 'var(--bear-primary)', desc: 'Fakeout expansion & stop run on Asian range' },
  { id: 'LONDON_EXPANSION', name: 'London Expansion & Lunch', startUtc: 9, endUtc: 12, color: 'var(--cyan-primary)', desc: 'Institutional trend continuation & equilibrium' },
  { id: 'NY_OPEN', name: 'NY Open & Equities Bell', startUtc: 12, endUtc: 15, color: 'var(--gold-primary)', desc: 'Peak daily institutional volume & London overlap' },
  { id: 'LONDON_CLOSE', name: 'London Fixing & Close', startUtc: 15, endUtc: 17, color: 'var(--purple-primary)', desc: 'European profit taking & benchmark fixing flows' },
  { id: 'NY_PM', name: 'New York PM & Cash Close', startUtc: 17, endUtc: 21, color: 'var(--gold-primary)', desc: 'US afternoon trend continuation & settlement' },
  { id: 'PRE_ASIA', name: 'Late NY / Pre-Asian Drift', startUtc: 21, endUtc: 24, color: 'var(--text-dim)', desc: 'Low liquidity range drift into Asia open' },
];

function KillzoneTracker({ prices = {} }) {
  const [utcTime, setUtcTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setUtcTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);

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

    // Judas Trap evaluation: during London Open (07:00 - 09:00 UTC), check if market made an aggressive initial move that is reversing
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

      <div className="killzone-status-row">
        {/* Active Session Badge */}
        <div className="killzone-badge-block">
          <span className="kz-sub-label">ACTIVE KILLZONE</span>
          <div className="kz-current-pill" style={{ color: killzoneStatus.activeKz?.color || 'var(--text-main)' }}>
            <span className="kz-pulse-dot" style={{ background: killzoneStatus.activeKz?.color || 'var(--text-main)' }} />
            <span>{killzoneStatus.activeKz?.name || 'Pre-Market Equilibrium'}</span>
          </div>
        </div>

        {/* Next Catalyst Countdown */}
        <div className="killzone-badge-block right">
          <span className="kz-sub-label">NEXT: {killzoneStatus.nextKz?.name?.split(' ')[0] || 'SESSION'} IN</span>
          <span className="kz-countdown-val">{killzoneStatus.countdown}</span>
        </div>
      </div>

      {/* Judas Trap Warning (when active during London Open) */}
      {killzoneStatus.judasTrapState && (
        <div className="judas-trap-banner">
          <AlertCircle size={13} style={{ color: 'var(--gold-primary)', flexShrink: 0 }} />
          <div>
            <strong>{killzoneStatus.judasTrapState.title}:</strong> {killzoneStatus.judasTrapState.note}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(KillzoneTracker);
