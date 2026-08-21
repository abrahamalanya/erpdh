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
import { enviarInteres, getTiendaBien } from '../api/tienda';
import { BIEN_TIPO_LABELS } from '../utils/creditoPrendarioHierarchy';
import { formatMonto } from '../utils/format';
import type { TiendaBien } from '../types/api';

interface FormState {
  nombre: string;
  telefono: string;
  email: string;
  mensaje: string;
}

const emptyForm: FormState = { nombre: '', telefono: '', email: '', mensaje: '' };

export function TiendaBienPage() {
  const { id } = useParams<{ id: string }>();
  const bienId = Number(id);

  const [bien, setBien] = useState<TiendaBien | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);

    getTiendaBien(bienId)
      .then((res) => setBien(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Este bien ya no está disponible'))
      .finally(() => setIsLoading(false));
  }, [bienId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSendError(null);
    setIsSending(true);

    try {
      await enviarInteres(bienId, {
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

  if (loadError || !bien) {
    return (
      <Container maxWidth="sm" sx={{ py: 5 }}>
        <Alert severity="error">{loadError ?? 'No encontrado'}</Alert>
        <Button component={RouterLink} to="/tienda" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
          Volver a la tienda
        </Button>
      </Container>
    );
  }

  const fotos = bien.fotos.length > 0 ? bien.fotos.map((f) => f.url) : bien.foto_cliente_producto_url ? [bien.foto_cliente_producto_url] : [];

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
              alt={bien.nombre}
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
            <Chip label={BIEN_TIPO_LABELS[bien.tipo]} size="small" sx={{ alignSelf: 'flex-start' }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {bien.nombre}
            </Typography>
            {(bien.marca || bien.modelo) && (
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                {[bien.marca, bien.modelo].filter(Boolean).join(' / ')}
              </Typography>
            )}
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {formatMonto(bien.valorizacion)}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Estado: {bien.puntaje}/10
              {bien.agencia && ` · ${bien.agencia.nombre}`}
              {bien.empresa && ` · ${bien.empresa.nombre}`}
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
