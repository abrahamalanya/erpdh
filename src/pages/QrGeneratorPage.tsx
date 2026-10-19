import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { downloadBlob } from '../utils/download';
import { generarQr } from '../api/qr';

export function QrGeneratorPage() {
  const { user } = useAuth();

  const [url, setUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isGenerando, setIsGenerando] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrBlob, setQrBlob] = useState<Blob | null>(null);

  if (!hasRole(user, 'sistemas', 'administrador_general')) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    try {
      new URL(url);
    } catch {
      setFormError('Ingresa una URL válida (debe incluir https:// o http://)');
      return;
    }

    setIsGenerando(true);

    try {
      const blob = await generarQr(url);

      if (qrUrl) URL.revokeObjectURL(qrUrl);

      setQrBlob(blob);
      setQrUrl(URL.createObjectURL(blob));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsGenerando(false);
    }
  }

  function handleDescargar() {
    if (qrBlob) downloadBlob(qrBlob, 'qr.png');
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 480 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Generador de códigos QR
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Genera un código QR a partir de una URL y descárgalo como imagen PNG.
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          {formError && <Alert severity="error">{formError}</Alert>}

          <TextField
            label="URL"
            placeholder="https://ejemplo.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            autoFocus
          />

          <Button type="submit" variant="contained" disabled={isGenerando} sx={{ alignSelf: 'flex-start' }}>
            {isGenerando ? 'Generando...' : 'Generar'}
          </Button>
        </Stack>
      </Box>

      {qrUrl && (
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Box component="img" src={qrUrl} alt="Código QR generado" sx={{ width: 240, height: 240 }} />
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDescargar}>
            Descargar PNG
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
