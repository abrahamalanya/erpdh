import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react';
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
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CollectionsIcon from '@mui/icons-material/Collections';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VideocamIcon from '@mui/icons-material/Videocam';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { MediaLightbox, type MediaLightboxItem } from './MediaLightbox';
import { ErrorBanner } from './ErrorBanner';
import { downscaleImage } from '../utils/image';
import { formatBytes } from '../utils/format';
import { etiquetaTipos, validarAdjunto, LIMITES_FOTO, LIMITES_VIDEO_EVIDENCIA, type LimitesAdjunto } from '../utils/adjuntos';

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

/** Clave para detectar duplicados dentro de la misma selección (requerimiento 6). */
function claveArchivo(file: File): string {
  return `${file.name}-${file.size}`;
}

interface ImageDropzoneProps {
  /** Texto bajo el icono. Cuadro chico (PhotoField) en vez de tarjeta ancha (MultiPhotoField). */
  compact?: boolean;
  label: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  processing?: boolean;
  /** Formatos/peso admitidos, mostrados como ayuda bajo el texto (solo variante ancha). */
  hint?: string;
  onFiles: (files: File[]) => void;
}

/**
 * Zona de arrastrar-y-soltar + seleccionar, usada tanto por `PhotoField` como
 * por `MultiPhotoField` — es el verdadero "componente reutilizable de carga
 * de imágenes" pedido; ambos campos públicos solo le agregan la lógica propia
 * de "una imagen" vs "varias imágenes ya guardadas y nuevas".
 *
 * En pantallas táctiles conserva el menú cámara-o-galería que ya existía
 * (un `<input>` sin `capture` abre el picker de solo-galería en Android).
 */
function ImageDropzone({
  compact = false,
  label,
  accept,
  multiple = false,
  disabled = false,
  processing = false,
  hint,
  onFiles,
}: ImageDropzoneProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const showMenu = prefersCoarsePointer();
  const inactive = disabled || processing;

  function emit(fileList: FileList | null): void {
    if (!fileList || fileList.length === 0) return;
    onFiles(Array.from(fileList));
  }

  function handleClick(event: MouseEvent<HTMLDivElement>): void {
    if (inactive) return;
    if (showMenu) {
      setMenuAnchor(event.currentTarget);
    } else {
      galleryInputRef.current?.click();
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragActive(false);
    if (inactive) return;
    emit(event.dataTransfer.files);
  }

  return (
    <>
      <Box
        role="button"
        tabIndex={inactive ? -1 : 0}
        aria-label={label}
        onClick={handleClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !inactive) {
            e.preventDefault();
            handleClick(e as unknown as MouseEvent<HTMLDivElement>);
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!inactive) setDragActive(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        sx={{
          border: '1px dashed',
          borderColor: dragActive ? 'text.primary' : 'divider',
          bgcolor: dragActive ? 'action.hover' : 'transparent',
          borderRadius: 2,
          cursor: inactive ? 'default' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 0.5,
          p: compact ? 1 : 3,
          width: compact ? 88 : '100%',
          height: compact ? 88 : undefined,
          minHeight: compact ? undefined : 148,
          transition: (theme) => theme.transitions.create(['background-color', 'border-color']),
          '&:focus-visible': { outline: '2px solid', outlineColor: 'text.primary', outlineOffset: 2 },
        }}
      >
        {processing ? (
          <CircularProgress size={compact ? 20 : 28} />
        ) : (
          <AddPhotoAlternateIcon color="disabled" fontSize={compact ? 'medium' : 'large'} />
        )}
        <Typography variant={compact ? 'caption' : 'body2'} sx={{ color: compact ? 'text.secondary' : undefined }}>
          {processing ? (
            'Procesando…'
          ) : compact ? (
            label
          ) : (
            <>
              Arrastra tu imagen aquí, o{' '}
              <Box component="span" sx={{ textDecoration: 'underline', fontWeight: 600 }}>
                {label.toLowerCase()}
              </Box>
            </>
          )}
        </Typography>
        {!compact && hint && !processing && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {hint}
          </Typography>
        )}
      </Box>

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
          emit(e.currentTarget.files);
          e.currentTarget.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          emit(e.currentTarget.files);
          e.currentTarget.value = '';
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
  /** Límites de formato/peso a validar en el cliente — por defecto, los de cualquier foto del sistema. */
  limites?: LimitesAdjunto;
}

export function PhotoField({
  label,
  file,
  currentUrl,
  onChange,
  accept = 'image/*',
  limites = LIMITES_FOTO,
}: PhotoFieldProps) {
  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const previewUrl = useObjectUrl(file, currentUrl);

  async function handleFiles(raw: File[]): Promise<void> {
    const elegido = raw[0];
    if (!elegido) return;

    setError(null);
    const motivo = validarAdjunto(elegido, limites);
    if (motivo) {
      setError(motivo);
      return;
    }

    setProcessing(true);
    try {
      onChange(await downscaleImage(elegido));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Stack spacing={1}>
      <Typography variant="body2">{label}</Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        {previewUrl && (
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={previewUrl}
              variant="rounded"
              sx={{ width: 64, height: 64, cursor: 'pointer' }}
              onClick={() => setLightbox({ type: 'image', url: previewUrl, label })}
            />
            {file && (
              <IconButton
                size="small"
                aria-label="Quitar imagen seleccionada"
                onClick={() => onChange(null)}
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  width: 22,
                  height: 22,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'background.paper' },
                }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
          </Box>
        )}
        <ImageDropzone
          compact
          label={previewUrl ? 'Reemplazar' : 'Subir'}
          accept={accept}
          processing={processing}
          onFiles={(files) => void handleFiles(files)}
        />
      </Stack>
      <ErrorBanner error={error} />
      <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />
    </Stack>
  );
}

interface VideoFieldProps {
  label: string;
  file: File | null;
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
  /** Límites de formato/peso a validar en el cliente — por defecto, los de cualquier video del sistema. */
  limites?: LimitesAdjunto;
}

export function VideoField({ label, file, currentUrl, onChange, limites = LIMITES_VIDEO_EVIDENCIA }: VideoFieldProps) {
  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useObjectUrl(file, currentUrl);

  function handleFile(elegido: File | null): void {
    if (!elegido) {
      setError(null);
      onChange(null);
      return;
    }

    const motivo = validarAdjunto(elegido, limites);
    if (motivo) {
      setError(motivo);
      return;
    }

    setError(null);
    onChange(elegido);
  }

  return (
    <Stack spacing={1}>
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
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </Button>
        </Stack>
        <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />
      </Stack>
      <ErrorBanner error={error} />
    </Stack>
  );
}

interface MultiPhotoFieldProps {
  /** Ya subidas. Genérico a propósito: sirve para `GarantiaFoto` y `ClienteFoto`. */
  existing?: Array<{ id: number; url: string }>;
  files: File[];
  onChange: (files: File[]) => void;
  /** Si se pasa, las fotos ya guardadas se pueden quitar. Sin él quedan de solo lectura (ver la nota al pie). */
  onRemoveExisting?: (id: number) => void;
  /** Tope del conjunto ya guardado + nuevo. El backend valida `max:10` por tipo. */
  maxFiles?: number;
  label?: string;
  accept?: string;
  /** Límites de formato/peso a validar en el cliente — por defecto, los de cualquier foto del sistema. */
  limites?: LimitesAdjunto;
}

export function MultiPhotoField({
  existing = [],
  files,
  onChange,
  onRemoveExisting,
  maxFiles,
  label = 'Fotos adicionales',
  accept = 'image/*',
  limites = LIMITES_FOTO,
}: MultiPhotoFieldProps) {
  const [lightbox, setLightbox] = useState<MediaLightboxItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const previews = useObjectUrls(files);

  const total = existing.length + files.length;
  const quedan = maxFiles === undefined ? undefined : Math.max(0, maxFiles - total);
  const hint = `${etiquetaTipos(limites.tipos)} · máx. ${(limites.maxBytes / (1024 * 1024)).toFixed(0)} MB cada una`;

  async function handleFiles(raw: File[]): Promise<void> {
    setError(null);

    const espacio = quedan === undefined ? raw.length : Math.min(raw.length, quedan);
    if (espacio === 0) {
      setError(`Ya alcanzaste el máximo de ${maxFiles} fotos.`);
      return;
    }

    const presentes = new Set(files.map(claveArchivo));
    const aceptados: File[] = [];
    let huboDuplicado = false;
    let motivoInvalido: string | null = null;

    for (const candidato of raw.slice(0, espacio)) {
      const clave = claveArchivo(candidato);
      if (presentes.has(clave)) {
        huboDuplicado = true;
        continue;
      }
      const motivo = validarAdjunto(candidato, limites);
      if (motivo) {
        motivoInvalido = motivo;
        continue;
      }
      presentes.add(clave);
      aceptados.push(candidato);
    }

    if (aceptados.length === 0) {
      setError(motivoInvalido ?? (huboDuplicado ? 'Esa imagen ya estaba agregada.' : null));
      return;
    }

    setProcessing(true);
    try {
      const procesados = await Promise.all(aceptados.map((f) => downscaleImage(f)));
      onChange([...files, ...procesados]);
      setError(motivoInvalido ?? (huboDuplicado ? 'Se omitió una imagen repetida.' : null));
    } finally {
      setProcessing(false);
    }
  }

  function quitar(index: number): void {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <Stack spacing={1}>
      <Typography variant="body2">{label}</Typography>

      {existing.length > 0 && (
        <ImageList cols={4} gap={8} sx={{ m: 0, maxHeight: 260 }}>
          {existing.map((foto) => (
            <ImageListItem key={`existing-${foto.id}`} sx={{ borderRadius: 1, overflow: 'hidden' }}>
              <img src={foto.url} alt="" loading="lazy" style={{ height: 90, objectFit: 'cover' }} />
              <ImageListItemBar
                position="top"
                sx={{ background: 'transparent' }}
                actionIcon={
                  <Stack direction="row">
                    <IconButton
                      size="small"
                      aria-label="Ver foto"
                      sx={{ color: 'white' }}
                      onClick={() => setLightbox({ type: 'image', url: foto.url })}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    {onRemoveExisting && (
                      <IconButton
                        size="small"
                        aria-label="Quitar foto"
                        sx={{ color: 'white' }}
                        onClick={() => onRemoveExisting(foto.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}

      {files.length > 0 && (
        <Stack spacing={1}>
          {files.map((f, index) => (
            <Stack
              key={`${claveArchivo(f)}-${index}`}
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              <Avatar
                src={previews[index]}
                variant="rounded"
                sx={{ width: 40, height: 40, cursor: previews[index] ? 'pointer' : 'default' }}
                onClick={() => previews[index] && setLightbox({ type: 'image', url: previews[index] })}
              />
              <Stack spacing={0} sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {f.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatBytes(f.size)}
                </Typography>
              </Stack>
              <CheckCircleIcon fontSize="small" color="success" />
              <IconButton size="small" aria-label={`Quitar ${f.name}`} onClick={() => quitar(index)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}

      {quedan !== 0 && (
        <ImageDropzone
          label="Agregar imágenes"
          accept={accept}
          multiple
          processing={processing}
          hint={hint}
          onFiles={(fs) => void handleFiles(fs)}
        />
      )}

      {maxFiles !== undefined && total > 0 && (
        <Typography variant="caption" sx={{ color: quedan === 0 ? 'error.main' : 'text.secondary' }}>
          {quedan === 0 ? `Máximo ${maxFiles} fotos` : `${total} de ${maxFiles} · puedes agregar ${quedan}`}
        </Typography>
      )}
      {existing.length > 0 && !onRemoveExisting && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Las fotos ya guardadas no se pueden eliminar desde aquí.
        </Typography>
      )}

      <ErrorBanner error={error} />
      <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />
    </Stack>
  );
}
