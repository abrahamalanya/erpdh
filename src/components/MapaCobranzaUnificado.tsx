import { useEffect, useMemo, useState } from 'react';
import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { ExpandableMap } from './ExpandableMap';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { getEcho } from '../realtime/echo';
import { useAsesorColores } from '../utils/asesorColor';
import {
  getMapaCobranzaUnificado,
  type AsesorMapaUnificado,
  type ClienteMapaUnificado,
  type MapaUnificadoResponse,
} from '../api/mapaCobranza';
import type { UbicacionAsesorMapa } from '../api/ubicaciones';
import { LUGAR_COBRANZA_LABELS } from '../types/api';
import { formatFechaHora } from '../utils/format';
import { ErrorBanner } from './ErrorBanner';

/** Centro por defecto (Perú) cuando nada tiene coordenadas todavía. */
const CENTRO_PERU: [number, number] = [-9.19, -75.0152];

/** Mismo ritmo que el ping de la app (~45s): ni instantáneo ni excesivo para un dashboard. */
const REFRESH_MS = 45000;

const COLOR_PENDIENTE = '#9e9e9e';
const COLOR_AMARILLO = '#fbc02d';
const COLOR_VERDE = '#43a047';

function colorDeEstado(estado: ClienteMapaUnificado['estado_visual']): string {
  if (estado === 'verde') return COLOR_VERDE;
  if (estado === 'amarillo') return COLOR_AMARILLO;
  return COLOR_PENDIENTE;
}

/** Silueta simple de moto en SVG, tintada con el color del asesor. */
function iconoMoto(color: string): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26">
    <circle cx="12" cy="12" r="11.5" fill="${color}" stroke="white" stroke-width="1.5"/>
    <path fill="white" transform="translate(3.2,6)" d="M4 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm9 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM4 7a1 1 0 0 1 0-2h.6l1-2.2a1 1 0 0 1 .9-.6h2.3a1 1 0 0 1 0 2H7l-.6 1.3 2.4 1.5h1.9l1-1.6a1 1 0 0 1 .9-.5h1.1a1 1 0 0 1 0 2h-.5l-.7 1.1h1a2 2 0 0 1 2 1.6l.1.4a1 1 0 0 1-2 .4l-.1-.4a.5.5 0 0 0-.5-.4H9.6a1 1 0 0 1-.5-.1L5.8 7.4 5.1 7H4Z"/>
  </svg>`;

  return L.divIcon({
    className: '',
    html: svg,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function iconoCliente(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,.6)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/**
 * Mapa unificado del panel principal: fusiona lo que hoy son 3 mapas sueltos
 * (AsesoresMapaLive + ClientesMapa + RutaMapa) en uno solo — la ubicación en
 * vivo de cada asesor visible, su ruta de cobranza de hoy, y el semáforo de
 * visita de cada cliente (pendiente/amarillo/verde), que calcula y persiste
 * el backend (VisitaClienteService) — este componente solo pinta lo que ya
 * vino resuelto, nunca decide un color por su cuenta.
 *
 * Los 3 mapas anteriores se mantienen renderizados debajo, sin cambios,
 * hasta confirmar que este reemplazo funciona bien en producción.
 */
export function MapaCobranzaUnificado() {
  const { user } = useAuth();
  const esSupervisor = hasRole(user, 'supervisor');
  const puedeElegirAsesor = esSupervisor || hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia');

  const [opciones, setOpciones] = useState<{ agencias: { id: number; nombre: string }[]; asesores: AsesorMapaUnificado[] }>({
    agencias: [],
    asesores: [],
  });
  const [agenciaId, setAgenciaId] = useState<number | ''>('');
  const [asesorId, setAsesorId] = useState<number | ''>('');

  const [data, setData] = useState<MapaUnificadoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Opciones de los selects: de una sola carga sin filtros, para que elegir
  // una agencia no haga desaparecer a las demás de la lista.
  useEffect(() => {
    getMapaCobranzaUnificado()
      .then((res) => {
        const agenciasPorId = new Map<number, string>();
        res.data.asesores.forEach((a) => {
          if (a.agencia_id !== null) agenciasPorId.set(a.agencia_id, a.agencia_nombre ?? `Agencia #${a.agencia_id}`);
        });

        setOpciones({
          agencias: Array.from(agenciasPorId, ([id, nombre]) => ({ id, nombre })),
          asesores: res.data.asesores,
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCambiarAgencia(value: number | ''): void {
    setAgenciaId(value);

    // La agencia cambió: si el asesor elegido ya no pertenece a ella, se limpia.
    if (value !== '' && asesorId !== '') {
      const asesorSigueValido = opciones.asesores.some((a) => a.asesor_id === asesorId && a.agencia_id === value);
      if (!asesorSigueValido) setAsesorId('');
    }
  }

  useEffect(() => {
    let activo = true;

    function cargar(): void {
      getMapaCobranzaUnificado(agenciaId || undefined, asesorId || undefined)
        .then((res) => {
          if (activo) setData(res.data);
        })
        .catch((err) => {
          if (activo) setError(err instanceof Error ? err.message : 'Error desconocido');
        })
        .finally(() => {
          if (activo) setIsLoading(false);
        });
    }

    setIsLoading(true);
    setError(null);
    cargar();

    const interval = setInterval(cargar, REFRESH_MS);

    return () => {
      activo = false;
      clearInterval(interval);
    };
  }, [agenciaId, asesorId]);

  // Posición en vivo del asesor entre refrescos — mismo canal que AsesoresMapaLive.
  useEffect(() => {
    if (!user) return;

    const esSistemas = hasRole(user, 'sistemas');
    const canalNombre = esSistemas ? 'sistemas.ubicaciones-asesores' : `empresa.${user.empresa_id}.ubicaciones-asesores`;
    const channel = getEcho().private(canalNombre);
    const personal = getEcho().private(`App.Models.User.${user.id}`);

    const onActualizada = (payload: UbicacionAsesorMapa) => {
      setData((actual) => {
        if (!actual) return actual;
        if (!actual.asesores.some((a) => a.asesor_id === payload.asesor_id)) return actual;

        return {
          ...actual,
          asesores: actual.asesores.map((a) =>
            a.asesor_id === payload.asesor_id
              ? { ...a, latitud: payload.latitud, longitud: payload.longitud, precision_metros: payload.precision_metros, capturado_en: payload.capturado_en, desactualizado: false }
              : a
          ),
        };
      });
    };

    channel.listen('.ubicacion.actualizada', onActualizada);
    personal.listen('.ubicacion.actualizada', onActualizada);

    return () => {
      channel.stopListening('.ubicacion.actualizada', onActualizada);
      personal.stopListening('.ubicacion.actualizada', onActualizada);
    };
  }, [user]);

  const asesoresConCoordenadas = useMemo(() => data?.asesores ?? [], [data]);
  const clientesConCoordenadas = useMemo(
    () => (data?.clientes ?? []).filter((c): c is ClienteMapaUnificado & { latitud_cobranza: number; longitud_cobranza: number } => c.latitud_cobranza !== null && c.longitud_cobranza !== null),
    [data]
  );
  const sinUbicacionCobranza = (data?.clientes.length ?? 0) - clientesConCoordenadas.length;

  const colores = useAsesorColores(asesoresConCoordenadas.map((a) => a.asesor_id));

  const nombreAsesorPorId = useMemo(() => {
    const map = new Map<number, string>();
    asesoresConCoordenadas.forEach((a) => map.set(a.asesor_id, `${a.nombre} ${a.apellido}`.toUpperCase()));
    return map;
  }, [asesoresConCoordenadas]);

  const centro = useMemo<[number, number]>(() => {
    const puntos = [
      ...asesoresConCoordenadas.map((a) => [a.latitud, a.longitud] as [number, number]),
      ...clientesConCoordenadas.map((c) => [c.latitud_cobranza, c.longitud_cobranza] as [number, number]),
    ];
    if (puntos.length === 0) return CENTRO_PERU;

    const lat = puntos.reduce((acc, p) => acc + p[0], 0) / puntos.length;
    const lng = puntos.reduce((acc, p) => acc + p[1], 0) / puntos.length;
    return [lat, lng];
  }, [asesoresConCoordenadas, clientesConCoordenadas]);

  const asesoresDisponiblesParaSelect = agenciaId === '' ? opciones.asesores : opciones.asesores.filter((a) => a.agencia_id === agenciaId);

  const huboDatos = asesoresConCoordenadas.length > 0 || clientesConCoordenadas.length > 0;

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Mapa de cobranza
      </Typography>

      {puedeElegirAsesor && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <TextField
            select
            label="Agencia"
            size="small"
            value={agenciaId}
            onChange={(e) => handleCambiarAgencia(e.target.value ? Number(e.target.value) : '')}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {opciones.agencias.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Asesor"
            size="small"
            value={asesorId}
            onChange={(e) => setAsesorId(e.target.value ? Number(e.target.value) : '')}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {asesoresDisponiblesParaSelect.map((a) => (
              <MenuItem key={a.asesor_id} value={a.asesor_id}>
                {`${a.nombre} ${a.apellido}`.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      )}

      <ErrorBanner error={error} />

      {isLoading && !data ? null : !huboDatos ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Ningún asesor o cliente visible tiene ubicación registrada todavía.
        </Typography>
      ) : (
        <ExpandableMap title="Mapa de cobranza" height={460}>
          <MapContainer center={centro} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {asesoresConCoordenadas.map((a) => (
              <Marker key={`asesor-${a.asesor_id}`} position={[a.latitud, a.longitud]} icon={iconoMoto(colores[a.asesor_id] ?? COLOR_PENDIENTE)}>
                <Popup>
                  <Stack spacing={0.5} sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {`${a.nombre} ${a.apellido}`.toUpperCase()}
                    </Typography>
                    {a.agencia_nombre && <Typography variant="caption">{a.agencia_nombre}</Typography>}
                    <Typography variant="caption">Última actualización: {formatFechaHora(a.capturado_en)}</Typography>
                    {a.desactualizado && (
                      <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                        Ubicación desactualizada
                      </Typography>
                    )}
                  </Stack>
                </Popup>
              </Marker>
            ))}
            {clientesConCoordenadas.map((c) => (
              <Marker key={`cliente-${c.cliente_id}`} position={[c.latitud_cobranza, c.longitud_cobranza]} icon={iconoCliente(colorDeEstado(c.estado_visual))}>
                <Popup>
                  <Stack spacing={0.5} sx={{ minWidth: 200 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {`${c.nombre} ${c.apellido}`.toUpperCase()}
                    </Typography>
                    <Typography variant="caption">Asesor: {nombreAsesorPorId.get(c.asesor_id) ?? '—'}</Typography>
                    <Typography variant="caption">Lugar de cobranza: {LUGAR_COBRANZA_LABELS[c.lugar_cobranza]}</Typography>
                    {c.direccion_cobranza && <Typography variant="caption">{c.direccion_cobranza}</Typography>}
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {c.estado_visual === 'verde' ? 'Cobrado hoy' : c.estado_visual === 'amarillo' ? 'Permanencia confirmada' : 'Pendiente de visita'}
                    </Typography>
                    {c.permanencia.confirmada_en && (
                      <Typography variant="caption">Confirmada: {formatFechaHora(c.permanencia.confirmada_en)}</Typography>
                    )}
                    {!c.permanencia.confirmada_en && c.permanencia.inicio_en && (
                      <Typography variant="caption">En progreso desde: {formatFechaHora(c.permanencia.inicio_en)}</Typography>
                    )}
                    <Typography variant="caption">
                      {c.dias_atraso_max === 0 ? 'Vence hoy' : `${c.dias_atraso_max} días de atraso`} · Créditos: {c.credito_codigos.join(', ')}
                    </Typography>
                  </Stack>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </ExpandableMap>
      )}

      {!isLoading && sinUbicacionCobranza > 0 && (
        <Typography variant="caption" sx={{ color: 'warning.main' }}>
          {sinUbicacionCobranza === 1
            ? '1 cliente sin ubicación de cobranza registrada — no se muestra en el mapa.'
            : `${sinUbicacionCobranza} clientes sin ubicación de cobranza registrada — no se muestran en el mapa.`}
        </Typography>
      )}

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
        <Leyenda color={COLOR_PENDIENTE} label="Pendiente de visita" />
        <Leyenda color={COLOR_AMARILLO} label="Permanencia confirmada" />
        <Leyenda color={COLOR_VERDE} label="Cobrado hoy" />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Cada asesor (ícono de moto) tiene su propio color, estable mientras esté visible.
        </Typography>
      </Stack>
    </Stack>
  );
}

function Leyenda({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Stack sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
  );
}
