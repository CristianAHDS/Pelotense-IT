# Pelotense IT - Dashboard de Chamados de TI

Sistema completo de gestão de chamados de suporte técnico com dashboard, kanban, relatórios e portal do cliente.

![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Node.js](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express%20js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?&style=for-the-badge&logo=Socket.io&logoColor=white)
![SQLite](https://img.shields.io/badge/Sqlite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=for-the-badge&logo=Tauri&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)

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
├── evolution-api/             # Evolution API (gateway WhatsApp) — v1.8.2
├── package.json               # Scripts de orquestração
└── README.md
```

## Como rodar

### Pré-requisitos
- Node.js 18+
- npm

### Instalação

```bash
# Instalar dependências de todos os módulos (backend, frontend e evolution-api)
npm run install:all
```

> A pasta `evolution-api/` não é versionada (está no `.gitignore`). Se ela não existir no seu clone, baixe a Evolution API antes de instalar:

```bash
git clone --branch 1.8.2 --depth 1 https://github.com/EvolutionAPI/evolution-api.git evolution-api
cd evolution-api
npm install --legacy-peer-deps
```

### Desenvolvimento

```bash
# Sobe backend + frontend + Evolution API (WhatsApp) de uma vez
npm run dev

# Ou apenas backend + Evolution API (WhatsApp)
npm run dev:back

# Ou apenas frontend
npm run dev:front
```

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:1420`
- Evolution API (WhatsApp): `http://localhost:8081` (Manager em `http://localhost:8081/manager`)

Acesse o frontend em: `http://localhost:1420`

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

## Chatbot WhatsApp (Evolution API)

O sistema inclui uma aba de administração (**Administração → WhatsApp**) que integra um chatbot de atendimento de chamados via WhatsApp, usando a [Evolution API](https://github.com/EvolutionAPI/evolution-api) (v1.8.2, SQLite — sem banco externo).

### Como funciona

- O bot só responde aos números cadastrados na lista **Números autorizados** (com DDI, ex.: `5511999999999`). Qualquer número fora dessa lista é ignorado.
- Menu interativo do bot:
  - `1` — Consultar status de um chamado (informando o número do chamado)
  - `2` — Abrir um novo chamado (título + descrição)
  - `3` — Falar com atendente
- Os chamados abertos pelo bot entram na fila normal do sistema (solicitante `WhatsApp <número>`).

### Configurando a Evolution API

1. **Configuração do servidor** — crie `evolution-api/src/env.yml` a partir do exemplo (ou use o que já vem pronto neste repositório):

   ```bash
   cd evolution-api
   Copy-Item src\dev-env.yml src\env.yml
   ```

   No arquivo `src/env.yml`, os campos principais são:

   ```yaml
   SERVER:
     TYPE: http
     PORT: 8081
   AUTHENTICATION:
     TYPE: apikey
     API_KEY:
       KEY: vz5fUF8aVxo2IAY0jkCLJ1Ks7SWHZMi6
   LANGUAGE: "pt-BR"
   ```

2. **Subir a Evolution API** (junto com o backend):

   ```bash
   npm run dev:back
   ```

   A Evolution API sobe em `http://localhost:8081`.

3. **Parear o WhatsApp**:
   - Abra o Manager: `http://localhost:8081/manager` (login padrão: `admin` / `evolution`).
   - Crie uma instância (ex.: `pelotense`).
   - Escaneie o QR Code com o WhatsApp do celular (*Aparelhos conectados → Conectar um aparelho*).
   - Na instância, configure o **Webhook**:
     - URL: `http://localhost:3001/api/whatsapp/webhook`
     - Eventos: `MESSAGES_UPSERT`.

4. **Preencher a aba WhatsApp** no Pelotense IT (**Administração → WhatsApp**):
   - **URL da Evolution API:** `http://localhost:8081`
   - **API Key:** `vz5fUF8aVxo2IAY0jkCLJ1Ks7SWHZMi6`
   - **Instância:** `pelotense`
   - **Ativar bot:** ligar o toggle
   - **Números autorizados:** adicionar os números com DDI
   - Clique em **Salvar Configurações** e use **Enviar teste** para validar.

> Se o backend e a Evolution API rodarem em máquinas diferentes, troque `localhost:3001` pelo IP/domínio do servidor do backend na URL do webhook.

### Limitações conhecidas

- **Contatos com número oculto ("lid")**: contatos que ativam a privacidade *"Quem pode ver meu número" → Ninguém* no WhatsApp usam um identificador `@lid` em vez do número. A Evolution API **v1.8.2** (Baileys 6.7.18) não consegue responder a esse tipo de contato de forma confiável — a mensagem é aceita pelo servidor, mas a entrega ao contato pode falhar. O bot identifica o número autorizado corretamente (via campo `senderPn`), mas a resposta volta pelo número de telefone.
  - **Solução de contorno**: o contato desativa o "ocultar número" (`Configurações → Privacidade → Número de telefone → Todos`).
  - **Solução definitiva**: migrar para a Evolution API v2 (que tem melhor suporte a `lid`), o que exige PostgreSQL/MySQL.

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
| GET | `/api/email/config` | Configuração SMTP |
| PUT | `/api/email/config` | Salvar configuração SMTP |
| POST | `/api/email/teste` | Enviar e-mail de teste |
| POST | `/api/email/relatorio` | Disparar relatório diário |
| POST | `/api/email/enviar` | Enviar e-mail personalizado (com anexos) |
| GET | `/api/whatsapp/config` | Configuração do chatbot WhatsApp |
| PUT | `/api/whatsapp/config` | Salvar configuração do chatbot |
| POST | `/api/whatsapp/teste` | Enviar mensagem de teste do bot |
| POST | `/api/whatsapp/webhook` | Webhook da Evolution API (recebe mensagens) |
| GET | `/api/health` | Health check |

## Logotipo

Os logotipos do sistema ficam em `frontend/public/`:

- <img src="frontend/public/pelotense_it_icone_app_sem_fundo.png" width="48" alt="Ícone sem fundo" /> `pelotense_it_icone_app_sem_fundo.png` — ícone sem fundo (usado no sistema e no PWA)
- <img src="frontend/public/pelotense_it_icone_app.png" width="48" alt="Ícone de app" /> `pelotense_it_icone_app.png` — ícone de app
- <img src="frontend/public/pelotense_it_colorido.png" width="140" alt="Colorido" /> `pelotense_it_colorido.png` — versão colorida (com texto)
- <img src="frontend/public/pelotense_it_monocromatico.png" width="140" alt="Monocromático" /> `pelotense_it_monocromatico.png` — versão monocromática (fundo escuro)

## Autor

**Cristian Raffi Cunha**

---

Desenvolvido para Pelotense IT - Gestão de Chamados de TI
