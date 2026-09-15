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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import DescriptionIcon from '@mui/icons-material/Description';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import {
  canAsignarClientes,
  canCreateClientes,
  canDeleteClientes,
  canEditCliente,
  canViewClientes,
  TIPO_DOCUMENTO_LABELS,
} from '../utils/clienteHierarchy';
import {
  BIEN_TIPO_LABELS,
  canCrearBienes,
  canCrearInmuebles,
  canCrearVehiculos,
  canVerBienes,
  canVerInmuebles,
  canVerVehiculos,
} from '../utils/creditoPrendarioHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { DraftRestoreBanner } from '../components/DraftRestoreBanner';
import { RowActions, type RowAction } from '../components/RowActions';
import { useFormDraft } from '../hooks/useFormDraft';
import { PhotoField } from '../components/MediaFields';
import { UpperTextField } from '../components/UpperTextField';
import { UbigeoSelect } from '../components/UbigeoSelect';
import { LocationMap } from '../components/LocationMap';
import {
  ClienteCreateFields,
  clienteCreatePayload,
  emptyClienteCreateForm,
  type ClienteCreateFormValue,
} from '../components/ClienteCreateFields';
import { BienCreateFields, bienCreatePayload, emptyBienCreateForm, type BienCreateFormValue } from '../components/BienCreateFields';
import {
  VehiculoCreateFields,
  vehiculoCreatePayload,
  emptyVehiculoCreateForm,
  type VehiculoCreateFormValue,
} from '../components/VehiculoCreateFields';
import {
  InmuebleCreateFields,
  inmuebleCreatePayload,
  emptyInmuebleCreateForm,
  type InmuebleCreateFormValue,
} from '../components/InmuebleCreateFields';
import { FichaSocioeconomicaDialog } from '../components/FichaSocioeconomicaDialog';
import { ClienteGarantiaDialog } from '../components/ClienteGarantiaDialog';
import { capitalize } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import {
  asignarCliente,
  createCliente,
  deleteCliente,
  getAsesoresParaAsignar,
  listClientes,
  updateCliente,
  type AsesorParaAsignar,
  type CreateClientePayload,
  type UpdateClientePayload,
} from '../api/clientes';
import { createBien, listBienes } from '../api/bienes';
import { createVehiculo, listVehiculos } from '../api/vehiculos';
import { createInmueble, listInmuebles } from '../api/inmuebles';
import { listEmpresas } from '../api/empresas';
import { listAgencias } from '../api/agencias';
import { formatMonto } from '../utils/format';
import type { Agencia, Bien, Cliente, Empresa, Estado, Inmueble, PaginatedData, TipoDocumento, Vehiculo } from '../types/api';

interface CreateFormState extends ClienteCreateFormValue {
  empresa_id?: number;
  agencia_id?: number;
}

interface EditFormState {
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  fecha_nacimiento: string;
  sexo: '' | 'm' | 'f';
  estado_civil: string;
  email: string;
  telefono: string;
  direccion: string;
  ubigeo_distrito_id: number | null;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
  direccion_negocio: string;
  ubigeo_distrito_negocio_id: number | null;
  referencia_negocio: string;
  latitud_negocio: number | null;
  longitud_negocio: number | null;
  estado: Estado;
  foto_cliente: File | null;
  foto_dni: File | null;
  foto_dni_reverso: File | null;
  foto_casa: File | null;
  foto_negocio: File | null;
}

const emptyCreateForm: CreateFormState = { ...emptyClienteCreateForm };

interface FiltersState {
  q: string;
  estado: Estado | '';
  tipo_documento: TipoDocumento | '';
  agencia_id?: number;
}

const emptyFilters: FiltersState = { q: '', estado: '', tipo_documento: '' };

export function ClientesPage() {
  const { user } = useAuth();
  const isSistemas = hasRole(user, 'sistemas');
  const needsAgenciaPicker = hasRole(user, 'sistemas', 'administrador_general', 'secretaria');
  const canCreate = canCreateClientes(user);
  const canDelete = canDeleteClientes(user);
  const canAsignar = canAsignarClientes(user);

  const [result, setResult] = useState<PaginatedData<Cliente> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [asesoresDisponibles, setAsesoresDisponibles] = useState<AsesorParaAsignar[]>([]);

  const [filters, setFilters] = useState<FiltersState>(emptyFilters);

  function updateFilters(patch: Partial<FiltersState>) {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const clienteDraft = useFormDraft('cliente-create', createForm, setCreateForm, dialogOpen && !editing);

  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fichaTarget, setFichaTarget] = useState<Cliente | null>(null);
  const [bienesTarget, setBienesTarget] = useState<Cliente | null>(null);
  const [vehiculosTarget, setVehiculosTarget] = useState<Cliente | null>(null);
  const [inmueblesTarget, setInmueblesTarget] = useState<Cliente | null>(null);

  const [asignarTarget, setAsignarTarget] = useState<Cliente | null>(null);
  const [asesorId, setAsesorId] = useState<number | ''>('');
  const [isAsignando, setIsAsignando] = useState(false);

  function loadClientes() {
    setIsLoading(true);
    setLoadError(null);

    listClientes({
      page,
      q: filters.q || undefined,
      estado: filters.estado || undefined,
      tipo_documento: filters.tipo_documento || undefined,
      agencia_id: filters.agencia_id,
    })
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadClientes, [page, filters]);

  useEffect(() => {
    if (isSistemas) {
      listEmpresas().then((res) => setEmpresas(res.data.data));
    }
  }, [isSistemas]);

  useEffect(() => {
    if (needsAgenciaPicker) {
      listAgencias().then((res) => setAgencias(res.data.data));
    }
  }, [needsAgenciaPicker]);

  useEffect(() => {
    if (canAsignar && asignarTarget) {
      getAsesoresParaAsignar(asignarTarget.agencia_id)
        .then((res) => setAsesoresDisponibles(res.data))
        .catch(() => setAsesoresDisponibles([]));
    } else {
      setAsesoresDisponibles([]);
    }
  }, [canAsignar, asignarTarget]);

  if (!canViewClientes(user)) {
    return <Navigate to="/" replace />;
  }

  const availableAgencias = isSistemas
    ? agencias.filter((a) => a.empresa_id === createForm.empresa_id)
    : agencias;

  function openCreateDialog() {
    setEditing(null);
    setCreateForm(emptyCreateForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(cliente: Cliente) {
    setEditing(cliente);
    setEditForm({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      tipo_documento: cliente.tipo_documento,
      numero_documento: cliente.numero_documento,
      fecha_nacimiento: cliente.fecha_nacimiento ? cliente.fecha_nacimiento.slice(0, 10) : '',
      sexo: cliente.sexo ?? '',
      estado_civil: cliente.estado_civil ?? '',
      email: cliente.email ?? '',
      telefono: cliente.telefono ?? '',
      direccion: cliente.direccion ?? '',
      ubigeo_distrito_id: cliente.ubigeo_distrito_id ?? null,
      referencia: cliente.referencia ?? '',
      latitud: cliente.latitud ? Number(cliente.latitud) : null,
      longitud: cliente.longitud ? Number(cliente.longitud) : null,
      direccion_negocio: cliente.direccion_negocio ?? '',
      ubigeo_distrito_negocio_id: cliente.ubigeo_distrito_negocio_id ?? null,
      referencia_negocio: cliente.referencia_negocio ?? '',
      latitud_negocio: cliente.latitud_negocio ? Number(cliente.latitud_negocio) : null,
      longitud_negocio: cliente.longitud_negocio ? Number(cliente.longitud_negocio) : null,
      estado: cliente.estado,
      foto_cliente: null,
      foto_dni: null,
      foto_dni_reverso: null,
      foto_casa: null,
      foto_negocio: null,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (editing && editForm) {
        const payload: UpdateClientePayload = {
          nombre: editForm.nombre.toLowerCase(),
          apellido: editForm.apellido.toLowerCase(),
          tipo_documento: editForm.tipo_documento,
          numero_documento: editForm.numero_documento,
          fecha_nacimiento: editForm.fecha_nacimiento || undefined,
          sexo: editForm.sexo || undefined,
          estado_civil: editForm.estado_civil ? editForm.estado_civil.toLowerCase() : undefined,
          email: editForm.email || undefined,
          telefono: editForm.telefono || undefined,
          direccion: editForm.direccion ? editForm.direccion.toLowerCase() : undefined,
          ubigeo_distrito_id: editForm.ubigeo_distrito_id ?? undefined,
          referencia: editForm.referencia ? editForm.referencia.toLowerCase() : undefined,
          latitud: editForm.latitud ?? undefined,
          longitud: editForm.longitud ?? undefined,
          direccion_negocio: editForm.direccion_negocio ? editForm.direccion_negocio.toLowerCase() : undefined,
          ubigeo_distrito_negocio_id: editForm.ubigeo_distrito_negocio_id ?? undefined,
          referencia_negocio: editForm.referencia_negocio ? editForm.referencia_negocio.toLowerCase() : undefined,
          latitud_negocio: editForm.latitud_negocio ?? undefined,
          longitud_negocio: editForm.longitud_negocio ?? undefined,
          estado: editForm.estado,
          foto_cliente: editForm.foto_cliente,
          foto_dni: editForm.foto_dni,
          foto_dni_reverso: editForm.foto_dni_reverso,
          foto_casa: editForm.foto_casa,
          foto_negocio: editForm.foto_negocio,
        };

        await updateCliente(editing.id, payload);
      } else {
        const payload: CreateClientePayload = { ...clienteCreatePayload(createForm) };

        if (isSistemas) payload.empresa_id = createForm.empresa_id;
        if (needsAgenciaPicker) payload.agencia_id = createForm.agencia_id;

        const created = await createCliente(payload);
        clienteDraft.clear();
        loadClientes();

        // Keep the dialog open, switched into edit mode on the cliente we
        // just created, so bienes can be added right away without leaving
        // the modal — a brand-new cliente has no id until this point, so
        // the Bienes section can only appear from here on.
        openEditDialog(created.data);
        return;
      }

      setDialogOpen(false);
      loadClientes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      await deleteCliente(deleteTarget.id);
      setDeleteTarget(null);
      loadClientes();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAsignar() {
    if (!asignarTarget || asesorId === '') return;

    setIsAsignando(true);

    try {
      await asignarCliente(asignarTarget.id, asesorId);
      setAsignarTarget(null);
      setAsesorId('');
      loadClientes();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsAsignando(false);
    }
  }

  const columns: DataTableColumn<Cliente>[] = [
    { header: 'Nombre', render: (c) => `${c.nombre} ${c.apellido}`.toUpperCase() },
    {
      header: 'Documento',
      render: (c) => `${TIPO_DOCUMENTO_LABELS[c.tipo_documento] ?? c.tipo_documento} ${c.numero_documento}`,
    },
    { header: 'Teléfono', render: (c) => c.telefono ?? '—' },
    { header: 'Agencia', render: (c) => c.agencia?.nombre.toUpperCase() ?? '—' },
    {
      header: 'Asesor',
      render: (c) => (c.asesor ? `${c.asesor.nombre} ${c.asesor.apellido}`.toUpperCase() : 'Sin asignar'),
    },
    {
      header: 'Estado',
      render: (c) => (
        <Chip
          label={capitalize(c.estado)}
          size="small"
          color={c.estado === 'activo' ? 'success' : 'default'}
        />
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (c) => {
        const actions: RowAction[] = [];

        if (canEditCliente(user, c)) {
          actions.push({
            key: 'editar',
            label: 'Editar',
            icon: <EditIcon fontSize="small" />,
            onClick: () => openEditDialog(c),
          });
          actions.push({
            key: 'ficha',
            label: 'Ficha socioeconómica',
            icon: <DescriptionIcon fontSize="small" />,
            onClick: () => setFichaTarget(c),
          });
        }
        if (canVerBienes(user)) {
          actions.push({
            key: 'bienes',
            label: 'Bienes',
            icon: <Inventory2Icon fontSize="small" />,
            onClick: () => setBienesTarget(c),
          });
        }
        if (canVerVehiculos(user)) {
          actions.push({
            key: 'vehiculos',
            label: 'Vehículos',
            icon: <DirectionsCarIcon fontSize="small" />,
            onClick: () => setVehiculosTarget(c),
          });
        }
        if (canVerInmuebles(user)) {
          actions.push({
            key: 'inmuebles',
            label: 'Inmuebles',
            icon: <HomeWorkIcon fontSize="small" />,
            onClick: () => setInmueblesTarget(c),
          });
        }
        if (canAsignar) {
          actions.push({
            key: 'asignar',
            label: 'Asignar asesor',
            icon: <AssignmentIndIcon fontSize="small" />,
            onClick: () => setAsignarTarget(c),
          });
        }
        if (canDelete) {
          actions.push({
            key: 'eliminar',
            label: 'Eliminar',
            icon: <DeleteIcon fontSize="small" />,
            onClick: () => setDeleteTarget(c),
          });
        }

        return <RowActions actions={actions} />;
      },
    },
  ];

  const activeFiltersCount = [
    filters.q,
    filters.estado,
    filters.tipo_documento,
    filters.agencia_id,
  ].filter((value) => value !== '' && value !== undefined).length;

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Clientes
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <FiltrosPanel activeCount={activeFiltersCount} onClear={() => updateFilters(emptyFilters)}>
            <TextField
              label="Buscar"
              placeholder="Nombre, apellido o documento"
              value={filters.q}
              onChange={(e) => updateFilters({ q: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              select
              label="Estado"
              value={filters.estado}
              onChange={(e) => updateFilters({ estado: e.target.value as Estado | '' })}
              size="small"
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="activo">Activo</MenuItem>
              <MenuItem value="inactivo">Inactivo</MenuItem>
            </TextField>
            <TextField
              select
              label="Tipo de documento"
              value={filters.tipo_documento}
              onChange={(e) =>
                updateFilters({ tipo_documento: e.target.value as TipoDocumento | '' })
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(TIPO_DOCUMENTO_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            {agencias.length > 0 && (
              <TextField
                select
                label="Agencia"
                value={filters.agencia_id ?? ''}
                onChange={(e) =>
                  updateFilters({
                    agencia_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                size="small"
                fullWidth
              >
                <MenuItem value="">Todas</MenuItem>
                {agencias.map((agencia) => (
                  <MenuItem key={agencia.id} value={agencia.id}>
                    {agencia.nombre.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </FiltrosPanel>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Nuevo cliente
            </Button>
          )}
        </Stack>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay clientes registrados"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}

              {editing && editForm ? (
                <>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      select
                      label="Tipo de documento"
                      value={editForm.tipo_documento}
                      onChange={(e) =>
                        setEditForm((f) => f && { ...f, tipo_documento: e.target.value as TipoDocumento })
                      }
                      fullWidth
                      sx={{ maxWidth: 160 }}
                    >
                      <MenuItem value="dni">DNI</MenuItem>
                      <MenuItem value="ce">CE</MenuItem>
                      <MenuItem value="pasaporte">Pasaporte</MenuItem>
                    </TextField>
                    <TextField
                      label="Número de documento"
                      value={editForm.numero_documento}
                      onChange={(e) =>
                        setEditForm((f) => f && { ...f, numero_documento: e.target.value })
                      }
                      required
                      autoFocus
                      fullWidth
                    />
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <UpperTextField
                      label="Nombre"
                      value={editForm.nombre}
                      onChange={(e) => setEditForm((f) => f && { ...f, nombre: e.target.value })}
                      required
                      fullWidth
                    />
                    <UpperTextField
                      label="Apellido"
                      value={editForm.apellido}
                      onChange={(e) => setEditForm((f) => f && { ...f, apellido: e.target.value })}
                      required
                      fullWidth
                    />
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Fecha de nacimiento"
                      type="date"
                      value={editForm.fecha_nacimiento}
                      onChange={(e) => setEditForm((f) => f && { ...f, fecha_nacimiento: e.target.value })}
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                    />
                    <TextField
                      select
                      label="Sexo"
                      value={editForm.sexo}
                      onChange={(e) =>
                        setEditForm((f) => f && { ...f, sexo: e.target.value as EditFormState['sexo'] })
                      }
                      fullWidth
                    >
                      <MenuItem value="">—</MenuItem>
                      <MenuItem value="m">Masculino</MenuItem>
                      <MenuItem value="f">Femenino</MenuItem>
                    </TextField>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      select
                      label="Estado civil"
                      value={editForm.estado_civil}
                      onChange={(e) => setEditForm((f) => f && { ...f, estado_civil: e.target.value })}
                      fullWidth
                    >
                      <MenuItem value="">—</MenuItem>
                      {['soltero', 'casado', 'conviviente', 'divorciado', 'viudo'].map((v) => (
                        <MenuItem key={v} value={v}>
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => f && { ...f, email: e.target.value })}
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Teléfono"
                    value={editForm.telefono}
                    onChange={(e) => setEditForm((f) => f && { ...f, telefono: e.target.value })}
                  />
                  <Typography variant="subtitle2">Dirección de casa</Typography>
                  <UpperTextField
                    label="Dirección"
                    value={editForm.direccion}
                    onChange={(e) => setEditForm((f) => f && { ...f, direccion: e.target.value })}
                  />
                  <UbigeoSelect
                    value={editForm.ubigeo_distrito_id}
                    onChange={(id) => setEditForm((f) => f && { ...f, ubigeo_distrito_id: id })}
                  />
                  <UpperTextField
                    label="Referencia"
                    value={editForm.referencia}
                    onChange={(e) => setEditForm((f) => f && { ...f, referencia: e.target.value })}
                    multiline
                    minRows={2}
                  />
                  <LocationMap
                    latitud={editForm.latitud}
                    longitud={editForm.longitud}
                    onChange={(latitud, longitud) => setEditForm((f) => f && { ...f, latitud, longitud })}
                  />

                  <Typography variant="subtitle2">Dirección de negocio / trabajo</Typography>
                  <UpperTextField
                    label="Dirección del negocio"
                    value={editForm.direccion_negocio}
                    onChange={(e) => setEditForm((f) => f && { ...f, direccion_negocio: e.target.value })}
                  />
                  <UbigeoSelect
                    value={editForm.ubigeo_distrito_negocio_id}
                    onChange={(id) => setEditForm((f) => f && { ...f, ubigeo_distrito_negocio_id: id })}
                  />
                  <UpperTextField
                    label="Referencia del negocio"
                    value={editForm.referencia_negocio}
                    onChange={(e) => setEditForm((f) => f && { ...f, referencia_negocio: e.target.value })}
                    multiline
                    minRows={2}
                  />
                  <LocationMap
                    latitud={editForm.latitud_negocio}
                    longitud={editForm.longitud_negocio}
                    onChange={(latitud_negocio, longitud_negocio) =>
                      setEditForm((f) => f && { ...f, latitud_negocio, longitud_negocio })
                    }
                    label="Detectar GPS del negocio"
                  />

                  <TextField
                    select
                    label="Estado"
                    value={editForm.estado}
                    onChange={(e) => setEditForm((f) => f && { ...f, estado: e.target.value as Estado })}
                  >
                    <MenuItem value="activo">Activo</MenuItem>
                    <MenuItem value="inactivo">Inactivo</MenuItem>
                  </TextField>

                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      startIcon={<DescriptionIcon />}
                      onClick={() => setFichaTarget(editing)}
                    >
                      Ficha socioeconómica
                    </Button>
                    {canVerBienes(user) && (
                      <Button
                        variant="outlined"
                        startIcon={<Inventory2Icon />}
                        onClick={() => setBienesTarget(editing)}
                      >
                        Bienes
                      </Button>
                    )}
                    {canVerVehiculos(user) && (
                      <Button
                        variant="outlined"
                        startIcon={<DirectionsCarIcon />}
                        onClick={() => setVehiculosTarget(editing)}
                      >
                        Vehículos
                      </Button>
                    )}
                    {canVerInmuebles(user) && (
                      <Button
                        variant="outlined"
                        startIcon={<HomeWorkIcon />}
                        onClick={() => setInmueblesTarget(editing)}
                      >
                        Inmuebles
                      </Button>
                    )}
                  </Stack>

                  <Typography variant="subtitle2">Fotos</Typography>
                  <PhotoField
                    label="Foto del cliente"
                    file={editForm.foto_cliente}
                    currentUrl={editing.foto_cliente_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_cliente: file })}
                  />
                  <PhotoField
                    label="Foto del DNI (anverso)"
                    file={editForm.foto_dni}
                    currentUrl={editing.foto_dni_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_dni: file })}
                  />
                  <PhotoField
                    label="Foto del DNI (reverso)"
                    file={editForm.foto_dni_reverso}
                    currentUrl={editing.foto_dni_reverso_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_dni_reverso: file })}
                  />
                  <PhotoField
                    label="Foto de la casa"
                    file={editForm.foto_casa}
                    currentUrl={editing.foto_casa_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_casa: file })}
                  />
                  <PhotoField
                    label="Foto del negocio"
                    file={editForm.foto_negocio}
                    currentUrl={editing.foto_negocio_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_negocio: file })}
                  />

                </>
              ) : (
                <>
                {clienteDraft.pendingDraft && (
                  <DraftRestoreBanner
                    savedAt={clienteDraft.savedAt}
                    onRestore={clienteDraft.restore}
                    onDiscard={clienteDraft.discard}
                  />
                )}
                <ClienteCreateFields
                  value={createForm}
                  onChange={(v) => setCreateForm((f) => ({ ...f, ...v }))}
                  extraFields={
                    <>
                      {isSistemas && (
                        <TextField
                          select
                          label="Empresa"
                          value={createForm.empresa_id ?? ''}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              empresa_id: Number(e.target.value),
                              agencia_id: undefined,
                            }))
                          }
                          required
                        >
                          {empresas.map((empresa) => (
                            <MenuItem key={empresa.id} value={empresa.id}>
                              {empresa.nombre.toUpperCase()}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                      {needsAgenciaPicker && (
                        <TextField
                          select
                          label="Agencia"
                          value={createForm.agencia_id ?? ''}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, agencia_id: Number(e.target.value) }))
                          }
                          required
                        >
                          {availableAgencias.map((agencia) => (
                            <MenuItem key={agencia.id} value={agencia.id}>
                              {agencia.nombre.toUpperCase()}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    </>
                  }
                />
                </>
              )}
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

      <Dialog open={!!asignarTarget} onClose={preventBackdropClose(() => setAsignarTarget(null))} fullWidth maxWidth="xs">
        <DialogTitle>Asignar cliente</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {asignarTarget?.nombre} {asignarTarget?.apellido}
            </Typography>
            <TextField
              select
              label="Asesor"
              value={asesorId}
              onChange={(e) => setAsesorId(Number(e.target.value))}
              required
              helperText={asesoresDisponibles.length === 0 ? 'No hay asesores disponibles en esta agencia' : undefined}
            >
              {asesoresDisponibles.map((asesor) => (
                <MenuItem key={asesor.id} value={asesor.id}>
                  {`${asesor.nombre} ${asesor.apellido}`.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAsignarTarget(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAsignar}
            disabled={isAsignando || asesorId === ''}
          >
            {isAsignando ? 'Asignando...' : 'Asignar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar cliente"
        message={
          <Typography>
            ¿Seguro que deseas eliminar a{' '}
            <strong>
              {deleteTarget?.nombre} {deleteTarget?.apellido}
            </strong>
            ?
          </Typography>
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />

      {fichaTarget && (
        <FichaSocioeconomicaDialog
          clienteId={fichaTarget.id}
          clienteNombre={`${fichaTarget.nombre} ${fichaTarget.apellido}`.toUpperCase()}
          open={!!fichaTarget}
          onClose={() => setFichaTarget(null)}
        />
      )}

      {bienesTarget && (
        <ClienteGarantiaDialog<Bien, BienCreateFormValue>
          open={!!bienesTarget}
          onClose={() => setBienesTarget(null)}
          clienteId={bienesTarget.id}
          clienteNombre={`${bienesTarget.nombre} ${bienesTarget.apellido}`.toUpperCase()}
          title="Bienes"
          canCrear={canCrearBienes(user)}
          emptyMessage="Este cliente no tiene bienes registrados."
          addLabel="Agregar bien"
          emptyForm={emptyBienCreateForm}
          list={(clienteId) => listBienes(1, { clienteId })}
          create={(clienteId, form) => createBien({ cliente_id: clienteId, ...bienCreatePayload(form) })}
          renderFields={(value, onChange) => <BienCreateFields value={value} onChange={onChange} autoFocus />}
          renderItem={(bien) => (
            <Stack key={bien.id} direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2">
                {bien.nombre} ({BIEN_TIPO_LABELS[bien.tipo]})
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {formatMonto(bien.valorizacion)}
              </Typography>
            </Stack>
          )}
        />
      )}

      {vehiculosTarget && (
        <ClienteGarantiaDialog<Vehiculo, VehiculoCreateFormValue>
          open={!!vehiculosTarget}
          onClose={() => setVehiculosTarget(null)}
          clienteId={vehiculosTarget.id}
          clienteNombre={`${vehiculosTarget.nombre} ${vehiculosTarget.apellido}`.toUpperCase()}
          title="Vehículos"
          canCrear={canCrearVehiculos(user)}
          emptyMessage="Este cliente no tiene vehículos registrados."
          addLabel="Agregar vehículo"
          emptyForm={emptyVehiculoCreateForm}
          list={(clienteId) => listVehiculos(1, { clienteId })}
          create={(clienteId, form) => createVehiculo({ cliente_id: clienteId, ...vehiculoCreatePayload(form) })}
          renderFields={(value, onChange) => <VehiculoCreateFields value={value} onChange={onChange} autoFocus />}
          renderItem={(vehiculo) => (
            <Stack key={vehiculo.id} direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2">
                {vehiculo.marca} {vehiculo.modelo} — {vehiculo.placa.toUpperCase()}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {formatMonto(vehiculo.valorizacion)}
              </Typography>
            </Stack>
          )}
        />
      )}

      {inmueblesTarget && (
        <ClienteGarantiaDialog<Inmueble, InmuebleCreateFormValue>
          open={!!inmueblesTarget}
          onClose={() => setInmueblesTarget(null)}
          clienteId={inmueblesTarget.id}
          clienteNombre={`${inmueblesTarget.nombre} ${inmueblesTarget.apellido}`.toUpperCase()}
          title="Inmuebles"
          canCrear={canCrearInmuebles(user)}
          emptyMessage="Este cliente no tiene inmuebles registrados."
          addLabel="Agregar inmueble"
          emptyForm={emptyInmuebleCreateForm}
          list={(clienteId) => listInmuebles(1, { clienteId })}
          create={(clienteId, form) => createInmueble({ cliente_id: clienteId, ...inmuebleCreatePayload(form) })}
          renderFields={(value, onChange) => <InmuebleCreateFields value={value} onChange={onChange} autoFocus />}
          renderItem={(inmueble) => (
            <Stack key={inmueble.id} direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2">
                {inmueble.partida_registral} — {inmueble.direccion.toUpperCase()}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {formatMonto(inmueble.valorizacion)}
              </Typography>
            </Stack>
          )}
        />
      )}
    </Stack>
  );
}
