import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { HistorialPlaybackMap } from '../components/HistorialPlaybackMap';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../hooks/useAuth';
import { hasPermission } from '../utils/roles';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  getAsesoresVisiblesUbicacion,
  getHistorialAsesor,
  type AsesorUbicacion,
  type HistorialAsesor,
  type HistorialCobro,
  type HistorialCobroCuota,
  type HistorialPunto,
} from '../api/ubicaciones';
import { formatFechaHora, formatMonto, capitalize } from '../utils/format';
import { COBRO_OPERACION_COLOR, COBRO_OPERACION_LABELS } from '../utils/cobranzaHierarchy';
import { TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import type { TipoCredito } from '../types/api';

/** "#3 (S/ 15.00)", "#4, #5" — lo que un cobro abonó, para la columna "Cuotas". */
function resumenCuotas(cuotas: HistorialCobroCuota[]): string {
  if (cuotas.length === 0) return '—';
  return cuotas
    .map((c) => {
      const monto = c.monto_cuota ?? c.monto_total ?? null;
      return `#${c.numero_cuota ?? '?'}${monto ? ` (${formatMonto(monto)})` : ''}`;
    })
    .join(', ');
}

/** "≈ 3.5 km"; 0 si no hay distancia (un solo punto o ninguno). */
function resumenDistancia(metros: number): string | null {
  if (metros === 0) return null;
  return `≈ ${(metros / 1000).toFixed(1)} km`;
}

/**
 * Reporte de historial de recorridos de un asesor: filtra por asesor, dispositivo y día, muestra los puntos capturados en una tabla y su recorrido en un
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
  const [fecha, setFecha] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
  const [equipo, setEquipo] = useState('');

  const [historial, setHistorial] = useState<HistorialAsesor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    if (!asesorId || !fecha) {
      setHistorial(null);
      return;
    }

    let active = true;
    setHistorial(null);
    setEquipo('');
    setIsLoading(true);
    setLoadError(null);

    getHistorialAsesor(asesorId, fecha)
      .then((res) => { if (active) setHistorial(res.data); })
      .catch((err) => { if (active) setLoadError(err instanceof Error ? err.message : 'Error desconocido'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [asesorId, fecha]);

  const puntos = historial?.puntos ?? [];

  const recorridos = historial?.recorridos ?? [];
  const recorrido = recorridos.find(r => String(r.dispositivo_id ?? 'legacy') === equipo) ?? recorridos[0];

  if (!puedeVer) {
    return <Navigate to="/" replace />;
  }

  const cobros = historial?.cobros ?? [];

  const columnasCobros: DataTableColumn<HistorialCobro>[] = [
    { header: 'Hora', render: (c) => formatFechaHora(c.created_at) },
    { header: 'Cliente', render: (c) => (c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}`.toUpperCase() : '—') },
    { header: 'Documento', render: (c) => c.cliente?.numero_documento ?? '—' },
    {
      header: 'Crédito',
      render: (c) => (c.credito ? `${c.credito.codigo} · ${TIPO_CREDITO_LABELS[c.credito.tipo_credito as TipoCredito] ?? c.credito.tipo_credito}` : '—'),
    },
    {
      header: 'Operación',
      render: (c) => <Chip label={COBRO_OPERACION_LABELS[c.operacion] ?? c.operacion} color={COBRO_OPERACION_COLOR[c.operacion] ?? 'default'} size="small" />,
    },
    { header: 'Monto pagado', align: 'right', render: (c) => formatMonto(c.monto_pagado) },
    { header: 'Interés', align: 'right', render: (c) => formatMonto(c.interes) },
    { header: 'Mora', align: 'right', render: (c) => (c.mora ? formatMonto(c.mora) : '—') },
    { header: 'Descuento', align: 'right', render: (c) => (c.descuento ? formatMonto(c.descuento) : '—') },
    { header: 'Vuelto', align: 'right', render: (c) => formatMonto(c.vuelto) },
    { header: 'Medio', render: (c) => capitalize(c.medio) },
    { header: 'Cuotas', render: (c) => resumenCuotas(c.cuotas) },
  ];

  const columns: DataTableColumn<HistorialPunto>[] = [
    { header: 'Dispositivo', render: (p) => p.dispositivo_id ? 'Equipo #' + p.dispositivo_id : 'Sin identificar' },
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
        <TextField label="Día" type="date" slotProps={{ inputLabel: { shrink: true } }} value={fecha} onChange={e => setFecha(e.target.value)} fullWidth />
        {recorridos.length > 0 && <TextField select label="Dispositivo" value={String(recorrido?.dispositivo_id ?? 'legacy')} onChange={e => setEquipo(e.target.value)} fullWidth>
          {recorridos.map(r => <MenuItem key={r.dispositivo_id ?? 'legacy'} value={String(r.dispositivo_id ?? 'legacy')}>{r.dispositivo_id ? 'Equipo #' + r.dispositivo_id : 'Registros anteriores sin dispositivo'}</MenuItem>)}
        </TextField>}
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
                    : 'Sin puntos en el día'
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
              No hay puntos registrados para este asesor en el día elegido.
            </Typography>
          ) : (
            recorrido ? <HistorialPlaybackMap key={asesorId + ':' + fecha + ':' + equipo} recorrido={recorrido} /> : null
          )}

          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Clientes cobrados {cobros.length > 0 && `(${cobros.length})`}
          </Typography>
          <DataTable
            columns={columnasCobros}
            rows={cobros}
            keyExtractor={(c) => c.id}
            isLoading={isLoading}
            emptyMessage="Este asesor no registró cobros en el día elegido"
            page={1}
            lastPage={1}
            onPageChange={() => {}}
          />

          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Puntos GPS del recorrido
          </Typography>
          <DataTable
            columns={columns}
            rows={puntos}
            keyExtractor={(p) => String(p.dispositivo_id) + ':' + p.capturado_en}
            isLoading={isLoading}
            emptyMessage="No hay puntos registrados para este asesor en el día elegido"
            page={1}
            lastPage={1}
            onPageChange={() => {}}
          />
        </>
      )}
    </Stack>
  );
}
