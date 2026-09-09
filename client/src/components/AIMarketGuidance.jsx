// client/src/components/AIMarketGuidance.jsx
// Institutional AI Market Guidance & Volatility Risk Warnings (Zero Trade Setups)
// Analyzes live intermarket regimes and issues real-time volatility & liquidity defense warnings

import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  Eye,
  Activity,
  Volume2,
  CheckCircle2,
} from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export default function AIMarketGuidance({ prices = {}, newsFeed = [], calendarData = {}, activeSession = 'London/NY Overlap' }) {
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
    // Auto-refresh guidance periodically
    const timer = setInterval(fetchGuidance, 45000);
    return () => clearInterval(timer);
  }, []);

  const handleVoiceSquawk = () => {
    if (!guidanceData) return;
    const speech = `Market Guidance Alert. Current Regime: ${guidanceData.regime || 'Active'}. Risk Level: ${guidanceData.riskLevel || 'Normal'}. ${guidanceData.guidance}. Key Warning: ${(guidanceData.warnings || [])[0] || ''}`;
    speakSquawk(speech);
  };

  const regime = guidanceData?.regime || 'ACCUMULATION';
  const riskLevel = guidanceData?.riskLevel || 'ELEVATED';

  const regimeColor =
    regime === 'EXPANSION'
      ? 'var(--bull-glow)'
      : regime === 'DISTRIBUTION'
      ? 'var(--bear-glow)'
      : 'var(--gold-glow)';

  const riskColor =
    riskLevel === 'CRITICAL'
      ? 'var(--bear-glow)'
      : riskLevel === 'ELEVATED'
      ? 'var(--gold-glow)'
      : 'var(--bull-glow)';

  return (
    <div className="panel-card guidance-panel">
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: 'var(--gold-glow)' }} />
          <span className="panel-title" style={{ letterSpacing: '0.5px' }}>
            AI MARKET GUIDANCE & RISK WARNINGS
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Regime Badge */}
          <span
            className="telemetry-badge"
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: regimeColor,
              borderColor: regimeColor,
              background: 'rgba(0, 0, 0, 0.4)',
            }}
          >
            REGIME: {regime}
          </span>

          {/* Risk Level Badge */}
          <span
            className="telemetry-badge"
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: riskColor,
              borderColor: riskColor,
              background: 'rgba(0, 0, 0, 0.4)',
            }}
          >
            RISK: {riskLevel}
          </span>

          {/* Voice Squawk Button */}
          <button
            className="filter-pill"
            onClick={handleVoiceSquawk}
            title="Listen to AI Market Guidance Squawk"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px' }}
          >
            <Volume2 size={13} />
            <span>SQUAWK</span>
          </button>

          {/* Refresh Button */}
          <button
            className="filter-pill"
            onClick={fetchGuidance}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      <div className="guidance-content-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginTop: '10px' }}>
        {/* Left Column: Macro Guidance Narrative */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.04), rgba(15, 23, 38, 0.7))',
            border: '1px solid var(--border-gold)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} style={{ color: 'var(--gold-glow)' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--gold-glow)', letterSpacing: '0.5px' }}>
              INSTITUTIONAL MACRO CONDITION
            </span>
          </div>

          <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#e2e8f0', margin: 0 }}>
            {guidanceData?.guidance ||
              'Intermarket flows are currently digesting Dollar Index and Treasury Yield dynamics. Monitor order flow absorption near key session liquidity levels.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              DYNAMIC INTERMARKET WATCHPOINTS
            </span>
            {(guidanceData?.watchpoints || [
              'Monitor Dollar Index trajectory against gold spot ticks.',
              'Track US 10-Year Treasury Yield real-rate pressure.',
            ]).map((wp, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '2px solid var(--gold-primary)',
                }}
              >
                <Eye size={14} style={{ color: 'var(--gold-glow)', flexShrink: 0, marginTop: '2px' }} />
                <span>{wp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Volatility & Execution Warnings */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.03)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} style={{ color: 'var(--bear-glow)' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--bear-glow)', letterSpacing: '0.5px' }}>
              CRITICAL VOLATILITY & TRAP WARNINGS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(guidanceData?.warnings || [
              'Anticipate spread widening around scheduled high-impact releases.',
              'Exercise caution against chasing post-news breakout exhaustion wicks.',
            ]).map((warn, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#f87171',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '2px solid var(--bear-glow)',
                  lineHeight: '1.4',
                }}
              >
                <AlertTriangle size={14} style={{ color: 'var(--bear-glow)', flexShrink: 0, marginTop: '2px' }} />
                <span>{warn}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 'auto',
              padding: '8px 10px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Model: {guidanceData?.model || 'openrouter/free'}</span>
            <span style={{ color: 'var(--bull-glow)' }}>DEFENSIVE PROTOCOL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
