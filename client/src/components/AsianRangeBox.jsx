// client/src/components/AsianRangeBox.jsx
// Institutional Asian Range (00:00 - 07:00 UTC) Box Tracker & London/NY Expansion Raid Targets

import { useState, useEffect, useMemo } from 'react';
import { Box, ArrowUpRight, ArrowDownRight, Compass, ShieldAlert, CheckCircle } from 'lucide-react';

export default function AsianRangeBox({ prices = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);

  // UTC Date Key for today (e.g. 2026-09-10)
  const todayKey = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const storageKey = `xauusd_asian_box_${todayKey}`;

  // State for Asian range
  const [rangeState, setRangeState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      high: 0,
      low: 0,
      locked: false,
      bslSwept: false,
      sslSwept: false,
      bslSweptPrice: null,
      sslSweptPrice: null,
    };
  });

  // Track live price to build/maintain Asian Box
  useEffect(() => {
    if (!spotPrice || spotPrice <= 0) return;

    const now = new Date();
    const utcHour = now.getUTCHours();
    const isAsianSession = utcHour >= 0 && utcHour < 7;

    setRangeState((prev) => {
      let nextHigh = prev.high;
      let nextLow = prev.low;
      let nextLocked = prev.locked;
      let nextBslSwept = prev.bslSwept;
      let nextSslSwept = prev.sslSwept;
      let nextBslPrice = prev.bslSweptPrice;
      let nextSslPrice = prev.sslSweptPrice;

      if (isAsianSession) {
        // Accumulating Asian Box
        nextHigh = nextHigh === 0 ? spotPrice : Math.max(nextHigh, spotPrice);
        nextLow = nextLow === 0 ? spotPrice : Math.min(nextLow, spotPrice);
        nextLocked = false;
      } else {
        // Asian session complete — locked
        nextLocked = true;
        // If high/low was never initialized during Asian (e.g. user opened dashboard during London),
        // derive baseline from day low/high or spot price
        if (nextHigh === 0 || nextLow === 0) {
          const dayHigh = parseFloat(gold.high || 0);
          const dayLow = parseFloat(gold.low || 0);
          if (dayHigh > 0 && dayLow > 0 && dayHigh > dayLow) {
            const spread = (dayHigh - dayLow) * 0.45;
            nextHigh = parseFloat((dayLow + spread * 1.5).toFixed(2));
            nextLow = parseFloat((dayLow + spread * 0.5).toFixed(2));
          } else {
            nextHigh = parseFloat((spotPrice + 4.5).toFixed(2));
            nextLow = parseFloat((spotPrice - 4.5).toFixed(2));
          }
        }

        // Check if London / NY has swept Asian High or Low
        if (nextHigh > 0 && spotPrice > nextHigh && !nextBslSwept) {
          nextBslSwept = true;
          nextBslPrice = spotPrice;
        }
        if (nextLow > 0 && spotPrice < nextLow && !nextSslSwept) {
          nextSslSwept = true;
          nextSslPrice = spotPrice;
        }
      }

      // Avoid redundant disk I/O and state re-renders if range boundaries are unchanged
      if (
        prev.high === nextHigh &&
        prev.low === nextLow &&
        prev.locked === nextLocked &&
        prev.bslSwept === nextBslSwept &&
        prev.sslSwept === nextSslSwept &&
        prev.bslSweptPrice === nextBslPrice &&
        prev.sslSweptPrice === nextSslPrice
      ) {
        return prev;
      }

      const updated = {
        high: nextHigh,
        low: nextLow,
        locked: nextLocked,
        bslSwept: nextBslSwept,
        sslSwept: nextSslSwept,
        bslSweptPrice: nextBslPrice,
        sslSweptPrice: nextSslPrice,
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (_) {}

      return updated;
    });
  }, [spotPrice, storageKey, gold.high, gold.low]);

  // Derived targets
  const calculations = useMemo(() => {
    const high = rangeState.high || spotPrice || 2800;
    const low = rangeState.low || (spotPrice ? spotPrice - 6 : 2794);
    const range = Math.max(1.0, high - low);
    const eq = (high + low) / 2;

    // London / NY Judas Swing Raid Targets
    const bslTarget1 = high + range * 0.5;
    const bslTarget2 = high + range * 1.0;
    const sslTarget1 = low - range * 0.5;
    const sslTarget2 = low - range * 1.0;

    // Current location relative to Asian range
    const distToHigh = spotPrice - high;
    const distToLow = spotPrice - low;
    const distToEq = spotPrice - eq;

    let regime = 'CONSOLIDATION_INSIDE_BOX';
    if (spotPrice > high) regime = 'BULLISH_EXPANSION_ABOVE';
    else if (spotPrice < low) regime = 'BEARISH_EXPANSION_BELOW';

    // Automated ICT London "Judas Swing" Detection (07:00 - 11:00 UTC)
    let judasSetup = null;
    const nowUtcHour = new Date().getUTCHours();
    const isLondonOrNY = nowUtcHour >= 7 && nowUtcHour <= 16;

    if (rangeState.locked && isLondonOrNY) {
      if (rangeState.bslSwept && spotPrice < high && spotPrice >= low) {
        judasSetup = {
          type: 'BEARISH_JUDAS',
          label: 'CONFIRMED BEARISH JUDAS SWING (SWEEP & RECLAIM)',
          detail: `Asian High ($${high.toFixed(2)}) was swept and reclaimed at $${spotPrice.toFixed(2)}. Trapped breakout buyers in a fakeout. Smart money targeting Asian Equilibrium ($${eq.toFixed(2)}) and Asian Low ($${low.toFixed(2)}).`,
          target: low.toFixed(2),
          invalidation: rangeState.bslSweptPrice ? rangeState.bslSweptPrice.toFixed(2) : (high + 2.5).toFixed(2),
          bias: 'BEARISH',
          color: 'var(--bear-primary)',
          bg: 'var(--bear-bg)',
          border: 'var(--border-bear)',
        };
      } else if (rangeState.sslSwept && spotPrice > low && spotPrice <= high) {
        judasSetup = {
          type: 'BULLISH_JUDAS',
          label: 'CONFIRMED BULLISH JUDAS SWING (SWEEP & RECLAIM)',
          detail: `Asian Low ($${low.toFixed(2)}) was swept and reclaimed at $${spotPrice.toFixed(2)}. Trapped breakdown sellers in a stop-run trap. Smart money targeting Asian Equilibrium ($${eq.toFixed(2)}) and Asian High ($${high.toFixed(2)}).`,
          target: high.toFixed(2),
          invalidation: rangeState.sslSweptPrice ? rangeState.sslSweptPrice.toFixed(2) : (low - 2.5).toFixed(2),
          bias: 'BULLISH',
          color: 'var(--bull-primary)',
          bg: 'var(--bull-bg)',
          border: 'var(--border-bull)',
        };
      }
    }

    return {
      high: high.toFixed(2),
      low: low.toFixed(2),
      range: range.toFixed(2),
      eq: eq.toFixed(2),
      bslTarget1: bslTarget1.toFixed(2),
      bslTarget2: bslTarget2.toFixed(2),
      sslTarget1: sslTarget1.toFixed(2),
      sslTarget2: sslTarget2.toFixed(2),
      distToHigh: distToHigh.toFixed(2),
      distToLow: distToLow.toFixed(2),
      distToEq: distToEq.toFixed(2),
      regime,
      judasSetup,
    };
  }, [rangeState.high, rangeState.low, rangeState.locked, rangeState.bslSwept, rangeState.sslSwept, rangeState.bslSweptPrice, rangeState.sslSweptPrice, spotPrice]);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Box size={13} style={{ color: 'var(--cyan-primary)' }} />
          SESSION RANGE TRACKER &bull; ASIAN BOX (00:00 - 07:00 UTC)
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              padding: '1px 6px',
              borderRadius: '3px',
              background: rangeState.locked ? 'rgba(56, 189, 248, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              color: rangeState.locked ? 'var(--cyan-primary)' : 'var(--gold-primary)',
              border: `1px solid ${rangeState.locked ? 'rgba(56, 189, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}
          >
            {rangeState.locked ? 'BOX LOCKED (LONDON/NY ACTIVE)' : 'ACCUMULATING ASIAN TICKS'}
          </span>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
            RANGE: ${calculations.range}
          </span>
        </div>
      </div>

      {/* Judas Swing Alert Banner */}
      {calculations.judasSetup && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            background: calculations.judasSetup.bg,
            border: `1px solid ${calculations.judasSetup.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            marginBottom: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={13} style={{ color: calculations.judasSetup.color }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: calculations.judasSetup.color }}>
                {calculations.judasSetup.label}
              </span>
            </div>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: calculations.judasSetup.color }}>
              TARGET: ${calculations.judasSetup.target} | INVALIDATION: ${calculations.judasSetup.invalidation}
            </span>
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
            {calculations.judasSetup.detail}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
        {/* Box Core Metrics */}
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', padding: '10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
            ASIAN BENCHMARK RANGE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--bear-primary)' }}>Asian High (BSL)</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--bear-primary)' }}>
                ${calculations.high}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--gold-primary)' }}>Midpoint / Eq (50%)</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--gold-primary)' }}>
                ${calculations.eq}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--bull-primary)' }}>Asian Low (SSL)</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--bull-primary)' }}>
                ${calculations.low}
              </span>
            </div>
          </div>
        </div>

        {/* London Judas Raid Targets */}
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', padding: '10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
            LONDON / NY RAID TARGETS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)' }}>BSL Ext (+0.5x)</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bear-primary)' }}>
                ${calculations.bslTarget1}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)' }}>BSL Max (+1.0x)</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bear-primary)' }}>
                ${calculations.bslTarget2}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)' }}>SSL Ext (-0.5x)</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bull-primary)' }}>
                ${calculations.sslTarget1}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)' }}>SSL Max (-1.0x)</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bull-primary)' }}>
                ${calculations.sslTarget2}
              </span>
            </div>
          </div>
        </div>

        {/* Session Liquidity Sweep Status */}
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', padding: '10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
            SWEEP DETECTOR
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)' }}>
                {rangeState.bslSwept ? (
                  <CheckCircle size={12} style={{ color: 'var(--bull-primary)' }} />
                ) : (
                  <Compass size={12} style={{ color: 'var(--text-dim)' }} />
                )}
                Asian High Swept:
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: rangeState.bslSwept ? 'var(--bull-primary)' : 'var(--text-dim)',
                }}
              >
                {rangeState.bslSwept ? `YES ($${rangeState.bslSweptPrice?.toFixed(2)})` : 'PENDING'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)' }}>
                {rangeState.sslSwept ? (
                  <CheckCircle size={12} style={{ color: 'var(--bear-primary)' }} />
                ) : (
                  <Compass size={12} style={{ color: 'var(--text-dim)' }} />
                )}
                Asian Low Swept:
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: rangeState.sslSwept ? 'var(--bear-primary)' : 'var(--text-dim)',
                }}
              >
                {rangeState.sslSwept ? `YES ($${rangeState.sslSweptPrice?.toFixed(2)})` : 'PENDING'}
              </span>
            </div>

            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '4px' }}>
              Spot is {spotPrice >= parseFloat(calculations.high) ? (
                <span style={{ color: 'var(--bull-primary)' }}>+${calculations.distToHigh} above Asian High</span>
              ) : spotPrice <= parseFloat(calculations.low) ? (
                <span style={{ color: 'var(--bear-primary)' }}>-${Math.abs(parseFloat(calculations.distToLow)).toFixed(2)} below Asian Low</span>
              ) : (
                <span style={{ color: 'var(--gold-primary)' }}>inside range (${calculations.distToEq} from Eq)</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
