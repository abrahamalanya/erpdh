import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, hasRole } from '../utils/roles';
import { getEcho } from '../realtime/echo';
import { getUbicacionesAsesores, type UbicacionAsesorMapa } from '../api/ubicaciones';
import { formatFechaHora } from '../utils/format';

/** Centro por defecto (Perú) cuando ningún asesor tiene una ubicación registrada aún. */
const CENTRO_PERU: [number, number] = [-9.19, -75.0152];

const ICONO_ASESOR = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#1976d2;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,.6)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/**
 * Mapa en vivo del panel principal: última posición de cada asesor,
 * actualizada en tiempo real vía Pusher — visible solo para sistemas/
 * administradores/supervisores (un asesor no ve el mapa, solo envía su
 * propia ubicación desde la app móvil). Usuarios `sistemas` (empresa_id
 * puede ser null, ven varias empresas) escuchan un canal aparte del resto.
 */
export function AsesoresMapaLive() {
  const { user } = useAuth();
  const puedeVer = hasPermission(user, 'ubicaciones_asesores.ver');

  const [ubicaciones, setUbicaciones] = useState<Record<number, UbicacionAsesorMapa>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !puedeVer) return;

    getUbicacionesAsesores()
      .then((res) => {
        setUbicaciones(Object.fromEntries(res.data.map((u) => [u.asesor_id, u])));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error desconocido'));

    const esSistemas = hasRole(user, 'sistemas');
    const canalNombre = esSistemas ? 'sistemas.ubicaciones-asesores' : `empresa.${user.empresa_id}.ubicaciones-asesores`;
    const channel = getEcho().private(canalNombre);

    const onActualizada = (payload: UbicacionAsesorMapa) => {
      setUbicaciones((actual) => ({ ...actual, [payload.asesor_id]: payload }));
    };

    channel.listen('.ubicacion.actualizada', onActualizada);

    return () => {
      channel.stopListening('.ubicacion.actualizada', onActualizada);
    };
  }, [user, puedeVer]);

  const lista = useMemo(() => Object.values(ubicaciones), [ubicaciones]);

  const centro = useMemo<[number, number]>(() => {
    if (lista.length === 0) return CENTRO_PERU;

    const lat = lista.reduce((acc, u) => acc + u.latitud, 0) / lista.length;
    const lng = lista.reduce((acc, u) => acc + u.longitud, 0) / lista.length;
    return [lat, lng];
  }, [lista]);

  if (!puedeVer) return null;

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Mapa de asesores en vivo
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {lista.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Ningún asesor ha enviado su ubicación todavía.
        </Typography>
      ) : (
        <Box sx={{ height: 420, borderRadius: 1, overflow: 'hidden' }}>
          <MapContainer center={centro} zoom={lista.length === 1 ? 15 : 6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {lista.map((u) => (
              <Marker key={u.asesor_id} position={[u.latitud, u.longitud]} icon={ICONO_ASESOR}>
                <Popup>
                  <Stack spacing={0.5} sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {`${u.nombre} ${u.apellido}`.toUpperCase()}
                    </Typography>
                    <Typography variant="caption">Última actualización: {formatFechaHora(u.capturado_en)}</Typography>
                  </Stack>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Box>
      )}
    </Stack>
  );
}
