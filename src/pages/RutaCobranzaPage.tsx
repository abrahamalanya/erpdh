import { useEffect, useState, type DragEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useAuth } from '../hooks/useAuth';
import { canVerCreditos } from '../utils/creditoPrendarioHierarchy';
import { getRutaCobranza, reordenarRutaCobranza, type RutaClienteItem } from '../api/rutasCobranza';

export function RutaCobranzaPage() {
  const { user } = useAuth();

  const [ruta, setRuta] = useState<RutaClienteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  function loadRuta() {
    setIsLoading(true);
    setLoadError(null);

    getRutaCobranza()
      .then((res) => setRuta(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadRuta, []);

  if (!canVerCreditos(user)) {
    return <Navigate to="/" replace />;
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
      const res = await reordenarRutaCobranza(ruta.map((r) => r.cliente_id));
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
        cambiar su posición — el orden se guarda automáticamente y se mantiene entre días.
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      {isLoading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Cargando...
        </Typography>
      ) : ruta.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No tienes clientes con cuotas vencidas ni por vencer hoy.
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
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
