import { useMemo, useEffect } from 'react';
import { Radar, ArrowUpRight, ArrowDownRight, AlertTriangle, Activity } from 'lucide-react';
import { playDivergenceAlert, speakSquawk } from '../utils/audioAlerts';

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

  // Divergence Engine with Sound & Voice Squawk
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
        desc: 'US Dollar (DXY) and 10Y Yields are both dropping while Gold is lagging. High probability coiled upside breakout.',
        badge: 'BULLISH SETUP',
        color: 'var(--bull-glow)',
      };
    }

    // Bearish Divergence
    if (dxyImpulse > 0.03 && us10yImpulse > 0.02 && goldChg5m >= -0.01) {
      return {
        type: 'BEARISH_DIVERGENCE',
        title: 'Yield / Dollar Warning',
        desc: 'US Dollar and Treasury Yields are pushing higher while Gold is holding flat. Downside liquidity sweep risk elevated.',
        badge: 'BEARISH RISK',
        color: 'var(--bear-glow)',
      };
    }

    // Silver Lead Divergence
    if (silverChg5m > 0.06 && goldChg5m < 0.02) {
      return {
        type: 'SILVER_LEAD',
        title: 'Silver High-Beta Lead Signal',
        desc: 'Silver (XAG/USD) is expanding aggressively ahead of Gold. Institutional rotation signals impending Gold catch-up run.',
        badge: 'ROTATION SIGNAL',
        color: 'var(--cyan-glow)',
      };
    }

    return null;
  }, [gold, silver, dxy, us10y]);

  // Audio trigger on new divergence
  useEffect(() => {
    if (divergence) {
      speakSquawk(`Macro Alert. ${divergence.title}. ${divergence.desc}`, {
        category: 'divergence',
        preChime: 'divergence',
        priority: true,
      });
    }
  }, [divergence?.type]);

  const cards = [
    {
      symbol: 'GC=F',
      name: 'XAU/USD',
      label: 'Gold Spot',
      price: goldPrice > 0 ? `$${goldPrice.toFixed(2)}` : '--',
      chg: gold.change5m || 0,
      primary: true,
      unit: 'USD/oz',
    },
    {
      symbol: 'SI=F',
      name: 'XAG/USD',
      label: 'Silver Spot',
      price: silverPrice > 0 ? `$${silverPrice.toFixed(2)}` : '--',
      chg: silver.change5m || 0,
      unit: 'USD/oz',
    },
    {
      symbol: 'GSR',
      name: 'GSR',
      label: 'Gold-Silver Ratio',
      price: gsr,
      chg: 0,
      unit: 'ratio',
    },
    {
      symbol: 'DX-Y.NYB',
      name: 'DXY',
      label: 'US Dollar Index',
      price: dxy.price ? parseFloat(dxy.price).toFixed(2) : '104.80',
      chg: dxy.change5m || 0,
      unit: 'pts',
    },
    {
      symbol: '^TNX',
      name: 'US10Y',
      label: '10Y Treasury Yield',
      price: us10y.price ? `${parseFloat(us10y.price).toFixed(3)}%` : '4.280%',
      chg: us10y.change5m || 0,
      unit: '%',
    },
    {
      symbol: '^IRX',
      name: 'US02Y',
      label: '2Y Treasury Yield',
      price: us02y.price ? `${parseFloat(us02y.price).toFixed(3)}%` : '4.650%',
      chg: us02y.change5m || 0,
      unit: '%',
    },
    {
      symbol: 'JPY=X',
      name: 'USD/JPY',
      label: 'Dollar Yen',
      price: usdjpy.price ? parseFloat(usdjpy.price).toFixed(2) : '156.20',
      chg: usdjpy.change5m || 0,
      unit: 'pts',
    },
    {
      symbol: 'CL=F',
      name: 'CRUDE OIL',
      label: 'WTI Crude',
      price: oil.price ? `$${parseFloat(oil.price).toFixed(2)}` : '$78.50',
      chg: oil.change5m || 0,
      unit: 'USD/bbl',
    },
  ];

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Radar size={15} />
          MACRO CORRELATION RADAR
        </span>
        <span className="telemetry-badge" style={{ fontSize: '10px' }}>
          8 INTERMARKET ASSETS
        </span>
      </div>

      {/* Divergence Notification Alert Box */}
      {divergence && (
        <div className="divergence-alert-box" style={{ borderColor: divergence.color }}>
          <AlertTriangle size={18} style={{ color: divergence.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{divergence.title}</span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: divergence.color,
                }}
              >
                {divergence.badge}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {divergence.desc}
            </div>
          </div>
        </div>
      )}

      {/* Macro Asset Cards Grid */}
      <div className="macro-radar-grid">
        {cards.map((c) => {
          const chgNum = parseFloat(c.chg || 0);
          const isUp = chgNum > 0;
          return (
            <div
              key={c.symbol}
              className={`macro-card ${c.primary ? 'primary-gold' : ''}`}
            >
              <div className="macro-card-header">
                <span style={{ fontWeight: 700, color: c.primary ? 'var(--gold-glow)' : 'inherit' }}>
                  {c.name}
                </span>
                <span>{c.label}</span>
              </div>

              <div className="macro-card-price">{c.price}</div>

              <div className={`macro-card-velocity ${isUp ? 'up' : 'down'}`}>
                {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                <span>
                  {chgNum > 0 ? '+' : ''}
                  {chgNum.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
