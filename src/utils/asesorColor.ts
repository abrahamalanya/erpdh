import { useMemo, useRef } from 'react';

/**
 * Paleta fija, visible en fondo claro y oscuro — el mismo criterio de
 * contraste que ya usa StatusChip/el resto del dashboard, solo que acá con
 * más tonos porque puede haber varios asesores visibles a la vez.
 */
export const PALETA_ASESORES = [
  '#1976d2', // azul
  '#e53935', // rojo
  '#43a047', // verde
  '#f57c00', // naranja
  '#8e24aa', // morado
  '#00897b', // verde azulado
  '#c2185b', // rosa fuerte
  '#5d4037', // marrón
  '#fbc02d', // amarillo (oscurecido para contraste)
  '#455a64', // gris azulado
];

/**
 * Asigna un color estable por `asesor_id`, en el orden en que cada uno
 * aparece por primera vez: nunca se reasigna mientras el componente viva, así
 * que dos refrescos seguidos pintan al mismo asesor con el mismo color. Con
 * más asesores que colores en la paleta, se repiten (mismo criterio de
 * "siempre que sea posible" del requerimiento).
 */
export function useAsesorColores(asesorIds: number[]): Record<number, string> {
  const asignados = useRef<Map<number, string>>(new Map());

  return useMemo(() => {
    for (const id of asesorIds) {
      if (!asignados.current.has(id)) {
        asignados.current.set(id, PALETA_ASESORES[asignados.current.size % PALETA_ASESORES.length]);
      }
    }

    return Object.fromEntries(asignados.current.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asesorIds.join(',')]);
}
