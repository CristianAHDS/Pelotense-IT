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

### Deploy no Netlify (PWA estático)

O frontend está configurado para publicar como site estático no Netlify (o `netlify.toml` define `base: frontend`, `command: npm run build` e `publish: dist`). O backend (Express + SQLite) deve continuar rodando em um servidor próprio, pois o Netlify não persiste o banco em arquivo.

Configuração de variáveis de ambiente no Netlify (*Site settings → Environment variables*):

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base da API. Ex.: `http://SEU_IP:3001/api`. Se vazio, usa o proxy local (`/api`). |
| `VITE_SOCKET_URL` | URL do Socket.IO. Ex.: `http://SEU_IP:3001`. Se vazio, é derivado de `VITE_API_URL` ou `hostname:3001`. |

> O backend já libera CORS (`cors()`), permitindo o frontend no Netlify acessar a API na rede local.

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
- Service worker para cache offline (arquivos estáticos e respostas `GET /api/*`)

## Modo Offline com Sincronização

O sistema continua funcionando sem conexão (PWA) e sincroniza as alterações quando a rede volta.

**Detecção de conexão**
- O `OfflineContext` escuta os eventos `online`/`offline` do navegador e exibe um banner no topo (vermelho = sem conexão, âmbar = sincronizando pendências).

**Leitura offline (visualizar dados sem internet)**
- O service worker guarda em cache as respostas de `GET /api/*` usando a estratégia `NetworkFirst`: tenta a rede por 5s e, se falhar, serve o que já estava em cache. Chamados/páginas já visitados continuam visíveis offline.
- Os arquivos estáticos do app são pré-cacheados, então ele abre normalmente sem internet.

**Escrita offline (fila de sincronização)**
1. Sem conexão, as ações de **criar chamado**, **comentar** e **resolver** são gravadas na fila em `localStorage` (`pelotense-offline-queue`) como uma operação `{ url, method, body }`.
2. Um aviso é exibido; se houver anexos, eles são descartados com aviso (arquivos não são enfileirados de forma confiável no navegador).
3. Quando a conexão volta (evento `online`), o `OfflineContext` repassa a fila em ordem, reenviando cada operação via `fetch` e removendo as que tiverem sucesso.
4. O contador de pendências aparece no banner até a fila zerar.

**Sessão offline**
- O `AuthContext` salva o usuário em `localStorage` (`pelotense_user`), mantendo o usuário logado mesmo offline; ao reconectar, os dados são atualizados via `/auth/me`.

> O sync reenvia apenas **texto/JSON**. Anexos (imagens/vídeos) exigem conexão ativa.

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
| GET | `/api/projetos` | Listar projetos com tarefas |
| POST | `/api/projetos` | Criar projeto |
| PUT | `/api/projetos/:id` | Atualizar projeto |
| DELETE | `/api/projetos/:id` | Excluir projeto |
| POST | `/api/projetos/:id/tarefas` | Criar tarefa no projeto |
| PUT | `/api/projetos/tarefas/:id` | Atualizar tarefa |
| DELETE | `/api/projetos/tarefas/:id` | Excluir tarefa |
| GET | `/api/health` | Health check |

## Autor

**Cristian Raffi Cunha**

---

Desenvolvido para Pelotense IT - Gestão de Chamados de TI
