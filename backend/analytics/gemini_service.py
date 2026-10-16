"""
gemini_service.py
Integração com a API do Gemini (gemini-2.0-flash) usando o SDK google-genai.
Recebe o histórico do chat e retorna a decisão estruturada de qual
gráfico gerar e com quais parâmetros.
"""

import os
import json
import re
import time
import logging
from pathlib import Path
from google import genai
from google.genai import types
from google.api_core.exceptions import ServiceUnavailable, ResourceExhausted
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Configuração do retry com backoff exponencial:
# Tentativa 1 → imediata
# Tentativa 2 → aguarda 5s
# Tentativa 3 → aguarda 10s
# Tentativa 4 → aguarda 20s
RETRY_DELAYS = [5, 10, 20]   # segundos entre cada tentativa
MAX_ATTEMPTS = len(RETRY_DELAYS) + 1

# Carrega apenas o .env do diretório deste arquivo
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=False)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Campos disponíveis no banco de dados para o modelo conhecer
AVAILABLE_FIELDS = {
    "falha_risco": "Nível de risco do incidente (Crítico, Alto, Médio, Baixo)",
    "falha_categoria": "Categoria da falha (ex.: Conectividade, Hardware, Software)",
    "falha_localizacao": "Localização geográfica do incidente",
    "incidente_status": "Status do incidente (Aberto, Em Andamento, Resolvido)",
    "perda_pacotes_pct": "Percentual de perda de pacotes (numérico)",
    "latencia_ms": "Latência em milissegundos (numérico)",
    "dispositivo_tipo_conexao": "Tipo de conexão do dispositivo",
    "cliente_banda": "Banda contratada pelo cliente",
    "falha_inicio": "Data/hora de início da falha (ISO 8601)",
    "falha_resolucao": "Data/hora de resolução da falha (ISO 8601)",
    "acao_automatizada": "Se a ação foi automatizada (TRUE/FALSE)",
}

CHART_TYPES = {
    "bar": "Gráfico de barras — ideal para comparar categorias",
    "pie": "Gráfico de pizza — ideal para mostrar proporções",
    "scatter": "Gráfico de dispersão — ideal para correlação entre dois campos numéricos",
    "line": "Gráfico de linha — ideal para séries temporais",
    "histogram": "Histograma — ideal para distribuição de valores numéricos",
    "box": "Box plot — ideal para distribuição e outliers de valores numéricos",
    "heatmap": "Mapa de calor — ideal para cruzar duas dimensões categóricas",
}

SYSTEM_PROMPT = f"""Você é um assistente analítico especializado em dados de monitoramento de rede.
Seu trabalho é interpretar pedidos do usuário e gerar especificações de gráficos Plotly
baseados nos dados disponíveis no banco de dados SQLite de incidentes de rede.

CAMPOS DISPONÍVEIS NO BANCO:
{json.dumps(AVAILABLE_FIELDS, ensure_ascii=False, indent=2)}

TIPOS DE GRÁFICO SUPORTADOS:
{json.dumps(CHART_TYPES, ensure_ascii=False, indent=2)}

REGRAS OBRIGATÓRIAS:
1. Você DEVE responder com um JSON válido dentro de uma tag <chart_spec>.
2. O JSON deve ter EXATAMENTE este formato:
{{
  "chart_type": "<um dos tipos acima>",
  "title": "<título descritivo do gráfico>",
  "x_field": "<campo do banco para eixo X ou categorias>",
  "y_field": "<campo do banco para eixo Y ou valores, null se não aplicável>",
  "aggregation": "<count|sum|avg|none>",
  "filters": {{
    "<campo>": "<valor ou lista de valores para filtrar, apenas se o usuário especificou>"
  }},
  "color_field": "<campo para colorir, null se não aplicável>",
  "explanation": "<explicação em português do que o gráfico mostra>"
}}
3. Para gráficos de contagem (bar, pie, heatmap), use aggregation="count".
4. Para valores numéricos (scatter, histogram, box), use aggregation="none".
5. Para médias ou somas, use aggregation="avg" ou "sum".
6. Após o JSON, escreva uma mensagem amigável em português explicando o que será mostrado.
7. Se o pedido for ambíguo, escolha a visualização mais útil e explique sua escolha.
8. Nunca invente campos que não existem na lista acima.
"""


def _extract_chart_spec(text: str) -> dict | None:
    """Extrai o JSON de especificação do gráfico da resposta do modelo."""
    match = re.search(r"<chart_spec>(.*?)</chart_spec>", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(1).strip())
    except json.JSONDecodeError:
        return None


def _extract_message(text: str) -> str:
    """Remove a tag <chart_spec> e retorna apenas o texto amigável."""
    return re.sub(r"<chart_spec>.*?</chart_spec>", "", text, flags=re.DOTALL).strip()


class GeminiService:
    def __init__(self):
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY não configurada no arquivo .env")
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        self.model_name = "gemini-3.5-flash-lite"

    def chat(self, history: list[dict], user_message: str) -> dict:
        """
        Envia uma mensagem com histórico e retorna a resposta do modelo.

        Args:
            history: Lista de mensagens anteriores [{role: "user"|"model", content: "..."}]
            user_message: Mensagem atual do usuário

        Returns:
            {
                "text": str,             # Mensagem amigável para o usuário
                "chart_spec": dict|None  # Especificação do gráfico ou None
            }
        """
        # Constrói o histórico no formato do SDK google-genai
        sdk_contents = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            sdk_contents.append(
                types.Content(role=role, parts=[types.Part(text=msg["content"])])
            )
        # Adiciona a mensagem atual
        sdk_contents.append(
            types.Content(role="user", parts=[types.Part(text=user_message)])
        )

        last_exc: Exception | None = None
        for attempt in range(MAX_ATTEMPTS):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=sdk_contents,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.2,
                    ),
                )
                break  # sucesso — sai do loop
            except (ServiceUnavailable, ResourceExhausted) as exc:
                last_exc = exc
                if attempt < len(RETRY_DELAYS):
                    wait = RETRY_DELAYS[attempt]
                    logger.warning(
                        "Gemini 503/429 na tentativa %d/%d — aguardando %ds antes de tentar novamente.",
                        attempt + 1, MAX_ATTEMPTS, wait,
                    )
                    time.sleep(wait)
                else:
                    raise RuntimeError(
                        f"Gemini indisponível após {MAX_ATTEMPTS} tentativas: {exc}"
                    ) from exc
        else:
            # Loop esgotado sem break (não deveria chegar aqui, mas por segurança)
            raise RuntimeError(
                f"Gemini indisponível após {MAX_ATTEMPTS} tentativas: {last_exc}"
            )

        full_text = response.text
        chart_spec = _extract_chart_spec(full_text)
        friendly_text = _extract_message(full_text)

        return {
            "text": friendly_text,
            "chart_spec": chart_spec,
        }


# Singleton — instanciado apenas quando a API key estiver presente
_service: GeminiService | None = None


def get_gemini_service() -> GeminiService:
    global _service
    if _service is None:
        _service = GeminiService()
    return _service
