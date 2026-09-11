import { Avatar, Chip, Container, Stack, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { ClientesMapa } from '../components/ClientesMapa';

export function HomePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

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
        <ClientesMapa />
      </Stack>
    </Container>
  );
}
