import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useAppConfig } from '../hooks/useAppConfig';
import { hasRole } from '../utils/roles';
import { PhotoField } from '../components/MediaFields';
import { updateConfiguracion } from '../api/configuracion';

export function ConfiguracionSistemaPage() {
  const { user } = useAuth();
  const { nombreApp, faviconUrl, refresh } = useAppConfig();

  const [nombre, setNombre] = useState(nombreApp);
  const [favicon, setFavicon] = useState<File | null>(null);

  useEffect(() => setNombre(nombreApp), [nombreApp]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!hasRole(user, 'sistemas')) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSaved(false);
    setIsSaving(true);

    try {
      await updateConfiguracion({ nombre_app: nombre, favicon });
      setFavicon(null);
      refresh();
      setSaved(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 480 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Configuración del sistema
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Nombre e ícono que se muestran en el login y en la barra de navegación de todo el sistema.
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {saved && <Alert severity="success">Configuración actualizada</Alert>}

          <TextField
            label="Nombre del sistema"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          <PhotoField
            label="Favicon"
            file={favicon}
            currentUrl={faviconUrl}
            onChange={setFavicon}
            accept="image/png,image/x-icon,image/svg+xml,image/jpeg"
          />

          <Button type="submit" variant="contained" disabled={isSaving} sx={{ alignSelf: 'flex-start' }}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
