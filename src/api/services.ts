import { apiFetch } from './client';

// Servicios del salón. En mobile solo se consultan (el ABM es del ADMIN, en la web)

export interface Servicio {
  id: number;
  tipo: string;
  descripcion?: string | null;
  // Nombre del archivo de la foto (null si no tiene); la imagen es pública en GET /servicios/:id/foto
  foto?: string | null;
  // Minutos
  tiempoDuracion: number;
  // El back lo manda como texto con 2 decimales
  precio: string;
  // Si es true, la reserva del cliente queda PENDIENTE hasta que un profesional la acepte; si no, nace CONFIRMADA
  requiereEvaluacion: boolean;
  // Para agruparlos en el catálogo (PWA-288: todo servicio tiene una)
  categoria: Categoria;
  fechaBaja: string | null;
}

export interface Categoria {
  id: number;
  nombre: string;
}

// Servicios que ofrece el salón (solo activos), sin iniciar sesión
export const getServicesRequest = () => apiFetch<Servicio[]>('/servicios');

// Agrupa los servicios por categoría, con las categorías por nombre (el orden de los servicios se mantiene). Igual que la web
export const agruparPorCategoria = <T extends Pick<Servicio, 'categoria'>>(servicios: T[]) => {
  const grupos = new Map<number, { categoria: Categoria; servicios: T[] }>();
  for (const servicio of servicios) {
    const grupo = grupos.get(servicio.categoria.id) ?? { categoria: servicio.categoria, servicios: [] };
    grupo.servicios.push(servicio);
    grupos.set(servicio.categoria.id, grupo);
  }
  return [...grupos.values()].sort((a, b) => a.categoria.nombre.localeCompare(b.categoria.nombre, 'es'));
};

// URL de la foto de un servicio (pública), para usar en <Image source={{ uri }} />
export const servicePhotoPath = (id: number) => `/servicios/${id}/foto`;

// "1 h 30 min", "45 min", "2 h"
export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

// Duración de un servicio: "50 min mínimo", "1h mínimo", "1h y 30 min mínimo".
// Es lo mínimo que lleva; según el cabello puede durar más
export const formatServiceDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const time = !hours ? `${rest} min` : rest ? `${hours}h y ${rest} min` : `${hours}h`;
  return `${time} mínimo`;
};

// "$ 15.000" o "$ 15.000,50"
export const formatPrice = (precio: string | number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(
    Number(precio),
  );
