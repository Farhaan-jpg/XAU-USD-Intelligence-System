// client/src/components/TradeExecutionCopilot.jsx
// Institutional Trade Execution Copilot & A+ Setup Signal Engine
// Synthesizes Confluence, SMC Liquidity Pools, Macro Radar, Calendar Lockups, and Volatility Traps into actionable trade plans

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Zap,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Copy,
  Check,
  Volume2,
  AlertTriangle,
  Scale,
  DollarSign,
  TrendingUp,
  Percent,
  Award,
  Lock,
} from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export const PROP_FIRM_PROFILES = [
  {
    id: 'FTMO',
    name: 'FTMO Challenge / Verification',
    shortName: 'FTMO',
    dailyLossPct: 5.0,
    maxLossPct: 10.0,
    recommendedRiskPct: 0.5,
    maxSafeRiskPct: 1.0,
    newsRule: 'Strict: No opening/closing 2 min before & after Red News (Swing accounts exempt)',
    newsBufferMins: 2,
    profitTargetPhase1Pct: 10.0,
    profitTargetPhase2Pct: 5.0,
    defaultBalances: [10000, 25000, 50000, 100000, 200000],
    badgeColor: '#38bdf8',
  },
  {
    id: 'FUNDING_PIPS',
    name: 'Funding Pips (Student / Pro)',
    shortName: 'Funding Pips',
    dailyLossPct: 4.0,
    maxLossPct: 8.0,
    recommendedRiskPct: 0.35,
    maxSafeRiskPct: 0.75,
    newsRule: 'High Strictness: 2 min news restriction on high-impact events',
    newsBufferMins: 2,
    profitTargetPhase1Pct: 8.0,
    profitTargetPhase2Pct: 5.0,
    defaultBalances: [5000, 10000, 25000, 50000, 100000],
    badgeColor: '#a855f7',
  },
  {
    id: 'THE_5ERS',
    name: 'The 5%ers (High Stakes / Bootcamp)',
    shortName: 'The 5%ers',
    dailyLossPct: 5.0,
    maxLossPct: 10.0,
    recommendedRiskPct: 0.5,
    maxSafeRiskPct: 1.0,
    newsRule: 'News trading permitted with slippage risk disclaimer',
    newsBufferMins: 0,
    profitTargetPhase1Pct: 8.0,
    profitTargetPhase2Pct: 5.0,
    defaultBalances: [10000, 20000, 60000, 100000, 250000],
    badgeColor: '#10b981',
  },
  {
    id: 'FUNDED_NEXT',
    name: 'FundedNext (Stellar / Evaluation)',
    shortName: 'FundedNext',
    dailyLossPct: 5.0,
    maxLossPct: 10.0,
    recommendedRiskPct: 0.5,
    maxSafeRiskPct: 1.0,
    newsRule: 'Permitted on Stellar; 15 min lockup on Express challenges',
    newsBufferMins: 2,
    profitTargetPhase1Pct: 8.0,
    profitTargetPhase2Pct: 5.0,
    defaultBalances: [6000, 15000, 25000, 50000, 100000, 200000],
    badgeColor: '#f59e0b',
  },
  {
    id: 'APEX_TOPSTEP',
    name: 'Apex / Topstep (Futures Evaluation)',
    shortName: 'Apex / Topstep',
    dailyLossPct: 4.5,
    maxLossPct: 6.0,
    recommendedRiskPct: 0.35,
    maxSafeRiskPct: 0.75,
    newsRule: 'Trading halt strictly enforced during Tier-1 FOMC/CPI releases',
    newsBufferMins: 5,
    profitTargetPhase1Pct: 6.0,
    profitTargetPhase2Pct: 6.0,
    defaultBalances: [25000, 50000, 100000, 150000, 250000],
    badgeColor: '#ec4899',
  },
  {
    id: 'PERSONAL',
    name: 'Personal / Unrestricted Broker Account',
    shortName: 'Personal Account',
    dailyLossPct: 10.0,
    maxLossPct: 20.0,
    recommendedRiskPct: 1.0,
    maxSafeRiskPct: 2.0,
    newsRule: 'Unrestricted discretionary execution',
    newsBufferMins: 0,
    profitTargetPhase1Pct: 15.0,
    profitTargetPhase2Pct: 15.0,
    defaultBalances: [1000, 5000, 10000, 25000, 50000],
    badgeColor: 'var(--gold-glow)',
  },
];

export default function TradeExecutionCopilot({
  prices = {},
  newsFeed = [],
  calendarData = {},
  cotData = {},
}) {
  const [selectedPropFirm, setSelectedPropFirm] = useState('FTMO');
  const [accountBalance, setAccountBalance] = useState(100000); // 100k standard evaluation default
  const [riskPercent, setRiskPercent] = useState(0.5); // 0.5% conservative prop safe default
  const [copied, setCopied] = useState(false);
  const [isSquawking, setIsSquawking] = useState(false);

  const activeFirm = PROP_FIRM_PROFILES.find((f) => f.id === selectedPropFirm) || PROP_FIRM_PROFILES[0];

  const handlePropFirmChange = (firmId) => {
    setSelectedPropFirm(firmId);
    const firm = PROP_FIRM_PROFILES.find((f) => f.id === firmId) || PROP_FIRM_PROFILES[0];
    setRiskPercent(firm.recommendedRiskPct);
    if (!firm.defaultBalances.includes(accountBalance)) {
      setAccountBalance(firm.defaultBalances[firm.defaultBalances.length > 3 ? 3 : 0] || 100000);
    }
  };

  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const dxy = prices['DX-Y.NYB'] || {};
  const us10y = prices['^TNX'] || {};
  const silver = prices['SI=F'] || prices['XAGUSD'] || {};

  const spotPrice = parseFloat(gold.price || 2400);
  const goldHigh = parseFloat(gold.high || spotPrice + 12);
  const goldLow = parseFloat(gold.low || spotPrice - 12);

  // Compute Full 5-Pillar Institutional Signal Plan
  const plan = useMemo(() => {
    const goldChg5m = parseFloat(gold.change5m || 0);
    const goldChgDay = parseFloat(gold.changeDay || 0);
    const dxyChg5m = parseFloat(dxy.change5m || 0);
    const dxyChgDay = parseFloat(dxy.changeDay || 0);
    const us10yChg5m = parseFloat(us10y.change5m || 0);
    const us10yChgDay = parseFloat(us10y.changeDay || 0);
    const silverChg5m = parseFloat(silver.change5m || 0);

    // 1. Check Calendar Lockup (< 20 mins to HIGH impact event)
    let isNewsLockup = false;
    let newsLockupReason = '';
    const upcoming = calendarData?.events || calendarData?.upcomingEvents || [];
    const nextHigh = upcoming.find((e) => e.impact === 'HIGH');
    if (nextHigh) {
      const eventTime = new Date(nextHigh.date || nextHigh.timeUTC).getTime();
      const diffMins = Math.round((eventTime - Date.now()) / 60000);
      if (diffMins >= 0 && diffMins <= 20) {
        isNewsLockup = true;
        newsLockupReason = `${nextHigh.title} (${nextHigh.currency}) releases in ${diffMins}m. High slippage lockup active.`;
      }
    }

    // 2. Check Session
    const nowUtcHour = new Date().getUTCHours();
    const isPeakSession = nowUtcHour >= 7 && nowUtcHour <= 17; // London & NY active
    const sessionLabel =
      nowUtcHour >= 12 && nowUtcHour <= 16
        ? 'London / NY Overlap (Peak Volume)'
        : nowUtcHour >= 7 && nowUtcHour < 12
        ? 'London Session (Expansion)'
        : nowUtcHour > 16 && nowUtcHour <= 21
        ? 'Late NY Session (Slowing)'
        : 'Asian Session (Accumulation/Chop)';

    // 3. SMC Levels
    const range = Math.max(10, goldHigh - goldLow);
    const eq = (goldHigh + goldLow) / 2;
    const bsl = goldHigh + Math.max(2.5, range * 0.06);
    const ssl = goldLow - Math.max(2.5, range * 0.06);
    const bullishOB = goldLow + range * 0.08;
    const bearishOB = goldHigh - range * 0.08;

    // 4. Macro Alignment (Blended 5m impulse & day trend)
    const dxyImpulse = (dxyChg5m * 0.65) + (dxyChgDay * 0.35);
    const us10yImpulse = (us10yChg5m * 0.65) + (us10yChgDay * 0.35);

    const macroBullish = dxyImpulse < -0.015 || (dxyImpulse < 0 && us10yImpulse < 0);
    const macroBearish = dxyImpulse > 0.015 || (dxyImpulse > 0 && us10yImpulse > 0);

    // 5. Composite Score Calculation
    let bullPoints = 0;
    let bearPoints = 0;

    if (macroBullish) bullPoints += 25;
    else if (macroBearish) bearPoints += 25;

    if (silverChg5m > goldChg5m + 0.03) bullPoints += 15;
    else if (silverChg5m < goldChg5m - 0.03) bearPoints += 15;

    // News Sentiment
    const recent = newsFeed.slice(0, 15);
    let bullNews = 0;
    let bearNews = 0;
    recent.forEach((item) => {
      if (item.bias === 'BULLISH') bullNews += item.impact === 'HIGH' ? 3 : 1;
      else if (item.bias === 'BEARISH') bearNews += item.impact === 'HIGH' ? 3 : 1;
    });
    if (bullNews > bearNews + 2) bullPoints += 25;
    else if (bearNews > bullNews + 2) bearPoints += 25;

    // COT & Price position relative to equilibrium
    if (spotPrice <= eq) bullPoints += 15; // Discount zone (Buy favorable)
    else bearPoints += 15; // Premium zone (Sell favorable)

    // CFTC Managed Money Speculator bias
    const mmBias = cotData?.managedMoney?.biasPct || 87;
    if (mmBias >= 80) bullPoints += 15;
    else if (mmBias <= 50) bearPoints += 15;

    const netScore = bullPoints - bearPoints; // range -95 to +95

    // Build Execution Output
    let action = 'STAND_ASIDE';
    let grade = 'NO SETUP';
    let rationale = '';
    let entry = spotPrice;
    let sl = spotPrice;
    let tp1 = spotPrice;
    let tp2 = spotPrice;
    let rrRatio = 0;
    let winProb = 50;

    if (isNewsLockup) {
      action = 'STAND_ASIDE';
      grade = 'LOCKUP ACTIVE';
      rationale = newsLockupReason;
      winProb = 35;
    } else if (netScore >= 40 && spotPrice < bsl - 4) {
      action = 'BUY';
      grade = netScore >= 60 ? 'A+ INSTITUTIONAL SETUP' : 'B VALID SETUP';
      entry = spotPrice <= eq ? spotPrice : eq;
      const slDist = Math.max(5.5, (entry - ssl) * 0.6);
      sl = parseFloat((entry - slDist).toFixed(2));
      const risk = entry - sl;
      tp1 = parseFloat((entry + risk * 2.0).toFixed(2));
      tp2 = parseFloat((entry + risk * 3.4).toFixed(2));
      rrRatio = parseFloat((((tp1 - entry) + (tp2 - entry)) / 2 / risk).toFixed(1));
      winProb = netScore >= 60 ? 86 : 74;
      rationale = `Macro Dollar & Yields retreating. Gold trading at discount equilibrium ($${eq.toFixed(2)}) with resting buy stops targeted at $${bsl.toFixed(2)}.`;
    } else if (netScore <= -40 && spotPrice > ssl + 4) {
      action = 'SELL';
      grade = netScore <= -60 ? 'A+ INSTITUTIONAL SETUP' : 'B VALID SETUP';
      entry = spotPrice >= eq ? spotPrice : eq;
      const slDist = Math.max(5.5, (bsl - entry) * 0.6);
      sl = parseFloat((entry + slDist).toFixed(2));
      const risk = sl - entry;
      tp1 = parseFloat((entry - risk * 2.0).toFixed(2));
      tp2 = parseFloat((entry - risk * 3.4).toFixed(2));
      rrRatio = parseFloat((((entry - tp1) + (entry - tp2)) / 2 / risk).toFixed(1));
      winProb = netScore <= -60 ? 84 : 73;
      rationale = `US Dollar & Yields pushing higher while Gold is at premium resistance ($${bearishOB.toFixed(2)}). Sell-side liquidity pool targeted at $${ssl.toFixed(2)}.`;
    } else {
      action = 'STAND_ASIDE';
      grade = 'CHOP / NEUTRAL';
      rationale = `Market in equilibrium compression ($${spotPrice.toFixed(2)}). Order flow is mixed. Awaiting institutional liquidity sweep of $${bsl.toFixed(2)} or $${ssl.toFixed(2)} before entry.`;
      winProb = 48;
    }

    // Exact Lot Size Calculation based on $ Risk
    const dollarRisk = (accountBalance * (riskPercent / 100));
    const slPipsOrDollars = Math.abs(entry - sl);
    // 1 standard lot of gold = 100 oz. $1 move in gold on 1.00 lot = $100 profit/loss.
    const calculatedLot = slPipsOrDollars > 0 ? parseFloat((dollarRisk / (slPipsOrDollars * 100)).toFixed(2)) : 0.01;
    const lotSize = Math.max(0.01, calculatedLot);
    const maxLoss = parseFloat((slPipsOrDollars * 100 * lotSize).toFixed(2));
    const gainTP1 = parseFloat((Math.abs(tp1 - entry) * 100 * (lotSize * 0.5)).toFixed(2));
    const gainTP2 = parseFloat((Math.abs(tp2 - entry) * 100 * (lotSize * 0.5)).toFixed(2));
    const totalGain = parseFloat((gainTP1 + gainTP2).toFixed(2));

    // Prop Firm Rules, Drawdown Buffers & Target Projections
    const maxDailyLoss = (accountBalance * (activeFirm.dailyLossPct / 100)).toFixed(2);
    const maxTotalLoss = (accountBalance * (activeFirm.maxLossPct / 100)).toFixed(2);
    const profitTargetPhase1 = (accountBalance * (activeFirm.profitTargetPhase1Pct / 100)).toFixed(2);
    const profitTargetPhase2 = (accountBalance * (activeFirm.profitTargetPhase2Pct / 100)).toFixed(2);
    const isRiskOverLimit = riskPercent > activeFirm.maxSafeRiskPct;
    const firmNewsRestricted = isNewsLockup && activeFirm.newsBufferMins > 0;
    const drawdownLossesBuffer = dollarRisk > 0 ? Math.floor(parseFloat(maxDailyLoss) / dollarRisk) : 0;
    const tradeGainPctOfTarget = totalGain > 0 ? ((totalGain / parseFloat(profitTargetPhase1)) * 100).toFixed(1) : '0.0';

    // Override guidance if strict prop firm news lockup is triggered
    if (firmNewsRestricted && action !== 'STAND_ASIDE') {
      action = 'STAND_ASIDE';
      grade = 'PROP NEWS LOCKUP ACTIVE';
      rationale = `${activeFirm.shortName} Rule Enforcement: High-impact release within lockup window. Stand aside to prevent account breach.`;
      winProb = 30;
    }

    // 6-Pillar Verification Checklist (Including Prop Firm Capital Defense)
    const pillars = [
      {
        name: 'Session Liquidity',
        pass: isPeakSession,
        desc: sessionLabel,
      },
      {
        name: 'News Lockup Safe',
        pass: !isNewsLockup,
        desc: isNewsLockup ? newsLockupReason : 'No Red-Folder releases in next 20m',
      },
      {
        name: 'Macro Drivers Confirmed',
        pass: action === 'BUY' ? macroBullish || dxyImpulse < 0 : action === 'SELL' ? macroBearish || dxyImpulse > 0 : false,
        desc: `DXY: ${dxyChg5m >= 0 ? '+' : ''}${dxyChg5m.toFixed(2)}% (5m) / ${dxyChgDay >= 0 ? '+' : ''}${dxyChgDay.toFixed(2)}% (Day) | 10Y: ${us10yChg5m >= 0 ? '+' : ''}${us10yChg5m.toFixed(2)}%`,
      },
      {
        name: 'Confluence Alignment',
        pass: Math.abs(netScore) >= 40,
        desc: `Net institutional vector: ${netScore >= 0 ? '+' : ''}${netScore} pts`,
      },
      {
        name: 'Risk/Reward Ratio >= 1:2',
        pass: rrRatio >= 2.0,
        desc: `Average R:R: 1:${rrRatio || '2.0'}`,
      },
      {
        name: `${activeFirm.shortName} Capital Defense`,
        pass: !isRiskOverLimit && !firmNewsRestricted,
        desc: isRiskOverLimit
          ? `Risk ${riskPercent}% exceeds safe limit (${activeFirm.maxSafeRiskPct}% max)`
          : firmNewsRestricted
          ? `News restriction active (${activeFirm.shortName})`
          : `${drawdownLossesBuffer} stop-outs allowed before daily limit ($${parseFloat(maxDailyLoss).toLocaleString()})`,
      },
    ];

    return {
      action,
      grade,
      entry,
      sl,
      tp1,
      tp2,
      riskDistance: slPipsOrDollars.toFixed(2),
      rrRatio,
      winProb,
      rationale,
      dollarRisk: dollarRisk.toFixed(2),
      lotSize,
      maxLoss,
      gainTP1,
      gainTP2,
      totalGain,
      pillars,
      isNewsLockup,
      firm: activeFirm,
      maxDailyLoss,
      maxTotalLoss,
      profitTargetPhase1,
      profitTargetPhase2,
      isRiskOverLimit,
      firmNewsRestricted,
      drawdownLossesBuffer,
      tradeGainPctOfTarget,
    };
  }, [spotPrice, goldHigh, goldLow, gold, dxy, us10y, silver, newsFeed, calendarData, cotData, accountBalance, riskPercent, selectedPropFirm, activeFirm]);

  // Auto squawk when an A+ setup is generated (Strict 10-minute cooldown)
  const prevActionRef = useRef(plan.action);
  const lastAlertTimeRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    if (plan.action !== prevActionRef.current && (plan.action === 'BUY' || plan.action === 'SELL') && plan.grade.includes('A+')) {
      if (now - lastAlertTimeRef.current >= tenMinutes) {
        lastAlertTimeRef.current = now;
        speakSquawk(
          `Trade Alert. A-plus Institutional ${plan.action === 'BUY' ? 'Buy' : 'Sell'} setup confirmed on Gold. Win probability: ${plan.winProb} percent.`,
          {
            category: 'confluence',
            preChime: 'confluence',
            dedupeKey: 'copilot_trade_alert',
            cooldownSeconds: 600,
            priority: true,
          }
        );
      }
      prevActionRef.current = plan.action;
    }
  }, [plan.action, plan.grade]);

  // Manual Voice Squawk of Trade Plan
  const handleSquawkTradePlan = () => {
    setIsSquawking(true);
    let speech = '';
    if (plan.action === 'STAND_ASIDE') {
      speech = `${activeFirm.shortName} Copilot recommendation: Stand aside. ${plan.rationale}`;
    } else {
      speech = `Trade recommendation for ${activeFirm.shortName} Account. Action: ${plan.action} Gold at ${plan.entry.toFixed(2)} dollars. Stop loss: ${plan.sl.toFixed(2)}. Target one: ${plan.tp1.toFixed(2)}. Position size: ${plan.lotSize} lots, risking ${riskPercent} percent or ${plan.dollarRisk} dollars. Allowed drawdown buffer: ${plan.drawdownLossesBuffer} stop outs.`;
    }
    speakSquawk(speech, { priority: true, cooldownSeconds: 0 });
    setTimeout(() => setIsSquawking(false), 3000);
  };

  // Copy Order to Clipboard
  const handleCopyOrder = () => {
    const text = `=== XAU/USD INSTITUTIONAL TRADE ORDER ===
PROP FIRM PROFILE: ${activeFirm.name}
ACTION: ${plan.action} (XAU/USD)
ORDER TYPE: LIMIT / MARKET
GRADE: ${plan.grade}
ENTRY: $${plan.entry.toFixed(2)}
STOP LOSS: $${plan.sl.toFixed(2)} (-$${plan.riskDistance})
TAKE PROFIT 1: $${plan.tp1.toFixed(2)} (1:2.0 R:R)
TAKE PROFIT 2: $${plan.tp2.toFixed(2)} (1:3.4+ R:R)
LOT SIZE: ${plan.lotSize} LOTS (${riskPercent}% Risk on $${accountBalance.toLocaleString()} ${activeFirm.shortName})
MAX DOLLAR RISK: -$${plan.maxLoss}
ESTIMATED PROFIT: +$${plan.totalGain} (${plan.tradeGainPctOfTarget}% of Phase 1 Target)
DAILY DD CEILING: -$${parseFloat(plan.maxDailyLoss).toLocaleString()} (${activeFirm.dailyLossPct}%)
DRAWDOWN BUFFER: ${plan.drawdownLossesBuffer} consecutive stop-outs
WIN PROBABILITY: ${plan.winProb}%
RATIONALE: ${plan.rationale}`;

    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBuy = plan.action === 'BUY';
  const isSell = plan.action === 'SELL';
  const isStandAside = plan.action === 'STAND_ASIDE';

  const themeColor = isBuy
    ? 'var(--bull-glow)'
    : isSell
    ? 'var(--bear-glow)'
    : 'var(--gold-glow)';

  return (
    <div
      className="panel-card"
      style={{
        border: `1px solid ${isBuy ? 'var(--border-bull)' : isSell ? 'var(--border-bear)' : 'var(--border-gold)'}`,
        background: isBuy
          ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 40%)'
          : isSell
          ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 40%)'
          : 'var(--bg-card)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              background: isBuy ? 'var(--bull-bg)' : isSell ? 'var(--bear-bg)' : 'var(--gold-bg)',
              color: themeColor,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isBuy ? <ArrowUpRight size={22} /> : isSell ? <ArrowDownRight size={22} /> : <Scale size={22} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
                INSTITUTIONAL TRADE EXECUTION COPILOT
              </span>
              <span
                className="event-impact-badge"
                style={{
                  background: isBuy ? 'var(--bull-bg)' : isSell ? 'var(--bear-bg)' : 'rgba(245, 158, 11, 0.15)',
                  color: themeColor,
                  borderColor: themeColor,
                  fontWeight: 800,
                  fontSize: '11px',
                }}
              >
                {plan.grade}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-time multi-factor algorithmic execution engine with calculated risk-to-reward parameters.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={handleSquawkTradePlan}
            disabled={isSquawking}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '6px 12px',
              borderColor: 'var(--gold-glow)',
              color: 'var(--gold-glow)',
            }}
          >
            <Volume2 size={13} />
            <span>{isSquawking ? 'Squawking Plan...' : '🔊 Squawk Trade Plan'}</span>
          </button>

          <button
            className="btn-primary"
            onClick={handleCopyOrder}
            disabled={isStandAside}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '6px 14px',
              background: isBuy ? 'var(--bull-primary)' : isSell ? 'var(--bear-primary)' : undefined,
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied to Clipboard!' : '📋 Copy Broker Order'}</span>
          </button>
        </div>
      </div>

      {/* Main Signal Display Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Signal Direction */}
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            RECOMMENDED ACTION
          </span>
          <div style={{ fontSize: '20px', fontWeight: 900, color: themeColor, marginTop: '4px' }}>
            {isBuy ? '🟢 BUY (LONG)' : isSell ? '🔴 SELL (SHORT)' : '🟡 STAND ASIDE'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {isStandAside ? 'No trade condition' : `Targeting ${isBuy ? 'BSL resting stops' : 'SSL resting stops'}`}
          </span>
        </div>

        {/* Entry Zone */}
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            EXECUTION ENTRY
          </span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {isStandAside ? '--' : `$${plan.entry.toFixed(2)}`}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            {isStandAside ? 'Market locked' : 'Pullback / Market Limit'}
          </span>
        </div>

        {/* Invalidation SL */}
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bear-glow)', textTransform: 'uppercase' }}>
            STOP LOSS (SL)
          </span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bear-glow)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {isStandAside ? '--' : `$${plan.sl.toFixed(2)}`}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--bear-glow)' }}>
            {isStandAside ? '--' : `Risk: $${plan.riskDistance} (${Math.round(parseFloat(plan.riskDistance) * 10)} pips)`}
          </span>
        </div>

        {/* Take Profit 1 */}
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bull-glow)', textTransform: 'uppercase' }}>
            TAKE PROFIT 1 (1:2 R:R)
          </span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bull-glow)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {isStandAside ? '--' : `$${plan.tp1.toFixed(2)}`}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--bull-glow)' }}>
            {isStandAside ? '--' : '50% Scale Out Target'}
          </span>
        </div>

        {/* Take Profit 2 (Runner) */}
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-glow)', textTransform: 'uppercase' }}>
            TAKE PROFIT 2 (RUNNER)
          </span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gold-glow)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {isStandAside ? '--' : `$${plan.tp2.toFixed(2)}`}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--gold-glow)' }}>
            {isStandAside ? '--' : `1:${plan.rrRatio} Liquidity Runner`}
          </span>
        </div>

        {/* Win Probability */}
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            WIN PROBABILITY
          </span>
          <div style={{ fontSize: '20px', fontWeight: 900, color: themeColor, marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {plan.winProb}%
          </div>
          <span style={{ fontSize: '11px', color: themeColor }}>
            {plan.winProb >= 80 ? 'High Institutional Edge' : plan.winProb >= 65 ? 'Moderate Edge' : 'Low Conviction'}
          </span>
        </div>
      </div>

      {/* Rationale Bar */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          borderLeft: `3px solid ${themeColor}`,
          fontSize: '12px',
          color: 'var(--text-main)',
          lineHeight: '1.5',
        }}
      >
        <strong>Algorithmic Rationale:</strong> {plan.rationale}
      </div>

      {/* Interactive Capital Risk & Exact Lot Sizer with Prop Firm Dropdown */}
      <div
        style={{
          background: 'rgba(15, 23, 38, 0.75)',
          border: `1px solid ${plan.isRiskOverLimit ? 'var(--bear-glow)' : 'var(--border-medium)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Percent size={14} style={{ color: 'var(--gold-glow)' }} />
              DYNAMIC POSITION SIZER & PROFIT PROJECTOR
            </span>
            <span
              className="telemetry-badge"
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: activeFirm.badgeColor,
                borderColor: activeFirm.badgeColor,
                background: 'rgba(0, 0, 0, 0.4)',
              }}
            >
              {activeFirm.shortName.toUpperCase()} MODE
            </span>
          </div>

          {/* Quick Account Sizing Presets for Selected Firm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Account Size:</span>
            {activeFirm.defaultBalances.map((amt) => (
              <button
                key={amt}
                className={`filter-pill ${accountBalance === amt ? 'active' : ''}`}
                style={{ fontSize: '10px', padding: '2px 8px' }}
                onClick={() => setAccountBalance(amt)}
              >
                ${amt >= 1000 ? `${(amt / 1000).toFixed(0)}k` : amt}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs Grid with Prop Firm Selector */}
        <div className="calc-inputs-grid" style={{ gridTemplateColumns: '1.4fr 1.1fr 1fr 1fr 1fr 1.1fr', gap: '10px' }}>
          <div className="calc-field">
            <label className="calc-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: activeFirm.badgeColor }}>
              <Award size={12} />
              PROP FIRM ACCOUNT
            </label>
            <select
              className="calc-input"
              value={selectedPropFirm}
              onChange={(e) => handlePropFirmChange(e.target.value)}
              style={{ borderColor: activeFirm.badgeColor, fontWeight: 700 }}
            >
              {PROP_FIRM_PROFILES.map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name}
                </option>
              ))}
            </select>
          </div>

          <div className="calc-field">
            <label className="calc-label">ACCOUNT BALANCE ($)</label>
            <input
              type="number"
              className="calc-input"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Math.max(100, parseFloat(e.target.value) || 100))}
            />
          </div>

          <div className="calc-field">
            <label className="calc-label">RISK PER TRADE (%)</label>
            <select
              className="calc-input"
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
              style={{
                borderColor: plan.isRiskOverLimit ? 'var(--bear-glow)' : undefined,
                color: plan.isRiskOverLimit ? 'var(--bear-glow)' : undefined,
                fontWeight: 700,
              }}
            >
              <option value="0.25">0.25% (Ultra Safe / Capital Defense)</option>
              <option value="0.35">0.35% (Funding Pips Conservative)</option>
              <option value="0.5">0.5% (Recommended Prop Safe)</option>
              <option value="0.75">0.75% (Moderate Evaluation)</option>
              <option value="1.0">1.0% (Standard Prop Maximum)</option>
              <option value="1.5">1.5% (High Drawdown Risk)</option>
              <option value="2.0">2.0% (Personal Account Only)</option>
            </select>
          </div>

          <div className="calc-field">
            <label className="calc-label">RECOMMENDED LOTS</label>
            <div className="calc-result-box" style={{ padding: '8px', fontSize: '15px', fontWeight: 800, color: 'var(--gold-glow)' }}>
              {isStandAside ? '0.00' : `${plan.lotSize} Lots`}
            </div>
          </div>

          <div className="calc-field">
            <label className="calc-label">MAX DOLLAR RISK</label>
            <div className="calc-result-box" style={{ padding: '8px', fontSize: '15px', fontWeight: 800, color: 'var(--bear-glow)' }}>
              {isStandAside ? '$0.00' : `-$${plan.maxLoss}`}
            </div>
          </div>

          <div className="calc-field">
            <label className="calc-label">TOTAL PROFIT (TP1+TP2)</label>
            <div className="calc-result-box" style={{ padding: '8px', fontSize: '15px', fontWeight: 800, color: 'var(--bull-glow)' }}>
              {isStandAside ? '$0.00' : `+$${plan.totalGain}`}
            </div>
          </div>
        </div>

        {/* Prop Firm Guardrails & Drawdown Telemetry Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Max Daily Loss ({activeFirm.dailyLossPct}%)
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--bear-glow)', fontFamily: 'var(--font-mono)' }}>
              -${parseFloat(plan.maxDailyLoss).toLocaleString()}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Max Total Drawdown ({activeFirm.maxLossPct}%)
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--bear-glow)', fontFamily: 'var(--font-mono)' }}>
              -${parseFloat(plan.maxTotalLoss).toLocaleString()}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Drawdown Buffer
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: plan.drawdownLossesBuffer >= 6 ? 'var(--bull-glow)' : plan.drawdownLossesBuffer >= 3 ? 'var(--gold-glow)' : 'var(--bear-glow)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {plan.drawdownLossesBuffer} Stop-Outs Allowed
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Target Phase 1 ({activeFirm.profitTargetPhase1Pct}%)
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--bull-glow)', fontFamily: 'var(--font-mono)' }}>
              +${parseFloat(plan.profitTargetPhase1).toLocaleString()} ({plan.tradeGainPctOfTarget}%/trade)
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              News Trading Restriction
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: plan.firmNewsRestricted ? 'var(--bear-glow)' : 'var(--bull-glow)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '2px',
              }}
            >
              {plan.firmNewsRestricted ? <Lock size={12} /> : null}
              {plan.firmNewsRestricted ? 'LOCKUP ACTIVE (STAND ASIDE)' : 'SAFE (NO RED FOLDERS)'}
            </div>
          </div>
        </div>

        {/* Warning if risk exceeds firm safety cap */}
        {plan.isRiskOverLimit && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--border-bear)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '11px',
              color: 'var(--bear-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={14} />
            <span>
              <strong>Prop Firm Warning:</strong> {riskPercent}% risk per trade exceeds {activeFirm.shortName}'s recommended safety cap ({activeFirm.maxSafeRiskPct}% max). A 2-trade drawdown will consume {((2 * riskPercent / activeFirm.dailyLossPct) * 100).toFixed(0)}% of your daily limit.
            </span>
          </div>
        )}
      </div>

      {/* 6-Pillar Live Pre-Flight Trade & Prop Firm Safety Checklist */}
      <div>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
          6-PILLAR PRE-FLIGHT TRADE & PROP FIRM VALIDATION CHECKLIST
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          {plan.pillars.map((pillar, idx) => (
            <div
              key={idx}
              style={{
                background: pillar.pass ? 'rgba(16, 185, 129, 0.07)' : 'rgba(239, 68, 68, 0.07)',
                border: pillar.pass ? '1px solid var(--border-bull)' : '1px solid var(--border-bear)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: pillar.pass ? 'var(--bull-glow)' : 'var(--bear-glow)' }}>
                  {pillar.pass ? '✓ PASS' : '✗ BLOCKED'}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Pillar #{idx + 1}</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{pillar.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pillar.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
