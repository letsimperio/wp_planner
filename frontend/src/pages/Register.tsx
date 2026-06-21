import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password, phone || undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kayıt olunamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <MessageSquare size={28} />
          </div>
          <h1 className="auth-title">Kayıt Ol</h1>
          <p className="auth-subtitle">WP Planner hesabı oluşturun</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">İsim</label>
            <input
              id="register-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adınız Soyadınız"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">Şifre</label>
            <input
              id="register-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 6 karakter"
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-phone">
              Telefon <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(WhatsApp için)</span>
            </label>
            <input
              id="register-phone"
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+905551234567"
            />
          </div>

          <button type="submit" className="btn btn-primary" id="register-submit" disabled={loading}>
            {loading ? 'Kayıt olunuyor...' : 'Kayıt Ol'}
          </button>
        </form>

        <div className="auth-footer">
          Zaten hesabınız var mı? <Link to="/login">Giriş Yapın</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
