// client/src/components/COTSentimentGauge.jsx
// Institutional CFTC Commitment of Traders (COT) with Unified Stacked Delta Bar & Retail Positioning

import { useMemo } from 'react';
import { Award } from 'lucide-react';

export default function COTSentimentGauge({ cotData: externalCotData }) {
  const cotData = useMemo(() => {
    if (externalCotData) {
      const mm = externalCotData.managedMoney || {};
      const comm = externalCotData.commercialHedgers || {};
      const ret = externalCotData.retailSentiment || {};
      return {
        reportDate: externalCotData.reportDate || 'CFTC Weekly Release (COMEX Gold)',
        netSpeculatorLong: mm.netLong !== undefined ? mm.netLong : 237250,
        speculatorBiasPct: mm.biasPct !== undefined ? mm.biasPct : 87.1,
        percentile: mm.percentile !== undefined ? mm.percentile : 85,
        commercialNetShort: comm.netShort !== undefined ? comm.netShort : -248100,
        commercialHedgePct: comm.hedgePct !== undefined ? comm.hedgePct : 81.2,
        commercialStatus: comm.status || 'Aggressive Hedging',
        retailSentiment: {
          longPct: ret.longPct !== undefined ? ret.longPct : 62,
          shortPct: ret.shortPct !== undefined ? ret.shortPct : 38,
          bias: ret.bias || 'Crowd Net Long',
          contrarianLevel: ret.contrarianLevel || 'ELEVATED',
        },
      };
    }
    return {
      reportDate: 'CFTC Weekly Release (COMEX Gold)',
      netSpeculatorLong: 237250,
      speculatorBiasPct: 87.1,
      percentile: 85,
      commercialNetShort: -248100,
      commercialHedgePct: 81.2,
      commercialStatus: 'Aggressive Hedging',
      retailSentiment: {
        longPct: 62,
        shortPct: 38,
        bias: 'Crowd Net Long',
        contrarianLevel: 'ELEVATED',
      },
    };
  }, [externalCotData]);

  const totalContracts = Math.abs(cotData.netSpeculatorLong) + Math.abs(cotData.commercialNetShort);
  const specPct = Math.round((Math.abs(cotData.netSpeculatorLong) / totalContracts) * 100);
  const commPct = 100 - specPct;

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Award size={13} />
          CFTC COMMITMENT OF TRADERS (COT) POSITIONING
        </span>
        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
          {cotData.reportDate}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', alignItems: 'center' }}>
        {/* Left: Unified Institutional Stacked Delta Bar */}
        <div className="cot-stacked-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                MANAGED MONEY (FUNDS)
              </span>
              <div style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--bull-primary)' }}>
                +{cotData.netSpeculatorLong.toLocaleString('en-US')}
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginLeft: '4px' }}>contracts</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                COMMERCIAL HEDGERS (BANKS)
              </span>
              <div style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--bear-primary)' }}>
                {cotData.commercialNetShort.toLocaleString('en-US')}
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginLeft: '4px' }}>contracts</span>
              </div>
            </div>
          </div>

          {/* Unified Stacked Delta Bar */}
          <div className="cot-stacked-bar-wrap">
            <div className="cot-stacked-fill-long" style={{ width: `${specPct}%` }} />
            <div className="cot-stacked-fill-short" style={{ width: `${commPct}%` }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
            <span>{cotData.speculatorBiasPct}% Bullish Longs ({cotData.percentile}th Pctile)</span>
            <span>{cotData.commercialStatus} ({cotData.commercialHedgePct}% Hedged)</span>
          </div>
        </div>

        {/* Right: Retail Crowd Contrarian Indicator */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              RETAIL SENTIMENT
            </span>
            <span style={{ fontSize: '9px', fontWeight: 600, color: cotData.retailSentiment.contrarianLevel === 'EXTREME' ? 'var(--bear-primary)' : 'var(--gold-primary)', fontFamily: 'var(--font-mono)' }}>
              CONTRARIAN: {cotData.retailSentiment.contrarianLevel}
            </span>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginBottom: '4px' }}>
            <span style={{ color: 'var(--bull-primary)' }}>{cotData.retailSentiment.longPct}% Long</span>
            <span style={{ margin: '0 4px', color: 'var(--text-dim)' }}>/</span>
            <span style={{ color: 'var(--bear-primary)' }}>{cotData.retailSentiment.shortPct}% Short</span>
          </div>

          <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', background: '#1E293B' }}>
            <div style={{ width: `${cotData.retailSentiment.longPct}%`, background: 'var(--bull-primary)' }} />
            <div style={{ width: `${cotData.retailSentiment.shortPct}%`, background: 'var(--bear-primary)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
