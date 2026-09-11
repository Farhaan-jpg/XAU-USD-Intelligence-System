// client/src/components/VolatilityTrapDetector.jsx
// Post-News "Volatility Expansion" Reversal & Mean Reversion Detector with Ambient Border
// Institutional real-time velocity monitoring & fakeout trap alert system

import { useState, useEffect, useRef, memo } from 'react';
import { Activity, ShieldAlert, Zap, Gauge } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

function VolatilityTrapDetector({ prices = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const currentPrice = parseFloat(gold.price || 0);

  const priceHistory = useRef([]);
  const lastAlertTimeRef = useRef(0);
  const [trapAlert, setTrapAlert] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState({
    delta: 0,
    speed: 0,
    regime: 'CALM',
    percentOfThreshold: 0,
  });

  // Monitor velocity over last 60 seconds
  useEffect(() => {
    if (!currentPrice) return;
    const now = Date.now();
    priceHistory.current.push({ price: currentPrice, time: now });

    // Prune entries older than 60s
    priceHistory.current = priceHistory.current.filter((p) => now - p.time <= 60000);

    if (priceHistory.current.length >= 2) {
      const oldest = priceHistory.current[0].price;
      const newest = currentPrice;
      const delta = newest - oldest;
      const absDelta = Math.abs(delta);
      const pct = Math.min(100, Math.round((absDelta / 6.0) * 100));

      let reg = 'CALM';
      if (absDelta >= 6.0) reg = 'EXPANSION SPIKE';
      else if (absDelta >= 3.0) reg = 'ELEVATED';
      else if (absDelta >= 1.5) reg = 'NORMAL';

      setLiveMetrics({
        delta,
        speed: absDelta,
        regime: reg,
        percentOfThreshold: pct,
      });

      // Rapid expansion threshold: $6+ move in <60s with 45s cooldown
      if (absDelta >= 6.0 && now - lastAlertTimeRef.current > 45000) {
        lastAlertTimeRef.current = now;
        const isUp = delta > 0;
        setTrapAlert({
          type: isUp ? 'UPSIDE_BLOWOFF' : 'DOWNSIDE_SWEEP',
          title: isUp ? 'Aggressive Upside Spike Detected' : 'Aggressive Downside Sweep Detected',
          delta: `${isUp ? '+' : ''}${delta.toFixed(2)}`,
          speed: `${absDelta.toFixed(1)} USD in <60s`,
          advice: isUp
            ? 'Caution: Rapid buying spike. High risk of exhaustion wick or mean-reversion pullbacks.'
            : 'Caution: Rapid downside selling velocity. Institutional stop run / sell-side liquidity liquidation in progress.',
          color: isUp ? 'var(--bull-primary)' : 'var(--bear-primary)',
          timestamp: new Date().toLocaleTimeString(),
          timeMs: now,
        });
      } else if (absDelta < 2.5 && trapAlert && now - (trapAlert.timeMs || 0) > 60000) {
        // Auto-dismiss once market velocity normalizes
        setTrapAlert(null);
      }
    }
  }, [currentPrice, trapAlert]);

  useEffect(() => {
    if (trapAlert) {
      const isBear = trapAlert.title.toLowerCase().includes('down') || trapAlert.title.toLowerCase().includes('bear');
      speakSquawk(
        `Volatility ${isBear ? 'Bearish' : 'Bullish'} Alert. ${trapAlert.title}. Velocity of ${trapAlert.delta} dollars in under sixty seconds. ${isBear ? 'Rapid downside sell pressure.' : 'Beware of fakeout.'}`,
        {
          category: 'volatility',
          preChime: isBear ? 'bearish' : 'trap',
          priority: true,
          dedupeKey: `vol_trap_${trapAlert.type}_${Math.floor((trapAlert.timeMs || Date.now()) / 45000)}`,
        }
      );
    }
  }, [trapAlert?.timeMs]);

  const isUpDelta = liveMetrics.delta >= 0;

  return (
    <div
      className="panel-card"
      style={{
        borderLeft: trapAlert ? `3px solid ${trapAlert.color}` : '1px solid var(--border-subtle)',
        background: trapAlert ? 'rgba(244, 63, 94, 0.04)' : undefined,
      }}
    >
      <div className="panel-header">
        <span className="panel-title">
          <Activity size={13} style={{ color: trapAlert ? 'var(--bear-primary)' : 'var(--cyan-primary)' }} />
          POST-NEWS VOLATILITY SWEEP &amp; TRAP DETECTOR
        </span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: trapAlert ? 'var(--bear-primary)' : 'var(--bull-primary)',
          }}
        >
          {trapAlert ? 'SPIKE ACTIVE' : `CALM REGIME (< $2.50/MIN)`}
        </span>
      </div>

      {trapAlert ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '2px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={14} style={{ color: trapAlert.color }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: trapAlert.color }}>
                {trapAlert.title} ({trapAlert.delta} USD)
              </span>
            </div>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
              {trapAlert.timestamp}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            {trapAlert.advice}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '2px 0' }}>
          {/* Velocity Progress Meter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>60-Second Real-Time Velocity</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: isUpDelta ? 'var(--bull-primary)' : 'var(--bear-primary)', fontWeight: 600 }}>
                {isUpDelta ? '+' : ''}${liveMetrics.delta.toFixed(2)} / min ({liveMetrics.speed.toFixed(2)} USD)
              </span>
            </div>
            <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(5, liveMetrics.percentOfThreshold)}%`,
                  background: liveMetrics.percentOfThreshold > 70 ? 'var(--bear-primary)' : liveMetrics.percentOfThreshold > 40 ? 'var(--gold-primary)' : 'var(--cyan-primary)',
                  transition: 'width 0.4s ease',
                  borderRadius: '3px',
                }}
              />
            </div>
          </div>

          {/* Institutional 3-Grid Telemetry */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trap Threshold</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>$6.00 / 60s</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trap Risk Level</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--bull-primary)', marginTop: '2px' }}>LOW / NORMAL</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mean Reversion</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--cyan-primary)', marginTop: '2px' }}>ARMED &amp; IDLE</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(VolatilityTrapDetector);
