# Pelotense IT - Dashboard de Chamados de TI

Sistema completo de gestão de chamados de suporte técnico com dashboard, kanban, relatórios e portal do cliente.

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js + Express + Socket.IO |
| Banco | SQLite (sql.js) |
| Desktop | Tauri (configurado) |
| UI | Tema escuro/claro, responsivo, PWA |

## Estrutura

```
Pelotense IT/
├── backend/
│   ├── src/
│   │   ├── server.js          # Servidor Express + Socket.IO
│   │   ├── database.js        # Conexão SQLite (sql.js)
│   │   └── routes/
│   │       └── chamados.js    # API REST de chamados
│   ├── uploads/               # Arquivos de anexos
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/        # DashboardLayout, PortalLayout
│   │   │   └── ui/            # Skeleton, componentes reutilizáveis
│   │   ├── contexts/          # SocketContext, ThemeContext, ToastContext
│   │   ├── pages/             # Dashboard, Kanban, Chamados, Relatorios, etc.
│   │   ├── App.jsx            # Rotas principais
│   │   └── main.jsx           # Entry point
│   ├── src-tauri/             # Configuração Tauri
│   └── package.json
├── package.json               # Scripts de orquestração
└── README.md
```

## Como rodar

### Pré-requisitos
- Node.js 18+
- npm

### Instalação

```bash
# Instalar dependências de todos os módulos
npm run install:all
```

### Desenvolvimento

```bash
# Terminal 1 - Backend (porta 3001)
cd backend && npm run dev

# Terminal 2 - Frontend (porta 1420)
cd frontend && npm run dev
```

Acesse: `http://localhost:1420`

### Acesso mobile (mesma rede)

1. Descubra o IP do computador: `ipconfig` (PowerShell)
2. No celular, acesse: `http://192.168.x.x:1420`

### Tauri (desktop app)

```bash
cd frontend && npm run tauri dev
```

> Requer Rust e build tools instalados.

## Funcionalidades

### Dashboard Admin (`/`)
- Cards de estatísticas com clique para filtrar
- Ações rápidas (Novo Chamado, Kanban, Chamados)
- Chamados recentes
- Gráficos de status e prioridade
- Clima em tempo real (geolocalização + Open-Meteo)
- Atualização em tempo real via WebSocket

### Kanban (`/kanban`)
- 4 colunas: A Fazer, Em Andamento, Pendente, Finalizado
- Criar cards diretamente nas colunas
- Arrastar cards entre colunas (arrastar para Finalizado adiciona "pendencia" ao título)
- Sincronização bidirecional com a lista de chamados

### Chamados (`/chamados`)
- Tabela com paginação e filtros (status, prioridade)
- Detalhe do chamado com descrição, tags, anexos, comentários e histórico
- Anexos: upload de imagens, vídeos e áudio com pré-visualização
- Tags customizáveis
- Excluir chamados

### Relatórios (`/relatorios`)
- Filtro por período (data inicial e final)
- Métricas: total, taxa de resolução, SLA médio, técnicos ativos
- Gráfico de evolução diária (barras)
- Barras horizontais de prioridade
- Desempenho por técnico
- Exportar CSV e PDF

### Portal do Cliente (`/portal`)
- Interface pública para clientes
- Buscar chamados por e-mail/nome
- Criar novo chamado sem login

### Modo Claro/Escuro
- Toggle no header e sidebar
- Tema salvo no localStorage
- CSS variables para transição suave

### PWA
- Instalável como app standalone
- Service worker para cache offline

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/chamados` | Listar chamados (com filtros e paginação) |
| GET | `/api/chamados/stats` | Estatísticas (com filtro de período) |
| GET | `/api/chamados/:id` | Detalhe do chamado |
| POST | `/api/chamados` | Criar chamado |
| PUT | `/api/chamados/:id` | Atualizar chamado |
| DELETE | `/api/chamados/:id` | Excluir chamado |
| POST | `/api/chamados/:id/comentarios` | Adicionar comentário |
| POST | `/api/chamados/:id/anexos` | Upload de anexos |
| GET | `/api/chamados/anexos/:filename` | Download de anexo |
| DELETE | `/api/chamados/anexos/:id` | Remover anexo |
| GET | `/api/chamados/tags/list` | Listar tags |
| GET | `/api/health` | Health check |

## Autor

**Cristian Raffi Cunha**

---

Desenvolvido para Pelotense IT - Gestão de Chamados de TI
