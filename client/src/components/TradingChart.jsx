// client/src/components/TradingChart.jsx
// Professional TradingView Live Workstation for XAU/USD Spot Gold

import { useState, useMemo } from 'react';
import { Layers, Maximize2, ExternalLink, ShieldAlert } from 'lucide-react';

export default function TradingChart({ prices = {} }) {
  const [interval, setInterval] = useState('5'); // '1', '5', '15', '60', '240', 'D'

  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);

  // Institutional floor pivots based on authentic spot range
  const pivots = useMemo(() => {
    const p = spotPrice;
    if (!p) return { r2: '--', r1: '--', p: '--', s1: '--', s2: '--' };

    if (gold.high && gold.low && gold.high > gold.low) {
      const H = parseFloat(gold.high);
      const L = parseFloat(gold.low);
      const C = p;
      const P = (H + L + C) / 3;
      const R1 = (2 * P) - L;
      const S1 = (2 * P) - H;
      const R2 = P + (H - L);
      const S2 = P - (H - L);
      return {
        r2: R2.toFixed(2),
        r1: R1.toFixed(2),
        p: P.toFixed(2),
        s1: S1.toFixed(2),
        s2: S2.toFixed(2),
      };
    }

    return {
      r2: (p + 14.5).toFixed(2),
      r1: (p + 7.2).toFixed(2),
      p: p.toFixed(2),
      s1: (p - 7.2).toFixed(2),
      s2: (p - 14.5).toFixed(2),
    };
  }, [spotPrice, gold.high, gold.low]);

  const intervals = [
    { label: '1M', val: '1' },
    { label: '5M', val: '5' },
    { label: '15M', val: '15' },
    { label: '1H', val: '60' },
    { label: '4H', val: '240' },
    { label: 'D', val: 'D' },
  ];

  // TradingView embed URL with custom interval and dark theme
  const tvSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=OANDA%3AXAUUSD&interval=${interval}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0f18&studies=%5B%22MASimple%40tv-basicstudies%22%2C%22RSI%40tv-basicstudies%22%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%22paneProperties.background%22%3A%22%23090e17%22%2C%22paneProperties.vertGridProperties.color%22%3A%22rgba(255%2C255%2C255%2C0.03)%22%2C%22paneProperties.horzGridProperties.color%22%3A%22rgba(255%2C255%2C0.03)%22%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost`;

  return (
    <div className="panel-card" style={{ padding: '16px' }}>
      {/* Chart Top Header & Level Bar */}
      <div className="chart-header-stats">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              LIVE SPOT GOLD &bull; OANDA:XAUUSD
            </div>
            <div className="spot-price-big">
              <span>${spotPrice > 0 ? spotPrice.toFixed(2) : '--'}</span>
              <span
                className="spot-price-change"
                style={{ color: parseFloat(gold.changeDay || gold.change5m || 0) >= 0 ? 'var(--bull-glow)' : 'var(--bear-glow)' }}
                title={`24h Change: ${gold.changeDay || 0}% | 5m Velocity: ${gold.change5m || 0}%`}
              >
                {gold.changeDay !== undefined ? `${parseFloat(gold.changeDay) >= 0 ? '+' : ''}${gold.changeDay}%` : `${parseFloat(gold.change5m || 0) >= 0 ? '+' : ''}${gold.change5m || 0}%`}
              </span>
            </div>
          </div>

          {/* Institutional Timeframe Selector */}
          <div className="filter-pills-row">
            {intervals.map((tf) => (
              <button
                key={tf.val}
                className={`filter-pill ${interval === tf.val ? 'active' : ''}`}
                onClick={() => setInterval(tf.val)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pivot Points Ribbon */}
        <div className="chart-pivots-ribbon">
          <span className="pivot-tag r2" title="Resistance 2">R2 ${pivots.r2}</span>
          <span className="pivot-tag r1" title="Resistance 1">R1 ${pivots.r1}</span>
          <span className="pivot-tag p" title="Pivot Point">P ${pivots.p}</span>
          <span className="pivot-tag s1" title="Support 1">S1 ${pivots.s1}</span>
          <span className="pivot-tag s2" title="Support 2">S2 ${pivots.s2}</span>

          <a
            href="https://www.tradingview.com/chart/?symbol=OANDA%3AXAUUSD"
            target="_blank"
            rel="noopener noreferrer"
            className="filter-pill"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
          >
            <ExternalLink size={11} />
            <span>Full TV</span>
          </a>
        </div>
      </div>

      {/* TradingView Live Container (replaces tick canvas) */}
      <div className="interactive-chart-box" style={{ height: '480px' }}>
        <iframe
          key={interval}
          title="TradingView Live XAUUSD Chart"
          src={tvSrc}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowTransparency="true"
          scrolling="no"
        />
      </div>
    </div>
  );
}
