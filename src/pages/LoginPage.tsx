import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useAppConfig } from '../hooks/useAppConfig';

const REMEMBERED_EMAIL_KEY = 'remembered_email';

/**
 * Solo el email se guarda localmente. La contraseña nunca se persiste aquí:
 * localStorage es legible por cualquier script con acceso a la página
 * (XSS), así que guardar credenciales ahí sería exponerlas en texto plano.
 * El propio gestor de contraseñas del navegador (autoComplete a continuación)
 * ya puede ofrecerse a recordar la contraseña de forma segura.
 */
function leerEmailRecordado(): string {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function LoginPage() {
  const { login } = useAuth();
  const { nombreApp } = useAppConfig();
  const navigate = useNavigate();

  const [email, setEmail] = useState(leerEmailRecordado);
  const [password, setPassword] = useState('');
  const [recordarme, setRecordarme] = useState(() => leerEmailRecordado() !== '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);

      try {
        if (recordarme) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch {
        // localStorage puede fallar (modo privado, cuota, etc.) — no es crítico para el login.
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Container
      component="main"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: 3,
      }}
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={1} sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{
            fontWeight: 700
          }}>
            {nombreApp}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Inicia sesión para continuar
          </Typography>
        </Stack>

        <Stack spacing={2.5}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
              />
            }
            label="Recuérdame"
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
