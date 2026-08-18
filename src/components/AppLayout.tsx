import { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AppBar, Box, Button, IconButton, Stack, Toolbar, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../theme/ThemeModeContext';
import { hasRole } from '../utils/roles';
import { TableSkeleton } from './TableSkeleton';

interface NavItem {
  label: string;
  path: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', path: '/' },
  { label: 'Clientes', path: '/clientes' },
  { label: 'Empresas', path: '/empresas', roles: ['sistemas'] },
  {
    label: 'Agencias',
    path: '/agencias',
    roles: ['sistemas', 'administrador_general', 'secretaria'],
  },
  {
    label: 'Usuarios',
    path: '/usuarios',
    roles: ['sistemas', 'administrador_general', 'secretaria', 'administrador_agencia'],
  },
  { label: 'Roles', path: '/roles', roles: ['sistemas'] },
  {
    label: 'Mi caja',
    path: '/caja',
    roles: [
      'sistemas',
      'administrador_general',
      'secretaria',
      'administrador_agencia',
      'supervisor',
      'asesor',
    ],
  },
  {
    label: 'Cajas',
    path: '/cajas',
    roles: ['sistemas', 'administrador_general', 'administrador_agencia', 'supervisor', 'asesor'],
  },
  { label: 'Bóvedas', path: '/bovedas', roles: ['sistemas', 'administrador_general', 'administrador_agencia'] },
  {
    label: 'Billetajes',
    path: '/billetajes',
    roles: ['sistemas', 'administrador_general', 'administrador_agencia', 'supervisor', 'asesor'],
  },
  {
    label: 'Bienes',
    path: '/bienes',
    roles: [
      'sistemas',
      'administrador_general',
      'secretaria',
      'administrador_agencia',
      'supervisor',
      'asesor',
    ],
  },
  {
    label: 'Créditos prendarios',
    path: '/creditos-prendarios',
    roles: [
      'sistemas',
      'administrador_general',
      'secretaria',
      'administrador_agencia',
      'supervisor',
      'asesor',
    ],
  },
  {
    label: 'Configuración de créditos',
    path: '/configuraciones-credito-prendario',
    roles: ['sistemas', 'administrador_general'],
  },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || hasRole(user, ...item.roles)
  );

  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, mr: 4 }}>
            umax
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            {visibleItems.map((item) => (
              <Button
                key={item.path}
                component={Link}
                to={item.path}
                color="inherit"
                sx={{
                  fontWeight: location.pathname === item.path ? 700 : 400,
                  opacity: location.pathname === item.path ? 1 : 0.7,
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <IconButton onClick={toggleMode} color="inherit" aria-label="Cambiar tema">
            {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
          <IconButton onClick={() => logout()} color="inherit" aria-label="Cerrar sesión">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        <Suspense fallback={<TableSkeleton />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
}
