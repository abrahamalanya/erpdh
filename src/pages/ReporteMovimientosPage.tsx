import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Card, CardContent, Chip, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useAuth } from '../hooks/useAuth';
import { canVerBovedas, extractUserName } from '../utils/cajaHierarchy';
import { listMovimientosDinero } from '../api/reportes';
import { listBovedas } from '../api/bovedas';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { formatFecha, formatMonto } from '../utils/format';
import type { Boveda, MedioInyeccion, MovimientoReporteItem } from '../types/api';

export function ReporteMovimientosPage() {
  const { user } = useAuth();

  const [bovedas, setBovedas] = useState<Boveda[]>([]);
  const [bovedaId, setBovedaId] = useState<number | ''>('');
  const [medio, setMedio] = useState<MedioInyeccion | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [reporte, setReporte] = useState<MovimientoReporteItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listBovedas(1)
      .then((res) => setBovedas(res.data.data))
      .catch(() => setBovedas([]));
  }, []);

  function loadReporte() {
    setIsLoading(true);
    setLoadError(null);

    listMovimientosDinero(desde || undefined, hasta || undefined, medio || undefined, bovedaId || undefined)
      .then((res) => setReporte(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadReporte, [desde, hasta, medio, bovedaId]);

  if (!canVerBovedas(user)) {
    return <Navigate to="/" replace />;
  }

  const totales = useMemo(() => {
    const rows = reporte ?? [];
    const suma = (medioFiltro: MedioInyeccion, tipo: 'ingreso' | 'egreso') =>
      rows
        .filter((r) => r.medio === medioFiltro && r.tipo === tipo)
        .reduce((acc, r) => acc + Number(r.monto), 0);

    return {
      ingresoEfectivo: suma('efectivo', 'ingreso'),
      egresoEfectivo: suma('efectivo', 'egreso'),
      ingresoBancario: suma('cuenta_bancaria', 'ingreso'),
      egresoBancario: suma('cuenta_bancaria', 'egreso'),
    };
  }, [reporte]);

  const columns: DataTableColumn<MovimientoReporteItem>[] = [
    { header: 'Fecha', render: (i) => formatFecha(i.fecha) },
    { header: 'Bóveda', render: (i) => i.boveda },
    {
      header: 'Medio',
      render: (i) => (
        <Chip
          label={i.medio === 'efectivo' ? 'Efectivo' : (i.cuenta_bancaria?.banco?.nombre ?? 'Cuenta bancaria')}
          size="small"
          color={i.medio === 'efectivo' ? 'default' : 'info'}
        />
      ),
    },
    {
      header: 'Tipo',
      render: (i) => (
        <Chip
          label={i.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
          size="small"
          color={i.tipo === 'ingreso' ? 'success' : 'error'}
          variant="outlined"
        />
      ),
    },
    { header: 'Monto', render: (i) => formatMonto(i.monto) },
    { header: 'Concepto', render: (i) => i.concepto ?? '—' },
    { header: 'Registrado por', render: (i) => extractUserName(i.registrado_por) ?? '—' },
    {
      header: 'Acciones',
      align: 'right',
      render: (i) => (
        <RowActions
          actions={
            i.comprobante_url
              ? [
                  {
                    key: 'comprobante',
                    label: 'Ver comprobante',
                    icon: <ReceiptIcon fontSize="small" />,
                    onClick: () => window.open(i.comprobante_url!, '_blank'),
                  },
                ]
              : []
          }
        />
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Movimientos de dinero
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Ingresos en efectivo</Typography>
              <Typography variant="h6">{formatMonto(totales.ingresoEfectivo)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Egresos en efectivo</Typography>
              <Typography variant="h6">{formatMonto(totales.egresoEfectivo)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Ingresos en cuentas bancarias</Typography>
              <Typography variant="h6">{formatMonto(totales.ingresoBancario)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Egresos en cuentas bancarias</Typography>
              <Typography variant="h6">{formatMonto(totales.egresoBancario)}</Typography>
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
        <TextField
          select
          label="Bóveda"
          value={bovedaId}
          onChange={(e) => setBovedaId(e.target.value ? Number(e.target.value) : '')}
          fullWidth
        >
          <MenuItem value="">Todas</MenuItem>
          {bovedas.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.tipo === 'principal' ? 'Bóveda principal' : (b.agencia?.nombre?.toUpperCase() ?? 'Agencia')}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Medio"
          value={medio}
          onChange={(e) => setMedio(e.target.value as MedioInyeccion | '')}
          fullWidth
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="efectivo">Efectivo</MenuItem>
          <MenuItem value="cuenta_bancaria">Cuenta bancaria</MenuItem>
        </TextField>
      </Stack>

      <DataTable
        columns={columns}
        rows={reporte ?? []}
        keyExtractor={(i) => `${i.medio}-${i.id}`}
        isLoading={isLoading}
        emptyMessage="No hay movimientos registrados en este rango de fechas"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />
    </Stack>
  );
}
