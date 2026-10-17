import { apiFetch } from './client';

// Tipos y endpoints de autenticación, los mismos que usa el front (src/api/auth.ts)

export type Rol = 'CLIENTE' | 'PROFESIONAL' | 'ADMIN';

// Usuario tal como lo devuelve el backend (sin contraseña ni token de recupero)
export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  fechaNacimiento?: string | null;
  rol: Rol;
  fechaAlta: string;
  fechaBaja: string | null;
  // null: no verificó su email (un cliente sin verificar no puede reservar). Se vuelve null si cambia el email
  emailVerificadoEn?: string | null;
  // Subtipo según el rol: alergia del cliente, legajo del profesional (null si no lo tiene).
  // foto: nombre del archivo de la foto de perfil (null si no tiene); la imagen se pide a GET /users/:id/foto
  cliente?: { alergia: string | null; foto?: string | null } | null;
  profesional?: { legajo: number; foto?: string | null } | null;
}

// Con el header X-Client: mobile el refresh token viene en el body (en la web va en una cookie)
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Usuario;
}

// Lo que pide POST /auth/register (el back siempre crea la cuenta como CLIENTE)
export interface RegisterData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  contrasena: string;
  alergia?: string;
  // "YYYY-MM-DD"
  fechaNacimiento?: string;
}

interface MessageResponse {
  message: string;
}

export const loginRequest = (email: string, contrasena: string) =>
  apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: { email, contrasena } });

export const registerRequest = (data: RegisterData) =>
  apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: data });

// Rota la sesión: devuelve tokens nuevos y el refresh token usado deja de servir
export const refreshRequest = (refreshToken: string) =>
  apiFetch<AuthResponse>('/auth/refresh', { method: 'POST', body: { refreshToken } });

export const logoutRequest = (refreshToken: string) =>
  apiFetch<MessageResponse>('/auth/logout', { method: 'POST', body: { refreshToken } });

// Devuelve una sesión nueva (como el login) y cierra la de los otros dispositivos. 400 si la actual no es correcta
export const changePasswordRequest = (token: string, actual: string, nueva: string) =>
  apiFetch<AuthResponse>('/auth/password', { method: 'PATCH', body: { actual, nueva }, token });

export const meRequest = (token: string) => apiFetch<Usuario>('/auth/me', { token });

// El mail trae un link a la web para elegir la contraseña nueva
export const forgotPasswordRequest = (email: string) =>
  apiFetch<MessageResponse>('/auth/forgot-password', { method: 'POST', body: { email } });
