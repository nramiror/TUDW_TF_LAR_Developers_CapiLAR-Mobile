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
