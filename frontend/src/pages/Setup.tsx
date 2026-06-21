import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STEPS = [
  { id: 'gemini', title: 'Gemini API Key', icon: '🤖' },
  { id: 'phone', title: 'Telefon Numarası', icon: '📱' },
  { id: 'hours', title: 'Çalışma Saatleri', icon: '⏰' },
];

const Setup = () => {
  const { user, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(() => {
    if (!user?.geminiApiKey) return 0;
    if (!user?.phone) return 1;
    if (!user?.dayStartTime || !user?.dayEndTime) return 2;
    return 0;
  });
  const [geminiKey, setGeminiKey] = useState(user?.geminiApiKey || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dayStart, setDayStart] = useState(user?.dayStartTime || '09:00');
  const [dayEnd, setDayEnd] = useState(user?.dayEndTime || '22:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);

  const saveAndNext = async () => {
    setSaving(true);
    setError('');
    try {
      const step = STEPS[currentStep].id;

      if (step === 'gemini') {
        if (!geminiKey.trim()) {
          setError('API key gereklidir');
          setSaving(false);
          return;
        }
        await api.put('/auth/profile', { geminiApiKey: geminiKey.trim() });
        updateUser({ geminiApiKey: geminiKey.trim() });
      } else if (step === 'phone') {
        if (!phone.trim()) {
          setError('Telefon numarası gereklidir');
          setSaving(false);
          return;
        }
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          setError('Geçerli bir telefon numarası girin (örn: 905551234567)');
          setSaving(false);
          return;
        }
        await api.put('/auth/profile', { phone: cleanPhone });
        updateUser({ phone: cleanPhone });
      } else if (step === 'hours') {
        await api.put('/auth/profile', {
          dayStartTime: dayStart,
          dayEndTime: dayEnd,
        });
        updateUser({ dayStartTime: dayStart, dayEndTime: dayEnd });
      }

      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Setup tamamlandı — sayfayı yenile
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Bir hata oluştu');
    }
    setSaving(false);
  };

  const testGeminiKey = async () => {
    if (!geminiKey.trim()) return;
    setTestingKey(true);
    setKeyValid(null);
    try {
      await api.post('/auth/test-gemini', { apiKey: geminiKey.trim() });
      setKeyValid(true);
    } catch {
      setKeyValid(false);
    }
    setTestingKey(false);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="auth-container">
      <div className="setup-card">
        {/* Header */}
        <div className="setup-header">
          <div className="setup-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="setup-title">WP Planner Kurulum</h1>
          <p className="setup-subtitle">Başlamak için birkaç ayar yapalım</p>
        </div>

        {/* Progress */}
        <div className="setup-progress">
          <div className="setup-progress-bar">
            <div className="setup-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="setup-steps">
            {STEPS.map((step, i) => (
              <div
                key={step.id}
                className={`setup-step-dot ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'active' : ''}`}
              >
                <span>{i < currentStep ? '✓' : step.icon}</span>
                <small>{step.title}</small>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="setup-body">
          {STEPS[currentStep].id === 'gemini' && (
            <div className="setup-step-content">
              <h2>🤖 Gemini API Key</h2>
              <p className="setup-desc">
                Google Gemini AI, mesajlarınızı anlayıp görevlere dönüştürür.
                Ücretsiz bir API key almanız gerekiyor.
              </p>

              <div className="setup-instructions">
                <h4>Nasıl alınır?</h4>
                <ol>
                  <li>
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                      Google AI Studio
                    </a>'ya gidin
                  </li>
                  <li>Google hesabınızla giriş yapın</li>
                  <li><strong>"Create API Key"</strong> butonuna tıklayın</li>
                  <li>Oluşturulan anahtarı kopyalayıp aşağıya yapıştırın</li>
                </ol>
              </div>

              <div className="form-group">
                <label className="form-label">API Key</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => { setGeminiKey(e.target.value); setKeyValid(null); }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={testGeminiKey}
                    disabled={testingKey || !geminiKey.trim()}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {testingKey ? '⏳' : '🧪 Test'}
                  </button>
                </div>
                {keyValid === true && (
                  <p style={{ color: 'var(--accent-success)', marginTop: '8px', fontSize: '14px' }}>
                    ✅ API key geçerli!
                  </p>
                )}
                {keyValid === false && (
                  <p style={{ color: 'var(--accent-danger)', marginTop: '8px', fontSize: '14px' }}>
                    ❌ API key geçersiz. Kontrol edip tekrar deneyin.
                  </p>
                )}
              </div>
            </div>
          )}

          {STEPS[currentStep].id === 'phone' && (
            <div className="setup-step-content">
              <h2>📱 Telefon Numarası</h2>
              <p className="setup-desc">
                WhatsApp üzerinden kendinize mesaj atarak görev oluşturabilmek için
                telefon numaranız gerekiyor.
              </p>

              <div className="setup-instructions">
                <h4>Format</h4>
                <ul>
                  <li>Ülke kodu ile başlamalı: <strong>90</strong>5551234567</li>
                  <li>Başında <strong>+</strong> veya <strong>0</strong> olmadan</li>
                  <li>Boşluk veya tire olmadan</li>
                </ul>
              </div>

              <div className="form-group">
                <label className="form-label">Telefon Numarası</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="905551234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          )}

          {STEPS[currentStep].id === 'hours' && (
            <div className="setup-step-content">
              <h2>⏰ Çalışma Saatleri</h2>
              <p className="setup-desc">
                Gün başlangıcında günlük görevlerinizi,
                gün sonunda bitmemiş işleri WhatsApp'tan haber vereceğiz.
              </p>

              <div className="setup-hours">
                <div className="form-group">
                  <label className="form-label">Gün Başlangıcı</label>
                  <input
                    type="time"
                    className="form-input"
                    value={dayStart}
                    onChange={(e) => setDayStart(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Bu saatte günlük görev özetiniz gelir
                  </small>
                </div>
                <div className="form-group">
                  <label className="form-label">Gün Bitişi</label>
                  <input
                    type="time"
                    className="form-input"
                    value={dayEnd}
                    onChange={(e) => setDayEnd(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    30 dk önce bitmemiş görevler hatırlatılır
                  </small>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Actions */}
        <div className="setup-actions">
          {currentStep > 0 && (
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              ← Geri
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={saveAndNext}
            disabled={saving}
            style={{ marginLeft: 'auto' }}
          >
            {saving ? '⏳ Kaydediliyor...' : currentStep === STEPS.length - 1 ? '🚀 Tamamla' : 'Devam →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Setup;
