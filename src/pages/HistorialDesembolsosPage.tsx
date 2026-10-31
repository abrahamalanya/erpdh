import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { listCreditos } from '../api/creditosPrendarios';
import { listAgencias } from '../api/agencias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { ClienteAutocomplete } from '../components/ClienteAutocomplete';
import { AsesorAutocomplete } from '../components/AsesorAutocomplete';
import { ErrorBanner } from '../components/ErrorBanner';
import { ESTADOS_DESEMBOLSADOS, TIPO_CREDITO_LABELS, TIPO_CUOTA_LABELS, canVerCreditos } from '../utils/creditoPrendarioHierarchy';
import { formatFecha, formatMonto } from '../utils/format';
import type { Agencia, Cliente, Credito, TipoCredito, User } from '../types/api';

/** Segmento de URL (plural) de la página dedicada de cada tipo — ver App.tsx. */
const RUTA_POR_TIPO: Record<TipoCredito, string> = {
  prendario: 'prendarios',
  vehicular: 'vehiculares',
  hipotecario: 'hipotecarios',
  diario: 'diarios',
};

/**
 * Historial de desembolsos — espejo de HistorialDesembolsosScreen en la app
 * (umax-app/src/screens/creditos/HistorialDesembolsosScreen.tsx): subconjunto
 * de Historial de créditos sin filtro de estado (fijo a
 * ESTADOS_DESEMBOLSADOS — un crédito sin desembolsar no tiene
 * fecha_desembolso que mostrar acá) ni rangos de vencimiento/cancelación,
 * reutilizando el mismo `listCreditos()`.
 */
export function HistorialDesembolsosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const puedeFiltrarAgencia = hasRole(user, 'sistemas', 'administrador_general', 'supervisor');
  const puedeVerAsesor = hasRole(user, 'administrador_general', 'administrador_agencia', 'sistemas');

  const [result, setResult] = useState<{ data: Credito[]; last_page: number } | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [asesor, setAsesor] = useState<User | null>(null);
  const [tipoCredito, setTipoCredito] = useState<TipoCredito | ''>('');
  const [agenciaId, setAgenciaId] = useState<number | ''>('');
  const [desembolsoDesde, setDesembolsoDesde] = useState('');
  const [desembolsoHasta, setDesembolsoHasta] = useState('');

  useEffect(() => {
    if (puedeFiltrarAgencia) {
      listAgencias().then((res) => setAgencias(res.data.data)).catch(() => setAgencias([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeFiltrarAgencia]);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);

    listCreditos(page, {
      clienteId: cliente?.id,
      asesorId: asesor?.id,
      tipoCredito: tipoCredito || undefined,
      estado: ESTADOS_DESEMBOLSADOS,
      agenciaId: agenciaId || undefined,
      fechaDesembolsoDesde: desembolsoDesde || undefined,
      fechaDesembolsoHasta: desembolsoHasta || undefined,
    })
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [page, cliente, asesor, tipoCredito, agenciaId, desembolsoDesde, desembolsoHasta]);

  if (!canVerCreditos(user)) {
    return <Navigate to="/" replace />;
  }

  function limpiarFiltros() {
    setPage(1);
    setCliente(null);
    setAsesor(null);
    setTipoCredito('');
    setAgenciaId('');
    setDesembolsoDesde('');
    setDesembolsoHasta('');
  }

  const activeFiltersCount = [cliente, asesor, tipoCredito, agenciaId, desembolsoDesde, desembolsoHasta].filter(
    (v) => v !== null && v !== ''
  ).length;

  const columns: DataTableColumn<Credito>[] = [
    { header: 'Cliente', render: (c) => c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}`.toUpperCase() : `Cliente #${c.cliente_id}` },
    { header: 'DNI', render: (c) => c.cliente?.numero_documento ?? '—' },
    { header: 'Código', render: (c) => c.codigo },
    { header: 'Tipo', render: (c) => TIPO_CREDITO_LABELS[c.tipo_credito] },
    { header: 'Tipo de pago', render: (c) => TIPO_CUOTA_LABELS[c.tipo_cuota] },
    { header: 'Desembolso', render: (c) => formatFecha(c.fecha_desembolso) },
    { header: 'Préstamo', align: 'right', render: (c) => formatMonto(c.monto_prestamo) },
    { header: 'Cuotas', align: 'right', render: (c) => c.numero_cuotas ?? '—' },
    { header: 'Interés', align: 'right', render: (c) => `${c.interes}%` },
    { header: 'Asesor', render: (c) => c.asesor ? `${c.asesor.nombre} ${c.asesor.apellido}`.toUpperCase() : 'Sin asesor' },
    {
      header: 'Acciones',
      align: 'right',
      render: (c) => (
        <Button
          size="small"
          onClick={() => navigate(`/creditos-prendarios/${RUTA_POR_TIPO[c.tipo_credito]}?credito_id=${c.id}&accion=detalle`)}
        >
          Ver detalle
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Historial de desembolsos
        </Typography>
        <FiltrosPanel activeCount={activeFiltersCount} onClear={limpiarFiltros}>
          <ClienteAutocomplete value={cliente} onChange={(v) => { setPage(1); setCliente(v); }} />
          {puedeVerAsesor && <AsesorAutocomplete value={asesor} onChange={(v) => { setPage(1); setAsesor(v); }} />}
          <TextField
            select label="Tipo de crédito" value={tipoCredito}
            onChange={(e) => { setPage(1); setTipoCredito(e.target.value as TipoCredito | ''); }}
          >
            <MenuItem value="">Todos</MenuItem>
            {(Object.keys(TIPO_CREDITO_LABELS) as TipoCredito[]).map((t) => (
              <MenuItem key={t} value={t}>{TIPO_CREDITO_LABELS[t]}</MenuItem>
            ))}
          </TextField>
          {puedeFiltrarAgencia && (
            <TextField
              select label="Agencia" value={agenciaId}
              onChange={(e) => { setPage(1); setAgenciaId(e.target.value ? Number(e.target.value) : ''); }}
            >
              <MenuItem value="">Todas</MenuItem>
              {agencias.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.nombre.toUpperCase()}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField label="Desembolso desde" type="date" value={desembolsoDesde} onChange={(e) => { setPage(1); setDesembolsoDesde(e.target.value); }} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Desembolso hasta" type="date" value={desembolsoHasta} onChange={(e) => { setPage(1); setDesembolsoHasta(e.target.value); }} slotProps={{ inputLabel: { shrink: true } }} />
        </FiltrosPanel>
      </Stack>

      <ErrorBanner error={loadError} />

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay desembolsos para mostrar"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />
    </Stack>
  );
}
