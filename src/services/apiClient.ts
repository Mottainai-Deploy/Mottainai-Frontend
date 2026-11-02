import type { ApiPage, ApiRequestOptions, ApiSession } from '@/types/api.types';
import type { PendingApiRead } from '@/types/api-read.types';
import { apiErrorMessage } from '@/utils/apiErrorMessages';

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// Sessão real fica em memória: um recarregamento exige novo login.
let session: ApiSession | null = null;
let sessionRevision = 0;
let readRevision = 0;
let refreshOperation: Promise<void> | null = null;
const pendingReads = new Map<string, PendingApiRead>();

function invalidateApiReads(): void {
  readRevision += 1;
  pendingReads.clear();
}

// Identifica o contexto das leituras sem expor os tokens da sessão.
export function getApiReadRevision(): number {
  return readRevision;
}

function isAbortError(error: unknown): error is Error {
  return typeof error === 'object' && error !== null && 'name' in error
    && error.name === 'AbortError' && 'message' in error && typeof error.message === 'string';
}

export function serviceError(error: unknown, message: string): Error {
  return error instanceof Error || isAbortError(error) ? error : new Error(message, { cause: error });
}

export function setApiSession(value: ApiSession | null): void {
  invalidateApiReads();
  sessionRevision += 1;
  refreshOperation = null;
  session = value;
}

function expireSession(): void {
  setApiSession(null);
  window.dispatchEvent(new Event('mottainai:session-expired'));
}

async function refreshSession(): Promise<void> {
  if (!session) throw new ApiRequestError('Entre novamente para continuar.', 401);
  const previous = session;
  const revision = sessionRevision;
  try {
    const next = await apiRequest<ApiSession>('/auth/refresh', {
      method: 'POST', authenticated: false, body: { refreshToken: previous.refreshToken },
    });
    if (session === previous && revision === sessionRevision) session = next;
  } catch (error) {
    if (session === previous && revision === sessionRevision) expireSession();
    throw error;
  }
}

// Apenas leituras simultâneas simples são compartilhadas; resultados não ficam em cache.
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    invalidateApiReads();
    try { return await sendApiRequest<T>(path, options); }
    finally { invalidateApiReads(); }
  }
  if (Object.keys(options).some(key => !['method', 'signal', 'authenticated'].includes(key))) {
    return sendApiRequest<T>(path, options);
  }
  const signal = options.signal;
  signal?.throwIfAborted();
  const key = JSON.stringify([sessionRevision, options.authenticated ?? true, path]);
  let entry = pendingReads.get(key);
  if (!entry) {
    const controller = new AbortController();
    entry = { controller, subscribers: 0, promise: sendApiRequest<T>(path, { ...options, signal: controller.signal }) };
    pendingReads.set(key, entry);
    const current = entry;
    const remove = () => { if (pendingReads.get(key) === current) pendingReads.delete(key); };
    void entry.promise.then(remove, remove);
  }
  const current = entry;
  current.subscribers += 1;
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const release = () => {
      settled = true;
      signal?.removeEventListener('abort', abort);
      current.subscribers -= 1;
    };
    const abort = () => {
      if (settled) return;
      release();
      if (current.subscribers === 0) {
        if (pendingReads.get(key) === current) pendingReads.delete(key);
        current.controller.abort();
      }
      reject(signal?.reason ?? new DOMException('Consulta cancelada.', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    void current.promise.then(value => {
      if (!settled) { release(); resolve(value as T); }
    }, error => {
      if (!settled) { release(); reject(error); }
    });
  });
}

async function sendApiRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const { body, authenticated = true, ...init } = options;
  const revision = sessionRevision;
  try {
    const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (!base) throw new ApiRequestError('A URL da API não foi configurada neste ambiente.', 0);
    if (authenticated && !session) throw new ApiRequestError('Entre na sua conta para continuar.', 401);
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    const serializedBody = body === undefined ? undefined : JSON.stringify(body);
    let sentSession = session;
    const checkSession = () => {
      if (authenticated && revision !== sessionRevision) throw new ApiRequestError('A sessão mudou. Repita a consulta na conta atual.', 401);
    };
    const send = () => {
      checkSession();
      init.signal?.throwIfAborted();
      sentSession = session;
      if (authenticated && session) headers.set('Authorization', `Bearer ${session.accessToken}`);
      return fetch(`${base.replace(/\/$/, '')}${path}`, {
        ...init, headers, body: serializedBody,
      });
    };
    let response = await send();
    checkSession();
    if (response.status === 401 && authenticated && session) {
      // Um 401 atrasado pode pertencer ao token que outra consulta já renovou.
      if (session === sentSession) {
        if (!refreshOperation) {
          const operation = refreshSession().finally(() => {
            if (refreshOperation === operation) refreshOperation = null;
          });
          refreshOperation = operation;
        }
        await refreshOperation;
      }
      checkSession();
      if (!session) throw new ApiRequestError('Sua sessão terminou. Entre novamente.', 401);
      response = await send();
      checkSession();
    }
    if (!response.ok) {
      if (response.status === 401 && authenticated) expireSession();
      const payload: unknown = await response.json().catch(() => null);
      const message = apiErrorMessage(payload, response.status);
      throw new ApiRequestError(message, response.status);
    }
    if (response.status === 204) return undefined as T;
    const result: unknown = await response.json();
    checkSession();
    return result as T;
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof ApiRequestError) throw error;
    throw new Error(error instanceof TypeError
      ? 'Não foi possível acessar a API. Verifique sua conexão e tente novamente.'
      : 'Não foi possível interpretar a resposta da API. Tente novamente mais tarde.', { cause: error });
  }
}

export async function apiPages<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const revision = sessionRevision;
  try {
    const records: T[] = [];
    for (let page = 0; ; page += 1) {
      const separator = path.includes('?') ? '&' : '?';
      const result = await apiRequest<ApiPage<T>>(`${path}${separator}page=${page}&size=100`, { signal });
      if (revision !== sessionRevision) throw new ApiRequestError('A sessão mudou. Repita a consulta na conta atual.', 401);
      if (!result || !Array.isArray(result.content) || typeof result.last !== 'boolean'
        || (result.number !== undefined && result.number !== page)) {
        throw new Error('A API retornou uma página inválida.');
      }
      records.push(...result.content);
      if (result.last || result.content.length === 0) return records;
    }
  } catch (error) {
    throw serviceError(error, 'Não foi possível carregar a listagem.');
  }
}

export async function endApiSession(): Promise<void> {
  const current = session;
  const revision = sessionRevision;
  try {
    if (current) await apiRequest<void>('/auth/logout', {
      method: 'POST', body: { refreshToken: current.refreshToken },
    });
  } catch (error) {
    throw serviceError(error, 'Não foi possível revogar a sessão no servidor.');
  } finally {
    if (revision === sessionRevision) setApiSession(null);
  }
}
