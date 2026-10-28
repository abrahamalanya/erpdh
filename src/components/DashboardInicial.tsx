import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Grid,
  LinearProgress,
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
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import SavingsIcon from '@mui/icons-material/Savings';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { BarChart } from '@mui/x-charts/BarChart';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../theme/ThemeModeContext';
import { hasRole } from '../utils/roles';
import { perfilPermite, perfilPermiteRuta } from '../utils/perfilAcceso';
import { canVerBilletajes } from '../utils/cajaHierarchy';
import { TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import {
  getDashboardAvanceCobranzaHoy,
  getDashboardCarteraActivaPorTipo,
  getDashboardGrafico,
  getDashboardProduccionPorAsesor,
  getDashboardResumen,
  type DashboardAgrupacion,
  type DashboardAvanceAsesor,
  type DashboardAvanceCobranza,
  type DashboardCartera,
  type DashboardFiltrosNavegacion,
  type DashboardGrafico,
  type DashboardGraficoFilaAgenciaTipo,
  type DashboardProduccion,
  type DashboardProduccionAsesor,
  type DashboardResumen,
  type DashboardTipoFiltro,
} from '../api/dashboard';
import { getAsesoresRuta, type AsesorRuta } from '../api/rutasCobranza';
import { listAgencias } from '../api/agencias';
import { FiltrosPanel } from './FiltrosPanel';
import { PALETA_CATEGORIAS } from '../utils/charts';
import { formatFecha, formatMonto, hoyLima } from '../utils/format';
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
  /** Si viene, la tarjeta es un acceso rápido al módulo correspondiente. */
  onClick?: () => void;
}

/**
 * Una magnitud del período: importe arriba, número de operaciones como
 * contexto. Con `onClick` es además un acceso rápido al módulo que la
 * explica (Cobranza → /cobros, etc.) — el propio contenido no cambia según
 * sea clicable o no, solo se envuelve en un `CardActionArea`.
 */
function TotalCard({ titulo, total, cantidad, color, icono, onClick }: TotalCardProps) {
  const contenido = (
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
  );

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      {onClick ? <CardActionArea onClick={onClick} sx={{ height: '100%' }}>{contenido}</CardActionArea> : contenido}
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

/**
 * Créditos generados (= efectivamente desembolsados) por asesor y tipo de
 * crédito, en el período del filtro global del dashboard (desde/hasta) — ya
 * no tiene su propio selector de fechas: usa el mismo rango que el resto de
 * Inicio, igual que pide la sección 1 ("no quiero que cada gráfico tenga sus
 * propios filtros independientes cuando pueda usar los globales"). Barras
 * horizontales apiladas (un solo `stack` para las 4 series de tipo), una por
 * asesor, ordenadas por total desc (ya viene así del backend). Mismo matiz
 * por tipo que CarteraActivaChart, para que "este matiz = este tipo" sea
 * consistente en toda la página.
 */
function ProduccionPorAsesorChart({
  produccion,
  isLoading,
  error,
  colorBase,
}: {
  produccion: DashboardProduccion | null;
  isLoading: boolean;
  error: string | null;
  colorBase: string;
}) {
  const filas = produccion?.filas ?? [];

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Créditos generados por asesor
        </Typography>

        <ErrorBanner error={error} />

        {isLoading && !produccion ? (
          <Stack sx={{ alignItems: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : filas.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hubo créditos generados en este período con estos filtros.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            <Box sx={{ overflowX: 'auto' }}>
              <ProduccionBarChart filas={filas} colorBase={colorBase} />
            </Box>

            <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
              {filas[0].tipos.map((t, i) => (
                <Stack key={t.tipo_credito} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: matizTipo(colorBase, i) }} />
                  <Typography variant="caption">{TIPO_LABELS[t.tipo_credito]}</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Cada etiqueta del eje ya lleva el total del asesor entre paréntesis — es
 * la forma más simple de cumplir "al final de cada barra se muestra el
 * total" sin montar una capa de texto superpuesta sobre el SVG del gráfico.
 */
function ProduccionBarChart({ filas, colorBase }: { filas: DashboardProduccionAsesor[]; colorBase: string }) {
  const etiquetas = filas.map((f) => `${f.asesor_nombre} (${formatMonto(f.total)})`);
  const tiposOrden = filas[0].tipos.map((t) => t.tipo_credito);

  const series = tiposOrden.map((tipo, i) => ({
    id: `produccion-${tipo}`,
    stack: 'produccion',
    label: TIPO_LABELS[tipo],
    data: filas.map((f) => f.tipos.find((t) => t.tipo_credito === tipo)?.monto ?? 0),
    color: matizTipo(colorBase, i),
    valueFormatter: (v: number | null) => formatMonto(v ?? 0),
  }));

  return (
    <BarChart
      layout="horizontal"
      height={Math.max(220, filas.length * 48)}
      xAxis={[{ scaleType: 'linear', valueFormatter: (v: number) => formatMonto(v) }]}
      yAxis={[{ scaleType: 'band', data: etiquetas }]}
      series={series}
      margin={{ left: 220 }}
      hideLegend
    />
  );
}

/**
 * Avance de cobranza de HOY por asesor: una fila con barra de progreso por
 * asesor, ordenadas ascendente por avance (ya viene así del backend) para
 * que quien menos ha avanzado aparezca primero. Verde al 100%, color normal
 * mientras avanza, y "Sin cobranza programada" (sin barra) cuando no hay
 * nada que cobrar hoy — nunca una división por cero disfrazada de 0%.
 */
function AvanceCobranzaHoyList({
  avance,
  isLoading,
  error,
}: {
  avance: DashboardAvanceCobranza | null;
  isLoading: boolean;
  error: string | null;
}) {
  const filas = avance?.filas ?? [];

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2">Avance de cobranza de hoy por asesor</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Siempre es el día de hoy — no depende del rango de fechas elegido
        </Typography>

        <ErrorBanner error={error} />

        {isLoading && !avance ? (
          <Stack sx={{ alignItems: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : filas.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay asesores visibles con estos filtros.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {filas.map((f) => (
              <AvanceAsesorRow key={f.asesor_id} fila={f} />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function AvanceAsesorRow({ fila }: { fila: DashboardAvanceAsesor }) {
  const sinProgramado = fila.porcentaje === null;

  return (
    <Stack spacing={0.5}>
      <Stack
        direction="row"
        sx={{ alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {fila.asesor_nombre}
          </Typography>
          {fila.agencia_nombre && (
            <Typography variant="caption" color="text.secondary">
              {fila.agencia_nombre}
            </Typography>
          )}
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {sinProgramado ? 'Sin cobranza programada' : `${fila.porcentaje}%`}
        </Typography>
      </Stack>

      {!sinProgramado && (
        <LinearProgress
          variant="determinate"
          value={fila.porcentaje ?? 0}
          color={fila.porcentaje === 100 ? 'success' : 'primary'}
          sx={{ height: 8, borderRadius: 4 }}
        />
      )}

      <Typography variant="caption" color="text.secondary">
        {`Programado ${formatMonto(fila.programado)} · Cobrado ${formatMonto(fila.cobrado)} · Pendiente ${formatMonto(fila.pendiente)}`}
      </Typography>
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
 * Composición de la cartera activa (créditos activo + vencido, no solo la
 * mora) por tipo de crédito — vista de stock (cuánto hay prestado ahora en
 * cada línea de negocio), a diferencia del gráfico de arriba que es flujo
 * del día. Un color propio (`colores[2]`, no los ya usados por
 * Cobranza/Desembolso) con un matiz por tipo, para que esta tarjeta tenga su
 * propia identidad visual en la página.
 */
function CarteraActivaChart({
  cartera,
  isLoading,
  error,
  colorBase,
}: {
  cartera: DashboardCartera | null;
  isLoading: boolean;
  error: string | null;
  colorBase: string;
}) {
  const filas = cartera?.filas ?? [];
  const total = filas.reduce((acc, f) => acc + f.saldo, 0);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="subtitle2">Composición de cartera activa por tipo</Typography>
          {!isLoading && filas.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              Total: {formatMonto(total)}
            </Typography>
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Cartera activa actual — no depende del rango de fechas elegido
        </Typography>

        <ErrorBanner error={error} />

        {isLoading && !cartera ? (
          <Stack sx={{ alignItems: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : total === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay cartera activa con estos filtros.
          </Typography>
        ) : (
          <BarChart
            layout="horizontal"
            height={180}
            xAxis={[{ scaleType: 'linear', valueFormatter: (v: number) => formatMonto(v) }]}
            yAxis={[{ scaleType: 'band', data: filas.map((f) => TIPO_LABELS[f.tipo_credito]) }]}
            series={[
              {
                data: filas.map((f) => f.saldo),
                colorGetter: ({ dataIndex }) => matizTipo(colorBase, dataIndex),
                valueFormatter: (v: number | null, { dataIndex }) =>
                  `${formatMonto(v ?? 0)} · ${filas[dataIndex].cantidad} ${filas[dataIndex].cantidad === 1 ? 'crédito' : 'créditos'}`,
              },
            ]}
            margin={{ left: 120 }}
            hideLegend
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Panel de inicio: totales del período de cobranzas y desembolsos, con los
 * filtros globales que expone el backend (agencia, asesor, tipo de crédito y
 * rango de fechas). Un único conjunto de filtros alimenta todos los gráficos
 * del panel que admiten esos criterios — ningún gráfico tiene su propio
 * selector independiente.
 *
 * Los filtros solo recortan —el alcance ya viene acotado por la jerarquía del
 * actor— así que agencia/asesor se ocultan cuando no pueden cambiar nada: un
 * administrador_agencia está fijo a su agencia y un asesor solo ve lo suyo, y en
 * ambos casos ofrecer un selector sería mandar un filtro que el backend
 * descarta. El rango de fechas, en cambio, siempre se muestra: hasta el propio
 * asesor puede querer ver su cobranza de ayer, no solo la de hoy.
 *
 * El rango de fechas NO se aplica a cartera activa por tipo (es un STOCK del
 * momento, no un flujo del período) ni a avance de cobranza (que por
 * definición es siempre "hoy") — ver los comentarios de cada sección.
 */
export function DashboardInicial() {
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const navigate = useNavigate();

  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosResumen>(emptyFiltros);

  // Filtro global de rango de fechas: default hoy-hoy, igual que el backend
  // cuando no se manda ninguno. Comparte este único estado el resumen, el
  // gráfico comparativo y la producción por asesor (los únicos que son flujo
  // del período); cartera activa y avance de cobranza no lo usan.
  const [desde, setDesde] = useState(hoyLima);
  const [hasta, setHasta] = useState(hoyLima);
  const rangoInvalido = Boolean(desde && hasta && hasta < desde);

  const [agruparPor, setAgruparPor] = useState<DashboardAgrupacion>('agencia');
  const [grafico, setGrafico] = useState<DashboardGrafico | null>(null);
  const [isLoadingGrafico, setIsLoadingGrafico] = useState(true);
  const [errorGrafico, setErrorGrafico] = useState<string | null>(null);

  const [cartera, setCartera] = useState<DashboardCartera | null>(null);
  const [isLoadingCartera, setIsLoadingCartera] = useState(true);
  const [errorCartera, setErrorCartera] = useState<string | null>(null);

  const [produccion, setProduccion] = useState<DashboardProduccion | null>(null);
  const [isLoadingProduccion, setIsLoadingProduccion] = useState(true);
  const [errorProduccion, setErrorProduccion] = useState<string | null>(null);

  const [avance, setAvance] = useState<DashboardAvanceCobranza | null>(null);
  const [isLoadingAvance, setIsLoadingAvance] = useState(true);
  const [errorAvance, setErrorAvance] = useState<string | null>(null);

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

  // Opciones del selector de asesor: todos si no hay agencia elegida, o solo
  // los de esa agencia — nunca una búsqueda libre, para que las opciones
  // siempre respeten lo que el actor puede ver.
  const asesoresDisponibles = filtros.agencia_id
    ? asesores.filter((a) => a.agencia_id === filtros.agencia_id)
    : asesores;

  // Opciones del selector de tipo: solo los módulos que el actor tiene en su
  // perfil de acceso — un asesor con el perfil "Diario" no debe poder
  // filtrar por prendario/vehicular/hipotecario/ventas aunque no cree nada
  // al elegirlos (mismo criterio que tipoCreditoDisponible() en Solicitud,
  // salvo que acá no exige el permiso de alta, solo el módulo: es ver, no crear).
  const tiposFiltroDisponibles = TIPOS_FILTRO.filter((t) => perfilPermite(user, t.value));

  /** Cambiar de agencia recalcula las opciones de asesor; si el elegido ya no pertenece, se limpia. */
  function handleAgenciaChange(agenciaId: number | undefined) {
    setFiltros((f) => ({
      ...f,
      agencia_id: agenciaId,
      asesor_id:
        f.asesor_id === undefined || asesores.some((a) => a.id === f.asesor_id && (!agenciaId || a.agencia_id === agenciaId))
          ? f.asesor_id
          : undefined,
    }));
  }

  function limpiarFiltros() {
    setFiltros(emptyFiltros);
    setDesde(hoyLima());
    setHasta(hoyLima());
  }

  useEffect(() => {
    if (rangoInvalido) {
      return;
    }

    let active = true;

    setIsLoading(true);
    setError(null);

    getDashboardResumen({
      agencia_id: filtros.agencia_id,
      asesor_id: filtros.asesor_id,
      tipo_credito: filtros.tipo_credito,
      desde,
      hasta,
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
  }, [filtros, desde, hasta, rangoInvalido]);

  useEffect(() => {
    if (rangoInvalido) {
      return;
    }

    let active = true;

    setIsLoadingGrafico(true);
    setErrorGrafico(null);

    getDashboardGrafico({
      agencia_id: filtros.agencia_id,
      asesor_id: filtros.asesor_id,
      tipo_credito: filtros.tipo_credito,
      agrupar_por: agruparPor,
      desde,
      hasta,
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
  }, [filtros, agruparPor, desde, hasta, rangoInvalido]);

  // Cartera activa por tipo es un STOCK (saldo pendiente ahora), no un flujo
  // del período: no lleva desde/hasta a propósito, como ya hacía antes de
  // que este filtro existiera.
  useEffect(() => {
    let active = true;

    setIsLoadingCartera(true);
    setErrorCartera(null);

    getDashboardCarteraActivaPorTipo({
      agencia_id: filtros.agencia_id,
      asesor_id: filtros.asesor_id,
      tipo_credito: filtros.tipo_credito,
    })
      .then((res) => {
        if (active) setCartera(res.data);
      })
      .catch((err) => {
        if (active) setErrorCartera(err instanceof Error ? err.message : 'Error desconocido');
      })
      .finally(() => {
        if (active) setIsLoadingCartera(false);
      });

    return () => {
      active = false;
    };
  }, [filtros]);

  useEffect(() => {
    if (rangoInvalido) {
      return;
    }

    let active = true;

    setIsLoadingProduccion(true);
    setErrorProduccion(null);

    getDashboardProduccionPorAsesor({
      desde,
      hasta,
      agencia_id: filtros.agencia_id,
      asesor_id: filtros.asesor_id,
      // 'ventas' no es un tipo de crédito generado (sin cuotas que
      // desembolsar): el backend lo rechaza, así que acá se ignora en vez de
      // mandar un filtro inválido.
      tipo_credito: filtros.tipo_credito !== 'ventas' ? filtros.tipo_credito : undefined,
    })
      .then((res) => {
        if (active) setProduccion(res.data);
      })
      .catch((err) => {
        if (active) setErrorProduccion(err instanceof Error ? err.message : 'Error desconocido');
      })
      .finally(() => {
        if (active) setIsLoadingProduccion(false);
      });

    return () => {
      active = false;
    };
  }, [filtros, desde, hasta, rangoInvalido]);

  useEffect(() => {
    let active = true;

    setIsLoadingAvance(true);
    setErrorAvance(null);

    getDashboardAvanceCobranzaHoy({
      agencia_id: filtros.agencia_id,
      asesor_id: filtros.asesor_id,
    })
      .then((res) => {
        if (active) setAvance(res.data);
      })
      .catch((err) => {
        if (active) setErrorAvance(err instanceof Error ? err.message : 'Error desconocido');
      })
      .finally(() => {
        if (active) setIsLoadingAvance(false);
      });

    return () => {
      active = false;
    };
  }, [filtros]);

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

  const activo: DashboardResumen = resumen ?? {
    fecha: '',
    desde: '',
    hasta: '',
    cobranza: { total: 0, cantidad: 0 },
    desembolso: { total: 0, cantidad: 0 },
    egresos: { total: 0, cantidad: 0 },
    ingresos: { total: 0, cantidad: 0 },
    billetajes: { total: 0, cantidad: 0 },
    vencidos: { total: 0, cantidad: 0 },
    neto: 0,
  };
  const hoy = hoyLima();

  /**
   * Lleva los filtros activos de Inicio (agencia, asesor, rango de fechas) al
   * módulo destino vía `navigate(path, { state })` — esa página los lee una
   * sola vez al montar y los aplica a su propio estado de filtros (ver
   * CobranzasPage.tsx / MovimientosCajaPage.tsx), sin inventar un sistema de
   * filtros nuevo. El tipo de crédito NO se propaga: ninguno de esos módulos
   * lista por tipo de crédito.
   */
  function navegarAModulo(path: string) {
    const state: DashboardFiltrosNavegacion = {
      agencia_id: filtros.agencia_id,
      asesor_id: filtros.asesor_id,
      desde,
      hasta,
    };

    navigate(path, { state });
  }
  const esHoy = desde === hoy && hasta === hoy;
  const filtrosActivos = [
    filtros.agencia_id,
    filtros.asesor_id,
    filtros.tipo_credito,
    esHoy ? undefined : desde,
  ].filter((v) => v !== undefined).length;

  const netoPositivo = activo.neto >= 0;

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {esHoy ? 'Resumen de hoy' : 'Resumen del período'}
          {activo.desde && activo.hasta && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {activo.desde === activo.hasta ? formatFecha(activo.desde) : `${formatFecha(activo.desde)} – ${formatFecha(activo.hasta)}`}
            </Typography>
          )}
        </Typography>

        <FiltrosPanel activeCount={filtrosActivos} onClear={limpiarFiltros}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Desde"
              type="date"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              fullWidth
            />
            <TextField
              label="Hasta"
              type="date"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              fullWidth
            />
          </Stack>
          {puedeFiltrarAgencia && (
            <TextField
              select
              label="Agencia"
              value={filtros.agencia_id ?? ''}
              onChange={(e) => handleAgenciaChange(e.target.value ? Number(e.target.value) : undefined)}
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
              {asesoresDisponibles.map((asesor) => (
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
            {tiposFiltroDisponibles.map((tipo) => (
              <MenuItem key={tipo.value} value={tipo.value}>
                {tipo.label}
              </MenuItem>
            ))}
          </TextField>
        </FiltrosPanel>
      </Stack>

      <ErrorBanner error={error} />

      {rangoInvalido ? (
        <Typography variant="body2" color="error">
          La fecha "hasta" no puede ser anterior a "desde".
        </Typography>
      ) : isLoading && !resumen ? (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : (
        <>
          {/* Accesos rápidos: las tarjetas financieras agrupadas, cada una
              navega a su módulo con los filtros activos de Inicio (agencia,
              asesor y rango de fechas) — ver navegarAModulo(). */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TotalCard
                titulo="Cobranza"
                total={activo.cobranza.total}
                cantidad={activo.cobranza.cantidad}
                color={colorCobranza}
                icono={<TrendingUpIcon />}
                onClick={() => navegarAModulo('/cobros')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TotalCard
                titulo="Desembolso"
                total={activo.desembolso.total}
                cantidad={activo.desembolso.cantidad}
                color={colorDesembolso}
                icono={<TrendingDownIcon />}
                onClick={() => navegarAModulo('/desembolsos')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TotalCard
                titulo="Egreso"
                total={activo.egresos.total}
                cantidad={activo.egresos.cantidad}
                color={colores[3]}
                icono={<MoneyOffIcon />}
                onClick={() => navegarAModulo('/egresos')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TotalCard
                titulo="Ingreso"
                total={activo.ingresos.total}
                cantidad={activo.ingresos.cantidad}
                color={colores[4]}
                icono={<SavingsIcon />}
                onClick={() => navegarAModulo('/ingresos')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TotalCard
                titulo="Billetajes"
                total={activo.billetajes?.total ?? 0}
                cantidad={activo.billetajes?.cantidad ?? 0}
                color={colores[2]}
                icono={<AccountBalanceWalletIcon />}
                onClick={canVerBilletajes(user) && perfilPermiteRuta(user, '/billetajes') ? () => navegarAModulo('/billetajes') : undefined}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                      {esHoy ? 'Neto del día' : 'Neto del período'}
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
                    Cobranza + billetajes − desembolsos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="caption" color="text.secondary">
            Billetajes aprobados recibidos en el período; no se filtran por tipo de crédito.
          </Typography>
          <ComparativoChart
            grafico={grafico}
            isLoading={isLoadingGrafico}
            error={errorGrafico}
            agruparPor={agruparPor}
            onAgruparPorChange={setAgruparPor}
            colorCobranza={colorCobranza}
            colorDesembolso={colorDesembolso}
          />

          <CarteraActivaChart
            cartera={cartera}
            isLoading={isLoadingCartera}
            error={errorCartera}
            colorBase={colores[2]}
          />

          <ProduccionPorAsesorChart
            produccion={produccion}
            isLoading={isLoadingProduccion}
            error={errorProduccion}
            colorBase={colores[2]}
          />

          <AvanceCobranzaHoyList avance={avance} isLoading={isLoadingAvance} error={errorAvance} />
        </>
      )}
    </Stack>
  );
}
