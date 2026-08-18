import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
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
const BilletajesPage = lazy(() =>
  import('./pages/BilletajesPage').then((m) => ({ default: m.BilletajesPage }))
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
            <Route path="/bovedas" element={<BovedasPage />} />
            <Route path="/billetajes" element={<BilletajesPage />} />
            <Route path="/bienes" element={<BienesPage />} />
            <Route path="/creditos-prendarios" element={<CreditosPrendariosPage />} />
            <Route
              path="/configuraciones-credito-prendario"
              element={<ConfiguracionCreditoPrendarioPage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
