import { perfilPermite } from '../utils/perfilAcceso';
import { Avatar, Chip, Container, Stack, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { hasPermission } from '../utils/roles';
import { AsesoresMapaLive } from '../components/AsesoresMapaLive';
import { ClientesMapa } from '../components/ClientesMapa';
import { DashboardInicial } from '../components/DashboardInicial';
import { RutaMapa } from '../components/RutaMapa';

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
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Avatar sx={{ width: 72, height: 72, fontSize: 28 }}>
            {user.nombre.charAt(0)}
            {user.apellido.charAt(0)}
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {user.nombre} {user.apellido}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {user.email}
          </Typography>
          <Stack direction="row" spacing={1}>
            {user.roles?.map((role) => (
              <Chip key={role.id} label={role.name} size="small" />
            ))}
          </Stack>
        </Stack>
        {puedeVerDashboard && <DashboardInicial />}
        {perfilPermite(user, 'ruta_cobranza') && <AsesoresMapaLive />}
        {perfilPermite(user, 'clientes') && <ClientesMapa />}
        {perfilPermite(user, 'ruta_cobranza') && <RutaMapa />}
      </Stack>
    </Container>
  );
}
