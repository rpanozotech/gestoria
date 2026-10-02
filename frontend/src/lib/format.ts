/**
 * Formato común para cantidades e importes en toda la interfaz.
 * Fuerza el separador de miles incluso en cifras de cuatro dígitos.
 */
export const formatThousands = (value: number): string =>
  new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2,
  }).format(value);
