// client/src/components/RiskCalculator.jsx
// Institutional Gold Lot Size & Risk Management Calculator with Prop Firm Modes

import { useState, useMemo } from 'react';
import { Calculator, DollarSign, ShieldCheck, Award } from 'lucide-react';
import { PROP_FIRM_PROFILES } from './TradeExecutionCopilot';

export default function RiskCalculator({ currentGoldPrice = 2350 }) {
  const [selectedPropFirm, setSelectedPropFirm] = useState('FTMO');
  const [accountBalance, setAccountBalance] = useState(100000);
  const [riskPercent, setRiskPercent] = useState(0.5);
  const [stopLossDistance, setStopLossDistance] = useState(5.0); // $5.00 distance

  const activeFirm = PROP_FIRM_PROFILES.find((f) => f.id === selectedPropFirm) || PROP_FIRM_PROFILES[0];

  const handlePropFirmChange = (firmId) => {
    setSelectedPropFirm(firmId);
    const firm = PROP_FIRM_PROFILES.find((f) => f.id === firmId) || PROP_FIRM_PROFILES[0];
    setRiskPercent(firm.recommendedRiskPct);
    if (!firm.defaultBalances.includes(accountBalance)) {
      setAccountBalance(firm.defaultBalances[firm.defaultBalances.length > 3 ? 3 : 0] || 100000);
    }
  };

  const results = useMemo(() => {
    const bal = parseFloat(accountBalance) || 0;
    const riskPct = parseFloat(riskPercent) || 0;
    const slDist = parseFloat(stopLossDistance) || 0.1;

    const dollarRisk = bal * (riskPct / 100);
    // 1 standard lot = 100 oz. A $1.00 move = $100.
    // Lot Size = Dollar Risk / (Stop Loss Distance in $ * 100)
    const lotSize = slDist > 0 ? dollarRisk / (slDist * 100) : 0;
    const pipValue = lotSize * 10; // per 10 cents ($0.10) move

    const maxDailyLoss = bal * (activeFirm.dailyLossPct / 100);
    const maxTotalLoss = bal * (activeFirm.maxLossPct / 100);
    const stopOutsAllowed = dollarRisk > 0 ? Math.floor(maxDailyLoss / dollarRisk) : 0;
    const isRiskOverLimit = riskPct > activeFirm.maxSafeRiskPct;

    return {
      dollarRisk: dollarRisk.toFixed(2),
      lotSize: lotSize.toFixed(2),
      microLots: (lotSize * 100).toFixed(0),
      pipValue: pipValue.toFixed(2),
      target2R: (dollarRisk * 2).toFixed(2),
      target3R: (dollarRisk * 3).toFixed(2),
      maxDailyLoss: maxDailyLoss.toFixed(2),
      maxTotalLoss: maxTotalLoss.toFixed(2),
      stopOutsAllowed,
      isRiskOverLimit,
    };
  }, [accountBalance, riskPercent, stopLossDistance, activeFirm]);

  return (
    <div className="panel-card">
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calculator size={15} />
          <span className="panel-title">
            GOLD LOT SIZE & RISK CALCULATOR (100 OZ CONTRACTS)
          </span>
        </div>
        <span
          className="telemetry-badge"
          style={{
            fontSize: '10px',
            color: activeFirm.badgeColor,
            borderColor: activeFirm.badgeColor,
          }}
        >
          {activeFirm.shortName.toUpperCase()} CAPITAL DEFENSE
        </span>
      </div>

      <div className="calc-inputs-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
        <div className="calc-field">
          <label className="calc-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: activeFirm.badgeColor }}>
            <Award size={12} />
            PROP FIRM ACCOUNT
          </label>
          <select
            className="calc-input"
            value={selectedPropFirm}
            onChange={(e) => handlePropFirmChange(e.target.value)}
            style={{ borderColor: activeFirm.badgeColor, fontWeight: 700 }}
          >
            {PROP_FIRM_PROFILES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="calc-field">
          <label className="calc-label">ACCOUNT BALANCE ($)</label>
          <input
            type="number"
            className="calc-input"
            value={accountBalance}
            onChange={(e) => setAccountBalance(e.target.value)}
            step="1000"
          />
        </div>

        <div className="calc-field">
          <label className="calc-label">RISK PERCENT (%)</label>
          <select
            className="calc-input"
            value={riskPercent}
            onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
            style={{
              borderColor: results.isRiskOverLimit ? 'var(--bear-glow)' : undefined,
              color: results.isRiskOverLimit ? 'var(--bear-glow)' : undefined,
              fontWeight: 700,
            }}
          >
            <option value="0.25">0.25% (Ultra Conservative)</option>
            <option value="0.35">0.35% (Funding Pips Safe)</option>
            <option value="0.5">0.5% (Recommended Prop)</option>
            <option value="0.75">0.75% (Moderate Target)</option>
            <option value="1.0">1.0% (Max Prop Cap)</option>
            <option value="1.5">1.5% (Aggressive)</option>
            <option value="2.0">2.0% (Personal Account)</option>
          </select>
        </div>

        <div className="calc-field">
          <label className="calc-label">STOP LOSS DISTANCE ($)</label>
          <input
            type="number"
            className="calc-input"
            value={stopLossDistance}
            onChange={(e) => setStopLossDistance(e.target.value)}
            step="0.5"
          />
        </div>
      </div>

      {/* Calculated Results Ribbon */}
      <div className="calc-result-box">
        <div>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            MAX CASH AT RISK
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bear-glow)', fontFamily: 'var(--font-mono)' }}>
            ${results.dollarRisk}
          </div>
        </div>

        <div style={{ borderLeft: '1px solid var(--border-gold)', borderRight: '1px solid var(--border-gold)', padding: '0 20px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            RECOMMENDED LOT SIZE
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold-glow)', fontFamily: 'var(--font-mono)' }}>
            {results.lotSize} <span style={{ fontSize: '13px' }}>LOTS</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            2R PROFIT POTENTIAL
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bull-glow)', fontFamily: 'var(--font-mono)' }}>
            +${results.target2R}
          </div>
        </div>
      </div>

      {/* Prop Firm Drawdown & Risk Guardrail Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          marginTop: '10px',
        }}
      >
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Daily Loss Limit ({activeFirm.dailyLossPct}%)
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--bear-glow)', fontFamily: 'var(--font-mono)' }}>
            -${parseFloat(results.maxDailyLoss).toLocaleString()}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Max Drawdown ({activeFirm.maxLossPct}%)
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--bear-glow)', fontFamily: 'var(--font-mono)' }}>
            -${parseFloat(results.maxTotalLoss).toLocaleString()}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Allowed Stop-Outs
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 800,
              color: results.stopOutsAllowed >= 6 ? 'var(--bull-glow)' : results.stopOutsAllowed >= 3 ? 'var(--gold-glow)' : 'var(--bear-glow)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {results.stopOutsAllowed} Trades Buffer
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Prop Firm News Rule
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-main)', marginTop: '2px' }}>
            {activeFirm.newsRule}
          </div>
        </div>
      </div>
    </div>
  );
}
