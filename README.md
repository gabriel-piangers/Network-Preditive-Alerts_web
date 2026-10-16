# Monitoramento de Incidentes de Rede

Sistema web para analistas de suporte de uma operadora de telecomunicações acompanharem e agirem sobre incidentes de rede. Um agente de monitoramento externo detecta falhas em tempo real, gera um resumo com contexto, causas prováveis e ações recomendadas, e envia tudo via API. Os analistas consultam, priorizam e tratam os incidentes pelo frontend web.

**As três partes do sistema:**
- **Agente de monitoramento (externo)** — detecta falhas na rede, gera o resumo do incidente e envia via `POST /api/alerts`.
- **Backend (este repositório)** — API REST em Node.js/Express que armazena os incidentes em SQLite e os disponibiliza ao frontend.
- **Frontend (este repositório)** — Interface React que exibe os incidentes, permite filtragem por status/risco/categoria/localização, gerenciamento de situação e acompanhamento do checklist de ações recomendadas.

---

## Pré-requisitos

- [Node.js 22 LTS](https://nodejs.org/) ou superior
- npm 10+ (vem junto com o Node 22)

---

## Instalação e execução

```bash
# 1. Instale todas as dependências (backend + frontend)
npm install

# 2. Configure as variáveis de ambiente
cp backend/.env.example backend/.env

# 3. Popule o banco com dados de exemplo
npm run seed

# 4. Suba backend e frontend juntos
npm run dev
```

Acesse:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001/api/alerts
- **Documentação Swagger:** http://localhost:3001/api-docs

---

## Simulador e testes

O simulador imita o agente de monitoramento: cria novos incidentes e, ocasionalmente (~25% dos ciclos), atualiza incidentes ativos existentes via PATCH.

```bash
# Envia um incidente a cada 20s, indefinidamente
npm run simulate

# Controle de intervalo e quantidade
npm run simulate -- --interval 10          # a cada 10s
npm run simulate -- --count 5              # para após 5 ciclos
npm run simulate -- --interval 5 --count 3

# Roda os testes do backend (usa SQLite em memória)
npm test

# Popula o banco sem apagar dados existentes
npm run seed -- --keep
```

---

## Modelo de dados

Cada incidente armazenado na tabela `logs_informativos` contém:

| Campo | Descrição |
|---|---|
| `id_falha` | Identificador único do incidente (ex.: `INC-2026001`) |
| `cliente_id` / `cliente_nome` / `cliente_banda` | Dados do cliente afetado |
| `dispositivo_id` / `dispositivo_nome` / `dispositivo_tipo_conexao` / `dispositivo_no_pai` | Equipamento onde a falha foi detectada |
| `falha_categoria` | Tipo da falha (Perda de pacotes, LOS, Latência elevada, Falha de equipamento, Degradação óptica, Congestionamento, Falha de autenticação, Interferência externa, Queda de energia, Banda excedida, Outro) |
| `falha_descricao` | Descrição livre da falha |
| `falha_localizacao` | Localização geográfica |
| `perda_pacotes_pct` / `latencia_ms` | Métricas da falha |
| `falha_risco` | Severidade: `Crítico`, `Alto`, `Médio`, `Baixo` |
| `falha_inicio` / `falha_resolucao` / `solucao_aplicada` | Ciclo de vida da falha |
| `incidente_status` | Situação atual: `Aberto`, `Em Andamento`, `Resolvido` |
| `acao_automatizada` | Se o agente já aplicou uma ação automática |
| `contexto` | Resumo gerado pelo agente descrevendo a situação |
| `causas` | Array JSON de causas prováveis identificadas |
| `acoes` | Array JSON de ações recomendadas `{ text, done }` |

---

## API REST

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/alerts` | Lista incidentes com filtros, ordenação e paginação |
| `GET` | `/api/alerts/summary` | Contagens por status, risco, localizações e categorias |
| `GET` | `/api/alerts/:id` | Detalhe de um incidente |
| `POST` | `/api/alerts` | Cria incidente — requer `X-API-Key` no header |
| `PATCH` | `/api/alerts/:id` | Atualiza campos parciais — requer `X-API-Key` |
| `DELETE` | `/api/alerts/:id` | Arquiva (soft delete) — requer `X-API-Key` |

**Filtros disponíveis no `GET /api/alerts`** (todos opcionais, arrays aceitos como CSV):

| Parâmetro | Exemplo |
|---|---|
| `incidente_status` | `Aberto,Em Andamento` |
| `falha_risco` | `Crítico,Alto` |
| `falha_categoria` | `Perda de pacotes` |
| `falha_localizacao` | `Porto Alegre` (busca parcial) |
| `sort` | `falha_risco`, `falha_inicio`, `created_at`… |
| `order` | `asc` ou `desc` |
| `page` / `page_size` | `1` / `20` (máx. 100) |

---

## Como ajustar a paleta de cores

Todas as cores da interface estão centralizadas em dois arquivos dentro de `frontend/src/styles/`:

| Arquivo | O que contém |
|---|---|
| `tokens-brand.css` | Cores da paleta principal: primária, fundo, superfície, texto, bordas |
| `tokens-semantic.css` | Cores de significado: risco (Crítico/Alto/Médio/Baixo) e situação (Aberto, Em Andamento, Resolvido) |

Para mudar a paleta, edite os valores de `var(--...)` em `:root` nesses dois arquivos. **Nunca escreva cores diretamente nos componentes.**

---

## Estrutura de pastas

```
/
├── backend/
│   ├── src/
│   │   ├── app.js              # App Express (sem listen)
│   │   ├── server.js           # Ponto de entrada (listen)
│   │   ├── config.js           # Variáveis de ambiente
│   │   ├── db/                 # Conexão SQLite e schema (logs_informativos)
│   │   ├── routes/             # Definição das rotas
│   │   ├── controllers/        # Handlers dos endpoints
│   │   ├── repositories/       # Queries SQL (prepared statements)
│   │   ├── validation/         # Schemas Zod
│   │   ├── middleware/         # Auth (X-API-Key), logs, validação, erros
│   │   └── utils/              # HttpError
│   ├── data/                   # Arquivo banco_dados_ibm (SQLite)
│   ├── scripts/                # seed.js e simulate.js
│   ├── docs/                   # openapi.yaml
│   └── tests/                  # Testes com node:test + supertest
└── frontend/
    └── src/
        ├── api/                # client.js e alerts.js
        ├── hooks/              # Hooks TanStack Query
        ├── constants/          # Enums e rótulos PT-BR (categorias, riscos, status)
        ├── utils/              # dates.js e filters.js
        ├── styles/             # Tokens CSS e global.css
        ├── components/         # layout/, alerts/, feedback/
        └── pages/              # AlertsListPage, AlertDetailPage, NotFoundPage
```

---

## Limitações conhecidas do MVP

- **Sem autenticação de usuários:** qualquer pessoa com acesso à URL pode ler e atualizar incidentes pelo frontend. A única proteção existente é a `X-API-Key` para operações de escrita pelo agente.
- **Sem busca textual:** a filtragem é feita apenas por campos estruturados (status, risco, categoria, localização).
- **Race condition no checklist:** o agente deve ler o incidente antes de reescrever `acoes` para não apagar marcações do analista. Não há controle de concorrência (sem `ETag`).
- **Sem versão mobile:** layout otimizado para desktop (1280–1920px).
- **Sem tempo real:** atualizações chegam ao frontend por polling a cada 15 segundos.
- **SQLite em arquivo único:** sem suporte a múltiplas instâncias do servidor.
- **Sem migração de schema:** para mudanças no schema, apague o arquivo em `backend/data/` e rode `npm run seed`.
