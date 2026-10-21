import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
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
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../hooks/useAuth';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions, type RowAction } from '../components/RowActions';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DialogHeader } from '../components/DialogHeader';
import { ClienteAutocomplete } from '../components/ClienteAutocomplete';
import {
  createSimulacion,
  calcularSimulacion,
  getConfiguracionSimulador,
  type CalculoSimulacion,
  eliminarSimulacion,
  listSimulaciones,
  type CreateSimulacionCreditoPayload,
} from '../api/simulacionesCredito';
import { canCrearSimulaciones, canVerSimulaciones, puedeEliminarSimulacion } from '../utils/simuladorHierarchy';
import { extractUserName } from '../utils/cajaHierarchy';
import { TIPO_CREDITO_LABELS, TIPO_CUOTA_LABELS } from '../utils/creditoPrendarioHierarchy';
import { formatFecha, formatFechaHora, formatMonto } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import type { Cliente, PaginatedData, SimulacionCredito, TipoCredito, TipoCuota } from '../types/api';
import { ErrorBanner } from '../components/ErrorBanner';

function emptyForm(): {
  tipo_credito: TipoCredito;
  monto_prestamo: string;
  interes: string;
  tipo_interes: 'simple' | 'compuesto';
  tipo_cuota: TipoCuota;
  numero_cuotas: string;
  modo_calculo: 'numero_cuotas' | 'importe_cuota';
  importe_cuota: string;
} {
  return {
    tipo_credito: 'prendario',
    monto_prestamo: '',
    interes: '',
    tipo_interes: 'simple',
    tipo_cuota: 'mensual',
    numero_cuotas: '1',
    modo_calculo: 'numero_cuotas',
    importe_cuota: '',
  };
}

/** Calcula sin persistir y permite guardar el cronograma de forma explícita. */
export function SimuladorCreditoPage() {
  const { user } = useAuth();
  const canCreate = canCrearSimulaciones(user);

  const [result, setResult] = useState<PaginatedData<SimulacionCredito> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [interesDefaults, setInteresDefaults] = useState<Partial<Record<TipoCredito, string | null>>>({});
  const [maxCuotas, setMaxCuotas] = useState<Partial<Record<TipoCredito, number>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<CalculoSimulacion | null>(null);
  const [previewForm, setPreviewForm] = useState<typeof form | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    let active = true;
    setPreview(null);
    setCalcError(null);
    if (!dialogOpen || !canCreate || !form.monto_prestamo || !(form.modo_calculo === 'importe_cuota' ? form.importe_cuota : form.numero_cuotas)) {
      setIsCalculating(false);
      return;
    }
    setIsCalculating(true);
    const timer = setTimeout(() => {
      calcularSimulacion({
        tipo_credito: form.tipo_credito, monto_prestamo: form.monto_prestamo,
        interes: form.interes || undefined, tipo_interes: form.tipo_interes,
        tipo_cuota: form.tipo_cuota, modo_calculo: form.modo_calculo,
        ...(form.modo_calculo === 'importe_cuota'
          ? { importe_cuota: form.importe_cuota }
          : { numero_cuotas: Number(form.numero_cuotas) }),
      }).then(res => {
        if (active) { setPreview(res.data); setPreviewForm(form); }
      }).catch(err => {
        if (active) setCalcError(err instanceof Error ? err.message : 'No se pudo calcular.');
      }).finally(() => { if (active) setIsCalculating(false); });
    }, 500);
    return () => { active = false; clearTimeout(timer); };
  }, [form, dialogOpen, canCreate]);

  const [detalle, setDetalle] = useState<SimulacionCredito | null>(null);

  const [eliminarTarget, setEliminarTarget] = useState<SimulacionCredito | null>(null);
  const [isEliminando, setIsEliminando] = useState(false);
  const [eliminarError, setEliminarError] = useState<string | null>(null);

  function loadSimulaciones() {
    setIsLoading(true);
    setLoadError(null);

    listSimulaciones(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadSimulaciones, [page]);

  if (!canVerSimulaciones(user)) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setClienteSel(null);
    setForm(emptyForm());
    setFormError(null);
    setInteresDefaults({});
    setMaxCuotas({});
    setDialogOpen(true);

    getConfiguracionSimulador()
      .then((res) => {
        const defaults: Partial<Record<TipoCredito, string | null>> = {};
        const max: Partial<Record<TipoCredito, number>> = {};
        for (const [key, config] of Object.entries(res.data)) {
          defaults[key as TipoCredito] = config.interes_default;
          max[key as TipoCredito] = config.max_cuotas;
        }
        setInteresDefaults(defaults);
        setMaxCuotas(max);
        setForm(f => ({ ...f, interes: f.interes || defaults[f.tipo_credito] || '' }));
      })
      .catch(() => {});
  }

  function handleTipoCreditoChange(tipo: TipoCredito) {
    setForm((f) => ({ ...f, tipo_credito: tipo, interes: interesDefaults[tipo] ?? '', numero_cuotas: '1' }));
  }

  const maxCuotasTipo = maxCuotas[form.tipo_credito] ?? 600;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!preview || previewForm !== form || isCalculating) return;
    setFormError(null);
    setIsSaving(true);

    const payload: CreateSimulacionCreditoPayload = {
      tipo_credito: form.tipo_credito,
      cliente_id: clienteSel?.id,
      monto_prestamo: form.monto_prestamo,
      interes: form.interes || undefined,
      tipo_interes: form.tipo_interes,
      tipo_cuota: form.tipo_cuota,
      modo_calculo: form.modo_calculo,
      ...(form.modo_calculo === 'importe_cuota'
        ? { importe_cuota: form.importe_cuota }
        : { numero_cuotas: Number(form.numero_cuotas) }),
    };

    try {
      await createSimulacion(payload);
      setDialogOpen(false);
      loadSimulaciones();

    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEliminar() {
    if (!eliminarTarget) return;

    setEliminarError(null);
    setIsEliminando(true);

    try {
      await eliminarSimulacion(eliminarTarget.id);
      setEliminarTarget(null);
      if (detalle?.id === eliminarTarget.id) setDetalle(null);
      loadSimulaciones();
    } catch (err) {
      setEliminarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsEliminando(false);
    }
  }

  const columns: DataTableColumn<SimulacionCredito>[] = [
    { header: 'Fecha', render: (s) => formatFechaHora(s.created_at) },
    { header: 'Tipo', render: (s) => TIPO_CREDITO_LABELS[s.tipo_credito] },
    {
      header: 'Cliente',
      render: (s) => (s.cliente ? `${s.cliente.nombre} ${s.cliente.apellido}`.toUpperCase() : '—'),
    },
    { header: 'Monto', render: (s) => formatMonto(s.monto_prestamo) },
    { header: 'Interés', render: (s) => `${s.interes}%` },
    { header: 'Cuota', render: (s) => TIPO_CUOTA_LABELS[s.tipo_cuota] },
    { header: 'Total a pagar', render: (s) => formatMonto(s.monto_total_pagar) },
    { header: 'Registrado por', render: (s) => extractUserName(s.registrado_por) ?? '—' },
    {
      header: 'Acciones',
      align: 'right',
      render: (s) => {
        const actions: RowAction[] = [
          {
            key: 'ver',
            label: 'Ver cronograma',
            icon: <VisibilityIcon fontSize="small" />,
            onClick: () => setDetalle(s),
          },
        ];

        if (puedeEliminarSimulacion(user, s)) {
          actions.push({
            key: 'eliminar',
            label: 'Eliminar simulación',
            icon: <DeleteIcon fontSize="small" />,
            onClick: () => {
              setEliminarError(null);
              setEliminarTarget(s);
            },
          });
        }

        return <RowActions actions={actions} />;
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Simulador de créditos
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nueva simulación
          </Button>
        )}
      </Stack>

      <ErrorBanner error={loadError} />

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="No hay simulaciones registradas"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="md">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogHeader onClose={() => setDialogOpen(false)}>Nueva simulación</DialogHeader>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <ErrorBanner error={formError ?? calcError} />
              <Typography variant="body2">Cliente opcional. Calcular no guarda ni registra créditos.</Typography>

              <TextField
                select
                label="Tipo de crédito"
                value={form.tipo_credito}
                onChange={(e) => handleTipoCreditoChange(e.target.value as TipoCredito)}
                required
              >
                <MenuItem value="prendario">Prendario</MenuItem>
                <MenuItem value="vehicular">Vehicular</MenuItem>
                <MenuItem value="hipotecario">Hipotecario</MenuItem>
                <MenuItem value="diario">Diario</MenuItem>
              </TextField>

              <ClienteAutocomplete value={clienteSel} onChange={setClienteSel} />

              <TextField
                label="Monto del préstamo"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={form.monto_prestamo}
                onChange={(e) => setForm((f) => ({ ...f, monto_prestamo: e.target.value }))}
                required
              />

              <TextField
                label="Interés (%)"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={form.interes}
                onChange={(e) => setForm((f) => ({ ...f, interes: e.target.value }))}
                helperText="Tasa mensual configurable para esta simulación."
              />

              <TextField
                select
                label="Tipo de interés"
                value={form.tipo_interes}
                onChange={(e) => setForm((f) => ({ ...f, tipo_interes: e.target.value as 'simple' | 'compuesto' }))}
              >
                <MenuItem value="simple">Simple</MenuItem>
                <MenuItem value="compuesto">Compuesto</MenuItem>
              </TextField>

              <TextField
                select
                label="Tipo de cuota"
                value={form.tipo_cuota}
                onChange={(e) => setForm((f) => ({ ...f, tipo_cuota: e.target.value as TipoCuota }))}
                required
              >
                {(Object.entries(TIPO_CUOTA_LABELS) as [TipoCuota, string][]).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField select label="Calcular por" value={form.modo_calculo}
                onChange={e => setForm(f => ({ ...f, modo_calculo: e.target.value as 'numero_cuotas' | 'importe_cuota' }))}>
                <MenuItem value="numero_cuotas">Número de cuotas</MenuItem>
                <MenuItem value="importe_cuota">Importe fijo de cuota</MenuItem>
              </TextField>
              {form.modo_calculo === 'importe_cuota' ? (
                <TextField label="Importe fijo de cuota" type="number" required value={form.importe_cuota}
                  slotProps={{ htmlInput: { min: '0.01', step: '0.01' } }}
                  onChange={e => setForm(f => ({ ...f, importe_cuota: e.target.value }))}
                  helperText={`Máximo ${maxCuotasTipo} cuotas. Última cuota ajustada para cancelar el saldo.`} />
              ) : (
                <TextField label="Número de cuotas" type="number" required value={form.numero_cuotas}
                  slotProps={{ htmlInput: { min: 1, step: 1, max: maxCuotasTipo } }}
                  onChange={e => setForm(f => ({ ...f, numero_cuotas: e.target.value }))}
                  helperText={`Máximo ${maxCuotasTipo} para este tipo de crédito`} />
              )}

              {isCalculating && <Typography role="status">Calculando cronograma…</Typography>}
              {preview && previewForm === form && (
                <Box>
                  <Typography variant="h6">Cronograma tentativo</Typography>
                  <Typography>{preview.numero_cuotas_calculadas} cuotas · Total: {formatMonto(preview.monto_total_pagar)}</Typography>
                  <Typography>Interés total: {formatMonto(preview.total_interes)} · Saldo residual: {formatMonto(preview.saldo_residual)}</Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small" aria-label="Cronograma tentativo">
                      <TableHead><TableRow>
                        {['Cuota', 'Vencimiento', 'Importe', 'Interés', 'Capital', 'Saldo'].map(label => <TableCell key={label}>{label}</TableCell>)}
                      </TableRow></TableHead>
                      <TableBody>{preview.cronograma.map(c => <TableRow key={c.numero_cuota}>
                        <TableCell>{c.numero_cuota}</TableCell><TableCell>{formatFecha(c.fecha_vencimiento)}</TableCell>
                        <TableCell>{formatMonto(c.monto_total)}</TableCell><TableCell>{formatMonto(c.monto_interes)}</TableCell>
                        <TableCell>{formatMonto(c.monto_capital)}</TableCell><TableCell>{formatMonto(c.saldo_pendiente)}</TableCell>
                      </TableRow>)}</TableBody>
                    </Table>
                  </Box>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving || isCalculating || !preview || previewForm !== form}>
              {isSaving ? 'Guardando…' : 'Guardar simulación'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!detalle} onClose={() => setDetalle(null)} fullWidth maxWidth="sm">
        <DialogHeader onClose={() => setDetalle(null)}>Cronograma simulado</DialogHeader>
        <DialogContent>
          {detalle && (
            <Stack spacing={2}>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 3 }}>
                <Typography variant="body2">
                  <strong>Cliente:</strong>{' '}
                  {detalle.cliente ? `${detalle.cliente.nombre} ${detalle.cliente.apellido}`.toUpperCase() : '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Tipo:</strong> {TIPO_CREDITO_LABELS[detalle.tipo_credito]}
                </Typography>
                <Typography variant="body2">
                  <strong>Monto:</strong> {formatMonto(detalle.monto_prestamo)}
                </Typography>
                <Typography variant="body2">
                  <strong>Interés:</strong> {detalle.interes}% ({detalle.tipo_interes === 'compuesto' ? 'compuesto' : 'simple'})
                </Typography>
                <Typography variant="body2">
                  <strong>Cuota:</strong> {TIPO_CUOTA_LABELS[detalle.tipo_cuota]}
                </Typography>
              </Stack>

              <Divider />

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cuota</TableCell>
                    <TableCell>Vencimiento</TableCell>
                    <TableCell align="right">Capital</TableCell>
                    <TableCell align="right">Interés</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detalle.cronograma.map((cuota) => (
                    <TableRow key={cuota.numero_cuota}>
                      <TableCell>{cuota.numero_cuota}</TableCell>
                      <TableCell>{formatFecha(cuota.fecha_vencimiento)}</TableCell>
                      <TableCell align="right">{formatMonto(cuota.monto_capital)}</TableCell>
                      <TableCell align="right">{formatMonto(cuota.monto_interes)}</TableCell>
                      <TableCell align="right">{formatMonto(cuota.monto_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Total a pagar: {formatMonto(detalle.monto_total_pagar)}
                </Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDetalle(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!eliminarTarget}
        title="Eliminar simulación"
        message="¿Seguro que deseas eliminar esta simulación? Esta acción no se puede deshacer."
        onCancel={() => {
          setEliminarTarget(null);
          setEliminarError(null);
        }}
        onConfirm={handleEliminar}
        isLoading={isEliminando}
        error={eliminarError}
      />
    </Stack>
  );
}
