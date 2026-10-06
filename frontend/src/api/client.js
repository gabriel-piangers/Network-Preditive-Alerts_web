/**
 * Wrapper de fetch centralizado.
 * Usa VITE_API_URL como base, envia/recebe JSON e lança erros padronizados.
 * Conforme seção 7.2 do SPEC.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/**
 * Erro da API com status HTTP, code e message padronizados.
 */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details ?? null;
  }
}

/**
 * Erro de rede (API inacessível).
 */
export class NetworkError extends Error {
  constructor() {
    super('Não foi possível conectar ao servidor. Verifique sua conexão.');
    this.name = 'NetworkError';
  }
}

/**
 * Realiza uma requisição à API.
 *
 * @param {string} path   Caminho relativo (ex.: "/api/alerts")
 * @param {RequestInit} [options]
 * @returns {Promise<any>} Corpo da resposta parseado como JSON (ou undefined para 204)
 */
export async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new NetworkError();
  }

  // 204 No Content — sem corpo
  if (response.status === 204) {
    return undefined;
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(response.status, 'PARSE_ERROR', 'Resposta inválida do servidor.');
  }

  if (!response.ok) {
    const err = body?.error ?? {};
    throw new ApiError(
      response.status,
      err.code ?? 'API_ERROR',
      err.message ?? 'Ocorreu um erro na requisição.',
      err.details ?? null,
    );
  }

  return body;
}
