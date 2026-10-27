import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { cambiarRegistradoPor, getAsesoresRegistradoPor } from '../api/creditosPrendarios';
import type { Credito, User } from '../types/api';
import { DialogHeader } from './DialogHeader';

export function CambiarRegistradoPor({ credito, onChanged }: { credito: Credito; onChanged: (credito: Credito) => void }) {
  const [open, setOpen] = useState(false);
  const [asesores, setAsesores] = useState<Pick<User, 'id' | 'nombre' | 'apellido'>[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actual = typeof credito.registrado_por === 'object' ? credito.registrado_por?.id : credito.registrado_por;
  const close = () => { if (!busy) setOpen(false); };

  async function show() {
    setOpen(true);
    setSelected('');
    setAsesores([]);
    setError(null);
    setBusy(true);
    try {
      const res = await getAsesoresRegistradoPor(credito.id);
      setAsesores(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los asesores.');
    } finally { setBusy(false); }
  }

  async function save() {
    if (!selected || !actual) return;
    setBusy(true);
    setError(null);
    try {
      const res = await cambiarRegistradoPor(credito.id, Number(selected), actual);
      onChanged(res.data);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el asesor.');
    } finally { setBusy(false); }
  }

  return <>
    <Button size="small" onClick={show}>Cambiar registrado por</Button>
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby="registrado-por-title">
      <DialogHeader onClose={close}><span id="registrado-por-title">Cambiar registrado por</span></DialogHeader>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>El crédito pasará a la cartera del asesor seleccionado. El asesor anterior dejará de verlo en su cartera.</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField select label="Asesor" value={selected} disabled={busy} onChange={(event) => setSelected(event.target.value)} fullWidth>
            {asesores.map((asesor) => <MenuItem key={asesor.id} value={String(asesor.id)} disabled={asesor.id === actual}>
              {asesor.nombre} {asesor.apellido}
            </MenuItem>)}
          </TextField>
          {!busy && !error && asesores.filter((asesor) => asesor.id !== actual).length === 0 && <Alert severity="info">No hay otros asesores disponibles en esta agencia.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={busy || !selected || !actual}>{busy ? 'Cargando…' : 'Confirmar cambio'}</Button>
      </DialogActions>
    </Dialog>
  </>;
}
