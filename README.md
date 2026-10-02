# Alertas Preditivos de Rede

Sistema web para analistas de suporte de uma operadora de telecomunicações acompanharem e agirem sobre alertas preditivos gerados por inteligência artificial. Um agente de IA externo detecta padrões na rede e envia alertas via API; os analistas consultam, priorizam e tratam esses alertas pelo frontend web.

**As três partes do sistema:**
- **Agente de IA (externo)** — script Python que analisa a rede e envia alertas via `POST /api/alerts`.
- **Backend (este repositório)** — API REST em Node.js/Express que armazena os alertas em SQLite e os disponibiliza ao frontend.
- **Frontend (este repositório)** — Interface React que exibe os alertas, permite filtragem, gerenciamento de status e acompanhamento do checklist de ações.

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
cp frontend/.env.example frontend/.env

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

```bash
# Inicia o simulador — envia um alerta a cada 20s
npm run simulate

# Para após 5 envios
npm run simulate -- --count 5

# Roda os testes do backend (usa SQLite em memória)
npm test
```

---

## Como ajustar a paleta de cores

Todas as cores da interface estão centralizadas em dois arquivos dentro de `frontend/src/styles/`:

| Arquivo | O que contém |
|---|---|
| `tokens-brand.css` | Cores da paleta principal: primária, fundo, superfície, texto, bordas |
| `tokens-semantic.css` | Cores de significado: risco (alto/médio/baixo) e situação (novo, em análise…) |

Para mudar a paleta, edite os valores de `var(--...)` em `:root` nesses dois arquivos. **Nunca escreva cores diretamente nos componentes.**

Exemplo — trocar a cor primária para verde:
```css
/* em tokens-brand.css */
:root {
  --color-primary: #16a34a;
  --color-primary-hover: #15803d;
}
```

---

## Estrutura de pastas

```
/
├── backend/
│   ├── src/
│   │   ├── app.js              # App Express (sem listen)
│   │   ├── server.js           # Ponto de entrada (listen)
│   │   ├── config.js           # Variáveis de ambiente
│   │   ├── db/                 # Conexão SQLite e schema
│   │   ├── routes/             # Definição das rotas
│   │   ├── controllers/        # Handlers dos endpoints
│   │   ├── repositories/       # Queries SQL
│   │   ├── validation/         # Schemas Zod
│   │   ├── middleware/         # Auth, logs, validação, erros
│   │   └── utils/              # HttpError
│   ├── scripts/                # seed.js e simulate.js
│   ├── docs/                   # openapi.yaml
│   └── tests/                  # Testes com node:test + supertest
└── frontend/
    └── src/
        ├── api/                # client.js e alerts.js
        ├── hooks/              # Hooks TanStack Query
        ├── constants/          # Enums e rótulos PT-BR
        ├── utils/              # dates.js e filters.js
        ├── styles/             # Tokens CSS e global.css
        ├── components/         # layout/, alerts/, feedback/
        └── pages/              # AlertsListPage, AlertDetailPage, NotFoundPage
```

---

## Limitações conhecidas do MVP

- **Sem autenticação de usuários:** qualquer pessoa com acesso à URL pode ler e alterar alertas pelo frontend. A única proteção existente é a `X-API-Key` para criação de alertas pelo agente.
- **Sem busca textual:** a filtragem é feita apenas por campos estruturados (status, risco, tipo, área, certeza mínima).
- **Expiração automática lazy:** alertas são marcados como `expired` quando o servidor processa uma requisição de leitura, não em tempo real.
- **Race condition no checklist:** o agente deve ler o alerta antes de reescrever `actions` para não apagar marcações do analista. Não há controle de concorrência (sem `ETag`).
- **Sem versão mobile:** layout otimizado para desktop (1280–1920px).
- **Sem tempo real:** atualizações chegam ao frontend por polling a cada 15 segundos.
- **SQLite em arquivo único:** sem suporte a múltiplas instâncias do servidor.
- **Sem migração de schema:** para mudanças no schema, apague o `.db` e rode `npm run seed`.

---

## Decisões tomadas durante a implementação

> *(Esta seção é preenchida pelo agente de código à medida que o projeto evolui.)*
