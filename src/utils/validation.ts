// Mismas reglas que la web (loginForm / registerForm) y que los DTOs del back

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Solo dígitos, entre 8 y 15 (feedback de los profes: PWA-203 / PWA-207)
export const PHONE_REGEX = /^\d{8,15}$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

// null si es válida; si no, el mensaje a mostrar
export const validatePassword = (password: string) => {
  if (!password) return 'Ingresá una contraseña';
  if (password.length < PASSWORD_MIN || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Mínimo 8 caracteres, con al menos una letra y un número';
  }
  if (password.length > PASSWORD_MAX) return 'Máximo 72 caracteres';
  return null;
};

// Deja solo los números (el teclado del celular puede meter espacios o guiones al pegar)
export const onlyDigits = (value: string) => value.replace(/\D/g, '');

// --- Fecha de nacimiento: se escribe "DD/MM/AAAA" y viaja como "YYYY-MM-DD" (mismas reglas que el back) ---

// Mientras se escribe: solo números y las barras se ponen solas ("23041995" -> "23/04/1995")
export const maskFecha = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
};

// "1995-04-23" -> "23/04/1995"
export const isoToFecha = (iso: string | null | undefined) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// "23/04/1995" -> "1995-04-23"; null si no es una fecha real (ej. 31/02)
export const fechaToIso = (fecha: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha);
  if (!match) return null;
  const [, d, m, y] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return null;
  return `${y}-${m}-${d}`;
};

// null si es válida (o está vacía, porque es opcional); si no, el mensaje a mostrar
export const validateFechaNacimiento = (fecha: string) => {
  if (!fecha) return null;
  const iso = fechaToIso(fecha);
  if (!iso) return 'Ingresá una fecha válida (DD/MM/AAAA)';
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (iso < '1900-01-01' || iso >= todayIso) return 'Ingresá una fecha pasada, desde 1900';
  return null;
};
