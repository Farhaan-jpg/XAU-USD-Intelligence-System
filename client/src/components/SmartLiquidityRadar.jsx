// client/src/components/SmartLiquidityRadar.jsx
// Institutional Smart Money Concepts (SMC) & Liquidity Radar (BSL / SSL / FVG / OB)

import { useMemo, useEffect, useRef } from 'react';
import { Target } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export default function SmartLiquidityRadar({ prices = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);

  // Compute ICT Institutional SMC Levels dynamically
  const smcLevels = useMemo(() => {
    const p = spotPrice || 4400;
    const high = parseFloat(gold.high || 0);
    const low = parseFloat(gold.low || 0);

    if (high > 0 && low > 0 && high > low) {
      const range = high - low;
      const eq = (high + low) / 2;
      const bslMajor = high + Math.max(2.5, range * 0.06);
      const sslMajor = low - Math.max(2.5, range * 0.06);

      return {
        bslMajor: bslMajor.toFixed(2),
        bslMinor: high.toFixed(2),
        sslMinor: low.toFixed(2),
        sslMajor: sslMajor.toFixed(2),
        bullishOB: `${low.toFixed(2)} - ${(low + range * 0.12).toFixed(2)}`,
        bearishOB: `${(high - range * 0.12).toFixed(2)} - ${high.toFixed(2)}`,
        fvgPremium: `${(eq + range * 0.12).toFixed(2)} - ${(eq + range * 0.22).toFixed(2)}`,
        fvgDiscount: `${(eq - range * 0.22).toFixed(2)} - ${(eq - range * 0.12).toFixed(2)}`,
        equilibrium: eq.toFixed(2),
      };
    }

    return {
      bslMajor: (p + 16.80).toFixed(2),
      bslMinor: (p + 8.40).toFixed(2),
      sslMinor: (p - 8.20).toFixed(2),
      sslMajor: (p - 17.50).toFixed(2),
      bullishOB: `${(p - 12.00).toFixed(2)} - ${(p - 9.50).toFixed(2)}`,
      bearishOB: `${(p + 9.80).toFixed(2)} - ${(p + 12.40).toFixed(2)}`,
      fvgPremium: `${(p + 5.20).toFixed(2)} - ${(p + 6.80).toFixed(2)}`,
      fvgDiscount: `${(p - 6.50).toFixed(2)} - ${(p - 4.90).toFixed(2)}`,
      equilibrium: p.toFixed(2),
    };
  }, [spotPrice, gold.high, gold.low]);

  // Track liquidity sweep events
  const sweptRef = useRef({ bsl: false, ssl: false });
  useEffect(() => {
    if (!spotPrice || !smcLevels.bslMajor || !smcLevels.sslMajor) return;
    const bsl = parseFloat(smcLevels.bslMajor);
    const ssl = parseFloat(smcLevels.sslMajor);

    if (spotPrice >= bsl && !sweptRef.current.bsl) {
      sweptRef.current.bsl = true;
      speakSquawk(
        `Liquidity Alert. Buy-side liquidity pool swept above equal highs at ${spotPrice.toFixed(2)} dollars. Watch for smart money rejection or expansion.`,
        {
          category: 'liquidity',
          preChime: 'liquidity',
          priority: true,
        }
      );
    } else if (spotPrice < bsl - 3) {
      sweptRef.current.bsl = false;
    }

    if (spotPrice <= ssl && !sweptRef.current.ssl) {
      sweptRef.current.ssl = true;
      speakSquawk(
        `Liquidity Alert. Sell-side liquidity swept below equal lows at ${spotPrice.toFixed(2)} dollars. Retail stop run underway.`,
        {
          category: 'liquidity',
          preChime: 'bearish',
          priority: true,
        }
      );
    } else if (spotPrice > ssl + 3) {
      sweptRef.current.ssl = false;
    }
  }, [spotPrice, smcLevels.bslMajor, smcLevels.sslMajor]);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Target size={13} />
          SMART MONEY CONCEPTS & LIQUIDITY MAP
        </span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)',
          }}
        >
          EQ: ${smcLevels.equilibrium}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {/* Column 1: Buy-Side Liquidity (BSL) */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--bear-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            BUY-SIDE LIQUIDITY (BSL)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Major Highs</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bear-primary)' }}>${smcLevels.bslMajor}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Minor Sweep</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bear-primary)' }}>${smcLevels.bslMinor}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Bearish OB</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontSize: '10px' }}>${smcLevels.bearishOB}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Sell-Side Liquidity (SSL) */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--bull-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            SELL-SIDE LIQUIDITY (SSL)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Major Lows</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bull-primary)' }}>${smcLevels.sslMajor}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Minor Sweep</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bull-primary)' }}>${smcLevels.sslMinor}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Bullish OB</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontSize: '10px' }}>${smcLevels.bullishOB}</span>
            </div>
          </div>
        </div>

        {/* Column 3: Imbalance & Gaps (FVG) */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            FAIR VALUE GAPS (FVG)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Premium</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bear-primary)', fontSize: '10px' }}>${smcLevels.fvgPremium}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Discount</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bull-primary)', fontSize: '10px' }}>${smcLevels.fvgDiscount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Equilibrium</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-primary)' }}>${smcLevels.equilibrium}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
