import { Suspense, useState, type MouseEvent } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  ClickAwayListener,
  Divider,
  Drawer,
  Grow,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../theme/ThemeModeContext';
import { hasRole } from '../utils/roles';
import { TableSkeleton } from './TableSkeleton';

interface NavItem {
  label: string;
  path: string;
  roles?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const HOME_ITEM: NavItem = { label: 'Inicio', path: '/' };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Sistema',
    items: [
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
      { label: 'Clientes', path: '/clientes' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      {
        label: 'Bóvedas',
        path: '/bovedas',
        roles: ['sistemas', 'administrador_general', 'administrador_agencia'],
      },
      {
        label: 'Cajas',
        path: '/cajas',
        roles: ['sistemas', 'administrador_general', 'administrador_agencia', 'supervisor', 'asesor'],
      },
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
        label: 'Billetajes',
        path: '/billetajes',
        roles: ['sistemas', 'administrador_general', 'administrador_agencia', 'supervisor', 'asesor'],
      },
    ],
  },
  {
    label: 'Créditos prendarios',
    items: [
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
    ],
  },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const location = useLocation();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openGroupLabel, setOpenGroupLabel] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  function openGroupMenu(event: MouseEvent<HTMLElement>, label: string) {
    setAnchorEl(event.currentTarget);
    setOpenGroupLabel(label);
  }

  function closeGroupMenu() {
    setAnchorEl(null);
    setOpenGroupLabel(null);
  }

  function handleGroupHover(event: MouseEvent<HTMLElement>, label: string) {
    // Only switch on hover once a menu is already open, so hovering the bar
    // without clicking first doesn't pop menus open unexpectedly.
    if (anchorEl && openGroupLabel !== label) {
      openGroupMenu(event, label);
    }
  }

  const visibleGroups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => !item.roles || hasRole(user, ...item.roles)),
  })).filter((group) => group.items.length > 0);

  const activeGroupLabel = visibleGroups.find((group) =>
    group.items.some((item) => item.path === location.pathname)
  )?.label;

  const openGroup = visibleGroups.find((group) => group.label === openGroupLabel);

  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <AppBar position="sticky">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 700, mr: 4, flexGrow: { xs: 1, md: 0 } }}
          >
            umax
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}
          >
            <Button
              component={Link}
              to={HOME_ITEM.path}
              color="inherit"
              sx={{
                fontWeight: location.pathname === HOME_ITEM.path ? 700 : 400,
                opacity: location.pathname === HOME_ITEM.path ? 1 : 0.7,
              }}
            >
              {HOME_ITEM.label}
            </Button>

            {visibleGroups.map((group) => (
              <Button
                key={group.label}
                color="inherit"
                endIcon={<KeyboardArrowDownIcon />}
                onClick={(e) => openGroupMenu(e, group.label)}
                onMouseEnter={(e) => handleGroupHover(e, group.label)}
                sx={{
                  fontWeight: activeGroupLabel === group.label ? 700 : 400,
                  opacity: activeGroupLabel === group.label ? 1 : 0.7,
                }}
              >
                {group.label}
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

      <Popper
        open={!!anchorEl}
        anchorEl={anchorEl}
        placement="bottom-start"
        transition
        sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps} timeout={150} style={{ transformOrigin: 'top left' }}>
            <Paper elevation={8} sx={{ mt: 0.5, minWidth: 200 }}>
              <ClickAwayListener onClickAway={closeGroupMenu}>
                <MenuList autoFocusItem={!!anchorEl}>
                  {openGroup?.items.map((item) => (
                    <MenuItem
                      key={item.path}
                      component={Link}
                      to={item.path}
                      selected={location.pathname === item.path}
                      onClick={closeGroupMenu}
                    >
                      {item.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>

      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation">
          <List>
            <ListItemButton
              component={Link}
              to={HOME_ITEM.path}
              selected={location.pathname === HOME_ITEM.path}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemText primary={HOME_ITEM.label} />
            </ListItemButton>
          </List>

          {visibleGroups.map((group) => (
            <Box key={group.label}>
              <Divider />
              <List
                subheader={
                  <ListSubheader component="div" sx={{ lineHeight: '36px' }}>
                    {group.label}
                  </ListSubheader>
                }
              >
                {group.items.map((item) => (
                  <ListItemButton
                    key={item.path}
                    component={Link}
                    to={item.path}
                    selected={location.pathname === item.path}
                    onClick={() => setMobileOpen(false)}
                  >
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          ))}
        </Box>
      </Drawer>

      <Box sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        <Suspense fallback={<TableSkeleton />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
}
