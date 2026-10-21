import { useState, type ReactNode } from 'react';
import { Box, Dialog, IconButton, Stack, Typography } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

interface ExpandableMapProps {
  title: string;
  /** Alto del recuadro colapsado — el mismo que ya usaba cada mapa. */
  height: number | string;
  children: ReactNode;
}

/**
 * Botón flotante "ampliar" sobre un mapa, igual al `ExpandableMap` del
 * aplicativo móvil (mismo nombre, mismo ícono fullscreen/fullscreen-exit):
 * al pulsarlo, el mapa pasa a un diálogo a pantalla completa con encabezado
 * y botón para volver.
 *
 * `children` (el `<MapContainer>` de turno) solo se renderiza en el
 * contenedor activo, así que se remonta al cambiar de modo — más simple que
 * mover el mismo mapa de lugar, y seguro porque todo lo que importa
 * (marcadores, posición seleccionada, datos ya cargados) vive en el estado
 * del componente padre, no en la cámara interna de Leaflet; solo se pierde
 * el encuadre de zoom/paneo que el usuario haya movido a mano.
 */
export function ExpandableMap({ title, height, children }: ExpandableMapProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Box sx={{ position: 'relative', height, borderRadius: 1, overflow: 'hidden' }}>
        {!expanded && children}
        {!expanded && (
          <IconButton
            aria-label={`Ampliar ${title}`}
            size="small"
            onClick={() => setExpanded(true)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <FullscreenIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Dialog
        fullScreen
        open={expanded}
        onClose={() => setExpanded(false)}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', px: 2, py: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
          >
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
              {title}
            </Typography>
            <IconButton aria-label="Salir de pantalla completa" onClick={() => setExpanded(false)}>
              <FullscreenExitIcon />
            </IconButton>
          </Stack>
          <Box sx={{ flex: 1, minHeight: 0 }}>{expanded && children}</Box>
        </Box>
      </Dialog>
    </>
  );
}
