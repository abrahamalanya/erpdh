import type { CajaAperturaCierreItem } from '../types/api';

function centimos(value: string | null | undefined): bigint {
  const text = value ?? '0';
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) return 0n;
  const [entero, decimal = ''] = text.replace('-', '').split('.');
  const amount = BigInt(entero) * 100n + BigInt(decimal.padEnd(2, '0'));
  return text.startsWith('-') ? -amount : amount;
}
function importe(value: bigint): string {
  const absoluto = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${absoluto / 100n}.${String(absoluto % 100n).padStart(2, '0')}`;
}

/** Solo suma las filas devueltas por el backend; los gastos ya estan en total_egresos. */
export function totalesCierreCaja(rows: CajaAperturaCierreItem[]) {
  const suma = (campo: keyof CajaAperturaCierreItem) => rows.reduce((total, row) => total + centimos(row[campo] as string | null), 0n);
  const apertura = suma('valor_aperturado');
  const ingresos = suma('total_ingresos'), egresos = suma('total_egresos');
  const billetaje = suma('total_billetaje'), cobranza = suma('total_cobranza'), desembolso = suma('total_desembolso');
  const cerradas = rows.filter(row => row.estado === 'cerrada');
  const faltante = cerradas.reduce((total, row) => total + (centimos(row.diferencia) < 0n ? -centimos(row.diferencia) : 0n), 0n);
  const sobrante = cerradas.reduce((total, row) => total + (centimos(row.diferencia) > 0n ? centimos(row.diferencia) : 0n), 0n);
  const saldo = apertura + billetaje + cobranza + ingresos - desembolso - egresos;
  return { apertura: importe(apertura), ingresos: importe(ingresos), egresos: importe(egresos),
    billetaje: importe(billetaje), cobranza: importe(cobranza), desembolso: importe(desembolso),
    saldo: importe(saldo), faltante: importe(faltante), sobrante: importe(sobrante), neto: importe(saldo + sobrante - faltante) };
}

export function rangoCierreValido(desde: string, hasta: string): boolean {
  const esFecha = (value: string) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value);
  return esFecha(desde) && esFecha(hasta) && (!desde || !hasta || desde <= hasta);
}
