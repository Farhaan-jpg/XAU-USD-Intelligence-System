// client/src/utils/sentimentEngine.js
// Institutional Sentiment & Professional Trader Psychology Engine for XAU/USD
// Synthesizes Real-Time Safe-Haven Fear & Greed, Crowd Contrarian Traps, and SMC Auction Psychology

/**
 * Calibrated Fear & Greed Index (0 - 100)
 * Replaces uncalibrated multipliers with institutional standard-deviation bounds
 */
export function calculateFearGreed({ prices = {}, newsFeed = [], calendarData = {}, cotData = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const dxy = prices['DX-Y.NYB'] || {};
  const us10y = prices['^TNX'] || {};

  // 1. Gold Price Momentum Factor (25% weight)
  const goldChg5m = parseFloat(gold.change5m || 0);
  const goldChgDay = parseFloat(gold.changeDay || 0);
  // Normal session bounds: 5m moves +/-0.3%, day moves +/-1.2%
  const m5 = Math.max(-25, Math.min(25, goldChg5m * 35));
  const mDay = Math.max(-20, Math.min(20, goldChgDay * 10));
  const momentumScore = Math.max(10, Math.min(90, Math.round(50 + m5 + mDay)));

  // 2. Inverse Dollar & Yield Factor (25% weight)
  // Calibrated: yield changes of +/-1.5% and DXY changes of +/-0.6% map within +/-35 pts around baseline 50
  const dxyChg5m = parseFloat(dxy.change5m || 0);
  const dxyChgDay = parseFloat(dxy.changeDay || 0);
  const yldChg5m = parseFloat(us10y.change5m || 0);
  const yldChgDay = parseFloat(us10y.changeDay || 0);

  const dxyDrag = (dxyChg5m * 18) + (dxyChgDay * 7);
  const yldDrag = (yldChg5m * 12) + (yldChgDay * 4);
  const totalMacroDrag = Math.max(-35, Math.min(35, dxyDrag + yldDrag));
  const macroScore = Math.max(10, Math.min(90, Math.round(50 - totalMacroDrag)));

  // 3. AI News Sentiment Vector (20% weight)
  const recentNews = (newsFeed || []).slice(0, 25);
  let bullWeight = 0;
  let bearWeight = 0;
  let neutralWeight = 0;
  const nowMs = Date.now();

  recentNews.forEach((item) => {
    const baseW = item.impact === 'HIGH' ? 3.0 : item.impact === 'MED' ? 1.8 : 1.0;
    const pubMs = new Date(item.publishedAt || item.processedAt || nowMs).getTime();
    const ageMins = Math.max(0, (nowMs - pubMs) / 60000);
    const recencyFactor = ageMins <= 30 ? 1.5 : ageMins <= 120 ? 1.2 : ageMins <= 360 ? 1.0 : 0.7;
    const w = baseW * recencyFactor;

    if (item.bias === 'BULLISH') bullWeight += w;
    else if (item.bias === 'BEARISH') bearWeight += w;
    else neutralWeight += w * 0.5;
  });

  const totalNewsWeight = bullWeight + bearWeight + neutralWeight;
  const newsScore = totalNewsWeight > 0
    ? Math.max(10, Math.min(90, Math.round(((bullWeight + neutralWeight * 0.5) / totalNewsWeight) * 100)))
    : 50;

  // 4. Macro Catalyst Proximity (15% weight)
  const upcoming = calendarData?.upcomingEvents || calendarData?.events || [];
  const nextHigh = upcoming.find((e) => e.impact === 'HIGH');
  let eventScore = 50;

  if (nextHigh) {
    const eventTime = new Date(nextHigh.date || nextHigh.timeUTC || 0).getTime();
    const minsUntil = (eventTime - nowMs) / 60000;

    if (minsUntil > 0 && minsUntil <= 60) {
      // Approaching high-impact event creates safe-haven hedging demand
      eventScore = 72;
    } else if (minsUntil > 60 && minsUntil <= 180) {
      eventScore = 60;
    } else if (minsUntil < 0 && minsUntil >= -90 && nextHigh.actual && nextHigh.forecast) {
      const act = parseFloat(nextHigh.actual);
      const fcast = parseFloat(nextHigh.forecast);
      if (!isNaN(act) && !isNaN(fcast)) {
        const title = (nextHigh.title || '').toUpperCase();
        const isDirect = title.includes('UNEMPLOYMENT') || title.includes('CLAIM');
        if (isDirect) {
          eventScore = act > fcast ? 75 : 30;
        } else {
          eventScore = act > fcast ? 30 : 75;
        }
      }
    }
  }

  // 5. Speculator COT & Crowd Positioning (15% weight)
  const cotBias = cotData?.managedMoney?.biasPct ?? 70;
  const retailLong = cotData?.retailSentiment?.longPct ?? 60;
  // Professional contrarian view: Institutional managed money long is positive,
  // but if retail crowd is overwhelmingly long (>65%), crowd greed requires contrarian discounting.
  const contrarianCrowdFactor = 100 - retailLong;
  const cotScore = Math.max(15, Math.min(85, Math.round(cotBias * 0.65 + contrarianCrowdFactor * 0.35)));

  // 6. Weighted Composite (0 - 100)
  const composite = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        momentumScore * 0.25 +
        macroScore * 0.25 +
        newsScore * 0.20 +
        eventScore * 0.15 +
        cotScore * 0.15
      )
    )
  );

  let classification = 'NEUTRAL / BALANCED FLOW';
  let themeColor = 'var(--gold-primary)';

  if (composite >= 78) {
    classification = 'EXTREME GOLD GREED / SAFE-HAVEN CLIMAX';
    themeColor = 'var(--bull-primary)';
  } else if (composite >= 58) {
    classification = 'SAFE-HAVEN ACCUMULATION';
    themeColor = 'var(--bull-primary)';
  } else if (composite <= 25) {
    classification = 'EXTREME RISK-OFF / DOLLAR FLIGHT';
    themeColor = 'var(--bear-primary)';
  } else if (composite <= 44) {
    classification = 'BEARISH FEAR / YIELD PRESSURE';
    themeColor = 'var(--bear-primary)';
  }

  return {
    score: composite,
    label: classification,
    color: themeColor,
    components: [
      { label: 'Gold Momentum (25%)', val: Math.round(momentumScore) },
      { label: 'Macro Inverse Yield (25%)', val: Math.round(macroScore) },
      { label: 'AI News Vector (20%)', val: Math.round(newsScore) },
      { label: 'Catalyst Risk (15%)', val: Math.round(eventScore) },
      { label: 'CFTC COT Spec (15%)', val: Math.round(cotScore) },
    ],
  };
}

/**
 * Professional Trader Psychology & Crowd Trap Diagnosis Engine
 * Emulates the cognitive decision-making of a seasoned proprietary bullion trader.
 */
export function analyzeTraderPsychology({ prices = {}, newsFeed = [], calendarData = {}, cotData = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const dxy = prices['DX-Y.NYB'] || {};
  const us10y = prices['^TNX'] || {};

  const spotPrice = parseFloat(gold.price || 0);
  const goldHigh = parseFloat(gold.high || spotPrice);
  const goldLow = parseFloat(gold.low || spotPrice);

  const dayRange = Math.max(1, goldHigh - goldLow);
  const priceLocation = spotPrice > 0 ? (spotPrice - goldLow) / dayRange : 0.5; // 0 = low, 1 = high

  const retailLong = cotData?.retailSentiment?.longPct ?? 62;
  const retailShort = cotData?.retailSentiment?.shortPct ?? (100 - retailLong);
  const fearGreed = calculateFearGreed({ prices, newsFeed, calendarData, cotData });
  const fearGreedScore = fearGreed.score;

  // 1. Diagnose Auction Zone (Discount vs Premium)
  const isDiscount = priceLocation <= 0.40;
  const isPremium = priceLocation >= 0.60;
  const isEquilibrium = !isDiscount && !isPremium;

  // 2. Diagnose Retail Crowd Trap
  // Retail herd heavily long (>64%): trapped buyers vulnerable to institutional liquidation runs
  // Retail herd heavily short (<38% long / >62% short): trapped sellers fuel short squeezes
  let crowdTrapState = 'BALANCED';

  if (retailLong >= 65) {
    crowdTrapState = 'RETAIL_LONG_TRAP';
  } else if (retailLong <= 38) {
    crowdTrapState = 'SHORT_SQUEEZE_FUEL';
  } else if (retailLong >= 60) {
    crowdTrapState = 'ELEVATED_CROWD_LONGS';
  }

  // 3. Synthesize Professional Trader Psychology Regime
  let regime = 'INSTITUTIONAL EQUILIBRIUM';
  let regimeType = 'NEUTRAL'; // 'BULL' | 'BEAR' | 'NEUTRAL'
  let deskNote = '';
  let psychologyScore = 50;

  if (fearGreedScore >= 78 && isPremium) {
    regime = 'SAFE-HAVEN CLIMAX / DISTRIBUTION WATCH';
    regimeType = 'BEAR';
    psychologyScore = 42; // Contrarian caution at extremes
    deskNote = `Gold is extending into Extreme Safe-Haven Greed (${fearGreedScore}/100) while trading in daily Premium (${(priceLocation * 100).toFixed(0)}%). Institutional prop desks do NOT chase highs here. Look for smart money distribution or fakeout rejections at resistance before considering long re-entries.`;
  } else if (fearGreedScore >= 58 && isDiscount) {
    regime = 'INSTITUTIONAL ACCUMULATION (DISCOUNT ENGINE)';
    regimeType = 'BULL';
    psychologyScore = 78;
    deskNote = `High-conviction safe-haven accumulation active (${fearGreedScore}/100) with price discounted at ${(priceLocation * 100).toFixed(0)}% of daily range. Macro yields are pressured. Smart money is actively absorbing retail liquidity below equilibrium. Primary institutional bias: Buy dips into discount order blocks.`;
  } else if (crowdTrapState === 'RETAIL_LONG_TRAP' && isPremium) {
    regime = 'BULL TRAP / LIQUIDITY SWEEP AT HIGHS';
    regimeType = 'BEAR';
    psychologyScore = 34;
    deskNote = `Retail crowd is heavily net long (${retailLong}%) buying into resistance at the top of the session range. Institutional algorithms frequently engineer Buy-Side Liquidity sweeps above highs to trigger retail breakout stops before pulling bids. Professional traders fade breakout FOMO.`;
  } else if (crowdTrapState === 'SHORT_SQUEEZE_FUEL' && (isDiscount || isEquilibrium)) {
    regime = 'BEAR TRAP / SHORT SQUEEZE EXPANSION';
    regimeType = 'BULL';
    psychologyScore = 74;
    deskNote = `Retail crowd is heavily short (${retailShort}%) attempting to fade gold momentum. Trapped retail stops stacked above session highs create a liquidity magnet for institutional market makers. Professional traders align with the short squeeze flow.`;
  } else if (fearGreedScore >= 58) {
    regime = 'SAFE-HAVEN EXPANSION FLOW';
    regimeType = 'BULL';
    psychologyScore = 68;
    deskNote = `Steady institutional safe-haven bid supporting bullion (${fearGreedScore}/100). Real yields and dollar strength are contained. Professional traders maintain bullish trend alignment, prioritizing patient pullback execution.`;
  } else if (fearGreedScore <= 38) {
    regime = 'YIELD COMPRESSION / MACRO HEADWINDS';
    regimeType = 'BEAR';
    psychologyScore = 32;
    deskNote = `Macro headwinds dominant (${fearGreedScore}/100). Treasury yields or the US Dollar are attracting capital away from non-yielding bullion. Prop desks favor selling counter-trend rallies until institutional accumulation forms a clear base.`;
  } else {
    regime = 'ORDER FLOW ROTATION / RANGEBOUND';
    regimeType = 'NEUTRAL';
    psychologyScore = 50;
    deskNote = `Market is oscillating in fair value equilibrium (${(priceLocation * 100).toFixed(0)}% of day range). Order flow is two-sided with balanced institutional participation. Wait for liquidity runs outside Asian session boundaries before committing capital.`;
  }

  // 4. Tactical Execution Badges
  const badges = [
    {
      label: 'CROWD SENTIMENT',
      value: `${retailLong}% LONG / ${retailShort}% SHORT`,
      detail: crowdTrapState === 'RETAIL_LONG_TRAP' ? 'Trap: Fading Herd Longs' : crowdTrapState === 'SHORT_SQUEEZE_FUEL' ? 'Squeeze: Trapped Shorts' : 'Balanced Exposure',
      color: crowdTrapState === 'RETAIL_LONG_TRAP' ? 'var(--bear-primary)' : crowdTrapState === 'SHORT_SQUEEZE_FUEL' ? 'var(--bull-primary)' : 'var(--gold-primary)',
    },
    {
      label: 'AUCTION PRICING',
      value: isDiscount ? 'DISCOUNT ZONE' : isPremium ? 'PREMIUM ZONE' : 'EQUILIBRIUM',
      detail: `${(priceLocation * 100).toFixed(0)}% of Daily Range`,
      color: isDiscount ? 'var(--bull-primary)' : isPremium ? 'var(--bear-primary)' : 'var(--cyan-primary)',
    },
    {
      label: 'FEAR & GREED',
      value: `${fearGreedScore}/100`,
      detail: fearGreed.label,
      color: fearGreed.color,
    },
    {
      label: 'INSTITUTIONAL TACTIC',
      value: regimeType === 'BULL' ? 'ACCUMULATE DISCOUNTS' : regimeType === 'BEAR' ? 'FADE PREMIUM RALLIES' : 'PATIENT LIQUIDITY WAIT',
      detail: regimeType === 'BULL' ? 'Protect stops below SSL' : regimeType === 'BEAR' ? 'Target sell liquidity pools' : 'Avoid mid-range chop',
      color: regimeType === 'BULL' ? 'var(--bull-primary)' : regimeType === 'BEAR' ? 'var(--bear-primary)' : 'var(--text-dim)',
    },
  ];

  return {
    regime,
    regimeType,
    psychologyScore,
    deskNote,
    crowdTrapState,
    fearGreedScore,
    fearGreedLabel: fearGreed.label,
    fearGreedColor: fearGreed.color,
    badges,
  };
}
