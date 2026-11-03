// Colores de marca: los mismos que la web (index.css del front, bloque @theme)
export const colors = {
  violet: '#A35FDA',
  peach: '#F98D56',
  grey: '#737373',

  black: '#111111',
  white: '#FFFFFF',
  background: '#FFFFFF',
  // Fondo suave para tarjetas y secciones (violeta al 6% sobre blanco)
  surface: '#F8F3FC',
  border: '#E5E5E5',
  greyLight: '#A3A3A3',

  // Estados (alertas, validaciones)
  success: '#16A34A',
  error: '#DC2626',
  warning: '#D97706',
} as const;

// Degradado de marca: de izquierda a derecha, violeta -> durazno (bg-capilar-gradient en la web)
export const gradient = {
  colors: [colors.violet, colors.peach] as const,
  reverse: [colors.peach, colors.violet] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
};
