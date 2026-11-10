import { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { getDashboardClientesCobradosHoy, type DashboardClienteCobradoHoy } from '../api/dashboard';
import { DialogHeader } from './DialogHeader';
import { ErrorBanner } from './ErrorBanner';
import { TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import { formatMonto } from '../utils/format';

const OPERACION_LABELS: Record<string, string> = {
  refrendo: 'Refrendo',
  adenda: 'Adenda',
  liquidacion: 'Liquidación',
  refinanciamiento: 'Refinanciamiento',
  pago_cuota: 'Pago de cuota',
  pago_cuotas_diario: 'Pago de cuotas',
};

interface ClientesCobradosHoyDialogProps {
  /** Asesor cuyo "ver detalle" se tocó, o null si el diálogo está cerrado. */
  asesor: { id: number; nombre: string } | null;
  onClose: () => void;
}

/**
 * "Ver detalle" de la fila de un asesor en AvanceClientesHoyList: los
 * clientes a los que le cobró algo hoy, con el crédito y el abono de cada
 * cobro — cargado bajo demanda al abrir, igual que CajaCicloDetalleDialog.
 */
export function ClientesCobradosHoyDialog({ asesor, onClose }: ClientesCobradosHoyDialogProps) {
  const [clientes, setClientes] = useState<DashboardClienteCobradoHoy[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!asesor) {
      setClientes(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    getDashboardClientesCobradosHoy(asesor.id)
      .then((res) => {
        if (active) setClientes(res.data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error desconocido');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [asesor]);

  return (
    <Dialog open={!!asesor} onClose={onClose} fullWidth maxWidth="sm">
      <DialogHeader onClose={onClose}>Clientes cobrados hoy{asesor ? ` · ${asesor.nombre}` : ''}</DialogHeader>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <ErrorBanner error={error} />

          {isLoading ? (
            <Stack sx={{ alignItems: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : clientes && clientes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Todavía no le ha cobrado a ningún cliente hoy.
            </Typography>
          ) : (
            clientes?.map((cliente) => (
              <Box key={cliente.cliente_id}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                  <Typography variant="subtitle2">{cliente.cliente_nombre}</Typography>
                  <Typography variant="subtitle2">{formatMonto(cliente.total_cobrado)}</Typography>
                </Stack>
                <TableContainer component={Box} sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Hora</TableCell>
                        <TableCell>Crédito</TableCell>
                        <TableCell>Operación</TableCell>
                        <TableCell align="right">Abono</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cliente.cobros.map((cobro) => (
                        <TableRow key={cobro.cobro_id}>
                          <TableCell>{cobro.hora}</TableCell>
                          <TableCell>
                            {cobro.credito_codigo ?? `#${cobro.credito_id}`}
                            {cobro.tipo_credito && (
                              <Chip
                                label={TIPO_CREDITO_LABELS[cobro.tipo_credito]}
                                size="small"
                                variant="outlined"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>{OPERACION_LABELS[cobro.operacion] ?? cobro.operacion}</TableCell>
                          <TableCell align="right">{formatMonto(cobro.monto_pagado)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
