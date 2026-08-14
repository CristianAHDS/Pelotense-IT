import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { SkeletonTable } from '../components/ui/Skeleton';
import './Chamados.css';

import { API_URL } from '../config';

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

export default function Chamados() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [chamados, setChamados] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    prioridade: '',
  });
  const limit = 10;
  const { add: addToast } = useToast();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit, ...filters });
    fetch(`${API}/chamados?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setChamados(data.chamados);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, filters]);

  const totalPages = Math.ceil(total / limit);

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este chamado?')) return;
    await fetch(`${API}/chamados/${id}`, { method: 'DELETE' });
    addToast(`Chamado #${id} excluído`, 'success');
    setLoading(true);
    const params = new URLSearchParams({ page, limit, ...filters });
    fetch(`${API}/chamados?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setChamados(data.chamados);
        setTotal(data.total);
        setLoading(false);
      });
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
          <h2>Chamados</h2>
          <span className="page-subtitle">{total} chamados encontrados</span>
        </div>
        <Link to="/chamados/novo" className="btn btn-primary">
          <Plus size={18} /> Novo Chamado
        </Link>
      </div>

      <div className="filters-bar">
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
        ) : (
          <table className="table">
            <colgroup>
              <col style={{ width: '64px' }} />
              <col style={{ width: '240px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '88px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>Título</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Categoria</th>
                <th>Solicitante</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {chamados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-cell">📋 Nenhum chamado encontrado.</td>
                </tr>
              ) : (
                chamados.map((c) => (
                  <tr key={c.id} className="table-row-clickable" onClick={() => navigate(`/chamados/${c.id}`)}>
                    <td className="cell-id">#{c.id}</td>
                    <td className="cell-title">{c.titulo}</td>
                    <td><span className={`badge ${STATUS_MAP[c.status]?.cls}`}>{STATUS_MAP[c.status]?.label}</span></td>
                    <td><span className={`badge ${PRIORIDADE_MAP[c.prioridade]?.cls}`}>{PRIORIDADE_MAP[c.prioridade]?.label}</span></td>
                    <td><span className="badge badge-gray">{c.categoria}</span></td>
                    <td>{c.solicitante}</td>
                    <td className="cell-date">{new Date(c.criado_em).toLocaleDateString()}</td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/chamados/${c.id}`} className="btn-icon btn-icon-edit" title="Ver detalhes" onClick={(e) => e.stopPropagation()}><Eye size={16} /></Link>
                        <button className="btn-icon btn-icon-danger" title="Excluir chamado" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
    </div>
  );
}
