// client/src/components/TradingChart.jsx
// Professional High-Density TradingView Workstation with Compact Single-Row Price & Pivot Ticker

import { useState, useMemo, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

export default function TradingChart({ prices = {} }) {
  const [interval, setInterval] = useState('5'); // '1', '5', '15', '60', '240', 'D'

  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);

  // Dynamic tick direction flash
  const [tickDirection, setTickDirection] = useState(null);
  const prevPriceRef = useRef(spotPrice);

  useEffect(() => {
    if (spotPrice && prevPriceRef.current && spotPrice !== prevPriceRef.current) {
      const dir = spotPrice > prevPriceRef.current ? 'up' : 'down';
      setTickDirection(dir);
      const timer = setTimeout(() => setTickDirection(null), 350);
      prevPriceRef.current = spotPrice;
      return () => clearTimeout(timer);
    }
    if (spotPrice) prevPriceRef.current = spotPrice;
  }, [spotPrice]);

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
    { label: '1D', val: 'D' },
  ];

  const changePercent = parseFloat(gold.changeDay || gold.change5m || 0);
  const isUp = changePercent >= 0;

  const bid = gold.bid ? parseFloat(gold.bid).toFixed(2) : null;
  const ask = gold.ask ? parseFloat(gold.ask).toFixed(2) : null;
  const spread = (bid && ask && parseFloat(ask) >= parseFloat(bid)) ? (parseFloat(ask) - parseFloat(bid)).toFixed(2) : null;

  // TradingView embed URL with custom interval and dark theme
  const tvSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=OANDA%3AXAUUSD&interval=${interval}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0f18&studies=%5B%22MASimple%40tv-basicstudies%22%2C%22RSI%40tv-basicstudies%22%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%22paneProperties.background%22%3A%22%230B0E14%22%2C%22paneProperties.vertGridProperties.color%22%3A%22rgba(255%2C255%2C255%2C0.03)%22%2C%22paneProperties.horzGridProperties.color%22%3A%22rgba(255%2C255%2C0.03)%22%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost`;

  return (
    <div className="panel-card" style={{ gap: '8px' }}>
      {/* Integrated Single-Row Price, Ticker, Pivots, and Timeframe Header */}
      <div className="chart-price-ticker-row">
        {/* Left: Spot Price & Live Metrics */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
          <div className="spot-price-big">
            <span className={`spot-price-value ${tickDirection === 'up' ? 'tick-flash-up' : tickDirection === 'down' ? 'tick-flash-down' : ''}`}>
              ${spotPrice > 0 ? spotPrice.toFixed(2) : '--'}
            </span>
            <span
              className="spot-price-change"
              style={{ color: isUp ? 'var(--bull-primary)' : 'var(--bear-primary)' }}
            >
              {isUp ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>

          {bid && ask && (
            <div className="spot-price-meta">
              <span>BID <strong style={{ color: 'var(--text-main)' }}>${bid}</strong></span>
              <span style={{ margin: '0 4px', opacity: 0.4 }}>/</span>
              <span>ASK <strong style={{ color: 'var(--text-main)' }}>${ask}</strong></span>
              {spread && <span style={{ marginLeft: '6px', color: 'var(--text-dim)' }}>(Spr ${spread})</span>}
            </div>
          )}
        </div>

        {/* Center: Clean Monospace Floor Pivots Ribbon */}
        <div className="chart-pivots-ribbon">
          <span className="pivot-tag r2" title="Resistance 2">R2 ${pivots.r2}</span>
          <span className="pivot-tag r1" title="Resistance 1">R1 ${pivots.r1}</span>
          <span className="pivot-tag p" title="Equilibrium Pivot">P ${pivots.p}</span>
          <span className="pivot-tag s1" title="Support 1">S1 ${pivots.s1}</span>
          <span className="pivot-tag s2" title="Support 2">S2 ${pivots.s2}</span>
        </div>

        {/* Right: Minimalist Timeframe Segmented Control & TV Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div className="timeframe-segment-control">
            {intervals.map((tf) => (
              <button
                key={tf.val}
                className={`timeframe-btn ${interval === tf.val ? 'active' : ''}`}
                onClick={() => setInterval(tf.val)}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <a
            href="https://www.tradingview.com/chart/?symbol=OANDA%3AXAUUSD"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost-icon"
            style={{ width: '26px', height: '26px' }}
            title="Open Full TradingView Chart in New Window"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* TradingView Interactive Chart Container */}
      <div className="interactive-chart-box">
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
