import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AddCardIcon from '@mui/icons-material/AddCard';
import RestoreIcon from '@mui/icons-material/Restore';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useAuth } from '../hooks/useAuth';
import { PhotoField } from '../components/MediaFields';
import {
  canVerBovedas,
  extractUserName,
  puedeAperturarBoveda,
  puedeControlarBoveda,
  puedeGestionarCuentasBancarias,
  puedeInyectarBoveda,
  puedeReabrirBoveda,
} from '../utils/cajaHierarchy';
import {
  aperturarBoveda,
  cerrarBoveda,
  eliminarInyeccion,
  inyectarBoveda,
  listBovedas,
  listInyecciones,
  reabrirBoveda,
} from '../api/bovedas';
import { listCuentasBancarias } from '../api/cuentasBancarias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RowActions, type RowAction } from '../components/RowActions';
import { UpperTextField } from '../components/UpperTextField';
import { formatFecha, formatMonto } from '../utils/format';
import type { Boveda, CuentaBancaria, InyeccionReporteItem, MedioInyeccion, PaginatedData } from '../types/api';

export function BovedasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [result, setResult] = useState<PaginatedData<Boveda> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cerrarTarget, setCerrarTarget] = useState<Boveda | null>(null);
  const [monto, setMonto] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [aperturarTarget, setAperturarTarget] = useState<Boveda | null>(null);
  const [saldoInicial, setSaldoInicial] = useState('');
  const [isAperturando, setIsAperturando] = useState(false);
  const [aperturarError, setAperturarError] = useState<string | null>(null);

  const [inyectarTarget, setInyectarTarget] = useState<Boveda | null>(null);
  const [montoInyeccion, setMontoInyeccion] = useState('');
  const [conceptoInyeccion, setConceptoInyeccion] = useState('');
  const [medioInyeccion, setMedioInyeccion] = useState<MedioInyeccion>('efectivo');
  const [cuentaBancariaInyeccionId, setCuentaBancariaInyeccionId] = useState<number | ''>('');
  const [cuentasBancariasDestino, setCuentasBancariasDestino] = useState<CuentaBancaria[]>([]);
  const [cuentaBancariaOrigenId, setCuentaBancariaOrigenId] = useState<number | ''>('');
  const [cuentasBancariasOrigen, setCuentasBancariasOrigen] = useState<CuentaBancaria[]>([]);
  const [comprobanteInyeccion, setComprobanteInyeccion] = useState<File | null>(null);
  const [isInyectando, setIsInyectando] = useState(false);
  const [inyectarError, setInyectarError] = useState<string | null>(null);

  const [reabrirTarget, setReabrirTarget] = useState<Boveda | null>(null);
  const [isReabriendo, setIsReabriendo] = useState(false);

  const [reporteTarget, setReporteTarget] = useState<Boveda | null>(null);
  const [reporte, setReporte] = useState<InyeccionReporteItem[] | null>(null);
  const [isLoadingReporte, setIsLoadingReporte] = useState(false);
  const [reporteError, setReporteError] = useState<string | null>(null);
  const [reporteDesde, setReporteDesde] = useState('');
  const [reporteHasta, setReporteHasta] = useState('');
  const [eliminarInyeccionTarget, setEliminarInyeccionTarget] = useState<InyeccionReporteItem | null>(null);
  const [isEliminandoInyeccion, setIsEliminandoInyeccion] = useState(false);
  const [eliminarInyeccionError, setEliminarInyeccionError] = useState<string | null>(null);

  function loadBovedas() {
    setIsLoading(true);
    setLoadError(null);

    listBovedas(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadBovedas, [page]);

  useEffect(() => {
    if (!inyectarTarget) return;

    listCuentasBancarias(inyectarTarget.id)
      .then((res) => setCuentasBancariasDestino(res.data.filter((c) => c.activa)))
      .catch(() => setCuentasBancariasDestino([]));
  }, [inyectarTarget]);

  // A traspaso landing in a cuenta bancaria came out of an actual cuenta
  // bancaria of the principal, not physical cash — load the principal's own
  // accounts to pick from. The principal is virtually always on this same
  // (first, unpaginated-in-practice) page, so this reuses the already-loaded
  // list instead of a dedicated lookup endpoint.
  const principalDeInyectarTarget =
    inyectarTarget?.tipo === 'agencia'
      ? (result?.data.find((b) => b.tipo === 'principal' && b.empresa_id === inyectarTarget.empresa_id) ?? null)
      : null;

  useEffect(() => {
    if (!principalDeInyectarTarget) {
      setCuentasBancariasOrigen([]);
      return;
    }

    listCuentasBancarias(principalDeInyectarTarget.id)
      .then((res) => setCuentasBancariasOrigen(res.data.filter((c) => c.activa)))
      .catch(() => setCuentasBancariasOrigen([]));
  }, [principalDeInyectarTarget]);

  function loadReporte() {
    if (!reporteTarget) return;

    setIsLoadingReporte(true);
    setReporteError(null);

    listInyecciones(reporteTarget.id, reporteDesde || undefined, reporteHasta || undefined)
      .then((res) => setReporte(res.data))
      .catch((err) => setReporteError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoadingReporte(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReporte, [reporteTarget, reporteDesde, reporteHasta]);

  if (!canVerBovedas(user)) {
    return <Navigate to="/" replace />;
  }

  async function handleCerrar(event: FormEvent) {
    event.preventDefault();
    if (!cerrarTarget) return;

    setFormError(null);
    setIsSaving(true);

    try {
      await cerrarBoveda(cerrarTarget.id, monto);
      setCerrarTarget(null);
      setMonto('');
      loadBovedas();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAperturar(event: FormEvent) {
    event.preventDefault();
    if (!aperturarTarget) return;

    setAperturarError(null);
    setIsAperturando(true);

    try {
      await aperturarBoveda(aperturarTarget.id, saldoInicial || undefined);
      setAperturarTarget(null);
      setSaldoInicial('');
      loadBovedas();
    } catch (err) {
      setAperturarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsAperturando(false);
    }
  }

  function closeInyectarDialog() {
    setInyectarTarget(null);
    setMontoInyeccion('');
    setConceptoInyeccion('');
    setMedioInyeccion('efectivo');
    setCuentaBancariaInyeccionId('');
    setCuentasBancariasDestino([]);
    setCuentaBancariaOrigenId('');
    setCuentasBancariasOrigen([]);
    setComprobanteInyeccion(null);
  }

  async function handleInyectar(event: FormEvent) {
    event.preventDefault();
    if (!inyectarTarget) return;

    setInyectarError(null);
    setIsInyectando(true);

    try {
      await inyectarBoveda(
        inyectarTarget.id,
        montoInyeccion,
        conceptoInyeccion ? conceptoInyeccion.toLowerCase() : undefined,
        medioInyeccion,
        medioInyeccion === 'cuenta_bancaria' ? (cuentaBancariaInyeccionId as number) : undefined,
        medioInyeccion === 'cuenta_bancaria' && inyectarTarget.tipo === 'agencia' ? (cuentaBancariaOrigenId as number) : undefined,
        medioInyeccion === 'cuenta_bancaria' ? comprobanteInyeccion : undefined
      );
      closeInyectarDialog();
      loadBovedas();
    } catch (err) {
      setInyectarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsInyectando(false);
    }
  }

  function closeReporte() {
    setReporteTarget(null);
    setReporte(null);
    setReporteDesde('');
    setReporteHasta('');
    setReporteError(null);
  }

  async function handleEliminarInyeccion() {
    if (!eliminarInyeccionTarget || !reporteTarget) return;

    setIsEliminandoInyeccion(true);
    setEliminarInyeccionError(null);

    try {
      await eliminarInyeccion(reporteTarget.id, eliminarInyeccionTarget.id);
      setEliminarInyeccionTarget(null);
      loadReporte();
      loadBovedas();
    } catch (err) {
      setEliminarInyeccionError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsEliminandoInyeccion(false);
    }
  }

  async function handleReabrir() {
    if (!reabrirTarget) return;

    setLoadError(null);
    setIsReabriendo(true);

    try {
      await reabrirBoveda(reabrirTarget.id);
      setReabrirTarget(null);
      loadBovedas();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsReabriendo(false);
    }
  }

  const columns: DataTableColumn<Boveda>[] = [
    { header: 'Tipo', render: (b) => (b.tipo === 'principal' ? 'Principal' : 'Agencia') },
    { header: 'Empresa', render: (b) => b.empresa?.nombre.toUpperCase() ?? '—' },
    { header: 'Agencia', render: (b) => b.agencia?.nombre.toUpperCase() ?? '—' },
    {
      header: 'Estado',
      render: (b) => (
        <Chip
          label={b.ciclo_abierto ? 'Abierta' : 'Cerrada'}
          size="small"
          color={b.ciclo_abierto ? 'success' : 'default'}
        />
      ),
    },
    {
      header: 'Efectivo',
      render: (b) =>
        b.ciclo_abierto ? formatMonto(b.ciclo_abierto.saldo_actual ?? b.ciclo_abierto.saldo_apertura) : '—',
    },
    {
      header: 'Cuentas bancarias',
      render: (b) => formatMonto(b.saldo_cuentas_bancarias ?? '0'),
    },
    {
      header: 'Saldo total',
      render: (b) => formatMonto(b.saldo_total ?? b.saldo_cuentas_bancarias ?? '0'),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (b) => {
        const actions: RowAction[] = [];

        if (puedeGestionarCuentasBancarias(user, b)) {
          actions.push({
            key: 'cuentas-bancarias',
            label: 'Cuentas bancarias',
            icon: <AccountBalanceIcon fontSize="small" />,
            onClick: () => navigate(`/bovedas/${b.id}/cuentas-bancarias`),
          });
        }
        if (!b.ciclo_abierto && puedeAperturarBoveda(user, b)) {
          actions.push({
            key: 'aperturar',
            label: 'Aperturar bóveda (ciclo nuevo)',
            icon: <LockOpenIcon fontSize="small" />,
            onClick: () => setAperturarTarget(b),
          });
        }
        if (!b.ciclo_abierto && puedeReabrirBoveda(user, b)) {
          actions.push({
            key: 'reabrir',
            label: 'Reabrir el último ciclo cerrado',
            icon: <RestoreIcon fontSize="small" />,
            onClick: () => setReabrirTarget(b),
          });
        }
        if (b.ciclo_abierto && puedeInyectarBoveda(user, b)) {
          actions.push({
            key: 'inyectar',
            label: b.tipo === 'principal' ? 'Inyectar capital' : 'Traspasar desde bóveda principal',
            icon: <AddCardIcon fontSize="small" />,
            onClick: () => setInyectarTarget(b),
          });
        }
        if (puedeInyectarBoveda(user, b)) {
          actions.push({
            key: 'reporte-inyecciones',
            label: 'Reporte de inyecciones',
            icon: <ReceiptLongIcon fontSize="small" />,
            onClick: () => setReporteTarget(b),
          });
        }
        if (b.ciclo_abierto && puedeControlarBoveda(user, b)) {
          actions.push({
            key: 'cerrar',
            label: 'Cerrar bóveda',
            icon: <LockIcon fontSize="small" />,
            onClick: () => {
              setFormError(null);
              setMonto(b.saldo_total ?? '');
              setCerrarTarget(b);
            },
          });
        }

        return <RowActions actions={actions} />;
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Bóvedas
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        emptyMessage="No hay bóvedas registradas"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={!!aperturarTarget} onClose={() => setAperturarTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleAperturar}>
          <DialogTitle>Aperturar bóveda</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {aperturarError && <Alert severity="error">{aperturarError}</Alert>}
              <TextField
                label="Saldo inicial"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                helperText="Obligatorio solo la primera vez que se apertura la bóveda"
                autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setAperturarTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isAperturando}>
              {isAperturando ? 'Aperturando...' : 'Aperturar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!inyectarTarget} onClose={closeInyectarDialog} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleInyectar}>
          <DialogTitle>
            {inyectarTarget?.tipo === 'principal' ? 'Inyectar capital' : 'Traspasar desde bóveda principal'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {inyectarError && <Alert severity="error">{inyectarError}</Alert>}
              <TextField
                label="Monto"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={montoInyeccion}
                onChange={(e) => setMontoInyeccion(e.target.value)}
                required
                autoFocus
              />
              <TextField
                select
                label="Recibe en"
                value={medioInyeccion}
                onChange={(e) => {
                  setMedioInyeccion(e.target.value as MedioInyeccion);
                  setCuentaBancariaInyeccionId('');
                }}
              >
                <MenuItem value="efectivo">Efectivo</MenuItem>
                <MenuItem value="cuenta_bancaria">Cuenta bancaria</MenuItem>
              </TextField>
              {medioInyeccion === 'cuenta_bancaria' && inyectarTarget?.tipo === 'agencia' && (
                <TextField
                  select
                  label="Cuenta bancaria de la que sale el dinero"
                  value={cuentaBancariaOrigenId}
                  onChange={(e) => setCuentaBancariaOrigenId(Number(e.target.value))}
                  required
                  helperText={
                    cuentasBancariasOrigen.length === 0
                      ? 'La bóveda principal no tiene cuentas bancarias activas registradas'
                      : undefined
                  }
                >
                  {cuentasBancariasOrigen.map((cuenta) => (
                    <MenuItem key={cuenta.id} value={cuenta.id}>
                      {cuenta.banco?.nombre} — {cuenta.numero_cuenta}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {medioInyeccion === 'cuenta_bancaria' && (
                <TextField
                  select
                  label={inyectarTarget?.tipo === 'agencia' ? 'Cuenta bancaria a la que llega el dinero' : 'Cuenta bancaria'}
                  value={cuentaBancariaInyeccionId}
                  onChange={(e) => setCuentaBancariaInyeccionId(Number(e.target.value))}
                  required
                  helperText={
                    cuentasBancariasDestino.length === 0
                      ? 'Esta bóveda no tiene cuentas bancarias activas registradas'
                      : undefined
                  }
                >
                  {cuentasBancariasDestino.map((cuenta) => (
                    <MenuItem key={cuenta.id} value={cuenta.id}>
                      {cuenta.banco?.nombre} — {cuenta.numero_cuenta}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {medioInyeccion === 'cuenta_bancaria' && (
                <PhotoField
                  label="Voucher de transferencia (opcional)"
                  file={comprobanteInyeccion}
                  onChange={setComprobanteInyeccion}
                />
              )}
              <UpperTextField
                label="Concepto (opcional)"
                value={conceptoInyeccion}
                onChange={(e) => setConceptoInyeccion(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={closeInyectarDialog}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                isInyectando ||
                (medioInyeccion === 'cuenta_bancaria' && !cuentaBancariaInyeccionId) ||
                (medioInyeccion === 'cuenta_bancaria' && inyectarTarget?.tipo === 'agencia' && !cuentaBancariaOrigenId)
              }
            >
              {isInyectando ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!cerrarTarget} onClose={() => setCerrarTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCerrar}>
          <DialogTitle>Cerrar bóveda</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Monto contado"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setCerrarTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? 'Cerrando...' : 'Cerrar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!reporteTarget} onClose={closeReporte} fullWidth maxWidth="md">
        <DialogTitle>
          Reporte de inyecciones — {reporteTarget?.tipo === 'principal' ? 'Bóveda principal' : reporteTarget?.agencia?.nombre?.toUpperCase()}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {reporteError && <Alert severity="error">{reporteError}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Desde"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={reporteDesde}
                onChange={(e) => setReporteDesde(e.target.value)}
                fullWidth
              />
              <TextField
                label="Hasta"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={reporteHasta}
                onChange={(e) => setReporteHasta(e.target.value)}
                fullWidth
              />
            </Stack>

            <DataTable
              columns={[
                { header: 'Fecha', render: (i: InyeccionReporteItem) => formatFecha(i.fecha) },
                {
                  header: 'Medio',
                  render: (i: InyeccionReporteItem) => (
                    <Chip
                      label={i.medio === 'efectivo' ? 'Efectivo' : (i.cuenta_bancaria?.banco?.nombre ?? 'Cuenta bancaria')}
                      size="small"
                      color={i.medio === 'efectivo' ? 'default' : 'info'}
                    />
                  ),
                },
                {
                  header: 'Tipo',
                  render: (i: InyeccionReporteItem) => (i.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'),
                },
                { header: 'Monto', render: (i: InyeccionReporteItem) => formatMonto(i.monto) },
                { header: 'Concepto', render: (i: InyeccionReporteItem) => i.concepto ?? '—' },
                {
                  header: 'Registrado por',
                  render: (i: InyeccionReporteItem) => extractUserName(i.registrado_por) ?? '—',
                },
                {
                  header: 'Acciones',
                  align: 'right',
                  render: (i: InyeccionReporteItem) => (
                    <RowActions
                      actions={[
                        ...(i.comprobante_url
                          ? [
                              {
                                key: 'comprobante',
                                label: 'Ver comprobante',
                                icon: <ReceiptIcon fontSize="small" />,
                                onClick: () => window.open(i.comprobante_url!, '_blank'),
                              },
                            ]
                          : []),
                        ...(i.puede_eliminar
                          ? [
                              {
                                key: 'eliminar',
                                label: 'Eliminar (dentro del ciclo actual)',
                                icon: <DeleteIcon fontSize="small" />,
                                onClick: () => {
                                  setEliminarInyeccionError(null);
                                  setEliminarInyeccionTarget(i);
                                },
                              },
                            ]
                          : []),
                      ]}
                    />
                  ),
                },
              ]}
              rows={reporte ?? []}
              keyExtractor={(i: InyeccionReporteItem) => `${i.medio}-${i.id}`}
              isLoading={isLoadingReporte}
              emptyMessage="No hay inyecciones registradas en este rango de fechas"
              page={1}
              lastPage={1}
              onPageChange={() => {}}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeReporte}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!eliminarInyeccionTarget}
        title="Eliminar inyección"
        message={
          <Typography>
            ¿Seguro que deseas eliminar esta inyección de <strong>{eliminarInyeccionTarget ? formatMonto(eliminarInyeccionTarget.monto) : ''}</strong>?
            {eliminarInyeccionTarget?.origen === 'traspaso' &&
              ' Esto también elimina el lado correspondiente del traspaso en la otra bóveda.'}
          </Typography>
        }
        onCancel={() => {
          setEliminarInyeccionTarget(null);
          setEliminarInyeccionError(null);
        }}
        onConfirm={handleEliminarInyeccion}
        isLoading={isEliminandoInyeccion}
        error={eliminarInyeccionError}
      />

      <ConfirmDialog
        open={!!reabrirTarget}
        title="Reabrir bóveda"
        message="Esto reabre el último ciclo cerrado de esta bóveda (no crea uno nuevo), para regularizar un movimiento con su fecha contable original. ¿Continuar?"
        confirmLabel="Reabrir"
        onCancel={() => setReabrirTarget(null)}
        onConfirm={handleReabrir}
        isLoading={isReabriendo}
      />
    </Stack>
  );
}
