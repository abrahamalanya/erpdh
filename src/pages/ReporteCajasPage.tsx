import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Card, CardContent, Chip, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { canVerCajas, extractUserName } from '../utils/cajaHierarchy';
import {
  getReporteCajasAperturaCierreExcel,
  getReporteCajasAperturaCierrePdf,
  listCajasAperturaCierre,
} from '../api/reportes';
import { listAgencias } from '../api/agencias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { ExportButtons } from '../components/ExportButtons';
import { CajaCicloDetalleDialog } from '../components/CajaCicloDetalleDialog';
import { formatFechaHora, formatMonto } from '../utils/format';
import type { Agencia, CajaAperturaCierreItem } from '../types/api';

export function ReporteCajasPage() {
  const { user } = useAuth();
  const isAdministradorAgencia = hasRole(user, 'administrador_agencia');

  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [agenciaId, setAgenciaId] = useState<number | ''>('');
  const [estado, setEstado] = useState<'abierta' | 'cerrada' | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [reporte, setReporte] = useState<CajaAperturaCierreItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [detalleTarget, setDetalleTarget] = useState<CajaAperturaCierreItem | null>(null);

  useEffect(() => {
    if (!isAdministradorAgencia) {
      listAgencias().then((res) => setAgencias(res.data.data));
    }
  }, [isAdministradorAgencia]);

  function loadReporte() {
    setIsLoading(true);
    setLoadError(null);

    listCajasAperturaCierre(desde || undefined, hasta || undefined, agenciaId || undefined, estado || undefined)
      .then((res) => setReporte(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReporte, [desde, hasta, agenciaId, estado]);

  const totales = useMemo(() => {
    const rows = reporte ?? [];
    const suma = (campo: keyof CajaAperturaCierreItem) => rows.reduce((acc, r) => acc + Number(r[campo]), 0);

    return {
      ingresos: suma('total_ingresos'),
      egresos: suma('total_egresos'),
      billetaje: suma('total_billetaje'),
      cobranza: suma('total_cobranza'),
      desembolso: suma('total_desembolso'),
    };
  }, [reporte]);

  if (!canVerCajas(user)) {
    return <Navigate to="/" replace />;
  }

  const columns: DataTableColumn<CajaAperturaCierreItem>[] = [
    { header: 'Fecha apertura', render: (i) => formatFechaHora(i.fecha_apertura) },
    { header: 'Fecha cierre', render: (i) => (i.fecha_cierre ? formatFechaHora(i.fecha_cierre) : '—') },
    { header: 'Usuario', render: (i) => extractUserName(i.usuario) ?? '—' },
    { header: 'Agencia', render: (i) => i.agencia },
    {
      header: 'Estado',
      render: (i) => (
        <Chip
          label={i.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
          size="small"
          color={i.estado === 'abierta' ? 'success' : 'default'}
        />
      ),
    },
    { header: 'Valor aperturado', render: (i) => formatMonto(i.valor_aperturado) },
    { header: 'Valor cerrado', render: (i) => (i.valor_cerrado !== null ? formatMonto(i.valor_cerrado) : '—') },
    { header: 'Total ingresos', render: (i) => formatMonto(i.total_ingresos) },
    { header: 'Total egresos', render: (i) => formatMonto(i.total_egresos) },
    { header: 'Total billetajes', render: (i) => formatMonto(i.total_billetaje) },
    { header: 'Total cobranza', render: (i) => formatMonto(i.total_cobranza) },
    { header: 'Total desembolso', render: (i) => formatMonto(i.total_desembolso) },
    {
      header: 'Acciones',
      align: 'right',
      render: (i) => (
        <RowActions
          actions={[
            {
              key: 'detalle',
              label: 'Ver detalle',
              icon: <VisibilityIcon fontSize="small" />,
              onClick: () => setDetalleTarget(i),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Cajas: aperturas y cierres
        </Typography>
        <ExportButtons
          exportPdf={() => getReporteCajasAperturaCierrePdf(desde || undefined, hasta || undefined, agenciaId || undefined, estado || undefined)}
          exportExcel={() =>
            getReporteCajasAperturaCierreExcel(desde || undefined, hasta || undefined, agenciaId || undefined, estado || undefined)
          }
          filename="cajas-apertura-cierre"
        />
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total ingresos</Typography>
              <Typography variant="h6">{formatMonto(totales.ingresos)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total egresos</Typography>
              <Typography variant="h6">{formatMonto(totales.egresos)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total billetajes</Typography>
              <Typography variant="h6">{formatMonto(totales.billetaje)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total cobranza</Typography>
              <Typography variant="h6">{formatMonto(totales.cobranza)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total desembolso</Typography>
              <Typography variant="h6">{formatMonto(totales.desembolso)}</Typography>
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
        <TextField
          select
          label="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as 'abierta' | 'cerrada' | '')}
          fullWidth
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="abierta">Abierta</MenuItem>
          <MenuItem value="cerrada">Cerrada</MenuItem>
        </TextField>
      </Stack>

      <DataTable
        columns={columns}
        rows={reporte ?? []}
        keyExtractor={(i) => i.id}
        isLoading={isLoading}
        emptyMessage="No hay ciclos de caja en este rango"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <CajaCicloDetalleDialog row={detalleTarget} onClose={() => setDetalleTarget(null)} />
    </Stack>
  );
}
