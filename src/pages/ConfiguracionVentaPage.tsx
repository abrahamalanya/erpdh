import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
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
import { canVerConfiguracionVenta } from '../utils/ventaHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { DialogHeader } from '../components/DialogHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  deleteConfiguracionVenta,
  listConfiguracionesVenta,
  updateConfiguracionVenta,
  type UpdateConfiguracionVentaPayload,
} from '../api/configuracionesVenta';
import { listEmpresas } from '../api/empresas';
import { listAgencias } from '../api/agencias';
import { preventBackdropClose } from '../utils/dialog';
import type { Agencia, ConfiguracionVenta, Empresa } from '../types/api';

interface FormState {
  ambito: 'empresa' | 'agencia';
  empresa_id?: number;
  agencia_id?: number;
  interes_mensual_default: string;
}

const emptyForm: FormState = { ambito: 'empresa', interes_mensual_default: '' };

export function ConfiguracionVentaPage() {
  const { user } = useAuth();
  const isSistemas = hasRole(user, 'sistemas');

  const [configuraciones, setConfiguraciones] = useState<ConfiguracionVenta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ConfiguracionVenta | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function loadConfiguraciones() {
    setIsLoading(true);
    setLoadError(null);

    listConfiguracionesVenta()
      .then((res) => setConfiguraciones(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadConfiguraciones, []);

  useEffect(() => {
    if (isSistemas) {
      listEmpresas().then((res) => setEmpresas(res.data.data));
    }
    listAgencias().then((res) => setAgencias(res.data.data));
  }, [isSistemas]);

  if (!canVerConfiguracionVenta(user)) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(config: ConfiguracionVenta) {
    setForm({
      ambito: config.agencia_id ? 'agencia' : 'empresa',
      empresa_id: config.empresa_id,
      agencia_id: config.agencia_id ?? undefined,
      interes_mensual_default: config.interes_mensual_default,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const payload: UpdateConfiguracionVentaPayload = {
        interes_mensual_default: form.interes_mensual_default,
      };

      if (isSistemas) payload.empresa_id = form.empresa_id;
      if (form.ambito === 'agencia') payload.agencia_id = form.agencia_id;

      await updateConfiguracionVenta(payload);
      setDialogOpen(false);
      loadConfiguraciones();
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
      await deleteConfiguracionVenta(deleteTarget.id);
      setDeleteTarget(null);
      loadConfiguraciones();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<ConfiguracionVenta>[] = [
    { header: 'Ámbito', render: (c) => c.agencia?.nombre.toUpperCase() ?? 'Empresa (default)' },
    { header: 'Interés mensual', render: (c) => `${c.interes_mensual_default}%` },
    {
      header: 'Acciones',
      align: 'right',
      render: (c) => (
        <RowActions
          actions={[
            { key: 'editar', label: 'Editar', icon: <EditIcon fontSize="small" />, onClick: () => openEditDialog(c) },
            {
              key: 'eliminar',
              label: 'Eliminar',
              icon: <DeleteIcon fontSize="small" />,
              onClick: () => {
                setDeleteError(null);
                setDeleteTarget(c);
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
          Configuración de ventas
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Nueva configuración
        </Button>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={configuraciones}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay configuraciones registradas"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogHeader onClose={() => setDialogOpen(false)}>Configuración de ventas</DialogHeader>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              {isSistemas && (
                <TextField
                  select
                  label="Empresa"
                  value={form.empresa_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, empresa_id: Number(e.target.value) }))}
                  required
                >
                  {empresas.map((empresa) => (
                    <MenuItem key={empresa.id} value={empresa.id}>
                      {empresa.nombre.toUpperCase()}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                select
                label="Ámbito"
                value={form.ambito}
                onChange={(e) => setForm((f) => ({ ...f, ambito: e.target.value as FormState['ambito'] }))}
              >
                <MenuItem value="empresa">Toda la empresa (default)</MenuItem>
                <MenuItem value="agencia">Agencia específica</MenuItem>
              </TextField>
              {form.ambito === 'agencia' && (
                <TextField
                  select
                  label="Agencia"
                  value={form.agencia_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, agencia_id: Number(e.target.value) }))}
                  required
                >
                  {agencias.map((agencia) => (
                    <MenuItem key={agencia.id} value={agencia.id}>
                      {agencia.nombre.toUpperCase()}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                label="Interés mensual por defecto (%)"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={form.interes_mensual_default}
                onChange={(e) => setForm((f) => ({ ...f, interes_mensual_default: e.target.value }))}
                helperText="Tasa aplicada por cuota en la venta a crédito. 0 = sin interés por defecto."
                required
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
        title="Eliminar configuración"
        message={
          <Typography>
            ¿Seguro que deseas eliminar la configuración de{' '}
            <strong>{deleteTarget?.agencia?.nombre.toUpperCase() ?? 'toda la empresa (default)'}</strong>?
            {deleteTarget?.agencia
              ? ' La agencia volverá a usar el default de la empresa.'
              : ' Las ventas a crédito nuevas no podrán resolver una tasa hasta que registres una configuración de nuevo.'}
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
