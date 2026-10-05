import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Card, CardContent, Chip, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { canViewUsers, roleLabel } from '../utils/userHierarchy';
import { getReporteCumpleanosExcel, getReporteCumpleanosPdf, listCumpleanos } from '../api/reportes';
import { listAgencias } from '../api/agencias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ExportButtons } from '../components/ExportButtons';
import { formatFecha } from '../utils/format';
import type { Agencia, ReporteCumpleanosItem } from '../types/api';

/**
 * "Hoy" según el reloj de Lima (America/Lima) — el mismo `now()` con el que el
 * backend calcula `dias_para_cumple`. Sin esto, un navegador en UTC cerca de
 * medianoche pediría un rango con un día de desfase respecto del reporte.
 */
function fechaEnLima(d: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';

  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

/**
 * El backend exige desde/hasta (no son opcionales), así que la pantalla no
 * arranca sin rango: por defecto, el mes en curso. Como el reporte compara
 * día+mes y no la fecha literal, un rango de mes funciona para los cumpleaños
 * que caen dentro de él, y muestra como "próximo" la fecha real de felicitación.
 */
function rangoInicial(): { desde: string; hasta: string } {
  const hoy = fechaEnLima(new Date());

  return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
}

/**
 * Mismo texto que arma el backend en el PDF y el Excel (ReporteCumpleanosController::
 * formatearProximo), para que la pantalla y el archivo digan lo mismo.
 */
function formatearProximo(item: ReporteCumpleanosItem): string {
  if (item.dias_para_cumple === 0) return 'Hoy';
  if (item.dias_para_cumple === 1) return 'Mañana';

  return formatFecha(item.proximo_cumpleanos);
}

export function ReporteCumpleanosPage() {
  const { user } = useAuth();
  const isAdministradorAgencia = hasRole(user, 'administrador_agencia');

  const [{ desde: desdeInicial, hasta: hastaInicial }] = useState(rangoInicial);
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [agenciaId, setAgenciaId] = useState<number | ''>('');

  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [reporte, setReporte] = useState<ReporteCumpleanosItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // El backend responde 422 si hasta < desde; se frena acá para no gastar el request.
  const rangoInvalido = Boolean(desde && hasta && hasta < desde);

  useEffect(() => {
    if (!isAdministradorAgencia) {
      listAgencias().then((res) => setAgencias(res.data.data));
    }
  }, [isAdministradorAgencia]);

  function loadReporte() {
    if (rangoInvalido) {
      setReporte(null);
      setLoadError('La fecha de fin no puede ser anterior a la de inicio');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    listCumpleanos(desde, hasta, agenciaId || undefined)
      .then((res) => setReporte(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReporte, [desde, hasta, agenciaId]);

  const totales = useMemo(() => {
    const rows = reporte ?? [];

    return {
      total: rows.length,
      hoy: rows.filter((r) => r.dias_para_cumple === 0).length,
      semana: rows.filter((r) => r.dias_para_cumple <= 7).length,
    };
  }, [reporte]);

  if (!canViewUsers(user)) {
    return <Navigate to="/" replace />;
  }

  const columns: DataTableColumn<ReporteCumpleanosItem>[] = [
    { header: 'Usuario', render: (i) => i.nombre.toUpperCase() },
    { header: 'Documento', render: (i) => i.dni ?? '—' },
    { header: 'Teléfono', render: (i) => i.telefono ?? '—' },
    { header: 'Fecha de nacimiento', render: (i) => formatFecha(i.fecha_nacimiento) },
    { header: 'Cumple años', align: 'center', render: (i) => i.cumple_anios },
    {
      header: 'Próximo cumpleaños',
      render: (i) => (
        <Chip
          label={formatearProximo(i)}
          size="small"
          color={i.dias_para_cumple === 0 ? 'success' : i.dias_para_cumple === 1 ? 'info' : 'default'}
          variant={i.dias_para_cumple <= 1 ? 'filled' : 'outlined'}
        />
      ),
    },
    // Mismo default que el PDF/Excel: sin agencia asignada se lee como "Principal".
    { header: 'Agencia', render: (i) => i.agencia?.toUpperCase() ?? 'Principal' },
    {
      header: 'Cargo',
      render: (i) => (i.roles.length === 0 ? '—' : i.roles.map(roleLabel).join(', ')),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Reporte de cumpleaños
        </Typography>
        <ExportButtons
          exportPdf={() => getReporteCumpleanosPdf(desde, hasta, agenciaId || undefined)}
          exportExcel={() => getReporteCumpleanosExcel(desde, hasta, agenciaId || undefined)}
          filename="cumpleanos"
        />
      </Stack>

      <Typography variant="body2" color="text.secondary">
        El rango acota el día y mes del cumpleaños, no la fecha de nacimiento: quien nació en 1985 aparece en el
        reporte de su cumpleaños de este año igual que en el del año que viene.
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Cumpleaños en el rango</Typography>
              <Typography variant="h6">{totales.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Cumple hoy</Typography>
              <Typography variant="h6">{totales.hoy}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">En los próximos 7 días</Typography>
              <Typography variant="h6">{totales.semana}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Desde"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          error={rangoInvalido}
          fullWidth
        />
        <TextField
          label="Hasta"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          error={rangoInvalido}
          fullWidth
        />
        {!isAdministradorAgencia && (
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

      <DataTable
        columns={columns}
        rows={reporte ?? []}
        keyExtractor={(i) => i.id}
        isLoading={isLoading}
        emptyMessage="No hay cumpleaños en este rango de fechas"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />
    </Stack>
  );
}