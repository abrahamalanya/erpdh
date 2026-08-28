import { useEffect, useState, type FormEvent } from 'react';
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../hooks/useAuth';
import { hasPermission } from '../utils/roles';
import { extractUserName, puedeGestionarCuentasBancarias } from '../utils/cajaHierarchy';
import { getBoveda } from '../api/bovedas';
import { listBancos } from '../api/bancos';
import {
  conciliarCuentaBancaria,
  createCuentaBancaria,
  deleteCuentaBancaria,
  listCuentasBancarias,
  listMovimientosCuentaBancaria,
  registrarMovimientoCuentaBancaria,
  updateCuentaBancaria,
  type CuentaBancariaPayload,
  type ReporteMovimientosCuentaBancaria,
} from '../api/cuentasBancarias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RowActions } from '../components/RowActions';
import { formatFecha, formatMonto } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import type {
  Banco,
  Boveda,
  ConciliacionBancaria,
  CuentaBancaria,
  CuentaBancariaMovimiento,
  CuentaBancariaMovimientoTipo,
} from '../types/api';

const emptyForm: CuentaBancariaPayload = {
  banco_id: 0,
  numero_cuenta: '',
  titular: '',
  tipo_cuenta: undefined,
  moneda: 'PEN',
  alias: '',
  saldo_inicial: '0',
  acepta_yape: false,
  numero_yape: '',
  acepta_plin: false,
  numero_plin: '',
};

export function CuentasBancariasPage() {
  const { id } = useParams<{ id: string }>();
  const bovedaId = Number(id);
  const { user } = useAuth();

  const [boveda, setBoveda] = useState<Boveda | null>(null);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CuentaBancaria | null>(null);
  const [form, setForm] = useState<CuentaBancariaPayload>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CuentaBancaria | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [movimientoTarget, setMovimientoTarget] = useState<CuentaBancaria | null>(null);
  const [movimientoTipo, setMovimientoTipo] = useState<CuentaBancariaMovimientoTipo>('ingreso');
  const [movimientoMonto, setMovimientoMonto] = useState('');
  const [movimientoConcepto, setMovimientoConcepto] = useState('');
  const [isRegistrandoMovimiento, setIsRegistrandoMovimiento] = useState(false);
  const [movimientoError, setMovimientoError] = useState<string | null>(null);

  const [conciliarTarget, setConciliarTarget] = useState<CuentaBancaria | null>(null);
  const [saldoBanco, setSaldoBanco] = useState('');
  const [observacionConciliacion, setObservacionConciliacion] = useState('');
  const [isConciliando, setIsConciliando] = useState(false);
  const [conciliarError, setConciliarError] = useState<string | null>(null);
  const [conciliarResultado, setConciliarResultado] = useState<ConciliacionBancaria | null>(null);

  const [reporteTarget, setReporteTarget] = useState<CuentaBancaria | null>(null);
  const [reporte, setReporte] = useState<ReporteMovimientosCuentaBancaria | null>(null);
  const [reportePage, setReportePage] = useState(1);
  const [isLoadingReporte, setIsLoadingReporte] = useState(false);
  const [reporteError, setReporteError] = useState<string | null>(null);

  function openReporte(cuenta: CuentaBancaria) {
    setReporteTarget(cuenta);
    setReportePage(1);
  }

  useEffect(() => {
    if (!reporteTarget) return;

    setIsLoadingReporte(true);
    setReporteError(null);

    listMovimientosCuentaBancaria(reporteTarget.id, reportePage)
      .then((res) => setReporte(res.data))
      .catch((err) => setReporteError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoadingReporte(false));
  }, [reporteTarget, reportePage]);

  function loadAll() {
    if (!bovedaId) return;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([getBoveda(bovedaId), listCuentasBancarias(bovedaId)])
      .then(([bovedaRes, cuentasRes]) => {
        setBoveda(bovedaRes.data);
        setCuentas(cuentasRes.data);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadAll, [bovedaId]);

  useEffect(() => {
    listBancos()
      .then((res) => setBancos(res.data.filter((b) => b.activo)))
      .catch(() => {});
  }, []);

  if (!bovedaId || !hasPermission(user, 'cuentas_bancarias.ver')) {
    return <Navigate to="/bovedas" replace />;
  }

  if (boveda && !puedeGestionarCuentasBancarias(user, boveda)) {
    return <Navigate to="/bovedas" replace />;
  }

  function openCreateDialog() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(cuenta: CuentaBancaria) {
    setEditing(cuenta);
    setForm({
      banco_id: cuenta.banco_id,
      numero_cuenta: cuenta.numero_cuenta,
      titular: cuenta.titular,
      tipo_cuenta: cuenta.tipo_cuenta ?? undefined,
      moneda: cuenta.moneda,
      alias: cuenta.alias ?? '',
      saldo_inicial: cuenta.saldo_inicial,
      acepta_yape: cuenta.acepta_yape,
      numero_yape: cuenta.numero_yape ?? '',
      acepta_plin: cuenta.acepta_plin,
      numero_plin: cuenta.numero_plin ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (editing) {
        await updateCuentaBancaria(editing.id, {
          banco_id: form.banco_id,
          numero_cuenta: form.numero_cuenta,
          titular: form.titular,
          tipo_cuenta: form.tipo_cuenta,
          moneda: form.moneda,
          alias: form.alias,
          acepta_yape: form.acepta_yape,
          numero_yape: form.numero_yape,
          acepta_plin: form.acepta_plin,
          numero_plin: form.numero_plin,
        });
      } else {
        await createCuentaBancaria(bovedaId, form);
      }

      setDialogOpen(false);
      loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteCuentaBancaria(deleteTarget.id);
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleMovimiento(event: FormEvent) {
    event.preventDefault();
    if (!movimientoTarget) return;

    setMovimientoError(null);
    setIsRegistrandoMovimiento(true);

    try {
      await registrarMovimientoCuentaBancaria(
        movimientoTarget.id,
        movimientoTipo,
        movimientoMonto,
        movimientoConcepto || undefined
      );
      setMovimientoTarget(null);
      setMovimientoMonto('');
      setMovimientoConcepto('');
      setMovimientoTipo('ingreso');
      loadAll();
    } catch (err) {
      setMovimientoError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsRegistrandoMovimiento(false);
    }
  }

  async function handleConciliar(event: FormEvent) {
    event.preventDefault();
    if (!conciliarTarget) return;

    setConciliarError(null);
    setIsConciliando(true);

    try {
      const res = await conciliarCuentaBancaria(conciliarTarget.id, saldoBanco, observacionConciliacion || undefined);
      setConciliarResultado(res.data);
    } catch (err) {
      setConciliarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsConciliando(false);
    }
  }

  function closeConciliarDialog() {
    setConciliarTarget(null);
    setSaldoBanco('');
    setObservacionConciliacion('');
    setConciliarResultado(null);
    setConciliarError(null);
    loadAll();
  }

  function closeReporte() {
    setReporteTarget(null);
    setReporte(null);
    setReportePage(1);
    setReporteError(null);
  }

  const movimientoColumns: DataTableColumn<CuentaBancariaMovimiento>[] = [
    { header: 'Fecha', render: (m) => formatFecha(m.fecha) },
    {
      header: 'Tipo',
      render: (m) => (
        <Chip
          label={m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
          size="small"
          color={m.tipo === 'ingreso' ? 'success' : 'error'}
        />
      ),
    },
    { header: 'Monto', render: (m) => formatMonto(m.monto) },
    { header: 'Concepto', render: (m) => m.concepto ?? '—' },
    { header: 'Registrado por', render: (m) => extractUserName(m.registrado_por) ?? '—' },
  ];

  const columns: DataTableColumn<CuentaBancaria>[] = [
    { header: 'Banco', render: (c) => c.banco?.nombre ?? '—' },
    { header: 'Número de cuenta', render: (c) => c.numero_cuenta },
    { header: 'Titular', render: (c) => c.titular },
    {
      header: 'Tipo',
      render: (c) => (c.tipo_cuenta === 'corriente' ? 'Corriente' : c.tipo_cuenta === 'ahorro' ? 'Ahorro' : '—'),
    },
    { header: 'Moneda', render: (c) => c.moneda },
    { header: 'Saldo actual', render: (c) => formatMonto(c.saldo_actual ?? c.saldo_inicial) },
    {
      header: 'Yape / Plin',
      render: (c) => (
        <Stack direction="row" spacing={0.5}>
          {c.acepta_yape && <Chip label={`Yape ${c.numero_yape ?? ''}`} size="small" color="info" />}
          {c.acepta_plin && <Chip label={`Plin ${c.numero_plin ?? ''}`} size="small" color="info" />}
          {!c.acepta_yape && !c.acepta_plin && '—'}
        </Stack>
      ),
    },
    {
      header: 'Estado',
      render: (c) => <Chip label={c.activa ? 'Activa' : 'Inactiva'} size="small" color={c.activa ? 'success' : 'default'} />,
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (c) => (
        <RowActions
          actions={[
            {
              key: 'reporte',
              label: 'Ver movimientos',
              icon: <ReceiptLongIcon fontSize="small" />,
              onClick: () => openReporte(c),
            },
            {
              key: 'movimiento',
              label: 'Registrar movimiento',
              icon: <SwapHorizIcon fontSize="small" />,
              onClick: () => {
                setMovimientoError(null);
                setMovimientoTarget(c);
              },
            },
            {
              key: 'conciliar',
              label: 'Conciliar',
              icon: <FactCheckIcon fontSize="small" />,
              onClick: () => {
                setConciliarError(null);
                setConciliarResultado(null);
                setConciliarTarget(c);
              },
            },
            {
              key: 'editar',
              label: 'Editar',
              icon: <EditIcon fontSize="small" />,
              onClick: () => openEditDialog(c),
            },
            {
              key: 'eliminar',
              label: 'Eliminar',
              icon: <DeleteIcon fontSize="small" />,
              onClick: () => {
                setDeleteError(null);
                setDeleteTarget(c);
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <IconButton component={RouterLink} to="/bovedas" aria-label="Volver a bóvedas">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Cuentas bancarias {boveda ? `— ${boveda.tipo === 'principal' ? 'Bóveda principal' : boveda.agencia?.nombre?.toUpperCase()}` : ''}
        </Typography>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      {boveda && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Efectivo
              </Typography>
              <Typography variant="h6">
                {boveda.ciclo_abierto ? formatMonto(boveda.ciclo_abierto.saldo_actual ?? boveda.ciclo_abierto.saldo_apertura) : '—'}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Cuentas bancarias
              </Typography>
              <Typography variant="h6">{formatMonto(boveda.saldo_cuentas_bancarias ?? '0')}</Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total bóveda
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {formatMonto(boveda.saldo_total ?? '0')}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Nueva cuenta bancaria
        </Button>
      </Stack>

      <DataTable
        columns={columns}
        rows={cuentas}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay cuentas bancarias registradas"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Editar cuenta bancaria' : 'Nueva cuenta bancaria'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                select
                label="Banco"
                value={form.banco_id || ''}
                onChange={(e) => setForm((f) => ({ ...f, banco_id: Number(e.target.value) }))}
                required
              >
                {bancos.map((banco) => (
                  <MenuItem key={banco.id} value={banco.id}>
                    {banco.nombre}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Número de cuenta"
                value={form.numero_cuenta}
                onChange={(e) => setForm((f) => ({ ...f, numero_cuenta: e.target.value }))}
                required
              />
              <TextField
                label="Titular (a nombre de quién está)"
                value={form.titular}
                onChange={(e) => setForm((f) => ({ ...f, titular: e.target.value }))}
                required
              />
              <TextField
                select
                label="Tipo de cuenta"
                value={form.tipo_cuenta ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, tipo_cuenta: (e.target.value || undefined) as CuentaBancariaPayload['tipo_cuenta'] }))}
              >
                <MenuItem value="">Sin especificar</MenuItem>
                <MenuItem value="ahorro">Ahorro</MenuItem>
                <MenuItem value="corriente">Corriente</MenuItem>
              </TextField>
              <TextField
                select
                label="Moneda"
                value={form.moneda}
                onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value as CuentaBancariaPayload['moneda'] }))}
              >
                <MenuItem value="PEN">Soles (PEN)</MenuItem>
                <MenuItem value="USD">Dólares (USD)</MenuItem>
              </TextField>
              <TextField
                label="Alias (opcional)"
                value={form.alias ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
              />
              {!editing && (
                <TextField
                  label="Saldo inicial"
                  type="number"
                  slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                  value={form.saldo_inicial}
                  onChange={(e) => setForm((f) => ({ ...f, saldo_inicial: e.target.value }))}
                />
              )}

              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!form.acepta_yape}
                    onChange={(e) => setForm((f) => ({ ...f, acepta_yape: e.target.checked }))}
                  />
                }
                label="Afiliada a Yape"
              />
              {form.acepta_yape && (
                <TextField
                  label="Número de Yape"
                  value={form.numero_yape ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, numero_yape: e.target.value }))}
                  required
                />
              )}

              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!form.acepta_plin}
                    onChange={(e) => setForm((f) => ({ ...f, acepta_plin: e.target.checked }))}
                  />
                }
                label="Afiliada a Plin"
              />
              {form.acepta_plin && (
                <TextField
                  label="Número de Plin"
                  value={form.numero_plin ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, numero_plin: e.target.value }))}
                  required
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!movimientoTarget} onClose={preventBackdropClose(() => setMovimientoTarget(null))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleMovimiento}>
          <DialogTitle>Registrar movimiento — {movimientoTarget?.banco?.nombre}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {movimientoError && <Alert severity="error">{movimientoError}</Alert>}
              <TextField
                select
                label="Tipo"
                value={movimientoTipo}
                onChange={(e) => setMovimientoTipo(e.target.value as CuentaBancariaMovimientoTipo)}
              >
                <MenuItem value="ingreso">Ingreso</MenuItem>
                <MenuItem value="egreso">Egreso</MenuItem>
              </TextField>
              <TextField
                label="Monto"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={movimientoMonto}
                onChange={(e) => setMovimientoMonto(e.target.value)}
                required
                autoFocus
              />
              <TextField
                label="Concepto (opcional)"
                value={movimientoConcepto}
                onChange={(e) => setMovimientoConcepto(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setMovimientoTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isRegistrandoMovimiento}>
              {isRegistrandoMovimiento ? 'Guardando...' : 'Registrar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!conciliarTarget} onClose={preventBackdropClose(closeConciliarDialog)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleConciliar}>
          <DialogTitle>Conciliación bancaria — {conciliarTarget?.banco?.nombre}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {conciliarError && <Alert severity="error">{conciliarError}</Alert>}

              {conciliarResultado ? (
                <>
                  <Typography>Saldo en el sistema: {formatMonto(conciliarResultado.saldo_sistema)}</Typography>
                  <Typography>Saldo según el banco: {formatMonto(conciliarResultado.saldo_banco)}</Typography>
                  <Alert severity={conciliarResultado.diferencia === '0.00' ? 'success' : 'warning'}>
                    Diferencia: {formatMonto(conciliarResultado.diferencia)}
                  </Alert>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Saldo actual en el sistema: {conciliarTarget ? formatMonto(conciliarTarget.saldo_actual ?? conciliarTarget.saldo_inicial) : '—'}
                  </Typography>
                  <TextField
                    label="Saldo según estado de cuenta del banco"
                    type="number"
                    slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                    value={saldoBanco}
                    onChange={(e) => setSaldoBanco(e.target.value)}
                    required
                    autoFocus
                  />
                  <TextField
                    label="Observación (opcional)"
                    value={observacionConciliacion}
                    onChange={(e) => setObservacionConciliacion(e.target.value)}
                    multiline
                    minRows={2}
                  />
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            {conciliarResultado ? (
              <Button variant="contained" onClick={closeConciliarDialog}>
                Cerrar
              </Button>
            ) : (
              <>
                <Button onClick={closeConciliarDialog}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={isConciliando}>
                  {isConciliando ? 'Conciliando...' : 'Conciliar'}
                </Button>
              </>
            )}
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!reporteTarget} onClose={preventBackdropClose(closeReporte)} fullWidth maxWidth="md">
        <DialogTitle>Movimientos — {reporteTarget?.banco?.nombre} {reporteTarget?.numero_cuenta}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {reporteError && <Alert severity="error">{reporteError}</Alert>}

            {reporte && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Card variant="outlined" sx={{ flex: 1 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Total ingresos
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatMonto(reporte.resumen.total_ingresos)}
                    </Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined" sx={{ flex: 1 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Total egresos
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {formatMonto(reporte.resumen.total_egresos)}
                    </Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined" sx={{ flex: 1 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Saldo actual
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {formatMonto(reporteTarget?.saldo_actual ?? reporteTarget?.saldo_inicial ?? '0')}
                    </Typography>
                  </CardContent>
                </Card>
              </Stack>
            )}

            <DataTable
              columns={movimientoColumns}
              rows={reporte?.movimientos.data ?? []}
              keyExtractor={(m) => m.id}
              isLoading={isLoadingReporte}
              emptyMessage="No hay movimientos registrados"
              page={reportePage}
              lastPage={reporte?.movimientos.last_page ?? 1}
              onPageChange={setReportePage}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeReporte}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar cuenta bancaria"
        message={
          <Typography>
            ¿Seguro que deseas eliminar la cuenta <strong>{deleteTarget?.numero_cuenta}</strong> de {deleteTarget?.banco?.nombre}?
          </Typography>
        }
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        error={deleteError}
      />
    </Stack>
  );
}
