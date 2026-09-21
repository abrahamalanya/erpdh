import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useAuth } from '../hooks/useAuth';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { DialogHeader } from '../components/DialogHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { VoucherCobroDialog } from '../components/VoucherCobroDialog';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { ClienteAutocomplete } from '../components/ClienteAutocomplete';
import { MedioCobroField, MEDIO_COBRO_LABELS } from '../components/MedioCobroField';
import { listCobros, getCreditosPendientesCliente, anularCobro, type Cobro, type CobroOperacion } from '../api/cobros';
import { refrendarCredito, liquidarCredito, pagarCuotasCredito } from '../api/creditosPrendarios';
import { resumenPagoCuotasDiario, usePagoCuotasDiario, type ModoPagoCuotas } from '../hooks/usePagoCuotasDiario';
import { PagoCuotasDiarioFields } from '../components/PagoCuotasDiarioFields';
import {
  canVerCobranzas,
  canRegistrarCobranza,
  COBRO_OPERACION_LABELS,
  COBRO_OPERACION_COLOR,
} from '../utils/cobranzaHierarchy';
import {
  TIPO_CREDITO_LABELS,
  CREDITO_ESTADO_LABELS,
  CREDITO_ESTADO_COLOR,
} from '../utils/creditoPrendarioHierarchy';
import { extractUserName } from '../utils/cajaHierarchy';
import { formatFechaHora, formatMonto } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import type { Cliente, Credito, MedioCobro } from '../types/api';

type OperacionCobro = 'refrendar' | 'pagar_cuotas' | 'liquidar';

export function CobranzasPage() {
  const { user } = useAuth();

  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [operacion, setOperacion] = useState<CobroOperacion | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [pendientes, setPendientes] = useState<Credito[]>([]);
  const [isLoadingPendientes, setIsLoadingPendientes] = useState(false);
  const [creditoSelId, setCreditoSelId] = useState<number | ''>('');
  const [operacionCobro, setOperacionCobro] = useState<OperacionCobro>('refrendar');
  const [numeroCuotasPagar, setNumeroCuotasPagar] = useState('1');
  const [modoPagoCuotas, setModoPagoCuotas] = useState<ModoPagoCuotas>('cuotas');
  const [montoPagado, setMontoPagado] = useState('');
  const [medio, setMedio] = useState<MedioCobro>('efectivo');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [anularTarget, setAnularTarget] = useState<Cobro | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [isAnulando, setIsAnulando] = useState(false);
  const [anularError, setAnularError] = useState<string | null>(null);

  const [voucherTarget, setVoucherTarget] = useState<{ id: number; telefono?: string | null; aviso?: string | null } | null>(
    null
  );

  function loadCobros() {
    setIsLoading(true);
    setLoadError(null);

    listCobros({
      page,
      q: q.trim() || undefined,
      operacion: operacion || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    })
      .then((res) => {
        setCobros(res.data.data);
        setLastPage(res.data.last_page);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadCobros, [page]);

  // Al cambiar un filtro (con debounce para el texto): vuelve a la página 1
  // —lo que recarga vía el efecto de arriba— o recarga directo si ya estaba
  // en la 1. Se salta el primer render para no duplicar la carga inicial.
  const primerRender = useRef(true);
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }

    const handle = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        loadCobros();
      }
    }, 300);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, operacion, desde, hasta]);

  const creditoSel = useMemo(
    () => pendientes.find((c) => c.id === creditoSelId) ?? null,
    [pendientes, creditoSelId]
  );

  const montoSugerido = useMemo(() => {
    if (!creditoSel) return null;
    return operacionCobro === 'liquidar'
      ? (creditoSel.monto_liquidacion_sugerido?.total ?? null)
      : (creditoSel.monto_refrendo_sugerido?.total ?? null);
  }, [creditoSel, operacionCobro]);

  useEffect(() => {
    if (montoSugerido != null) setMontoPagado(montoSugerido);
  }, [montoSugerido]);

  // A diferencia de refrendar/liquidar (monto ya embebido en pendientes),
  // pagar-cuotas depende de las cuotas o el monto que se elijan — el hook
  // pide un preview dedicado cada vez que cambian.
  const { preview: pagoCuotasPreview, setPreview: setPagoCuotasPreview } = usePagoCuotasDiario({
    creditoId: creditoSel?.id ?? null,
    activo: operacionCobro === 'pagar_cuotas',
    modo: modoPagoCuotas,
    numeroCuotas: numeroCuotasPagar,
    monto: montoPagado,
    onTotalSugerido: setMontoPagado,
  });

  const pagoCuotasInvalido =
    operacionCobro === 'pagar_cuotas' &&
    !resumenPagoCuotasDiario(modoPagoCuotas, pagoCuotasPreview, Number(montoPagado || 0)).valido;

  function handleModoPagoCuotasChange(modo: ModoPagoCuotas) {
    setModoPagoCuotas(modo);
    setPagoCuotasPreview(null);

    if (modo === 'monto') setMontoPagado('');
  }

  if (!canVerCobranzas(user)) {
    return <Navigate to="/" replace />;
  }

  function resetDialog() {
    setClienteSel(null);
    setPendientes([]);
    setCreditoSelId('');
    setOperacionCobro('refrendar');
    setNumeroCuotasPagar('1');
    setModoPagoCuotas('cuotas');
    setPagoCuotasPreview(null);
    setMontoPagado('');
    setMedio('efectivo');
    setComprobante(null);
    setFormError(null);
  }

  function openDialog() {
    resetDialog();
    setDialogOpen(true);
  }

  function handleClienteChange(cliente: Cliente | null) {
    setClienteSel(cliente);
    setPendientes([]);
    setCreditoSelId('');
    setFormError(null);

    if (!cliente) return;

    setIsLoadingPendientes(true);
    getCreditosPendientesCliente(cliente.id)
      .then((res) => setPendientes(res.data))
      .catch((err) => setFormError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoadingPendientes(false));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!creditoSel) {
      setFormError('Selecciona el crédito a cobrar.');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    const payload = { monto_pagado: montoPagado, medio, comprobante };

    try {
      const res =
        operacionCobro === 'liquidar'
          ? await liquidarCredito(creditoSel.id, payload)
          : operacionCobro === 'pagar_cuotas'
            ? await pagarCuotasCredito(creditoSel.id, {
                ...payload,
                numero_cuotas: modoPagoCuotas === 'cuotas' ? Number(numeroCuotasPagar) : undefined,
              })
            : await refrendarCredito(creditoSel.id, payload);

      setDialogOpen(false);
      loadCobros();

      if (res.data.cobro_id) {
        setVoucherTarget({ id: res.data.cobro_id, telefono: clienteSel?.telefono });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  function openAnular(cobro: Cobro) {
    setAnularError(null);
    setMotivoAnulacion('');
    setAnularTarget(cobro);
  }

  async function handleAnular() {
    if (!anularTarget) return;

    setIsAnulando(true);
    setAnularError(null);

    try {
      await anularCobro(anularTarget.id, motivoAnulacion.trim() || undefined);
      setAnularTarget(null);
      loadCobros();
    } catch (err) {
      setAnularError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsAnulando(false);
    }
  }

  const activeFiltersCount = [q, operacion, desde, hasta].filter((value) => value !== '').length;

  function clearFiltros() {
    setQ('');
    setOperacion('');
    setDesde('');
    setHasta('');
  }

  const columns: DataTableColumn<Cobro>[] = [
    { header: 'Fecha', render: (c) => formatFechaHora(c.created_at) },
    {
      header: 'Cliente',
      render: (c) =>
        c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}`.toUpperCase() : `#${c.cliente_id}`,
    },
    {
      header: 'Crédito',
      render: (c) =>
        c.credito
          ? `#${c.credito_id} · ${TIPO_CREDITO_LABELS[c.credito.tipo_credito]}`
          : `#${c.credito_id}`,
    },
    {
      header: 'Operación',
      render: (c) => (
        <Chip
          label={COBRO_OPERACION_LABELS[c.operacion]}
          size="small"
          color={COBRO_OPERACION_COLOR[c.operacion]}
        />
      ),
    },
    { header: 'Monto pagado', align: 'right', render: (c) => formatMonto(c.monto_pagado) },
    { header: 'Interés', align: 'right', render: (c) => formatMonto(c.interes) },
    { header: 'Mora', align: 'right', render: (c) => (c.mora != null ? formatMonto(c.mora) : '—') },
    {
      header: 'Descuento',
      align: 'right',
      render: (c) =>
        c.descuento != null && Number(c.descuento) > 0 ? (
          <Tooltip title={c.motivo_descuento ?? ''}>
            <span>-{formatMonto(c.descuento)}</span>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      header: 'Vuelto',
      align: 'right',
      render: (c) => (Number(c.vuelto) > 0 ? formatMonto(c.vuelto) : '—'),
    },
    { header: 'Medio', render: (c) => MEDIO_COBRO_LABELS[c.medio] },
    { header: 'Registrado por', render: (c) => extractUserName(c.registrado_por) ?? '—' },
    {
      header: 'Estado',
      render: (c) =>
        c.estado === 'anulado' ? (
          <Tooltip title={c.motivo_anulacion ?? ''}>
            <Chip label="Anulado" size="small" color="default" variant="outlined" />
          </Tooltip>
        ) : (
          <Chip label="Registrado" size="small" color="success" variant="outlined" />
        ),
    },
    {
      header: 'Vaucher',
      align: 'center',
      render: (c) => (
        <Tooltip title="Ver vaucher">
          <IconButton
            size="small"
            aria-label="Ver vaucher"
            onClick={() =>
              setVoucherTarget({
                id: c.id,
                telefono: c.cliente?.telefono,
                aviso:
                  c.estado === 'anulado'
                    ? `Este cobro fue anulado${c.motivo_anulacion ? `: ${c.motivo_anulacion}` : '.'}`
                    : null,
              })
            }
          >
            <ReceiptLongIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (c) => (
        <RowActions
          actions={
            c.puede_anular
              ? [
                  {
                    key: 'anular',
                    label: 'Anular',
                    icon: <DeleteIcon fontSize="small" />,
                    onClick: () => openAnular(c),
                  },
                ]
              : []
          }
        />
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Cobranzas
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <FiltrosPanel activeCount={activeFiltersCount} onClear={clearFiltros}>
            <TextField
              label="Buscar cliente"
              placeholder="Nombre o documento"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              select
              label="Operación"
              value={operacion}
              onChange={(e) => setOperacion(e.target.value as CobroOperacion | '')}
              size="small"
              fullWidth
            >
              <MenuItem value="">Todas</MenuItem>
              {(Object.keys(COBRO_OPERACION_LABELS) as CobroOperacion[]).map((op) => (
                <MenuItem key={op} value={op}>
                  {COBRO_OPERACION_LABELS[op]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Desde"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Hasta"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              size="small"
              fullWidth
            />
          </FiltrosPanel>
          {canRegistrarCobranza(user) && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
              Registrar cobranza
            </Button>
          )}
        </Stack>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={cobros}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay cobros registrados"
        page={page}
        lastPage={lastPage}
        onPageChange={setPage}
      />

      <Dialog
        open={dialogOpen}
        onClose={preventBackdropClose(() => setDialogOpen(false))}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleSubmit}>
          <DialogHeader onClose={() => setDialogOpen(false)}>Registrar cobranza</DialogHeader>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}

              <ClienteAutocomplete value={clienteSel} onChange={handleClienteChange} autoFocus />

              {clienteSel && (
                <TextField
                  select
                  label="Crédito a cobrar"
                  value={creditoSelId}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : '';
                    setCreditoSelId(id);
                    const credito = pendientes.find((c) => c.id === id);
                    setOperacionCobro(
                      credito?.permite_refrendo ? 'refrendar' : credito?.permite_pago_cuotas ? 'pagar_cuotas' : 'liquidar'
                    );
                    setNumeroCuotasPagar('1');
                    setModoPagoCuotas('cuotas');
                    setPagoCuotasPreview(null);
                  }}
                  helperText={
                    isLoadingPendientes
                      ? 'Cargando créditos...'
                      : pendientes.length === 0
                        ? 'Este cliente no tiene créditos activos o vencidos.'
                        : undefined
                  }
                  disabled={isLoadingPendientes || pendientes.length === 0}
                  required
                >
                  {pendientes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      #{c.id} · {TIPO_CREDITO_LABELS[c.tipo_credito]} ·{' '}
                      {formatMonto(c.monto_prestamo)} · {CREDITO_ESTADO_LABELS[c.estado]}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {creditoSel && (
                <>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={CREDITO_ESTADO_LABELS[creditoSel.estado]}
                      color={CREDITO_ESTADO_COLOR[creditoSel.estado]}
                    />
                    {creditoSel.permite_refrendo && creditoSel.monto_refrendo_sugerido && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Refrendo (interés): ${formatMonto(creditoSel.monto_refrendo_sugerido.total)}`}
                      />
                    )}
                    {creditoSel.permite_pago_cuotas && creditoSel.monto_pago_cuotas_sugerido && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Próxima cuota: ${formatMonto(creditoSel.monto_pago_cuotas_sugerido.total)}`}
                      />
                    )}
                    {creditoSel.monto_liquidacion_sugerido && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Liquidación (total): ${formatMonto(creditoSel.monto_liquidacion_sugerido.total)}`}
                      />
                    )}
                  </Stack>

                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    color="primary"
                    value={operacionCobro}
                    onChange={(_, v: OperacionCobro | null) => v && setOperacionCobro(v)}
                  >
                    {creditoSel.permite_refrendo && (
                      <ToggleButton value="refrendar">Refrendar (cobra interés, renueva)</ToggleButton>
                    )}
                    {creditoSel.permite_pago_cuotas && <ToggleButton value="pagar_cuotas">Pagar cuotas</ToggleButton>}
                    <ToggleButton value="liquidar">Liquidar (cancela el crédito)</ToggleButton>
                  </ToggleButtonGroup>

                  {operacionCobro === 'pagar_cuotas' && (
                    <PagoCuotasDiarioFields
                      modo={modoPagoCuotas}
                      onModoChange={handleModoPagoCuotasChange}
                      numeroCuotas={numeroCuotasPagar}
                      onNumeroCuotasChange={setNumeroCuotasPagar}
                      preview={pagoCuotasPreview}
                      permiteMonto={creditoSel.tipo_interes !== 'compuesto'}
                    />
                  )}

                  <TextField
                    label="Monto pagado (S/)"
                    type="number"
                    slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                    value={montoPagado}
                    onChange={(e) => setMontoPagado(e.target.value)}
                    helperText={
                      operacionCobro === 'pagar_cuotas'
                        ? pagoCuotasPreview
                          ? modoPagoCuotas === 'cuotas'
                            ? `Total a pagar: ${formatMonto(pagoCuotasPreview.total)}. ${
                                creditoSel.tipo_interes === 'compuesto'
                                  ? 'Un monto mayor abona a capital.'
                                  : 'Un monto mayor genera vuelto.'
                              }`
                            : Number(pagoCuotasPreview.vuelto) > 0
                              ? `Supera la deuda pendiente: vuelto ${formatMonto(pagoCuotasPreview.vuelto)}.`
                              : undefined
                          : undefined
                        : montoSugerido != null
                          ? operacionCobro === 'liquidar'
                            ? `Total a liquidar: ${formatMonto(montoSugerido)}. Un monto mayor genera vuelto.`
                            : `Interés a pagar: ${formatMonto(montoSugerido)}. El excedente abona a capital; para pagar todo usa Liquidar.`
                          : undefined
                    }
                    required
                  />

                  <MedioCobroField
                    medio={medio}
                    onMedioChange={setMedio}
                    comprobante={comprobante}
                    onComprobanteChange={setComprobante}
                  />
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving || !creditoSel || pagoCuotasInvalido}>
              {isSaving ? 'Registrando...' : 'Registrar cobro'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={!!anularTarget}
        title="Anular cobro"
        message={
          <Stack spacing={2}>
            <Typography>
              ¿Seguro que deseas anular este cobro de{' '}
              <strong>{anularTarget ? formatMonto(anularTarget.monto_pagado) : ''}</strong>? El crédito
              volverá a quedar como estaba antes de este pago.
            </Typography>
            <TextField
              label="Motivo (opcional)"
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        }
        onCancel={() => setAnularTarget(null)}
        onConfirm={handleAnular}
        isLoading={isAnulando}
        confirmLabel="Anular"
        error={anularError}
      />

      <VoucherCobroDialog
        cobroId={voucherTarget?.id ?? null}
        telefono={voucherTarget?.telefono}
        aviso={voucherTarget?.aviso}
        onClose={() => setVoucherTarget(null)}
      />
    </Stack>
  );
}
