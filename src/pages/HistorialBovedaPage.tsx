import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import RestoreIcon from '@mui/icons-material/Restore';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { extractUserName, puedeControlarBoveda, puedeForzarCierre, puedeReabrirBoveda, puedeReabrirCaja } from '../utils/cajaHierarchy';
import { cerrarForzadoCaja, reabrirCaja } from '../api/caja';
import { cerrarForzadoBoveda, getDetalleCierreBoveda, reabrirBoveda } from '../api/bovedas';
import { getReporteCierreBovedaPdf, getReporteCierreCajaPdf, listHistorialBoveda } from '../api/reportes';
import { listAgencias } from '../api/agencias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions, type RowAction } from '../components/RowActions';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DialogHeader } from '../components/DialogHeader';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatFecha, formatMonto } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import type { Agencia, BovedaCierreDetalle, HistorialBovedaItem } from '../types/api';

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HistorialBovedaPage() {
  const { user } = useAuth();
  const puedeVer = hasRole(user, 'sistemas', 'administrador_general');

  const [fecha, setFecha] = useState(hoy());
  const [estado, setEstado] = useState<'abierta' | 'cerrada' | ''>('');
  const [agenciaId, setAgenciaId] = useState<number | ''>('');
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [filas, setFilas] = useState<HistorialBovedaItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [cerrarTarget, setCerrarTarget] = useState<HistorialBovedaItem | null>(null);
  const [cerrarDetalle, setCerrarDetalle] = useState<BovedaCierreDetalle | null>(null);
  const [isLoadingCerrarDetalle, setIsLoadingCerrarDetalle] = useState(false);
  const [monto, setMonto] = useState('');
  const [isCerrando, setIsCerrando] = useState(false);
  const [cerrarError, setCerrarError] = useState<string | null>(null);

  const [reabrirTarget, setReabrirTarget] = useState<HistorialBovedaItem | null>(null);
  const [isReabriendo, setIsReabriendo] = useState(false);
  const [reabrirError, setReabrirError] = useState<string | null>(null);

  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (!puedeVer) return;
    listAgencias().then((res) => setAgencias(res.data.data)).catch(() => setAgencias([]));
  }, [puedeVer]);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    if (!puedeVer || !fecha) { setIsLoading(false); return; }
    setIsLoading(true);
    listHistorialBoveda(fecha, estado || undefined, agenciaId || undefined)
      .then((res) => { if (active) setFilas(res.data); })
      .catch((err) => { if (active) setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el historial.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [puedeVer, fecha, estado, agenciaId, reload]);

  useEffect(() => {
    setCerrarDetalle(null); setCerrarError(null);
    if (!cerrarTarget) return;

    if (cerrarTarget.fila_tipo === 'boveda' && cerrarTarget.boveda) {
      setIsLoadingCerrarDetalle(true);
      getDetalleCierreBoveda(cerrarTarget.boveda.id)
        .then((res) => { setCerrarDetalle(res.data); setMonto(res.data.total_estimado_cierre); })
        .catch((err) => setCerrarError(err instanceof Error ? err.message : 'Error desconocido'))
        .finally(() => setIsLoadingCerrarDetalle(false));
    } else {
      setMonto(cerrarTarget.saldo_cierre);
    }
  }, [cerrarTarget]);

  if (!puedeVer) {
    return <Navigate to="/" replace />;
  }

  async function handleCerrar(event: FormEvent) {
    event.preventDefault();
    if (!cerrarTarget || isCerrando) return;

    setCerrarError(null);
    setIsCerrando(true);

    try {
      if (cerrarTarget.fila_tipo === 'boveda' && cerrarTarget.boveda) {
        await cerrarForzadoBoveda(cerrarTarget.boveda.id, monto);
      } else if (cerrarTarget.caja) {
        await cerrarForzadoCaja(cerrarTarget.caja.id, monto);
      }
      setCerrarTarget(null);
      setMonto('');
      setReload((n) => n + 1);
    } catch (err) {
      setCerrarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsCerrando(false);
    }
  }

  async function handleReabrir() {
    if (!reabrirTarget || isReabriendo) return;

    setReabrirError(null);
    setIsReabriendo(true);

    try {
      if (reabrirTarget.fila_tipo === 'boveda' && reabrirTarget.boveda) {
        await reabrirBoveda(reabrirTarget.boveda.id);
      } else if (reabrirTarget.caja) {
        await reabrirCaja(reabrirTarget.caja.id);
      }
      setReabrirTarget(null);
      setReload((n) => n + 1);
    } catch (err) {
      setReabrirError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsReabriendo(false);
    }
  }

  async function handleReportePdf(fila: HistorialBovedaItem) {
    setPdfError(null);
    setPdfLoadingId(fila.id);

    try {
      const blob = fila.fila_tipo === 'boveda' ? await getReporteCierreBovedaPdf(fila.id) : await getReporteCierreCajaPdf(fila.id);
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'No se pudo generar el reporte.');
    } finally {
      setPdfLoadingId(null);
    }
  }

  const columns: DataTableColumn<HistorialBovedaItem>[] = [
    { header: 'N°', render: (f) => (filas ?? []).indexOf(f) + 1 },
    { header: 'Fecha', render: (f) => formatFecha(f.fecha) },
    { header: 'Tipo', render: (f) => f.tipo },
    {
      header: 'Estado',
      render: (f) => <Chip label={f.estado === 'abierta' ? 'Aperturada' : 'Cerrada'} size="small" color={f.estado === 'abierta' ? 'success' : 'default'} />,
    },
    { header: 'Agencia', render: (f) => f.agencia },
    { header: 'Usuario', render: (f) => extractUserName(f.usuario) ?? '—' },
    { header: 'Saldo inicial', align: 'right', render: (f) => formatMonto(f.saldo_inicial) },
    { header: 'Billetaje', align: 'right', render: (f) => formatMonto(f.billetaje) },
    { header: 'Abonos', align: 'right', render: (f) => formatMonto(f.abonos) },
    { header: 'Ingresos', align: 'right', render: (f) => formatMonto(f.ingresos) },
    { header: 'Ventas', align: 'right', render: (f) => formatMonto(f.ventas) },
    {
      header: 'Total ingresos',
      align: 'right',
      render: (f) => <Box component="span" sx={{ color: 'success.main', fontWeight: 700 }}>{formatMonto(f.total_ingresos)}</Box>,
    },
    { header: 'Desembolsos', align: 'right', render: (f) => formatMonto(f.desembolsos) },
    { header: 'Egresos', align: 'right', render: (f) => formatMonto(f.egresos) },
    {
      header: 'Total Egresos',
      align: 'right',
      render: (f) => <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>{formatMonto(f.total_egresos)}</Box>,
    },
    { header: 'Faltante', align: 'right', render: (f) => formatMonto(f.faltante) },
    { header: 'Sobrante', align: 'right', render: (f) => formatMonto(f.sobrante) },
    {
      header: 'Saldo cierre',
      align: 'right',
      render: (f) => <Box component="span" sx={{ color: 'info.main', fontWeight: 700 }}>{formatMonto(f.saldo_cierre)}</Box>,
    },
    {
      header: 'Opciones',
      align: 'right',
      render: (f) => {
        const actions: RowAction[] = [
          {
            key: 'reporte',
            label: 'Reporte (PDF)',
            icon: <PictureAsPdfIcon fontSize="small" />,
            onClick: () => handleReportePdf(f),
            disabled: pdfLoadingId === f.id,
          },
        ];

        const puedeCerrar = f.fila_tipo === 'boveda'
          ? (f.boveda ? puedeControlarBoveda(user, f.boveda) : false)
          : (f.caja ? puedeForzarCierre(user, f.caja) : false);
        const puedeReabrir = f.fila_tipo === 'boveda'
          ? (f.boveda ? puedeReabrirBoveda(user, f.boveda) : false)
          : (f.caja ? puedeReabrirCaja(user, f.caja) : false);

        if (f.estado === 'abierta' && puedeCerrar) {
          actions.push({ key: 'cerrar', label: 'Cerrar', icon: <LockIcon fontSize="small" />, onClick: () => setCerrarTarget(f) });
        }
        if (f.estado === 'cerrada' && puedeReabrir) {
          actions.push({ key: 'reabrir', label: 'Reabrir', icon: <RestoreIcon fontSize="small" />, onClick: () => setReabrirTarget(f) });
        }

        return <RowActions actions={actions} />;
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Historial de Bóveda
      </Typography>

      <ErrorBanner error={loadError} action={<Button color="inherit" onClick={() => setReload((n) => n + 1)}>Reintentar</Button>} />
      <ErrorBanner error={pdfError} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Fecha"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
          fullWidth
        />
        <TextField select label="Estado" value={estado} onChange={(e) => setEstado(e.target.value as 'abierta' | 'cerrada' | '')} fullWidth>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="abierta">Aperturada</MenuItem>
          <MenuItem value="cerrada">Cerrada</MenuItem>
        </TextField>
        <TextField
          select
          label="Agencia"
          value={agenciaId}
          onChange={(e) => setAgenciaId(e.target.value ? Number(e.target.value) : '')}
          fullWidth
        >
          <MenuItem value="">Todas</MenuItem>
          {agencias.map((a) => (
            <MenuItem key={a.id} value={a.id}>{a.nombre.toUpperCase()}</MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataTable
        columns={columns}
        rows={filas ?? []}
        keyExtractor={(f) => `${f.fila_tipo}-${f.id}`}
        isLoading={isLoading}
        emptyMessage="No hay bóvedas ni cajas con estos filtros"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={!!cerrarTarget} onClose={preventBackdropClose(() => { if (!isCerrando) setCerrarTarget(null); })} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCerrar}>
          <DialogHeader onClose={() => { if (!isCerrando) setCerrarTarget(null); }}>
            Cerrar {cerrarTarget?.fila_tipo === 'boveda' ? 'bóveda' : 'caja'}
          </DialogHeader>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <ErrorBanner error={cerrarError} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {cerrarTarget?.agencia} — {extractUserName(cerrarTarget?.usuario) ?? 'Sin usuario'}
              </Typography>

              {isLoadingCerrarDetalle && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Calculando detalle del cierre...</Typography>
              )}

              {cerrarDetalle && !isLoadingCerrarDetalle && cerrarDetalle.cajas.length > 0 && (
                <Alert severity="warning">
                  Hay {cerrarDetalle.cajas.length} caja(s) abierta(s) debajo de esta bóveda. Al cerrar, se forzará el cierre de cada una con su saldo en efectivo calculado.
                </Alert>
              )}

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
            <Button onClick={() => setCerrarTarget(null)} disabled={isCerrando}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isCerrando || !monto}>
              {isCerrando ? 'Cerrando...' : 'Cerrar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={!!reabrirTarget}
        title={`Reabrir ${reabrirTarget?.fila_tipo === 'boveda' ? 'bóveda' : 'caja'}`}
        message="Esto reabre el último ciclo cerrado (no crea uno nuevo), para regularizar un movimiento con su fecha contable original. ¿Continuar?"
        confirmLabel="Reabrir"
        loadingLabel="Reabriendo..."
        onCancel={() => { if (!isReabriendo) setReabrirTarget(null); }}
        onConfirm={handleReabrir}
        isLoading={isReabriendo}
        error={reabrirError}
      />
    </Stack>
  );
}
