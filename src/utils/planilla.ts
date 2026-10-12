import type { PlanillaEstado, User } from '../types/api';
import { hasPermission } from './roles';

export const canVerPlanillas = (user: User | null) => hasPermission(user, 'planillas.ver');
export const canCrearPlanillas = (user: User | null) => hasPermission(user, 'planillas.crear');
/** Líneas, cerrar y reabrir. */
export const canEditarPlanillas = (user: User | null) => hasPermission(user, 'planillas.editar');
export const canGestionarDescuentos = (user: User | null) => hasPermission(user, 'planillas.descuentos');

export const PLANILLA_ESTADO_LABEL: Record<PlanillaEstado, string> = {
  borrador: 'Borrador',
  confirmada: 'Confirmada',
};

/** "2026-10" → "10/2026". */
export function formatPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split('-');
  return mes ? `${mes}/${anio}` : periodo;
}

/** Hoy en Lima, YYYY-MM-DD. */
export function hoyLima(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}
