import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import { getVentaDocumentoBlob, DOCUMENTO_VENTA_TIPO_LABELS } from '../api/ventas';
import { DialogHeader } from './DialogHeader';
import type { DocumentoVenta } from '../types/api';

interface DocumentoVentaDialogProps {
  ventaId: number;
  /** Documento a mostrar; null = cerrado. */
  documento: DocumentoVenta | null;
  onClose: () => void;
}

/**
 * Muestra el PDF de un documento de venta (voucher, contrato, compra_venta,
 * notarial) — mismo patrón que VoucherCobroDialog (Créditos), sin el botón
 * de WhatsApp porque el backend no genera un texto para estos documentos.
 */
export function DocumentoVentaDialog({ ventaId, documento, onClose }: DocumentoVentaDialogProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (documento === null) return;

    let cancelado = false;
    let url: string | null = null;

    setIsLoading(true);
    setError(null);
    setPdfUrl(null);

    getVentaDocumentoBlob(ventaId, documento.id)
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
  }, [ventaId, documento]);

  function handleImprimir() {
    const marco = iframeRef.current?.contentWindow;

    if (marco) {
      marco.focus();
      marco.print();
    } else if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  }

  const titulo = documento ? DOCUMENTO_VENTA_TIPO_LABELS[documento.tipo] : '';

  return (
    <Dialog open={documento !== null} onClose={onClose} fullWidth maxWidth="md">
      <DialogHeader onClose={onClose}>{titulo}</DialogHeader>
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
              title={titulo}
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
          download={documento ? `${documento.tipo}-venta-${ventaId}.pdf` : undefined}
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
