// client/src/components/ConfluenceMeter.jsx
// 0-100 Institutional Confluence & Composite Bias Meter for XAU/USD

import { useMemo } from 'react';
import { ShieldAlert, TrendingUp, TrendingDown, Gauge, Zap } from 'lucide-react';

export default function ConfluenceMeter({ prices = {}, newsFeed = [], calendarData = {}, cotData = {} }) {
  const calculation = useMemo(() => {
    const gold = prices['GC=F'] || prices['XAUUSD'] || {};
    const dxy = prices['DX-Y.NYB'] || {};
    const us10y = prices['^TNX'] || {};
    const silver = prices['SI=F'] || prices['XAGUSD'] || {};
    const usdjpy = prices['JPY=X'] || {};

    const goldChg = parseFloat(gold.change5m || 0);
    const dxyChg = parseFloat(dxy.change5m || 0);
    const us10yChg = parseFloat(us10y.change5m || 0);
    const silverChg = parseFloat(silver.change5m || 0);
    const usdjpyChg = parseFloat(usdjpy.change5m || 0);

    // 1. Macro Dollar & Yields Confluence (0-100 normalized)
    // Gold is inversely correlated to DXY and US10Y
    let macroVal = 50;
    if (dxyChg < -0.02) macroVal += 20;
    else if (dxyChg > 0.02) macroVal -= 20;

    if (us10yChg < -0.02) macroVal += 20;
    else if (us10yChg > 0.02) macroVal -= 20;

    if (usdjpyChg < -0.02) macroVal += 10; // Yen safe-haven boost
    else if (usdjpyChg > 0.02) macroVal -= 10;
    macroVal = Math.max(0, Math.min(100, macroVal));

    // 2. AI News Sentiment (0-100)
    const recent = newsFeed.slice(0, 20);
    let bullWeight = 0;
    let bearWeight = 0;
    recent.forEach((item) => {
      const w = item.impact === 'HIGH' ? 3 : item.impact === 'MED' ? 2 : 1;
      if (item.bias === 'BULLISH') bullWeight += w;
      else if (item.bias === 'BEARISH') bearWeight += w;
    });
    const totalW = bullWeight + bearWeight;
    const sentimentVal = totalW > 0 ? Math.round((bullWeight / totalW) * 100) : 50;

    // 3. Technical Velocity & Silver Confirmation (0-100)
    let techVal = 50;
    if (goldChg > 0.05) techVal += 25;
    else if (goldChg > 0.01) techVal += 15;
    else if (goldChg < -0.05) techVal -= 25;
    else if (goldChg < -0.01) techVal -= 15;

    if (silverChg > 0.05) techVal += 25;
    else if (silverChg < -0.05) techVal -= 25;
    techVal = Math.max(0, Math.min(100, techVal));

    // 4. Economic Calendar Risk Impact (0-100)
    // If high-impact event is imminent (< 30 min), risk volatility rises
    let eventRiskVal = 50;
    const upcoming = calendarData?.events || calendarData?.upcomingEvents || [];
    const nextHigh = upcoming.find((e) => e.impact === 'HIGH' && new Date(e.date || e.timeUTC) > new Date());
    if (nextHigh) {
      const diffMins = Math.round((new Date(nextHigh.date || nextHigh.timeUTC).getTime() - Date.now()) / 60000);
      if (diffMins >= 0 && diffMins <= 30) {
        eventRiskVal = 80;
      } else if (diffMins > 30 && diffMins <= 120) {
        eventRiskVal = 65;
      }
    }

    // 5. COT Institutional Positioning & Retail Contrarian Flow (0-100)
    let cotVal = 50;
    const mmBias = cotData?.managedMoney?.biasPct || 87.1;
    const retailLong = cotData?.retailSentiment?.longPct || 62;
    if (mmBias >= 80) cotVal += 15; // Strong institutional speculative support
    else if (mmBias <= 50) cotVal -= 15;

    // Contrarian retail: if crowd is heavily short (<45%), bullish squeeze; if crowd is heavily long (>65%), bearish trap
    if (retailLong <= 45) cotVal += 15;
    else if (retailLong >= 65) cotVal -= 15;
    cotVal = Math.max(0, Math.min(100, cotVal));

    // Weighted Composite Score (100% total)
    const composite = Math.round(
      macroVal * 0.25 +
      sentimentVal * 0.25 +
      techVal * 0.20 +
      cotVal * 0.15 +
      eventRiskVal * 0.15
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
    };
  }, [prices, newsFeed, calendarData, cotData]);

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
