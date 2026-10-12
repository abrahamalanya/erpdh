import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import HomeIcon from '@mui/icons-material/Home';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { DialogHeader } from './DialogHeader';
import { DraftRestoreBanner } from './DraftRestoreBanner';
import { NavigationTabs, type NavigationTabItem } from './NavigationTabs';
import { MultiPhotoField, PhotoField } from './MediaFields';
import { UpperTextField } from './UpperTextField';
import { UbigeoSelect } from './UbigeoSelect';
import { LocationMap } from './LocationMap';
import { useFormDraft } from '../hooks/useFormDraft';
import { consultarDni, createCliente, type CreateClientePayload } from '../api/clientes';
import { preventBackdropClose } from '../utils/dialog';
import { IMAGE_ACCEPT } from '../utils/image';
import { TIPO_DOCUMENTO_LABELS } from '../utils/clienteHierarchy';
import { PhoneListField } from './PhoneListField';
import { CLIENTE_FOTOS_MAX_POR_TIPO, CLIENTE_TELEFONOS_MAX, type Cliente, type TipoDocumento } from '../types/api';

export interface ClienteCreateFormValue {
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  fecha_nacimiento: string;
  sexo: '' | 'm' | 'f';
  estado_civil: string;
  email: string;
  whatsapp: string;
  telefonos: string[];
  direccion: string;
  ubigeo_distrito_id: number | null;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
  direccion_negocio: string;
  ubigeo_distrito_negocio_id: number | null;
  referencia_negocio: string;
  latitud_negocio: number | null;
  longitud_negocio: number | null;
  foto_cliente: File | null;
  foto_dni: File | null;
  foto_dni_reverso: File | null;
  foto_suministro: File | null;
  foto_recibo_luz: File | null;
  fotos_casa: File[];
  fotos_negocio: File[];
  fotos_adicionales: File[];
}

export const emptyClienteCreateForm: ClienteCreateFormValue = {
  nombre: '',
  apellido: '',
  tipo_documento: 'dni',
  numero_documento: '',
  fecha_nacimiento: '',
  sexo: '',
  estado_civil: '',
  email: '',
  whatsapp: '',
  telefonos: [],
  direccion: '',
  ubigeo_distrito_id: null,
  referencia: '',
  latitud: null,
  longitud: null,
  direccion_negocio: '',
  ubigeo_distrito_negocio_id: null,
  referencia_negocio: '',
  latitud_negocio: null,
  longitud_negocio: null,
  foto_cliente: null,
  foto_dni: null,
  foto_dni_reverso: null,
  foto_suministro: null,
  foto_recibo_luz: null,
  fotos_casa: [],
  fotos_negocio: [],
  fotos_adicionales: [],
};

/** Builds the create payload minus empresa_id/agencia_id — those are caller-specific (only sistemas/multi-agencia actors pick them), passed in via `payloadExtra`. */
function clienteCreatePayload(value: ClienteCreateFormValue): Omit<CreateClientePayload, 'empresa_id' | 'agencia_id'> {
  return {
    nombre: value.nombre.toLowerCase(),
    apellido: value.apellido.toLowerCase(),
    tipo_documento: value.tipo_documento,
    numero_documento: value.numero_documento,
    fecha_nacimiento: value.fecha_nacimiento || undefined,
    sexo: value.sexo || undefined,
    estado_civil: value.estado_civil ? value.estado_civil.toLowerCase() : undefined,
    email: value.email || undefined,
    whatsapp: value.whatsapp || undefined,
    // Al crear no hay nada que vaciar, así que a diferencia de la edición
    // alcanza con omitir la clave cuando no se agregó ningún número.
    telefonos: value.telefonos.length > 0 ? value.telefonos : undefined,
    direccion: value.direccion ? value.direccion.toLowerCase() : undefined,
    ubigeo_distrito_id: value.ubigeo_distrito_id ?? undefined,
    referencia: value.referencia ? value.referencia.toLowerCase() : undefined,
    latitud: value.latitud ?? undefined,
    longitud: value.longitud ?? undefined,
    direccion_negocio: value.direccion_negocio ? value.direccion_negocio.toLowerCase() : undefined,
    ubigeo_distrito_negocio_id: value.ubigeo_distrito_negocio_id ?? undefined,
    referencia_negocio: value.referencia_negocio ? value.referencia_negocio.toLowerCase() : undefined,
    latitud_negocio: value.latitud_negocio ?? undefined,
    longitud_negocio: value.longitud_negocio ?? undefined,
    foto_cliente: value.foto_cliente,
    foto_dni: value.foto_dni,
    foto_dni_reverso: value.foto_dni_reverso,
    foto_suministro: value.foto_suministro,
    foto_recibo_luz: value.foto_recibo_luz,
    fotos_casa: value.fotos_casa,
    fotos_negocio: value.fotos_negocio,
    fotos_adicionales: value.fotos_adicionales,
  };
}

interface ClienteCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (cliente: Cliente) => void;
  /** Clave de localStorage para el draft — cada punto de uso necesita la suya (no compartir entre Clientes y el alta rápida de Créditos). */
  draftKey: string;
  title?: string;
  /** Rendido al final de la pestaña "Cliente" — p. ej. los selects de empresa/agencia de ClientesPage para sistemas/secretaria. */
  extraFields?: ReactNode;
  /** Se mezcla en el payload de alta — p. ej. { empresa_id, agencia_id } calculado por quien llama desde su propio estado. */
  payloadExtra?: Partial<CreateClientePayload>;
  /** Precarga el formulario al abrir — p. ej. nombre/WhatsApp ya capturados por una solicitud de la tienda virtual. */
  initialValues?: Partial<Pick<ClienteCreateFormValue, 'nombre' | 'apellido' | 'whatsapp'>>;
}

/**
 * Diálogo de alta de cliente, autocontenido, con las mismas 4 pestañas
 * (Cliente/Casa/Negocio/Fotografías) que ClienteEditDialog — reutilizado
 * tanto por ClientesPage (Nuevo cliente) como por CreditosPrendariosPage
 * (alta rápida de cliente/aval al registrar un crédito, en las 4 variantes).
 */
export function ClienteCreateDialog({
  open,
  onClose,
  onCreated,
  draftKey,
  title = 'Nuevo cliente',
  extraFields,
  payloadExtra,
  initialValues,
}: ClienteCreateDialogProps) {
  const [form, setForm] = useState<ClienteCreateFormValue>(emptyClienteCreateForm);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dniLoading, setDniLoading] = useState(false);
  const [dniError, setDniError] = useState<string | null>(null);

  const draft = useFormDraft(draftKey, form, setForm, open);

  useEffect(() => {
    if (open) {
      setForm({ ...emptyClienteCreateForm, ...initialValues });
      setError(null);
      setDniError(null);
    }
    // initialValues se lee solo al abrir, no en cada render del padre (que
    // suele pasar un objeto nuevo cada vez).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleConsultarDni() {
    setDniError(null);
    setDniLoading(true);

    consultarDni(form.numero_documento)
      .then((res) => {
        setForm((f) => ({
          ...f,
          nombre: res.data.nombre ? res.data.nombre.toUpperCase() : f.nombre,
          apellido: res.data.apellido ? res.data.apellido.toUpperCase() : f.apellido,
          direccion: res.data.direccion ? res.data.direccion.toUpperCase() : f.direccion,
        }));
      })
      .catch((err) => setDniError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setDniLoading(false));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const payload: CreateClientePayload = { ...clienteCreatePayload(form), ...payloadExtra };
      const res = await createCliente(payload);
      draft.clear();
      onCreated(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  const tabs: NavigationTabItem[] = [
    {
      key: 'cliente',
      label: 'Cliente',
      icon: <PersonIcon fontSize="small" />,
      content: (
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Tipo de documento"
              value={form.tipo_documento}
              onChange={(e) => setForm((f) => ({ ...f, tipo_documento: e.target.value as TipoDocumento }))}
              fullWidth
              sx={{ maxWidth: 160 }}
            >
              {Object.entries(TIPO_DOCUMENTO_LABELS).map(([v, label]) => (
                <MenuItem key={v} value={v}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Número de documento"
              value={form.numero_documento}
              onChange={(e) => {
                setDniError(null);
                setForm((f) => ({ ...f, numero_documento: e.target.value }));
              }}
              required
              autoFocus
              fullWidth
              slotProps={{
                input: {
                  endAdornment:
                    form.tipo_documento === 'dni' ? (
                      <InputAdornment position="end">
                        <Tooltip title="Consultar DNI">
                          <IconButton
                            aria-label="Consultar DNI"
                            onClick={handleConsultarDni}
                            disabled={dniLoading || !/^\d{8}$/.test(form.numero_documento)}
                            edge="end"
                            size="small"
                          >
                            {dniLoading ? <CircularProgress size={18} /> : <SearchIcon />}
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ) : undefined,
                },
              }}
            />
          </Stack>
          {dniError && (
            <Alert severity="warning" onClose={() => setDniError(null)}>
              {dniError}
            </Alert>
          )}
          <Stack direction="row" spacing={2}>
            <UpperTextField
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              required
              fullWidth
            />
            <UpperTextField
              label="Apellido"
              value={form.apellido}
              onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
              required
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Fecha de nacimiento"
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) => setForm((f) => ({ ...f, fecha_nacimiento: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              select
              label="Sexo"
              value={form.sexo}
              onChange={(e) => setForm((f) => ({ ...f, sexo: e.target.value as ClienteCreateFormValue['sexo'] }))}
              fullWidth
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="m">Masculino</MenuItem>
              <MenuItem value="f">Femenino</MenuItem>
            </TextField>
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Estado civil"
              value={form.estado_civil}
              onChange={(e) => setForm((f) => ({ ...f, estado_civil: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">—</MenuItem>
              {['soltero', 'casado', 'conviviente', 'divorciado', 'viudo'].map((v) => (
                <MenuItem key={v} value={v}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
            />
          </Stack>
          <TextField
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
          />
          <PhoneListField
            values={form.telefonos}
            onChange={(telefonos) => setForm((f) => ({ ...f, telefonos }))}
            maxItems={CLIENTE_TELEFONOS_MAX}
          />
          {extraFields}
        </Stack>
      ),
    },
    {
      key: 'casa',
      label: 'Casa',
      icon: <HomeIcon fontSize="small" />,
      content: (
        <Stack spacing={2.5}>
          <UpperTextField
            label="Dirección"
            value={form.direccion}
            onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
          />
          <UbigeoSelect
            value={form.ubigeo_distrito_id}
            onChange={(id) => setForm((f) => ({ ...f, ubigeo_distrito_id: id }))}
          />
          <UpperTextField
            label="Referencia"
            value={form.referencia}
            onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
            multiline
            minRows={2}
          />
          <LocationMap
            latitud={form.latitud}
            longitud={form.longitud}
            onChange={(latitud, longitud) => setForm((f) => ({ ...f, latitud, longitud }))}
          />
          <MultiPhotoField
            label="Fotos de la casa"
            accept={IMAGE_ACCEPT}
            files={form.fotos_casa}
            onChange={(fotos_casa) => setForm((f) => ({ ...f, fotos_casa }))}
            maxFiles={CLIENTE_FOTOS_MAX_POR_TIPO}
          />
        </Stack>
      ),
    },
    {
      key: 'negocio',
      label: 'Negocio',
      icon: <StorefrontIcon fontSize="small" />,
      content: (
        <Stack spacing={2.5}>
          <UpperTextField
            label="Dirección del negocio"
            value={form.direccion_negocio}
            onChange={(e) => setForm((f) => ({ ...f, direccion_negocio: e.target.value }))}
          />
          <UbigeoSelect
            value={form.ubigeo_distrito_negocio_id}
            onChange={(id) => setForm((f) => ({ ...f, ubigeo_distrito_negocio_id: id }))}
          />
          <UpperTextField
            label="Referencia del negocio"
            value={form.referencia_negocio}
            onChange={(e) => setForm((f) => ({ ...f, referencia_negocio: e.target.value }))}
            multiline
            minRows={2}
          />
          <LocationMap
            latitud={form.latitud_negocio}
            longitud={form.longitud_negocio}
            onChange={(latitud_negocio, longitud_negocio) =>
              setForm((f) => ({ ...f, latitud_negocio, longitud_negocio }))
            }
            label="Detectar GPS del negocio"
          />
          <MultiPhotoField
            label="Fotos del negocio"
            accept={IMAGE_ACCEPT}
            files={form.fotos_negocio}
            onChange={(fotos_negocio) => setForm((f) => ({ ...f, fotos_negocio }))}
            maxFiles={CLIENTE_FOTOS_MAX_POR_TIPO}
          />
        </Stack>
      ),
    },
    {
      key: 'fotografias',
      label: 'Fotografías',
      icon: <PhotoCameraIcon fontSize="small" />,
      content: (
        <Stack spacing={2.5}>
          <PhotoField
            label="Foto del cliente"
            accept={IMAGE_ACCEPT}
            file={form.foto_cliente}
            onChange={(file) => setForm((f) => ({ ...f, foto_cliente: file }))}
          />
          <PhotoField
            label="Foto del DNI (anverso)"
            accept={IMAGE_ACCEPT}
            file={form.foto_dni}
            onChange={(file) => setForm((f) => ({ ...f, foto_dni: file }))}
          />
          <PhotoField
            label="Foto del DNI (reverso)"
            accept={IMAGE_ACCEPT}
            file={form.foto_dni_reverso}
            onChange={(file) => setForm((f) => ({ ...f, foto_dni_reverso: file }))}
          />
          <PhotoField
            label="Foto del suministro"
            accept={IMAGE_ACCEPT}
            file={form.foto_suministro}
            onChange={(file) => setForm((f) => ({ ...f, foto_suministro: file }))}
          />
          <PhotoField
            label="Foto del recibo de luz"
            accept={IMAGE_ACCEPT}
            file={form.foto_recibo_luz}
            onChange={(file) => setForm((f) => ({ ...f, foto_recibo_luz: file }))}
          />
          <MultiPhotoField
            label="Fotos adicionales"
            accept={IMAGE_ACCEPT}
            files={form.fotos_adicionales}
            onChange={(fotos_adicionales) => setForm((f) => ({ ...f, fotos_adicionales }))}
            maxFiles={CLIENTE_FOTOS_MAX_POR_TIPO}
          />
        </Stack>
      ),
    },
  ];

  return (
    <Dialog open={open} onClose={preventBackdropClose(onClose)} fullWidth maxWidth="lg">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogHeader onClose={onClose}>{title}</DialogHeader>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {draft.pendingDraft && (
              <DraftRestoreBanner savedAt={draft.savedAt} onRestore={draft.restore} onDiscard={draft.discard} />
            )}
            <NavigationTabs tabs={tabs} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
