// client/src/components/VolatilityTrapDetector.jsx
// Post-News "Volatility Expansion" Reversal & Mean Reversion Detector
// Monitors rapid gold price sweeps after high-impact events and warns against chasing fake breakouts

import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, Flame, ShieldAlert, ArrowRightCircle, Sparkles } from 'lucide-react';

export default function VolatilityTrapDetector({ prices = {}, calendarData = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const currentPrice = parseFloat(gold.price || 0);

  const priceHistory = useRef([]);
  const [trapAlert, setTrapAlert] = useState(null);

  // Monitor velocity over last 30 seconds
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

      // Rapid expansion threshold: $6+ move in <60s
      if (absDelta >= 6.0) {
        const isUp = delta > 0;
        setTrapAlert({
          type: isUp ? 'UPSIDE_BLOWOFF' : 'DOWNSIDE_SWEEP',
          title: isUp ? 'Aggressive Upside Liquidity Spike Detected' : 'Aggressive Downside Liquidity Sweep Detected',
          delta: `${isUp ? '+' : ''}${delta.toFixed(2)}`,
          speed: `${absDelta.toFixed(1)} USD in under 60s`,
          advice: isUp
            ? 'Caution: Chasing long here has low R:R. Watch for exhaustion wick retest or rejection back into equilibrium.'
            : 'Caution: Retail stop run in progress. Watch for smart money absorption and rapid mean-reversion reclaim.',
          color: isUp ? 'var(--bear-glow)' : 'var(--bull-glow)',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    }
  }, [currentPrice]);

  return (
    <div className="panel-card" style={{ background: trapAlert ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card)' }}>
      <div className="panel-header">
        <span className="panel-title">
          <Flame size={15} style={{ color: trapAlert ? 'var(--bear-glow)' : 'var(--gold-glow)' }} />
          POST-NEWS VOLATILITY SPIKE & REVERSAL TRAP DETECTOR
        </span>
        <span
          className={`event-impact-badge ${trapAlert ? 'high' : 'low'}`}
          style={{ fontSize: '10px' }}
        >
          {trapAlert ? 'VOLATILITY SPIKE ACTIVE' : 'CALM REGIME'}
        </span>
      </div>

      {trapAlert ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} style={{ color: trapAlert.color }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: trapAlert.color }}>
                {trapAlert.title} ({trapAlert.delta} USD)
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{trapAlert.timestamp}</span>
          </div>

          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: '1.5',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              borderLeft: `2px solid ${trapAlert.color}`,
            }}
          >
            {trapAlert.advice}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)', padding: '6px 0' }}>
          <span>Monitoring real-time tick velocity for institutional fakeouts and post-news exhaustion wicks...</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bull-glow)' }}>NORMAL VOLATILITY (&lt; $2.50/min)</span>
        </div>
      )}
    </div>
  );
}
