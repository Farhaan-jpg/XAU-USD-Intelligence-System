// client/src/components/FibCalculator.jsx
// Institutional Smart Money Concepts (SMC) & Fibonacci Retracement / Extension Calculator

import { useState, useMemo } from 'react';
import { Layers, ArrowDownUp, Sparkles, Target } from 'lucide-react';

export default function FibCalculator({ prices = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);
  const liveHigh = parseFloat(gold.high || 0);
  const liveLow = parseFloat(gold.low || 0);

  const [swingHigh, setSwingHigh] = useState('');
  const [swingLow, setSwingLow] = useState('');
  const [direction, setDirection] = useState('BULLISH'); // 'BULLISH' (low to high) | 'BEARISH' (high to low)

  // Quick auto-populate from live session data
  const handleAutoPopulate = () => {
    if (liveHigh > 0 && liveLow > 0) {
      setSwingHigh(liveHigh.toFixed(2));
      setSwingLow(liveLow.toFixed(2));
    } else if (spotPrice > 0) {
      setSwingHigh((spotPrice + 12.5).toFixed(2));
      setSwingLow((spotPrice - 12.5).toFixed(2));
    }
  };

  const highNum = parseFloat(swingHigh) || (spotPrice > 0 ? spotPrice + 12 : 2850);
  const lowNum = parseFloat(swingLow) || (spotPrice > 0 ? spotPrice - 12 : 2826);

  const fibLevels = useMemo(() => {
    const diff = Math.abs(highNum - lowNum);
    const isBull = direction === 'BULLISH';

    // In bullish: 0% is at high (or low depending on perspective).
    // Standard SMC Retracement in uptrend: 0% = High, 100% = Low (retracement downward from high)
    // or 0% = Low, 100% = High.
    // In trading conventions:
    // Retracement from High:
    // 0% = High
    // 23.6% = High - diff * 0.236
    // 38.2% = High - diff * 0.382
    // 50.0% = High - diff * 0.500
    // 61.8% = High - diff * 0.618 (Golden Pocket)
    // 70.5% = High - diff * 0.705 (OTE)
    // 78.6% = High - diff * 0.786
    // 88.6% = High - diff * 0.886
    // 100.0% = Low
    // Ext -27.2% = High + diff * 0.272
    // Ext -61.8% = High + diff * 0.618

    const ratios = [
      { ratio: -0.618, label: '-61.8% SMC Extension TP2', type: 'ext', color: 'var(--bull-primary)' },
      { ratio: -0.272, label: '-27.2% SMC Extension TP1', type: 'ext', color: 'var(--bull-primary)' },
      { ratio: 0.0, label: '0.0% Swing High', type: 'swing', color: 'var(--text-main)' },
      { ratio: 0.236, label: '23.6% Shallow Pullback', type: 'fib', color: 'var(--text-muted)' },
      { ratio: 0.382, label: '38.2% Trend Continuation', type: 'fib', color: 'var(--text-muted)' },
      { ratio: 0.500, label: '50.0% Equilibrium (Fair Value)', type: 'eq', color: 'var(--gold-primary)' },
      { ratio: 0.618, label: '61.8% Golden Pocket', type: 'golden', color: 'var(--gold-primary)' },
      { ratio: 0.705, label: '70.5% ICT Optimal Trade Entry (OTE)', type: 'ote', color: 'var(--cyan-primary)' },
      { ratio: 0.786, label: '78.6% Deep Retracement', type: 'fib', color: 'var(--bear-primary)' },
      { ratio: 0.886, label: '88.6% Extreme Sweep / Stop Run', type: 'fib', color: 'var(--bear-primary)' },
      { ratio: 1.000, label: '100.0% Swing Low', type: 'swing', color: 'var(--text-main)' },
    ];

    return ratios.map((r) => {
      let price;
      if (isBull) {
        price = highNum - diff * r.ratio;
      } else {
        price = lowNum + diff * r.ratio;
      }
      const dist = spotPrice ? spotPrice - price : 0;
      return {
        ...r,
        price: parseFloat(price.toFixed(2)),
        dist: parseFloat(dist.toFixed(2)),
        absDist: Math.abs(dist),
      };
    });
  }, [highNum, lowNum, direction, spotPrice]);

  // Closest level
  const closestLevel = useMemo(() => {
    if (!spotPrice || fibLevels.length === 0) return null;
    let closest = fibLevels[0];
    for (const lvl of fibLevels) {
      if (lvl.absDist < closest.absDist) closest = lvl;
    }
    return closest;
  }, [fibLevels, spotPrice]);

  const eqPrice = (highNum + lowNum) / 2;
  const inDiscount = spotPrice < eqPrice;

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Layers size={13} style={{ color: 'var(--gold-primary)' }} />
          INSTITUTIONAL FIBONACCI &amp; SMC OTE CALCULATOR
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleAutoPopulate}
            className="filter-pill active"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '22px', fontSize: '10px' }}
            title="Auto-fill with live high & low from price feed"
          >
            <Sparkles size={11} />
            AUTO-SYNC PRICES
          </button>
          <button
            onClick={() => setDirection((d) => (d === 'BULLISH' ? 'BEARISH' : 'BULLISH'))}
            className="filter-pill"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '22px', fontSize: '10px' }}
          >
            <ArrowDownUp size={11} />
            {direction === 'BULLISH' ? 'BULLISH SWING' : 'BEARISH SWING'}
          </button>
        </div>
      </div>

      {/* Input Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
            SWING HIGH ($)
          </label>
          <input
            type="number"
            step="0.1"
            value={swingHigh}
            onChange={(e) => setSwingHigh(e.target.value)}
            placeholder={highNum.toFixed(2)}
            className="settings-input"
            style={{ width: '100%', height: '30px', fontFamily: 'var(--font-mono)' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
            SWING LOW ($)
          </label>
          <input
            type="number"
            step="0.1"
            value={swingLow}
            onChange={(e) => setSwingLow(e.target.value)}
            placeholder={lowNum.toFixed(2)}
            className="settings-input"
            style={{ width: '100%', height: '30px', fontFamily: 'var(--font-mono)' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: inDiscount ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              border: `1px solid ${inDiscount ? 'var(--border-bull)' : 'var(--border-bear)'}`,
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: inDiscount ? 'var(--bull-primary)' : 'var(--bear-primary)',
              whiteSpace: 'nowrap',
            }}
          >
            ZONE: {inDiscount ? 'DISCOUNT (SMC BUY)' : 'PREMIUM (SMC SELL)'}
          </div>
        </div>
      </div>

      {/* Closest Level Banner */}
      {closestLevel && (
        <div
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={12} style={{ color: 'var(--cyan-primary)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Nearest Level:</span>
            <span style={{ fontWeight: 600, color: closestLevel.color }}>{closestLevel.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>${closestLevel.price.toFixed(2)}</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
            Distance: {closestLevel.absDist.toFixed(2)} pts
          </span>
        </div>
      )}

      {/* Levels Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {fibLevels.map((lvl) => {
          const isClosest = closestLevel?.ratio === lvl.ratio;
          const isOte = lvl.type === 'ote';
          const isGolden = lvl.type === 'golden';

          return (
            <div
              key={lvl.ratio}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                borderRadius: '3px',
                background: isClosest
                  ? 'rgba(56, 189, 248, 0.12)'
                  : isOte || isGolden
                  ? 'rgba(245, 158, 11, 0.05)'
                  : 'rgba(255,255,255,0.02)',
                border: isClosest
                  ? '1px solid var(--cyan-primary)'
                  : isOte
                  ? '1px solid rgba(56, 189, 248, 0.25)'
                  : '1px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: isClosest || isOte ? 700 : 500,
                    color: lvl.color,
                    minWidth: '38px',
                  }}
                >
                  {(lvl.ratio * 100).toFixed(1)}%
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {lvl.type === 'ote' ? 'OTE Sweet Spot' : lvl.type === 'golden' ? 'Golden Pocket' : lvl.type === 'eq' ? 'Equilibrium' : lvl.type === 'ext' ? 'Extension' : ''}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: isClosest ? 'var(--cyan-primary)' : 'var(--text-main)',
                  }}
                >
                  ${lvl.price.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
