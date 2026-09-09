// client/src/components/AIMarketGuidance.jsx
// Institutional AI Market Guidance & Volatility Intelligence Panel with Ambient Border Accents

import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Volume2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export default function AIMarketGuidance({ activeSession = 'London/NY Overlap' }) {
  const [loading, setLoading] = useState(false);
  const [guidanceData, setGuidanceData] = useState(null);
  const [error, setError] = useState(null);

  const fetchGuidance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeSession }),
      });
      const data = await res.json();
      if (data.success && data.guidance) {
        setGuidanceData(data.guidance);
      } else {
        throw new Error(data.error || 'Failed to fetch AI guidance');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuidance();
    const timer = setInterval(fetchGuidance, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleVoiceSquawk = () => {
    if (!guidanceData) return;
    const speech = `Market Guidance Alert. Current Regime: ${guidanceData.regime || 'Active'}. Risk Level: ${guidanceData.riskLevel || 'Normal'}. ${guidanceData.guidance}. Key Warning: ${(guidanceData.warnings || [])[0] || ''}`;
    speakSquawk(speech, { category: 'guidance' });
  };

  const regime = guidanceData?.regime || 'ACCUMULATION';
  const riskLevel = guidanceData?.riskLevel || 'ELEVATED';

  const isCritical = riskLevel === 'CRITICAL';
  const isElevated = riskLevel === 'ELEVATED';

  const riskColor = isCritical ? 'var(--bear-primary)' : isElevated ? 'var(--gold-primary)' : 'var(--bull-primary)';
  const riskBg = isCritical ? 'var(--bear-bg)' : isElevated ? 'var(--gold-bg)' : 'var(--bull-bg)';

  return (
    <div
      className={`panel-card intelligence-panel ${isCritical ? 'risk-critical' : isElevated ? 'risk-elevated' : ''}`}
      style={{
        borderLeft: `3px solid ${riskColor}`,
      }}
    >
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={13} style={{ color: 'var(--cyan-primary)' }} />
          <span className="panel-title">AI MARKET INTELLIGENCE & VOLATILITY DEFENSE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Regime Badge */}
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            REGIME: {regime}
          </span>

          {/* Risk Level Badge */}
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              background: riskBg,
              border: `1px solid ${riskColor}33`,
              color: riskColor,
            }}
          >
            RISK: {riskLevel}
          </span>

          {/* Squawk Trigger */}
          <button
            className="filter-pill"
            onClick={handleVoiceSquawk}
            title="Audio voice readout"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Volume2 size={11} />
            <span>SQUAWK</span>
          </button>

          {/* Refresh */}
          <button
            className="filter-pill"
            onClick={fetchGuidance}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={11} className={loading ? 'spin' : ''} />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginTop: '2px' }}>
        {/* Left Column: Guidance Narrative */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.6' }}>
            {guidanceData?.guidance || 'Analyzing multi-session order flow, liquidity imbalances, and intermarket yield vectors for institutional direction...'}
          </div>

          {guidanceData?.warnings && guidanceData.warnings.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', color: 'var(--gold-primary)', background: 'var(--gold-bg)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
              <ShieldAlert size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{guidanceData.warnings[0]}</span>
            </div>
          )}
        </div>

        {/* Right Column: Key Structural Levels & Defense Protocols */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            DEFENSE PARAMETERS
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Position Sizing</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: isCritical ? 'var(--bear-primary)' : isElevated ? 'var(--gold-primary)' : 'var(--bull-primary)' }}>
              {isCritical ? '0.25% Defensive' : isElevated ? '0.50% Standard' : '0.75% Normal'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Execution Filter</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
              {regime === 'EXPANSION' ? 'Trend Continuations' : 'Pullbacks to EQ'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Volatility Guard</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bull-primary)' }}>
              Resting Stops Armored
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
