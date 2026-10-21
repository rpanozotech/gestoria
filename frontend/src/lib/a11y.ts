import React, { useEffect } from 'react';

/**
 * Cierra un overlay con la tecla Escape.
 *
 * Antes solo el command palette del layout cerraba con Escape: los 23
 * modales del CRM (Ficha 360, alta con IA, agenda, documentos, facturacion)
 * no tenian forma de cerrarse con teclado. Quien navega solo con teclado
 * se quedaba atrapado dentro del overlay, con el Tab saliendo al
 * contenido de detras.
 *
 * Uso: useEscapeKey(activo, () => setAbierto(false));
 */
export function useEscapeKey(activo: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!activo) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activo, onEscape]);
}

/**
 * Convierte un elemento en activable con teclado.
 *
 * Varias pantallas del CRM abren la Ficha 360° con onClick sobre el <tr>.
 * Eso funciona solo con raton: la fila no es enfocable, no responde a
 * Enter ni a Espacio, y con teclado no hay forma de abrir el expediente.
 * Este helper devuelve el role, el tabIndex y el onKeyDown que faltan.
 *
 * Uso:
 *   <tr onClick={abrir} {...activableConTeclado(abrir)} role-agnostic>
 *
 * No se anade role="button": la semantica correcta de una fila de tabla
 * es fila, no boton. Con role="button" un lector de pantalla anunciaria
 * "boton" y se perderia la de "cliente". tabIndex=0 mas la activacion
 * por teclado hacen la fila alcanzable y accionable conservando lo que
 * la tabla significa.
 */
export function activableConTeclado(onActivate: () => void) {
  return {
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        // Sin preventDefault: el Espacio tambien hace scroll en la pagina.
        e.preventDefault();
        onActivate();
      }
    },
    onFocus: (e: React.FocusEvent) => {
      // Resalta la fila enfocada igual que la hover, para que se vea
      // donde esta el foco con el teclado.
      e.currentTarget.classList.add('bg-blue-50/50');
    },
    onBlur: (e: React.FocusEvent) => {
      e.currentTarget.classList.remove('bg-blue-50/50');
    },
  };
}