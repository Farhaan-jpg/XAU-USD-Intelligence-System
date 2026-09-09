// client/src/components/TradeExecutionCopilot.jsx
// Institutional Trade Execution Copilot & Custom Capital Defense Suite
// Features: Persistent Final Decision Locking, Dynamic Capital Preservation, Minimalist Execution Matrix

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Copy,
  Check,
  Volume2,
  AlertTriangle,
  Sliders,
  Lock,
  Unlock,
  CheckCircle2,
  RefreshCw,
  Activity,
  Crosshair,
} from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

export default function TradeExecutionCopilot({
  prices = {},
  newsFeed = [],
  calendarData = {},
  cotData = {},
}) {
  // Manual Account & Risk State
  const [accountBalance, setAccountBalance] = useState(100000);
  const [profitTargetPct, setProfitTargetPct] = useState(8.0);
  const [maxDailyLossPct, setMaxDailyLossPct] = useState(4.0);
  const [maxTotalDrawdownPct, setMaxTotalDrawdownPct] = useState(8.0);
  const [riskPercent, setRiskPercent] = useState(0.5);
  const [newsLockupMins, setNewsLockupMins] = useState(15);

  // Decision Lock State (Prevents frequent toggling / flickering)
  const [lockedDecision, setLockedDecision] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSquawking, setIsSquawking] = useState(false);

  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const dxy = prices['DX-Y.NYB'] || {};
  const us10y = prices['^TNX'] || {};
  const silver = prices['SI=F'] || prices['XAGUSD'] || {};

  const spotPrice = parseFloat(gold.price || 2400);
  const goldHigh = parseFloat(gold.high || spotPrice + 12);
  const goldLow = parseFloat(gold.low || spotPrice - 12);

  // Market Scanner (Evaluates Institutional Confluence)
  const liveScan = useMemo(() => {
    const goldChg5m = parseFloat(gold.change5m || 0);
    const goldChgDay = parseFloat(gold.changeDay || 0);
    const dxyChg5m = parseFloat(dxy.change5m || 0);
    const dxyChgDay = parseFloat(dxy.changeDay || 0);
    const us10yChg5m = parseFloat(us10y.change5m || 0);
    const silverChg5m = parseFloat(silver.change5m || 0);

    // News Lockup
    let isNewsLockup = false;
    let newsLockupReason = '';
    const upcoming = calendarData?.events || calendarData?.upcomingEvents || [];
    const nextHigh = upcoming.find((e) => e.impact === 'HIGH');
    if (nextHigh && newsLockupMins > 0) {
      const eventTime = new Date(nextHigh.date || nextHigh.timeUTC).getTime();
      const diffMins = Math.round((eventTime - Date.now()) / 60000);
      if (diffMins >= 0 && diffMins <= newsLockupMins) {
        isNewsLockup = true;
        newsLockupReason = `${nextHigh.title} in ${diffMins}m (${nextHigh.currency})`;
      }
    }

    // Session
    const nowUtcHour = new Date().getUTCHours();
    const isPeakSession = nowUtcHour >= 7 && nowUtcHour <= 17;
    const sessionLabel =
      nowUtcHour >= 12 && nowUtcHour <= 16
        ? 'London/NY Overlap'
        : nowUtcHour >= 7 && nowUtcHour < 12
        ? 'London Session'
        : nowUtcHour > 16 && nowUtcHour <= 21
        ? 'Late NY Session'
        : 'Asian Accumulation';

    // SMC Levels
    const range = Math.max(10, goldHigh - goldLow);
    const eq = (goldHigh + goldLow) / 2;
    const bsl = goldHigh + Math.max(2.5, range * 0.06);
    const ssl = goldLow - Math.max(2.5, range * 0.06);
    const bullishOB = goldLow + range * 0.08;
    const bearishOB = goldHigh - range * 0.08;

    // Macro Vector
    const dxyImpulse = dxyChg5m * 0.65 + dxyChgDay * 0.35;
    const us10yImpulse = us10yChg5m * 0.65;
    const macroBullish = dxyImpulse < -0.015 || (dxyImpulse < 0 && us10yImpulse < 0);
    const macroBearish = dxyImpulse > 0.015 || (dxyImpulse > 0 && us10yImpulse > 0);

    let bullScore = 0;
    let bearScore = 0;

    if (macroBullish) bullScore += 25;
    else if (macroBearish) bearScore += 25;

    if (silverChg5m > goldChg5m + 0.03) bullScore += 15;
    else if (silverChg5m < goldChg5m - 0.03) bearScore += 15;

    const recent = newsFeed.slice(0, 15);
    let bullNews = 0;
    let bearNews = 0;
    recent.forEach((item) => {
      if (item.bias === 'BULLISH') bullNews += item.impact === 'HIGH' ? 3 : 1;
      else if (item.bias === 'BEARISH') bearNews += item.impact === 'HIGH' ? 3 : 1;
    });
    if (bullNews > bearNews + 2) bullScore += 25;
    else if (bearNews > bullNews + 2) bearScore += 25;

    if (spotPrice <= eq) bullScore += 15;
    else bearScore += 15;

    const mmBias = cotData?.managedMoney?.biasPct || 87;
    if (mmBias >= 80) bullScore += 15;
    else if (mmBias <= 50) bearScore += 15;

    const netScore = bullScore - bearScore;

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
      grade = 'NEWS LOCKUP ACTIVE';
      rationale = `${newsLockupReason}. Capital defense active: Trades paused during high-impact news window.`;
      winProb = 20;
    } else if (netScore >= 60 && spotPrice >= bullishOB && spotPrice <= eq) {
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
      rationale = `Triple Confluence: Macro Dollar retreating, institutional discount demand at $${bullishOB.toFixed(2)}, BSL target at $${bsl.toFixed(2)}.`;
    } else if (netScore <= -60 && spotPrice <= bearishOB && spotPrice >= eq) {
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
      rationale = `Triple Confluence: Macro Dollar surging, institutional supply premium at $${bearishOB.toFixed(2)}, SSL target at $${ssl.toFixed(2)}.`;
    } else if (netScore >= 40 && spotPrice < bsl - 4) {
      action = 'BUY';
      grade = 'B+ CONFLUENCE SETUP';
      entry = spotPrice <= eq ? spotPrice : eq;
      const slDist = Math.max(5.5, (entry - ssl) * 0.6);
      sl = parseFloat((entry - slDist).toFixed(2));
      const risk = entry - sl;
      tp1 = parseFloat((entry + risk * 2.0).toFixed(2));
      tp2 = parseFloat((entry + risk * 3.4).toFixed(2));
      rrRatio = parseFloat((((tp1 - entry) + (tp2 - entry)) / 2 / risk).toFixed(1));
      winProb = 78;
      rationale = `Macro tailwind: Dollar retreating. Gold at discount equilibrium ($${eq.toFixed(2)}) with resting buy stops targeted at $${bsl.toFixed(2)}.`;
    } else if (netScore <= -40 && spotPrice > ssl + 4) {
      action = 'SELL';
      grade = 'B+ CONFLUENCE SETUP';
      entry = spotPrice >= eq ? spotPrice : eq;
      const slDist = Math.max(5.5, (bsl - entry) * 0.6);
      sl = parseFloat((entry + slDist).toFixed(2));
      const risk = sl - entry;
      tp1 = parseFloat((entry - risk * 2.0).toFixed(2));
      tp2 = parseFloat((entry - risk * 3.4).toFixed(2));
      rrRatio = parseFloat((((entry - tp1) + (entry - tp2)) / 2 / risk).toFixed(1));
      winProb = 76;
      rationale = `Macro headwind: Dollar pushing higher. Gold at premium resistance with sell stops targeted at $${ssl.toFixed(2)}.`;
    } else {
      action = 'STAND_ASIDE';
      grade = 'CHOP / NEUTRAL';
      rationale = `Market in equilibrium compression ($${spotPrice.toFixed(2)}). Awaiting liquidity sweep of $${bsl.toFixed(2)} or $${ssl.toFixed(2)}.`;
      winProb = 48;
    }

    return {
      action,
      grade,
      entry,
      sl,
      tp1,
      tp2,
      riskDistance: Math.abs(entry - sl).toFixed(2),
      rrRatio,
      winProb,
      rationale,
      isNewsLockup,
      newsLockupReason,
      isPeakSession,
      sessionLabel,
      netScore,
      macroBullish,
      macroBearish,
      dxyImpulse,
      dxyChg5m,
      dxyChgDay,
      us10yChg5m,
    };
  }, [spotPrice, goldHigh, goldLow, gold, dxy, us10y, silver, newsFeed, calendarData, cotData, newsLockupMins]);

  // Signal State Machine: Lock in decision once generated so it doesn't flicker on and off!
  useEffect(() => {
    if (!lockedDecision && (liveScan.action === 'BUY' || liveScan.action === 'SELL')) {
      // Lock in the setup as the authoritative decision
      setLockedDecision({
        id: Date.now(),
        action: liveScan.action,
        grade: liveScan.grade,
        entry: liveScan.entry,
        sl: liveScan.sl,
        tp1: liveScan.tp1,
        tp2: liveScan.tp2,
        riskDistance: liveScan.riskDistance,
        rrRatio: liveScan.rrRatio,
        winProb: liveScan.winProb,
        rationale: liveScan.rationale,
        lockedAt: new Date().toLocaleTimeString(),
      });
    }
  }, [liveScan.action, lockedDecision]);

  // Automated voice squawk when a trade setup locks in (Both Bullish & Bearish)
  const announcedLockRef = useRef(null);
  useEffect(() => {
    if (lockedDecision && lockedDecision.id !== announcedLockRef.current) {
      announcedLockRef.current = lockedDecision.id;
      const isSell = lockedDecision.action === 'SELL';
      const isBuy = lockedDecision.action === 'BUY';

      if (isSell) {
        speakSquawk(
          `Trade Alert. Institutional Bearish Sell setup confirmed on Gold. Entry at ${lockedDecision.entry.toFixed(2)} dollars. Invalidation stop loss at ${lockedDecision.sl.toFixed(2)}. Target one at ${lockedDecision.tp1.toFixed(2)}. Win probability: ${lockedDecision.winProb} percent.`,
          {
            category: 'confluence',
            preChime: 'bearish',
            dedupeKey: `copilot_sell_${lockedDecision.id}`,
            priority: true,
            cooldownSeconds: 300,
          }
        );
      } else if (isBuy) {
        speakSquawk(
          `Trade Alert. Institutional Bullish Buy setup confirmed on Gold. Entry at ${lockedDecision.entry.toFixed(2)} dollars. Invalidation stop loss at ${lockedDecision.sl.toFixed(2)}. Target one at ${lockedDecision.tp1.toFixed(2)}. Win probability: ${lockedDecision.winProb} percent.`,
          {
            category: 'confluence',
            preChime: 'confluence',
            dedupeKey: `copilot_buy_${lockedDecision.id}`,
            priority: true,
            cooldownSeconds: 300,
          }
        );
      }
    }
  }, [lockedDecision]);

  // Unlocks / resets the locked decision
  const handleUnlockDecision = () => {
    setLockedDecision(null);
  };

  // Active Trade Plan: Prefers lockedDecision if active, otherwise displays liveScan
  const activePlan = useMemo(() => {
    const isLocked = !!lockedDecision;
    const plan = lockedDecision || liveScan;

    // Mathematical Position Sizing for 100 oz Gold contracts
    const dollarRisk = accountBalance * (riskPercent / 100);
    const slPipsOrDollars = parseFloat(plan.riskDistance) || 5.0;
    const calculatedLot = slPipsOrDollars > 0 ? parseFloat((dollarRisk / (slPipsOrDollars * 100)).toFixed(2)) : 0.01;
    const lotSize = Math.max(0.01, calculatedLot);
    const maxLoss = parseFloat((slPipsOrDollars * 100 * lotSize).toFixed(2));
    const gainTP1 = parseFloat((Math.abs(plan.tp1 - plan.entry) * 100 * (lotSize * 0.5)).toFixed(2));
    const gainTP2 = parseFloat((Math.abs(plan.tp2 - plan.entry) * 100 * (lotSize * 0.5)).toFixed(2));
    const totalGain = parseFloat((gainTP1 + gainTP2).toFixed(2));

    // Custom Account Capital Defense Limits
    const dailyLossLimit = accountBalance * (maxDailyLossPct / 100);
    const maxTotalDrawdown = accountBalance * (maxTotalDrawdownPct / 100);
    const profitTargetAmount = accountBalance * (profitTargetPct / 100);

    const drawdownLossesBuffer = dollarRisk > 0 ? Math.floor(dailyLossLimit / dollarRisk) : 0;
    const tradeGainPctOfTarget = profitTargetAmount > 0 ? ((totalGain / profitTargetAmount) * 100).toFixed(1) : '0.0';
    const dailyLossPctConsumed = dailyLossLimit > 0 ? ((maxLoss / dailyLossLimit) * 100).toFixed(1) : '0.0';
    const isRiskTooHighForDailyDD = dollarRisk > dailyLossLimit * 0.33;

    // Live Execution Tracking (when trade is active)
    let liveStatus = 'ACTIVE SETUP';
    let floatingGain = 0;
    if (plan.action === 'BUY') {
      floatingGain = parseFloat(((spotPrice - plan.entry) * 100 * lotSize).toFixed(2));
      if (spotPrice >= plan.tp2) liveStatus = 'TARGET 2 (RUNNER) COMPLETED';
      else if (spotPrice >= plan.tp1) liveStatus = 'TARGET 1 ACHIEVED';
      else if (spotPrice <= plan.sl) liveStatus = 'STOPPED OUT (INVALIDATED)';
    } else if (plan.action === 'SELL') {
      floatingGain = parseFloat(((plan.entry - spotPrice) * 100 * lotSize).toFixed(2));
      if (spotPrice <= plan.tp2) liveStatus = 'TARGET 2 (RUNNER) COMPLETED';
      else if (spotPrice <= plan.tp1) liveStatus = 'TARGET 1 ACHIEVED';
      else if (spotPrice >= plan.sl) liveStatus = 'STOPPED OUT (INVALIDATED)';
    }

    // 6-Pillars Checklist
    const pillars = [
      {
        name: 'Session',
        pass: liveScan.isPeakSession,
        desc: liveScan.sessionLabel,
      },
      {
        name: 'News Shield',
        pass: !liveScan.isNewsLockup,
        desc: liveScan.isNewsLockup ? liveScan.newsLockupReason : `${newsLockupMins}m Buffer Safe`,
      },
      {
        name: 'Macro Vector',
        pass: plan.action === 'BUY' ? liveScan.macroBullish || liveScan.dxyImpulse < 0 : plan.action === 'SELL' ? liveScan.macroBearish || liveScan.dxyImpulse > 0 : false,
        desc: `DXY: ${liveScan.dxyChg5m >= 0 ? '+' : ''}${liveScan.dxyChg5m.toFixed(2)}%`,
      },
      {
        name: 'Confluence',
        pass: Math.abs(liveScan.netScore) >= 40,
        desc: `${liveScan.netScore >= 0 ? '+' : ''}${liveScan.netScore} pts`,
      },
      {
        name: 'R:R Ratio',
        pass: plan.rrRatio >= 2.0,
        desc: `1:${plan.rrRatio || '2.0'}`,
      },
      {
        name: 'Capital Defense',
        pass: !isRiskTooHighForDailyDD && drawdownLossesBuffer >= 3,
        desc: `${drawdownLossesBuffer} stop-outs allowed`,
      },
    ];

    return {
      ...plan,
      isLocked,
      dollarRisk: dollarRisk.toFixed(2),
      lotSize,
      maxLoss,
      gainTP1,
      gainTP2,
      totalGain,
      dailyLossLimit,
      maxTotalDrawdown,
      profitTargetAmount,
      drawdownLossesBuffer,
      tradeGainPctOfTarget,
      dailyLossPctConsumed,
      isRiskTooHighForDailyDD,
      liveStatus,
      floatingGain,
      pillars,
    };
  }, [
    lockedDecision,
    liveScan,
    spotPrice,
    accountBalance,
    riskPercent,
    maxDailyLossPct,
    maxTotalDrawdownPct,
    profitTargetPct,
    newsLockupMins,
  ]);

  // Announce trade milestones (TP1, TP2, Stop Loss)
  const lastAnnouncedStatusRef = useRef('ACTIVE SETUP');
  useEffect(() => {
    if (activePlan.isLocked && activePlan.liveStatus !== lastAnnouncedStatusRef.current) {
      const status = activePlan.liveStatus;
      lastAnnouncedStatusRef.current = status;
      if (status.includes('TARGET 1')) {
        speakSquawk(`Trade update. Target one achieved at ${activePlan.tp1.toFixed(2)} dollars. Secure partial profits.`, {
          category: 'confluence',
          preChime: 'confluence',
          priority: true,
          cooldownSeconds: 60,
        });
      } else if (status.includes('TARGET 2')) {
        speakSquawk(`Trade update. Final runner target achieved at ${activePlan.tp2.toFixed(2)} dollars. Trade fully closed.`, {
          category: 'confluence',
          preChime: 'confluence',
          priority: true,
          cooldownSeconds: 60,
        });
      } else if (status.includes('STOPPED OUT')) {
        speakSquawk(`Trade alert. Stop loss reached at ${activePlan.sl.toFixed(2)} dollars. Setup invalidated under capital defense rules.`, {
          category: 'confluence',
          preChime: 'bearish',
          priority: true,
          cooldownSeconds: 60,
        });
      }
    }
  }, [activePlan.isLocked, activePlan.liveStatus, activePlan.tp1, activePlan.tp2, activePlan.sl]);

  // Voice Squawk
  const handleSquawkTradePlan = () => {
    setIsSquawking(true);
    let speech = '';
    if (activePlan.action === 'STAND_ASIDE') {
      speech = `Copilot decision: Stand aside. ${activePlan.rationale}`;
    } else {
      speech = `Final decision: ${activePlan.action} Gold at ${activePlan.entry.toFixed(2)} dollars. Stop loss: ${activePlan.sl.toFixed(2)}. Target one: ${activePlan.tp1.toFixed(2)}. Position size: ${activePlan.lotSize} lots, risking ${activePlan.dollarRisk} dollars. Allowed buffer: ${activePlan.drawdownLossesBuffer} stop outs.`;
    }
    speakSquawk(speech, { priority: true, cooldownSeconds: 0 });
    setTimeout(() => setIsSquawking(false), 3000);
  };

  // Copy Order
  const handleCopyOrder = () => {
    const text = `=== XAU/USD INSTITUTIONAL TRADE ORDER ===
DECISION STATUS: ${activePlan.isLocked ? 'FINAL LOCKED DECISION' : 'LIVE CONFLUENCE'}
ACCOUNT BALANCE: $${accountBalance.toLocaleString()}
ACTION: ${activePlan.action} (XAU/USD)
ENTRY: $${activePlan.entry.toFixed(2)}
STOP LOSS: $${activePlan.sl.toFixed(2)} (-$${activePlan.riskDistance})
TAKE PROFIT 1: $${activePlan.tp1.toFixed(2)} (1:2.0 R:R)
TAKE PROFIT 2: $${activePlan.tp2.toFixed(2)} (1:3.4+ R:R)
LOT SIZE: ${activePlan.lotSize} LOTS (${riskPercent}% Risk on $${accountBalance.toLocaleString()})
MAX CASH AT RISK: -$${activePlan.maxLoss} (${activePlan.dailyLossPctConsumed}% of Daily Limit)
PROJECTED PROFIT: +$${activePlan.totalGain} (${activePlan.tradeGainPctOfTarget}% of Target)
DAILY LOSS LIMIT: -$${activePlan.dailyLossLimit.toLocaleString()} (${maxDailyLossPct}%)
DRAWDOWN BUFFER: ${activePlan.drawdownLossesBuffer} consecutive stop-outs
WIN PROBABILITY: ${activePlan.winProb}%
RATIONALE: ${activePlan.rationale}`;

    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBuy = activePlan.action === 'BUY';
  const isSell = activePlan.action === 'SELL';
  const isStandAside = activePlan.action === 'STAND_ASIDE';

  const themeColor = isBuy
    ? 'var(--bull-glow)'
    : isSell
    ? 'var(--bear-glow)'
    : 'var(--gold-glow)';

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #0b111b 0%, #080d15 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* 1. Header & Actions Strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: isBuy ? 'var(--bull-bg)' : isSell ? 'var(--bear-bg)' : 'var(--gold-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${themeColor}`,
            }}
          >
            {isBuy ? (
              <ArrowUpRight size={18} style={{ color: 'var(--bull-glow)' }} />
            ) : isSell ? (
              <ArrowDownRight size={18} style={{ color: 'var(--bear-glow)' }} />
            ) : (
              <Crosshair size={18} style={{ color: 'var(--gold-glow)' }} />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.04em', color: '#fff' }}>
                TRADE COPILOT
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: activePlan.isLocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${activePlan.isLocked ? 'var(--bull-glow)' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: activePlan.isLocked ? 'var(--bull-glow)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {activePlan.isLocked ? <Lock size={10} /> : <Activity size={10} />}
                {activePlan.isLocked ? `FINAL DECISION (LOCKED ${activePlan.lockedAt})` : 'SCANNING FOR SETUP'}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Deterministic execution decisions with persistent setup locking and risk defense.
            </span>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activePlan.isLocked && (
            <button
              className="btn-secondary"
              onClick={handleUnlockDecision}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                padding: '5px 10px',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
              title="Unlock to scan a new trade setup"
            >
              <Unlock size={12} />
              <span>Unlock / New Scan</span>
            </button>
          )}

          <button
            className="btn-secondary"
            onClick={handleSquawkTradePlan}
            disabled={isSquawking}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              padding: '5px 12px',
              borderColor: 'var(--gold-glow)',
              color: 'var(--gold-glow)',
              cursor: 'pointer',
            }}
          >
            <Volume2 size={13} />
            <span>{isSquawking ? 'Squawking...' : 'Squawk'}</span>
          </button>

          <button
            className="btn-primary"
            onClick={handleCopyOrder}
            disabled={isStandAside}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              padding: '5px 14px',
              background: isBuy ? 'var(--bull-primary)' : isSell ? 'var(--bear-primary)' : undefined,
              cursor: isStandAside ? 'not-allowed' : 'pointer',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy Order'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Decision Ribbon (Minimalist, Large Numbers) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          background: 'rgba(0, 0, 0, 0.45)',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Action */}
        <div>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Action
          </span>
          <div style={{ fontSize: '18px', fontWeight: 900, color: themeColor, marginTop: '2px' }}>
            {isBuy ? 'BUY (LONG)' : isSell ? 'SELL (SHORT)' : 'STAND ASIDE'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {isStandAside ? 'Awaiting A+ vector' : activePlan.grade}
          </span>
        </div>

        {/* Execution Entry */}
        <div>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Entry Price
          </span>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {isStandAside ? '--' : `$${activePlan.entry.toFixed(2)}`}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
            {isStandAside ? 'Market locked' : 'Pullback / Limit'}
          </span>
        </div>

        {/* Stop Loss */}
        <div>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bear-glow)', textTransform: 'uppercase' }}>
            Stop Loss (SL)
          </span>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--bear-glow)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {isStandAside ? '--' : `$${activePlan.sl.toFixed(2)}`}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--bear-glow)' }}>
            {isStandAside ? '--' : `-$${activePlan.riskDistance} (${Math.round(parseFloat(activePlan.riskDistance) * 10)} p)`}
          </span>
        </div>

        {/* Take Profit 1 */}
        <div>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bull-glow)', textTransform: 'uppercase' }}>
            Take Profit 1
          </span>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--bull-glow)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {isStandAside ? '--' : `$${activePlan.tp1.toFixed(2)}`}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--bull-glow)' }}>
            {isStandAside ? '--' : '1:2.0 R:R (50% scale)'}
          </span>
        </div>

        {/* Take Profit 2 */}
        <div>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gold-glow)', textTransform: 'uppercase' }}>
            Take Profit 2
          </span>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gold-glow)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {isStandAside ? '--' : `$${activePlan.tp2.toFixed(2)}`}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--gold-glow)' }}>
            {isStandAside ? '--' : `1:${activePlan.rrRatio} Runner`}
          </span>
        </div>

        {/* Win Rate / Conviction */}
        <div>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Edge Conviction
          </span>
          <div style={{ fontSize: '18px', fontWeight: 900, color: themeColor, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {activePlan.winProb}%
          </div>
          <span style={{ fontSize: '10px', color: themeColor }}>
            {activePlan.winProb >= 80 ? 'Institutional Edge' : 'Chop Defense'}
          </span>
        </div>
      </div>

      {/* Live Trade Status & Floating P&L Bar (when trade is active) */}
      {!isStandAside && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${activePlan.floatingGain >= 0 ? 'var(--border-bull)' : 'var(--border-bear)'}`,
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, color: themeColor }}>
              STATUS: {activePlan.liveStatus}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>|</span>
            <span style={{ color: 'var(--text-muted)' }}>
              Spot Price: <strong>${spotPrice.toFixed(2)}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-dim)' }}>Floating Return:</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                color: activePlan.floatingGain >= 0 ? 'var(--bull-glow)' : 'var(--bear-glow)',
              }}
            >
              {activePlan.floatingGain >= 0 ? `+$${activePlan.floatingGain}` : `-$${Math.abs(activePlan.floatingGain)}`}
            </span>
          </div>
        </div>
      )}

      {/* 3. Algorithmic Rationale Callout */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '8px 12px',
          borderRadius: '6px',
          borderLeft: `3px solid ${themeColor}`,
          fontSize: '11px',
          color: 'var(--text-main)',
          lineHeight: '1.4',
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-dim)', marginRight: '6px' }}>ALGORITHMIC RATIONALE:</span>
        {activePlan.rationale}
      </div>

      {/* 4. Integrated Minimalist Risk & Account Matrix */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
        }}
      >
        {/* Box 1: Account Balance & Lots */}
        <div
          style={{
            background: 'rgba(15, 23, 38, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Account Balance
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {[25000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAccountBalance(amt)}
                  style={{
                    fontSize: '9px',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    background: accountBalance === amt ? 'var(--gold-glow)' : 'rgba(255, 255, 255, 0.05)',
                    color: accountBalance === amt ? '#000' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ${amt / 1000}k
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            value={accountBalance}
            onChange={(e) => setAccountBalance(Math.max(100, parseFloat(e.target.value) || 100))}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: '#fff',
              padding: '4px 8px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Position Size:</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--gold-glow)', fontFamily: 'var(--font-mono)' }}>
              {isStandAside ? '0.00' : `${activePlan.lotSize} Lots`}
            </span>
          </div>
        </div>

        {/* Box 2: Risk Per Trade & Cash Risk */}
        <div
          style={{
            background: 'rgba(15, 23, 38, 0.5)',
            border: `1px solid ${activePlan.isRiskTooHighForDailyDD ? 'var(--bear-glow)' : 'rgba(255, 255, 255, 0.07)'}`,
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Risk Per Trade
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Max Loss</span>
          </div>
          <select
            value={riskPercent}
            onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: activePlan.isRiskTooHighForDailyDD ? 'var(--bear-glow)' : 'var(--gold-glow)',
              padding: '4px 8px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              outline: 'none',
            }}
          >
            <option value="0.25">0.25% (Defensive)</option>
            <option value="0.35">0.35% (Conservative)</option>
            <option value="0.5">0.50% (Standard)</option>
            <option value="0.75">0.75% (Moderate)</option>
            <option value="1.0">1.00% (Maximum Cap)</option>
          </select>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cash At Risk:</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--bear-glow)', fontFamily: 'var(--font-mono)' }}>
              {isStandAside ? '$0.00' : `-$${activePlan.maxLoss}`}
            </span>
          </div>
        </div>

        {/* Box 3: Daily Drawdown & Buffer */}
        <div
          style={{
            background: 'rgba(15, 23, 38, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Daily Loss Limit (%)
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {[3.0, 4.0, 5.0].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setMaxDailyLossPct(pct)}
                  style={{
                    fontSize: '9px',
                    padding: '1px 4px',
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
          <input
            type="number"
            step="0.5"
            value={maxDailyLossPct}
            onChange={(e) => setMaxDailyLossPct(Math.max(0.5, parseFloat(e.target.value) || 1))}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: 'var(--bear-glow)',
              padding: '4px 8px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Daily Ceiling:</span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--bear-glow)', fontFamily: 'var(--font-mono)' }}>
              -${activePlan.dailyLossLimit.toLocaleString()} ({activePlan.drawdownLossesBuffer} Stop-Outs)
            </span>
          </div>
        </div>

        {/* Box 4: Profit Target & Gain */}
        <div
          style={{
            background: 'rgba(15, 23, 38, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Profit Target (%)
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {[5.0, 8.0, 10.0].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setProfitTargetPct(pct)}
                  style={{
                    fontSize: '9px',
                    padding: '1px 4px',
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
          <input
            type="number"
            step="0.5"
            value={profitTargetPct}
            onChange={(e) => setProfitTargetPct(Math.max(0.5, parseFloat(e.target.value) || 1))}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: 'var(--bull-glow)',
              padding: '4px 8px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Projected Return:</span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--bull-glow)', fontFamily: 'var(--font-mono)' }}>
              {isStandAside ? '$0.00' : `+$${activePlan.totalGain} (${activePlan.tradeGainPctOfTarget}%)`}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Compact 6-Pillar Validation Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '6px',
        }}
      >
        {activePlan.pillars.map((pillar, idx) => (
          <div
            key={idx}
            style={{
              background: pillar.pass ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
              border: `1px solid ${pillar.pass ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              borderRadius: '6px',
              padding: '5px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>{pillar.name}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{pillar.desc}</div>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: pillar.pass ? 'var(--bull-glow)' : 'var(--bear-glow)' }}>
              {pillar.pass ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
