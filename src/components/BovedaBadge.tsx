import { useEffect, useState } from 'react';
import { Chip } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getEcho } from '../realtime/echo';
import { getMiBoveda } from '../api/bovedas';
import { canAccederBovedaPropia } from '../utils/cajaHierarchy';
import { formatMonto } from '../utils/format';

interface BovedaActualizadaPayload {
  id: number;
  ciclo_abierto: boolean;
  saldo_actual: string | null;
}

/**
 * Live estado/saldo of the bóveda this admin controls, shown in the header
 * next to CajaBadge — updates via the `boveda.actualizada` broadcast on
 * every apertura, cierre, reapertura, inyección/traspaso, billetaje
 * aprobado, or caja cerrada (all of which move the bóveda's saldo).
 */
export function BovedaBadge() {
  const { user } = useAuth();
  const [cicloAbierto, setCicloAbierto] = useState(false);
  const [saldo, setSaldo] = useState<string | null>(null);

  const visible = canAccederBovedaPropia(user);

  useEffect(() => {
    if (!user || !visible) return;

    getMiBoveda().then((res) => {
      setCicloAbierto(!!res.data.ciclo_abierto);
      setSaldo(res.data.ciclo_abierto?.saldo_actual ?? null);
    });

    const channel = getEcho().private(`App.Models.User.${user.id}`);
    const onActualizada = (payload: BovedaActualizadaPayload) => {
      setCicloAbierto(payload.ciclo_abierto);
      setSaldo(payload.saldo_actual);
    };

    channel.listen('.boveda.actualizada', onActualizada);

    return () => {
      channel.stopListening('.boveda.actualizada', onActualizada);
    };
  }, [user, visible]);

  if (!visible) return null;

  return (
    <Chip
      component={Link}
      to="/bovedas"
      clickable
      size="small"
      variant={cicloAbierto ? 'filled' : 'outlined'}
      color={cicloAbierto ? 'info' : 'default'}
      label={cicloAbierto ? `Bóveda abierta · ${formatMonto(saldo ?? '0')}` : 'Bóveda cerrada'}
      sx={cicloAbierto ? { mr: 1.5 } : { color: 'inherit', borderColor: 'currentColor', mr: 1.5 }}
    />
  );
}
