// client/src/components/NewsTerminal.jsx
// Real-Time Multi-Wire News Aggregator with Filter Pills & AI Reasoning

import { useState, useMemo } from 'react';
import { Newspaper, ExternalLink, Copy, Check, Filter, Sparkles, Radio, Volume2 } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export default function NewsTerminal({ newsFeed = [] }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'BULLISH' | 'BEARISH' | 'GEO'
  const [copiedId, setCopiedId] = useState(null);
  const [squawkingId, setSquawkingId] = useState(null);

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
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleManualSquawk = (item) => {
    setSquawkingId(item.id || item.guid || item.headline);
    speakSquawk(`${item.headline || item.title}. Market bias: ${item.bias || 'Neutral'}. ${item.reasoning || ''}`, {
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
          <Newspaper size={15} />
          REAL-TIME FINANCIAL & MACRO WIRE
        </span>

        {/* Filter Pills */}
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

      {/* News Items List */}
      <div className="news-feed-container">
        {filteredNews.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No news matching the current filter. Live news scanner listening for incoming ticks...
          </div>
        ) : (
          filteredNews.map((item) => {
            const headline = item.headline || item.title || '';
            const isHigh = item.impact === 'HIGH';
            const isBull = item.bias === 'BULLISH';
            const isBear = item.bias === 'BEARISH';

            const providerLabel = item.provider || (item.model?.includes('gemini') ? 'Google Gemini' : item.model?.includes('fallback') ? 'Quant Engine' : 'OpenRouter');

            return (
              <div
                key={item.id || item.guid || headline}
                className={`news-card-item ${isHigh ? 'high-impact' : ''}`}
              >
                {/* Meta row */}
                <div className="news-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="news-source-tag">{item.source || 'Wire'}</span>
                    <span
                      className={`event-impact-badge ${
                        item.impact === 'HIGH' ? 'high' : item.impact === 'MED' ? 'med' : 'low'
                      }`}
                    >
                      {item.impact || 'MED'}
                    </span>
                    <span
                      className="event-impact-badge"
                      style={{
                        background: isBull ? 'var(--bull-bg)' : isBear ? 'var(--bear-bg)' : 'rgba(107, 114, 128, 0.15)',
                        color: isBull ? 'var(--bull-glow)' : isBear ? 'var(--bear-glow)' : 'var(--text-dim)',
                        borderColor: isBull ? 'var(--border-bull)' : isBear ? 'var(--border-bear)' : 'transparent',
                      }}
                    >
                      {item.bias || 'NEUTRAL'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="news-time-tag">
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <button
                      className={`btn-icon ${squawkingId === (item.id || item.guid || headline) ? 'active' : ''}`}
                      style={{ width: '24px', height: '24px' }}
                      onClick={() => handleManualSquawk(item)}
                      title="Audio Squawk (Indian Female Voice)"
                    >
                      <Volume2 size={12} style={{ color: squawkingId === (item.id || item.guid || headline) ? 'var(--gold-glow)' : undefined }} />
                    </button>
                    <button
                      className="btn-icon"
                      style={{ width: '24px', height: '24px' }}
                      onClick={() => handleCopy(item)}
                      title="Copy Headline & Signal"
                    >
                      {copiedId === item.id ? <Check size={12} style={{ color: 'var(--bull-glow)' }} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {/* Headline */}
                <a
                  href={item.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-card-title"
                >
                  {headline}
                </a>

                {/* AI Reasoning Box */}
                {item.reasoning && (
                  <div className="news-ai-box">
                    <div style={{ lineHeight: '1.4' }}>{item.reasoning}</div>
                    <div className="news-ai-meta">
                      <span style={{ color: 'var(--gold-glow)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={11} />
                        {providerLabel}
                      </span>
                      {item.relevanceScore && (
                        <span style={{ color: 'var(--text-dim)' }}>Relevance: {item.relevanceScore}/10</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Footer Strip to anchor bottom with zero dead space */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '8px',
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-dim)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Radio size={12} style={{ color: 'var(--bull-glow)' }} />
          <span>SCANNING 9 LIVE WIRE FEEDS</span>
        </span>
        <span>SHOWING {filteredNews.length} ITEMS</span>
      </div>
    </div>
  );
}
