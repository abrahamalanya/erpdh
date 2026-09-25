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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useAuth } from '../hooks/useAuth';
import { ARTICULO_TIPO_LABELS, canEditarTiendaProducto, canVerTiendaProductos } from '../utils/ventaHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { DialogHeader } from '../components/DialogHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  listTiendaProductos,
  retirarTiendaProducto,
  updateTiendaProducto,
  type UpdateTiendaProductoPayload,
} from '../api/tienda';
import { preventBackdropClose } from '../utils/dialog';
import { formatMonto } from '../utils/format';
import type { ArticuloTipo, PaginatedData, TiendaArticulo } from '../types/api';

interface EditFormState {
  precio_venta: string;
  precio_oferta: string;
}

export function TiendaProductosPage() {
  const { user } = useAuth();

  const [result, setResult] = useState<PaginatedData<TiendaArticulo> | null>(null);
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState<ArticuloTipo | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState<TiendaArticulo | null>(null);
  const [form, setForm] = useState<EditFormState>({ precio_venta: '', precio_oferta: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [retirarTarget, setRetirarTarget] = useState<TiendaArticulo | null>(null);
  const [isRetirando, setIsRetirando] = useState(false);
  const [retirarError, setRetirarError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    setLoadError(null);

    listTiendaProductos(page, { tipo: tipo || undefined })
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, tipo]);

  if (!canVerTiendaProductos(user)) {
    return <Navigate to="/" replace />;
  }

  function openEditDialog(articulo: TiendaArticulo) {
    setEditing(articulo);
    setForm({
      precio_venta: articulo.precio_venta ?? '',
      precio_oferta: articulo.precio_oferta ?? '',
    });
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setFormError(null);
    setIsSaving(true);

    try {
      const payload: UpdateTiendaProductoPayload = {
        precio_venta: form.precio_venta || undefined,
        precio_oferta: form.precio_oferta === '' ? null : form.precio_oferta,
      };

      await updateTiendaProducto(editing.articulo_tipo, editing.id, payload);
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublicar(articulo: TiendaArticulo) {
    try {
      await updateTiendaProducto(articulo.articulo_tipo, articulo.id, { estado: 'disponible_venta' });
      load();
    } catch {
      // El error se ve al reintentar; no hay un lugar fijo donde mostrarlo en la fila.
    }
  }

  async function handleRetirar() {
    if (!retirarTarget) return;

    setIsRetirando(true);
    setRetirarError(null);

    try {
      await retirarTiendaProducto(retirarTarget.articulo_tipo, retirarTarget.id);
      setRetirarTarget(null);
      load();
    } catch (err) {
      setRetirarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsRetirando(false);
    }
  }

  const columns: DataTableColumn<TiendaArticulo>[] = [
    { header: 'Tipo', render: (a) => ARTICULO_TIPO_LABELS[a.articulo_tipo] },
    { header: 'Nombre', render: (a) => a.nombre },
    { header: 'Agencia', render: (a) => a.agencia?.nombre.toUpperCase() ?? '—' },
    { header: 'Precio venta', render: (a) => (a.precio_venta ? formatMonto(a.precio_venta) : '—') },
    { header: 'Precio oferta', render: (a) => (a.precio_oferta ? formatMonto(a.precio_oferta) : '—') },
    {
      header: 'Estado',
      render: (a) => (
        <Chip
          label={a.estado === 'vendida' ? 'Vendido' : a.estado === 'disponible_venta' ? 'En tienda' : 'Retirado'}
          size="small"
          color={a.estado === 'vendida' ? 'success' : a.estado === 'disponible_venta' ? 'info' : 'default'}
        />
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (a) =>
        a.estado !== 'vendida' &&
        canEditarTiendaProducto(user, a.articulo_tipo) && (
          <RowActions
            actions={[
              { key: 'editar', label: 'Editar precio/oferta', icon: <EditIcon fontSize="small" />, onClick: () => openEditDialog(a) },
              a.estado === 'disponible_venta'
                ? {
                    key: 'retirar',
                    label: 'Retirar de la tienda',
                    icon: <RemoveShoppingCartIcon fontSize="small" />,
                    onClick: () => {
                      setRetirarError(null);
                      setRetirarTarget(a);
                    },
                  }
                : {
                    key: 'publicar',
                    label: 'Publicar en la tienda',
                    icon: <StorefrontIcon fontSize="small" />,
                    onClick: () => handlePublicar(a),
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
          Productos de la tienda virtual
        </Typography>
        <TextField
          select
          label="Tipo"
          size="small"
          value={tipo}
          onChange={(e) => {
            setPage(1);
            setTipo(e.target.value as ArticuloTipo | '');
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {(Object.keys(ARTICULO_TIPO_LABELS) as ArticuloTipo[]).map((t) => (
            <MenuItem key={t} value={t}>
              {ARTICULO_TIPO_LABELS[t]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Incluye los artículos publicados, los retirados (para poder volver a publicarlos) y los ya vendidos (solo
        como registro).
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(a) => `${a.articulo_tipo}-${a.id}`}
        isLoading={isLoading}
        emptyMessage="No hay productos"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={!!editing} onClose={preventBackdropClose(() => setEditing(null))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogHeader onClose={() => setEditing(null)}>Editar producto</DialogHeader>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {editing?.nombre}
              </Typography>
              <TextField
                label="Precio de venta"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                value={form.precio_venta}
                onChange={(e) => setForm((f) => ({ ...f, precio_venta: e.target.value }))}
                required
                autoFocus
              />
              <TextField
                label="Precio de oferta"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                value={form.precio_oferta}
                onChange={(e) => setForm((f) => ({ ...f, precio_oferta: e.target.value }))}
                helperText="Opcional, debe ser menor al precio de venta. Vacío = sin oferta."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={!!retirarTarget}
        title="Retirar de la tienda"
        message="El producto deja de listarse en la tienda virtual, pero el registro no se borra — puedes volver a publicarlo después."
        onCancel={() => {
          setRetirarTarget(null);
          setRetirarError(null);
        }}
        onConfirm={handleRetirar}
        isLoading={isRetirando}
        error={retirarError}
        confirmLabel="Retirar"
      />
    </Stack>
  );
}
