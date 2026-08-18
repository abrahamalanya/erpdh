import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
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
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { BIEN_TIPO_LABELS, canCrearBienes, canVerBienes } from '../utils/creditoPrendarioHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { createBien, listBienes, type CreateBienPayload } from '../api/bienes';
import { listAgencias } from '../api/agencias';
import { formatMonto } from '../utils/format';
import type { Agencia, Bien, BienTipo, PaginatedData } from '../types/api';

interface FormState {
  tipo: BienTipo;
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  observacion: string;
  valorizacion: string;
  cantidad: string;
  agencia_id?: number;
  foto_cliente_producto: File | null;
  fotos: File[];
}

const emptyForm: FormState = {
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
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <Avatar src={previewUrl} variant="rounded" sx={{ width: 56, height: 56 }}>
        <ImageIcon />
      </Avatar>
      <Stack spacing={0.5}>
        <Typography variant="body2">{label}</Typography>
        <Button component="label" size="small" variant="outlined" startIcon={<CloudUploadIcon fontSize="small" />}>
          {file ? 'Reemplazar' : 'Subir'}
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
            <IconButton
              size="small"
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
  const needsAgenciaPicker = hasRole(user, 'sistemas', 'administrador_general', 'secretaria');
  const canCreate = canCrearBienes(user);

  const [result, setResult] = useState<PaginatedData<Bien> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [agencias, setAgencias] = useState<Agencia[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
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
    if (needsAgenciaPicker) {
      listAgencias().then((res) => setAgencias(res.data.data));
    }
  }, [needsAgenciaPicker]);

  if (!canVerBienes(user)) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const payload: CreateBienPayload = {
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

      if (needsAgenciaPicker) payload.agencia_id = form.agencia_id;

      await createBien(payload);
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
          <DialogTitle>Nuevo bien</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
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
                autoFocus
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
              {needsAgenciaPicker && (
                <TextField
                  select
                  label="Agencia"
                  value={form.agencia_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, agencia_id: Number(e.target.value) }))}
                  required
                >
                  {agencias.map((agencia) => (
                    <MenuItem key={agencia.id} value={agencia.id}>
                      {agencia.nombre}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <PhotoField
                label="Foto del cliente con el producto"
                file={form.foto_cliente_producto}
                onChange={(file) => setForm((f) => ({ ...f, foto_cliente_producto: file }))}
              />
              <MultiPhotoField
                files={form.fotos}
                onChange={(fotos) => setForm((f) => ({ ...f, fotos }))}
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
    </Stack>
  );
}
