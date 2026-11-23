import { apiFetch } from './client';

// Lista de alergias del salón (la arma el ADMIN en la web). La clienta elige de la lista y lo que no está
// va como texto libre en `alergia` ("Otra")

export interface Alergia {
  id: number;
  nombre: string;
  descripcion: string | null;
}

// Así viene en el cliente (perfil, turnos, búsqueda): también las que el salón dio de baja después de elegirlas
export interface AlergiaCliente {
  id: number;
  nombre: string;
}

// Mismo tope que el back (MAX_ALERGIAS)
export const MAX_ALERGIAS = 30;

// Público (lo usa el registro): solo las activas, por nombre
export const getAlergiasRequest = () => apiFetch<Alergia[]>('/alergias');

// Lo que se muestra: las de la lista y la "Otra". "Amoníaco, Látex, aceite de coco"; vacío si no tiene ninguna
export const formatAlergias = (cliente: { alergias?: AlergiaCliente[]; alergia: string | null } | null | undefined) =>
  [...(cliente?.alergias ?? []).map((alergia) => alergia.nombre), cliente?.alergia?.trim()].filter(Boolean).join(', ');
