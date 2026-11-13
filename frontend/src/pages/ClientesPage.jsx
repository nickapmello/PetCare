import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import { Modal } from '../components/Modal';
import { formatarCpf, formatarData } from '../utils/formatters';

const FORM_INICIAL = { nome: '', cpf: '', telefone: '', email: '' };

export function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [erroForm, setErroForm] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [clienteDetalhes, setClienteDetalhes] = useState(null);
  const [clienteExcluir, setClienteExcluir] = useState(null);
  const [erroExcluir, setErroExcluir] = useState('');

  async function carregarClientes(termo = busca) {
    setCarregando(true);
    setErroLista('');
    try {
      const qs = termo.trim() ? `?busca=${encodeURIComponent(termo.trim())}` : '';
      const dados = await apiRequest(`/clientes${qs}`);
      setClientes(dados);
    } catch (err) {
      setErroLista(err.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarClientes('');
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setErroForm('');
    setModalFormAberto(true);
  }

  function abrirEdicao(cliente) {
    setEditandoId(cliente.id);
    setForm({
      nome: cliente.nome,
      cpf: formatarCpf(cliente.cpf),
      telefone: cliente.telefone,
      email: cliente.email,
    });
    setErroForm('');
    setModalFormAberto(true);
  }

  async function abrirDetalhes(cliente) {
    setErroLista('');
    try {
      const completo = await apiRequest(`/clientes/${cliente.id}`);
      setClienteDetalhes(completo);
    } catch (err) {
      setErroLista(err.message);
    }
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setErroForm('');
    setMensagemSucesso('');

    const cpfDigitos = form.cpf.replace(/\D/g, '');
    if (form.nome.trim().length < 2) {
      setErroForm('Informe o nome completo do cliente.');
      return;
    }
    if (cpfDigitos.length !== 11) {
      setErroForm('O CPF deve conter 11 dígitos.');
      return;
    }
    if (form.telefone.replace(/\D/g, '').length < 8) {
      setErroForm('Informe um telefone válido.');
      return;
    }
    if (!form.email.includes('@')) {
      setErroForm('Informe um e-mail válido.');
      return;
    }

    setSalvando(true);
    try {
      if (editandoId) {
        await apiRequest(`/clientes/${editandoId}`, {
          method: 'PUT',
          body: form,
        });
        setMensagemSucesso('Cliente atualizado com sucesso.');
      } else {
        await apiRequest('/clientes', {
          method: 'POST',
          body: form,
        });
        setMensagemSucesso('Cliente cadastrado com sucesso.');
      }
      setModalFormAberto(false);
      await carregarClientes(busca);
    } catch (err) {
      // Mantém o formulário preenchido em caso de erro (UC01 F1)
      setErroForm(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!clienteExcluir) return;
    setErroExcluir('');
    try {
      await apiRequest(`/clientes/${clienteExcluir.id}`, { method: 'DELETE' });
      setClienteExcluir(null);
      setMensagemSucesso('Cliente excluído com sucesso.');
      await carregarClientes(busca);
    } catch (err) {
      setErroExcluir(err.message);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Cadastre e gerencie os tutores atendidos pelo pet shop.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={abrirNovo}>
          <Plus size={17} />
          <span>Novo cliente</span>
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
          carregarClientes(busca);
        }}
      >
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-secondary">
          Buscar
        </button>
        {busca && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setBusca('');
              carregarClientes('');
            }}
          >
            Limpar
          </button>
        )}
      </form>

      <div className="card">
        {carregando ? (
          <div className="empty-state">Carregando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="empty-state">Nenhum cliente encontrado.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th>Animais</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.nome}</strong></td>
                    <td>{formatarCpf(c.cpf)}</td>
                    <td>{c.telefone}</td>
                    <td>{c.email}</td>
                    <td>{c._count?.animais ?? 0}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => abrirDetalhes(c)}
                          title="Consultar cliente"
                        >
                          <Eye size={14} />
                          <span>Consultar</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => abrirEdicao(c)}
                        >
                          <Pencil size={14} />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost-danger btn-sm"
                          onClick={() => {
                            setErroExcluir('');
                            setClienteExcluir(c);
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
        titulo={editandoId ? 'Editar cliente' : 'Novo cliente'}
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
            <label htmlFor="cli-nome">Nome completo</label>
            <input
              id="cli-nome"
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="field">
              <label htmlFor="cli-cpf">CPF</label>
              <input
                id="cli-cpf"
                type="text"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="cli-telefone">Telefone</label>
              <input
                id="cli-telefone"
                type="text"
                placeholder="(43) 99999-9999"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="cli-email">E-mail</label>
            <input
              id="cli-email"
              type="email"
              placeholder="cliente@exemplo.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalFormAberto(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Consulta de Detalhes */}
      <Modal
        aberto={Boolean(clienteDetalhes)}
        titulo={clienteDetalhes ? `Dados de ${clienteDetalhes.nome}` : ''}
        onClose={() => setClienteDetalhes(null)}
      >
        {clienteDetalhes && (
          <div className="form-grid">
            <div><strong>CPF:</strong> {formatarCpf(clienteDetalhes.cpf)}</div>
            <div><strong>Telefone:</strong> {clienteDetalhes.telefone}</div>
            <div><strong>E-mail:</strong> {clienteDetalhes.email}</div>
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Animais vinculados ({clienteDetalhes.animais?.length || 0}):</strong>
              {clienteDetalhes.animais?.length > 0 ? (
                <ul style={{ marginTop: '0.4rem', paddingLeft: '1.2rem' }}>
                  {clienteDetalhes.animais.map((a) => (
                    <li key={a.id}>
                      {a.nome} — {a.especie} ({a.raca}), nasc. {formatarData(a.dataNascimento)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
                  Nenhum animal cadastrado para este cliente.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setClienteDetalhes(null)}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Confirmação de Exclusão */}
      <Modal
        aberto={Boolean(clienteExcluir)}
        titulo="Confirmar exclusão de cliente"
        onClose={() => setClienteExcluir(null)}
      >
        {erroExcluir && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{erroExcluir}</span>
          </div>
        )}
        <p style={{ marginTop: 0 }}>
          Tem certeza que deseja excluir o cliente <strong>{clienteExcluir?.nome}</strong>?
        </p>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => setClienteExcluir(null)}>
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

