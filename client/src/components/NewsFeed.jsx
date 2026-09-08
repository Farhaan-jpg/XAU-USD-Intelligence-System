// client/src/components/NewsFeed.jsx
// Real-time AI-scored news feed with full card expansion, direct article link, and filters

import { useState, useRef, useEffect } from 'react';

const BIAS_EMOJI = { BULLISH: '🟢', BEARISH: '🔴', NEUTRAL: '⚪' };

function timeAgo(dateStr) {
  if (!dateStr) return 'just now';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return 'recent';
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatFullTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.toUTCString().slice(0, 22)} UTC`;
}

function NewsItem({ item, isNew }) {
  const [expanded, setExpanded] = useState(false);

  // Fallback description if feed item has no body summary
  const displaySummary = item.summary && item.summary.trim().length > 0
    ? item.summary
    : `Direct market update from ${item.source || 'Financial Wire'}. This event carries implications for US monetary expectations, dollar liquidity, and precious metals safe-haven flows.`;

  return (
    <div
      className={`news-item ${item.bias} ${item.impact} ${expanded ? 'expanded' : ''}`}
      style={{
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Clickable Header Row */}
      <div
        className="news-item-header"
        onClick={() => setExpanded((prev) => !prev)}
        style={{ userSelect: 'none' }}
      >
        <div className="news-item-title">
          {isNew && (
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--gold-primary)',
                marginRight: 8,
                animation: 'pulse-dot 1.8s ease infinite',
                verticalAlign: 'middle',
                boxShadow: '0 0 8px var(--gold-primary)',
              }}
            />
          )}
          {item.headline || item.title}
        </div>

        <div className="news-badges">
          <span className={`badge badge-impact-${item.impact}`}>
            {item.impact === 'HIGH' ? '⚡ ' : ''}{item.impact}
          </span>
          <span className={`badge badge-${item.bias}`}>
            {BIAS_EMOJI[item.bias]} {item.bias}
          </span>
          <button
            type="button"
            className="expand-toggle-btn"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            style={{
              background: expanded ? 'rgba(245, 166, 35, 0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${expanded ? 'var(--gold-primary)' : 'var(--border-subtle)'}`,
              color: expanded ? 'var(--gold-primary)' : 'var(--text-muted)',
              borderRadius: 4,
              padding: '2px 7px',
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              marginLeft: 4,
              transition: 'all 0.2s ease',
            }}
          >
            {expanded ? '▲ Close' : '▼ Details'}
          </button>
        </div>
      </div>

      {/* Reasoning Snippet (visible even when collapsed for quick trading glance) */}
      {item.reasoning && !expanded && (
        <div
          className="news-item-reasoning"
          onClick={() => setExpanded(true)}
          style={{ opacity: 0.85 }}
        >
          💡 {item.reasoning}
        </div>
      )}

      {/* Compact Footer (when collapsed) */}
      {!expanded && (
        <div className="news-item-footer" onClick={() => setExpanded((prev) => !prev)}>
          <span className="news-source">
            📰 {item.source || 'Financial Wire'}
            {item.model && (
              <span style={{ marginLeft: 6, opacity: 0.7, color: 'var(--text-muted)' }}>
                · {item.model.includes('fallback') ? 'Keyword-Engine' : 'AI Scored'}
              </span>
            )}
          </span>
          <span className="news-time">
            {timeAgo(item.processedAt || item.publishedAt)}
          </span>
        </div>
      )}

      {/* ─── Fully Expanded Details View ───────────────────────────────── */}
      {expanded && (
        <div
          className="news-expanded-panel"
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid var(--border-subtle)',
            animation: 'fadeIn 0.25s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Detailed Reasoning Box */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            borderLeft: `3px solid ${item.bias === 'BULLISH' ? 'var(--bull-primary)' : item.bias === 'BEARISH' ? 'var(--bear-primary)' : 'var(--neutral-primary)'}`,
            padding: '8px 12px',
            borderRadius: '0 6px 6px 0',
            marginBottom: 10,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              color: 'var(--gold-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 3,
            }}>
              Trading Signal Analysis & Rationale
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
              {item.reasoning || 'No specific catalyst detected. Monitor volume at key support/resistance levels.'}
            </div>
          </div>

          {/* Full Summary Description */}
          <div style={{
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            marginBottom: 12,
            background: 'rgba(255,255,255,0.02)',
            padding: '8px 10px',
            borderRadius: 6,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              Article Summary
            </div>
            {displaySummary}
          </div>

          {/* Meta details bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.64rem',
            color: 'var(--text-muted)',
            paddingBottom: 10,
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: 10,
          }}>
            <div>
              <span style={{ color: 'var(--gold-muted)' }}>Source:</span> {item.source || 'Financial News'}
            </div>
            {item.publishedAt && (
              <div>
                <span style={{ color: 'var(--gold-muted)' }}>Published:</span> {formatFullTime(item.publishedAt)}
              </div>
            )}
            {item.relevanceScore !== undefined && (
              <div>
                <span style={{ color: 'var(--gold-muted)' }}>Relevance:</span> {item.relevanceScore}/10
              </div>
            )}
            <div>
              <span style={{ color: 'var(--gold-muted)' }}>Engine:</span> {item.model || 'Scorer'}
            </div>
          </div>

          {/* Action Row: PROMINENT READ ARTICLE BUTTON */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            paddingTop: 2,
          }}>
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="news-direct-link-btn"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.2), rgba(245, 166, 35, 0.08))',
                  border: '1px solid var(--gold-primary)',
                  borderRadius: 6,
                  color: 'var(--gold-bright)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  letterSpacing: '0.04em',
                  boxShadow: '0 2px 10px rgba(245, 166, 35, 0.15)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>🌐</span> Read Full Article on {item.source || 'Publisher'} ↗
              </a>
            ) : (
              <span style={{
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}>
                External link not provided by feed
              </span>
            )}

            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                cursor: 'pointer',
                padding: '6px 10px',
              }}
            >
              ▲ Collapse Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewsFeed({ newsFeed = [] }) {
  const [filter, setFilter] = useState('ALL');
  const [impactFilter, setImpactFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef(null);
  const prevLengthRef = useRef(0);
  const [newItemIds, setNewItemIds] = useState(new Set());

  // Track newly arrived items
  useEffect(() => {
    if (newsFeed.length > prevLengthRef.current) {
      const incoming = newsFeed.slice(0, newsFeed.length - prevLengthRef.current);
      const ids = new Set(incoming.map((n) => n.id));
      setNewItemIds(ids);
      setTimeout(() => setNewItemIds(new Set()), 12000);
    }
    prevLengthRef.current = newsFeed.length;
  }, [newsFeed]);

  const filtered = newsFeed.filter((item) => {
    const biasMatch = filter === 'ALL' || item.bias === filter;
    const impactMatch = impactFilter === 'ALL' || item.impact === impactFilter;
    const q = searchQuery.toLowerCase().trim();
    const searchMatch = !q || (
      (item.headline || item.title || '').toLowerCase().includes(q) ||
      (item.reasoning || '').toLowerCase().includes(q) ||
      (item.source || '').toLowerCase().includes(q) ||
      (item.summary || '').toLowerCase().includes(q)
    );
    return biasMatch && impactMatch && searchMatch;
  });

  const counts = {
    HIGH: newsFeed.filter((n) => n.impact === 'HIGH').length,
    BULLISH: newsFeed.filter((n) => n.bias === 'BULLISH').length,
    BEARISH: newsFeed.filter((n) => n.bias === 'BEARISH').length,
  };

  return (
    <div className="card news-feed">
      {/* Card Header */}
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon">📡</span>
          News & Sentiment Engine
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div className="card-badge">{newsFeed.length} items</div>
          {counts.HIGH > 0 && (
            <div className="card-badge" style={{
              background: 'rgba(255,61,87,0.12)',
              color: 'var(--bear-bright)',
              borderColor: 'rgba(255,61,87,0.25)',
              animation: 'impact-glow 2s ease infinite',
            }}>
              {counts.HIGH} HIGH
            </div>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <input
          type="text"
          placeholder="🔍 Search news, Fed, CPI, Powell, oil..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--border-card)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: '0.72rem',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
          }}
        />
      </div>

      {/* Filter bar */}
      <div className="news-filter-bar">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginRight: 4 }}>
          BIAS:
        </span>
        {['ALL', 'BULLISH', 'BEARISH', 'NEUTRAL'].map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-btn ${filter === f ? (f === 'BULLISH' ? 'bull-active' : f === 'BEARISH' ? 'bear-active' : 'active') : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'BULLISH' ? '🟢' : f === 'BEARISH' ? '🔴' : f === 'NEUTRAL' ? '⚪' : ''} {f}
          </button>
        ))}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginLeft: 8, marginRight: 4 }}>
          IMP:
        </span>
        {['ALL', 'HIGH', 'MED', 'LOW'].map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-btn ${impactFilter === f ? 'active' : ''}`}
            onClick={() => setImpactFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* News list */}
      <div className="news-list" ref={listRef}>
        {filtered.length === 0 ? (
          <div className="news-empty">
            <div className="news-empty-icon">📡</div>
            <div className="news-empty-text">
              {newsFeed.length === 0
                ? 'Scanning financial feeds...\nAI sentiment analysis active'
                : 'No news items match your filter criteria'}
            </div>
          </div>
        ) : (
          filtered.map((item) => (
            <NewsItem
              key={item.id}
              item={item}
              isNew={newItemIds.has(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
