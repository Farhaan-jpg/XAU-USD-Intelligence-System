// client/src/components/StatusBar.jsx
// Institutional Streaming Ticker & System Health Status Bar (Bloomberg Terminal Style)

function StatusBar({ connected = false, prices = {}, newsFeed = [], aiTelemetry = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const silver = prices['SI=F'] || prices['XAGUSD'] || {};
  const dxy = prices['DX-Y.NYB'] || {};
  const us10y = prices['^TNX'] || {};

  const goldPriceNum = parseFloat(gold.price || 0);
  const silverPriceNum = parseFloat(silver.price || 0);
  const goldPrice = goldPriceNum > 0 ? goldPriceNum.toFixed(2) : '--';
  const silverPrice = silverPriceNum > 0 ? silverPriceNum.toFixed(2) : '--';
  const gsr = (goldPriceNum > 0 && silverPriceNum > 0) ? (goldPriceNum / silverPriceNum).toFixed(1) : '66.0';

  const goldChg = parseFloat(gold.change5m || gold.changeDay || 0);
  const dxyChg = parseFloat(dxy.change5m || dxy.changeDay || 0);

  return (
    <footer className="terminal-footer">
      <div className="footer-ticks">
        <div className="footer-tick-item">
          <span style={{ color: 'var(--brand-gold)', fontWeight: 600 }}>XAU/USD:</span>
          <span>${goldPrice}</span>
          <span style={{ color: goldChg >= 0 ? 'var(--bull-primary)' : 'var(--bear-primary)' }}>
            ({goldChg >= 0 ? '+' : ''}{goldChg.toFixed(2)}%)
          </span>
        </div>

        <div className="footer-tick-item">
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>XAG/USD:</span>
          <span>${silverPrice}</span>
        </div>

        <div className="footer-tick-item">
          <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>GSR:</span>
          <span>{gsr}</span>
        </div>

        <div className="footer-tick-item">
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>DXY:</span>
          <span>{dxy.price ? parseFloat(dxy.price).toFixed(2) : '104.80'}</span>
          <span style={{ color: dxyChg >= 0 ? 'var(--bull-primary)' : 'var(--bear-primary)' }}>
            ({dxyChg >= 0 ? '+' : ''}{dxyChg.toFixed(2)}%)
          </span>
        </div>

        <div className="footer-tick-item">
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>US10Y:</span>
          <span>{us10y.price ? `${parseFloat(us10y.price).toFixed(3)}%` : '4.280%'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>WIRE: <strong style={{ color: 'var(--text-main)' }}>{newsFeed.length}</strong></span>
        <span style={{ color: connected ? 'var(--bull-primary)' : 'var(--bear-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className={`status-dot ${connected ? 'online' : ''}`} />
          <span>{connected ? 'WS LIVE' : 'OFFLINE'}</span>
        </span>
      </div>
    </footer>
  );
}

export default memo(StatusBar);
