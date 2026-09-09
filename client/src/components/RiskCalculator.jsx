// client/src/components/RiskCalculator.jsx
// Institutional Gold Lot Size & Risk Management Calculator

import { useState, useMemo } from 'react';
import { Calculator, DollarSign, ShieldCheck } from 'lucide-react';

export default function RiskCalculator({ currentGoldPrice = 2350 }) {
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1.0);
  const [stopLossDistance, setStopLossDistance] = useState(5.0); // $5.00 distance

  const results = useMemo(() => {
    const bal = parseFloat(accountBalance) || 0;
    const riskPct = parseFloat(riskPercent) || 0;
    const slDist = parseFloat(stopLossDistance) || 0.1;

    const dollarRisk = bal * (riskPct / 100);
    // 1 standard lot = 100 oz. A $1.00 move = $100.
    // Lot Size = Dollar Risk / (Stop Loss Distance in $ * 100)
    const lotSize = slDist > 0 ? dollarRisk / (slDist * 100) : 0;
    const pipValue = lotSize * 10; // per 10 cents ($0.10) move

    return {
      dollarRisk: dollarRisk.toFixed(2),
      lotSize: lotSize.toFixed(2),
      microLots: (lotSize * 100).toFixed(0),
      pipValue: pipValue.toFixed(2),
      target2R: (dollarRisk * 2).toFixed(2),
      target3R: (dollarRisk * 3).toFixed(2),
    };
  }, [accountBalance, riskPercent, stopLossDistance]);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <Calculator size={15} />
          GOLD LOT SIZE & RISK CALCULATOR (100 OZ CONTRACTS)
        </span>
        <span className="telemetry-badge" style={{ fontSize: '10px' }}>
          PRO CAPITAL DEFENSE
        </span>
      </div>

      <div className="calc-inputs-grid">
        <div className="calc-field">
          <label className="calc-label">ACCOUNT BALANCE ($)</label>
          <input
            type="number"
            className="calc-input"
            value={accountBalance}
            onChange={(e) => setAccountBalance(e.target.value)}
            step="500"
          />
        </div>

        <div className="calc-field">
          <label className="calc-label">RISK PERCENT (%)</label>
          <input
            type="number"
            className="calc-input"
            value={riskPercent}
            onChange={(e) => setRiskPercent(e.target.value)}
            step="0.25"
            max="10"
          />
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
    </div>
  );
}
