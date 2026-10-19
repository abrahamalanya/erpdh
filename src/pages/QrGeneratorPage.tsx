import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Button, Dialog, DialogActions, DialogContent, Stack, TextField, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { descargarQr, eliminarQr, generarQr, listQr, type QrGenerado } from '../api/qr';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { DialogHeader } from '../components/DialogHeader';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../hooks/useAuth';
import { downloadBlob } from '../utils/download';
import { formatFechaHora } from '../utils/format';
import { hasRole } from '../utils/roles';

export function QrGeneratorPage() {
  const { user } = useAuth();
  const allowed = hasRole(user, 'sistemas', 'administrador_general');
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<QrGenerado[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [descargando, setDescargando] = useState<number | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [preview, setPreview] = useState<QrGenerado | null>(null);
  const [target, setTarget] = useState<QrGenerado | null>(null);
  const creating = useRef(false);
  const deleting = useRef(false);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    setError(null);
    listQr(page)
      .then(({ data }) => {
        if (!active) return;
        if (page > data.last_page) { setPage(data.last_page); return; }
        setItems(data.data);
        setLastPage(data.last_page);
      })
      .catch(err => { if (active) { setItems([]); setError(err instanceof Error ? err.message : 'No se pudo cargar el historial'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, page, reload]);

  if (!allowed) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (creating.current) return;
    setError(null);
    const value = url.trim();
    try {
      if (!['http:', 'https:'].includes(new URL(value).protocol)) throw new Error();
    } catch {
      setError('Ingresa una URL válida (debe incluir https:// o http://)');
      return;
    }
    creating.current = true;
    setGenerando(true);
    try {
      const { data } = await generarQr(value);
      setPreview(data);
      setUrl('');
      setPage(1);
      setReload(n => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el QR');
    } finally {
      creating.current = false;
      setGenerando(false);
    }
  }

  async function handleDownload(qr: QrGenerado) {
    if (descargando !== null) return;
    setError(null);
    setDescargando(qr.id);
    try {
      downloadBlob(await descargarQr(qr.id), `qr-${qr.id}.png`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el QR');
    } finally {
      setDescargando(null);
    }
  }

  async function handleDelete() {
    if (!target || deleting.current) return;
    deleting.current = true;
    setEliminando(true);
    setDeleteError(null);
    try {
      await eliminarQr(target.id);
      if (preview?.id === target.id) setPreview(null);
      setTarget(null);
      setReload(n => n + 1);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar el QR');
    } finally {
      deleting.current = false;
      setEliminando(false);
    }
  }

  const columns: DataTableColumn<QrGenerado>[] = [
    { header: 'Código QR', render: qr => <Button onClick={() => setPreview(qr)} aria-label={`Ver QR de ${qr.url}`}><Box component="img" src={qr.imagen_png} alt="Vista previa del QR" sx={{ width: 80, height: 80, bgcolor: '#fff' }} /></Button> },
    { header: 'URL', render: qr => <Typography variant="body2" sx={{ minWidth: 180, maxWidth: 360, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{qr.url}</Typography> },
    { header: 'Fecha de creación', render: qr => formatFechaHora(qr.created_at) },
    { header: 'Generado por', render: qr => qr.generado_por },
    { header: 'Acciones', render: qr => <Stack direction="row" spacing={1}>
      <Button onClick={() => setPreview(qr)}>Ver</Button>
      <Button startIcon={<DownloadIcon />} disabled={descargando !== null} onClick={() => { void handleDownload(qr); }}>{descargando === qr.id ? 'Descargando...' : 'PNG'}</Button>
      <Button color="error" onClick={() => { setDeleteError(null); setTarget(qr); }}>Eliminar</Button>
    </Stack> },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Generador de códigos QR</Typography>
      <Typography variant="body2" color="text.secondary">Los QR contienen la URL original. Eliminar un registro del historial no afecta las imágenes descargadas.</Typography>
      <ErrorBanner error={error} />
      <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600 }}>
        <Stack spacing={2}>
          <TextField label="URL" placeholder="https://ejemplo.com" value={url} onChange={e => setUrl(e.target.value)} required disabled={generando} autoFocus />
          <Button type="submit" variant="contained" disabled={generando || !url.trim()} sx={{ alignSelf: 'flex-start' }}>{generando ? 'Generando...' : 'Generar y guardar'}</Button>
        </Stack>
      </Box>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Historial de QR</Typography>
        <Button disabled={loading} onClick={() => setReload(n => n + 1)}>Actualizar</Button>
      </Stack>
      <DataTable columns={columns} rows={items} keyExtractor={qr => qr.id} isLoading={loading} emptyMessage="No hay códigos QR generados" page={page} lastPage={lastPage} onPageChange={setPage} />
      <Dialog open={preview !== null} onClose={() => setPreview(null)} fullWidth maxWidth="xs">
        <DialogHeader onClose={() => setPreview(null)}>Código QR</DialogHeader>
        <DialogContent>
          {preview && <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <Box component="img" src={preview.imagen_png} alt={`QR para ${preview.url}`} sx={{ width: '100%', maxWidth: 320, bgcolor: '#fff' }} />
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere', width: '100%' }}>{preview.url}</Typography>
            <Typography variant="caption">{formatFechaHora(preview.created_at)} · {preview.generado_por}</Typography>
          </Stack>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>Cerrar</Button>
          <Button startIcon={<DownloadIcon />} disabled={descargando !== null} onClick={() => { if (preview) void handleDownload(preview); }}>Descargar PNG</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={target !== null} title="Eliminar QR" message={`¿Eliminar del historial el QR de ${target?.url ?? ''}? Las imágenes ya descargadas seguirán funcionando.`} confirmLabel="Eliminar" isLoading={eliminando} error={deleteError} onCancel={() => { if (!deleting.current) setTarget(null); }} onConfirm={() => { void handleDelete(); }} />
    </Stack>
  );
}
