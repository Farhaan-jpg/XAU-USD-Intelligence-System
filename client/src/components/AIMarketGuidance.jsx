// client/src/components/AIMarketGuidance.jsx
// Institutional Real-Time Market Guidance & Volatility Defense Engine
// Instant 0ms quantitative computation driven by live sub-second ticks, SMC auction structure, and intermarket vectors

import { useState, useMemo } from 'react';
import { RefreshCw, Volume2, ShieldAlert, Zap, Sparkles } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export default function AIMarketGuidance({
  prices = {},
  activeSession = 'London/NY Overlap',
  calendarData = {},
}) {
  const [deepAiLoading, setDeepAiLoading] = useState(false);
  const [deepAiData, setDeepAiData] = useState(null);

  // Derive Gold and Intermarket Live Metrics
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const dxy = prices['DX-Y.NYB'] || {};
  const us10y = prices['^TNX'] || {};

  const spotPrice = parseFloat(gold.price || 0);
  const goldHigh = parseFloat(gold.high || spotPrice);
  const goldLow = parseFloat(gold.low || spotPrice);

  const goldChg5m = parseFloat(gold.change5m || 0);
  const goldChgDay = parseFloat(gold.changeDay || 0);

  const dxyPrice = parseFloat(dxy.price || 104.5);
  const dxyChg5m = parseFloat(dxy.change5m || 0);
  const us10yPrice = parseFloat(us10y.price || 4.25);
  const us10yChg5m = parseFloat(us10y.change5m || 0);

  // Check proximity of upcoming high-impact economic catalysts
  const upcomingHighImpact = (calendarData?.upcomingEvents || []).find((e) => e.impact === 'HIGH');
  const minsUntilCatalyst = upcomingHighImpact?.date
    ? Math.round((new Date(upcomingHighImpact.date).getTime() - Date.now()) / 60000)
    : null;
  const isCatalystImminent = minsUntilCatalyst !== null && minsUntilCatalyst >= -2 && minsUntilCatalyst <= 15;

  // Real-Time Quantitative Guidance Calculation (0ms latency, runs on every tick)
  const realTimeGuidance = useMemo(() => {
    if (!spotPrice || spotPrice <= 0) {
      return {
        regime: 'INITIALIZING',
        riskLevel: 'NORMAL',
        guidance: 'Syncing live market telemetry from institutional feed...',
        warnings: ['Connecting to high-frequency quote feed...'],
        positionSizing: '0.50% Base',
        executionFilter: 'Awaiting Tick Synchronization',
        volatilityGuard: 'Normal Risk Controls',
        invalidationLevel: '--',
      };
    }

    const dayRange = Math.max(1, goldHigh - goldLow);
    const priceLocation = (spotPrice - goldLow) / dayRange; // 0.0 to 1.0
    const pivotP = (goldHigh + goldLow + spotPrice) / 3;
    const s1 = (2 * pivotP) - goldHigh;
    const r1 = (2 * pivotP) - goldLow;

    let regime = 'EQUILIBRIUM ACCUMULATION';
    let riskLevel = 'NORMAL';
    let guidance = '';
    const warnings = [];
    let positionSizing = '0.50% Standard Sizing';
    let executionFilter = 'Fade Range Extremes / Scalp to EQ';
    let volatilityGuard = 'Standard Stops ($4 - $6)';
    let invalidationLevel = `$${s1.toFixed(2)} (S1)`;

    // 1. Severe Downside Cascade / Liquidation
    if (goldChg5m <= -0.15 || (goldChgDay < -0.7 && priceLocation < 0.25)) {
      regime = 'LONG LIQUIDATION / SELL CASCADE';
      riskLevel = 'CRITICAL';
      guidance = `Aggressive selling momentum active at $${spotPrice.toFixed(2)} (${goldChg5m >= 0 ? '+' : ''}${goldChg5m.toFixed(2)}% 5M). Institutional order flow is sweeping sell-side liquidity pools (SSL). ${
        dxyChg5m > 0.02 || us10yChg5m > 0.01
          ? `Downside is intensified by DXY advancing to ${dxyPrice.toFixed(2)} and 10Y Yields at ${us10yPrice.toFixed(2)}%.`
          : 'High-volume liquidation volume is overpowering resting bid depth.'
      }`;
      warnings.push(`Heavy sell-side velocity. Prohibit premature counter-trend dip buying until a 5M market structure shift (MSS) confirms.`);
      positionSizing = '0.25% Defensive Sizing';
      executionFilter = 'Short Continuations / Rejections at 50% Retracement';
      volatilityGuard = 'Arm Wide Stops ($8 - $12) — High Slip Risk';
      invalidationLevel = `$${goldLow.toFixed(2)} (Daily Low)`;
    }
    // 2. Bullish Expansion / Breakout
    else if (goldChg5m >= +0.15 || (goldChgDay > +0.7 && priceLocation > 0.75)) {
      regime = 'BULLISH EXPANSION / BREAKOUT';
      riskLevel = 'ELEVATED';
      guidance = `Bullish order flow expansion active at $${spotPrice.toFixed(2)} (+${goldChg5m.toFixed(2)}% 5M). Spot gold is pressing buy-side liquidity (BSL) above previous highs. ${
        dxyChg5m < -0.02
          ? `Weakening US Dollar (${dxyPrice.toFixed(2)}) is providing direct macro tailwinds.`
          : 'Momentum buyers are driving clean auction continuation.'
      }`;
      warnings.push(`Equal highs overhead. Guard against liquidity sweep blow-off wicks near resistance.`);
      positionSizing = '0.50% Standard Trend Sizing';
      executionFilter = 'Buy Dips to Fair Value Gaps (FVG) / Optimal Trade Entry (OTE)';
      volatilityGuard = 'Trailing Breakeven Stops';
      invalidationLevel = `$${pivotP.toFixed(2)} (Equilibrium)`;
    }
    // 3. Premium Liquidity Auction (High Range)
    else if (priceLocation >= 0.75) {
      regime = 'PREMIUM LIQUIDITY AUCTION';
      riskLevel = 'ELEVATED';
      guidance = `Gold trading in deep Premium territory at $${spotPrice.toFixed(2)} (${(priceLocation * 100).toFixed(0)}% of daily range). Smart money institutions typically seek distribution and profit taking at these levels. Long exposure carries poor risk-reward.`;
      warnings.push(`Range-high distribution zone. Watch for bearish displacement wicks into liquidity pools.`);
      positionSizing = '0.35% Scalp Sizing';
      executionFilter = 'Bearish Order Block Rejections / Short to EQ';
      volatilityGuard = 'Tight Stops Above R1 ($' + r1.toFixed(2) + ')';
      invalidationLevel = `$${r1.toFixed(2)} (R1 Resistance)`;
    }
    // 4. Discount Liquidity Auction (Low Range)
    else if (priceLocation <= 0.25) {
      regime = 'DISCOUNT LIQUIDITY AUCTION';
      riskLevel = 'ELEVATED';
      guidance = `Gold trading in deep Discount territory at $${spotPrice.toFixed(2)} (${(priceLocation * 100).toFixed(0)}% of daily range). Price is hovering near major sell-side stops. Smart money will look for stop-run sweeps before engineering relief rallies.`;
      warnings.push(`Vulnerable to stop-run sweep below $${goldLow.toFixed(2)}. Wait for liquidity purge wick before entering.`);
      positionSizing = '0.35% Scalp Sizing';
      executionFilter = 'Bullish Order Block & Sweep-and-Reclaim Reversals';
      volatilityGuard = 'Avoid Market Orders into Falling Bids';
      invalidationLevel = `$${s1.toFixed(2)} (S1 Support)`;
    }
    // 5. Balanced Auction / Consolidation
    else {
      regime = 'EQUILIBRIUM ACCUMULATION';
      riskLevel = 'NORMAL';
      guidance = `Gold auction is balanced around fair value equilibrium ($${spotPrice.toFixed(2)}). Session order flow (${activeSession}) is rotating between support ($${s1.toFixed(2)}) and resistance ($${r1.toFixed(2)}). Directional expansion awaits a breakout of range bounds.`;
      warnings.push(`Range-bound compression. Avoid chasing midpoint chop; wait for moves into range extremes.`);
      positionSizing = '0.50% Standard Sizing';
      executionFilter = 'Scalp Range Extremes to Equilibrium ($' + pivotP.toFixed(2) + ')';
      volatilityGuard = 'Standard Risk Protocols';
      invalidationLevel = `$${s1.toFixed(2)} / $${r1.toFixed(2)}`;
    }

    // High Impact News Overdrive
    if (isCatalystImminent && upcomingHighImpact) {
      riskLevel = 'CRITICAL';
      warnings.unshift(
        `🚨 HIGH IMPACT CATALYST IMMINENT: [${upcomingHighImpact.currency}] ${upcomingHighImpact.title} in ${minsUntilCatalyst} minutes. Spreads will widen violently.`
      );
      positionSizing = '0.20% Event Defensive';
      volatilityGuard = 'Flat Book or Double Stop Distances';
    }

    return {
      regime,
      riskLevel,
      guidance,
      warnings,
      positionSizing,
      executionFilter,
      volatilityGuard,
      invalidationLevel,
    };
  }, [
    spotPrice,
    goldHigh,
    goldLow,
    goldChg5m,
    goldChgDay,
    dxyPrice,
    dxyChg5m,
    us10yPrice,
    us10yChg5m,
    activeSession,
    isCatalystImminent,
    upcomingHighImpact?.title,
    minsUntilCatalyst,
  ]);

  // Optional manual deep AI consultation (never blocks or lags the real-time panel)
  const triggerDeepAiAudit = async () => {
    setDeepAiLoading(true);
    try {
      const res = await fetch('/api/ai/guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeSession }),
      });
      const data = await res.json();
      if (data.success && data.guidance) {
        setDeepAiData(data.guidance);
      }
    } catch (_) {}
    finally {
      setDeepAiLoading(false);
    }
  };

  const activeData = deepAiData || realTimeGuidance;
  const regime = activeData.regime || realTimeGuidance.regime;
  const riskLevel = activeData.riskLevel || realTimeGuidance.riskLevel;

  const isCritical = riskLevel === 'CRITICAL';
  const isElevated = riskLevel === 'ELEVATED';

  const riskColor = isCritical ? 'var(--bear-primary)' : isElevated ? 'var(--gold-primary)' : 'var(--bull-primary)';
  const riskBg = isCritical ? 'var(--bear-bg)' : isElevated ? 'var(--gold-bg)' : 'var(--bull-bg)';

  const handleVoiceSquawk = () => {
    const speech = `Market Guidance Alert. Current Regime: ${regime}. Risk Level: ${riskLevel}. ${realTimeGuidance.guidance}. Key Warning: ${(realTimeGuidance.warnings || [])[0] || ''}`;
    speakSquawk(speech, { category: 'guidance', priority: true });
  };

  return (
    <div
      className={`panel-card intelligence-panel ${isCritical ? 'risk-critical' : isElevated ? 'risk-elevated' : ''}`}
      style={{
        borderLeft: `3px solid ${riskColor}`,
      }}
    >
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={13} style={{ color: 'var(--cyan-primary)' }} />
          <span className="panel-title">REAL-TIME INSTITUTIONAL GUIDANCE &amp; VOLATILITY DEFENSE</span>
          <span
            style={{
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: 'var(--cyan-primary)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            0MS LIVE TICK
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Regime Badge */}
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            REGIME: {regime}
          </span>

          {/* Risk Level Badge */}
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              background: riskBg,
              border: `1px solid ${riskColor}33`,
              color: riskColor,
            }}
          >
            RISK: {riskLevel}
          </span>

          {/* Squawk Trigger */}
          <button
            className="filter-pill"
            onClick={handleVoiceSquawk}
            title="Audio voice readout"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Volume2 size={11} />
            <span>SQUAWK</span>
          </button>

          {/* Optional On-Demand AI Deep Audit */}
          <button
            className="filter-pill"
            onClick={triggerDeepAiAudit}
            disabled={deepAiLoading}
            title="Request on-demand deep LLM commentary"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Sparkles size={11} className={deepAiLoading ? 'spin' : ''} />
            <span>{deepAiLoading ? 'AUDITING...' : 'AI AUDIT'}</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginTop: '2px' }}>
        {/* Left Column: Real-Time Guidance Narrative */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.6' }}>
            {deepAiData?.guidance || realTimeGuidance.guidance}
          </div>

          {realTimeGuidance.warnings && realTimeGuidance.warnings.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                fontSize: '11px',
                color: isCritical ? 'var(--bear-primary)' : 'var(--gold-primary)',
                background: isCritical ? 'var(--bear-bg)' : 'var(--gold-bg)',
                border: `1px solid ${isCritical ? 'var(--border-bear)' : 'rgba(245, 158, 11, 0.2)'}`,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <ShieldAlert size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{realTimeGuidance.warnings[0]}</span>
            </div>
          )}
        </div>

        {/* Right Column: Key Structural Levels & Defense Protocols */}
        <div
          style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            DEFENSE PARAMETERS
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Position Sizing</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: isCritical ? 'var(--bear-primary)' : isElevated ? 'var(--gold-primary)' : 'var(--bull-primary)' }}>
              {realTimeGuidance.positionSizing}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Execution Filter</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
              {realTimeGuidance.executionFilter}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Volatility Guard</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: isCritical ? 'var(--bear-primary)' : 'var(--bull-primary)' }}>
              {realTimeGuidance.volatilityGuard}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Key Invalidation</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)', fontWeight: 600 }}>
              {realTimeGuidance.invalidationLevel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
