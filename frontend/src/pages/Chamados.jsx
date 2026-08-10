import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { SkeletonTable } from '../components/ui/Skeleton';
import './Chamados.css';

const API = '/api';

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
  const [chamados, setChamados] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    prioridade: '',
  });
  const limit = 15;
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
            <thead>
              <tr>
                <th>#</th>
                <th>Título</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Solicitante</th>
                <th>Criado em</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {chamados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">📋 Nenhum chamado encontrado.</td>
                </tr>
              ) : (
                chamados.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-id">#{c.id}</td>
                    <td className="cell-title">{c.titulo}</td>
                    <td><span className={`badge ${STATUS_MAP[c.status]?.cls}`}>{STATUS_MAP[c.status]?.label}</span></td>
                    <td><span className={`badge ${PRIORIDADE_MAP[c.prioridade]?.cls}`}>{PRIORIDADE_MAP[c.prioridade]?.label}</span></td>
                    <td>{c.solicitante}</td>
                    <td className="cell-date">{new Date(c.criado_em).toLocaleDateString()}</td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/chamados/${c.id}`} className="btn-icon" title="Ver detalhes"><Eye size={16} /></Link>
                        <button className="btn-icon btn-icon-danger" title="Excluir chamado" onClick={() => handleDelete(c.id)}><Trash2 size={16} /></button>
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
