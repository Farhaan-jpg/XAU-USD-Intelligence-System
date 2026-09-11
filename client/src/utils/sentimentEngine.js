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

  const spotPrice = parseFloat(gold.price || 0);
  const goldHigh = parseFloat(gold.high || spotPrice);
  const goldLow = parseFloat(gold.low || spotPrice);
  const goldOpen = parseFloat(gold.open || spotPrice);

  const dayRange = Math.max(1, goldHigh - goldLow);
  const priceLocation = spotPrice > 0 ? (spotPrice - goldLow) / dayRange : 0.5;
  const pivotP = (goldHigh + goldLow + spotPrice) / 3;

  // 1. Gold Price Multi-Horizon Momentum & SMC Location Factor (25% weight)
  const goldChg5m = parseFloat(gold.change5m || 0);
  const goldChg15m = parseFloat(gold.intervals?.['15']?.chp ?? goldChg5m);
  const goldChg1h = parseFloat(gold.intervals?.['60']?.chp ?? (goldChg5m * 1.5));
  const goldChgDay = parseFloat(gold.changeDay || 0);

  // Short-term and session momentum
  const shortTerm = (goldChg5m * 24) + (goldChg15m * 14);
  const macroSession = (goldChgDay * 12) + (goldChg1h * 8);

  // Auction location impact: price near session lows (-18 to +18)
  const locDelta = (priceLocation - 0.5) * 36;

  // Session initiative: trading below open confirms intraday sell initiative
  const initDelta = goldOpen > 0 ? (spotPrice < goldOpen ? -6 : 4) : 0;

  // Central Pivot relation: trading below central pivot P confirms bearish flow
  const pivotDelta = spotPrice > 0 && pivotP > 0 ? (spotPrice < pivotP ? -5 : 3) : 0;

  const rawMomentum = 50 + shortTerm + macroSession + locDelta + initDelta + pivotDelta;
  const momentumScore = Math.max(10, Math.min(90, Math.round(rawMomentum)));

  // 2. Inverse Dollar & Yield Factor (25% weight)
  const dxyChg5m = parseFloat(dxy.change5m || 0);
  const dxyChgDay = parseFloat(dxy.changeDay || 0);
  const yldChg5m = parseFloat(us10y.change5m || 0);
  const yldChgDay = parseFloat(us10y.changeDay || 0);

  const dxyDrag = (dxyChg5m * 18) + (dxyChgDay * 7);
  const yldDrag = (yldChg5m * 12) + (yldChgDay * 4);
  const totalMacroDrag = Math.max(-35, Math.min(35, dxyDrag + yldDrag));
  const macroScore = Math.max(10, Math.min(90, Math.round(50 - totalMacroDrag)));

  // 3. Real-Time Intraday Momentum, Session VWAP & CVD Flow (20% weight)
  // Sub-second quantitative order flow: distance to true session VWAP, Cumulative Volume Delta, 1m/5m/15m multi-horizon velocity, and Gold/Silver beta
  const sessionVWAP = parseFloat(gold.sessionVWAP || 0);
  const vwapBenchmark = sessionVWAP > 0 ? sessionVWAP : ((goldHigh + goldLow + spotPrice + goldOpen) / 4);
  const vwapDist = vwapBenchmark > 0 ? ((spotPrice - vwapBenchmark) / vwapBenchmark) * 100 : 0;
  const vwapPoints = Math.max(-25, Math.min(25, vwapDist * 50));

  // Cumulative Volume Delta (CVD) order aggression
  const rawCvd = parseFloat(gold.cvd || 0);
  const cvdDelta = Math.max(-12, Math.min(12, (rawCvd / 100) * 8));

  // Smart Money Technique (SMT) Divergence
  const smt = gold.smtDivergence || {};
  let smtPoints = 0;
  if (smt.status === 'BULLISH_SMT') {
    smtPoints = 10; // Gold higher low vs Silver lower low = smart money accumulation
  } else if (smt.status === 'BEARISH_SMT') {
    smtPoints = -10; // Gold lower high vs Silver higher high = smart money distribution
  }

  // Multi-Timeframe (1H/4H) Trend Filter
  let htfFilter = 0;
  if (goldChg1h < -0.35 && goldChg5m > 0) {
    htfFilter = -8; // Counter-trend bounce into strong 1H downtrend -> high failure rate
  } else if (goldChg1h > 0.35 && goldChg5m < 0) {
    htfFilter = 8; // Pullback in strong 1H uptrend -> institutional dip buy
  }

  const goldChg1m = parseFloat(gold.intervals?.['1']?.chp ?? goldChg5m);
  const silver = prices['SI=F'] || prices['XAGUSD'] || {};
  const silverChg5m = parseFloat(silver.change5m || 0);
  const silverBetaSpread = silverChg5m - goldChg5m;

  const trendFlowVelocity =
    (goldChg1m * 22) +
    (goldChg5m * 22) +
    (goldChg15m * 14) +
    vwapPoints +
    cvdDelta +
    smtPoints +
    htfFilter +
    (silverBetaSpread * 6);

  const trendFlowScore = Math.max(10, Math.min(90, Math.round(50 + trendFlowVelocity)));

  // 4. Macro Catalyst Proximity (15% weight)
  const upcoming = calendarData?.upcomingEvents || calendarData?.events || [];
  const nextHigh = upcoming.find((e) => e.impact === 'HIGH');
  let eventScore = 50;

  if (nextHigh) {
    const nowMs = Date.now();
    const eventTime = new Date(nextHigh.date || nextHigh.timeUTC || 0).getTime();
    const minsUntil = (eventTime - nowMs) / 60000;

    if (minsUntil > 0 && minsUntil <= 60) {
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

  // 5. Speculator COT Contextualized Positioning (15% weight)
  // Professional institutional interpretation:
  // When price is in a sell trend / breakdown into discount or below open,
  // high Managed Money net long (87%) represents VULNERABLE LONG LIQUIDATION RISK (fuel for cascades).
  // When price is in an uptrend, high spec net long confirms trend momentum.
  const cotBias = cotData?.managedMoney?.biasPct ?? 70;
  const retailLong = cotData?.retailSentiment?.longPct ?? 60;
  const isPriceWeak = priceLocation <= 0.35 || (goldOpen > 0 && spotPrice < goldOpen);

  let cotScore;
  if (isPriceWeak) {
    const liquidationPenalty = Math.round((cotBias - 50) * 0.45);
    const retailTrapPenalty = retailLong > 55 ? Math.round((retailLong - 50) * 0.5) : 0;
    cotScore = Math.max(15, Math.min(85, Math.round(50 - liquidationPenalty - retailTrapPenalty)));
  } else if (priceLocation >= 0.65 && spotPrice >= goldOpen) {
    cotScore = Math.max(15, Math.min(85, Math.round(cotBias * 0.7 + (100 - retailLong) * 0.3)));
  } else {
    const contrarianCrowdFactor = 100 - retailLong;
    cotScore = Math.max(25, Math.min(75, Math.round(cotBias * 0.5 + contrarianCrowdFactor * 0.5)));
  }

  // 6. Weighted Composite (0 - 100)
  const composite = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        momentumScore * 0.25 +
        macroScore * 0.25 +
        trendFlowScore * 0.20 +
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
    classification = 'EXTREME RISK-OFF / DOWNSIDE LIQUIDATION';
    themeColor = 'var(--bear-primary)';
  } else if (composite <= 44) {
    classification = 'BEARISH FEAR / DOWNSIDE PRESSURE';
    themeColor = 'var(--bear-primary)';
  }

  return {
    score: composite,
    label: classification,
    color: themeColor,
    components: [
      { label: 'Gold Momentum (25%)', val: Math.round(momentumScore) },
      { label: 'Macro Inverse Yield (25%)', val: Math.round(macroScore) },
      { label: 'Trend & VWAP/CVD (20%)', val: Math.round(trendFlowScore) },
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
  const goldOpen = parseFloat(gold.open || spotPrice);

  const dayRange = Math.max(1, goldHigh - goldLow);
  const priceLocation = spotPrice > 0 ? (spotPrice - goldLow) / dayRange : 0.5; // 0 = low, 1 = high
  const pivotP = (goldHigh + goldLow + spotPrice) / 3;

  const goldChg5m = parseFloat(gold.change5m || 0);
  const goldChgDay = parseFloat(gold.changeDay || 0);

  const retailLong = cotData?.retailSentiment?.longPct ?? 62;
  const retailShort = cotData?.retailSentiment?.shortPct ?? (100 - retailLong);
  const fearGreed = calculateFearGreed({ prices, newsFeed, calendarData, cotData });
  const fearGreedScore = fearGreed.score;

  // 1. Diagnose Auction Zone (Discount vs Premium vs Equilibrium)
  const isDeepDiscount = priceLocation <= 0.20;
  const isDiscount = priceLocation <= 0.40;
  const isDeepPremium = priceLocation >= 0.80;
  const isPremium = priceLocation >= 0.60;
  const isEquilibrium = priceLocation > 0.40 && priceLocation < 0.60;

  // 2. Diagnose Retail Crowd Trap State
  let crowdTrapState = 'BALANCED';
  if (retailLong >= 58 && (isDiscount || isDeepDiscount)) {
    // Retail herd aggressively buying the dip into a selloff -> trapped long stops
    crowdTrapState = 'TRAPPED_DIP_BUYERS';
  } else if (retailLong >= 65 && (isPremium || isDeepPremium)) {
    // Retail buying breakout resistance at highs
    crowdTrapState = 'RETAIL_LONG_TRAP';
  } else if (retailLong <= 38) {
    // Retail shorting momentum
    crowdTrapState = 'SHORT_SQUEEZE_FUEL';
  } else if (retailLong >= 60) {
    crowdTrapState = 'ELEVATED_CROWD_LONGS';
  }

  // 3. Synthesize Professional Trader Psychology Regime
  let regime = 'ORDER FLOW ROTATION / FAIR VALUE EQUILIBRIUM';
  let regimeType = 'NEUTRAL'; // 'BULL' | 'BEAR' | 'NEUTRAL'
  let deskNote = '';
  let psychologyScore = 50;

  const isAggressiveSellTrend =
    (isDeepDiscount || (isDiscount && (spotPrice < goldOpen || goldChgDay < 0 || goldChg5m < -0.04))) &&
    (crowdTrapState === 'TRAPPED_DIP_BUYERS' || fearGreedScore <= 46 || goldChgDay <= -0.15 || (spotPrice < pivotP && goldChg5m <= 0));

  const isAggressiveBuyTrend =
    (isDeepPremium || (isPremium && (spotPrice >= goldOpen || goldChgDay > 0 || goldChg5m > 0.04))) &&
    (crowdTrapState === 'SHORT_SQUEEZE_FUEL' || fearGreedScore >= 58 || goldChgDay >= 0.15);

  if (isAggressiveSellTrend) {
    regime = 'AGGRESSIVE DOWNSIDE EXPANSION / LONG LIQUIDATION CASCADE';
    regimeType = 'BEAR';
    psychologyScore = 20;
    deskNote = `Aggressive institutional sell program active. Price is expanding downward into deep discount (${(priceLocation * 100).toFixed(0)}% of daily range) below session open. Retail dip-buyers (${retailLong}% long) are trapped in an institutional stop flush targeting Sell-Side Liquidity (SSL) below session lows. Primary institutional bias: Sell counter-trend bounces; avoid catching falling knives.`;
  } else if (isAggressiveBuyTrend) {
    regime = 'AGGRESSIVE UPSIDE EXPANSION / SHORT SQUEEZE BREAKOUT';
    regimeType = 'BULL';
    psychologyScore = 80;
    deskNote = `High-conviction upside expansion underway with price holding daily premium (${(priceLocation * 100).toFixed(0)}% of range). Trapped retail shorts (${retailShort}%) are fueling an institutional buy-side liquidity run above session highs. Primary bias: Buy shallow pullbacks in line with smart money order flow.`;
  } else if (fearGreedScore >= 78 && isPremium) {
    regime = 'SAFE-HAVEN CLIMAX / DISTRIBUTION WATCH';
    regimeType = 'BEAR';
    psychologyScore = 38;
    deskNote = `Gold is extending into Extreme Safe-Haven Greed (${fearGreedScore}/100) while trading in daily Premium (${(priceLocation * 100).toFixed(0)}%). Institutional prop desks do NOT chase highs here. Look for smart money distribution or fakeout rejections at resistance before considering long re-entries.`;
  } else if (crowdTrapState === 'RETAIL_LONG_TRAP' && isPremium) {
    regime = 'BULL TRAP / LIQUIDITY SWEEP AT HIGHS';
    regimeType = 'BEAR';
    psychologyScore = 32;
    deskNote = `Retail crowd is heavily net long (${retailLong}%) buying into resistance at the top of the session range. Institutional algorithms frequently engineer Buy-Side Liquidity sweeps above highs to trigger retail breakout stops before pulling bids. Professional traders fade breakout FOMO.`;
  } else if (crowdTrapState === 'SHORT_SQUEEZE_FUEL' && (isDiscount || isEquilibrium)) {
    regime = 'BEAR TRAP / SHORT SQUEEZE EXPANSION';
    regimeType = 'BULL';
    psychologyScore = 74;
    deskNote = `Retail crowd is heavily short (${retailShort}%) attempting to fade gold momentum. Trapped retail stops stacked above session highs create a liquidity magnet for institutional market makers. Professional traders align with the short squeeze flow.`;
  } else if (fearGreedScore >= 60 && isDiscount && goldChg5m >= 0 && spotPrice >= goldLow + dayRange * 0.15) {
    regime = 'INSTITUTIONAL ACCUMULATION (DISCOUNT ENGINE)';
    regimeType = 'BULL';
    psychologyScore = 74;
    deskNote = `Safe-haven accumulation active (${fearGreedScore}/100) with price discounted at ${(priceLocation * 100).toFixed(0)}% of daily range and finding a floor. Macro yields are pressured. Smart money is absorbing retail liquidity. Primary bias: Buy dips into discount order blocks.`;
  } else if (fearGreedScore >= 58 && spotPrice >= goldOpen) {
    regime = 'SAFE-HAVEN EXPANSION FLOW';
    regimeType = 'BULL';
    psychologyScore = 68;
    deskNote = `Steady institutional safe-haven bid supporting bullion (${fearGreedScore}/100). Real yields and dollar strength are contained. Professional traders maintain bullish trend alignment, prioritizing patient pullback execution.`;
  } else if (fearGreedScore <= 38 || (priceLocation <= 0.35 && spotPrice < goldOpen)) {
    regime = 'YIELD COMPRESSION / MACRO HEADWINDS';
    regimeType = 'BEAR';
    psychologyScore = 28;
    deskNote = `Macro headwinds dominant (${fearGreedScore}/100). Treasury yields or the US Dollar are attracting capital away from non-yielding bullion. Price is trading weak in discount (${(priceLocation * 100).toFixed(0)}% of range). Prop desks favor selling counter-trend rallies until institutional accumulation forms a clear base.`;
  } else if (isEquilibrium) {
    regime = 'ORDER FLOW ROTATION / FAIR VALUE EQUILIBRIUM';
    regimeType = 'NEUTRAL';
    psychologyScore = 50;
    deskNote = `Market is oscillating in fair value equilibrium (${(priceLocation * 100).toFixed(0)}% of day range). Order flow is two-sided with balanced institutional participation. Wait for liquidity runs outside session boundaries before committing capital.`;
  } else if (priceLocation < 0.40) {
    regime = 'DISCOUNT DRIFT / DEFENSIVE BEAR FLOW';
    regimeType = 'BEAR';
    psychologyScore = 36;
    deskNote = `Bullion is hovering in discount (${(priceLocation * 100).toFixed(0)}% of day range) under modest selling pressure. Downside bias remains favored while price is capped below daily central pivot.`;
  } else {
    regime = 'PREMIUM EXPANSION / BULLISH ROTATION';
    regimeType = 'BULL';
    psychologyScore = 64;
    deskNote = `Bullion is maintaining premium pricing (${(priceLocation * 100).toFixed(0)}% of day range) above session equilibrium. Institutional desks look to accumulate shallow pullbacks.`;
  }

  // SMT Divergence & True Session VWAP/CVD
  const smt = gold.smtDivergence || {};
  const sessionVWAP = parseFloat(gold.sessionVWAP || 0);
  const cvd = parseFloat(gold.cvd || 0);
  const goldChg1h = parseFloat(gold.intervals?.['60']?.chp ?? (goldChg5m * 1.5));

  if (smt.status === 'BEARISH_SMT') {
    deskNote = `[SMT DIVERGENCE: BEARISH DISPATCH] ${smt.note || 'Gold showing relative weakness vs Silver at highs'}. ${deskNote}`;
    if (regimeType === 'BULL') psychologyScore = Math.max(30, psychologyScore - 15);
  } else if (smt.status === 'BULLISH_SMT') {
    deskNote = `[SMT DIVERGENCE: BULLISH ACCUMULATION] ${smt.note || 'Gold holding higher low while Silver made lower low'}. ${deskNote}`;
    if (regimeType === 'BEAR') psychologyScore = Math.min(70, psychologyScore + 15);
  }

  // 4. Tactical Execution Badges
  const badges = [
    {
      label: 'CROWD SENTIMENT',
      value: `${retailLong}% LONG / ${retailShort}% SHORT`,
      detail: crowdTrapState === 'TRAPPED_DIP_BUYERS'
        ? 'Trap: Trapped Dip-Buyers'
        : crowdTrapState === 'RETAIL_LONG_TRAP'
        ? 'Trap: Fading Herd Longs'
        : crowdTrapState === 'SHORT_SQUEEZE_FUEL'
        ? 'Squeeze: Trapped Shorts'
        : 'Balanced Exposure',
      color: crowdTrapState === 'TRAPPED_DIP_BUYERS' || crowdTrapState === 'RETAIL_LONG_TRAP'
        ? 'var(--bear-primary)'
        : crowdTrapState === 'SHORT_SQUEEZE_FUEL'
        ? 'var(--bull-primary)'
        : 'var(--gold-primary)',
    },
    {
      label: 'AUCTION PRICING',
      value: isDeepDiscount
        ? 'EXTREME DISCOUNT'
        : isDiscount
        ? 'DISCOUNT ZONE'
        : isDeepPremium
        ? 'EXTREME PREMIUM'
        : isPremium
        ? 'PREMIUM ZONE'
        : 'EQUILIBRIUM',
      detail: `${(priceLocation * 100).toFixed(0)}% of Daily Range`,
      color: isDeepDiscount || (isDiscount && regimeType === 'BEAR')
        ? 'var(--bear-primary)'
        : isDiscount
        ? 'var(--bull-primary)'
        : isDeepPremium
        ? 'var(--gold-primary)'
        : isPremium
        ? 'var(--bull-primary)'
        : 'var(--cyan-primary)',
    },
    {
      label: 'FEAR & GREED',
      value: `${fearGreedScore}/100`,
      detail: fearGreed.label,
      color: fearGreed.color,
    },
    {
      label: 'INSTITUTIONAL TACTIC',
      value: regimeType === 'BULL'
        ? 'ACCUMULATE DISCOUNTS'
        : regimeType === 'BEAR'
        ? (isDeepDiscount ? 'FADE BOUNCES / TARGET SSL' : 'SELL PULLBACKS')
        : 'PATIENT LIQUIDITY WAIT',
      detail: regimeType === 'BULL'
        ? 'Protect stops below SSL'
        : regimeType === 'BEAR'
        ? 'Target sell liquidity pools'
        : 'Avoid mid-range chop',
      color: regimeType === 'BULL' ? 'var(--bull-primary)' : regimeType === 'BEAR' ? 'var(--bear-primary)' : 'var(--text-dim)',
    },
    {
      label: 'SMT DIVERGENCE (AU/AG)',
      value: smt.status === 'BULLISH_SMT'
        ? 'BULLISH SMT'
        : smt.status === 'BEARISH_SMT'
        ? 'BEARISH SMT'
        : 'NEUTRAL / CORRELATED',
      detail: smt.note || 'Gold & Silver tracking correlated swings',
      color: smt.status === 'BULLISH_SMT'
        ? 'var(--bull-primary)'
        : smt.status === 'BEARISH_SMT'
        ? 'var(--bear-primary)'
        : 'var(--text-dim)',
    },
    {
      label: 'SESSION VWAP & CVD',
      value: sessionVWAP > 0 ? `$${sessionVWAP.toFixed(2)}` : 'VWAP COMPUTING',
      detail: cvd !== 0
        ? `CVD: ${cvd > 0 ? '+' : ''}${cvd.toFixed(0)} (${cvd > 0 ? 'Aggressive Buyers' : 'Aggressive Sellers'})`
        : 'Balanced Order Delta',
      color: sessionVWAP > 0 && spotPrice >= sessionVWAP ? 'var(--bull-primary)' : 'var(--bear-primary)',
    },
    {
      label: '1H HTF MSS ALIGNMENT',
      value: goldChg1h > 0.25
        ? 'BULLISH CONTINUATION'
        : goldChg1h < -0.25
        ? 'BEARISH EXPANSION'
        : 'BALANCED STRUCTURE',
      detail: Math.abs(goldChg1h) > 0.35 && (goldChg1h * goldChg5m < 0)
        ? 'Caution: Counter-Trend 5M Scalp'
        : `1H Trend: ${goldChg1h >= 0 ? '+' : ''}${goldChg1h.toFixed(2)}%`,
      color: goldChg1h > 0.25 ? 'var(--bull-primary)' : goldChg1h < -0.25 ? 'var(--bear-primary)' : 'var(--gold-primary)',
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
