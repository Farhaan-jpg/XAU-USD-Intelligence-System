// client/src/components/VolumeProfileOverlay.jsx
// Intraday Volume Profile (VPVR) Ribbon: Point of Control (POC), Value Area High (VAH), Value Area Low (VAL)
// Visualizes session volume distribution directly beside market execution levels

import { useMemo } from 'react';
import { BarChart3, Target } from 'lucide-react';

export default function VolumeProfileOverlay({ prices = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);
  const vp = gold.volumeProfile || {};

  const poc = parseFloat(vp.poc || spotPrice || 0);
  const vah = parseFloat(vp.vah || (spotPrice + 8));
  const val = parseFloat(vp.val || (spotPrice - 8));

  // Determine current price position relative to Value Area
  const vaStatus = useMemo(() => {
    if (!spotPrice || spotPrice <= 0) return { label: 'INITIALIZING', color: 'var(--text-dim)' };
    if (spotPrice > vah) {
      return {
        label: 'ABOVE VALUE AREA (IMBALANCE EXPANSION)',
        color: 'var(--bull-primary)',
        bg: 'var(--bull-bg)',
      };
    }
    if (spotPrice < val) {
      return {
        label: 'BELOW VALUE AREA (DISCOUNT AUCTION)',
        color: 'var(--bear-primary)',
        bg: 'var(--bear-bg)',
      };
    }
    return {
      label: 'INSIDE VALUE AREA 70% (AUCTION ACCEPTANCE)',
      color: 'var(--gold-primary)',
      bg: 'var(--gold-bg)',
    };
  }, [spotPrice, vah, val]);

  const buckets = vp.buckets || [];
  const maxBucketVol = useMemo(() => {
    if (!buckets.length) return 1;
    return Math.max(...buckets.map((b) => b.volume || 1), 1);
  }, [buckets]);

  return (
    <div className="volume-profile-strip">
      <div className="vp-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BarChart3 size={11} style={{ color: 'var(--gold-primary)' }} />
          <span className="vp-title">SESSION VOLUME PROFILE (VPVR 70%)</span>
        </div>
        <span
          className="vp-status-tag"
          style={{
            color: vaStatus.color,
            background: vaStatus.bg,
            borderColor: `${vaStatus.color}33`,
          }}
        >
          {vaStatus.label}
        </span>
      </div>

      <div className="vp-levels-grid">
        {/* VAH Level */}
        <div className="vp-level-box vah" title="Value Area High: 70% volume ceiling">
          <span className="vp-level-tag">VAH (70%)</span>
          <span className="vp-level-val font-mono">${vah > 0 ? vah.toFixed(2) : '--'}</span>
        </div>

        {/* POC Level (Point of Control) */}
        <div className="vp-level-box poc" title="Point of Control: Single highest volume price level of the session">
          <span className="vp-level-tag">POC (MAX VOL)</span>
          <span className="vp-level-val font-mono">${poc > 0 ? poc.toFixed(2) : '--'}</span>
        </div>

        {/* VAL Level */}
        <div className="vp-level-box val" title="Value Area Low: 70% volume floor">
          <span className="vp-level-tag">VAL (70%)</span>
          <span className="vp-level-val font-mono">${val > 0 ? val.toFixed(2) : '--'}</span>
        </div>
      </div>

      {/* Mini Visual Distribution Sparkline */}
      {buckets.length > 0 && (
        <div className="vp-mini-histogram" title="Volume-at-Price Distribution">
          {buckets.map((b, i) => {
            const heightPct = Math.max(12, Math.round((b.volume / maxBucketVol) * 100));
            return (
              <div
                key={i}
                className={`vp-bar ${b.isPOC ? 'bar-poc' : b.inValueArea ? 'bar-va' : 'bar-out'}`}
                style={{ height: `${heightPct}%` }}
                title={`$${b.price}: ${b.volume} vol ${b.isPOC ? '(POC)' : ''}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
