// client/src/components/TradingChart.jsx
// Professional High-Density TradingView Workstation with Compact Single-Row Price & Pivot Ticker

import { useState, useMemo, useRef, useEffect, memo} from 'react';
import { ExternalLink, BarChart2, Activity, Layers } from 'lucide-react';
import TickTape from './TickTape';
import MTFMatrix from './MTFMatrix';
import VolumeProfileOverlay from './VolumeProfileOverlay';

function TradingChart({ prices = {} }) {
  const [interval, setInterval] = useState('5'); // '1', '5', '15', '60', '240', 'D'
  const [showTape, setShowTape] = useState(true);
  const [showMTF, setShowMTF] = useState(true);
  const [showVP, setShowVP] = useState(true);

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

  const [pivotMode, setPivotMode] = useState('FLOOR'); // 'FLOOR' | 'CAMARILLA'

  // Institutional Floor and Camarilla Pivots based on authentic prior close and session range
  const pivots = useMemo(() => {
    const p = spotPrice;
    if (!p) return { r3: '--', r2: '--', r1: '--', p: '--', s1: '--', s2: '--', s3: '--', h4: '--', h3: '--', l3: '--', l4: '--' };

    const H = gold.high && gold.low && gold.high > gold.low ? parseFloat(gold.high) : p + 12;
    const L = gold.high && gold.low && gold.high > gold.low ? parseFloat(gold.low) : p - 12;
    const C = parseFloat(gold.prevClose || p);
    const range = H - L;

    // Classical Floor Pivots
    const P = (H + L + C) / 3;
    const R1 = (2 * P) - L;
    const S1 = (2 * P) - H;
    const R2 = P + range;
    const S2 = P - range;
    const R3 = H + 2 * (P - L);
    const S3 = L - 2 * (H - P);

    // Institutional Camarilla Equations (H4 Break Long, H3 Fade Short, L3 Fade Long, L4 Break Short)
    const H4 = C + (range * 1.1) / 2;
    const H3 = C + (range * 1.1) / 4;
    const L3 = C - (range * 1.1) / 4;
    const L4 = C - (range * 1.1) / 2;

    return {
      r3: R3.toFixed(2),
      r2: R2.toFixed(2),
      r1: R1.toFixed(2),
      p: P.toFixed(2),
      s1: S1.toFixed(2),
      s2: S2.toFixed(2),
      s3: S3.toFixed(2),
      h4: H4.toFixed(2),
      h3: H3.toFixed(2),
      l3: L3.toFixed(2),
      l4: L4.toFixed(2),
    };
  }, [spotPrice, gold.high, gold.low, gold.prevClose]);

  // Real-Time Average Daily Range (ADR) Expansion
  const adrInfo = useMemo(() => {
    const dayRange = gold.dayRange || (gold.high && gold.low ? (gold.high - gold.low) : null);
    const pct = gold.adrPercent || (dayRange ? ((dayRange / 32.0) * 100).toFixed(0) : null);
    return {
      range: dayRange ? (typeof dayRange === 'number' ? dayRange.toFixed(1) : parseFloat(dayRange).toFixed(1)) : null,
      pct: pct ? `${Math.round(pct)}%` : null,
    };
  }, [gold.dayRange, gold.adrPercent, gold.high, gold.low]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: '3px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: 'var(--gold-primary)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
            title="Authoritative High-Probability Execution Chart: OANDA Spot Gold"
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold-primary)', boxShadow: '0 0 6px var(--gold-primary)' }} />
            OANDA:XAUUSD (PRIMARY)
          </div>

          {bid && ask && (
            <div className="spot-price-meta">
              <span>BID <strong style={{ color: 'var(--text-main)' }}>${bid}</strong></span>
              <span style={{ margin: '0 4px', opacity: 0.4 }}>/</span>
              <span>ASK <strong style={{ color: 'var(--text-main)' }}>${ask}</strong></span>
              {spread && <span style={{ marginLeft: '6px', color: 'var(--text-dim)' }}>(Spr ${spread})</span>}
              {adrInfo.range && (
                <span style={{ marginLeft: '8px', color: 'var(--gold-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ADR ${adrInfo.range} ({adrInfo.pct})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center: Clean Monospace Floor & Camarilla Pivots & Order Flow Ribbon */}
        <div className="chart-pivots-ribbon">
          <button
            onClick={() => setPivotMode(pivotMode === 'FLOOR' ? 'CAMARILLA' : 'FLOOR')}
            className="pivot-tag"
            style={{
              cursor: 'pointer',
              fontWeight: 700,
              color: 'var(--cyan-primary)',
              borderColor: 'rgba(56, 189, 248, 0.4)',
              background: 'rgba(56, 189, 248, 0.08)',
            }}
            title="Click to switch between Classical Floor Pivots and Camarilla Equations"
          >
            {pivotMode}
          </button>

          {(gold.sessionVWAP > 0 || gold.vwap > 0) && (
            <span
              className="pivot-tag"
              style={{
                borderColor: 'rgba(56, 189, 248, 0.35)',
                color: 'var(--cyan-primary)',
                background: 'rgba(56, 189, 248, 0.08)',
                fontWeight: 600,
              }}
              title="True Rolling Session VWAP (OANDA Order Flow)"
            >
              VWAP ${(parseFloat(gold.sessionVWAP || gold.vwap)).toFixed(2)}
            </span>
          )}
          {gold.cvd !== undefined && gold.cvd !== 0 && (
            <span
              className="pivot-tag"
              style={{
                borderColor: gold.cvd > 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
                color: gold.cvd > 0 ? 'var(--bull-primary)' : 'var(--bear-primary)',
                background: gold.cvd > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
              }}
              title="Cumulative Volume Delta"
            >
              CVD {gold.cvd > 0 ? '+' : ''}{gold.cvd.toFixed(0)}
            </span>
          )}
          {gold.smtDivergence?.status && gold.smtDivergence.status !== 'NEUTRAL' && (
            <span
              className="pivot-tag"
              style={{
                borderColor: gold.smtDivergence.status === 'BULLISH_SMT' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
                color: gold.smtDivergence.status === 'BULLISH_SMT' ? 'var(--bull-primary)' : 'var(--bear-primary)',
                background: gold.smtDivergence.status === 'BULLISH_SMT' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                fontWeight: 700,
              }}
              title={gold.smtDivergence.note}
            >
              {gold.smtDivergence.status === 'BULLISH_SMT' ? '▲ BULL SMT' : '▼ BEAR SMT'}
            </span>
          )}

          {pivotMode === 'FLOOR' ? (
            <>
              <span className="pivot-tag r2" title="Floor Resistance 2">R2 ${pivots.r2}</span>
              <span className="pivot-tag r1" title="Floor Resistance 1">R1 ${pivots.r1}</span>
              <span className="pivot-tag p" title="Floor Equilibrium Pivot">P ${pivots.p}</span>
              <span className="pivot-tag s1" title="Floor Support 1">S1 ${pivots.s1}</span>
              <span className="pivot-tag s2" title="Floor Support 2">S2 ${pivots.s2}</span>
            </>
          ) : (
            <>
              <span className="pivot-tag r2" title="Camarilla H4 Long Breakout Trigger" style={{ color: 'var(--bull-primary)', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                H4 ${pivots.h4}
              </span>
              <span className="pivot-tag r1" title="Camarilla H3 Short Fade Zone">H3 ${pivots.h3}</span>
              <span className="pivot-tag s1" title="Camarilla L3 Long Fade Zone">L3 ${pivots.l3}</span>
              <span className="pivot-tag s2" title="Camarilla L4 Short Breakdown Trigger" style={{ color: 'var(--bear-primary)', borderColor: 'rgba(244, 63, 94, 0.4)' }}>
                L4 ${pivots.l4}
              </span>
            </>
          )}
        </div>

        {/* Right: Minimalist Timeframe Segmented Control & TV Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Overlay Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
            <button
              className={`timeframe-btn ${showTape ? 'active' : ''}`}
              onClick={() => setShowTape(!showTape)}
              title="Toggle Live Tick Tape & Velocity"
              style={{ fontSize: '10px', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Activity size={10} />
              <span>TAPE</span>
            </button>
            <button
              className={`timeframe-btn ${showMTF ? 'active' : ''}`}
              onClick={() => setShowMTF(!showMTF)}
              title="Toggle Multi-Timeframe Alignment Ribbon"
              style={{ fontSize: '10px', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Layers size={10} />
              <span>MTF</span>
            </button>
            <button
              className={`timeframe-btn ${showVP ? 'active' : ''}`}
              onClick={() => setShowVP(!showVP)}
              title="Toggle Intraday Volume Profile (POC/VAH/VAL)"
              style={{ fontSize: '10px', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <BarChart2 size={10} />
              <span>VPVR</span>
            </button>
          </div>

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

      {/* Sub-Second Micro-Tick Tape Bar */}
      {showTape && <TickTape prices={prices} />}

      {/* Multi-Timeframe Trend & Alignment Ribbon */}
      {showMTF && <MTFMatrix prices={prices} />}

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

      {/* Intraday Volume Profile Overlay */}
      {showVP && <VolumeProfileOverlay prices={prices} />}
    </div>
  );
}

export default memo(TradingChart);
