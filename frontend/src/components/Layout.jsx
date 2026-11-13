import { Calendar, LogOut, PawPrint, Scissors, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ABAS = [
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'animais', label: 'Animais', icon: PawPrint },
  { id: 'servicos', label: 'Serviços', icon: Scissors },
];

export function Layout({ abaAtiva, onMudarAba, children }) {
  const { usuario, logout } = useAuth();
  const isAdmin = usuario?.perfil === 'ADMINISTRADOR';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-icon">
              <PawPrint size={20} />
            </span>
            <span>PetCare</span>
          </div>

          <nav className="nav-tabs" aria-label="Navegação principal">
            {ABAS.map((aba) => {
              const Icone = aba.icon;
              return (
                <button
                  key={aba.id}
                  type="button"
                  className={`nav-tab ${abaAtiva === aba.id ? 'active' : ''}`}
                  onClick={() => onMudarAba(aba.id)}
                >
                  <Icone size={17} />
                  <span>{aba.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="user-area">
            <div className="user-meta">
              <span className="user-name">{usuario?.nome}</span>
              <span className={`role-pill ${isAdmin ? 'admin' : 'atendente'}`}>
                {isAdmin ? 'Administrador' : 'Atendente'}
              </span>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
              <LogOut size={15} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">{children}</main>
    </div>
  );
}

