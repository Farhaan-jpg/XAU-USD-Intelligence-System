// client/src/components/MarketStructure.jsx
// Real-time quantitative market structure engine for XAU/USD
// Synthesizes live price momentum, DXY correlation, US10Y yields, Silver confirmation, and news sentiment

import { useMemo } from 'react';

export default function MarketStructure({ prices = {}, newsFeed = [] }) {
  const analysis = useMemo(() => {
    const gold = prices['GC=F'] || {};
    const dxy = prices['DX-Y.NYB'] || {};
    const us10y = prices['^TNX'] || {};
    const silver = prices['SI=F'] || {};

    const goldChg = parseFloat(gold.change5m || 0);
    const dxyChg = parseFloat(dxy.change5m || 0);
    const us10yChg = parseFloat(us10y.change5m || 0);
    const silverChg = parseFloat(silver.change5m || 0);

    // 1. Technical Momentum Score (-100 to +100)
    let techScore = 0;
    if (goldChg > 0.05) techScore += 50;
    else if (goldChg > 0) techScore += 25;
    else if (goldChg < -0.05) techScore -= 50;
    else if (goldChg < 0) techScore -= 25;

    if (silverChg > 0) techScore += 25;
    else if (silverChg < 0) techScore -= 25;

    // 2. Macro Confluence Score (-100 to +100)
    // DXY inverse correlation: DXY down is bullish for gold, DXY up is bearish
    let macroScore = 0;
    if (dxyChg < -0.02) macroScore += 50;
    else if (dxyChg < 0) macroScore += 25;
    else if (dxyChg > 0.02) macroScore -= 50;
    else if (dxyChg > 0) macroScore -= 25;

    // US10Y yield inverse correlation: yields falling is bullish
    if (us10yChg < 0) macroScore += 50;
    else if (us10yChg > 0) macroScore -= 50;

    // 3. News Sentiment Flow Score (-100 to +100)
    let bullWeight = 0;
    let bearWeight = 0;
    const recentNews = newsFeed.slice(0, 20);

    recentNews.forEach((item) => {
      const weight = item.impact === 'HIGH' ? 3 : item.impact === 'MED' ? 2 : 1;
      if (item.bias === 'BULLISH') bullWeight += weight;
      else if (item.bias === 'BEARISH') bearWeight += weight;
    });

    const totalWeight = bullWeight + bearWeight;
    const sentimentScore = totalWeight > 0
      ? Math.round(((bullWeight - bearWeight) / totalWeight) * 100)
      : 0;

    // 4. Composite Confluence Index (-100 to +100)
    // 40% Macro + 35% Sentiment + 25% Technical
    const compositeScore = Math.round(
      0.4 * macroScore + 0.35 * sentimentScore + 0.25 * techScore
    );

    // Structure Classification
    let structure = 'NEUTRAL';
    let label = 'NEUTRAL / CONSOLIDATION';
    let colorVar = 'var(--neutral-primary)';
    let bgGlow = 'rgba(120, 144, 156, 0.08)';
    let borderColor = 'rgba(120, 144, 156, 0.25)';
    let summaryNote = 'Market consolidating within short-term balance. Watch key breakout levels.';

    if (compositeScore >= 25) {
      structure = 'BULLISH';
      label = compositeScore > 55 ? 'STRONG BULLISH STRUCTURE' : 'BULLISH STRUCTURE';
      colorVar = 'var(--bull-primary)';
      bgGlow = 'rgba(0, 255, 136, 0.08)';
      borderColor = 'rgba(0, 255, 136, 0.3)';
      summaryNote = dxyChg <= 0
        ? 'DXY softening & bullish news flow provide clear upside tailwind. Favor long scalps on dips.'
        : 'Bullish news & bullion momentum outweigh USD resistance. Scalp longs with tight stops.';
    } else if (compositeScore <= -25) {
      structure = 'BEARISH';
      label = compositeScore < -55 ? 'STRONG BEARISH STRUCTURE' : 'BEARISH STRUCTURE';
      colorVar = 'var(--bear-primary)';
      bgGlow = 'rgba(255, 61, 87, 0.08)';
      borderColor = 'rgba(255, 61, 87, 0.3)';
      summaryNote = dxyChg >= 0
        ? 'Dollar strength and yield pressure weighing heavily on XAU/USD. Favor sell rallies.'
        : 'Bearish catalyst flow dominating order books. Watch for rejection at immediate resistance.';
    }

    return {
      structure,
      label,
      score: compositeScore,
      colorVar,
      bgGlow,
      borderColor,
      summaryNote,
      goldPrice: gold.price ? `$${gold.price.toFixed(2)}` : '...',
      goldChg: goldChg.toFixed(3),
      dxyVal: dxy.price ? dxy.price.toFixed(3) : '...',
      dxyChg: dxyChg.toFixed(3),
      us10yVal: us10y.price ? `${us10y.price.toFixed(3)}%` : '...',
      silverVal: silver.price ? `$${silver.price.toFixed(2)}` : '...',
      bullCount: newsFeed.filter((n) => n.bias === 'BULLISH').length,
      bearCount: newsFeed.filter((n) => n.bias === 'BEARISH').length,
      neutralCount: newsFeed.filter((n) => n.bias === 'NEUTRAL').length,
    };
  }, [prices, newsFeed]);

  // Clamp meter progress for 0-100% display
  const meterPercent = Math.min(Math.max(((analysis.score + 100) / 200) * 100, 5), 95);

  return (
    <div
      className="card market-structure-card"
      style={{
        background: `linear-gradient(135deg, ${analysis.bgGlow}, var(--bg-card))`,
        borderColor: analysis.borderColor,
        transition: 'all 0.4s ease',
      }}
    >
      <div className="market-structure-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.2rem' }}>
            {analysis.structure === 'BULLISH' ? '🚀' : analysis.structure === 'BEARISH' ? '🩸' : '⚖️'}
          </span>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}>
              Real-Time Confluence Engine
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1rem',
              fontWeight: 800,
              color: analysis.colorVar,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: analysis.colorVar,
                  boxShadow: `0 0 10px ${analysis.colorVar}`,
                  animation: 'pulse-dot 1.5s ease infinite',
                }}
              />
              {analysis.label}
            </div>
          </div>
        </div>

        {/* Score Pill */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.2rem',
            fontWeight: 700,
            color: analysis.colorVar,
          }}>
            {analysis.score > 0 ? `+${analysis.score}` : analysis.score}%
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}>
            Bias Confluence
          </div>
        </div>
      </div>

      {/* Meter Bar */}
      <div className="structure-meter-container">
        <div className="structure-meter-labels">
          <span style={{ color: 'var(--bear-primary)' }}>BEARISH -100%</span>
          <span style={{ color: 'var(--text-muted)' }}>0 NEUTRAL</span>
          <span style={{ color: 'var(--bull-primary)' }}>BULLISH +100%</span>
        </div>
        <div className="structure-meter-track">
          <div
            className="structure-meter-fill"
            style={{
              left: `${meterPercent}%`,
              background: analysis.colorVar,
              boxShadow: `0 0 12px ${analysis.colorVar}`,
            }}
          />
        </div>
      </div>

      {/* 4 Confluence Factors Grid */}
      <div className="structure-factors-grid">
        <div className="factor-pill">
          <span className="factor-name">💵 DXY (USD)</span>
          <span className="factor-value" style={{
            color: parseFloat(analysis.dxyChg) < 0 ? 'var(--bull-primary)' : parseFloat(analysis.dxyChg) > 0 ? 'var(--bear-primary)' : 'var(--text-primary)'
          }}>
            {analysis.dxyVal} ({analysis.dxyChg}%)
          </span>
          <span className="factor-sub">
            {parseFloat(analysis.dxyChg) < 0 ? '🟢 Tailwinds' : parseFloat(analysis.dxyChg) > 0 ? '🔴 Resistance' : '⚪ Neutral'}
          </span>
        </div>

        <div className="factor-pill">
          <span className="factor-name">📉 US10Y Yields</span>
          <span className="factor-value">
            {analysis.us10yVal}
          </span>
          <span className="factor-sub">
            Benchmark Cost
          </span>
        </div>

        <div className="factor-pill">
          <span className="factor-name">🥈 Silver (XAG)</span>
          <span className="factor-value" style={{
            color: parseFloat(analysis.silverVal.replace('$','')) > 0 ? 'var(--bull-primary)' : 'var(--text-primary)'
          }}>
            {analysis.silverVal}
          </span>
          <span className="factor-sub">
            Metals Sympathy
          </span>
        </div>

        <div className="factor-pill">
          <span className="factor-name">📰 Sentiment Flow</span>
          <span className="factor-value" style={{ color: 'var(--text-primary)' }}>
            🟢{analysis.bullCount} 🔴{analysis.bearCount} ⚪{analysis.neutralCount}
          </span>
          <span className="factor-sub">
            {analysis.bullCount >= analysis.bearCount ? 'Bullish Lead' : 'Bearish Lead'}
          </span>
        </div>
      </div>

      {/* Scalper Insight Banner */}
      <div className="structure-strategy-banner">
        <span style={{ marginRight: 6 }}>💡</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: 1.4 }}>
          <strong style={{ color: 'var(--text-primary)', marginRight: 4 }}>Scalper Edge:</strong>
          {analysis.summaryNote}
        </span>
      </div>
    </div>
  );
}
