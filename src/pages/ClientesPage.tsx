import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';
import SearchIcon from '@mui/icons-material/Search';
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
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  asignarCliente,
  consultarDni,
  createCliente,
  deleteCliente,
  listClientes,
  updateCliente,
  type CreateClientePayload,
  type UpdateClientePayload,
} from '../api/clientes';
import { listEmpresas } from '../api/empresas';
import { listAgencias } from '../api/agencias';
import { listUsers } from '../api/users';
import type { Agencia, Cliente, Empresa, Estado, PaginatedData, TipoDocumento, User } from '../types/api';

interface CreateFormState {
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  telefono: string;
  direccion: string;
  referencia: string;
  empresa_id?: number;
  agencia_id?: number;
  foto_cliente: File | null;
  foto_dni: File | null;
  foto_casa: File | null;
  foto_negocio: File | null;
}

interface EditFormState {
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  telefono: string;
  direccion: string;
  referencia: string;
  estado: Estado;
  foto_cliente: File | null;
  foto_dni: File | null;
  foto_casa: File | null;
  foto_negocio: File | null;
}

const emptyCreateForm: CreateFormState = {
  nombre: '',
  apellido: '',
  tipo_documento: 'dni',
  numero_documento: '',
  telefono: '',
  direccion: '',
  referencia: '',
  foto_cliente: null,
  foto_dni: null,
  foto_casa: null,
  foto_negocio: null,
};

interface PhotoFieldProps {
  label: string;
  file: File | null;
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
}

function PhotoField({ label, file, currentUrl, onChange }: PhotoFieldProps) {
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : (currentUrl ?? undefined)),
    [file, currentUrl]
  );

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <Avatar src={previewUrl} variant="rounded" sx={{ width: 56, height: 56 }}>
        <ImageIcon />
      </Avatar>
      <Stack spacing={0.5}>
        <Typography variant="body2">{label}</Typography>
        <Button
          component="label"
          size="small"
          variant="outlined"
          startIcon={<CloudUploadIcon fontSize="small" />}
        >
          {file || currentUrl ? 'Reemplazar' : 'Subir'}
          <input
            type="file"
            hidden
            accept="image/jpeg,image/png"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </Button>
      </Stack>
    </Stack>
  );
}

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
  const [subordinados, setSubordinados] = useState<User[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [dniLookupLoading, setDniLookupLoading] = useState(false);
  const [dniLookupError, setDniLookupError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [asignarTarget, setAsignarTarget] = useState<Cliente | null>(null);
  const [asesorId, setAsesorId] = useState<number | ''>('');
  const [isAsignando, setIsAsignando] = useState(false);

  function loadClientes() {
    setIsLoading(true);
    setLoadError(null);

    listClientes(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadClientes, [page]);

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
    if (canAsignar && user) {
      listUsers(1).then((res) => {
        setSubordinados(
          res.data.data.filter(
            (u) => u.supervisor_id === user.id && u.roles?.some((r) => r.name === 'asesor')
          )
        );
      });
    }
  }, [canAsignar, user]);

  function handleConsultarDni() {
    setDniLookupError(null);
    setDniLookupLoading(true);

    consultarDni(createForm.numero_documento)
      .then((res) => {
        setCreateForm((f) => ({
          ...f,
          nombre: res.data.nombre || f.nombre,
          apellido: res.data.apellido || f.apellido,
          direccion: res.data.direccion || f.direccion,
        }));
      })
      .catch((err) => setDniLookupError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setDniLookupLoading(false));
  }

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
    setDniLookupError(null);
    setDialogOpen(true);
  }

  function openEditDialog(cliente: Cliente) {
    setEditing(cliente);
    setEditForm({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      tipo_documento: cliente.tipo_documento,
      numero_documento: cliente.numero_documento,
      telefono: cliente.telefono ?? '',
      direccion: cliente.direccion ?? '',
      referencia: cliente.referencia ?? '',
      estado: cliente.estado,
      foto_cliente: null,
      foto_dni: null,
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
          nombre: editForm.nombre,
          apellido: editForm.apellido,
          tipo_documento: editForm.tipo_documento,
          numero_documento: editForm.numero_documento,
          telefono: editForm.telefono || undefined,
          direccion: editForm.direccion || undefined,
          referencia: editForm.referencia || undefined,
          estado: editForm.estado,
          foto_cliente: editForm.foto_cliente,
          foto_dni: editForm.foto_dni,
          foto_casa: editForm.foto_casa,
          foto_negocio: editForm.foto_negocio,
        };

        await updateCliente(editing.id, payload);
      } else {
        const payload: CreateClientePayload = {
          nombre: createForm.nombre,
          apellido: createForm.apellido,
          tipo_documento: createForm.tipo_documento,
          numero_documento: createForm.numero_documento,
          telefono: createForm.telefono || undefined,
          direccion: createForm.direccion || undefined,
          referencia: createForm.referencia || undefined,
          foto_cliente: createForm.foto_cliente,
          foto_dni: createForm.foto_dni,
          foto_casa: createForm.foto_casa,
          foto_negocio: createForm.foto_negocio,
        };

        if (isSistemas) payload.empresa_id = createForm.empresa_id;
        if (needsAgenciaPicker) payload.agencia_id = createForm.agencia_id;

        await createCliente(payload);
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
    { header: 'Nombre', render: (c) => `${c.nombre} ${c.apellido}` },
    {
      header: 'Documento',
      render: (c) => `${TIPO_DOCUMENTO_LABELS[c.tipo_documento] ?? c.tipo_documento} ${c.numero_documento}`,
    },
    { header: 'Teléfono', render: (c) => c.telefono ?? '—' },
    { header: 'Agencia', render: (c) => c.agencia?.nombre ?? '—' },
    {
      header: 'Asesor',
      render: (c) => (c.asesor ? `${c.asesor.nombre} ${c.asesor.apellido}` : 'Sin asignar'),
    },
    {
      header: 'Estado',
      render: (c) => (
        <Chip label={c.estado} size="small" color={c.estado === 'activo' ? 'success' : 'default'} />
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (c) => (
        <>
          {canEditCliente(user, c) && (
            <IconButton size="small" aria-label="Editar" onClick={() => openEditDialog(c)}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {canAsignar && (
            <IconButton
              size="small"
              aria-label="Asignar asesor"
              onClick={() => setAsignarTarget(c)}
            >
              <AssignmentIndIcon fontSize="small" />
            </IconButton>
          )}
          {canDelete && (
            <IconButton size="small" aria-label="Eliminar" onClick={() => setDeleteTarget(c)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Clientes
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nuevo cliente
          </Button>
        )}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}

              {editing && editForm ? (
                <>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Nombre"
                      value={editForm.nombre}
                      onChange={(e) => setEditForm((f) => f && { ...f, nombre: e.target.value })}
                      required
                      autoFocus
                      fullWidth
                    />
                    <TextField
                      label="Apellido"
                      value={editForm.apellido}
                      onChange={(e) => setEditForm((f) => f && { ...f, apellido: e.target.value })}
                      required
                      fullWidth
                    />
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      select
                      label="Tipo de documento"
                      value={editForm.tipo_documento}
                      onChange={(e) =>
                        setEditForm((f) => f && { ...f, tipo_documento: e.target.value as TipoDocumento })
                      }
                      fullWidth
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
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Teléfono"
                    value={editForm.telefono}
                    onChange={(e) => setEditForm((f) => f && { ...f, telefono: e.target.value })}
                  />
                  <TextField
                    label="Dirección"
                    value={editForm.direccion}
                    onChange={(e) => setEditForm((f) => f && { ...f, direccion: e.target.value })}
                  />
                  <TextField
                    label="Referencia"
                    value={editForm.referencia}
                    onChange={(e) => setEditForm((f) => f && { ...f, referencia: e.target.value })}
                    multiline
                    minRows={2}
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

                  <Typography variant="subtitle2">Fotos</Typography>
                  <PhotoField
                    label="Foto del cliente"
                    file={editForm.foto_cliente}
                    currentUrl={editing.foto_cliente_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_cliente: file })}
                  />
                  <PhotoField
                    label="Foto del DNI"
                    file={editForm.foto_dni}
                    currentUrl={editing.foto_dni_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_dni: file })}
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
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Nombre"
                      value={createForm.nombre}
                      onChange={(e) => setCreateForm((f) => ({ ...f, nombre: e.target.value }))}
                      required
                      autoFocus
                      fullWidth
                    />
                    <TextField
                      label="Apellido"
                      value={createForm.apellido}
                      onChange={(e) => setCreateForm((f) => ({ ...f, apellido: e.target.value }))}
                      required
                      fullWidth
                    />
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      select
                      label="Tipo de documento"
                      value={createForm.tipo_documento}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          tipo_documento: e.target.value as TipoDocumento,
                        }))
                      }
                      fullWidth
                    >
                      <MenuItem value="dni">DNI</MenuItem>
                      <MenuItem value="ce">CE</MenuItem>
                      <MenuItem value="pasaporte">Pasaporte</MenuItem>
                    </TextField>
                    <TextField
                      label="Número de documento"
                      value={createForm.numero_documento}
                      onChange={(e) => {
                        setDniLookupError(null);
                        setCreateForm((f) => ({ ...f, numero_documento: e.target.value }));
                      }}
                      required
                      fullWidth
                      slotProps={{
                        input: {
                          endAdornment:
                            createForm.tipo_documento === 'dni' ? (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="Consultar DNI"
                                  onClick={handleConsultarDni}
                                  disabled={
                                    dniLookupLoading || !/^\d{8}$/.test(createForm.numero_documento)
                                  }
                                  edge="end"
                                  size="small"
                                >
                                  {dniLookupLoading ? <CircularProgress size={18} /> : <SearchIcon />}
                                </IconButton>
                              </InputAdornment>
                            ) : undefined,
                        },
                      }}
                    />
                  </Stack>
                  {dniLookupError && (
                    <Alert severity="warning" onClose={() => setDniLookupError(null)}>
                      {dniLookupError}
                    </Alert>
                  )}
                  <TextField
                    label="Teléfono"
                    value={createForm.telefono}
                    onChange={(e) => setCreateForm((f) => ({ ...f, telefono: e.target.value }))}
                  />
                  <TextField
                    label="Dirección"
                    value={createForm.direccion}
                    onChange={(e) => setCreateForm((f) => ({ ...f, direccion: e.target.value }))}
                  />
                  <TextField
                    label="Referencia"
                    value={createForm.referencia}
                    onChange={(e) => setCreateForm((f) => ({ ...f, referencia: e.target.value }))}
                    multiline
                    minRows={2}
                  />
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
                          {empresa.nombre}
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
                          {agencia.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  <Typography variant="subtitle2">Fotos</Typography>
                  <PhotoField
                    label="Foto del cliente"
                    file={createForm.foto_cliente}
                    onChange={(file) => setCreateForm((f) => ({ ...f, foto_cliente: file }))}
                  />
                  <PhotoField
                    label="Foto del DNI"
                    file={createForm.foto_dni}
                    onChange={(file) => setCreateForm((f) => ({ ...f, foto_dni: file }))}
                  />
                  <PhotoField
                    label="Foto de la casa"
                    file={createForm.foto_casa}
                    onChange={(file) => setCreateForm((f) => ({ ...f, foto_casa: file }))}
                  />
                  <PhotoField
                    label="Foto del negocio"
                    file={createForm.foto_negocio}
                    onChange={(file) => setCreateForm((f) => ({ ...f, foto_negocio: file }))}
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

      <Dialog open={!!asignarTarget} onClose={() => setAsignarTarget(null)} fullWidth maxWidth="xs">
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
              helperText={subordinados.length === 0 ? 'No tienes asesores a cargo' : undefined}
            >
              {subordinados.map((asesor) => (
                <MenuItem key={asesor.id} value={asesor.id}>
                  {asesor.nombre} {asesor.apellido}
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
    </Stack>
  );
}
