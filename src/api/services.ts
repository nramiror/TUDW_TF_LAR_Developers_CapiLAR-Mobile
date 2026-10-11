import { apiFetch } from './client';

// Servicios del salón. En mobile solo se consultan (el ABM es del ADMIN, en la web)

export interface Servicio {
  id: number;
  tipo: string;
  descripcion?: string | null;
  // Minutos
  tiempoDuracion: number;
  // El back lo manda como texto con 2 decimales
  precio: string;
  fechaBaja: string | null;
}

// Servicios que ofrece el salón (solo activos), sin iniciar sesión
export const getServicesRequest = () => apiFetch<Servicio[]>('/servicios');

// URL de la foto de un servicio (pública), para usar en <Image source={{ uri }} />
export const servicePhotoPath = (id: number) => `/servicios/${id}/foto`;

// "1 h 30 min", "45 min", "2 h"
export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

// "$ 15.000" o "$ 15.000,50"
export const formatPrice = (precio: string | number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(
    Number(precio),
  );
