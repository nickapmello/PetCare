import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { formatarMoeda } from '../utils/formatters';

const FORM_INICIAL = { nome: '', descricao: '', preco: '', duracaoMin: '' };

export function ServicosPage() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.perfil === 'ADMINISTRADOR';

  const [servicos, setServicos] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [erroForm, setErroForm] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [servicoExcluir, setServicoExcluir] = useState(null);
  const [erroExcluir, setErroExcluir] = useState('');

  async function carregarServicos(termo = busca) {
    setCarregando(true);
    setErroLista('');
    try {
      const qs = termo.trim() ? `?busca=${encodeURIComponent(termo.trim())}` : '';
      const dados = await apiRequest(`/servicos${qs}`);
      setServicos(dados);
    } catch (err) {
      setErroLista(err.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarServicos('');
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setErroForm('');
    setModalFormAberto(true);
  }

  function abrirEdicao(servico) {
    setEditandoId(servico.id);
    setForm({
      nome: servico.nome,
      descricao: servico.descricao,
      preco: String(servico.preco),
      duracaoMin: String(servico.duracaoMin),
    });
    setErroForm('');
    setModalFormAberto(true);
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setErroForm('');
    setMensagemSucesso('');

    const precoNum = Number(form.preco);
    const duracaoNum = Number(form.duracaoMin);
    if (Number.isNaN(precoNum) || precoNum <= 0) {
      setErroForm('O preço do serviço deve ser maior que zero.');
      return;
    }
    if (!Number.isInteger(duracaoNum) || duracaoNum <= 0) {
      setErroForm('A duração deve ser um número inteiro positivo de minutos.');
      return;
    }

    setSalvando(true);
    try {
      const body = {
        nome: form.nome,
        descricao: form.descricao,
        preco: precoNum,
        duracaoMin: duracaoNum,
      };
      if (editandoId) {
        await apiRequest(`/servicos/${editandoId}`, { method: 'PUT', body });
        setMensagemSucesso('Serviço atualizado com sucesso.');
      } else {
        await apiRequest('/servicos', { method: 'POST', body });
        setMensagemSucesso('Serviço cadastrado com sucesso.');
      }
      setModalFormAberto(false);
      await carregarServicos(busca);
    } catch (err) {
      setErroForm(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!servicoExcluir) return;
    setErroExcluir('');
    try {
      await apiRequest(`/servicos/${servicoExcluir.id}`, { method: 'DELETE' });
      setServicoExcluir(null);
      setMensagemSucesso('Serviço excluído com sucesso.');
      await carregarServicos(busca);
    } catch (err) {
      setErroExcluir(err.message);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo de Serviços</h1>
          <p className="page-subtitle">Consulte os serviços oferecidos, valores e durações estimadas.</p>
        </div>
        {isAdmin && (
          <button type="button" className="btn btn-primary" onClick={abrirNovo}>
            <Plus size={17} />
            <span>Novo serviço</span>
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="alert alert-info">
          <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            Modo de visualização: o cadastro, edição e exclusão de serviços são restritos ao perfil <strong>Administrador</strong>.
          </span>
        </div>
      )}

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
          carregarServicos(busca);
        }}
      >
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar serviço por nome ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-secondary">
          Buscar
        </button>
      </form>

      <div className="card">
        {carregando ? (
          <div className="empty-state">Carregando serviços...</div>
        ) : servicos.length === 0 ? (
          <div className="empty-state">Nenhum serviço encontrado.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Descrição</th>
                  <th>Preço</th>
                  <th>Duração</th>
                  <th>Agendamentos</th>
                  {isAdmin && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {servicos.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.nome}</strong></td>
                    <td>{s.descricao}</td>
                    <td>{formatarMoeda(s.preco)}</td>
                    <td>{s.duracaoMin} min</td>
                    <td>{s._count?.agendamentoServicos ?? 0}</td>
                    {isAdmin && (
                      <td>
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => abrirEdicao(s)}
                          >
                            <Pencil size={14} />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost-danger btn-sm"
                            onClick={() => {
                              setErroExcluir('');
                              setServicoExcluir(s);
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro / Edição (Admin) */}
      <Modal
        aberto={modalFormAberto}
        titulo={editandoId ? 'Editar serviço' : 'Novo serviço'}
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
            <label htmlFor="srv-nome">Nome do serviço</label>
            <input
              id="srv-nome"
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="srv-desc">Descrição</label>
            <textarea
              id="srv-desc"
              rows={3}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="field">
              <label htmlFor="srv-preco">Preço (R$)</label>
              <input
                id="srv-preco"
                type="number"
                step="0.01"
                min="0.01"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="srv-duracao">Duração estimada (min)</label>
              <input
                id="srv-duracao"
                type="number"
                step="1"
                min="1"
                value={form.duracaoMin}
                onChange={(e) => setForm({ ...form, duracaoMin: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalFormAberto(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar serviço'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Exclusão */}
      <Modal
        aberto={Boolean(servicoExcluir)}
        titulo="Confirmar exclusão de serviço"
        onClose={() => setServicoExcluir(null)}
      >
        {erroExcluir && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{erroExcluir}</span>
          </div>
        )}
        <p style={{ marginTop: 0 }}>
          Tem certeza que deseja excluir o serviço <strong>{servicoExcluir?.nome}</strong>?
        </p>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => setServicoExcluir(null)}>
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

