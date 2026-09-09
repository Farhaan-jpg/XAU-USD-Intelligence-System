// client/src/components/ConfluenceMeter.jsx
// Institutional Confluence & Composite Bias Meter with Slim Modern Arc & Uniform Factor Progress

import { useMemo, useEffect, useRef } from 'react';
import { ShieldAlert, TrendingUp, TrendingDown, Gauge, Minus } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

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

    // 1. Macro Dollar, Yields & Energy Intermarket Vector (0-100)
    const dxyImpulse = (dxyChg5m * 0.65) + (dxyChgDay * 0.35);
    const us10yImpulse = (us10yChg5m * 0.65) + (us10yChgDay * 0.35);
    const us02yImpulse = us02yChg5m;
    const oilImpulse = (oilChg5m * 0.65) + (oilChgDay * 0.35);
    const usdjpyImpulse = usdjpyChg5m;

    const macroDrag =
      (dxyImpulse * 22) +
      (us10yImpulse * 14) +
      (us02yImpulse * 8) +
      (usdjpyImpulse * 6) -
      (oilImpulse * 8);

    const macroVal = Math.max(0, Math.min(100, Math.round(50 - macroDrag)));

    // 2. AI News Sentiment with Recency Decay (0-100)
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
        ? Math.max(0, Math.min(100, Math.round(((bullWeight + neutralWeight * 0.5) / totalWeight) * 100)))
        : 50;

    // 3. Technical Velocity & SMC Auction Structure (0-100)
    const dayRange = Math.max(1, goldHigh - goldLow);
    const priceLocation = spotPrice > 0 ? (spotPrice - goldLow) / dayRange : 0.5;
    const sessionInitiative = goldOpen > 0 && spotPrice >= goldOpen ? 1 : -1;
    const silverBetaSpread = silverChg5m - goldChg5m;

    const techDelta =
      (goldChg5m * 35) +
      (goldChgDay * 12) +
      (silverBetaSpread * 20) +
      ((priceLocation - 0.5) * 20) +
      (sessionInitiative * 5);

    const techVal = Math.max(0, Math.min(100, Math.round(50 + techDelta)));

    // 4. Macro Catalyst & Calendar Event Direction (0-100)
    let eventRiskVal = 50;
    let imminentEventWarning = null;
    const upcoming = calendarData?.events || calendarData?.upcomingEvents || [];
    const nextHigh = upcoming.find((e) => e.impact === 'HIGH');

    if (nextHigh) {
      const eventTime = new Date(nextHigh.date || nextHigh.timeUTC).getTime();
      const diffMins = Math.round((eventTime - nowMs) / 60000);

      if (diffMins < 0 && diffMins >= -90 && nextHigh.actual && nextHigh.forecast) {
        const act = parseFloat(nextHigh.actual);
        const fcast = parseFloat(nextHigh.forecast);
        if (!isNaN(act) && !isNaN(fcast)) {
          const type = (nextHigh.type || nextHigh.title || '').toUpperCase();
          const isDirectToGold =
            type.includes('UNEMPLOYMENT') ||
            type.includes('CLAIM') ||
            nextHigh.currency === 'CNY';

          if (isDirectToGold) {
            eventRiskVal = act > fcast ? 75 : act < fcast ? 25 : 50;
          } else {
            eventRiskVal = act > fcast ? 25 : act < fcast ? 75 : 50;
          }
        }
      } else if (diffMins >= 0 && diffMins <= 30) {
        eventRiskVal = 50;
        imminentEventWarning = `${nextHigh.title} in ${diffMins}m`;
      }
    }

    // 5. COT Positioning (0-100)
    const cotVal = Math.max(0, Math.min(100, Math.round(cotData?.managedMoney?.biasPct || 78)));

    // Composite Calculation (Weighted)
    const composite = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (macroVal * 0.28) +
          (sentimentVal * 0.22) +
          (techVal * 0.24) +
          (eventRiskVal * 0.14) +
          (cotVal * 0.12)
        )
      )
    );

    let verdict = 'NEUTRAL CONVICTION';
    let verdictClass = 'neutral';

    if (composite >= 75) {
      verdict = 'STRONG BUY';
      verdictClass = 'bull';
    } else if (composite >= 58) {
      verdict = 'MODERATE BUY';
      verdictClass = 'bull';
    } else if (composite <= 25) {
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
      sentimentVal,
      techVal,
      eventRiskVal,
      cotVal,
      imminentEventWarning,
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
    if (score >= 78) newDirection = 'STRONG_BUY';
    else if (score <= 22) newDirection = 'STRONG_SELL';

    if (newDirection && newDirection !== lastAnnouncedDirectionRef.current) {
      if (now - lastAlertTimeRef.current >= tenMinutes) {
        lastAlertTimeRef.current = now;
        lastAnnouncedDirectionRef.current = newDirection;

        const isBull = newDirection === 'STRONG_BUY';
        speakSquawk(
          `Institutional Confluence confirmed Strong ${isBull ? 'Bullish' : 'Bearish'} Bias on Gold. ${isBull ? 'Buyers dominating order flow.' : 'Sellers dominating order flow.'}`,
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
  }, [calculation.composite]);

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
    { label: 'Macro & Yields', value: calculation.macroVal },
    { label: 'News Sentiment', value: calculation.sentimentVal },
    { label: 'Technical Flow', value: calculation.techVal },
    { label: 'COT Positioning', value: calculation.cotVal },
    { label: 'Event Volatility', value: calculation.eventRiskVal },
  ];

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Gauge size={13} />
          CONFLUENCE BIAS METER
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

      {/* Uniform Factor Progress Bars */}
      <div className="confluence-breakdown-list">
        {factors.map((f) => {
          const isBull = f.value >= 55;
          const isBear = f.value <= 45;
          const fillColor = isBull ? 'var(--bull-primary)' : isBear ? 'var(--bear-primary)' : 'var(--gold-primary)';
          return (
            <div key={f.label} className="breakdown-row">
              <span className="breakdown-row-label">{f.label}</span>
              <div className="breakdown-bar-bg">
                <div
                  className="breakdown-bar-fill"
                  style={{
                    width: `${f.value}%`,
                    background: fillColor,
                  }}
                />
              </div>
              <span className="breakdown-val">{f.value}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
