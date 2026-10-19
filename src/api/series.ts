import { apiFetch } from './client';
import type { EstadoTurno } from './turnos';
import { MAX_DIAS_ANTICIPACION, addDays, fromIsoDate, toIsoDate } from './turnos';

// F05: turnos recurrentes. El profesional repite un servicio de un turno CONFIRMADO suyo, a la misma hora,
// cada tantos días, hasta 60 días desde hoy. La clienta solo las ve (y reserva otro horario en las fechas ocupadas)

export type FrecuenciaSerie = 'SEMANAL' | 'QUINCENAL' | 'CADA_20_DIAS' | 'MENSUAL';
export type EstadoSerie = 'ACTIVA' | 'SUSPENDIDA' | 'BAJA';
// LIBRE: se reserva. SIN_HORARIO: se reserva igual, pero el profesional no cargó su horario ese día.
// OCUPADA: no se reserva; trae otros horarios libres de ese día
export type EstadoFecha = 'LIBRE' | 'SIN_HORARIO' | 'OCUPADA';

// Mismos días que el back (MENSUAL es cada 4 semanas, así cae siempre el mismo día de la semana)
export const DIAS_FRECUENCIA: Record<FrecuenciaSerie, number> = {
  SEMANAL: 7,
  QUINCENAL: 14,
  CADA_20_DIAS: 20,
  MENSUAL: 28,
};

export const FRECUENCIA_LABEL: Record<FrecuenciaSerie, string> = {
  SEMANAL: 'Cada semana',
  QUINCENAL: 'Cada 2 semanas',
  CADA_20_DIAS: 'Cada 20 días',
  MENSUAL: 'Cada 4 semanas',
};

export const FRECUENCIAS = Object.keys(DIAS_FRECUENCIA) as FrecuenciaSerie[];

export interface SerieData {
  turnoId: number;
  // Servicio del turno que se repite (id de detalles[]); el back lo exige si el turno tiene varios del profesional
  turnoDetalleId?: number;
  frecuencia: FrecuenciaSerie;
  // "YYYY-MM-DD", hasta 60 días desde hoy
  fechaFin: string;
}

interface SerieBase {
  turnoOrigenId: number;
  cliente: { id: number; nombre: string; apellido: string };
  legajo: number;
  profesional: string;
  servicioId: number;
  servicio: string;
  frecuencia: FrecuenciaSerie;
  horaInicio: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface FechaPlanificada {
  fecha: string;
  estado: EstadoFecha;
  motivo: string | null;
  horariosLibres: string[];
}

export interface VistaPreviaSerie extends SerieBase {
  fechas: FechaPlanificada[];
}

// Al crearla: cada fecha con el turno que se reservó (null en las OCUPADA)
export interface SerieCreada extends VistaPreviaSerie {
  id: number;
  estado: EstadoSerie;
  fechas: (FechaPlanificada & { turnoId: number | null })[];
}

export interface FechaSerie {
  fecha: string;
  // null: estaba ocupada al crear la serie, o la serie está suspendida
  turno: { id: number; horaInicio: string; horaFin: string; estado: EstadoTurno } | null;
}

export interface Serie extends SerieBase {
  id: number;
  estado: EstadoSerie;
  fechas: FechaSerie[];
}

// --- PROFESIONAL ---

export const previewSerieRequest = (token: string, data: SerieData) =>
  apiFetch<VistaPreviaSerie>('/series/vista-previa', { method: 'POST', body: data, token });

export const createSerieRequest = (token: string, data: SerieData) =>
  apiFetch<SerieCreada>('/series', { method: 'POST', body: data, token });

// Suspender y dar de baja cancelan los turnos que no empezaron (el motivo es opcional y le llega a la clienta)
export const suspendSerieRequest = (token: string, id: number, motivo?: string) =>
  apiFetch<Serie>(`/series/${id}/suspender`, { method: 'PATCH', body: motivo ? { motivo } : {}, token });

// Vuelve a reservar las fechas por delante (las que canceló la clienta no)
export const reactivateSerieRequest = (token: string, id: number) =>
  apiFetch<Serie>(`/series/${id}/reactivar`, { method: 'PATCH', token });

export const endSerieRequest = (token: string, id: number, motivo?: string) =>
  apiFetch<Serie>(`/series/${id}/baja`, { method: 'PATCH', body: motivo ? { motivo } : {}, token });

// --- Los dos roles: el profesional ve las que gestiona; la clienta, las suyas. Más nuevas primero ---

export const getSeriesRequest = (token: string) => apiFetch<Serie[]>('/series', { token });

// --- Fechas ---

// Fechas en que puede terminar una serie que sale de `fechaOrigen`: la del turno + N, + 2N... desde mañana
// y hasta 60 días desde hoy (mismo cálculo que el back)
export const fechasFinPosibles = (fechaOrigen: string, frecuencia: FrecuenciaSerie) => {
  const hoy = toIsoDate(new Date());
  const limite = toIsoDate(addDays(new Date(), MAX_DIAS_ANTICIPACION));
  const dias = DIAS_FRECUENCIA[frecuencia];
  const fechas: string[] = [];
  for (let fecha = toIsoDate(addDays(fromIsoDate(fechaOrigen), dias)); fecha <= limite; fecha = toIsoDate(addDays(fromIsoDate(fecha), dias))) {
    if (fecha > hoy) fechas.push(fecha);
  }
  return fechas;
};

// La clienta puede reservar otro horario en una fecha sin turno de una serie activa que todavía no pasó
export const puedeElegirHorario = (serie: Serie, fecha: FechaSerie) =>
  serie.estado === 'ACTIVA' && fecha.turno === null && fecha.fecha >= toIsoDate(new Date());
