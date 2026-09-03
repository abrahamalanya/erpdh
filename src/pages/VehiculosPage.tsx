import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../hooks/useAuth';
import {
  BIEN_ESTADO_COLOR,
  BIEN_ESTADO_LABELS,
  canCrearVehiculos,
  canEditarVehiculos,
  canVerVehiculos,
} from '../utils/creditoPrendarioHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { ClienteAutocomplete } from '../components/ClienteAutocomplete';
import {
  VehiculoCreateFields,
  emptyVehiculoCreateForm,
  vehiculoCreatePayload,
  type VehiculoCreateFormValue,
} from '../components/VehiculoCreateFields';
import { createVehiculo, listVehiculos, updateVehiculo } from '../api/vehiculos';
import { formatMonto } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import type { Cliente, PaginatedData, Vehiculo } from '../types/api';

function formToState(v: Vehiculo): VehiculoCreateFormValue {
  return {
    placa: v.placa,
    motor: v.motor,
    serie: v.serie,
    color: v.color,
    marca: v.marca,
    modelo: v.modelo ?? '',
    anio: v.anio != null ? String(v.anio) : '',
    clase: v.clase ?? '',
    propietario: v.propietario,
    tiene_soat: v.tiene_soat ? 'si' : 'no',
    observacion: v.observacion ?? '',
    valorizacion: v.valorizacion,
    puntaje: v.puntaje != null ? String(v.puntaje) : '',
    foto_cliente_producto: null,
    fotos: [],
    video: null,
  };
}

export function VehiculosPage() {
  const { user } = useAuth();
  const canCreate = canCrearVehiculos(user);
  const canEdit = canEditarVehiculos(user);

  const [result, setResult] = useState<PaginatedData<Vehiculo> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vehiculo | null>(null);
  const [form, setForm] = useState<VehiculoCreateFormValue>(emptyVehiculoCreateForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function load() {
    setIsLoading(true);
    setLoadError(null);
    listVehiculos(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page]);

  if (!canVerVehiculos(user)) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setEditing(null);
    setForm(emptyVehiculoCreateForm);
    setClienteSel(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(vehiculo: Vehiculo) {
    setEditing(vehiculo);
    setForm(formToState(vehiculo));
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (editing) {
        await updateVehiculo(editing.id, vehiculoCreatePayload(form));
      } else {
        if (!clienteSel) {
          setFormError('Selecciona un cliente');
          setIsSaving(false);
          return;
        }
        await createVehiculo({ cliente_id: clienteSel.id, ...vehiculoCreatePayload(form) });
      }

      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<Vehiculo>[] = [
    { header: 'Placa', render: (v) => v.placa.toUpperCase() },
    {
      header: 'Marca / Modelo',
      render: (v) =>
        [v.marca, v.modelo]
          .filter((x): x is string => !!x)
          .map((x) => x.toUpperCase())
          .join(' / ') || '—',
    },
    { header: 'Año', render: (v) => v.anio ?? '—' },
    { header: 'SOAT', render: (v) => (v.tiene_soat ? 'Sí' : 'No') },
    { header: 'Valorización', render: (v) => formatMonto(v.valorizacion) },
    { header: 'Precio venta', render: (v) => (v.precio_venta ? formatMonto(v.precio_venta) : '—') },
    {
      header: 'Cliente',
      render: (v) => (v.cliente ? `${v.cliente.nombre} ${v.cliente.apellido}`.toUpperCase() : '—'),
    },
    { header: 'Agencia', render: (v) => v.agencia?.nombre.toUpperCase() ?? '—' },
    {
      header: 'Estado',
      render: (v) => (
        <Chip label={BIEN_ESTADO_LABELS[v.estado]} size="small" color={BIEN_ESTADO_COLOR[v.estado]} />
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (v) =>
        canEdit && (
          <RowActions
            actions={[
              {
                key: 'editar',
                label: 'Editar',
                icon: <EditIcon fontSize="small" />,
                onClick: () => openEditDialog(v),
              },
            ]}
          />
        ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Vehículos
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nuevo vehículo
          </Button>
        )}
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(v) => v.id}
        isLoading={isLoading}
        emptyMessage="No hay vehículos registrados"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog
        open={dialogOpen}
        onClose={preventBackdropClose(() => setDialogOpen(false))}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Editar vehículo' : 'Nuevo vehículo'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}

              {editing ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Cliente:{' '}
                  {editing.cliente ? `${editing.cliente.nombre} ${editing.cliente.apellido}` : '—'}
                </Typography>
              ) : (
                <ClienteAutocomplete value={clienteSel} onChange={setClienteSel} required autoFocus />
              )}

              <VehiculoCreateFields
                value={form}
                onChange={(v) => setForm(v)}
                autoFocus={!!editing}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
