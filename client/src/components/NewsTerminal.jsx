// client/src/components/NewsTerminal.jsx
// Real-Time Financial & Macro Wire with Live Search, Pinning/Bookmarks, and CSV Export

import { useState, useMemo, useEffect, memo } from 'react';
import { Newspaper, Copy, Check, Volume2, ExternalLink, Search, Bookmark, BookmarkCheck, Download, X } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

const PINNED_STORAGE_KEY = 'xauusd_pinned_news';

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

function NewsTerminal({ newsFeed = [] }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'BULLISH' | 'BEARISH' | 'GEO' | 'PINNED'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [squawkingId, setSquawkingId] = useState(null);
  const [tick, setTick] = useState(0);

  // Load pinned news item IDs from localStorage
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(PINNED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  // Save pinned IDs
  const handleTogglePin = (key) => {
    setPinnedIds((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  // Auto-tick every 15 seconds to update relative times
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  // Filter & Search Logic
  const filteredNews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return newsFeed
      .filter((item) => {
        const itemKey = item.id || item.guid || item.headline || item.title;

        // Filter category
        if (filter === 'PINNED') {
          if (!pinnedIds.includes(itemKey)) return false;
        } else if (filter === 'HIGH') {
          if (item.impact !== 'HIGH') return false;
        } else if (filter === 'BULLISH') {
          if (item.bias !== 'BULLISH') return false;
        } else if (filter === 'BEARISH') {
          if (item.bias !== 'BEARISH') return false;
        } else if (filter === 'GEO') {
          const text = `${item.headline || item.title || ''} ${item.summary || ''}`.toLowerCase();
          const isGeo = ['war', 'missile', 'strike', 'iran', 'israel', 'houthi', 'escalat', 'sanctions'].some((kw) =>
            text.includes(kw)
          );
          if (!isGeo) return false;
        }

        // Search text
        if (query) {
          const headline = (item.headline || item.title || '').toLowerCase();
          const summary = (item.summary || '').toLowerCase();
          const source = (item.source || '').toLowerCase();
          return headline.includes(query) || summary.includes(query) || source.includes(query);
        }

        return true;
      })
      .sort((a, b) => {
        // Pinned items bubble to top if not in PINNED filter
        const aKey = a.id || a.guid || a.headline || a.title;
        const bKey = b.id || b.guid || b.headline || b.title;
        const aPinned = pinnedIds.includes(aKey);
        const bPinned = pinnedIds.includes(bKey);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
  }, [newsFeed, filter, searchQuery, pinnedIds]);

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

  // Export news wire to CSV
  const handleExportCSV = () => {
    if (filteredNews.length === 0) return;

    const escapeCsv = (str) => {
      if (!str) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const headers = ['"Date (UTC)"', '"Source"', '"Impact"', '"Bias"', '"Relevance Score"', '"Headline"', '"Summary"', '"URL"'];
    const rows = filteredNews.map((item) => [
      escapeCsv(item.publishedAt ? new Date(item.publishedAt).toISOString() : ''),
      escapeCsv(item.source || 'Wire'),
      escapeCsv(item.impact || 'MED'),
      escapeCsv(item.bias || 'NEUTRAL'),
      escapeCsv(item.relevanceScore || 0),
      escapeCsv(item.headline || item.title || ''),
      escapeCsv(item.summary || ''),
      escapeCsv(item.link || item.url || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `XAUUSD_News_Wire_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filters = [
    { id: 'ALL', label: `ALL (${newsFeed.length})` },
    { id: 'HIGH', label: 'HIGH IMPACT' },
    { id: 'BULLISH', label: 'BULLISH' },
    { id: 'BEARISH', label: 'BEARISH' },
    { id: 'GEO', label: 'GEOPOLITICAL' },
    { id: 'PINNED', label: `PINNED (${pinnedIds.length})` },
  ];

  return (
    <div className="panel-card panel-card-flex" style={{ height: '100%' }}>
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <span className="panel-title">
          <Newspaper size={13} />
          REAL-TIME FINANCIAL &amp; MACRO WIRE
        </span>

        {/* Filter Pills & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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

          <button
            onClick={handleExportCSV}
            className="filter-pill"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Export filtered news wire to CSV"
          >
            <Download size={11} />
            CSV
          </button>
        </div>
      </div>

      {/* Live Search Bar */}
      <div style={{ padding: '0 12px 8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search headlines, CPI, Powell, central banks, tariffs, Middle East..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '28px',
              padding: '0 28px 0 28px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '11px',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn-ghost-icon"
              style={{ position: 'absolute', right: '4px', width: '20px', height: '20px' }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* News Feed Chronological List */}
      <div className="news-feed-container">
        {filteredNews.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No news matching active filter or search query. Listening for real-time institutional feeds...
          </div>
        ) : (
          filteredNews.map((item) => {
            const headline = item.headline || item.title || '';
            const sourceUrl = item.link || item.url || null;
            const isHigh = item.impact === 'HIGH';
            const isMed = item.impact === 'MED';
            const isBull = item.bias === 'BULLISH';
            const isBear = item.bias === 'BEARISH';
            const itemKey = item.id || item.guid || headline;
            const isPinned = pinnedIds.includes(itemKey);

            return (
              <div
                key={itemKey}
                className={`news-row-item ${isHigh ? 'high-impact' : ''}`}
                style={isPinned ? { borderLeft: '3px solid var(--gold-primary)', background: 'rgba(245, 158, 11, 0.03)' } : {}}
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
                    {isPinned && (
                      <span
                        style={{
                          fontSize: '8px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: '2px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: 'var(--gold-primary)',
                        }}
                      >
                        PINNED
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span
                      style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', cursor: 'default' }}
                      title={item.publishedAt ? new Date(item.publishedAt).toUTCString() : ''}
                    >
                      {formatTimeAgo(item.publishedAt)}
                    </span>

                    {/* Bookmark / Pin Button */}
                    <button
                      className="btn-ghost-icon"
                      style={{ width: '22px', height: '22px' }}
                      onClick={() => handleTogglePin(itemKey)}
                      title={isPinned ? 'Unpin headline' : 'Pin to top'}
                    >
                      {isPinned ? (
                        <BookmarkCheck size={11} style={{ color: 'var(--gold-primary)' }} />
                      ) : (
                        <Bookmark size={11} style={{ opacity: 0.6 }} />
                      )}
                    </button>

                    {/* Source link icon — only shown when URL is available */}
                    {sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost-icon"
                        style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                        title={`Open source article — ${item.source || 'Publisher'}`}
                      >
                        <ExternalLink size={11} style={{ color: 'var(--cyan-primary)', opacity: 0.75 }} />
                      </a>
                    )}

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

                {/* Headline — clickable link if source URL exists, plain text otherwise */}
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-headline-link"
                    title={`Read full article — ${item.source || 'Source'}`}
                  >
                    {headline}
                  </a>
                ) : (
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)', lineHeight: '1.4' }}>
                    {headline}
                  </div>
                )}

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
        <span>STREAMING DISPATCH · CLICK HEADLINE TO READ SOURCE</span>
        <span>{filteredNews.length} WIRE HEADLINES</span>
      </div>
    </div>
  );
}

export default memo(NewsTerminal);
