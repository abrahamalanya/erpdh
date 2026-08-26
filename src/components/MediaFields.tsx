import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import VideocamIcon from '@mui/icons-material/Videocam';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { MediaLightbox, type MediaLightboxItem } from './MediaLightbox';
import type { BienFoto } from '../types/api';

interface PhotoFieldProps {
  label: string;
  file: File | null;
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
  accept?: string;
}

export function PhotoField({
  label,
  file,
  currentUrl,
  onChange,
  accept = 'image/jpeg,image/png',
}: PhotoFieldProps) {
  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : (currentUrl ?? undefined)),
    [file, currentUrl]
  );

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <Avatar
        src={previewUrl}
        variant="rounded"
        sx={{ width: 56, height: 56, cursor: previewUrl ? 'pointer' : 'default' }}
        onClick={() => previewUrl && setLightbox({ type: 'image', url: previewUrl, label })}
      >
        <ImageIcon />
      </Avatar>
      <Stack spacing={0.5}>
        <Typography variant="body2">{label}</Typography>
        <Button
          component="label"
          size="small"
          variant="outlined"
          startIcon={<CloudUploadIcon fontSize="small" />}
        >
          {file || currentUrl ? 'Reemplazar' : 'Subir'}
          <input
            type="file"
            hidden
            accept={accept}
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </Button>
      </Stack>
      <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />
    </Stack>
  );
}

interface VideoFieldProps {
  label: string;
  file: File | null;
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
}

export function VideoField({ label, file, currentUrl, onChange }: VideoFieldProps) {
  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : (currentUrl ?? undefined)),
    [file, currentUrl]
  );

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      {previewUrl ? (
        <Box sx={{ position: 'relative' }}>
          <video
            src={previewUrl}
            controls
            style={{ width: 120, height: 68, borderRadius: 4, background: '#000' }}
          />
          <Tooltip title="Ampliar">
            <IconButton
              size="small"
              aria-label="Ampliar video"
              onClick={() => setLightbox({ type: 'video', url: previewUrl, label })}
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <VisibilityIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box
          sx={{
            width: 120,
            height: 68,
            borderRadius: 1,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VideocamIcon color="disabled" />
        </Box>
      )}
      <Stack spacing={0.5}>
        <Typography variant="body2">{label}</Typography>
        <Button
          component="label"
          size="small"
          variant="outlined"
          startIcon={<CloudUploadIcon fontSize="small" />}
        >
          {file || currentUrl ? 'Reemplazar' : 'Subir'}
          <input
            type="file"
            hidden
            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </Button>
      </Stack>
      <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />
    </Stack>
  );
}

interface MultiPhotoFieldProps {
  /** Already-uploaded photos — the backend has no endpoint to delete these individually, so they're view-only here. */
  existing?: BienFoto[];
  files: File[];
  onChange: (files: File[]) => void;
}

export function MultiPhotoField({ existing = [], files, onChange }: MultiPhotoFieldProps) {
  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);

  return (
    <Stack spacing={1}>
      <Typography variant="body2">Fotos adicionales</Typography>

      {existing.length === 0 && files.length === 0 ? (
        <Box
          sx={{
            width: 90,
            height: 90,
            borderRadius: 1,
            border: '1px dashed',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
          }}
        >
          <ImageNotSupportedIcon color="disabled" fontSize="small" />
          <Stack direction="row">
            <IconButton size="small" aria-label="Ver foto" disabled>
              <VisibilityIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="Quitar foto" disabled>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      ) : (
        <ImageList cols={4} gap={8} sx={{ m: 0, maxHeight: 260 }}>
          {existing.map((foto) => (
            <ImageListItem key={`existing-${foto.id}`} sx={{ borderRadius: 1, overflow: 'hidden' }}>
              <img src={foto.url} alt="" loading="lazy" style={{ height: 90, objectFit: 'cover' }} />
              <ImageListItemBar
                position="top"
                sx={{ background: 'transparent' }}
                actionIcon={
                  <IconButton
                    size="small"
                    aria-label="Ver foto"
                    sx={{ color: 'white' }}
                    onClick={() => setLightbox({ type: 'image', url: foto.url })}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                }
              />
            </ImageListItem>
          ))}
          {files.map((file, index) => {
            const url = URL.createObjectURL(file);
            return (
              <ImageListItem key={`new-${index}`} sx={{ borderRadius: 1, overflow: 'hidden' }}>
                <img src={url} alt="" style={{ height: 90, objectFit: 'cover' }} />
                <ImageListItemBar
                  position="top"
                  sx={{ background: 'transparent' }}
                  actionIcon={
                    <Stack direction="row">
                      <IconButton
                        size="small"
                        aria-label="Ver foto"
                        sx={{ color: 'white' }}
                        onClick={() => setLightbox({ type: 'image', url })}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Quitar foto"
                        sx={{ color: 'white' }}
                        onClick={() => onChange(files.filter((_, i) => i !== index))}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                />
              </ImageListItem>
            );
          })}
        </ImageList>
      )}

      <Button
        component="label"
        size="small"
        variant="outlined"
        startIcon={<CloudUploadIcon fontSize="small" />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Agregar
        <input
          type="file"
          hidden
          multiple
          accept="image/jpeg,image/png"
          onChange={(e) => onChange([...files, ...Array.from(e.target.files ?? [])])}
        />
      </Button>
      {existing.length > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Las fotos ya guardadas no se pueden eliminar desde aquí.
        </Typography>
      )}

      <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />
    </Stack>
  );
}
