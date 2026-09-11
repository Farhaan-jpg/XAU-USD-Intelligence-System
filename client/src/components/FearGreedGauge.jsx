// client/src/components/FearGreedGauge.jsx
// Institutional Gold Safe-Haven Fear & Greed Index (0 - 100)
// Fully dynamic multi-factor quantitative engine deriving real-time market sentiment

import { useMemo, memo} from 'react';
import { Gauge } from 'lucide-react';
import { calculateFearGreed } from '../utils/sentimentEngine';

function FearGreedGauge({ prices = {}, newsFeed = [], calendarData = {}, cotData = {} }) {
  const { score, label, color, components } = useMemo(() => {
    return calculateFearGreed({ prices, newsFeed, calendarData, cotData });
  }, [prices, newsFeed, calendarData, cotData]);

  // SVG needle angle: score 0 = -90 deg, score 100 = +90 deg
  const needleAngle = (score / 100) * 180 - 90;

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Gauge size={13} style={{ color: color }} />
          REAL-TIME GOLD FEAR &amp; GREED INDEX
        </span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '3px',
            background: score >= 55 ? 'var(--bull-bg)' : score <= 45 ? 'var(--bear-bg)' : 'rgba(245, 158, 11, 0.1)',
            color: color,
            border: `1px solid ${score >= 55 ? 'var(--border-bull)' : score <= 45 ? 'var(--border-bear)' : 'rgba(245, 158, 11, 0.3)'}`,
          }}
        >
          {label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '16px', alignItems: 'center' }}>
        {/* Semicircular SVG Dial */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 200 115" style={{ width: '100%', maxWidth: '210px' }}>
            <defs>
              <linearGradient id="fearGreedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F43F5E" />
                <stop offset="35%" stopColor="#FB923C" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="70%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>

            {/* Background Arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#1E293B"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* Gradient Arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#fearGreedGrad)"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Pivot */}
            <circle cx="100" cy="100" r="7" fill="#E2E8F0" />

            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="32"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${needleAngle}, 100, 100)`}
              style={{ transition: 'transform 0.5s ease-out' }}
            />
          </svg>

          {/* Value Display */}
          <div style={{ textAlign: 'center', marginTop: '-12px' }}>
            <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: color }}>
              {score}
            </div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
              0 = EXTREME FEAR &bull; 100 = EXTREME GREED
            </div>
          </div>
        </div>

        {/* 5-Factor Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {components.map((comp) => (
            <div key={comp.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{comp.label}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: comp.val >= 55 ? 'var(--bull-primary)' : comp.val <= 45 ? 'var(--bear-primary)' : 'var(--gold-primary)',
                  }}
                >
                  {comp.val}/100
                </span>
              </div>
              <div style={{ height: '4px', background: '#1E293B', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${comp.val}%`,
                    background: comp.val >= 55 ? 'var(--bull-primary)' : comp.val <= 45 ? 'var(--bear-primary)' : 'var(--gold-primary)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(FearGreedGauge);
