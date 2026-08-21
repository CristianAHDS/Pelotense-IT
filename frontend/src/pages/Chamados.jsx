import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Eye, ChevronLeft, ChevronRight, Trash2, Search, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { SkeletonTable } from '../components/ui/Skeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import usePageTitle from '../hooks/usePageTitle';
import './Chamados.css';

import { API_URL } from '../config';
import { apiFetch } from '../api';
import { useTermos } from '../termos';

const API = API_URL;

const STATUS_MAP = {
  aberto: { label: 'Aberto', cls: 'badge-blue' },
  em_andamento: { label: 'Em Andamento', cls: 'badge-cyan' },
  pendente: { label: 'Pendente', cls: 'badge-yellow' },
  resolvido: { label: 'Resolvido', cls: 'badge-green' },
  fechado: { label: 'Fechado', cls: 'badge-gray' },
};

const PRIORIDADE_MAP = {
  baixa: { label: 'Baixa', cls: 'badge-green' },
  media: { label: 'Média', cls: 'badge-blue' },
  alta: { label: 'Alta', cls: 'badge-yellow' },
  critica: { label: 'Crítica', cls: 'badge-red' },
};

const COLUNAS = [
  { key: 'id', label: '#' },
  { key: 'titulo', label: 'Título' },
  { key: 'status', label: 'Status' },
  { key: 'prioridade', label: 'Prioridade' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'solicitante', label: 'Solicitante' },
  { key: 'criado_em', label: 'Criado em' },
];

function destacar(texto, termo) {
  if (!termo || texto == null) return texto;
  const t = String(texto);
  const idx = t.toLowerCase().indexOf(termo.toLowerCase());
  if (idx === -1) return t;
  return (
    <>
      {t.slice(0, idx)}
      <mark className="hl-busca">{t.slice(idx, idx + termo.length)}</mark>
      {t.slice(idx + termo.length)}
    </>
  );
}

export default function Chamados() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const termos = useTermos();
  usePageTitle(termos.Chamados);
  const [chamados, setChamados] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get('pagina')) || 1));
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    prioridade: searchParams.get('prioridade') || '',
  });
  const [search, setSearch] = useState(searchParams.get('busca') || '');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [ordem, setOrdem] = useState({
    campo: searchParams.get('ordenar') || '',
    dir: searchParams.get('dir') === 'asc' ? 'asc' : 'desc',
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const limit = 10;
  const { add: addToast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit, ...filters });
    if (debouncedSearch) params.set('busca', debouncedSearch);
    if (ordem.campo) {
      params.set('ordenar', ordem.campo);
      params.set('dir', ordem.dir);
    }
    apiFetch(`${API}/chamados?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setChamados(data.chamados);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, filters, debouncedSearch, ordem]);

  useEffect(() => {
    const p = {};
    if (filters.status) p.status = filters.status;
    if (filters.prioridade) p.prioridade = filters.prioridade;
    if (debouncedSearch) p.busca = debouncedSearch;
    if (ordem.campo) {
      p.ordenar = ordem.campo;
      p.dir = ordem.dir;
    }
    if (page > 1) p.pagina = String(page);
    setSearchParams(p, { replace: true });
  }, [filters, debouncedSearch, page, ordem, setSearchParams]);

  const totalPages = Math.ceil(total / limit);

  const alternarOrdem = (campo) => {
    setOrdem((o) => (o.campo === campo
      ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
      : { campo, dir: 'asc' }));
    setPage(1);
  };

  const recarregar = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit, ...filters });
    if (debouncedSearch) params.set('busca', debouncedSearch);
    if (ordem.campo) {
      params.set('ordenar', ordem.campo);
      params.set('dir', ordem.dir);
    }
    apiFetch(`${API}/chamados?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setChamados(data.chamados);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const confirmDelete = async () => {
    const id = deleteTarget;
    setDeleteTarget(null);
    if (!id) return;
    try {
      const r = await apiFetch(`${API}/chamados/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      addToast(`${termos.Chamado} #${id} excluído`, 'success');
      recarregar();
    } catch {
      addToast(`Erro ao excluir ${termos.chamado}`, 'error');
    }
  };

  return (
    <div className="chamados-page">
      <div className="page-header">
        <div className="header-particles">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="header-particle" style={{
              left: (5 + i * 20) + '%',
              animationDelay: (i * 0.6) + 's',
              animationDuration: (3 + i * 0.4) + 's',
            }} />
          ))}
        </div>
        <div>
          <h2>{termos.Chamados}</h2>
          <span className="page-subtitle">{total} {termos.chamados} encontrados</span>
        </div>
        <Link to="/chamados/novo" className="btn btn-primary">
          <Plus size={18} /> {termos.novoChamado}
        </Link>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por título, solicitante ou nº..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filters.prioridade}
          onChange={(e) => { setFilters({ ...filters, prioridade: e.target.value }); setPage(1); }}
        >
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORIDADE_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="table-container">
        {loading ? (
          <SkeletonTable rows={8} />
        ) : chamados.length === 0 ? (
          <EmptyState
            icon={search.trim() ? '🔍' : '📋'}
            title={`Nenhum ${termos.chamado} encontrado`}
            description={search.trim() ? `Nada corresponde a "${search}".` : `Ajuste os filtros ou crie um novo ${termos.chamado}.`}
            action={<Link to="/chamados/novo" className="btn btn-primary"><Plus size={16} /> {termos.novoChamado}</Link>}
          />
        ) : (
          <table className="table">
            <colgroup>
              <col style={{ width: '64px' }} />
              <col style={{ width: '240px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '88px' }} />
            </colgroup>
            <thead>
              <tr>
                {COLUNAS.map((col) => (
                  <th
                    key={col.key}
                    className={'th-sort' + (ordem.campo === col.key ? ' ordenando' : '')}
                    onClick={() => alternarOrdem(col.key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && alternarOrdem(col.key)}
                  >
                    <span>{col.label}</span>
                    {ordem.campo === col.key ? (
                      ordem.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ChevronsUpDown size={12} className="th-sort-idle" />
                    )}
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {chamados.map((c) => (
                <tr key={c.id} className="table-row-clickable" onClick={() => navigate(`/chamados/${c.id}`)}>
                  <td className="cell-id">#{c.id}</td>
                  <td className="cell-title">{destacar(c.titulo, debouncedSearch)}</td>
                  <td><span className={`badge ${STATUS_MAP[c.status]?.cls}`}>{STATUS_MAP[c.status]?.label}</span></td>
                  <td><span className={`badge ${PRIORIDADE_MAP[c.prioridade]?.cls}`}>{PRIORIDADE_MAP[c.prioridade]?.label}</span></td>
                  <td><span className="badge badge-gray">{destacar(c.categoria, debouncedSearch)}</span></td>
                  <td>{destacar(c.solicitante, debouncedSearch)}</td>
                  <td className="cell-date">{new Date(c.criado_em).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/chamados/${c.id}`} className="btn-icon btn-icon-edit" title="Ver detalhes" onClick={(e) => e.stopPropagation()}><Eye size={16} /></Link>
                      <button className="btn-icon btn-icon-danger" title={`Excluir ${termos.chamado}`} onClick={(e) => { e.stopPropagation(); setDeleteTarget(c.id); }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span>Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Excluir ${termos.chamado}`}
        message={`Tem certeza que deseja excluir o ${termos.chamado} #${deleteTarget}? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
