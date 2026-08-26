import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
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
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import {
  ALL_ROLES,
  assignableRoles,
  canCreateUsers,
  canDeleteUsers,
  canEditUsers,
  canViewUsers,
  isAgenciaLevelRole,
  roleLabel,
} from '../utils/userHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { RowActions, type RowAction } from '../components/RowActions';
import { UpperTextField } from '../components/UpperTextField';
import { capitalize } from '../utils/format';
import {
  consultarDni,
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '../api/users';
import { listEmpresas } from '../api/empresas';
import { listAgencias } from '../api/agencias';
import type { Agencia, Empresa, Estado, PaginatedData, User } from '../types/api';

interface CreateFormState {
  nombre: string;
  apellido: string;
  dni: string;
  usuario: string;
  telefono: string;
  email: string;
  password: string;
  estado: Estado;
  role: string;
  empresa_id?: number;
  agencia_id?: number;
  supervisor_id?: number;
}

interface FiltersState {
  nombre: string;
  dni: string;
  estado: Estado | '';
  role: string;
  agencia_id?: number;
  empresa_id?: number;
}

const emptyFilters: FiltersState = { nombre: '', dni: '', estado: '', role: '' };

interface EditFormState {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  estado: Estado;
  password: string;
}

const emptyCreateForm: CreateFormState = {
  nombre: '',
  apellido: '',
  dni: '',
  usuario: '',
  telefono: '',
  email: '',
  password: '',
  estado: 'activo',
  role: '',
};

export function UsersPage() {
  const { user } = useAuth();
  const isSistemas = hasRole(user, 'sistemas');
  const isAdministradorAgencia = hasRole(user, 'administrador_agencia');
  const canCreate = canCreateUsers(user);
  const canEdit = canEditUsers(user);
  const canDelete = canDeleteUsers(user);

  const [result, setResult] = useState<PaginatedData<User> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);

  const [filters, setFilters] = useState<FiltersState>(emptyFilters);

  function updateFilters(patch: Partial<FiltersState>) {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [editForm, setEditForm] = useState<EditFormState>({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    estado: 'activo',
    password: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [dniLookupLoading, setDniLookupLoading] = useState(false);
  const [dniLookupError, setDniLookupError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [emailCopied, setEmailCopied] = useState(false);

  function handleCopyEmail(email: string) {
    navigator.clipboard.writeText(email).then(() => setEmailCopied(true));
  }

  function handleConsultarDni() {
    setDniLookupError(null);
    setDniLookupLoading(true);

    consultarDni(createForm.dni)
      .then((res) => {
        setCreateForm((f) => ({
          ...f,
          nombre: res.data.nombre ? res.data.nombre.toUpperCase() : f.nombre,
          apellido: res.data.apellido ? res.data.apellido.toUpperCase() : f.apellido,
        }));
      })
      .catch((err) => setDniLookupError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setDniLookupLoading(false));
  }

  function loadUsers() {
    setIsLoading(true);
    setLoadError(null);

    listUsers(page, {
      nombre: filters.nombre || undefined,
      dni: filters.dni || undefined,
      estado: filters.estado || undefined,
      role: filters.role || undefined,
      agencia_id: filters.agencia_id,
      empresa_id: filters.empresa_id,
    })
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadUsers, [page, filters]);

  useEffect(() => {
    if (isSistemas) {
      listEmpresas().then((res) => setEmpresas(res.data.data));
    }
  }, [isSistemas]);

  useEffect(() => {
    if (!isAdministradorAgencia) {
      listAgencias().then((res) => setAgencias(res.data.data));
    }
  }, [isAdministradorAgencia]);

  const showAgenciaField =
    createForm.role !== '' && isAgenciaLevelRole(createForm.role) && !isAdministradorAgencia;
  const resolvedAgenciaId = isAdministradorAgencia ? user?.agencia_id : createForm.agencia_id;

  const empresaPrefijo = isSistemas
    ? empresas.find((e) => e.id === createForm.empresa_id)?.prefijo
    : user?.empresa?.prefijo;
  const emailPreview = empresaPrefijo ? `${createForm.usuario || createForm.dni || '...'}@${empresaPrefijo}` : null;

  useEffect(() => {
    if (editing || createForm.role !== 'asesor' || !resolvedAgenciaId) {
      setSupervisors([]);
      return;
    }

    listUsers(1).then((res) => {
      setSupervisors(
        res.data.data.filter(
          (u) => u.agencia_id === resolvedAgenciaId && u.roles?.some((r) => r.name === 'supervisor')
        )
      );
    });
  }, [editing, createForm.role, resolvedAgenciaId]);

  if (!canViewUsers(user)) {
    return <Navigate to="/" replace />;
  }

  const availableAgencias = isSistemas
    ? agencias.filter((a) => a.empresa_id === createForm.empresa_id)
    : agencias;

  const filterAvailableAgencias =
    isSistemas && filters.empresa_id
      ? agencias.filter((a) => a.empresa_id === filters.empresa_id)
      : agencias;

  function openCreateDialog() {
    setEditing(null);
    setCreateForm(emptyCreateForm);
    setFormError(null);
    setDniLookupError(null);
    setDialogOpen(true);
  }

  function openEditDialog(target: User) {
    setEditing(target);
    setEditForm({
      nombre: target.nombre,
      apellido: target.apellido,
      dni: target.dni ?? '',
      telefono: target.telefono ?? '',
      estado: target.estado as Estado,
      password: '',
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (editing) {
        const payload: UpdateUserPayload = {
          nombre: editForm.nombre.toLowerCase(),
          apellido: editForm.apellido.toLowerCase(),
          dni: editForm.dni,
          telefono: editForm.telefono || undefined,
          estado: editForm.estado,
        };

        if (editForm.password) {
          payload.password = editForm.password;
        }

        await updateUser(editing.id, payload);
      } else {
        const payload: CreateUserPayload = {
          nombre: createForm.nombre.toLowerCase(),
          apellido: createForm.apellido.toLowerCase(),
          dni: createForm.dni,
          telefono: createForm.telefono || undefined,
          estado: createForm.estado,
          role: createForm.role,
        };

        if (empresaPrefijo) {
          if (createForm.usuario) payload.usuario = createForm.usuario;
        } else {
          payload.email = createForm.email;
        }
        if (createForm.password) payload.password = createForm.password;

        if (isSistemas) payload.empresa_id = createForm.empresa_id;
        if (showAgenciaField) payload.agencia_id = createForm.agencia_id;
        if (createForm.role === 'asesor') payload.supervisor_id = createForm.supervisor_id;

        await createUser(payload);
      }

      setDialogOpen(false);
      loadUsers();
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
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<User>[] = [
    { header: 'Nombre', render: (u) => `${u.nombre} ${u.apellido}`.toUpperCase() },
    { header: 'DNI', render: (u) => u.dni ?? '—' },
    {
      header: 'Email',
      render: (u) => (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Tooltip title="Copiar email">
            <IconButton
              size="small"
              aria-label="Copiar email"
              onClick={() => handleCopyEmail(u.email)}
            >
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Typography variant="body2">{u.email}</Typography>
        </Stack>
      ),
    },
    {
      header: 'Rol',
      render: (u) => (u.roles?.[0] ? <Chip label={roleLabel(u.roles[0].name)} size="small" /> : '—'),
    },
    ...(isSistemas
      ? [{ header: 'Empresa', render: (u: User) => u.empresa?.nombre.toUpperCase() ?? '—' }]
      : []),
    { header: 'Agencia', render: (u) => u.agencia?.nombre.toUpperCase() ?? '—' },
    {
      header: 'Estado',
      render: (u) => (
        <Chip
          label={capitalize(u.estado)}
          size="small"
          color={u.estado === 'activo' ? 'success' : 'default'}
        />
      ),
    },
    ...(canEdit || canDelete
      ? [
          {
            header: 'Acciones',
            align: 'right' as const,
            render: (u: User) => {
              const actions: RowAction[] = [];

              if (canEdit) {
                actions.push({
                  key: 'editar',
                  label: 'Editar',
                  icon: <EditIcon fontSize="small" />,
                  onClick: () => openEditDialog(u),
                });
              }
              if (canDelete && u.id !== user?.id) {
                actions.push({
                  key: 'eliminar',
                  label: 'Eliminar',
                  icon: <DeleteIcon fontSize="small" />,
                  onClick: () => setDeleteTarget(u),
                });
              }

              return <RowActions actions={actions} />;
            },
          },
        ]
      : []),
  ];

  const activeFiltersCount = [
    filters.nombre,
    filters.dni,
    filters.role,
    filters.estado,
    filters.empresa_id,
    filters.agencia_id,
  ].filter((value) => value !== '' && value !== undefined).length;

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Usuarios
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <FiltrosPanel activeCount={activeFiltersCount} onClear={() => updateFilters(emptyFilters)}>
            <TextField
              label="Nombre"
              value={filters.nombre}
              onChange={(e) => updateFilters({ nombre: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="DNI"
              value={filters.dni}
              onChange={(e) => updateFilters({ dni: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              select
              label="Rol"
              value={filters.role}
              onChange={(e) => updateFilters({ role: e.target.value })}
              size="small"
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              {ALL_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {roleLabel(role)}
                </MenuItem>
              ))}
            </TextField>
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
            {isSistemas && (
              <TextField
                select
                label="Empresa"
                value={filters.empresa_id ?? ''}
                onChange={(e) =>
                  updateFilters({
                    empresa_id: e.target.value ? Number(e.target.value) : undefined,
                    agencia_id: undefined,
                  })
                }
                size="small"
                fullWidth
              >
                <MenuItem value="">Todas</MenuItem>
                {empresas.map((empresa) => (
                  <MenuItem key={empresa.id} value={empresa.id}>
                    {empresa.nombre.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {!isAdministradorAgencia && (
              <TextField
                select
                label="Agencia"
                value={filters.agencia_id ?? ''}
                onChange={(e) =>
                  updateFilters({ agencia_id: e.target.value ? Number(e.target.value) : undefined })
                }
                size="small"
                fullWidth
              >
                <MenuItem value="">Todas</MenuItem>
                {filterAvailableAgencias.map((agencia) => (
                  <MenuItem key={agencia.id} value={agencia.id}>
                    {agencia.nombre.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </FiltrosPanel>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Nuevo usuario
            </Button>
          )}
        </Stack>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
        emptyMessage="No hay usuarios registrados"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}

              {editing ? (
                <>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {editing.email} · {roleLabel(editing.roles?.[0]?.name ?? '—')}
                    {editing.empresa ? ` · ${editing.empresa.nombre}` : ''}
                    {editing.agencia ? ` · ${editing.agencia.nombre}` : ''}
                  </Typography>
                  <TextField
                    label="DNI"
                    value={editForm.dni}
                    onChange={(e) => setEditForm((f) => ({ ...f, dni: e.target.value }))}
                    required
                    autoFocus
                  />
                  <UpperTextField
                    label="Nombre"
                    value={editForm.nombre}
                    onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                    required
                  />
                  <UpperTextField
                    label="Apellido"
                    value={editForm.apellido}
                    onChange={(e) => setEditForm((f) => ({ ...f, apellido: e.target.value }))}
                    required
                  />
                  <TextField
                    label="Teléfono"
                    value={editForm.telefono}
                    onChange={(e) => setEditForm((f) => ({ ...f, telefono: e.target.value }))}
                  />
                  <TextField
                    select
                    label="Estado"
                    value={editForm.estado}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, estado: e.target.value as Estado }))
                    }
                  >
                    <MenuItem value="activo">Activo</MenuItem>
                    <MenuItem value="inactivo">Inactivo</MenuItem>
                  </TextField>
                  <TextField
                    label="Nueva contraseña"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                    helperText="Déjalo vacío para no cambiarla"
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="DNI"
                    value={createForm.dni}
                    onChange={(e) => {
                      setDniLookupError(null);
                      setCreateForm((f) => ({ ...f, dni: e.target.value }));
                    }}
                    required
                    autoFocus
                    helperText="Por defecto también se usa como usuario y contraseña"
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Consultar DNI">
                              <IconButton
                                aria-label="Consultar DNI"
                                onClick={handleConsultarDni}
                                disabled={dniLookupLoading || !/^\d{8}$/.test(createForm.dni)}
                                edge="end"
                                size="small"
                              >
                                {dniLookupLoading ? <CircularProgress size={18} /> : <SearchIcon />}
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  {dniLookupError && (
                    <Alert severity="warning" onClose={() => setDniLookupError(null)}>
                      {dniLookupError}
                    </Alert>
                  )}
                  <UpperTextField
                    label="Nombre"
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm((f) => ({ ...f, nombre: e.target.value }))}
                    required
                  />
                  <UpperTextField
                    label="Apellido"
                    value={createForm.apellido}
                    onChange={(e) => setCreateForm((f) => ({ ...f, apellido: e.target.value }))}
                    required
                  />
                  <TextField
                    label="Teléfono"
                    value={createForm.telefono}
                    onChange={(e) => setCreateForm((f) => ({ ...f, telefono: e.target.value }))}
                  />
                  {empresaPrefijo ? (
                    <>
                      <TextField
                        label="Usuario (opcional)"
                        value={createForm.usuario}
                        onChange={(e) => setCreateForm((f) => ({ ...f, usuario: e.target.value }))}
                        helperText={`Si lo dejas vacío se usa el DNI. Email: ${emailPreview}`}
                      />
                      <TextField
                        label="Contraseña (opcional)"
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                        helperText="Si la dejas vacía se usa el DNI"
                      />
                    </>
                  ) : (
                    <>
                      <TextField
                        label="Email"
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                        required
                      />
                      <TextField
                        label="Contraseña"
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                        required
                      />
                    </>
                  )}
                  <TextField
                    select
                    label="Estado"
                    value={createForm.estado}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, estado: e.target.value as Estado }))
                    }
                  >
                    <MenuItem value="activo">Activo</MenuItem>
                    <MenuItem value="inactivo">Inactivo</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="Rol"
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        role: e.target.value,
                        agencia_id: undefined,
                        supervisor_id: undefined,
                      }))
                    }
                    required
                  >
                    {assignableRoles(user).map((role) => (
                      <MenuItem key={role} value={role}>
                        {roleLabel(role)}
                      </MenuItem>
                    ))}
                  </TextField>
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
                          supervisor_id: undefined,
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
                  {showAgenciaField && (
                    <TextField
                      select
                      label="Agencia"
                      value={createForm.agencia_id ?? ''}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          agencia_id: Number(e.target.value),
                          supervisor_id: undefined,
                        }))
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
                  {createForm.role === 'asesor' && (
                    <TextField
                      select
                      label="Supervisor"
                      value={createForm.supervisor_id ?? ''}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, supervisor_id: Number(e.target.value) }))
                      }
                      required
                      helperText={
                        supervisors.length === 0
                          ? 'Selecciona primero una agencia con un supervisor asignado'
                          : undefined
                      }
                    >
                      {supervisors.map((supervisor) => (
                        <MenuItem key={supervisor.id} value={supervisor.id}>
                          {`${supervisor.nombre} ${supervisor.apellido}`.toUpperCase()}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar usuario"
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

      <Snackbar
        open={emailCopied}
        autoHideDuration={2000}
        onClose={() => setEmailCopied(false)}
        message="Email copiado"
      />
    </Stack>
  );
}
