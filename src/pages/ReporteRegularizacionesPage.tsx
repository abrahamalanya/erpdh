import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { AsesorAutocomplete } from '../components/AsesorAutocomplete';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { ErrorBanner } from '../components/ErrorBanner';
import { eliminarRegularizacionCredito, getRegularizacionesCredito, type RegularizacionCredito } from '../api/regularizaciones';
import { TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import { formatFechaHora, formatMonto } from '../utils/format';
import type { User } from '../types/api';

/**
 * Historial de "regularizaciones" de un crédito diario — ver
 * CreditoService::regularizarCuotas(): condona por completo cuotas
 * pendientes sin que entre dinero, por eso no aparece en ningún reporte de
 * caja/cobranza. Este es su único registro.
 */
export function ReporteRegularizacionesPage() {
  const { user } = useAuth();

  const [eliminarTarget, setEliminarTarget] = useState<RegularizacionCredito | null>(null);
  const [isEliminando, setIsEliminando] = useState(false);
  const [eliminarError, setEliminarError] = useState<string | null>(null);

  async function handleEliminar() {
    if (!eliminarTarget || isEliminando) return;
    setIsEliminando(true);
    setEliminarError(null);
    try {
      await eliminarRegularizacionCredito(eliminarTarget.id);
      setEliminarTarget(null);
      if (regularizaciones.length === 1 && page > 1) setPage(page - 1);
      else loadReporte();
    } catch (err) {
      setEliminarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsEliminando(false);
    }
  }

  const [asesorSel, setAsesorSel] = useState<User | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [regularizaciones, setRegularizaciones] = useState<RegularizacionCredito[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function loadReporte() {
    setIsLoading(true);
    setLoadError(null);

    getRegularizacionesCredito({ page, asesor_id: asesorSel?.id, desde: desde || undefined, hasta: hasta || undefined })
      .then((res) => {
        setRegularizaciones(res.data.data);
        setLastPage(res.data.last_page);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReporte, [page]);

  const primerRender = useRef(true);
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }

    if (page !== 1) {
      setPage(1);
    } else {
      loadReporte();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asesorSel, desde, hasta]);

  if (!hasRole(user, 'sistemas', 'administrador_general')) {
    return <Navigate to="/" replace />;
  }

  const columns: DataTableColumn<RegularizacionCredito>[] = [
    { header: 'Fecha', render: (r) => formatFechaHora(r.created_at) },
    {
      header: 'Crédito',
      render: (r) => `#${r.credito_id} · ${TIPO_CREDITO_LABELS[r.credito.tipo_credito as keyof typeof TIPO_CREDITO_LABELS] ?? r.credito.tipo_credito}`,
    },
    { header: 'Cliente', render: (r) => `${r.credito.cliente.nombre} ${r.credito.cliente.apellido}`.toUpperCase() },
    { header: 'Agencia', render: (r) => r.agencia.nombre },
    { header: 'Cuotas', align: 'right', render: (r) => r.numero_cuotas },
    { header: 'Monto condonado', align: 'right', render: (r) => formatMonto(r.monto_condonado) },
    {
      header: 'Motivo',
      render: (r) => (
        <Tooltip title={r.motivo}>
          <span>{r.motivo}</span>
        </Tooltip>
      ),
    },
    { header: 'Regularizado por', render: (r) => `${r.actor.nombre} ${r.actor.apellido}`.toUpperCase() },
    {
      header: 'Acciones',
      render: (r) => (
        <Tooltip title={r.puede_eliminar ? 'Eliminar y restaurar saldos' : 'Elimina primero la última regularización de este cliente'}>
          <span>
            <IconButton color="error" size="small" aria-label="Eliminar regularización"
              disabled={!r.puede_eliminar || isEliminando || isLoading}
              onClick={() => { setEliminarError(null); setEliminarTarget(r); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ),
    },
  ];

  const activeFiltersCount = [asesorSel, desde, hasta].filter((value) => value !== null && value !== '').length;

  function clearFiltros() {
    setAsesorSel(null);
    setDesde('');
    setHasta('');
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Regularizaciones
        </Typography>
        <FiltrosPanel activeCount={activeFiltersCount} onClear={clearFiltros}>
          <AsesorAutocomplete value={asesorSel} onChange={setAsesorSel} />
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
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Créditos diarios regularizados por cuotas o por monto, sin que
        entre dinero ni se registre ningún cobro en caja.
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Para eliminar varias regularizaciones de un cliente, empieza por la última registrada.
      </Typography>
      <ConfirmDialog
        open={!!eliminarTarget}
        title="Eliminar regularización"
        message={`Se eliminará la regularización de ${eliminarTarget ? formatMonto(eliminarTarget.monto_condonado) : ''} y se restaurarán los saldos de sus cuotas. Si liquidó el crédito, se reabrirá y se retirará su carta de no adeudo. ¿Continuar?`}
        onCancel={() => { if (!isEliminando) setEliminarTarget(null); }}
        onConfirm={handleEliminar}
        isLoading={isEliminando}
        error={eliminarError}
      />
      <ErrorBanner error={loadError} />

      <DataTable
        columns={columns}
        rows={regularizaciones}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No hay regularizaciones con estos filtros"
        page={page}
        lastPage={lastPage}
        onPageChange={setPage}
      />
    </Stack>
  );
}
