import { useState, useEffect, useCallback } from 'react';
import { Save, Clock, Wifi, WifiOff, RefreshCw, QrCode, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [geminiApiKey, setGeminiApiKey] = useState(user?.geminiApiKey || '');
  const [dayStartTime, setDayStartTime] = useState(user?.dayStartTime || '09:00');
  const [dayEndTime, setDayEndTime] = useState(user?.dayEndTime || '18:00');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // WhatsApp state
  const [waConnected, setWaConnected] = useState(false);
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waChecking, setWaChecking] = useState(true);

  // WhatsApp durumu polling
  const checkWaStatus = useCallback(async () => {
    try {
      const { data: status } = await api.get('/whatsapp/status');
      setWaConnected(status.connected);

      if (!status.connected && status.qrAvailable) {
        const { data: qrData } = await api.get('/whatsapp/qr');
        setWaQr(qrData.qr);
      } else {
        setWaQr(null);
      }
    } catch {
      // ignore
    } finally {
      setWaChecking(false);
    }
  }, []);

  useEffect(() => {
    checkWaStatus();
    const interval = setInterval(checkWaStatus, 3000);
    return () => clearInterval(interval);
  }, [checkWaStatus]);

  const handleWaRestart = async () => {
    setWaLoading(true);
    setWaQr(null);
    try {
      await api.post('/whatsapp/restart');
      // Yeni QR gelmesi için biraz bekle
      setTimeout(checkWaStatus, 3000);
    } catch {
      // ignore
    } finally {
      setWaLoading(false);
    }
  };

  const handleWaDisconnect = async () => {
    setWaLoading(true);
    try {
      await api.post('/whatsapp/disconnect');
      setWaConnected(false);
      setWaQr(null);
    } catch {
      // ignore
    } finally {
      setWaLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await api.put('/auth/profile', {
        name,
        phone: phone || undefined,
        geminiApiKey: geminiApiKey || undefined,
        dayStartTime: dayStartTime || undefined,
        dayEndTime: dayEndTime || undefined,
      });
      updateUser(res.data);
      setMessage('✅ Profil güncellendi');
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.error || 'Güncellenemedi'}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <>
      <Header title="Ayarlar" />

      <div className="page-content">
        <div style={{ maxWidth: '560px' }}>
          <div className="settings-section">
            <h3 className="settings-section-title">Profil Bilgileri</h3>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label" htmlFor="settings-name">İsim</label>
                <input
                  id="settings-name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="settings-email">Email</label>
                <input
                  id="settings-email"
                  type="email"
                  className="form-input"
                  value={user?.email || ''}
                  disabled
                  style={{ opacity: 0.5 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="settings-phone">
                  WhatsApp Telefon Numarası
                </label>
                <input
                  id="settings-phone"
                  type="tel"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+905551234567"
                />
                <small style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginTop: '4px', display: 'block' }}>
                  WhatsApp üzerinden görev yönetimi için telefon numaranızı ekleyin
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="settings-gemini-key">
                  🔑 Google Gemini API Key
                </label>
                <input
                  id="settings-gemini-key"
                  type="password"
                  className="form-input"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                />
                <small style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginTop: '4px', display: 'block' }}>
                  WhatsApp mesajlarını anlamak için Gemini API anahtarınızı girin.{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
                    API Key al →
                  </a>
                </small>
              </div>

              <div style={{
                marginTop: 'var(--space-6)',
                marginBottom: 'var(--space-4)',
                padding: 'var(--space-5)',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(108, 99, 255, 0.06)',
                border: '1px solid rgba(108, 99, 255, 0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                  <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                    Çalışma Saatleri
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label" htmlFor="settings-day-start">
                      ☀️ Gün Başlangıcı
                    </label>
                    <input
                      id="settings-day-start"
                      type="time"
                      className="form-input"
                      value={dayStartTime}
                      onChange={(e) => setDayStartTime(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label" htmlFor="settings-day-end">
                      🌙 Gün Bitişi
                    </label>
                    <input
                      id="settings-day-end"
                      type="time"
                      className="form-input"
                      value={dayEndTime}
                      onChange={(e) => setDayEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-3)', display: 'block' }}>
                  Gün başlangıcında bugünkü görevleriniz, gün bitişinden 30 dk önce bitmemiş görevleriniz WhatsApp'tan bildirilir.
                </small>
              </div>

              {message && (
                <div style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: message.startsWith('✅')
                    ? 'rgba(0, 184, 148, 0.1)'
                    : 'rgba(255, 107, 107, 0.1)',
                  color: message.startsWith('✅')
                    ? 'var(--accent-success)'
                    : 'var(--accent-danger)',
                  fontSize: 'var(--font-size-sm)',
                  marginBottom: 'var(--space-4)',
                }}>
                  {message}
                </div>
              )}

              <button type="submit" className="btn btn-primary" id="settings-save-btn" disabled={saving}>
                <Save size={16} />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </form>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">WhatsApp Bağlantısı</h3>
            <div className="card" style={{ padding: 'var(--space-5)' }}>

              {/* Bağlantı durumu */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-5)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                background: waConnected
                  ? 'rgba(0, 184, 148, 0.08)'
                  : 'rgba(255, 107, 107, 0.08)',
                border: `1px solid ${waConnected ? 'rgba(0, 184, 148, 0.2)' : 'rgba(255, 107, 107, 0.2)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{
                    width: 40, height: 40,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: waConnected
                      ? 'rgba(0, 184, 148, 0.15)'
                      : 'rgba(255, 107, 107, 0.15)',
                  }}>
                    {waConnected
                      ? <Wifi size={20} style={{ color: 'var(--accent-success)' }} />
                      : <WifiOff size={20} style={{ color: 'var(--accent-danger)' }} />}
                  </div>
                  <div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: 'var(--font-size-base)',
                      color: waConnected ? 'var(--accent-success)' : 'var(--accent-danger)',
                    }}>
                      {waChecking ? 'Kontrol ediliyor...' : waConnected ? 'Bağlı' : 'Bağlı Değil'}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                      {waConnected ? 'WhatsApp mesajları aktif' : 'QR kodu tarayarak bağlanın'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {waConnected ? (
                    <button
                      className="btn"
                      onClick={handleWaDisconnect}
                      disabled={waLoading}
                      style={{
                        background: 'rgba(255, 107, 107, 0.1)',
                        color: 'var(--accent-danger)',
                        border: '1px solid rgba(255, 107, 107, 0.2)',
                        fontSize: 'var(--font-size-xs)',
                        padding: 'var(--space-2) var(--space-3)',
                      }}
                    >
                      <WifiOff size={14} />
                      Bağlantıyı Kes
                    </button>
                  ) : (
                    <button
                      className="btn"
                      onClick={handleWaRestart}
                      disabled={waLoading}
                      style={{
                        background: 'rgba(108, 92, 231, 0.1)',
                        color: 'var(--primary)',
                        border: '1px solid rgba(108, 92, 231, 0.2)',
                        fontSize: 'var(--font-size-xs)',
                        padding: 'var(--space-2) var(--space-3)',
                      }}
                    >
                      <RefreshCw size={14} className={waLoading ? 'spin' : ''} />
                      {waLoading ? 'Başlatılıyor...' : 'Yeniden Bağlan'}
                    </button>
                  )}
                </div>
              </div>

              {/* QR Kod */}
              {!waConnected && waQr && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-6)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  marginBottom: 'var(--space-5)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    fontSize: 'var(--font-size-base)',
                  }}>
                    <QrCode size={20} />
                    QR Kodu Tarayın
                  </div>

                  <div style={{
                    background: '#fff',
                    padding: 16,
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  }}>
                    <QRCodeSVG
                      value={waQr}
                      size={220}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--font-size-xs)',
                  }}>
                    <Smartphone size={14} />
                    WhatsApp {'>'} Bağlı Cihazlar {'>'} Cihaz Bağla
                  </div>
                </div>
              )}

              {/* QR bekleniyor */}
              {!waConnected && !waQr && !waChecking && (
                <div style={{
                  textAlign: 'center',
                  padding: 'var(--space-6)',
                  color: 'var(--text-muted)',
                  fontSize: 'var(--font-size-sm)',
                  marginBottom: 'var(--space-5)',
                }}>
                  <RefreshCw size={24} style={{ marginBottom: 'var(--space-3)', opacity: 0.5 }} />
                  <p>QR kodu bekleniyor... "Yeniden Bağlan" butonuna tıklayın.</p>
                </div>
              )}

              {/* Kullanım kılavuzu */}
              <div>
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                  marginBottom: 'var(--space-3)',
                }}>
                  Kullanım Kılavuzu
                </div>
                <ul style={{
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-secondary)',
                }}>
                  <li>📝 <strong>"yarın 16 da toplantı"</strong> — Saatli görev (30 dk önce hatırlatır)</li>
                  <li>📝 <strong>"45 günde bir backup kontrolü"</strong> — Tekrarlayan görev</li>
                  <li>📍 <strong>"Kadıköy'de fatura öde"</strong> — Konumlu görev</li>
                  <li>✅ <strong>"backup tamamlandı"</strong> — Görevi tamamlar</li>
                  <li>📋 <strong>"bugün neler var?"</strong> — Bugünkü görevler</li>
                  <li>💡 <strong>"ne yapabilirim?"</strong> — Akıllı öneri</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
