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
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RowActions, type RowAction } from '../components/RowActions';
import { UpperTextField } from '../components/UpperTextField';
import { preventBackdropClose } from '../utils/dialog';
import { listEmpresas } from '../api/empresas';
import {
  createConcepto,
  deleteConcepto,
  listConceptos,
  updateConcepto,
  type ConceptoPayload,
} from '../api/conceptos';
import type { Concepto, ConceptoTipo, Empresa } from '../types/api';

function emptyForm(empresaId: number | ''): ConceptoPayload {
  return { empresa_id: empresaId || 0, tipo: 'gasto', nombre: '' };
}

/**
 * Sistemas-only: conceptos are a per-empresa catalog, but only sistemas may
 * manage them (mirrors BancoPolicy's shape). Since sistemas has no empresa_id
 * of its own, browsing/creating always goes through an explicit empresa
 * selector, same pattern AgenciasPage uses for the same reason.
 */
export function ConceptosPage() {
  const { user } = useAuth();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<number | ''>('');
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<ConceptoTipo | ''>('');
  const [conInactivos, setConInactivos] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Concepto | null>(null);
  const [form, setForm] = useState<ConceptoPayload>(emptyForm(''));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Concepto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    listEmpresas().then((res) => setEmpresas(res.data.data));
  }, []);

  function loadConceptos() {
    setIsLoading(true);
    setLoadError(null);

    listConceptos({ tipo: tipoFiltro || undefined, conInactivos, empresaId: empresaId || undefined })
      .then((res) => setConceptos(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadConceptos, [tipoFiltro, conInactivos, empresaId]);

  if (!hasRole(user, 'sistemas')) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setEditing(null);
    setForm(emptyForm(empresaId));
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(concepto: Concepto) {
    setEditing(concepto);
    setForm({ empresa_id: concepto.empresa_id, tipo: concepto.tipo, nombre: concepto.nombre, activo: concepto.activo });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (editing) {
        await updateConcepto(editing.id, { nombre: form.nombre });
      } else {
        await createConcepto(form);
      }

      setDialogOpen(false);
      loadConceptos();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActivo(concepto: Concepto) {
    setLoadError(null);
    setTogglingId(concepto.id);

    try {
      await updateConcepto(concepto.id, { activo: !concepto.activo });
      loadConceptos();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteConcepto(deleteTarget.id);
      setDeleteTarget(null);
      loadConceptos();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<Concepto>[] = [
    { header: 'Nombre', render: (c) => c.nombre },
    { header: 'Empresa', render: (c) => c.empresa?.nombre.toUpperCase() ?? '—' },
    {
      header: 'Tipo',
      render: (c) => (
        <Chip
          label={c.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
          size="small"
          color={c.tipo === 'ingreso' ? 'success' : 'error'}
        />
      ),
    },
    {
      header: 'Estado',
      render: (c) => <Chip label={c.activo ? 'Activo' : 'Inactivo'} size="small" color={c.activo ? 'success' : 'default'} />,
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (c: Concepto) => {
        const actions: RowAction[] = [
          {
            key: 'editar',
            label: 'Editar',
            icon: <EditIcon fontSize="small" />,
            onClick: () => openEditDialog(c),
          },
          {
            key: 'toggle',
            label: c.activo ? 'Desactivar' : 'Activar',
            icon: c.activo ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />,
            disabled: togglingId === c.id,
            onClick: () => handleToggleActivo(c),
          },
          {
            key: 'eliminar',
            label: 'Eliminar',
            icon: <DeleteIcon fontSize="small" />,
            onClick: () => {
              setDeleteError(null);
              setDeleteTarget(c);
            },
          },
        ];

        return <RowActions actions={actions} />;
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Conceptos
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} disabled={!empresaId}>
          Nuevo concepto
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <TextField
          select
          label="Empresa"
          value={empresaId}
          onChange={(e) => setEmpresaId(e.target.value ? Number(e.target.value) : '')}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {empresas.map((empresa) => (
            <MenuItem key={empresa.id} value={empresa.id}>
              {empresa.nombre}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Tipo"
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value as ConceptoTipo | '')}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="ingreso">Ingreso</MenuItem>
          <MenuItem value="gasto">Gasto</MenuItem>
        </TextField>
        <FormControlLabel
          control={<Switch checked={conInactivos} onChange={(e) => setConInactivos(e.target.checked)} />}
          label="Mostrar inactivos"
        />
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}
      {!empresaId && (
        <Alert severity="info">Selecciona una empresa para poder crear un concepto nuevo.</Alert>
      )}

      <DataTable
        columns={columns}
        rows={conceptos}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay conceptos registrados"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Editar concepto' : 'Nuevo concepto'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                select
                label="Empresa"
                value={form.empresa_id || ''}
                onChange={(e) => setForm((f) => ({ ...f, empresa_id: Number(e.target.value) }))}
                disabled={!!editing}
                required
              >
                {empresas.map((empresa) => (
                  <MenuItem key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Tipo"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as ConceptoTipo }))}
                disabled={!!editing}
                required
              >
                <MenuItem value="ingreso">Ingreso</MenuItem>
                <MenuItem value="gasto">Gasto</MenuItem>
              </TextField>
              <UpperTextField
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
        title="Eliminar concepto"
        message={
          <Typography>
            ¿Seguro que deseas eliminar <strong>{deleteTarget?.nombre}</strong>? Si ya tiene movimientos
            registrados, desactívalo en su lugar.
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
