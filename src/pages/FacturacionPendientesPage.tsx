import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { canEmitirFacturacion, canVerFacturacion } from '../utils/facturacion';
import {
  emitirComprobanteCredito,
  listCreditosPendientesFacturar,
  previsualizarComprobanteCredito,
} from '../api/facturacion';
import { listAgencias } from '../api/agencias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { DialogHeader } from '../components/DialogHeader';
import { preventBackdropClose } from '../utils/dialog';
import { formatFecha, formatMonto } from '../utils/format';
import type { Agencia, ComprobanteEmitido, CreditoPendienteFacturar, PreviewComprobanteCredito } from '../types/api';
import { ErrorBanner } from '../components/ErrorBanner';

/**
 * Créditos liquidados sin comprobante. Al emitir, el backend decide factura
 * (RUC) o boleta (DNI) y factura solo el interés + mora cobrados. El envío a
 * SUNAT no es inmediato: lo hace un job en segundo plano.
 */
export function FacturacionPendientesPage() {
  const { user } = useAuth();
  const puedeElegirAgencia = !hasRole(user, 'administrador_agencia', 'supervisor');

  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [agenciaId, setAgenciaId] = useState<number | ''>('');
  const [creditos, setCreditos] = useState<CreditoPendienteFacturar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [target, setTarget] = useState<CreditoPendienteFacturar | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [emitError, setEmitError] = useState<string | null>(null);
  const [isEmitting, setIsEmitting] = useState(false);
  const [emitido, setEmitido] = useState<(ComprobanteEmitido & { credito: string }) | null>(null);
  const [preview, setPreview] = useState<PreviewComprobanteCredito | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (puedeElegirAgencia) listAgencias().then((res) => setAgencias(res.data.data));
  }, [puedeElegirAgencia]);

  function load() {
    setIsLoading(true);
    setLoadError(null);
    listCreditosPendientesFacturar(agenciaId || undefined)
      .then((res) => setCreditos(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // Base imponible e IGV del comprobante a emitir, sin consumir correlativo.
  useEffect(() => {
    setPreview(null);
    setPreviewError(null);
    if (!target) return;

    let active = true;
    previsualizarComprobanteCredito(target.id)
      .then((res) => {
        if (active) setPreview(res.data);
      })
      .catch((err) => {
        if (active) setPreviewError(err instanceof Error ? err.message : 'Error desconocido');
      });

    return () => {
      active = false;
    };
  }, [target]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [agenciaId]);

  if (!canVerFacturacion(user)) {
    return <Navigate to="/" replace />;
  }

  const puedeEmitir = canEmitirFacturacion(user);

  async function handleEmitir(event: FormEvent) {
    event.preventDefault();
    if (!target) return;

    setEmitError(null);
    setIsEmitting(true);

    try {
      const res = await emitirComprobanteCredito(target.id, observaciones);
      setEmitido({ ...res.data, credito: target.codigo });
      setTarget(null);
      load();
    } catch (err) {
      setEmitError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsEmitting(false);
    }
  }

  const columns: DataTableColumn<CreditoPendienteFacturar>[] = [
    { header: 'Crédito', render: (c) => c.codigo },
    { header: 'Cliente', render: (c) => c.cliente },
    { header: 'Documento', render: (c) => c.documento },
    { header: 'Préstamo', align: 'right', render: (c) => formatMonto(c.monto_prestamo) },
    { header: 'Estado', render: (c) => c.estado },
    { header: 'Vencimiento', render: (c) => formatFecha(c.fecha_vencimiento) },
    ...(puedeEmitir
      ? [
          {
            header: 'Acciones',
            align: 'right' as const,
            render: (c: CreditoPendienteFacturar) => (
              <RowActions
                actions={[
                  {
                    key: 'emitir',
                    label: 'Emitir comprobante',
                    icon: <ReceiptLongIcon fontSize="small" />,
                    onClick: () => {
                      setObservaciones('');
                      setEmitError(null);
                      setTarget(c);
                    },
                  },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Créditos pendientes de facturar
      </Typography>

      {emitido && (
        <Alert severity="success" onClose={() => setEmitido(null)}>
          {emitido.tipo} {emitido.numero} generada para el crédito {emitido.credito} por {formatMonto(emitido.total)}.
          Queda pendiente de envío a SUNAT: se envía automáticamente en los próximos minutos.
        </Alert>
      )}

      {puedeElegirAgencia && (
        <TextField
          select
          label="Agencia"
          value={agenciaId}
          onChange={(e) => setAgenciaId(e.target.value ? Number(e.target.value) : '')}
          sx={{ maxWidth: 320 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {agencias.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.nombre.toUpperCase()}
            </MenuItem>
          ))}
        </TextField>
      )}

      <ErrorBanner error={loadError} />

      <DataTable
        columns={columns}
        rows={creditos}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay créditos pendientes de facturar"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={!!target} onClose={preventBackdropClose(() => setTarget(null))} fullWidth maxWidth="sm">
        <form onSubmit={handleEmitir}>
          <DialogHeader onClose={() => setTarget(null)}>Emitir comprobante</DialogHeader>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <ErrorBanner error={emitError} />
              <Typography variant="body2">
                Crédito <strong>{target?.codigo}</strong> — {target?.cliente} ({target?.documento})
              </Typography>
              <ErrorBanner error={previewError} />
              {preview ? (
                <Stack spacing={0.25} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {preview.tipo_nombre} {preview.serie}-{preview.correlativo_siguiente} (correlativo estimado)
                  </Typography>
                  <Typography variant="body2">Base imponible: {formatMonto(preview.base)}</Typography>
                  <Typography variant="body2">IGV: {formatMonto(preview.igv)}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Total: {formatMonto(preview.total)}
                  </Typography>
                </Stack>
              ) : (
                !previewError && <CircularProgress size={20} color="inherit" />
              )}
              <Typography variant="body2" color="text.secondary">
                Solo se factura el interés y la mora cobrados, nunca el capital. Al emitir se consume el correlativo.
              </Typography>
              <TextField
                label="Observaciones"
                multiline
                minRows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isEmitting || !preview}>
              {isEmitting ? 'Emitiendo...' : 'Emitir'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}
