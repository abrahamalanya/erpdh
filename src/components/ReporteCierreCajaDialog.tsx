import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, Stack } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { ApiError } from '../api/client';
import { getReporteCierreCaja, getReporteCierreCajaPdf } from '../api/reportes';
import type { ReporteCierreCaja } from '../types/reporteCierreCaja';
import { preventBackdropClose } from '../utils/dialog';
import { DialogHeader } from './DialogHeader';
import { ReporteCierreCajaContent } from './ReporteCierreCajaContent';

function mensajeError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión ha vencido. Inicia sesión nuevamente para consultar el reporte.';
    if (error.status === 403) return 'No tienes permiso para consultar este reporte.';
    if (error.status === 404) return 'El ciclo no existe o no está disponible para tu usuario.';
  }
  return error instanceof Error ? error.message : 'No se pudo cargar el reporte.';
}

function sinAcceso(error: unknown) {
  return error instanceof ApiError && [401, 403, 404].includes(error.status);
}

/** Mount with key={cicloId}: each cycle owns its requests, report and temporary PDF. */
export function ReporteCierreCajaDialog({ cicloId, onClose }: { cicloId: number; onClose: () => void }) {
  const [reporte, setReporte] = useState<ReporteCierreCaja | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const pdfRequest = useRef<AbortController | null>(null);
  const filename = `cierre-caja-ciclo-${cicloId}.pdf`;

  useEffect(() => {
    const controller = new AbortController();
    setReporte(null); setError(null); setLoading(true);
    getReporteCierreCaja(cicloId, controller.signal)
      .then(res => { if (!controller.signal.aborted) setReporte(res.data); })
      .catch(err => { if (!controller.signal.aborted) setError(mensajeError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [cicloId, attempt]);

  useEffect(() => () => { pdfRequest.current?.abort(); }, []);

  useEffect(() => {
    if (!pdf) { setPdfUrl(null); return; }
    const url = URL.createObjectURL(pdf);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdf]);

  async function abrirPdf() {
    if (pdfRequest.current || !reporte) return;
    if (pdf) { setPdfOpen(true); return; }
    const controller = new AbortController();
    pdfRequest.current = controller;
    setPdfLoading(true); setPdfError(null);
    try {
      const blob = await getReporteCierreCajaPdf(cicloId, controller.signal);
      if (!controller.signal.aborted) { setPdf(blob); setPdfOpen(true); }
    } catch (err) {
      if (!controller.signal.aborted) {
        if (sinAcceso(err)) { setReporte(null); setPdf(null); setPdfOpen(false); setError(mensajeError(err)); }
        else setPdfError(mensajeError(err));
      }
    } finally {
      if (!controller.signal.aborted) { pdfRequest.current = null; setPdfLoading(false); }
    }
  }

  const file = pdf ? new File([pdf], filename, { type: 'application/pdf' }) : null;
  const canShare = !!file && !!navigator.canShare?.({ files: [file] });
  async function compartirPdf() {
    if (!file) return;
    try { await navigator.share({ files: [file], title: 'Reporte de cierre de caja' }); }
    catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setPdfOpen(false);
        setPdfError(mensajeError(err));
      }
    }
  }

  return (
    <>
      <Dialog open onClose={preventBackdropClose(onClose)} fullWidth maxWidth="lg">
        <DialogHeader onClose={onClose}>Reporte de cierre de caja · Ciclo #{cicloId}</DialogHeader>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {loading && <Stack role="status" aria-label="Cargando reporte" sx={{ alignItems: 'center', py: 4 }}><CircularProgress size={28} /></Stack>}
            {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setAttempt(a => a + 1)}>Reintentar</Button>}>{error}</Alert>}
            {pdfError && <Alert severity="error" action={<Button color="inherit" onClick={abrirPdf} disabled={pdfLoading}>Reintentar PDF</Button>}>{pdfError}</Alert>}
            {reporte && !loading && !error && <ReporteCierreCajaContent reporte={reporte} />}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={onClose}>Cerrar</Button>
          <Button variant="contained" startIcon={<PictureAsPdfIcon />} disabled={!reporte || loading || pdfLoading} onClick={abrirPdf}>
            {pdfLoading ? 'Cargando PDF...' : 'Ver/descargar PDF'}
          </Button>
          {pdfUrl && <Button component="a" href={pdfUrl} download={filename}>Descargar PDF</Button>}
          {canShare && <Button onClick={compartirPdf}>Compartir PDF</Button>}
        </DialogActions>
      </Dialog>
      <Dialog open={pdfOpen && !!pdfUrl} onClose={() => setPdfOpen(false)} fullWidth maxWidth="lg">
        <DialogHeader onClose={() => setPdfOpen(false)}>PDF · Cierre de caja · Ciclo #{cicloId}</DialogHeader>
        <DialogContent>
          {pdfUrl && <Box component="iframe" src={pdfUrl} title={`PDF cierre de caja ciclo ${cicloId}`} sx={{ width: '100%', height: '65vh', border: 1, borderColor: 'divider', borderRadius: 1 }} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setPdfOpen(false)}>Cerrar PDF</Button>
          <Button component="a" href={pdfUrl ?? undefined} target="_blank" rel="noopener noreferrer">Abrir PDF</Button>
          <Button component="a" href={pdfUrl ?? undefined} download={filename}>Descargar PDF</Button>
          {canShare && <Button onClick={compartirPdf}>Compartir PDF</Button>}
        </DialogActions>
      </Dialog>
    </>
  );
}
