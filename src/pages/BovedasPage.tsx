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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AddCardIcon from '@mui/icons-material/AddCard';
import RestoreIcon from '@mui/icons-material/Restore';
import { useAuth } from '../hooks/useAuth';
import {
  canVerBovedas,
  puedeAperturarBoveda,
  puedeControlarBoveda,
  puedeInyectarBoveda,
  puedeReabrirBoveda,
} from '../utils/cajaHierarchy';
import { aperturarBoveda, cerrarBoveda, inyectarBoveda, listBovedas, reabrirBoveda } from '../api/bovedas';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RowActions, type RowAction } from '../components/RowActions';
import { UpperTextField } from '../components/UpperTextField';
import { formatMonto } from '../utils/format';
import type { Boveda, PaginatedData } from '../types/api';

export function BovedasPage() {
  const { user } = useAuth();

  const [result, setResult] = useState<PaginatedData<Boveda> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cerrarTarget, setCerrarTarget] = useState<Boveda | null>(null);
  const [monto, setMonto] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [aperturarTarget, setAperturarTarget] = useState<Boveda | null>(null);
  const [saldoInicial, setSaldoInicial] = useState('');
  const [isAperturando, setIsAperturando] = useState(false);
  const [aperturarError, setAperturarError] = useState<string | null>(null);

  const [inyectarTarget, setInyectarTarget] = useState<Boveda | null>(null);
  const [montoInyeccion, setMontoInyeccion] = useState('');
  const [conceptoInyeccion, setConceptoInyeccion] = useState('');
  const [isInyectando, setIsInyectando] = useState(false);
  const [inyectarError, setInyectarError] = useState<string | null>(null);

  const [reabrirTarget, setReabrirTarget] = useState<Boveda | null>(null);
  const [isReabriendo, setIsReabriendo] = useState(false);

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
    if (!cerrarTarget) return;

    setFormError(null);
    setIsSaving(true);

    try {
      await cerrarBoveda(cerrarTarget.id, monto);
      setCerrarTarget(null);
      setMonto('');
      loadBovedas();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAperturar(event: FormEvent) {
    event.preventDefault();
    if (!aperturarTarget) return;

    setAperturarError(null);
    setIsAperturando(true);

    try {
      await aperturarBoveda(aperturarTarget.id, saldoInicial || undefined);
      setAperturarTarget(null);
      setSaldoInicial('');
      loadBovedas();
    } catch (err) {
      setAperturarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsAperturando(false);
    }
  }

  async function handleInyectar(event: FormEvent) {
    event.preventDefault();
    if (!inyectarTarget) return;

    setInyectarError(null);
    setIsInyectando(true);

    try {
      await inyectarBoveda(
        inyectarTarget.id,
        montoInyeccion,
        conceptoInyeccion ? conceptoInyeccion.toLowerCase() : undefined
      );
      setInyectarTarget(null);
      setMontoInyeccion('');
      setConceptoInyeccion('');
      loadBovedas();
    } catch (err) {
      setInyectarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsInyectando(false);
    }
  }

  async function handleReabrir() {
    if (!reabrirTarget) return;

    setLoadError(null);
    setIsReabriendo(true);

    try {
      await reabrirBoveda(reabrirTarget.id);
      setReabrirTarget(null);
      loadBovedas();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsReabriendo(false);
    }
  }

  const columns: DataTableColumn<Boveda>[] = [
    { header: 'Tipo', render: (b) => (b.tipo === 'principal' ? 'Principal' : 'Agencia') },
    { header: 'Empresa', render: (b) => b.empresa?.nombre.toUpperCase() ?? '—' },
    { header: 'Agencia', render: (b) => b.agencia?.nombre.toUpperCase() ?? '—' },
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
      header: 'Saldo actual',
      render: (b) =>
        b.ciclo_abierto ? formatMonto(b.ciclo_abierto.saldo_actual ?? b.ciclo_abierto.saldo_apertura) : '—',
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (b) => {
        const actions: RowAction[] = [];

        if (!b.ciclo_abierto && puedeAperturarBoveda(user, b)) {
          actions.push({
            key: 'aperturar',
            label: 'Aperturar bóveda (ciclo nuevo)',
            icon: <LockOpenIcon fontSize="small" />,
            onClick: () => setAperturarTarget(b),
          });
        }
        if (!b.ciclo_abierto && puedeReabrirBoveda(user, b)) {
          actions.push({
            key: 'reabrir',
            label: 'Reabrir el último ciclo cerrado',
            icon: <RestoreIcon fontSize="small" />,
            onClick: () => setReabrirTarget(b),
          });
        }
        if (b.ciclo_abierto && puedeInyectarBoveda(user, b)) {
          actions.push({
            key: 'inyectar',
            label: b.tipo === 'principal' ? 'Inyectar capital' : 'Traspasar desde bóveda principal',
            icon: <AddCardIcon fontSize="small" />,
            onClick: () => setInyectarTarget(b),
          });
        }
        if (b.ciclo_abierto && puedeControlarBoveda(user, b)) {
          actions.push({
            key: 'cerrar',
            label: 'Cerrar bóveda',
            icon: <LockIcon fontSize="small" />,
            onClick: () => setCerrarTarget(b),
          });
        }

        return <RowActions actions={actions} />;
      },
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

      <Dialog open={!!aperturarTarget} onClose={() => setAperturarTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleAperturar}>
          <DialogTitle>Aperturar bóveda</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {aperturarError && <Alert severity="error">{aperturarError}</Alert>}
              <TextField
                label="Saldo inicial"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                helperText="Obligatorio solo la primera vez que se apertura la bóveda"
                autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setAperturarTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isAperturando}>
              {isAperturando ? 'Aperturando...' : 'Aperturar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!inyectarTarget} onClose={() => setInyectarTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleInyectar}>
          <DialogTitle>
            {inyectarTarget?.tipo === 'principal' ? 'Inyectar capital' : 'Traspasar desde bóveda principal'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {inyectarError && <Alert severity="error">{inyectarError}</Alert>}
              <TextField
                label="Monto"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={montoInyeccion}
                onChange={(e) => setMontoInyeccion(e.target.value)}
                required
                autoFocus
              />
              <UpperTextField
                label="Concepto (opcional)"
                value={conceptoInyeccion}
                onChange={(e) => setConceptoInyeccion(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setInyectarTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isInyectando}>
              {isInyectando ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!cerrarTarget} onClose={() => setCerrarTarget(null)} fullWidth maxWidth="xs">
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
            <Button onClick={() => setCerrarTarget(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? 'Cerrando...' : 'Cerrar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={!!reabrirTarget}
        title="Reabrir bóveda"
        message="Esto reabre el último ciclo cerrado de esta bóveda (no crea uno nuevo), para regularizar un movimiento con su fecha contable original. ¿Continuar?"
        confirmLabel="Reabrir"
        onCancel={() => setReabrirTarget(null)}
        onConfirm={handleReabrir}
        isLoading={isReabriendo}
      />
    </Stack>
  );
}
