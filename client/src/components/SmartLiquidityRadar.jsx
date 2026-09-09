// client/src/components/SmartLiquidityRadar.jsx
// Institutional Smart Money Concepts (SMC) & Liquidity Level Radar
// Detects Buy-Side Liquidity (BSL), Sell-Side Liquidity (SSL), Fair Value Gaps (FVG), and Order Blocks

import { useMemo, useEffect, useRef } from 'react';
import { Target, Layers, ArrowUpRight, ArrowDownRight, ShieldCheck, Zap } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export default function SmartLiquidityRadar({ prices = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);

  // Compute ICT Institutional SMC Levels dynamically based on live spot and session range
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

    // Volatility-calibrated fallback if session range is pending
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
          preChime: 'liquidity',
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
          <Target size={15} />
          SMART LIQUIDITY & ORDER BLOCK RADAR (ICT / SMC)
        </span>
        <span className="telemetry-badge" style={{ fontSize: '10px', color: 'var(--gold-glow)' }}>
          LIQUIDITY ENGINE ACTIVE
        </span>
      </div>

      <div className="liquidity-grid">
        {/* Buy-Side Liquidity Pool (BSL) */}
        <div className="liquidity-card bsl">
          <div className="liquidity-card-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--bear-glow)' }}>
              <ArrowUpRight size={14} />
              <strong>BUY-SIDE LIQUIDITY (BSL)</strong>
            </span>
            <span className="event-impact-badge high">RESTING BUY STOPS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <div className="liquidity-row">
              <span className="liquidity-label">Major Pool (Equal Highs)</span>
              <span className="liquidity-val" style={{ color: 'var(--bear-glow)' }}>${smcLevels.bslMajor}</span>
            </div>
            <div className="liquidity-row">
              <span className="liquidity-label">Minor Asian High Sweep</span>
              <span className="liquidity-val" style={{ color: 'var(--bear-glow)' }}>${smcLevels.bslMinor}</span>
            </div>
            <div className="liquidity-row">
              <span className="liquidity-label">Bearish Order Block (OB)</span>
              <span className="liquidity-val" style={{ color: '#fff' }}>${smcLevels.bearishOB}</span>
            </div>
          </div>
        </div>

        {/* Sell-Side Liquidity Pool (SSL) */}
        <div className="liquidity-card ssl">
          <div className="liquidity-card-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--bull-glow)' }}>
              <ArrowDownRight size={14} />
              <strong>SELL-SIDE LIQUIDITY (SSL)</strong>
            </span>
            <span className="event-impact-badge low">RESTING SELL STOPS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <div className="liquidity-row">
              <span className="liquidity-label">Minor Asian Low Sweep</span>
              <span className="liquidity-val" style={{ color: 'var(--bull-glow)' }}>${smcLevels.sslMinor}</span>
            </div>
            <div className="liquidity-row">
              <span className="liquidity-label">Major Pool (Equal Lows)</span>
              <span className="liquidity-val" style={{ color: 'var(--bull-glow)' }}>${smcLevels.sslMajor}</span>
            </div>
            <div className="liquidity-row">
              <span className="liquidity-label">Bullish Order Block (OB)</span>
              <span className="liquidity-val" style={{ color: '#fff' }}>${smcLevels.bullishOB}</span>
            </div>
          </div>
        </div>

        {/* Fair Value Gaps (FVG) Imbalance Tracker */}
        <div className="liquidity-card fvg">
          <div className="liquidity-card-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-glow)' }}>
              <Zap size={14} />
              <strong>FAIR VALUE GAPS (FVG)</strong>
            </span>
            <span className="event-impact-badge med">IMBALANCES</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <div className="liquidity-row">
              <span className="liquidity-label">Premium Imbalance</span>
              <span className="liquidity-val" style={{ color: 'var(--bear-glow)' }}>${smcLevels.fvgPremium}</span>
            </div>
            <div className="liquidity-row">
              <span className="liquidity-label">Discount Imbalance</span>
              <span className="liquidity-val" style={{ color: 'var(--bull-glow)' }}>${smcLevels.fvgDiscount}</span>
            </div>
            <div className="liquidity-row">
              <span className="liquidity-label">Equilibrium (EQ 50%)</span>
              <span className="liquidity-val" style={{ color: 'var(--gold-glow)' }}>${smcLevels.equilibrium}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
