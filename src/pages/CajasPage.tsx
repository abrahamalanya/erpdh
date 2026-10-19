import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import RestoreIcon from '@mui/icons-material/Restore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../hooks/useAuth';
import {
  canVerCajas,
  puedeForzarCierre,
  puedeReabrirCaja,
} from '../utils/cajaHierarchy';
import { cerrarForzadoCaja, listCajas, reabrirCaja } from '../api/caja';
import { getReporteCierreCaja } from '../api/reportes';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import {
  cabeceraDeCajaActiva,
  CajaCicloDetalleDialog,
  type CajaCicloDetalleCabecera,
} from '../components/CajaCicloDetalleDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DialogHeader } from '../components/DialogHeader';
import { RowActions, type RowAction } from '../components/RowActions';
import { formatMonto } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import type { Caja, PaginatedData } from '../types/api';
import { ErrorBanner } from '../components/ErrorBanner';

export function CajasPage() {
  const { user } = useAuth();

  const [result, setResult] = useState<PaginatedData<Caja> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [resumenForzado, setResumenForzado] = useState<{ cicloId: number; efectivo: string; total: string } | null>(null);
  const [forzadoLoading, setForzadoLoading] = useState(false);
  const [target, setTarget] = useState<Caja | null>(null);
  const [monto, setMonto] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [reabrirTarget, setReabrirTarget] = useState<Caja | null>(null);
  const [isReabriendo, setIsReabriendo] = useState(false);

  const [detalleTarget, setDetalleTarget] = useState<CajaCicloDetalleCabecera | null>(null);

  function loadCajas() {
    setIsLoading(true);
    setLoadError(null);

    listCajas(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadCajas, [page]);
  useEffect(() => {
    setResumenForzado(null); setMonto(''); setFormError(null);
    if (!target?.ciclo_abierto) return;
    const controller = new AbortController();
    setForzadoLoading(true);
    getReporteCierreCaja(target.ciclo_abierto.id, controller.signal).then(res => {
      if (controller.signal.aborted) return;
      if (res.data.cierre.estado !== 'abierta') throw new Error('El ciclo ya fue cerrado. Actualiza las cajas.');
      setResumenForzado({ cicloId: res.data.cierre.id, efectivo: res.data.resumen.saldo_efectivo, total: res.data.resumen.saldo_total });
    }).catch(err => { if (!controller.signal.aborted) setFormError(err instanceof Error ? err.message : 'No se pudo cargar el arqueo.'); })
      .finally(() => { if (!controller.signal.aborted) setForzadoLoading(false); });
    return () => controller.abort();
  }, [target]);

  if (!canVerCajas(user)) {
    return <Navigate to="/" replace />;
  }

  async function handleForzar(event: FormEvent) {
    event.preventDefault();
    if (!target || isSaving || forzadoLoading || resumenForzado?.cicloId !== target.ciclo_abierto?.id) return;

    setFormError(null);
    setIsSaving(true);

    try {
      await cerrarForzadoCaja(target.id, monto);
      setTarget(null);
      setMonto('');
      loadCajas();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReabrir() {
    if (!reabrirTarget || isReabriendo) return;

    setLoadError(null);
    setIsReabriendo(true);

    try {
      await reabrirCaja(reabrirTarget.id);
      setReabrirTarget(null);
      loadCajas();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsReabriendo(false);
    }
  }

  const columns: DataTableColumn<Caja>[] = [
    {
      header: 'Usuario',
      render: (c) => (c.user ? `${c.user.nombre} ${c.user.apellido}`.toUpperCase() : '—'),
    },
    { header: 'Agencia', render: (c) => c.agencia?.nombre.toUpperCase() ?? 'Principal' },
    {
      header: 'Estado',
      render: (c) => (
        <Chip
          label={c.ciclo_abierto ? 'Abierta' : 'Cerrada'}
          size="small"
          color={c.ciclo_abierto ? 'success' : 'default'}
        />
      ),
    },
    {
      header: 'Saldo apertura',
      render: (c) => (c.ciclo_abierto ? formatMonto(c.ciclo_abierto.saldo_apertura) : '—'),
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      render: (c: Caja) => {
        const actions: RowAction[] = [];

        if (c.ciclo_abierto) {
          actions.push({
            key: 'detalle',
            label: 'Ver detalle',
            icon: <VisibilityIcon fontSize="small" />,
            onClick: () => setDetalleTarget(cabeceraDeCajaActiva(c)),
          });
        }

        if (c.ciclo_abierto && c.user_id !== user?.id && puedeForzarCierre(user, c)) {
          actions.push({
            key: 'cerrar-forzado',
            label: 'Cerrar forzado',
            icon: <LockIcon fontSize="small" />,
            onClick: () => setTarget(c),
          });
        }
        if (!c.ciclo_abierto && puedeReabrirCaja(user, c)) {
          actions.push({
            key: 'reabrir',
            label: 'Reabrir el último ciclo cerrado',
            icon: <RestoreIcon fontSize="small" />,
            onClick: () => setReabrirTarget(c),
          });
        }

        return <RowActions actions={actions} />;
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Cajas
      </Typography>

      <ErrorBanner error={loadError} action={<Button onClick={loadCajas} color="inherit">Reintentar</Button>} />
      <Button onClick={loadCajas} disabled={isLoading}>Actualizar cajas</Button>

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay cajas registradas"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={!!target} onClose={preventBackdropClose(() => { if (!isSaving) setTarget(null); })} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleForzar}>
          <DialogHeader onClose={() => { if (!isSaving) setTarget(null); }}>Cerrar caja (forzado)</DialogHeader>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <ErrorBanner error={formError} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {target?.user?.nombre} {target?.user?.apellido}
              </Typography>
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
            <Button onClick={() => setTarget(null)} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving || forzadoLoading || !resumenForzado || resumenForzado.cicloId !== target?.ciclo_abierto?.id || !monto || !Number.isFinite(Number(monto)) || Number(monto) < 0}>
              {isSaving ? 'Cerrando...' : 'Cerrar forzado'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <CajaCicloDetalleDialog row={detalleTarget} onClose={() => setDetalleTarget(null)} />

      <ConfirmDialog
        open={!!reabrirTarget}
        title="Reabrir caja"
        message={
          <Typography>
            Esto reabre el último ciclo cerrado de{' '}
            <strong>
              {reabrirTarget?.user?.nombre} {reabrirTarget?.user?.apellido}
            </strong>{' '}
            (no crea uno nuevo), para regularizar un movimiento con su fecha contable original. ¿Continuar?
          </Typography>
        }
        confirmLabel="Reabrir"
        loadingLabel="Reabriendo..."
        onCancel={() => { if (!isReabriendo) setReabrirTarget(null); }}
        onConfirm={handleReabrir}
        isLoading={isReabriendo}
      />
    </Stack>
  );
}
