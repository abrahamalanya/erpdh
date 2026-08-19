import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
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
import { useAuth } from '../hooks/useAuth';
import {
  BIEN_ESTADO_LABELS,
  BIEN_TIPO_LABELS,
  canCrearBienes,
  canEditBien,
  canVerBienes,
} from '../utils/creditoPrendarioHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { UpperTextField } from '../components/UpperTextField';
import { PhotoField, VideoField, MultiPhotoField } from '../components/MediaFields';
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
  puntaje: string;
  foto_cliente_producto: File | null;
  fotos: File[];
  video: File | null;
}

interface EditFormState {
  tipo: BienTipo;
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  observacion: string;
  valorizacion: string;
  puntaje: string;
  foto_cliente_producto: File | null;
  fotos: File[];
  video: File | null;
}

const emptyCreateForm: CreateFormState = {
  tipo: 'varios',
  nombre: '',
  marca: '',
  modelo: '',
  serie: '',
  observacion: '',
  valorizacion: '',
  puntaje: '',
  foto_cliente_producto: null,
  fotos: [],
  video: null,
};

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
      puntaje: String(bien.puntaje),
      foto_cliente_producto: null,
      fotos: [],
      video: null,
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
          nombre: editForm.nombre.toLowerCase(),
          marca: editForm.marca ? editForm.marca.toLowerCase() : undefined,
          modelo: editForm.modelo ? editForm.modelo.toLowerCase() : undefined,
          serie: editForm.serie ? editForm.serie.toLowerCase() : undefined,
          observacion: editForm.observacion ? editForm.observacion.toLowerCase() : undefined,
          valorizacion: editForm.valorizacion,
          puntaje: Number(editForm.puntaje),
          foto_cliente_producto: editForm.foto_cliente_producto,
          fotos: editForm.fotos,
          video: editForm.video,
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
          nombre: form.nombre.toLowerCase(),
          marca: form.marca ? form.marca.toLowerCase() : undefined,
          modelo: form.modelo ? form.modelo.toLowerCase() : undefined,
          serie: form.serie ? form.serie.toLowerCase() : undefined,
          observacion: form.observacion ? form.observacion.toLowerCase() : undefined,
          valorizacion: form.valorizacion,
          puntaje: Number(form.puntaje),
          foto_cliente_producto: form.foto_cliente_producto,
          fotos: form.fotos,
          video: form.video,
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
    { header: 'Nombre', render: (b) => b.nombre.toUpperCase() },
    { header: 'Tipo', render: (b) => BIEN_TIPO_LABELS[b.tipo] },
    {
      header: 'Marca / Modelo',
      render: (b) =>
        [b.marca, b.modelo]
          .filter((v): v is string => !!v)
          .map((v) => v.toUpperCase())
          .join(' / ') || '—',
    },
    { header: 'Valorización', render: (b) => formatMonto(b.valorizacion) },
    { header: 'Puntaje', render: (b) => `${b.puntaje}/10` },
    {
      header: 'Cliente',
      render: (b) => (b.cliente ? `${b.cliente.nombre} ${b.cliente.apellido}`.toUpperCase() : '—'),
    },
    { header: 'Agencia', render: (b) => b.agencia?.nombre.toUpperCase() ?? '—' },
    {
      header: 'Estado',
      render: (b) => (
        <Chip
          label={BIEN_ESTADO_LABELS[b.estado]}
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
                  <UpperTextField
                    label="Nombre"
                    value={editForm.nombre}
                    onChange={(e) => setEditForm((f) => f && { ...f, nombre: e.target.value })}
                    required
                    autoFocus
                  />
                  {editForm.tipo === 'electro' && (
                    <Stack direction="row" spacing={2}>
                      <UpperTextField
                        label="Marca"
                        value={editForm.marca}
                        onChange={(e) => setEditForm((f) => f && { ...f, marca: e.target.value })}
                        required
                        fullWidth
                      />
                      <UpperTextField
                        label="Modelo"
                        value={editForm.modelo}
                        onChange={(e) => setEditForm((f) => f && { ...f, modelo: e.target.value })}
                        required
                        fullWidth
                      />
                    </Stack>
                  )}
                  <UpperTextField
                    label="Serie"
                    value={editForm.serie}
                    onChange={(e) => setEditForm((f) => f && { ...f, serie: e.target.value })}
                  />
                  <UpperTextField
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
                      label="Puntaje (1-10)"
                      type="number"
                      slotProps={{ htmlInput: { min: 1, max: 10 } }}
                      value={editForm.puntaje}
                      onChange={(e) => setEditForm((f) => f && { ...f, puntaje: e.target.value })}
                      helperText="Según el estado del producto"
                      required
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
                    existing={editing.fotos}
                    files={editForm.fotos}
                    onChange={(fotos) => setEditForm((f) => f && { ...f, fotos })}
                  />
                  <VideoField
                    label="Video del producto"
                    file={editForm.video}
                    currentUrl={editing.video_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, video: file })}
                  />
                </>
              ) : (
                <>
                  <Autocomplete
                    options={clientes}
                    getOptionLabel={(c) => `${c.nombre} ${c.apellido} — ${c.numero_documento}`.toUpperCase()}
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
                  <UpperTextField
                    label="Nombre"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    required
                  />
                  {form.tipo === 'electro' && (
                    <Stack direction="row" spacing={2}>
                      <UpperTextField
                        label="Marca"
                        value={form.marca}
                        onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                        required
                        fullWidth
                      />
                      <UpperTextField
                        label="Modelo"
                        value={form.modelo}
                        onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                        required
                        fullWidth
                      />
                    </Stack>
                  )}
                  <UpperTextField
                    label="Serie"
                    value={form.serie}
                    onChange={(e) => setForm((f) => ({ ...f, serie: e.target.value }))}
                  />
                  <UpperTextField
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
                      label="Puntaje (1-10)"
                      type="number"
                      slotProps={{ htmlInput: { min: 1, max: 10 } }}
                      value={form.puntaje}
                      onChange={(e) => setForm((f) => ({ ...f, puntaje: e.target.value }))}
                      helperText="Según el estado del producto"
                      required
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
                  <VideoField
                    label="Video del producto"
                    file={form.video}
                    onChange={(file) => setForm((f) => ({ ...f, video: file }))}
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
