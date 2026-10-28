import { lazy, Suspense } from 'react';
import { perfilPermite } from '../utils/perfilAcceso';
import { Container, Stack } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { hasPermission } from '../utils/roles';

import { TableSkeleton } from '../components/TableSkeleton';

const DashboardInicial = lazy(() =>
  import('../components/DashboardInicial').then(m => ({ default: m.DashboardInicial }))
);
const MapaCobranzaUnificado = lazy(() =>
  import('../components/MapaCobranzaUnificado').then(m => ({ default: m.MapaCobranzaUnificado }))
);
const AsesoresMapaLive = lazy(() =>
  import('../components/AsesoresMapaLive').then(m => ({ default: m.AsesoresMapaLive }))
);
const ClientesMapa = lazy(() =>
  import('../components/ClientesMapa').then(m => ({ default: m.ClientesMapa }))
);
const RutaMapa = lazy(() =>
  import('../components/RutaMapa').then(m => ({ default: m.RutaMapa }))
);

export function HomePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // El resumen lo expone `dashboard.ver`, que el backend no da a secretaria ni
  // peinadora: mostrárselo les daría un 403 nada más abrir el inicio.
  const puedeVerDashboard = hasPermission(user, 'dashboard.ver') && perfilPermite(user, 'diario', 'prendario', 'vehicular', 'hipotecario', 'ventas');

  return (
    <Container maxWidth="md" disableGutters>
      <Stack spacing={4}>
        {puedeVerDashboard && (
          <Suspense fallback={<TableSkeleton rows={3} />}>
            <DashboardInicial />
          </Suspense>
        )}
        {perfilPermite(user, 'ruta_cobranza') && hasPermission(user, 'ubicaciones_asesores.ver') && (
          <Suspense fallback={<TableSkeleton rows={3} />}>
            <MapaCobranzaUnificado />
          </Suspense>
        )}
        {/* Mapas previos: se mantienen hasta confirmar que el mapa unificado de arriba los reemplaza sin problemas. */}
        {perfilPermite(user, 'ruta_cobranza') && hasPermission(user, 'ubicaciones_asesores.ver') && (
          <Suspense fallback={<TableSkeleton rows={3} />}>
            <AsesoresMapaLive />
          </Suspense>
        )}
        {perfilPermite(user, 'clientes') && (
          <Suspense fallback={<TableSkeleton rows={3} />}>
            <ClientesMapa />
          </Suspense>
        )}
        {perfilPermite(user, 'ruta_cobranza') && (
          <Suspense fallback={<TableSkeleton rows={3} />}>
            <RutaMapa />
          </Suspense>
        )}
      </Stack>
    </Container>
  );
}
