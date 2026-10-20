import { perfilPermiteRuta } from '../utils/perfilAcceso';
import { Suspense, useEffect, useState, type ElementType } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BusinessIcon from '@mui/icons-material/Business';
import StoreIcon from '@mui/icons-material/Store';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ExtensionIcon from '@mui/icons-material/Extension';
import SettingsIcon from '@mui/icons-material/Settings';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LockClockIcon from '@mui/icons-material/LockClock';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LockIcon from '@mui/icons-material/Lock';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PaymentsIcon from '@mui/icons-material/Payments';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import CategoryIcon from '@mui/icons-material/Category';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import DiamondIcon from '@mui/icons-material/Diamond';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import RouteIcon from '@mui/icons-material/Route';
import CalculateIcon from '@mui/icons-material/Calculate';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import TuneIcon from '@mui/icons-material/Tune';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SellIcon from '@mui/icons-material/Sell';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import BarChartIcon from '@mui/icons-material/BarChart';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TodayIcon from '@mui/icons-material/Today';
import CancelIcon from '@mui/icons-material/Cancel';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import CakeIcon from '@mui/icons-material/Cake';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { useAuth } from '../hooks/useAuth';
import { useAppConfig } from '../hooks/useAppConfig';
import { useThemeMode } from '../theme/ThemeModeContext';
import { hasPermission, hasRole } from '../utils/roles';
import { tieneModulo } from '../utils/modulos';
import { BovedaBadge } from './BovedaBadge';
import { CajaBadge } from './CajaBadge';
import { NotificationBell } from './NotificationBell';
import { TableSkeleton } from './TableSkeleton';

interface NavItem {
  label: string;
  path: string;
  icon: ElementType;
  /**
   * Gated purely by role — for items outside the módulo system
   * (administrative screens, "Mi caja", etc.).
   */
  roles?: string[];
  /**
   * Gated by `permission_names`. This is what the reportes use, because the
   * backend gates them with `Gate::authorize('viewAny', …)` — a permission, not
   * a role. Keeping the nav on hardcoded roles silently desyncs from the
   * backend: a role that has the permission (e.g. `secretaria`, which holds
   * `creditos_prendarios.ver`) can open the screen but never sees the link.
   * Mirrors the note on `canViewUsers()`.
   */
  permiso?: string | string[];
  /**
   * Gated by módulo (see ModuloService on the backend): visible only when
   * the user's modulos_efectivos includes this key. Role defaults are
   * configured from the Roles screen, so this alone determines visibility —
   * no separate `roles` list needed alongside it.
   */
  modulo?: string;
}

interface NavGroup {
  label: string;
  icon: ElementType;
  items: NavItem[];
}

const HOME_ITEM: NavItem = { label: 'Inicio', path: '/', icon: HomeIcon };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Administración',
    icon: AdminPanelSettingsIcon,
    items: [
      { label: 'Empresas', path: '/empresas', icon: BusinessIcon, roles: ['sistemas', 'administrador_general'] },
      {
        label: 'Agencias',
        path: '/agencias',
        icon: StoreIcon,
        roles: ['sistemas', 'administrador_general', 'secretaria'],
      },
      {
        label: 'Usuarios',
        path: '/usuarios',
        icon: PeopleIcon,
        roles: ['sistemas', 'administrador_general', 'secretaria', 'administrador_agencia'],
      },
      { label: 'Roles', path: '/roles', icon: SecurityIcon, roles: ['sistemas'] },
      { label: 'Perfiles de acceso', path: '/perfiles-acceso', icon: VpnKeyIcon, roles: ['sistemas'] },
      { label: 'Módulos', path: '/modulos', icon: ExtensionIcon, roles: ['sistemas'] },
      { label: 'Configuración', path: '/configuracion-sistema', icon: SettingsIcon, roles: ['sistemas'] },
      { label: 'Actualizaciones APK', path: '/actualizaciones-apk', icon: SystemUpdateAltIcon, roles: ['sistemas'] },
      {
        label: 'Generador de códigos QR',
        path: '/qr',
        icon: QrCodeIcon,
        roles: ['sistemas', 'administrador_general'],
      },
      { label: 'Clientes', path: '/clientes', icon: PeopleAltIcon },
      // Sueldos del personal: adm. general/agencia, secretaria (y sistemas) — el alcance lo filtra el backend.
      {
        label: 'Planilla',
        path: '/planilla',
        icon: ReceiptLongIcon,
        modulo: 'planilla',
        // Con solo planillas.descuentos se entra únicamente a la pestaña Descuentos.
        permiso: ['planillas.ver', 'planillas.descuentos'],
      },
    ],
  },
  {
    label: 'Gestión',
    icon: AssignmentIcon,
    items: [
      {
        label: 'Permisos temporales',
        path: '/gestion/permisos-temporales',
        icon: LockClockIcon,
        roles: ['sistemas', 'administrador_general'],
      },
    ],
  },
  {
    label: 'Finanzas',
    icon: AccountBalanceWalletIcon,
    items: [
      { label: 'Bancos', path: '/bancos', icon: AccountBalanceIcon, roles: ['sistemas'] },
      {
        label: 'Bóvedas',
        path: '/bovedas',
        icon: LockIcon,
        roles: ['sistemas', 'administrador_general', 'administrador_agencia'],
      },
      { label: 'Cajas', path: '/cajas', icon: PointOfSaleIcon, modulo: 'cajas' },
      { label: 'Cierre de Caja', path: '/cierre-caja', icon: AssignmentTurnedInIcon, permiso: 'cajas.ver' },
      {
        label: 'Mi caja',
        path: '/caja',
        icon: AccountBalanceWalletIcon,
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
        icon: PaymentsIcon,
        roles: ['sistemas', 'administrador_general', 'administrador_agencia', 'supervisor', 'asesor'],
      },
      {
        label: 'Ingresos',
        path: '/ingresos',
        icon: TrendingUpIcon,
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
        label: 'Egresos',
        path: '/egresos',
        icon: TrendingDownIcon,
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
        label: 'Desembolsos',
        path: '/desembolsos',
        icon: RequestQuoteIcon,
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
        label: 'Conceptos',
        path: '/conceptos',
        icon: CategoryIcon,
        roles: ['sistemas'],
      },
    ],
  },
  {
    label: 'Créditos',
    icon: CreditCardIcon,
    items: [
      { label: 'Solicitudes', path: '/creditos-prendarios', icon: AssignmentIcon, modulo: 'solicitudes' },
      { label: 'Créditos prendarios', path: '/creditos-prendarios/prendarios', icon: DiamondIcon, modulo: 'prendario' },
      {
        label: 'Créditos vehiculares',
        path: '/creditos-prendarios/vehiculares',
        icon: DirectionsCarIcon,
        modulo: 'vehicular',
      },
      {
        label: 'Créditos hipotecarios',
        path: '/creditos-prendarios/hipotecarios',
        icon: HomeWorkIcon,
        modulo: 'hipotecario',
      },
      { label: 'Créditos diarios', path: '/creditos-prendarios/diarios', icon: EventRepeatIcon, modulo: 'diario' },
      {
        label: 'Cobranzas',
        path: '/cobros',
        icon: MonetizationOnIcon,
        roles: [
          'sistemas',
          'administrador_general',
          'administrador_agencia',
          'supervisor',
          'asesor',
        ],
      },
      {
        label: 'Mi ruta de cobranza',
        path: '/ruta-cobranza',
        icon: RouteIcon,
        roles: [
          'sistemas',
          'administrador_general',
          'administrador_agencia',
          'supervisor',
          'asesor',
        ],
      },
      {
        label: 'Simulador',
        path: '/simulador-creditos',
        icon: CalculateIcon,
        roles: [
          'sistemas',
          'administrador_general',
          'administrador_agencia',
          'supervisor',
          'asesor',
        ],
      },
      {
        label: 'Bienes',
        path: '/bienes',
        icon: Inventory2Icon,
        roles: ['sistemas'],
      },
      {
        label: 'Vehículos',
        path: '/vehiculos',
        icon: DirectionsCarIcon,
        roles: ['sistemas'],
      },
      {
        label: 'Inmuebles (Hipotecario)',
        path: '/inmuebles',
        icon: HomeWorkIcon,
        roles: ['sistemas'],
      },
      {
        label: 'Configuración de créditos',
        path: '/configuraciones-credito-prendario',
        icon: TuneIcon,
        roles: ['sistemas', 'administrador_general'],
      },
    ],
  },
  {
    label: 'Ventas',
    icon: ShoppingCartIcon,
    items: [
      {
        label: 'Ventas',
        path: '/ventas',
        icon: SellIcon,
        roles: ['sistemas', 'administrador_general', 'administrador_agencia', 'asesor'],
      },
      {
        label: 'Configuración de ventas',
        path: '/configuraciones-venta',
        icon: TuneIcon,
        roles: ['sistemas', 'administrador_general'],
      },
      {
        label: 'Solicitudes de la tienda',
        path: '/tienda-solicitudes',
        icon: StorefrontIcon,
        roles: ['sistemas', 'administrador_general', 'administrador_agencia', 'asesor'],
      },
      {
        label: 'Productos de la tienda',
        path: '/tienda-productos',
        icon: Inventory2Icon,
        roles: ['sistemas', 'administrador_general', 'administrador_agencia'],
      },
    ],
  },
  {
    label: 'Facturación',
    icon: ReceiptIcon,
    items: [
      {
        label: 'Pendientes de facturar',
        path: '/facturacion/pendientes',
        icon: PendingActionsIcon,
        modulo: 'facturacion',
        permiso: 'facturaciones.ver',
      },
      {
        label: 'Comprobantes',
        path: '/facturacion/comprobantes',
        icon: ReceiptLongIcon,
        modulo: 'facturacion',
        permiso: 'facturaciones.ver',
      },
      {
        label: 'Configuración de facturación',
        path: '/facturacion/configuracion',
        icon: TuneIcon,
        modulo: 'facturacion',
        permiso: 'configuraciones_facturacion.ver',
      },
    ],
  },
  {
    label: 'Reportes',
    icon: BarChartIcon,
    items: [
      {
        label: 'Movimientos de dinero',
        path: '/reportes/movimientos-dinero',
        icon: SwapHorizIcon,
        // Gate::authorize('viewAny', Boveda) → bovedas.ver.
        permiso: 'bovedas.ver',
      },
      {
        label: 'Cobranza diaria',
        path: '/reportes/cobranza-diaria',
        icon: TodayIcon,
        // Gate::authorize('viewAny', Credito) → creditos_prendarios.ver. Ojo:
        // secretaria también lo tiene, por eso va por permiso y no por roles.
        permiso: 'creditos_prendarios.ver',
      },
      {
        label: 'Anulaciones de cobranza',
        path: '/reportes/anulaciones-cobranza',
        icon: CancelIcon,
        // Sin supervisor/asesor: el filtro de asesor pega a GET /usuarios,
        // que exige usuarios.ver (solo administrador_general/agencia).
        roles: ['sistemas', 'administrador_general', 'administrador_agencia'],
      },
      {
        label: 'Cajas: aperturas y cierres',
        path: '/reportes/cajas-apertura-cierre',
        icon: LockOpenIcon,
        // Mismo módulo que el ítem "Cajas" de Finanzas — es el mismo alcance de negocio.
        modulo: 'cajas',
      },
      {
        label: 'Cobranza y Desembolso Mensual',
        path: '/reportes/cobranza-mensual',
        icon: CalendarMonthIcon,
        roles: ['sistemas', 'administrador_general'],
      },
      {
        label: 'Flujo de caja',
        path: '/reportes/flujo-caja',
        icon: ShowChartIcon,
        // Mismo alcance que "Cajas" — reusa CajaBovedaHierarchyService::cajasVisibles() en el backend.
        modulo: 'cajas',
      },
      {
        label: 'Ingresos y Egresos',
        path: '/reportes/ingresos-egresos',
        icon: SwapVertIcon,
        // Gate::authorize('viewAny', Caja) → cajas.ver; no depende de ningún módulo toggleable.
        permiso: 'cajas.ver',
      },
      {
        label: 'Cumpleaños',
        path: '/reportes/cumpleanos',
        icon: CakeIcon,
        // Gate::authorize('viewAny', User) → usuarios.ver — el mismo alcance
        // que el ítem "Usuarios" de Administración.
        permiso: 'usuarios.ver',
      },
      {
        label: 'Reporte Diario',
        path: '/reportes/atrasos-diarios',
        icon: EventNoteIcon,
        // Gate::authorize('viewAny', Credito) → creditos_prendarios.ver, el
        // mismo permiso que los créditos (el asesor entra: solo ve los suyos).
        permiso: 'creditos_prendarios.ver',
      },
      {
        label: 'Planilla',
        path: '/reportes/planilla',
        icon: ReceiptLongIcon,
        // Mismos permisos que el módulo Planilla (planillas.ver).
        permiso: 'planillas.ver',
      },
    ],
  },
];

const DRAWER_WIDTH = 260;
const RAIL_WIDTH = 64;
const COLLAPSED_STORAGE_KEY = 'sidebar_collapsed';

function getInitialCollapsed(): boolean {
  return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
}

interface VisibleGroup {
  label: string;
  icon: ElementType;
  items: NavItem[];
}

/**
 * Un ítem de navegación. En modo colapsado solo se ve el icono, centrado, y
 * su nombre pasa a un Tooltip a la derecha (fuera del rail, nunca tapado) —
 * MUI muestra el Tooltip también al enfocar con teclado (Tab), no solo al
 * pasar el mouse, así que no hace falta nada adicional para eso.
 */
function NavListItem({
  item,
  selected,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  selected: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  const button = (
    <ListItemButton
      component={Link}
      to={item.path}
      selected={selected}
      onClick={onNavigate}
      sx={collapsed ? { minHeight: 44, justifyContent: 'center', px: 2.5 } : undefined}
    >
      <ListItemIcon sx={collapsed ? { minWidth: 0, justifyContent: 'center' } : { minWidth: 40 }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      {!collapsed && <ListItemText primary={item.label} />}
    </ListItemButton>
  );

  if (!collapsed) return button;

  return (
    <Tooltip title={item.label} placement="right" arrow>
      {button}
    </Tooltip>
  );
}

/** Lista de navegación compartida por el sidebar de escritorio y el Drawer móvil. */
function NavList({
  groups,
  currentPath,
  collapsed,
  onNavigate,
}: {
  groups: VisibleGroup[];
  currentPath: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <List component="nav">
      <NavListItem item={HOME_ITEM} selected={currentPath === HOME_ITEM.path} collapsed={collapsed} onNavigate={onNavigate} />

      {groups.map((group) => {
        const GroupIcon = group.icon;

        return (
          <Box key={group.label}>
            <Divider />
            <List
              subheader={
                !collapsed ? (
                  <ListSubheader component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, lineHeight: '36px' }}>
                    <GroupIcon fontSize="small" />
                    {group.label}
                  </ListSubheader>
                ) : undefined
              }
            >
              {group.items.map((item) => (
                <NavListItem
                  key={item.path}
                  item={item}
                  selected={currentPath === item.path}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </List>
          </Box>
        );
      })}
    </List>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const { nombreApp } = useAppConfig();
  const { mode, toggleMode } = useThemeMode();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const visibleGroups = NAV_GROUPS.map((group) => ({
    label: group.label,
    icon: group.icon,
    items: group.items.filter(
      (item) =>
        perfilPermiteRuta(user, item.path) &&
        (!item.roles || hasRole(user, ...item.roles)) &&
        (!item.permiso || hasPermission(user, ...[item.permiso].flat())) &&
        (!item.modulo || tieneModulo(user, item.modulo))
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      {/* Sidebar de escritorio: permanente, alto completo, con su propio scroll. */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: collapsed ? RAIL_WIDTH : DRAWER_WIDTH,
          flexShrink: 0,
          transition: (theme) => theme.transitions.create('width'),
          '& .MuiDrawer-paper': {
            position: 'relative',
            width: collapsed ? RAIL_WIDTH : DRAWER_WIDTH,
            boxSizing: 'border-box',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: (theme) => theme.transitions.create('width'),
          },
        }}
      >
        <Toolbar sx={{ justifyContent: collapsed ? 'center' : 'space-between', px: collapsed ? 1 : 2 }}>
          {!collapsed && (
            <Typography variant="h6" component="div" sx={{ fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {nombreApp}
            </Typography>
          )}
          <IconButton
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            size="small"
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Toolbar>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <NavList groups={visibleGroups} currentPath={location.pathname} collapsed={collapsed} />
        </Box>
      </Drawer>

      {/* Sidebar móvil: Drawer temporal, mismo contenido que el de escritorio, siempre expandido (es overlay, no compite por ancho). */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        <Box sx={{ width: DRAWER_WIDTH, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              {nombreApp}
            </Typography>
          </Toolbar>
          <Divider />
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <NavList
              groups={visibleGroups}
              currentPath={location.pathname}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </Box>
        </Box>
      </Drawer>

      {/* Columna derecha: barra superior fija + contenido con scroll propio. */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <AppBar position="static" sx={{ flexShrink: 0 }}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="Abrir menú"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 1 }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ flexGrow: 1 }} />

            {perfilPermiteRuta(user, '/bovedas') && <BovedaBadge />}
            {perfilPermiteRuta(user, '/caja') && <CajaBadge />}
            <NotificationBell />

            <IconButton onClick={toggleMode} color="inherit" aria-label="Cambiar tema">
              {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
            <IconButton onClick={() => logout()} color="inherit" aria-label="Cerrar sesión">
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, overflowY: 'auto', py: 4, px: { xs: 2, sm: 3 } }}>
          <Suspense fallback={<TableSkeleton />}>
            <Outlet key={user?.id + ':' + (user?.modulos_efectivos ?? []).join(',')} />
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
}
