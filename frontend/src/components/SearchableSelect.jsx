import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { normalizarTexto } from '../utils/formatters';

export function SearchableSelect({
  id,
  items,
  value,
  onChange,
  getLabel,
  getDisplayValue,
  getFilterText,
  getMeta,
  placeholder = 'Buscar ou selecionar...',
  emptyMessage = 'Nenhum registro encontrado',
  clearLabel = 'Limpar seleção',
  openLabel = 'Abrir lista',
  closeLabel = 'Fechar lista',
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [indiceAtivo, setIndiceAtivo] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const itensOrdenados = useMemo(
    () =>
      [...items].sort((a, b) => {
        const cmp = getLabel(a).localeCompare(getLabel(b), 'pt-BR', {
          sensitivity: 'base',
        });
        if (cmp !== 0) return cmp;
        const metaA = getMeta ? getMeta(a, new Map()) : '';
        const metaB = getMeta ? getMeta(b, new Map()) : '';
        return String(metaA).localeCompare(String(metaB), 'pt-BR', {
          sensitivity: 'base',
        });
      }),
    [items, getLabel, getMeta],
  );

  const contagemNomes = useMemo(() => {
    const mapa = new Map();
    for (const item of itensOrdenados) {
      const chave = normalizarTexto(getLabel(item));
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    }
    return mapa;
  }, [itensOrdenados, getLabel]);

  const itemSelecionado = useMemo(
    () => itensOrdenados.find((item) => String(item.id) === String(value)) || null,
    [itensOrdenados, value],
  );

  const itensFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    if (!termo) return itensOrdenados;
    return itensOrdenados.filter((item) =>
      normalizarTexto(getFilterText(item)).includes(termo),
    );
  }, [itensOrdenados, busca, getFilterText]);

  useEffect(() => {
    function aoClicarFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
        setBusca('');
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  useEffect(() => {
    if (!aberto || !listRef.current) return;
    const item = listRef.current.children[indiceAtivo];
    if (item && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [aberto, indiceAtivo]);

  function abrirLista() {
    setBusca('');
    const idxSelecionado = itensOrdenados.findIndex(
      (item) => String(item.id) === String(value),
    );
    setIndiceAtivo(idxSelecionado >= 0 ? idxSelecionado : 0);
    setAberto(true);
  }

  function selecionarItem(item) {
    onChange(String(item.id));
    setBusca('');
    setAberto(false);
  }

  function limparSelecao(e) {
    e.stopPropagation();
    onChange('');
    setBusca('');
    setIndiceAtivo(0);
    setAberto(true);
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (!aberto) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        abrirLista();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (itensFiltrados.length > 0) {
        setIndiceAtivo((prev) => (prev + 1) % itensFiltrados.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (itensFiltrados.length > 0) {
        setIndiceAtivo((prev) =>
          prev <= 0 ? itensFiltrados.length - 1 : prev - 1,
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const escolhido = itensFiltrados[indiceAtivo];
      if (escolhido) {
        selecionarItem(escolhido);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setAberto(false);
      setBusca('');
    }
  }

  const textoSelecionado = itemSelecionado
    ? (getDisplayValue ? getDisplayValue(itemSelecionado) : getLabel(itemSelecionado))
    : '';
  const valorInput = aberto ? busca : textoSelecionado;
  const placeholderInput =
    aberto && itemSelecionado
      ? `Digite para filtrar... (atual: ${textoSelecionado})`
      : placeholder;

  return (
    <div className="combobox" ref={containerRef}>
      <div className="combobox-input-wrap">
        <Search size={16} className="combobox-icon-left" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={aberto}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholderInput}
          value={valorInput}
          onFocus={() => {
            if (!aberto) abrirLista();
          }}
          onClick={() => {
            if (!aberto) abrirLista();
          }}
          onChange={(e) => {
            setBusca(e.target.value);
            setIndiceAtivo(0);
            if (!aberto) setAberto(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <div className="combobox-controls">
          {value && (
            <button
              type="button"
              className="combobox-icon-btn"
              onClick={limparSelecao}
              aria-label={clearLabel}
              title="Limpar seleção"
            >
              <X size={15} />
            </button>
          )}
          <button
            type="button"
            className="combobox-icon-btn"
            onClick={() => {
              if (aberto) {
                setAberto(false);
                setBusca('');
              } else {
                abrirLista();
                inputRef.current?.focus();
              }
            }}
            aria-label={aberto ? closeLabel : openLabel}
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {aberto && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="combobox-list"
        >
          {itensFiltrados.length === 0 ? (
            <li className="combobox-empty">{emptyMessage}</li>
          ) : (
            itensFiltrados.map((item, idx) => {
              const selecionado = String(item.id) === String(value);
              const ativo = idx === indiceAtivo;
              const meta = getMeta ? getMeta(item, contagemNomes) : '';

              return (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={selecionado}
                  className={`combobox-option ${ativo ? 'active' : ''} ${selecionado ? 'selected' : ''}`}
                  onMouseEnter={() => setIndiceAtivo(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selecionarItem(item);
                  }}
                >
                  <span className="combobox-option-name">{getLabel(item)}</span>
                  {meta && <span className="combobox-option-meta">{meta}</span>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
