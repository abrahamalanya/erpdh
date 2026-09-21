import { Alert, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { ModoPagoCuotas } from '../hooks/usePagoCuotasDiario';
import { formatFecha, formatMonto } from '../utils/format';
import type { MontoPagoCuotasSugerido } from '../types/api';

interface PagoCuotasDiarioFieldsProps {
  modo: ModoPagoCuotas;
  onModoChange: (modo: ModoPagoCuotas) => void;
  numeroCuotas: string;
  onNumeroCuotasChange: (valor: string) => void;
  preview: MontoPagoCuotasSugerido | null;
  /** false = solo cuotas completas (créditos de interés compuesto): oculta el modo "Pago a cuenta". */
  permiteMonto?: boolean;
}

/**
 * Selector de modo (N cuotas / pago a cuenta) y desglose de lo que se
 * aplicaría, compartido por Créditos y Cobranzas. El campo de monto y el
 * vuelto los pone cada pantalla, porque su layout es distinto.
 */
export function PagoCuotasDiarioFields({
  modo,
  onModoChange,
  numeroCuotas,
  onNumeroCuotasChange,
  preview,
  permiteMonto = true,
}: PagoCuotasDiarioFieldsProps) {
  const cuotaParcial = preview?.cuotas.find((cuota) => !cuota.completa);
  const completas = preview?.cuotas.filter((cuota) => cuota.completa).length ?? 0;

  return (
    <>
      {permiteMonto && (
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          color="primary"
          value={modo}
          onChange={(_, valor: ModoPagoCuotas | null) => valor && onModoChange(valor)}
        >
          <ToggleButton value="cuotas">Pagar cuotas</ToggleButton>
          <ToggleButton value="monto">Pago a cuenta</ToggleButton>
        </ToggleButtonGroup>
      )}

      {modo === 'cuotas' ? (
        <TextField
          label="Cuotas a pagar"
          type="number"
          slotProps={{ htmlInput: { step: '1', min: 1 } }}
          value={numeroCuotas}
          onChange={(e) => onNumeroCuotasChange(e.target.value)}
          required
        />
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          El monto se aplica a las cuotas más antiguas (primero la mora). Si sobra una fracción, queda como
          adelanto de la siguiente cuota.
        </Typography>
      )}

      {preview ? (
        <>
          <Stack spacing={0.5}>
            {preview.cuotas.map((cuota) => {
              // Lo abonado en pagos anteriores: la cuota completa menos lo que se paga ahora y lo que aún quedará.
              const abonadoAntes = Number(cuota.monto_total) - Number(cuota.abono) - Number(cuota.saldo_restante);

              return (
                <Stack key={cuota.numero_cuota} direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Cuota #{cuota.numero_cuota} · vence {formatFecha(cuota.fecha_vencimiento)}
                    {abonadoAntes > 0.005
                      ? ` · total ${formatMonto(cuota.monto_total)}, ya abonado ${formatMonto(String(abonadoAntes))}`
                      : ''}
                    {Number(cuota.mora) > 0 ? ` (+ mora ${formatMonto(cuota.mora)})` : ''}
                    {cuota.completa ? '' : ` · abono parcial, quedan ${formatMonto(cuota.saldo_restante)}`}
                  </Typography>
                  <Typography variant="body2">{formatMonto(cuota.abono)}</Typography>
                </Stack>
              );
            })}
          </Stack>

          {modo === 'monto' && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Cubre {completas} cuota(s) completa(s)
              {cuotaParcial ? ` y deja un adelanto en la cuota #${cuotaParcial.numero_cuota}` : ''}.
            </Typography>
          )}

          {preview.es_ultima_cuota && (
            <Alert severity="info">Con este pago no queda ninguna cuota pendiente — el crédito quedará liquidado.</Alert>
          )}

          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="subtitle1">{modo === 'cuotas' ? 'Total a pagar' : 'Se aplicará'}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatMonto(preview.total)}
            </Typography>
          </Stack>
        </>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {modo === 'cuotas' ? 'Calculando monto sugerido...' : 'Ingresa el monto para ver cómo se aplica.'}
        </Typography>
      )}
    </>
  );
}
