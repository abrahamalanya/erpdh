import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Chip, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ClienteAutocomplete } from '../components/ClienteAutocomplete';
import { AsesorAutocomplete } from '../components/AsesorAutocomplete';
import { ExportButtons } from '../components/ExportButtons';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { getCobrosExcel, getCobrosPdf, listCobros, type Cobro } from '../api/cobros';
import { canVerCobranzas, COBRO_OPERACION_LABELS, COBRO_OPERACION_COLOR } from '../utils/cobranzaHierarchy';
import { TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import { extractUserName } from '../utils/cajaHierarchy';
import { formatFechaHora, formatMonto } from '../utils/format';
import type { Cliente, User } from '../types/api';

export function ReporteAnulacionesCobranzaPage() {
  const { user } = useAuth();

  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [asesorSel, setAsesorSel] = useState<User | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function filtrosActuales() {
    return {
      estado: 'anulado' as const,
      q: clienteSel?.numero_documento || undefined,
      registrado_por: asesorSel?.id,
      anulado_desde: desde || undefined,
      anulado_hasta: hasta || undefined,
    };
  }

  function loadReporte() {
    setIsLoading(true);
    setLoadError(null);

    listCobros({ page, ...filtrosActuales() })
      .then((res) => {
        setCobros(res.data.data);
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
  }, [clienteSel, asesorSel, desde, hasta]);

  if (!canVerCobranzas(user)) {
    return <Navigate to="/" replace />;
  }

  const columns: DataTableColumn<Cobro>[] = [
    { header: 'Fecha de anulación', render: (c) => (c.anulado_at ? formatFechaHora(c.anulado_at) : '—') },
    {
      header: 'Cliente',
      render: (c) => (c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}`.toUpperCase() : `#${c.cliente_id}`),
    },
    {
      header: 'Crédito',
      render: (c) => (c.credito ? `#${c.credito_id} · ${TIPO_CREDITO_LABELS[c.credito.tipo_credito]}` : `#${c.credito_id}`),
    },
    {
      header: 'Operación',
      render: (c) => <Chip label={COBRO_OPERACION_LABELS[c.operacion]} size="small" color={COBRO_OPERACION_COLOR[c.operacion]} />,
    },
    { header: 'Monto pagado', align: 'right', render: (c) => formatMonto(c.monto_pagado) },
    {
      header: 'Motivo de anulación',
      render: (c) =>
        c.motivo_anulacion ? (
          <Tooltip title={c.motivo_anulacion}>
            <span>{c.motivo_anulacion}</span>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    { header: 'Registrado por', render: (c) => extractUserName(c.registrado_por) ?? '—' },
    { header: 'Anulado por', render: (c) => extractUserName(c.anulado_por) ?? '—' },
  ];

  const activeFiltersCount = [clienteSel, asesorSel, desde, hasta].filter(
    (value) => value !== null && value !== ''
  ).length;

  function clearFiltros() {
    setClienteSel(null);
    setAsesorSel(null);
    setDesde('');
    setHasta('');
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Anulaciones de cobranza
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <FiltrosPanel activeCount={activeFiltersCount} onClear={clearFiltros}>
            <ClienteAutocomplete value={clienteSel} onChange={setClienteSel} />
            <AsesorAutocomplete value={asesorSel} onChange={setAsesorSel} />
            <TextField
              label="Anulado desde"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Anulado hasta"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              size="small"
              fullWidth
            />
          </FiltrosPanel>
          <ExportButtons
            exportPdf={() => getCobrosPdf(filtrosActuales())}
            exportExcel={() => getCobrosExcel(filtrosActuales())}
            filename="anulaciones-cobranza"
          />
        </Stack>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Historial de cobros (refrendos, adendas, liquidaciones, pagos de cuota) anulados por error.
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={cobros}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay cobros anulados con estos filtros"
        page={page}
        lastPage={lastPage}
        onPageChange={setPage}
      />
    </Stack>
  );
}
