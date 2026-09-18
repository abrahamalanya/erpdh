import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getCajaCicloDetalle } from '../api/reportes';
import { extractUserName } from '../utils/cajaHierarchy';
import { formatFechaHora, formatMonto } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import { DialogHeader } from './DialogHeader';
import type {
  CajaAperturaCierreItem,
  CajaCicloDetalle,
  CajaLineaBilletaje,
  CajaLineaCobro,
  CajaLineaDesembolso,
  CajaLineaMovimiento,
  MedioCobro,
} from '../types/api';

interface CajaCicloDetalleDialogProps {
  row: CajaAperturaCierreItem | null;
  onClose: () => void;
}

type ItemDetalle =
  | { tipo: 'billetaje'; item: CajaLineaBilletaje }
  | { tipo: 'movimiento'; titulo: string; item: CajaLineaMovimiento }
  | { tipo: 'cobro'; item: CajaLineaCobro }
  | { tipo: 'desembolso'; item: CajaLineaDesembolso };

const MEDIO_COBRO_LABEL: Record<MedioCobro, string> = {
  efectivo: 'Efectivo',
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia',
};

/**
 * Una sección "Título — TOTAL" con su tabla de líneas (# | Fecha y hora |
 * <columna> | Monto | ver detalle) — el mismo shape para billetaje,
 * ingresos, egresos y cada medio de cobranza; solo cambia qué texto va en
 * la tercera columna.
 */
function SeccionDetalle<T extends { id: number; fecha: string | null; monto: string }>({
  titulo,
  columna,
  total,
  filas,
  etiquetaDe,
  onVer,
}: {
  titulo: string;
  columna: string;
  total: string;
  filas: T[];
  etiquetaDe: (fila: T) => ReactNode;
  onVer: (fila: T) => void;
}) {
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
        <Typography variant="subtitle2">{titulo}</Typography>
        <Typography variant="subtitle2">{formatMonto(total)}</Typography>
      </Stack>
      <TableContainer component={Box} sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={36}>#</TableCell>
              <TableCell>Fecha y hora</TableCell>
              <TableCell>{columna}</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell width={40} />
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>
                  Sin registros
                </TableCell>
              </TableRow>
            ) : (
              filas.map((fila, index) => (
                <TableRow key={fila.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{formatFechaHora(fila.fecha)}</TableCell>
                  <TableCell>{etiquetaDe(fila)}</TableCell>
                  <TableCell align="right">{formatMonto(fila.monto)}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" aria-label="Ver detalle" onClick={() => onVer(fila)}>
                      <VisibilityIcon fontSize="inherit" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function CampoDetalle({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Typography variant="body2">
      <strong>{label}:</strong> {value ?? '—'}
    </Typography>
  );
}

function ItemDetalleDialog({ detalle, onClose }: { detalle: ItemDetalle | null; onClose: () => void }) {
  const titulo =
    detalle?.tipo === 'billetaje'
      ? 'Billetaje'
      : detalle?.tipo === 'movimiento'
        ? detalle.titulo
        : detalle?.tipo === 'cobro'
          ? 'Cobranza'
          : 'Desembolso';

  return (
    <Dialog open={!!detalle} onClose={preventBackdropClose(onClose)} fullWidth maxWidth="xs">
      <DialogHeader onClose={onClose}>{titulo}</DialogHeader>
      <DialogContent>
        <Stack spacing={1} sx={{ pt: 1, pb: 1 }}>
          {detalle?.tipo === 'billetaje' && (
            <>
              <CampoDetalle label="Fecha" value={formatFechaHora(detalle.item.fecha)} />
              <CampoDetalle label="Motivo" value={detalle.item.motivo} />
              <CampoDetalle label="Monto" value={formatMonto(detalle.item.monto)} />
              <CampoDetalle
                label="Medio de recepción"
                value={detalle.item.medio_recepcion ? MEDIO_COBRO_LABEL[detalle.item.medio_recepcion] : null}
              />
              <CampoDetalle label="Datos de recepción" value={detalle.item.datos_recepcion} />
              <CampoDetalle label="Solicitado por" value={extractUserName(detalle.item.solicitado_por)} />
              <CampoDetalle label="Aprobado por" value={extractUserName(detalle.item.aprobado_por)} />
            </>
          )}
          {detalle?.tipo === 'movimiento' && (
            <>
              <CampoDetalle label="Fecha" value={formatFechaHora(detalle.item.fecha)} />
              <CampoDetalle label="Concepto" value={detalle.item.concepto} />
              <CampoDetalle label="Monto" value={formatMonto(detalle.item.monto)} />
              <CampoDetalle label="Descripción" value={detalle.item.descripcion} />
              <CampoDetalle label="Registrado por" value={extractUserName(detalle.item.registrado_por)} />
              {detalle.item.comprobante_url && (
                <Typography variant="body2">
                  <strong>Comprobante:</strong>{' '}
                  <a href={detalle.item.comprobante_url} target="_blank" rel="noreferrer">
                    Ver
                  </a>
                </Typography>
              )}
            </>
          )}
          {detalle?.tipo === 'cobro' && (
            <>
              <CampoDetalle label="Fecha" value={formatFechaHora(detalle.item.fecha)} />
              <CampoDetalle
                label="Cliente"
                value={detalle.item.cliente ? `${detalle.item.cliente.nombre} ${detalle.item.cliente.apellido}` : null}
              />
              <CampoDetalle label="Crédito" value={detalle.item.credito_id ? `#${detalle.item.credito_id}` : null} />
              <CampoDetalle label="Operación" value={detalle.item.operacion} />
              <CampoDetalle label="Monto" value={formatMonto(detalle.item.monto)} />
              <CampoDetalle label="Medio" value={MEDIO_COBRO_LABEL[detalle.item.medio]} />
              <CampoDetalle label="Interés" value={detalle.item.interes ? formatMonto(detalle.item.interes) : null} />
              <CampoDetalle label="Mora" value={detalle.item.mora ? formatMonto(detalle.item.mora) : null} />
              <CampoDetalle label="Descuento" value={detalle.item.descuento ? formatMonto(detalle.item.descuento) : null} />
              <CampoDetalle label="Registrado por" value={extractUserName(detalle.item.registrado_por)} />
            </>
          )}
          {detalle?.tipo === 'desembolso' && (
            <>
              <CampoDetalle label="Fecha" value={formatFechaHora(detalle.item.fecha)} />
              <CampoDetalle
                label="Cliente"
                value={detalle.item.cliente ? `${detalle.item.cliente.nombre} ${detalle.item.cliente.apellido}` : null}
              />
              <CampoDetalle label="Crédito" value={detalle.item.credito_id ? `#${detalle.item.credito_id}` : null} />
              <CampoDetalle label="Monto" value={formatMonto(detalle.item.monto)} />
              <CampoDetalle label="Registrado por" value={extractUserName(detalle.item.registrado_por)} />
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

/** "Ver detalle" del reporte de cajas: desglose línea por línea de un ciclo, cargado bajo demanda. */
export function CajaCicloDetalleDialog({ row, onClose }: CajaCicloDetalleDialogProps) {
  const [detalle, setDetalle] = useState<CajaCicloDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemDetalle, setItemDetalle] = useState<ItemDetalle | null>(null);

  useEffect(() => {
    if (!row) {
      setDetalle(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    getCajaCicloDetalle(row.id)
      .then((res) => setDetalle(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [row]);

  const diferenciaColor =
    detalle?.diferencia == null ? undefined : Number(detalle.diferencia) < 0 ? 'error.main' : Number(detalle.diferencia) > 0 ? 'warning.main' : 'success.main';
  const diferenciaLabel =
    detalle?.diferencia == null ? null : Number(detalle.diferencia) < 0 ? 'Faltante' : Number(detalle.diferencia) > 0 ? 'Sobrante' : 'Cuadrada';

  return (
    <>
      <Dialog open={!!row} onClose={preventBackdropClose(onClose)} fullWidth maxWidth="md">
        <DialogHeader onClose={onClose}>
          Detalle del ciclo{row ? ` · ${extractUserName(row.usuario) ?? ''}` : ''}
        </DialogHeader>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {row && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Cobrador: {extractUserName(row.usuario) ?? '—'}
                </Typography>
                <TableContainer component={Box} sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell />
                        <TableCell>Fecha</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell component="th" scope="row">Apertura</TableCell>
                        <TableCell>{formatFechaHora(row.fecha_apertura)}</TableCell>
                        <TableCell align="right">{formatMonto(row.valor_aperturado)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">Cierre</TableCell>
                        <TableCell>{row.fecha_cierre ? formatFechaHora(row.fecha_cierre) : '— (sigue abierta)'}</TableCell>
                        <TableCell align="right">{row.valor_cerrado !== null ? formatMonto(row.valor_cerrado) : '—'}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {row.cierre_forzado && <Chip label="Cierre forzado" size="small" color="warning" />}
                  {row.cierre_automatico && <Chip label="Cierre automático" size="small" color="info" />}
                </Stack>
              </Box>
            )}

            {isLoading && (
              <Stack sx={{ alignItems: 'center', py: 3 }}>
                <CircularProgress size={28} />
              </Stack>
            )}

            {detalle && !isLoading && (
              <>
                <SeccionDetalle
                  titulo="Billetaje"
                  columna="Motivo"
                  total={detalle.total_billetaje}
                  filas={detalle.billetajes}
                  etiquetaDe={(b) => b.motivo ?? '—'}
                  onVer={(b) => setItemDetalle({ tipo: 'billetaje', item: b })}
                />
                <SeccionDetalle
                  titulo="Ingresos"
                  columna="Concepto"
                  total={detalle.total_ingresos}
                  filas={detalle.ingresos}
                  etiquetaDe={(m) => m.concepto ?? '—'}
                  onVer={(m) => setItemDetalle({ tipo: 'movimiento', titulo: 'Ingreso', item: m })}
                />
                <SeccionDetalle
                  titulo="Egresos"
                  columna="Concepto"
                  total={detalle.total_egresos}
                  filas={detalle.egresos}
                  etiquetaDe={(m) => m.concepto ?? '—'}
                  onVer={(m) => setItemDetalle({ tipo: 'movimiento', titulo: 'Egreso', item: m })}
                />
                {(Object.keys(MEDIO_COBRO_LABEL) as MedioCobro[]).map((medio) => (
                  <SeccionDetalle
                    key={medio}
                    titulo={`Cobranzas ${MEDIO_COBRO_LABEL[medio]}`}
                    columna="Cliente"
                    total={detalle.totales_cobranza[medio]}
                    filas={detalle.cobranzas[medio]}
                    etiquetaDe={(c) => (c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}` : '—')}
                    onVer={(c) => setItemDetalle({ tipo: 'cobro', item: c })}
                  />
                ))}
                <SeccionDetalle
                  titulo="Desembolsos"
                  columna="Cliente"
                  total={detalle.total_desembolso}
                  filas={detalle.desembolsos}
                  etiquetaDe={(d) => (d.cliente ? `${d.cliente.nombre} ${d.cliente.apellido}` : '—')}
                  onVer={(d) => setItemDetalle({ tipo: 'desembolso', item: d })}
                />

                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>SALDO TOTAL</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{formatMonto(detalle.saldo_total)}</Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="body2">SALDO DE CIERRE</Typography>
                      <Typography variant="body2">
                        {detalle.saldo_cierre !== null ? formatMonto(detalle.saldo_cierre) : '— (sigue abierta)'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>DIFERENCIA</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: diferenciaColor }}>
                        {detalle.diferencia !== null ? `${formatMonto(detalle.diferencia)} (${diferenciaLabel})` : '—'}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <ItemDetalleDialog detalle={itemDetalle} onClose={() => setItemDetalle(null)} />
    </>
  );
}
