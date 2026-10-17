import { File } from 'expo-file-system';

import type { Usuario } from './auth';
import { apiFetch } from './client';

// Perfil propio (CLIENTE o PROFESIONAL): editar datos, foto y darse de baja.
// Los tres endpoints de edición devuelven el usuario actualizado, para refrescar la sesión con updateUser

// Se mandan solo los campos que cambiaron. El email no se edita (es el usuario, igual que en la web)
export interface UpdateProfileData {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  // Solo CLIENTE; null la borra
  alergia?: string | null;
  // "YYYY-MM-DD"; null la borra
  fechaNacimiento?: string | null;
}

// El back acepta JPG, PNG o WEBP de hasta 2 MB
export const FOTO_MAX_BYTES = 2 * 1024 * 1024;

// Una foto de 2 MB con datos móviles tarda más que un JSON
const UPLOAD_TIMEOUT_MS = 30000;

export const updateProfileRequest = (token: string, data: UpdateProfileData) =>
  apiFetch<Usuario>('/users/me', { method: 'PATCH', body: data, token });

// uri: la foto local que devuelve expo-image-picker.
// En Expo 57 el fetch global es expo/fetch, que no acepta el { uri, name, type } de React Native:
// el archivo va como File de expo-file-system (lee los bytes y arma nombre y tipo por la extensión)
export const uploadPhotoRequest = (token: string, uri: string) => {
  const body = new FormData();
  body.append('foto', new File(uri) as unknown as Blob);
  return apiFetch<Usuario>('/users/me/foto', { method: 'PATCH', body, token, timeoutMs: UPLOAD_TIMEOUT_MS });
};

export const deletePhotoRequest = (token: string) => apiFetch<Usuario>('/users/me/foto', { method: 'DELETE', token });

// Manda otro mail con el enlace para verificar el email (400 si ya está verificado)
export const resendVerificationRequest = (token: string) =>
  apiFetch<{ message: string }>('/users/me/verificar-email', { method: 'POST', token });

// Borrado lógico: la cuenta no puede volver a entrar y el token deja de servir
export const deleteAccountRequest = (token: string) => apiFetch<{ message: string }>('/users/me', { method: 'DELETE', token });

// Nombre del archivo de la foto del usuario, según su rol (null si no tiene)
export const userPhoto = (user: Usuario) => user.cliente?.foto ?? user.profesional?.foto ?? null;

// URL de la foto (requiere token). Lleva el nombre del archivo para que la imagen en caché se renueve al cambiarla
export const userPhotoPath = (user: Usuario) => `/users/${user.id}/foto?v=${encodeURIComponent(userPhoto(user) ?? '')}`;

// Cliente tal como lo devuelve la búsqueda del profesional (para cargarle un turno)
export interface ClienteResumen {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  cliente: { alergia: string | null } | null;
}

// Solo PROFESIONAL: clientes activos por nombre, apellido o email, ordenados por apellido
export const searchClientesRequest = (token: string, search: string) =>
  apiFetch<ClienteResumen[]>(`/users/clientes?${new URLSearchParams({ search })}`, { token });
