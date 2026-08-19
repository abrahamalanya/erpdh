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
  IconButton,
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
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import {
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
import { RowActions, type RowAction } from '../components/RowActions';
import {
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
  email: string;
  password: string;
  estado: Estado;
  role: string;
  empresa_id?: number;
  agencia_id?: number;
  supervisor_id?: number;
}

interface EditFormState {
  nombre: string;
  apellido: string;
  estado: Estado;
  password: string;
}

const emptyCreateForm: CreateFormState = {
  nombre: '',
  apellido: '',
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [editForm, setEditForm] = useState<EditFormState>({
    nombre: '',
    apellido: '',
    estado: 'activo',
    password: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [emailCopied, setEmailCopied] = useState(false);

  function handleCopyEmail(email: string) {
    navigator.clipboard.writeText(email).then(() => setEmailCopied(true));
  }

  function loadUsers() {
    setIsLoading(true);
    setLoadError(null);

    listUsers(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadUsers, [page]);

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

  function openCreateDialog() {
    setEditing(null);
    setCreateForm(emptyCreateForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(target: User) {
    setEditing(target);
    setEditForm({
      nombre: target.nombre,
      apellido: target.apellido,
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
          nombre: editForm.nombre,
          apellido: editForm.apellido,
          estado: editForm.estado,
        };

        if (editForm.password) {
          payload.password = editForm.password;
        }

        await updateUser(editing.id, payload);
      } else {
        const payload: CreateUserPayload = {
          nombre: createForm.nombre,
          apellido: createForm.apellido,
          email: createForm.email,
          password: createForm.password,
          estado: createForm.estado,
          role: createForm.role,
        };

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
    { header: 'Nombre', render: (u) => `${u.nombre} ${u.apellido}` },
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
    { header: 'Empresa', render: (u) => u.empresa?.nombre ?? '—' },
    { header: 'Agencia', render: (u) => u.agencia?.nombre ?? '—' },
    {
      header: 'Estado',
      render: (u) => (
        <Chip label={u.estado} size="small" color={u.estado === 'activo' ? 'success' : 'default'} />
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

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Usuarios
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nuevo usuario
          </Button>
        )}
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
                    label="Nombre"
                    value={editForm.nombre}
                    onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                    required
                    autoFocus
                  />
                  <TextField
                    label="Apellido"
                    value={editForm.apellido}
                    onChange={(e) => setEditForm((f) => ({ ...f, apellido: e.target.value }))}
                    required
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
                    label="Nombre"
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm((f) => ({ ...f, nombre: e.target.value }))}
                    required
                    autoFocus
                  />
                  <TextField
                    label="Apellido"
                    value={createForm.apellido}
                    onChange={(e) => setCreateForm((f) => ({ ...f, apellido: e.target.value }))}
                    required
                  />
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
                          {empresa.nombre}
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
                          {agencia.nombre}
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
                          {supervisor.nombre} {supervisor.apellido}
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
