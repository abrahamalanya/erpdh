import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './hooks/useAuth';
import { AppConfigProvider } from './hooks/useAppConfig';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './components/AppLayout';

const EmpresasPage = lazy(() =>
  import('./pages/EmpresasPage').then((m) => ({ default: m.EmpresasPage }))
);
const AgenciasPage = lazy(() =>
  import('./pages/AgenciasPage').then((m) => ({ default: m.AgenciasPage }))
);
const UsersPage = lazy(() =>
  import('./pages/UsersPage').then((m) => ({ default: m.UsersPage }))
);
const RolesPage = lazy(() =>
  import('./pages/RolesPage').then((m) => ({ default: m.RolesPage }))
);
const ClientesPage = lazy(() =>
  import('./pages/ClientesPage').then((m) => ({ default: m.ClientesPage }))
);
const CajaPage = lazy(() => import('./pages/CajaPage').then((m) => ({ default: m.CajaPage })));
const CajasPage = lazy(() => import('./pages/CajasPage').then((m) => ({ default: m.CajasPage })));
const BovedasPage = lazy(() =>
  import('./pages/BovedasPage').then((m) => ({ default: m.BovedasPage }))
);
const BancosPage = lazy(() => import('./pages/BancosPage').then((m) => ({ default: m.BancosPage })));
const CuentasBancariasPage = lazy(() =>
  import('./pages/CuentasBancariasPage').then((m) => ({ default: m.CuentasBancariasPage }))
);
const BilletajesPage = lazy(() =>
  import('./pages/BilletajesPage').then((m) => ({ default: m.BilletajesPage }))
);
const ConceptosPage = lazy(() =>
  import('./pages/ConceptosPage').then((m) => ({ default: m.ConceptosPage }))
);
const IngresosPage = lazy(() =>
  import('./pages/MovimientosCajaPage').then((m) => ({ default: m.IngresosPage }))
);
const GastosPage = lazy(() =>
  import('./pages/MovimientosCajaPage').then((m) => ({ default: m.GastosPage }))
);
const BienesPage = lazy(() => import('./pages/BienesPage').then((m) => ({ default: m.BienesPage })));
const CreditosPrendariosPage = lazy(() =>
  import('./pages/CreditosPrendariosPage').then((m) => ({ default: m.CreditosPrendariosPage }))
);
const ConfiguracionCreditoPrendarioPage = lazy(() =>
  import('./pages/ConfiguracionCreditoPrendarioPage').then((m) => ({
    default: m.ConfiguracionCreditoPrendarioPage,
  }))
);
const ReporteMovimientosPage = lazy(() =>
  import('./pages/ReporteMovimientosPage').then((m) => ({ default: m.ReporteMovimientosPage }))
);
const ConfiguracionSistemaPage = lazy(() =>
  import('./pages/ConfiguracionSistemaPage').then((m) => ({ default: m.ConfiguracionSistemaPage }))
);
const TiendaPage = lazy(() => import('./pages/TiendaPage').then((m) => ({ default: m.TiendaPage })));
const TiendaBienPage = lazy(() =>
  import('./pages/TiendaBienPage').then((m) => ({ default: m.TiendaBienPage }))
);

function PublicPageFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress color="inherit" />
    </Box>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppConfigProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/tienda"
              element={
                <Suspense fallback={<PublicPageFallback />}>
                  <TiendaPage />
                </Suspense>
              }
            />
            <Route
              path="/tienda/:id"
              element={
                <Suspense fallback={<PublicPageFallback />}>
                  <TiendaBienPage />
                </Suspense>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomePage />} />
              <Route path="/empresas" element={<EmpresasPage />} />
              <Route path="/agencias" element={<AgenciasPage />} />
              <Route path="/usuarios" element={<UsersPage />} />
              <Route path="/roles" element={<RolesPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/caja" element={<CajaPage />} />
              <Route path="/cajas" element={<CajasPage />} />
              <Route path="/bancos" element={<BancosPage />} />
              <Route path="/bovedas" element={<BovedasPage />} />
              <Route path="/bovedas/:id/cuentas-bancarias" element={<CuentasBancariasPage />} />
              <Route path="/billetajes" element={<BilletajesPage />} />
              <Route path="/conceptos" element={<ConceptosPage />} />
              <Route path="/ingresos" element={<IngresosPage />} />
              <Route path="/gastos" element={<GastosPage />} />
              <Route path="/bienes" element={<BienesPage />} />
              <Route path="/creditos-prendarios" element={<CreditosPrendariosPage />} />
              <Route
                path="/configuraciones-credito-prendario"
                element={<ConfiguracionCreditoPrendarioPage />}
              />
              <Route path="/configuracion-sistema" element={<ConfiguracionSistemaPage />} />
              <Route path="/reportes/movimientos-dinero" element={<ReporteMovimientosPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </AppConfigProvider>
    </BrowserRouter>
  );
}

export default App;
