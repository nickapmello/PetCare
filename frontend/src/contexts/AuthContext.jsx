import { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const saved = localStorage.getItem('petcare_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('petcare_token');
    if (!token) {
      setCarregandoSessao(false);
      return;
    }

    apiRequest('/auth/me')
      .then((res) => {
        setUsuario(res.usuario);
        localStorage.setItem('petcare_user', JSON.stringify(res.usuario));
      })
      .catch(() => {
        localStorage.removeItem('petcare_token');
        localStorage.removeItem('petcare_user');
        setUsuario(null);
      })
      .finally(() => {
        setCarregandoSessao(false);
      });
  }, []);

  async function login(email, senha) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, senha },
      auth: false,
    });
    localStorage.setItem('petcare_token', res.token);
    localStorage.setItem('petcare_user', JSON.stringify(res.usuario));
    setUsuario(res.usuario);
    return res.usuario;
  }

  function logout() {
    localStorage.removeItem('petcare_token');
    localStorage.removeItem('petcare_user');
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregandoSessao, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

