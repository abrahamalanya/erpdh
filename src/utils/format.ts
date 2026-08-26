export function formatMonto(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return `S/ ${n.toFixed(2)}`;
}

export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Date-only backend fields (fecha, fecha_caja, fecha_boveda, fecha_vencimiento,
 * fecha_desembolso...) are calendar days with no real time-of-day meaning, but
 * Laravel's `date` cast still serializes them as a UTC-midnight instant (e.g.
 * "2026-08-19T00:00:00.000000Z"). Reading the day back with getUTCDate() (not
 * getDate()) keeps that calendar day intact no matter the viewer's local
 * timezone — using local getters here would roll it back a day for any
 * negative UTC offset (Lima is UTC-5), which is the bug this exists to avoid.
 */
export function formatFecha(value: string | Date | null | undefined): string {
  if (!value) return '—';

  const d = typeof value === 'string' ? new Date(value) : value;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');

  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/**
 * Datetime fields (abierta_at, cerrada_at, created_at, fecha_resolucion...)
 * are real instants (stored in UTC) — shown here converted to Lima local time,
 * always 12-hour with an explicit AM/PM suffix (not the locale-dependent
 * "a. m."/"p. m." that a plain es-PE Intl format would produce).
 */
export function formatFechaHora(value: string | Date | null | undefined): string {
  if (!value) return '—';

  const d = typeof value === 'string' ? new Date(value) : value;
  const fecha = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' });
  const hora = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Lima' });

  return `${fecha} ${hora}`;
}
