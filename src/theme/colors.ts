// Colores de marca: los mismos que la web (index.css del front, bloque @theme)
export const colors = {
  violet: '#A35FDA',
  // Violeta más oscuro para textos en el color de acento: el de marca no llega al contraste 4.5:1 sobre blanco (como la web)
  violetText: '#8F3CD2',
  peach: '#F98D56',

  // Acento del PROFESIONAL (PWA-294 de la web): reemplaza al violeta en sus pantallas. El degradado de marca no cambia
  fuchsia: '#D93B95',
  fuchsiaText: '#B0267A',
  // Fucsia al 6% sobre blanco, como `surface` con el violeta
  fuchsiaSurface: '#FDF3F9',
  grey: '#737373',

  black: '#111111',
  white: '#FFFFFF',
  background: '#FFFFFF',
  // Fondo suave para tarjetas y secciones (violeta al 6% sobre blanco)
  surface: '#F8F3FC',
  border: '#E5E5E5',
  greyLight: '#A3A3A3',
  // Gris muy suave: lo que ya no está activo (ej. series dadas de baja)
  mutedSurface: '#F6F6F6',
  // Durazno suave para etiquetas (bg-capilar-peach/25 y text-orange-800 en la web: "Necesita evaluación")
  peachSurface: '#FEE8DC',
  peachText: '#9A3412',

  // Estados (alertas, validaciones)
  success: '#16A34A',
  error: '#DC2626',
  // Fondo rojo suave para destacar alertas (ej. las de la IA en la ficha técnica)
  errorSurface: '#FEF2F2',
  warning: '#D97706',
} as const;

// Color de acento de cada rol: `accent` para íconos, bordes, interruptores y lo elegido; `text` para textos en ese color;
// `surface` para fondos suaves. El ADMIN no usa la app
export interface Accent {
  accent: string;
  text: string;
  surface: string;
}

export const accents = {
  cliente: { accent: colors.violet, text: colors.violetText, surface: colors.surface },
  profesional: { accent: colors.fuchsia, text: colors.fuchsiaText, surface: colors.fuchsiaSurface },
} satisfies Record<string, Accent>;

// Degradado de marca: de izquierda a derecha, violeta -> durazno (bg-capilar-gradient en la web)
export const gradient = {
  colors: [colors.violet, colors.peach] as const,
  reverse: [colors.peach, colors.violet] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
};
