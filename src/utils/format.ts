export function formatMonto(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return `S/ ${n.toFixed(2)}`;
}
