import { useCallback } from 'react';
import { SearchableSelect } from './SearchableSelect';
import { formatarCpf, normalizarTexto } from '../utils/formatters';

export function ClienteSelect({
  id = 'ani-tutor',
  clientes,
  value,
  onChange,
  placeholder = 'Buscar ou selecionar cliente tutor...',
}) {
  const getLabel = useCallback((c) => c.nome, []);
  const getFilterText = useCallback((c) => c.nome, []);
  const getMeta = useCallback((c, contagemNomes) => {
    const repetido = (contagemNomes.get(normalizarTexto(c.nome)) || 0) > 1;
    return `${c.telefone}${repetido ? ` • CPF ${formatarCpf(c.cpf)}` : ''}`;
  }, []);

  return (
    <SearchableSelect
      id={id}
      items={clientes}
      value={value}
      onChange={onChange}
      getLabel={getLabel}
      getFilterText={getFilterText}
      getMeta={getMeta}
      placeholder={placeholder}
      emptyMessage="Nenhum cliente encontrado"
      clearLabel="Limpar tutor selecionado"
      openLabel="Abrir lista de clientes"
      closeLabel="Fechar lista de clientes"
    />
  );
}
