import { ErrorBanner } from '../components/ErrorBanner';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Card, CardContent, CircularProgress, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { canVerCajas } from '../utils/cajaHierarchy';
import { canVerPlanillas } from '../utils/planilla';
import {
  getReporteIngresosEgresos,
  getReporteIngresosEgresosExcel,
  getReporteIngresosEgresosPdf,
} from '../api/reportes';
import { listAgencias } from '../api/agencias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ExportButtons } from '../components/ExportButtons';
import { formatFecha, formatMonto, hoyLima } from '../utils/format';
import type { Agencia, IngresosEgresosFila, IngresosEgresosSeccion, ReporteIngresosEgresos } from '../types/api';

/** Montos negativos (venta a pérdida, pérdida neta) en rojo. Comparar no es aritmética: el valor es el del backend. */
const colorMonto = (monto: string) => (Number(monto) < 0 ? 'error.main' : undefined);

const columns: DataTableColumn<IngresosEgresosFila>[] = [
  { header: 'Cuenta', render: (f) => f.cuenta },
  { header: 'Fecha', render: (f) => (f.fecha === '—' ? '—' : formatFecha(f.fecha)) },
  { header: 'Descripción', render: (f) => f.descripcion },
  { header: 'Comprobante', render: (f) => (f.serie && f.numero ? `${f.serie}-${f.numero}` : '—') },
  {
    header: 'Monto',
    align: 'right',
    render: (f) => (
      <Typography component="span" variant="body2" sx={{ color: colorMonto(f.monto) }}>
        {formatMonto(f.monto)}
      </Typography>
    ),
  },
];

interface SeccionProps {
  titulo: string;
  subtitulo?: string;
  seccion: IngresosEgresosSeccion;
}

function Seccion({ titulo, subtitulo, seccion }: SeccionProps) {
  // Las filas no traen id y dos pueden ser idénticas: la key es su posición.
  const posicion = new Map(seccion.filas.map((f, i) => [f, i]));

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1, gap: 2 }}>
          <Stack>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {titulo}
            </Typography>
            {subtitulo && (
              <Typography variant="caption" color="text.secondary">
                {subtitulo}
              </Typography>
            )}
          </Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: colorMonto(seccion.total) }}>
            {formatMonto(seccion.total)}
          </Typography>
        </Stack>
        <DataTable
          columns={columns}
          rows={seccion.filas}
          keyExtractor={(f) => posicion.get(f) ?? 0}
          isLoading={false}
          emptyMessage="Sin movimientos"
          page={1}
          lastPage={1}
          onPageChange={() => {}}
          maxHeight={320}
        />
      </CardContent>
    </Card>
  );
}

function ResumenCard({ titulo, valor, color }: { titulo: string; valor: string; color?: string }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {titulo}
        </Typography>
        <Typography variant="h6" sx={{ color }}>
          {valor}
        </Typography>
      </CardContent>
    </Card>
  );
}

function formatMargen(margen: number | null): string {
  return margen === null ? '—' : `${(margen * 100).toFixed(2)} %`;
}

/**
 * Estado de resultados del periodo: ganancias (ingresos, cobranzas, ventas)
 * contra gastos (egresos). Todos los importes, totales y el margen los calcula
 * el backend; el alcance por rol también.
 */
export function ReporteIngresosEgresosPage() {
  const { user } = useAuth();
  // Solo quien ve más de una agencia elige; el adm. de agencia y el asesor quedan fijados por el backend.
  const puedeElegirAgencia = hasRole(user, 'sistemas', 'administrador_general', 'secretaria');

  const [desde, setDesde] = useState(() => `${hoyLima().slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoyLima);
  const [agenciaId, setAgenciaId] = useState<number | ''>('');
  const [agencias, setAgencias] = useState<Agencia[]>([]);

  const [reporte, setReporte] = useState<ReporteIngresosEgresos | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // El backend responde 422 si hasta < desde; se frena acá para no gastar el request.
  const rangoInvalido = Boolean(desde && hasta && hasta < desde);

  useEffect(() => {
    if (puedeElegirAgencia) {
      listAgencias().then((res) => setAgencias(res.data.data));
    }
  }, [puedeElegirAgencia]);

  useEffect(() => {
    if (rangoInvalido) {
      setReporte(null);
      setLoadError('La fecha de fin no puede ser anterior a la de inicio');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    getReporteIngresosEgresos(desde || undefined, hasta || undefined, agenciaId || undefined)
      .then((res) => setReporte(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [desde, hasta, agenciaId, rangoInvalido]);

  if (!canVerCajas(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ingresos y Egresos
        </Typography>
        {!rangoInvalido && (
          <ExportButtons
            exportPdf={() => getReporteIngresosEgresosPdf(desde || undefined, hasta || undefined, agenciaId || undefined)}
            exportExcel={() =>
              getReporteIngresosEgresosExcel(desde || undefined, hasta || undefined, agenciaId || undefined)
            }
            filename="ingresos-egresos"
          />
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Desde"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          fullWidth
        />
        <TextField
          label="Hasta"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          fullWidth
        />
        {puedeElegirAgencia && (
          <TextField
            select
            label="Agencia"
            value={agenciaId}
            onChange={(e) => setAgenciaId(e.target.value ? Number(e.target.value) : '')}
            fullWidth
          >
            <MenuItem value="">Todas</MenuItem>
            {agencias.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.nombre.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>

      <ErrorBanner error={loadError} />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="inherit" />
        </Box>
      ) : (
        reporte && (
          <>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Ingresos
            </Typography>
            <Seccion titulo="Ingresos" seccion={reporte.ingresos} />
            <Seccion titulo="Cobranzas" subtitulo="Interés + mora de créditos cancelados" seccion={reporte.cobranzas} />
            <Seccion titulo="Ventas" subtitulo="Ganancia: precio − capital" seccion={reporte.ventas} />

            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Egresos
            </Typography>
            <Seccion titulo="Egresos" seccion={reporte.egresos} />
            {/* Sin permiso de planillas (asesor, supervisor) el backend la manda vacía: no se muestra. */}
            {canVerPlanillas(user) && (
              <Seccion
                titulo="Planilla (neto a pagar)"
                subtitulo="Planillas confirmadas con fecha de pago en el rango"
                seccion={reporte.planilla}
              />
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <ResumenCard titulo="Total ingresos" valor={formatMonto(reporte.totales.total_ingresos)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <ResumenCard titulo="Total egresos" valor={formatMonto(reporte.totales.total_egresos)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <ResumenCard
                  titulo={Number(reporte.utilidad_neta) < 0 ? 'Pérdida neta' : 'Utilidad neta'}
                  valor={formatMonto(reporte.utilidad_neta)}
                  color={colorMonto(reporte.utilidad_neta)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <ResumenCard
                  titulo="Margen de utilidad bruta"
                  valor={formatMargen(reporte.margen_utilidad_bruta)}
                  color={
                    reporte.margen_utilidad_bruta !== null && reporte.margen_utilidad_bruta < 0 ? 'error.main' : undefined
                  }
                />
              </Grid>
            </Grid>
          </>
        )
      )}
    </Stack>
  );
}
