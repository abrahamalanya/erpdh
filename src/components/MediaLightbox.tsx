import { Box, Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export interface MediaLightboxItem {
  type: 'image' | 'video' | 'pdf';
  url: string;
  label?: string;
}

interface MediaLightboxProps {
  item: MediaLightboxItem | null;
  onClose: () => void;
}

/**
 * Full-screen-ish viewer for a single image/video, opened by clicking a
 * thumbnail. Offers "open in a new tab" as an explicit action instead of
 * that being the default click behavior.
 */
export function MediaLightbox({ item, onClose }: MediaLightboxProps) {
  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <span>
          {item?.label ||
            (item?.type === 'video' ? 'Video' : item?.type === 'pdf' ? 'Documento' : 'Imagen')}
        </span>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Abrir en otra pestaña">
            <IconButton component="a" href={item?.url} target="_blank" rel="noreferrer" size="small">
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cerrar">
            <IconButton onClick={onClose} size="small" aria-label="Cerrar">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>
      <DialogContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'black',
          p: 0,
          minHeight: 240,
        }}
      >
        {item?.type === 'video' ? (
          <Box
            component="video"
            src={item.url}
            controls
            autoPlay
            sx={{ maxWidth: '100%', maxHeight: '80vh' }}
          />
        ) : item?.type === 'pdf' ? (
          <Box
            component="iframe"
            src={item.url}
            title={item.label ?? 'Documento'}
            sx={{ width: '100%', height: '80vh', border: 0, bgcolor: 'common.white' }}
          />
        ) : (
          item && (
            <Box
              component="img"
              src={item.url}
              alt={item.label ?? ''}
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
