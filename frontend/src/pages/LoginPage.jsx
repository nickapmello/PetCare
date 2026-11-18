import { useState } from 'react';
import { AlertCircle, LogIn, PawPrint } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (!email.trim() || !senha) {
      setErro('Informe seu e-mail e senha para entrar.');
      return;
    }

    setEnviando(true);
    try {
      await login(email.trim(), senha);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>
          <span className="brand-icon">
            <PawPrint size={20} />
          </span>
          <span style={{ fontSize: '1.35rem' }}>PetCare</span>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 0, marginBottom: '1.5rem', fontSize: '0.92rem' }}>
          Sistema de Gestão de Pet Shop
        </p>

        {erro && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{erro}</span>
          </div>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              type="email"
              placeholder="usuario@petcare.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="login-senha">Senha</label>
            <input
              id="login-senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={enviando} style={{ marginTop: '0.35rem', padding: '0.72rem' }}>
            <LogIn size={17} />
            <span>{enviando ? 'Entrando...' : 'Entrar'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

