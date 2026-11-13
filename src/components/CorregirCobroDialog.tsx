import { useEffect, useState } from 'react';
import { Button, MenuItem, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import type { Cobro } from '../api/cobros';
import { corregirCobro, getCiclosDestinoCobro, type CicloDestinoCobro } from '../api/cobros';
import { ErrorBanner } from './ErrorBanner';

export function CorregirCobroDialog({ cobro, onClose, onSaved }: { cobro: Cobro | null; onClose: () => void; onSaved: () => void }) {
  const [monto, setMonto] = useState(cobro?.monto_pagado ?? '');
  const [cicloId, setCicloId] = useState(cobro?.caja_ciclo?.id ?? 0);
  const [ciclos, setCiclos] = useState<CicloDestinoCobro[]>([]);
  const [loadingCiclos, setLoadingCiclos] = useState(true);
  useEffect(() => {
    if (!cobro) return;
    let active = true;
    setLoadingCiclos(true);
    getCiclosDestinoCobro(cobro.id)
      .then(res => { if (active) setCiclos(res.data); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'No se pudieron cargar los ciclos.'); })
      .finally(() => { if (active) setLoadingCiclos(false); });
    return () => { active = false; };
  }, [cobro]);
  const etiquetaCiclo = (c: CicloDestinoCobro) => c.fecha.slice(0, 10).split('-').reverse().join('/') + ' · ' + (c.estado === 'abierta' ? 'Abierto' : 'Cerrado') + ' · #' + c.id;
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valido = !loadingCiclos && ciclos.some(c => c.id === cicloId) && /^\d+(\.\d{1,2})?$/.test(monto) && Number(monto) > 0 && motivo.trim().length > 0;
  async function guardar() {
    if (!cobro || saving || !valido) return;
    setSaving(true); setError(null);
    try {
      await corregirCobro(cobro.id, { monto_pagado: monto, caja_ciclo_id: cicloId, motivo: motivo.trim(), updated_at: cobro.updated_at });
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo corregir el cobro.'); }
    finally { setSaving(false); }
  }
  return <Dialog open={!!cobro} onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="sm">
    <DialogTitle>Corregir cobro</DialogTitle>
    <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      <Typography variant="body2">Se conserva el asesor y la fecha original del cobro. Puedes elegir un ciclo abierto o cerrado del mismo asesor. Los cambios de monto recalculan los abonos del diario; si afectan pagos posteriores o una liquidación, se requiere anular y registrar nuevamente.</Typography>
      <Typography variant="body2">Fecha de caja actual: {cobro?.caja_ciclo?.fecha?.slice(0, 10) ?? '—'}</Typography>
      <TextField label="Monto pagado (S/)" value={monto} onChange={e => setMonto(e.target.value)} type="number" slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }} disabled={saving} required />
      <TextField select label={loadingCiclos ? 'Cargando ciclos...' : 'Ciclo de caja destino'} value={ciclos.some(c => c.id === cicloId) ? cicloId : ''} onChange={e => setCicloId(Number(e.target.value))} disabled={saving || loadingCiclos} required helperText="Selecciona la fecha del ciclo al que pertenece el ingreso.">
        {ciclos.map(c => <MenuItem key={c.id} value={c.id}>{etiquetaCiclo(c)}</MenuItem>)}
      </TextField>
      <TextField label="Motivo de la corrección" value={motivo} onChange={e => setMotivo(e.target.value)} multiline slotProps={{ htmlInput: { maxLength: 255 } }} disabled={saving} required />
      <ErrorBanner error={error} />
    </Stack></DialogContent>
    <DialogActions><Button disabled={saving} onClick={onClose}>Cancelar</Button><Button variant="contained" disabled={saving || !valido} onClick={guardar}>{saving ? 'Guardando...' : 'Guardar'}</Button></DialogActions>
  </Dialog>;
}
