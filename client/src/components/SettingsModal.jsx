import { useState, useEffect } from 'react';
import { X, Sparkles, Send, Check, AlertCircle, RefreshCw, Key, Shield, Volume2, Mic } from 'lucide-react';
import {
  getVoiceSettings,
  updateVoiceSettings,
  getAvailableVoices,
  testIndianFemaleVoice,
} from '../utils/audioAlerts';

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

  // Voice Settings State
  const [voiceSettings, setVoiceSettingsState] = useState(getVoiceSettings());
  const [voicesList, setVoicesList] = useState([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setVoiceSettingsState(getVoiceSettings());
    const voices = getAvailableVoices();
    setVoicesList(voices);
  }, [isOpen]);

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
      updateVoiceSettings(voiceSettings);

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

              {/* Voice Squawk & Audio Alerts Section */}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--gold-glow)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Volume2 size={14} />
                    INSTITUTIONAL VOICE SQUAWK & AUDIO ALERTS (INDIAN FEMALE)
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setIsTestingVoice(true);
                      testIndianFemaleVoice();
                      setTimeout(() => setIsTestingVoice(false), 3000);
                    }}
                    disabled={isTestingVoice}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      padding: '5px 12px',
                      borderColor: 'var(--gold-glow)',
                      color: 'var(--gold-glow)',
                    }}
                  >
                    <Volume2 size={12} />
                    <span>{isTestingVoice ? 'Squawking...' : '🔊 Test Indian Female Voice'}</span>
                  </button>
                </div>

                <div className="calc-field">
                  <label className="calc-label">VOICE SYNTHESIZER ENGINE</label>
                  <select
                    className="calc-input"
                    value={voiceSettings.voiceUri}
                    onChange={(e) => {
                      const next = { ...voiceSettings, voiceUri: e.target.value };
                      setVoiceSettingsState(next);
                      updateVoiceSettings(next);
                    }}
                  >
                    <option value="auto">
                      ⭐ Auto-Detect Indian Female Voice (Recommended: Heera / Neerja / Natural)
                    </option>
                    {voicesList.map((v, i) => (
                      <option key={v.voice.voiceURI || i} value={v.voice.voiceURI || v.name}>
                        {v.isIndianFemale ? '🇮🇳 ' : ''}{v.name} ({v.lang}) {v.isIndianFemale ? '— Indian Female' : ''}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    Prioritizes authentic Indian English female speech profile (Microsoft Heera / Neerja) with natural floor squawk cadence.
                  </span>
                </div>

                <div className="calc-inputs-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                  <div className="calc-field">
                    <label className="calc-label">SQUAWK VOLUME ({Math.round(voiceSettings.volume * 100)}%)</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={voiceSettings.volume}
                      onChange={(e) => {
                        const next = { ...voiceSettings, volume: parseFloat(e.target.value) };
                        setVoiceSettingsState(next);
                        updateVoiceSettings(next);
                      }}
                      style={{ width: '100%', accentColor: 'var(--gold-primary)' }}
                    />
                  </div>

                  <div className="calc-field">
                    <label className="calc-label">DELIVERY SPEED ({voiceSettings.rate}x)</label>
                    <input
                      type="range"
                      min="0.8"
                      max="1.3"
                      step="0.02"
                      value={voiceSettings.rate}
                      onChange={(e) => {
                        const next = { ...voiceSettings, rate: parseFloat(e.target.value) };
                        setVoiceSettingsState(next);
                        updateVoiceSettings(next);
                      }}
                      style={{ width: '100%', accentColor: 'var(--gold-primary)' }}
                    />
                  </div>

                  <div className="calc-field">
                    <label className="calc-label">FEMALE PITCH ({voiceSettings.pitch})</label>
                    <input
                      type="range"
                      min="0.85"
                      max="1.25"
                      step="0.02"
                      value={voiceSettings.pitch}
                      onChange={(e) => {
                        const next = { ...voiceSettings, pitch: parseFloat(e.target.value) };
                        setVoiceSettingsState(next);
                        updateVoiceSettings(next);
                      }}
                      style={{ width: '100%', accentColor: 'var(--gold-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="calc-label" style={{ marginBottom: '8px', display: 'block' }}>
                    ACTIVE VOICE EVENT CHANNELS
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                    {[
                      { key: 'news', label: 'High-Impact Breaking News' },
                      { key: 'calendar', label: 'Economic Calendar (T-5m & Releases)' },
                      { key: 'confluence', label: 'Market Bias Voice Squawks (Chime by default)' },
                      { key: 'divergence', label: 'Macro Intermarket Divergences' },
                      { key: 'liquidity', label: 'Smart Liquidity Sweeps (BSL/SSL)' },
                      { key: 'volatility', label: 'Volatility Traps & Fakeouts' },
                      { key: 'sessions', label: 'Market Session Opens (London/NY/Asia)' },
                      { key: 'guidance', label: 'AI Market Guidance & Regimes' },
                    ].map(({ key, label }) => {
                      const enabled = voiceSettings.enabledEvents[key] !== false;
                      return (
                        <label
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '11px',
                            color: enabled ? '#fff' : 'var(--text-dim)',
                            background: enabled ? 'rgba(245, 158, 11, 0.08)' : 'rgba(0,0,0,0.2)',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: enabled ? '1px solid var(--border-gold)' : '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => {
                              const next = {
                                ...voiceSettings,
                                enabledEvents: {
                                  ...voiceSettings.enabledEvents,
                                  [key]: e.target.checked,
                                },
                              };
                              setVoiceSettingsState(next);
                              updateVoiceSettings(next);
                            }}
                            style={{ accentColor: 'var(--gold-primary)' }}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
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
