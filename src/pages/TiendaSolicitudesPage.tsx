import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Checkbox, Chip, FormControlLabel, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { useAuth } from '../hooks/useAuth';
import {
  ARTICULO_TIPO_LABELS,
  canAtenderSolicitudesTienda,
  canCrearVentas,
  canVerSolicitudesTienda,
  type VentaPrefillState,
} from '../utils/ventaHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { atenderSolicitudTienda, deleteSolicitudTienda, listSolicitudesTienda } from '../api/tienda';
import { formatFechaHora } from '../utils/format';
import type { InteresArticulo, PaginatedData } from '../types/api';

export function TiendaSolicitudesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canAtender = canAtenderSolicitudesTienda(user);
  const canVender = canCrearVentas(user);

  const [result, setResult] = useState<PaginatedData<InteresArticulo> | null>(null);
  const [page, setPage] = useState(1);
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [atenderError, setAtenderError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InteresArticulo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    setLoadError(null);

    listSolicitudesTienda(page, { pendientes: soloPendientes || undefined })
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, soloPendientes]);

  if (!canVerSolicitudesTienda(user)) {
    return <Navigate to="/" replace />;
  }

  async function handleAtender(interes: InteresArticulo) {
    setAtenderError(null);

    try {
      await atenderSolicitudTienda(interes.id);
      load();
    } catch (err) {
      setAtenderError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteSolicitudTienda(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeleting(false);
    }
  }

  /**
   * Lleva la solicitud al módulo Ventas ya con el artículo elegido y los
   * datos de contacto precargados — la solicitud no está ligada a un
   * Cliente, así que VentasPage ofrece buscar uno existente o registrarlo
   * con este nombre/teléfono. Al completar la venta, VentasPage marca esta
   * solicitud como atendida.
   */
  function handleRegistrarVenta(interes: InteresArticulo) {
    const state: VentaPrefillState = {
      prefillArticuloTipo: interes.articulo_type,
      prefillArticuloId: interes.articulo_id,
      prefillNombre: interes.nombre,
      prefillTelefono: interes.telefono,
      solicitudId: interes.id,
    };

    navigate('/ventas', { state });
  }

  const columns: DataTableColumn<InteresArticulo>[] = [
    { header: 'Fecha', render: (i) => formatFechaHora(i.created_at) },
    { header: 'Nombre', render: (i) => i.nombre.toUpperCase() },
    { header: 'WhatsApp', render: (i) => i.telefono },
    { header: 'Artículo', render: (i) => `${ARTICULO_TIPO_LABELS[i.articulo_type]}${i.articulo ? ` — ${i.articulo.nombre}` : ''}` },
    { header: 'Mensaje', render: (i) => i.mensaje ?? '—' },
    {
      header: 'Estado',
      render: (i) => (
        <Chip
          label={i.atendido_at ? 'Atendida' : 'Pendiente'}
          size="small"
          color={i.atendido_at ? 'success' : 'warning'}
        />
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (i) =>
        (canAtender || canVender) && (
          <RowActions
            actions={[
              ...(!i.atendido_at && canVender
                ? [{ key: 'vender', label: 'Registrar venta', icon: <PointOfSaleIcon fontSize="small" />, onClick: () => handleRegistrarVenta(i) }]
                : []),
              ...(!i.atendido_at && canAtender
                ? [{ key: 'atender', label: 'Marcar atendida', icon: <CheckIcon fontSize="small" />, onClick: () => handleAtender(i) }]
                : []),
              ...(canAtender
                ? [
                    {
                      key: 'eliminar',
                      label: 'Eliminar',
                      icon: <DeleteIcon fontSize="small" />,
                      onClick: () => {
                        setDeleteError(null);
                        setDeleteTarget(i);
                      },
                    },
                  ]
                : []),
            ]}
          />
        ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Solicitudes de la tienda virtual
      </Typography>

      <FormControlLabel
        control={
          <Checkbox
            checked={soloPendientes}
            onChange={(e) => {
              setPage(1);
              setSoloPendientes(e.target.checked);
            }}
          />
        }
        label="Solo pendientes"
      />

      {loadError && <Alert severity="error">{loadError}</Alert>}
      {atenderError && <Alert severity="error">{atenderError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(i) => i.id}
        isLoading={isLoading}
        emptyMessage="No hay solicitudes"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar solicitud"
        message="¿Seguro que deseas eliminar esta solicitud de la tienda virtual?"
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        error={deleteError}
      />
    </Stack>
  );
}
