import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

// Vite no resuelve los íconos por defecto de Leaflet desde su propio CSS
// (asumen una ruta relativa al bundle de Leaflet, no al nuestro) — se
// reemplazan una sola vez, al cargar el módulo, por las URLs que Vite sí
// resuelve al importar los PNG directamente.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/** Centro por defecto (Perú) cuando aún no hay coordenadas. */
const CENTRO_PERU: [number, number] = [-9.19, -75.0152];

interface LocationMapProps {
  latitud: number | null;
  longitud: number | null;
  onChange: (latitud: number, longitud: number) => void;
  /** Texto del botón — distingue "casa" de "negocio" cuando se usan dos en el mismo formulario. */
  label?: string;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  });

  return null;
}

/**
 * Mapa interactivo (Leaflet + OpenStreetMap, sin API key) para capturar y
 * mostrar la ubicación exacta de una dirección: un botón "Detectar GPS" usa
 * la geolocalización del navegador, y el pin se puede arrastrar o
 * reposicionar con un clic para afinarlo a mano. Reutilizado para la
 * dirección de casa y la de negocio del cliente.
 */
export function LocationMap({ latitud, longitud, onChange, label = 'Detectar GPS' }: LocationMapProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tienePosicion = latitud !== null && longitud !== null;
  const centro: [number, number] = tienePosicion ? [latitud, longitud] : CENTRO_PERU;

  function detectarGps() {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.');
      return;
    }

    setError(null);
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setIsLocating(false);
      },
      (err) => {
        setError(err.message || 'No se pudo obtener tu ubicación.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          type="button"
          variant="outlined"
          size="small"
          startIcon={<MyLocationIcon />}
          onClick={detectarGps}
          disabled={isLocating}
        >
          {isLocating ? 'Detectando...' : label}
        </Button>
        {tienePosicion && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {latitud.toFixed(6)}, {longitud.toFixed(6)}
          </Typography>
        )}
      </Stack>
      {error && (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {error}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Puedes hacer clic en el mapa o arrastrar el pin para ajustar la ubicación manualmente.
      </Typography>
      <Box sx={{ height: 260, borderRadius: 1, overflow: 'hidden' }}>
        <MapContainer
          center={centro}
          zoom={tienePosicion ? 16 : 5}
          style={{ height: '100%', width: '100%' }}
          key={tienePosicion ? 'con-posicion' : 'sin-posicion'}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onClick={onChange} />
          {tienePosicion && (
            <Marker
              position={centro}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as L.Marker;
                  const pos = marker.getLatLng();
                  onChange(pos.lat, pos.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </Box>
    </Stack>
  );
}
