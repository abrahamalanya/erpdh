import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { ExpandableMap } from './ExpandableMap';
import type { HistorialRecorrido } from '../api/ubicaciones';

const icon = L.divIcon({ className: '', html: '<div style="width:20px;height:20px;border:3px solid white;border-radius:50%;background:#1976d2;box-shadow:0 1px 5px #333"></div>', iconSize: [26,26], iconAnchor: [13,13] });
const movingIcon = L.divIcon({ className: '', html: '<div style="font-size:28px;line-height:32px">🏍️</div>', iconSize: [32,32], iconAnchor: [16,16] });
function Fit({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();
  useEffect(() => { if (coordinates.length) map.fitBounds(L.latLngBounds(coordinates), { padding: [30,30], maxZoom: 16 }); }, [map, coordinates]);
  return null;
}

export function HistorialPlaybackMap({ recorrido }: { recorrido: HistorialRecorrido }) {
  const [playing, setPlaying] = useState(false);
  const [distance, setDistance] = useState(0);
  const route = recorrido.trazado;
  const cumulative = useMemo(() => {
    const distances = [0];
    for (let i = 1; i < route.length; i++) distances.push(distances[i-1] + L.latLng(route[i-1]).distanceTo(L.latLng(route[i])));
    return distances;
  }, [route]);
  const total = cumulative.at(-1) ?? 0;
  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let previous: number | undefined;
    const tick = (now: number) => {
      const elapsed = previous === undefined ? 0 : now - previous;
      setDistance(value => Math.min(total, value + elapsed * total / 60000));
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, total]);
  useEffect(() => { if (distance >= total) setPlaying(false); }, [distance, total]);
  const position = useMemo<[number, number]>(() => {
    if (!route.length) return [recorrido.puntos[0]?.latitud ?? -9.19, recorrido.puntos[0]?.longitud ?? -75.0152];
    const end = cumulative.findIndex(d => d > distance);
    if (end < 1) return route.at(-1)!;
    const ratio = (distance - cumulative[end-1]) / (cumulative[end] - cumulative[end-1]);
    return [route[end-1][0] + (route[end][0]-route[end-1][0])*ratio, route[end-1][1] + (route[end][1]-route[end-1][1])*ratio];
  }, [distance, cumulative, route, recorrido]);
  const points = useMemo<[number,number][]>(() => recorrido.puntos.map(p => [p.latitud, p.longitud]), [recorrido]);
  return <Stack spacing={1}>
    {recorrido.aproximado && <Alert severity="warning">No se pudo obtener el trazado por calles. Se muestran solo los puntos GPS; la reproducción no está disponible.</Alert>}
    <Typography variant="caption">Ruta estimada por OpenRouteService entre puntos GPS. Reproducción acelerada de 60 segundos; no representa la velocidad real.</Typography>
    <Stack direction="row" spacing={1}>
      <Button disabled={total === 0 || playing} onClick={() => { if (distance >= total) setDistance(0); setPlaying(true); }}>Reproducir</Button>
      <Button disabled={!playing} onClick={() => setPlaying(false)}>Pausar</Button>
      <Button disabled={total === 0} onClick={() => { setPlaying(false); setDistance(0); }}>Reiniciar</Button>
      <Typography aria-live="polite">{total ? Math.round(distance / total * 100) : 0}%</Typography>
    </Stack>
    <ExpandableMap title="Historial de recorridos" height={420}>
      <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Fit coordinates={route.length ? route : points} />
        {route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#1976d2', weight: 4 }} />}
        {recorrido.aproximado ? points.map((p,i) => <Marker key={i} position={p} icon={icon}><Popup>Punto GPS {i+1}</Popup></Marker>) : <>
          {route.length > 0 && <><Marker position={route[0]} icon={icon}><Popup>Inicio</Popup></Marker><Marker position={route.at(-1)!} icon={icon}><Popup>Fin</Popup></Marker><Marker position={position} icon={movingIcon} zIndexOffset={1000}><Popup>Posición durante la reproducción</Popup></Marker></>}
        </>}
      </MapContainer>
    </ExpandableMap>
  </Stack>;
}
