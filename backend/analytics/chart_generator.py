"""
chart_generator.py
Lê dados do banco SQLite e gera gráficos Plotly baseados na
especificação produzida pelo GeminiService.
Retorna o JSON do gráfico (plotly figure dict) pronto para ser
renderizado via react-plotly.js no frontend.
"""

import os
import sqlite3
import json
from pathlib import Path
from dotenv import load_dotenv
import plotly.graph_objects as go

# Carrega apenas o .env do diretório deste arquivo (evita conflito com outros .env do projeto)
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=False)

# Caminho padrão do banco — pode ser sobrescrito via DB_PATH
DB_PATH = os.getenv("DB_PATH", "../data/banco_dados_ibm")

# Paleta de cores consistente com o design system do frontend
COLOR_MAP = {
    "Crítico": "#7f1d1d",
    "Alto": "#b91c1c",
    "Médio": "#b45309",
    "Baixo": "#15803d",
    "Aberto": "#1d4ed8",
    "Em Andamento": "#7c3aed",
    "Resolvido": "#15803d",
}
DEFAULT_COLORS = [
    "#2563eb", "#7c3aed", "#15803d", "#b45309",
    "#b91c1c", "#0891b2", "#d97706", "#6d28d9",
]

LAYOUT_DEFAULTS = {
    "font": {"family": "-apple-system, 'Segoe UI', system-ui, sans-serif", "size": 13},
    "paper_bgcolor": "#ffffff",
    "plot_bgcolor": "#f8fafc",
    "margin": {"t": 50, "b": 50, "l": 50, "r": 20},
    "colorway": DEFAULT_COLORS,
}

# Campos numéricos — necessário para validar aggregation
NUMERIC_FIELDS = {"perda_pacotes_pct", "latencia_ms"}

# Lista branca de colunas permitidas (evita SQL injection)
ALLOWED_COLUMNS = {
    "falha_risco", "falha_categoria", "falha_localizacao",
    "incidente_status", "perda_pacotes_pct", "latencia_ms",
    "dispositivo_tipo_conexao", "cliente_banda",
    "falha_inicio", "falha_resolucao", "acao_automatizada",
    "cliente_nome", "dispositivo_nome",
}


def _resolve_db_path() -> str:
    """Resolve o caminho absoluto do banco de dados."""
    p = Path(DB_PATH)
    if p.is_absolute() or p.exists():
        return str(p)
    # Tenta relativo ao diretório deste arquivo
    relative = Path(__file__).parent.parent / "data" / "banco_dados_ibm"
    return str(relative)


def _get_connection() -> sqlite3.Connection:
    path = _resolve_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def _validate_column(col: str) -> str:
    """Valida que a coluna está na lista branca."""
    if col not in ALLOWED_COLUMNS:
        raise ValueError(f"Campo inválido: '{col}'. Use um dos campos permitidos.")
    return col


def _build_where_clause(filters: dict) -> tuple[str, list]:
    """Constrói a cláusula WHERE a partir dos filtros."""
    conditions = ["deleted_at IS NULL"]
    params = []
    for field, value in (filters or {}).items():
        if field not in ALLOWED_COLUMNS:
            continue
        if isinstance(value, list) and value:
            placeholders = ",".join("?" * len(value))
            conditions.append(f"{field} IN ({placeholders})")
            params.extend(value)
        elif isinstance(value, str) and value:
            conditions.append(f"{field} = ?")
            params.append(value)
    return f"WHERE {' AND '.join(conditions)}", params


def _query_aggregated(x_field: str, aggregation: str, filters: dict,
                      y_field: str | None = None, color_field: str | None = None) -> list[dict]:
    """Executa query de contagem/agregação agrupada por x_field (e opcionalmente color_field)."""
    _validate_column(x_field)
    where, params = _build_where_clause(filters)

    group_fields = [x_field]
    select_fields = [x_field]

    if color_field and color_field in ALLOWED_COLUMNS and color_field != x_field:
        _validate_column(color_field)
        group_fields.append(color_field)
        select_fields.append(color_field)

    if aggregation == "count":
        agg_expr = "COUNT(*) as value"
    elif aggregation == "avg" and y_field and y_field in NUMERIC_FIELDS:
        _validate_column(y_field)
        agg_expr = f"AVG({y_field}) as value"
    elif aggregation == "sum" and y_field and y_field in NUMERIC_FIELDS:
        _validate_column(y_field)
        agg_expr = f"SUM({y_field}) as value"
    else:
        agg_expr = "COUNT(*) as value"

    group_by = ", ".join(group_fields)
    select = ", ".join(select_fields)
    sql = f"""
        SELECT {select}, {agg_expr}
        FROM logs_informativos
        {where}
        GROUP BY {group_by}
        ORDER BY value DESC
    """
    with _get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def _query_raw(x_field: str, y_field: str, filters: dict,
               color_field: str | None = None) -> list[dict]:
    """Executa query de valores brutos (scatter, histogram, box)."""
    _validate_column(x_field)
    _validate_column(y_field)
    where, params = _build_where_clause(filters)

    extra = ""
    if color_field and color_field in ALLOWED_COLUMNS:
        _validate_column(color_field)
        extra = f", {color_field}"

    sql = f"""
        SELECT {x_field}, {y_field}{extra}
        FROM logs_informativos
        {where}
        WHERE {x_field} IS NOT NULL AND {y_field} IS NOT NULL
        LIMIT 2000
    """
    # Corrige WHERE duplicado
    sql = sql.replace(
        f"{where}\n        WHERE {x_field}",
        f"{where.rstrip()} AND {x_field} IS NOT NULL AND {y_field} IS NOT NULL\n        ",
        1,
    )
    # Rebuild mais limpo:
    conditions_raw = ["deleted_at IS NULL", f"{x_field} IS NOT NULL", f"{y_field} IS NOT NULL"]
    if color_field and color_field in ALLOWED_COLUMNS:
        pass
    params_raw = []
    for field, value in (filters or {}).items():
        if field not in ALLOWED_COLUMNS:
            continue
        if isinstance(value, list) and value:
            placeholders = ",".join("?" * len(value))
            conditions_raw.append(f"{field} IN ({placeholders})")
            params_raw.extend(value)
        elif isinstance(value, str) and value:
            conditions_raw.append(f"{field} = ?")
            params_raw.append(value)

    where_clean = "WHERE " + " AND ".join(conditions_raw)
    select_cols = f"{x_field}, {y_field}"
    if color_field and color_field in ALLOWED_COLUMNS:
        select_cols += f", {color_field}"

    sql_clean = f"SELECT {select_cols} FROM logs_informativos {where_clean} LIMIT 2000"
    with _get_connection() as conn:
        rows = conn.execute(sql_clean, params_raw).fetchall()
    return [dict(r) for r in rows]


def _apply_color_map(labels: list) -> list:
    """Mapeia labels para cores, usando o mapa semântico quando possível."""
    return [COLOR_MAP.get(str(label), DEFAULT_COLORS[i % len(DEFAULT_COLORS)])
            for i, label in enumerate(labels)]


def generate_chart(spec: dict) -> dict:
    """
    Gera um gráfico Plotly a partir da especificação do Gemini.

    Args:
        spec: Dicionário com chart_type, x_field, y_field, aggregation, filters, color_field, title

    Returns:
        Dicionário serializável com 'data' e 'layout' do Plotly (figure dict)
    """
    chart_type = spec.get("chart_type", "bar")
    x_field = spec.get("x_field", "falha_risco")
    y_field = spec.get("y_field")
    aggregation = spec.get("aggregation", "count")
    filters = spec.get("filters", {})
    color_field = spec.get("color_field")
    title = spec.get("title", "Gráfico")

    fig: go.Figure | None = None

    # ── BAR ──────────────────────────────────────────────────────────────────
    if chart_type == "bar":
        rows = _query_aggregated(x_field, aggregation, filters, y_field, color_field)
        if color_field and color_field in ALLOWED_COLUMNS and color_field != x_field:
            # Gráfico de barras agrupado
            groups: dict[str, dict] = {}
            for row in rows:
                x_val = str(row.get(x_field, ""))
                c_val = str(row.get(color_field, ""))
                if c_val not in groups:
                    groups[c_val] = {}
                groups[c_val][x_val] = row["value"]
            all_x = sorted({str(r.get(x_field, "")) for r in rows})
            traces = []
            for i, (group, vals) in enumerate(groups.items()):
                traces.append(go.Bar(
                    name=group,
                    x=all_x,
                    y=[vals.get(x, 0) for x in all_x],
                    marker_color=COLOR_MAP.get(group, DEFAULT_COLORS[i % len(DEFAULT_COLORS)]),
                ))
            fig = go.Figure(data=traces)
            fig.update_layout(barmode="group")
        else:
            labels = [str(r.get(x_field, "")) for r in rows]
            values = [r["value"] for r in rows]
            fig = go.Figure(go.Bar(
                x=labels,
                y=values,
                marker_color=_apply_color_map(labels),
            ))
        y_label = "Quantidade" if aggregation == "count" else (y_field or "Valor")
        fig.update_layout(xaxis_title=x_field.replace("_", " ").title(),
                          yaxis_title=y_label)

    # ── PIE ──────────────────────────────────────────────────────────────────
    elif chart_type == "pie":
        rows = _query_aggregated(x_field, aggregation, filters, y_field)
        labels = [str(r.get(x_field, "")) for r in rows]
        values = [r["value"] for r in rows]
        fig = go.Figure(go.Pie(
            labels=labels,
            values=values,
            marker_colors=_apply_color_map(labels),
            hole=0.35,
        ))

    # ── SCATTER ──────────────────────────────────────────────────────────────
    elif chart_type == "scatter":
        if not y_field:
            y_field = "latencia_ms"
        rows = _query_raw(x_field, y_field, filters, color_field)
        if color_field and color_field in ALLOWED_COLUMNS:
            groups: dict[str, list] = {}
            for row in rows:
                c = str(row.get(color_field, ""))
                if c not in groups:
                    groups[c] = []
                groups[c].append(row)
            traces = []
            for i, (group, group_rows) in enumerate(groups.items()):
                traces.append(go.Scatter(
                    x=[r[x_field] for r in group_rows],
                    y=[r[y_field] for r in group_rows],
                    mode="markers",
                    name=group,
                    marker=dict(
                        color=COLOR_MAP.get(group, DEFAULT_COLORS[i % len(DEFAULT_COLORS)]),
                        size=7,
                    ),
                ))
            fig = go.Figure(data=traces)
        else:
            fig = go.Figure(go.Scatter(
                x=[r[x_field] for r in rows],
                y=[r[y_field] for r in rows],
                mode="markers",
                marker=dict(color=DEFAULT_COLORS[0], size=7),
            ))
        fig.update_layout(
            xaxis_title=x_field.replace("_", " ").title(),
            yaxis_title=y_field.replace("_", " ").title(),
        )

    # ── LINE ─────────────────────────────────────────────────────────────────
    elif chart_type == "line":
        rows = _query_aggregated(x_field, aggregation, filters, y_field, color_field)
        if color_field and color_field in ALLOWED_COLUMNS and color_field != x_field:
            groups: dict[str, dict] = {}
            for row in rows:
                x_val = str(row.get(x_field, ""))
                c_val = str(row.get(color_field, ""))
                if c_val not in groups:
                    groups[c_val] = {}
                groups[c_val][x_val] = row["value"]
            all_x = sorted({str(r.get(x_field, "")) for r in rows})
            traces = []
            for i, (group, vals) in enumerate(groups.items()):
                traces.append(go.Scatter(
                    name=group,
                    x=all_x,
                    y=[vals.get(x, 0) for x in all_x],
                    mode="lines+markers",
                    line=dict(color=COLOR_MAP.get(group, DEFAULT_COLORS[i % len(DEFAULT_COLORS)])),
                ))
            fig = go.Figure(data=traces)
        else:
            labels = [str(r.get(x_field, "")) for r in rows]
            values = [r["value"] for r in rows]
            fig = go.Figure(go.Scatter(
                x=labels, y=values, mode="lines+markers",
                line=dict(color=DEFAULT_COLORS[0]),
            ))
        fig.update_layout(
            xaxis_title=x_field.replace("_", " ").title(),
            yaxis_title="Quantidade" if aggregation == "count" else (y_field or "Valor"),
        )

    # ── HISTOGRAM ────────────────────────────────────────────────────────────
    elif chart_type == "histogram":
        field = x_field if x_field in NUMERIC_FIELDS else (y_field if y_field in NUMERIC_FIELDS else "latencia_ms")
        where, params = _build_where_clause(filters)
        sql = f"SELECT {field} FROM logs_informativos {where} AND {field} IS NOT NULL LIMIT 2000"
        # Rebuild
        conditions_h = ["deleted_at IS NULL", f"{field} IS NOT NULL"]
        params_h = []
        for f2, v in (filters or {}).items():
            if f2 not in ALLOWED_COLUMNS:
                continue
            if isinstance(v, list) and v:
                placeholders = ",".join("?" * len(v))
                conditions_h.append(f"{f2} IN ({placeholders})")
                params_h.extend(v)
            elif isinstance(v, str) and v:
                conditions_h.append(f"{f2} = ?")
                params_h.append(v)
        sql_h = f"SELECT {field} FROM logs_informativos WHERE {' AND '.join(conditions_h)} LIMIT 2000"
        with _get_connection() as conn:
            rows = conn.execute(sql_h, params_h).fetchall()
        values = [r[0] for r in rows if r[0] is not None]
        fig = go.Figure(go.Histogram(
            x=values,
            marker_color=DEFAULT_COLORS[0],
            opacity=0.85,
        ))
        fig.update_layout(
            xaxis_title=field.replace("_", " ").title(),
            yaxis_title="Frequência",
        )

    # ── BOX ──────────────────────────────────────────────────────────────────
    elif chart_type == "box":
        field = y_field if y_field in NUMERIC_FIELDS else (x_field if x_field in NUMERIC_FIELDS else "latencia_ms")
        group = x_field if x_field not in NUMERIC_FIELDS else (color_field or "falha_risco")
        if group in ALLOWED_COLUMNS:
            _validate_column(group)
        else:
            group = "falha_risco"
        conditions_b = ["deleted_at IS NULL", f"{field} IS NOT NULL", f"{group} IS NOT NULL"]
        params_b: list = []
        for f2, v in (filters or {}).items():
            if f2 not in ALLOWED_COLUMNS:
                continue
            if isinstance(v, list) and v:
                placeholders = ",".join("?" * len(v))
                conditions_b.append(f"{f2} IN ({placeholders})")
                params_b.extend(v)
            elif isinstance(v, str) and v:
                conditions_b.append(f"{f2} = ?")
                params_b.append(v)
        sql_b = f"SELECT {field}, {group} FROM logs_informativos WHERE {' AND '.join(conditions_b)} LIMIT 2000"
        with _get_connection() as conn:
            rows = conn.execute(sql_b, params_b).fetchall()
        groups_data: dict[str, list] = {}
        for row in rows:
            g = str(row[1]) if row[1] else "Desconhecido"
            if g not in groups_data:
                groups_data[g] = []
            groups_data[g].append(row[0])
        traces = [
            go.Box(
                y=vals,
                name=g,
                marker_color=COLOR_MAP.get(g, DEFAULT_COLORS[i % len(DEFAULT_COLORS)]),
            )
            for i, (g, vals) in enumerate(groups_data.items())
        ]
        fig = go.Figure(data=traces)
        fig.update_layout(yaxis_title=field.replace("_", " ").title())

    # ── HEATMAP ──────────────────────────────────────────────────────────────
    elif chart_type == "heatmap":
        y_col = y_field if y_field and y_field in ALLOWED_COLUMNS else "incidente_status"
        _validate_column(y_col)
        conditions_hm = ["deleted_at IS NULL", f"{x_field} IS NOT NULL", f"{y_col} IS NOT NULL"]
        params_hm: list = []
        for f2, v in (filters or {}).items():
            if f2 not in ALLOWED_COLUMNS:
                continue
            if isinstance(v, list) and v:
                placeholders = ",".join("?" * len(v))
                conditions_hm.append(f"{f2} IN ({placeholders})")
                params_hm.extend(v)
            elif isinstance(v, str) and v:
                conditions_hm.append(f"{f2} = ?")
                params_hm.append(v)
        sql_hm = f"""
            SELECT {x_field}, {y_col}, COUNT(*) as cnt
            FROM logs_informativos
            WHERE {' AND '.join(conditions_hm)}
            GROUP BY {x_field}, {y_col}
        """
        with _get_connection() as conn:
            rows = conn.execute(sql_hm, params_hm).fetchall()
        rows_data = [dict(r) for r in rows]
        x_vals = sorted({str(r[x_field]) for r in rows_data})
        y_vals = sorted({str(r[y_col]) for r in rows_data})
        z = [[0] * len(x_vals) for _ in y_vals]
        xi_map = {v: i for i, v in enumerate(x_vals)}
        yi_map = {v: i for i, v in enumerate(y_vals)}
        for row in rows_data:
            xi = xi_map.get(str(row[x_field]), 0)
            yi = yi_map.get(str(row[y_col]), 0)
            z[yi][xi] = row["cnt"]
        fig = go.Figure(go.Heatmap(
            z=z, x=x_vals, y=y_vals,
            colorscale="Blues",
            text=[[str(v) for v in row] for row in z],
            texttemplate="%{text}",
        ))
        fig.update_layout(
            xaxis_title=x_field.replace("_", " ").title(),
            yaxis_title=y_col.replace("_", " ").title(),
        )

    else:
        raise ValueError(f"Tipo de gráfico não suportado: '{chart_type}'")

    # Aplica layout padrão
    fig.update_layout(
        title=dict(text=title, font=dict(size=15)),
        **LAYOUT_DEFAULTS,
    )

    return json.loads(fig.to_json())
