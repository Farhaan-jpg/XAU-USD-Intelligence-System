// client/src/components/PriceGrid.jsx
// Real-time 6-cell correlated instruments grid
// Flash animation on price update, color-coded direction

import { useState, useEffect, useRef } from 'react';

const SYMBOL_ORDER = ['GC=F', 'DX-Y.NYB', 'SI=F', '^TNX', '^IRX', 'JPY=X'];

function formatPrice(price, label) {
  if (price === undefined || price === null) return '—';
  if (label === 'US10Y' || label === 'US02Y') return price.toFixed(3) + '%';
  if (label === 'DXY') return price.toFixed(3);
  if (label === 'USD/JPY') return price.toFixed(3);
  return price.toFixed(2);
}

function formatChange(change) {
  if (change === undefined || change === null) return '—';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(3)}%`;
}

function PriceCell({ instrument }) {
  const [flashClass, setFlashClass] = useState('');
  const prevPriceRef = useRef(null);

  const { label, description, price, change5m, changeDay, correlation,
    direction, high, low, stale } = instrument;

  // Flash on price change
  useEffect(() => {
    if (prevPriceRef.current !== null && prevPriceRef.current !== price) {
      const cls = price > prevPriceRef.current ? 'flash-up' : 'flash-down';
      setFlashClass(cls);
      const timer = setTimeout(() => setFlashClass(''), 700);
      prevPriceRef.current = price;
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = price;
  }, [price]);

  const changeClass = change5m > 0.001 ? 'up' : change5m < -0.001 ? 'down' : 'flat';
  const dayChangeClass = changeDay > 0 ? 'up' : changeDay < 0 ? 'down' : 'flat';
  const isPrimary = label === 'XAU/USD';

  // Compute position on day's range
  const rangePercent = (high && low && price)
    ? Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100))
    : 50;

  return (
    <div className={`price-cell ${isPrimary ? 'primary' : ''} ${flashClass}`}>
      {/* Correlation tag */}
      <span className={`price-correlation-tag correlation-${correlation}`}>
        {correlation}
      </span>

      {/* Stale indicator */}
      {stale && <span className="price-stale-indicator">STALE</span>}

      {/* Header */}
      <div className="price-cell-label">{label}</div>
      <div className="price-cell-name">{description}</div>

      {/* Price */}
      <div className="price-cell-price">{formatPrice(price, label)}</div>

      {/* Changes */}
      <div className="price-cell-changes">
        <div>
          <div className="price-cell-label-tag">5m</div>
          <span className={`price-change ${changeClass}`}>
            {direction === 'UP' ? '▲' : direction === 'DOWN' ? '▼' : '▬'}{' '}
            {formatChange(change5m)}
          </span>
        </div>
        <div>
          <div className="price-cell-label-tag">Day</div>
          <span className={`price-change ${dayChangeClass}`}>
            {formatChange(changeDay)}
          </span>
        </div>
      </div>

      {/* Day Range mini-bar */}
      {high && low && (
        <div className="price-range-bar">
          <span>{formatPrice(low, label)}</span>
          <div className="price-range-track">
            <div
              className="price-range-fill"
              style={{ left: 0, width: `${rangePercent}%` }}
            />
          </div>
          <span>{formatPrice(high, label)}</span>
        </div>
      )}

      {/* Tooltip */}
      <div className="price-cell-tooltip">
        H: {formatPrice(high, label)} &nbsp; L: {formatPrice(low, label)}
      </div>
    </div>
  );
}

export default function PriceGrid({ prices }) {
  const hasData = Object.keys(prices).length > 0;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">📊</span>
          Correlated Instruments Hub
        </div>
        <div className="card-badge">LIVE · 5s</div>
      </div>

      {!hasData ? (
        <div className="loading-grid">
          {SYMBOL_ORDER.map((s) => (
            <div key={s} className="skeleton skeleton-price-cell" />
          ))}
        </div>
      ) : (
        <div className="price-grid">
          {SYMBOL_ORDER.map((symbol) => {
            const instrument = prices[symbol];
            if (!instrument) return (
              <div key={symbol} className="skeleton skeleton-price-cell" />
            );
            return <PriceCell key={symbol} instrument={instrument} />;
          })}
        </div>
      )}
    </div>
  );
}
