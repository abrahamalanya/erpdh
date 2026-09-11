import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  listExpediente,
  uploadExpediente,
  deleteExpedienteDoc,
  type ExpedienteDocumento,
} from '../api/expediente';
import {
  EXPEDIENTE_ROL_LABELS,
  EXPEDIENTE_SECCION_LABELS,
  SECCIONES_PERSONA,
  SECCIONES_PERSONA_DEL_CLIENTE,
  SECCIONES_INMUEBLE,
  type ExpedienteRol,
  type ExpedienteSeccion,
} from '../utils/expediente';
import { MediaLightbox } from './MediaLightbox';
import type { Cliente } from '../types/api';

interface ExpedientePanelProps {
  creditoId: number;
  deudor: Cliente;
  aval1?: Cliente | null;
  aval2?: Cliente | null;
}

/** URLs ya registradas en el cliente para una sección 'dni' / 'casa' / 'negocio'. */
function fotosDelClientePara(cliente: Cliente, seccion: ExpedienteSeccion): string[] {
  if (seccion === 'dni') {
    return [cliente.foto_dni_url, cliente.foto_dni_reverso_url].filter((u): u is string => !!u);
  }
  if (seccion === 'casa') {
    return cliente.foto_casa_url ? [cliente.foto_casa_url] : [];
  }
  if (seccion === 'negocio') {
    return cliente.foto_negocio_url ? [cliente.foto_negocio_url] : [];
  }
  return [];
}

interface SeccionClienteRowProps {
  label: string;
  urls: string[];
  onView: (url: string) => void;
}

/** Fila de solo lectura: fotos que ya tiene el cliente, no se suben aquí. */
function SeccionClienteRow({ label, urls, onView }: SeccionClienteRowProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', flexWrap: 'wrap', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Typography variant="body2" sx={{ width: 190, flexShrink: 0, fontWeight: 500 }}>
        {label}
      </Typography>

      {urls.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
          El cliente no tiene esta foto registrada
        </Typography>
      ) : (
        urls.map((url) => (
          <Avatar
            key={url}
            src={url}
            variant="rounded"
            sx={{ width: 56, height: 56, cursor: 'pointer' }}
            onClick={() => onView(url)}
          />
        ))
      )}
    </Stack>
  );
}

interface SeccionRowProps {
  docs: ExpedienteDocumento[];
  label: string;
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onView: (url: string) => void;
}

function SeccionRow({ docs, label, onUpload, onDelete, onView }: SeccionRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', flexWrap: 'wrap', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Typography variant="body2" sx={{ width: 190, flexShrink: 0, fontWeight: 500 }}>
        {label}
      </Typography>

      {docs.map((d) => (
        <Box key={d.id} sx={{ position: 'relative' }}>
          <Avatar
            src={d.url ?? undefined}
            variant="rounded"
            sx={{ width: 56, height: 56, cursor: 'pointer' }}
            onClick={() => d.url && onView(d.url)}
          />
          <IconButton
            size="small"
            onClick={async () => {
              setBusy(true);
              await onDelete(d.id);
              setBusy(false);
            }}
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              p: 0.25,
            }}
          >
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      ))}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length === 0) return;
          setBusy(true);
          await onUpload(files);
          setBusy(false);
        }}
      />
      <Button
        size="small"
        startIcon={busy ? <CircularProgress size={14} /> : <AddPhotoAlternateIcon fontSize="small" />}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        Agregar
      </Button>
    </Stack>
  );
}

export function ExpedientePanel({ creditoId, deudor, aval1, aval2 }: ExpedientePanelProps) {
  const [docs, setDocs] = useState<ExpedienteDocumento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    listExpediente(creditoId)
      .then((res) => setDocs(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [creditoId]);

  const porRolSeccion = useMemo(() => {
    const map = new Map<string, ExpedienteDocumento[]>();
    for (const d of docs) {
      const k = `${d.rol}|${d.seccion}`;
      map.set(k, [...(map.get(k) ?? []), d]);
    }
    return map;
  }, [docs]);

  async function handleUpload(rol: ExpedienteRol, seccion: ExpedienteSeccion, files: File[]) {
    setError(null);
    try {
      await uploadExpediente(creditoId, rol, seccion, files);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      await deleteExpedienteDoc(creditoId, id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  const clientePorRol: Partial<Record<ExpedienteRol, Cliente>> = {
    deudor,
    ...(aval1 ? { aval1 } : {}),
    ...(aval2 ? { aval2 } : {}),
  };

  const roles: ExpedienteRol[] = ['deudor', ...(aval1 ? (['aval1'] as ExpedienteRol[]) : []), ...(aval2 ? (['aval2'] as ExpedienteRol[]) : []), 'inmueble'];

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Expediente — fotos y documentos
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Solo imágenes. El DNI, la casa y el negocio ya se piden al registrar a cada persona como
        cliente — aquí solo se muestran (no se vuelven a subir). El documento &quot;Expediente del
        crédito&quot; se arma con todo esto.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={22} />
        </Box>
      ) : (
        <Box sx={{ mt: 1 }}>
          {roles.map((rol) => {
            const secciones = rol === 'inmueble' ? SECCIONES_INMUEBLE : SECCIONES_PERSONA;
            const cliente = clientePorRol[rol];
            const totalDelCliente =
              cliente && rol !== 'inmueble'
                ? SECCIONES_PERSONA_DEL_CLIENTE.reduce((acc, s) => acc + fotosDelClientePara(cliente, s).length, 0)
                : 0;
            const total =
              totalDelCliente +
              secciones.reduce((acc, s) => acc + (porRolSeccion.get(`${rol}|${s}`)?.length ?? 0), 0);
            return (
              <Accordion key={rol} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {EXPEDIENTE_ROL_LABELS[rol]}
                    {total > 0 ? ` · ${total} archivo(s)` : ''}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {rol !== 'inmueble' &&
                    clientePorRol[rol] &&
                    SECCIONES_PERSONA_DEL_CLIENTE.map((seccion) => (
                      <SeccionClienteRow
                        key={seccion}
                        label={EXPEDIENTE_SECCION_LABELS[seccion]}
                        urls={fotosDelClientePara(clientePorRol[rol]!, seccion)}
                        onView={setLightbox}
                      />
                    ))}
                  {secciones.map((seccion) => (
                    <SeccionRow
                      key={seccion}
                      label={EXPEDIENTE_SECCION_LABELS[seccion]}
                      docs={porRolSeccion.get(`${rol}|${seccion}`) ?? []}
                      onUpload={(files) => handleUpload(rol, seccion, files)}
                      onDelete={handleDelete}
                      onView={setLightbox}
                    />
                  ))}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      <MediaLightbox
        item={lightbox ? { type: 'image', url: lightbox } : null}
        onClose={() => setLightbox(null)}
      />
    </Box>
  );
}
