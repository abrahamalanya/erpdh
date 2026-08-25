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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { canVerBilletajes, extractUserName, puedeControlarBoveda } from '../utils/cajaHierarchy';
import { aprobarBilletaje, listBilletajes, rechazarBilletaje } from '../api/billetajes';
import { listAgencias } from '../api/agencias';
import { listCuentasBancarias } from '../api/cuentasBancarias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { UpperTextField } from '../components/UpperTextField';
import { getEcho } from '../realtime/echo';
import { capitalize, formatMonto } from '../utils/format';
import type {
  Agencia,
  Billetaje,
  BilletajeEstado,
  CanalEgresoBilletaje,
  CuentaBancaria,
  MedioEgresoBilletaje,
  PaginatedData,
} from '../types/api';

const MEDIO_RECEPCION_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia',
};

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

  const [rechazarTarget, setRechazarTarget] = useState<Billetaje | null>(null);
  const [motivo, setMotivo] = useState('');
  const [isRechazando, setIsRechazando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [aprobarTarget, setAprobarTarget] = useState<Billetaje | null>(null);
  const [medioEgreso, setMedioEgreso] = useState<MedioEgresoBilletaje>('efectivo');
  const [canalEgreso, setCanalEgreso] = useState<CanalEgresoBilletaje | ''>('');
  const [cuentaBancariaId, setCuentaBancariaId] = useState<number | ''>('');
  const [cuentasDisponibles, setCuentasDisponibles] = useState<CuentaBancaria[]>([]);
  const [isAprobando, setIsAprobando] = useState(false);
  const [aprobarError, setAprobarError] = useState<string | null>(null);

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

  function openAprobarDialog(billetaje: Billetaje) {
    setAprobarTarget(billetaje);
    setMedioEgreso('efectivo');
    setCanalEgreso('');
    setCuentaBancariaId('');
    setAprobarError(null);

    if (billetaje.boveda_id) {
      listCuentasBancarias(billetaje.boveda_id)
        .then((res) => setCuentasDisponibles(res.data.filter((c) => c.activa)))
        .catch(() => setCuentasDisponibles([]));
    }
  }

  function closeAprobarDialog() {
    setAprobarTarget(null);
    setCuentasDisponibles([]);
  }

  async function handleAprobar(event: FormEvent) {
    event.preventDefault();
    if (!aprobarTarget) return;

    setAprobarError(null);
    setIsAprobando(true);

    try {
      await aprobarBilletaje(
        aprobarTarget.id,
        medioEgreso,
        medioEgreso === 'cuenta_bancaria' ? (canalEgreso || undefined) : undefined,
        medioEgreso === 'cuenta_bancaria' ? (cuentaBancariaId as number) : undefined
      );
      closeAprobarDialog();
      loadBilletajes();
    } catch (err) {
      setAprobarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsAprobando(false);
    }
  }

  const cuentasParaCanal = cuentasDisponibles.filter((c) => {
    if (canalEgreso === 'yape') return c.acepta_yape;
    if (canalEgreso === 'plin') return c.acepta_plin;
    return true;
  });

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
    { header: 'Motivo', render: (b) => b.motivo ?? '—' },
    {
      header: 'Recibe por',
      render: (b) => (b.medio_recepcion ? MEDIO_RECEPCION_LABEL[b.medio_recepcion] : '—'),
    },
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
                      onClick: () => openAprobarDialog(b),
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

      <Dialog open={!!aprobarTarget} onClose={closeAprobarDialog} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleAprobar}>
          <DialogTitle>Aprobar billetaje</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {aprobarError && <Alert severity="error">{aprobarError}</Alert>}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {extractUserName(aprobarTarget?.solicitado_por)} · {formatMonto(aprobarTarget?.monto ?? '0')}
                {aprobarTarget?.motivo ? ` · ${aprobarTarget.motivo}` : ''}
              </Typography>
              {aprobarTarget?.medio_recepcion && aprobarTarget.medio_recepcion !== 'efectivo' && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Solicitó recibir por {MEDIO_RECEPCION_LABEL[aprobarTarget.medio_recepcion]}
                  {aprobarTarget.datos_recepcion ? `: ${aprobarTarget.datos_recepcion}` : ''}
                </Typography>
              )}
              <TextField
                select
                label="¿De dónde sale el dinero?"
                value={medioEgreso}
                onChange={(e) => {
                  setMedioEgreso(e.target.value as MedioEgresoBilletaje);
                  setCanalEgreso('');
                  setCuentaBancariaId('');
                }}
              >
                <MenuItem value="efectivo">Efectivo</MenuItem>
                <MenuItem value="cuenta_bancaria">Cuenta bancaria</MenuItem>
              </TextField>
              {medioEgreso === 'cuenta_bancaria' && (
                <>
                  <TextField
                    select
                    label="Canal"
                    value={canalEgreso}
                    onChange={(e) => {
                      setCanalEgreso(e.target.value as CanalEgresoBilletaje);
                      setCuentaBancariaId('');
                    }}
                    required
                  >
                    <MenuItem value="transferencia">Transferencia</MenuItem>
                    <MenuItem value="yape">Yape</MenuItem>
                    <MenuItem value="plin">Plin</MenuItem>
                    <MenuItem value="deposito">Depósito</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="Cuenta bancaria"
                    value={cuentaBancariaId}
                    onChange={(e) => setCuentaBancariaId(Number(e.target.value))}
                    required
                    helperText={
                      cuentasParaCanal.length === 0
                        ? 'No hay cuentas activas disponibles para este canal'
                        : undefined
                    }
                  >
                    {cuentasParaCanal.map((cuenta) => (
                      <MenuItem key={cuenta.id} value={cuenta.id}>
                        {cuenta.banco?.nombre} — {cuenta.numero_cuenta}
                      </MenuItem>
                    ))}
                  </TextField>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={closeAprobarDialog}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                isAprobando ||
                (medioEgreso === 'cuenta_bancaria' && (!canalEgreso || !cuentaBancariaId))
              }
            >
              {isAprobando ? 'Aprobando...' : 'Aprobar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

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
