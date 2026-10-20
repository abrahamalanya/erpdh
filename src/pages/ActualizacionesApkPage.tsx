import { useEffect, useState, type FormEvent } from 'react';
import { Box, Button, Chip, DialogActions, DialogContent, Dialog, Stack, TextField, Typography } from '@mui/material';
import { DataTable } from '../components/DataTable';
import { DialogHeader } from '../components/DialogHeader';
import { ErrorBanner } from '../components/ErrorBanner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  createApkVersion, deleteApkVersion, getApkVersionBlob, listApkVersions, publicarApkVersion,
} from '../api/apkVersions';
import type { ApkVersion } from '../types/api';
import { formatBytes, formatFechaHora } from '../utils/format';
import { downloadBlob } from '../utils/download';

const APPLICATION_ID = 'com.credimasperu.umax';

export function ActualizacionesApkPage() {
  const [versiones, setVersiones] = useState<ApkVersion[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [eliminando, setEliminando] = useState<ApkVersion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [apk, setApk] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [buildNumber, setBuildNumber] = useState('');
  const [descripcion, setDescripcion] = useState('');

  async function load(targetPage = page) {
    setLoading(true);
    try {
      const res = await listApkVersions(targetPage);
      setVersiones(res.data.data);
      setPage(res.data.current_page);
      setLastPage(res.data.last_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las versiones.');
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(1); }, []);

  function openForm() {
    setApk(null);
    setVersion('');
    setBuildNumber('');
    setDescripcion('');
    setFormError(null);
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!apk) return;
    setSaving(true);
    setFormError(null);
    try {
      await createApkVersion({
        apk,
        version: version.trim(),
        build_number: Number(buildNumber),
        application_id: APPLICATION_ID,
        descripcion: descripcion.trim() || undefined,
      });
      setOpen(false);
      await load(1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo subir el APK.');
    } finally {
      setSaving(false);
    }
  }

  async function publicar(v: ApkVersion) {
    setBusyId(v.id);
    setError(null);
    try {
      await publicarApkVersion(v.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar la versión.');
    } finally {
      setBusyId(null);
    }
  }

  async function descargar(v: ApkVersion) {
    setBusyId(v.id);
    setError(null);
    try {
      const blob = await getApkVersionBlob(v.id);
      downloadBlob(blob, v.file_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el archivo.');
    } finally {
      setBusyId(null);
    }
  }

  async function eliminar() {
    if (!eliminando) return;
    setBusyId(eliminando.id);
    setError(null);
    try {
      await deleteApkVersion(eliminando.id);
      setEliminando(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la versión.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Actualizaciones APK</Typography>
      <Typography variant="body2" color="text.secondary">
        Sube las compilaciones generadas con Expo EAS Build y publica cuál es la vigente para el aplicativo móvil.
      </Typography>
      <ErrorBanner error={error} />
      <Box>
        <Button variant="contained" onClick={openForm}>Subir APK</Button>
      </Box>
      <DataTable<ApkVersion>
        columns={[
          { header: 'Versión', render: v => v.version },
          { header: 'Build', render: v => v.build_number },
          { header: 'Descripción', render: v => v.descripcion || '—' },
          { header: 'Tamaño', render: v => formatBytes(v.file_size) },
          { header: 'Subida', render: v => formatFechaHora(v.created_at) },
          { header: 'Estado', render: v => v.publicada ? <Chip label="Vigente" color="success" size="small" /> : '—' },
          {
            header: 'Acciones', align: 'right', render: v => (
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                {!v.publicada && (
                  <Button size="small" disabled={busyId === v.id} onClick={() => publicar(v)}>Publicar</Button>
                )}
                <Button size="small" disabled={busyId === v.id} onClick={() => descargar(v)}>Descargar</Button>
                <Button size="small" color="error" disabled={busyId === v.id || v.publicada} onClick={() => setEliminando(v)}>
                  Eliminar
                </Button>
              </Stack>
            ),
          },
        ]}
        rows={versiones}
        keyExtractor={v => v.id}
        isLoading={loading}
        emptyMessage="Todavía no se subió ningún APK."
        page={page}
        lastPage={lastPage}
        onPageChange={load}
      />

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={save}>
          <DialogHeader onClose={() => setOpen(false)}>Subir APK</DialogHeader>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <ErrorBanner error={formError} />
              <Button variant="outlined" component="label" disabled={saving}>
                {apk ? apk.name : 'Seleccionar archivo .apk'}
                <input type="file" hidden accept=".apk" onChange={e => setApk(e.target.files?.[0] ?? null)} />
              </Button>
              <TextField
                label="Versión" placeholder="1.4.0" value={version} onChange={e => setVersion(e.target.value)}
                disabled={saving} required slotProps={{ htmlInput: { maxLength: 20 } }}
              />
              <TextField
                label="Número de compilación (versionCode)" type="number" value={buildNumber}
                onChange={e => setBuildNumber(e.target.value)} disabled={saving} required
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <TextField
                label="Descripción de los cambios" value={descripcion} onChange={e => setDescripcion(e.target.value)}
                disabled={saving} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 2000 } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving || !apk}>
              {saving ? 'Subiendo...' : 'Subir'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={!!eliminando}
        title="Eliminar versión APK"
        message={`Se eliminará la versión ${eliminando?.version} (build ${eliminando?.build_number}) y su archivo.`}
        onCancel={() => setEliminando(null)}
        onConfirm={eliminar}
        isLoading={busyId === eliminando?.id}
        error={error}
      />
    </Stack>
  );
}
