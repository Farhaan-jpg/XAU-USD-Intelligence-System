// client/src/components/StatusBar.jsx
// Bottom Streaming Ticker & System Health Status Bar

import { ArrowUpRight, ArrowDownRight, Radio, Cpu, Sparkles } from 'lucide-react';

export default function StatusBar({ connected = false, prices = {}, newsFeed = [], aiTelemetry = {} }) {
  const gold = prices['GC=F'] || {};
  const silver = prices['SI=F'] || {};
  const dxy = prices['DX-Y.NYB'] || {};
  const us10y = prices['^TNX'] || {};

  const goldPrice = parseFloat(gold.price || 2350).toFixed(2);
  const silverPrice = parseFloat(silver.price || 30).toFixed(2);
  const gsr = (parseFloat(goldPrice) / parseFloat(silverPrice)).toFixed(1);

  const goldChg = parseFloat(gold.change5m || 0);
  const dxyChg = parseFloat(dxy.change5m || 0);
  const us10yChg = parseFloat(us10y.change5m || 0);

  return (
    <footer className="terminal-footer">
      <div className="footer-ticks">
        <div className="footer-tick-item">
          <span style={{ color: 'var(--gold-glow)', fontWeight: 700 }}>XAU/USD:</span>
          <span>${goldPrice}</span>
          <span style={{ color: goldChg >= 0 ? 'var(--bull-glow)' : 'var(--bear-glow)' }}>
            ({goldChg >= 0 ? '+' : ''}{goldChg.toFixed(2)}%)
          </span>
        </div>

        <div className="footer-tick-item">
          <span style={{ color: 'var(--cyan-glow)', fontWeight: 700 }}>XAG/USD:</span>
          <span>${silverPrice}</span>
        </div>

        <div className="footer-tick-item">
          <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>GSR:</span>
          <span>{gsr}</span>
        </div>

        <div className="footer-tick-item">
          <span style={{ color: '#fff', fontWeight: 700 }}>DXY:</span>
          <span>{dxy.price ? parseFloat(dxy.price).toFixed(2) : '104.80'}</span>
          <span style={{ color: dxyChg >= 0 ? 'var(--bull-glow)' : 'var(--bear-glow)' }}>
            ({dxyChg >= 0 ? '+' : ''}{dxyChg.toFixed(2)}%)
          </span>
        </div>

        <div className="footer-tick-item">
          <span style={{ color: '#fff', fontWeight: 700 }}>US10Y:</span>
          <span>{us10y.price ? `${parseFloat(us10y.price).toFixed(3)}%` : '4.280%'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span>WIRE ITEMS: <strong style={{ color: '#fff' }}>{newsFeed.length}</strong></span>
        <span style={{ color: connected ? 'var(--bull-glow)' : 'var(--bear-glow)' }}>
          ● {connected ? 'WS CONNECTED' : 'OFFLINE'}
        </span>
      </div>
    </footer>
  );
}
