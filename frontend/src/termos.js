import { useAuth } from './contexts/AuthContext';

function build(av) {
  const subs = av
    ? { Chamados: 'Tarefas', chamados: 'tarefas', Chamado: 'Tarefa', chamado: 'tarefa' }
    : null;
  return {
    av,
    Chamado: av ? 'Tarefa' : 'Chamado',
    Chamados: av ? 'Tarefas' : 'Chamados',
    chamado: av ? 'tarefa' : 'chamado',
    chamados: av ? 'tarefas' : 'chamados',
    novoChamado: av ? 'Nova Tarefa' : 'Novo Chamado',
    gestaoDe: av ? 'Gestão de Tarefas' : 'Gestão de Chamados',
    tituloDoChamado: av ? 'Título da tarefa' : 'Título do chamado',
    meusChamados: av ? 'Minhas Tarefas' : 'Meus Chamados',
    aplicar: (texto) => {
      if (!texto || !subs) return texto;
      return texto.replace(/Chamados|chamados|Chamado|chamado/g, (m) => subs[m]);
    },
  };
}

export function useTermos() {
  const { user } = useAuth();
  return build(user?.tipo === 'audiovisual');
}

export function getTermos() {
  try {
    const raw = localStorage.getItem('pelotense_user');
    const user = raw ? JSON.parse(raw) : null;
    return build(user?.tipo === 'audiovisual');
  } catch (_) {
    return build(false);
  }
}