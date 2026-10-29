import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Dialog, DialogActions, DialogContent, Stack, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { getAperturasPendientes } from '../api/caja';
import { DialogHeader } from './DialogHeader';
import { formatFecha } from '../utils/format';
import type { AperturaPendiente, CajaCiclo, BovedaCiclo } from '../types/api';

const ROL_LABEL: Record<string, string> = {
  administrador_agencia: 'un administrador de agencia',
  administrador_general: 'el administrador general',
};

function claveDe(item: AperturaPendiente): string {
  return `${item.tipo}:${item.ciclo.id}`;
}

/**
 * Avisa al usuario, al entrar o al cambiar de pantalla, si tiene una caja o
 * una bóveda abierta de un ciclo anterior (CajaBovedaHierarchyService::
 * aperturasPendientesDe() en el backend es la única fuente de verdad — este
 * modal solo la muestra, nunca decide por su cuenta). "Cerrar" lleva al
 * flujo normal de cierre de Mi caja / Bóvedas en vez de reimplementar el
 * arqueo acá, para no duplicar esa lógica. "Cancelar" solo oculta el aviso
 * por esta sesión: no cierra nada y el backend sigue validando cada intento
 * de abrir una caja o bóveda, aunque el usuario lo haya descartado.
 */
export function AperturasPendientesModal() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [pendientes, setPendientes] = useState<AperturaPendiente[]>([]);
  const descartados = useRef<Set<string>>(new Set());

  const refrescar = useCallback(() => {
    if (!user) {
      setPendientes([]);
      return;
    }

    getAperturasPendientes()
      .then((res) => setPendientes(res.data.filter((item) => !descartados.current.has(claveDe(item)))))
      .catch(() => undefined);
    // Sin red o sin permiso no hay nada que mostrar; el backend vuelve a
    // validar en cada acción real, así que un fallo acá nunca es crítico.
  }, [user]);

  // Se re-consulta al iniciar sesión y en cada cambio de pantalla — así, al
  // volver de cerrar la apertura desde Mi caja/Bóvedas, el aviso desaparece
  // solo, sin depender de recargar la app.
  useEffect(refrescar, [refrescar, location.pathname]);

  if (pendientes.length === 0) return null;

  const item = pendientes[0];
  const esCaja = item.tipo === 'caja';
  const ciclo = item.ciclo;
  const caja = esCaja ? (ciclo as CajaCiclo).caja : undefined;
  const boveda = !esCaja ? (ciclo as BovedaCiclo).boveda : undefined;

  const agenciaNombre = (esCaja ? caja?.agencia?.nombre : boveda?.agencia?.nombre) ?? (boveda?.tipo === 'principal' ? 'Principal (empresa)' : null);

  function cancelar() {
    descartar();
  }

  function descartar() {
    descartados.current.add(claveDe(item));
    setPendientes((prev) => prev.filter((p) => claveDe(p) !== claveDe(item)));
  }

  function irACerrar() {
    // Se descarta ANTES de navegar: si no, el chequeo que se vuelve a correr
    // por el cambio de ruta (ver el useEffect de arriba) encuentra la misma
    // apertura todavía pendiente y vuelve a abrir este modal encima de la
    // pantalla de destino, bloqueándola. Si el usuario se va sin cerrarla de
    // verdad, el aviso vuelve a aparecer en la próxima sesión/recarga.
    descartar();
    navigate(esCaja ? '/caja' : '/bovedas');
  }

  return (
    <Dialog open fullWidth maxWidth="xs">
      <DialogHeader onClose={cancelar}>
        {esCaja ? 'Tienes una caja pendiente de cierre' : 'Tienes una bóveda pendiente de cierre'}
      </DialogHeader>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <Typography variant="body2">
            {esCaja
              ? 'Tu caja pertenece a un ciclo anterior. Para continuar trabajando en el ciclo actual, debes cerrar esta caja.'
              : 'La bóveda permanece abierta en un ciclo anterior. Debes cerrar ese ciclo antes de continuar con las operaciones del ciclo actual.'}
          </Typography>

          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Tipo: {esCaja ? 'Caja' : boveda?.tipo === 'principal' ? 'Bóveda principal' : 'Bóveda de agencia'}
            </Typography>
            {agenciaNombre && (
              <Typography variant="body2" color="text.secondary">
                Agencia: {agenciaNombre}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              N.º de apertura: {ciclo.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fecha del ciclo: {formatFecha(ciclo.fecha)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estado: {ciclo.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
            </Typography>
          </Stack>

          {!item.puede_cerrar && (
            <Alert severity="info">
              No tienes permiso para cerrarla. Contacta a{' '}
              {item.rol_autorizado ? ROL_LABEL[item.rol_autorizado] ?? item.rol_autorizado : 'un administrador'} para que
              la cierre.
            </Alert>
          )}

          {pendientes.length > 1 && (
            <Typography variant="caption" color="text.secondary">
              Tienes {pendientes.length} aperturas pendientes de un ciclo anterior.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={cancelar}>Cancelar</Button>
        {item.puede_cerrar && (
          <Button variant="contained" onClick={irACerrar}>
            {esCaja ? 'Cerrar caja' : 'Cerrar bóveda'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
