# Sugestões de Features - Pelotense IT

## 📋 Chamados

| Feature | Descrição |
|---------|-----------|
| Sub-chamados | Permitir vincular chamados entre si (dependência, duplicata, relacionado) |
| Recorrência | Chamados que se repetem automaticamente (ex: manutenção mensal) |
| Checklist | Lista de tarefas dentro de cada chamado (ex: verificar cabo, testar porta, reiniciar) |
| Bloquear edição após fechamento | Impedir alterações em chamados já fechados (apenas admin pode reabrir) |
| Campos personalizados | Permitir cadastrar campos extras por categoria de chamado |
| Votação | Votar em chamados para definir prioridade por demanda popular |

## 👥 Usuários

| Feature | Descrição |
|---------|-----------|
| Cadastro de técnicos | Gerenciar equipe com nome, e-mail, foto e especialidade |
| Plantão | Definir técnico de plantão do dia, exibido no dashboard |
| Carga horária | Métricas de produtividade: chamados/hora, tempo médio diário |
| Gamificação | Pontuação por chamados resolvidos, ranking mensal, badges |

## 📅 Agendamento

| Feature | Descrição |
|---------|-----------|
| Calendário | Visualização de chamados em calendário mensal/semanal |
| Agendamento de visita | Marcar data/hora para atendimento presencial |
| Disponibilidade | Verificar horários livres dos técnicos |

## 📢 Notificações

| Feature | Descrição |
|---------|-----------|
| E-mail transacional | Enviar e-mail ao criar, atualizar e resolver chamado (nodemailer) |
| Notificações por WhatsApp | Integrar com API do WhatsApp Business |
| Resumo diário | E-mail automático às 8h com resumo do dia anterior |
| Alertas SLA | Notificar quando chamado está próximo de vencer o prazo |

## 📊 Analytics

| Feature | Descrição |
|---------|-----------|
| Dashboard por técnico | Cada técnico vê apenas seus próprios chamados e métricas |
| Previsão de carga | Projetar volume de chamados baseado em histórico (média móvel) |
| Exportar dashboard | Salvar o dashboard como imagem PNG |
| Comparativo mensal | Gráfico comparando meses: atual vs anterior |

## 🔍 Busca

| Feature | Descrição |
|---------|-----------|
| Busca avançada | Pesquisar por qualquer campo: título, descrição, comentários, tags |
| Filtros salvos | Salvar combinações de filtros favoritas |
| Busca por voz | Usar microfone para ditar termos de busca |

## 🎨 Visual

| Feature | Descrição |
|---------|-----------|
| Wallpaper dinâmico | Trocar plano de fundo com base no clima ou horário |
| Avatar do chamado | Ícone automático baseado na categoria (ex: 🖥️ para hardware) |
| Timeline visual | Linha do tempo horizontal da vida do chamado |
| Compact mode | Modo de exibição densa para telas pequenas |

## 🔒 Segurança

| Feature | Descrição |
|---------|-----------|
| Login com Google/Microsoft | OAuth2 para autenticação simplificada |
| IP whitelist | Restringir acesso ao dashboard por IP |
| Backup automático | Agendar backup do banco a cada X horas |
| Log de acesso | Registrar data/hora/IP de cada login no sistema |

## 🌐 Portal

| Feature | Descrição |
|---------|-----------|
| Status público | Página de status do sistema (online/offline/manutenção) |
| FAQ dinâmico | Perguntas frequentes baseadas nos chamados mais comuns |
| Chatbot | Bot simples para triagem inicial de chamados |
| Acompanhamento por link | Gerar link público para o cliente acompanhar sem login |

## ⏱️ SLA

| Feature | Descrição |
|---------|-----------|
| SLA configurável | Prazos de resposta e resolução por prioridade e categoria |
| Escalonamento automático | Reatribuir chamados vencidos para outro técnico ou gestor |
| Alerta de vencimento | Notificação visual e por email quando SLA está próximo do fim |

## 📚 Base de Conhecimento

| Feature | Descrição |
|---------|-----------|
| Artigos e FAQs | Base de conhecimento com editor rico e busca full-text |
| Sugestão inteligente | Sugerir artigos relacionados durante a abertura do chamado |
| Vinculação automática | Associar soluções da base ao fechar chamados |

## 🤖 Automações

| Feature | Descrição |
|---------|-----------|
| Regras de atribuição | Auto-atribuição por round-robin, categoria ou carga de trabalho |
| Triggers e ações | Mudar status, notificar, escalar com base em condições |
| Respostas prontas | Macros / canned responses para respostas rápidas e padronizadas |

## 💻 Gestão de Ativos

| Feature | Descrição |
|---------|-----------|
| Inventário de hardware | Cadastro de equipamentos com especificações e localização |
| Inventário de software | Licenças, versões e datas de expiração |
| Vinculação ao chamado | Associar ativos a chamados para rastreamento |
| Histórico por equipamento | Visualizar todos os chamados de um ativo específico |
| Controle de garantia | Alertas de garantia próxima do vencimento |

## ⭐ Qualidade

| Feature | Descrição |
|---------|-----------|
| Pesquisa de satisfação | CSAT / NPS enviado ao fechar o chamado |
| Time tracking | Cronômetro de tempo gasto em cada chamado |
| Mesclagem de chamados | Unificar chamados duplicados em um só |
| Operações em lote | Selecionar múltiplos chamados para ação em massa |

## 👥 Colaboração

| Feature | Descrição |
|---------|-----------|
| Menções | @usuario nos comentários para notificar colegas |
| Equipes / Departamentos | Múltiplas filas separadas por área (TI, RH, Financeiro) |
| Chat interno | Comunicação em tempo real entre técnicos no chamado |

## 🔌 Integrações

| Feature | Descrição |
|---------|-----------|
| Webhooks | Disparar eventos para Slack, Teams, Discord ou sistemas externos |
| API documentada | Swagger / OpenAPI para consumo externo |
| Importação de dados | Migrar chamados e clientes de outros sistemas via CSV/JSON |

## 📱 Mobile

| Feature | Descrição |
|---------|-----------|
| Push notifications | Notificações nativas via PWA |
| Ações por gesto | Swipe para arquivar, resolver ou atribuir chamados |
| Modo offline | Operar sem conexão com sincronização posterior |

## 🔐 Segurança (expansão)

| Feature | Descrição |
|---------|-----------|
| 2FA | Autenticação de dois fatores (TOTP ou email) |
| Forçar troca de senha | Exigir nova senha no primeiro login |
| Matriz de permissões | Perfis: admin, técnico, visualizador com permissões granulares |
| Log de auditoria | Rastrear todas as alterações com usuário, data e IP |

## 📊 Dashboards

| Feature | Descrição |
|---------|-----------|
| Widgets customizáveis | Arrastar e montar painéis por usuário |
| Exportação XLSX | Relatórios em Excel além de CSV e PDF |
| Relatórios agendados | Envio automático de relatórios com filtros customizados por email |

---

## 📌 Recomendação (próximos passos)

1. **E-mail transacional** - maior impacto para comunicação com clientes
2. **Sub-chamados** - organiza chamados complexos com dependências
3. **Calendário** - visualização temporal melhora planejamento
4. **Busca avançada** - essencial quando o volume de chamados crescer
