// client/src/components/SettingsModal.jsx
// Full customization settings modal: API keys, Telegram, AI models, Audio alerts, and Polling rates

import { useState, useEffect } from 'react';

const PRESET_MODELS = [
  { id: 'google/gemma-4-31b-it:free', name: 'Google Gemma 4 31B (Free Tier)' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'NVIDIA Nemotron 120B (Free Tier)' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Meta LLaMA 3.1 8B Instruct (Ultra-Fast)' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku (High Accuracy)' },
  { id: 'openrouter/free', name: 'OpenRouter Free Auto-Router' },
];

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('api'); // 'api' | 'notifications' | 'engine'

  // Form State
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [model, setModel] = useState('google/gemma-4-31b-it:free');
  const [fallbackModel, setFallbackModel] = useState('nvidia/nemotron-3-super-120b-a12b:free');

  const [telegramToken, setTelegramToken] = useState('');
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');

  const [googleKey, setGoogleKey] = useState('');
  const [showGoogleKey, setShowGoogleKey] = useState(false);

  // Notification Preferences (stored in localStorage)
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState(80);
  const [audioTriggerLevel, setAudioTriggerLevel] = useState('HIGH'); // 'HIGH' | 'MED_HIGH' | 'ALL'
  const [telegramAlertsEnabled, setTelegramAlertsEnabled] = useState(true);
  const [telegramMinImpact, setTelegramMinImpact] = useState('HIGH'); // 'HIGH' | 'MED'

  // Engine Polling Rates
  const [priceInterval, setPriceInterval] = useState(5000);
  const [newsInterval, setNewsInterval] = useState(60000);

  // Status & Feedback
  const [statusMsg, setStatusMsg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingTg, setIsTestingTg] = useState(false);

  // Load existing settings from server and localStorage on mount
  useEffect(() => {
    if (!isOpen) return;

    // Load local preferences
    try {
      const savedAudio = localStorage.getItem('xau_audio_enabled');
      if (savedAudio !== null) setAudioEnabled(savedAudio === 'true');
      const savedVol = localStorage.getItem('xau_audio_volume');
      if (savedVol) setAudioVolume(parseInt(savedVol, 10));
      const savedTrigger = localStorage.getItem('xau_audio_trigger');
      if (savedTrigger) setAudioTriggerLevel(savedTrigger);
    } catch (_) {}

    // Load server settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.openrouter?.model) setModel(data.openrouter.model);
        if (data.openrouter?.fallbackModel) setFallbackModel(data.openrouter.fallbackModel);
        if (data.telegram?.chatId) setTelegramChatId(data.telegram.chatId);
        if (data.intervals?.price) setPriceInterval(data.intervals.price);
        if (data.intervals?.news) setNewsInterval(data.intervals.news);
      })
      .catch((err) => console.warn('[SETTINGS] Could not fetch server config:', err.message));
  }, [isOpen]);

  if (!isOpen) return null;

  // Test Web Audio Chime
  const handleTestAudio = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const vol = (audioVolume / 100) * 0.15;
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.12); // E6
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
      setStatusMsg({ type: 'success', text: '🔔 Audio chime triggered!' });
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'AudioContext error: ' + e.message });
    }
  };

  // Test Telegram Bot Alert
  const handleTestTelegram = async () => {
    setIsTestingTg(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: telegramToken.trim() || undefined,
          chatId: telegramChatId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: '✅ Telegram test alert delivered! Check your phone.' });
      } else {
        setStatusMsg({ type: 'error', text: `Telegram error: ${data.error || 'Failed to send'}` });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Network error: ' + err.message });
    } finally {
      setIsTestingTg(false);
    }
  };

  // Save All Settings
  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);

    // Save client preferences
    try {
      localStorage.setItem('xau_audio_enabled', audioEnabled.toString());
      localStorage.setItem('xau_audio_volume', audioVolume.toString());
      localStorage.setItem('xau_audio_trigger', audioTriggerLevel);
      localStorage.setItem('xau_tg_enabled', telegramAlertsEnabled.toString());
      localStorage.setItem('xau_tg_min_impact', telegramMinImpact);
    } catch (_) {}

    // Send server updates
    try {
      const payload = {
        openrouterKey: openrouterKey.trim() || undefined,
        model,
        fallbackModel,
        telegramToken: telegramToken.trim() || undefined,
        telegramChatId: telegramChatId.trim() || undefined,
        intervals: {
          price: priceInterval,
          news: newsInterval,
        },
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: '✅ Configuration saved & active immediately!' });
        setTimeout(() => {
          setStatusMsg(null);
          onClose();
        }, 1200);
      } else {
        setStatusMsg({ type: 'error', text: `Save error: ${data.error}` });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Connection failed: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="settings-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="card settings-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-accent)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 166, 35, 0.1)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(90deg, rgba(245,166,35,0.08), transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.3rem' }}>⚙️</span>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--gold-primary)',
              }}>
                Dashboard Settings & Credentials
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Customize AI inference, Telegram alerts, audio triggers & engine rates
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          {[
            { id: 'api', label: '🔑 API Keys & AI', icon: '' },
            { id: 'notifications', label: '🔔 Notifications & Audio', icon: '' },
            { id: 'engine', label: '⏱️ Polling & Rates', icon: '' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: activeTab === tab.id ? '1px solid var(--gold-primary)' : '1px solid transparent',
                background: activeTab === tab.id ? 'rgba(245, 166, 35, 0.12)' : 'transparent',
                color: activeTab === tab.id ? 'var(--gold-bright)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Status Message Banner */}
          {statusMsg && (
            <div style={{
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              background: statusMsg.type === 'success' ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 61, 87, 0.12)',
              border: `1px solid ${statusMsg.type === 'success' ? 'var(--bull-primary)' : 'var(--bear-primary)'}`,
              color: statusMsg.type === 'success' ? 'var(--bull-primary)' : 'var(--bear-primary)',
            }}>
              {statusMsg.text}
            </div>
          )}

          {/* TAB 1: API KEYS & AI */}
          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* OpenRouter API Key */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--gold-primary)', marginBottom: 4 }}>
                  OpenRouter API Key
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type={showOpenrouterKey ? 'text' : 'password'}
                    placeholder="sk-or-v1-..."
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 6,
                      padding: '8px 10px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenrouterKey((v) => !v)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                    }}
                  >
                    {showOpenrouterKey ? '🙈 Hide' : '👁️ Show'}
                  </button>
                </div>
                <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Leave blank to retain current environment key. Used for AI sentiment extraction.
                </div>
              </div>

              {/* Primary AI Model */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--gold-primary)', marginBottom: 4 }}>
                  Primary AI Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                    outline: 'none',
                  }}
                >
                  {PRESET_MODELS.map((m) => (
                    <option key={m.id} value={m.id} style={{ background: '#0e0e1a' }}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Secondary Fallback Model */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Secondary Fallback Model
                </label>
                <input
                  type="text"
                  value={fallbackModel}
                  onChange={(e) => setFallbackModel(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                    outline: 'none',
                  }}
                />
                <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  If primary model hits rate limit or errors, system tries fallback, then keyword engine.
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

              {/* Telegram Bot Token */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--gold-primary)', marginBottom: 4 }}>
                  Telegram Bot Token
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type={showTelegramToken ? 'text' : 'password'}
                    placeholder="8740241454:AAHy..."
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 6,
                      padding: '8px 10px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTelegramToken((v) => !v)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                    }}
                  >
                    {showTelegramToken ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Telegram Chat ID & Test Button */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--gold-primary)', marginBottom: 4 }}>
                  Telegram Chat ID
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="5300822536"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 6,
                      padding: '8px 10px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={isTestingTg}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(0, 255, 136, 0.12)',
                      border: '1px solid var(--bull-primary)',
                      borderRadius: 6,
                      color: 'var(--bull-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: isTestingTg ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isTestingTg ? 'Sending...' : '🚀 Test Bot'}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: NOTIFICATIONS & AUDIO */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Audio Alerts Section */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      🔊 Audio Chimes for Signals
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                      Play browser frequency tone when important market news breaks
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={audioEnabled}
                    onChange={(e) => setAudioEnabled(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--gold-primary)', cursor: 'pointer' }}
                  />
                </div>

                {audioEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <span>Alert Volume</span>
                        <span>{audioVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(parseInt(e.target.value, 10))}
                        style={{ width: '100%', accentColor: 'var(--gold-primary)', cursor: 'pointer' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: 4 }}>
                        Audio Trigger Threshold
                      </label>
                      <select
                        value={audioTriggerLevel}
                        onChange={(e) => setAudioTriggerLevel(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(0,0,0,0.5)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 6,
                          padding: '6px 8px',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                        }}
                      >
                        <option value="HIGH">⚡ HIGH Impact News Only (Recommended)</option>
                        <option value="MED_HIGH">⚠️ HIGH & MED Impact News</option>
                        <option value="ALL">ℹ️ Every Gold-Relevant Item</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestAudio}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '6px 12px',
                        background: 'rgba(245, 166, 35, 0.12)',
                        border: '1px solid var(--gold-primary)',
                        borderRadius: 6,
                        color: 'var(--gold-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                      }}
                    >
                      🔔 Test Chime Sound
                    </button>
                  </div>
                )}
              </div>

              {/* Telegram Alerts Section */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      📱 Telegram Instant Broadcasts
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                      Push instant formatted alerts directly to your Telegram chat
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={telegramAlertsEnabled}
                    onChange={(e) => setTelegramAlertsEnabled(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--bull-primary)', cursor: 'pointer' }}
                  />
                </div>

                {telegramAlertsEnabled && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Telegram Alert Filter
                    </label>
                    <select
                      value={telegramMinImpact}
                      onChange={(e) => setTelegramMinImpact(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid var(--border-card)',
                        borderRadius: 6,
                        padding: '6px 8px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.72rem',
                      }}
                    >
                      <option value="HIGH">⚡ High-Impact & Tier-1 Macro Only</option>
                      <option value="MED">⚠️ High & Medium Impact (More Frequent)</option>
                    </select>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: ENGINE & POLLING */}
          {activeTab === 'engine' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--gold-primary)', marginBottom: 4 }}>
                  Price Polling Rate (Yahoo Finance)
                </label>
                <select
                  value={priceInterval}
                  onChange={(e) => setPriceInterval(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                  }}
                >
                  <option value={3000}>3 Seconds (High Frequency)</option>
                  <option value={5000}>5 Seconds (Recommended Standard)</option>
                  <option value={10000}>10 Seconds (Conservative)</option>
                  <option value={15000}>15 Seconds (Low Bandwidth)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--gold-primary)', marginBottom: 4 }}>
                  News RSS Feed Polling Rate
                </label>
                <select
                  value={newsInterval}
                  onChange={(e) => setNewsInterval(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                  }}
                >
                  <option value={30000}>30 Seconds (Fast Breaking)</option>
                  <option value={60000}>60 Seconds (Default Standard)</option>
                  <option value={120000}>120 Seconds (Conserve API calls)</option>
                </select>
              </div>

              <div style={{
                background: 'rgba(255, 152, 0, 0.08)',
                border: '1px solid rgba(255, 152, 0, 0.25)',
                borderRadius: 6,
                padding: '10px 12px',
                fontSize: '0.68rem',
                color: 'var(--alert-primary)',
                lineHeight: 1.45,
              }}>
                ℹ️ Active RSS Feeds: ForexLive, FXStreet, CNBC Commodities, MarketWatch, Investing.com Gold, Yahoo Finance. All feeds filtered through Gold Relevance Regex before scoring.
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          padding: '14px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.3)',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--border-card)',
              borderRadius: 6,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 20px',
              background: 'linear-gradient(135deg, var(--gold-primary), var(--gold-muted))',
              border: 'none',
              borderRadius: 6,
              color: '#000',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 10px rgba(245, 166, 35, 0.3)',
            }}
          >
            {isSaving ? 'Saving Changes...' : '💾 Save Settings'}
          </button>
        </div>

      </div>
    </div>
  );
}
