import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CollectionsIcon from '@mui/icons-material/Collections';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VideocamIcon from '@mui/icons-material/Videocam';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { MediaLightbox, type MediaLightboxItem } from './MediaLightbox';
import { downscaleImage } from '../utils/image';
import type { BienFoto } from '../types/api';

function prefersCoarsePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

/**
 * Object URL for a single picked file, revoked whenever the file changes or the
 * component unmounts. Falls back to `currentUrl` when there is no local file.
 * Building the URL in render (as a bare `useMemo`) never frees it, so several
 * replaced photos leak their full bytes for the life of the page.
 */
function useObjectUrl(file: File | null, currentUrl?: string | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(currentUrl ?? undefined);

  useEffect(() => {
    if (!file) {
      setUrl(currentUrl ?? undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, currentUrl]);

  return url;
}

/** Same as {@link useObjectUrl} for a list of files. */
function useObjectUrls(files: File[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const objectUrls = files.map((file) => URL.createObjectURL(file));
    setUrls(objectUrls);
    return () => objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  }, [files]);

  return urls;
}

interface UploadPhotoButtonProps {
  buttonLabel: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  sx?: SxProps<Theme>;
}

/**
 * Upload trigger that lets mobile users pick between the camera and the gallery.
 * On Android a plain file input without `capture` opens the gallery-only photo
 * picker, so on touch devices we surface an explicit menu with a camera input
 * (`capture="environment"`) and a gallery input. On desktop it just opens the
 * normal file dialog.
 */
function UploadPhotoButton({
  buttonLabel,
  accept,
  multiple = false,
  onFiles,
  sx,
}: UploadPhotoButtonProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [processing, setProcessing] = useState(false);
  const showMenu = prefersCoarsePointer();

  const emit = async (input: HTMLInputElement): Promise<void> => {
    const raw = Array.from(input.files ?? []);
    input.value = '';
    if (raw.length === 0) {
      return;
    }
    setProcessing(true);
    try {
      const processed = await Promise.all(raw.map((file) => downscaleImage(file)));
      onFiles(processed);
    } finally {
      setProcessing(false);
    }
  };

  const handleButtonClick = (event: MouseEvent<HTMLButtonElement>): void => {
    if (showMenu) {
      setMenuAnchor(event.currentTarget);
    } else {
      galleryInputRef.current?.click();
    }
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        disabled={processing}
        startIcon={
          processing ? <CircularProgress size={16} /> : <CloudUploadIcon fontSize="small" />
        }
        onClick={handleButtonClick}
        sx={sx}
      >
        {processing ? 'Procesando…' : buttonLabel}
      </Button>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            cameraInputRef.current?.click();
          }}
        >
          <ListItemIcon>
            <PhotoCameraIcon fontSize="small" />
          </ListItemIcon>
          Tomar foto
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            galleryInputRef.current?.click();
          }}
        >
          <ListItemIcon>
            <CollectionsIcon fontSize="small" />
          </ListItemIcon>
          Elegir de galería
        </MenuItem>
      </Menu>

      <input
        ref={cameraInputRef}
        type="file"
        hidden
        accept={accept}
        capture="environment"
        onChange={(e) => {
          void emit(e.currentTarget);
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          void emit(e.currentTarget);
        }}
      />
    </>
  );
}

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
  accept = 'image/*',
}: PhotoFieldProps) {
  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);
  const previewUrl = useObjectUrl(file, currentUrl);

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
        <UploadPhotoButton
          buttonLabel={file || currentUrl ? 'Reemplazar' : 'Subir'}
          accept={accept}
          onFiles={(files) => onChange(files[0] ?? null)}
        />
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
  const previewUrl = useObjectUrl(file, currentUrl);

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
  const previews = useObjectUrls(files);

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
          {files.map((_, index) => {
            const url = previews[index];
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
                        onClick={() => url && setLightbox({ type: 'image', url })}
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

      <UploadPhotoButton
        buttonLabel="Agregar"
        accept="image/*"
        multiple
        onFiles={(newFiles) => onChange([...files, ...newFiles])}
        sx={{ alignSelf: 'flex-start' }}
      />
      {existing.length > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Las fotos ya guardadas no se pueden eliminar desde aquí.
        </Typography>
      )}

      <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />
    </Stack>
  );
}
