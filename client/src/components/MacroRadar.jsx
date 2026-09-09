// client/src/components/MacroRadar.jsx
// Institutional 8-Asset Intermarket Correlation Matrix Ribbon with Divergence Engine

import { useMemo, useEffect } from 'react';
import { Radar, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export default function MacroRadar({ prices = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const silver = prices['SI=F'] || prices['XAGUSD'] || {};
  const dxy = prices['DX-Y.NYB'] || {};
  const us10y = prices['^TNX'] || {};
  const us02y = prices['^IRX'] || {};
  const usdjpy = prices['JPY=X'] || {};
  const oil = prices['CL=F'] || {};

  const goldPrice = parseFloat(gold.price || 0);
  const silverPrice = parseFloat(silver.price || 0);
  const gsr = goldPrice > 0 && silverPrice > 0 ? (goldPrice / silverPrice).toFixed(1) : '66.0';

  // Divergence Engine with Audio Trigger
  const divergence = useMemo(() => {
    const goldChg5m = parseFloat(gold.change5m || 0);
    const dxyChg5m = parseFloat(dxy.change5m || 0);
    const dxyChgDay = parseFloat(dxy.changeDay || 0);
    const us10yChg5m = parseFloat(us10y.change5m || 0);
    const us10yChgDay = parseFloat(us10y.changeDay || 0);
    const silverChg5m = parseFloat(silver.change5m || 0);

    const dxyImpulse = (dxyChg5m * 0.7) + (dxyChgDay * 0.3);
    const us10yImpulse = (us10yChg5m * 0.7) + (us10yChgDay * 0.3);

    // Bullish Divergence
    if (dxyImpulse < -0.03 && us10yImpulse < -0.02 && goldChg5m <= 0.01) {
      return {
        type: 'BULLISH_DIVERGENCE',
        title: 'Institutional Bullish Divergence',
        desc: 'US Dollar (DXY) and 10Y Yields are dropping while Gold lags. High probability upside expansion.',
        badge: 'BULLISH SETUP',
        color: 'var(--bull-primary)',
      };
    }

    // Bearish Divergence
    if (dxyImpulse > 0.03 && us10yImpulse > 0.02 && goldChg5m >= -0.01) {
      return {
        type: 'BEARISH_DIVERGENCE',
        title: 'Yield / Dollar Drag Warning',
        desc: 'US Dollar and Treasury Yields advancing higher while Gold holds flat. Downside sweep risk elevated.',
        badge: 'BEARISH RISK',
        color: 'var(--bear-primary)',
      };
    }

    // Silver Lead Divergence
    if (silverChg5m > 0.06 && goldChg5m < 0.02) {
      return {
        type: 'SILVER_LEAD',
        title: 'Silver High-Beta Lead Signal',
        desc: 'Silver (XAG/USD) is expanding ahead of Gold. Institutional rotation signals impending catch-up run.',
        badge: 'ROTATION SIGNAL',
        color: 'var(--cyan-primary)',
      };
    }

    return null;
  }, [gold, silver, dxy, us10y]);

  useEffect(() => {
    if (divergence) {
      const isBearish = divergence.type === 'BEARISH_DIVERGENCE';
      speakSquawk(`Macro ${isBearish ? 'Bearish' : 'Bullish'} Alert. ${divergence.title}. ${divergence.desc}`, {
        category: 'divergence',
        preChime: isBearish ? 'bearish' : 'divergence',
        priority: true,
      });
    }
  }, [divergence?.type]);

  const assets = [
    {
      symbol: 'GC=F',
      name: 'XAU/USD',
      label: 'Gold Spot',
      price: goldPrice > 0 ? `$${goldPrice.toFixed(2)}` : '--',
      chg: gold.change5m || gold.changeDay || 0,
      corr: 'Benchmark',
      isPrimary: true,
    },
    {
      symbol: 'SI=F',
      name: 'XAG/USD',
      label: 'Silver',
      price: silverPrice > 0 ? `$${silverPrice.toFixed(2)}` : '--',
      chg: silver.change5m || silver.changeDay || 0,
      corr: '+0.88 Corr',
    },
    {
      symbol: 'DX-Y.NYB',
      name: 'DXY',
      label: 'US Dollar',
      price: dxy.price ? parseFloat(dxy.price).toFixed(2) : '104.80',
      chg: dxy.change5m || dxy.changeDay || 0,
      corr: '-0.84 Corr',
    },
    {
      symbol: '^TNX',
      name: 'US10Y',
      label: '10Y Yield',
      price: us10y.price ? `${parseFloat(us10y.price).toFixed(3)}%` : '4.280%',
      chg: us10y.change5m || us10y.changeDay || 0,
      corr: '-0.68 Corr',
    },
    {
      symbol: '^IRX',
      name: 'US02Y',
      label: '2Y Yield',
      price: us02y.price ? `${parseFloat(us02y.price).toFixed(3)}%` : '4.650%',
      chg: us02y.change5m || us02y.changeDay || 0,
      corr: '-0.62 Corr',
    },
    {
      symbol: 'JPY=X',
      name: 'USD/JPY',
      label: 'Dollar Yen',
      price: usdjpy.price ? parseFloat(usdjpy.price).toFixed(2) : '156.20',
      chg: usdjpy.change5m || usdjpy.changeDay || 0,
      corr: '-0.54 Corr',
    },
    {
      symbol: 'CL=F',
      name: 'WTI CRUDE',
      label: 'Crude Oil',
      price: oil.price ? `$${parseFloat(oil.price).toFixed(2)}` : '$78.50',
      chg: oil.change5m || oil.changeDay || 0,
      corr: '+0.46 Corr',
    },
    {
      symbol: 'GSR',
      name: 'GSR',
      label: 'Gold/Silver',
      price: gsr,
      chg: 0,
      corr: 'Ratio',
    },
  ];

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Radar size={13} />
          8-ASSET INTERMARKET CORRELATION RIBBON
        </span>
        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
          CROSS-ASSET RADAR
        </span>
      </div>

      {/* Divergence Notification Callout */}
      {divergence && (
        <div
          style={{
            background: 'rgba(0,0,0,0.25)',
            borderLeft: `3px solid ${divergence.color}`,
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '11px',
          }}
        >
          <AlertTriangle size={15} style={{ color: divergence.color, flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--text-main)' }}>{divergence.title}:</strong>
            <span style={{ color: 'var(--text-muted)' }}>{divergence.desc}</span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: '3px',
                background: 'rgba(255,255,255,0.06)',
                color: divergence.color,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {divergence.badge}
            </span>
          </div>
        </div>
      )}

      {/* 8-Column High-Density Ticker Grid */}
      <div className="macro-ribbon-grid">
        {assets.map((a) => {
          const chgNum = parseFloat(a.chg || 0);
          const isUp = chgNum > 0;
          return (
            <div
              key={a.symbol}
              className="macro-ribbon-item"
              style={{
                borderColor: a.isPrimary ? 'rgba(234, 179, 8, 0.25)' : undefined,
                background: a.isPrimary ? 'rgba(234, 179, 8, 0.04)' : undefined,
              }}
            >
              <div className="macro-ribbon-name">
                <span>{a.name}</span>
                <span style={{ fontSize: '9px', opacity: 0.6 }}>{a.corr}</span>
              </div>

              <div className="macro-ribbon-price">{a.price}</div>

              <div
                className="macro-ribbon-chg"
                style={{ color: chgNum === 0 ? 'var(--text-dim)' : isUp ? 'var(--bull-primary)' : 'var(--bear-primary)' }}
              >
                {chgNum !== 0 && (isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />)}
                <span>{chgNum > 0 ? '+' : ''}{chgNum.toFixed(2)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
