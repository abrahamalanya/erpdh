import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import { getVentaCronogramaBlob } from '../api/ventas';
import { DialogHeader } from './DialogHeader';

interface VentaCronogramaDialogProps {
  ventaId: number;
  open: boolean;
  onClose: () => void;
}

/**
 * Muestra el cronograma de cuotas de una venta a crédito en PDF — mismo
 * patrón que DocumentoVentaDialog, pero el cronograma no es un
 * DocumentoVenta (se re-renderiza en vivo desde las cuotas actuales, ver
 * VentaController::verCronograma()).
 */
export function VentaCronogramaDialog({ ventaId, open, onClose }: VentaCronogramaDialogProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) return;

    let cancelado = false;
    let url: string | null = null;

    setIsLoading(true);
    setError(null);
    setPdfUrl(null);

    getVentaCronogramaBlob(ventaId)
      .then((blob) => {
        if (cancelado) return;
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : 'Error desconocido');
      })
      .finally(() => {
        if (!cancelado) setIsLoading(false);
      });

    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [ventaId, open]);

  function handleImprimir() {
    const marco = iframeRef.current?.contentWindow;

    if (marco) {
      marco.focus();
      marco.print();
    } else if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogHeader onClose={onClose}>Cronograma de cuotas</DialogHeader>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          {isLoading && (
            <Stack sx={{ alignItems: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Stack>
          )}

          {pdfUrl && (
            <Box
              component="iframe"
              ref={iframeRef}
              src={pdfUrl}
              title="Cronograma de cuotas"
              sx={{ width: '100%', height: '65vh', border: 1, borderColor: 'divider', borderRadius: 1 }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Button
          component="a"
          href={pdfUrl ?? undefined}
          download={`cronograma-venta-${ventaId}.pdf`}
          startIcon={<DownloadIcon />}
          disabled={!pdfUrl}
        >
          Descargar
        </Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handleImprimir} disabled={!pdfUrl}>
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
