// Igual que src/api/client.ts del front. Cambia de dónde sale la URL:
// en Expo las variables públicas se leen con process.env.EXPO_PUBLIC_* (ver .env.example)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// Error con el mensaje que devuelve el backend
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  // JWT del usuario logueado
  token?: string | null;
  // Para subir archivos (fotos) más grandes que un JSON
  timeoutMs?: number;
}

// Si el back no contesta en este tiempo, se corta (en el celular un fetch colgado no avisa nada)
const TIMEOUT_MS = 10000;

// Lo registra el AuthProvider: ante un 401 pide un access token nuevo con el refresh token.
// Recibe el token que falló y devuelve el nuevo, o null si la sesión venció (hay que volver a entrar)
type TokenRefresher = (failedToken: string) => Promise<string | null>;
let tokenRefresher: TokenRefresher | null = null;

export const setTokenRefresher = (refresher: TokenRefresher | null) => {
  tokenRefresher = refresher;
};

export const SESSION_EXPIRED_MESSAGE = 'Tu sesión venció. Iniciá sesión de nuevo.';

// Wrapper de fetch: arma la URL, manda y recibe JSON y convierte los errores del backend en ApiError.
// Si un pedido con token da 401 (el access token dura 15 min), renueva la sesión y lo reintenta una vez
export const apiFetch = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { token } = options;
  try {
    return await request<T>(path, options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !token || !tokenRefresher) throw error;
    const newToken = await tokenRefresher(token);
    if (!newToken) throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
    return request<T>(path, { ...options, token: newToken });
  }
};

// Con FormData (fotos) se manda tal cual: fetch arma solo el Content-Type multipart con su boundary
const request = async <T>(path: string, { method = 'GET', body, token, timeoutMs = TIMEOUT_MS }: RequestOptions): Promise<T> => {
  const isFormData = body instanceof FormData;
  // X-Client: mobile hace que el back mande y reciba el refresh token en el body (la app no usa la cookie httpOnly de la web)
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Client': 'mobile' };
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    // Puede no ser la red (por ejemplo, un body que fetch no sabe mandar): en desarrollo queda el error real en la terminal de Expo
    if (__DEV__) console.warn(`apiFetch ${method} ${path}:`, error);
    throw new ApiError('No se pudo conectar con el servidor. Revisá tu conexión y probá de nuevo.', 0);
  } finally {
    clearTimeout(timeout);
  }

  // Algunos endpoints (como GET /) responden texto plano en lugar de JSON
  const text = await response.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // No era JSON: queda el texto tal cual
  }

  if (!response.ok) {
    // NestJS responde { message: string | string[] }; con varios mensajes se muestra el primero
    const raw = (data as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(raw) ? raw[0] : raw;
    throw new ApiError(message ?? 'Ocurrió un error inesperado. Probá de nuevo.', response.status);
  }

  return data as T;
};

// Para probar desde la app que el celular llega al backend (GET / responde "Hello World!")
export const pingRequest = () => apiFetch<string>('/');
