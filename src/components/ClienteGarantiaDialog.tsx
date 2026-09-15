import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { preventBackdropClose } from '../utils/dialog';
import type { ApiResponse, PaginatedData } from '../types/api';

interface ClienteGarantiaDialogProps<T, F> {
  open: boolean;
  onClose: () => void;
  clienteId: number;
  clienteNombre?: string;
  /** "Bienes" | "Vehículos" | "Inmuebles" — usado en el título y los mensajes. */
  title: string;
  canCrear: boolean;
  emptyMessage: string;
  addLabel: string;
  emptyForm: F;
  list: (clienteId: number) => Promise<ApiResponse<PaginatedData<T>>>;
  create: (clienteId: number, form: F) => Promise<ApiResponse<T>>;
  renderFields: (value: F, onChange: (value: F) => void) => ReactNode;
  renderItem: (item: T) => ReactNode;
}

/**
 * Lista + alta rápida de los bienes/vehículos/inmuebles de un cliente, en su
 * propio modal — mismo patrón que FichaSocioeconomicaDialog (un botón en el
 * cliente abre esto, en vez de tenerlo embebido en el formulario de edición).
 * Genérico sobre el tipo de garantía porque los tres (Bien/Vehiculo/Inmueble)
 * comparten exactamente esta forma: listar por cliente_id + un
 * XCreateFields ya existente para el alta.
 */
export function ClienteGarantiaDialog<T, F>({
  open,
  onClose,
  clienteId,
  clienteNombre,
  title,
  canCrear,
  emptyMessage,
  addLabel,
  emptyForm,
  list,
  create,
  renderFields,
  renderItem,
}: ClienteGarantiaDialogProps<T, F>) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<F>(emptyForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function load() {
    setIsLoading(true);
    setLoadError(null);

    list(clienteId)
      .then((res) => setItems(res.data.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clienteId]);

  function openCreate() {
    setForm(emptyForm);
    setCreateError(null);
    setCreateOpen(true);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setIsSaving(true);

    try {
      await create(clienteId, form);
      setCreateOpen(false);
      load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onClose={preventBackdropClose(onClose)} fullWidth maxWidth="sm">
        <DialogTitle>
          {title}
          {clienteNombre ? ` — ${clienteNombre}` : ''}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {loadError && <Alert severity="error">{loadError}</Alert>}
            {canCrear && (
              <Box>
                <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={openCreate}>
                  {addLabel}
                </Button>
              </Box>
            )}
            {isLoading ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Cargando...
              </Typography>
            ) : items.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {emptyMessage}
              </Typography>
            ) : (
              <Stack spacing={1}>{items.map((item) => renderItem(item))}</Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createOpen} onClose={preventBackdropClose(() => setCreateOpen(false))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>{addLabel}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {createError && <Alert severity="error">{createError}</Alert>}
              {renderFields(form, setForm)}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
