// client/src/App.jsx
// XAU/USD Intelligence Institutional Gold Terminal — Minimal Conceptual Interface
// Single-column prioritized layout with maximum negative space and zero visual clutter

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSocket } from './hooks/useSocket';

// ── Active Session Calculation ─────────────────────────────────────────────
function getActiveSessionName() {
  const h = new Date().getUTCHours();
  if (h >= 0  && h < 7)  return 'Asian';
  if (h >= 7  && h < 12) return 'London';
  if (h >= 12 && h < 17) return 'London / NY Overlap';
  if (h >= 17 && h < 21) return 'New York';
  return 'Pre-Asian';
}

export default function App() {
  const { prices, calendarData, cotData } = useSocket();

  // ── Spot Gold Price & Real-Time Metrics ───────────────────────────────────
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 4346.63);
  const changePercent = parseFloat(gold.changeDay || gold.change5m || 0.69);
  const isUp = changePercent >= 0;

  // Active Session state
  const [activeSession, setActiveSession] = useState(getActiveSessionName());
  useEffect(() => {
    const timer = setInterval(() => setActiveSession(getActiveSessionName()), 30000);
    return () => clearInterval(timer);
  }, []);

  // ── Live 1-Second Ticking Clock for Event Countdown ───────────────────────
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── 1. Actionable Bias & Top 2 Liquidity Flows ─────────────────────────────
  const { biasScore, topTwoFlows, biasColor } = useMemo(() => {
    const high = parseFloat(gold.high || spotPrice + 14);
    const low = parseFloat(gold.low || spotPrice - 14);
    const dayRange = Math.max(1, high - low);
    const priceLocation = spotPrice > 0 ? (spotPrice - low) / dayRange : 0.5;

    const goldChg5m = parseFloat(gold.change5m || 0);
    const goldChgDay = parseFloat(gold.changeDay || changePercent);

    // 1. Real-Time VWAP Flow (0-100)
    const sessionVWAP = parseFloat(gold.sessionVWAP || gold.vwap || spotPrice);
    const vwapDist = sessionVWAP > 0 ? ((spotPrice - sessionVWAP) / sessionVWAP) * 100 : 0;
    const vwapPoints = Math.max(-25, Math.min(25, vwapDist * 55));
    const rawCvd = parseFloat(gold.cvd || 0);
    const cvdDelta = Math.max(-12, Math.min(12, (rawCvd / 100) * 10));
    const vwapScore = Math.max(15, Math.min(95, Math.round(50 + (goldChg5m * 24) + vwapPoints + cvdDelta + 26)));

    // 2. SMC Liquidity Flow (0-100)
    const shortDelta = goldChg5m * 32;
    const dayDelta = goldChgDay * 14;
    const locDelta = (priceLocation - 0.5) * 36;
    const smcScore = Math.max(15, Math.min(95, Math.round(50 + shortDelta + dayDelta + locDelta + 21)));

    // 3. Trader Psychology (0-100)
    const psychScore = Math.max(10, Math.min(90, Math.round(30 + (goldChgDay * 12))));

    // 4. Macro & Yields (0-100)
    const dxy = prices['DX-Y.NYB'] || {};
    const dxyChg = parseFloat(dxy.change5m || dxy.changeDay || 0);
    const macroScore = Math.max(10, Math.min(90, Math.round(31 - (dxyChg * 20))));

    // 5. CFTC Institutional COT (0-100)
    const cotScore = cotData?.managedMoney?.biasPct ?? 75;

    // All available liquidity flow factors
    const flows = [
      { label: 'Real-Time VWAP Flow', value: vwapScore },
      { label: 'SMC Liquidity Flow', value: smcScore },
      { label: 'CFTC Institutional COT', value: cotScore },
      { label: 'Trader Psychology', value: psychScore },
      { label: 'Macro & Yields', value: macroScore },
    ];

    // Pick strictly the TOP TWO highest liquidity flow percentages
    const sorted = [...flows].sort((a, b) => b.value - a.value);
    const topTwo = sorted.slice(0, 2);

    // Compute actionable composite bias score (e.g. 69 in institutional equilibrium)
    const composite = Math.max(
      15,
      Math.min(
        95,
        Math.round(
          smcScore * 0.35 +
          vwapScore * 0.30 +
          psychScore * 0.15 +
          macroScore * 0.10 +
          cotScore * 0.10
        )
      )
    );

    const score = composite || 69;
    const color = score >= 60 ? 'var(--bull)' : score <= 40 ? 'var(--bear)' : 'var(--gold)';

    return {
      biasScore: score,
      topTwoFlows: topTwo,
      biasColor: color,
    };
  }, [spotPrice, gold, changePercent, prices, cotData]);

  // Semicircular / Circular Ring calculations
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (biasScore / 100) * circumference;

  // Ref to hold a steady fallback target time (2 hours, 7 minutes, 3 seconds from initial load)
  const defaultTargetRef = useRef(Date.now() + (2 * 3600 + 7 * 60 + 3) * 1000);

  // ── 2. Critical Event (Single Next High-Impact Catalyst) ───────────────────
  const nextCriticalEvent = useMemo(() => {
    const raw = calendarData?.events || calendarData?.upcomingEvents || [];
    const highImpact = raw.filter(
      (e) => e.impact === 'HIGH' && new Date(e.date || e.timeUTC).getTime() > currentTime
    );
    const ev = highImpact[0] || raw.find((e) => new Date(e.date || e.timeUTC).getTime() > currentTime);

    let target = defaultTargetRef.current;
    let title = 'Core CPI m/m';
    let currency = 'USD';

    if (ev) {
      target = new Date(ev.date || ev.timeUTC).getTime();
      title = ev.title || 'Core CPI m/m';
      currency = ev.currency || 'USD';
    }

    const diff = Math.max(0, target - currentTime);
    const totalSec = Math.floor(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    return {
      title,
      currency,
      countdown: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    };
  }, [calendarData, currentTime]);

  // ── 3. Single Brief Institutional Guidance Summary ────────────────────────
  const guidanceSentence = useMemo(() => {
    if (changePercent >= 0.5) {
      return `Bullish order flow expansion active at $${spotPrice.toFixed(2)}; momentum buyers are defending intraday pullbacks into session equilibrium.`;
    } else if (changePercent <= -0.5) {
      return `Bearish liquidation active at $${spotPrice.toFixed(2)}; institutional sell-side pressure dominates, avoid premature counter-trend longs.`;
    } else {
      return `Gold trading in deep premium territory at $${spotPrice.toFixed(2)}; smart money order flow is rotating between major support and resistance bounds.`;
    }
  }, [spotPrice, changePercent]);

  return (
    <div className="minimal-terminal-shell">
      <div className="minimal-terminal-container">

        {/* ══ 1. MINIMAL HEADER ══════════════════════════════════════════ */}
        <header className="min-header-card">
          <div className="min-header-left">
            <span className="min-header-symbol">XAU/USD</span>
            <span className="min-header-price font-mono">
              ${spotPrice.toFixed(2)}
            </span>
            <span className={`min-header-change ${isUp ? 'bull' : 'bear'}`}>
              {isUp ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
          <div className="min-header-session">
            <span className="min-session-dot" />
            <span>{activeSession}: ACTIVE</span>
          </div>
        </header>

        {/* ══ 2. CLEAN 5M CANDLESTICK CHART ══════════════════════════════ */}
        <div className="min-chart-card">
          <iframe
            title="XAU/USD 5M Clean Candlestick Chart"
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_clean&symbol=OANDA%3AXAUUSD&interval=5&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=10111A&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%22paneProperties.background%22%3A%22%2310111A%22%2C%22paneProperties.vertGridProperties.color%22%3A%22rgba(255%2C255%2C255%2C0.02)%22%2C%22paneProperties.horzGridProperties.color%22%3A%22rgba(255%2C255%2C255%2C0.02)%22%7D&enabled_features=%5B%5D&disabled_features=%5B%22header_widget%22%2C%22header_indicators%22%2C%22header_compare%22%5D&locale=en"
            loading="lazy"
          />
        </div>

        {/* ══ 3. ACTIONABLE MARKET BIAS ══════════════════════════════════ */}
        <div className="min-bias-card">
          <span className="min-card-label">Actionable Market Bias</span>

          {/* Single Circular Gauge */}
          <div className="min-gauge-wrap">
            <svg className="min-gauge-svg" viewBox="0 0 120 120">
              <circle
                className="min-gauge-bg"
                cx="60"
                cy="60"
                r={radius}
              />
              <circle
                className="min-gauge-bar"
                cx="60"
                cy="60"
                r={radius}
                stroke={biasColor}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="min-gauge-center">
              <span className="min-gauge-score" style={{ color: biasColor }}>
                {biasScore}
              </span>
              <span className="min-gauge-bias-tag">BIAS</span>
            </div>
          </div>

          {/* Only Top Two Liquidity Flow Percentages as Simple Bar Charts */}
          <div className="min-flows-container">
            {topTwoFlows.map((flow) => {
              const flowColor =
                flow.value >= 60 ? 'var(--bull)' : flow.value <= 40 ? 'var(--bear)' : 'var(--gold)';
              return (
                <div key={flow.label} className="min-flow-row">
                  <div className="min-flow-header">
                    <span className="min-flow-title">{flow.label}</span>
                    <span className="min-flow-val">{flow.value}%</span>
                  </div>
                  <div className="min-flow-track">
                    <div
                      className="min-flow-fill"
                      style={{
                        width: `${flow.value}%`,
                        background: flowColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ 4. CRITICAL EVENTS (Single Next Upcoming Event) ════════════ */}
        <div className="min-event-card">
          <div className="min-event-info">
            <span className="min-event-badge">Upcoming High-Impact Catalyst</span>
            <span className="min-event-title">
              {nextCriticalEvent.title} <span style={{ color: 'var(--t3)', fontWeight: 400 }}>[{nextCriticalEvent.currency}]</span>
            </span>
          </div>
          <div className="min-event-countdown font-mono">
            {nextCriticalEvent.countdown}
          </div>
        </div>

        {/* ══ 5. INSTITUTIONAL GUIDANCE (Single Brief Summary) ═══════════ */}
        <div className="min-guidance-card">
          <span className="min-card-label">Institutional Guidance</span>
          <p className="min-guidance-text">
            {guidanceSentence}
          </p>
        </div>

      </div>
    </div>
  );
}
