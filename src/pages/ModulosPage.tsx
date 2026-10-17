import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, Stack, TextField, Typography,
} from '@mui/material';
import { DataTable } from '../components/DataTable';
import {
  createModulo, deleteModulo, getModulo, listModulosCatalogo, updateModulo,
  type ModuloCatalogo, type ModuloDetalle,
} from '../api/moduloCatalogo';
import { roleLabel } from '../utils/userHierarchy';

export function ModulosPage() {
  const [modulos, setModulos] = useState<ModuloCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detalle, setDetalle] = useState<ModuloDetalle | null>(null);
  const [key, setKey] = useState('');
  const [nombre, setNombre] = useState('');
  const [grupo, setGrupo] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setModulos((await listModulosCatalogo()).data);
  }

  useEffect(() => {
    let active = true;
    listModulosCatalogo()
      .then(res => { if (active) setModulos(res.data); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function create() {
    setDetalle(null);
    setKey('');
    setNombre('');
    setGrupo('');
    setError('');
    setOpen(true);
  }

  async function edit(id: number) {
    setOpening(true);
    setError('');
    try {
      const modulo = (await getModulo(id)).data;
      setDetalle(modulo);
      setKey(modulo.key);
      setNombre(modulo.nombre);
      setGrupo(modulo.grupo ?? '');
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el módulo.');
    } finally {
      setOpening(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const data = { nombre: nombre.trim(), grupo: grupo.trim() || null };
    try {
      if (detalle) await updateModulo(detalle.id, { ...data, revision: detalle.revision });
      else await createModulo({ ...data, key });
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el módulo.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!detalle) return;
    setSaving(true);
    setError('');
    try {
      await deleteModulo(detalle.id, detalle.revision);
      setConfirmDelete(false);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el módulo.');
    } finally {
      setSaving(false);
    }
  }

  const grupos = [...new Set(modulos.map(m => m.grupo).filter((g): g is string => !!g))].sort();
  const term = query.trim().toLocaleLowerCase();
  const rows = modulos.filter(m => [m.nombre, m.key, m.grupo ?? ''].some(v => v.toLocaleLowerCase().includes(term)));

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Módulos</Typography>
      <Typography variant="body2" color="text.secondary">
        Administra el catálogo utilizado por los perfiles de acceso.
        Registrar un módulo no crea su funcionalidad: sus pantallas y accesos se conectan durante el desarrollo.
      </Typography>
      {error && !open && <Alert severity="error">{error}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Buscar por nombre, clave o categoría" value={query} onChange={e => setQuery(e.target.value)} size="small" fullWidth />
        <Button variant="contained" onClick={create} disabled={loading || opening}>Registrar módulo</Button>
      </Stack>
      <DataTable<ModuloCatalogo>
        columns={[
          { header: 'Nombre', render: m => m.nombre },
          { header: 'Clave técnica', render: m => <Box component="code">{m.key}</Box> },
          { header: 'Categoría', render: m => m.grupo || 'General' },
          { header: 'Acciones', align: 'right', render: m => <Button onClick={() => edit(m.id)} disabled={opening}>Ver y editar</Button> },
        ]}
        rows={rows}
        keyExtractor={m => m.id}
        isLoading={loading}
        emptyMessage="No hay módulos que coincidan con la búsqueda."
        page={1}
        lastPage={1}
        onPageChange={() => undefined}
      />
      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={save}>
          <DialogTitle>{detalle ? 'Editar módulo' : 'Registrar módulo'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Clave técnica" value={key} onChange={e => setKey(e.target.value)}
                disabled={!!detalle || saving} required
                helperText={detalle ? 'La clave permanece fija para conservar sus conexiones.' : 'Ejemplo: inventario. Usa la clave acordada durante el desarrollo.'}
                slotProps={{ htmlInput: { maxLength: 64, pattern: '[a-z][a-z0-9_]*' } }}
              />
              <TextField label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} disabled={saving} required slotProps={{ htmlInput: { maxLength: 255 } }} />
              <Autocomplete
                freeSolo options={grupos} value={grupo} inputValue={grupo} disabled={saving}
                onChange={(_, value) => setGrupo(value ?? '')}
                onInputChange={(_, value) => setGrupo(value)}
                renderInput={params => <TextField {...params} label="Categoría" helperText="Elige una categoría existente o escribe una nueva. Vacío agrupa en General." />}
              />
              {detalle && (
                <Stack spacing={1}>
                  <Typography variant="subtitle1">Dónde se utiliza</Typography>
                  <Typography variant="body2">Perfiles: {detalle.uso.perfiles.map(p => p.nombre).join(', ') || 'Ninguno'}</Typography>
                  <Typography variant="body2">Roles: {detalle.uso.roles.map(r => roleLabel(r.name)).join(', ') || 'Ninguno'}</Typography>
                  <Typography variant="body2">Selecciones individuales: {detalle.uso.selecciones_individuales}</Typography>
                  <Box component="details">
                    <Box component="summary" sx={{ cursor: 'pointer' }}>Rutas de API asociadas ({detalle.uso.rutas_api.length})</Box>
                    {detalle.uso.rutas_api.map(r => <Typography key={r.metodo + r.ruta} variant="caption" component="div" sx={{ overflowWrap: 'anywhere' }}>{r.metodo} {r.ruta}</Typography>)}
                    {!detalle.uso.rutas_api.length && <Typography variant="body2">Sin rutas de API asociadas.</Typography>}
                  </Box>
                  {!detalle.uso.puede_eliminar && <Typography variant="caption" color="text.secondary">Se conserva porque tiene asignaciones o está conectado al sistema.</Typography>}
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ flexWrap: 'wrap' }}>
            {detalle && <Button color="error" disabled={saving || !detalle.uso.puede_eliminar} onClick={() => setConfirmDelete(true)}>Eliminar</Button>}
            <Button onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={confirmDelete} onClose={() => !saving && setConfirmDelete(false)}>
        <DialogTitle>Eliminar módulo</DialogTitle>
        <DialogContent>
          <Typography>Se eliminará «{detalle?.nombre}» del catálogo.</Typography>
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} disabled={saving}>Cancelar</Button>
          <Button color="error" onClick={remove} disabled={saving}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
