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
  Divider,
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
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PrintIcon from '@mui/icons-material/Print';
import { useAuth } from '../hooks/useAuth';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { DialogHeader } from '../components/DialogHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { ClienteAutocomplete } from '../components/ClienteAutocomplete';
import { MedioCobroField, MEDIO_COBRO_LABELS } from '../components/MedioCobroField';
import { listCobros, getCreditosPendientesCliente, anularCobro, type Cobro, type CobroOperacion } from '../api/cobros';
import { refrendarCredito, liquidarCredito, pagarCuotasCredito, pagarCuotasPreview } from '../api/creditosPrendarios';
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
import type { Cliente, Credito, MedioCobro, MontoPagoCuotasSugerido } from '../types/api';

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
  const [pagoCuotasPreview, setPagoCuotasPreview] = useState<MontoPagoCuotasSugerido | null>(null);
  const [montoPagado, setMontoPagado] = useState('');
  const [medio, setMedio] = useState<MedioCobro>('efectivo');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [anularTarget, setAnularTarget] = useState<Cobro | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [isAnulando, setIsAnulando] = useState(false);
  const [anularError, setAnularError] = useState<string | null>(null);

  const [voucherTarget, setVoucherTarget] = useState<Cobro | null>(null);

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
  // pagar-cuotas depende de cuántas cuotas se elijan — pide un preview
  // dedicado cada vez que cambia numeroCuotasPagar.
  useEffect(() => {
    if (operacionCobro !== 'pagar_cuotas' || !creditoSel) return;

    const n = Number(numeroCuotasPagar);
    if (!Number.isInteger(n) || n < 1) return;

    const handle = setTimeout(() => {
      pagarCuotasPreview(creditoSel.id, n)
        .then((res) => {
          setPagoCuotasPreview(res.data);
          setMontoPagado(res.data.total);
        })
        .catch(() => setPagoCuotasPreview(null));
    }, 300);

    return () => clearTimeout(handle);
  }, [operacionCobro, creditoSel, numeroCuotasPagar]);

  if (!canVerCobranzas(user)) {
    return <Navigate to="/" replace />;
  }

  function resetDialog() {
    setClienteSel(null);
    setPendientes([]);
    setCreditoSelId('');
    setOperacionCobro('refrendar');
    setNumeroCuotasPagar('1');
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
      if (operacionCobro === 'liquidar') {
        await liquidarCredito(creditoSel.id, payload);
      } else if (operacionCobro === 'pagar_cuotas') {
        await pagarCuotasCredito(creditoSel.id, { ...payload, numero_cuotas: Number(numeroCuotasPagar) });
      } else {
        await refrendarCredito(creditoSel.id, payload);
      }
      setDialogOpen(false);
      loadCobros();
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

  function voucherFilas(c: Cobro): { label: string; value: string }[] {
    const filas: { label: string; value: string }[] = [
      {
        label: 'Cliente',
        value: c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}`.toUpperCase() : `#${c.cliente_id}`,
      },
    ];
    if (c.cliente?.numero_documento) filas.push({ label: 'Documento', value: c.cliente.numero_documento });
    filas.push({
      label: 'Crédito',
      value: c.credito ? `${c.credito.codigo} (${TIPO_CREDITO_LABELS[c.credito.tipo_credito]})` : `#${c.credito_id}`,
    });
    filas.push({ label: 'Operación', value: COBRO_OPERACION_LABELS[c.operacion] });
    filas.push({ label: 'Monto pagado', value: formatMonto(c.monto_pagado) });
    if (Number(c.interes) > 0) filas.push({ label: 'Interés', value: formatMonto(c.interes) });
    if (c.mora != null && Number(c.mora) > 0) filas.push({ label: 'Mora', value: formatMonto(c.mora) });
    if (c.descuento != null && Number(c.descuento) > 0) {
      filas.push({ label: 'Descuento', value: `-${formatMonto(c.descuento)}` });
    }
    if (Number(c.vuelto) > 0) filas.push({ label: 'Vuelto', value: formatMonto(c.vuelto) });
    filas.push({ label: 'Medio de pago', value: MEDIO_COBRO_LABELS[c.medio] });
    filas.push({ label: 'Atendido por', value: extractUserName(c.registrado_por) ?? '—' });

    return filas;
  }

  function buildVoucherTexto(c: Cobro): string {
    const encabezado = [user?.empresa?.nombre?.toUpperCase(), user?.agencia?.nombre].filter(
      (l): l is string => !!l
    );

    const lineas = [
      ...encabezado,
      'COMPROBANTE DE COBRO',
      `#${c.id} · ${formatFechaHora(c.created_at)}`,
      '',
      ...voucherFilas(c).map((f) => `${f.label}: ${f.value}`),
    ];

    if (c.estado === 'anulado') {
      lineas.push('', '*** ANULADO ***');
      if (c.motivo_anulacion) lineas.push(`Motivo: ${c.motivo_anulacion}`);
    }

    return lineas.join('\n');
  }

  /** Perú: números locales tienen 9 dígitos — wa.me exige el prefijo de país sin "+". */
  function normalizeTelefonoWhatsapp(telefono: string): string {
    const digits = telefono.replace(/\D/g, '');
    return digits.length === 9 ? `51${digits}` : digits;
  }

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function handleImprimirVoucher(c: Cobro) {
    const ventana = window.open('', '_blank', 'width=380,height=640');
    if (!ventana) return;

    const filasHtml = voucherFilas(c)
      .map(
        (f) =>
          `<div class="fila"><span>${escapeHtml(f.label)}</span><strong>${escapeHtml(f.value)}</strong></div>`
      )
      .join('');

    ventana.document.write(`
      <html>
        <head>
          <title>Vaucher #${c.id}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 13px; width: 300px; margin: 16px auto; color: #000; }
            h1 { font-size: 15px; text-align: center; margin: 0 0 4px; }
            .sub { text-align: center; color: #444; margin: 0 0 4px; font-size: 12px; }
            .fila { display: flex; justify-content: space-between; gap: 12px; margin: 4px 0; }
            .anulado { text-align: center; font-weight: bold; margin-top: 12px; border: 1px solid #000; padding: 4px; }
            hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(user?.empresa?.nombre?.toUpperCase() ?? 'COMPROBANTE DE COBRO')}</h1>
          ${user?.agencia?.nombre ? `<p class="sub">${escapeHtml(user.agencia.nombre)}</p>` : ''}
          <p class="sub">Vaucher #${c.id} · ${formatFechaHora(c.created_at)}</p>
          <hr />
          ${filasHtml}
          <hr />
          ${
            c.estado === 'anulado'
              ? `<p class="anulado">ANULADO${c.motivo_anulacion ? `<br/>${escapeHtml(c.motivo_anulacion)}` : ''}</p>`
              : ''
          }
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    ventana.print();
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
          <IconButton size="small" aria-label="Ver vaucher" onClick={() => setVoucherTarget(c)}>
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
                    setOperacionCobro(credito?.tipo_credito === 'diario' ? 'pagar_cuotas' : 'refrendar');
                    setNumeroCuotasPagar('1');
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
                    {creditoSel.tipo_credito !== 'diario' && creditoSel.monto_refrendo_sugerido && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Refrendo (interés): ${formatMonto(creditoSel.monto_refrendo_sugerido.total)}`}
                      />
                    )}
                    {creditoSel.tipo_credito === 'diario' && creditoSel.monto_pago_cuotas_sugerido && (
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
                    {creditoSel.tipo_credito === 'diario' ? (
                      <ToggleButton value="pagar_cuotas">Pagar cuotas</ToggleButton>
                    ) : (
                      <ToggleButton value="refrendar">Refrendar (cobra interés, renueva)</ToggleButton>
                    )}
                    <ToggleButton value="liquidar">Liquidar (cancela el crédito)</ToggleButton>
                  </ToggleButtonGroup>

                  {operacionCobro === 'pagar_cuotas' && (
                    <TextField
                      label="Cuotas a pagar"
                      type="number"
                      slotProps={{ htmlInput: { step: '1', min: 1 } }}
                      value={numeroCuotasPagar}
                      onChange={(e) => setNumeroCuotasPagar(e.target.value)}
                      helperText={
                        pagoCuotasPreview
                          ? `${pagoCuotasPreview.cuotas.length} cuota(s)${
                              Number(pagoCuotasPreview.mora) > 0
                                ? ` · mora incluida: ${formatMonto(pagoCuotasPreview.mora)}`
                                : ''
                            }${pagoCuotasPreview.es_ultima_cuota ? ' · última cuota: el crédito quedará liquidado' : ''}`
                          : 'Calculando monto sugerido...'
                      }
                      required
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
                          ? `Total a pagar: ${formatMonto(pagoCuotasPreview.total)}. Un monto mayor genera vuelto.`
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
            <Button type="submit" variant="contained" disabled={isSaving || !creditoSel}>
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

      <Dialog open={!!voucherTarget} onClose={() => setVoucherTarget(null)} fullWidth maxWidth="xs">
        <DialogHeader onClose={() => setVoucherTarget(null)}>
          Vaucher {voucherTarget ? `#${voucherTarget.id}` : ''}
        </DialogHeader>
        {voucherTarget && (
          <DialogContent>
            <Stack spacing={2}>
              <Stack spacing={0.25} sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {user?.empresa?.nombre?.toUpperCase() ?? 'COMPROBANTE DE COBRO'}
                </Typography>
                {user?.agencia?.nombre && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {user.agencia.nombre}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatFechaHora(voucherTarget.created_at)}
                </Typography>
              </Stack>

              <Divider />

              <Stack spacing={1}>
                {voucherFilas(voucherTarget).map((f) => (
                  <Stack key={f.label} direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {f.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                      {f.value}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              {voucherTarget.estado === 'anulado' && (
                <Alert severity="warning">
                  Este cobro fue anulado{voucherTarget.motivo_anulacion ? `: ${voucherTarget.motivo_anulacion}` : '.'}
                </Alert>
              )}
            </Stack>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setVoucherTarget(null)}>Cerrar</Button>
          {voucherTarget && (
            <>
              <Tooltip
                title={voucherTarget.cliente?.telefono ? '' : 'El cliente no tiene teléfono registrado'}
              >
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<WhatsAppIcon />}
                    disabled={!voucherTarget.cliente?.telefono}
                    component={voucherTarget.cliente?.telefono ? 'a' : 'button'}
                    href={
                      voucherTarget.cliente?.telefono
                        ? `https://wa.me/${normalizeTelefonoWhatsapp(voucherTarget.cliente.telefono)}?text=${encodeURIComponent(buildVoucherTexto(voucherTarget))}`
                        : undefined
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Enviar
                  </Button>
                </span>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => handleImprimirVoucher(voucherTarget)}
              >
                Imprimir
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
