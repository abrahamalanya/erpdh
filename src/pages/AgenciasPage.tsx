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
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RowActions } from '../components/RowActions';
import { UpperTextField } from '../components/UpperTextField';
import { preventBackdropClose } from '../utils/dialog';
import { capitalize } from '../utils/format';
import {
  createAgencia,
  deleteAgencia,
  listAgencias,
  updateAgencia,
  type AgenciaPayload,
} from '../api/agencias';
import { listEmpresas } from '../api/empresas';
import type { Agencia, Empresa, PaginatedData } from '../types/api';

const emptyForm: AgenciaPayload = { nombre: '', estado: 'activo' };

export function AgenciasPage() {
  const { user } = useAuth();
  const isSistemas = hasRole(user, 'sistemas');
  const canManage = hasRole(user, 'sistemas', 'administrador_general');

  const [result, setResult] = useState<PaginatedData<Agencia> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Agencia | null>(null);
  const [form, setForm] = useState<AgenciaPayload>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Agencia | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function loadAgencias() {
    setIsLoading(true);
    setLoadError(null);

    listAgencias(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadAgencias, [page]);

  useEffect(() => {
    if (isSistemas) {
      listEmpresas().then((res) => setEmpresas(res.data.data));
    }
  }, [isSistemas]);

  if (!hasRole(user, 'sistemas', 'administrador_general', 'secretaria')) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(agencia: Agencia) {
    setEditing(agencia);
    setForm({ nombre: agencia.nombre, estado: agencia.estado });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const payload: AgenciaPayload = { ...form, nombre: form.nombre.toLowerCase() };

      if (editing) {
        await updateAgencia(editing.id, payload);
      } else {
        await createAgencia(payload);
      }

      setDialogOpen(false);
      loadAgencias();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAgencia(deleteTarget.id);
      setDeleteTarget(null);
      loadAgencias();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<Agencia>[] = [
    { header: 'Nombre', render: (agencia) => agencia.nombre.toUpperCase() },
    ...(isSistemas
      ? [
          {
            header: 'Empresa',
            render: (agencia: Agencia) => agencia.empresa?.nombre.toUpperCase() ?? '—',
          },
        ]
      : []),
    {
      header: 'Estado',
      render: (agencia) => (
        <Chip
          label={capitalize(agencia.estado)}
          size="small"
          color={agencia.estado === 'activo' ? 'success' : 'default'}
        />
      ),
    },
    ...(canManage
      ? [
          {
            header: 'Acciones',
            align: 'right' as const,
            render: (agencia: Agencia) => (
              <RowActions
                actions={[
                  {
                    key: 'editar',
                    label: 'Editar',
                    icon: <EditIcon fontSize="small" />,
                    onClick: () => openEditDialog(agencia),
                  },
                  {
                    key: 'eliminar',
                    label: 'Eliminar',
                    icon: <DeleteIcon fontSize="small" />,
                    onClick: () => {
                      setDeleteError(null);
                      setDeleteTarget(agencia);
                    },
                  },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Agencias
        </Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nueva agencia
          </Button>
        )}
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(agencia) => agencia.id}
        isLoading={isLoading}
        emptyMessage="No hay agencias registradas"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Editar agencia' : 'Nueva agencia'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <UpperTextField
                label="Nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                required
                autoFocus
              />
              <TextField
                select
                label="Estado"
                value={form.estado}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estado: e.target.value as AgenciaPayload['estado'] }))
                }
              >
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="inactivo">Inactivo</MenuItem>
              </TextField>
              {isSistemas && !editing && (
                <TextField
                  select
                  label="Empresa"
                  value={form.empresa_id ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, empresa_id: Number(e.target.value) }))
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
        title="Eliminar agencia"
        message={
          <Typography>
            ¿Seguro que deseas eliminar <strong>{deleteTarget?.nombre}</strong>?
          </Typography>
        }
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
