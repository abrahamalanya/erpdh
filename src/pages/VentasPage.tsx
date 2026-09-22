import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
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
import PaymentIcon from '@mui/icons-material/Payment';
import CancelIcon from '@mui/icons-material/Cancel';
import DescriptionIcon from '@mui/icons-material/Description';
import { useAuth } from '../hooks/useAuth';
import {
  ARTICULO_TIPO_LABELS,
  FORMA_VENTA_LABELS,
  VENTA_ESTADO_COLOR,
  VENTA_ESTADO_LABELS,
  canCrearVentas,
  canVerVentas,
  puedeCancelarVenta,
  puedeCobrarVenta,
  type VentaPrefillState,
} from '../utils/ventaHierarchy';
import { MEDIO_COBRO_LABELS } from '../components/MedioCobroField';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { DialogHeader } from '../components/DialogHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ClienteAutocomplete } from '../components/ClienteAutocomplete';
import { ClienteCreateDialog } from '../components/ClienteCreateDialog';
import { DocumentoVentaDialog } from '../components/DocumentoVentaDialog';
import {
  abonarVenta,
  cancelarVenta,
  createVenta,
  DOCUMENTO_VENTA_TIPO_LABELS,
  getVenta,
  listCatalogoVenta,
  listVentas,
  pagarCuotaVenta,
} from '../api/ventas';
import { atenderSolicitudTienda, getTiendaArticulo } from '../api/tienda';
import { preventBackdropClose } from '../utils/dialog';
import { formatFecha, formatMonto } from '../utils/format';
import type {
  ArticuloTipo,
  Cliente,
  CuotaVenta,
  DocumentoVenta,
  FormaVenta,
  MedioCobro,
  PaginatedData,
  TiendaArticulo,
  Venta,
  VentaEstado,
} from '../types/api';

const STEPS = ['Cliente', 'Producto', 'Detalle'] as const;

interface FiltersState {
  estado: VentaEstado | '';
  formaVenta: FormaVenta | '';
  cliente: Cliente | null;
}

const emptyFilters: FiltersState = { estado: '', formaVenta: '', cliente: null };

export function VentasPage() {
  const { user } = useAuth();
  const canCrear = canCrearVentas(user);
  const location = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState<PaginatedData<Venta> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);

  function loadVentas() {
    setIsLoading(true);
    setLoadError(null);

    listVentas(page, {
      estado: filters.estado || undefined,
      formaVenta: filters.formaVenta || undefined,
      clienteId: filters.cliente?.id,
    })
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadVentas, [page, filters]);

  // ===== Nueva venta =====
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [quickClienteOpen, setQuickClienteOpen] = useState(false);
  const [catalogo, setCatalogo] = useState<PaginatedData<TiendaArticulo> | null>(null);
  const [catalogoPage, setCatalogoPage] = useState(1);
  const [catalogoTipo, setCatalogoTipo] = useState<ArticuloTipo | ''>('');
  const [catalogoLoading, setCatalogoLoading] = useState(false);
  const [articuloSel, setArticuloSel] = useState<TiendaArticulo | null>(null);
  const [formaVenta, setFormaVenta] = useState<FormaVenta>('contado');
  const [medio, setMedio] = useState<MedioCobro>('efectivo');
  const [inicial, setInicial] = useState('');
  const [numeroCuotas, setNumeroCuotas] = useState('');
  const [interes, setInteres] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Precarga desde una solicitud de la tienda virtual (TiendaSolicitudesPage
  // → navigate('/ventas', { state })): el artículo ya viene elegido y el
  // nombre/teléfono de la solicitud se ofrecen para el alta rápida de
  // cliente, ya que una solicitud pública no está ligada a un Cliente. Al
  // completar la venta se marca esa solicitud como atendida.
  const [solicitudId, setSolicitudId] = useState<number | null>(null);
  const [prefillContacto, setPrefillContacto] = useState<{
    nombreCompleto?: string;
    nombre?: string;
    apellido?: string;
    telefono?: string;
  } | null>(null);

  useEffect(() => {
    const state = location.state as VentaPrefillState | null;

    if (!state) return;

    navigate(location.pathname, { replace: true });

    setStep(0);
    setClienteSel(null);
    setFormaVenta('contado');
    setMedio('efectivo');
    setInicial('');
    setNumeroCuotas('');
    setInteres('');
    setFechaLimite('');
    setFormError(null);
    setSolicitudId(state.solicitudId);

    // La solicitud solo trae un nombre completo; se parte de forma naïve
    // (primera palabra = nombre, resto = apellido) para precargar el alta
    // rápida de cliente — el asesor lo corrige antes de guardar si hace falta.
    const partes = state.prefillNombre?.trim().split(/\s+/).filter(Boolean) ?? [];
    setPrefillContacto({
      nombreCompleto: state.prefillNombre,
      nombre: partes[0],
      apellido: partes.slice(1).join(' ') || undefined,
      telefono: state.prefillTelefono,
    });

    getTiendaArticulo(state.prefillArticuloTipo, state.prefillArticuloId)
      .then((res) => setArticuloSel(res.data))
      .catch(() => setArticuloSel(null));

    setNuevaOpen(true);
    // Solo al montar: lee el state que dejó la navegación desde la solicitud.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!nuevaOpen || step !== 1) return;

    setCatalogoLoading(true);
    listCatalogoVenta(catalogoPage, { tipo: catalogoTipo || undefined })
      .then((res) => setCatalogo(res.data))
      .catch(() => setCatalogo(null))
      .finally(() => setCatalogoLoading(false));
  }, [nuevaOpen, step, catalogoPage, catalogoTipo]);

  function openNuevaVenta() {
    setStep(0);
    setClienteSel(null);
    setArticuloSel(null);
    setCatalogoTipo('');
    setCatalogoPage(1);
    setFormaVenta('contado');
    setMedio('efectivo');
    setInicial('');
    setNumeroCuotas('');
    setInteres('');
    setFechaLimite('');
    setFormError(null);
    setSolicitudId(null);
    setPrefillContacto(null);
    setNuevaOpen(true);
  }

  const precioArticulo = articuloSel ? (articuloSel.precio_oferta ?? articuloSel.precio_venta) : null;

  async function handleCrearVenta() {
    if (!clienteSel || !articuloSel) return;

    setFormError(null);
    setIsSaving(true);

    try {
      await createVenta({
        tipo: articuloSel.articulo_tipo,
        articulo_id: articuloSel.id,
        cliente_id: clienteSel.id,
        forma_venta: formaVenta,
        medio,
        inicial: formaVenta !== 'contado' ? inicial : undefined,
        numero_cuotas: formaVenta === 'credito' ? Number(numeroCuotas) : undefined,
        interes: formaVenta === 'credito' && interes !== '' ? interes : undefined,
        fecha_limite: formaVenta === 'apartado' ? fechaLimite : undefined,
      });

      if (solicitudId !== null) {
        await atenderSolicitudTienda(solicitudId).catch(() => undefined);
        setSolicitudId(null);
      }

      setNuevaOpen(false);
      loadVentas();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  // ===== Detalle de venta =====
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<Venta | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);

  function loadDetalle(id: number) {
    setDetalleLoading(true);
    setDetalleError(null);

    getVenta(id)
      .then((res) => setDetalle(res.data))
      .catch((err) => setDetalleError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setDetalleLoading(false));
  }

  function openDetalle(venta: Venta) {
    setDetalleId(venta.id);
    setDetalle(null);
    loadDetalle(venta.id);
  }

  function refreshDetalle() {
    if (detalleId !== null) loadDetalle(detalleId);
    loadVentas();
  }

  // ===== Pagar cuota / abonar =====
  const [pagoTarget, setPagoTarget] = useState<{ kind: 'cuota'; cuota: CuotaVenta } | { kind: 'abono' } | null>(null);
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMedio, setPagoMedio] = useState<MedioCobro>('efectivo');
  const [pagoError, setPagoError] = useState<string | null>(null);
  const [pagoSaving, setPagoSaving] = useState(false);

  function openPagarCuota(cuota: CuotaVenta) {
    setPagoTarget({ kind: 'cuota', cuota });
    setPagoMonto(String(Number(cuota.monto_total) - Number(cuota.monto_abonado)));
    setPagoMedio('efectivo');
    setPagoError(null);
  }

  function openAbonar() {
    setPagoTarget({ kind: 'abono' });
    setPagoMonto(detalle?.saldo_pendiente ?? '');
    setPagoMedio('efectivo');
    setPagoError(null);
  }

  async function handlePagoSubmit() {
    if (!pagoTarget || !detalle) return;

    setPagoSaving(true);
    setPagoError(null);

    try {
      if (pagoTarget.kind === 'cuota') {
        await pagarCuotaVenta(detalle.id, pagoTarget.cuota.id, pagoMonto, pagoMedio);
      } else {
        await abonarVenta(detalle.id, pagoMonto, pagoMedio);
      }

      setPagoTarget(null);
      refreshDetalle();
    } catch (err) {
      setPagoError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setPagoSaving(false);
    }
  }

  // ===== Cancelar apartado =====
  const [cancelTarget, setCancelTarget] = useState<Venta | null>(null);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancelar() {
    if (!cancelTarget) return;

    setCancelSaving(true);
    setCancelError(null);

    try {
      await cancelarVenta(cancelTarget.id);
      setCancelTarget(null);
      refreshDetalle();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCancelSaving(false);
    }
  }

  // ===== Ver documento =====
  const [documentoSel, setDocumentoSel] = useState<DocumentoVenta | null>(null);

  if (!canVerVentas(user)) {
    return <Navigate to="/" replace />;
  }

  const columns: DataTableColumn<Venta>[] = [
    { header: 'Cliente', render: (v) => (v.cliente ? `${v.cliente.nombre} ${v.cliente.apellido}`.toUpperCase() : '—') },
    {
      header: 'Artículo',
      render: (v) => `${ARTICULO_TIPO_LABELS[v.articulo_type]}${v.articulo ? ` — ${v.articulo.nombre}` : ''}`,
    },
    { header: 'Forma', render: (v) => FORMA_VENTA_LABELS[v.forma_venta] },
    { header: 'Precio', render: (v) => formatMonto(v.precio_venta) },
    { header: 'Saldo pendiente', render: (v) => formatMonto(v.saldo_pendiente) },
    {
      header: 'Estado',
      render: (v) => <Chip label={VENTA_ESTADO_LABELS[v.estado]} size="small" color={VENTA_ESTADO_COLOR[v.estado]} />,
    },
    { header: 'Fecha', render: (v) => formatFecha(v.created_at) },
    {
      header: 'Acciones',
      align: 'right',
      render: (v) => (
        <RowActions
          actions={[
            { key: 'ver', label: 'Ver detalle', icon: <VisibilityIcon fontSize="small" />, onClick: () => openDetalle(v) },
          ]}
        />
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ventas
        </Typography>
        {canCrear && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNuevaVenta}>
            Nueva venta
          </Button>
        )}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <ClienteAutocomplete
          value={filters.cliente}
          onChange={(cliente) => {
            setPage(1);
            setFilters((f) => ({ ...f, cliente }));
          }}
          label="Filtrar por cliente"
        />
        <TextField
          select
          label="Forma de venta"
          value={filters.formaVenta}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, formaVenta: e.target.value as FormaVenta | '' }));
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {(Object.keys(FORMA_VENTA_LABELS) as FormaVenta[]).map((v) => (
            <MenuItem key={v} value={v}>
              {FORMA_VENTA_LABELS[v]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Estado"
          value={filters.estado}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, estado: e.target.value as VentaEstado | '' }));
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {(Object.keys(VENTA_ESTADO_LABELS) as VentaEstado[]).map((v) => (
            <MenuItem key={v} value={v}>
              {VENTA_ESTADO_LABELS[v]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(v) => v.id}
        isLoading={isLoading}
        emptyMessage="No hay ventas registradas"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      {/* ===== Nueva venta ===== */}
      <Dialog open={nuevaOpen} onClose={preventBackdropClose(() => setNuevaOpen(false))} fullWidth maxWidth="md">
        <DialogHeader onClose={() => setNuevaOpen(false)}>Nueva venta</DialogHeader>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Stepper activeStep={step}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {formError && <Alert severity="error">{formError}</Alert>}

            {step === 0 && (
              <Stack spacing={2}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Busca al cliente que va a comprar, o regístralo si es nuevo.
                </Typography>
                {prefillContacto && (prefillContacto.nombreCompleto || prefillContacto.telefono) && (
                  <Alert severity="info">
                    Solicitud de la tienda: {prefillContacto.nombreCompleto}{' '}
                    {prefillContacto.telefono ? `— ${prefillContacto.telefono}` : ''}. Búscalo si ya es cliente, o
                    regístralo con estos datos.
                  </Alert>
                )}
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <ClienteAutocomplete value={clienteSel} onChange={setClienteSel} required autoFocus />
                  </Box>
                  <Button size="small" onClick={() => setQuickClienteOpen(true)}>
                    ＋ Nuevo
                  </Button>
                </Stack>
              </Stack>
            )}

            {step === 1 && (
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1 }}>
                    Elige el producto de la tienda que quieres vender.
                  </Typography>
                  <TextField
                    select
                    label="Tipo"
                    size="small"
                    value={catalogoTipo}
                    onChange={(e) => {
                      setCatalogoPage(1);
                      setCatalogoTipo(e.target.value as ArticuloTipo | '');
                    }}
                    sx={{ minWidth: 160 }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {(Object.keys(ARTICULO_TIPO_LABELS) as ArticuloTipo[]).map((t) => (
                      <MenuItem key={t} value={t}>
                        {ARTICULO_TIPO_LABELS[t]}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                {catalogoLoading ? (
                  <Stack sx={{ alignItems: 'center', py: 4 }}>
                    <CircularProgress size={28} />
                  </Stack>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                      gap: 2,
                      maxHeight: '50vh',
                      overflow: 'auto',
                    }}
                  >
                    {(catalogo?.data ?? []).map((a) => (
                      <Card
                        key={`${a.articulo_tipo}-${a.id}`}
                        variant="outlined"
                        sx={{
                          borderColor: articuloSel?.id === a.id && articuloSel.articulo_tipo === a.articulo_tipo ? 'primary.main' : undefined,
                          borderWidth: articuloSel?.id === a.id && articuloSel.articulo_tipo === a.articulo_tipo ? 2 : 1,
                        }}
                      >
                        <CardActionArea onClick={() => setArticuloSel(a)} sx={{ p: 1.5 }}>
                          <Stack spacing={0.5}>
                            <Chip label={ARTICULO_TIPO_LABELS[a.articulo_tipo]} size="small" sx={{ alignSelf: 'flex-start' }} />
                            <Typography variant="subtitle2" noWrap>
                              {a.nombre}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {formatMonto(a.precio_oferta ?? a.precio_venta ?? a.valorizacion)}
                              {a.precio_oferta && (
                                <Typography component="span" variant="caption" sx={{ ml: 1, textDecoration: 'line-through', color: 'text.secondary' }}>
                                  {formatMonto(a.precio_venta ?? a.valorizacion)}
                                </Typography>
                              )}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {a.agencia?.nombre.toUpperCase() ?? '—'}
                            </Typography>
                          </Stack>
                        </CardActionArea>
                      </Card>
                    ))}
                    {(catalogo?.data.length ?? 0) === 0 && (
                      <Typography sx={{ color: 'text.secondary', py: 4, gridColumn: '1 / -1', textAlign: 'center' }}>
                        No hay productos disponibles en la tienda.
                      </Typography>
                    )}
                  </Box>
                )}
              </Stack>
            )}

            {step === 2 && articuloSel && (
              <Stack spacing={2.5}>
                <Alert severity="info">
                  {ARTICULO_TIPO_LABELS[articuloSel.articulo_tipo]} — {articuloSel.nombre} · Precio:{' '}
                  {formatMonto(precioArticulo ?? '0')}
                </Alert>
                <TextField
                  select
                  label="Forma de venta"
                  value={formaVenta}
                  onChange={(e) => setFormaVenta(e.target.value as FormaVenta)}
                >
                  {(Object.keys(FORMA_VENTA_LABELS) as FormaVenta[]).map((v) => (
                    <MenuItem key={v} value={v}>
                      {FORMA_VENTA_LABELS[v]}
                    </MenuItem>
                  ))}
                </TextField>

                {formaVenta !== 'contado' && (
                  <TextField
                    label="Inicial"
                    type="number"
                    slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                    value={inicial}
                    onChange={(e) => setInicial(e.target.value)}
                    required
                  />
                )}

                {formaVenta === 'credito' && (
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Número de cuotas"
                      type="number"
                      slotProps={{ htmlInput: { min: 1 } }}
                      value={numeroCuotas}
                      onChange={(e) => setNumeroCuotas(e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Interés mensual (%)"
                      type="number"
                      slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                      value={interes}
                      onChange={(e) => setInteres(e.target.value)}
                      helperText="Vacío = usa la tasa configurada. 0 = sin interés."
                      fullWidth
                    />
                  </Stack>
                )}

                {formaVenta === 'apartado' && (
                  <TextField
                    label="Fecha de cancelación"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={fechaLimite}
                    onChange={(e) => setFechaLimite(e.target.value)}
                    required
                  />
                )}

                <TextField select label="Medio de pago" value={medio} onChange={(e) => setMedio(e.target.value as MedioCobro)}>
                  {Object.entries(MEDIO_COBRO_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setNuevaOpen(false)}>Cancelar</Button>
          {step > 0 && <Button onClick={() => setStep((s) => s - 1)}>Atrás</Button>}
          {step < 2 && (
            <Button
              variant="contained"
              disabled={(step === 0 && !clienteSel) || (step === 1 && !articuloSel)}
              onClick={() => setStep((s) => s + 1)}
            >
              Siguiente
            </Button>
          )}
          {step === 2 && (
            <Button variant="contained" disabled={isSaving} onClick={handleCrearVenta}>
              {isSaving ? 'Guardando...' : 'Registrar venta'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ===== Detalle de venta ===== */}
      <Dialog open={detalleId !== null} onClose={() => setDetalleId(null)} fullWidth maxWidth="md">
        <DialogHeader onClose={() => setDetalleId(null)}>Venta #{detalleId}</DialogHeader>
        <DialogContent>
          {detalleError && <Alert severity="error">{detalleError}</Alert>}
          {detalleLoading || !detalle ? (
            <Stack sx={{ alignItems: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Stack>
          ) : (
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label={VENTA_ESTADO_LABELS[detalle.estado]} color={VENTA_ESTADO_COLOR[detalle.estado]} />
                <Chip label={FORMA_VENTA_LABELS[detalle.forma_venta]} variant="outlined" />
                <Chip label={ARTICULO_TIPO_LABELS[detalle.articulo_type]} variant="outlined" />
              </Stack>

              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary' }}>Cliente</TableCell>
                    <TableCell>{detalle.cliente ? `${detalle.cliente.nombre} ${detalle.cliente.apellido}`.toUpperCase() : '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary' }}>Artículo</TableCell>
                    <TableCell>{detalle.articulo?.nombre ?? '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary' }}>Precio de venta</TableCell>
                    <TableCell>{formatMonto(detalle.precio_venta)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary' }}>Inicial</TableCell>
                    <TableCell>{formatMonto(detalle.inicial)}</TableCell>
                  </TableRow>
                  {detalle.forma_venta === 'credito' && (
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary' }}>Interés mensual</TableCell>
                      <TableCell>{detalle.interes}%</TableCell>
                    </TableRow>
                  )}
                  {detalle.forma_venta === 'apartado' && (
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary' }}>Fecha de cancelación</TableCell>
                      <TableCell>{formatFecha(detalle.fecha_limite)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary' }}>Saldo pendiente</TableCell>
                    <TableCell>{formatMonto(detalle.saldo_pendiente)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {detalle.forma_venta === 'credito' && (detalle.cuotas?.length ?? 0) > 0 && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Cronograma</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>N.°</TableCell>
                        <TableCell>Vencimiento</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="right">Abonado</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detalle.cuotas!.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.numero_cuota}</TableCell>
                          <TableCell>{formatFecha(c.fecha_vencimiento)}</TableCell>
                          <TableCell align="right">{formatMonto(c.monto_total)}</TableCell>
                          <TableCell align="right">{formatMonto(c.monto_abonado)}</TableCell>
                          <TableCell>
                            <Chip label={c.estado === 'pagada' ? 'Pagada' : 'Pendiente'} size="small" color={c.estado === 'pagada' ? 'success' : 'default'} />
                          </TableCell>
                          <TableCell align="right">
                            {c.estado !== 'pagada' && detalle.estado === 'activa' && puedeCobrarVenta(user, detalle) && (
                              <RowActions
                                actions={[
                                  { key: 'pagar', label: 'Pagar', icon: <PaymentIcon fontSize="small" />, onClick: () => openPagarCuota(c) },
                                ]}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              )}

              <Stack spacing={1}>
                <Typography variant="subtitle2">Pagos</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Medio</TableCell>
                      <TableCell align="right">Monto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(detalle.pagos ?? []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatFecha(p.created_at)}</TableCell>
                        <TableCell>{p.tipo}</TableCell>
                        <TableCell>{MEDIO_COBRO_LABELS[p.medio]}</TableCell>
                        <TableCell align="right">{formatMonto(p.monto)}</TableCell>
                      </TableRow>
                    ))}
                    {(detalle.pagos?.length ?? 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>
                          Sin pagos registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Stack>

              {(detalle.documentos?.length ?? 0) > 0 && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Documentos</Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {detalle.documentos!.map((d) => (
                      <Chip
                        key={d.id}
                        icon={<DescriptionIcon fontSize="small" />}
                        label={DOCUMENTO_VENTA_TIPO_LABELS[d.tipo]}
                        onClick={() => setDocumentoSel(d)}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Stack>
              )}

              {detalle.forma_venta === 'apartado' && detalle.estado === 'activa' && (
                <>
                  <Divider />
                  <Stack direction="row" spacing={2}>
                    {puedeCobrarVenta(user, detalle) && (
                      <Button variant="contained" startIcon={<PaymentIcon />} onClick={openAbonar}>
                        Abonar
                      </Button>
                    )}
                    {puedeCancelarVenta(user, detalle) && (
                      <Button color="error" startIcon={<CancelIcon />} onClick={() => setCancelTarget(detalle)}>
                        Cancelar apartado
                      </Button>
                    )}
                  </Stack>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Pagar cuota / abonar ===== */}
      <Dialog open={pagoTarget !== null} onClose={preventBackdropClose(() => setPagoTarget(null))} fullWidth maxWidth="xs">
        <DialogHeader onClose={() => setPagoTarget(null)}>{pagoTarget?.kind === 'cuota' ? 'Pagar cuota' : 'Registrar abono'}</DialogHeader>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {pagoError && <Alert severity="error">{pagoError}</Alert>}
            <TextField
              label="Monto"
              type="number"
              slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
              value={pagoMonto}
              onChange={(e) => setPagoMonto(e.target.value)}
              required
              autoFocus
            />
            <TextField select label="Medio de pago" value={pagoMedio} onChange={(e) => setPagoMedio(e.target.value as MedioCobro)}>
              {Object.entries(MEDIO_COBRO_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setPagoTarget(null)}>Cancelar</Button>
          <Button variant="contained" disabled={pagoSaving} onClick={handlePagoSubmit}>
            {pagoSaving ? 'Guardando...' : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancelar apartado"
        message="El cliente pierde el inicial y los abonos entregados, y el artículo vuelve a la tienda. ¿Deseas continuar?"
        onCancel={() => {
          setCancelTarget(null);
          setCancelError(null);
        }}
        onConfirm={handleCancelar}
        isLoading={cancelSaving}
        error={cancelError}
        confirmLabel="Cancelar apartado"
      />

      <DocumentoVentaDialog ventaId={detalleId ?? 0} documento={documentoSel} onClose={() => setDocumentoSel(null)} />

      <ClienteCreateDialog
        open={quickClienteOpen}
        onClose={() => setQuickClienteOpen(false)}
        onCreated={(cliente) => {
          setClienteSel(cliente);
          setQuickClienteOpen(false);
        }}
        draftKey="venta-quick-cliente"
        title="Nuevo cliente"
        initialValues={
          prefillContacto
            ? { nombre: prefillContacto.nombre, apellido: prefillContacto.apellido, telefono: prefillContacto.telefono }
            : undefined
        }
      />
    </Stack>
  );
}
