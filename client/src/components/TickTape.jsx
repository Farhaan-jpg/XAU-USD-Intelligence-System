// client/src/components/TickTape.jsx
// Sub-Second Real-Time Micro-Tick Tape & Tape Velocity Gauge (Ticks Per Second)
// Visualizes aggressive market order flow, tape acceleration, and microsecond price direction

import { useMemo, memo} from 'react';
import { Zap, ArrowUp, ArrowDown, Activity } from 'lucide-react';

function TickTape({ prices = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);

  // Micro-tick history buffer
  const ticks = useMemo(() => {
    if (gold.tickTape && Array.isArray(gold.tickTape) && gold.tickTape.length > 0) {
      return gold.tickTape.slice(-14);
    }
    // Fallback baseline tick if tape is accumulating
    if (spotPrice > 0) {
      return [
        {
          id: 'base',
          price: spotPrice,
          ch: 0,
          dir: 'FLAT',
          size: 10,
          ts: new Date().toISOString(),
        },
      ];
    }
    return [];
  }, [gold.tickTape, spotPrice]);

  const tps = typeof gold.tapeSpeed === 'number' ? gold.tapeSpeed : 1.2;
  const regime = gold.tapeSpeedStatus || (tps >= 8.0 ? 'BREAKOUT SURGE' : tps >= 3.0 ? 'ELEVATED FLOW' : 'NORMAL');

  const isSurge = regime === 'BREAKOUT SURGE';
  const isElevated = regime === 'ELEVATED FLOW';

  const regimeColor = isSurge ? 'var(--bear-primary)' : isElevated ? 'var(--gold-primary)' : 'var(--bull-primary)';
  const regimeBg = isSurge ? 'var(--bear-bg)' : isElevated ? 'var(--gold-bg)' : 'rgba(16, 185, 129, 0.08)';

  return (
    <div className="tick-tape-container">
      {/* Tape Speed Velocity Pill */}
      <div
        className="tape-velocity-badge"
        style={{
          background: regimeBg,
          borderColor: `${regimeColor}40`,
          color: regimeColor,
        }}
        title="Live Order Flow Velocity: Ticks received per second"
      >
        <Activity size={11} className={isSurge ? 'pulse-fast' : ''} />
        <span className="tape-velocity-text">
          {tps.toFixed(1)} TPS &bull; {regime}
        </span>
      </div>

      {/* Horizontal Micro-Tick Stream */}
      <div className="tick-stream-track">
        {ticks.map((t, idx) => {
          const isUp = t.dir === 'UP';
          const isDown = t.dir === 'DOWN';
          const isLatest = idx === ticks.length - 1;

          return (
            <div
              key={t.id || idx}
              className={`tick-stream-chip ${isLatest ? 'tick-chip-latest' : ''} ${isUp ? 'chip-up' : isDown ? 'chip-down' : 'chip-flat'}`}
            >
              {isUp ? (
                <ArrowUp size={10} className="tick-dir-icon" />
              ) : isDown ? (
                <ArrowDown size={10} className="tick-dir-icon" />
              ) : (
                <span className="tick-dot" />
              )}
              <span className="tick-chip-price">${parseFloat(t.price).toFixed(2)}</span>
              {t.ch !== 0 && (
                <span className="tick-chip-delta">
                  {t.ch > 0 ? `+${t.ch.toFixed(2)}` : t.ch.toFixed(2)}
                </span>
              )}
              <span className="tick-chip-size">{t.size}x</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(TickTape);
