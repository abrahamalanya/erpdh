import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Box, Card, CardContent, Divider, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../theme/ThemeModeContext';
import { hasRole } from '../utils/roles';
import { canVerCajas } from '../utils/cajaHierarchy';
import { getReporteFlujoCaja, getReporteFlujoCajaAnual, getReporteFlujoCajaMensual } from '../api/reportes';
import { listAgencias } from '../api/agencias';
import { AsesorAutocomplete } from '../components/AsesorAutocomplete';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { formatMonto } from '../utils/format';
import type { Agencia, FlujoCajaPorAsesorItem, ReporteFlujoCaja, ReporteFlujoCajaAnual, ReporteFlujoCajaMensual, User } from '../types/api';

const NOMBRES_MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Misma paleta categórica validada (orden fijo) usada en el resto de gráficos del reporte de Cobranza mensual.
const PALETA_CATEGORIAS: Record<'light' | 'dark', string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'],
};

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function mesActual(): string {
  return new Date().toISOString().slice(0, 7);
}

function anioActual(): number {
  return new Date().getFullYear();
}

interface TotalCardProps {
  titulo: string;
  valor: number;
}

function TotalCard({ titulo, valor }: TotalCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">{titulo}</Typography>
        <Typography variant="h6">{formatMonto(valor)}</Typography>
      </CardContent>
    </Card>
  );
}

interface TablaPorAsesorProps {
  titulo: string;
  items: FlujoCajaPorAsesorItem[];
  isLoading: boolean;
}

function TablaPorAsesor({ titulo, items, isLoading }: TablaPorAsesorProps) {
  const total = items.reduce((acc, item) => acc + item.monto, 0);
  const filas = items.length > 0 ? [...items, { asesor_id: -1, asesor_nombre: 'Total', monto: total }] : [];

  const columns: DataTableColumn<FlujoCajaPorAsesorItem>[] = [
    { header: 'Asesor', render: (r) => r.asesor_nombre },
    { header: 'Monto', align: 'right', render: (r) => formatMonto(r.monto) },
  ];

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          {titulo}
        </Typography>
        <DataTable
          columns={columns}
          rows={filas}
          keyExtractor={(r) => r.asesor_id}
          isLoading={isLoading}
          emptyMessage="Sin movimientos"
          page={1}
          lastPage={1}
          onPageChange={() => {}}
          maxHeight={280}
        />
      </CardContent>
    </Card>
  );
}

interface GraficoLinealCategoriasProps {
  dataset: Array<Record<string, number>>;
  ejeDataKey: string;
  formatEje: (valor: number) => string;
  colores: string[];
  isLoading: boolean;
}

function GraficoLinealCategorias({ dataset, ejeDataKey, formatEje, colores, isLoading }: GraficoLinealCategoriasProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        {!isLoading && dataset.length > 0 ? (
          <LineChart
            dataset={dataset}
            height={360}
            xAxis={[{ dataKey: ejeDataKey, scaleType: 'point', valueFormatter: formatEje }]}
            series={[
              { dataKey: 'billetaje', label: 'Billetaje', color: colores[0], valueFormatter: (v: number | null) => formatMonto(v ?? 0) },
              { dataKey: 'ingresos', label: 'Ingresos', color: colores[1], valueFormatter: (v: number | null) => formatMonto(v ?? 0) },
              { dataKey: 'egresos', label: 'Egresos', color: colores[2], valueFormatter: (v: number | null) => formatMonto(v ?? 0) },
              { dataKey: 'cobranza', label: 'Cobranza', color: colores[3], valueFormatter: (v: number | null) => formatMonto(v ?? 0) },
              { dataKey: 'desembolsos', label: 'Desembolsos', color: colores[4], valueFormatter: (v: number | null) => formatMonto(v ?? 0) },
            ]}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            {isLoading ? 'Cargando...' : 'Sin datos para el período seleccionado'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function ReporteFlujoCajaPage() {
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const isAdministradorAgencia = hasRole(user, 'administrador_agencia');

  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [agenciaId, setAgenciaId] = useState<number | ''>('');
  const [asesor, setAsesor] = useState<User | null>(null);

  const [fecha, setFecha] = useState(hoy());
  const [reporte, setReporte] = useState<ReporteFlujoCaja | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mes, setMes] = useState(mesActual());
  const [reporteMensual, setReporteMensual] = useState<ReporteFlujoCajaMensual | null>(null);
  const [isLoadingMensual, setIsLoadingMensual] = useState(true);
  const [errorMensual, setErrorMensual] = useState<string | null>(null);

  const [anio, setAnio] = useState(anioActual());
  const [reporteAnual, setReporteAnual] = useState<ReporteFlujoCajaAnual | null>(null);
  const [isLoadingAnual, setIsLoadingAnual] = useState(true);
  const [errorAnual, setErrorAnual] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdministradorAgencia) {
      listAgencias().then((res) => setAgencias(res.data.data));
    }
  }, [isAdministradorAgencia]);

  function loadReporte() {
    setIsLoading(true);
    setLoadError(null);

    getReporteFlujoCaja(fecha, fecha, agenciaId || undefined, asesor?.id)
      .then((res) => setReporte(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  function loadReporteMensual() {
    setIsLoadingMensual(true);
    setErrorMensual(null);

    getReporteFlujoCajaMensual(mes, agenciaId || undefined, asesor?.id)
      .then((res) => setReporteMensual(res.data))
      .catch((err) => setErrorMensual(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoadingMensual(false));
  }

  function loadReporteAnual() {
    setIsLoadingAnual(true);
    setErrorAnual(null);

    getReporteFlujoCajaAnual(anio, agenciaId || undefined, asesor?.id)
      .then((res) => setReporteAnual(res.data))
      .catch((err) => setErrorAnual(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoadingAnual(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReporte, [fecha, agenciaId, asesor]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReporteMensual, [mes, agenciaId, asesor]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReporteAnual, [anio, agenciaId, asesor]);

  if (!canVerCajas(user)) {
    return <Navigate to="/" replace />;
  }

  const colores = PALETA_CATEGORIAS[mode];
  const totales = reporte?.totales ?? { billetaje: 0, ingresos: 0, egresos: 0, cobranza: 0, desembolsos: 0 };
  const porAsesor = reporte?.porAsesor ?? { billetaje: [], ingresos: [], egresos: [], cobranza: [], desembolsos: [] };

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Flujo de caja
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {!isAdministradorAgencia && (
          <TextField
            select
            label="Agencia"
            value={agenciaId}
            onChange={(e) => setAgenciaId(e.target.value ? Number(e.target.value) : '')}
            sx={{ flex: 1 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {agencias.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.nombre.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Box sx={{ flex: 1 }}>
          <AsesorAutocomplete value={asesor} onChange={setAsesor} />
        </Box>
        <TextField
          label="Fecha"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          sx={{ flex: 1 }}
        />
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TotalCard titulo="Saldo de caja" valor={reporte?.saldo_caja ?? 0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TotalCard titulo="Billetaje" valor={totales.billetaje} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TotalCard titulo="Ingresos" valor={totales.ingresos} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TotalCard titulo="Egresos" valor={totales.egresos} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TotalCard titulo="Cobranza" valor={totales.cobranza} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TotalCard titulo="Desembolsos" valor={totales.desembolsos} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TablaPorAsesor titulo="Billetaje" items={porAsesor.billetaje} isLoading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TablaPorAsesor titulo="Ingresos" items={porAsesor.ingresos} isLoading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TablaPorAsesor titulo="Egresos" items={porAsesor.egresos} isLoading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TablaPorAsesor titulo="Cobranza" items={porAsesor.cobranza} isLoading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TablaPorAsesor titulo="Desembolsos" items={porAsesor.desembolsos} isLoading={isLoading} />
        </Grid>
      </Grid>

      <Divider />

      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Resumen mensual
      </Typography>

      {errorMensual && <Alert severity="error">{errorMensual}</Alert>}

      <TextField
        label="Mes"
        type="month"
        slotProps={{ inputLabel: { shrink: true } }}
        value={mes}
        onChange={(e) => setMes(e.target.value)}
        sx={{ maxWidth: 240 }}
      />

      <GraficoLinealCategorias
        dataset={reporteMensual?.porDia ?? []}
        ejeDataKey="dia"
        formatEje={(dia) => `Día ${dia}`}
        colores={colores}
        isLoading={isLoadingMensual}
      />

      <Divider />

      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Resumen anual
      </Typography>

      {errorAnual && <Alert severity="error">{errorAnual}</Alert>}

      <TextField
        label="Año"
        type="number"
        value={anio}
        onChange={(e) => setAnio(e.target.value ? Number(e.target.value) : anioActual())}
        sx={{ maxWidth: 160 }}
      />

      <GraficoLinealCategorias
        dataset={reporteAnual?.porMes ?? []}
        ejeDataKey="mes"
        formatEje={(mesNum) => NOMBRES_MES[mesNum - 1]}
        colores={colores}
        isLoading={isLoadingAnual}
      />
    </Stack>
  );
}
