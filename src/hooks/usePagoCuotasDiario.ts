import { useEffect, useRef, useState } from 'react';
import { pagarCuotasPreview } from '../api/creditosPrendarios';
import type { MontoPagoCuotasSugerido } from '../types/api';

/** 'cuotas' = pagar N cuotas completas; 'monto' = pago a cuenta (se amortiza el monto ingresado). */
export type ModoPagoCuotas = 'cuotas' | 'monto';

interface UsePagoCuotasDiarioOptions {
  creditoId: number | null;
  /** Solo pide preview mientras la operación "pagar cuotas" está seleccionada. */
  activo: boolean;
  modo: ModoPagoCuotas;
  numeroCuotas: string;
  monto: string;
  /** Solo en modo 'cuotas': recibe el total del preview para sugerirlo como monto a cobrar. */
  onTotalSugerido: (total: string) => void;
}

/**
 * Preview del pago de un crédito diario, compartido por Créditos y
 * Cobranzas para que ambas pantallas calculen exactamente igual. Vuelve a
 * pedirlo (con debounce) cada vez que cambia el modo, el número de cuotas
 * o el monto ingresado.
 */
export function usePagoCuotasDiario({
  creditoId,
  activo,
  modo,
  numeroCuotas,
  monto,
  onTotalSugerido,
}: UsePagoCuotasDiarioOptions) {
  const [preview, setPreview] = useState<MontoPagoCuotasSugerido | null>(null);
  const onTotalSugeridoRef = useRef(onTotalSugerido);
  // En modo 'cuotas' el monto lo fija el propio preview (onTotalSugerido);
  // reaccionar a él aquí volvería a pedirlo sin necesidad.
  const montoDependiente = modo === 'monto' ? monto : '';

  useEffect(() => {
    onTotalSugeridoRef.current = onTotalSugerido;
  });

  useEffect(() => {
    if (!activo || creditoId === null) return;

    const cuotas = Number(numeroCuotas);
    const montoNum = Number(montoDependiente);

    const params =
      modo === 'cuotas'
        ? Number.isInteger(cuotas) && cuotas >= 1
          ? { numero_cuotas: cuotas }
          : null
        : montoNum > 0
          ? { monto_pagado: montoDependiente }
          : null;

    const handle = setTimeout(() => {
      if (!params) {
        setPreview(null);
        return;
      }

      pagarCuotasPreview(creditoId, params)
        .then((res) => {
          setPreview(res.data);
          if (modo === 'cuotas') onTotalSugeridoRef.current(res.data.total);
        })
        .catch(() => setPreview(null));
    }, 300);

    return () => clearTimeout(handle);
  }, [activo, creditoId, modo, numeroCuotas, montoDependiente]);

  return { preview, setPreview };
}

/**
 * Vuelto/faltante y validez del pago según el modo — 'cuotas' exige cubrir
 * el total del preview (el excedente es vuelto); 'monto' acepta cualquier
 * monto positivo porque el backend lo reparte (solo hay vuelto si supera
 * toda la deuda).
 */
export function resumenPagoCuotasDiario(
  modo: ModoPagoCuotas,
  preview: MontoPagoCuotasSugerido | null,
  montoIngresado: number
): { vuelto: number; valido: boolean } {
  if (!preview) return { vuelto: 0, valido: false };

  if (modo === 'cuotas') {
    const vuelto = montoIngresado - Number(preview.total);

    return { vuelto, valido: vuelto >= 0 };
  }

  return { vuelto: Number(preview.vuelto), valido: montoIngresado > 0 && preview.cuotas.length > 0 };
}
