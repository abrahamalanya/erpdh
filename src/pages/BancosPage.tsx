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
import { createBanco, deleteBanco, listBancos, updateBanco, type BancoPayload } from '../api/bancos';
import type { Banco } from '../types/api';

const emptyForm: BancoPayload = { nombre: '', activo: true };

export function BancosPage() {
  const { user } = useAuth();
  const canManage = hasRole(user, 'sistemas');

  const [bancos, setBancos] = useState<Banco[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banco | null>(null);
  const [form, setForm] = useState<BancoPayload>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Banco | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function loadBancos() {
    setIsLoading(true);
    setLoadError(null);

    listBancos()
      .then((res) => setBancos(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadBancos, []);

  if (!canManage) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(banco: Banco) {
    setEditing(banco);
    setForm({ nombre: banco.nombre, activo: banco.activo });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (editing) {
        await updateBanco(editing.id, form);
      } else {
        await createBanco(form);
      }

      setDialogOpen(false);
      loadBancos();
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
      await deleteBanco(deleteTarget.id);
      setDeleteTarget(null);
      loadBancos();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<Banco>[] = [
    { header: 'Nombre', render: (banco) => banco.nombre },
    {
      header: 'Estado',
      render: (banco) => (
        <Chip label={banco.activo ? 'Activo' : 'Inactivo'} size="small" color={banco.activo ? 'success' : 'default'} />
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (banco) => (
        <RowActions
          actions={[
            {
              key: 'editar',
              label: 'Editar',
              icon: <EditIcon fontSize="small" />,
              onClick: () => openEditDialog(banco),
            },
            {
              key: 'eliminar',
              label: 'Eliminar',
              icon: <DeleteIcon fontSize="small" />,
              onClick: () => {
                setDeleteError(null);
                setDeleteTarget(banco);
              },
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
          Bancos
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Nuevo banco
        </Button>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={bancos}
        keyExtractor={(banco) => banco.id}
        isLoading={isLoading}
        emptyMessage="No hay bancos registrados"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Editar banco' : 'Nuevo banco'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                required
                autoFocus
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar banco"
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
