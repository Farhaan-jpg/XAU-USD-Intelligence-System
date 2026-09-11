// client/src/components/COTSentimentGauge.jsx
// Institutional CFTC Commitment of Traders (COT) with Unified Stacked Delta Bar & Retail Positioning

import { useMemo, memo } from 'react';
import { Award } from 'lucide-react';

function COTSentimentGauge({ cotData: externalCotData }) {
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
        weeklyHistory: externalCotData.weeklyHistory || [
          { week: 'W-7', netLong: 204100 },
          { week: 'W-6', netLong: 211500 },
          { week: 'W-5', netLong: 219800 },
          { week: 'W-4', netLong: 226300 },
          { week: 'W-3', netLong: 222400 },
          { week: 'W-2', netLong: 231900 },
          { week: 'W-1', netLong: 235100 },
          { week: 'Current', netLong: 237250 },
        ],
        weeklyNetChange: externalCotData.weeklyNetChange !== undefined ? externalCotData.weeklyNetChange : 2150,
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
      weeklyHistory: [
        { week: 'W-7', netLong: 204100 },
        { week: 'W-6', netLong: 211500 },
        { week: 'W-5', netLong: 219800 },
        { week: 'W-4', netLong: 226300 },
        { week: 'W-3', netLong: 222400 },
        { week: 'W-2', netLong: 231900 },
        { week: 'W-1', netLong: 235100 },
        { week: 'Current', netLong: 237250 },
      ],
      weeklyNetChange: 2150,
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

  // Compute SVG sparkline points for 8-week history
  const sparklineData = useMemo(() => {
    const history = cotData.weeklyHistory || [];
    if (history.length < 2) return { path: '', points: [] };
    const values = history.map((h) => h.netLong);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 160;
    const height = 36;
    const padding = 4;

    const coords = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return { x, y, val };
    });

    const d = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '');
    return { path: d, points: coords };
  }, [cotData.weeklyHistory]);

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

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
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

        {/* Center: 8-Week Historical Trend Sparkline */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              8-WEEK NET SPEC TREND
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                color: cotData.weeklyNetChange >= 0 ? 'var(--bull-primary)' : 'var(--bear-primary)',
              }}
            >
              {cotData.weeklyNetChange >= 0 ? `+${cotData.weeklyNetChange.toLocaleString()} WoW` : `${cotData.weeklyNetChange.toLocaleString()} WoW`}
            </span>
          </div>

          {/* Sparkline SVG */}
          <div style={{ height: '34px', display: 'flex', alignItems: 'center' }}>
            <svg viewBox="0 0 160 36" style={{ width: '100%', height: '32px', overflow: 'visible' }}>
              <defs>
                <linearGradient id="cotSparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--bull-primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--bull-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d={sparklineData.path}
                fill="none"
                stroke="var(--bull-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {sparklineData.points.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={i === sparklineData.points.length - 1 ? 3 : 1.5}
                  fill={i === sparklineData.points.length - 1 ? '#FFFFFF' : 'var(--bull-primary)'}
                />
              ))}
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            <span>8 WEEKS AGO</span>
            <span>LATEST CFTC</span>
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

export default memo(COTSentimentGauge);
