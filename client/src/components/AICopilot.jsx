// client/src/components/AICopilot.jsx
// AI Institutional Trade Setup & Pre-News Scenario Playbook Copilot

import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Target,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Workflow,
  Radio,
  Send,
} from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export default function AICopilot({ prices = {}, newsFeed = [], calendarData = {}, activeSession = 'London/NY Overlap' }) {
  const [loading, setLoading] = useState(false);
  const [copilotData, setCopilotData] = useState(null);
  const [error, setError] = useState(null);

  const fetchTradePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeSession }),
      });
      const data = await res.json();
      if (data.success && data.copilot) {
        setCopilotData(data.copilot);
      } else {
        throw new Error(data.error || 'Failed to generate copilot plan');
      }
    } catch (err) {
      console.warn('Copilot fetch fallback:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Generate initial plan on mount
    fetchTradePlan();
  }, []);

  const [broadcastStatus, setBroadcastStatus] = useState(null);

  const bias = copilotData?.bias || 'BUY';
  const isBull = bias.includes('BUY');
  const isBear = bias.includes('SELL');

  const handleBroadcastTelegram = async () => {
    if (!copilotData) return;
    setBroadcastStatus('sending');
    try {
      const gold = prices['GC=F'] || {};
      const spot = gold.price || '2350';
      const res = await fetch('/api/ai/broadcast-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradePlan: {
            bias: copilotData.bias,
            entryZone: copilotData.entryZone,
            stopLoss: copilotData.stopLoss,
            takeProfit1: copilotData.target1,
            takeProfit2: copilotData.target2,
            riskReward: copilotData.riskReward,
            confidence: copilotData.confidence,
            narrative: copilotData.macroThesis,
            preEventPlaybook: copilotData.hawkishPlaybook ? `Hawkish: ${copilotData.hawkishPlaybook} | Dovish: ${copilotData.dovishPlaybook}` : '',
          },
          spotPrice: spot,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastStatus('sent');
      } else {
        setBroadcastStatus('error');
      }
    } catch (_) {
      setBroadcastStatus('error');
    }
    setTimeout(() => setBroadcastStatus(null), 3500);
  };

  const handleVoiceSquawk = () => {
    if (!copilotData) return;
    const speech = `Institutional Gold Alert. Recommendation: ${copilotData.bias}. Optimal entry: ${copilotData.entryZone}. Invalidation stop: ${copilotData.stopLoss}. Target: ${copilotData.target1}. ${copilotData.macroThesis}`;
    speakSquawk(speech);
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Sparkles size={15} />
          AI TRADE COPILOT & SCENARIO PLAYBOOK
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Voice Squawk Button */}
          <button
            className="filter-pill"
            onClick={handleVoiceSquawk}
            title="Read out signal with AI Voice Squawk"
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <span>🔊 SQUAWK</span>
          </button>

          {/* Telegram VIP Broadcaster Button */}
          <button
            className="filter-pill"
            onClick={handleBroadcastTelegram}
            disabled={broadcastStatus === 'sending'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              borderColor: broadcastStatus === 'sent' ? 'var(--bull-glow)' : 'var(--border-gold)',
              color: broadcastStatus === 'sent' ? 'var(--bull-glow)' : 'var(--gold-glow)',
            }}
          >
            <span>
              {broadcastStatus === 'sending'
                ? 'BROADCASTING...'
                : broadcastStatus === 'sent'
                ? '✓ BROADCASTED TO VIP'
                : broadcastStatus === 'error'
                ? 'TELEGRAM UNCONFIGURED'
                : '✈ BROADCAST VIP'}
            </span>
          </button>

          {/* Refresh Button */}
          <button
            className="filter-pill"
            onClick={fetchTradePlan}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={12} className={loading ? 'spin-icon' : ''} />
            <span>{loading ? 'ANALYZING...' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {copilotData ? (
        <div className="copilot-grid">
          {/* Left Column: Trade Setup Card */}
          <div className="copilot-setup-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                  INSTITUTIONAL STRATEGY
                </span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                  {copilotData.strategy || 'Momentum Breakout & Liquidity Sweep'}
                </div>
              </div>

              {/* Bias Badge */}
              <div
                className={`confluence-verdict-badge ${isBull ? 'bull' : isBear ? 'bear' : 'neutral'}`}
                style={{ fontSize: '12px', padding: '4px 12px' }}
              >
                <span>{bias.replace('_', ' ')}</span>
                {copilotData.confidence && <span>({copilotData.confidence}%)</span>}
              </div>
            </div>

            {/* Macro Confluence Thesis */}
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                lineHeight: '1.5',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '2px solid var(--gold-primary)',
              }}
            >
              {copilotData.macroThesis}
            </div>

            {/* Execution Levels Grid */}
            <div className="setup-levels-grid">
              <div className="setup-level-box">
                <span className="setup-level-label">ENTRY ZONE</span>
                <span className="setup-level-val" style={{ color: 'var(--cyan-glow)' }}>
                  {copilotData.entryZone || '$2348.00 - $2350.50'}
                </span>
              </div>

              <div className="setup-level-box">
                <span className="setup-level-label">STOP LOSS</span>
                <span className="setup-level-val" style={{ color: 'var(--bear-glow)' }}>
                  {copilotData.stopLoss || '$2342.50'}
                </span>
              </div>

              <div className="setup-level-box">
                <span className="setup-level-label">TARGET 1 (TP1)</span>
                <span className="setup-level-val" style={{ color: 'var(--bull-glow)' }}>
                  {copilotData.target1 || '$2360.00'}
                </span>
              </div>

              <div className="setup-level-box">
                <span className="setup-level-label">TARGET 2 (TP2)</span>
                <span className="setup-level-val" style={{ color: 'var(--gold-glow)' }}>
                  {copilotData.target2 || '$2372.50'}
                </span>
              </div>
            </div>

            {/* Risk:Reward & Invalidation Condition */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-dim)' }}>
                Risk / Reward: <strong style={{ color: '#fff' }}>{copilotData.riskReward || '1:2.6'}</strong>
              </span>
              <span style={{ color: 'var(--text-dim)' }}>
                Provider:{' '}
                <strong style={{ color: 'var(--cyan-glow)' }}>
                  {copilotData.provider || 'Google Gemini'}
                </strong>
              </span>
            </div>

            {copilotData.invalidation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--bear-glow)' }}>
                <AlertOctagon size={13} />
                <span>Invalidation: {copilotData.invalidation}</span>
              </div>
            )}
          </div>

          {/* Right Column: Pre-News Scenario Playbook */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Workflow size={14} />
              PRE-EVENT IF-THEN PLAYBOOK
            </div>

            {/* Bull Scenario */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--bull-glow)', textTransform: 'uppercase' }}>
                UPSIDE BREAKOUT CATALYST
              </div>
              <div style={{ fontSize: '12px', color: '#e5e7eb', lineHeight: '1.4' }}>
                {copilotData.scenarioPlaybook?.bullTrigger ||
                  'DXY breaks below intraday support with 10Y yields declining post-data release. Gold confirms above session pivot.'}
              </div>
            </div>

            {/* Bear Scenario */}
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--bear-glow)', textTransform: 'uppercase' }}>
                DOWNSIDE FLUSH CATALYST
              </div>
              <div style={{ fontSize: '12px', color: '#e5e7eb', lineHeight: '1.4' }}>
                {copilotData.scenarioPlaybook?.bearTrigger ||
                  'Inflation/Jobs data beats expectation, fueling Fed hawkish repricing. Dollar surges and Gold sweeps stop liquidity below Asian low.'}
              </div>
            </div>

            {/* Session Notes */}
            <div
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px',
                fontSize: '11px',
                color: 'var(--text-dim)',
              }}
            >
              Active Session Volatility:{' '}
              <strong style={{ color: 'var(--gold-glow)' }}>{activeSession}</strong>. Orders should be sized according to ATR volatility.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
          {loading ? 'Synthesizing institutional market data with Gemini AI...' : 'No copilot plan generated yet.'}
        </div>
      )}
    </div>
  );
}
