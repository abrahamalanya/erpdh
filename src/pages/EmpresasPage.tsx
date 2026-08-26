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
import { PhotoField } from '../components/MediaFields';
import { capitalize } from '../utils/format';
import {
  createEmpresa,
  deleteEmpresa,
  listEmpresas,
  updateEmpresa,
  type EmpresaPayload,
} from '../api/empresas';
import type { Empresa, PaginatedData } from '../types/api';

const emptyForm: EmpresaPayload = {
  nombre: '',
  prefijo: '',
  ruc: '',
  razon_social: '',
  domicilio_legal: '',
  actividad_economica: '',
  representante_legal: '',
  logo: null,
  firma: null,
  estado: 'activo',
};

export function EmpresasPage() {
  const { user } = useAuth();

  const [result, setResult] = useState<PaginatedData<Empresa> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [form, setForm] = useState<EmpresaPayload>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Empresa | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function loadEmpresas() {
    setIsLoading(true);
    setLoadError(null);

    listEmpresas(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadEmpresas, [page]);

  if (!hasRole(user, 'sistemas')) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(empresa: Empresa) {
    setEditing(empresa);
    setForm({
      nombre: empresa.nombre,
      prefijo: empresa.prefijo ?? '',
      ruc: empresa.ruc ?? '',
      razon_social: empresa.razon_social ?? '',
      domicilio_legal: empresa.domicilio_legal ?? '',
      actividad_economica: empresa.actividad_economica ?? '',
      representante_legal: empresa.representante_legal ?? '',
      logo: null,
      firma: null,
      estado: empresa.estado,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const payload: EmpresaPayload = {
        ...form,
        nombre: form.nombre.toLowerCase(),
        prefijo: form.prefijo ? form.prefijo.toLowerCase() : undefined,
      };

      if (editing) {
        await updateEmpresa(editing.id, payload);
      } else {
        await createEmpresa(payload);
      }

      setDialogOpen(false);
      loadEmpresas();
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
      await deleteEmpresa(deleteTarget.id);
      setDeleteTarget(null);
      loadEmpresas();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<Empresa>[] = [
    { header: 'Nombre', render: (empresa) => empresa.nombre.toUpperCase() },
    {
      header: 'Estado',
      render: (empresa) => (
        <Chip
          label={capitalize(empresa.estado)}
          size="small"
          color={empresa.estado === 'activo' ? 'success' : 'default'}
        />
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (empresa) => (
        <RowActions
          actions={[
            {
              key: 'editar',
              label: 'Editar',
              icon: <EditIcon fontSize="small" />,
              onClick: () => openEditDialog(empresa),
            },
            {
              key: 'eliminar',
              label: 'Eliminar',
              icon: <DeleteIcon fontSize="small" />,
              onClick: () => setDeleteTarget(empresa),
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
          Empresas
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Nueva empresa
        </Button>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(empresa) => empresa.id}
        isLoading={isLoading}
        emptyMessage="No hay empresas registradas"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Editar empresa' : 'Nueva empresa'}</DialogTitle>
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
                label="Prefijo de correo"
                value={form.prefijo ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, prefijo: e.target.value }))}
                placeholder="credimasperu.com"
                helperText="Al crear usuarios de esta empresa, el email se arma como usuario@prefijo"
              />
              <TextField
                label="RUC"
                value={form.ruc ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))}
              />
              <TextField
                label="Razón social"
                value={form.razon_social ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))}
              />
              <TextField
                label="Domicilio legal"
                value={form.domicilio_legal ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, domicilio_legal: e.target.value }))}
              />
              <TextField
                label="Actividad económica"
                value={form.actividad_economica ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, actividad_economica: e.target.value }))}
              />
              <TextField
                label="Representante legal"
                value={form.representante_legal ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, representante_legal: e.target.value }))}
              />
              <PhotoField
                label="Logo"
                file={form.logo ?? null}
                currentUrl={editing?.logo_url}
                onChange={(file) => setForm((f) => ({ ...f, logo: file }))}
              />
              <PhotoField
                label="Firma"
                file={form.firma ?? null}
                currentUrl={editing?.firma_url}
                onChange={(file) => setForm((f) => ({ ...f, firma: file }))}
              />
              <TextField
                select
                label="Estado"
                value={form.estado}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estado: e.target.value as EmpresaPayload['estado'] }))
                }
              >
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="inactivo">Inactivo</MenuItem>
              </TextField>
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
        title="Eliminar empresa"
        message={
          <Typography>
            ¿Seguro que deseas eliminar <strong>{deleteTarget?.nombre}</strong>?
          </Typography>
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </Stack>
  );
}
