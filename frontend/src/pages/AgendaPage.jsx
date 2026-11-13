import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Plus,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import {
  formatarData,
  formatarHora,
  formatarMoeda,
  paraInputDateTimeLocal,
} from '../utils/formatters';

export function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [filtroData, setFiltroData] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  // Modal Novo Agendamento
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [animalId, setAnimalId] = useState('');
  const [servicosSelecionados, setServicosSelecionados] = useState([]);
  const [dataHora, setDataHora] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erroNovo, setErroNovo] = useState('');
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  // Modal Reagendar
  const [agendamentoReagendar, setAgendamentoReagendar] = useState(null);
  const [novaDataHora, setNovaDataHora] = useState('');
  const [novasObservacoes, setNovasObservacoes] = useState('');
  const [erroReagendar, setErroReagendar] = useState('');
  const [salvandoReagendar, setSalvandoReagendar] = useState(false);

  // Modal Cancelar
  const [agendamentoCancelar, setAgendamentoCancelar] = useState(null);

  async function carregarTudo(data = filtroData, status = filtroStatus) {
    setCarregando(true);
    setErroLista('');
    try {
      const params = new URLSearchParams();
      if (data) params.set('data', data);
      if (status) params.set('status', status);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const [listaAg, listaAnimais, listaServicos] = await Promise.all([
        apiRequest(`/agendamentos${qs}`),
        apiRequest('/animais'),
        apiRequest('/servicos'),
      ]);
      setAgendamentos(listaAg);
      setAnimais(listaAnimais);
      setServicos(listaServicos);
    } catch (err) {
      setErroLista(err.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarTudo('', '');
  }, []);

  const resumoNovo = useMemo(() => {
    const escolhidos = servicos.filter((s) => servicosSelecionados.includes(s.id));
    const duracaoMin = escolhidos.reduce((acc, s) => acc + s.duracaoMin, 0);
    const valorTotal = escolhidos.reduce((acc, s) => acc + Number(s.preco), 0);
    let terminoPrevisto = '';
    if (dataHora && duracaoMin > 0) {
      const inicio = new Date(dataHora);
      if (!Number.isNaN(inicio.getTime())) {
        const fim = new Date(inicio.getTime() + duracaoMin * 60000);
        terminoPrevisto = formatarHora(fim.toISOString());
      }
    }
    return { duracaoMin, valorTotal, terminoPrevisto };
  }, [servicos, servicosSelecionados, dataHora]);

  const terminoReagendarPrevisto = useMemo(() => {
    if (!agendamentoReagendar || !novaDataHora) return '';
    const inicio = new Date(novaDataHora);
    if (Number.isNaN(inicio.getTime())) return '';
    const fim = new Date(inicio.getTime() + agendamentoReagendar.duracaoTotalMin * 60000);
    return formatarHora(fim.toISOString());
  }, [agendamentoReagendar, novaDataHora]);

  function abrirNovoAgendamento() {
    setAnimalId(animais[0]?.id ? String(animais[0].id) : '');
    setServicosSelecionados([]);
    setDataHora('');
    setObservacoes('');
    setErroNovo('');
    setModalNovoAberto(true);
  }

  function alternarServico(id) {
    setServicosSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleCriarAgendamento(e) {
    e.preventDefault();
    setErroNovo('');
    setMensagemSucesso('');

    if (!animalId) {
      setErroNovo('Selecione um animal.');
      return;
    }
    if (servicosSelecionados.length === 0) {
      setErroNovo('Selecione pelo menos um serviço.');
      return;
    }
    if (!dataHora) {
      setErroNovo('Informe a data e o horário de início.');
      return;
    }

    setSalvandoNovo(true);
    try {
      await apiRequest('/agendamentos', {
        method: 'POST',
        body: {
          animalId: Number(animalId),
          servicoIds: servicosSelecionados,
          dataHora: new Date(dataHora).toISOString(),
          observacoes,
        },
      });
      setModalNovoAberto(false);
      setMensagemSucesso('Agendamento registrado com sucesso.');
      await carregarTudo(filtroData, filtroStatus);
    } catch (err) {
      setErroNovo(err.message);
    } finally {
      setSalvandoNovo(false);
    }
  }

  function abrirReagendar(ag) {
    setAgendamentoReagendar(ag);
    setNovaDataHora(paraInputDateTimeLocal(ag.dataHora));
    setNovasObservacoes(ag.observacoes || '');
    setErroReagendar('');
  }

  async function handleReagendar(e) {
    e.preventDefault();
    if (!agendamentoReagendar) return;
    setErroReagendar('');
    setMensagemSucesso('');

    if (!novaDataHora) {
      setErroReagendar('Informe a nova data e horário.');
      return;
    }

    setSalvandoReagendar(true);
    try {
      await apiRequest(`/agendamentos/${agendamentoReagendar.id}/reagendar`, {
        method: 'PATCH',
        body: {
          dataHora: new Date(novaDataHora).toISOString(),
          observacoes: novasObservacoes,
        },
      });
      setAgendamentoReagendar(null);
      setMensagemSucesso('Agendamento reagendado com sucesso.');
      await carregarTudo(filtroData, filtroStatus);
    } catch (err) {
      setErroReagendar(err.message);
    } finally {
      setSalvandoReagendar(false);
    }
  }

  async function confirmarCancelamento() {
    if (!agendamentoCancelar) return;
    setErroLista('');
    setMensagemSucesso('');
    try {
      await apiRequest(`/agendamentos/${agendamentoCancelar.id}/cancelar`, {
        method: 'PATCH',
      });
      setAgendamentoCancelar(null);
      setMensagemSucesso('Agendamento cancelado. O horário foi liberado na agenda.');
      await carregarTudo(filtroData, filtroStatus);
    } catch (err) {
      setAgendamentoCancelar(null);
      setErroLista(err.message);
    }
  }

  async function concluirAtendimento(ag) {
    setErroLista('');
    setMensagemSucesso('');
    try {
      await apiRequest(`/agendamentos/${ag.id}/concluir`, {
        method: 'PATCH',
      });
      setMensagemSucesso('Atendimento marcado como concluído.');
      await carregarTudo(filtroData, filtroStatus);
    } catch (err) {
      setErroLista(err.message);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agenda de Atendimentos</h1>
          <p className="page-subtitle">Agenda única do pet shop com validação automática de disponibilidade.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={abrirNovoAgendamento}>
          <Plus size={17} />
          <span>Novo agendamento</span>
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

      <div className="toolbar">
        <div style={{ minWidth: '180px' }}>
          <input
            type="date"
            aria-label="Filtrar por data"
            value={filtroData}
            onChange={(e) => {
              setFiltroData(e.target.value);
              carregarTudo(e.target.value, filtroStatus);
            }}
          />
        </div>
        <div style={{ minWidth: '180px' }}>
          <select
            aria-label="Filtrar por status"
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              carregarTudo(filtroData, e.target.value);
            }}
          >
            <option value="">Todos os status</option>
            <option value="AGENDADO">Agendado</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
        {(filtroData || filtroStatus) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setFiltroData('');
              setFiltroStatus('');
              carregarTudo('', '');
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {carregando ? (
        <div className="card empty-state">Carregando agendamentos...</div>
      ) : agendamentos.length === 0 ? (
        <div className="card empty-state">
          Nenhum agendamento encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="agenda-list">
          {agendamentos.map((ag) => (
            <div key={ag.id} className="card agenda-card">
              <div style={{ flex: '1 1 320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <span className="agenda-card-time">
                    <Clock size={16} />
                    <span>
                      {formatarData(ag.dataHora)} • {formatarHora(ag.dataHora)} – {formatarHora(ag.dataFim)}
                    </span>
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    ({ag.duracaoTotalMin} min)
                  </span>
                  <StatusBadge status={ag.status} />
                </div>

                <div style={{ marginTop: '0.45rem', fontSize: '0.96rem' }}>
                  <strong>{ag.animal?.nome}</strong> ({ag.animal?.especie} — {ag.animal?.raca})
                  <span style={{ color: 'var(--text-muted)' }}>
                    {' '}• Tutor: {ag.animal?.cliente?.nome}
                  </span>
                </div>

                <div className="agenda-services-tags">
                  {ag.servicos.map((s) => (
                    <span key={s.servicoId} className="service-tag">
                      {s.nome} ({formatarMoeda(s.precoCobrado)})
                    </span>
                  ))}
                </div>

                {ag.observacoes && (
                  <p style={{ margin: '0.45rem 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    Obs.: {ag.observacoes}
                  </p>
                )}

                <div style={{ marginTop: '0.45rem', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                  Total: <strong style={{ color: 'var(--text)' }}>{formatarMoeda(ag.valorTotal)}</strong>
                  {' '}• Registrado por {ag.usuario?.nome}
                </div>
              </div>

              {ag.status === 'AGENDADO' && (
                <div className="actions-cell">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => abrirReagendar(ag)}
                  >
                    <CalendarClock size={14} />
                    <span>Reagendar</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => concluirAtendimento(ag)}
                  >
                    <Check size={14} />
                    <span>Concluir</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost-danger btn-sm"
                    onClick={() => setAgendamentoCancelar(ag)}
                  >
                    <XCircle size={14} />
                    <span>Cancelar</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Agendamento */}
      <Modal
        aberto={modalNovoAberto}
        titulo="Novo agendamento"
        onClose={() => setModalNovoAberto(false)}
        tamanho="lg"
      >
        {erroNovo && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{erroNovo}</span>
          </div>
        )}

        <form className="form-grid" onSubmit={handleCriarAgendamento}>
          <div className="form-row-2">
            <div className="field">
              <label htmlFor="ag-animal">Animal</label>
              <select
                id="ag-animal"
                value={animalId}
                onChange={(e) => setAnimalId(e.target.value)}
                required
              >
                <option value="">Selecione um animal...</option>
                {animais.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} (Tutor: {a.cliente?.nome})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="ag-inicio">Data e horário de início</label>
              <input
                id="ag-inicio"
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Serviços (selecione um ou mais)</label>
            <div className="service-checklist">
              {servicos.map((s) => {
                const marcado = servicosSelecionados.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`service-option ${marcado ? 'selected' : ''}`}
                  >
                    <span className="service-option-left">
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alternarServico(s.id)}
                      />
                      <span>
                        <strong>{s.nome}</strong>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {s.duracaoMin} min
                        </span>
                      </span>
                    </span>
                    <strong>{formatarMoeda(s.preco)}</strong>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="summary-box">
            <div>
              <strong>Duração total:</strong> {resumoNovo.duracaoMin} min
            </div>
            <div>
              <strong>Término previsto:</strong> {resumoNovo.terminoPrevisto || '—'}
            </div>
            <div>
              <strong>Valor total:</strong> {formatarMoeda(resumoNovo.valorTotal)}
            </div>
          </div>

          <div className="field">
            <label htmlFor="ag-obs">Observações (opcional)</label>
            <textarea
              id="ag-obs"
              rows={2}
              placeholder="Cuidados especiais, comportamento do pet, alergias..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalNovoAberto(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvandoNovo}>
              {salvandoNovo ? 'Agendando...' : 'Confirmar agendamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Reagendar */}
      <Modal
        aberto={Boolean(agendamentoReagendar)}
        titulo="Reagendar atendimento"
        onClose={() => setAgendamentoReagendar(null)}
      >
        {erroReagendar && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{erroReagendar}</span>
          </div>
        )}

        {agendamentoReagendar && (
          <form className="form-grid" onSubmit={handleReagendar}>
            <div className="summary-box">
              <div>
                <strong>Animal:</strong> {agendamentoReagendar.animal?.nome}
              </div>
              <div>
                <strong>Duração reservada:</strong> {agendamentoReagendar.duracaoTotalMin} min
              </div>
              <div>
                <strong>Novo término previsto:</strong> {terminoReagendarPrevisto || '—'}
              </div>
            </div>

            <div className="field">
              <label htmlFor="reag-inicio">Nova data e horário de início</label>
              <input
                id="reag-inicio"
                type="datetime-local"
                value={novaDataHora}
                onChange={(e) => setNovaDataHora(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="reag-obs">Observações</label>
              <textarea
                id="reag-obs"
                rows={2}
                value={novasObservacoes}
                onChange={(e) => setNovasObservacoes(e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAgendamentoReagendar(null)}
              >
                Voltar
              </button>
              <button type="submit" className="btn btn-primary" disabled={salvandoReagendar}>
                {salvandoReagendar ? 'Salvando...' : 'Salvar novo horário'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Cancelamento */}
      <Modal
        aberto={Boolean(agendamentoCancelar)}
        titulo="Cancelar agendamento"
        onClose={() => setAgendamentoCancelar(null)}
      >
        <p style={{ marginTop: 0 }}>
          Confirma o cancelamento do atendimento de <strong>{agendamentoCancelar?.animal?.nome}</strong> em{' '}
          <strong>{formatarData(agendamentoCancelar?.dataHora)}</strong> às{' '}
          <strong>{formatarHora(agendamentoCancelar?.dataHora)}</strong>?
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          O registro será preservado no histórico do animal com status Cancelado e o horário ficará livre na agenda.
        </p>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => setAgendamentoCancelar(null)}>
            Voltar
          </button>
          <button type="button" className="btn btn-danger" onClick={confirmarCancelamento}>
            Confirmar cancelamento
          </button>
        </div>
      </Modal>
    </section>
  );
}

