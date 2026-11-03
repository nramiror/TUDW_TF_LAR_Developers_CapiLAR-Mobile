import { File } from 'expo-file-system';

import { apiFetch } from './client';

// Copiado del front (src/api/hairColor.ts): prueba virtual de color (TP3, API 1).
// El back llama a YouCam: la clave nunca llega a la app. Si cambia allá, hay que actualizarlo acá también.

export interface VistaPreviaColor {
  // Imagen con el color aplicado (en modo simulado, la misma selfie como data URL)
  url: string;
  // Hasta cuándo sirve el link (YouCam lo guarda 2 horas)
  venceEn: string;
  // true si el back no llamó a YouCam (YOUCAM_MODO=simulado)
  simulado: boolean;
}

export interface ColorCarta {
  nombre: string;
  hex: string;
}

// Carta de colores del salón (se puede ajustar con las profesionales)
export const CARTA_DE_COLORES: ColorCarta[] = [
  { nombre: 'Rubio ceniza', hex: '#B8A68A' },
  { nombre: 'Rubio miel', hex: '#C8964E' },
  { nombre: 'Castaño claro', hex: '#8B6542' },
  { nombre: 'Castaño chocolate', hex: '#4E3424' },
  { nombre: 'Cobrizo', hex: '#A4552B' },
  { nombre: 'Rojo borgoña', hex: '#6E1F2E' },
  { nombre: 'Negro azulado', hex: '#1C1E2B' },
  { nombre: 'Fantasía violeta', hex: '#6B3FA0' },
];

// Igual que el back: de 0 a 100, 80 si no se manda
export const INTENSIDAD_POR_DEFECTO = 80;

// Límites de YouCam: menos de 1920 px de ancho y 1080 de alto, al menos 320 × 320. Se deja margen como en la web
export const SELFIE_LIMITS = { maxWidth: 1600, maxHeight: 1060, minSide: 320 };

// YouCam puede tardar hasta un minuto, más la subida de la foto
const PREVIEW_TIMEOUT_MS = 90000;

// "Coloración", "Tintura completa"... sin importar mayúsculas ni tildes (para "Reservar coloración").
// Las tildes se sacan por rango y no con \p{Diacritic} como la web, por si Hermes no lo soporta
export const esColoracion = (tipo: string) => {
  const texto = tipo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return texto.includes('color') || texto.includes('tintura');
};

// CLIENTE o PROFESIONAL. La foto va en multipart (campo "foto") como File de expo-file-system (ver users.ts),
// junto con el color y la intensidad. Cada llamada real gasta 1 unit de YouCam
export const previewHairColorRequest = (token: string, uri: string, color: string, intensidad?: number) => {
  const body = new FormData();
  body.append('foto', new File(uri) as unknown as Blob);
  body.append('color', color);
  if (intensidad !== undefined) body.append('intensidad', String(intensidad));
  return apiFetch<VistaPreviaColor>('/hair-color/preview', { method: 'POST', body, token, timeoutMs: PREVIEW_TIMEOUT_MS });
};
