import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { useAuth } from '../hooks/useAuth';
import { hasPermission } from '../utils/roles';
import { ExpandableMap } from '../components/ExpandableMap';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  getAsesoresVisiblesUbicacion,
  getHistorialAsesor,
  type AsesorUbicacion,
  type HistorialAsesor,
  type HistorialPunto,
} from '../api/ubicaciones';
import { formatFechaHora } from '../utils/format';

/** Centro por defecto (Perú) cuando el recorrido todavía no tiene puntos. */
const CENTRO_PERU: [number, number] = [-9.19, -75.0152];

const ICONO_INICIO = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#43a047;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,.6)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const ICONO_FIN = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#e53935;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,.6)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/** YYYY-MM-DD de hoy y de hace `dias` días, en la zona horaria del navegador — alcanza como rango por defecto. */
function rangoInicial(dias: number): { desde: string; hasta: string } {
  const hoy = new Date();
  const hace = new Date(hoy);
  hace.setDate(hoy.getDate() - dias);

  return { desde: hace.toISOString().slice(0, 10), hasta: hoy.toISOString().slice(0, 10) };
}

/** "≈ 3.5 km"; 0 si no hay distancia (un solo punto o ninguno). */
function resumenDistancia(metros: number): string | null {
  if (metros === 0) return null;
  return `≈ ${(metros / 1000).toFixed(1)} km`;
}

/**
 * Reporte de historial de recorridos de un asesor: filtra por asesor y rango
 * de fechas, muestra los puntos capturados en una tabla y su recorrido en un
 * mapa, con un resumen de horario/distancia/pausas inferido de los propios
 * puntos (no hay un evento explícito de inicio/fin/pausa enviado por la app).
 * Mismo permiso que el mapa de asesores en vivo (ubicaciones_asesores.ver).
 */
export function ReporteHistorialRecorridosPage() {
  const { user } = useAuth();
  const puedeVer = hasPermission(user, 'ubicaciones_asesores.ver');

  const [asesores, setAsesores] = useState<AsesorUbicacion[]>([]);
  const [agenciaId, setAgenciaId] = useState<number | ''>('');
  const [asesorId, setAsesorId] = useState<number | ''>('');
  const [{ desde: desdeInicial, hasta: hastaInicial }] = useState(() => rangoInicial(6));
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);

  const [historial, setHistorial] = useState<HistorialAsesor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rangoInvalido = Boolean(desde && hasta && hasta < desde);

  useEffect(() => {
    if (!puedeVer) return;

    getAsesoresVisiblesUbicacion()
      .then((res) => setAsesores(res.data))
      .catch(() => setAsesores([]));
  }, [puedeVer]);

  // Opciones de agencia derivadas de la lista completa de asesores — mismo
  // patrón que MapaCobranzaUnificado, para no pedir un endpoint aparte.
  const agencias = useMemo(() => {
    const porId = new Map<number, string>();
    asesores.forEach((a) => {
      if (a.agencia_id !== null) porId.set(a.agencia_id, a.agencia_nombre ?? `Agencia #${a.agencia_id}`);
    });
    return Array.from(porId, ([id, nombre]) => ({ id, nombre }));
  }, [asesores]);

  const asesoresFiltrados = agenciaId === '' ? asesores : asesores.filter((a) => a.agencia_id === agenciaId);

  function handleCambiarAgencia(value: number | ''): void {
    setAgenciaId(value);

    if (value !== '' && asesorId !== '') {
      const asesorSigueValido = asesores.some((a) => a.id === asesorId && a.agencia_id === value);
      if (!asesorSigueValido) setAsesorId('');
    }
  }

  useEffect(() => {
    if (!asesorId || rangoInvalido) {
      setHistorial(null);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    getHistorialAsesor(asesorId, desde, hasta)
      .then((res) => setHistorial(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [asesorId, desde, hasta, rangoInvalido]);

  const puntos = historial?.puntos ?? [];

  const centro = useMemo<[number, number]>(() => {
    if (puntos.length === 0) return CENTRO_PERU;

    const lat = puntos.reduce((acc, p) => acc + p.latitud, 0) / puntos.length;
    const lng = puntos.reduce((acc, p) => acc + p.longitud, 0) / puntos.length;
    return [lat, lng];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historial]);

  if (!puedeVer) {
    return <Navigate to="/" replace />;
  }

  const columns: DataTableColumn<HistorialPunto>[] = [
    { header: 'Hora', render: (p) => formatFechaHora(p.capturado_en) },
    { header: 'Latitud', render: (p) => p.latitud.toFixed(6) },
    { header: 'Longitud', render: (p) => p.longitud.toFixed(6) },
    { header: 'Precisión', align: 'right', render: (p) => (p.precision_metros !== null ? `${p.precision_metros.toFixed(0)} m` : '—') },
    {
      header: 'Velocidad',
      align: 'right',
      render: (p) => (p.velocidad_ms !== null && p.velocidad_ms >= 0 ? `${(p.velocidad_ms * 3.6).toFixed(0)} km/h` : '—'),
    },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Historial de recorridos
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Puntos GPS capturados por el tracking en segundo plano de cada asesor. El horario y la distancia son
        estimados a partir de esos puntos, no de un registro explícito de inicio/fin de jornada.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {agencias.length > 0 && (
          <TextField
            select
            label="Agencia"
            value={agenciaId}
            onChange={(e) => handleCambiarAgencia(e.target.value ? Number(e.target.value) : '')}
            fullWidth
          >
            <MenuItem value="">Todas</MenuItem>
            {agencias.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.nombre.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          select
          label="Asesor"
          value={asesorId}
          onChange={(e) => setAsesorId(e.target.value ? Number(e.target.value) : '')}
          fullWidth
        >
          <MenuItem value="">Selecciona un asesor</MenuItem>
          {asesoresFiltrados.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {`${a.nombre} ${a.apellido}`.toUpperCase()}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Desde"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          error={rangoInvalido}
          fullWidth
        />
        <TextField
          label="Hasta"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          error={rangoInvalido}
          fullWidth
        />
      </Stack>

      <ErrorBanner error={loadError} />

      {!asesorId ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Elige un asesor para ver su historial de recorridos.
        </Typography>
      ) : (
        <>
          {historial && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, alignItems: 'center' }}>
              <Chip
                label={
                  historial.resumen.inicio && historial.resumen.fin
                    ? `${formatFechaHora(historial.resumen.inicio)} — ${formatFechaHora(historial.resumen.fin)}`
                    : 'Sin puntos en el rango'
                }
                size="small"
              />
              {resumenDistancia(historial.resumen.distancia_m) && (
                <Chip label={resumenDistancia(historial.resumen.distancia_m)} size="small" variant="outlined" />
              )}
              {historial.resumen.pausas.length > 0 && (
                <Chip
                  label={`${historial.resumen.pausas.length} pausa${historial.resumen.pausas.length > 1 ? 's' : ''} detectada${historial.resumen.pausas.length > 1 ? 's' : ''}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Stack>
          )}

          {!isLoading && puntos.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No hay puntos registrados para este asesor en el rango elegido.
            </Typography>
          ) : (
            <ExpandableMap title="Historial de recorridos" height={420}>
              <MapContainer center={centro} zoom={puntos.length === 1 ? 15 : 13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polyline positions={puntos.map((p) => [p.latitud, p.longitud])} pathOptions={{ color: '#1976d2', weight: 3 }} />
                {puntos.length > 0 && (
                  <>
                    <Marker position={[puntos[0].latitud, puntos[0].longitud]} icon={ICONO_INICIO}>
                      <Popup>Inicio — {formatFechaHora(puntos[0].capturado_en)}</Popup>
                    </Marker>
                    <Marker
                      position={[puntos[puntos.length - 1].latitud, puntos[puntos.length - 1].longitud]}
                      icon={ICONO_FIN}
                    >
                      <Popup>Fin — {formatFechaHora(puntos[puntos.length - 1].capturado_en)}</Popup>
                    </Marker>
                  </>
                )}
              </MapContainer>
            </ExpandableMap>
          )}

          <DataTable
            columns={columns}
            rows={puntos}
            keyExtractor={(p) => p.capturado_en}
            isLoading={isLoading}
            emptyMessage="No hay puntos registrados para este asesor en el rango elegido"
            page={1}
            lastPage={1}
            onPageChange={() => {}}
          />
        </>
      )}
    </Stack>
  );
}
