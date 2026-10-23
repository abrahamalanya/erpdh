import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { darken, lighten } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { BarChart } from '@mui/x-charts/BarChart';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../theme/ThemeModeContext';
import { hasRole } from '../utils/roles';
import { TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import {
  getDashboardGrafico,
  getDashboardResumen,
  type DashboardAgrupacion,
  type DashboardGrafico,
  type DashboardGraficoFilaAgenciaTipo,
  type DashboardResumen,
  type DashboardTipoFiltro,
} from '../api/dashboard';
import { getAsesoresRuta, type AsesorRuta } from '../api/rutasCobranza';
import { listAgencias } from '../api/agencias';
import { FiltrosPanel } from './FiltrosPanel';
import { PALETA_CATEGORIAS } from '../utils/charts';
import { formatFecha, formatMonto } from '../utils/format';
import type { Agencia, TipoCredito } from '../types/api';
import { ErrorBanner } from './ErrorBanner';

interface FiltrosResumen {
  agencia_id?: number;
  asesor_id?: number;
  tipo_credito?: DashboardTipoFiltro;
}

const emptyFiltros: FiltrosResumen = {};

/** Opciones del filtro de tipo: los créditos más las ventas de tienda. */
const TIPOS_FILTRO: Array<{ value: DashboardTipoFiltro; label: string }> = [
  ...(Object.entries(TIPO_CREDITO_LABELS) as Array<[TipoCredito, string]>).map(([value, label]) => ({
    value: value as DashboardTipoFiltro,
    label,
  })),
  { value: 'ventas', label: 'Ventas de tienda' },
];

/** Etiqueta corta de cada tipo (créditos + ventas), para los ejes y leyendas del gráfico comparativo. */
const TIPO_LABELS: Record<DashboardTipoFiltro, string> = TIPOS_FILTRO.reduce(
  (acc, { value, label }) => ({ ...acc, [value]: label }),
  {} as Record<DashboardTipoFiltro, string>
);

const OPCIONES_AGRUPACION: Array<{ value: DashboardAgrupacion; label: string }> = [
  { value: 'agencia', label: 'Agencia' },
  { value: 'asesor', label: 'Asesor' },
  { value: 'tipo_credito', label: 'Tipo de crédito' },
  { value: 'agencia_tipo_credito', label: 'Agencia y tipo' },
];

/**
 * Un matiz distinto por tipo de crédito sobre el mismo color de la operación
 * (cobranza o desembolso): el hue sigue significando la operación en todos
 * los modos (igual que hoy) y el matiz distingue el tipo dentro del desglose
 * "Agencia y tipo". Factores fijos (ni 0 en los extremos, para que ningún
 * matiz quede igual al color base salvo el del medio) y siempre los mismos
 * para un tipo dado, sin importar cuántos haya en una agencia concreta.
 */
const FACTORES_TIPO = [-0.22, -0.1, 0, 0.2, 0.4];

function matizTipo(base: string, indice: number): string {
  const factor = FACTORES_TIPO[indice % FACTORES_TIPO.length];

  if (factor === 0) return base;

  return factor > 0 ? lighten(base, factor) : darken(base, Math.abs(factor));
}

interface TotalCardProps {
  titulo: string;
  total: number;
  cantidad: number;
  color: string;
  icono: React.ReactNode;
}

/** Una magnitud del día: importe arriba, número de operaciones como contexto. */
function TotalCard({ titulo, total, cantidad, color, icono }: TotalCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <span style={{ color, display: 'inline-flex' }}>{icono}</span>
          <Typography variant="body2" color="text.secondary">
            {titulo}
          </Typography>
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {formatMonto(total)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {cantidad === 1 ? '1 operación' : `${cantidad} operaciones`}
        </Typography>
      </CardContent>
    </Card>
  );
}

interface ComparativoChartProps {
  grafico: DashboardGrafico | null;
  isLoading: boolean;
  error: string | null;
  agruparPor: DashboardAgrupacion;
  onAgruparPorChange: (modo: DashboardAgrupacion) => void;
  colorCobranza: string;
  colorDesembolso: string;
}

/**
 * Comparación de cobranza y desembolso del día, con un selector de
 * agrupación (agencia / asesor / tipo de crédito / agencia y tipo) que decide
 * cómo se arma el gráfico — "agencia" es el default, para no cambiar lo que
 * los usuarios ya conocían. No es un filtro (no acota el ámbito, ya cubierto
 * por FiltrosPanel): es el modo de visualización, así que vive fuera de él.
 */
function ComparativoChart({
  grafico,
  isLoading,
  error,
  agruparPor,
  onAgruparPorChange,
  colorCobranza,
  colorDesembolso,
}: ComparativoChartProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}
        >
          <Typography variant="subtitle2">Cobranza vs. desembolso</Typography>

          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            value={agruparPor}
            onChange={(_, v: DashboardAgrupacion | null) => v && onAgruparPorChange(v)}
          >
            {OPCIONES_AGRUPACION.map((op) => (
              <ToggleButton key={op.value} value={op.value}>
                {op.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <ErrorBanner error={error} />

        {isLoading && !grafico ? (
          <Stack sx={{ alignItems: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <ComparativoChartBody grafico={grafico} colorCobranza={colorCobranza} colorDesembolso={colorDesembolso} />
        )}
      </CardContent>
    </Card>
  );
}

function SinMovimiento() {
  return (
    <Typography variant="body2" color="text.secondary">
      No hubo cobranzas ni desembolsos con estos filtros.
    </Typography>
  );
}

function ComparativoChartBody({
  grafico,
  colorCobranza,
  colorDesembolso,
}: {
  grafico: DashboardGrafico | null;
  colorCobranza: string;
  colorDesembolso: string;
}) {
  if (!grafico) return null;

  if (grafico.agrupado_por === 'agencia_tipo_credito') {
    return <AgenciaTipoChart filas={grafico.filas} colorCobranza={colorCobranza} colorDesembolso={colorDesembolso} />;
  }

  const etiquetas =
    grafico.agrupado_por === 'agencia'
      ? grafico.filas.map((f) => f.agencia_nombre)
      : grafico.agrupado_por === 'asesor'
        ? grafico.filas.map((f) => f.asesor_nombre)
        : grafico.filas.map((f) => TIPO_LABELS[f.tipo_credito]);

  const cobranza = grafico.filas.map((f) => f.cobranza.total);
  const desembolso = grafico.filas.map((f) => f.desembolso.total);
  const sinMovimiento = cobranza.every((v) => v === 0) && desembolso.every((v) => v === 0);

  if (sinMovimiento) {
    return <SinMovimiento />;
  }

  return (
    <BarChart
      layout="horizontal"
      height={Math.max(200, etiquetas.length * 48)}
      xAxis={[{ scaleType: 'linear', valueFormatter: (v: number) => formatMonto(v) }]}
      yAxis={[{ scaleType: 'band', data: etiquetas }]}
      series={[
        {
          label: 'Cobranza',
          data: cobranza,
          color: colorCobranza,
          valueFormatter: (v: number | null) => formatMonto(v ?? 0),
        },
        {
          label: 'Desembolso',
          data: desembolso,
          color: colorDesembolso,
          valueFormatter: (v: number | null) => formatMonto(v ?? 0),
        },
      ]}
      margin={{ left: 140 }}
    />
  );
}

/**
 * Desglose por agencia y tipo de crédito — el modo más importante: por cada
 * agencia, dos barras apiladas (una de cobranza, una de desembolso, con
 * `stack` distinto para que x-charts las dibuje lado a lado) segmentadas por
 * tipo de crédito con un matiz propio (matizTipo) sobre el color de su
 * operación. Así se puede comparar cobranza vs. desembolso por altura total
 * Y, dentro de cada una, de qué tipo viene cada parte.
 */
function AgenciaTipoChart({
  filas,
  colorCobranza,
  colorDesembolso,
}: {
  filas: DashboardGraficoFilaAgenciaTipo[];
  colorCobranza: string;
  colorDesembolso: string;
}) {
  const sinMovimiento = filas.every((f) => f.cobranza.total === 0 && f.desembolso.total === 0);

  if (filas.length === 0 || sinMovimiento) {
    return <SinMovimiento />;
  }

  const etiquetas = filas.map((f) => f.agencia_nombre);
  const tiposOrden = filas[0].tipos.map((t) => t.tipo_credito);

  const series = tiposOrden.flatMap((tipo, i) => [
    {
      id: `cobranza-${tipo}`,
      stack: 'cobranza',
      label: `${TIPO_LABELS[tipo]} — Cobranza`,
      data: filas.map((f) => f.tipos.find((t) => t.tipo_credito === tipo)?.cobranza.total ?? 0),
      color: matizTipo(colorCobranza, i),
      valueFormatter: (v: number | null) => formatMonto(v ?? 0),
    },
    {
      id: `desembolso-${tipo}`,
      stack: 'desembolso',
      label: `${TIPO_LABELS[tipo]} — Desembolso`,
      data: filas.map((f) => f.tipos.find((t) => t.tipo_credito === tipo)?.desembolso.total ?? 0),
      color: matizTipo(colorDesembolso, i),
      valueFormatter: (v: number | null) => formatMonto(v ?? 0),
    },
  ]);

  return (
    <Stack spacing={1.5}>
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: Math.max(480, etiquetas.length * 160) }}>
          <BarChart
            height={360}
            xAxis={[{ scaleType: 'band', data: etiquetas }]}
            yAxis={[{ scaleType: 'linear', valueFormatter: (v: number) => formatMonto(v) }]}
            series={series}
            margin={{ left: 90 }}
            hideLegend
          />
        </Box>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
        <LeyendaOperacion titulo="Cobranza" color={colorCobranza} tipos={tiposOrden} />
        <LeyendaOperacion titulo="Desembolso" color={colorDesembolso} tipos={tiposOrden} />
      </Stack>
    </Stack>
  );
}

function LeyendaOperacion({
  titulo,
  color,
  tipos,
}: {
  titulo: string;
  color: string;
  tipos: DashboardTipoFiltro[];
}) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {titulo}
      </Typography>
      {tipos.map((tipo, i) => (
        <Stack key={tipo} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: matizTipo(color, i), flexShrink: 0 }} />
          <Typography variant="caption">{TIPO_LABELS[tipo]}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

/**
 * Panel de inicio: totales del día de cobranzas y desembolsos, con los filtros
 * opcionales que expone el backend (agencia, asesor, tipo).
 *
 * Los filtros solo recortan —el alcance ya viene acotado por la jerarquía del
 * actor— así que se ocultan cuando no pueden cambiar nada: un
 * administrador_agencia está fijo a su agencia y un asesor solo ve lo suyo, y en
 * ambos casos ofrecer un selector sería mandar un filtro que el backend
 * descarta.
 */
export function DashboardInicial() {
  const { user } = useAuth();
  const { mode } = useThemeMode();

  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosResumen>(emptyFiltros);

  const [agruparPor, setAgruparPor] = useState<DashboardAgrupacion>('agencia');
  const [grafico, setGrafico] = useState<DashboardGrafico | null>(null);
  const [isLoadingGrafico, setIsLoadingGrafico] = useState(true);
  const [errorGrafico, setErrorGrafico] = useState<string | null>(null);

  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [asesores, setAsesores] = useState<AsesorRuta[]>([]);

  // El backend fija estos dos a los del actor, así que el selector no cambiaría
  // el resultado (DashboardService + las jerarquías de cliente/venta).
  const puedeFiltrarAgencia = hasRole(user, 'sistemas', 'administrador_general', 'supervisor');
  // `asesoresVisibles` devuelve vacío para un asesor puro: solo hay algo que
  // elegir si el actor puede ver la operación de otra persona.
  const puedeFiltrarAsesor = !hasRole(user, 'asesor') || hasRole(user, 'sistemas', 'administrador_general');

  function updateFiltros(patch: Partial<FiltrosResumen>) {
    setFiltros((f) => ({ ...f, ...patch }));
  }

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    getDashboardResumen({
      agencia_id: filtros.agencia_id,
      asesor_id: filtros.asesor_id,
      tipo_credito: filtros.tipo_credito,
    })
      .then((res) => {
        if (active) setResumen(res.data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error desconocido');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filtros]);

  useEffect(() => {
    let active = true;

    setIsLoadingGrafico(true);
    setErrorGrafico(null);

    getDashboardGrafico({
      agencia_id: filtros.agencia_id,
      asesor_id: filtros.asesor_id,
      tipo_credito: filtros.tipo_credito,
      agrupar_por: agruparPor,
    })
      .then((res) => {
        if (active) setGrafico(res.data);
      })
      .catch((err) => {
        if (active) setErrorGrafico(err instanceof Error ? err.message : 'Error desconocido');
      })
      .finally(() => {
        if (active) setIsLoadingGrafico(false);
      });

    return () => {
      active = false;
    };
  }, [filtros, agruparPor]);

  useEffect(() => {
    if (puedeFiltrarAgencia) {
      listAgencias().then((res) => setAgencias(res.data.data)).catch(() => setAgencias([]));
    }
  }, [puedeFiltrarAgencia]);

  useEffect(() => {
    if (puedeFiltrarAsesor) {
      getAsesoresRuta().then((res) => setAsesores(res.data)).catch(() => setAsesores([]));
    }
  }, [puedeFiltrarAsesor]);

  const colores = PALETA_CATEGORIAS[mode];
  const colorCobranza = colores[0];
  const colorDesembolso = colores[1];

  const activo = resumen ?? { fecha: '', cobranza: { total: 0, cantidad: 0 }, desembolso: { total: 0, cantidad: 0 }, neto: 0 };
  const filtrosActivos = [filtros.agencia_id, filtros.asesor_id, filtros.tipo_credito].filter(
    (v) => v !== undefined
  ).length;

  const netoPositivo = activo.neto >= 0;

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Resumen de hoy
          {activo.fecha && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {formatFecha(activo.fecha)}
            </Typography>
          )}
        </Typography>

        <FiltrosPanel activeCount={filtrosActivos} onClear={() => setFiltros(emptyFiltros)}>
          {puedeFiltrarAgencia && (
            <TextField
              select
              label="Agencia"
              value={filtros.agencia_id ?? ''}
              onChange={(e) =>
                updateFiltros({ agencia_id: e.target.value ? Number(e.target.value) : undefined })
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Todas</MenuItem>
              {agencias.map((agencia) => (
                <MenuItem key={agencia.id} value={agencia.id}>
                  {agencia.nombre.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
          )}
          {puedeFiltrarAsesor && (
            <TextField
              select
              label="Asesor"
              value={filtros.asesor_id ?? ''}
              onChange={(e) =>
                updateFiltros({ asesor_id: e.target.value ? Number(e.target.value) : undefined })
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              {asesores.map((asesor) => (
                <MenuItem key={asesor.id} value={asesor.id}>
                  {`${asesor.nombre} ${asesor.apellido}`.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select
            label="Tipo"
            value={filtros.tipo_credito ?? ''}
            onChange={(e) =>
              updateFiltros({
                tipo_credito: (e.target.value || undefined) as DashboardTipoFiltro | undefined,
              })
            }
            size="small"
            fullWidth
            helperText="Las ventas de tienda no se desembolsan, así que su total es 0"
          >
            <MenuItem value="">Todos</MenuItem>
            {TIPOS_FILTRO.map((tipo) => (
              <MenuItem key={tipo.value} value={tipo.value}>
                {tipo.label}
              </MenuItem>
            ))}
          </TextField>
        </FiltrosPanel>
      </Stack>

      <ErrorBanner error={error} />

      {isLoading && !resumen ? (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TotalCard
                titulo="Cobranza"
                total={activo.cobranza.total}
                cantidad={activo.cobranza.cantidad}
                color={colorCobranza}
                icono={<TrendingUpIcon />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TotalCard
                titulo="Desembolso"
                total={activo.desembolso.total}
                cantidad={activo.desembolso.cantidad}
                color={colorDesembolso}
                icono={<TrendingDownIcon />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                    <span
                      style={{
                        color: netoPositivo ? colorCobranza : colorDesembolso,
                        display: 'inline-flex',
                      }}
                    >
                      <AccountBalanceWalletIcon />
                    </span>
                    <Typography variant="body2" color="text.secondary">
                      Neto del día
                    </Typography>
                  </Stack>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: netoPositivo ? 'success.main' : 'error.main',
                    }}
                  >
                    {formatMonto(activo.neto)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {netoPositivo
                      ? 'Entró más de lo que salió'
                      : 'Salió más de lo que entró'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <ComparativoChart
            grafico={grafico}
            isLoading={isLoadingGrafico}
            error={errorGrafico}
            agruparPor={agruparPor}
            onAgruparPorChange={setAgruparPor}
            colorCobranza={colorCobranza}
            colorDesembolso={colorDesembolso}
          />
        </>
      )}
    </Stack>
  );
}
