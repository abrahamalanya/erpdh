import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { getCobroVoucherBlob, getCobroVoucherTexto } from '../api/cobros';
import { DialogHeader } from './DialogHeader';

interface VoucherCobroDialogProps {
  /** Cobro cuyo voucher se muestra; null = cerrado. */
  cobroId: number | null;
  /** Teléfono del cliente, para el botón de WhatsApp. */
  telefono?: string | null;
  /** Aviso opcional sobre el voucher (por ejemplo, que el cobro fue anulado). */
  aviso?: string | null;
  onClose: () => void;
}

/** Perú: números locales tienen 9 dígitos — wa.me exige el prefijo de país sin "+". */
function normalizeTelefonoWhatsapp(telefono: string): string {
  const digits = telefono.replace(/\D/g, '');
  return digits.length === 9 ? `51${digits}` : digits;
}

/**
 * Voucher de un cobro tal como lo genera el backend (PDF + texto para
 * compartir). Lo usan el formulario de cobro de Créditos y el módulo
 * Cobranzas, tanto al terminar de registrar un pago como al reabrir el
 * voucher de un cobro anterior — un solo componente para los dos lugares.
 */
export function VoucherCobroDialog({ cobroId, telefono, aviso, onClose }: VoucherCobroDialogProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [texto, setTexto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (cobroId === null) return;

    let cancelado = false;
    let url: string | null = null;

    setIsLoading(true);
    setError(null);
    setPdfUrl(null);
    setTexto(null);

    getCobroVoucherBlob(cobroId)
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

    getCobroVoucherTexto(cobroId)
      .then((res) => {
        if (!cancelado) setTexto(res.data.texto);
      })
      .catch(() => undefined);

    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [cobroId]);

  function handleImprimir() {
    const marco = iframeRef.current?.contentWindow;

    if (marco) {
      marco.focus();
      marco.print();
    } else if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  }

  const whatsappUrl =
    telefono && texto ? `https://wa.me/${normalizeTelefonoWhatsapp(telefono)}?text=${encodeURIComponent(texto)}` : null;

  return (
    <Dialog open={cobroId !== null} onClose={onClose} fullWidth maxWidth="md">
      <DialogHeader onClose={onClose}>Voucher {cobroId !== null ? `#${cobroId}` : ''}</DialogHeader>
      <DialogContent>
        <Stack spacing={2}>
          {aviso && <Alert severity="warning">{aviso}</Alert>}
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
              title="Voucher del cobro"
              sx={{ width: '100%', height: '65vh', border: 1, borderColor: 'divider', borderRadius: 1 }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Button
          component="a"
          href={whatsappUrl ?? undefined}
          target="_blank"
          rel="noreferrer"
          startIcon={<WhatsAppIcon />}
          disabled={!whatsappUrl}
          title={telefono ? '' : 'El cliente no tiene teléfono registrado'}
        >
          WhatsApp
        </Button>
        <Button
          component="a"
          href={pdfUrl ?? undefined}
          download={cobroId !== null ? `voucher-cobro-${cobroId}.pdf` : undefined}
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
