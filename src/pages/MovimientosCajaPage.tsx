import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ImageIcon from '@mui/icons-material/Image';
import { useAuth } from '../hooks/useAuth';
import { hasPermission } from '../utils/roles';
import { extractUserName } from '../utils/cajaHierarchy';
import { movimientoCicloColor, movimientoCicloLabel } from '../utils/cajaMovimientos';
import { formatFecha, formatMonto } from '../utils/format';
import { listMovimientosCaja, listUsuariosMovimientosCaja } from '../api/caja';
import { listConceptos } from '../api/conceptos';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { RowActions, type RowAction } from '../components/RowActions';
import { RegistrarMovimientoCajaDialog } from '../components/RegistrarMovimientoCajaDialog';
import { MediaLightbox, type MediaLightboxItem } from '../components/MediaLightbox';
import type { CajaMovimiento, Concepto, MovimientoFoto, PaginatedData, TipoCredito } from '../types/api';

type VistaMovimientosCaja = 'ingresos' | 'egresos' | 'desembolsos';

const CONFIGURACION_VISTA: Record<
  VistaMovimientosCaja,
  {
    tipo: 'ingreso' | 'egreso';
    title: string;
    soloDesembolsos?: boolean;
    excluirDesembolsos?: boolean;
  }
> = {
  ingresos: { tipo: 'ingreso', title: 'Ingresos' },
  egresos: { tipo: 'egreso', title: 'Egresos', excluirDesembolsos: true },
  desembolsos: { tipo: 'egreso', title: 'Desembolsos', soloDesembolsos: true },
};

const TIPOS_CREDITO: Record<TipoCredito, string> = {
  prendario: 'Prendario',
  vehicular: 'Vehicular',
  hipotecario: 'Hipotecario',
  diario: 'Diario',
};

interface MovimientosCajaPageProps {
  vista: VistaMovimientosCaja;
}

function comprobanteDe(m: CajaMovimiento): MovimientoFoto | undefined {
  return m.fotos?.find((f) => f.tipo === 'comprobante');
}

function fotoLightboxItem(foto: MovimientoFoto, label: string): MediaLightboxItem {
  return { type: foto.path.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image', url: foto.url, label };
}

function MovimientosCajaPage({ vista }: MovimientosCajaPageProps) {
  const { user } = useAuth();
  const { tipo, title, soloDesembolsos, excluirDesembolsos } = CONFIGURACION_VISTA[vista];
  const tieneAccesoAMovimientos = hasPermission(user, 'caja_movimientos.crear');

  const [result, setResult] = useState<PaginatedData<CajaMovimiento> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);

  const [conceptoFiltro, setConceptoFiltro] = useState<number | ''>('');
  const [usuarioFiltro, setUsuarioFiltro] = useState<number | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  // null = todavía no llegó. Solo se ofrece el filtro/columna de usuario si el
  // actor ve movimientos de alguien más aparte de los suyos.
  const [usuarios, setUsuarios] = useState<{ id: number; nombre: string; apellido: string }[] | null>(null);

  const veOtrosUsuarios = usuarios !== null && usuarios.some((u) => u.id !== user?.id);

  function loadMovimientos() {
    setIsLoading(true);
    setLoadError(null);

    listMovimientosCaja(tipo, {
      page,
      conceptoId: vista === 'desembolsos' ? undefined : conceptoFiltro || undefined,
      soloDesembolsos,
      excluirDesembolsos,
      registradoPor: usuarioFiltro || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    })
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadMovimientos, [vista, page, conceptoFiltro, usuarioFiltro, desde, hasta]);

  useEffect(() => {
    if (vista === 'desembolsos') {
      setConceptos([]);
    } else {
      listConceptos({ tipo: tipo === 'ingreso' ? 'ingreso' : 'gasto' })
        .then((res) => setConceptos(res.data))
        .catch(() => setConceptos([]));
    }

    listUsuariosMovimientosCaja()
      .then((res) => setUsuarios(res.data))
      .catch(() => setUsuarios([]));
  }, [tipo, vista]);

  if (!tieneAccesoAMovimientos) {
    return <Navigate to="/" replace />;
  }

  /** Cambiar un filtro vuelve a la primera página. */
  function cambiarFiltro<T>(setter: (valor: T) => void) {
    return (valor: T) => {
      setter(valor);
      setPage(1);
    };
  }

  const activeFiltersCount = [vista === 'desembolsos' ? '' : conceptoFiltro, usuarioFiltro, desde, hasta].filter(
    (valor) => valor !== ''
  ).length;

  function clearFiltros() {
    setConceptoFiltro('');
    setUsuarioFiltro('');
    setDesde('');
    setHasta('');
    setPage(1);
  }

  const columnaAcciones: DataTableColumn<CajaMovimiento> = {
    header: 'Acciones',
    align: 'right',
    render: (m) => {
      const comprobante = comprobanteDe(m);
      const fotosAdicionales = (m.fotos ?? []).filter((f) => f.tipo === 'adicional');
      const actions: RowAction[] = [];

      if (comprobante) {
        actions.push({
          key: 'comprobante',
          label: 'Ver comprobante',
          icon: <ReceiptLongIcon fontSize="small" />,
          onClick: () => setLightbox(fotoLightboxItem(comprobante, 'Comprobante')),
        });
      }

      fotosAdicionales.forEach((foto, index) => {
        actions.push({
          key: `foto-${foto.id}`,
          label: `Ver foto adicional ${index + 1}`,
          icon: <ImageIcon fontSize="small" />,
          onClick: () => setLightbox(fotoLightboxItem(foto, `Foto adicional ${index + 1}`)),
        });
      });

      return <RowActions actions={actions} />;
    },
  };

  const columns: DataTableColumn<CajaMovimiento>[] =
    vista === 'desembolsos'
      ? [
          { header: 'Fecha de caja', render: (m) => formatFecha(m.fecha_caja) },
          {
            header: 'Crédito',
            render: (m) => (
              <Stack spacing={0.25}>
                <Typography variant="body2">{m.credito?.codigo ?? `Movimiento #${m.id}`}</Typography>
                {m.credito && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {`${TIPOS_CREDITO[m.credito.tipo_credito]} · Desembolsado el ${formatFecha(m.credito.fecha_desembolso)}`}
                  </Typography>
                )}
              </Stack>
            ),
          },
          {
            header: 'Cliente',
            render: (m) => {
              const cliente = m.credito?.cliente;
              return cliente ? `${cliente.nombre} ${cliente.apellido}` : '—';
            },
          },
          { header: 'Monto', render: (m) => formatMonto(m.monto) },
          ...(veOtrosUsuarios
            ? [{ header: 'Desembolsó', render: (m: CajaMovimiento) => extractUserName(m.registrado_por) ?? '—' }]
            : []),
          columnaAcciones,
        ]
      : [
          { header: 'Fecha', render: (m) => formatFecha(m.fecha_caja) },
          {
            header: 'Concepto',
            render: (m) => (
              <Stack spacing={0.25}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {tipo === 'egreso' && <Chip label={movimientoCicloLabel(m)} size="small" color={movimientoCicloColor(m)} />}
                  <Typography variant="body2">{m.concepto}</Typography>
                </Stack>
                {m.descripcion && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {m.descripcion}
                  </Typography>
                )}
              </Stack>
            ),
          },
          { header: 'Monto', render: (m) => formatMonto(m.monto) },
          ...(veOtrosUsuarios
            ? [{ header: 'Registrado por', render: (m: CajaMovimiento) => extractUserName(m.registrado_por) ?? '—' }]
            : []),
          columnaAcciones,
        ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <FiltrosPanel activeCount={activeFiltersCount} onClear={clearFiltros}>
            {vista !== 'desembolsos' && (
              <TextField
                select
                label="Concepto"
                value={conceptoFiltro}
                onChange={(e) => {
                  const valor = e.target.value;
                  cambiarFiltro(setConceptoFiltro)(valor === '' ? '' : Number(valor));
                }}
                size="small"
                fullWidth
              >
                <MenuItem value="">Todos</MenuItem>
                {conceptos.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {veOtrosUsuarios && (
              <TextField
                select
                label="Usuario"
                value={usuarioFiltro}
                onChange={(e) => cambiarFiltro(setUsuarioFiltro)(e.target.value === '' ? '' : Number(e.target.value))}
                size="small"
                fullWidth
              >
                <MenuItem value="">Todos</MenuItem>
                {usuarios?.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {`${u.nombre} ${u.apellido}`.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Desde"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={desde}
              onChange={(e) => cambiarFiltro(setDesde)(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Hasta"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={hasta}
              onChange={(e) => cambiarFiltro(setHasta)(e.target.value)}
              size="small"
              fullWidth
            />
          </FiltrosPanel>
          {tieneAccesoAMovimientos && vista !== 'desembolsos' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRegistrarOpen(true)}>
              Nuevo {tipo === 'ingreso' ? 'ingreso' : 'egreso'}
            </Button>
          )}
        </Stack>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(m) => m.id}
        isLoading={isLoading}
        emptyMessage={`No hay ${vista === 'ingresos' ? 'ingresos' : vista === 'egresos' ? 'egresos' : 'desembolsos'} registrados`}
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      {vista !== 'desembolsos' && (
        <RegistrarMovimientoCajaDialog
          tipo={registrarOpen ? tipo : null}
          onClose={() => setRegistrarOpen(false)}
          onRegistered={loadMovimientos}
        />
      )}

      <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />
    </Stack>
  );
}

export function IngresosPage() {
  return <MovimientosCajaPage vista="ingresos" />;
}

export function EgresosPage() {
  return <MovimientosCajaPage vista="egresos" />;
}

export function DesembolsosPage() {
  return <MovimientosCajaPage vista="desembolsos" />;
}
