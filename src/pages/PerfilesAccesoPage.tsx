import { useEffect, useState, type FormEvent } from 'react';
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { listCatalogo, listPerfiles, savePerfil, type PerfilAcceso } from '../api/perfilesAcceso';
import type { Modulo } from '../types/api';
import { useAuth } from '../hooks/useAuth';
import { ErrorBanner } from '../components/ErrorBanner';

export function PerfilesAccesoPage() {
  const { refreshUser } = useAuth();
  const [perfiles, setPerfiles] = useState<PerfilAcceso[]>([]);
  const [catalogo, setCatalogo] = useState<Modulo[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PerfilAcceso | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() {
    const [p, c] = await Promise.all([listPerfiles(), listCatalogo()]);
    setPerfiles(p.data); setCatalogo(c.data);
  }
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  function edit(p: PerfilAcceso | null) {
    setEditing(p); setNombre(p?.nombre ?? ''); setDescripcion(p?.descripcion ?? '');
    setActivo(p?.activo ?? true); setSelected(p?.modulos.map(m => m.key) ?? []); setError(''); setOpen(true);
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await savePerfil(editing?.id ?? null, { nombre, descripcion, activo, modulos: selected, updated_at: editing?.updated_at });
      setOpen(false); await load(); await refreshUser();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar'); }
    finally { setSaving(false); }
  }
  const groups = [...new Set(catalogo.map(m => m.grupo || 'general'))];
  return <Stack spacing={2}>
    <Typography variant="h5">Perfiles de acceso</Typography>
    <Typography>Selecciona los módulos disponibles. Los permisos de operación se conservan.</Typography>
    <ErrorBanner error={error} />
    <Button variant="contained" onClick={() => edit(null)} disabled={loading}>Nuevo perfil</Button>
    {loading && <Typography>Cargando perfiles…</Typography>}
    {!loading && perfiles.length === 0 && <Typography>No hay perfiles registrados.</Typography>}
    {perfiles.map(p => <Box key={p.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Typography variant="h6">{p.nombre} · {p.activo ? 'Activo' : 'Inactivo'}</Typography>
      <Typography>{p.descripcion}</Typography>
      <Typography variant="body2">{p.modulos.map(m => m.nombre).join(', ') || 'Sin módulos'}</Typography>
      <Button onClick={() => edit(p)}>Editar</Button>
    </Box>)}
    <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{editing ? 'Editar perfil' : 'Nuevo perfil'}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <ErrorBanner error={error} />
          <TextField label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} required slotProps={{ htmlInput: { maxLength: 255 } }} />
          <TextField label="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} multiline slotProps={{ htmlInput: { maxLength: 2000 } }} />
          <FormControlLabel label="Activo" control={<Switch checked={activo} onChange={e => setActivo(e.target.checked)} />} />
          {groups.map(g => <Box key={g}><Typography variant="subtitle1">{g.toUpperCase()}</Typography>
            {catalogo.filter(m => (m.grupo || 'general') === g).map(m => <FormControlLabel key={m.key} label={m.nombre} control={<Checkbox checked={selected.includes(m.key)} onChange={e => setSelected(prev => e.target.checked ? [...prev, m.key] : prev.filter(k => k !== m.key))} />} />)}
          </Box>)}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button></DialogActions>
      </Box>
    </Dialog>
  </Stack>;
}
