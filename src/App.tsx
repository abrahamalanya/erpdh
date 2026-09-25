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
const PermisosTemporalesPage = lazy(() =>
  import('./pages/PermisosTemporalesPage').then((m) => ({ default: m.PermisosTemporalesPage }))
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
const EgresosPage = lazy(() =>
  import('./pages/MovimientosCajaPage').then((m) => ({ default: m.EgresosPage }))
);
const DesembolsosPage = lazy(() =>
  import('./pages/MovimientosCajaPage').then((m) => ({ default: m.DesembolsosPage }))
);
const BienesPage = lazy(() => import('./pages/BienesPage').then((m) => ({ default: m.BienesPage })));
const VehiculosPage = lazy(() =>
  import('./pages/VehiculosPage').then((m) => ({ default: m.VehiculosPage }))
);
const InmueblesPage = lazy(() =>
  import('./pages/InmueblesPage').then((m) => ({ default: m.InmueblesPage }))
);
const CreditosPrendariosPage = lazy(() =>
  import('./pages/CreditosPrendariosPage').then((m) => ({ default: m.CreditosPrendariosPage }))
);
const ConfiguracionCreditoPrendarioPage = lazy(() =>
  import('./pages/ConfiguracionCreditoPrendarioPage').then((m) => ({
    default: m.ConfiguracionCreditoPrendarioPage,
  }))
);
const CobranzasPage = lazy(() =>
  import('./pages/CobranzasPage').then((m) => ({ default: m.CobranzasPage }))
);
const RutaCobranzaPage = lazy(() =>
  import('./pages/RutaCobranzaPage').then((m) => ({ default: m.RutaCobranzaPage }))
);
const SimuladorCreditoPage = lazy(() =>
  import('./pages/SimuladorCreditoPage').then((m) => ({ default: m.SimuladorCreditoPage }))
);
const ReporteMovimientosPage = lazy(() =>
  import('./pages/ReporteMovimientosPage').then((m) => ({ default: m.ReporteMovimientosPage }))
);
const ReporteCobranzaDiariaPage = lazy(() =>
  import('./pages/ReporteCobranzaDiariaPage').then((m) => ({ default: m.ReporteCobranzaDiariaPage }))
);
const ReporteAnulacionesCobranzaPage = lazy(() =>
  import('./pages/ReporteAnulacionesCobranzaPage').then((m) => ({ default: m.ReporteAnulacionesCobranzaPage }))
);
const ReporteCajasPage = lazy(() => import('./pages/ReporteCajasPage').then((m) => ({ default: m.ReporteCajasPage })));
const ReporteCobranzaMensualPage = lazy(() =>
  import('./pages/ReporteCobranzaMensualPage').then((m) => ({ default: m.ReporteCobranzaMensualPage }))
);
const ReporteFlujoCajaPage = lazy(() =>
  import('./pages/ReporteFlujoCajaPage').then((m) => ({ default: m.ReporteFlujoCajaPage }))
);
const ConfiguracionSistemaPage = lazy(() =>
  import('./pages/ConfiguracionSistemaPage').then((m) => ({ default: m.ConfiguracionSistemaPage }))
);
const TiendaPage = lazy(() => import('./pages/TiendaPage').then((m) => ({ default: m.TiendaPage })));
const TiendaBienPage = lazy(() =>
  import('./pages/TiendaBienPage').then((m) => ({ default: m.TiendaBienPage }))
);
const VentasPage = lazy(() => import('./pages/VentasPage').then((m) => ({ default: m.VentasPage })));
const ConfiguracionVentaPage = lazy(() =>
  import('./pages/ConfiguracionVentaPage').then((m) => ({ default: m.ConfiguracionVentaPage }))
);
const TiendaSolicitudesPage = lazy(() =>
  import('./pages/TiendaSolicitudesPage').then((m) => ({ default: m.TiendaSolicitudesPage }))
);
const TiendaProductosPage = lazy(() =>
  import('./pages/TiendaProductosPage').then((m) => ({ default: m.TiendaProductosPage }))
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
              path="/tienda/:tipo/:id"
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
              <Route path="/gestion/permisos-temporales" element={<PermisosTemporalesPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/caja" element={<CajaPage />} />
              <Route path="/cajas" element={<CajasPage />} />
              <Route path="/bancos" element={<BancosPage />} />
              <Route path="/bovedas" element={<BovedasPage />} />
              <Route path="/bovedas/:id/cuentas-bancarias" element={<CuentasBancariasPage />} />
              <Route path="/billetajes" element={<BilletajesPage />} />
              <Route path="/conceptos" element={<ConceptosPage />} />
              <Route path="/ingresos" element={<IngresosPage />} />
              <Route path="/egresos" element={<EgresosPage />} />
              <Route path="/desembolsos" element={<DesembolsosPage />} />
              <Route path="/bienes" element={<BienesPage />} />
              <Route path="/vehiculos" element={<VehiculosPage />} />
              <Route path="/inmuebles" element={<InmueblesPage />} />
              <Route path="/creditos-prendarios" element={<CreditosPrendariosPage variant="solicitudes" />} />
              <Route path="/creditos-prendarios/prendarios" element={<CreditosPrendariosPage variant="prendario" />} />
              <Route path="/creditos-prendarios/vehiculares" element={<CreditosPrendariosPage variant="vehicular" />} />
              <Route path="/creditos-prendarios/hipotecarios" element={<CreditosPrendariosPage variant="hipotecario" />} />
              <Route path="/creditos-prendarios/diarios" element={<CreditosPrendariosPage variant="diario" />} />
              <Route path="/simulador-creditos" element={<SimuladorCreditoPage />} />
              <Route path="/cobros" element={<CobranzasPage />} />
              <Route path="/ruta-cobranza" element={<RutaCobranzaPage />} />
              <Route
                path="/configuraciones-credito-prendario"
                element={<ConfiguracionCreditoPrendarioPage />}
              />
              <Route path="/configuracion-sistema" element={<ConfiguracionSistemaPage />} />
              <Route path="/reportes/movimientos-dinero" element={<ReporteMovimientosPage />} />
              <Route path="/reportes/cobranza-diaria" element={<ReporteCobranzaDiariaPage />} />
              <Route path="/reportes/anulaciones-cobranza" element={<ReporteAnulacionesCobranzaPage />} />
              <Route path="/reportes/cajas-apertura-cierre" element={<ReporteCajasPage />} />
              <Route path="/reportes/cobranza-mensual" element={<ReporteCobranzaMensualPage />} />
              <Route path="/reportes/flujo-caja" element={<ReporteFlujoCajaPage />} />
              <Route path="/ventas" element={<VentasPage />} />
              <Route path="/configuraciones-venta" element={<ConfiguracionVentaPage />} />
              <Route path="/tienda-solicitudes" element={<TiendaSolicitudesPage />} />
              <Route path="/tienda-productos" element={<TiendaProductosPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </AppConfigProvider>
    </BrowserRouter>
  );
}

export default App;
