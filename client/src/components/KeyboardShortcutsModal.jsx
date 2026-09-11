// client/src/components/KeyboardShortcutsModal.jsx
// Keyboard Shortcuts Cheatsheet Modal

import { Keyboard, X } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '1', desc: 'Switch to Command Center (Chart, Order Flow & SMC)' },
    { key: '2', desc: 'Switch to Macro View (Economic Calendar & Wire)' },
    { key: 'V', desc: 'Toggle between Command Center and Macro View' },
    { key: 'C', desc: 'Copy Executive Market Intelligence Snapshot to Clipboard' },
    { key: 'T', desc: 'Open Feed Latency & Pipeline Telemetry Inspector' },
    { key: 'B', desc: 'Open Institutional Audio Squawk Soundboard' },
    { key: 'M', desc: 'Toggle Audio Squawk Mute / Unmute' },
    { key: 'G', desc: 'Trigger Instant AI Market Guidance Refresh' },
    { key: 'P', desc: 'Open Real-Time Custom Price Alerts Manager' },
    { key: 'F', desc: 'Toggle Bloomberg Focus Mode / Dark Dimmer' },
    { key: 'S', desc: 'Open Institutional Settings & API Keys Modal' },
    { key: '?', desc: 'Toggle this Keyboard Shortcuts Cheatsheet' },
    { key: 'ESC', desc: 'Close any open modal or overlay' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={16} style={{ color: 'var(--cyan-primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em' }}>
              TERMINAL KEYBOARD SHORTCUTS
            </span>
          </div>
          <button className="btn-ghost-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                {sc.desc}
              </span>
              <kbd
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  color: 'var(--gold-primary)',
                  boxShadow: '0 2px 0 rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap',
                }}
              >
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            GOT IT (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
