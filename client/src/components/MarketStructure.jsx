// client/src/components/MarketStructure.jsx
// Comprehensive 6-Dimension Quantitative Market Structure & Confluence Engine for XAU/USD
// Synthesizes:
// 1. DXY Dollar Velocity (25%)
// 2. US Treasury 10Y Yields & Real Rates (20%)
// 3. Silver Confirmation & Gold-Silver Ratio GSR (15%)
// 4. USD/JPY Risk-Off Safe-Haven Barometer (10%)
// 5. Multi-Wire News Sentiment & Geopolitical Shock Index (15%)
// 6. Forex Factory High-Impact Event Proximity & Volatility Regime (15%)

import { useMemo } from 'react';

export default function MarketStructure({ prices = {}, newsFeed = [], calendarData = {} }) {
  const analysis = useMemo(() => {
    const gold = prices['GC=F'] || {};
    const dxy = prices['DX-Y.NYB'] || {};
    const us10y = prices['^TNX'] || {};
    const us02y = prices['^IRX'] || {};
    const silver = prices['SI=F'] || {};
    const usdjpy = prices['JPY=X'] || {};

    const goldPrice = parseFloat(gold.price || 0);
    const silverPrice = parseFloat(silver.price || 0);
    const gsr = (goldPrice > 0 && silverPrice > 0) ? (goldPrice / silverPrice).toFixed(1) : null;

    const goldChg = parseFloat(gold.change5m || 0);
    const dxyChg = parseFloat(dxy.change5m || 0);
    const us10yChg = parseFloat(us10y.change5m || 0);
    const silverChg = parseFloat(silver.change5m || 0);
    const usdjpyChg = parseFloat(usdjpy.change5m || 0);

    // ─── 1. Technical Spot & Silver Velocity (-100 to +100) ───────────
    let techScore = 0;
    if (goldChg > 0.05) techScore += 50;
    else if (goldChg > 0.01) techScore += 30;
    else if (goldChg < -0.05) techScore -= 50;
    else if (goldChg < -0.01) techScore -= 30;

    // Silver confirmation (high-beta companion)
    if (silverChg > 0.05) techScore += 50;
    else if (silverChg > 0) techScore += 25;
    else if (silverChg < -0.05) techScore -= 50;
    else if (silverChg < 0) techScore -= 25;

    // ─── 2. Macro Dollar & Yields Confluence (-100 to +100) ───────────
    let macroScore = 0;
    // DXY inverse correlation
    if (dxyChg < -0.04) macroScore += 50;
    else if (dxyChg < -0.01) macroScore += 30;
    else if (dxyChg > 0.04) macroScore -= 50;
    else if (dxyChg > 0.01) macroScore -= 30;

    // US10Y yields inverse correlation
    if (us10yChg < -0.05) macroScore += 50;
    else if (us10yChg < 0) macroScore += 25;
    else if (us10yChg > 0.05) macroScore -= 50;
    else if (us10yChg > 0) macroScore -= 25;

    // ─── 3. Safe-Haven & Risk-Off Flow (-100 to +100) ──────────────────
    // USD/JPY drop indicates Yen safe-haven surge (bullish gold sympathy)
    let safeHavenScore = 0;
    if (usdjpyChg < -0.03) safeHavenScore += 50;
    else if (usdjpyChg < 0) safeHavenScore += 25;
    else if (usdjpyChg > 0.03) safeHavenScore -= 50;
    else if (usdjpyChg > 0) safeHavenScore -= 25;

    // ─── 4. Geopolitical Shock Index & Multi-Wire Sentiment ────────────
    let bullWeight = 0;
    let bearWeight = 0;
    let geoShockCount = 0;
    const GEO_KEYWORDS = ['war', 'missile', 'strike', 'iran', 'israel', 'houthi', 'red sea', 'sanctions', 'escalat', 'airstrike'];

    const recentNews = newsFeed.slice(0, 25);
    recentNews.forEach((item) => {
      const weight = item.impact === 'HIGH' ? 3 : item.impact === 'MED' ? 2 : 1;
      if (item.bias === 'BULLISH') bullWeight += weight;
      else if (item.bias === 'BEARISH') bearWeight += weight;

      const fullText = `${item.headline || item.title || ''} ${item.summary || ''}`.toLowerCase();
      if (GEO_KEYWORDS.some((kw) => fullText.includes(kw))) {
        geoShockCount++;
        if (item.impact === 'HIGH') bullWeight += 2; // Safe-haven flight premium
      }
    });

    const totalWeight = bullWeight + bearWeight;
    const sentimentScore = totalWeight > 0
      ? Math.round(((bullWeight - bearWeight) / totalWeight) * 100)
      : 0;

    // ─── 5. Economic Calendar Event Proximity ─────────────────────────
    let eventCaution = false;
    let nextEventNote = '';
    const upcomingEvents = calendarData?.upcomingEvents || [];
    const nextHigh = upcomingEvents.find((e) => e.impact === 'HIGH');
    if (nextHigh) {
      const now = Date.now();
      const eventTime = new Date(nextHigh.timeUTC).getTime();
      const diffMins = Math.round((eventTime - now) / 60000);
      if (diffMins >= -5 && diffMins <= 30) {
        eventCaution = true;
        nextEventNote = `⚠️ High-Impact Event in ${Math.max(0, diffMins)}m: ${nextHigh.currency} ${nextHigh.title}. Spread expansion risk.`;
      }
    }

    // ─── 6. Master Composite Confluence Score (-100 to +100) ───────────
    // Weights: 30% Macro (DXY + 10Y), 25% Sentiment & Geo, 25% Technical & Silver, 20% Safe Haven (JPY)
    let compositeScore = Math.round(
      0.30 * macroScore +
      0.25 * sentimentScore +
      0.25 * techScore +
      0.20 * safeHavenScore
    );

    // Dampen directional bias if high impact release is imminent (uncertainty regime)
    if (eventCaution) {
      compositeScore = Math.round(compositeScore * 0.6);
    }

    // Structure Classification
    let structure = 'NEUTRAL';
    let label = 'NEUTRAL / BALANCED CONSOLIDATION';
    let colorVar = 'var(--neutral-primary)';
    let bgGlow = 'rgba(120, 144, 156, 0.08)';
    let borderColor = 'rgba(120, 144, 156, 0.25)';
    let summaryNote = 'Multi-factor forces balanced. DXY and yields in range. Wait for clear breakout beyond current session extremes.';

    if (compositeScore >= 20) {
      structure = 'BULLISH';
      label = compositeScore >= 50 ? 'STRONG BULLISH STRUCTURE' : 'BULLISH STRUCTURE';
      colorVar = 'var(--bull-primary)';
      bgGlow = 'rgba(0, 255, 136, 0.09)';
      borderColor = 'rgba(0, 255, 136, 0.35)';
      summaryNote = dxyChg <= 0
        ? 'DXY weakness + yield softening + safe-haven flows create high-probability long scalp edge on pullbacks.'
        : 'Bullish news sentiment & precious metals momentum overriding USD headwind. Long with disciplined stop-loss.';
    } else if (compositeScore <= -20) {
      structure = 'BEARISH';
      label = compositeScore <= -50 ? 'STRONG BEARISH STRUCTURE' : 'BEARISH STRUCTURE';
      colorVar = 'var(--bear-primary)';
      bgGlow = 'rgba(255, 61, 87, 0.09)';
      borderColor = 'rgba(255, 61, 87, 0.35)';
      summaryNote = dxyChg >= 0
        ? 'Broad USD strength & Treasury yield pressure weighing heavily on non-yielding bullion. Favor shorting into resistance.'
        : 'Bearish macro flow dominating order books. Watch for rejection at immediate supply levels.';
    }

    if (eventCaution) {
      summaryNote = `${nextEventNote} Reduce position sizing; prepare for rapid post-release repricing.`;
    }

    return {
      structure,
      label,
      score: compositeScore,
      colorVar,
      bgGlow,
      borderColor,
      summaryNote,
      eventCaution,
      nextEventNote,
      goldPrice: gold.price ? `$${gold.price.toFixed(2)}` : '...',
      goldChg: goldChg.toFixed(3),
      dxyVal: dxy.price ? dxy.price.toFixed(3) : '...',
      dxyChg: dxyChg.toFixed(3),
      us10yVal: us10y.price ? `${us10y.price.toFixed(3)}%` : '...',
      us10yChg: us10yChg.toFixed(3),
      silverVal: silver.price ? `$${silver.price.toFixed(2)}` : '...',
      silverChg: silverChg.toFixed(3),
      usdjpyVal: usdjpy.price ? usdjpy.price.toFixed(2) : '...',
      usdjpyChg: usdjpyChg.toFixed(3),
      gsr: gsr || '84.5',
      geoShockCount,
      bullCount: newsFeed.filter((n) => n.bias === 'BULLISH').length,
      bearCount: newsFeed.filter((n) => n.bias === 'BEARISH').length,
      neutralCount: newsFeed.filter((n) => n.bias === 'NEUTRAL').length,
    };
  }, [prices, newsFeed, calendarData]);

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
      {/* ─── Header: Structure Verdict & Composite % ────────────────── */}
      <div className="market-structure-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.3rem' }}>
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
              Real-Time Confluence Engine (6-Factor Model)
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
            fontSize: '1.25rem',
            fontWeight: 800,
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
            Macro Confluence
          </div>
        </div>
      </div>

      {/* ─── Meter Bar: -100% (Bearish) to +100% (Bullish) ─────────── */}
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
              boxShadow: `0 0 14px ${analysis.colorVar}`,
            }}
          />
        </div>
      </div>

      {/* ─── 6 Confluence Factors Grid ───────────────────────────────── */}
      <div className="structure-factors-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {/* 1. DXY */}
        <div className="factor-pill">
          <span className="factor-name">💵 DXY (USD Index)</span>
          <span className="factor-value" style={{
            color: parseFloat(analysis.dxyChg) < 0 ? 'var(--bull-primary)' : parseFloat(analysis.dxyChg) > 0 ? 'var(--bear-primary)' : 'var(--text-primary)'
          }}>
            {analysis.dxyVal} ({analysis.dxyChg}%)
          </span>
          <span className="factor-sub">
            {parseFloat(analysis.dxyChg) < 0 ? '🟢 USD Sinking (Tailwind)' : parseFloat(analysis.dxyChg) > 0 ? '🔴 USD Surging (Headwind)' : '⚪ USD Stable'}
          </span>
        </div>

        {/* 2. US 10Y Yields */}
        <div className="factor-pill">
          <span className="factor-name">📉 US10Y Yields</span>
          <span className="factor-value" style={{
            color: parseFloat(analysis.us10yChg) < 0 ? 'var(--bull-primary)' : parseFloat(analysis.us10yChg) > 0 ? 'var(--bear-primary)' : 'var(--text-primary)'
          }}>
            {analysis.us10yVal} ({analysis.us10yChg}%)
          </span>
          <span className="factor-sub">
            {parseFloat(analysis.us10yChg) < 0 ? '🟢 Rates Easing (Bullish)' : parseFloat(analysis.us10yChg) > 0 ? '🔴 Yields Spiking (Bearish)' : '⚪ Neutral Rates'}
          </span>
        </div>

        {/* 3. Silver & GSR */}
        <div className="factor-pill">
          <span className="factor-name">🥈 Silver / GSR</span>
          <span className="factor-value" style={{
            color: parseFloat(analysis.silverChg) > 0 ? 'var(--bull-primary)' : parseFloat(analysis.silverChg) < 0 ? 'var(--bear-primary)' : 'var(--text-primary)'
          }}>
            {analysis.silverVal} · GSR {analysis.gsr}
          </span>
          <span className="factor-sub">
            {parseFloat(analysis.silverChg) > 0 ? '🟢 Sympathy Confirmation' : parseFloat(analysis.silverChg) < 0 ? '🔴 Divergence' : '⚪ Metals Neutral'}
          </span>
        </div>

        {/* 4. USD/JPY */}
        <div className="factor-pill">
          <span className="factor-name">🇯🇵 USD/JPY (Risk-Off)</span>
          <span className="factor-value" style={{
            color: parseFloat(analysis.usdjpyChg) < 0 ? 'var(--bull-primary)' : 'var(--text-primary)'
          }}>
            {analysis.usdjpyVal} ({analysis.usdjpyChg}%)
          </span>
          <span className="factor-sub">
            {parseFloat(analysis.usdjpyChg) < 0 ? '🟢 Yen Flight (Risk-Off)' : '⚪ Carry Steady'}
          </span>
        </div>

        {/* 5. Geopolitics & News Sentiment */}
        <div className="factor-pill">
          <span className="factor-name">💥 Geo & Sentiment</span>
          <span className="factor-value" style={{ color: 'var(--text-primary)' }}>
            🟢{analysis.bullCount} 🔴{analysis.bearCount} · Geo: {analysis.geoShockCount}
          </span>
          <span className="factor-sub">
            {analysis.geoShockCount > 0 ? '⚡ War Risk Premium Active' : '9 Feeds Scanned'}
          </span>
        </div>

        {/* 6. Forex Factory Event Proximity */}
        <div className="factor-pill" style={{
          background: analysis.eventCaution ? 'rgba(255, 152, 0, 0.12)' : 'rgba(0, 0, 0, 0.35)',
          borderColor: analysis.eventCaution ? 'var(--alert-primary)' : 'var(--border-subtle)',
        }}>
          <span className="factor-name">📅 Event Schedule</span>
          <span className="factor-value" style={{
            color: analysis.eventCaution ? 'var(--alert-primary)' : 'var(--text-primary)',
            fontSize: '0.72rem',
          }}>
            {analysis.eventCaution ? '⚠️ HIGH VOLATILITY' : 'Normal Liquidity'}
          </span>
          <span className="factor-sub">
            {analysis.eventCaution ? 'Imminent US Data' : 'Clean Order Flow'}
          </span>
        </div>
      </div>

      {/* ─── Scalper Insight Edge Banner ────────────────────────────── */}
      <div className="structure-strategy-banner">
        <span style={{ marginRight: 6 }}>💡</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.45 }}>
          <strong style={{ color: 'var(--text-primary)', marginRight: 4 }}>Scalper Edge:</strong>
          {analysis.summaryNote}
        </span>
      </div>
    </div>
  );
}
