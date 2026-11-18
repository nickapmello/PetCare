import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { Modal } from '../components/Modal';
import {
  aplicarMascaraCpf,
  aplicarMascaraTelefone,
  formatarCpf,
  formatarData,
  validarCpf,
} from '../utils/formatters';

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
  const [clienteCpfExistente, setClienteCpfExistente] = useState(null);
  const [avisoDuplicidade, setAvisoDuplicidade] = useState(null);
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
    setClienteCpfExistente(null);
    setAvisoDuplicidade(null);
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
    setClienteCpfExistente(null);
    setAvisoDuplicidade(null);
    setModalFormAberto(true);
  }

  function localizarClienteNaLista(cliente) {
    const termoBusca = formatarCpf(cliente.cpf);
    setModalFormAberto(false);
    setClienteCpfExistente(null);
    setAvisoDuplicidade(null);
    setBusca(termoBusca);
    carregarClientes(termoBusca);
  }

  function atualizarCampoForm(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (clienteCpfExistente) setClienteCpfExistente(null);
    if (avisoDuplicidade) setAvisoDuplicidade(null);
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

  async function persistirNovoCliente() {
    setSalvando(true);
    setErroForm('');
    try {
      await apiRequest('/clientes', {
        method: 'POST',
        body: form,
      });
      setMensagemSucesso('Cliente cadastrado com sucesso.');
      setAvisoDuplicidade(null);
      setClienteCpfExistente(null);
      setModalFormAberto(false);
      await carregarClientes(busca);
    } catch (err) {
      setErroForm(err.message);
      if (err.detalhes?.clienteExistente) {
        setClienteCpfExistente(err.detalhes.clienteExistente);
      }
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setErroForm('');
    setMensagemSucesso('');
    setClienteCpfExistente(null);

    const isEdicao = Boolean(editandoId);

    if (form.nome.trim().length < 2) {
      setErroForm('Informe o nome completo do cliente.');
      return;
    }
    if (!isEdicao && !validarCpf(form.cpf)) {
      setErroForm('Informe um CPF válido com 11 dígitos.');
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

    if (isEdicao) {
      setSalvando(true);
      try {
        await apiRequest(`/clientes/${editandoId}`, {
          method: 'PUT',
          body: {
            nome: form.nome,
            telefone: form.telefone,
            email: form.email,
          },
        });
        setMensagemSucesso('Cliente atualizado com sucesso.');
        setModalFormAberto(false);
        await carregarClientes(busca);
      } catch (err) {
        // Mantém o formulário preenchido em caso de erro (UC01 F1)
        setErroForm(err.message);
      } finally {
        setSalvando(false);
      }
      return;
    }

    // No cadastro, verifica antes no banco se já existe o CPF ou dados parecidos
    setSalvando(true);
    try {
      const checagem = await apiRequest('/clientes/verificar-duplicidade', {
        method: 'POST',
        body: form,
      });

      if (checagem.bloqueadoPorCpf && checagem.clienteExistente) {
        setErroForm('Já existe um cliente cadastrado com este CPF.');
        setClienteCpfExistente(checagem.clienteExistente);
        setAvisoDuplicidade(null);
        return;
      }

      if (checagem.possiveisDuplicados?.length > 0) {
        setAvisoDuplicidade(checagem.possiveisDuplicados);
        return;
      }

      setSalvando(false);
      await persistirNovoCliente();
    } catch (err) {
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
          <div className="alert alert-error" role="alert" style={{ flexDirection: 'column' }}>
            <div className="alert-header">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{erroForm}</span>
            </div>
            {clienteCpfExistente && (
              <>
                <ul className="alert-details-list">
                  <li>
                    <strong>{clienteCpfExistente.nome}</strong> — CPF {formatarCpf(clienteCpfExistente.cpf)} •{' '}
                    {clienteCpfExistente.telefone} • {clienteCpfExistente.email}
                  </li>
                </ul>
                <div className="alert-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const alvo = clienteCpfExistente;
                      setModalFormAberto(false);
                      abrirDetalhes(alvo);
                    }}
                  >
                    Ver cadastro existente
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => localizarClienteNaLista(clienteCpfExistente)}
                  >
                    Localizar cliente na lista
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {avisoDuplicidade && avisoDuplicidade.length > 0 && (
          <div className="alert alert-warning" role="status">
            <div className="alert-header">
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Possível duplicidade detectada:</strong> encontramos cliente(s) com o mesmo nome e
                telefone/e-mail parecido(s). Confira se não se trata da mesma pessoa:
              </span>
            </div>
            <ul className="alert-details-list">
              {avisoDuplicidade.map((dup) => (
                <li key={dup.id}>
                  <strong>{dup.nome}</strong> — CPF {formatarCpf(dup.cpf)} • {dup.telefone} • {dup.email}
                </li>
              ))}
            </ul>
            <div className="alert-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => localizarClienteNaLista(avisoDuplicidade[0])}
              >
                Localizar cliente existente
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={salvando}
                onClick={persistirNovoCliente}
              >
                {salvando ? 'Salvando...' : 'Prosseguir mesmo assim'}
              </button>
            </div>
          </div>
        )}

        <form className="form-grid" onSubmit={handleSalvar}>
          <div className="field">
            <label htmlFor="cli-nome">Nome completo</label>
            <input
              id="cli-nome"
              type="text"
              value={form.nome}
              onChange={(e) => atualizarCampoForm('nome', e.target.value)}
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
                maxLength={14}
                value={editandoId ? formatarCpf(form.cpf) : form.cpf}
                onChange={
                  editandoId
                    ? undefined
                    : (e) => atualizarCampoForm('cpf', aplicarMascaraCpf(e.target.value))
                }
                readOnly={Boolean(editandoId)}
                disabled={Boolean(editandoId)}
                aria-readonly={Boolean(editandoId)}
                required={!editandoId}
              />
              {editandoId && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  O CPF não pode ser alterado após o cadastro.
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="cli-telefone">Telefone</label>
              <input
                id="cli-telefone"
                type="text"
                placeholder="(43) 99999-9999"
                maxLength={15}
                value={form.telefone}
                onChange={(e) =>
                  atualizarCampoForm('telefone', aplicarMascaraTelefone(e.target.value))
                }
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
              onChange={(e) => atualizarCampoForm('email', e.target.value)}
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

