import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { registrarMovimientoCaja } from '../api/caja';
import { listConceptos } from '../api/conceptos';
import { PhotoField, MultiPhotoField } from './MediaFields';
import { preventBackdropClose } from '../utils/dialog';
import type { Concepto } from '../types/api';

const TIPO_LABEL: Record<'ingreso' | 'egreso', string> = { ingreso: 'ingreso', egreso: 'gasto' };

interface RegistrarMovimientoCajaDialogProps {
  /** null closes the dialog; 'ingreso'/'egreso' opens it pre-set to that tipo. */
  tipo: 'ingreso' | 'egreso' | null;
  onClose: () => void;
  /** Called after a successful registration, right before onClose. */
  onRegistered: () => void;
}

/**
 * Shared by CajaPage (quick action while operating a caja) and the
 * Ingresos/Gastos modules (registering directly from the history list) —
 * extracted here since both now need the exact same concepto+comprobante+
 * fotos flow, per this project's "lift on the second use" convention.
 */
export function RegistrarMovimientoCajaDialog({ tipo, onClose, onRegistered }: RegistrarMovimientoCajaDialogProps) {
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [conceptoId, setConceptoId] = useState<number | ''>('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [fotosAdicionales, setFotosAdicionales] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tipo) return;

    setConceptoId('');
    setMonto('');
    setDescripcion('');
    setComprobante(null);
    setFotosAdicionales([]);
    setError(null);

    listConceptos({ tipo: tipo === 'ingreso' ? 'ingreso' : 'gasto' })
      .then((res) => setConceptos(res.data))
      .catch(() => setConceptos([]));
  }, [tipo]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!tipo || !conceptoId) return;

    setError(null);
    setIsSaving(true);

    try {
      await registrarMovimientoCaja({
        tipo,
        concepto_id: conceptoId,
        monto,
        descripcion: descripcion || undefined,
        comprobante,
        fotos_adicionales: fotosAdicionales,
      });
      onRegistered();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={!!tipo} onClose={preventBackdropClose(onClose)} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>Registrar {tipo ? TIPO_LABEL[tipo] : ''}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              select
              label="Concepto"
              value={conceptoId}
              onChange={(e) => setConceptoId(Number(e.target.value))}
              required
              helperText={
                conceptos.length === 0
                  ? `No hay conceptos de ${tipo ? TIPO_LABEL[tipo] : ''} activos registrados`
                  : undefined
              }
            >
              {conceptos.map((concepto) => (
                <MenuItem key={concepto.id} value={concepto.id}>
                  {concepto.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Monto"
              type="number"
              slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
            <TextField
              label="Descripción (opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              multiline
              minRows={2}
            />
            <PhotoField
              label={tipo === 'egreso' ? 'Comprobante de pago (obligatorio)' : 'Comprobante de pago (opcional)'}
              file={comprobante}
              onChange={setComprobante}
            />
            <MultiPhotoField files={fotosAdicionales} onChange={setFotosAdicionales} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSaving || !conceptoId || (tipo === 'egreso' && !comprobante)}>
            {isSaving ? 'Guardando...' : 'Registrar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
