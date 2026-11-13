export function formatarCpf(cpf) {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return cpf || '';
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0));
}

export function formatarData(dataIso) {
  if (!dataIso) return '';
  const str = String(dataIso);
  // Para datas @db.Date (YYYY-MM-DD ou ISO meia-noite UTC), evita deslocamento de fuso
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match && (str.length === 10 || str.includes('T00:00:00'))) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return new Intl.DateTimeFormat('pt-BR').format(new Date(dataIso));
}

export function paraInputDate(dataIso) {
  if (!dataIso) return '';
  return String(dataIso).slice(0, 10);
}

export function formatarDataHora(dataIso) {
  if (!dataIso) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dataIso));
}

export function formatarHora(dataIso) {
  if (!dataIso) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dataIso));
}

export function paraInputDateTimeLocal(dateValue) {
  const d = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

