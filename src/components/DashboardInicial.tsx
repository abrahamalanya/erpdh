import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { BarChart } from '@mui/x-charts/BarChart';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../theme/ThemeModeContext';
import { hasRole } from '../utils/roles';
import { TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import {
  getDashboardResumen,
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

interface ResumenChartProps {
  resumen: DashboardResumen;
  colorCobranza: string;
  colorDesembolso: string;
}

/**
 * Comparación de las dos magnitudes del día. Un gráfico de barras y no uno de
 * líneas a propósito: el backend solo calcula el día en curso, así que no hay
 * serie temporal que graficar y una línea de un solo punto mentiría sobre la
 * tendencia.
 */
function ResumenChart({ resumen, colorCobranza, colorDesembolso }: ResumenChartProps) {
  const sinMovimiento = resumen.cobranza.cantidad === 0 && resumen.desembolso.cantidad === 0;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Cobranza vs. desembolso
        </Typography>

        {sinMovimiento ? (
          <Typography variant="body2" color="text.secondary">
            No hubo cobranzas ni desembolsos con estos filtros.
          </Typography>
        ) : (
          <BarChart
            layout="horizontal"
            height={200}
            xAxis={[{ scaleType: 'linear', valueFormatter: (v: number) => formatMonto(v) }]}
            yAxis={[{ scaleType: 'band', data: ['Cobranza', 'Desembolso'] }]}
            series={[
              {
                // Una sola serie con dos puntos, coloreados por índice: con dos
                // series x-charts dibujaría dos barras por categoría, cada una
                // con el valor de la magnitud equivocada.
                data: [resumen.cobranza.total, resumen.desembolso.total],
                colorGetter: ({ dataIndex }) => (dataIndex === 0 ? colorCobranza : colorDesembolso),
                valueFormatter: (v: number | null) => formatMonto(v ?? 0),
              },
            ]}
            margin={{ left: 100 }}
            hideLegend
          />
        )}
      </CardContent>
    </Card>
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

          <ResumenChart
            resumen={activo}
            colorCobranza={colorCobranza}
            colorDesembolso={colorDesembolso}
          />
        </>
      )}
    </Stack>
  );
}
