import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { canAccederCajaPropia, canSolicitarBilletaje } from '../utils/cajaHierarchy';
import { aperturarCaja, cerrarCaja, getMiCaja } from '../api/caja';
import { solicitarBilletaje } from '../api/billetajes';
import { formatMonto } from '../utils/format';
import type { Caja, CajaCiclo } from '../types/api';

export function CajaPage() {
  const { user } = useAuth();

  const [caja, setCaja] = useState<Caja | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isAperturando, setIsAperturando] = useState(false);

  const [cerrarOpen, setCerrarOpen] = useState(false);
  const [montoContado, setMontoContado] = useState('');
  const [isCerrando, setIsCerrando] = useState(false);
  const [cerrarError, setCerrarError] = useState<string | null>(null);
  const [ultimoCierre, setUltimoCierre] = useState<CajaCiclo | null>(null);

  const [billetajeOpen, setBilletajeOpen] = useState(false);
  const [montoBilletaje, setMontoBilletaje] = useState('');
  const [isSolicitando, setIsSolicitando] = useState(false);
  const [billetajeError, setBilletajeError] = useState<string | null>(null);
  const [billetajeOk, setBilletajeOk] = useState(false);

  function loadCaja() {
    setIsLoading(true);
    setLoadError(null);

    getMiCaja()
      .then((res) => setCaja(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadCaja, []);

  if (!canAccederCajaPropia(user)) {
    return <Navigate to="/" replace />;
  }

  async function handleAperturar() {
    setIsAperturando(true);
    setLoadError(null);

    try {
      await aperturarCaja();
      loadCaja();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsAperturando(false);
    }
  }

  async function handleCerrar(event: FormEvent) {
    event.preventDefault();
    setCerrarError(null);
    setIsCerrando(true);

    try {
      const res = await cerrarCaja(montoContado);
      setUltimoCierre(res.data);
      setCerrarOpen(false);
      setMontoContado('');
      loadCaja();
    } catch (err) {
      setCerrarError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsCerrando(false);
    }
  }

  async function handleSolicitarBilletaje(event: FormEvent) {
    event.preventDefault();
    setBilletajeError(null);
    setIsSolicitando(true);

    try {
      await solicitarBilletaje(montoBilletaje);
      setBilletajeOpen(false);
      setMontoBilletaje('');
      setBilletajeOk(true);
    } catch (err) {
      setBilletajeError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSolicitando(false);
    }
  }

  const ciclo = caja?.ciclo_abierto ?? null;

  return (
    <Stack spacing={3} sx={{ maxWidth: 480 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Mi caja
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}
      {ultimoCierre && (
        <Alert severity="info" onClose={() => setUltimoCierre(null)}>
          Caja cerrada. Saldo calculado: {formatMonto(ultimoCierre.saldo_calculado_cierre ?? '0')} ·
          Contado: {formatMonto(ultimoCierre.saldo_arqueo_cierre ?? '0')} · Diferencia:{' '}
          {formatMonto(ultimoCierre.diferencia ?? '0')}
        </Alert>
      )}
      {billetajeOk && (
        <Alert severity="success" onClose={() => setBilletajeOk(false)}>
          Billetaje solicitado. Queda pendiente de aprobación.
        </Alert>
      )}

      {isLoading ? (
        <CircularProgress color="inherit" />
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">Estado</Typography>
                <Chip
                  label={ciclo ? 'Abierta' : 'Cerrada'}
                  color={ciclo ? 'success' : 'default'}
                  size="small"
                />
              </Stack>

              {ciclo ? (
                <>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Abierta desde {new Date(ciclo.abierta_at ?? ciclo.fecha).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Saldo de apertura: {formatMonto(ciclo.saldo_apertura)}
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    {canSolicitarBilletaje(user) && (
                      <Button variant="outlined" onClick={() => setBilletajeOpen(true)}>
                        Solicitar billetaje
                      </Button>
                    )}
                    <Button variant="contained" onClick={() => setCerrarOpen(true)}>
                      Cerrar caja
                    </Button>
                  </Stack>
                </>
              ) : (
                <Button variant="contained" onClick={handleAperturar} disabled={isAperturando}>
                  {isAperturando ? 'Aperturando...' : 'Aperturar caja'}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={cerrarOpen} onClose={() => setCerrarOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCerrar}>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {cerrarError && <Alert severity="error">{cerrarError}</Alert>}
              <TextField
                label="Monto contado"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={montoContado}
                onChange={(e) => setMontoContado(e.target.value)}
                required
                autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setCerrarOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isCerrando}>
              {isCerrando ? 'Cerrando...' : 'Cerrar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={billetajeOpen} onClose={() => setBilletajeOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSolicitarBilletaje}>
          <DialogTitle>Solicitar billetaje</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {billetajeError && <Alert severity="error">{billetajeError}</Alert>}
              <TextField
                label="Monto"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                value={montoBilletaje}
                onChange={(e) => setMontoBilletaje(e.target.value)}
                required
                autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setBilletajeOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSolicitando}>
              {isSolicitando ? 'Solicitando...' : 'Solicitar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
