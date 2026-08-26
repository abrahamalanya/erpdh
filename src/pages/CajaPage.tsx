import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { canAccederCajaPropia, canSolicitarBilletaje } from '../utils/cajaHierarchy';
import { hasPermission } from '../utils/roles';
import { aperturarCaja, cerrarCaja, getMiCaja, getResumenCierre } from '../api/caja';
import { solicitarBilletaje } from '../api/billetajes';
import { listClientes } from '../api/clientes';
import { RegistrarMovimientoCajaDialog } from '../components/RegistrarMovimientoCajaDialog';
import { formatFecha, formatFechaHora, formatMonto } from '../utils/format';
import { movimientoCicloColor, movimientoCicloLabel } from '../utils/cajaMovimientos';
import type { Caja, CajaCiclo, Cliente, MedioRecepcionBilletaje } from '../types/api';

export function CajaPage() {
  const { user } = useAuth();

  const [caja, setCaja] = useState<Caja | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isAperturando, setIsAperturando] = useState(false);

  const [cerrarOpen, setCerrarOpen] = useState(false);
  const [montoContado, setMontoContado] = useState('');
  const [isCerrando, setIsCerrando] = useState(false);
  const [cerrarError, setCerrarError] = useState<string | null>(null);
  const [ultimoCierre, setUltimoCierre] = useState<CajaCiclo | null>(null);
  const [resumen, setResumen] = useState<CajaCiclo | null>(null);
  const [isLoadingResumen, setIsLoadingResumen] = useState(false);
  const [resumenError, setResumenError] = useState<string | null>(null);

  const [billetajeOpen, setBilletajeOpen] = useState(false);
  const [montoBilletaje, setMontoBilletaje] = useState('');
  const [motivoBilletaje, setMotivoBilletaje] = useState('');
  const [medioRecepcion, setMedioRecepcion] = useState<MedioRecepcionBilletaje>('efectivo');
  const [datosRecepcion, setDatosRecepcion] = useState('');
  const [clienteBilletaje, setClienteBilletaje] = useState<Cliente | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isSolicitando, setIsSolicitando] = useState(false);
  const [billetajeError, setBilletajeError] = useState<string | null>(null);
  const [billetajeOk, setBilletajeOk] = useState(false);

  const [movimientoTipo, setMovimientoTipo] = useState<'ingreso' | 'egreso' | null>(null);
  const [movimientoOk, setMovimientoOk] = useState(false);

  function loadCaja() {
    setIsLoading(true);
    setLoadError(null);

    getMiCaja()
      .then((res) => setCaja(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadCaja, []);

  if (!canAccederCajaPropia(user)) {
    return <Navigate to="/" replace />;
  }

  async function handleAperturar() {
    setIsAperturando(true);
    setLoadError(null);

    try {
      await aperturarCaja();
      loadCaja();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsAperturando(false);
    }
  }

  function openCerrarDialog() {
    setCerrarOpen(true);
    setCerrarError(null);
    // Left empty until the resumen response sets it to saldo_efectivo below —
    // prefilling with caja.saldo_actual here would flash the wrong (total,
    // includes digital billetaje) figure before the correct one arrives.
    setMontoContado('');
    setIsLoadingResumen(true);
    setResumenError(null);

    getResumenCierre()
      .then((res) => {
        setResumen(res.data);
        if (res.data.saldo_efectivo !== undefined) {
          setMontoContado(res.data.saldo_efectivo);
        }
      })
      .catch((err) => setResumenError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoadingResumen(false));
  }

  function closeCerrarDialog() {
    setCerrarOpen(false);
    setMontoContado('');
    setResumen(null);
  }

  async function handleCerrar(event: FormEvent) {
    event.preventDefault();
    setCerrarError(null);
    setIsCerrando(true);

    try {
      const res = await cerrarCaja(montoContado);
      setUltimoCierre(res.data);
      closeCerrarDialog();
      loadCaja();
    } catch (err) {
      setCerrarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsCerrando(false);
    }
  }

  function openBilletajeDialog() {
    setBilletajeOpen(true);
    if (clientes.length === 0) {
      listClientes().then((res) => setClientes(res.data.data));
    }
  }

  function closeBilletajeDialog() {
    setBilletajeOpen(false);
    setMontoBilletaje('');
    setMotivoBilletaje('');
    setMedioRecepcion('efectivo');
    setDatosRecepcion('');
    setClienteBilletaje(null);
  }

  async function handleSolicitarBilletaje(event: FormEvent) {
    event.preventDefault();
    setBilletajeError(null);
    setIsSolicitando(true);

    try {
      await solicitarBilletaje(
        montoBilletaje,
        motivoBilletaje,
        medioRecepcion,
        datosRecepcion || undefined,
        clienteBilletaje?.id
      );
      closeBilletajeDialog();
      setBilletajeOk(true);
    } catch (err) {
      setBilletajeError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSolicitando(false);
    }
  }

  const ciclo = caja?.ciclo_abierto ?? null;
  const saldoCalculado = resumen?.saldo_calculado ?? null;
  const saldoEfectivo = resumen?.saldo_efectivo ?? null;
  const tieneSaldoDigital = saldoCalculado !== null && saldoEfectivo !== null && saldoCalculado !== saldoEfectivo;
  const diferencia =
    saldoEfectivo !== null && montoContado !== '' ? Number(montoContado) - Number(saldoEfectivo) : null;

  return (
    <Stack spacing={3} sx={{ maxWidth: 560 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Mi caja
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}
      {ultimoCierre && (
        <Alert severity="info" onClose={() => setUltimoCierre(null)}>
          Caja cerrada. Efectivo esperado: {formatMonto(ultimoCierre.saldo_efectivo_cierre ?? '0')} ·
          Contado: {formatMonto(ultimoCierre.saldo_arqueo_cierre ?? '0')} · Diferencia:{' '}
          {formatMonto(ultimoCierre.diferencia ?? '0')}
          {ultimoCierre.saldo_calculado_cierre !== ultimoCierre.saldo_efectivo_cierre &&
            ` · Total con digital: ${formatMonto(ultimoCierre.saldo_calculado_cierre ?? '0')}`}
        </Alert>
      )}
      {billetajeOk && (
        <Alert severity="success" onClose={() => setBilletajeOk(false)}>
          Billetaje solicitado. Queda pendiente de aprobación.
        </Alert>
      )}
      {movimientoOk && (
        <Alert severity="success" onClose={() => setMovimientoOk(false)}>
          Movimiento registrado.
        </Alert>
      )}

      {isLoading ? (
        <CircularProgress color="inherit" />
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">Estado</Typography>
                <Chip
                  label={ciclo ? 'Abierta' : 'Cerrada'}
                  color={ciclo ? 'success' : 'default'}
                  size="small"
                />
              </Stack>

              {ciclo ? (
                <>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Abierta desde {ciclo.abierta_at ? formatFechaHora(ciclo.abierta_at) : formatFecha(ciclo.fecha)}
                  </Typography>
                  <Typography variant="body2">
                    Saldo de apertura: {formatMonto(ciclo.saldo_apertura)}
                  </Typography>
                  {caja?.saldo_actual !== undefined && caja?.saldo_actual !== null && (
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      Saldo actual: {formatMonto(caja.saldo_actual)}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {hasPermission(user, 'caja_movimientos.crear') && (
                      <>
                        <Button variant="outlined" onClick={() => setMovimientoTipo('ingreso')}>
                          Registrar ingreso
                        </Button>
                        <Button variant="outlined" color="error" onClick={() => setMovimientoTipo('egreso')}>
                          Registrar gasto
                        </Button>
                      </>
                    )}
                    {canSolicitarBilletaje(user) && (
                      <Button variant="outlined" onClick={openBilletajeDialog}>
                        Solicitar billetaje
                      </Button>
                    )}
                    <Button variant="contained" onClick={openCerrarDialog}>
                      Cerrar caja
                    </Button>
                  </Stack>
                </>
              ) : (
                <Button variant="contained" onClick={handleAperturar} disabled={isAperturando}>
                  {isAperturando ? 'Aperturando...' : 'Aperturar caja'}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={cerrarOpen} onClose={closeCerrarDialog} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleCerrar}>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {cerrarError && <Alert severity="error">{cerrarError}</Alert>}
              {resumenError && <Alert severity="error">{resumenError}</Alert>}

              {isLoadingResumen ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={28} color="inherit" />
                </Box>
              ) : (
                resumen && (
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Movimientos del ciclo</Typography>
                    {(resumen.movimientos ?? []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No hay movimientos registrados en este ciclo.
                      </Typography>
                    ) : (
                      <Stack spacing={0.5} sx={{ maxHeight: 220, overflowY: 'auto' }}>
                        {(resumen.movimientos ?? []).map((m) => (
                          <Stack
                            key={m.id}
                            direction="row"
                            spacing={1}
                            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                              <Chip
                                label={movimientoCicloLabel(m)}
                                size="small"
                                color={movimientoCicloColor(m)}
                                sx={{ flexShrink: 0 }}
                              />
                              {m.medio === 'cuenta_bancaria' && (
                                <Chip
                                  label={m.canal ? m.canal.charAt(0).toUpperCase() + m.canal.slice(1) : 'Digital'}
                                  size="small"
                                  variant="outlined"
                                  sx={{ flexShrink: 0 }}
                                />
                              )}
                              <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.concepto}
                              </Typography>
                            </Stack>
                            <Typography
                              variant="body2"
                              sx={{ color: m.tipo === 'egreso' ? 'error.main' : 'success.main', fontWeight: 600, flexShrink: 0 }}
                            >
                              {m.tipo === 'egreso' ? '− ' : '+ '}
                              {formatMonto(m.monto)}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="body2">Saldo de apertura</Typography>
                      <Typography variant="body2">{formatMonto(resumen.saldo_apertura)}</Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2">Efectivo esperado (con lo que debes cerrar)</Typography>
                      <Typography variant="subtitle2">{formatMonto(resumen.saldo_efectivo ?? '0')}</Typography>
                    </Stack>
                    {tieneSaldoDigital && (
                      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Saldo total (incluye billetaje digital, no se cuenta aquí)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatMonto(resumen.saldo_calculado ?? '0')}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                )
              )}

              <TextField
                label="Monto contado"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={montoContado}
                onChange={(e) => setMontoContado(e.target.value)}
                required
                autoFocus
              />

              {diferencia !== null && (
                <Alert severity={diferencia === 0 ? 'success' : diferencia > 0 ? 'info' : 'warning'}>
                  {diferencia === 0
                    ? 'Cuadra exacto.'
                    : diferencia > 0
                      ? `Sobrante: ${formatMonto(diferencia)}`
                      : `Faltante: ${formatMonto(Math.abs(diferencia))}`}
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={closeCerrarDialog}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isCerrando}>
              {isCerrando ? 'Cerrando...' : 'Cerrar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={billetajeOpen} onClose={closeBilletajeDialog} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSolicitarBilletaje}>
          <DialogTitle>Solicitar billetaje</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {billetajeError && <Alert severity="error">{billetajeError}</Alert>}
              <TextField
                label="Monto"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                value={montoBilletaje}
                onChange={(e) => setMontoBilletaje(e.target.value)}
                required
                autoFocus
              />
              <Autocomplete
                options={clientes}
                getOptionLabel={(c) => `${c.nombre} ${c.apellido} — ${c.numero_documento}`.toUpperCase()}
                value={clienteBilletaje}
                onChange={(_, cliente) => setClienteBilletaje(cliente)}
                renderInput={(params) => <TextField {...params} label="Cliente (opcional)" />}
              />
              <TextField
                select
                label="¿Cómo quieres recibir el dinero?"
                value={medioRecepcion}
                onChange={(e) => setMedioRecepcion(e.target.value as MedioRecepcionBilletaje)}
              >
                <MenuItem value="efectivo">Efectivo</MenuItem>
                <MenuItem value="yape">Yape</MenuItem>
                <MenuItem value="plin">Plin</MenuItem>
                <MenuItem value="transferencia">Transferencia</MenuItem>
              </TextField>
              {medioRecepcion !== 'efectivo' && (
                <TextField
                  label="Número o cuenta a dónde enviar"
                  value={datosRecepcion}
                  onChange={(e) => setDatosRecepcion(e.target.value)}
                  required
                />
              )}
              <TextField
                label="Motivo"
                value={motivoBilletaje}
                onChange={(e) => setMotivoBilletaje(e.target.value)}
                multiline
                minRows={2}
                required
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={closeBilletajeDialog}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSolicitando}>
              {isSolicitando ? 'Solicitando...' : 'Solicitar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <RegistrarMovimientoCajaDialog
        tipo={movimientoTipo}
        onClose={() => setMovimientoTipo(null)}
        onRegistered={() => {
          setMovimientoOk(true);
          loadCaja();
        }}
      />
    </Stack>
  );
}
