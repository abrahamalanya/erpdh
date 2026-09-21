import { useEffect, useState, type DragEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../hooks/useAuth';
import { canVerCreditos, TIPO_CREDITO_LABELS } from '../utils/creditoPrendarioHierarchy';
import { canEditCliente } from '../utils/clienteHierarchy';
import { ClienteEditDialog } from '../components/ClienteEditDialog';
import { getCliente } from '../api/clientes';
import {
  getRutaCobranza,
  reordenarRutaCobranza,
  TIPOS_RUTA_COBRANZA,
  type RutaClienteItem,
} from '../api/rutasCobranza';
import type { Cliente, TipoCredito } from '../types/api';

export function RutaCobranzaPage() {
  const { user } = useAuth();

  const [tipoCredito, setTipoCredito] = useState<TipoCredito | 'todos'>('todos');
  const [ruta, setRuta] = useState<RutaClienteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Cliente | null>(null);
  const [editandoClienteId, setEditandoClienteId] = useState<number | null>(null);

  function loadRuta() {
    setIsLoading(true);
    setLoadError(null);

    getRutaCobranza(undefined, tipoCredito === 'todos' ? undefined : tipoCredito)
      .then((res) => setRuta(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadRuta, [tipoCredito]);

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
        Tus clientes con una cuota vencida u hoy, en el orden en que planeas visitarlos. Arrastra una fila para
        cambiar su posición — el orden se guarda automáticamente y se mantiene entre días. Cada tipo de crédito
        tiene su propia ruta y su propio orden.
      </Typography>

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
              draggable
              onDragStart={() => handleDragStart(fila.cliente_id)}
              onDragOver={(e) => handleDragOver(e, fila.cliente_id)}
              onDrop={handleDrop}
              onDragEnd={() => setDraggingId(null)}
              sx={{ cursor: 'grab', borderColor: draggingId === fila.cliente_id ? 'primary.main' : undefined }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, '&:last-child': { pb: 2 } }}>
                <DragIndicatorIcon sx={{ color: 'text.disabled' }} />
                <Chip label={fila.orden} size="small" color="primary" sx={{ fontWeight: 700 }} />
                <Stack spacing={0.25} sx={{ flex: 1 }}>
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
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

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
