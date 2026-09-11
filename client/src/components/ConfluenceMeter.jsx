// client/src/components/ConfluenceMeter.jsx
// Institutional Confluence & Composite Market Bias Engine
// Integrates Intermarket Macro, Professional Trader Psychology & Contrarian Traps, SMC Liquidity, and News Vectors

import { useMemo, useEffect, useRef, memo} from 'react';
import { ShieldAlert, TrendingUp, TrendingDown, Gauge, Minus, BrainCircuit, Users, Target, Compass } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';
import { calculateFearGreed, analyzeTraderPsychology } from '../utils/sentimentEngine';

function ConfluenceMeter({ prices = {}, newsFeed = [], calendarData = {}, cotData = {} }) {
  const calculation = useMemo(() => {
    const gold = prices['GC=F'] || prices['XAUUSD'] || {};
    const dxy = prices['DX-Y.NYB'] || {};
    const us10y = prices['^TNX'] || {};
    const us02y = prices['^IRX'] || {};
    const silver = prices['SI=F'] || prices['XAGUSD'] || {};
    const usdjpy = prices['JPY=X'] || {};
    const oil = prices['CL=F'] || {};

    const spotPrice = parseFloat(gold.price || 0);
    const goldHigh = parseFloat(gold.high || spotPrice);
    const goldLow = parseFloat(gold.low || spotPrice);
    const goldOpen = parseFloat(gold.open || spotPrice);

    const dayRange = Math.max(1, goldHigh - goldLow);
    const priceLocation = spotPrice > 0 ? (spotPrice - goldLow) / dayRange : 0.5;
    const pivotP = (goldHigh + goldLow + spotPrice) / 3;
    const s1 = (2 * pivotP) - goldHigh;
    const r1 = (2 * pivotP) - goldLow;

    const goldChg5m = parseFloat(gold.change5m || 0);
    const goldChg15m = parseFloat(gold.intervals?.['15']?.chp ?? goldChg5m);
    const goldChg1h = parseFloat(gold.intervals?.['60']?.chp ?? (goldChg5m * 1.5));
    const goldChgDay = parseFloat(gold.changeDay || 0);

    const dxyChg5m = parseFloat(dxy.change5m || 0);
    const dxyChgDay = parseFloat(dxy.changeDay || 0);
    const us10yChg5m = parseFloat(us10y.change5m || 0);
    const us10yChgDay = parseFloat(us10y.changeDay || 0);
    const us02yChg5m = parseFloat(us02y.change5m || 0);
    const silverChg5m = parseFloat(silver.change5m || 0);
    const usdjpyChg5m = parseFloat(usdjpy.change5m || 0);
    const oilChg5m = parseFloat(oil.change5m || 0);
    const oilChgDay = parseFloat(oil.changeDay || 0);

    // 1. Macro Dollar, Yields & Energy Intermarket Vector
    const dxyImpulse = (dxyChg5m * 0.65) + (dxyChgDay * 0.35);
    const us10yImpulse = (us10yChg5m * 0.65) + (us10yChgDay * 0.35);
    const us02yImpulse = us02yChg5m;
    const oilImpulse = (oilChg5m * 0.65) + (oilChgDay * 0.35);
    const usdjpyImpulse = usdjpyChg5m;

    const macroDrag =
      (dxyImpulse * 20) +
      (us10yImpulse * 12) +
      (us02yImpulse * 8) +
      (usdjpyImpulse * 6) -
      (oilImpulse * 8);

    const macroVal = Math.max(10, Math.min(90, Math.round(50 - macroDrag)));

    // 2. Trader Psychology & Crowd Contrarian Traps
    const psychAnalysis = analyzeTraderPsychology({ prices, newsFeed, calendarData, cotData });
    const psychologyVal = psychAnalysis.psychologyScore;

    // 3. Technical Velocity & SMC Auction Structure
    const silverBetaSpread = silverChg5m - goldChg5m;
    const shortDelta = (goldChg5m * 32) + (goldChg15m * 18);
    const dayDelta = (goldChgDay * 12) + (goldChg1h * 8);

    // Non-linear auction location impact (steep acceleration at range extremes)
    let locDelta = 0;
    if (priceLocation <= 0.15) {
      locDelta = -18 - (0.15 - priceLocation) * 40;
    } else if (priceLocation <= 0.35) {
      locDelta = -10 - (0.35 - priceLocation) * 40;
    } else if (priceLocation >= 0.85) {
      locDelta = 18 + (priceLocation - 0.85) * 40;
    } else if (priceLocation >= 0.65) {
      locDelta = 10 + (priceLocation - 0.65) * 40;
    } else {
      locDelta = (priceLocation - 0.5) * 20;
    }

    // Floor Pivot Confluence
    let pivotDelta = 0;
    if (spotPrice > 0 && pivotP > 0) {
      if (spotPrice <= s1) {
        pivotDelta = -10;
      } else if (spotPrice < pivotP) {
        pivotDelta = -6;
      } else if (spotPrice >= r1) {
        pivotDelta = 10;
      } else if (spotPrice > pivotP) {
        pivotDelta = 6;
      }
    }

    // Session initiative
    const sessionInitiative = goldOpen > 0 ? (spotPrice < goldOpen ? -8 : 6) : 0;

    // Multi-timeframe trend alignment
    let alignmentDelta = 0;
    if (goldChg5m < 0 && goldChg15m < 0 && (goldChgDay < 0 || spotPrice < goldOpen)) {
      alignmentDelta = -8;
    } else if (goldChg5m > 0 && goldChg15m > 0 && (goldChgDay > 0 || spotPrice >= goldOpen)) {
      alignmentDelta = 8;
    }

    const techDelta =
      shortDelta +
      dayDelta +
      locDelta +
      pivotDelta +
      sessionInitiative +
      alignmentDelta +
      (silverBetaSpread * 5);

    const techVal = Math.max(10, Math.min(90, Math.round(50 + techDelta)));

    // 4. Real-Time Intraday Momentum, True Session VWAP, CVD & SMT Vector (18% weight)
    // Sub-second quantitative order flow: distance to true session VWAP, Cumulative Volume Delta, SMT divergence, and Silver beta
    const sessionVWAP = parseFloat(gold.sessionVWAP || gold.vwap || 0);
    const vwapBenchmark = sessionVWAP > 0 ? sessionVWAP : ((goldHigh + goldLow + spotPrice + goldOpen) / 4);
    const vwapDist = vwapBenchmark > 0 ? ((spotPrice - vwapBenchmark) / vwapBenchmark) * 100 : 0;
    const vwapPoints = Math.max(-25, Math.min(25, vwapDist * 55));

    const rawCvd = parseFloat(gold.cvd || 0);
    const cvdDelta = Math.max(-12, Math.min(12, (rawCvd / 100) * 10));

    const smt = gold.smtDivergence || {};
    let smtPoints = 0;
    if (smt.status === 'BULLISH_SMT') smtPoints = 12;
    else if (smt.status === 'BEARISH_SMT') smtPoints = -12;

    const goldChg1m = parseFloat(gold.intervals?.['1']?.chp ?? goldChg5m);

    const momentumFlowVelocity =
      (goldChg1m * 22) +
      (goldChg5m * 22) +
      (goldChg15m * 12) +
      vwapPoints +
      cvdDelta +
      smtPoints +
      (silverBetaSpread * 5);

    const momentumFlowVal = Math.max(10, Math.min(90, Math.round(50 + momentumFlowVelocity)));

    // Catalyst Event Direction & Warning
    let imminentEventWarning = null;
    const upcoming = calendarData?.events || calendarData?.upcomingEvents || [];
    const nextHigh = upcoming.find((e) => e.impact === 'HIGH');

    if (nextHigh) {
      const nowMs = Date.now();
      const eventTime = new Date(nextHigh.date || nextHigh.timeUTC).getTime();
      const diffMins = Math.round((eventTime - nowMs) / 60000);
      if (diffMins >= 0 && diffMins <= 30) {
        imminentEventWarning = `${nextHigh.title} in ${diffMins}m`;
      }
    }

    // 5. CFTC COT Institutional Contextualized Flow
    // When market is in a sell trend / breakdown into discount or below open,
    // heavy Speculator Longs (87%) indicate VULNERABLE LONG LIQUIDATION RISK,
    // and Commercial Hedgers (81% short) are selling.
    const rawCotBias = cotData?.managedMoney?.biasPct ?? 70;
    const retailLongPct = cotData?.retailSentiment?.longPct ?? 60;

    let cotVal;
    if (priceLocation <= 0.35 || (goldOpen > 0 && spotPrice < goldOpen)) {
      const liquidationOverhang = Math.round((rawCotBias - 50) * 0.5);
      const retailTrapDrag = retailLongPct > 55 ? Math.round((retailLongPct - 50) * 0.4) : 0;
      cotVal = Math.max(15, Math.min(85, Math.round(50 - liquidationOverhang - retailTrapDrag)));
    } else if (priceLocation >= 0.65 && spotPrice >= goldOpen) {
      cotVal = Math.max(15, Math.min(85, Math.round(rawCotBias * 0.75 + (100 - retailLongPct) * 0.25)));
    } else {
      cotVal = Math.max(25, Math.min(75, Math.round(rawCotBias * 0.5 + (100 - retailLongPct) * 0.5)));
    }

    // 6. Dynamic Trend-Adaptive Composite Calculation
    // When technical order flow indicates a high-momentum trend,
    // live technical order flow & trader psychology take dominant authority over lagging pillars.
    const isTrendDriven = techVal <= 32 || techVal >= 68;
    const wTech = isTrendDriven ? 0.35 : 0.22;
    const wPsych = isTrendDriven ? 0.30 : 0.22;
    const wFlow = isTrendDriven ? 0.20 : 0.18;
    const wMacro = isTrendDriven ? 0.10 : 0.24;
    const wCot = isTrendDriven ? 0.05 : 0.14;

    const composite = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (techVal * wTech) +
          (psychologyVal * wPsych) +
          (momentumFlowVal * wFlow) +
          (macroVal * wMacro) +
          (cotVal * wCot)
        )
      )
    );

    let verdict = 'NEUTRAL CONVICTION';
    let verdictClass = 'neutral';

    if (composite >= 72) {
      verdict = 'STRONG BUY';
      verdictClass = 'bull';
    } else if (composite >= 58) {
      verdict = 'MODERATE BUY';
      verdictClass = 'bull';
    } else if (composite <= 28) {
      verdict = 'STRONG SELL';
      verdictClass = 'bear';
    } else if (composite <= 42) {
      verdict = 'MODERATE SELL';
      verdictClass = 'bear';
    }

    return {
      composite,
      verdict,
      verdictClass,
      macroVal,
      psychologyVal,
      techVal,
      momentumFlowVal,
      sentimentVal: momentumFlowVal,
      cotVal,
      isTrendDriven,
      wTech,
      wPsych,
      wFlow,
      wMacro,
      wCot,
      imminentEventWarning,
      psychAnalysis,
      smt,
      sessionVWAP,
      cvd: rawCvd,
    };
  }, [prices, newsFeed, calendarData, cotData]);

  // Voice Alert on Confluence Shift to Extreme Territory
  const lastAlertTimeRef = useRef(0);
  const lastAnnouncedDirectionRef = useRef(null);

  useEffect(() => {
    const score = calculation.composite;
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    let newDirection = null;
    if (score >= 72) newDirection = 'STRONG_BUY';
    else if (score <= 28) newDirection = 'STRONG_SELL';

    if (newDirection && newDirection !== lastAnnouncedDirectionRef.current) {
      if (now - lastAlertTimeRef.current >= tenMinutes) {
        lastAlertTimeRef.current = now;
        lastAnnouncedDirectionRef.current = newDirection;

        const isBull = newDirection === 'STRONG_BUY';
        speakSquawk(
          `Institutional Confluence confirmed Strong ${isBull ? 'Bullish' : 'Bearish'} Bias on Gold. ${calculation.psychAnalysis?.regime || ''}.`,
          {
            category: 'confluence',
            preChime: isBull ? 'confluence' : 'bearish',
            dedupeKey: `confluence_bias_${newDirection}`,
            cooldownSeconds: 600,
          }
        );
      }
    } else if (score >= 38 && score <= 62) {
      lastAnnouncedDirectionRef.current = null;
    }
  }, [calculation.composite, calculation.psychAnalysis?.regime]);

  // Voice Alert on SMT Divergence Shift
  const lastSmtRef = useRef('NEUTRAL');
  useEffect(() => {
    const smtStatus = calculation.smt?.status;
    if (smtStatus && smtStatus !== 'NEUTRAL' && smtStatus !== lastSmtRef.current) {
      lastSmtRef.current = smtStatus;
      const isBull = smtStatus === 'BULLISH_SMT';
      speakSquawk(
        `Smart Money Divergence Alert. ${isBull ? 'Bullish SMT accumulation' : 'Bearish SMT distribution'} confirmed between Gold and Silver order flow.`,
        {
          category: 'confluence',
          preChime: isBull ? 'confluence' : 'bearish',
          dedupeKey: `smt_alert_${smtStatus}`,
          cooldownSeconds: 300,
        }
      );
    } else if (smtStatus === 'NEUTRAL') {
      lastSmtRef.current = 'NEUTRAL';
    }
  }, [calculation.smt?.status]);

  // Slim 6px ring arc dimensions
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calculation.composite / 100) * circumference;

  const strokeColor =
    calculation.verdictClass === 'bull'
      ? 'var(--bull-primary)'
      : calculation.verdictClass === 'bear'
      ? 'var(--bear-primary)'
      : 'var(--gold-primary)';

  const isTrend = calculation.isTrendDriven;
  const factors = [
    { label: `SMC Liquidity Flow (${isTrend ? '35%' : '22%'})`, value: calculation.techVal },
    { label: `Trader Psychology & Traps (${isTrend ? '30%' : '22%'})`, value: calculation.psychologyVal },
    { label: `Real-Time VWAP, CVD & SMT Flow (${isTrend ? '20%' : '18%'})`, value: calculation.momentumFlowVal },
    { label: `Macro & Yields (${isTrend ? '10%' : '24%'})`, value: calculation.macroVal },
    { label: `CFTC Institutional COT (${isTrend ? '5%' : '14%'})`, value: calculation.cotVal },
  ];

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Compass size={13} style={{ color: strokeColor }} />
          INSTITUTIONAL CONFLUENCE &amp; MARKET BIAS
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '3px',
              background: 'rgba(245, 158, 11, 0.1)',
              color: 'var(--gold-primary)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Institutional Confluence is anchored to the primary OANDA:XAUUSD spot chart"
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gold-primary)', display: 'inline-block' }} />
            OANDA:XAUUSD ANCHOR
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: strokeColor,
            }}
          >
            {calculation.composite}/100
          </span>
        </div>
      </div>

      <div className="confluence-gauge-container">
        {/* Slim Ring Arc (stroke-width: 6px) */}
        <div className="gauge-circle-wrap">
          <svg className="gauge-svg" viewBox="0 0 110 110">
            <circle
              className="gauge-bg-circle"
              cx="55"
              cy="55"
              r={radius}
            />
            <circle
              className="gauge-fill-circle"
              cx="55"
              cy="55"
              r={radius}
              stroke={strokeColor}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="gauge-center-text">
            <span className="gauge-score" style={{ color: strokeColor }}>
              {calculation.composite}
            </span>
            <span className="gauge-sub">BIAS</span>
          </div>
        </div>

        {/* Directional Badge */}
        <div className={`confluence-verdict-badge ${calculation.verdictClass}`}>
          {calculation.verdictClass === 'bull' ? (
            <TrendingUp size={13} />
          ) : calculation.verdictClass === 'bear' ? (
            <TrendingDown size={13} />
          ) : (
            <Minus size={13} />
          )}
          <span>{calculation.verdict}</span>
        </div>

        {calculation.imminentEventWarning && (
          <div
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bear-bg)',
              border: '1px solid var(--border-bear)',
              color: 'var(--bear-primary)',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldAlert size={12} />
            <span>RISK: {calculation.imminentEventWarning}</span>
          </div>
        )}
      </div>

      {/* Professional Trader Psychology Intelligence Box */}
      <div
        style={{
          marginTop: '10px',
          marginBottom: '10px',
          padding: '10px',
          background: 'rgba(15, 23, 42, 0.65)',
          border: `1px solid ${calculation.psychAnalysis?.regimeType === 'BULL' ? 'rgba(16, 185, 129, 0.25)' : calculation.psychAnalysis?.regimeType === 'BEAR' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BrainCircuit size={12} style={{ color: strokeColor }} />
            <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-main)' }}>
              PRO TRADER PSYCHOLOGY
            </span>
          </div>
          <span
            style={{
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: '3px',
              background: calculation.psychAnalysis?.regimeType === 'BULL' ? 'var(--bull-bg)' : calculation.psychAnalysis?.regimeType === 'BEAR' ? 'var(--bear-bg)' : 'rgba(245, 158, 11, 0.1)',
              color: strokeColor,
              border: `1px solid ${calculation.psychAnalysis?.regimeType === 'BULL' ? 'var(--border-bull)' : calculation.psychAnalysis?.regimeType === 'BEAR' ? 'var(--border-bear)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}
          >
            {calculation.psychAnalysis?.regime}
          </span>
        </div>

        {/* Desk Note Narrative */}
        <div
          style={{
            fontSize: '11px',
            lineHeight: 1.45,
            color: 'var(--text-muted)',
            fontStyle: 'normal',
          }}
        >
          {calculation.psychAnalysis?.deskNote}
        </div>

        {/* Tactical Badges Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', marginTop: '2px' }}>
          {calculation.psychAnalysis?.badges?.map((b) => (
            <div
              key={b.label}
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                padding: '5px 7px',
                borderRadius: '3px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1px',
              }}
            >
              <span style={{ fontSize: '8.5px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
                {b.label}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: b.color }}>
                {b.value}
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', lineHeight: 1.25 }}>
                {b.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Uniform Factor Progress Bars */}
      <div className="confluence-breakdown-list">
        {factors.map((f) => {
          const isBull = f.value >= 55;
          const isBear = f.value <= 45;
          const fillColor = isBull ? 'var(--bull-primary)' : isBear ? 'var(--bear-primary)' : 'var(--gold-primary)';
          return (
            <div key={f.label} className="breakdown-row">
              <div className="breakdown-row-header">
                <span className="breakdown-row-label">{f.label}</span>
                <span className="breakdown-val" style={{ color: fillColor }}>{f.value}%</span>
              </div>
              <div className="breakdown-bar-bg">
                <div
                  className="breakdown-bar-fill"
                  style={{
                    width: `${f.value}%`,
                    background: fillColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ConfluenceMeter);
