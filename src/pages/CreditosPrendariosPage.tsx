import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckIcon from '@mui/icons-material/Check';
import PaidIcon from '@mui/icons-material/Paid';
import PaymentsIcon from '@mui/icons-material/Payments';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SendIcon from '@mui/icons-material/Send';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import EditIcon from '@mui/icons-material/Edit';
import UndoIcon from '@mui/icons-material/Undo';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useAuth } from '../hooks/useAuth';
import {
  BIEN_ESTADO_COLOR,
  BIEN_ESTADO_LABELS,
  BIEN_TIPO_LABELS,
  canAprobarCreditos,
  canCrearCreditos,
  canDesembolsarCreditos,
  canEditarInteresCredito,
  canLiquidarCreditos,
  canRefrendarCreditos,
  canVerCreditos,
  CREDITO_ESTADO_COLOR,
  CREDITO_ESTADO_LABELS,
  CUOTAS_POR_TIPO,
  puedeAdendarCredito,
  puedeAprobarCredito,
  puedeEditarCredito,
  puedeEnviarATiendaCredito,
  puedeRevertirAprobacion,
  puedeSubsanarCredito,
  puedeVerDocumentosCredito,
  TIPO_CUOTA_LABELS,
} from '../utils/creditoPrendarioHierarchy';
import { getEcho } from '../realtime/echo';
import { extractUserName } from '../utils/cajaHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions, type RowAction } from '../components/RowActions';
import { UpperTextField } from '../components/UpperTextField';
import { MediaLightbox, type MediaLightboxItem } from '../components/MediaLightbox';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MedioCobroField } from '../components/MedioCobroField';
import {
  ClienteCreateFields,
  clienteCreatePayload,
  emptyClienteCreateForm,
  type ClienteCreateFormValue,
} from '../components/ClienteCreateFields';
import { BienCreateFields, bienCreatePayload, emptyBienCreateForm, type BienCreateFormValue } from '../components/BienCreateFields';
import {
  actualizarInteresCredito,
  adendarCredito,
  aprobarCredito,
  createCredito,
  desembolsarCredito,
  enviarATiendaCredito,
  getCredito,
  getCronogramaBlob,
  getDocumentoBlob,
  liquidarCredito,
  listCreditos,
  marcarImpresoDocumento,
  rechazarCredito,
  refrendarCredito,
  revertirAprobacionCredito,
  subirDocumentoFirmado,
  subsanarCredito,
  type CreateCreditoPayload,
} from '../api/creditosPrendarios';
import { createBien, listBienes } from '../api/bienes';
import { createCliente, listClientes } from '../api/clientes';
import { formatFecha, formatFechaHora, formatMonto } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import type { Bien, Cliente, CreditoPrendario, MedioCobro, PaginatedData, TipoCuota } from '../types/api';

type TipoCobro = 'normal' | 'refrendar' | 'adenda' | 'liquidar';

function interesPorCuota(credito: CreditoPrendario): number {
  return (Number(credito.monto_prestamo) * Number(credito.interes)) / 100;
}

/**
 * Mirrors CreditoPrendario::diasEnMora() on the backend, which isn't appended
 * to the JSON. Compares UTC calendar days (not local setHours(0,0,0,0)) since
 * fecha_vencimiento is a date-only field stored as a UTC-midnight instant —
 * resetting to LOCAL midnight would roll it back a day for any negative UTC
 * offset (Lima is UTC-5), same bug class as formatFecha() guards against.
 */
function diasEnMora(credito: CreditoPrendario): number {
  if (!['vencido', 'en_venta'].includes(credito.estado) || !credito.fecha_vencimiento) return 0;

  const vencimiento = new Date(credito.fecha_vencimiento);
  const vencimientoUtc = Date.UTC(vencimiento.getUTCFullYear(), vencimiento.getUTCMonth(), vencimiento.getUTCDate());
  const hoy = new Date();
  const hoyUtc = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());

  return Math.max(0, Math.round((hoyUtc - vencimientoUtc) / 86400000));
}


export function CreditosPrendariosPage() {
  const { user } = useAuth();
  const canCreate = canCrearCreditos(user);

  const [result, setResult] = useState<PaginatedData<CreditoPrendario> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [bienes, setBienes] = useState<Bien[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{
    cliente_id?: number;
    bien_ids: number[];
    monto_prestamo: string;
    interes: string;
    tipo_cuota: TipoCuota;
  }>({ bien_ids: [], monto_prestamo: '', interes: '', tipo_cuota: 'mensual' });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingBienesCliente, setIsLoadingBienesCliente] = useState(false);

  const [quickClienteOpen, setQuickClienteOpen] = useState(false);
  const [quickClienteForm, setQuickClienteForm] = useState<ClienteCreateFormValue>(emptyClienteCreateForm);
  const [quickClienteError, setQuickClienteError] = useState<string | null>(null);
  const [isSavingQuickCliente, setIsSavingQuickCliente] = useState(false);

  const [quickBienOpen, setQuickBienOpen] = useState(false);
  const [quickBienForm, setQuickBienForm] = useState<BienCreateFormValue>(emptyBienCreateForm);
  const [quickBienError, setQuickBienError] = useState<string | null>(null);
  const [isSavingQuickBien, setIsSavingQuickBien] = useState(false);

  const [actingId, setActingId] = useState<number | null>(null);

  const [rechazarTarget, setRechazarTarget] = useState<CreditoPrendario | null>(null);
  const [motivo, setMotivo] = useState('');
  const [isRechazando, setIsRechazando] = useState(false);
  const [rechazarError, setRechazarError] = useState<string | null>(null);

  const [cobrarTarget, setCobrarTarget] = useState<CreditoPrendario | null>(null);
  const [tipoCobro, setTipoCobro] = useState<TipoCobro>('normal');
  const [montoIngresado, setMontoIngresado] = useState('');
  const [liquidacionSugerida, setLiquidacionSugerida] = useState<CreditoPrendario['monto_liquidacion_sugerido']>(null);
  const [refrendoSugerido, setRefrendoSugerido] = useState<CreditoPrendario['monto_refrendo_sugerido']>(null);
  const [nuevoInteresAdenda, setNuevoInteresAdenda] = useState('');
  const [nuevoTipoCuotaAdenda, setNuevoTipoCuotaAdenda] = useState<TipoCuota | ''>('');
  const [medioCobro, setMedioCobro] = useState<MedioCobro>('efectivo');
  const [comprobanteCobro, setComprobanteCobro] = useState<File | null>(null);
  const [isCobrando, setIsCobrando] = useState(false);
  const [cobrarError, setCobrarError] = useState<string | null>(null);
  const [isLoadingCronograma, setIsLoadingCronograma] = useState(false);

  const [detalle, setDetalle] = useState<CreditoPrendario | null>(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);
  const [viewingDocumentoId, setViewingDocumentoId] = useState<number | null>(null);

  const [editarInteresTarget, setEditarInteresTarget] = useState<CreditoPrendario | null>(null);
  const [nuevoInteres, setNuevoInteres] = useState('');
  const [isActualizandoInteres, setIsActualizandoInteres] = useState(false);
  const [editarInteresError, setEditarInteresError] = useState<string | null>(null);

  const [revertirTarget, setRevertirTarget] = useState<CreditoPrendario | null>(null);
  const [isRevirtiendo, setIsRevirtiendo] = useState(false);

  const [subiendoDocumentoId, setSubiendoDocumentoId] = useState<number | null>(null);

  const [desembolsarTarget, setDesembolsarTarget] = useState<CreditoPrendario | null>(null);
  const [desembolsarNumeroCuotas, setDesembolsarNumeroCuotas] = useState('');
  const [desembolsarInteres, setDesembolsarInteres] = useState('');
  const [isDesembolsando, setIsDesembolsando] = useState(false);
  const [desembolsarError, setDesembolsarError] = useState<string | null>(null);

  const [enviarTiendaTarget, setEnviarTiendaTarget] = useState<CreditoPrendario | null>(null);
  const [preciosVenta, setPreciosVenta] = useState<Record<number, string>>({});
  const [isEnviandoTienda, setIsEnviandoTienda] = useState(false);
  const [enviarTiendaError, setEnviarTiendaError] = useState<string | null>(null);

  function loadCreditos() {
    setIsLoading(true);
    setLoadError(null);

    listCreditos(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadCreditos, [page]);

  useEffect(() => {
    if (!user) return;

    const channel = getEcho().private(`App.Models.User.${user.id}`);
    const refetchSilently = () => listCreditos(page).then((res) => setResult(res.data));

    channel.listen('.credito-prendario.actualizado', refetchSilently);

    return () => {
      channel.stopListening('.credito-prendario.actualizado', refetchSilently);
    };
  }, [user, page]);

  if (!canVerCreditos(user)) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setForm({ bien_ids: [], monto_prestamo: '', interes: '', tipo_cuota: 'mensual' });
    setFormError(null);
    setBienes([]);
    setDialogOpen(true);

    listClientes().then((res) => setClientes(res.data.data));
  }

  function handleClienteChange(cliente: Cliente | null) {
    setForm((f) => ({ ...f, cliente_id: cliente?.id, bien_ids: [] }));
    setBienes([]);

    if (cliente) {
      setIsLoadingBienesCliente(true);
      listBienes(1, { clienteId: cliente.id, disponibles: true })
        .then((res) => setBienes(res.data.data))
        .finally(() => setIsLoadingBienesCliente(false));
    }
  }

  function toggleBien(bienId: number, checked: boolean) {
    setForm((f) => ({
      ...f,
      bien_ids: checked ? [...f.bien_ids, bienId] : f.bien_ids.filter((id) => id !== bienId),
    }));
  }

  function openQuickCliente() {
    setQuickClienteForm(emptyClienteCreateForm);
    setQuickClienteError(null);
    setQuickClienteOpen(true);
  }

  async function handleQuickClienteSubmit(event: FormEvent) {
    event.preventDefault();
    setQuickClienteError(null);
    setIsSavingQuickCliente(true);

    try {
      const res = await createCliente(clienteCreatePayload(quickClienteForm));
      setClientes((c) => [...c, res.data]);
      handleClienteChange(res.data);
      setQuickClienteOpen(false);
    } catch (err) {
      setQuickClienteError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSavingQuickCliente(false);
    }
  }

  function openQuickBien() {
    setQuickBienForm(emptyBienCreateForm);
    setQuickBienError(null);
    setQuickBienOpen(true);
  }

  async function handleQuickBienSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.cliente_id) return;

    setQuickBienError(null);
    setIsSavingQuickBien(true);

    try {
      const res = await createBien({ cliente_id: form.cliente_id, ...bienCreatePayload(quickBienForm) });
      setBienes((b) => [...b, res.data]);
      toggleBien(res.data.id, true);
      setQuickBienOpen(false);
    } catch (err) {
      setQuickBienError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSavingQuickBien(false);
    }
  }

  const sumaBienesSeleccionados = form.bien_ids.reduce((sum, id) => {
    const bien = bienes.find((b) => b.id === id);
    return bien ? sum + Number(bien.valorizacion) : sum;
  }, 0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.bien_ids.length === 0) return;

    setFormError(null);
    setIsSaving(true);

    try {
      const payload: CreateCreditoPayload = {
        bien_ids: form.bien_ids,
        monto_prestamo: form.monto_prestamo,
        interes: canEditarInteresCredito(user) ? form.interes || undefined : undefined,
        tipo_cuota: form.tipo_cuota,
      };

      await createCredito(payload);
      setDialogOpen(false);
      loadCreditos();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  /** Patches an in-flight state change into the open detail dialog too, if it's showing this same crédito. */
  function mergeDetalle(actualizado: CreditoPrendario) {
    setDetalle((d) => (d && d.id === actualizado.id ? { ...d, ...actualizado } : d));
  }

  async function handleAprobar(credito: CreditoPrendario) {
    setLoadError(null);
    setDialogError(null);
    setActingId(credito.id);

    try {
      const res = await aprobarCredito(credito.id);
      loadCreditos();
      mergeDetalle(res.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setLoadError(message);
      setDialogError(message);
    } finally {
      setActingId(null);
    }
  }

  function openEnviarTienda(credito: CreditoPrendario) {
    setEnviarTiendaTarget(credito);
    setPreciosVenta(
      Object.fromEntries((credito.bienes ?? []).map((b) => [b.id, b.precio_venta ?? b.valorizacion]))
    );
    setEnviarTiendaError(null);
  }

  async function handleEnviarATienda(event: FormEvent) {
    event.preventDefault();
    if (!enviarTiendaTarget) return;

    setEnviarTiendaError(null);
    setIsEnviandoTienda(true);

    try {
      const precios = Object.fromEntries(
        Object.entries(preciosVenta).map(([bienId, precio]) => [Number(bienId), Number(precio)])
      );
      const res = await enviarATiendaCredito(enviarTiendaTarget.id, precios);
      setEnviarTiendaTarget(null);
      loadCreditos();
      mergeDetalle(res.data);
    } catch (err) {
      setEnviarTiendaError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsEnviandoTienda(false);
    }
  }

  /** Re-fetches the full crédito if it's the one currently open in the detail dialog (e.g. to pick up a newly generated cronograma). */
  function refreshDetalleFully(id: number) {
    setDetalle((d) => {
      if (!d || d.id !== id) return d;
      getCredito(id).then((res) => setDetalle(res.data));
      return d;
    });
  }

  function openDesembolsar(credito: CreditoPrendario) {
    setDesembolsarTarget(credito);
    setDesembolsarNumeroCuotas(String(CUOTAS_POR_TIPO[credito.tipo_cuota]));
    setDesembolsarInteres(credito.interes);
    setDesembolsarError(null);
  }

  async function handleDesembolsar(event: FormEvent) {
    event.preventDefault();
    if (!desembolsarTarget) return;

    setDesembolsarError(null);
    setIsDesembolsando(true);

    try {
      const puedeEditar = puedeEditarCredito(user, desembolsarTarget);
      const res = await desembolsarCredito(desembolsarTarget.id, {
        numero_cuotas: puedeEditar ? Number(desembolsarNumeroCuotas) : undefined,
        interes: puedeEditar ? desembolsarInteres : undefined,
      });
      setDesembolsarTarget(null);
      loadCreditos();
      mergeDetalle(res.data);
      refreshDetalleFully(res.data.id);
    } catch (err) {
      setDesembolsarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDesembolsando(false);
    }
  }

  function openCobrar(credito: CreditoPrendario) {
    setCobrarTarget(credito);
    setTipoCobro('normal');
    setMontoIngresado('');
    setLiquidacionSugerida(null);
    setRefrendoSugerido(null);
    setNuevoInteresAdenda(credito.interes);
    setNuevoTipoCuotaAdenda(credito.tipo_cuota);
    setMedioCobro('efectivo');
    setComprobanteCobro(null);
    setCobrarError(null);

    getCredito(credito.id).then((res) => {
      setLiquidacionSugerida(res.data.monto_liquidacion_sugerido ?? null);
      setRefrendoSugerido(res.data.monto_refrendo_sugerido ?? null);
    });
  }

  function handleTipoCobroChange(tipo: TipoCobro) {
    setTipoCobro(tipo);
    setCobrarError(null);

    if (tipo === 'refrendar' && refrendoSugerido) {
      setMontoIngresado(refrendoSugerido.total);
    } else if (tipo === 'adenda' && refrendoSugerido) {
      setMontoIngresado(refrendoSugerido.total);
    } else if (tipo === 'liquidar' && liquidacionSugerida) {
      setMontoIngresado(liquidacionSugerida.total);
    } else if (tipo === 'normal') {
      setMontoIngresado('');
    }
  }

  async function handleSubirFirmado(documentoId: number, archivo: File | null) {
    if (!archivo || !detalle) return;

    setDialogError(null);
    setSubiendoDocumentoId(documentoId);

    try {
      const res = await subirDocumentoFirmado(detalle.id, documentoId, archivo);
      setDetalle((d) =>
        d ? { ...d, documentos: d.documentos?.map((doc) => (doc.id === documentoId ? res.data : doc)) } : d
      );

      // Firmar la devolución puede cambiar el estado del crédito en el
      // backend (liquidado_pendiente -> liquidado) — refresca el detalle
      // completo en ese caso, no solo el documento.
      if (res.data.tipo === 'devolucion') {
        const credito = await getCredito(detalle.id);
        setDetalle(credito.data);
        loadCreditos();
      }
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubiendoDocumentoId(null);
    }
  }

  async function handleRechazar() {
    if (!rechazarTarget) return;

    if (!motivo.trim()) {
      setRechazarError('Debes indicar el motivo del rechazo, para que el asesor pueda subsanarlo.');
      return;
    }

    setRechazarError(null);
    setIsRechazando(true);

    try {
      const res = await rechazarCredito(rechazarTarget.id, motivo.toLowerCase());
      setRechazarTarget(null);
      setMotivo('');
      loadCreditos();
      mergeDetalle(res.data);
    } catch (err) {
      setRechazarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsRechazando(false);
    }
  }

  async function handleRevertirAprobacion() {
    if (!revertirTarget) return;

    setDialogError(null);
    setIsRevirtiendo(true);

    try {
      const res = await revertirAprobacionCredito(revertirTarget.id);
      setRevertirTarget(null);
      loadCreditos();
      mergeDetalle(res.data);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsRevirtiendo(false);
    }
  }

  function openEditarInteres(credito: CreditoPrendario) {
    setEditarInteresTarget(credito);
    setNuevoInteres(credito.interes);
    setEditarInteresError(null);
  }

  async function handleActualizarInteres(event: FormEvent) {
    event.preventDefault();
    if (!editarInteresTarget) return;

    setEditarInteresError(null);
    setIsActualizandoInteres(true);

    try {
      const res = await actualizarInteresCredito(editarInteresTarget.id, nuevoInteres);
      setEditarInteresTarget(null);
      loadCreditos();
      mergeDetalle(res.data);
    } catch (err) {
      setEditarInteresError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsActualizandoInteres(false);
    }
  }

  async function handleVerDocumento(documento: { id: number; tipo: string; ver_url: string }) {
    setDialogError(null);
    setViewingDocumentoId(documento.id);

    try {
      const blob = await getDocumentoBlob(documento.ver_url);
      setLightbox({ type: 'pdf', url: URL.createObjectURL(blob), label: documento.tipo });
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setViewingDocumentoId(null);
    }
  }

  function closeLightbox() {
    setLightbox((current) => {
      if (current?.type === 'pdf') URL.revokeObjectURL(current.url);
      return null;
    });
  }

  async function handleSubsanar(credito: CreditoPrendario) {
    setLoadError(null);
    setActingId(credito.id);

    try {
      await subsanarCredito(credito.id);
      loadCreditos();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setActingId(null);
    }
  }

  async function handleCobrar(event: FormEvent) {
    event.preventDefault();
    if (!cobrarTarget) return;

    setCobrarError(null);
    setIsCobrando(true);

    try {
      const puedeEditarCondiciones = puedeEditarCredito(user, cobrarTarget);

      const res =
        tipoCobro === 'liquidar'
          ? await liquidarCredito(cobrarTarget.id, {
              monto_pagado: montoIngresado,
              medio: medioCobro,
              comprobante: comprobanteCobro,
            })
          : tipoCobro === 'adenda'
            ? await adendarCredito(cobrarTarget.id, {
                monto_pagado: montoIngresado,
                interes: puedeEditarCondiciones ? nuevoInteresAdenda : undefined,
                tipo_cuota: puedeEditarCondiciones ? nuevoTipoCuotaAdenda || undefined : undefined,
                medio: medioCobro,
                comprobante: comprobanteCobro,
              })
            : await refrendarCredito(cobrarTarget.id, {
                monto_pagado: montoIngresado,
                medio: medioCobro,
                comprobante: comprobanteCobro,
              });
      setCobrarTarget(null);
      loadCreditos();
      mergeDetalle(res.data);

      if (tipoCobro === 'liquidar') {
        const devolucion = res.data.documentos?.find((d) => d.tipo === 'devolucion');
        if (devolucion) handleVerDocumento(devolucion);
      }
    } catch (err) {
      setCobrarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsCobrando(false);
    }
  }

  async function handleVerCronograma(creditoId: number) {
    setDialogError(null);
    setIsLoadingCronograma(true);

    try {
      const blob = await getCronogramaBlob(creditoId);
      setLightbox({ type: 'pdf', url: URL.createObjectURL(blob), label: 'Cronograma' });
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoadingCronograma(false);
    }
  }

  function openDetalle(credito: CreditoPrendario) {
    setDetalle(null);
    setDialogError(null);
    setIsLoadingDetalle(true);

    getCredito(credito.id)
      .then((res) => setDetalle(res.data))
      .catch((err) => setDialogError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoadingDetalle(false));
  }

  async function handleMarcarImpreso(documentoId: number) {
    if (!detalle) return;

    try {
      const res = await marcarImpresoDocumento(detalle.id, documentoId);
      setDetalle((d) =>
        d ? { ...d, documentos: d.documentos?.map((doc) => (doc.id === documentoId ? res.data : doc)) } : d
      );
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  const columns: DataTableColumn<CreditoPrendario>[] = [
    {
      header: 'Cliente',
      render: (c) => (c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}`.toUpperCase() : '—'),
    },
    {
      header: 'Bienes',
      render: (c) =>
        c.bienes && c.bienes.length > 0
          ? c.bienes.map((b) => b.nombre.toUpperCase()).join(', ')
          : '—',
    },
    { header: 'Monto', render: (c) => formatMonto(c.monto_prestamo) },
    { header: 'Interés', render: (c) => `${c.interes}%` },
    { header: 'Cuota', render: (c) => TIPO_CUOTA_LABELS[c.tipo_cuota] },
    {
      header: 'Estado',
      render: (c) => (
        <Chip label={CREDITO_ESTADO_LABELS[c.estado]} size="small" color={CREDITO_ESTADO_COLOR[c.estado]} />
      ),
    },
    {
      header: 'Vencimiento',
      render: (c) => formatFecha(c.fecha_vencimiento),
    },
    {
      header: 'Mora',
      render: (c) =>
        diasEnMora(c) > 0 ? (
          <Typography variant="body2" sx={{ color: 'error.main' }}>
            {diasEnMora(c)} días
          </Typography>
        ) : (
          '—'
        ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (c) => {
        const actions: RowAction[] = [
          {
            key: 'ver',
            label: 'Ver detalle',
            icon: <VisibilityIcon fontSize="small" />,
            onClick: () => openDetalle(c),
          },
        ];

        if (c.estado === 'rechazado' && puedeSubsanarCredito(user, c)) {
          actions.push({
            key: 'subsanar',
            label: 'Subsanar (reenviar a revisión)',
            icon: <SendIcon fontSize="small" />,
            disabled: actingId === c.id,
            onClick: () => handleSubsanar(c),
          });
        }
        if (c.estado === 'aprobado' && canDesembolsarCreditos(user)) {
          actions.push({
            key: 'desembolsar',
            label: 'Desembolsar (ver documentos firmados en el detalle)',
            icon: <PaymentsIcon fontSize="small" />,
            onClick: () => openDesembolsar(c),
          });
        }
        if (
          (c.estado === 'activo' || c.estado === 'vencido') &&
          (canRefrendarCreditos(user) || canLiquidarCreditos(user) || puedeAdendarCredito(user, c))
        ) {
          actions.push({
            key: 'cobrar',
            label: 'Cobrar (abonar, refrendar o liquidar)',
            icon: <PaidIcon fontSize="small" />,
            onClick: () => openCobrar(c),
          });
        }
        if (c.puede_enviar_tienda && puedeEnviarATiendaCredito(user, c)) {
          actions.push({
            key: 'enviar-tienda',
            label: 'Enviar a tienda',
            icon: <StorefrontIcon fontSize="small" />,
            onClick: () => openEnviarTienda(c),
          });
        }

        return <RowActions actions={actions} />;
      },
    },
  ];

  const montoIngresadoNum = Number(montoIngresado || 0);
  const vueltoLiquidar = liquidacionSugerida ? montoIngresadoNum - Number(liquidacionSugerida.total) : 0;
  const vueltoRefrendar = refrendoSugerido ? montoIngresadoNum - Number(refrendoSugerido.total) : 0;
  const vueltoAdenda = refrendoSugerido ? montoIngresadoNum - Number(refrendoSugerido.total) : 0;
  const abonoCapitalNormal = refrendoSugerido ? Math.max(0, montoIngresadoNum - Number(refrendoSugerido.interes)) : 0;

  let normalError: string | null = null;
  if (tipoCobro === 'normal' && refrendoSugerido && liquidacionSugerida && montoIngresado) {
    const interes = Number(refrendoSugerido.interes);
    const total = Number(liquidacionSugerida.total);

    if (montoIngresadoNum < interes) {
      normalError = `Debes cubrir al menos el interés (${formatMonto(String(interes))}).`;
    } else if (Math.abs(montoIngresadoNum - interes) < 0.005) {
      normalError = "Ese monto es solo el interés — selecciona 'Refrendar'.";
    } else if (montoIngresadoNum >= total) {
      normalError = "Ese monto cubre el total — selecciona 'Liquidar'.";
    }
  }

  const medioValido = medioCobro === 'efectivo' || !!comprobanteCobro;

  const puedeCobrar =
    medioValido &&
    (tipoCobro === 'normal'
      ? !!liquidacionSugerida && !!refrendoSugerido && !!montoIngresado && !normalError
      : tipoCobro === 'refrendar'
        ? !!refrendoSugerido && vueltoRefrendar >= 0
        : tipoCobro === 'adenda'
          ? !!refrendoSugerido && vueltoAdenda >= 0 && !!nuevoInteresAdenda
          : tipoCobro === 'liquidar'
            ? !!liquidacionSugerida && vueltoLiquidar >= 0
            : false);

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Créditos prendarios
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nuevo crédito
          </Button>
        )}
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay créditos registrados"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>Nuevo crédito prendario</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={clientes}
                  getOptionLabel={(c) => `${c.nombre} ${c.apellido} — ${c.numero_documento}`.toUpperCase()}
                  value={clientes.find((c) => c.id === form.cliente_id) ?? null}
                  onChange={(_, cliente) => handleClienteChange(cliente)}
                  renderInput={(params) => <TextField {...params} label="Cliente" required autoFocus />}
                />
                <Button size="small" onClick={openQuickCliente}>
                  ＋ Nuevo
                </Button>
              </Stack>

              {form.cliente_id && (
                <Stack spacing={1}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Bienes en garantía</Typography>
                    <Button size="small" onClick={openQuickBien}>
                      ＋ Agregar bien
                    </Button>
                  </Stack>
                  {isLoadingBienesCliente ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Cargando bienes del cliente...
                    </Typography>
                  ) : bienes.length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Este cliente no tiene bienes disponibles.
                    </Typography>
                  ) : (
                    <FormGroup>
                      {bienes.map((bien) => (
                        <FormControlLabel
                          key={bien.id}
                          control={
                            <Checkbox
                              checked={form.bien_ids.includes(bien.id)}
                              onChange={(e) => toggleBien(bien.id, e.target.checked)}
                            />
                          }
                          label={`${bien.nombre} — ${formatMonto(bien.valorizacion)}`}
                        />
                      ))}
                    </FormGroup>
                  )}
                  {form.bien_ids.length > 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Suma de valorizaciones seleccionadas: {formatMonto(String(sumaBienesSeleccionados))}
                    </Typography>
                  )}
                </Stack>
              )}

              <TextField
                label="Monto del préstamo"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0.01, max: sumaBienesSeleccionados || undefined } }}
                value={form.monto_prestamo}
                onChange={(e) => setForm((f) => ({ ...f, monto_prestamo: e.target.value }))}
                required
                helperText="No puede superar la suma de las valorizaciones de los bienes elegidos"
              />
              {canEditarInteresCredito(user) ? (
                <TextField
                  label="Interés (%)"
                  type="number"
                  slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                  value={form.interes}
                  onChange={(e) => setForm((f) => ({ ...f, interes: e.target.value }))}
                  helperText="Vacío = usa el interés configurado por defecto"
                />
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Se aplicará el interés configurado por defecto.
                </Typography>
              )}
              <TextField
                select
                label="Tipo de cuota"
                value={form.tipo_cuota}
                onChange={(e) => setForm((f) => ({ ...f, tipo_cuota: e.target.value as TipoCuota }))}
              >
                {Object.entries(TIPO_CUOTA_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
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

      <Dialog open={quickClienteOpen} onClose={preventBackdropClose(() => setQuickClienteOpen(false))} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleQuickClienteSubmit}>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {quickClienteError && <Alert severity="error">{quickClienteError}</Alert>}
              <ClienteCreateFields value={quickClienteForm} onChange={setQuickClienteForm} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setQuickClienteOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSavingQuickCliente}>
              {isSavingQuickCliente ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={quickBienOpen} onClose={preventBackdropClose(() => setQuickBienOpen(false))} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleQuickBienSubmit}>
          <DialogTitle>Nuevo bien</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {quickBienError && <Alert severity="error">{quickBienError}</Alert>}
              <BienCreateFields value={quickBienForm} onChange={setQuickBienForm} autoFocus />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setQuickBienOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSavingQuickBien}>
              {isSavingQuickBien ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!rechazarTarget} onClose={preventBackdropClose(() => setRechazarTarget(null))} fullWidth maxWidth="xs">
        <DialogTitle>Rechazar crédito</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {rechazarError && <Alert severity="error">{rechazarError}</Alert>}
            <UpperTextField
              label="Motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              helperText="El asesor lo verá para poder subsanar el crédito"
              multiline
              minRows={2}
              required
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setRechazarTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleRechazar} disabled={isRechazando}>
            {isRechazando ? 'Rechazando...' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detalle || isLoadingDetalle} onClose={preventBackdropClose(() => setDetalle(null))} fullWidth maxWidth="md">
        <DialogTitle>Detalle del crédito</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            {isLoadingDetalle && !detalle && (
              <Stack sx={{ alignItems: 'center', py: 4 }}>
                <CircularProgress />
              </Stack>
            )}
            {detalle && (
              <>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
                >
                  <Typography variant="subtitle2">
                    {detalle.cliente
                      ? `${detalle.cliente.nombre} ${detalle.cliente.apellido}`.toUpperCase()
                      : 'Cliente'}
                    {detalle.cliente?.numero_documento ? ` · ${detalle.cliente.numero_documento}` : ''}
                  </Typography>
                  <Chip
                    label={CREDITO_ESTADO_LABELS[detalle.estado]}
                    size="small"
                    color={CREDITO_ESTADO_COLOR[detalle.estado]}
                  />
                </Stack>
                {detalle.cliente?.telefono && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Tel: {detalle.cliente.telefono}
                  </Typography>
                )}
                {detalle.cliente &&
                  (detalle.cliente.foto_cliente_url ||
                    detalle.cliente.foto_dni_url ||
                    detalle.cliente.foto_dni_reverso_url ||
                    detalle.cliente.foto_casa_url ||
                    detalle.cliente.foto_negocio_url) && (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', pt: 0.5 }}>
                      {[
                        { url: detalle.cliente.foto_cliente_url, label: 'Foto del cliente' },
                        { url: detalle.cliente.foto_dni_url, label: 'Foto del DNI (anverso)' },
                        { url: detalle.cliente.foto_dni_reverso_url, label: 'Foto del DNI (reverso)' },
                        { url: detalle.cliente.foto_casa_url, label: 'Foto de la casa' },
                        { url: detalle.cliente.foto_negocio_url, label: 'Foto del negocio' },
                      ]
                        .filter((foto): foto is { url: string; label: string } => !!foto.url)
                        .map((foto) => (
                          <Box key={foto.label} sx={{ textAlign: 'center' }}>
                            <Avatar
                              src={foto.url}
                              variant="rounded"
                              sx={{ width: 72, height: 72, cursor: 'pointer' }}
                              onClick={() => setLightbox({ type: 'image', url: foto.url, label: foto.label })}
                            />
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {foto.label}
                            </Typography>
                          </Box>
                        ))}
                    </Stack>
                  )}

                <Divider />

                <Typography variant="subtitle2">Datos del crédito</Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <strong>Monto del préstamo:</strong> {formatMonto(detalle.monto_prestamo)}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2">
                      <strong>Interés:</strong> {detalle.interes}% ({formatMonto(interesPorCuota(detalle))}{' '}
                      por cuota)
                    </Typography>
                    {puedeEditarCredito(user, detalle) &&
                      ['pendiente', 'aprobado'].includes(detalle.estado) && (
                        <Tooltip title="Editar tasa de interés">
                          <IconButton size="small" onClick={() => openEditarInteres(detalle)}>
                            <EditIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}
                  </Stack>
                  <Typography variant="body2">
                    <strong>Tipo de cuota:</strong> {TIPO_CUOTA_LABELS[detalle.tipo_cuota]}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Plazo:</strong> {detalle.plazo_dias} días
                  </Typography>
                  <Typography variant="body2">
                    <strong>Cantidad de cuotas:</strong> {detalle.cuotas?.length ?? 0}
                  </Typography>
                  {detalle.numero_refrendo > 0 && (
                    <Typography variant="body2">
                      <strong>N.º de refrendo:</strong> {detalle.numero_refrendo}
                    </Typography>
                  )}
                  {detalle.adenda_de_credito_id && (
                    <Typography variant="body2">
                      <strong>Origen:</strong> adenda del crédito #{detalle.adenda_de_credito_id}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>Desembolso:</strong> {formatFecha(detalle.fecha_desembolso)}
                    {' · '}
                    <strong>Vencimiento:</strong> {formatFecha(detalle.fecha_vencimiento)}
                  </Typography>
                  {diasEnMora(detalle) > 0 && (
                    <Typography variant="body2" sx={{ color: 'error.main' }}>
                      {diasEnMora(detalle)} días en mora
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>Registrado por:</strong> {extractUserName(detalle.registrado_por)?.toUpperCase() ?? '—'}
                  </Typography>
                  {detalle.aprobado_por && (
                    <Typography variant="body2">
                      <strong>{detalle.estado === 'rechazado' ? 'Rechazado por' : 'Aprobado por'}:</strong>{' '}
                      {extractUserName(detalle.aprobado_por)?.toUpperCase()}
                      {detalle.fecha_aprobacion ? ` · ${formatFechaHora(detalle.fecha_aprobacion)}` : ''}
                    </Typography>
                  )}
                </Stack>
                {detalle.motivo_rechazo && (
                  <Alert severity="warning">Motivo de rechazo: {detalle.motivo_rechazo}</Alert>
                )}

                <Divider />

                <Typography variant="subtitle2">Bienes en garantía</Typography>
                {detalle.bienes && detalle.bienes.length > 0 ? (
                  <Stack spacing={1.5}>
                    {detalle.bienes.map((bien) => (
                      <Card key={bien.id} variant="outlined">
                        <CardContent>
                          <Stack spacing={1}>
                            <Stack
                              direction="row"
                              sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {bien.nombre.toUpperCase()}
                              </Typography>
                              <Chip
                                label={BIEN_ESTADO_LABELS[bien.estado]}
                                size="small"
                                color={BIEN_ESTADO_COLOR[bien.estado]}
                              />
                            </Stack>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {BIEN_TIPO_LABELS[bien.tipo]}
                              {bien.marca ? ` · ${bien.marca.toUpperCase()}` : ''}
                              {bien.modelo ? ` ${bien.modelo.toUpperCase()}` : ''}
                              {bien.serie ? ` · Serie ${bien.serie.toUpperCase()}` : ''}
                            </Typography>
                            <Typography variant="body2">
                              Valorización: {formatMonto(bien.valorizacion)} · Puntaje: {bien.puntaje}
                              {bien.precio_venta
                                ? ` · Precio venta: ${formatMonto(bien.precio_venta)}`
                                : ''}
                            </Typography>
                            {bien.observacion && (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {bien.observacion.toUpperCase()}
                              </Typography>
                            )}

                            {(bien.foto_cliente_producto_url ||
                              (bien.fotos && bien.fotos.length > 0) ||
                              bien.video_url) && (
                              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', pt: 0.5 }}>
                                {bien.foto_cliente_producto_url && (
                                  <Avatar
                                    src={bien.foto_cliente_producto_url}
                                    variant="rounded"
                                    sx={{ width: 72, height: 72, cursor: 'pointer' }}
                                    onClick={() =>
                                      setLightbox({
                                        type: 'image',
                                        url: bien.foto_cliente_producto_url!,
                                        label: 'Cliente con el producto',
                                      })
                                    }
                                  />
                                )}
                                {bien.fotos?.map((foto) => (
                                  <Avatar
                                    key={foto.id}
                                    src={foto.url}
                                    variant="rounded"
                                    sx={{ width: 72, height: 72, cursor: 'pointer' }}
                                    onClick={() => setLightbox({ type: 'image', url: foto.url })}
                                  />
                                ))}
                                {bien.video_url && (
                                  <Box
                                    sx={{
                                      width: 128,
                                      height: 72,
                                      borderRadius: 1,
                                      bgcolor: 'action.hover',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() =>
                                      setLightbox({ type: 'video', url: bien.video_url!, label: bien.nombre })
                                    }
                                  >
                                    <PlayCircleIcon color="action" fontSize="large" />
                                  </Box>
                                )}
                              </Stack>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Sin bienes.
                  </Typography>
                )}

                <Divider />

                <Typography variant="subtitle2">Documentos</Typography>
                {!puedeVerDocumentosCredito(user, detalle) ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Los documentos estarán disponibles cuando el crédito sea aprobado.
                  </Typography>
                ) : detalle.documentos && detalle.documentos.length > 0 ? (
                  <Stack spacing={1}>
                    {detalle.documentos.map((documento) => (
                      <Stack
                        key={documento.id}
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Typography
                          variant="body2"
                          component="button"
                          onClick={() => handleVerDocumento(documento)}
                          disabled={viewingDocumentoId === documento.id}
                          sx={{
                            background: 'none',
                            border: 0,
                            p: 0,
                            font: 'inherit',
                            color: 'primary.main',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          {viewingDocumentoId === documento.id ? 'Abriendo...' : documento.tipo}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Chip
                            label={documento.impreso_at ? 'Impreso' : 'No impreso'}
                            size="small"
                            onClick={
                              documento.impreso_at ? undefined : () => handleMarcarImpreso(documento.id)
                            }
                            color={documento.impreso_at ? 'success' : 'default'}
                          />
                          {documento.firmado_at ? (
                            <Chip
                              label="Firmado"
                              size="small"
                              color="success"
                              onClick={
                                documento.archivo_firmado_url
                                  ? () =>
                                      setLightbox({
                                        type: documento.archivo_firmado_url!.toLowerCase().endsWith('.pdf')
                                          ? 'pdf'
                                          : 'image',
                                        url: documento.archivo_firmado_url!,
                                        label: `${documento.tipo} firmado`,
                                      })
                                  : undefined
                              }
                            />
                          ) : (
                            <>
                              <input
                                type="file"
                                id={`subir-firmado-${documento.id}`}
                                accept="application/pdf,image/jpeg,image/png"
                                style={{ display: 'none' }}
                                onChange={(e) =>
                                  handleSubirFirmado(documento.id, e.target.files?.[0] ?? null)
                                }
                              />
                              <label htmlFor={`subir-firmado-${documento.id}`}>
                                <Button
                                  component="span"
                                  size="small"
                                  variant="outlined"
                                  startIcon={<UploadFileIcon fontSize="small" />}
                                  disabled={subiendoDocumentoId === documento.id}
                                >
                                  {subiendoDocumentoId === documento.id ? 'Subiendo...' : 'Subir firmado'}
                                </Button>
                              </label>
                            </>
                          )}
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Aún no se generaron documentos.
                  </Typography>
                )}

                {detalle.cuotas && detalle.cuotas.length > 0 && (
                  <>
                    <Divider />
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2">Cronograma</Typography>
                      <Button
                        size="small"
                        startIcon={<PictureAsPdfIcon fontSize="small" />}
                        onClick={() => handleVerCronograma(detalle.id)}
                        disabled={isLoadingCronograma}
                      >
                        {isLoadingCronograma ? 'Abriendo...' : 'Ver PDF'}
                      </Button>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Cada cuota es solo el interés de ese periodo — el capital se paga completo al liquidar.
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>N.º</TableCell>
                          <TableCell>Vencimiento</TableCell>
                          <TableCell align="right">Capital</TableCell>
                          <TableCell align="right">Interés</TableCell>
                          <TableCell align="right">Cuota</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detalle.cuotas.map((cuota) => (
                          <TableRow key={cuota.id}>
                            <TableCell>{cuota.numero_cuota}</TableCell>
                            <TableCell>{formatFecha(cuota.fecha_vencimiento)}</TableCell>
                            <TableCell align="right">{formatMonto(cuota.monto_capital)}</TableCell>
                            <TableCell align="right">{formatMonto(cuota.monto_interes)}</TableCell>
                            <TableCell align="right">{formatMonto(cuota.monto_total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setDetalle(null)}>Cerrar</Button>
          {detalle && (
            <>
              {detalle.estado === 'pendiente' &&
                canAprobarCreditos(user) &&
                puedeAprobarCredito(user, detalle) && (
                  <>
                    <Button
                      color="error"
                      onClick={() => {
                        setMotivo('');
                        setRechazarError(null);
                        setRechazarTarget(detalle);
                      }}
                    >
                      Rechazar
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<CheckIcon />}
                      disabled={actingId === detalle.id}
                      onClick={() => handleAprobar(detalle)}
                    >
                      {actingId === detalle.id ? 'Aprobando...' : 'Aprobar'}
                    </Button>
                  </>
                )}
              {detalle.estado === 'aprobado' && puedeRevertirAprobacion(user, detalle) && (
                <Button startIcon={<UndoIcon />} onClick={() => setRevertirTarget(detalle)}>
                  Revertir aprobación
                </Button>
              )}
              {detalle.estado === 'aprobado' && canDesembolsarCreditos(user) && (
                <Tooltip
                  title={
                    (detalle.documentos ?? []).every((d) => d.firmado_at)
                      ? ''
                      : 'Todos los documentos deben tener el archivo firmado subido'
                  }
                >
                  <span>
                    <Button
                      variant="contained"
                      startIcon={<PaymentsIcon />}
                      disabled={
                        (detalle.documentos ?? []).length === 0 ||
                        !(detalle.documentos ?? []).every((d) => d.firmado_at)
                      }
                      onClick={() => openDesembolsar(detalle)}
                    >
                      Desembolsar
                    </Button>
                  </span>
                </Tooltip>
              )}
              {detalle.puede_enviar_tienda && puedeEnviarATiendaCredito(user, detalle) && (
                <Button
                  variant="contained"
                  startIcon={<StorefrontIcon />}
                  onClick={() => openEnviarTienda(detalle)}
                >
                  Enviar a tienda
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={!!editarInteresTarget} onClose={preventBackdropClose(() => setEditarInteresTarget(null))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleActualizarInteres}>
          <DialogTitle>Editar tasa de interés</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {editarInteresError && <Alert severity="error">{editarInteresError}</Alert>}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Solo para casos excepcionales, por ejemplo un cliente exclusivo con una tasa distinta a la
                configurada.
              </Typography>
              <TextField
                label="Nueva tasa de interés (%)"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={nuevoInteres}
                onChange={(e) => setNuevoInteres(e.target.value)}
                required
                autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setEditarInteresTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isActualizandoInteres}>
              {isActualizandoInteres ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!desembolsarTarget} onClose={preventBackdropClose(() => setDesembolsarTarget(null))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleDesembolsar}>
          <DialogTitle>Desembolsar crédito</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {desembolsarError && <Alert severity="error">{desembolsarError}</Alert>}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {desembolsarTarget?.adenda_de_credito_id
                  ? 'Es una adenda: no se mueve caja (no se entrega dinero nuevo), solo se activa el crédito con las condiciones nuevas y se genera el cronograma de cuotas.'
                  : 'El monto sale de tu propia caja y se genera el cronograma de cuotas.'}
              </Typography>
              {desembolsarTarget && puedeEditarCredito(user, desembolsarTarget) ? (
                <>
                  <TextField
                    label="Número de cuotas"
                    type="number"
                    slotProps={{ htmlInput: { min: 1 } }}
                    value={desembolsarNumeroCuotas}
                    onChange={(e) => setDesembolsarNumeroCuotas(e.target.value)}
                    helperText="Por defecto según el tipo de cuota — cada cuota es un periodo completo, más cuotas extiende el plazo real del crédito"
                    required
                  />
                  <TextField
                    label="Tasa de interés (%)"
                    type="number"
                    slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                    value={desembolsarInteres}
                    onChange={(e) => setDesembolsarInteres(e.target.value)}
                    required
                  />
                </>
              ) : (
                desembolsarTarget && (
                  <Typography variant="body2">
                    {CUOTAS_POR_TIPO[desembolsarTarget.tipo_cuota]} cuotas · interés {desembolsarTarget.interes}%
                  </Typography>
                )
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDesembolsarTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isDesembolsando}>
              {isDesembolsando ? 'Desembolsando...' : 'Desembolsar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={!!enviarTiendaTarget}
        onClose={preventBackdropClose(() => setEnviarTiendaTarget(null))}
        fullWidth
        maxWidth="xs"
      >
        <Box component="form" onSubmit={handleEnviarATienda}>
          <DialogTitle>Enviar a tienda</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {enviarTiendaError && <Alert severity="error">{enviarTiendaError}</Alert>}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Indica el precio de venta de cada bien. Es el precio que verán los clientes en la
                tienda virtual.
              </Typography>
              {(enviarTiendaTarget?.bienes ?? []).map((bien) => (
                <TextField
                  key={bien.id}
                  label={`Precio de venta — ${bien.nombre.toUpperCase()}`}
                  type="number"
                  slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                  value={preciosVenta[bien.id] ?? ''}
                  onChange={(e) => setPreciosVenta((p) => ({ ...p, [bien.id]: e.target.value }))}
                  helperText={`Valorización: ${formatMonto(bien.valorizacion)}`}
                  required
                />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setEnviarTiendaTarget(null)}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                isEnviandoTienda ||
                (enviarTiendaTarget?.bienes ?? []).some(
                  (b) => !preciosVenta[b.id] || Number(preciosVenta[b.id]) <= 0
                )
              }
            >
              {isEnviandoTienda ? 'Enviando...' : 'Enviar a tienda'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!cobrarTarget} onClose={preventBackdropClose(() => setCobrarTarget(null))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCobrar}>
          <DialogTitle>Cobrar crédito</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {cobrarError && <Alert severity="error">{cobrarError}</Alert>}
              <TextField
                select
                label="Tipo de cobro"
                value={tipoCobro}
                onChange={(e) => handleTipoCobroChange(e.target.value as TipoCobro)}
                autoFocus
              >
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="refrendar">Refrendar</MenuItem>
                <MenuItem value="adenda">Adenda</MenuItem>
                <MenuItem value="liquidar">Liquidar</MenuItem>
              </TextField>

              {tipoCobro === 'adenda' &&
                (refrendoSugerido ? (
                  <>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Paga el interés y modifica las condiciones del crédito — se cierra el actual y nace uno
                      nuevo <strong>pendiente</strong>, que debe aprobarse, firmarse y desembolsarse otra vez
                      (sin mover caja: no se entrega dinero nuevo).
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Días transcurridos: {refrendoSugerido.dias_transcurridos} · Mínimo configurado:{' '}
                      {refrendoSugerido.dias_minimo} días · Días cobrados: {refrendoSugerido.dias_cobrados} ·
                      Tasa actual: {refrendoSugerido.tasa_interes}%
                    </Typography>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="subtitle1">Total a pagar (interés)</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatMonto(refrendoSugerido.total)}
                      </Typography>
                    </Stack>
                    <TextField
                      label="Monto ingresado"
                      type="number"
                      slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                      value={montoIngresado}
                      onChange={(e) => setMontoIngresado(e.target.value)}
                      required
                    />
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="body2">Vuelto</Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 600, color: vueltoAdenda < 0 ? 'error.main' : 'success.main' }}
                      >
                        {vueltoAdenda < 0
                          ? `Falta ${formatMonto(String(-vueltoAdenda))}`
                          : formatMonto(String(vueltoAdenda))}
                      </Typography>
                    </Stack>
                    {cobrarTarget && puedeEditarCredito(user, cobrarTarget) ? (
                      <>
                        <TextField
                          label="Nueva tasa de interés (%)"
                          type="number"
                          slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                          value={nuevoInteresAdenda}
                          onChange={(e) => setNuevoInteresAdenda(e.target.value)}
                          required
                        />
                        <TextField
                          select
                          label="Nuevo tipo de cuota"
                          value={nuevoTipoCuotaAdenda}
                          onChange={(e) => setNuevoTipoCuotaAdenda(e.target.value as TipoCuota)}
                          helperText="Déjalo igual si no cambia"
                        >
                          {Object.entries(TIPO_CUOTA_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value}>
                              {label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        El crédito nuevo queda pendiente con la tasa y tipo de cuota actuales — un admin podrá
                        editarlas después desde el detalle.
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Calculando monto sugerido...
                  </Typography>
                ))}

              {tipoCobro === 'normal' &&
                (liquidacionSugerida && refrendoSugerido ? (
                  <>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Paga el interés más una parte del capital — el crédito se cierra y se genera uno nuevo
                      con el saldo restante.
                    </Typography>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="body2">Total a pagar (referencia)</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {formatMonto(liquidacionSugerida.total)}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Interés a cubrir: {formatMonto(refrendoSugerido.interes)}
                    </Typography>
                    <TextField
                      label="Monto ingresado"
                      type="number"
                      slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                      value={montoIngresado}
                      onChange={(e) => setMontoIngresado(e.target.value)}
                      required
                      error={!!normalError}
                      helperText={normalError ?? ' '}
                    />
                    {!normalError && montoIngresado && (
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography variant="body2">Abono a capital</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatMonto(String(abonoCapitalNormal))}
                        </Typography>
                      </Stack>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Calculando monto sugerido...
                  </Typography>
                ))}

              {tipoCobro === 'refrendar' &&
                (refrendoSugerido ? (
                  <>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Registra el pago de interés y genera un nuevo ciclo activo del crédito. El capital sigue
                      en garantía.
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Días transcurridos: {refrendoSugerido.dias_transcurridos} · Mínimo configurado:{' '}
                      {refrendoSugerido.dias_minimo} días · Días cobrados: {refrendoSugerido.dias_cobrados} ·
                      Tasa: {refrendoSugerido.tasa_interes}%
                    </Typography>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="subtitle1">Total a pagar</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatMonto(refrendoSugerido.total)}
                      </Typography>
                    </Stack>
                    <TextField
                      label="Monto ingresado"
                      type="number"
                      slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                      value={montoIngresado}
                      onChange={(e) => setMontoIngresado(e.target.value)}
                      required
                    />
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="body2">Vuelto</Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 600, color: vueltoRefrendar < 0 ? 'error.main' : 'success.main' }}
                      >
                        {vueltoRefrendar < 0
                          ? `Falta ${formatMonto(String(-vueltoRefrendar))}`
                          : formatMonto(String(vueltoRefrendar))}
                      </Typography>
                    </Stack>
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Calculando monto sugerido...
                  </Typography>
                ))}

              {tipoCobro === 'liquidar' &&
                (liquidacionSugerida ? (
                  <>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Días transcurridos: {liquidacionSugerida.dias_transcurridos} · Mínimo configurado:{' '}
                      {liquidacionSugerida.dias_minimo} días · Días cobrados: {liquidacionSugerida.dias_cobrados}{' '}
                      · Tasa: {liquidacionSugerida.tasa_interes}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Capital {formatMonto(liquidacionSugerida.capital)} + interés{' '}
                      {formatMonto(liquidacionSugerida.interes)}
                    </Typography>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="subtitle1">Total a pagar</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatMonto(liquidacionSugerida.total)}
                      </Typography>
                    </Stack>
                    <TextField
                      label="Monto ingresado"
                      type="number"
                      slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                      value={montoIngresado}
                      onChange={(e) => setMontoIngresado(e.target.value)}
                      required
                    />
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="body2">Vuelto</Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 600, color: vueltoLiquidar < 0 ? 'error.main' : 'success.main' }}
                      >
                        {vueltoLiquidar < 0
                          ? `Falta ${formatMonto(String(-vueltoLiquidar))}`
                          : formatMonto(String(vueltoLiquidar))}
                      </Typography>
                    </Stack>
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Calculando monto sugerido...
                  </Typography>
                ))}

              <MedioCobroField
                medio={medioCobro}
                onMedioChange={setMedioCobro}
                comprobante={comprobanteCobro}
                onComprobanteChange={setComprobanteCobro}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setCobrarTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isCobrando || !puedeCobrar}>
              {isCobrando ? 'Procesando...' : 'Cobrar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={!!revertirTarget}
        title="Revertir aprobación"
        message="El crédito volverá a estado pendiente, como si aún no se hubiera aprobado. Úsalo solo si fue una aprobación por error."
        onCancel={() => setRevertirTarget(null)}
        onConfirm={handleRevertirAprobacion}
        isLoading={isRevirtiendo}
        confirmLabel="Revertir"
      />

      <MediaLightbox item={lightbox} onClose={closeLightbox} />
    </Stack>
  );
}
