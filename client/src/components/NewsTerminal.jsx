import { useState, useMemo, useEffect } from 'react';
import { Newspaper, Copy, Check, Volume2 } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0 || isNaN(diffMs)) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NewsTerminal({ newsFeed = [] }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'BULLISH' | 'BEARISH' | 'GEO'
  const [copiedId, setCopiedId] = useState(null);
  const [squawkingId, setSquawkingId] = useState(null);
  const [tick, setTick] = useState(0);

  // Auto-tick every 15 seconds to update relative times
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const filteredNews = useMemo(() => {
    return newsFeed.filter((item) => {
      if (filter === 'ALL') return true;
      if (filter === 'HIGH') return item.impact === 'HIGH';
      if (filter === 'BULLISH') return item.bias === 'BULLISH';
      if (filter === 'BEARISH') return item.bias === 'BEARISH';
      if (filter === 'GEO') {
        const text = `${item.headline || item.title || ''} ${item.summary || ''}`.toLowerCase();
        return ['war', 'missile', 'strike', 'iran', 'israel', 'houthi', 'escalat', 'sanctions'].some((kw) =>
          text.includes(kw)
        );
      }
      return true;
    });
  }, [newsFeed, filter]);

  const handleCopy = (item) => {
    const text = `[${item.impact || 'MED'}] ${item.headline || item.title}\nSignal: ${item.bias || 'NEUTRAL'} | ${item.reasoning || ''}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(item.id || item.guid || item.headline);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleManualSquawk = (item) => {
    const key = item.id || item.guid || item.headline;
    setSquawkingId(key);
    speakSquawk(`${item.headline || item.title}. Bias: ${item.bias || 'Neutral'}. ${item.reasoning || ''}`, {
      category: 'news',
      preChime: 'flash',
      priority: true,
      cooldownSeconds: 0,
    });
    setTimeout(() => setSquawkingId(null), 2000);
  };

  const filters = [
    { id: 'ALL', label: `ALL (${newsFeed.length})` },
    { id: 'HIGH', label: 'HIGH IMPACT' },
    { id: 'BULLISH', label: 'BULLISH' },
    { id: 'BEARISH', label: 'BEARISH' },
    { id: 'GEO', label: 'GEOPOLITICAL' },
  ];

  return (
    <div className="panel-card panel-card-flex" style={{ height: '100%' }}>
      <div className="panel-header">
        <span className="panel-title">
          <Newspaper size={13} />
          REAL-TIME FINANCIAL & MACRO WIRE
        </span>

        <div className="filter-pills-row">
          {filters.map((f) => (
            <button
              key={f.id}
              className={`filter-pill ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* News Feed Chronological List */}
      <div className="news-feed-container">
        {filteredNews.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No news matching active filter. Listening for real-time institutional feeds...
          </div>
        ) : (
          filteredNews.map((item) => {
            const headline = item.headline || item.title || '';
            const isHigh = item.impact === 'HIGH';
            const isMed = item.impact === 'MED';
            const isBull = item.bias === 'BULLISH';
            const isBear = item.bias === 'BEARISH';
            const itemKey = item.id || item.guid || headline;

            return (
              <div
                key={itemKey}
                className={`news-row-item ${isHigh ? 'high-impact' : ''}`}
              >
                {/* Meta Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`impact-dot ${isHigh ? 'high' : isMed ? 'med' : 'low'}`} />
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      {item.source || 'Wire'}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: isBull ? 'var(--bull-bg)' : isBear ? 'var(--bear-bg)' : 'rgba(255,255,255,0.04)',
                        color: isBull ? 'var(--bull-primary)' : isBear ? 'var(--bear-primary)' : 'var(--text-dim)',
                      }}
                    >
                      {item.bias || 'NEUTRAL'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span
                      style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', cursor: 'default' }}
                      title={item.publishedAt ? new Date(item.publishedAt).toUTCString() : ''}
                    >
                      {formatTimeAgo(item.publishedAt)}
                    </span>
                    <button
                      className="btn-ghost-icon"
                      style={{ width: '22px', height: '22px' }}
                      onClick={() => handleManualSquawk(item)}
                      title="Audio squawk"
                    >
                      <Volume2 size={11} style={{ color: squawkingId === itemKey ? 'var(--cyan-primary)' : undefined }} />
                    </button>
                    <button
                      className="btn-ghost-icon"
                      style={{ width: '22px', height: '22px' }}
                      onClick={() => handleCopy(item)}
                      title="Copy headline"
                    >
                      {copiedId === itemKey ? <Check size={11} style={{ color: 'var(--bull-primary)' }} /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>

                {/* Headline */}
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)', lineHeight: '1.4' }}>
                  {headline}
                </div>

                {/* AI Reasoning Strip if present */}
                {item.reasoning && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      borderLeft: '2px solid rgba(255,255,255,0.08)',
                      paddingLeft: '6px',
                      marginTop: '2px',
                    }}
                  >
                    {item.reasoning}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '6px',
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>STREAMING DISPATCH</span>
        <span>{filteredNews.length} WIRE HEADLINES</span>
      </div>
    </div>
  );
}
