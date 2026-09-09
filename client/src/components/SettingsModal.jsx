// client/src/components/SettingsModal.jsx
// Comprehensive Terminal Settings & Real-Time AI Model Configuration

import { useState, useEffect } from 'react';
import { X, Sparkles, Send, Check, AlertCircle, RefreshCw, Key, Shield } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [telegramStatus, setTelegramStatus] = useState(null);

  // Form State
  const [googleKey, setGoogleKey] = useState('');
  const [selectedGoogleModel, setSelectedGoogleModel] = useState('gemini-3.6-flash');
  const [discoveredModels, setDiscoveredModels] = useState([]);
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [openrouterModel, setOpenrouterModel] = useState('openrouter/free');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.google) {
          setGoogleKey(data.google.maskedKey || '');
          setSelectedGoogleModel(data.google.activeModel || 'gemini-3.6-flash');
          setDiscoveredModels(data.google.discoveredModels || []);
        }
        if (data.openrouter) {
          setOpenrouterKey(data.openrouter.maskedKey || '');
          setOpenrouterModel(data.openrouter.model || 'openrouter/free');
        }
        if (data.telegram) {
          setTelegramToken(data.telegram.maskedToken || '');
          setTelegramChatId(data.telegram.chatId || '');
        }
      })
      .catch((err) => console.error('Failed to load settings:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const payload = {
        googleKey: googleKey.includes('...') ? undefined : googleKey,
        googleModel: selectedGoogleModel,
        openrouterKey: openrouterKey.includes('...') ? undefined : openrouterKey,
        model: openrouterModel,
        telegramToken: telegramToken.includes('...') ? undefined : telegramToken,
        telegramChatId,
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSaveMessage('Settings saved and models updated successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        throw new Error(data.error || 'Save failed');
      }
    } catch (err) {
      setSaveMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: 'Federal Reserve cuts interest rates by 25bps in emergency meeting',
          summary: 'Benchmark dollar tumbles to 6-month low while gold surges past $2,400 on aggressive monetary easing.',
        }),
      });
      const data = await res.json();
      setAiTestResult(data.result);
    } catch (err) {
      setAiTestResult({ error: err.message });
    } finally {
      setTestingAi(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramStatus(null);
    try {
      const res = await fetch('/api/settings/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: telegramToken.includes('...') ? undefined : telegramToken,
          chatId: telegramChatId,
        }),
      });
      const data = await res.json();
      setTelegramStatus(data);
    } catch (err) {
      setTelegramStatus({ success: false, error: err.message });
    } finally {
      setTestingTelegram(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--gold-glow)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
              TERMINAL SETTINGS & AI ENGINE CONFIGURATION
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
              Loading operational configuration...
            </div>
          ) : (
            <>
              {/* Google Gemini Priority Section */}
              <div
                style={{
                  background: 'rgba(6, 182, 212, 0.06)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cyan-glow)', textTransform: 'uppercase' }}>
                    PRIORITY #1: GOOGLE GEMINI AI (DIRECT API)
                  </span>
                  <span className="event-impact-badge" style={{ background: 'var(--cyan-bg)', color: 'var(--cyan-glow)' }}>
                    ACTIVE PRIMARY
                  </span>
                </div>

                <div className="calc-field">
                  <label className="calc-label">GOOGLE API KEY</label>
                  <input
                    type="password"
                    className="calc-input"
                    value={googleKey}
                    onChange={(e) => setGoogleKey(e.target.value)}
                    placeholder="Enter Google API Key (AQ.Ab8...)"
                  />
                </div>

                <div className="calc-field">
                  <label className="calc-label">SELECT REAL-TIME DISCOVERED MODEL</label>
                  <select
                    className="calc-input"
                    value={selectedGoogleModel}
                    onChange={(e) => setSelectedGoogleModel(e.target.value)}
                    style={{ background: 'var(--bg-panel)', color: '#fff' }}
                  >
                    {discoveredModels.length > 0 ? (
                      discoveredModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="gemini-3.6-flash">gemini-3.6-flash (Recommended)</option>
                        <option value="gemini-3.7-flash">gemini-3.7-flash</option>
                        <option value="gemini-flash-latest">gemini-flash-latest</option>
                        <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                      </>
                    )}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    className="btn-secondary"
                    onClick={handleTestAi}
                    disabled={testingAi}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                  >
                    <RefreshCw size={13} className={testingAi ? 'spin-icon' : ''} />
                    <span>{testingAi ? 'Testing Live AI...' : 'Test Gemini Analysis'}</span>
                  </button>

                  {aiTestResult && (
                    <span style={{ fontSize: '11px', color: aiTestResult.error ? 'var(--bear-glow)' : 'var(--bull-glow)' }}>
                      {aiTestResult.error
                        ? `Error: ${aiTestResult.error}`
                        : `✅ Scored by ${aiTestResult.provider || 'AI'}: ${aiTestResult.bias} (${aiTestResult.impact})`}
                    </span>
                  )}
                </div>
              </div>

              {/* OpenRouter Fallback Section */}
              <div
                style={{
                  background: 'rgba(168, 85, 247, 0.06)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--purple-primary)', textTransform: 'uppercase' }}>
                    PRIORITY #2: OPENROUTER (FALLBACK ENGINE)
                  </span>
                  <span className="event-impact-badge" style={{ background: 'var(--purple-bg)', color: 'var(--purple-primary)' }}>
                    STANDBY FAILOVER
                  </span>
                </div>

                <div className="calc-field">
                  <label className="calc-label">OPENROUTER API KEY</label>
                  <input
                    type="password"
                    className="calc-input"
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                  />
                </div>

                <div className="calc-field">
                  <label className="calc-label">OPENROUTER FREE AUTO-FALLBACK MODEL</label>
                  <select
                    className="calc-input"
                    value={openrouterModel}
                    onChange={(e) => setOpenrouterModel(e.target.value)}
                  >
                    <option value="openrouter/free">openrouter/free (Official Free Models Router & Auto-Fallback)</option>
                    <option value="nvidia/nemotron-3.5-lightning:free">nvidia/nemotron-3.5-lightning:free</option>
                    <option value="liquid/lfm-2.5-2.6b:free">liquid/lfm-2.5-2.6b:free</option>
                    <option value="inclusionai/ling-3.0-flash-fin:free">inclusionai/ling-3.0-flash-fin:free (Financial)</option>
                    <option value="nex-agi/nex-n2.5-mini:free">nex-agi/nex-n2.5-mini:free</option>
                  </select>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    Uses OpenRouter automatic failover routing across 18 free models at zero cost.
                  </span>
                </div>
              </div>

              {/* Telegram Alerts Section */}
              <div
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                  TELEGRAM BROADCAST ENGINE
                </span>

                <div className="calc-inputs-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
                  <div className="calc-field">
                    <label className="calc-label">BOT TOKEN</label>
                    <input
                      type="password"
                      className="calc-input"
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      placeholder="bot_token"
                    />
                  </div>

                  <div className="calc-field">
                    <label className="calc-label">CHAT / CHANNEL ID</label>
                    <input
                      type="text"
                      className="calc-input"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="-100... or chat id"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    className="btn-secondary"
                    onClick={handleTestTelegram}
                    disabled={testingTelegram}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                  >
                    <Send size={13} />
                    <span>{testingTelegram ? 'Sending...' : 'Send Test Alert'}</span>
                  </button>

                  {telegramStatus && (
                    <span style={{ fontSize: '11px', color: telegramStatus.success ? 'var(--bull-glow)' : 'var(--bear-glow)' }}>
                      {telegramStatus.success ? '✅ Test alert delivered!' : `❌ ${telegramStatus.error}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Save Message Alert */}
              {saveMessage && (
                <div
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: saveMessage.includes('Error') ? 'var(--bear-bg)' : 'var(--bull-bg)',
                    color: saveMessage.includes('Error') ? 'var(--bear-glow)' : 'var(--bull-glow)',
                    fontSize: '12px',
                  }}
                >
                  {saveMessage}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
