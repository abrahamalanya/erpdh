export function formatMonto(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return `S/ ${n.toFixed(2)}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
