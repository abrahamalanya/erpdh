import { MenuItem, Stack, TextField } from '@mui/material';
import { PhotoField } from './MediaFields';
import type { MedioCobro } from '../types/api';

export const MEDIO_COBRO_LABELS: Record<MedioCobro, string> = {
  efectivo: 'Efectivo',
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia',
};

interface MedioCobroFieldProps {
  medio: MedioCobro;
  onMedioChange: (medio: MedioCobro) => void;
  comprobante: File | null;
  onComprobanteChange: (file: File | null) => void;
}

/**
 * Medio de pago (efectivo/yape/plin/transferencia) + comprobante — igual
 * patrón que RegistrarMovimientoCajaDialog usa para gastos, ahora también
 * para cobros de crédito prendario. El comprobante solo se pide (y el
 * backend solo lo exige) cuando el medio no es efectivo.
 */
export function MedioCobroField({
  medio,
  onMedioChange,
  comprobante,
  onComprobanteChange,
}: MedioCobroFieldProps) {
  return (
    <Stack spacing={2.5}>
      <TextField
        select
        label="Medio de cobro"
        value={medio}
        onChange={(e) => onMedioChange(e.target.value as MedioCobro)}
      >
        {Object.entries(MEDIO_COBRO_LABELS).map(([value, label]) => (
          <MenuItem key={value} value={value}>
            {label}
          </MenuItem>
        ))}
      </TextField>
      {medio !== 'efectivo' && (
        <PhotoField
          label="Comprobante de la transacción"
          file={comprobante}
          onChange={onComprobanteChange}
          accept="image/jpeg,image/png,image/webp,application/pdf"
        />
      )}
    </Stack>
  );
}
