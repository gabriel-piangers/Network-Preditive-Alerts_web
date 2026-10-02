# SPEC — Sistema Web de Alertas Preditivos de Rede (MVP)

> Projeto: **Compilando Ideias** — IBM SkillsBuild AI Experiential Learning Lab
> Escopo deste documento: **apenas a parte web** (frontend + backend). O Sistema de ML e o script Python do agente são desenvolvidos separadamente e se comunicam com este sistema **somente via REST API**.

---

## 0. Instruções para o agente de código (LEIA PRIMEIRO)

1. Este documento é a **fonte da verdade**. Implemente exatamente o que está aqui.
2. **Não adicione funcionalidades** fora do escopo (seção 2). Se algo estiver ambíguo, escolha a opção mais simples que respeite este documento e registre a decisão na seção "Decisões tomadas" do `README.md` raiz.
3. **Não use TypeScript.** Todo o código é **JavaScript (ES Modules)**. O desenvolvedor não tem experiência com TS.
4. **Não use ORM.** O acesso ao SQLite é feito com SQL escrito à mão (biblioteca `better-sqlite3`).
5. **Não use bibliotecas de UI** (MUI, Chakra, Bootstrap, Tailwind etc.) nem CSS-in-JS. Apenas **CSS puro**.
6. **Nomes de variáveis, funções, arquivos, rotas, campos de JSON e commits em inglês.** Textos exibidos ao usuário em **PT-BR**. Comentários de código e READMEs em **PT-BR**, curtos e explicando o "porquê" (o desenvolvedor está aprendendo).
7. Siga o plano de implementação em fases da seção 8. Ao terminar cada fase, verifique os critérios de aceite (seção 9) e só então avance.
8. Mantenha o código simples e legível. Prefira funções pequenas e arquivos com uma responsabilidade clara.
9. Nunca escreva cores (hex, rgb, hsl) fora dos arquivos de tema (seção 7.3).

---

## 1. Contexto do produto

O sistema ajuda analistas de suporte de uma operadora de telecomunicações a **agir de forma preventiva**. Um agente de IA (externo a este sistema) prevê falhas futuras na rede e envia **alertas** contextualizados para este sistema web. O analista consulta os alertas, entende o contexto, executa as ações sugeridas e atualiza a situação do alerta.

**Persona:** Rafael Oliveira, 29 anos, Analista de Suporte ao Cliente. Quer "saber o que está acontecendo antes que o problema chegue ao cliente e ter uma recomendação clara do que fazer". Usa o sistema em um **monitor de desktop**, em ambiente de central de atendimento.

**Quem faz o quê:**

| Ator | O que faz no sistema |
|---|---|
| Agente (Python) | Cria alertas (`POST`) e os atualiza/enriquece (`PATCH`). Autentica com API key. |
| Analista (via frontend) | Lê alertas, altera situação, marca ações do checklist como feitas, informa se a previsão se confirmou, arquiva alertas. |

---

## 2. Escopo do MVP
- Página de lista de alertas com visão geral (resumo) no topo, filtros, ordenação e paginação.
- Página de detalhe do alerta com contexto, causas prováveis e checklist de ações.
- Alteração de situação (status) do alerta e feedback "a previsão se confirmou?".
- API REST com CRUD de alertas (exclusão = *soft delete*).
- Banco SQLite, logs diários das requisições do agente, documentação da API, README de execução.
- Scripts de `seed` (dados falsos) e `simulate` (simulador que gera alertas periodicamente).
- Variáveis CSS centralizadas para permitir ajuste futuro de paleta de cores.

---

## 3. Convenções gerais

- **Node.js:** versão 22 LTS (atual LTS de longo prazo). Backend e frontend usam `"type": "module"` (imports `import/export`).
- **Formatação:** Prettier (aspas simples, ponto e vírgula, 2 espaços, `printWidth` 100). **Lint:** ESLint com configuração recomendada. Scripts `npm run lint` e `npm run format` na raiz.
- **Datas:** sempre ISO 8601 em UTC na API (ex.: `2026-10-02T14:30:00.000Z`). O frontend converte para o fuso local do navegador ao exibir.
- **JSON:** campos em `snake_case` (conforme o contrato da seção 5).
- **Git:** incluir `.gitignore` (node_modules, `.env`, arquivos `.db`, `backend/logs/`, builds). Commitar `.env.example`.

---

## 4. Estrutura do repositório (monorepo)

Usar **npm workspaces**.

```
/
├── package.json              # workspaces: ["frontend", "backend"]; scripts de conveniência
├── README.md                 # visão geral + como executar tudo + decisões tomadas
├── SPEC.md                   # este documento
├── .gitignore
├── .prettierrc
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── README.md             # detalhes do backend
│   ├── docs/
│   │   └── openapi.yaml      # documentação da API (OpenAPI 3)
│   ├── logs/                 # criado em runtime (ignorado pelo git)
│   ├── data/                 # arquivo SQLite (ignorado pelo git)
│   ├── scripts/
│   │   ├── seed.js           # popula o banco com alertas falsos
│   │   └── simulate.js       # simulador do agente
│   ├── tests/
│   └── src/
│       ├── server.js         # sobe o servidor (listen)
│       ├── app.js            # cria o app Express (sem listen, para testes)
│       ├── config.js         # lê variáveis de ambiente
│       ├── db/
│       │   ├── connection.js # abre o SQLite e roda o schema
│       │   └── schema.sql
│       ├── routes/
│       │   └── alerts.routes.js
│       ├── controllers/
│       │   └── alerts.controller.js
│       ├── repositories/
│       │   └── alerts.repository.js   # TODO o SQL fica aqui
│       ├── validation/
│       │   └── alerts.schemas.js      # schemas Zod
│       ├── middleware/
│       │   ├── agentAuth.js
│       │   ├── agentRequestLogger.js
│       │   ├── validate.js
│       │   ├── notFound.js
│       │   └── errorHandler.js
│       └── utils/
│           └── httpErrors.js
└── frontend/
    ├── package.json
    ├── .env.example
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                    # rotas
        ├── api/
        │   ├── client.js              # fetch wrapper (base URL, erros)
        │   └── alerts.js              # funções: listAlerts, getAlert, updateAlert...
        ├── hooks/                     # hooks do TanStack Query
        │   ├── useAlerts.js
        │   ├── useAlert.js
        │   ├── useAlertsSummary.js
        │   └── useUpdateAlert.js
        ├── constants/
        │   └── alerts.js              # enums + rótulos PT-BR + ordem de severidade
        ├── utils/
        │   ├── dates.js               # formatação absoluta e relativa
        │   └── filters.js             # converte filtros <-> query string
        ├── styles/
        │   ├── tokens-base.css        # espaçamento, tipografia, raios, sombras
        │   ├── tokens-brand.css       # cores de marca (única paleta)
        │   ├── tokens-semantic.css    # cores de risco e situação
        │   └── global.css             # reset + estilos globais
        ├── components/
        │   ├── layout/                # AppLayout, Header
        │   ├── alerts/                # SummaryCards, FiltersBar, AlertsTable, AlertRow,
        │   │                          # RiskBadge, StatusBadge, AccuracyBar, ActionsChecklist...
        │   └── feedback/              # LoadingState, EmptyState, ErrorState, ConfirmDialog
        └── pages/
            ├── AlertsListPage.jsx
            ├── AlertDetailPage.jsx
            └── NotFoundPage.jsx
```

Cada componente com estilo próprio tem um `.css` ao lado com o mesmo nome (ex.: `RiskBadge.jsx` + `RiskBadge.css`).

**Scripts na raiz (`package.json`):**

| Script | Ação |
|---|---|
| `npm run dev` | Sobe backend e frontend juntos (usar `concurrently`) |
| `npm run dev:backend` / `npm run dev:frontend` | Sobe cada um separadamente |
| `npm run seed` | Popula o banco com dados falsos |
| `npm run simulate` | Roda o simulador do agente |
| `npm test` | Roda os testes do backend |
| `npm run lint` / `npm run format` | ESLint / Prettier |

---

## 5. Contrato de dados: o Alerta

Este é o contrato entre o sistema web e o agente Python. **Os nomes de campo não podem mudar** sem atualizar este documento e o `openapi.yaml`.

### 5.1 Campos

| Campo | Tipo | Obrigatório no `POST` | Descrição |
|---|---|---|---|
| `id` | integer | não (gerado) | Identificador sequencial. |
| `type` | string (enum) | sim | Tipo do alerta (ver 5.2). |
| `title` | string (1–200) | sim | Título curto. |
| `area` | string (1–120) | sim | Área afetada (ex.: `"São Paulo - Zona Leste"`). |
| `equipments` | string[] (0–50 itens) | sim (pode ser `[]`) | Identificadores dos equipamentos afetados. |
| `risk` | string (enum) | sim | `high` \| `medium` \| `low`. |
| `accuracy` | number (0–100) | sim | Porcentagem de certeza do modelo. |
| `predicted_for` | string (ISO 8601) | sim | Data/hora prevista para a ocorrência. |
| `status` | string (enum) | não (padrão `new`) | Situação (ver 5.3). |
| `context` | string (0–10000) | sim | Contextualização gerada pelo agente (texto simples; quebras de linha preservadas). |
| `causes` | string[] (0–20 itens) | sim (pode ser `[]`) | Causas prováveis. |
| `actions` | Action[] (0–30 itens) | sim (pode ser `[]`) | Ações/testes recomendados, formam o checklist. |
| `confirmed` | boolean \| null | não (padrão `null`) | A previsão se confirmou? `null` = ainda não avaliado; `true` = ocorreu; `false` = não ocorreu. |
| `created_at` | string (ISO) | não (gerado) | Criação. |
| `updated_at` | string (ISO) | não (gerado) | Última alteração (atualizado a cada `PATCH`). |

**Action (item do checklist):**
```json
{ "text": "Verificar utilização de banda na interface Gi0/1", "done": false }
```
- Na criação (`POST`), cada item de `actions` pode ser enviado como **string** (o backend converte para `{ "text": "...", "done": false }`) ou como objeto.
- Ao fazer `PATCH` com `actions`, o array é **substituído por inteiro**. Por isso, o agente deve ler o alerta (`GET`) antes de reescrever `actions`, para não apagar as marcações (`done`) feitas pelo analista.

### 5.2 Valores de `type`

| Valor | Rótulo PT-BR |
|---|---|
| `bandwidth_exceeded` | Banda excedida |
| `congestion` | Congestionamento |
| `equipment_failure` | Falha de equipamento |
| `packet_loss` | Perda de pacotes |
| `latency` | Latência elevada |
| `other` | Outro |

### 5.3 Valores de `status` (situação)

| Valor | Rótulo PT-BR | Significado |
|---|---|---|
| `new` | Novo | Acabou de chegar, ninguém olhou. |
| `in_analysis` | Em análise | Um analista está investigando. |
| `monitoring` | Monitorando | Ação preventiva feita; sistema/analista acompanha para validar. |
| `resolved` | Resolvido | Problema evitado ou tratado. |
| `false_positive` | Falso positivo | A previsão estava errada. |
| `expired` | Expirado | O horário previsto passou sem ocorrência. |

- **Alertas ativos** = `new`, `in_analysis`, `monitoring`.
- Qualquer transição entre status é permitida no MVP (sem máquina de estados).
- O status `expired` é atribuído **automaticamente pelo backend**: quando o servidor recebe qualquer requisição de leitura (`GET /api/alerts` ou `GET /api/alerts/:id`), verifica se há alertas ativos cujo `predicted_for` é anterior a 30 minutos atrás e os marca como `expired` via `PATCH` interno antes de responder. Essa verificação também pode ser feita na inicialização do servidor.

### 5.4 Valores de `risk`

| Valor | Rótulo PT-BR | Peso para ordenação |
|---|---|---|
| `high` | Alto | 3 |
| `medium` | Médio | 2 |
| `low` | Baixo | 1 |

### 5.5 Exemplo completo

```json
{
  "id": 17,
  "type": "bandwidth_exceeded",
  "title": "Saturação prevista no link do backbone Zona Leste",
  "area": "São Paulo - Zona Leste",
  "equipments": ["RTR-SP-ZL-01", "SW-SP-ZL-04"],
  "risk": "high",
  "accuracy": 87,
  "predicted_for": "2026-10-03T02:30:00.000Z",
  "status": "new",
  "context": "O tráfego no link principal vem crescendo de forma contínua há 5 dias e deve ultrapassar 95% da capacidade nas próximas horas.\nO mesmo padrão foi visto em 12/09 antes de uma queda de serviço.",
  "causes": [
    "Aumento sazonal de tráfego de streaming",
    "Rota alternativa desativada para manutenção"
  ],
  "actions": [
    { "text": "Verificar utilização de banda na interface Gi0/1", "done": false },
    { "text": "Avaliar redirecionamento parcial do tráfego para a rota alternativa", "done": false }
  ],
  "confirmed": null,
  "created_at": "2026-10-02T14:03:11.123Z",
  "updated_at": "2026-10-02T14:03:11.123Z"
}
```

---

## 6. Backend

### 6.1 Stack

| Item | Escolha |
|---|---|
| Runtime | Node.js 22 LTS (ES Modules) |
| Framework | Express 5 (versão 5.x estável; erros em handlers `async` são propagados automaticamente sem necessidade de `try/catch` manual) |
| Banco | SQLite via `better-sqlite3` (**sem ORM**, SQL manual) |
| Validação | `zod` |
| Config | `dotenv` |
| CORS | `cors` |
| Documentação | `swagger-ui-express` + `yaml` (serve `docs/openapi.yaml`) |
| Dev | `node --watch` |
| Testes | `node:test` (nativo) + `supertest` |

Não adicionar outras dependências sem necessidade clara.

### 6.2 Variáveis de ambiente (`backend/.env.example`)

```
PORT=3001
DB_PATH=./data/alerts.db
AGENT_API_KEY=dev-agent-key-change-me
CORS_ORIGIN=http://localhost:5173
LOG_DIR=./logs

# Usada pelos scripts/simulate.js (URL base da API para envio de requisições HTTP)
API_URL=http://localhost:3001
```

`config.js` lê e exporta essas variáveis com valores padrão iguais aos acima.

### 6.3 Banco de dados

Arquivo `src/db/schema.sql`, executado em `connection.js` com `CREATE TABLE IF NOT EXISTS` na inicialização. Ativar `PRAGMA journal_mode = WAL` e `PRAGMA foreign_keys = ON`.

```sql
CREATE TABLE IF NOT EXISTS alerts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT    NOT NULL CHECK (type IN ('bandwidth_exceeded','congestion','equipment_failure','packet_loss','latency','other')),
  title         TEXT    NOT NULL,
  area          TEXT    NOT NULL,
  equipments    TEXT    NOT NULL DEFAULT '[]',      -- JSON (array de strings)
  risk          TEXT    NOT NULL CHECK (risk IN ('high','medium','low')),
  accuracy      REAL    NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  predicted_for TEXT    NOT NULL,                   -- ISO 8601 UTC
  status        TEXT    NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_analysis','monitoring','resolved','false_positive','expired')),
  context       TEXT    NOT NULL DEFAULT '',
  causes        TEXT    NOT NULL DEFAULT '[]',      -- JSON (array de strings)
  actions       TEXT    NOT NULL DEFAULT '[]',      -- JSON (array de {text, done})
  confirmed     INTEGER CHECK (confirmed IN (0,1)), -- NULL | 0 | 1
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL,
  deleted_at    TEXT                                -- soft delete (NULL = ativo)
);

CREATE INDEX IF NOT EXISTS idx_alerts_status        ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_risk          ON alerts(risk);
CREATE INDEX IF NOT EXISTS idx_alerts_predicted_for ON alerts(predicted_for);
CREATE INDEX IF NOT EXISTS idx_alerts_deleted_at    ON alerts(deleted_at);
```

**Regras do repositório (`alerts.repository.js`):**
- Todo o SQL fica neste arquivo, usando *prepared statements* com parâmetros (nunca concatenar valores do usuário na query).
- Funções de mapeamento convertem linha do banco ↔ objeto da API: `equipments`/`causes`/`actions` (`JSON.parse`/`JSON.stringify`), `confirmed` (`0/1/NULL` ↔ `false/true/null`), e **removem `deleted_at`** da resposta.
- Toda consulta de leitura ignora linhas com `deleted_at IS NOT NULL`.
- Para ordenação, **nunca** interpolar o valor recebido: mapear a chave permitida para uma coluna/expressão fixa (lista branca). A ordenação por `risk` usa `CASE risk WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END`.

### 6.4 Endpoints

Todas as rotas ficam sob o prefixo `/api`. Corpo e respostas em JSON.

| Método | Rota | Quem usa | Descrição |
|---|---|---|---|
| `GET` | `/api/health` | todos | Retorna `{ "status": "ok" }`. |
| `GET` | `/api/alerts` | frontend | Lista com filtros, ordenação e paginação. |
| `GET` | `/api/alerts/summary` | frontend | Contagens para a visão geral e lista de áreas. |
| `GET` | `/api/alerts/:id` | frontend, agente | Detalhe de um alerta. |
| `POST` | `/api/alerts` | **agente** (exige API key) | Cria alerta. |
| `PATCH` | `/api/alerts/:id` | frontend, agente | Atualização parcial. |
| `DELETE` | `/api/alerts/:id` | frontend | **Soft delete** (arquivar). |
| `GET` | `/api-docs` | todos | Swagger UI (a partir de `docs/openapi.yaml`). |

> Registrar `/api/alerts/summary` **antes** de `/api/alerts/:id`.

#### `GET /api/alerts` — parâmetros de query

| Parâmetro | Exemplo | Regra |
|---|---|---|
| `status` | `new,in_analysis` | CSV; cada valor deve ser um status válido. |
| `risk` | `high,medium` | CSV de riscos válidos. |
| `type` | `congestion` | CSV de tipos válidos. |
| `area` | `São Paulo - Zona Leste` | Igualdade exata (CSV permitido). |
| `min_accuracy` | `70` | Número 0–100; retorna `accuracy >= valor`. |
| `sort` | `predicted_for` | Um de: `risk`, `predicted_for`, `accuracy`, `status`, `title`, `area`, `created_at`, `updated_at`. |
| `order` | `asc` | `asc` ou `desc`. |
| `page` | `1` | Inteiro ≥ 1 (padrão 1). |
| `page_size` | `20` | Inteiro 1–100 (padrão 20). |

**Ordenação padrão** (sem `sort`): `risk` decrescente e, em seguida, `predicted_for` crescente. Com `sort` informado, usar `id DESC` como desempate. Se `order` não for informado, usar `desc` para `risk`, `accuracy`, `created_at`, `updated_at` e `asc` para os demais.

**Resposta `200`:**
```json
{
  "data": [ { "...alerta..." } ],
  "meta": { "page": 1, "page_size": 20, "total": 42, "total_pages": 3 }
}
```

#### `GET /api/alerts/summary` — resposta `200`

```json
{
  "data": {
    "total_active": 12,
    "new_count": 4,
    "by_risk": { "high": 3, "medium": 5, "low": 4 },
    "by_status": { "new": 4, "in_analysis": 2, "monitoring": 6, "resolved": 8, "false_positive": 1, "expired": 2 },
    "areas": ["Campinas", "São Paulo - Zona Leste"]
  }
}
```
- `total_active`, `new_count` e `by_risk` consideram **apenas alertas ativos** (`new`, `in_analysis`, `monitoring`).
- `by_status` considera todos os alertas não arquivados (inclui chaves com valor `0`).
- `areas` = áreas distintas dos alertas não arquivados, em ordem alfabética.

#### `GET /api/alerts/:id` — `200` com `{ "data": alerta }`; `404` se não existe ou está arquivado.

#### `POST /api/alerts` — exige header `X-API-Key`

- Valida o corpo (campos obrigatórios da seção 5.1; campos desconhecidos são rejeitados).
- Gera `id`, `created_at`, `updated_at`; aplica padrões (`status = new`, `confirmed = null`).
- Normaliza `actions` (strings → objetos).
- Resposta `201` com `{ "data": alerta }` e header `Location: /api/alerts/{id}`.

Exemplo de corpo mínimo para o time do agente:
```json
{
  "type": "congestion",
  "title": "Congestionamento previsto no switch de agregação",
  "area": "Campinas",
  "equipments": ["SW-CAMP-07"],
  "risk": "medium",
  "accuracy": 78,
  "predicted_for": "2026-10-03T18:00:00.000Z",
  "context": "Aumento contínuo de pacotes nas últimas 48h.",
  "causes": ["Crescimento de tráfego no horário de pico"],
  "actions": ["Verificar filas de saída da interface Gi0/2"]
}
```

#### `PATCH /api/alerts/:id`

- Atualização **parcial**: aceita qualquer subconjunto dos campos editáveis: `type`, `title`, `area`, `equipments`, `risk`, `accuracy`, `predicted_for`, `status`, `context`, `causes`, `actions`, `confirmed`.
- **Não** aceita `id`, `created_at`, `updated_at` (rejeitar com `400`).
- Corpo vazio (`{}`) → `400`.
- Atualiza `updated_at` automaticamente.
- Resposta `200` com `{ "data": alerta }`; `404` se não existe ou está arquivado.

#### `DELETE /api/alerts/:id`

- **Soft delete:** preenche `deleted_at` com a data/hora atual. **Nunca** executar `DELETE FROM`.
- Resposta `204` sem corpo; `404` se não existe ou já está arquivado.
- O registro permanece no banco para auditoria (consultável direto no SQLite).

### 6.5 Validação de entrada

- Schemas Zod em `validation/alerts.schemas.js`: um para `POST` (corpo), um para `PATCH` (corpo parcial, `.strict()`), um para query da listagem e um para o parâmetro `:id` (inteiro positivo).
- Middleware `validate(schema, source)` valida `body`, `query` ou `params`, e substitui o valor pelo resultado já convertido (ex.: `page` de string para número).
- Query com valores inválidos (ex.: `risk=banana`) → `400`, **não** ignorar silenciosamente.
- `predicted_for` deve ser uma data ISO 8601 válida; normalizar para UTC.

**Schema Zod para `Action` (item do checklist):**

```js
// Usado tanto no POST quanto no PATCH
const ActionSchema = z.object({
  text: z.string().min(1).max(500),
  done: z.boolean(),
});

// No POST, cada item pode ser string (normalizada para objeto) ou objeto completo:
const ActionInputSchema = z.union([
  z.string().min(1).max(500).transform(text => ({ text, done: false })),
  ActionSchema,
]);
```

No `PATCH`, `actions` (quando presente) deve ser um array de objetos `ActionSchema` completos (não aceita strings — o frontend/agente já deve enviar o array montado). Objetos com chaves desconhecidas são rejeitados pelo `.strict()` do schema de `PATCH`.

### 6.6 Formato padronizado de erros

Toda resposta de erro tem este formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos.",
    "details": [ { "field": "risk", "message": "Valor deve ser high, medium ou low." } ]
  }
}
```

| HTTP | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Corpo/query/params inválidos (inclui `details`). |
| 400 | `INVALID_JSON` | JSON malformado. |
| 401 | `UNAUTHORIZED` | `X-API-Key` ausente ou incorreta no `POST`. |
| 404 | `NOT_FOUND` | Alerta ou rota inexistente. |
| 500 | `INTERNAL_ERROR` | Erro inesperado (**não vazar stack trace** na resposta; logar no console). |

Implementar: classe `HttpError` em `utils/httpErrors.js`, middleware `notFound` e `errorHandler` (último middleware). As mensagens de erro da API ficam em **PT-BR**.

### 6.7 Autenticação do agente

- Header: `X-API-Key: <valor de AGENT_API_KEY>`.
- Obrigatório **apenas** no `POST /api/alerts` (middleware `agentAuth`).
- `PATCH` e `DELETE` não exigem chave (são usados pelo frontend, que no MVP não tem login). O agente pode enviar a chave também no `PATCH` — isso o identifica nos logs (6.8).
- Documentar claramente no README que **a API não tem autenticação de usuários** e que isso é uma limitação conhecida do MVP.

### 6.8 Log das requisições do agente

- Considera-se "requisição do agente" qualquer requisição que traga o header `X-API-Key` (válida ou não).
- Middleware `agentRequestLogger` registra **uma linha por requisição**, ao final da resposta, em `LOG_DIR/agent-YYYY-MM-DD.txt` (um arquivo por dia; criar a pasta se não existir; modo *append*).
- Formato da linha:
  ```
  [2026-10-02T14:03:11.123Z] POST /api/alerts -> 201 (12ms) body={"type":"congestion",...}
  ```
- Regras: truncar o corpo em 2000 caracteres; **nunca** registrar o valor da API key; registrar também as requisições rejeitadas (ex.: `401`).
- Falha ao escrever o log **não** pode derrubar a requisição (capturar o erro e imprimir no console).

### 6.9 Documentação da API

- `backend/docs/openapi.yaml` (OpenAPI 3.0) descrevendo todos os endpoints, parâmetros, schemas do alerta, formato de erro e o esquema de segurança `X-API-Key`, **com exemplos**.
- Servido em `GET /api-docs` via Swagger UI.
- O `backend/README.md` deve ter uma seção "Guia rápido para o time do agente" com um exemplo de `curl` (e um de Python com `requests`) para criar e atualizar um alerta.
- Manter o `openapi.yaml` sincronizado com a implementação (faz parte do critério de aceite).

### 6.10 Scripts utilitários

**`npm run seed`** (`scripts/seed.js`)
- Insere **de 12 a 15 alertas** realistas em PT-BR com variedade: todos os tipos, os 3 riscos, todos os 6 status, `accuracy` entre 70 e 99, `predicted_for` entre algumas horas no passado e 3 dias no futuro, alguns com `confirmed` `true`/`false`/`null`, ao menos 2 áreas e equipamentos com nomes como `RTR-SP-ZL-01`, `SW-CAMP-07`, `OLT-SP-ZN-03`.
- Deve ser possível rodar mais de uma vez: apaga os alertas existentes antes de inserir. Aceitar a flag `--keep` para não apagar.
- Garantir que haja ao menos 4 alertas com status `new` e 3 de risco alto ativos, para a visão geral ficar interessante na demo.
- Inserir via repositório (mesma lógica da API), não via HTTP.

**`npm run simulate`** (`scripts/simulate.js`)
- Simula o agente enviando **por HTTP**, com o header `X-API-Key`, a cada `--interval` segundos (padrão 20; aceitar também `--count N` para parar após N envios).
- A cada ciclo: gera um alerta a partir de *templates* aleatórios (combinando tipo, área, equipamentos, risco, `accuracy` 70–99, `predicted_for` entre 1 e 48 horas à frente) e envia `POST /api/alerts`.
- Ocasionalmente (~25% dos ciclos) escolhe um alerta ativo existente e faz um `PATCH` (ex.: ajusta `accuracy` ou acrescenta uma frase ao `context`), simulando o enriquecimento feito pelo agente.
- Imprime no console o que enviou. URL base e chave vêm das variáveis de ambiente (`API_URL`, `AGENT_API_KEY`).

### 6.11 Testes (mínimos)

Os testes são escritos **iterativamente ao longo das fases**, crescendo junto com a implementação. A suite de testes deve estar sempre passando ao final de cada fase.

Em `backend/tests/`, usando `node:test` + `supertest` e banco SQLite em memória. O script `npm test` do `backend/package.json` injeta `DB_PATH=:memory:` automaticamente (ex.: `"test": "DB_PATH=:memory: node --test tests/**/*.test.js"`), de forma que nenhuma configuração manual é necessária para rodar os testes. Por isso, `app.js` não deve chamar `listen`.

**Cobertura mínima esperada ao fim do projeto:**
- `POST` cria alerta (com chave) e retorna `201`; sem chave retorna `401`; corpo inválido retorna `400` com `details`.
- `GET` lista aplica filtros (`status`, `risk`, `min_accuracy`) e paginação; a ordenação padrão é risco ↓ + previsão ↑.
- `GET /summary` retorna contagens corretas para alertas ativos e arquivados.
- `PATCH` atualiza campo, atualiza `updated_at` e rejeita campos proibidos (`id`, `created_at`, `updated_at`) e corpo vazio.
- `DELETE` faz soft delete: o alerta some da lista e do `GET /:id` (`404`), mas continua no banco.
- Alerta com `predicted_for` há mais de 30 minutos é marcado como `expired` automaticamente.

---

## 7. Frontend

### 7.1 Stack

| Item | Escolha |
|---|---|
| Build | Vite |
| UI | React 18+ com **JavaScript** (arquivos `.jsx`) |
| Rotas | `react-router-dom` |
| Dados do servidor | `@tanstack/react-query` (cache, loading/erro, *polling*, mutações) |
| Ícones | `lucide-react` |
| Estilo | **CSS puro**, um arquivo `.css` por componente + tokens globais |
| Datas | `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` (sem biblioteca) |

### 7.2 Configuração

`frontend/.env.example`:
```
VITE_API_URL=http://localhost:3001
```
`api/client.js` usa `import.meta.env.VITE_API_URL` como base, envia/recebe JSON e, em resposta não-OK, lança um erro contendo `status`, `code` e `message` do formato padronizado da API (6.6). Se a API estiver inacessível (falha de rede), lançar um erro com mensagem amigável.

### 7.3 Tokens de cores (variáveis CSS)

**Objetivo:** centralizar 100% das cores em arquivos de tokens para permitir ajuste ou troca de paleta no futuro sem tocar nos componentes.

**Regras**
1. **Nenhuma cor** (hex, rgb, hsl, nome de cor CSS) pode aparecer fora de `tokens-brand.css` e `tokens-semantic.css`. Todos os componentes usam apenas `var(--...)`.
2. Dois arquivos de tokens de cor, em separado:
   - **`tokens-brand.css` (marca/neutros):** cores da paleta principal (primária, fundo, superfície, texto, bordas).
   - **`tokens-semantic.css` (significado):** cores de risco e de situação. Ficam separadas para que ajustar a paleta da marca não afete o significado visual de "alto risco".
3. Ambos os arquivos definem os tokens em `:root`. Não há múltiplos temas nem troca dinâmica de paleta no MVP.
4. `tokens-base.css` guarda tokens **sem cor**: espaçamentos (`--space-1…8`), tipografia (`--font-family`, `--font-size-xs…xl`), raios (`--radius-sm/md/lg`), sombras, larguras.

**Tokens de marca (obrigatórios)**
```
--color-primary          --color-primary-hover     --color-primary-contrast
--color-bg               --color-surface           --color-surface-alt
--color-border           --color-text              --color-text-muted
--color-focus-ring
```

**Tokens semânticos (obrigatórios)**
```
--color-risk-high    --color-risk-high-bg
--color-risk-medium  --color-risk-medium-bg
--color-risk-low     --color-risk-low-bg

--color-status-new             --color-status-new-bg
--color-status-in-analysis     --color-status-in-analysis-bg
--color-status-monitoring      --color-status-monitoring-bg
--color-status-resolved        --color-status-resolved-bg
--color-status-false-positive  --color-status-false-positive-bg
--color-status-expired         --color-status-expired-bg

--color-feedback-error   --color-feedback-error-bg
```

**Paleta única** (valores a critério do agente): interface clara e neutra com primária azul, mantendo contraste legível — texto/fundo com razão de contraste de pelo menos 4,5:1.

**Acessibilidade:** risco e situação **nunca** podem ser comunicados apenas por cor. Os *badges* sempre trazem texto (e, para risco, também um ícone distinto: ex. `ChevronsUp`/`Minus`/`ChevronDown` de `lucide-react`).

### 7.4 Rotas

| Caminho | Página |
|---|---|
| `/` | Redireciona para `/alerts` |
| `/alerts` | `AlertsListPage` |
| `/alerts/:id` | `AlertDetailPage` |
| `*` | `NotFoundPage` |

### 7.5 Layout geral

- Cabeçalho fixo com: nome do sistema ("Alertas Preditivos de Rede") e link para a lista.
- Conteúdo centralizado com largura máxima de cerca de 1440px.
- **Voltado para monitores:** layout pensado para larguras de 1280px a 1920px; **largura mínima 1024px** (abaixo disso é aceitável haver rolagem horizontal). Não implementar versão mobile. Usar `flex`/`grid` e unidades relativas para o conteúdo se adaptar bem dentro dessa faixa.

### 7.6 Página de lista de alertas (`/alerts`)

Estrutura de cima para baixo:

**1. Visão geral (`SummaryCards`)** — dados de `GET /api/alerts/summary`:
- Cards: **Alertas ativos** (`total_active`), **Novos** (`new_count`), **Risco alto**, **Risco médio**, **Risco baixo**.
- Clicar em um card aplica o filtro correspondente (ex.: "Risco alto" → `risk=high` + status ativos; "Novos" → `status=new`; "Alertas ativos" → status ativos). O card do filtro atualmente aplicado fica destacado.

**2. Barra de filtros (`FiltersBar`)**
- Filtro de **Risco** (multisseleção), **Situação** (multisseleção), **Tipo** (multisseleção), **Área** (seleção; opções vêm de `summary.areas`) e **Certeza mínima** (controle deslizante 50–100, passo 5).
- Botão "Limpar filtros".
- **Padrão ao abrir a página:** situação = alertas ativos (`new`, `in_analysis`, `monitoring`), sem outros filtros. O analista pode incluir os demais status marcando-os.
- **Os filtros ficam na URL** (query string), de modo que recarregar a página ou compartilhar o link preserva o estado. `utils/filters.js` converte filtros ↔ query string ↔ parâmetros da API.
- Mudar qualquer filtro volta à página 1.

**3. Tabela de alertas (`AlertsTable`)**

| Coluna | Conteúdo |
|---|---|
| Risco | `RiskBadge` (ícone + texto) |
| Alerta | Título; abaixo, o tipo em texto menor |
| Área | `area` |
| Equipamentos | Primeiros 2 equipamentos + "+N" se houver mais (`title` com a lista completa) |
| Previsão | Tempo relativo ("em ~6h", "há 2h") com a data/hora completa no `title`; destacar visualmente quando já passou |
| Certeza | `AccuracyBar` (barra fina + número, ex.: `87%`) |
| Situação | `StatusBadge` |

- Cabeçalhos clicáveis para ordenar (Risco, Previsão, Certeza, Situação, Área); mostrar indicador de direção. Ordenação padrão: Risco ↓, depois Previsão ↑.
- Linha inteira clicável (e navegável por teclado) → `/alerts/:id`.
- **Paginação** no rodapé (anterior/próxima, "Página X de Y", total de resultados).

**4. Atualização automática:** *polling* da lista e do resumo a cada **15 segundos** (constante configurável em um único lugar), além de refetch ao focar a janela. Mostrar discretamente "Atualizado às HH:MM" e manter os dados antigos visíveis durante o refetch (sem piscar o *loading*).

### 7.7 Página de detalhe do alerta (`/alerts/:id`)

Dados de `GET /api/alerts/:id`. Seções:

1. **Cabeçalho:** link "← Voltar para alertas" (usa `navigate(-1)` do React Router para voltar ao histórico do navegador, preservando os filtros ativos da lista), título, `RiskBadge`, `StatusBadge`.
2. **Resumo (grade de informações):** Tipo, Área, Equipamentos (lista completa), Previsão de ocorrência (data/hora completa + relativa), Certeza (`AccuracyBar`), Criado em, Atualizado em.
3. **Situação:** `<select>` com os 6 status (rótulos PT-BR). Ao alterar, faz `PATCH { status }` e atualiza a tela.
4. **Contexto:** texto de `context`, preservando quebras de linha (`white-space: pre-line`). Se vazio: "Sem contextualização disponível."
5. **Causas prováveis:** lista com marcadores. Se vazia: "Nenhuma causa informada."
6. **Ações recomendadas (checklist):** cada item com *checkbox* + texto; texto riscado quando `done`. Mostrar progresso ("2 de 4 concluídas"). Marcar/desmarcar faz `PATCH { actions: [...] }` com o array completo atualizado, de forma **otimista** (atualiza a UI na hora e reverte com mensagem de erro se falhar). Se vazia: "Nenhuma ação recomendada."
7. **Feedback da previsão:** "A previsão se confirmou?" com três opções (Sim / Não / Ainda não avaliado → `true` / `false` / `null`), enviando `PATCH { confirmed }`. Texto de ajuda: "Essa informação ajuda a medir a precisão do modelo."
8. **Arquivar alerta:** botão secundário ("Arquivar") que abre `ConfirmDialog` ("O alerta sairá da lista, mas será mantido no sistema."). Ao confirmar: `DELETE`, volta para a lista e mostra confirmação breve.

Todas as mutações: botão/controle desabilitado enquanto envia; em erro, mensagem visível perto do controle, sem perder o que o usuário fez.
A página também usa *polling* (15s) para refletir atualizações do agente, **sem sobrescrever** uma mutação em andamento.

### 7.8 Estados de carregamento, vazio e erro

Componentes reutilizáveis em `components/feedback/`:

| Estado | Lista | Detalhe |
|---|---|---|
| **Carregando** (primeira carga) | Esqueleto (*skeleton*) de cards e de linhas da tabela | Esqueleto das seções |
| **Vazio** | Se há filtros aplicados: "Nenhum alerta encontrado com estes filtros" + botão "Limpar filtros". Se o sistema não tem nenhum alerta: "Nenhum alerta por enquanto. Quando o agente identificar um risco, ele aparecerá aqui." | — |
| **Erro** | Mensagem amigável + botão "Tentar novamente" (refetch). Distinguir "não foi possível conectar ao servidor" de erro retornado pela API. | Igual; e para `404`: "Alerta não encontrado" com link de volta à lista |

### 7.9 Textos (PT-BR)

Rótulos de tipo, risco e situação ficam centralizados em `constants/alerts.js` (valores do enum → rótulo), conforme as tabelas da seção 5. Textos fixos da interface podem ficar nos próprios componentes, mas **sem misturar inglês** na tela. Datas formatadas com `pt-BR` (ex.: `02/10/2026 14:30`).

### 7.10 Qualidade da interface

- Interface **minimalista e limpa**: bastante espaço em branco, hierarquia tipográfica clara, poucas cores além das semânticas, bordas sutis.
- Foco visível (`:focus-visible` usando `--color-focus-ring`) e navegação por teclado funcional na tabela, filtros e checklist.
- Elementos HTML semânticos (`table`, `button`, `label`, `nav`, `main`) e `aria-label` onde só há ícone.

---

## 8. Plano de implementação (fases)

Execute na ordem. Ao concluir cada fase, rode o que for aplicável (`npm run lint`, `npm test`) e confira os critérios de aceite relacionados. Os testes crescem **iterativamente**: a cada fase de backend, novos testes são adicionados para cobrir os endpoints implementados. A suite deve estar sempre passando ao final de cada fase.

**Fase 1 — Esqueleto do monorepo**
Raiz com workspaces, scripts, `.gitignore`, Prettier/ESLint, `backend` e `frontend` iniciais (Express respondendo `/api/health`; Vite exibindo uma página em branco com o título). `npm run dev` sobe ambos.

**Fase 2 — Backend: banco e API + testes iniciais**
Config, conexão SQLite + schema (incluindo lógica de expiração automática), repositório, schemas Zod (incluindo `ActionSchema`), middlewares (validação, erros, CORS, auth), rotas e controllers dos endpoints da seção 6.4. Ao final, escrever os primeiros testes: `POST` (201/401/400) e `GET` lista com filtros básicos.

**Fase 3a — Backend: logs, seed e simulador**
Logger do agente (`agentRequestLogger`), `seed.js`, `simulate.js` e suas variáveis de ambiente.

**Fase 3b — Backend: documentação, testes completos e README**
`openapi.yaml` completo + `/api-docs`, testes finais cobrindo toda a seção 6.11, `backend/README.md` com guia para o time do agente.

**Fase 4 — Frontend: fundação**
Estrutura de pastas, tokens CSS (`tokens-base.css`, `tokens-brand.css`, `tokens-semantic.css`), layout/cabeçalho, rotas, `api/client.js`, hooks do React Query, constantes e utilitários de data.

**Fase 5 — Frontend: lista**
`SummaryCards`, `FiltersBar` (com estado na URL), `AlertsTable`, badges, `AccuracyBar`, paginação, ordenação, *polling*, estados de carregamento/vazio/erro.

**Fase 6 — Frontend: detalhe**
Página de detalhe completa (7.7), checklist otimista, mudança de status, feedback de previsão, arquivar com confirmação, estados de carregamento/erro/404.

**Fase 7 — Acabamento e documentação**
Revisão de acessibilidade e contraste de cores, revisão de textos PT-BR, verificação de que não há cores fora dos arquivos de tema, `README.md` raiz completo, sincronização final do `openapi.yaml`.

---

## 9. Critérios de aceite

### Backend
- [ ] `POST /api/alerts` sem `X-API-Key` retorna `401`; com chave e corpo válido retorna `201`.
- [ ] Corpo inválido retorna `400` com `error.code = VALIDATION_ERROR` e `details` por campo.
- [ ] `GET /api/alerts` respeita filtros, ordenação e paginação; a ordenação padrão é risco ↓ + previsão ↑.
- [ ] `PATCH` é parcial, atualiza `updated_at` e rejeita `id`, `created_at` e `updated_at`.
- [ ] `DELETE` não remove a linha do banco (apenas preenche `deleted_at`) e o alerta some das consultas.
- [ ] Alertas ativos com `predicted_for` há mais de 30 minutos são automaticamente marcados como `expired`.
- [ ] Erros seguem o formato padronizado; nenhum erro 500 vaza stack trace.
- [ ] CORS permite a origem configurada em `CORS_ORIGIN`.
- [ ] Requisições com `X-API-Key` geram linhas em `logs/agent-YYYY-MM-DD.txt`, sem expor a chave.
- [ ] `/api-docs` abre e documenta todos os endpoints com exemplos.
- [ ] `npm run seed` e `npm run simulate` funcionam; `npm test` passa.

### Frontend
- [ ] Lista exibe: risco, título, área, equipamentos, previsão, certeza e situação, claramente legíveis.
- [ ] Visão geral no topo mostra as contagens corretas e os cards funcionam como atalhos de filtro.
- [ ] Todos os filtros funcionam, ficam na URL e sobrevivem a recarregar a página.
- [ ] Ordenação por cabeçalho e paginação funcionam.
- [ ] Novos alertas criados pelo simulador aparecem na lista em até ~15s, sem recarregar a página.
- [ ] Detalhe mostra contexto, causas e checklist; marcar uma ação persiste após recarregar.
- [ ] Alterar situação e "a previsão se confirmou?" persistem.
- [ ] Arquivar pede confirmação e remove o alerta da lista.
- [ ] Estados de carregamento, vazio e erro existem em lista e detalhe (testar desligando o backend).
- [ ] Nenhuma cor literal fora dos arquivos de tema (verificar com busca por `#`, `rgb(`, `hsl(` em `src/`).
- [ ] Todo texto visível está em PT-BR.
- [ ] Layout adequado entre 1280px e 1920px de largura.

---

## 10. README raiz (conteúdo obrigatório)

1. O que é o projeto (2–3 linhas) e como as 3 partes se conectam.
2. Pré-requisitos (Node 22 LTS).
3. Instalação e execução: `npm install`, copiar os `.env.example`, `npm run seed`, `npm run dev`, endereços (frontend `http://localhost:5173`, API `http://localhost:3001`, docs `http://localhost:3001/api-docs`).
4. Como rodar o simulador e os testes.
5. Como ajustar a paleta de cores (onde estão os arquivos de tokens e quais variáveis editar).
6. Estrutura de pastas resumida.
7. Limitações conhecidas do MVP (ver seção 11).
8. Decisões tomadas durante a implementação (seção para o agente preencher).

---

## 11. Limitações conhecidas do MVP

Esta seção documenta restrições e simplificações **intencionais** do MVP.

- **Sem autenticação de usuários:** qualquer pessoa com acesso à URL pode ler e alterar alertas pelo frontend. A única proteção existente é a `X-API-Key` para criação de alertas pelo agente.
- **Sem busca textual:** a filtragem de alertas é feita apenas por campos estruturados (status, risco, tipo, área, certeza mínima). Busca por texto livre não está implementada.
- **Expiração automática por polling:** alertas são marcados como `expired` apenas quando o servidor processa uma requisição de leitura, não em tempo real. Pode haver até ~15s de atraso.
- **Race condition no checklist:** o agente pode sobrescrever marcações do analista se fizer `PATCH` em `actions` sem antes buscar o estado atual com `GET`. O protocolo correto está documentado na seção 5.1, mas não há controle de concorrência (sem `ETag` ou `Last-Modified`).
- **Sem versão mobile:** o layout é otimizado para monitores desktop (1280–1920px). Abaixo de 1024px a interface pode apresentar rolagem horizontal.
- **Sem tempo real (WebSocket/SSE):** atualizações chegam ao frontend por *polling* a cada 15 segundos.
- **SQLite em arquivo único:** adequado para o MVP; não suporta múltiplas instâncias do servidor.
- **Sem migração de schema:** se o schema do banco for alterado durante o desenvolvimento, é necessário apagar o arquivo `.db` e rodar `npm run seed` novamente.
