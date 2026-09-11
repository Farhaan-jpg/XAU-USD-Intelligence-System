// client/src/components/MTFMatrix.jsx
// Multi-Timeframe (MTF) Trend & Momentum Alignment Matrix (1M, 5M, 15M, 1H, 4H, 1D)
// Instant institutional confluence check across all market time horizons

import { useMemo } from 'react';
import { Layers, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function MTFMatrix({ prices = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const intervals = gold.intervals || {};

  const mtfData = useMemo(() => {
    if (gold.mtfMatrix) return gold.mtfMatrix;

    // Fallback dynamic computation from intervals
    const tfs = [
      { key: '1', label: '1M' },
      { key: '5', label: '5M' },
      { key: '15', label: '15M' },
      { key: '60', label: '1H' },
      { key: '240', label: '4H' },
      { key: 'D', label: '1D' },
    ];

    let bullCount = 0;
    let bearCount = 0;
    const matrix = {};

    for (const tf of tfs) {
      const data = intervals[tf.key] || {};
      const chp = typeof data.chp === 'number' ? data.chp : 0;
      let trend = 'CHOP';
      if (chp >= 0.08) {
        trend = 'BULLISH';
        bullCount++;
      } else if (chp <= -0.08) {
        trend = 'BEARISH';
        bearCount++;
      } else if (chp > 0) {
        trend = 'MILD_BULL';
        bullCount += 0.5;
      } else if (chp < 0) {
        trend = 'MILD_BEAR';
        bearCount += 0.5;
      }

      matrix[tf.label] = {
        changePct: chp,
        trend,
      };
    }

    let alignment = 'MIXED CONFLICT';
    let badgeColor = 'var(--text-dim)';
    if (bullCount >= 5) {
      alignment = `FULL BULLISH CONFLUENCE (${Math.round(bullCount)}/6)`;
      badgeColor = 'var(--bull-primary)';
    } else if (bullCount >= 4) {
      alignment = `MODERATE BULLISH BIAS (${Math.round(bullCount)}/6)`;
      badgeColor = 'var(--bull-primary)';
    } else if (bearCount >= 5) {
      alignment = `FULL BEARISH CONFLUENCE (${Math.round(bearCount)}/6)`;
      badgeColor = 'var(--bear-primary)';
    } else if (bearCount >= 4) {
      alignment = `MODERATE BEARISH BIAS (${Math.round(bearCount)}/6)`;
      badgeColor = 'var(--bear-primary)';
    }

    return { matrix, alignment, badgeColor, bullCount: Math.round(bullCount), bearCount: Math.round(bearCount) };
  }, [gold.mtfMatrix, intervals]);

  const tfs = ['1M', '5M', '15M', '1H', '4H', '1D'];

  return (
    <div className="mtf-matrix-ribbon">
      <div className="mtf-title-group">
        <Layers size={11} style={{ color: 'var(--cyan-primary)' }} />
        <span className="mtf-header-label">MTF ALIGNMENT</span>
        <span
          className="mtf-confluence-badge"
          style={{
            color: mtfData.badgeColor,
            borderColor: `${mtfData.badgeColor}33`,
            background: `${mtfData.badgeColor}12`,
          }}
        >
          {mtfData.alignment}
        </span>
      </div>

      <div className="mtf-cards-row">
        {tfs.map((label) => {
          const item = mtfData.matrix?.[label] || { changePct: 0, trend: 'CHOP' };
          const isBull = item.trend === 'BULLISH' || item.trend === 'MILD_BULL';
          const isBear = item.trend === 'BEARISH' || item.trend === 'MILD_BEAR';

          return (
            <div
              key={label}
              className={`mtf-cell ${isBull ? 'mtf-bull' : isBear ? 'mtf-bear' : 'mtf-neutral'}`}
              title={`${label} Trend: ${item.trend} (${item.changePct >= 0 ? '+' : ''}${item.changePct.toFixed(2)}%)`}
            >
              <span className="mtf-tf-label">{label}</span>
              <div className="mtf-indicator">
                {isBull ? (
                  <ArrowUp size={11} className="mtf-icon bull" />
                ) : isBear ? (
                  <ArrowDown size={11} className="mtf-icon bear" />
                ) : (
                  <Minus size={11} className="mtf-icon neutral" />
                )}
                <span className="mtf-pct">
                  {item.changePct >= 0 ? '+' : ''}
                  {item.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
