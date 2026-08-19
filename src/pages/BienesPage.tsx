import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../hooks/useAuth';
import { BIEN_TIPO_LABELS, canCrearBienes, canEditBien, canVerBienes } from '../utils/creditoPrendarioHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import {
  createBien,
  listBienes,
  updateBien,
  type CreateBienPayload,
  type UpdateBienPayload,
} from '../api/bienes';
import { listClientes } from '../api/clientes';
import { formatMonto } from '../utils/format';
import type { Bien, BienTipo, Cliente, PaginatedData } from '../types/api';

interface CreateFormState {
  cliente_id?: number;
  tipo: BienTipo;
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  observacion: string;
  valorizacion: string;
  cantidad: string;
  foto_cliente_producto: File | null;
  fotos: File[];
}

interface EditFormState {
  tipo: BienTipo;
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  observacion: string;
  valorizacion: string;
  cantidad: string;
  foto_cliente_producto: File | null;
  fotos: File[];
}

const emptyCreateForm: CreateFormState = {
  tipo: 'varios',
  nombre: '',
  marca: '',
  modelo: '',
  serie: '',
  observacion: '',
  valorizacion: '',
  cantidad: '1',
  foto_cliente_producto: null,
  fotos: [],
};

function PhotoField({
  label,
  file,
  currentUrl,
  onChange,
}: {
  label: string;
  file: File | null;
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
}) {
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
        <Button component="label" size="small" variant="outlined" startIcon={<CloudUploadIcon fontSize="small" />}>
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

function MultiPhotoField({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2">Fotos adicionales</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {files.map((file, index) => (
          <Box key={index} sx={{ position: 'relative' }}>
            <Avatar
              src={URL.createObjectURL(file)}
              variant="rounded"
              sx={{ width: 56, height: 56 }}
            />
            <Tooltip title="Quitar foto">
              <IconButton
                size="small"
                aria-label="Quitar foto"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <DeleteIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
        <Button component="label" size="small" variant="outlined" startIcon={<CloudUploadIcon fontSize="small" />}>
          Agregar
          <input
            type="file"
            hidden
            multiple
            accept="image/jpeg,image/png"
            onChange={(e) => onChange([...files, ...Array.from(e.target.files ?? [])])}
          />
        </Button>
      </Stack>
    </Stack>
  );
}

export function BienesPage() {
  const { user } = useAuth();
  const canCreate = canCrearBienes(user);

  const [result, setResult] = useState<PaginatedData<Bien> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bien | null>(null);
  const [form, setForm] = useState<CreateFormState>(emptyCreateForm);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function loadBienes() {
    setIsLoading(true);
    setLoadError(null);

    listBienes(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadBienes, [page]);

  useEffect(() => {
    listClientes().then((res) => setClientes(res.data.data));
  }, []);

  if (!canVerBienes(user)) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setEditing(null);
    setForm(emptyCreateForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(bien: Bien) {
    setEditing(bien);
    setEditForm({
      tipo: bien.tipo,
      nombre: bien.nombre,
      marca: bien.marca ?? '',
      modelo: bien.modelo ?? '',
      serie: bien.serie ?? '',
      observacion: bien.observacion ?? '',
      valorizacion: bien.valorizacion,
      cantidad: String(bien.cantidad),
      foto_cliente_producto: null,
      fotos: [],
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
        const payload: UpdateBienPayload = {
          tipo: editForm.tipo,
          nombre: editForm.nombre,
          marca: editForm.marca || undefined,
          modelo: editForm.modelo || undefined,
          serie: editForm.serie || undefined,
          observacion: editForm.observacion || undefined,
          valorizacion: editForm.valorizacion,
          cantidad: editForm.cantidad ? Number(editForm.cantidad) : undefined,
          foto_cliente_producto: editForm.foto_cliente_producto,
          fotos: editForm.fotos,
        };

        await updateBien(editing.id, payload);
      } else {
        if (!form.cliente_id) {
          setFormError('Selecciona un cliente');
          setIsSaving(false);
          return;
        }

        const payload: CreateBienPayload = {
          cliente_id: form.cliente_id,
          tipo: form.tipo,
          nombre: form.nombre,
          marca: form.marca || undefined,
          modelo: form.modelo || undefined,
          serie: form.serie || undefined,
          observacion: form.observacion || undefined,
          valorizacion: form.valorizacion,
          cantidad: form.cantidad ? Number(form.cantidad) : undefined,
          foto_cliente_producto: form.foto_cliente_producto,
          fotos: form.fotos,
        };

        await createBien(payload);
      }

      setDialogOpen(false);
      loadBienes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<Bien>[] = [
    { header: 'Nombre', render: (b) => b.nombre },
    { header: 'Tipo', render: (b) => BIEN_TIPO_LABELS[b.tipo] },
    { header: 'Marca / Modelo', render: (b) => [b.marca, b.modelo].filter(Boolean).join(' / ') || '—' },
    { header: 'Valorización', render: (b) => formatMonto(b.valorizacion) },
    {
      header: 'Cliente',
      render: (b) => (b.cliente ? `${b.cliente.nombre} ${b.cliente.apellido}` : '—'),
    },
    { header: 'Agencia', render: (b) => b.agencia?.nombre ?? '—' },
    {
      header: 'Estado',
      render: (b) => (
        <Chip
          label={b.estado}
          size="small"
          color={b.estado === 'en_garantia' ? 'success' : 'default'}
        />
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (b) =>
        canEditBien(user, b) && (
          <RowActions
            actions={[
              {
                key: 'editar',
                label: 'Editar',
                icon: <EditIcon fontSize="small" />,
                onClick: () => openEditDialog(b),
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
          Bienes
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nuevo bien
          </Button>
        )}
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        emptyMessage="No hay bienes registrados"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Editar bien' : 'Nuevo bien'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}

              {editing && editForm ? (
                <>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Cliente: {editing.cliente ? `${editing.cliente.nombre} ${editing.cliente.apellido}` : '—'}
                  </Typography>
                  <TextField
                    select
                    label="Tipo"
                    value={editForm.tipo}
                    onChange={(e) => setEditForm((f) => f && { ...f, tipo: e.target.value as BienTipo })}
                  >
                    <MenuItem value="varios">Varios</MenuItem>
                    <MenuItem value="electro">Electrodoméstico</MenuItem>
                  </TextField>
                  <TextField
                    label="Nombre"
                    value={editForm.nombre}
                    onChange={(e) => setEditForm((f) => f && { ...f, nombre: e.target.value })}
                    required
                    autoFocus
                  />
                  {editForm.tipo === 'electro' && (
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Marca"
                        value={editForm.marca}
                        onChange={(e) => setEditForm((f) => f && { ...f, marca: e.target.value })}
                        required
                        fullWidth
                      />
                      <TextField
                        label="Modelo"
                        value={editForm.modelo}
                        onChange={(e) => setEditForm((f) => f && { ...f, modelo: e.target.value })}
                        required
                        fullWidth
                      />
                    </Stack>
                  )}
                  <TextField
                    label="Serie"
                    value={editForm.serie}
                    onChange={(e) => setEditForm((f) => f && { ...f, serie: e.target.value })}
                  />
                  <TextField
                    label="Observación"
                    value={editForm.observacion}
                    onChange={(e) => setEditForm((f) => f && { ...f, observacion: e.target.value })}
                    multiline
                    minRows={2}
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Valorización"
                      type="number"
                      slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                      value={editForm.valorizacion}
                      onChange={(e) => setEditForm((f) => f && { ...f, valorizacion: e.target.value })}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Cantidad"
                      type="number"
                      slotProps={{ htmlInput: { min: 1 } }}
                      value={editForm.cantidad}
                      onChange={(e) => setEditForm((f) => f && { ...f, cantidad: e.target.value })}
                      fullWidth
                    />
                  </Stack>

                  <PhotoField
                    label="Foto del cliente con el producto"
                    file={editForm.foto_cliente_producto}
                    currentUrl={editing.foto_cliente_producto_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_cliente_producto: file })}
                  />
                  <MultiPhotoField
                    files={editForm.fotos}
                    onChange={(fotos) => setEditForm((f) => f && { ...f, fotos })}
                  />
                </>
              ) : (
                <>
                  <Autocomplete
                    options={clientes}
                    getOptionLabel={(c) => `${c.nombre} ${c.apellido} — ${c.numero_documento}`}
                    value={clientes.find((c) => c.id === form.cliente_id) ?? null}
                    onChange={(_, cliente) => setForm((f) => ({ ...f, cliente_id: cliente?.id }))}
                    renderInput={(params) => <TextField {...params} label="Cliente" required autoFocus />}
                  />
                  <TextField
                    select
                    label="Tipo"
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as BienTipo }))}
                  >
                    <MenuItem value="varios">Varios</MenuItem>
                    <MenuItem value="electro">Electrodoméstico</MenuItem>
                  </TextField>
                  <TextField
                    label="Nombre"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    required
                  />
                  {form.tipo === 'electro' && (
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Marca"
                        value={form.marca}
                        onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                        required
                        fullWidth
                      />
                      <TextField
                        label="Modelo"
                        value={form.modelo}
                        onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                        required
                        fullWidth
                      />
                    </Stack>
                  )}
                  <TextField
                    label="Serie"
                    value={form.serie}
                    onChange={(e) => setForm((f) => ({ ...f, serie: e.target.value }))}
                  />
                  <TextField
                    label="Observación"
                    value={form.observacion}
                    onChange={(e) => setForm((f) => ({ ...f, observacion: e.target.value }))}
                    multiline
                    minRows={2}
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Valorización"
                      type="number"
                      slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                      value={form.valorizacion}
                      onChange={(e) => setForm((f) => ({ ...f, valorizacion: e.target.value }))}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Cantidad"
                      type="number"
                      slotProps={{ htmlInput: { min: 1 } }}
                      value={form.cantidad}
                      onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                      fullWidth
                    />
                  </Stack>

                  <PhotoField
                    label="Foto del cliente con el producto"
                    file={form.foto_cliente_producto}
                    onChange={(file) => setForm((f) => ({ ...f, foto_cliente_producto: file }))}
                  />
                  <MultiPhotoField
                    files={form.fotos}
                    onChange={(fotos) => setForm((f) => ({ ...f, fotos }))}
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
    </Stack>
  );
}
