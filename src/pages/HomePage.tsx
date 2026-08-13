import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../theme/ThemeModeContext';

export function HomePage() {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            umax
          </Typography>
          <IconButton onClick={toggleMode} color="inherit" aria-label="Cambiar tema">
            {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
          <IconButton onClick={() => logout()} color="inherit" aria-label="Cerrar sesión">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>
        <Stack
          spacing={2}
          sx={{
            alignItems: "center",
            textAlign: "center"
          }}>
          <Avatar sx={{ width: 72, height: 72, fontSize: 28 }}>
            {user.nombre.charAt(0)}
            {user.apellido.charAt(0)}
          </Avatar>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            {user.nombre} {user.apellido}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {user.email}
          </Typography>
          <Stack direction="row" spacing={1}>
            {user.roles?.map((role) => (
              <Chip key={role.id} label={role.name} size="small" />
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
