import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import {
  getAsesoresRuta,
  getRutaCobranza,
  getTrazadoRutaCobranza,
  TIPOS_RUTA_COBRANZA,
  type AsesorRuta,
  type RutaClienteItem,
  type TrazadoRuta,
} from '../api/rutasCobranza';
import { TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import type { TipoCredito } from '../types/api';

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

/** Espera tras un cambio de orden antes de pedir el trazado (reordenar arrastrando dispara varios). */
const TRAZADO_DEBOUNCE_MS = 500;

/** "≈ 3.5 km · 10 min"; null sin distancia. */
function resumenTrazado(t: TrazadoRuta): string | null {
  if (t.distancia_m === 0) return null;
  return `≈ ${(t.distancia_m / 1000).toFixed(1)} km · ${Math.round(t.duracion_s / 60)} min`;
}

/**
 * Mapa de ruta del panel principal: paradas numeradas según el orden que el
 * asesor definió en "Mi ruta de cobranza" — distinto del mapa general de
 * clientes (ClientesMapa), que no tiene noción de orden de visita. Un
 * admin/supervisor elige cualquier asesor de su alcance (el supervisor además
 * puede ver su propia ruta, la que arma copiando paradas de las de sus
 * asesores); un asesor ve directamente la suya, sin selector. Se puede filtrar
 * por tipo de crédito: cada tipo tiene su propia ruta y su propio orden
 * (numeración de paradas).
 */
export function RutaMapa() {
  const { user } = useAuth();
  const esSupervisor = hasRole(user, 'supervisor');
  const puedeElegirAsesor = esSupervisor || hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia');

  const [asesores, setAsesores] = useState<AsesorRuta[]>([]);
  const [asesorId, setAsesorId] = useState<number | ''>('');
  const [tipoCredito, setTipoCredito] = useState<TipoCredito | ''>('');
  const [ruta, setRuta] = useState<RutaClienteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trazado, setTrazado] = useState<TrazadoRuta | null>(null);

  // Para el supervisor la opción vacía es su propia ruta (la que arma en
  // "Mi ruta de cobranza"); los demás tienen que elegir un asesor primero.
  const esperaAsesor = puedeElegirAsesor && !esSupervisor && !asesorId;

  useEffect(() => {
    if (puedeElegirAsesor) {
      getAsesoresRuta()
        .then((res) => setAsesores(res.data))
        .catch(() => setAsesores([]));
    }
  }, [puedeElegirAsesor]);

  useEffect(() => {
    if (esperaAsesor) {
      setRuta([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    getRutaCobranza(asesorId || undefined, tipoCredito || undefined)
      .then((res) => setRuta(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [asesorId, tipoCredito, esperaAsesor]);

  const conCoordenadas = useMemo(
    () => ruta.filter((r): r is RutaClienteItem & { latitud: number; longitud: number } => r.latitud !== null && r.longitud !== null),
    [ruta]
  );

  // El orden de visita: si cambia (otro asesor/tipo, reordenar, clonar o quitar
  // una parada), el trazado por calles se vuelve a pedir.
  const ordenParadas = conCoordenadas.map((c) => c.cliente_id).join(',');

  useEffect(() => {
    setTrazado(null);
    if (conCoordenadas.length < 2) return;

    let active = true;
    const handle = setTimeout(() => {
      getTrazadoRutaCobranza(asesorId || undefined, tipoCredito || undefined)
        .then((res) => {
          if (active) setTrazado(res.data);
        })
        // Sin trazado queda la línea recta punteada: el mapa nunca se queda sin línea.
        .catch(() => {});
    }, TRAZADO_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenParadas, asesorId, tipoCredito]);

  // Respaldo mientras carga o si falla: la línea recta entre paradas.
  const usaTrazado = trazado !== null && trazado.trazado.length >= 2;
  const lineaPuntos: [number, number][] = usaTrazado
    ? trazado.trazado
    : conCoordenadas.map((c) => [c.latitud, c.longitud]);
  const lineaPunteada = !usaTrazado || trazado.aproximado;
  const resumen = usaTrazado ? resumenTrazado(trazado) : null;

  const centro = useMemo<[number, number]>(() => {
    if (conCoordenadas.length === 0) return CENTRO_PERU;

    const lat = conCoordenadas.reduce((acc, c) => acc + c.latitud, 0) / conCoordenadas.length;
    const lng = conCoordenadas.reduce((acc, c) => acc + c.longitud, 0) / conCoordenadas.length;
    return [lat, lng];
  }, [conCoordenadas]);

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Mapa de ruta
        </Typography>
        {resumen && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {resumen}
          </Typography>
        )}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        {puedeElegirAsesor && (
          <TextField
            select
            label="Asesor"
            size="small"
            value={asesorId}
            onChange={(e) => setAsesorId(e.target.value ? Number(e.target.value) : '')}
            sx={{ minWidth: 220, maxWidth: 280 }}
          >
            <MenuItem value="">{esSupervisor ? 'Mi ruta' : 'Selecciona un asesor'}</MenuItem>
            {asesores.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {`${a.nombre} ${a.apellido}`.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          select
          label="Tipo de crédito"
          size="small"
          value={tipoCredito}
          onChange={(e) => setTipoCredito(e.target.value as TipoCredito | '')}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {TIPOS_RUTA_COBRANZA.map((tipo) => (
            <MenuItem key={tipo} value={tipo}>
              {TIPO_CREDITO_LABELS[tipo]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : esperaAsesor ? (
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
            {/* key: Leaflet no limpia dashArray en un setStyle, así que se remonta al cambiar de estilo. */}
            <Polyline
              key={lineaPunteada ? 'punteada' : 'solida'}
              positions={lineaPuntos}
              pathOptions={{
                color: '#1976d2',
                weight: usaTrazado ? 4 : 2,
                dashArray: lineaPunteada ? '6 6' : undefined,
              }}
            />
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

      {usaTrazado && trazado.aproximado && !isLoading && !esperaAsesor && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Algunos tramos se muestran en línea recta
        </Typography>
      )}
    </Stack>
  );
}
