# Novas Features

Mude o favicon do projeto para o monocromatico, a aba de gameficação esta muito destoante do sikstema, sugira modificações para deixala mais sobria e profficional, adicione isso a um arquivo .md

---

## Sugestões — Gamificação: deixar sóbria e profissional

**Arquivos:** `frontend/src/pages/Gamificacao.jsx` e `frontend/src/pages/Gamificacao.css`

### Diagnóstico

A página usa linguagem visual diferente do resto do sistema (Kanban, Chamados, Dashboard, Relatórios):

| Elemento | Atual (destoante) | Padrão do sistema |
|---|---|---|
| Ícones de categoria | Emojis (`💻 🖥️ 🌐 🖨️ 📧 🔑 🎪 🎥 🎙️ ✂️ 📡`) | Ícones `lucide-react` monocromáticos |
| Cor dos badges | Emoji colorido (`badge.icone`) + brilhos | Ícone lucide com cor de destaque única |
| Medalha do herói | Emoji 40px com `drop-shadow` roxo (`Gamificacao.css:63-67`) | Elemento discreto, sem emoji/glow |
| Paleta de categorias | Arco-íris (indigo, ciano, esmeralda, âmbar, rosa, fúcsia...) `Gamificacao.jsx:27-31` | Cores semânticas + indigo primário |
| Ranking | Ouro/prata/bronze + coroa/medalha (`Gamificacao.css:523-525`) | Posições neutras, destaque para o usuário |
| Herói | Fundo com 3 radiais (roxo/esmeralda) + partículas grandes | Header padrão `.page-header` com partículas sutis |
| Próximo badge | Borda/destaque âmbar + glow (`Gamificacao.css:643,655`) | Destaque na cor primária |
| Anel de progresso | `stroke: url(#ringGradient)` (gradiente não definido) + fallback | Gradiente primário definido ou cor sólida |
| Título do herói | Texto com gradiente (`background-clip: text`) | Cor de texto padrão |

### Recomendações (priorizadas)

#### 1. Trocar emojis por ícones lucide (impacto alto)
- `CAT_ICONS` em `Gamificacao.jsx:15-19`: usar ícones do `lucide-react` (ex.: `Monitor`, `HardDrive`, `Globe`, `Printer`, `Mail`, `KeyRound`, `ClipboardList`, `CalendarDays`, `Clapperboard`, `Mic`, `Scissors`, `Send`).
- `badge.icone` (vindo da API): trocar por um campo de ícone/keys mapeadas, ou renderizar o emoji dentro de um container neutro em escala de cinza quando conquistado.
- `hero-medal` e `ranking-medal`: substituir por ícones lucide (`Trophy`, `Award`, `Medal`) em cor primária.

#### 2. Enxugar a paleta de cores (impacto alto)
- `CAT_COLORS` (`Gamificacao.jsx:27-31`): manter no máximo a cor primária + as semânticas do sistema (`--color-info`, `--color-success`, `--color-warning`, `--color-danger`), ou usar variações do indigo (ex.: `#6366f1`, `#8b5cf6`, `#38bdf8`, `#10b981`, `#f59e0b`).
- Remover destaques ouro/prata/bronze do ranking; usar cor primária para o 1º lugar e tons neutros para os demais.
- Remover glow de sombras coloridas (`hero-medal`, `next-badge-icon`).

#### 3. Alinhar o herói ao padrão do sistema (impacto médio)
- Substituir o bloco hero atual por um cabeçalho de página padrão (`page-header` com partículas sutis), com: título "Gamificação", subtítulo, e as métricas (nível, badges, ranking) como chips/badges discretos — igual ao Kanban (`Kanban.css:9`).
- Se mantiver o anel de progresso, aplicar cor sólida `var(--color-primary)` e remover `url(#ringGradient)` (`Gamificacao.css:155`).

#### 4. Cards de badge e categorias (impacto médio)
- Badge card: ícone lucide em cor `--color-primary-light` quando conquistado e `--color-text-muted` (com overlay de cadeado) quando bloqueado. Remover `filter: grayscale` sobre emoji.
- Categoria: usar o ícone lucide em container com fundo `--color-bg` + borda `--color-border` (já existe em `.cat-progress-icon`), mantendo apenas a cor do ícone.

#### 5. Detalhes de polimento (impacto baixo)
- Título do herói sem `background-clip: text`; usar `var(--color-text)`.
- `.next-badge-card`: borda com `var(--color-primary)` em vez de âmbar.
- Manter a semântica de gamificação (nível, badges, ranking) mas apresentada com a mesma densidade e tipografia das demais páginas.
- Verificar acessibilidade de contraste dos textos mutados (`.text-muted`) sobre os cards.

### Resultado esperado
Página com a mesma "cara" do resto do sistema: ícones monocromáticos, paleta sóbria, destaque único na cor primária indigo e cards com bordas e sombras discretas.