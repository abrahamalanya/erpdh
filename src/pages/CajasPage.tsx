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
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../hooks/useAuth';
import { canCerrarForzado, canVerCajas, puedeForzarCierre } from '../utils/cajaHierarchy';
import { cerrarForzadoCaja, listCajas } from '../api/caja';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { formatMonto } from '../utils/format';
import type { Caja, PaginatedData } from '../types/api';

export function CajasPage() {
  const { user } = useAuth();

  const [result, setResult] = useState<PaginatedData<Caja> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [target, setTarget] = useState<Caja | null>(null);
  const [monto, setMonto] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function loadCajas() {
    setIsLoading(true);
    setLoadError(null);

    listCajas(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadCajas, [page]);

  if (!canVerCajas(user)) {
    return <Navigate to="/" replace />;
  }

  async function handleForzar(event: FormEvent) {
    event.preventDefault();
    if (!target) return;

    setFormError(null);
    setIsSaving(true);

    try {
      await cerrarForzadoCaja(target.id, monto);
      setTarget(null);
      setMonto('');
      loadCajas();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<Caja>[] = [
    { header: 'Usuario', render: (c) => (c.user ? `${c.user.nombre} ${c.user.apellido}` : '—') },
    { header: 'Agencia', render: (c) => c.agencia?.nombre ?? 'Principal' },
    {
      header: 'Estado',
      render: (c) => (
        <Chip
          label={c.ciclo_abierto ? 'Abierta' : 'Cerrada'}
          size="small"
          color={c.ciclo_abierto ? 'success' : 'default'}
        />
      ),
    },
    {
      header: 'Saldo apertura',
      render: (c) => (c.ciclo_abierto ? formatMonto(c.ciclo_abierto.saldo_apertura) : '—'),
    },
    ...(canCerrarForzado(user)
      ? [
          {
            header: 'Acciones',
            align: 'right' as const,
            render: (c: Caja) =>
              c.ciclo_abierto && c.user_id !== user?.id && puedeForzarCierre(user, c) ? (
                <IconButton size="small" aria-label="Cerrar forzado" onClick={() => setTarget(c)}>
                  <LockIcon fontSize="small" />
                </IconButton>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Cajas
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay cajas registradas"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={!!target} onClose={() => setTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleForzar}>
          <DialogTitle>Cerrar caja (forzado)</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {target?.user?.nombre} {target?.user?.apellido}
              </Typography>
              <TextField
                label="Monto contado"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? 'Cerrando...' : 'Cerrar forzado'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
