import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Box, Card, CardContent, Divider, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../theme/ThemeModeContext';
import { hasRole } from '../utils/roles';
import { getReporteCobranzaAnual, getReporteCobranzaMensual } from '../api/reportes';
import { listEmpresas } from '../api/empresas';
import { listAgencias } from '../api/agencias';
import { AsesorAutocomplete } from '../components/AsesorAutocomplete';
import { formatMonto } from '../utils/format';
import type { Agencia, Empresa, ReporteCobranzaAnual, ReporteCobranzaMensual, User } from '../types/api';

const NOMBRES_MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Paleta categórica validada (identidad, orden fijo, nunca ciclada) — 5
// slots alcanzan porque el pastel se trunca a 5 asesores + "Otros".
const PALETA_ASESORES: Record<'light' | 'dark', string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'],
};
const COLOR_OTROS: Record<'light' | 'dark', string> = { light: '#898781', dark: '#898781' };
const MAX_ASESORES_EN_PASTEL = 5;

function mesActual(): string {
  return new Date().toISOString().slice(0, 7);
}

function anioActual(): number {
  return new Date().getFullYear();
}

interface GraficoTotalProps {
  titulo: string;
  subtitulo: string;
  etiquetas: string[];
  valores: number[];
  isLoading: boolean;
  layout?: 'horizontal';
}

function GraficoTotal({ titulo, subtitulo, etiquetas, valores, isLoading, layout }: GraficoTotalProps) {
  const total = valores.reduce((acc, v) => acc + v, 0);
  const eje = { scaleType: 'band' as const, data: etiquetas };
  const series = [{ data: valores, label: titulo, valueFormatter: (v: number | null) => formatMonto(v ?? 0) }];

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">{subtitulo}</Typography>
          <Typography variant="h6">{formatMonto(total)}</Typography>
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          {!isLoading && etiquetas.length > 0 ? (
            <BarChart
              layout={layout}
              height={layout === 'horizontal' ? Math.max(400, etiquetas.length * 24) : 320}
              {...(layout === 'horizontal' ? { yAxis: [eje] } : { xAxis: [eje] })}
              series={series}
              margin={{ left: 80 }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {isLoading ? 'Cargando...' : 'Sin datos para el período seleccionado'}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

interface AsesorTotal {
  id: number;
  nombre: string;
  total: number;
}

interface GraficoPastelAsesoresProps {
  titulo: string;
  items: AsesorTotal[];
  isLoading: boolean;
  mode: 'light' | 'dark';
}

/**
 * Comparación entre asesores. Se trunca a los MAX_ASESORES_EN_PASTEL con
 * mayor total (orden desc) y el resto se agrupa en "Otros" con un gris
 * neutro — ni tabla legible ni paleta categórica sirven de un vistazo con
 * más de ~6 porciones (guía dataviz: part-to-whole, <=6 segmentos).
 */
function GraficoPastelAsesores({ titulo, items, isLoading, mode }: GraficoPastelAsesoresProps) {
  const ordenado = [...items].filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  const principales = ordenado.slice(0, MAX_ASESORES_EN_PASTEL);
  const resto = ordenado.slice(MAX_ASESORES_EN_PASTEL);
  const colores = PALETA_ASESORES[mode];

  const data = principales.map((item, i) => ({ id: item.id, value: item.total, label: item.nombre, color: colores[i] }));
  if (resto.length > 0) {
    data.push({ id: -1, value: resto.reduce((acc, item) => acc + item.total, 0), label: 'Otros', color: COLOR_OTROS[mode] });
  }

  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {titulo}
        </Typography>
        {!isLoading && data.length > 0 ? (
          <PieChart
            series={[
              {
                data,
                paddingAngle: 1,
                cornerRadius: 4,
                arcLabel: (item) => `${Math.round((item.value / total) * 100)}%`,
                arcLabelMinAngle: 20,
                valueFormatter: (item) => formatMonto(item.value),
              },
            ]}
            height={320}
            sx={{ '& .MuiPieArcLabel-root': { fill: '#fff', fontWeight: 600, fontSize: 12 } }}
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

function aTotalesAsesor<T extends { asesor_id: number; asesor_nombre: string }>(
  items: T[],
  campoTotal: (item: T) => number
): AsesorTotal[] {
  return items.map((item) => ({ id: item.asesor_id, nombre: item.asesor_nombre, total: campoTotal(item) }));
}

export function ReporteCobranzaMensualPage() {
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const isSistemas = hasRole(user, 'sistemas');

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<number | ''>('');
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [agenciaId, setAgenciaId] = useState<number | ''>('');
  const [asesor, setAsesor] = useState<User | null>(null);

  const [mes, setMes] = useState(mesActual());
  const [reporteMensual, setReporteMensual] = useState<ReporteCobranzaMensual | null>(null);
  const [isLoadingMensual, setIsLoadingMensual] = useState(true);
  const [errorMensual, setErrorMensual] = useState<string | null>(null);

  const [anio, setAnio] = useState(anioActual());
  const [reporteAnual, setReporteAnual] = useState<ReporteCobranzaAnual | null>(null);
  const [isLoadingAnual, setIsLoadingAnual] = useState(true);
  const [errorAnual, setErrorAnual] = useState<string | null>(null);

  useEffect(() => {
    if (isSistemas) {
      listEmpresas().then((res) => setEmpresas(res.data.data));
    }
    listAgencias().then((res) => setAgencias(res.data.data));
  }, [isSistemas]);

  function loadReporteMensual() {
    setIsLoadingMensual(true);
    setErrorMensual(null);

    getReporteCobranzaMensual(mes, empresaId || undefined, agenciaId || undefined, asesor?.id)
      .then((res) => setReporteMensual(res.data))
      .catch((err) => setErrorMensual(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoadingMensual(false));
  }

  function loadReporteAnual() {
    setIsLoadingAnual(true);
    setErrorAnual(null);

    getReporteCobranzaAnual(anio, empresaId || undefined, agenciaId || undefined, asesor?.id)
      .then((res) => setReporteAnual(res.data))
      .catch((err) => setErrorAnual(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoadingAnual(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReporteMensual, [mes, empresaId, agenciaId, asesor]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReporteAnual, [anio, empresaId, agenciaId, asesor]);

  if (!hasRole(user, 'sistemas', 'administrador_general')) {
    return <Navigate to="/" replace />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Cobranza y Desembolso mensual
      </Typography>

      <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
        {isSistemas && (
          <TextField
            select
            label="Empresa"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value ? Number(e.target.value) : '')}
            sx={{ width: 240, flexShrink: 0 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {empresas.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.nombre.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          select
          label="Agencia"
          value={agenciaId}
          onChange={(e) => setAgenciaId(e.target.value ? Number(e.target.value) : '')}
          sx={{ width: 240, flexShrink: 0 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {agencias.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.nombre.toUpperCase()}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ width: 240, flexShrink: 0 }}>
          <AsesorAutocomplete value={asesor} onChange={setAsesor} />
        </Box>
        <TextField
          label="Mes"
          type="month"
          slotProps={{ inputLabel: { shrink: true } }}
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          sx={{ width: 240, flexShrink: 0 }}
        />
      </Stack>

      {errorMensual && <Alert severity="error">{errorMensual}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <GraficoTotal
            titulo="Cobranza"
            subtitulo="Total cobrado en el mes"
            etiquetas={(reporteMensual?.cobranza ?? []).map((item) => `Día ${item.dia}`)}
            valores={(reporteMensual?.cobranza ?? []).map((item) => item.total_cobrado)}
            isLoading={isLoadingMensual}
            layout="horizontal"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <GraficoTotal
            titulo="Desembolsos"
            subtitulo="Total desembolsado en el mes"
            etiquetas={(reporteMensual?.desembolsos ?? []).map((item) => `Día ${item.dia}`)}
            valores={(reporteMensual?.desembolsos ?? []).map((item) => item.total_desembolsado)}
            isLoading={isLoadingMensual}
            layout="horizontal"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <GraficoPastelAsesores
            titulo="Cobranza por asesor (mes)"
            items={aTotalesAsesor(reporteMensual?.cobranzaPorAsesor ?? [], (item) => item.total_cobrado)}
            isLoading={isLoadingMensual}
            mode={mode}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <GraficoPastelAsesores
            titulo="Desembolsos por asesor (mes)"
            items={aTotalesAsesor(reporteMensual?.desembolsosPorAsesor ?? [], (item) => item.total_desembolsado)}
            isLoading={isLoadingMensual}
            mode={mode}
          />
        </Grid>
      </Grid>

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

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <GraficoTotal
            titulo="Cobranza"
            subtitulo="Total cobrado en el año"
            etiquetas={(reporteAnual?.cobranza ?? []).map((item) => NOMBRES_MES[item.mes - 1])}
            valores={(reporteAnual?.cobranza ?? []).map((item) => item.total_cobrado)}
            isLoading={isLoadingAnual}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <GraficoTotal
            titulo="Desembolsos"
            subtitulo="Total desembolsado en el año"
            etiquetas={(reporteAnual?.desembolsos ?? []).map((item) => NOMBRES_MES[item.mes - 1])}
            valores={(reporteAnual?.desembolsos ?? []).map((item) => item.total_desembolsado)}
            isLoading={isLoadingAnual}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <GraficoPastelAsesores
            titulo="Cobranza por asesor (año)"
            items={aTotalesAsesor(reporteAnual?.cobranzaPorAsesor ?? [], (item) => item.total_cobrado)}
            isLoading={isLoadingAnual}
            mode={mode}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <GraficoPastelAsesores
            titulo="Desembolsos por asesor (año)"
            items={aTotalesAsesor(reporteAnual?.desembolsosPorAsesor ?? [], (item) => item.total_desembolsado)}
            isLoading={isLoadingAnual}
            mode={mode}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
