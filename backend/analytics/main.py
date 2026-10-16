"""
main.py
Microserviço FastAPI para o módulo de Analytics.
Expõe endpoints de chat com Gemini + geração de gráficos Plotly.
Roda em http://localhost:8000 por padrão.
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from gemini_service import get_gemini_service
from chart_generator import generate_chart

# Carrega apenas o .env do diretório deste arquivo
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=False)

CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")

app = FastAPI(
    title="Analytics API",
    description="Chatbot Gemini + Geração de Gráficos Plotly para dados de rede",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN, "http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Modelos de request/response ────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str          # "user" | "model"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChartData(BaseModel):
    data: list
    layout: dict


class ChatResponse(BaseModel):
    text: str
    chart: ChartData | None = None
    chart_spec: dict | None = None


# ── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "analytics"}


@app.post("/analytics/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    Recebe uma mensagem do usuário e o histórico do chat.
    Retorna a resposta textual do Gemini e, se aplicável, os dados do gráfico.
    """
    try:
        service = get_gemini_service()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    history = [msg.model_dump() for msg in req.history]

    try:
        result = service.chat(history, req.message)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao chamar Gemini: {str(e)}")

    chart_data = None
    if result.get("chart_spec"):
        try:
            figure = generate_chart(result["chart_spec"])
            chart_data = ChartData(
                data=figure.get("data", []),
                layout=figure.get("layout", {}),
            )
        except Exception as e:
            # Não falha o chat inteiro se o gráfico falhar — retorna erro no texto
            result["text"] += f"\n\n⚠️ Não foi possível gerar o gráfico: {str(e)}"

    return ChatResponse(
        text=result["text"],
        chart=chart_data,
        chart_spec=result.get("chart_spec"),
    )


@app.post("/analytics/chart")
def generate(spec: dict):
    """
    Gera um gráfico diretamente a partir de uma especificação (sem chat).
    Útil para regenerar ou ajustar gráficos já existentes.
    """
    try:
        figure = generate_chart(spec)
        return {"data": figure.get("data", []), "layout": figure.get("layout", {})}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar gráfico: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ANALYTICS_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
