import { useEffect, useState, type DragEvent, type MouseEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
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
import { useAuth } from '../hooks/useAuth';
import { hasPermission, hasRole } from '../utils/roles';
import { canVerCreditos, TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import { canEditCliente, tieneEdicionTemporalCliente } from '../utils/clienteHierarchy';
import { ClienteEditDialog } from '../components/ClienteEditDialog';
import { getCliente } from '../api/clientes';
import {
  getAsesoresRuta,
  getRutaCobranza,
  reordenarRutaCobranza,
  TIPOS_RUTA_COBRANZA,
  type AsesorRuta,
  type RutaClienteItem,
  type RutaCreditoItem,
} from '../api/rutasCobranza';
import type { Cliente, TipoCredito, User } from '../types/api';

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
  const puedeElegirAsesor = hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia');

  const [asesores, setAsesores] = useState<AsesorRuta[]>([]);
  const [asesorId, setAsesorId] = useState<number | ''>('');
  const [tipoCredito, setTipoCredito] = useState<TipoCredito | 'todos'>('todos');
  const [ruta, setRuta] = useState<RutaClienteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Cliente | null>(null);
  const [editandoClienteId, setEditandoClienteId] = useState<number | null>(null);
  const [creditoMenu, setCreditoMenu] = useState<{ el: HTMLElement; creditos: RutaCreditoItem[]; accion: 'detalle' | 'cobrar' } | null>(null);

  const puedeReordenar = !puedeElegirAsesor;

  useEffect(() => {
    if (puedeElegirAsesor) {
      getAsesoresRuta()
        .then((res) => setAsesores(res.data))
        .catch(() => setAsesores([]));
    }
  }, [puedeElegirAsesor]);

  function loadRuta() {
    if (puedeElegirAsesor && !asesorId) {
      setRuta([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    getRutaCobranza(asesorId || undefined, tipoCredito === 'todos' ? undefined : tipoCredito)
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
      const res = await reordenarRutaCobranza(
        ruta.map((r) => r.cliente_id),
        tipoCredito === 'todos' ? undefined : tipoCredito
      );
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
        {puedeReordenar
          ? 'Tus clientes con una cuota vencida u hoy, en el orden en que planeas visitarlos. Arrastra una fila para cambiar su posición — el orden se guarda automáticamente y se mantiene entre días. Cada tipo de crédito tiene su propia ruta y su propio orden.'
          : 'Clientes con una cuota vencida u hoy, en el orden que el asesor definió. Solo el propio asesor puede reordenar su ruta.'}
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
          <MenuItem value="">Selecciona un asesor</MenuItem>
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

      {loadError && <Alert severity="error">{loadError}</Alert>}

      {isLoading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Cargando...
        </Typography>
      ) : puedeElegirAsesor && !asesorId ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Elige un asesor para ver su ruta.
        </Typography>
      ) : ruta.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {tipoCredito === 'todos'
            ? 'No tienes clientes con cuotas vencidas ni por vencer hoy.'
            : `No tienes clientes con cuotas vencidas ni por vencer hoy en créditos de tipo ${TIPO_CREDITO_LABELS[tipoCredito].toLowerCase()}.`}
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ opacity: isSaving ? 0.6 : 1 }}>
          {ruta.map((fila) => (
            <Card
              key={fila.cliente_id}
              variant="outlined"
              draggable={puedeReordenar}
              onDragStart={puedeReordenar ? () => handleDragStart(fila.cliente_id) : undefined}
              onDragOver={puedeReordenar ? (e) => handleDragOver(e, fila.cliente_id) : undefined}
              onDrop={puedeReordenar ? handleDrop : undefined}
              onDragEnd={puedeReordenar ? () => setDraggingId(null) : undefined}
              sx={{ cursor: puedeReordenar ? 'grab' : 'default', borderColor: draggingId === fila.cliente_id ? 'primary.main' : undefined }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', '&:last-child': { pb: 2 } }}>
                {puedeReordenar && <DragIndicatorIcon sx={{ color: 'text.disabled' }} />}
                <Chip label={fila.orden} size="small" color="primary" sx={{ fontWeight: 700 }} />
                <Stack spacing={0.25} sx={{ flex: 1, minWidth: 180 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {`${fila.nombre} ${fila.apellido}`.toUpperCase()}
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
    </Stack>
  );
}
