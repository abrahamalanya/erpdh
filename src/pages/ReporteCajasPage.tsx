import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, Card, CardContent, Chip, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useAuth } from '../hooks/useAuth';
import { totalesCierreCaja, rangoCierreValido } from '../utils/cierreCaja';
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
import { ReporteCierreCajaDialog } from '../components/ReporteCierreCajaDialog';
import { formatFechaHora, formatMonto } from '../utils/format';
import type { Agencia, CajaAperturaCierreItem } from '../types/api';

export function ReporteCajasPage({ tarjetas = false }: { tarjetas?: boolean } = {}) {
  const { user } = useAuth();
  const isAdministradorAgencia = hasRole(user, 'administrador_agencia');

  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [agenciaId, setAgenciaId] = useState<number | ''>('');
  const [usuarioId, setUsuarioId] = useState<number | ''>('');
  const [reload, setReload] = useState(0);
  const [estado, setEstado] = useState<'abierta' | 'cerrada' | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [reporte, setReporte] = useState<CajaAperturaCierreItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [detalleTarget, setDetalleTarget] = useState<CajaAperturaCierreItem | null>(null);
  const [reporteCicloId, setReporteCicloId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdministradorAgencia && hasRole(user, 'administrador_general', 'secretaria', 'sistemas')) {
      listAgencias().then((res) => setAgencias(res.data.data)).catch(() => setAgencias([]));
    }
  }, [isAdministradorAgencia, user]);

  useEffect(() => {
    let active = true;
    setReporte(null); setDetalleTarget(null); setReporteCicloId(null);
    setLoadError(null);
    if (!canVerCajas(user)) { setIsLoading(false); return; }
    if (!rangoCierreValido(desde, hasta)) {
      setIsLoading(false); setLoadError('Indica fechas validas y un rango en el que Desde no sea posterior a Hasta.'); return;
    }
    setIsLoading(true);
    listCajasAperturaCierre(desde || undefined, hasta || undefined, agenciaId || undefined, estado || undefined)
      .then(res => { if (active) setReporte(res.data); })
      .catch(err => { if (active) setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el historial.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [desde, hasta, agenciaId, estado, reload, user]);

  const usuarios = useMemo(() => [...new Map((reporte ?? []).filter(row => row.usuario).map(row => [row.usuario!.id, row.usuario!])).values()], [reporte]);
  const filas = useMemo(() => (reporte ?? []).filter(row => !usuarioId || row.usuario?.id === usuarioId), [reporte, usuarioId]);
  const totales = useMemo(() => totalesCierreCaja(filas), [filas]);

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
          label={i.estado === 'abierta' ? 'Abierta' : i.cierre_automatico ? 'Cerrada (automatica)' : i.cierre_forzado ? 'Cerrada (forzada)' : 'Cerrada'}
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
              key: 'reporte',
              label: 'Ver reporte',
              icon: <AssessmentIcon fontSize="small" />,
              onClick: () => setReporteCicloId(i.id),
            },
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
          Historial de aperturas y cierres
        </Typography>
        <ExportButtons
          exportPdf={() => getReporteCajasAperturaCierrePdf(desde || undefined, hasta || undefined, agenciaId || undefined, estado || undefined)}
          exportExcel={() =>
            getReporteCajasAperturaCierreExcel(desde || undefined, hasta || undefined, agenciaId || undefined, estado || undefined)
          }
          filename="cajas-apertura-cierre"
        />
      </Stack>

      {loadError && <Alert severity="error" action={<Button color="inherit" onClick={() => setReload(n => n + 1)}>Reintentar</Button>}>{loadError}</Alert>}
      <Button variant="outlined" disabled={isLoading} onClick={() => setReload(n => n + 1)}>Actualizar historial</Button>

      <Grid container spacing={2}>
        {(['saldo', 'faltante', 'sobrante', 'neto'] as const).map(key => <Grid key={key} size={{ xs: 12, sm: 3 }}><Card variant="outlined"><CardContent>
          <Typography variant="body2" color="text.secondary">{{ saldo: 'Saldo total del periodo', faltante: 'Faltante de efectivo', sobrante: 'Sobrante de efectivo', neto: 'Neto del periodo' }[key]}</Typography>
          <Typography variant="h6">{formatMonto(totales[key])}</Typography>
        </CardContent></Card></Grid>)}
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

      <TextField select label="Usuario" value={usuarioId} onChange={e => setUsuarioId(e.target.value ? Number(e.target.value) : '')}>
        <MenuItem value="">Todos los usuarios visibles</MenuItem>
        {usuarios.map(usuario => <MenuItem key={usuario.id} value={usuario.id}>{extractUserName(usuario)}</MenuItem>)}
      </TextField>
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

      {tarjetas && !isLoading && !loadError ? <Stack spacing={2}>
        {!filas.length && <Typography>No hay ciclos de caja con estos filtros.</Typography>}
        {filas.map(item => <Accordion key={item.id} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`cierre-detalle-${item.id}`} id={`cierre-resumen-${item.id}`}>
            <Stack spacing={1} sx={{ width: '100%', pr: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>{extractUserName(item.usuario) ?? 'Sin usuario'}</Typography>
              <Typography variant="body2" color="text.secondary">{item.agencia} ? {item.fecha}</Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Chip size="small" color={item.estado === 'abierta' ? 'success' : 'default'} label={item.estado === 'abierta' ? 'Abierta' : 'Cerrada'} />
                {item.cierre_automatico && <Chip size="small" label="Cierre automatico" color="info" />}
                {item.cierre_forzado && <Chip size="small" label="Cierre forzado" color="warning" />}
                <Typography variant="body2">Neto: {formatMonto(totalesCierreCaja([item]).neto)}</Typography>
              </Stack>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography variant="body2">Apertura: {formatFechaHora(item.fecha_apertura)} ? Cierre: {item.fecha_cierre ? formatFechaHora(item.fecha_cierre) : 'Pendiente'}</Typography>
              <Grid container spacing={2}>
                {([
                  ['total_billetaje', 'Billetaje'], ['total_cobranza', 'Cobrado'], ['total_ingresos', 'Ingresos'],
                  ['total_desembolso', 'Desembolsos'], ['total_egresos', 'Gastos / egresos'],
                  ['saldo_efectivo_cierre', 'Efectivo esperado'], ['valor_cerrado', 'Efectivo contado'], ['diferencia', 'Diferencia'],
                ] as const).map(([key, label]) => <Grid key={key} size={{ xs: 6, md: 3 }}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography>{item[key] == null ? 'Pendiente' : formatMonto(item[key])}</Typography>
                </Grid>)}
              </Grid>
              <Typography variant="body2">Cerrada por: {extractUserName(item.cerrada_por) ?? 'Pendiente'}</Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Button variant="contained" startIcon={<AssessmentIcon />} onClick={() => setReporteCicloId(item.id)}>Ver reporte completo y PDF</Button>
                <Button variant="outlined" startIcon={<VisibilityIcon />} onClick={() => setDetalleTarget(item)}>Ver movimientos</Button>
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>)}
      </Stack> : <>
      <DataTable
        columns={columns}
        rows={filas}
        keyExtractor={(i) => i.id}
        isLoading={isLoading}
        emptyMessage="No hay ciclos de caja en este rango"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />


      </>}

      <CajaCicloDetalleDialog row={detalleTarget} onClose={() => setDetalleTarget(null)} />
      {reporteCicloId !== null && <ReporteCierreCajaDialog key={`${user?.id}-${reporteCicloId}`} cicloId={reporteCicloId} onClose={() => setReporteCicloId(null)} />}
    </Stack>
  );
}
