import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { canAccederCajaPropia, canVerCajas, canCerrarForzado, canReabrirCaja } from '../utils/cajaHierarchy';
import { CajaPage } from './CajaPage';
import { CajasPage } from './CajasPage';
import { ReporteCajasPage } from './ReporteCajasPage';

export function CierreCajaPage() {
  const { user } = useAuth();
  const propia = canAccederCajaPropia(user), historial = canVerCajas(user);
  const gestion = historial && (canCerrarForzado(user) || canReabrirCaja(user));
  const [tab, setTab] = useState(gestion ? 'historial' : propia ? 'propia' : 'historial');
  const tabs = [...(propia ? [{ value: 'propia', label: 'Mi caja' }] : []),
    ...(historial ? [{ value: 'historial', label: 'Historial y totales' }] : []),
    ...(gestion ? [{ value: 'gestion', label: 'Gestionar cajas' }] : [])];
  const actual = tabs.some(item => item.value === tab) ? tab : tabs[0]?.value;
  if (!tabs.length) return <Navigate to="/" replace />;
  return <Stack spacing={3}>
    <Box><Typography variant="h5" sx={{ fontWeight: 700 }}>Cierre de Caja</Typography>
      <Typography color="text.secondary">Apertura, arqueo, historial y reportes de las cajas a las que tienes acceso.</Typography></Box>
    <Tabs value={actual} onChange={(_, value: string) => setTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Secciones de cierre de caja">
      {tabs.map(item => <Tab key={item.value} value={item.value} label={item.label} id={`cierre-tab-${item.value}`} aria-controls={`cierre-panel-${item.value}`} />)}
    </Tabs>
    <Box role="tabpanel" id={`cierre-panel-${actual}`} aria-labelledby={`cierre-tab-${actual}`}>
      {actual === 'propia' && <CajaPage />}
      {actual === 'historial' && <ReporteCajasPage tarjetas />}
      {actual === 'gestion' && <CajasPage />}
    </Box>
  </Stack>;
}
