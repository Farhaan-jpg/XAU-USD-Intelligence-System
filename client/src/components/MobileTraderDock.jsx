// client/src/components/MobileTraderDock.jsx
// Sticky Bottom Execution Dock for Mobile Trader View
// Provides frozen 48px touch-target SELL/BUY actions with live bid/ask and lot sizing

import { useState } from 'react';
import { TrendingUp, TrendingDown, Check, Zap } from 'lucide-react';
import { playChime } from '../utils/audioAlerts';

export default function MobileTraderDock({ prices = {} }) {
  const [selectedLot, setSelectedLot] = useState('0.10');
  const [lastExecuted, setLastExecuted] = useState(null);

  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);
  const bid = gold.bid ? parseFloat(gold.bid).toFixed(2) : spotPrice > 0 ? (spotPrice - 0.20).toFixed(2) : '--';
  const ask = gold.ask ? parseFloat(gold.ask).toFixed(2) : spotPrice > 0 ? (spotPrice + 0.20).toFixed(2) : '--';

  const handleExecute = (side) => {
    playChime('flash');
    setLastExecuted({
      side,
      lot: selectedLot,
      price: side === 'BUY' ? ask : bid,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
    setTimeout(() => setLastExecuted(null), 2500);
  };

  const lotOptions = ['0.01', '0.05', '0.10', '0.50', '1.00'];

  return (
    <div className="mobile-execution-dock">
      {lastExecuted && (
        <div className="mobile-execution-toast">
          <Check size={12} style={{ color: 'var(--bull-primary)' }} />
          <span>
            Simulated {lastExecuted.side} {lastExecuted.lot} Lot @ ${lastExecuted.price} ({lastExecuted.time})
          </span>
        </div>
      )}

      <div className="mobile-dock-row">
        {/* SELL Button (48px touch target) */}
        <button
          type="button"
          className="mobile-btn-sell"
          onClick={() => handleExecute('SELL')}
          aria-label="Sell Gold"
        >
          <div className="btn-side-title">
            <TrendingDown size={14} />
            <span>SELL</span>
          </div>
          <span className="btn-price-quote">${bid}</span>
        </button>

        {/* Quick Lot Selector (44px touch target) */}
        <div className="mobile-lot-selector-wrap">
          <label className="mobile-lot-label">LOT SIZE</label>
          <select
            className="mobile-lot-select"
            value={selectedLot}
            onChange={(e) => setSelectedLot(e.target.value)}
          >
            {lotOptions.map((lot) => (
              <option key={lot} value={lot}>
                {lot}
              </option>
            ))}
          </select>
        </div>

        {/* BUY Button (48px touch target) */}
        <button
          type="button"
          className="mobile-btn-buy"
          onClick={() => handleExecute('BUY')}
          aria-label="Buy Gold"
        >
          <div className="btn-side-title">
            <TrendingUp size={14} />
            <span>BUY</span>
          </div>
          <span className="btn-price-quote">${ask}</span>
        </button>
      </div>
    </div>
  );
}
