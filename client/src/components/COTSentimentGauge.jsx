// client/src/components/COTSentimentGauge.jsx
// Institutional CFTC Commitment of Traders (COT) Speculator vs Hedger Positioning

import { useMemo } from 'react';
import { Layers, TrendingUp, Users, Award, Shield } from 'lucide-react';

export default function COTSentimentGauge() {
  // Institutional Speculators (Hedge Funds / Asset Managers) vs Commercial Hedgers (Producers / Bullion Banks)
  const cotData = useMemo(() => {
    return {
      reportDate: 'Latest Weekly Release (CFTC)',
      nonCommercialLong: 278450,
      nonCommercialShort: 41200,
      netSpeculatorLong: 237250,
      speculatorBiasPct: 87.1, // 87% Long
      commercialNetShort: -248100,
      retailSentiment: {
        longPct: 62,
        shortPct: 38,
      },
    };
  }, []);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Award size={15} />
          CFTC COMMITMENT OF TRADERS (COT) & INSTITUTIONAL POSITIONING
        </span>
        <span className="telemetry-badge" style={{ fontSize: '10px' }}>
          {cotData.reportDate}
        </span>
      </div>

      <div className="cot-grid">
        {/* Speculator Net Positioning */}
        <div className="cot-box">
          <span className="cot-label">MANAGED MONEY / HEDGE FUNDS</span>
          <div className="cot-value" style={{ color: 'var(--bull-glow)' }}>
            +{cotData.netSpeculatorLong.toLocaleString()} contracts
          </div>
          <div className="cot-bar-container">
            <div
              className="cot-bar-fill"
              style={{ width: `${cotData.speculatorBiasPct}%`, background: 'var(--bull-glow)' }}
            />
          </div>
          <div className="cot-sub">
            <span>{cotData.speculatorBiasPct}% Bullish Net Longs</span>
            <span>Historical 85th Percentile</span>
          </div>
        </div>

        {/* Commercial Hedgers (Bullion Banks) */}
        <div className="cot-box">
          <span className="cot-label">COMMERCIAL HEDGERS (BULLION BANKS)</span>
          <div className="cot-value" style={{ color: 'var(--bear-glow)' }}>
            {cotData.commercialNetShort.toLocaleString()} contracts
          </div>
          <div className="cot-bar-container">
            <div
              className="cot-bar-fill"
              style={{ width: '84%', background: 'var(--bear-glow)' }}
            />
          </div>
          <div className="cot-sub">
            <span>Aggressive Hedging</span>
            <span>Providing Sell Liquidity</span>
          </div>
        </div>

        {/* Retail Sentiment Breakdown */}
        <div className="cot-box">
          <span className="cot-label">RETAIL BROKER CROWD SENTIMENT</span>
          <div className="cot-value" style={{ color: 'var(--gold-glow)' }}>
            {cotData.retailSentiment.longPct}% Long / {cotData.retailSentiment.shortPct}% Short
          </div>
          <div className="cot-bar-container" style={{ display: 'flex' }}>
            <div
              style={{
                width: `${cotData.retailSentiment.longPct}%`,
                background: 'var(--bull-glow)',
                height: '100%',
                borderRadius: '4px 0 0 4px',
              }}
            />
            <div
              style={{
                width: `${cotData.retailSentiment.shortPct}%`,
                background: 'var(--bear-glow)',
                height: '100%',
                borderRadius: '0 4px 4px 0',
              }}
            />
          </div>
          <div className="cot-sub">
            <span>Crowd is Net Long</span>
            <span>Contrarian Watch: Elevated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
