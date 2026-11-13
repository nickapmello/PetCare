const LABELS = {
  AGENDADO: { texto: 'Agendado', classe: 'badge-agendado' },
  CONCLUIDO: { texto: 'Concluído', classe: 'badge-concluido' },
  CANCELADO: { texto: 'Cancelado', classe: 'badge-cancelado' },
};

export function StatusBadge({ status }) {
  const cfg = LABELS[status] || { texto: status, classe: '' };
  return <span className={`badge ${cfg.classe}`}>{cfg.texto}</span>;
}

