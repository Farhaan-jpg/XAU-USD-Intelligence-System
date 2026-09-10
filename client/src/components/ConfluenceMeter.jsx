// client/src/components/ConfluenceMeter.jsx
// Institutional Confluence & Composite Market Bias Engine
// Integrates Intermarket Macro, Professional Trader Psychology & Contrarian Traps, SMC Liquidity, and News Vectors

import { useMemo, useEffect, useRef } from 'react';
import { ShieldAlert, TrendingUp, TrendingDown, Gauge, Minus, BrainCircuit, Users, Target, Compass } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';
import { calculateFearGreed, analyzeTraderPsychology } from '../utils/sentimentEngine';

export default function ConfluenceMeter({ prices = {}, newsFeed = [], calendarData = {}, cotData = {} }) {
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

    const goldChg5m = parseFloat(gold.change5m || 0);
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

    // 1. Macro Dollar, Yields & Energy Intermarket Vector (24% weight)
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

    // 2. Trader Psychology & Crowd Contrarian Traps (22% weight)
    const psychAnalysis = analyzeTraderPsychology({ prices, newsFeed, calendarData, cotData });
    const psychologyVal = psychAnalysis.psychologyScore;

    // 3. Technical Velocity & SMC Auction Structure (22% weight)
    const dayRange = Math.max(1, goldHigh - goldLow);
    const priceLocation = spotPrice > 0 ? (spotPrice - goldLow) / dayRange : 0.5;
    const sessionInitiative = goldOpen > 0 && spotPrice >= goldOpen ? 1 : -1;
    const silverBetaSpread = silverChg5m - goldChg5m;

    const techDelta =
      (goldChg5m * 28) +
      (goldChgDay * 8) +
      (silverBetaSpread * 6) +
      ((priceLocation - 0.5) * 16) +
      (sessionInitiative * 4);

    const techVal = Math.max(10, Math.min(90, Math.round(50 + techDelta)));

    // 4. AI News Sentiment with Recency Decay & Catalyst Risk (18% weight)
    const recent = newsFeed.slice(0, 25);
    let bullWeight = 0;
    let bearWeight = 0;
    let neutralWeight = 0;
    const nowMs = Date.now();

    recent.forEach((item) => {
      const baseW = item.impact === 'HIGH' ? 3.5 : item.impact === 'MED' ? 2.0 : 1.0;
      const pubMs = new Date(item.publishedAt || item.processedAt || nowMs).getTime();
      const ageMins = Math.max(0, (nowMs - pubMs) / 60000);
      const recencyFactor = ageMins <= 30 ? 1.5 : ageMins <= 120 ? 1.2 : ageMins <= 360 ? 1.0 : 0.7;
      const w = baseW * recencyFactor;

      if (item.bias === 'BULLISH') bullWeight += w;
      else if (item.bias === 'BEARISH') bearWeight += w;
      else neutralWeight += w * 0.5;
    });

    const totalWeight = bullWeight + bearWeight + neutralWeight;
    const sentimentVal =
      totalWeight > 0
        ? Math.max(10, Math.min(90, Math.round(((bullWeight + neutralWeight * 0.5) / totalWeight) * 100)))
        : 50;

    // Catalyst Event Direction & Warning
    let imminentEventWarning = null;
    const upcoming = calendarData?.events || calendarData?.upcomingEvents || [];
    const nextHigh = upcoming.find((e) => e.impact === 'HIGH');

    if (nextHigh) {
      const eventTime = new Date(nextHigh.date || nextHigh.timeUTC).getTime();
      const diffMins = Math.round((eventTime - nowMs) / 60000);
      if (diffMins >= 0 && diffMins <= 30) {
        imminentEventWarning = `${nextHigh.title} in ${diffMins}m`;
      }
    }

    // 5. CFTC COT Institutional Speculators (14% weight)
    const cotVal = Math.max(15, Math.min(85, Math.round(cotData?.managedMoney?.biasPct ?? 70)));

    // Composite Calculation (Weighted 5 Institutional Pillars)
    const composite = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (macroVal * 0.24) +
          (psychologyVal * 0.22) +
          (techVal * 0.22) +
          (sentimentVal * 0.18) +
          (cotVal * 0.14)
        )
      )
    );

    let verdict = 'NEUTRAL CONVICTION';
    let verdictClass = 'neutral';

    if (composite >= 74) {
      verdict = 'STRONG BUY';
      verdictClass = 'bull';
    } else if (composite >= 58) {
      verdict = 'MODERATE BUY';
      verdictClass = 'bull';
    } else if (composite <= 26) {
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
      sentimentVal,
      cotVal,
      imminentEventWarning,
      psychAnalysis,
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
    if (score >= 76) newDirection = 'STRONG_BUY';
    else if (score <= 24) newDirection = 'STRONG_SELL';

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
    } else if (score >= 35 && score <= 65) {
      lastAnnouncedDirectionRef.current = null;
    }
  }, [calculation.composite, calculation.psychAnalysis?.regime]);

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

  const factors = [
    { label: 'Macro & Yields (24%)', value: calculation.macroVal },
    { label: 'Trader Psychology & Traps (22%)', value: calculation.psychologyVal },
    { label: 'SMC Liquidity Flow (22%)', value: calculation.techVal },
    { label: 'AI News Vector (18%)', value: calculation.sentimentVal },
    { label: 'CFTC Institutional COT (14%)', value: calculation.cotVal },
  ];

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Compass size={13} style={{ color: strokeColor }} />
          INSTITUTIONAL CONFLUENCE &amp; MARKET BIAS
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
