import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, History, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { formatarData, formatarDataHora, formatarMoeda, paraInputDate } from '../utils/formatters';

const FORM_INICIAL = {
  nome: '',
  especie: '',
  raca: '',
  dataNascimento: '',
  clienteId: '',
};

export function AnimaisPage() {
  const [animais, setAnimais] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroClienteId, setFiltroClienteId] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [erroForm, setErroForm] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [historicoDados, setHistoricoDados] = useState(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const [animalExcluir, setAnimalExcluir] = useState(null);
  const [erroExcluir, setErroExcluir] = useState('');

  async function carregarDados(termo = busca, clienteId = filtroClienteId) {
    setCarregando(true);
    setErroLista('');
    try {
      const params = new URLSearchParams();
      if (termo.trim()) params.set('busca', termo.trim());
      if (clienteId) params.set('clienteId', clienteId);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const [listaAnimais, listaClientes] = await Promise.all([
        apiRequest(`/animais${qs}`),
        apiRequest('/clientes'),
      ]);
      setAnimais(listaAnimais);
      setClientes(listaClientes);
    } catch (err) {
      setErroLista(err.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados('', '');
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm({
      ...FORM_INICIAL,
      clienteId: clientes[0]?.id ? String(clientes[0].id) : '',
    });
    setErroForm('');
    setModalFormAberto(true);
  }

  function abrirEdicao(animal) {
    setEditandoId(animal.id);
    setForm({
      nome: animal.nome,
      especie: animal.especie,
      raca: animal.raca,
      dataNascimento: paraInputDate(animal.dataNascimento),
      clienteId: String(animal.clienteId),
    });
    setErroForm('');
    setModalFormAberto(true);
  }

  async function abrirHistorico(animal) {
    setErroLista('');
    setCarregandoHistorico(true);
    setHistoricoDados({ animal, atendimentos: [] });
    try {
      const dados = await apiRequest(`/animais/${animal.id}/historico`);
      setHistoricoDados(dados);
    } catch (err) {
      setHistoricoDados(null);
      setErroLista(err.message);
    } finally {
      setCarregandoHistorico(false);
    }
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setErroForm('');
    setMensagemSucesso('');

    if (!form.clienteId) {
      setErroForm('Selecione o cliente tutor do animal.');
      return;
    }

    setSalvando(true);
    try {
      const body = {
        ...form,
        clienteId: Number(form.clienteId),
      };
      if (editandoId) {
        await apiRequest(`/animais/${editandoId}`, { method: 'PUT', body });
        setMensagemSucesso('Animal atualizado com sucesso.');
      } else {
        await apiRequest('/animais', { method: 'POST', body });
        setMensagemSucesso('Animal cadastrado com sucesso.');
      }
      setModalFormAberto(false);
      await carregarDados(busca, filtroClienteId);
    } catch (err) {
      setErroForm(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!animalExcluir) return;
    setErroExcluir('');
    try {
      await apiRequest(`/animais/${animalExcluir.id}`, { method: 'DELETE' });
      setAnimalExcluir(null);
      setMensagemSucesso('Animal excluído com sucesso.');
      await carregarDados(busca, filtroClienteId);
    } catch (err) {
      setErroExcluir(err.message);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Animais</h1>
          <p className="page-subtitle">Gerencie os pets vinculados aos clientes e consulte o histórico de atendimentos.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={abrirNovo}>
          <Plus size={17} />
          <span>Novo animal</span>
        </button>
      </div>

      {mensagemSucesso && (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {erroLista && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{erroLista}</span>
        </div>
      )}

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          carregarDados(busca, filtroClienteId);
        }}
      >
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por nome do animal, espécie, raça ou tutor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div style={{ minWidth: '210px' }}>
          <select
            value={filtroClienteId}
            onChange={(e) => {
              setFiltroClienteId(e.target.value);
              carregarDados(busca, e.target.value);
            }}
            aria-label="Filtrar por tutor"
          >
            <option value="">Todos os tutores</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-secondary">
          Buscar
        </button>
      </form>

      <div className="card">
        {carregando ? (
          <div className="empty-state">Carregando animais...</div>
        ) : animais.length === 0 ? (
          <div className="empty-state">Nenhum animal encontrado.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Espécie / Raça</th>
                  <th>Nascimento</th>
                  <th>Tutor</th>
                  <th>Atendimentos</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {animais.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.nome}</strong></td>
                    <td>{a.especie} — {a.raca}</td>
                    <td>{formatarData(a.dataNascimento)}</td>
                    <td>{a.cliente?.nome}</td>
                    <td>{a._count?.agendamentos ?? 0}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => abrirHistorico(a)}
                        >
                          <History size={14} />
                          <span>Histórico</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => abrirEdicao(a)}
                        >
                          <Pencil size={14} />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost-danger btn-sm"
                          onClick={() => {
                            setErroExcluir('');
                            setAnimalExcluir(a);
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro / Edição */}
      <Modal
        aberto={modalFormAberto}
        titulo={editandoId ? 'Editar animal' : 'Novo animal'}
        onClose={() => setModalFormAberto(false)}
      >
        {erroForm && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{erroForm}</span>
          </div>
        )}

        <form className="form-grid" onSubmit={handleSalvar}>
          <div className="field">
            <label htmlFor="ani-tutor">Cliente tutor</label>
            <select
              id="ani-tutor"
              value={form.clienteId}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
              required
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row-2">
            <div className="field">
              <label htmlFor="ani-nome">Nome do animal</label>
              <input
                id="ani-nome"
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="ani-nasc">Data de nascimento</label>
              <input
                id="ani-nasc"
                type="date"
                value={form.dataNascimento}
                onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="field">
              <label htmlFor="ani-especie">Espécie</label>
              <input
                id="ani-especie"
                type="text"
                placeholder="Ex.: Cão, Gato"
                value={form.especie}
                onChange={(e) => setForm({ ...form, especie: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="ani-raca">Raça</label>
              <input
                id="ani-raca"
                type="text"
                placeholder="Ex.: SRD, Poodle, Siamês"
                value={form.raca}
                onChange={(e) => setForm({ ...form, raca: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalFormAberto(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar animal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Histórico de Atendimentos (RF07) */}
      <Modal
        aberto={Boolean(historicoDados)}
        titulo={historicoDados ? `Histórico de ${historicoDados.animal.nome}` : ''}
        onClose={() => setHistoricoDados(null)}
        tamanho="lg"
      >
        {carregandoHistorico ? (
          <div className="empty-state">Carregando histórico...</div>
        ) : historicoDados && (
          <div className="form-grid">
            <div className="summary-box">
              <div>
                <strong>Animal:</strong> {historicoDados.animal.nome} ({historicoDados.animal.especie} — {historicoDados.animal.raca})
              </div>
              <div>
                <strong>Tutor:</strong> {historicoDados.animal.cliente?.nome}
              </div>
            </div>

            {historicoDados.atendimentos.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                Não há atendimentos registrados para este animal.
              </div>
            ) : (
              <div className="agenda-list">
                {historicoDados.atendimentos.map((at) => (
                  <div key={at.id} className="card" style={{ padding: '0.9rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div>
                        <strong>{formatarDataHora(at.dataHora)}</strong>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                          ({at.duracaoTotalMin} min)
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <strong>{formatarMoeda(at.valorTotal)}</strong>
                        <StatusBadge status={at.status} />
                      </div>
                    </div>

                    <div className="agenda-services-tags">
                      {at.servicos.map((s) => (
                        <span key={s.servicoId} className="service-tag">
                          {s.nome} — {formatarMoeda(s.precoCobrado)}
                        </span>
                      ))}
                    </div>

                    {at.observacoes && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Obs.: {at.observacoes}
                      </p>
                    )}
                    <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Registrado por: {at.usuario?.nome}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setHistoricoDados(null)}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Exclusão */}
      <Modal
        aberto={Boolean(animalExcluir)}
        titulo="Confirmar exclusão de animal"
        onClose={() => setAnimalExcluir(null)}
      >
        {erroExcluir && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{erroExcluir}</span>
          </div>
        )}
        <p style={{ marginTop: 0 }}>
          Tem certeza que deseja excluir o animal <strong>{animalExcluir?.nome}</strong>?
        </p>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => setAnimalExcluir(null)}>
            Voltar
          </button>
          <button type="button" className="btn btn-danger" onClick={confirmarExclusao}>
            Confirmar exclusão
          </button>
        </div>
      </Modal>
    </section>
  );
}

