import { useEffect, useState, type FormEvent } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { enviarInteresArticulo, getTiendaArticulo } from '../api/tienda';
import { formatMonto } from '../utils/format';
import type { ArticuloTipo, TiendaArticulo } from '../types/api';

const ARTICULO_TIPO_LABELS: Record<ArticuloTipo, string> = {
  bien: 'Bien',
  vehiculo: 'Vehículo',
  inmueble: 'Inmueble',
};

interface FormState {
  nombre: string;
  telefono: string;
  email: string;
  mensaje: string;
}

const emptyForm: FormState = { nombre: '', telefono: '', email: '', mensaje: '' };

function detalleArticulo(a: TiendaArticulo): string {
  if (a.articulo_tipo === 'vehiculo') {
    return [a.marca, a.modelo, a.anio && `año ${a.anio}`, a.placa && `placa ${a.placa}`, a.color]
      .filter(Boolean)
      .join(' · ');
  }
  if (a.articulo_tipo === 'inmueble') {
    return [a.tipo_inmueble, a.direccion, a.distrito, a.provincia, a.area_terreno && `${a.area_terreno} m² terreno`]
      .filter(Boolean)
      .join(' · ');
  }
  return [a.marca, a.modelo].filter(Boolean).join(' / ');
}

export function TiendaBienPage() {
  const { tipo, id } = useParams<{ tipo: ArticuloTipo; id: string }>();
  const articuloId = Number(id);

  const [articulo, setArticulo] = useState<TiendaArticulo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!tipo) return;
    setIsLoading(true);
    setLoadError(null);

    getTiendaArticulo(tipo, articuloId)
      .then((res) => setArticulo(res.data))
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'Este artículo ya no está disponible')
      )
      .finally(() => setIsLoading(false));
  }, [tipo, articuloId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!tipo) return;
    setSendError(null);
    setIsSending(true);

    try {
      await enviarInteresArticulo(tipo, articuloId, {
        nombre: form.nombre,
        telefono: form.telefono,
        email: form.email || undefined,
        mensaje: form.mensaje || undefined,
      });
      setSent(true);
      setForm(emptyForm);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress color="inherit" />
      </Box>
    );
  }

  if (loadError || !articulo || !tipo) {
    return (
      <Container maxWidth="sm" sx={{ py: 5 }}>
        <Alert severity="error">{loadError ?? 'No encontrado'}</Alert>
        <Button component={RouterLink} to="/tienda" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
          Volver a la tienda
        </Button>
      </Container>
    );
  }

  const fotos =
    articulo.fotos.length > 0
      ? articulo.fotos.map((f) => f.url)
      : articulo.foto_cliente_producto_url
        ? [articulo.foto_cliente_producto_url]
        : [];

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Button component={RouterLink} to="/tienda" startIcon={<ArrowBackIcon />} sx={{ mb: 3 }}>
        Volver a la tienda
      </Button>

      <Stack spacing={4} direction={{ xs: 'column', md: 'row' }}>
        <Box sx={{ flex: 1 }}>
          <Card variant="outlined">
            <CardMedia
              component="img"
              height={320}
              image={fotos[0]}
              alt={articulo.nombre}
              sx={{ objectFit: 'cover', bgcolor: 'action.hover' }}
            />
          </Card>
          {fotos.length > 1 && (
            <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
              {fotos.slice(1).map((url) => (
                <Box
                  key={url}
                  component="img"
                  src={url}
                  sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1.5, bgcolor: 'action.hover' }}
                />
              ))}
            </Stack>
          )}
        </Box>

        <Box sx={{ flex: 1 }}>
          <Stack spacing={2}>
            <Chip
              label={ARTICULO_TIPO_LABELS[articulo.articulo_tipo]}
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {articulo.nombre}
            </Typography>
            {detalleArticulo(articulo) && (
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                {detalleArticulo(articulo)}
              </Typography>
            )}
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {formatMonto(articulo.precio_venta ?? articulo.valorizacion)}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {articulo.puntaje != null && `Estado: ${articulo.puntaje}/10`}
              {articulo.agencia && ` · ${articulo.agencia.nombre}`}
              {articulo.empresa && ` · ${articulo.empresa.nombre}`}
            </Typography>

            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                {sent ? (
                  <Alert severity="success">Gracias, en breve te contactaremos.</Alert>
                ) : (
                  <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Me interesa
                      </Typography>
                      {sendError && <Alert severity="error">{sendError}</Alert>}
                      <TextField
                        label="Nombre"
                        value={form.nombre}
                        onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                        required
                      />
                      <TextField
                        label="Teléfono"
                        value={form.telefono}
                        onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                        required
                      />
                      <TextField
                        label="Email (opcional)"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                      <TextField
                        label="Mensaje (opcional)"
                        value={form.mensaje}
                        onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))}
                        multiline
                        minRows={2}
                      />
                      <Button type="submit" variant="contained" disabled={isSending}>
                        {isSending ? 'Enviando...' : 'Enviar'}
                      </Button>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
