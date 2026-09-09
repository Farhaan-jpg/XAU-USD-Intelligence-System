// client/src/components/ConfluenceMeter.jsx
// 0-100 Institutional Confluence & Composite Bias Meter for XAU/USD

import { useMemo, useEffect, useRef } from 'react';
import { ShieldAlert, TrendingUp, TrendingDown, Gauge, Zap } from 'lucide-react';
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
    const us02yChgDay = parseFloat(us02y.changeDay || 0);
    const silverChg5m = parseFloat(silver.change5m || 0);
    const usdjpyChg5m = parseFloat(usdjpy.change5m || 0);
    const oilChg5m = parseFloat(oil.change5m || 0);
    const oilChgDay = parseFloat(oil.changeDay || 0);

    // ─── 1. Macro Dollar, Yields & Energy Intermarket Vector (0-100) ───────
    // Combines 5m short-term impulse (65%) with daily trend momentum (35%)
    const dxyImpulse = (dxyChg5m * 0.65) + (dxyChgDay * 0.35);
    const us10yImpulse = (us10yChg5m * 0.65) + (us10yChgDay * 0.35);
    const us02yImpulse = (us02yChg5m * 0.65) + (us02yChgDay * 0.35);
    const oilImpulse = (oilChg5m * 0.65) + (oilChgDay * 0.35);
    const usdjpyImpulse = usdjpyChg5m; // USD/JPY weakness = safe-haven yen flow

    // Drag against Gold (DXY and Treasury yields rising hurts Gold)
    // Boost for Gold (Crude oil rising adds inflation hedge, Yen strengthening adds safe haven)
    const macroDrag =
      (dxyImpulse * 22) +
      (us10yImpulse * 14) +
      (us02yImpulse * 8) +
      (usdjpyImpulse * 6) -
      (oilImpulse * 8);

    const macroVal = Math.max(0, Math.min(100, Math.round(50 - macroDrag)));

    // ─── 2. AI News Sentiment with Exponential Recency Decay (0-100) ───────
    const recent = newsFeed.slice(0, 25);
    let bullWeight = 0;
    let bearWeight = 0;
    let neutralWeight = 0;
    const nowMs = Date.now();

    recent.forEach((item) => {
      const baseW = item.impact === 'HIGH' ? 3.5 : item.impact === 'MED' ? 2.0 : 1.0;
      const pubMs = new Date(item.publishedAt || item.processedAt || nowMs).getTime();
      const ageMins = Math.max(0, (nowMs - pubMs) / 60000);

      // Recency weighting: <30m = 1.5x, <2h = 1.2x, <6h = 1.0x, >6h = 0.7x
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

    // ─── 3. Technical Velocity & SMC Auction Structure (0-100) ─────────────
    const dayRange = Math.max(1, goldHigh - goldLow);
    const priceLocation = spotPrice > 0 ? (spotPrice - goldLow) / dayRange : 0.5; // 0 = low of day, 1 = high of day
    const sessionInitiative = goldOpen > 0 && spotPrice >= goldOpen ? 1 : -1;

    // Silver Beta Confirmation (Silver leading higher confirms broad institutional participation)
    const silverBetaSpread = silverChg5m - goldChg5m;

    const techDelta =
      (goldChg5m * 35) +
      (goldChgDay * 12) +
      (silverBetaSpread * 20) +
      ((priceLocation - 0.5) * 20) +
      (sessionInitiative * 5);

    const techVal = Math.max(0, Math.min(100, Math.round(50 + techDelta)));

    // ─── 4. Macro Catalyst & Calendar Event Direction (0-100) ──────────────
    let eventRiskVal = 50;
    let imminentEventWarning = null;
    const upcoming = calendarData?.events || calendarData?.upcomingEvents || [];
    const nextHigh = upcoming.find((e) => e.impact === 'HIGH');

    if (nextHigh) {
      const eventTime = new Date(nextHigh.date || nextHigh.timeUTC).getTime();
      const diffMins = Math.round((eventTime - nowMs) / 60000);

      // If event recently occurred (past 90m) with reported data:
      if (diffMins < 0 && diffMins >= -90 && nextHigh.actual && nextHigh.forecast) {
        const act = parseFloat(nextHigh.actual);
        const fcast = parseFloat(nextHigh.forecast);
        if (!isNaN(act) && !isNaN(fcast)) {
          const type = (nextHigh.type || nextHigh.title || '').toUpperCase();
          // Direct polarity: Higher is Bullish for Gold (Unemployment, Claims, China demand)
          const isDirectToGold =
            type.includes('UNEMPLOYMENT') ||
            type.includes('CLAIM') ||
            nextHigh.currency === 'CNY';

          if (isDirectToGold) {
            eventRiskVal = act > fcast ? 75 : act < fcast ? 25 : 50;
          } else {
            // Inverse polarity: Hot US inflation or jobs -> USD rally -> Bearish Gold
            eventRiskVal = act > fcast ? 25 : act < fcast ? 75 : 50;
          }
        }
      } else if (diffMins >= 0 && diffMins <= 30) {
        // Imminent event locks conviction to prevent front-running volatility spikes
        eventRiskVal = 50;
        imminentEventWarning = `${nextHigh.title} in ${diffMins}m`;
      } else {
        // Ambient surprise drift from recent completed releases
        const completedToday = upcoming.filter((e) => e.actual && e.forecast && e.impact === 'HIGH');
        if (completedToday.length > 0) {
          let hawkishUSDCount = 0;
          let dovishUSDCount = 0;
          completedToday.forEach((ev) => {
            const a = parseFloat(ev.actual);
            const f = parseFloat(ev.forecast);
            if (!isNaN(a) && !isNaN(f)) {
              if (a > f) hawkishUSDCount++;
              else if (a < f) dovishUSDCount++;
            }
          });
          if (hawkishUSDCount > dovishUSDCount) eventRiskVal = 40;
          else if (dovishUSDCount > hawkishUSDCount) eventRiskVal = 60;
        }
      }
    }

    // ─── 5. COT Institutional Positioning & Real-Time Retail Flow (0-100) ──
    const mmBias = cotData?.managedMoney?.biasPct || 87.1;
    const retailLong = cotData?.retailSentiment?.longPct || 62;

    // Managed Money institutional trend contribution (50% = neutral)
    const instContribution = (mmBias - 50) * 0.35;

    // Retail contrarian contrarian flow: crowd heavily long = smart money sell liquidity
    const crowdContrarian = (50 - retailLong) * 0.65;

    const cotVal = Math.max(0, Math.min(100, Math.round(50 + instContribution + crowdContrarian)));

    // ─── Weighted Composite Score (100% total) ──────────────────────────────
    const composite = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          macroVal * 0.25 +
          sentimentVal * 0.25 +
          techVal * 0.20 +
          cotVal * 0.15 +
          eventRiskVal * 0.15
        )
      )
    );

    let verdict = 'NEUTRAL';
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
      sentimentVal,
      techVal,
      eventRiskVal,
      cotVal,
      imminentEventWarning,
    };
  }, [prices, newsFeed, calendarData, cotData]);

  // Voice Alert on Confluence Shift to Extreme Territory (Throttled & Hysteresis Protected)
  const lastAlertTimeRef = useRef(0);
  const lastAnnouncedDirectionRef = useRef(null);

  useEffect(() => {
    const score = calculation.composite;
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    // Strict Hysteresis: Only trigger on high-conviction structural extremes
    // (>= 78% for Strong Buy or <= 22% for Strong Sell), spaced at least 10 minutes apart
    let newDirection = null;
    if (score >= 78) newDirection = 'STRONG_BUY';
    else if (score <= 22) newDirection = 'STRONG_SELL';

    if (newDirection && newDirection !== lastAnnouncedDirectionRef.current) {
      if (now - lastAlertTimeRef.current >= tenMinutes) {
        lastAlertTimeRef.current = now;
        lastAnnouncedDirectionRef.current = newDirection;

        const isBull = newDirection === 'STRONG_BUY';
        speakSquawk(
          `Institutional Confluence confirmed Strong ${isBull ? 'Bullish' : 'Bearish'} Bias.`,
          {
            category: 'confluence',
            preChime: 'confluence',
            dedupeKey: 'confluence_bias_alert',
            cooldownSeconds: 600, // 10-minute cooldown
          }
        );
      }
    } else if (score >= 35 && score <= 65) {
      // Reset direction state only when returning well inside the neutral band
      lastAnnouncedDirectionRef.current = null;
    }
  }, [calculation.composite]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calculation.composite / 100) * circumference;

  const strokeColor =
    calculation.verdictClass === 'bull'
      ? 'var(--bull-glow)'
      : calculation.verdictClass === 'bear'
      ? 'var(--bear-glow)'
      : 'var(--gold-glow)';

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Gauge size={15} />
          CONFLUENCE BIAS METER
        </span>
        <span className="telemetry-badge" style={{ fontSize: '10px' }}>
          5-FACTOR ENGINE
        </span>
      </div>

      <div className="confluence-gauge-container">
        {/* Circular Gauge */}
        <div className="gauge-circle-wrap">
          <svg className="gauge-svg" viewBox="0 0 140 140">
            <circle
              className="gauge-bg-circle"
              cx="70"
              cy="70"
              r={radius}
            />
            <circle
              className="gauge-fill-circle"
              cx="70"
              cy="70"
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
            <span className="gauge-sub">INDEX</span>
          </div>
        </div>

        {/* Verdict Badge */}
        <div className={`confluence-verdict-badge ${calculation.verdictClass}`}>
          {calculation.verdictClass === 'bull' ? (
            <TrendingUp size={16} />
          ) : calculation.verdictClass === 'bear' ? (
            <TrendingDown size={16} />
          ) : (
            <Zap size={16} />
          )}
          <span>{calculation.verdict}</span>
        </div>

        {calculation.imminentEventWarning && (
          <div
            style={{
              margin: '8px 0 0 0',
              padding: '6px 10px',
              borderRadius: '4px',
              background: 'rgba(255, 68, 68, 0.15)',
              border: '1px solid var(--bear-glow)',
              color: 'var(--bear-glow)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldAlert size={14} />
            <span>RED-FOLDER RISK: {calculation.imminentEventWarning} — REDUCE POSITION SIZE</span>
          </div>
        )}
      </div>

      {/* Sub-factor Breakdown */}
      <div className="confluence-breakdown-list">
        <div className="breakdown-row">
          <span style={{ color: 'var(--text-muted)' }}>Macro & Yields</span>
          <div className="breakdown-bar-bg">
            <div
              className="breakdown-bar-fill"
              style={{
                width: `${calculation.macroVal}%`,
                background: calculation.macroVal >= 50 ? 'var(--bull-primary)' : 'var(--bear-primary)',
              }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{calculation.macroVal}%</span>
        </div>

        <div className="breakdown-row">
          <span style={{ color: 'var(--text-muted)' }}>AI News Sentiment</span>
          <div className="breakdown-bar-bg">
            <div
              className="breakdown-bar-fill"
              style={{
                width: `${calculation.sentimentVal}%`,
                background: calculation.sentimentVal >= 50 ? 'var(--cyan-primary)' : 'var(--bear-primary)',
              }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{calculation.sentimentVal}%</span>
        </div>

        <div className="breakdown-row">
          <span style={{ color: 'var(--text-muted)' }}>Technical Spot Velocity</span>
          <div className="breakdown-bar-bg">
            <div
              className="breakdown-bar-fill"
              style={{
                width: `${calculation.techVal}%`,
                background: calculation.techVal >= 50 ? 'var(--gold-primary)' : 'var(--bear-primary)',
              }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{calculation.techVal}%</span>
        </div>

        <div className="breakdown-row">
          <span style={{ color: 'var(--text-muted)' }}>COT & Retail Flow</span>
          <div className="breakdown-bar-bg">
            <div
              className="breakdown-bar-fill"
              style={{
                width: `${calculation.cotVal}%`,
                background: calculation.cotVal >= 50 ? 'var(--bull-primary)' : 'var(--bear-primary)',
              }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{calculation.cotVal}%</span>
        </div>

        <div className="breakdown-row">
          <span style={{ color: 'var(--text-muted)' }}>Event Risk / Volatility</span>
          <div className="breakdown-bar-bg">
            <div
              className="breakdown-bar-fill"
              style={{
                width: `${calculation.eventRiskVal}%`,
                background: 'var(--purple-primary)',
              }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{calculation.eventRiskVal}%</span>
        </div>
      </div>
    </div>
  );
}
