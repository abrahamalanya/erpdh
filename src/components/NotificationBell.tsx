import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  ListItemButton,
  ListItemText,
  Menu,
  Stack,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useAuth } from '../hooks/useAuth';
import { getEcho } from '../realtime/echo';
import {
  listNotificaciones,
  marcarLeidoNotificacion,
  marcarTodasLeidasNotificaciones,
} from '../api/notificaciones';
import type { Notificacion } from '../types/api';

function tiempoRelativo(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Generic notification inbox — any future notification type just needs to
 * follow the `{mensaje, url?}` data shape (see Notificacion in types/api.ts)
 * to show up here with no changes to this component.
 */
export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  function load() {
    setIsLoading(true);
    listNotificaciones()
      .then((res) => {
        setNotificaciones(res.data.notificaciones.data);
        setNoLeidas(res.data.no_leidas);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = getEcho().private(`App.Models.User.${user.id}`);
    const onNotification = (notificacion: Notificacion) => {
      setNotificaciones((prev) => [notificacion, ...prev].slice(0, 15));
      setNoLeidas((n) => n + 1);
    };

    channel.listen('.notificacion.creada', onNotification);

    return () => {
      channel.stopListening('.notificacion.creada', onNotification);
    };
  }, [user]);

  if (!user) return null;

  async function handleAbrir(notificacion: Notificacion) {
    setAnchorEl(null);

    if (!notificacion.read_at) {
      setNoLeidas((n) => Math.max(0, n - 1));
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === notificacion.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      marcarLeidoNotificacion(notificacion.id).catch(() => {});
    }

    if (notificacion.data.url) navigate(notificacion.data.url);
  }

  async function handleMarcarTodasLeidas() {
    setNoLeidas(0);
    setNotificaciones((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    marcarTodasLeidasNotificaciones().catch(() => {});
  }

  return (
    <>
      <IconButton
        color="inherit"
        aria-label="Notificaciones"
        onClick={(e) => {
          setAnchorEl(e.currentTarget);
          load();
        }}
        sx={{ mr: 0.5 }}
      >
        <Badge badgeContent={noLeidas} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 480 } } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Typography variant="subtitle2">Notificaciones</Typography>
          {noLeidas > 0 && (
            <Button size="small" onClick={handleMarcarTodasLeidas}>
              Marcar todas como leídas
            </Button>
          )}
        </Stack>
        <Divider />

        {isLoading && notificaciones.length === 0 ? (
          <Stack sx={{ alignItems: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : notificaciones.length === 0 ? (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No tienes notificaciones.
            </Typography>
          </Box>
        ) : (
          notificaciones.map((notificacion) => (
            <ListItemButton key={notificacion.id} onClick={() => handleAbrir(notificacion)} sx={{ py: 1 }}>
              <ListItemText
                primary={notificacion.data.mensaje}
                secondary={tiempoRelativo(notificacion.created_at)}
                slotProps={{
                  primary: { sx: { fontWeight: notificacion.read_at ? 400 : 700 }, variant: 'body2' },
                  secondary: { variant: 'caption' },
                }}
              />
              {!notificacion.read_at && (
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', ml: 1 }} />
              )}
            </ListItemButton>
          ))
        )}
      </Menu>
    </>
  );
}
