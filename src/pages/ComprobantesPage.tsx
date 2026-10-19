import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SendIcon from '@mui/icons-material/Send';
import SyncIcon from '@mui/icons-material/Sync';
import BlockIcon from '@mui/icons-material/Block';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import {
  canAnularFacturacion,
  canDescargarFacturacion,
  canEmitirFacturacion,
  canVerFacturacion,
  ESTADO_COMPROBANTE_COLOR,
  ESTADO_COMPROBANTE_LABEL,
  ESTADOS_ANULABLES_LOCAL,
  ESTADOS_CON_CDR,
  ESTADOS_REENVIABLES,
  TIPO_DOCUMENTO_SUNAT_LABEL,
} from '../utils/facturacion';
import {
  anularComprobante,
  consultarCdrComprobante,
  getComprobante,
  getComprobantePdf,
  listComprobantes,
  reenviarComprobante,
  type ComprobantesFilters,
} from '../api/facturacion';
import { listAgencias } from '../api/agencias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions, type RowAction } from '../components/RowActions';
import { DialogHeader } from '../components/DialogHeader';
import { MediaLightbox, type MediaLightboxItem } from '../components/MediaLightbox';
import { preventBackdropClose } from '../utils/dialog';
import { formatFecha, formatFechaHora, formatMonto } from '../utils/format';
import type { Agencia, Comprobante, EstadoComprobante, TipoDocumentoSunat } from '../types/api';
import { ErrorBanner } from '../components/ErrorBanner';

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Error desconocido');

function EstadoChip({ estado }: { estado: EstadoComprobante }) {
  return <Chip label={ESTADO_COMPROBANTE_LABEL[estado]} size="small" color={ESTADO_COMPROBANTE_COLOR[estado]} />;
}

/**
 * Comprobantes electrónicos emitidos. Las acciones dependen del estado: los
 * nunca enviados se reintentan o se anulan localmente; los que ya llegaron a
 * SUNAT se consultan (CDR). Dar de baja un aceptado (comunicar baja) aún no
 * existe en el backend.
 */
export function ComprobantesPage() {
  const { user } = useAuth();
  const puedeElegirAgencia = !hasRole(user, 'administrador_agencia', 'supervisor');

  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [filters, setFilters] = useState<ComprobantesFilters>({});
  const [page, setPage] = useState(1);
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [detalle, setDetalle] = useState<Comprobante | null>(null);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  const [anularTarget, setAnularTarget] = useState<Comprobante | null>(null);
  const [motivo, setMotivo] = useState('');
  const [anularError, setAnularError] = useState<string | null>(null);
  const [isAnulando, setIsAnulando] = useState(false);

  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);

  useEffect(() => {
    if (puedeElegirAgencia) listAgencias().then((res) => setAgencias(res.data.data));
  }, [puedeElegirAgencia]);

  function load() {
    setIsLoading(true);
    setLoadError(null);
    listComprobantes(page, filters)
      .then((res) => {
        setComprobantes(res.data.data);
        setLastPage(res.data.last_page);
      })
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [page, filters]);

  if (!canVerFacturacion(user)) {
    return <Navigate to="/" replace />;
  }

  function setFilter(patch: ComprobantesFilters) {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  }

  async function openDetalle(c: Comprobante) {
    setDetalleError(null);
    setDetalle(c);
    try {
      const res = await getComprobante(c.id);
      setDetalle(res.data);
    } catch (err) {
      setDetalleError(errorMessage(err));
    }
  }

  async function verPdf(c: Comprobante) {
    setActingId(c.id);
    setActionMessage(null);
    try {
      const blob = await getComprobantePdf(c.id);
      setLightbox({ type: 'pdf', url: URL.createObjectURL(blob), label: c.numero });
    } catch (err) {
      setActionMessage({ severity: 'error', text: errorMessage(err) });
    } finally {
      setActingId(null);
    }
  }

  function closeLightbox() {
    setLightbox((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }

  async function runAccion(c: Comprobante, accion: 'reenviar' | 'cdr') {
    setActingId(c.id);
    setActionMessage(null);
    try {
      if (accion === 'reenviar') {
        const res = await reenviarComprobante(c.id);
        setActionMessage({
          severity: 'success',
          text: `${res.data.numero}: ${ESTADO_COMPROBANTE_LABEL[res.data.estado]}.`,
        });
      } else {
        const res = await consultarCdrComprobante(c.id);
        setActionMessage({
          severity: 'success',
          text: `${res.data.numero}: ${ESTADO_COMPROBANTE_LABEL[res.data.estado]}${res.data.cdr_descripcion ? ` — ${res.data.cdr_descripcion}` : ''}`,
        });
        if (detalle?.id === c.id) setDetalle({ ...detalle, ...res.data });
      }
      load();
    } catch (err) {
      setActionMessage({ severity: 'error', text: `${c.numero}: ${errorMessage(err)}` });
    } finally {
      setActingId(null);
    }
  }

  async function handleAnular() {
    if (!anularTarget) return;
    setAnularError(null);
    setIsAnulando(true);
    try {
      await anularComprobante(anularTarget.id, motivo);
      setAnularTarget(null);
      if (detalle?.id === anularTarget.id) setDetalle(null);
      load();
    } catch (err) {
      setAnularError(errorMessage(err));
    } finally {
      setIsAnulando(false);
    }
  }

  function acciones(c: Comprobante): RowAction[] {
    const busy = actingId === c.id;
    const list: RowAction[] = [
      { key: 'ver', label: 'Ver detalle', icon: <VisibilityIcon fontSize="small" />, onClick: () => openDetalle(c) },
    ];

    if (canDescargarFacturacion(user)) {
      list.push({ key: 'pdf', label: 'Ver PDF', icon: <PictureAsPdfIcon fontSize="small" />, disabled: busy, onClick: () => verPdf(c) });
    }
    if (canEmitirFacturacion(user) && ESTADOS_REENVIABLES.includes(c.estado)) {
      list.push({
        key: 'reenviar',
        label: 'Enviar a SUNAT ahora',
        icon: <SendIcon fontSize="small" />,
        disabled: busy,
        onClick: () => runAccion(c, 'reenviar'),
      });
    }
    // Las boletas que van por resumen diario aún no se pueden consultar en el backend.
    if (ESTADOS_CON_CDR.includes(c.estado) && !c.resumen_diario_ticket) {
      list.push({
        key: 'cdr',
        label: 'Consultar estado en SUNAT',
        icon: <SyncIcon fontSize="small" />,
        disabled: busy,
        onClick: () => runAccion(c, 'cdr'),
      });
    }
    if (canAnularFacturacion(user) && ESTADOS_ANULABLES_LOCAL.includes(c.estado)) {
      list.push({
        key: 'anular',
        label: 'Anular (no enviado)',
        icon: <BlockIcon fontSize="small" />,
        disabled: busy,
        onClick: () => {
          setMotivo('');
          setAnularError(null);
          setAnularTarget(c);
        },
      });
    }

    return list;
  }

  const columns: DataTableColumn<Comprobante>[] = [
    { header: 'Número', render: (c) => <strong>{c.numero}</strong> },
    { header: 'Tipo', render: (c) => TIPO_DOCUMENTO_SUNAT_LABEL[c.tipo_documento] },
    { header: 'Emisión', render: (c) => formatFecha(c.fecha_emision) },
    { header: 'Cliente', render: (c) => `${c.receptor_nombre.toUpperCase()} (${c.receptor_numero_documento})` },
    { header: 'Total', align: 'right', render: (c) => formatMonto(c.total) },
    { header: 'Estado', render: (c) => <EstadoChip estado={c.estado} /> },
    { header: 'Acciones', align: 'right', render: (c) => <RowActions actions={acciones(c)} /> },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Comprobantes electrónicos
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Desde"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.fecha_desde ?? ''}
          onChange={(e) => setFilter({ fecha_desde: e.target.value || undefined })}
          fullWidth
        />
        <TextField
          label="Hasta"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.fecha_hasta ?? ''}
          onChange={(e) => setFilter({ fecha_hasta: e.target.value || undefined })}
          fullWidth
        />
        <TextField
          select
          label="Tipo"
          value={filters.tipo_documento ?? ''}
          onChange={(e) => setFilter({ tipo_documento: (e.target.value || undefined) as TipoDocumentoSunat | undefined })}
          fullWidth
        >
          <MenuItem value="">Todos</MenuItem>
          {(Object.keys(TIPO_DOCUMENTO_SUNAT_LABEL) as TipoDocumentoSunat[]).map((t) => (
            <MenuItem key={t} value={t}>
              {TIPO_DOCUMENTO_SUNAT_LABEL[t]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Estado"
          value={filters.estado ?? ''}
          onChange={(e) => setFilter({ estado: (e.target.value || undefined) as EstadoComprobante | undefined })}
          fullWidth
        >
          <MenuItem value="">Todos</MenuItem>
          {(Object.keys(ESTADO_COMPROBANTE_LABEL) as EstadoComprobante[]).map((e) => (
            <MenuItem key={e} value={e}>
              {ESTADO_COMPROBANTE_LABEL[e]}
            </MenuItem>
          ))}
        </TextField>
        {puedeElegirAgencia && (
          <TextField
            select
            label="Agencia"
            value={filters.agencia_id ?? ''}
            onChange={(e) => setFilter({ agencia_id: e.target.value ? Number(e.target.value) : undefined })}
            fullWidth
          >
            <MenuItem value="">Todas</MenuItem>
            {agencias.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.nombre.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>

      <ErrorBanner error={loadError} />
      <ErrorBanner error={actionMessage?.severity === 'error' ? actionMessage.text : null} />
      {actionMessage && actionMessage.severity !== 'error' && (
        <Alert severity={actionMessage.severity} onClose={() => setActionMessage(null)}>
          {actionMessage.text}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={comprobantes}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay comprobantes"
        page={page}
        lastPage={lastPage}
        onPageChange={setPage}
      />

      <Dialog open={!!detalle} onClose={() => setDetalle(null)} fullWidth maxWidth="md">
        {detalle && (
          <>
            <DialogHeader onClose={() => setDetalle(null)}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <span>
                  {TIPO_DOCUMENTO_SUNAT_LABEL[detalle.tipo_documento]} {detalle.numero}
                </span>
                <EstadoChip estado={detalle.estado} />
              </Stack>
            </DialogHeader>
            <DialogContent>
              <Stack spacing={2}>
                <ErrorBanner error={detalleError} />
                {detalle.estado === 'generado' && (
                  <Alert severity="info">
                    Pendiente de envío a SUNAT: se envía automáticamente cada 15 minutos, o usa "Enviar a SUNAT ahora".
                  </Alert>
                )}
                {detalle.cdr_descripcion && (
                  <Alert severity={detalle.estado === 'aceptado' ? 'success' : detalle.estado === 'observado' ? 'warning' : 'error'}>
                    SUNAT{detalle.cdr_codigo ? ` (${detalle.cdr_codigo})` : ''}: {detalle.cdr_descripcion}
                  </Alert>
                )}
                {detalle.estado === 'anulado' && detalle.motivo_anulacion && (
                  <Alert severity="info">Anulado: {detalle.motivo_anulacion}</Alert>
                )}

                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <strong>Cliente:</strong> {detalle.receptor_nombre.toUpperCase()} —{' '}
                    {detalle.receptor_tipo_documento.toUpperCase()} {detalle.receptor_numero_documento}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Emisión:</strong> {formatFecha(detalle.fecha_emision)} {detalle.hora_emision ?? ''} ·{' '}
                    <strong>Moneda:</strong> {detalle.moneda}
                  </Typography>
                  {detalle.enviado_at && (
                    <Typography variant="body2">
                      <strong>Enviado:</strong> {formatFechaHora(detalle.enviado_at)}
                      {detalle.aceptado_at && ` · Aceptado: ${formatFechaHora(detalle.aceptado_at)}`}
                    </Typography>
                  )}
                  {detalle.observaciones && (
                    <Typography variant="body2">
                      <strong>Observaciones:</strong> {detalle.observaciones}
                    </Typography>
                  )}
                </Stack>

                {!detalle.detalles ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    {!detalleError && <CircularProgress size={24} color="inherit" />}
                  </Box>
                ) : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Descripción</TableCell>
                          <TableCell align="right">Cant.</TableCell>
                          <TableCell align="right">P. unitario</TableCell>
                          <TableCell align="right">Valor venta</TableCell>
                          <TableCell align="right">IGV</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detalle.detalles.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell>{d.descripcion}</TableCell>
                            <TableCell align="right">{Number(d.cantidad)}</TableCell>
                            <TableCell align="right">{formatMonto(d.precio_unitario)}</TableCell>
                            <TableCell align="right">{formatMonto(d.valor_venta)}</TableCell>
                            <TableCell align="right">{formatMonto(d.igv)}</TableCell>
                            <TableCell align="right">{formatMonto(d.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}

                <Stack sx={{ alignItems: 'flex-end' }} spacing={0.25}>
                  <Typography variant="body2">Op. gravada: {formatMonto(detalle.subtotal)}</Typography>
                  <Typography variant="body2">IGV: {formatMonto(detalle.igv)}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Total: {formatMonto(detalle.total)}
                  </Typography>
                  {detalle.importe_letras && (
                    <Typography variant="caption" color="text.secondary">
                      SON: {detalle.importe_letras}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, flexWrap: 'wrap', gap: 1 }}>
              {acciones(detalle)
                .filter((a) => a.key !== 'ver')
                .map((a) => (
                  <Button key={a.key} startIcon={a.icon} onClick={a.onClick} disabled={a.disabled}>
                    {a.label}
                  </Button>
                ))}
              <Button variant="contained" onClick={() => setDetalle(null)}>
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={!!anularTarget} onClose={preventBackdropClose(() => setAnularTarget(null))} fullWidth maxWidth="xs">
        <DialogHeader onClose={() => setAnularTarget(null)}>Anular {anularTarget?.numero}</DialogHeader>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <ErrorBanner error={anularError} />
            <Typography variant="body2">
              Este comprobante nunca llegó a SUNAT, así que se anula solo en el sistema. No se puede deshacer.
            </Typography>
            <TextField
              label="Motivo"
              required
              multiline
              minRows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAnularTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleAnular} disabled={isAnulando || !motivo.trim()}>
            {isAnulando ? 'Anulando...' : 'Anular'}
          </Button>
        </DialogActions>
      </Dialog>

      <MediaLightbox item={lightbox} onClose={closeLightbox} />
    </Stack>
  );
}
