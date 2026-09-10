// client/src/components/PriceAlerts.jsx
// Custom Price Level Alert System with Real-Time Live Tick Evaluation, Voice Squawk & Telegram Integration

import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Plus, Trash2, CheckCircle2, RotateCcw, Volume2, Send, X } from 'lucide-react';
import { speakSquawk } from '../utils/audioAlerts';

const STORAGE_KEY = 'xauusd_custom_alerts';

export default function PriceAlerts({ isOpen, onClose, prices = {} }) {
  const gold = prices['GC=F'] || prices['XAUUSD'] || {};
  const spotPrice = parseFloat(gold.price || 0);

  const [alerts, setAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState('>'); // '>' | '<'
  const [label, setLabel] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const lastCheckedPriceRef = useRef(spotPrice);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    } catch (_) {}
  }, [alerts]);

  // Real-time tick evaluation
  useEffect(() => {
    if (!spotPrice || spotPrice <= 0) return;
    const prevPrice = lastCheckedPriceRef.current || spotPrice;
    lastCheckedPriceRef.current = spotPrice;

    alerts.forEach((alert) => {
      if (!alert.active || alert.triggered) return;

      let hasTriggered = false;
      if (alert.condition === '>' && spotPrice >= alert.targetPrice) {
        hasTriggered = true;
      } else if (alert.condition === '<' && spotPrice <= alert.targetPrice) {
        hasTriggered = true;
      }

      if (hasTriggered) {
        // Mark triggered
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alert.id
              ? { ...a, triggered: true, triggeredAt: new Date().toISOString(), triggerPrice: spotPrice }
              : a
          )
        );

        // Voice alert
        if (alert.voiceEnabled) {
          const condText = alert.condition === '>' ? 'crossed above' : 'dropped below';
          speakSquawk(
            `Price Alert. Gold has ${condText} target price ${alert.targetPrice.toFixed(2)} dollars. Current price ${spotPrice.toFixed(2)}. ${alert.label || ''}`,
            {
              category: 'price_alert',
              preChime: alert.condition === '>' ? 'flash' : 'bearish',
              priority: true,
              cooldownSeconds: 0,
            }
          );
        }

        // Native browser notification if backgrounded
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('🎯 Gold Price Alert Triggered!', {
              body: `XAU/USD hit $${spotPrice.toFixed(2)} (${alert.condition} $${alert.targetPrice}). ${alert.label || ''}`,
              icon: '/favicon.ico',
              tag: `alert_${alert.id}`,
            });
          } catch (_) {}
        }

        // Send to Telegram if enabled
        if (alert.telegramEnabled) {
          fetch('/api/alerts/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetPrice: alert.targetPrice,
              spotPrice,
              condition: alert.condition,
              label: alert.label,
            }),
          }).catch(() => {});
        }
      }
    });
  }, [spotPrice]);

  const handleAddAlert = (e) => {
    e.preventDefault();
    const num = parseFloat(targetPrice);
    if (!num || isNaN(num) || num <= 0) return;

    const newAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      targetPrice: num,
      condition,
      label: label.trim() || `Target $${num.toFixed(2)}`,
      voiceEnabled,
      telegramEnabled,
      active: true,
      triggered: false,
      createdAt: new Date().toISOString(),
    };

    setAlerts((prev) => [newAlert, ...prev]);
    setTargetPrice('');
    setLabel('');
  };

  const handleDelete = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleReset = (id) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, triggered: false, triggeredAt: null, active: true } : a
      )
    );
  };

  const handleToggleActive = (id) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BellRing size={16} style={{ color: 'var(--gold-primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em' }}>
              CUSTOM PRICE LEVEL ALERTS
            </span>
            {spotPrice > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--cyan-primary)',
                  background: 'rgba(56, 189, 248, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                }}
              >
                LIVE: ${spotPrice.toFixed(2)}
              </span>
            )}
          </div>
          <button className="btn-ghost-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Add Alert Form */}
          <form
            onSubmit={handleAddAlert}
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              CREATE NEW REAL-TIME PRICE TARGET
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1.2fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
                  CONDITION
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="settings-input"
                  style={{ width: '100%', height: '32px' }}
                >
                  <option value=">">Cross Above (&gt;=)</option>
                  <option value="<">Cross Below (&lt;=)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
                  TARGET PRICE ($)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={spotPrice ? spotPrice.toFixed(2) : '2850.00'}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="settings-input"
                  style={{ width: '100%', height: '32px', fontFamily: 'var(--font-mono)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
                  LABEL / SETUP NOTE
                </label>
                <input
                  type="text"
                  placeholder="e.g. Asian High Raid / 4H Support"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="settings-input"
                  style={{ width: '100%', height: '32px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => setVoiceEnabled(e.target.checked)}
                  />
                  <Volume2 size={12} style={{ color: 'var(--cyan-primary)' }} />
                  Voice Squawk
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                  />
                  <Send size={12} style={{ color: '#0088cc' }} />
                  Telegram Broadcast
                </label>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ height: '30px', padding: '0 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={13} />
                ADD ALERT
              </button>
            </div>
          </form>

          {/* Active Alerts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                CONFIGURED ALERTS ({alerts.length})
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                Evaluated continuously with sub-second WebSocket ticks
              </span>
            </div>

            {alerts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                No price alerts set. Add key support/resistance or Asian session raid levels above.
              </div>
            ) : (
              alerts.map((a) => {
                const diff = spotPrice ? spotPrice - a.targetPrice : 0;
                const distText = spotPrice > 0
                  ? `${Math.abs(diff).toFixed(2)} pts ${diff >= 0 ? 'above' : 'below'}`
                  : '';

                return (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: a.triggered
                        ? 'rgba(16, 185, 129, 0.08)'
                        : a.active
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(255,255,255,0.01)',
                      border: `1px solid ${
                        a.triggered
                          ? 'var(--border-bull)'
                          : a.active
                          ? 'var(--border-subtle)'
                          : 'transparent'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => handleToggleActive(a.id)}
                        className="btn-ghost-icon"
                        title={a.active ? 'Disable' : 'Enable'}
                        style={{ width: '24px', height: '24px' }}
                      >
                        {a.triggered ? (
                          <CheckCircle2 size={15} style={{ color: 'var(--bull-primary)' }} />
                        ) : (
                          <Bell size={14} style={{ color: a.active ? 'var(--gold-primary)' : 'var(--text-dim)' }} />
                        )}
                      </button>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              fontFamily: 'var(--font-mono)',
                              color: a.condition === '>' ? 'var(--bull-primary)' : 'var(--bear-primary)',
                            }}
                          >
                            {a.condition} ${a.targetPrice.toFixed(2)}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-main)' }}>
                            {a.label}
                          </span>
                          {a.triggered && (
                            <span
                              style={{
                                fontSize: '9px',
                                fontFamily: 'var(--font-mono)',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: 'var(--bull-bg)',
                                color: 'var(--bull-primary)',
                                border: '1px solid var(--border-bull)',
                              }}
                            >
                              TRIGGERED @ ${a.triggerPrice?.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'flex', gap: '10px', marginTop: '2px' }}>
                          {distText && <span>Current distance: {distText}</span>}
                          {a.voiceEnabled && <span>• Voice active</span>}
                          {a.telegramEnabled && <span>• Telegram active</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {a.triggered && (
                        <button
                          className="btn-ghost-icon"
                          style={{ width: '24px', height: '24px' }}
                          onClick={() => handleReset(a.id)}
                          title="Re-arm alert"
                        >
                          <RotateCcw size={12} style={{ color: 'var(--cyan-primary)' }} />
                        </button>
                      )}
                      <button
                        className="btn-ghost-icon"
                        style={{ width: '24px', height: '24px' }}
                        onClick={() => handleDelete(a.id)}
                        title="Delete alert"
                      >
                        <Trash2 size={12} style={{ color: 'var(--bear-primary)' }} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            SHORTCUT: PRESS 'P' ANYWHERE TO TOGGLE
          </span>
          <button className="btn-secondary" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
