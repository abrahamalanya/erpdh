import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { canVerBilletajes, extractUserName, puedeControlarBoveda } from '../utils/cajaHierarchy';
import { aprobarBilletaje, listBilletajes, rechazarBilletaje } from '../api/billetajes';
import { listAgencias } from '../api/agencias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { UpperTextField } from '../components/UpperTextField';
import { getEcho } from '../realtime/echo';
import { capitalize, formatMonto } from '../utils/format';
import type { Agencia, Billetaje, BilletajeEstado, PaginatedData } from '../types/api';

const ESTADO_COLOR: Record<BilletajeEstado, 'warning' | 'success' | 'error'> = {
  pendiente: 'warning',
  aprobado: 'success',
  rechazado: 'error',
};

export function BilletajesPage() {
  const { user } = useAuth();
  const canActOnAny = hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia');

  const [result, setResult] = useState<PaginatedData<Billetaje> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [isActing, setIsActing] = useState<number | null>(null);

  const [rechazarTarget, setRechazarTarget] = useState<Billetaje | null>(null);
  const [motivo, setMotivo] = useState('');
  const [isRechazando, setIsRechazando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function loadBilletajes() {
    setIsLoading(true);
    setLoadError(null);

    listBilletajes(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadBilletajes, [page]);

  useEffect(() => {
    if (hasRole(user, 'sistemas', 'administrador_general')) {
      listAgencias().then((res) => setAgencias(res.data.data));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = getEcho().private(`App.Models.User.${user.id}`);
    const refetchSilently = () => listBilletajes(page).then((res) => setResult(res.data));

    channel.listen('.billetaje.actualizado', refetchSilently);

    return () => {
      channel.stopListening('.billetaje.actualizado', refetchSilently);
    };
  }, [user, page]);

  if (!canVerBilletajes(user)) {
    return <Navigate to="/" replace />;
  }

  async function handleAprobar(billetaje: Billetaje) {
    setLoadError(null);
    setIsActing(billetaje.id);

    try {
      await aprobarBilletaje(billetaje.id);
      loadBilletajes();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsActing(null);
    }
  }

  async function handleRechazar() {
    if (!rechazarTarget) return;

    setFormError(null);
    setIsRechazando(true);

    try {
      await rechazarBilletaje(rechazarTarget.id, motivo ? motivo.toLowerCase() : undefined);
      setRechazarTarget(null);
      setMotivo('');
      loadBilletajes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsRechazando(false);
    }
  }

  function bovedaLabel(billetaje: Billetaje): string {
    if (!billetaje.boveda) return '—';
    if (billetaje.boveda.tipo === 'principal') return 'Bóveda principal';

    const agencia = agencias.find((a) => a.id === billetaje.boveda?.agencia_id);
    return agencia ? `Agencia ${agencia.nombre}` : 'Bóveda de agencia';
  }

  const columns: DataTableColumn<Billetaje>[] = [
    {
      header: 'Solicitante',
      render: (b) => extractUserName(b.solicitado_por)?.toUpperCase() ?? '—',
    },
    { header: 'Bóveda', render: (b) => bovedaLabel(b).toUpperCase() },
    { header: 'Monto', render: (b) => formatMonto(b.monto) },
    {
      header: 'Estado',
      render: (b) => <Chip label={capitalize(b.estado)} size="small" color={ESTADO_COLOR[b.estado]} />,
    },
    {
      header: 'Resuelto por',
      render: (b) => extractUserName(b.aprobado_por)?.toUpperCase() ?? '—',
    },
    ...(canActOnAny
      ? [
          {
            header: 'Acciones',
            align: 'right' as const,
            render: (b: Billetaje) =>
              b.estado === 'pendiente' && b.boveda && puedeControlarBoveda(user, b.boveda) ? (
                <RowActions
                  actions={[
                    {
                      key: 'aprobar',
                      label: 'Aprobar',
                      icon: <CheckIcon fontSize="small" />,
                      disabled: isActing === b.id,
                      onClick: () => handleAprobar(b),
                    },
                    {
                      key: 'rechazar',
                      label: 'Rechazar',
                      icon: <CloseIcon fontSize="small" />,
                      onClick: () => setRechazarTarget(b),
                    },
                  ]}
                />
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Billetajes
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        emptyMessage="No hay billetajes registrados"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={!!rechazarTarget} onClose={() => setRechazarTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Rechazar billetaje</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {extractUserName(rechazarTarget?.solicitado_por)} ·{' '}
              {formatMonto(rechazarTarget?.monto ?? '0')}
            </Typography>
            <UpperTextField
              label="Motivo (opcional)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setRechazarTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleRechazar} disabled={isRechazando}>
            {isRechazando ? 'Rechazando...' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
