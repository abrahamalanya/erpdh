import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { canVerCreditos, CREDITO_ESTADO_LABELS, CREDITO_ESTADO_COLOR, TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import { getReporteCobranzaDiaria, getReporteCobranzaDiariaExcel, getReporteCobranzaDiariaPdf } from '../api/reportes';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ExportButtons } from '../components/ExportButtons';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { formatMonto } from '../utils/format';
import type { CobranzaDiariaItem, TipoCredito } from '../types/api';

export function ReporteCobranzaDiariaPage() {
  const { user } = useAuth();

  const [reporte, setReporte] = useState<CobranzaDiariaItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tipoFiltro, setTipoFiltro] = useState<TipoCredito | ''>('');

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);

    getReporteCobranzaDiaria()
      .then((res) => setReporte(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, []);

  if (!canVerCreditos(user)) {
    return <Navigate to="/" replace />;
  }

  const columns: DataTableColumn<CobranzaDiariaItem>[] = [
    { header: 'Código', render: (i) => i.credito_codigo },
    { header: 'Tipo', render: (i) => TIPO_CREDITO_LABELS[i.tipo_credito] },
    {
      header: 'Cliente',
      render: (i) => `${i.cliente.nombre} ${i.cliente.apellido}`.toUpperCase(),
    },
    { header: 'Documento', render: (i) => i.cliente.numero_documento ?? '—' },
    { header: 'Teléfono', render: (i) => i.cliente.telefono ?? '—' },
    { header: 'Agencia', render: (i) => i.agencia.nombre.toUpperCase() },
    {
      header: 'Estado',
      render: (i) => (
        <Chip label={CREDITO_ESTADO_LABELS[i.estado]} size="small" color={CREDITO_ESTADO_COLOR[i.estado]} />
      ),
    },
    {
      header: 'Cuota más atrasada',
      render: (i) =>
        i.vence_hoy ? (
          <Chip label="Vence hoy" size="small" color="warning" />
        ) : (
          <Typography variant="body2" sx={{ color: 'error.main' }}>
            {i.dias_atraso} {i.dias_atraso === 1 ? 'día' : 'días'} de atraso
          </Typography>
        ),
    },
    { header: 'Cuotas vencidas', render: (i) => i.cuotas_vencidas },
    {
      header: 'Monto a cobrar sugerido',
      render: (i) =>
        formatMonto(
          i.monto_pago_cuota_sugerido?.total ?? i.monto_refrendo_sugerido?.total ?? i.monto_liquidacion_sugerido?.total ?? '0'
        ),
    },
  ];

  const filteredReporte = (reporte ?? []).filter((i) => !tipoFiltro || i.tipo_credito === tipoFiltro);

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Cobranza diaria
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <FiltrosPanel activeCount={tipoFiltro ? 1 : 0} onClear={() => setTipoFiltro('')}>
            <TextField
              select
              label="Tipo de crédito"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as TipoCredito | '')}
              size="small"
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(TIPO_CREDITO_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </FiltrosPanel>
          <ExportButtons
            exportPdf={getReporteCobranzaDiariaPdf}
            exportExcel={getReporteCobranzaDiariaExcel}
            filename="cobranza-diaria"
          />
        </Stack>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Clientes cuya próxima cuota programada ya venció o vence hoy — aunque el crédito completo todavía no
        haya caído en estado "Vencido". Un cliente con más de un crédito aparece una fila por cada uno.
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={filteredReporte}
        keyExtractor={(i) => i.credito_id}
        isLoading={isLoading}
        emptyMessage="No hay clientes con cuotas vencidas ni por vencer hoy"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />
    </Stack>
  );
}
