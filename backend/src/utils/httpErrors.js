// Classe HttpError para erros HTTP com código semântico.
// Usada pelos controllers e middlewares para sinalizar erros esperados
// (ex.: 404 Not Found, 401 Unauthorized) de forma uniforme.
// TODO (Fase 2): implementar conforme seção 6.6

export class HttpError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
