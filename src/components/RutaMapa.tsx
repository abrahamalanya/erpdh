import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { getAsesoresRuta, getRutaCobranza, type AsesorRuta, type RutaClienteItem } from '../api/rutasCobranza';

/** Centro por defecto (Perú) cuando ningún cliente de la ruta tiene coordenadas. */
const CENTRO_PERU: [number, number] = [-9.19, -75.0152];

function iconoNumerado(orden: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#1976d2;color:white;font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,.6)">${orden}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/**
 * Mapa de ruta del panel principal: paradas numeradas según el orden que el
 * asesor definió en "Mi ruta de cobranza" — distinto del mapa general de
 * clientes (ClientesMapa), que no tiene noción de orden de visita. Un
 * admin/supervisor elige cualquier asesor de su alcance; un asesor ve
 * directamente la suya, sin selector.
 */
export function RutaMapa() {
  const { user } = useAuth();
  const puedeElegirAsesor = hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia', 'supervisor');

  const [asesores, setAsesores] = useState<AsesorRuta[]>([]);
  const [asesorId, setAsesorId] = useState<number | ''>('');
  const [ruta, setRuta] = useState<RutaClienteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (puedeElegirAsesor) {
      getAsesoresRuta()
        .then((res) => setAsesores(res.data))
        .catch(() => setAsesores([]));
    }
  }, [puedeElegirAsesor]);

  useEffect(() => {
    if (puedeElegirAsesor && !asesorId) {
      setRuta([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    getRutaCobranza(asesorId || undefined)
      .then((res) => setRuta(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [asesorId, puedeElegirAsesor]);

  const conCoordenadas = useMemo(
    () => ruta.filter((r): r is RutaClienteItem & { latitud: number; longitud: number } => r.latitud !== null && r.longitud !== null),
    [ruta]
  );

  const centro = useMemo<[number, number]>(() => {
    if (conCoordenadas.length === 0) return CENTRO_PERU;

    const lat = conCoordenadas.reduce((acc, c) => acc + c.latitud, 0) / conCoordenadas.length;
    const lng = conCoordenadas.reduce((acc, c) => acc + c.longitud, 0) / conCoordenadas.length;
    return [lat, lng];
  }, [conCoordenadas]);

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Mapa de ruta
      </Typography>

      {puedeElegirAsesor && (
        <TextField
          select
          label="Asesor"
          size="small"
          value={asesorId}
          onChange={(e) => setAsesorId(e.target.value ? Number(e.target.value) : '')}
          sx={{ maxWidth: 280 }}
        >
          <MenuItem value="">Selecciona un asesor</MenuItem>
          {asesores.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {`${a.nombre} ${a.apellido}`.toUpperCase()}
            </MenuItem>
          ))}
        </TextField>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : puedeElegirAsesor && !asesorId ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Elige un asesor para ver su ruta.
        </Typography>
      ) : conCoordenadas.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Ningún cliente de esta ruta tiene su ubicación registrada todavía.
        </Typography>
      ) : (
        <Box sx={{ height: 420, borderRadius: 1, overflow: 'hidden' }}>
          <MapContainer center={centro} zoom={conCoordenadas.length === 1 ? 15 : 6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polyline positions={conCoordenadas.map((c) => [c.latitud, c.longitud])} pathOptions={{ color: '#1976d2', weight: 2, dashArray: '6 6' }} />
            {conCoordenadas.map((c) => (
              <Marker key={c.cliente_id} position={[c.latitud, c.longitud]} icon={iconoNumerado(c.orden)}>
                <Popup>
                  <Stack spacing={0.5} sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {c.orden}. {`${c.nombre} ${c.apellido}`.toUpperCase()}
                    </Typography>
                    {c.direccion && <Typography variant="caption">{c.direccion}</Typography>}
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {c.dias_atraso_max === 0 ? 'Vence hoy' : `${c.dias_atraso_max} días de atraso`}
                    </Typography>
                    <Typography variant="caption">Créditos: {c.credito_codigos.join(', ')}</Typography>
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
