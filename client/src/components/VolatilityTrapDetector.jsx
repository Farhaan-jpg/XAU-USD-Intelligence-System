// client/src/components/VolatilityTrapDetector.jsx
// Post-News "Volatility Expansion" Reversal & Mean Reversion Detector with Ambient Border

import { useState, useEffect, useRef } from 'react';
import { Flame, ShieldAlert, Activity } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export default function VolatilityTrapDetector({ prices = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const currentPrice = parseFloat(gold.price || 0);

  const priceHistory = useRef([]);
  const [trapAlert, setTrapAlert] = useState(null);

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

      // Rapid expansion threshold: $6+ move in <60s
      if (absDelta >= 6.0) {
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
        });
      }
    }
  }, [currentPrice]);

  useEffect(() => {
    if (trapAlert) {
      const isBear = trapAlert.title.toLowerCase().includes('down') || trapAlert.title.toLowerCase().includes('bear');
      speakSquawk(
        `Volatility ${isBear ? 'Bearish' : 'Bullish'} Alert. ${trapAlert.title}. Velocity of ${trapAlert.delta} dollars in under sixty seconds. ${isBear ? 'Rapid downside sell pressure.' : 'Beware of fakeout.'}`,
        {
          category: 'volatility',
          preChime: isBear ? 'bearish' : 'trap',
          priority: true,
        }
      );
    }
  }, [trapAlert?.timestamp]);

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
          <Activity size={13} style={{ color: trapAlert ? 'var(--bear-primary)' : 'var(--text-dim)' }} />
          POST-NEWS VOLATILITY SWEEP & TRAP DETECTOR
        </span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: trapAlert ? 'var(--bear-primary)' : 'var(--bull-primary)',
          }}
        >
          {trapAlert ? 'SPIKE ACTIVE' : 'CALM REGIME (< $2.50/MIN)'}
        </span>
      </div>

      {trapAlert ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Monitoring real-time tick velocity for institutional fakeouts and post-news exhaustion wicks...</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bull-primary)' }}>NORMAL</span>
        </div>
      )}
    </div>
  );
}
