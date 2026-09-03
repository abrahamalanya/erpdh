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
  canCrearInmuebles,
  canEditarInmuebles,
  canVerInmuebles,
} from '../utils/creditoPrendarioHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { ClienteAutocomplete } from '../components/ClienteAutocomplete';
import {
  InmuebleCreateFields,
  emptyInmuebleCreateForm,
  inmuebleCreatePayload,
  type InmuebleCreateFormValue,
} from '../components/InmuebleCreateFields';
import { createInmueble, listInmuebles, updateInmueble } from '../api/inmuebles';
import { formatMonto } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import type { Cliente, Inmueble, PaginatedData } from '../types/api';

function formToState(i: Inmueble): InmuebleCreateFormValue {
  return {
    partida_registral: i.partida_registral,
    oficina_registral: i.oficina_registral ?? '',
    tipo_inmueble: i.tipo_inmueble ?? '',
    direccion: i.direccion,
    distrito: i.distrito ?? '',
    provincia: i.provincia ?? '',
    departamento: i.departamento ?? '',
    area_terreno: i.area_terreno ?? '',
    area_construida: i.area_construida ?? '',
    propietario: i.propietario,
    con_gravamen: i.con_gravamen ? 'si' : 'no',
    linderos: i.linderos ?? '',
    observacion: i.observacion ?? '',
    valorizacion: i.valorizacion,
    puntaje: i.puntaje != null ? String(i.puntaje) : '',
    foto_cliente_producto: null,
    fotos: [],
    video: null,
  };
}

export function InmueblesPage() {
  const { user } = useAuth();
  const canCreate = canCrearInmuebles(user);
  const canEdit = canEditarInmuebles(user);

  const [result, setResult] = useState<PaginatedData<Inmueble> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Inmueble | null>(null);
  const [form, setForm] = useState<InmuebleCreateFormValue>(emptyInmuebleCreateForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function load() {
    setIsLoading(true);
    setLoadError(null);
    listInmuebles(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page]);

  if (!canVerInmuebles(user)) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setEditing(null);
    setForm(emptyInmuebleCreateForm);
    setClienteSel(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(inmueble: Inmueble) {
    setEditing(inmueble);
    setForm(formToState(inmueble));
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (editing) {
        await updateInmueble(editing.id, inmuebleCreatePayload(form));
      } else {
        if (!clienteSel) {
          setFormError('Selecciona un cliente');
          setIsSaving(false);
          return;
        }
        await createInmueble({ cliente_id: clienteSel.id, ...inmuebleCreatePayload(form) });
      }

      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<Inmueble>[] = [
    { header: 'Partida', render: (i) => i.partida_registral.toUpperCase() },
    { header: 'Tipo', render: (i) => (i.tipo_inmueble ? i.tipo_inmueble.toUpperCase() : '—') },
    { header: 'Dirección', render: (i) => i.direccion.toUpperCase() },
    { header: 'Distrito', render: (i) => (i.distrito ? i.distrito.toUpperCase() : '—') },
    { header: 'Gravamen', render: (i) => (i.con_gravamen ? 'Sí' : 'No') },
    { header: 'Valorización', render: (i) => formatMonto(i.valorizacion) },
    { header: 'Precio venta', render: (i) => (i.precio_venta ? formatMonto(i.precio_venta) : '—') },
    {
      header: 'Cliente',
      render: (i) => (i.cliente ? `${i.cliente.nombre} ${i.cliente.apellido}`.toUpperCase() : '—'),
    },
    {
      header: 'Estado',
      render: (i) => (
        <Chip label={BIEN_ESTADO_LABELS[i.estado]} size="small" color={BIEN_ESTADO_COLOR[i.estado]} />
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (i) =>
        canEdit && (
          <RowActions
            actions={[
              {
                key: 'editar',
                label: 'Editar',
                icon: <EditIcon fontSize="small" />,
                onClick: () => openEditDialog(i),
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
          Inmuebles
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nuevo inmueble
          </Button>
        )}
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(i) => i.id}
        isLoading={isLoading}
        emptyMessage="No hay inmuebles registrados"
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
          <DialogTitle>{editing ? 'Editar inmueble' : 'Nuevo inmueble'}</DialogTitle>
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

              <InmuebleCreateFields
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
