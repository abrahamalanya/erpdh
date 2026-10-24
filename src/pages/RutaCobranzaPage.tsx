import { useEffect, useMemo, useState, type DragEvent, type MouseEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaidIcon from '@mui/icons-material/Paid';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, hasRole } from '../utils/roles';
import { canVerCreditos, TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import { canEditCliente, tieneEdicionTemporalCliente } from '../utils/clienteHierarchy';
import { ClienteEditDialog } from '../components/ClienteEditDialog';
import { getCliente } from '../api/clientes';
import {
  clonarClienteRutaCobranza,
  getAsesoresRuta,
  getRutaCobranza,
  quitarClienteRutaCobranza,
  reordenarRutaCobranza,
  TIPOS_RUTA_COBRANZA,
  type AsesorRuta,
  type RutaClienteItem,
  type RutaCreditoItem,
} from '../api/rutasCobranza';
import type { Cliente, TipoCredito, User } from '../types/api';
import { ErrorBanner } from '../components/ErrorBanner';

const SEGMENTO_POR_TIPO: Record<TipoCredito, string> = {
  prendario: 'prendarios',
  vehicular: 'vehiculares',
  hipotecario: 'hipotecarios',
  diario: 'diarios',
};

function puedeEditarDesdeRuta(user: User | null, clienteId: number): boolean {
  if (hasRole(user, 'asesor') && !hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia', 'peinadora')) {
    return tieneEdicionTemporalCliente(user, clienteId);
  }

  return hasPermission(user, 'clientes.editar');
}

export function RutaCobranzaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const esSupervisor = hasRole(user, 'supervisor');
  // El supervisor también elige asesor: arma su propia ruta con paradas copiadas
  // de las rutas de los suyos, así que necesita verlas para elegir de dónde quitar.
  const puedeElegirAsesor = esSupervisor || hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia');

  const [asesores, setAsesores] = useState<AsesorRuta[]>([]);
  const [asesorId, setAsesorId] = useState<number | ''>('');
  const [tipoCredito, setTipoCredito] = useState<TipoCredito | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ruta, setRuta] = useState<RutaClienteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Cliente | null>(null);
  const [editandoClienteId, setEditandoClienteId] = useState<number | null>(null);
  const [paradaClienteId, setParadaClienteId] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [creditoMenu, setCreditoMenu] = useState<{ el: HTMLElement; creditos: RutaCreditoItem[]; accion: 'detalle' | 'cobrar' } | null>(null);

  const tipoCreditoActual = tipoCredito === 'todos' ? undefined : tipoCredito;
  /** Sin asesor elegido se ve la ruta propia: la del supervisor (lo que él armó) o la del asesor. */
  const viendoRutaPropia = asesorId === '';
  /** Los admins no tienen ruta propia que mirar: tienen que elegir un asesor primero. */
  const esperaAsesor = puedeElegirAsesor && !esSupervisor && !asesorId;
  // Reordenar solo es válido sobre la ruta propia: la de otro asesor la ordena su asesor.
  const puedeReordenar = !puedeElegirAsesor || (esSupervisor && viendoRutaPropia);

  const nombresAsesores = useMemo(
    () => new Map(asesores.map((a) => [a.id, `${a.nombre} ${a.apellido}`.toUpperCase()])),
    [asesores]
  );

  const busquedaNormalizada = busqueda.trim().toLowerCase();
  const rutaFiltrada = busquedaNormalizada
    ? ruta.filter(
        (fila) =>
          `${fila.nombre} ${fila.apellido}`.toLowerCase().includes(busquedaNormalizada) ||
          (fila.numero_documento ?? '').toLowerCase().includes(busquedaNormalizada)
      )
    : ruta;
  const permiteArrastrar = puedeReordenar && !busquedaNormalizada;

  const textoAyuda = esSupervisor
    ? viendoRutaPropia
      ? 'Tus paradas de visita, en el orden en que planeas recorrerlas: los clientes que agregaste desde la ruta de tus asesores (ellos siguen teniéndolos en su cartera y en su ruta). Arrastra una fila para cambiar su posición — el orden se guarda automáticamente y se mantiene entre días. Cada tipo de crédito tiene su propia ruta y su propio orden.'
      : 'Estás viendo la ruta del asesor. Puedes agregar a tu ruta cualquier cliente en mora que aparece aquí — elige los que vas a visitar personally; el cliente no sale de la cartera ni de la ruta de su asesor.'
    : puedeReordenar
      ? 'Tus clientes con una cuota vencida u hoy, en el orden en que planeas visitarlos. Arrastra una fila para cambiar su posición — el orden se guarda automáticamente y se mantiene entre días. Cada tipo de crédito tiene su propia ruta y su propio orden.'
      : 'Clientes con una cuota vencida u hoy, en el orden que el asesor definió. Solo el propio asesor puede reordenar su ruta.';

  const detalleTipo = tipoCredito === 'todos' ? '' : ` en créditos de tipo ${TIPO_CREDITO_LABELS[tipoCredito].toLowerCase()}`;
  const textoRutaVacia =
    esSupervisor && viendoRutaPropia
      ? 'Todavía no agregaste ninguna parada. Elige la ruta de uno de tus asesores y agrega los clientes que quieras visitar.'
      : viendoRutaPropia
        ? `No tienes clientes con cuotas vencidas ni por vencer hoy${detalleTipo}.`
        : `Este asesor no tiene clientes con cuotas vencidas ni por vencer hoy${detalleTipo}.`;

  useEffect(() => {
    if (puedeElegirAsesor) {
      getAsesoresRuta()
        .then((res) => setAsesores(res.data))
        .catch(() => setAsesores([]));
    }
  }, [puedeElegirAsesor]);

  function loadRuta() {
    if (esperaAsesor) {
      setRuta([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    getRutaCobranza(asesorId || undefined, tipoCreditoActual)
      .then((res) => setRuta(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadRuta, [tipoCredito, asesorId, puedeElegirAsesor]);

  if (!canVerCreditos(user)) {
    return <Navigate to="/" replace />;
  }

  /** La ruta solo trae lo justo para mostrar la parada; el diálogo de edición necesita el cliente completo. */
  async function handleEditarCliente(clienteId: number) {
    setEditandoClienteId(clienteId);
    setLoadError(null);

    try {
      const res = await getCliente(clienteId);

      if (!canEditCliente(user, res.data)) {
        setLoadError('No tienes permiso para editar este cliente.');
        return;
      }

      setEditTarget(res.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setEditandoClienteId(null);
    }
  }

  function irACredito(credito: RutaCreditoItem, accion: 'detalle' | 'cobrar') {
    navigate(`/creditos-prendarios/${SEGMENTO_POR_TIPO[credito.tipo_credito]}?credito_id=${credito.id}&accion=${accion}`);
  }

  function handleAccionCredito(event: MouseEvent<HTMLElement>, creditos: RutaCreditoItem[], accion: 'detalle' | 'cobrar') {
    if (creditos.length === 1) {
      irACredito(creditos[0], accion);
      return;
    }

    setCreditoMenu({ el: event.currentTarget, creditos, accion });
  }

  function irANuevaSolicitud(clienteId: number) {
    navigate(`/creditos-prendarios?cliente_id=${clienteId}&accion=nueva-solicitud`);
  }

  function irAPagosCliente(clienteId: number) {
    navigate(`/cobros?cliente_id=${clienteId}`);
  }

  /**
   * Agrega (o quita) una parada de la ruta propia del supervisor. Ambas
   * respuestas traen su ruta ya actualizada: si lo que se está viendo es la
   * ruta de un asesor, se recarga esa para que `en_mi_ruta` quede al día.
   */
  async function handleAlternarParada(fila: RutaClienteItem, accion: 'agregar' | 'quitar') {
    setParadaClienteId(fila.cliente_id);
    setLoadError(null);

    try {
      const res =
        accion === 'agregar'
          ? await clonarClienteRutaCobranza(fila.cliente_id, tipoCreditoActual)
          : await quitarClienteRutaCobranza(fila.cliente_id, tipoCreditoActual);

      if (viendoRutaPropia) {
        setRuta(res.data);
      } else {
        loadRuta();
      }

      setAviso(res.message);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setParadaClienteId(null);
    }
  }

  function handleDragStart(clienteId: number) {
    setDraggingId(clienteId);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, sobreClienteId: number) {
    event.preventDefault();
    if (draggingId === null || draggingId === sobreClienteId) return;

    setRuta((actual) => {
      const desde = actual.findIndex((r) => r.cliente_id === draggingId);
      const hasta = actual.findIndex((r) => r.cliente_id === sobreClienteId);
      if (desde === -1 || hasta === -1) return actual;

      const copia = [...actual];
      const [movido] = copia.splice(desde, 1);
      copia.splice(hasta, 0, movido);
      return copia;
    });
  }

  async function handleDrop() {
    if (draggingId === null) return;
    setDraggingId(null);

    setIsSaving(true);
    setLoadError(null);
    try {
      const res = await reordenarRutaCobranza(ruta.map((r) => r.cliente_id), tipoCreditoActual);
      setRuta(res.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
      loadRuta();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Mi ruta de cobranza
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {textoAyuda}
      </Typography>

      {puedeElegirAsesor && (
        <TextField
          select
          label="Asesor"
          size="small"
          value={asesorId}
          onChange={(e) => setAsesorId(e.target.value ? Number(e.target.value) : '')}
          sx={{ maxWidth: 320 }}
        >
          {/* Para el supervisor la opción vacía es su propia ruta, no un "elegí asesor". */}
          <MenuItem value="">{esSupervisor ? 'Mi ruta' : 'Selecciona un asesor'}</MenuItem>
          {asesores.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {`${a.nombre} ${a.apellido}`.toUpperCase()}
            </MenuItem>
          ))}
        </TextField>
      )}

      <ToggleButtonGroup
        exclusive
        size="small"
        color="primary"
        value={tipoCredito}
        onChange={(_, valor: TipoCredito | 'todos' | null) => valor && setTipoCredito(valor)}
        sx={{ flexWrap: 'wrap', alignSelf: 'flex-start' }}
      >
        <ToggleButton value="todos">Todos</ToggleButton>
        {TIPOS_RUTA_COBRANZA.map((tipo) => (
          <ToggleButton key={tipo} value={tipo}>
            {TIPO_CREDITO_LABELS[tipo]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <TextField
        label="Buscar"
        placeholder="Nombre, apellido o DNI"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        size="small"
        sx={{ maxWidth: 320 }}
      />

      <ErrorBanner error={loadError} />

      {isLoading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Cargando...
        </Typography>
      ) : esperaAsesor ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Elige un asesor para ver su ruta.
        </Typography>
      ) : ruta.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {textoRutaVacia}
        </Typography>
      ) : rutaFiltrada.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Ningún cliente coincide con la búsqueda.
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ opacity: isSaving ? 0.6 : 1 }}>
          {rutaFiltrada.map((fila) => (
            <Card
              key={fila.cliente_id}
              variant="outlined"
              draggable={permiteArrastrar}
              onDragStart={permiteArrastrar ? () => handleDragStart(fila.cliente_id) : undefined}
              onDragOver={permiteArrastrar ? (e) => handleDragOver(e, fila.cliente_id) : undefined}
              onDrop={permiteArrastrar ? handleDrop : undefined}
              onDragEnd={permiteArrastrar ? () => setDraggingId(null) : undefined}
              sx={{ cursor: permiteArrastrar ? 'grab' : 'default', bgcolor: fila.cobrado_hoy ? (theme) => theme.palette.mode === 'dark' ? '#163c23' : '#e8f5e9' : undefined, borderColor: draggingId === fila.cliente_id ? 'primary.main' : fila.cobrado_hoy ? 'success.main' : undefined }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', '&:last-child': { pb: 2 } }}>
                {permiteArrastrar && <DragIndicatorIcon sx={{ color: 'text.disabled' }} />}
                {fila.cobrado_hoy && <Chip label="Cobrado hoy" size="small" color="success" />}
                <Chip label={fila.orden} size="small" color="primary" sx={{ fontWeight: 700 }} />
                <Stack spacing={0.25} sx={{ flex: 1, minWidth: 180 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {`${fila.nombre} ${fila.apellido}`.toUpperCase()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {fila.numero_documento ?? 'Sin documento registrado'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {fila.direccion ?? 'Sin dirección registrada'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Créditos: {fila.credito_codigos.join(', ')}
                  </Typography>
                </Stack>
                {fila.dias_atraso_max === 0 ? (
                  <Chip label="Vence hoy" size="small" color="warning" />
                ) : (
                  <Chip label={`${fila.dias_atraso_max} días de atraso`} size="small" color="error" />
                )}

                {/* En la ruta propia del supervisor, de qué asesor copió la parada. */}
                {esSupervisor && fila.clonado && (
                  <Tooltip title={`Parada copiada de la ruta de ${nombresAsesores.get(fila.asesor_id) ?? 'otro asesor'}`}>
                    <Chip
                      label={nombresAsesores.get(fila.asesor_id) ?? `Asesor #${fila.asesor_id}`}
                      size="small"
                      variant="outlined"
                    />
                  </Tooltip>
                )}

                {/* Mirando la ruta de un asesor: agregar/quitar la parada de la ruta propia. */}
                {esSupervisor && !viendoRutaPropia && (
                  <Tooltip title={fila.en_mi_ruta ? 'Esta parada ya está en tu ruta' : 'Agregar esta parada a tu ruta'}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Agregar a mi ruta"
                        color="primary"
                        disabled={fila.en_mi_ruta || paradaClienteId === fila.cliente_id}
                        onClick={() => handleAlternarParada(fila, 'agregar')}
                      >
                        {paradaClienteId === fila.cliente_id ? (
                          <CircularProgress size={16} />
                        ) : fila.en_mi_ruta ? (
                          <PlaylistAddCheckIcon fontSize="small" />
                        ) : (
                          <PlaylistAddIcon fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                {esSupervisor && viendoRutaPropia && fila.clonado && (
                  <Tooltip title="Quitar esta parada de tu ruta (el cliente sigue en la ruta de su asesor)">
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Quitar de mi ruta"
                        color="error"
                        disabled={paradaClienteId === fila.cliente_id}
                        onClick={() => handleAlternarParada(fila, 'quitar')}
                      >
                        {paradaClienteId === fila.cliente_id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <PlaylistRemoveIcon fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                )}

                <Tooltip title="Ver detalle del crédito">
                  <IconButton
                    size="small"
                    aria-label="Ver detalle del crédito"
                    onClick={(e) => handleAccionCredito(e, fila.creditos, 'detalle')}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Pagar crédito">
                  <IconButton
                    size="small"
                    aria-label="Pagar crédito"
                    onClick={(e) => handleAccionCredito(e, fila.creditos, 'cobrar')}
                  >
                    <PaidIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Nueva solicitud de crédito">
                  <IconButton
                    size="small"
                    aria-label="Nueva solicitud de crédito"
                    onClick={() => irANuevaSolicitud(fila.cliente_id)}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Pagos realizados por el cliente">
                  <IconButton
                    size="small"
                    aria-label="Pagos realizados por el cliente"
                    onClick={() => irAPagosCliente(fila.cliente_id)}
                  >
                    <PaymentsIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {puedeEditarDesdeRuta(user, fila.cliente_id) && (
                  <Tooltip title="Editar cliente">
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Editar cliente"
                        disabled={editandoClienteId === fila.cliente_id}
                        onClick={() => handleEditarCliente(fila.cliente_id)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Menu anchorEl={creditoMenu?.el} open={!!creditoMenu} onClose={() => setCreditoMenu(null)}>
        {creditoMenu?.creditos.map((credito) => (
          <MenuItem
            key={credito.id}
            onClick={() => {
              irACredito(credito, creditoMenu.accion);
              setCreditoMenu(null);
            }}
          >
            {credito.codigo}
          </MenuItem>
        ))}
      </Menu>

      <ClienteEditDialog
        cliente={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          loadRuta();
        }}
      />

      <Snackbar
        open={!!aviso}
        autoHideDuration={3000}
        onClose={() => setAviso(null)}
        message={aviso ?? ''}
      />
    </Stack>
  );
}
