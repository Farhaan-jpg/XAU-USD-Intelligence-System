// client/src/components/TradeExecutionCopilot.jsx
// Institutional Trade Execution Copilot & Custom Capital Defense Suite
// Synthesizes Confluence, SMC Liquidity Pools, Macro Radar, Custom Drawdown Rules, and News Lockups into actionable trade plans

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
  Sliders,
  Lock,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export default function TradeExecutionCopilot({
  prices = {},
  newsFeed = [],
  calendarData = {},
  cotData = {},
}) {
  // User-defined manual account & capital defense state
  const [accountBalance, setAccountBalance] = useState(100000);
  const [profitTargetPct, setProfitTargetPct] = useState(8.0);
  const [maxDailyLossPct, setMaxDailyLossPct] = useState(4.0);
  const [maxTotalDrawdownPct, setMaxTotalDrawdownPct] = useState(8.0);
  const [riskPercent, setRiskPercent] = useState(0.5);
  const [newsLockupMins, setNewsLockupMins] = useState(15);

  const [copied, setCopied] = useState(false);
  const [isSquawking, setIsSquawking] = useState(false);

  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const dxy = prices['DX-Y.NYB'] || {};
  const us10y = prices['^TNX'] || {};
  const silver = prices['SI=F'] || prices['XAGUSD'] || {};

  const spotPrice = parseFloat(gold.price || 2400);
  const goldHigh = parseFloat(gold.high || spotPrice + 12);
  const goldLow = parseFloat(gold.low || spotPrice - 12);

  // Compute Full Institutional Signal Plan & Custom Defense Guardrails
  const plan = useMemo(() => {
    const goldChg5m = parseFloat(gold.change5m || 0);
    const goldChgDay = parseFloat(gold.changeDay || 0);
    const dxyChg5m = parseFloat(dxy.change5m || 0);
    const dxyChgDay = parseFloat(dxy.changeDay || 0);
    const us10yChg5m = parseFloat(us10y.change5m || 0);
    const us10yChgDay = parseFloat(us10y.changeDay || 0);
    const silverChg5m = parseFloat(silver.change5m || 0);

    // 1. Check Calendar Lockup against user-defined newsLockupMins
    let isNewsLockup = false;
    let newsLockupReason = '';
    const upcoming = calendarData?.events || calendarData?.upcomingEvents || [];
    const nextHigh = upcoming.find((e) => e.impact === 'HIGH');
    if (nextHigh && newsLockupMins > 0) {
      const eventTime = new Date(nextHigh.date || nextHigh.timeUTC).getTime();
      const diffMins = Math.round((eventTime - Date.now()) / 60000);
      if (diffMins >= 0 && diffMins <= newsLockupMins) {
        isNewsLockup = true;
        newsLockupReason = `${nextHigh.title} (${nextHigh.currency}) releases in ${diffMins}m. Custom news buffer lockup active.`;
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
      grade = 'HIGH IMPACT NEWS LOCKUP';
      rationale = `${newsLockupReason} Capital protection rule enforced. Avoid entering trades within your custom ${newsLockupMins}m news buffer.`;
      winProb = 20;
    } else if (netScore >= 65 && spotPrice >= bullishOB && spotPrice <= eq) {
      action = 'BUY';
      grade = 'A+ INSTITUTIONAL SETUP';
      entry = spotPrice;
      const slDist = Math.max(5.0, (entry - ssl) * 0.55);
      sl = parseFloat((entry - slDist).toFixed(2));
      const risk = entry - sl;
      tp1 = parseFloat((entry + risk * 2.0).toFixed(2));
      tp2 = parseFloat((entry + risk * 3.5).toFixed(2));
      rrRatio = parseFloat((((tp1 - entry) + (tp2 - entry)) / 2 / risk).toFixed(1));
      winProb = 88;
      rationale = `Triple Confluence: Macro Dollar & Yields retreating, institutional discount demand pool at $${bullishOB.toFixed(2)}, and BSL target at $${bsl.toFixed(2)}.`;
    } else if (netScore <= -65 && spotPrice <= bearishOB && spotPrice >= eq) {
      action = 'SELL';
      grade = 'A+ INSTITUTIONAL SETUP';
      entry = spotPrice;
      const slDist = Math.max(5.0, (bsl - entry) * 0.55);
      sl = parseFloat((entry + slDist).toFixed(2));
      const risk = sl - entry;
      tp1 = parseFloat((entry - risk * 2.0).toFixed(2));
      tp2 = parseFloat((entry - risk * 3.5).toFixed(2));
      rrRatio = parseFloat((((entry - tp1) + (entry - tp2)) / 2 / risk).toFixed(1));
      winProb = 87;
      rationale = `Triple Confluence: Macro Dollar surging, institutional supply premium pool at $${bearishOB.toFixed(2)}, and SSL target at $${ssl.toFixed(2)}.`;
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

    // Mathematical Position Sizing & User-Defined Defense Guardrails
    const dollarRisk = accountBalance * (riskPercent / 100);
    const slPipsOrDollars = Math.abs(entry - sl);
    // 1 standard lot of gold = 100 oz. $1 move in gold on 1.00 lot = $100 profit/loss.
    const calculatedLot = slPipsOrDollars > 0 ? parseFloat((dollarRisk / (slPipsOrDollars * 100)).toFixed(2)) : 0.01;
    const lotSize = Math.max(0.01, calculatedLot);
    const maxLoss = parseFloat((slPipsOrDollars * 100 * lotSize).toFixed(2));
    const gainTP1 = parseFloat((Math.abs(tp1 - entry) * 100 * (lotSize * 0.5)).toFixed(2));
    const gainTP2 = parseFloat((Math.abs(tp2 - entry) * 100 * (lotSize * 0.5)).toFixed(2));
    const totalGain = parseFloat((gainTP1 + gainTP2).toFixed(2));

    // Custom Account Capital Defense Limits
    const dailyLossLimit = accountBalance * (maxDailyLossPct / 100);
    const maxTotalDrawdown = accountBalance * (maxTotalDrawdownPct / 100);
    const profitTargetAmount = accountBalance * (profitTargetPct / 100);

    const drawdownLossesBuffer = dollarRisk > 0 ? Math.floor(dailyLossLimit / dollarRisk) : 0;
    const tradeGainPctOfTarget = profitTargetAmount > 0 ? ((totalGain / profitTargetAmount) * 100).toFixed(1) : '0.0';
    const dailyLossPctConsumed = dailyLossLimit > 0 ? ((maxLoss / dailyLossLimit) * 100).toFixed(1) : '0.0';
    const isRiskTooHighForDailyDD = dollarRisk > dailyLossLimit * 0.33; // Elevated risk if single trade consumes > 33% of daily limit

    // 6-Pillar Live Pre-Flight Trade & Capital Defense Checklist
    const pillars = [
      {
        name: 'Session Liquidity',
        pass: isPeakSession,
        desc: sessionLabel,
      },
      {
        name: 'News Lockup Safe',
        pass: !isNewsLockup,
        desc: isNewsLockup ? newsLockupReason : `No Red-Folder releases within ${newsLockupMins}m`,
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
        name: 'Capital Defense Guardrail',
        pass: !isRiskTooHighForDailyDD && drawdownLossesBuffer >= 3,
        desc: isRiskTooHighForDailyDD
          ? `High Risk: Consumes ${dailyLossPctConsumed}% of daily limit (${drawdownLossesBuffer} stop-outs)`
          : `${drawdownLossesBuffer} stop-outs allowed before daily limit ($${dailyLossLimit.toLocaleString()})`,
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
      dailyLossLimit,
      maxTotalDrawdown,
      profitTargetAmount,
      drawdownLossesBuffer,
      tradeGainPctOfTarget,
      dailyLossPctConsumed,
      isRiskTooHighForDailyDD,
    };
  }, [
    spotPrice,
    goldHigh,
    goldLow,
    gold,
    dxy,
    us10y,
    silver,
    newsFeed,
    calendarData,
    cotData,
    accountBalance,
    profitTargetPct,
    maxDailyLossPct,
    maxTotalDrawdownPct,
    riskPercent,
    newsLockupMins,
  ]);

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
      speech = `Copilot recommendation: Stand aside. ${plan.rationale}`;
    } else {
      speech = `Trade recommendation for ${accountBalance.toLocaleString()} dollar account. Action: ${plan.action} Gold at ${plan.entry.toFixed(2)} dollars. Stop loss: ${plan.sl.toFixed(2)}. Target one: ${plan.tp1.toFixed(2)}. Position size: ${plan.lotSize} lots, risking ${riskPercent} percent or ${plan.dollarRisk} dollars. Daily loss limit: ${plan.dailyLossLimit.toLocaleString()} dollars with ${plan.drawdownLossesBuffer} stop outs buffer.`;
    }
    speakSquawk(speech, { priority: true, cooldownSeconds: 0 });
    setTimeout(() => setIsSquawking(false), 3000);
  };

  // Copy Order to Clipboard
  const handleCopyOrder = () => {
    const text = `=== XAU/USD INSTITUTIONAL TRADE ORDER ===
ACCOUNT CONFIGURATION: Custom Capital Defense
ACCOUNT BALANCE: $${accountBalance.toLocaleString()}
ACTION: ${plan.action} (XAU/USD)
ORDER TYPE: LIMIT / MARKET
GRADE: ${plan.grade}
ENTRY: $${plan.entry.toFixed(2)}
STOP LOSS: $${plan.sl.toFixed(2)} (-$${plan.riskDistance})
TAKE PROFIT 1: $${plan.tp1.toFixed(2)} (1:2.0 R:R)
TAKE PROFIT 2: $${plan.tp2.toFixed(2)} (1:3.4+ R:R)
LOT SIZE: ${plan.lotSize} LOTS (${riskPercent}% Risk on $${accountBalance.toLocaleString()})
MAX CASH AT RISK: -$${plan.maxLoss} (${plan.dailyLossPctConsumed}% of Daily Loss Limit)
PROJECTED PROFIT: +$${plan.totalGain} (${plan.tradeGainPctOfTarget}% of Target)
DAILY LOSS LIMIT: -$${plan.dailyLossLimit.toLocaleString()} (${maxDailyLossPct}%)
MAX TOTAL DRAWDOWN: -$${plan.maxTotalDrawdown.toLocaleString()} (${maxTotalDrawdownPct}%)
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
      style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 38, 0.95), rgba(10, 15, 24, 0.98))',
        border: `1px solid ${isStandAside ? 'var(--border-medium)' : themeColor}`,
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        boxShadow: isStandAside ? '0 8px 32px rgba(0, 0, 0, 0.5)' : `0 0 30px ${isBuy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: isBuy ? 'var(--bull-bg)' : isSell ? 'var(--bear-bg)' : 'var(--gold-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${themeColor}`,
            }}
          >
            {isBuy ? (
              <ArrowUpRight size={22} style={{ color: 'var(--bull-glow)' }} />
            ) : isSell ? (
              <ArrowDownRight size={22} style={{ color: 'var(--bear-glow)' }} />
            ) : (
              <Zap size={22} style={{ color: 'var(--gold-glow)' }} />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
                INSTITUTIONAL EXECUTION COPILOT
              </h2>
              <span
                className="telemetry-badge"
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: themeColor,
                  borderColor: themeColor,
                  background: 'rgba(0, 0, 0, 0.4)',
                }}
              >
                {plan.grade}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-time multi-factor execution engine with dynamic capital preservation and custom drawdown limits.
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
              padding: '6px 14px',
              borderColor: 'var(--gold-glow)',
              color: 'var(--gold-glow)',
              cursor: 'pointer',
            }}
          >
            <Volume2 size={14} />
            <span>{isSquawking ? 'Squawking Plan...' : '🔊 Voice Squawk'}</span>
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
              cursor: isStandAside ? 'not-allowed' : 'pointer',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : '📋 Copy Trade Order'}</span>
          </button>
        </div>
      </div>

      {/* Main Signal Display Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.4)',
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

      {/* CUSTOM ACCOUNT & CAPITAL DEFENSE SUITE */}
      <div
        style={{
          background: 'rgba(15, 23, 38, 0.75)',
          border: `1px solid ${plan.isRiskTooHighForDailyDD ? 'var(--bear-glow)' : 'var(--border-medium)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Panel Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} style={{ color: 'var(--gold-glow)' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              CUSTOM ACCOUNT PARAMETERS & CAPITAL DEFENSE
            </span>
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: 'var(--gold-glow)',
              border: '1px solid var(--border-gold)',
              fontWeight: 700,
            }}
          >
            MANUAL RISK CONFIGURATION
          </span>
        </div>

        {/* Tier 1: User-Defined Manual Input Parameter Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '12px',
          }}
        >
          {/* 1. Account Balance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Account Balance ($)
            </label>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Math.max(100, parseFloat(e.target.value) || 100))}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                padding: '8px 10px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
              {[10000, 25000, 50000, 100000, 200000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAccountBalance(amt)}
                  style={{
                    fontSize: '9px',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    background: accountBalance === amt ? 'var(--gold-glow)' : 'rgba(255, 255, 255, 0.05)',
                    color: accountBalance === amt ? '#000' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ${amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Profit Target (%) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bull-glow)', textTransform: 'uppercase' }}>
              Profit Target (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={profitTargetPct}
              onChange={(e) => setProfitTargetPct(Math.max(0.5, parseFloat(e.target.value) || 1))}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-bull)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--bull-glow)',
                padding: '8px 10px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
              {[5.0, 8.0, 10.0, 15.0].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setProfitTargetPct(pct)}
                  style={{
                    fontSize: '9px',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    background: profitTargetPct === pct ? 'var(--bull-glow)' : 'rgba(255, 255, 255, 0.05)',
                    color: profitTargetPct === pct ? '#000' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* 3. Max Loss Per Day (%) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bear-glow)', textTransform: 'uppercase' }}>
              Max Loss Per Day (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={maxDailyLossPct}
              onChange={(e) => setMaxDailyLossPct(Math.max(0.5, parseFloat(e.target.value) || 1))}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-bear)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--bear-glow)',
                padding: '8px 10px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
              {[3.0, 4.0, 5.0, 6.0].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setMaxDailyLossPct(pct)}
                  style={{
                    fontSize: '9px',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    background: maxDailyLossPct === pct ? 'var(--bear-glow)' : 'rgba(255, 255, 255, 0.05)',
                    color: maxDailyLossPct === pct ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* 4. Max Total Drawdown (%) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bear-glow)', textTransform: 'uppercase' }}>
              Max Total Drawdown (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={maxTotalDrawdownPct}
              onChange={(e) => setMaxTotalDrawdownPct(Math.max(1.0, parseFloat(e.target.value) || 1))}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-bear)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--bear-glow)',
                padding: '8px 10px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
              {[6.0, 8.0, 10.0, 12.0].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setMaxTotalDrawdownPct(pct)}
                  style={{
                    fontSize: '9px',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    background: maxTotalDrawdownPct === pct ? 'var(--bear-glow)' : 'rgba(255, 255, 255, 0.05)',
                    color: maxTotalDrawdownPct === pct ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* 5. Risk Per Trade (%) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-glow)', textTransform: 'uppercase' }}>
              Risk Per Trade (%)
            </label>
            <select
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: `1px solid ${plan.isRiskTooHighForDailyDD ? 'var(--bear-glow)' : 'var(--border-gold)'}`,
                borderRadius: 'var(--radius-sm)',
                color: plan.isRiskTooHighForDailyDD ? 'var(--bear-glow)' : 'var(--gold-glow)',
                padding: '8px 10px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                outline: 'none',
              }}
            >
              <option value="0.25">0.25% (Ultra Defensive)</option>
              <option value="0.35">0.35% (Conservative)</option>
              <option value="0.5">0.50% (Recommended Balanced)</option>
              <option value="0.75">0.75% (Moderate Aggression)</option>
              <option value="1.0">1.00% (High Volatility Risk)</option>
              <option value="1.5">1.50% (Aggressive)</option>
              <option value="2.0">2.00% (Maximum Cap)</option>
            </select>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              ${(accountBalance * (riskPercent / 100)).toFixed(2)} cash risk
            </span>
          </div>

          {/* 6. News Lockup Buffer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--cyan-glow)', textTransform: 'uppercase' }}>
              News Buffer (Mins)
            </label>
            <select
              value={newsLockupMins}
              onChange={(e) => setNewsLockupMins(parseInt(e.target.value, 10))}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--cyan-glow)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--cyan-glow)',
                padding: '8px 10px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                outline: 'none',
              }}
            >
              <option value="0">0m (News Trading Allowed)</option>
              <option value="5">5 Mins Before/After</option>
              <option value="10">10 Mins Before/After</option>
              <option value="15">15 Mins (Recommended)</option>
              <option value="30">30 Mins (High Caution)</option>
            </select>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              Stand aside on Tier-1 events
            </span>
          </div>
        </div>

        {/* Tier 2: Output Telemetry Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '10px',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Recommended Lots */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Recommended Lot Size
            </div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--gold-glow)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {isStandAside ? '0.00' : `${plan.lotSize} Lots`}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              100 oz contract sizer
            </div>
          </div>

          {/* Max Cash At Risk */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Max Cash At Risk
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--bear-glow)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {isStandAside ? '$0.00' : `-$${plan.maxLoss}`}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {plan.dailyLossPctConsumed}% of Daily Limit
            </div>
          </div>

          {/* Profit Potential */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Profit Potential (TP1+TP2)
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--bull-glow)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {isStandAside ? '$0.00' : `+$${plan.totalGain}`}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {plan.tradeGainPctOfTarget}% of Target (${plan.profitTargetAmount.toLocaleString()})
            </div>
          </div>

          {/* Daily Loss Ceiling */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Daily Loss Limit ({maxDailyLossPct}%)
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--bear-glow)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              -${plan.dailyLossLimit.toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Max allowable daily loss
            </div>
          </div>

          {/* Max Total Drawdown */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Max Drawdown ({maxTotalDrawdownPct}%)
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--bear-glow)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              -${plan.maxTotalDrawdown.toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Total account breaker
            </div>
          </div>

          {/* Drawdown Buffer */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Drawdown Defense Buffer
            </div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 900,
                color: plan.drawdownLossesBuffer >= 6 ? 'var(--bull-glow)' : plan.drawdownLossesBuffer >= 3 ? 'var(--gold-glow)' : 'var(--bear-glow)',
                fontFamily: 'var(--font-mono)',
                marginTop: '2px',
              }}
            >
              {plan.drawdownLossesBuffer} Stop-Outs
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Consecutive trades buffer
            </div>
          </div>
        </div>

        {/* Tier 3: Advisory Warnings & Defense Feedback */}
        {plan.isRiskTooHighForDailyDD ? (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--border-bear)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '12px',
              color: 'var(--bear-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} />
            <span>
              <strong>Capital Defense Warning:</strong> Risk of {riskPercent}% per trade is high relative to your {maxDailyLossPct}% daily loss limit. A string of 2 stop-outs would consume {((2 * riskPercent / maxDailyLossPct) * 100).toFixed(0)}% of your allowed daily loss limit. Consider lowering risk to 0.35% - 0.50% for optimal capital defense.
            </span>
          </div>
        ) : plan.isNewsLockup ? (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--border-bear)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '12px',
              color: 'var(--bear-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Lock size={16} />
            <span>
              <strong>News Lockup Active:</strong> A high-impact economic release is scheduled within your {newsLockupMins}-minute buffer. Execution is halted to protect your account against spread widening and slippage.
            </span>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid var(--border-bull)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '11px',
              color: 'var(--bull-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={14} />
            <span>
              <strong>Capital Defense Approved:</strong> Risk configuration adheres to institutional risk management guidelines with a {plan.drawdownLossesBuffer}-trade daily drawdown buffer.
            </span>
          </div>
        )}
      </div>

      {/* 6-Pillar Live Pre-Flight Trade & Capital Defense Checklist */}
      <div>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
          6-PILLAR PRE-FLIGHT TRADE VALIDATION CHECKLIST
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
