import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../hooks/useAuth';
import {
  ATRASO_CUOTA_LEYENDA,
  ATRASO_VENCIMIENTO_LEYENDA,
  canVerCreditos,
  CREDITO_ESTADO_COLOR,
  CREDITO_ESTADO_LABELS,
  TIPO_CUOTA_LABELS,
} from '../utils/creditoPrendarioHierarchy';
import {
  getReporteAtrasosDiarios,
  getReporteAtrasosDiariosExcel,
  getReporteAtrasosDiariosPdf,
} from '../api/reportes';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ExportButtons } from '../components/ExportButtons';
import { formatFecha, formatMonto } from '../utils/format';
import type { AtrasosDiariosItem } from '../types/api';

/**
 * La bolita de color de los semáforos. Se pinta con el hex que manda el
 * backend en la fila, no con el color de un Chip de MUI: así la pantalla, el
 * PDF y el Excel muestran el mismo tinte y el color sigue siendo dato, no
 * decoración. `border` en los tonos claros (amarillos) para que se lean
 * sobre el fondo de la tabla.
 */
function Bolita({ color }: { color: string | null }) {
  if (!color) return null;

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

function nombreDe(persona: { nombre?: string; apellido?: string } | null): string {
  if (!persona) return '—';

  return `${persona.nombre ?? ''} ${persona.apellido ?? ''}`.trim().toUpperCase() || '—';
}

/**
 * Referencia estable para el caso "aún no cargó": con un `[]` inline, el
 * `useMemo` de abajo vería un array nuevo en cada render y se recalcularía
 * siempre (y los oxlint react-hooks lo marcan).
 */
const SIN_FILAS: AtrasosDiariosItem[] = [];

export function ReporteAtrasosPage() {
  const { user } = useAuth();

  const [reporte, setReporte] = useState<AtrasosDiariosItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [soloConMora, setSoloConMora] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);

    getReporteAtrasosDiarios()
      .then((res) => setReporte(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, []);

  const filas = reporte ?? SIN_FILAS;

  // El endpoint no acepta filtros (no hay FormRequest ni query params en el
  // backend), así que la búsqueda y el toggle se resuelven sobre el array ya
  // cargado. El orden de gravedad del backend se conserva: filtrar no reordena.
  const filasFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return filas.filter((f) => {
      if (soloConMora && f.atraso_venc_dias <= 0 && f.cuotas_atrasadas === 0) return false;
      if (!term) return true;

      return (
        f.credito_codigo.toLowerCase().includes(term) ||
        `${f.cliente?.nombre ?? ''} ${f.cliente?.apellido ?? ''}`.toLowerCase().includes(term) ||
        `${f.cliente?.numero_documento ?? ''}`.toLowerCase().includes(term) ||
        `${f.asesor?.nombre ?? ''} ${f.asesor?.apellido ?? ''}`.toLowerCase().includes(term)
      );
    });
  }, [filas, busqueda, soloConMora]);

  const totales = useMemo(
    () => ({
      creditos: filas.length,
      enMora: filas.filter((f) => f.atraso_venc_dias > 0).length,
      conCuotasAtrasadas: filas.filter((f) => f.cuotas_atrasadas > 0).length,
      saldoEnMora: filas
        .filter((f) => f.atraso_venc_dias > 0)
        .reduce((acc, f) => acc + f.saldo, 0),
    }),
    [filas]
  );

  if (!canVerCreditos(user)) {
    return <Navigate to="/" replace />;
  }

  const columns: DataTableColumn<AtrasosDiariosItem>[] = [
    { header: 'Cod. crédito', render: (i) => i.credito_codigo },
    { header: 'Cliente', render: (i) => nombreDe(i.cliente) },
    { header: 'Asesor', render: (i) => nombreDe(i.asesor) },
    {
      header: 'Estado',
      render: (i) => <Chip label={CREDITO_ESTADO_LABELS[i.estado]} size="small" color={CREDITO_ESTADO_COLOR[i.estado]} />,
    },
    { header: 'Fecha desembolso', render: (i) => formatFecha(i.fecha_desembolso) },
    { header: 'Fecha vencimiento', render: (i) => formatFecha(i.fecha_vencimiento) },
    {
      // Medidor 1: días desde el vencimiento del CRÉDITO COMPLETO.
      header: 'Atraso vencimiento',
      render: (i) => (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Bolita color={i.atraso_venc_color} />
          <Typography variant="body2">
            {i.atraso_venc_dias > 0
              ? `${i.atraso_venc_dias} ${i.atraso_venc_dias === 1 ? 'día' : 'días'}`
              : 'Al día'}
          </Typography>
          {i.atraso_venc_categoria && (
            <Typography variant="caption" color="text.secondary">
              {i.atraso_venc_categoria}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      // Medidor 2: días desde la CUOTA vencida impaga más antigua. Sin
      // categoría a propósito — el texto es el conteo de cuotas.
      header: 'Atraso cuotas',
      render: (i) => (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Bolita color={i.atraso_cuota_color} />
          <Typography variant="body2">
            {i.cuotas_atrasadas > 0
              ? `${i.cuotas_atrasadas} ${i.cuotas_atrasadas === 1 ? 'cuota' : 'cuotas'}`
              : 'Al día'}
          </Typography>
          {i.cuotas_atrasadas > 0 && (
            <Typography variant="caption" color="text.secondary">
              {i.dias_atraso} {i.dias_atraso === 1 ? 'día' : 'días'}
            </Typography>
          )}
        </Stack>
      ),
    },
    { header: 'Último abono', render: (i) => formatFecha(i.ultimo_abono) },
    { header: 'Tipo de pago', render: (i) => TIPO_CUOTA_LABELS[i.tipo_cuota] },
    { header: 'Monto préstamo', align: 'right', render: (i) => formatMonto(i.monto_prestamo) },
    { header: 'Interés', align: 'right', render: (i) => formatMonto(i.interes_prestamo) },
    { header: 'Total', align: 'right', render: (i) => formatMonto(i.total) },
    { header: 'Saldo', align: 'right', render: (i) => formatMonto(i.saldo) },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Atrasos diarios
        </Typography>
        <ExportButtons
          exportPdf={getReporteAtrasosDiariosPdf}
          exportExcel={getReporteAtrasosDiariosExcel}
          filename="atrasos-diarios"
        />
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Los dos medidores de mora son números distintos y no deben leerse como uno: el atraso del
        vencimiento cuenta desde que se vence el crédito completo, y el de cuotas desde la cuota
        vencida impaga más antigua, que suele empezar a correr mucho antes.
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Créditos</Typography>
              <Typography variant="h6">{totales.creditos}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Crédito vencido</Typography>
              <Typography variant="h6">{totales.enMora}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Con cuotas atrasadas</Typography>
              <Typography variant="h6">{totales.conCuotasAtrasadas}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Saldo en crédito vencido</Typography>
              <Typography variant="h6">{formatMonto(totales.saldoEnMora)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <TextField
          size="small"
          placeholder="Buscar por código, cliente, documento o asesor"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControlLabel
          control={<Switch checked={soloConMora} onChange={(e) => setSoloConMora(e.target.checked)} />}
          label="Solo con mora"
        />
      </Stack>

      {/* Leyenda de los dos semáforos: sin ella el hex de la bolita no dice nada. */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ flexWrap: 'wrap' }}>
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Atraso del crédito completo
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            {ATRASO_VENCIMIENTO_LEYENDA.map((t) => (
              <Stack key={t.etiqueta} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Bolita color={t.color} />
                <Typography variant="caption">
                  {t.rango} {t.etiqueta}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Atraso de cuotas
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            {ATRASO_CUOTA_LEYENDA.map((t) => (
              <Stack key={t.texto} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Bolita color={t.color} />
                <Typography variant="caption">{t.texto}</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Stack>

      <DataTable
        columns={columns}
        rows={filasFiltradas}
        keyExtractor={(i) => i.credito_id}
        isLoading={isLoading}
        emptyMessage={
          filas.length === 0
            ? 'No hay créditos activos ni vencidos'
            : 'Ningún crédito coincide con la búsqueda'
        }
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />
    </Stack>
  );
}