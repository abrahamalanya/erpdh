import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { FiltrosPanel } from '../components/FiltrosPanel';
import type { DashboardFiltrosNavegacion } from '../api/dashboard';
import {
  Alert,
  Box,
  Button,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../hooks/useAuth';
import { hasRole, hasPermission } from '../utils/roles';
import { canVerBilletajes, extractUserName } from '../utils/cajaHierarchy';
import { enviarBilletaje, aceptarBilletaje, listBilletajes, rechazarBilletaje } from '../api/billetajes';
import { listCajas } from '../api/caja';
import { listBovedas } from '../api/bovedas';
import { listCuentasBancarias } from '../api/cuentasBancarias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions, type RowAction } from '../components/RowActions';
import { DialogHeader } from '../components/DialogHeader';
import { UpperTextField } from '../components/UpperTextField';
import { PhotoField } from '../components/MediaFields';
import { MediaLightbox, type MediaLightboxItem } from '../components/MediaLightbox';
import { getEcho } from '../realtime/echo';
import { capitalize, formatFechaHora, formatMonto, truncate } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import { ErrorBanner } from '../components/ErrorBanner';
import type {
  Caja,
  Boveda,
  Billetaje,
  BilletajeEstado,
  CanalEgresoBilletaje,
  CuentaBancaria,
  MedioEgresoBilletaje,
  PaginatedData,
} from '../types/api';

function vaucherDe(b: Billetaje): MediaLightboxItem | null {
  const comprobante = b.fotos?.find((f) => f.tipo === 'comprobante');
  if (!comprobante) return null;

  return { type: comprobante.path.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image', url: comprobante.url, label: 'Vaucher' };
}

const ESTADO_COLOR: Record<BilletajeEstado, 'warning' | 'success' | 'error'> = {
  pendiente: 'warning',
  aprobado: 'success',
  rechazado: 'error',
};

export function BilletajesPage() {
  const { user } = useAuth();
  const canSend = hasPermission(user, 'billetajes.crear');
  const busy = useRef(false);
  const accountsRequest = useRef(0);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [sending, setSending] = useState(false);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [bovedas, setBovedas] = useState<Boveda[]>([]);
  const [asesorId, setAsesorId] = useState<number | ''>('');
  const [monto, setMonto] = useState('');
  const [motivoEnvio, setMotivoEnvio] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<Billetaje | null>(null);
  const [isAceptando, setIsAceptando] = useState(false);

  const [result, setResult] = useState<PaginatedData<Billetaje> | null>(null);
  const [page, setPage] = useState(1);
  const location = useLocation();
  const navigate = useNavigate();
  const [desdeInicio] = useState(() => !!location.state?.desdeInicio);
  const hoy = new Date().toLocaleDateString('en-CA');
  const [filtros, setFiltros] = useState(() => {
    const inicial = location.state as DashboardFiltrosNavegacion | null;
    return { desde: inicial?.desde ?? hoy, hasta: inicial?.hasta ?? hoy, agencia_id: inicial?.agencia_id, asesor_id: inicial?.asesor_id };
  });
  const rangoInvalido = !!(filtros.desde && filtros.hasta && filtros.hasta < filtros.desde);
  const [resumen, setResumen] = useState<{ total: string; cantidad: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);



  const [rechazarTarget, setRechazarTarget] = useState<Billetaje | null>(null);
  const [motivo, setMotivo] = useState('');
  const [isRechazando, setIsRechazando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [medioEgreso, setMedioEgreso] = useState<MedioEgresoBilletaje>('efectivo');
  const [canalEgreso, setCanalEgreso] = useState<CanalEgresoBilletaje | ''>('');
  const [cuentaBancariaId, setCuentaBancariaId] = useState<number | ''>('');
  const [cuentasDisponibles, setCuentasDisponibles] = useState<CuentaBancaria[]>([]);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [isEnviando, setIsEnviando] = useState(false);
  const [enviarError, setEnviarError] = useState<string | null>(null);

  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);

  const [detalleTarget, setDetalleTarget] = useState<Billetaje | null>(null);

  const listRequest = useRef(0);
  const loadBilletajes = useCallback((silencioso = false) => {
    const request = ++listRequest.current;
    if (!silencioso) { setIsLoading(true); setResult(null); setResumen(null); }
    setLoadError(null);
    if (rangoInvalido) { setIsLoading(false); setResult(null); setResumen(null); return; }
    listBilletajes(page, filtros)
      .then((res) => { if (request === listRequest.current) { setResult(res.data); setResumen(res.data.resumen); } })
      .catch((err) => { if (request === listRequest.current) setLoadError(err instanceof Error ? err.message : 'Error desconocido'); })
      .finally(() => { if (request === listRequest.current) setIsLoading(false); });
  }, [page, filtros, rangoInvalido]);
  const cancelList = useCallback(() => { listRequest.current++; }, []);
  useEffect(() => { loadBilletajes(); return cancelList; }, [loadBilletajes, cancelList]);

  useEffect(() => {
    if (!user) return;
    const channel = getEcho().private(`App.Models.User.${user.id}`);
    const refetchSilently = () => loadBilletajes(true);
    channel.listen('.billetaje.actualizado', refetchSilently);
    return () => { channel.stopListening('.billetaje.actualizado', refetchSilently); };
  }, [user, loadBilletajes]);

  if (!canVerBilletajes(user)) {
    return <Navigate to="/" replace />;
  }

  async function openSend() {
    setLoadingOptions(true);
    setSending(true); setEnviarError(null); setAsesorId(''); setMonto(''); setMotivoEnvio('');
    setMedioEgreso('efectivo'); setCanalEgreso(''); setCuentaBancariaId(''); setComprobante(null);
    setCajas([]); setBovedas([]); setCuentasDisponibles([]);
    try {
      const allCajas: Caja[] = []; const allBovedas: Boveda[] = [];
      for (let page = 1, last = 1; page <= last; page++) {
        const res = await listCajas(page); allCajas.push(...res.data.data); last = res.data.last_page;
      }
      for (let page = 1, last = 1; page <= last; page++) {
        const res = await listBovedas(page); allBovedas.push(...res.data.data); last = res.data.last_page;
      }
      setCajas(allCajas.filter(c => c.ciclo_abierto && hasRole(c.user ?? null, 'asesor')));
      setBovedas(allBovedas);
    } catch (err) { setEnviarError(err instanceof Error ? err.message : 'Error al cargar destinatarios'); }
    finally { setLoadingOptions(false); }
  }

  async function selectAsesor(id: number) {
    const request = ++accountsRequest.current;
    setLoadingAccounts(false);
    setAsesorId(id); setCuentaBancariaId(''); setCuentasDisponibles([]);
    const caja = cajas.find(c => c.user_id === id);
    const boveda = bovedas.find(b => b.empresa_id === caja?.empresa_id && b.agencia_id === caja?.agencia_id);
    if (!boveda) return;
    setLoadingAccounts(true);
    try {
      const res = await listCuentasBancarias(boveda.id);
      if (request === accountsRequest.current) setCuentasDisponibles(res.data.filter(c => c.activa));
    } catch (err) { if (request === accountsRequest.current) setEnviarError(err instanceof Error ? err.message : 'Error al cargar cuentas'); }
    finally { if (request === accountsRequest.current) setLoadingAccounts(false); }
  }

  function closeEnviarDialog() { if (!busy.current) setSending(false); }

  async function handleEnviar(event: FormEvent) {
    event.preventDefault();
    if (busy.current || !asesorId || !motivoEnvio.trim() || loadingOptions || loadingAccounts) return;
    busy.current = true; setIsEnviando(true); setEnviarError(null);
    try {
      await enviarBilletaje({ asesor_id: asesorId, monto, motivo: motivoEnvio.trim(), medio_egreso: medioEgreso,
        ...(medioEgreso === 'cuenta_bancaria' ? { canal_egreso: canalEgreso || undefined, cuenta_bancaria_id: Number(cuentaBancariaId), comprobante } : {}) });
      setSending(false); setNotice('Billetaje enviado. Pendiente de aceptación.');
      if (page === 1) loadBilletajes(); else setPage(1);
    } catch (err) { setEnviarError(err instanceof Error ? err.message : 'Error desconocido'); }
    finally { busy.current = false; setIsEnviando(false); }
  }

  function canResolve(b: Billetaje, permission: string) {
    return b.estado === 'pendiente' && b.asesor_id === user?.id && hasPermission(user, permission);
  }

  async function handleAceptar() {
    if (!actionTarget || busy.current) return;
    busy.current = true; setIsAceptando(true); setFormError(null);
    try {
      await aceptarBilletaje(actionTarget.id);
      setActionTarget(null); setNotice('Billetaje aceptado.'); loadBilletajes();
      window.dispatchEvent(new Event('caja:refresh'));
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Error desconocido'); }
    finally { busy.current = false; setIsAceptando(false); }
  }

  const cuentasParaCanal = cuentasDisponibles.filter((c) => {
    if (canalEgreso === 'yape') return c.acepta_yape;
    if (canalEgreso === 'plin') return c.acepta_plin;
    return true;
  });

  const detalleVaucher = detalleTarget ? vaucherDe(detalleTarget) : null;
  async function handleRechazar() {
    if (!rechazarTarget || busy.current || !motivo.trim()) return;
    busy.current = true;

    setFormError(null);
    setIsRechazando(true);

    try {
      await rechazarBilletaje(rechazarTarget.id, motivo.trim());
      setRechazarTarget(null);
      setMotivo('');
      loadBilletajes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      busy.current = false;
      setIsRechazando(false);
    }
  }

  function bovedaLabel(billetaje: Billetaje): string {
    if (!billetaje.boveda) return '—';
    if (billetaje.boveda.tipo === 'principal') return 'Bóveda principal';

    return billetaje.boveda.agencia?.nombre ?? 'Boveda de agencia';
  }

  const columns: DataTableColumn<Billetaje>[] = [
    {
      header: 'Emisor',
      render: (b) => extractUserName(b.solicitado_por)?.toUpperCase() ?? '—',
    },
    { header: 'Bóveda', render: (b) => bovedaLabel(b).toUpperCase() },
    { header: 'Destinatario', render: (b) => extractUserName(b.asesor) ?? '—' },
    { header: 'Fecha', render: (b) => formatFechaHora(b.created_at) },
    { header: 'Monto', render: (b) => formatMonto(b.monto) },
    { header: 'Motivo', render: (b) => (b.motivo ? truncate(b.motivo, 30) : '—') },
    {
      header: 'Medio de egreso',
      render: (b) => b.medio_egreso === 'cuenta_bancaria' ? (b.canal_egreso ?? 'Cuenta bancaria') : 'Efectivo',
    },
    { header: 'Cliente', render: (b) => (b.cliente ? `${b.cliente.nombre} ${b.cliente.apellido}` : '—') },
    {
      header: 'Estado',
      render: (b) => <Chip label={capitalize(b.estado)} size="small" color={ESTADO_COLOR[b.estado]} />,
    },
    {
      header: 'Resuelto por',
      render: (b) => extractUserName(b.aprobado_por)?.toUpperCase() ?? '—',
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      render: (b: Billetaje) => {
        const actions: RowAction[] = [
          {
            key: 'detalle',
            label: 'Ver detalle',
            icon: <VisibilityIcon fontSize="small" />,
            onClick: () => setDetalleTarget(b),
          },
        ];
        const vaucher = vaucherDe(b);

        if (vaucher) {
          actions.push({
            key: 'vaucher',
            label: 'Ver vaucher',
            icon: <ReceiptLongIcon fontSize="small" />,
            onClick: () => setLightbox(vaucher),
          });
        }

        if (canResolve(b, 'billetajes.aprobar')) actions.push({ key: 'aceptar', label: 'Aceptar', icon: <CheckIcon />, disabled: isAceptando || isRechazando, onClick: () => { setFormError(null); setActionTarget(b); } });
        if (canResolve(b, 'billetajes.rechazar')) actions.push({ key: 'rechazar', label: 'Rechazar', icon: <CloseIcon />, disabled: isAceptando || isRechazando, onClick: () => { setFormError(null); setMotivo(''); setRechazarTarget(b); } });

        return actions.length > 0 ? <RowActions actions={actions} /> : null;
      },
    },
  ];

  return (
    <Stack spacing={3}>
      {desdeInicio && <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ alignSelf: 'flex-start' }}>Volver a Inicio</Button>}
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Billetajes
      </Typography>

      {canSend && <Button variant="contained" onClick={openSend}>Enviar billetaje</Button>}
      {notice && <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}
      <Stack direction="row" spacing={2}>
        <FiltrosPanel activeCount={Object.values(filtros).filter(Boolean).length} onClear={() => { setPage(1); setFiltros({ desde: '', hasta: '', agencia_id: undefined, asesor_id: undefined }); }}>
          <TextField size="small" fullWidth label="Desde" type="date" value={filtros.desde} slotProps={{ inputLabel: { shrink: true } }} onChange={e => { setPage(1); setFiltros(f => ({ ...f, desde: e.target.value })); }} />
          <TextField size="small" fullWidth label="Hasta" type="date" value={filtros.hasta} error={rangoInvalido} helperText={rangoInvalido ? 'La fecha final no puede ser anterior a la inicial' : undefined} slotProps={{ inputLabel: { shrink: true } }} onChange={e => { setPage(1); setFiltros(f => ({ ...f, hasta: e.target.value })); }} />
          <Typography variant="caption">Aceptados y rechazados: fecha de respuesta. Pendientes: fecha de envío.</Typography>
        </FiltrosPanel>
      </Stack>
      {resumen && !isLoading && !rangoInvalido && <Card variant="outlined"><CardContent><Typography variant="body2" color="text.secondary">Total de billetajes aceptados</Typography><Typography variant="h5" sx={{ fontWeight: 700 }}>{formatMonto(resumen.total)}</Typography><Typography variant="caption" color="text.secondary">{resumen.cantidad} operaciones</Typography></CardContent></Card>}
      <ErrorBanner error={loadError} />

      <DataTable
        columns={columns}
        rows={rangoInvalido ? [] : result?.data ?? []}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        emptyMessage="No hay billetajes registrados"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={sending} onClose={preventBackdropClose(closeEnviarDialog)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleEnviar}>
          <DialogHeader onClose={closeEnviarDialog}>Enviar billetaje</DialogHeader>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <ErrorBanner error={enviarError} />
              <TextField select label="Destinatario" value={asesorId} onChange={e => selectAsesor(Number(e.target.value))} required disabled={isEnviando || loadingOptions || loadingAccounts} helperText={loadingOptions ? 'Cargando destinatarios...' : cajas.length ? 'Solo asesores con caja abierta' : 'No hay asesores con caja abierta disponibles'}>
                {cajas.map(c => <MenuItem key={c.id} value={c.user_id}>{extractUserName(c.user)} - {c.agencia?.nombre}</MenuItem>)}
              </TextField>
              <TextField label="Monto" type="number" value={monto} onChange={e => setMonto(e.target.value)} required slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }} />
              <TextField label="Motivo" value={motivoEnvio} onChange={e => setMotivoEnvio(e.target.value)} required multiline slotProps={{ htmlInput: { maxLength: 500 } }} />
              <TextField
                select
                label="¿De dónde sale el dinero?"
                value={medioEgreso}
                onChange={(e) => {
                  setMedioEgreso(e.target.value as MedioEgresoBilletaje);
                  setCanalEgreso('');
                  setCuentaBancariaId('');
                }}
              >
                <MenuItem value="efectivo">Efectivo</MenuItem>
                <MenuItem value="cuenta_bancaria">Cuenta bancaria</MenuItem>
              </TextField>
              {medioEgreso === 'cuenta_bancaria' && (
                <>
                  <TextField
                    select
                    label="Canal"
                    value={canalEgreso}
                    onChange={(e) => {
                      setCanalEgreso(e.target.value as CanalEgresoBilletaje);
                      setCuentaBancariaId('');
                    }}
                    required
                  >
                    <MenuItem value="transferencia">Transferencia</MenuItem>
                    <MenuItem value="yape">Yape</MenuItem>
                    <MenuItem value="plin">Plin</MenuItem>
                    <MenuItem value="deposito">Depósito</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="Cuenta bancaria"
                    value={cuentaBancariaId}
                    onChange={(e) => setCuentaBancariaId(Number(e.target.value))}
                    required
                    helperText={
                      cuentasParaCanal.length === 0
                        ? 'No hay cuentas activas disponibles para este canal'
                        : undefined
                    }
                  >
                    {cuentasParaCanal.map((cuenta) => (
                      <MenuItem key={cuenta.id} value={cuenta.id}>
                        {cuenta.banco?.nombre} — {cuenta.numero_cuenta}
                      </MenuItem>
                    ))}
                  </TextField>
                  <PhotoField
                    label="Vaucher de la transferencia"
                    file={comprobante}
                    onChange={setComprobante}
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                  />
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={closeEnviarDialog}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                isEnviando || loadingOptions || loadingAccounts || !asesorId || !motivoEnvio.trim() ||
                (medioEgreso === 'cuenta_bancaria' && (!canalEgreso || !cuentaBancariaId || !comprobante))
              }
            >
              {isEnviando ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!rechazarTarget} onClose={preventBackdropClose(() => !busy.current && setRechazarTarget(null))} fullWidth maxWidth="xs">
        <DialogHeader onClose={() => { if (!busy.current) setRechazarTarget(null); }}>Rechazar billetaje</DialogHeader>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <ErrorBanner error={formError} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {extractUserName(rechazarTarget?.solicitado_por)} ·{' '}
              {formatMonto(rechazarTarget?.monto ?? '0')}
            </Typography>
            <UpperTextField
              label="Motivo del rechazo"
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { if (!busy.current) setRechazarTarget(null); }}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleRechazar} disabled={isRechazando || !motivo.trim()}>
            {isRechazando ? 'Rechazando...' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detalleTarget} onClose={preventBackdropClose(() => setDetalleTarget(null))} fullWidth maxWidth="sm">
        <DialogHeader onClose={() => setDetalleTarget(null)}>Detalle del billetaje</DialogHeader>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              {detalleTarget && (
                <Chip label={capitalize(detalleTarget.estado)} size="small" color={ESTADO_COLOR[detalleTarget.estado]} />
              )}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {formatFechaHora(detalleTarget?.created_at)}
              </Typography>
            </Stack>
            <Typography variant="body2">
              <strong>Destinatario:</strong> {extractUserName(detalleTarget?.asesor) ?? '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Emisor:</strong> {extractUserName(detalleTarget?.solicitado_por) ?? '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Bóveda:</strong> {detalleTarget ? bovedaLabel(detalleTarget) : '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Monto:</strong> {formatMonto(detalleTarget?.monto ?? '0')}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              <strong>Motivo:</strong> {detalleTarget?.motivo ?? '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Medio de egreso:</strong>{' '}
              {detalleTarget?.medio_egreso === 'cuenta_bancaria' ? detalleTarget.canal_egreso ?? 'Cuenta bancaria' : 'Efectivo'}
            </Typography>
            {detalleTarget?.cliente && (
              <Typography variant="body2">
                <strong>Cliente:</strong> {detalleTarget.cliente.nombre} {detalleTarget.cliente.apellido}
              </Typography>
            )}
            <Typography variant="body2">
              <strong>Resuelto por:</strong> {extractUserName(detalleTarget?.aprobado_por) ?? '—'}
            </Typography>
            {detalleTarget?.motivo_rechazo && (
              <Typography variant="body2">
                <strong>Motivo de rechazo:</strong> {detalleTarget.motivo_rechazo}
              </Typography>
            )}
            {detalleVaucher && (
              <Button
                size="small"
                startIcon={<ReceiptLongIcon fontSize="small" />}
                sx={{ alignSelf: 'flex-start' }}
                onClick={() => setLightbox(detalleVaucher)}
              >
                Ver vaucher
              </Button>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDetalleTarget(null)}>Cerrar</Button>

        </DialogActions>
      </Dialog>

      <Dialog open={!!actionTarget} onClose={() => { if (!busy.current) setActionTarget(null); }} fullWidth maxWidth="xs">
        <DialogHeader onClose={() => { if (!busy.current) setActionTarget(null); }}>Aceptar billetaje</DialogHeader>
        <DialogContent><Stack spacing={2}><ErrorBanner error={formError} /><Typography>Confirmar recepción de {formatMonto(actionTarget?.monto ?? '0')}.</Typography></Stack></DialogContent>
        <DialogActions><Button disabled={isAceptando} onClick={() => setActionTarget(null)}>Cancelar</Button><Button variant="contained" disabled={isAceptando} onClick={handleAceptar}>{isAceptando ? 'Aceptando...' : 'Aceptar'}</Button></DialogActions>
      </Dialog>
      <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />
    </Stack>
  );
}
