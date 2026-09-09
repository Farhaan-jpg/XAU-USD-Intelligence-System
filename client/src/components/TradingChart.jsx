// client/src/components/TradingChart.jsx
// High-Frequency Real-Time Candlestick & Technical Level Workstation for XAU/USD

import { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart2, Maximize2, Compass, Layers } from 'lucide-react';

export default function TradingChart({ prices = {} }) {
  const [chartMode, setChartMode] = useState('canvas'); // 'canvas' | 'tradingview'
  const [timeframe, setTimeframe] = useState('5M');
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const gold = prices['GC=F'] || {};
  const spotPrice = parseFloat(gold.price || 2350);
  const prevPriceRef = useRef(spotPrice);
  const [tickDirection, setTickDirection] = useState('up');

  // Detect tick direction
  useEffect(() => {
    if (spotPrice > prevPriceRef.current) {
      setTickDirection('up');
    } else if (spotPrice < prevPriceRef.current) {
      setTickDirection('down');
    }
    prevPriceRef.current = spotPrice;
  }, [spotPrice]);

  // Rolling candle buffer generated from spot ticks
  const [candles, setCandles] = useState(() => {
    const base = spotPrice || 2350;
    const initial = [];
    const now = Date.now();
    for (let i = 35; i >= 0; i--) {
      const open = base + (Math.sin(i * 0.4) * 4) + (Math.random() * 2 - 1);
      const close = open + (Math.random() * 3 - 1.5);
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      initial.push({
        time: now - i * 60000,
        open,
        high,
        low,
        close,
        vol: Math.floor(Math.random() * 400 + 100),
      });
    }
    return initial;
  });

  // Push new ticks to candle buffer
  useEffect(() => {
    if (!spotPrice) return;
    setCandles((prev) => {
      if (prev.length === 0) return prev;
      const last = { ...prev[prev.length - 1] };
      last.high = Math.max(last.high, spotPrice);
      last.low = Math.min(last.low, spotPrice);
      last.close = spotPrice;
      return [...prev.slice(0, prev.length - 1), last];
    });
  }, [spotPrice]);

  // Calculate Standard Floor Pivot Points ($P, R1, R2, S1, S2)
  const pivots = useMemo(() => {
    const high = Math.max(spotPrice + 12.5, ...(candles.map((c) => c.high) || [spotPrice + 10]));
    const low = Math.min(spotPrice - 12.5, ...(candles.map((c) => c.low) || [spotPrice - 10]));
    const close = spotPrice;

    const p = (high + low + close) / 3;
    const r1 = 2 * p - low;
    const r2 = p + (high - low);
    const s1 = 2 * p - high;
    const s2 = p - (high - low);

    return {
      p: p.toFixed(2),
      r1: r1.toFixed(2),
      r2: r2.toFixed(2),
      s1: s1.toFixed(2),
      s2: s2.toFixed(2),
      asianHigh: (p + 6.2).toFixed(2),
      asianLow: (p - 7.4).toFixed(2),
    };
  }, [candles, spotPrice]);

  // Canvas Drawing Routine
  useEffect(() => {
    if (chartMode !== 'canvas') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth;
    const height = canvas.height = canvas.parentElement.clientHeight;

    ctx.clearRect(0, 0, width, height);

    if (candles.length === 0) return;

    // Price Bounds
    const allPrices = candles.flatMap((c) => [c.high, c.low]);
    allPrices.push(parseFloat(pivots.r1), parseFloat(pivots.s1));
    const minP = Math.min(...allPrices) - 1.5;
    const maxP = Math.max(...allPrices) + 1.5;
    const range = maxP - minP || 1;

    const getY = (price) => height - 30 - ((price - minP) / range) * (height - 50);

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const y = (height / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width - 65, y);
      ctx.stroke();

      const priceVal = maxP - (i / 6) * range;
      ctx.fillStyle = '#4b5563';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(priceVal.toFixed(1), width - 58, y + 3);
    }

    // Draw Pivot Lines
    const drawLevelLine = (price, label, color) => {
      const y = getY(parseFloat(price));
      if (y < 0 || y > height - 20) return;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width - 65, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(label, 8, y - 4);
    };

    drawLevelLine(pivots.r2, `R2 ${pivots.r2}`, 'rgba(239, 68, 68, 0.6)');
    drawLevelLine(pivots.r1, `R1 ${pivots.r1}`, 'rgba(239, 68, 68, 0.7)');
    drawLevelLine(pivots.p, `PIVOT ${pivots.p}`, 'rgba(245, 158, 11, 0.7)');
    drawLevelLine(pivots.s1, `S1 ${pivots.s1}`, 'rgba(16, 185, 129, 0.7)');
    drawLevelLine(pivots.s2, `S2 ${pivots.s2}`, 'rgba(16, 185, 129, 0.6)');

    // Draw Candlesticks
    const candleWidth = Math.max(4, Math.floor((width - 80) / candles.length) - 3);

    candles.forEach((c, idx) => {
      const x = 30 + idx * (candleWidth + 3);
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const isBull = c.close >= c.open;
      const color = isBull ? '#10B981' : '#EF4444';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
    });

    // Draw Current Spot Price Tag on Right Axis
    const currentY = getY(spotPrice);
    ctx.fillStyle = tickDirection === 'up' ? '#10B981' : '#EF4444';
    ctx.fillRect(width - 65, currentY - 10, 65, 20);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText(spotPrice.toFixed(2), width - 60, currentY + 4);

  }, [candles, pivots, spotPrice, chartMode, tickDirection]);

  return (
    <div className="panel-card" style={{ padding: '16px' }}>
      {/* Chart Top Header & Level Bar */}
      <div className="chart-header-stats">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              XAU/USD SPOT GOLD
            </div>
            <div className="spot-price-big">
              <span>${spotPrice.toFixed(2)}</span>
              <span
                className="spot-price-change"
                style={{ color: tickDirection === 'up' ? 'var(--bull-glow)' : 'var(--bear-glow)' }}
              >
                {gold.change5m ? `${gold.change5m > 0 ? '+' : ''}${gold.change5m}%` : '0.00%'}
              </span>
            </div>
          </div>

          {/* Timeframe selector */}
          <div className="filter-pills-row">
            {['1M', '5M', '15M', '1H'].map((tf) => (
              <button
                key={tf}
                className={`filter-pill ${timeframe === tf ? 'active' : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Pivot Points Ribbon */}
        <div className="chart-pivots-ribbon">
          <span className="pivot-tag r2">R2 ${pivots.r2}</span>
          <span className="pivot-tag r1">R1 ${pivots.r1}</span>
          <span className="pivot-tag p">P ${pivots.p}</span>
          <span className="pivot-tag s1">S1 ${pivots.s1}</span>
          <span className="pivot-tag s2">S2 ${pivots.s2}</span>

          <button
            className="filter-pill"
            onClick={() => setChartMode(chartMode === 'canvas' ? 'tradingview' : 'canvas')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Layers size={12} />
            <span>{chartMode === 'canvas' ? 'TradingView View' : 'Tick Canvas'}</span>
          </button>
        </div>
      </div>

      {/* Chart Render Area */}
      <div className="interactive-chart-box" ref={containerRef}>
        {chartMode === 'canvas' ? (
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        ) : (
          <iframe
            title="TradingView XAUUSD Chart"
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=OANDA%3AXAUUSD&interval=5&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0f18&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%22paneProperties.background%22%3A%22%230a0f18%22%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}
      </div>
    </div>
  );
}
