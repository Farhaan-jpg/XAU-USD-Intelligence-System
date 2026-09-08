// client/src/components/StatusBar.jsx
// Bottom status bar: engine health, last update time, item counts

export default function StatusBar({ connected, prices, newsFeed, calendarData }) {
  const priceCount = Object.keys(prices).length;
  const nextEvent = calendarData?.nextEvent;

  const now = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });

  return (
    <div className="status-bar">
      <div className="status-bar-item">
        <div className={`status-bar-dot ${connected ? 'active' : 'inactive'}`} />
        {connected ? 'WebSocket LIVE' : 'DISCONNECTED'}
      </div>

      <div className="status-bar-item">
        <div className={`status-bar-dot ${priceCount > 0 ? 'active' : 'warning'}`} />
        Price Engine: {priceCount}/6 instruments
      </div>

      <div className="status-bar-item">
        <div className={`status-bar-dot ${newsFeed.length > 0 ? 'active' : 'warning'}`} />
        News Feed: {newsFeed.length} items · {newsFeed.filter(n => n.impact === 'HIGH').length} HIGH
      </div>

      <div className="status-bar-item">
        <div className="status-bar-dot active" />
        Calendar: {calendarData?.upcoming?.length || 0} events
      </div>

      <div className="status-bar-item">
        <div className="status-bar-dot active" />
        AI: OpenRouter · Claude 3.5 Haiku
      </div>

      <div className="status-bar-item" style={{ marginLeft: 'auto' }}>
        IST {now}
      </div>
    </div>
  );
}
