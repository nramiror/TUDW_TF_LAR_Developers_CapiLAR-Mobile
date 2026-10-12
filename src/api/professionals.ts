import { apiFetch } from './client';
import type { Servicio } from './services';
import { MAX_DIAS_ANTICIPACION, addDays, toIsoDate } from './turnos';

// Profesionales, sus servicios y sus horarios: lo que necesita el cliente para reservar.
// La carga de horarios del profesional se suma cuando se haga su agenda en mobile.

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

// Los horarios se consultan de a 31 días
export const MAX_DIAS_CONSULTA = 31;

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

// Fechas con horario cargado de hoy a 60 días (lo que se puede reservar), en dos pedidos de hasta 31 días
export const getUpcomingWorkDatesRequest = async (token: string, legajo: number) => {
  const today = new Date();
  const ranges = [0, MAX_DIAS_CONSULTA].map((offset) => [
    toIsoDate(addDays(today, offset)),
    toIsoDate(addDays(today, Math.min(offset + MAX_DIAS_CONSULTA - 1, MAX_DIAS_ANTICIPACION))),
  ]);
  const parts = await Promise.all(ranges.map(([desde, hasta]) => getAvailabilityRequest(token, legajo, desde, hasta)));
  return [...new Set(parts.flat().map((horario) => horario.fecha))];
};

// URL de la foto de un profesional (requiere token), para usar con expo-image y el header Authorization
export const professionalPhotoPath = (legajo: number) => `/profesionales/${legajo}/foto`;
