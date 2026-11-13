import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { AgendaPage } from './pages/AgendaPage';
import { ClientesPage } from './pages/ClientesPage';
import { AnimaisPage } from './pages/AnimaisPage';
import { ServicosPage } from './pages/ServicosPage';

function PetCareConteudo() {
  const { usuario, carregandoSessao } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState('agenda');

  if (carregandoSessao) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          Carregando sessão...
        </div>
      </div>
    );
  }

  if (!usuario) {
    return <LoginPage />;
  }

  return (
    <Layout abaAtiva={abaAtiva} onMudarAba={setAbaAtiva}>
      {abaAtiva === 'agenda' && <AgendaPage />}
      {abaAtiva === 'clientes' && <ClientesPage />}
      {abaAtiva === 'animais' && <AnimaisPage />}
      {abaAtiva === 'servicos' && <ServicosPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PetCareConteudo />
    </AuthProvider>
  );
}

