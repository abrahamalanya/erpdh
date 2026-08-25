import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Button, Chip, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ImageIcon from '@mui/icons-material/Image';
import { useAuth } from '../hooks/useAuth';
import { hasPermission } from '../utils/roles';
import { extractUserName } from '../utils/cajaHierarchy';
import { movimientoCicloColor, movimientoCicloLabel } from '../utils/cajaMovimientos';
import { formatFecha, formatMonto } from '../utils/format';
import { listMovimientosCaja } from '../api/caja';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions, type RowAction } from '../components/RowActions';
import { RegistrarMovimientoCajaDialog } from '../components/RegistrarMovimientoCajaDialog';
import { MediaLightbox, type MediaLightboxItem } from '../components/MediaLightbox';
import type { CajaMovimiento, MovimientoFoto, PaginatedData } from '../types/api';

interface MovimientosCajaPageProps {
  tipo: 'ingreso' | 'egreso';
  title: string;
}

function comprobanteDe(m: CajaMovimiento): MovimientoFoto | undefined {
  return m.fotos?.find((f) => f.tipo === 'comprobante');
}

function fotoLightboxItem(foto: MovimientoFoto, label: string): MediaLightboxItem {
  return { type: foto.path.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image', url: foto.url, label };
}

function MovimientosCajaPage({ tipo, title }: MovimientosCajaPageProps) {
  const { user } = useAuth();
  const canRegistrar = hasPermission(user, 'caja_movimientos.crear');

  const [result, setResult] = useState<PaginatedData<CajaMovimiento> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);

  function loadMovimientos() {
    setIsLoading(true);
    setLoadError(null);

    listMovimientosCaja(tipo, page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadMovimientos, [tipo, page]);

  if (!canRegistrar) {
    return <Navigate to="/" replace />;
  }

  const columns: DataTableColumn<CajaMovimiento>[] = [
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
    { header: 'Registrado por', render: (m) => extractUserName(m.registrado_por) ?? '—' },
    {
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
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {canRegistrar && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRegistrarOpen(true)}>
            Nuevo {tipo === 'ingreso' ? 'ingreso' : 'gasto'}
          </Button>
        )}
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(m) => m.id}
        isLoading={isLoading}
        emptyMessage={`No hay ${tipo === 'ingreso' ? 'ingresos' : 'gastos'} registrados`}
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <RegistrarMovimientoCajaDialog
        tipo={registrarOpen ? tipo : null}
        onClose={() => setRegistrarOpen(false)}
        onRegistered={loadMovimientos}
      />

      <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />
    </Stack>
  );
}

export function IngresosPage() {
  return <MovimientosCajaPage tipo="ingreso" title="Ingresos" />;
}

export function GastosPage() {
  return <MovimientosCajaPage tipo="egreso" title="Gastos" />;
}
