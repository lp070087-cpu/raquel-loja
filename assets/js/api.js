// Cookies HttpOnly carry the session; browser storage never carries credentials.
export const apiBase = (globalThis.RAQUEL_API_URL || document.querySelector('meta[name="api-url"]')?.content || (['localhost', '127.0.0.1'].includes(location.hostname) ? `http://${location.hostname}:3001/api` : '/api')).replace(/\/$/, '');
let csrfToken;
let csrfRequest;
export class ApiError extends Error {
  constructor(message, status, details) { super(message); this.name = 'ApiError'; this.status = status; this.details = details; }
}
export async function getCsrf() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) csrfRequest = fetch(`${apiBase}/auth/csrf`, { credentials: 'include', signal: AbortSignal.timeout(15000) }).then(async response => {
    if (!response.ok) throw new ApiError('Não foi possível iniciar uma conexão segura.', response.status);
    csrfToken = (await response.json()).csrfToken;
    return csrfToken;
  }).catch(error => { if (error instanceof ApiError) throw error; throw new ApiError('Não foi possível conectar à loja. Verifique sua conexão e tente novamente.', 0); }).finally(() => { csrfRequest = null; });
  return csrfRequest;
}
export async function api(path, options = {}) {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) headers.set('X-CSRF-Token', await getCsrf());
  let response;
  try { response = await fetch(`${apiBase}${path}`, { ...options, method, headers, signal: options.signal || AbortSignal.timeout(15000), credentials: 'include', body: options.body === undefined ? undefined : JSON.stringify(options.body) }); }
  catch { throw new ApiError('Não foi possível conectar à loja. Verifique sua conexão e tente novamente.', 0); }
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && ['UNAUTHORIZED', 'SESSION_EXPIRED'].includes(data.error)) window.dispatchEvent(new CustomEvent('raquel:session-expired'));
    const explanation = typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : 'Não foi possível concluir. Verifique os dados e tente novamente.';
    throw new ApiError(explanation, response.status, data);
  }
  return data;
}
