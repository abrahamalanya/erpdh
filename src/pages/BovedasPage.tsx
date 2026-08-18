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
import { canVerBovedas, puedeControlarBoveda } from '../utils/cajaHierarchy';
import { cerrarBoveda, listBovedas } from '../api/bovedas';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { formatMonto } from '../utils/format';
import type { Boveda, PaginatedData } from '../types/api';

export function BovedasPage() {
  const { user } = useAuth();

  const [result, setResult] = useState<PaginatedData<Boveda> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [target, setTarget] = useState<Boveda | null>(null);
  const [monto, setMonto] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function loadBovedas() {
    setIsLoading(true);
    setLoadError(null);

    listBovedas(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadBovedas, [page]);

  if (!canVerBovedas(user)) {
    return <Navigate to="/" replace />;
  }

  async function handleCerrar(event: FormEvent) {
    event.preventDefault();
    if (!target) return;

    setFormError(null);
    setIsSaving(true);

    try {
      await cerrarBoveda(target.id, monto);
      setTarget(null);
      setMonto('');
      loadBovedas();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<Boveda>[] = [
    { header: 'Tipo', render: (b) => (b.tipo === 'principal' ? 'Principal' : 'Agencia') },
    { header: 'Empresa', render: (b) => b.empresa?.nombre ?? '—' },
    { header: 'Agencia', render: (b) => b.agencia?.nombre ?? '—' },
    {
      header: 'Estado',
      render: (b) => (
        <Chip
          label={b.ciclo_abierto ? 'Abierta' : 'Cerrada'}
          size="small"
          color={b.ciclo_abierto ? 'success' : 'default'}
        />
      ),
    },
    {
      header: 'Saldo apertura',
      render: (b) => (b.ciclo_abierto ? formatMonto(b.ciclo_abierto.saldo_apertura) : '—'),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (b) =>
        b.ciclo_abierto && puedeControlarBoveda(user, b) ? (
          <IconButton size="small" aria-label="Cerrar bóveda" onClick={() => setTarget(b)}>
            <LockIcon fontSize="small" />
          </IconButton>
        ) : null,
    },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Bóvedas
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        emptyMessage="No hay bóvedas registradas"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={!!target} onClose={() => setTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCerrar}>
          <DialogTitle>Cerrar bóveda</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
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
              {isSaving ? 'Cerrando...' : 'Cerrar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
