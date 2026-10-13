import { apiFetch } from './client';
import type { Servicio } from './services';
import { upcomingRanges } from './turnos';

// Profesionales, sus servicios y sus horarios: lo que necesita el cliente para reservar
// y lo que el profesional gestiona de su agenda (días y horarios de trabajo).

export interface ProfesionalResumen {
  legajo: number;
  nombre: string;
  apellido: string;
  tieneFoto?: boolean;
}

// Horario de trabajo de una fecha ("YYYY-MM-DD"), con horas "HH:mm"
export interface Disponibilidad {
  id: number;
  fecha: string;
  horarioInicio: string;
  horarioFin: string;
}

// Una jornada no puede superar las 12 horas (sumando los horarios del día)
export const MAX_HORAS_JORNADA = 12;

// Público: con servicioId, solo los que hacen ese servicio
export const getProfessionalsRequest = (servicioId?: number) =>
  apiFetch<ProfesionalResumen[]>(servicioId ? `/profesionales?servicioId=${servicioId}` : '/profesionales');

// Solo los servicios activos que hace el profesional
export const getProfessionalServicesRequest = (token: string, legajo: number) =>
  apiFetch<Servicio[]>(`/profesionales/${legajo}/servicios`, { token });

// Servicios del profesional logueado: los elige él del catálogo (el ADMIN ya no se los asigna)
export const getMyServicesRequest = (token: string) => apiFetch<Servicio[]>('/profesionales/me/servicios', { token });

// 409 si ya lo tenía
export const addMyServiceRequest = (token: string, servicioId: number) =>
  apiFetch<Servicio>('/profesionales/me/servicios', { method: 'POST', body: { servicioId }, token });

// Los turnos ya reservados con ese servicio se mantienen
export const removeMyServiceRequest = (token: string, servicioId: number) =>
  apiFetch<{ message: string }>(`/profesionales/me/servicios/${servicioId}`, { method: 'DELETE', token });

// Horarios entre dos fechas (incluidas, de a 31 días como máximo), por fecha y hora
export const getAvailabilityRequest = (token: string, legajo: number, desde: string, hasta: string) =>
  apiFetch<Disponibilidad[]>(`/profesionales/${legajo}/disponibilidad?${new URLSearchParams({ desde, hasta })}`, { token });

// Horarios cargados de hoy a 60 días (lo que se puede reservar), en dos pedidos de hasta 31 días
export const getUpcomingAvailabilityRequest = async (token: string, legajo: number) => {
  const parts = await Promise.all(upcomingRanges().map(([desde, hasta]) => getAvailabilityRequest(token, legajo, desde, hasta)));
  return parts.flat();
};

// Fechas con horario cargado de hoy a 60 días
export const getUpcomingWorkDatesRequest = async (token: string, legajo: number) => {
  const horarios = await getUpcomingAvailabilityRequest(token, legajo);
  return [...new Set(horarios.map((horario) => horario.fecha))];
};

// El mismo horario en varias fechas (hasta 31; se guardan todas o ninguna). 409 si se superpone con otro horario de alguna de esas fechas
export const createAvailabilityRequest = (token: string, legajo: number, fechas: string[], horarioInicio: string, horarioFin: string) =>
  apiFetch<Disponibilidad[]>(`/profesionales/${legajo}/disponibilidad`, {
    method: 'POST',
    body: { fechas, horarioInicio, horarioFin },
    token,
  });

// 409 si hay turnos reservados dentro de ese horario
export const deleteAvailabilityRequest = (token: string, legajo: number, id: number) =>
  apiFetch<{ message: string }>(`/profesionales/${legajo}/disponibilidad/${id}`, { method: 'DELETE', token });

// URL de la foto de un profesional (requiere token), para usar con expo-image y el header Authorization
export const professionalPhotoPath = (legajo: number) => `/profesionales/${legajo}/foto`;
