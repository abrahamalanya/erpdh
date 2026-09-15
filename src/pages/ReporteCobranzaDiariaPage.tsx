import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { canVerCreditos, CREDITO_ESTADO_LABELS, CREDITO_ESTADO_COLOR, TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import { getReporteCobranzaDiaria } from '../api/reportes';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { formatMonto } from '../utils/format';
import type { CobranzaDiariaItem } from '../types/api';

export function ReporteCobranzaDiariaPage() {
  const { user } = useAuth();

  const [reporte, setReporte] = useState<CobranzaDiariaItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Cobranza diaria
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Clientes cuya próxima cuota programada ya venció o vence hoy — aunque el crédito completo todavía no
        haya caído en estado "Vencido". Un cliente con más de un crédito aparece una fila por cada uno.
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={reporte ?? []}
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
