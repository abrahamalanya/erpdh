import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { listCreditos } from '../api/creditosPrendarios';
import { listAgencias } from '../api/agencias';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { ClienteAutocomplete } from '../components/ClienteAutocomplete';
import { AsesorAutocomplete } from '../components/AsesorAutocomplete';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  CREDITO_ESTADO_COLOR,
  CREDITO_ESTADO_LABELS,
  ESTADOS_DESEMBOLSADOS,
  HISTORIAL_ATRASO_LEYENDA,
  TIPO_CREDITO_LABELS,
  TIPO_CUOTA_LABELS,
  canVerCreditos,
  colorHistorialCredito,
  colorHistorialCreditoEsOscuro,
} from '../utils/creditoPrendarioHierarchy';
import { formatFecha, formatMonto } from '../utils/format';
import type { Agencia, Cliente, Credito, CreditoEstado, TipoCredito, User } from '../types/api';

/** Segmento de URL (plural) de la página dedicada de cada tipo — ver App.tsx. */
const RUTA_POR_TIPO: Record<TipoCredito, string> = {
  prendario: 'prendarios',
  vehicular: 'vehiculares',
  hipotecario: 'hipotecarios',
  diario: 'diarios',
};

function Bolita({ color }: { color: string }) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        flexShrink: 0,
        bgcolor: color,
        border: '1px solid',
        borderColor: 'rgba(0,0,0,0.25)',
      }}
    />
  );
}

/**
 * Historial de créditos — espejo de HistorialCreditosScreen en la app
 * (umax-app/src/screens/creditos/HistorialCreditosScreen.tsx): mismos
 * filtros y la misma fórmula de atraso (colorHistorialCredito), reutilizando
 * `listCreditos()` (el mismo endpoint que ya consume CreditosPrendariosPage)
 * en vez de un endpoint propio. Se muestra en cards (como la app), no en
 * tabla. A diferencia de la app, no carga nada hasta que se aplique al menos
 * un filtro: la lista completa recalcula el saldo de liquidación de cada
 * crédito activo/vencido en el backend, pesada de más para traerla sola al
 * entrar. "Ver detalle" reusa el diálogo de detalle ya existente en la
 * página dedicada de cada tipo (?credito_id=&accion=detalle, mismo mecanismo
 * que "Mi ruta de cobranza"), sin duplicar esa lógica.
 */
export function HistorialCreditosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const puedeFiltrarAgencia = hasRole(user, 'sistemas', 'administrador_general', 'supervisor');
  const puedeVerAsesor = hasRole(user, 'administrador_general', 'administrador_agencia', 'sistemas');

  const [result, setResult] = useState<{ data: Credito[]; last_page: number } | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [leyendaVisible, setLeyendaVisible] = useState(false);

  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [asesor, setAsesor] = useState<User | null>(null);
  const [tipoCredito, setTipoCredito] = useState<TipoCredito | ''>('');
  const [estado, setEstado] = useState<CreditoEstado | ''>('');
  const [agenciaId, setAgenciaId] = useState<number | ''>('');
  const [desembolsoDesde, setDesembolsoDesde] = useState('');
  const [desembolsoHasta, setDesembolsoHasta] = useState('');
  const [vencimientoDesde, setVencimientoDesde] = useState('');
  const [vencimientoHasta, setVencimientoHasta] = useState('');
  const [cancelacionDesde, setCancelacionDesde] = useState('');
  const [cancelacionHasta, setCancelacionHasta] = useState('');

  const activeFiltersCount = [
    cliente, asesor, tipoCredito, estado, agenciaId,
    desembolsoDesde, desembolsoHasta, vencimientoDesde, vencimientoHasta, cancelacionDesde, cancelacionHasta,
  ].filter((v) => v !== null && v !== '').length;
  const hasFilters = activeFiltersCount > 0;

  useEffect(() => {
    if (puedeFiltrarAgencia) {
      listAgencias().then((res) => setAgencias(res.data.data)).catch(() => setAgencias([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeFiltrarAgencia]);

  // Sin filtro no se consulta nada: ver el comentario del JSDoc de arriba.
  useEffect(() => {
    if (!hasFilters) {
      setResult(null);
      setLoadError(null);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    listCreditos(page, {
      clienteId: cliente?.id,
      asesorId: asesor?.id,
      tipoCredito: tipoCredito || undefined,
      estado: estado || ESTADOS_DESEMBOLSADOS,
      agenciaId: agenciaId || undefined,
      fechaDesembolsoDesde: desembolsoDesde || undefined,
      fechaDesembolsoHasta: desembolsoHasta || undefined,
      fechaVencimientoDesde: vencimientoDesde || undefined,
      fechaVencimientoHasta: vencimientoHasta || undefined,
      fechaCancelacionDesde: cancelacionDesde || undefined,
      fechaCancelacionHasta: cancelacionHasta || undefined,
    })
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [
    hasFilters, page, cliente, asesor, tipoCredito, estado, agenciaId,
    desembolsoDesde, desembolsoHasta, vencimientoDesde, vencimientoHasta, cancelacionDesde, cancelacionHasta,
  ]);

  if (!canVerCreditos(user)) {
    return <Navigate to="/" replace />;
  }

  function limpiarFiltros() {
    setPage(1);
    setCliente(null);
    setAsesor(null);
    setTipoCredito('');
    setEstado('');
    setAgenciaId('');
    setDesembolsoDesde('');
    setDesembolsoHasta('');
    setVencimientoDesde('');
    setVencimientoHasta('');
    setCancelacionDesde('');
    setCancelacionHasta('');
  }

  const rows = result?.data ?? [];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Historial de créditos
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="text" onClick={() => setLeyendaVisible((v) => !v)}>
            Leyenda
          </Button>
          <FiltrosPanel activeCount={activeFiltersCount} onClear={limpiarFiltros}>
            <ClienteAutocomplete value={cliente} onChange={(v) => { setPage(1); setCliente(v); }} />
            {puedeVerAsesor && <AsesorAutocomplete value={asesor} onChange={(v) => { setPage(1); setAsesor(v); }} />}
            <TextField
              select label="Tipo de crédito" value={tipoCredito}
              onChange={(e) => { setPage(1); setTipoCredito(e.target.value as TipoCredito | ''); }}
            >
              <MenuItem value="">Todos</MenuItem>
              {(Object.keys(TIPO_CREDITO_LABELS) as TipoCredito[]).map((t) => (
                <MenuItem key={t} value={t}>{TIPO_CREDITO_LABELS[t]}</MenuItem>
              ))}
            </TextField>
            <TextField
              select label="Estado" value={estado}
              onChange={(e) => { setPage(1); setEstado(e.target.value as CreditoEstado | ''); }}
            >
              <MenuItem value="">Todos (desembolsados)</MenuItem>
              {ESTADOS_DESEMBOLSADOS.map((e) => (
                <MenuItem key={e} value={e}>{CREDITO_ESTADO_LABELS[e]}</MenuItem>
              ))}
            </TextField>
            {puedeFiltrarAgencia && (
              <TextField
                select label="Agencia" value={agenciaId}
                onChange={(e) => { setPage(1); setAgenciaId(e.target.value ? Number(e.target.value) : ''); }}
              >
                <MenuItem value="">Todas</MenuItem>
                {agencias.map((a) => (
                  <MenuItem key={a.id} value={a.id}>{a.nombre.toUpperCase()}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField label="Desembolso desde" type="date" value={desembolsoDesde} onChange={(e) => { setPage(1); setDesembolsoDesde(e.target.value); }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Desembolso hasta" type="date" value={desembolsoHasta} onChange={(e) => { setPage(1); setDesembolsoHasta(e.target.value); }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Vencimiento desde" type="date" value={vencimientoDesde} onChange={(e) => { setPage(1); setVencimientoDesde(e.target.value); }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Vencimiento hasta" type="date" value={vencimientoHasta} onChange={(e) => { setPage(1); setVencimientoHasta(e.target.value); }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Cancelación desde" type="date" value={cancelacionDesde} onChange={(e) => { setPage(1); setCancelacionDesde(e.target.value); }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Cancelación hasta" type="date" value={cancelacionHasta} onChange={(e) => { setPage(1); setCancelacionHasta(e.target.value); }} slotProps={{ inputLabel: { shrink: true } }} />
          </FiltrosPanel>
        </Stack>
      </Stack>

      {leyendaVisible && (
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
          {HISTORIAL_ATRASO_LEYENDA.map((item) => (
            <Stack key={item.rango} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Bolita color={item.color} />
              <Typography variant="caption">{item.etiqueta}</Typography>
            </Stack>
          ))}
        </Stack>
      )}

      <ErrorBanner error={loadError} />

      {!hasFilters ? (
        <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 8 }}>
          <Typography variant="body1">Aplica al menos un filtro para ver el historial de créditos.</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            La lista completa es muy pesada para cargarla de una — usa el botón «Filtros» para acotar la búsqueda.
          </Typography>
        </Box>
      ) : isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="inherit" />
        </Box>
      ) : rows.length === 0 ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
          No hay créditos para mostrar
        </Typography>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {rows.map((c) => {
              const diasAtraso = c.dias_atraso ?? 0;
              const color = colorHistorialCredito(c.estado, diasAtraso);
              const textColor = colorHistorialCreditoEsOscuro(c.estado, diasAtraso) ? '#ffffff' : '#1f2937';
              const textColorSecondary = colorHistorialCreditoEsOscuro(c.estado, diasAtraso) ? 'rgba(255,255,255,0.75)' : 'rgba(31,41,55,0.7)';
              const total = Number(c.total ?? 0);
              const saldo = Number(c.saldo ?? 0);
              const abonos = Math.max(0, total - saldo);

              return (
                <Card key={c.id} sx={{ bgcolor: color }}>
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: textColor }}>
                          {c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}`.toUpperCase() : `Cliente #${c.cliente_id}`}
                        </Typography>
                        <Chip
                          label={CREDITO_ESTADO_LABELS[c.estado]}
                          color={CREDITO_ESTADO_COLOR[c.estado]}
                          sx={{ fontWeight: 700, fontSize: '0.8125rem' }}
                        />
                      </Stack>

                      <Typography variant="body2" sx={{ color: textColorSecondary }}>
                        DNI {c.cliente?.numero_documento ?? '—'} · {c.codigo}
                      </Typography>
                      <Typography variant="body2" sx={{ color: textColorSecondary }}>
                        {TIPO_CREDITO_LABELS[c.tipo_credito]} · {TIPO_CUOTA_LABELS[c.tipo_cuota]}
                      </Typography>

                      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                        {c.fecha_desembolso && (
                          <Typography variant="body2" sx={{ color: textColor }}>Desembolso: {formatFecha(c.fecha_desembolso)}</Typography>
                        )}
                        {c.fecha_vencimiento && (
                          <Typography variant="body2" sx={{ color: textColor }}>Vencimiento: {formatFecha(c.fecha_vencimiento)}</Typography>
                        )}
                        {c.fecha_cancelacion && (
                          <Typography variant="body2" sx={{ color: textColor }}>Cancelación: {formatFecha(c.fecha_cancelacion)}</Typography>
                        )}
                      </Stack>

                      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ color: textColor }}>Préstamo: {formatMonto(total)}</Typography>
                        <Typography variant="body2" sx={{ color: textColor }}>Abonos: {formatMonto(abonos)}</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: textColor }}>Saldo: {formatMonto(saldo)}</Typography>
                      </Stack>

                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: textColor }}>{diasAtraso} días de atraso</Typography>

                      <Typography variant="body2" sx={{ color: textColorSecondary }}>
                        Asesor: {c.asesor ? `${c.asesor.nombre} ${c.asesor.apellido}`.toUpperCase() : 'Sin asesor'}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ color: textColor, borderColor: textColorSecondary }}
                          onClick={() => navigate(`/creditos-prendarios/${RUTA_POR_TIPO[c.tipo_credito]}?credito_id=${c.id}&accion=detalle`)}
                        >
                          Ver detalle
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ color: textColor, borderColor: textColorSecondary }}
                          onClick={() => navigate(`/cobros?cliente_id=${c.cliente_id}`)}
                        >
                          Ver pagos
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {(result?.last_page ?? 1) > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination count={result?.last_page ?? 1} page={page} onChange={(_, value) => setPage(value)} />
            </Box>
          )}
        </>
      )}
    </Stack>
  );
}
