import { useState } from 'react';
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import type { Cobro } from '../api/cobros';
import { corregirCobro } from '../api/cobros';
import { ErrorBanner } from './ErrorBanner';

export function CorregirCobroDialog({ cobro, onClose, onSaved }: { cobro: Cobro | null; onClose: () => void; onSaved: () => void }) {
  const [monto, setMonto] = useState(cobro?.monto_pagado ?? '');
  const [mover, setMover] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valido = /^\d+(\.\d{1,2})?$/.test(monto) && Number(monto) > 0 && motivo.trim().length > 0;
  async function guardar() {
    if (!cobro || saving || !valido) return;
    setSaving(true); setError(null);
    try {
      await corregirCobro(cobro.id, { monto_pagado: monto, mover_a_hoy: mover, motivo: motivo.trim(), updated_at: cobro.updated_at });
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo corregir el cobro.'); }
    finally { setSaving(false); }
  }
  return <Dialog open={!!cobro} onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="sm">
    <DialogTitle>Corregir cobro</DialogTitle>
    <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      <Typography variant="body2">Se conserva el asesor y la fecha original del cobro. Para moverlo, su caja de hoy debe estar abierta. Los cambios de monto recalculan los abonos del diario; si afectan pagos posteriores o una liquidación, se requiere anular y registrar nuevamente.</Typography>
      <Typography variant="body2">Fecha de caja actual: {cobro?.caja_ciclo?.fecha?.slice(0, 10) ?? '—'}</Typography>
      <TextField label="Monto pagado (S/)" value={monto} onChange={e => setMonto(e.target.value)} type="number" slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }} disabled={saving} required />
      <FormControlLabel control={<Checkbox checked={mover} onChange={e => setMover(e.target.checked)} disabled={saving} />} label="Mover a la caja de hoy del asesor" />
      <TextField label="Motivo de la corrección" value={motivo} onChange={e => setMotivo(e.target.value)} multiline slotProps={{ htmlInput: { maxLength: 255 } }} disabled={saving} required />
      <ErrorBanner error={error} />
    </Stack></DialogContent>
    <DialogActions><Button disabled={saving} onClick={onClose}>Cancelar</Button><Button variant="contained" disabled={saving || !valido} onClick={guardar}>{saving ? 'Guardando...' : 'Guardar'}</Button></DialogActions>
  </Dialog>;
}
