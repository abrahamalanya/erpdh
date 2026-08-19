import { useEffect, useState } from 'react';
import { Chip } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getEcho } from '../realtime/echo';
import { getMiCaja } from '../api/caja';
import { canAccederCajaPropia } from '../utils/cajaHierarchy';
import { formatMonto } from '../utils/format';

interface CajaActualizadaPayload {
  ciclo_abierto: boolean;
  saldo_actual: string | null;
}

/**
 * Live estado/saldo of the current user's own caja, shown in the app header
 * so an asesor doesn't have to visit "Mi caja" to check whether it's open —
 * updates via the `caja.actualizada` broadcast on every apertura, cierre,
 * reapertura or billetaje aprobado.
 */
export function CajaBadge() {
  const { user } = useAuth();
  const [cicloAbierto, setCicloAbierto] = useState(false);
  const [saldo, setSaldo] = useState<string | null>(null);

  const visible = canAccederCajaPropia(user);

  useEffect(() => {
    if (!user || !visible) return;

    getMiCaja().then((res) => {
      setCicloAbierto(!!res.data.ciclo_abierto);
      setSaldo(res.data.saldo_actual ?? null);
    });

    const channel = getEcho().private(`App.Models.User.${user.id}`);
    const onActualizada = (payload: CajaActualizadaPayload) => {
      setCicloAbierto(payload.ciclo_abierto);
      setSaldo(payload.saldo_actual);
    };

    channel.listen('.caja.actualizada', onActualizada);

    return () => {
      channel.stopListening('.caja.actualizada', onActualizada);
    };
  }, [user, visible]);

  if (!visible) return null;

  return (
    <Chip
      component={Link}
      to="/caja"
      clickable
      size="small"
      variant={cicloAbierto ? 'filled' : 'outlined'}
      color={cicloAbierto ? 'success' : 'default'}
      label={cicloAbierto ? `Caja abierta · ${formatMonto(saldo ?? '0')}` : 'Caja cerrada'}
      sx={cicloAbierto ? { mr: 1.5 } : { color: 'inherit', borderColor: 'currentColor', mr: 1.5 }}
    />
  );
}
