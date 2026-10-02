# Backend — Alertas Preditivos de Rede

API REST em Node.js (Express 5) que recebe alertas de um agente de IA externo e os disponibiliza para o frontend.

## Stack

| Item | Escolha |
|---|---|
| Runtime | Node.js 22 LTS (ES Modules) |
| Framework | Express 5 |
| Banco | SQLite via `better-sqlite3` (SQL manual) |
| Validação | `zod` |
| Config | `dotenv` |
| CORS | `cors` |
| Documentação | `swagger-ui-express` + `openapi.yaml` |
| Testes | `node:test` + `supertest` |

## Configuração

Copie `.env.example` para `.env` e ajuste os valores:

```bash
cp .env.example .env
```

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta do servidor |
| `DB_PATH` | `./data/alerts.db` | Caminho do arquivo SQLite |
| `AGENT_API_KEY` | `dev-agent-key-change-me` | Chave de autenticação do agente |
| `CORS_ORIGIN` | `http://localhost:5173` | Origem permitida pelo CORS |
| `LOG_DIR` | `./logs` | Pasta dos logs do agente |
| `API_URL` | `http://localhost:3001` | URL base usada pelo `simulate.js` |

## Executar

```bash
# Desenvolvimento (com hot-reload via --watch)
npm run dev

# Produção
npm start
```

Endpoints disponíveis:
- API: `http://localhost:3001/api/alerts`
- Documentação Swagger: `http://localhost:3001/api-docs`

## Testes

```bash
npm test
```

Os testes usam SQLite em memória (`DB_PATH=:memory:`) — injetado automaticamente pelo script.

## Scripts utilitários

```bash
# Popula o banco com dados de exemplo (apaga os existentes por padrão)
npm run seed

# Popula sem apagar os alertas existentes
npm run seed -- --keep

# Inicia o simulador do agente (envia um alerta a cada 20s)
npm run simulate

# Para após 5 envios
npm run simulate -- --count 5

# Com intervalo personalizado
npm run simulate -- --interval 10
```

---

## Guia rápido para o time do agente

> ⚠️ Todas as requisições de criação exigem o header `X-API-Key`.

### Criar um alerta (`curl`)

```bash
curl -X POST http://localhost:3001/api/alerts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-agent-key-change-me" \
  -d '{
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
  }'
```

### Criar um alerta (Python)

```python
import requests

response = requests.post(
    "http://localhost:3001/api/alerts",
    headers={"X-API-Key": "dev-agent-key-change-me"},
    json={
        "type": "congestion",
        "title": "Congestionamento previsto no switch de agregação",
        "area": "Campinas",
        "equipments": ["SW-CAMP-07"],
        "risk": "medium",
        "accuracy": 78,
        "predicted_for": "2026-10-03T18:00:00.000Z",
        "context": "Aumento contínuo de pacotes nas últimas 48h.",
        "causes": ["Crescimento de tráfego no horário de pico"],
        "actions": ["Verificar filas de saída da interface Gi0/2"],
    },
)
print(response.status_code, response.json())
```

### Atualizar um alerta (Python)

```python
# ATENÇÃO: ao enviar `actions`, leia o alerta antes para não apagar
# as marcações (done) feitas pelo analista.
alert_id = 17

# 1. Leia o estado atual
current = requests.get(f"http://localhost:3001/api/alerts/{alert_id}").json()
actions = current["data"]["actions"]

# 2. Faça sua alteração
actions.append({"text": "Nova ação adicionada pelo agente", "done": False})

# 3. Envie o PATCH (a API key no PATCH é opcional, mas registra no log)
response = requests.patch(
    f"http://localhost:3001/api/alerts/{alert_id}",
    headers={"X-API-Key": "dev-agent-key-change-me"},
    json={"accuracy": 92, "actions": actions},
)
print(response.status_code, response.json())
```
