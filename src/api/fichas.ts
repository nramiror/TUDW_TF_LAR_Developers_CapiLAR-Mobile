import { File } from 'expo-file-system';

import type { Articulo } from './articulos';
import { apiFetch } from './client';

// F08: ficha técnica de un servicio del turno (la carga su profesional con el turno CONFIRMADO) e historial capilar.
// La ficha se cierra cuando el turno se completa: desde ahí es historial y no se edita

export type NivelCapilar = 'BAJA' | 'MEDIA' | 'ALTA';
export type TipoDePelo = 'LISO' | 'ONDULADO' | 'RIZADO' | 'AFRO';
export type VolumenDePelo = 'FINO' | 'MEDIO' | 'GRUESO';
export type UnidadInsumo = 'G' | 'ML' | 'UNIDAD';
export type MomentoFoto = 'ANTES' | 'DESPUES';

// Textos de la interfaz para cada opción
export const NIVEL_LABEL: Record<NivelCapilar, string> = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta' };
export const TIPO_DE_PELO_LABEL: Record<TipoDePelo, string> = { LISO: 'Liso', ONDULADO: 'Ondulado', RIZADO: 'Rizado', AFRO: 'Afro' };
export const VOLUMEN_LABEL: Record<VolumenDePelo, string> = { FINO: 'Fino', MEDIO: 'Medio', GRUESO: 'Grueso' };
export const UNIDAD_LABEL: Record<UnidadInsumo, string> = { G: 'g', ML: 'ml', UNIDAD: 'unidad' };

// Dónde se aplica una fórmula. Se guarda como texto en `descripcion`, igual que la web: lo que no está en la
// lista va como "Otra" (escrito a mano)
export const ZONAS_FORMULA = ['Raíz', 'Medios', 'Puntas', 'Medios y puntas', 'Total', 'Mechas', 'Flequillo'];

// Límites del back
export const MAX_FORMULAS = 10;
export const MAX_INSUMOS = 20;
export const MAX_FOTOS_POR_MOMENTO = 5;

export interface FormulaInsumo {
  id?: number;
  producto: string;
  marca: string | null;
  tono: string | null;
  // El back lo devuelve como texto ("30" o "12.5") y lo recibe como número
  cantidad: string | number | null;
  unidad: UnidadInsumo | null;
  // F11: artículo del stock (uso SALON o AMBOS). Con él, el back completa producto, marca, tono y unidad,
  // la cantidad es obligatoria y al completar el turno se descuenta del stock
  articuloId?: number | null;
  // Lo que costó (precio de costo proporcional), calculado al completar el turno. null en texto libre o ficha abierta
  costoSubtotal?: string | null;
}

export interface Formula {
  id?: number;
  // Ej. "Raíz", "Medios y puntas"
  descripcion: string | null;
  oxidanteVolumen: number | null;
  // Minutos
  tiempoPoseMin: number | null;
  insumos: FormulaInsumo[];
}

export interface FotoFicha {
  id: number;
  tipo: MomentoFoto;
  creadaEn: string;
}

// Lo que se carga o edita (todo opcional). En la edición, null borra el campo y `formulas` reemplaza todas
export interface FichaData {
  porosidad: NivelCapilar | null;
  elasticidad: NivelCapilar | null;
  // 0 a 100
  porcentajeCanas: number | null;
  tipoDePelo: TipoDePelo | null;
  volumenDePelo: VolumenDePelo | null;
  tratamientosPrevios: string | null;
  // Solo para el salón
  observacionesInternas: string | null;
  // Cuidados para la clienta (es lo único que ve, junto con las fotos)
  indicacionesCliente: string | null;
  formulas: Formula[];
}

// Ficha completa, como la ve un profesional
export interface Ficha extends FichaData {
  id: number;
  creadaEn: string;
  actualizadaEn: string;
  // Fecha en que se completó el turno; null mientras se puede editar
  cerradaEn: string | null;
  fotos: FotoFicha[];
  turnoId: number;
  turnoDetalleId: number;
  clienteId: number;
  // Del turno: "YYYY-MM-DD" y "HH:mm"
  fecha: string;
  horaInicio: string;
  servicio: string;
  legajo: number;
  profesional: string;
}

// Lo que ve la clienta de sus fichas cerradas: sin diagnóstico, fórmulas ni observaciones internas
export interface FichaCliente {
  id: number;
  turnoId: number;
  fecha: string;
  horaInicio: string;
  servicio: string;
  profesional: string;
  indicacionesCliente: string | null;
  fotos: FotoFicha[];
}

// Una foto de 2 MB con datos móviles tarda más que un JSON
const UPLOAD_TIMEOUT_MS = 30000;

// PROFESIONAL de ese servicio, con el turno CONFIRMADO. 409 si ese servicio ya tiene ficha
export const createFichaRequest = (token: string, turnoId: number, turnoDetalleId: number, data: FichaData) =>
  apiFetch<Ficha>(`/turnos/${turnoId}/fichas`, { method: 'POST', body: { turnoDetalleId, ...data }, token });

// Solo mientras está abierta (400 si el turno ya se completó)
export const updateFichaRequest = (token: string, id: number, data: FichaData) =>
  apiFetch<Ficha>(`/fichas/${id}`, { method: 'PATCH', body: data, token });

export const getFichaRequest = (token: string, id: number) => apiFetch<Ficha>(`/fichas/${id}`, { token });

// Historial capilar de una clienta (cualquier PROFESIONAL), de la más nueva a la más vieja
export const getFichasClienteRequest = (token: string, clienteId: number) =>
  apiFetch<Ficha[]>(`/clientes/${clienteId}/fichas`, { token });

// CLIENTE: sus fichas cerradas
export const getMisFichasRequest = (token: string) => apiFetch<FichaCliente[]>('/fichas/mias', { token });

// Igual que la foto de perfil: el archivo va como File de expo-file-system (ver users.ts). Devuelve la ficha
export const uploadFichaPhotoRequest = (token: string, fichaId: number, tipo: MomentoFoto, uri: string) => {
  const body = new FormData();
  body.append('foto', new File(uri) as unknown as Blob);
  body.append('tipo', tipo);
  return apiFetch<Ficha>(`/fichas/${fichaId}/fotos`, { method: 'POST', body, token, timeoutMs: UPLOAD_TIMEOUT_MS });
};

export const deleteFichaPhotoRequest = (token: string, fichaId: number, fotoId: number) =>
  apiFetch<Ficha>(`/fichas/${fichaId}/fotos/${fotoId}`, { method: 'DELETE', token });

// URL de una foto (requiere token: se pide con AuthImage)
export const fichaPhotoPath = (fichaId: number, fotoId: number) => `/fichas/${fichaId}/fotos/${fotoId}`;

// --- Costo de los productos (copiado de la web, src/api/fichas.ts) ---

// Lo que cuesta lo usado de un artículo: la misma cuenta que hace el back al completar el turno
export const costoDeInsumo = ({ precioCosto, pesoInicial }: Pick<Articulo, 'precioCosto' | 'pesoInicial'>, cantidad: number) =>
  Math.round((Number(precioCosto) / Number(pesoInicial)) * cantidad * 100) / 100;

export interface TotalDeProductos {
  total: number;
  // Productos que no suman: los cargados como texto no tienen precio
  sinPrecio: number;
  // Con el precio de hoy: el costo real se guarda al completar el turno
  estimado: boolean;
}

type InsumoConCosto = { articuloId?: number | null; cantidad: string | number | null; costoSubtotal?: string | null };

// Usa el costo guardado y, si todavía no hay, lo calcula con los artículos del stock
export const totalDeProductos = (insumos: InsumoConCosto[], articulos: Articulo[] = []): TotalDeProductos =>
  insumos.reduce<TotalDeProductos>(
    (acumulado, insumo) => {
      if (insumo.costoSubtotal != null) return { ...acumulado, total: acumulado.total + Number(insumo.costoSubtotal) };
      const articulo = articulos.find((a) => a.id === insumo.articuloId);
      if (!articulo) return { ...acumulado, sinPrecio: acumulado.sinPrecio + 1 };
      return { ...acumulado, total: acumulado.total + costoDeInsumo(articulo, Number(insumo.cantidad) || 0), estimado: true };
    },
    { total: 0, sinPrecio: 0, estimado: false },
  );

export const insumosDeFicha = (ficha: Pick<Ficha, 'formulas'>) => ficha.formulas.flatMap((formula) => formula.insumos);

export const textoSinPrecio = (cantidad: number) => `No incluye ${cantidad} ${cantidad === 1 ? 'producto' : 'productos'} sin precio`;
