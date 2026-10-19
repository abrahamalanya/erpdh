import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, Chip, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { canVerPlanillas, formatPeriodo, PLANILLA_ESTADO_LABEL } from '../utils/planilla';
import {
  getReportePlanilla,
  getReportePlanillaExcel,
  getReportePlanillaPdf,
  listReportePlanillas,
} from '../api/reportes';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ExportButtons } from '../components/ExportButtons';
import { formatFecha, formatMonto, hoyLima } from '../utils/format';
import type { ReportePlanilla, ReportePlanillaResumen, ReportePlanillaTrabajador } from '../types/api';
import { ErrorBanner } from '../components/ErrorBanner';

const etiquetaPlanilla = (p: ReportePlanillaResumen) =>
  `${formatPeriodo(p.periodo)} — ${p.agencia ?? 'Todas las agencias'} (${PLANILLA_ESTADO_LABEL[p.estado]})`;

export function ReportePlanillaPage() {
  const { user } = useAuth();

  const [periodo, setPeriodo] = useState(() => hoyLima().slice(0, 7));
  const [planillas, setPlanillas] = useState<ReportePlanillaResumen[]>([]);
  const [planillaId, setPlanillaId] = useState<number | ''>('');

  const [reporte, setReporte] = useState<ReportePlanilla | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
    listReportePlanillas(periodo || undefined)
      .then((res) => {
        setPlanillas(res.data);
        setPlanillaId(res.data[0]?.id ?? '');
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'));
  }, [periodo]);

  useEffect(() => {
    if (!planillaId) {
      setReporte(null);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    getReportePlanilla(planillaId)
      .then((res) => setReporte(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [planillaId]);

  if (!canVerPlanillas(user)) {
    return <Navigate to="/" replace />;
  }

  const columns: DataTableColumn<ReportePlanillaTrabajador>[] = [
    { header: 'Doc. Tipo', render: (t) => t.tipo_documento },
    { header: 'Doc. Número', render: (t) => t.numero_documento },
    { header: 'Apellidos', render: (t) => t.apellidos },
    { header: 'Nombres', render: (t) => t.nombres },
    { header: 'Sit.', render: (t) => t.situacion },
    { header: 'Ingresos devengado', align: 'right', render: (t) => formatMonto(t.ingresos_devengado) },
    { header: 'Ingresos pagado', align: 'right', render: (t) => formatMonto(t.ingresos_pagado) },
    { header: 'Descuentos', align: 'right', render: (t) => formatMonto(t.descuentos) },
    { header: 'Tributos y aportes del trabajador', align: 'right', render: (t) => formatMonto(t.tributos_trabajador) },
    { header: 'Neto a pagar', align: 'right', render: (t) => formatMonto(t.neto) },
    { header: 'Tributos y aportes del empleador', align: 'right', render: (t) => formatMonto(t.aportes_empleador) },
  ];

  const totales: [string, string][] = reporte
    ? [
        ['Ingresos devengado', reporte.totales.ingresos_devengado],
        ['Ingresos pagado', reporte.totales.ingresos_pagado],
        ['Descuentos', reporte.totales.descuentos],
        ['Tributos trabajador', reporte.totales.tributos_trabajador],
        ['Neto a pagar', reporte.totales.neto],
        ['Aportes empleador', reporte.totales.aportes_empleador],
      ]
    : [];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Planilla de sueldos
        </Typography>
        {reporte && (
          <ExportButtons
            exportPdf={() => getReportePlanillaPdf(reporte.planilla_id)}
            exportExcel={() => getReportePlanillaExcel(reporte.planilla_id)}
            filename={`planilla-${reporte.periodo}`}
          />
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Periodo"
          type="month"
          slotProps={{ inputLabel: { shrink: true } }}
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <TextField
          select
          label="Planilla"
          value={planillaId}
          onChange={(e) => setPlanillaId(e.target.value ? Number(e.target.value) : '')}
          disabled={planillas.length === 0}
          fullWidth
        >
          {planillas.length === 0 && <MenuItem value="">Sin planillas en este periodo</MenuItem>}
          {planillas.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {etiquetaPlanilla(p)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <ErrorBanner error={loadError} />

      {reporte && (
        <>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              RUC {reporte.ruc} · {reporte.empleador} · Periodo {reporte.periodo_plame} ·{' '}
              {reporte.agencia ?? 'Todas las agencias'} · Pago: {formatFecha(reporte.fecha_pago)}
            </Typography>
            <Chip
              label={PLANILLA_ESTADO_LABEL[reporte.estado]}
              size="small"
              color={reporte.estado === 'confirmada' ? 'success' : 'default'}
            />
          </Stack>

          <Grid container spacing={2}>
            {totales.map(([label, monto]) => (
              <Grid key={label} size={{ xs: 12, sm: 6, md: 'grow' }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography variant="h6">{formatMonto(monto)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <DataTable
        columns={columns}
        rows={reporte?.trabajadores ?? []}
        keyExtractor={(t) => t.user_id}
        isLoading={isLoading}
        emptyMessage={planillaId ? 'La planilla no tiene trabajadores' : 'Selecciona una planilla'}
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />
    </Stack>
  );
}
