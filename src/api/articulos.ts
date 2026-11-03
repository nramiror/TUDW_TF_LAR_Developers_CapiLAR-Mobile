import { apiFetch } from './client';
import type { UnidadInsumo } from './fichas';
import { UNIDAD_LABEL } from './fichas';

// F11: stock del salón. El PROFESIONAL ve los artículos, los busca por QR, registra movimientos y maneja el envase abierto.
// Dar de alta, editar y dar de baja artículos es del ADMIN (web)

export type UsoArticulo = 'SALON' | 'VENTA' | 'AMBOS';
export type TipoDeposito = 'SALON' | 'DEPOSITO' | 'VITRINA';
// COMPRA llega con proveedores (F13) y CONSUMO lo genera la ficha técnica al completar el turno: no se cargan a mano
export type TipoMovimiento = 'COMPRA' | 'INGRESO' | 'EGRESO' | 'AJUSTE' | 'CONSUMO';
export type TipoMovimientoManual = 'INGRESO' | 'EGRESO' | 'AJUSTE';

export const TIPOS_MANUALES: TipoMovimientoManual[] = ['INGRESO', 'EGRESO', 'AJUSTE'];

export const MOVIMIENTO_LABEL: Record<TipoMovimiento, string> = {
  COMPRA: 'Compra',
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
  AJUSTE: 'Ajuste',
  CONSUMO: 'Consumo',
};

export const DEPOSITO_LABEL: Record<TipoDeposito, string> = { SALON: 'Salón', DEPOSITO: 'Depósito', VITRINA: 'Vitrina' };

// Mismos límites que CreateMovimientoDto del back
export const MAX_MOTIVO_MOVIMIENTO = 255;
export const MAX_COMPROBANTE = 30;

// Los decimales llegan como texto sin ceros de más ("3.5", "15000")
export interface Articulo {
  id: number;
  nombre: string;
  codigo: string | null;
  uso: UsoArticulo;
  tipoProducto: string;
  // En envases, con hasta 3 decimales
  stock: string;
  stockMinAlert: string;
  fechaVencimiento: string | null;
  precioCosto: string;
  precioVenta: string | null;
  // Contenido de un envase lleno, en tipoPeso
  pesoInicial: string;
  tipoPeso: UnidadInsumo;
  tonalidad: string | null;
  tipoDeposito: TipoDeposito;
  // Texto del QR (ej. "ART-7K2M9QXP")
  qr: string;
  marcaId: number;
  fechaAlta: string;
  fechaBaja: string | null;
  marca: { id: number; razonSocial: string; linea: string | null };
  // El envase abierto, o null si no hay ninguno
  envaseEnUso: { pesoActual: string; tipoPeso: UnidadInsumo } | null;
  bajoStock: boolean;
}

export interface Movimiento {
  id: number;
  remitoId: number;
  fecha: string;
  tipo: TipoMovimiento;
  estado: 'PENDIENTE' | 'APLICADO' | 'ANULADO';
  // Con signo: lo que cambió el stock (negativa en un egreso o un ajuste que baja)
  cantidad: string;
  motivo: string | null;
  numComprobante: string | null;
  usuario: { id: number; nombre: string; apellido: string } | null;
}

// Formato de todas las listas paginadas del back
export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface MovimientoData {
  tipo: TipoMovimientoManual;
  // En envases. INGRESO y EGRESO: cuánto entra o sale. AJUSTE: el stock que se contó (el back calcula la diferencia)
  cantidad: number;
  motivo?: string;
  numComprobante?: string;
}

export interface MovimientoCreado {
  movimiento: Movimiento;
  articulo: Articulo;
  // Un egreso puede dejar el stock en negativo: se permite, pero hay que avisar
  stockNegativo: boolean;
}

export const MOVIMIENTOS_POR_PAGINA = 20;

export const getArticulosRequest = (token: string, search?: string) => {
  const query = search ? `?${new URLSearchParams({ search })}` : '';
  return apiFetch<Articulo[]>(`/articulos${query}`, { token });
};

export const getArticuloRequest = (token: string, id: number) => apiFetch<Articulo>(`/articulos/${id}`, { token });

// También devuelve los dados de baja (con fechaBaja); 404 si el código no es de ningún artículo
export const getArticuloPorQrRequest = (token: string, codigo: string) =>
  apiFetch<Articulo>(`/articulos/qr/${encodeURIComponent(codigo)}`, { token });

export const createMovimientoRequest = (token: string, articuloId: number, data: MovimientoData) =>
  apiFetch<MovimientoCreado>(`/articulos/${articuloId}/movimientos`, { method: 'POST', body: data, token });

// Del más nuevo al más viejo. Una página después de la última trae items vacío
export const getMovimientosRequest = (token: string, articuloId: number, pagina: number) =>
  apiFetch<Pagina<Movimiento>>(
    `/articulos/${articuloId}/movimientos?${new URLSearchParams({ pagina: String(pagina), porPagina: String(MOVIMIENTOS_POR_PAGINA) })}`,
    { token },
  );

// --- Envase abierto (ninguna de las tres mueve el stock) ---

// Abre uno lleno y reemplaza al que estaba abierto
export const abrirEnvaseRequest = (token: string, articuloId: number) =>
  apiFetch<Articulo>(`/articulos/${articuloId}/envase-en-uso`, { method: 'POST', token });

// De 0 al contenido del envase (pesoInicial), con hasta 2 decimales
export const actualizarEnvaseRequest = (token: string, articuloId: number, pesoActual: number) =>
  apiFetch<Articulo>(`/articulos/${articuloId}/envase-en-uso`, { method: 'PATCH', body: { pesoActual }, token });

export const terminarEnvaseRequest = (token: string, articuloId: number) =>
  apiFetch<{ message: string }>(`/articulos/${articuloId}/envase-en-uso`, { method: 'DELETE', token });

// --- Formato ---

// "3.5" -> "3,5"; "1500" -> "1.500"
export const formatCantidad = (value: string | number) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(Number(value));

// "1 envase", "3,5 envases"
export const formatEnvases = (value: string | number) => `${formatCantidad(value)} ${Math.abs(Number(value)) === 1 ? 'envase' : 'envases'}`;

// Lo que cambió el stock en un movimiento: "+2 envases", "−0,5 envases"
export const formatVariacion = (cantidad: string) => {
  const value = Number(cantidad);
  if (value === 0) return 'Sin cambios';
  return `${value > 0 ? '+' : '−'}${formatEnvases(Math.abs(value))}`;
};

// Fecha y hora de un movimiento (llega en ISO): "03/11/2026 15:40"
export const formatFechaHora = (iso: string) => {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// "50 g", "1.000 ml", "3 unidades"
export const formatPeso = (value: string | number, unidad: UnidadInsumo) =>
  `${formatCantidad(value)} ${unidad === 'UNIDAD' && Number(value) !== 1 ? 'unidades' : UNIDAD_LABEL[unidad]}`;

// "Wella Koleston Perfect"
export const formatMarca = (marca: Articulo['marca']) => (marca.linea ? `${marca.razonSocial} ${marca.linea}` : marca.razonSocial);
