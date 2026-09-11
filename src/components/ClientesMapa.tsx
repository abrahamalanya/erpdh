import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { getMapaClientes, type ClienteMapa } from '../api/dashboard';
import { TIPO_DOCUMENTO_LABELS } from '../utils/clienteHierarchy';
import { formatFecha } from '../utils/format';

/** Centro por defecto (Perú) cuando ningún cliente tiene coordenadas. */
const CENTRO_PERU: [number, number] = [-9.19, -75.0152];

/**
 * Gris sin crédito activo, verde al día, rojo en mora — anticipa el
 * coloreado por deudas/atrasos que se pidió para más adelante, ya que el
 * dato (fecha_vencimiento_credito) viene igual del backend.
 */
function iconoPara(cliente: ClienteMapa): L.DivIcon {
  const enMora =
    cliente.tiene_credito_activo &&
    cliente.fecha_vencimiento_credito !== null &&
    new Date(cliente.fecha_vencimiento_credito) < new Date(new Date().toDateString());

  const color = !cliente.tiene_credito_activo ? '#9e9e9e' : enMora ? '#e53935' : '#43a047';

  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,.6)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/**
 * Mapa del panel principal: un marcador por cliente con coordenadas
 * registradas; el popup muestra sus datos y si tiene o no un crédito
 * activo (y su fecha de vencimiento, de tenerlo).
 */
export function ClientesMapa() {
  const [clientes, setClientes] = useState<ClienteMapa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMapaClientes()
      .then((res) => setClientes(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, []);

  const centro = useMemo<[number, number]>(() => {
    if (clientes.length === 0) {
      return CENTRO_PERU;
    }

    const lat = clientes.reduce((acc, c) => acc + c.latitud, 0) / clientes.length;
    const lng = clientes.reduce((acc, c) => acc + c.longitud, 0) / clientes.length;

    return [lat, lng];
  }, [clientes]);

  if (isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Mapa de clientes
      </Typography>
      {clientes.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Ningún cliente tiene su ubicación registrada todavía.
        </Typography>
      ) : (
        <Box sx={{ height: 420, borderRadius: 1, overflow: 'hidden' }}>
          <MapContainer center={centro} zoom={clientes.length === 1 ? 15 : 6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {clientes.map((cliente) => (
              <Marker key={cliente.id} position={[cliente.latitud, cliente.longitud]} icon={iconoPara(cliente)}>
                <Popup>
                  <Stack spacing={0.5} sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {`${cliente.nombre} ${cliente.apellido}`.toUpperCase()}
                    </Typography>
                    <Typography variant="caption">
                      {TIPO_DOCUMENTO_LABELS[cliente.tipo_documento] ?? cliente.tipo_documento} {cliente.numero_documento}
                    </Typography>
                    {cliente.direccion && <Typography variant="caption">{cliente.direccion}</Typography>}
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {cliente.tiene_credito_activo
                        ? `Crédito activo — vence ${formatFecha(cliente.fecha_vencimiento_credito)}`
                        : 'Sin crédito activo'}
                    </Typography>
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
