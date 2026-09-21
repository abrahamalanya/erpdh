import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, MenuItem, Stack, TextField } from '@mui/material';
import { retirarBoveda } from '../api/bovedas';
import { listCuentasBancarias } from '../api/cuentasBancarias';
import { preventBackdropClose } from '../utils/dialog';
import { DialogHeader } from './DialogHeader';
import { PhotoField } from './MediaFields';
import { UpperTextField } from './UpperTextField';
import type { Boveda, CuentaBancaria, MedioInyeccion } from '../types/api';

interface RetirarBovedaDialogProps {
  boveda: Boveda | null;
  /** Bóveda principal de la misma empresa — destino de una devolución por cuenta bancaria desde una bóveda de agencia. */
  principal: Boveda | null;
  onClose: () => void;
  onRetirado: () => void;
}

function opcionesDeCuentas(cuentas: CuentaBancaria[]) {
  return cuentas.map((cuenta) => (
    <MenuItem key={cuenta.id} value={cuenta.id}>
      {cuenta.banco?.nombre} — {cuenta.numero_cuenta}
    </MenuItem>
  ));
}

/**
 * Espejo de la inyección de capital: en la bóveda principal es una salida
 * externa de dinero; en una de agencia es una devolución a la principal
 * (ver BovedaService::retirar()).
 */
export function RetirarBovedaDialog({ boveda, principal, onClose, onRetirado }: RetirarBovedaDialogProps) {
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [medio, setMedio] = useState<MedioInyeccion>('efectivo');
  const [cuentaId, setCuentaId] = useState<number | ''>('');
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [cuentaDestinoId, setCuentaDestinoId] = useState<number | ''>('');
  const [cuentasDestino, setCuentasDestino] = useState<CuentaBancaria[]>([]);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esAgencia = boveda?.tipo === 'agencia';
  const principalId = principal?.id;

  useEffect(() => {
    if (!boveda) return;

    listCuentasBancarias(boveda.id)
      .then((res) => setCuentas(res.data.filter((c) => c.activa)))
      .catch(() => setCuentas([]));
  }, [boveda]);

  useEffect(() => {
    if (!boveda || !esAgencia || !principalId) return;

    listCuentasBancarias(principalId)
      .then((res) => setCuentasDestino(res.data.filter((c) => c.activa)))
      .catch(() => setCuentasDestino([]));
  }, [boveda, esAgencia, principalId]);

  function handleClose() {
    setMonto('');
    setConcepto('');
    setMedio('efectivo');
    setCuentaId('');
    setCuentas([]);
    setCuentaDestinoId('');
    setCuentasDestino([]);
    setComprobante(null);
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!boveda) return;

    setError(null);
    setIsSaving(true);

    const porBanco = medio === 'cuenta_bancaria';

    try {
      await retirarBoveda(
        boveda.id,
        monto,
        concepto ? concepto.toLowerCase() : undefined,
        medio,
        porBanco ? (cuentaId as number) : undefined,
        porBanco && esAgencia ? (cuentaDestinoId as number) : undefined,
        porBanco ? comprobante : undefined
      );
      handleClose();
      onRetirado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  const faltaCuenta = medio === 'cuenta_bancaria' && (!cuentaId || (esAgencia && !cuentaDestinoId));

  return (
    <Dialog open={!!boveda} onClose={preventBackdropClose(handleClose)} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogHeader onClose={handleClose}>{esAgencia ? 'Devolver a bóveda principal' : 'Retirar dinero'}</DialogHeader>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Monto"
              type="number"
              slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              autoFocus
            />
            <TextField
              select
              label="Sale de"
              value={medio}
              onChange={(e) => {
                setMedio(e.target.value as MedioInyeccion);
                setCuentaId('');
              }}
            >
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="cuenta_bancaria">Cuenta bancaria</MenuItem>
            </TextField>
            {medio === 'cuenta_bancaria' && (
              <TextField
                select
                label="Cuenta bancaria de la que sale el dinero"
                value={cuentaId}
                onChange={(e) => setCuentaId(Number(e.target.value))}
                required
                helperText={cuentas.length === 0 ? 'Esta bóveda no tiene cuentas bancarias activas registradas' : undefined}
              >
                {opcionesDeCuentas(cuentas)}
              </TextField>
            )}
            {medio === 'cuenta_bancaria' && esAgencia && (
              <TextField
                select
                label="Cuenta bancaria de la principal que recibe"
                value={cuentaDestinoId}
                onChange={(e) => setCuentaDestinoId(Number(e.target.value))}
                required
                helperText={
                  cuentasDestino.length === 0 ? 'La bóveda principal no tiene cuentas bancarias activas registradas' : undefined
                }
              >
                {opcionesDeCuentas(cuentasDestino)}
              </TextField>
            )}
            {medio === 'cuenta_bancaria' && (
              <PhotoField label="Voucher de transferencia (opcional)" file={comprobante} onChange={setComprobante} />
            )}
            <UpperTextField label="Concepto (opcional)" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSaving || faltaCuenta}>
            {isSaving ? 'Guardando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
