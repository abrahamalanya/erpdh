import { useState, type ReactNode } from 'react';
import { Alert, IconButton, InputAdornment, MenuItem, Stack, TextField, Tooltip, CircularProgress, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { UpperTextField } from './UpperTextField';
import { PhotoField } from './MediaFields';
import { UbigeoSelect } from './UbigeoSelect';
import { LocationMap } from './LocationMap';
import { consultarDni, type CreateClientePayload } from '../api/clientes';
import { TIPO_DOCUMENTO_LABELS } from '../utils/clienteHierarchy';
import type { TipoDocumento } from '../types/api';

export interface ClienteCreateFormValue {
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  fecha_nacimiento: string;
  sexo: '' | 'm' | 'f';
  estado_civil: string;
  email: string;
  telefono: string;
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
  foto_casa: File | null;
  foto_negocio: File | null;
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
  telefono: '',
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
  foto_casa: null,
  foto_negocio: null,
};

/** Builds the create payload minus empresa_id/agencia_id — those are page-specific (only sistemas/multi-agencia actors pick them). */
export function clienteCreatePayload(value: ClienteCreateFormValue): Omit<CreateClientePayload, 'empresa_id' | 'agencia_id'> {
  return {
    nombre: value.nombre.toLowerCase(),
    apellido: value.apellido.toLowerCase(),
    tipo_documento: value.tipo_documento,
    numero_documento: value.numero_documento,
    fecha_nacimiento: value.fecha_nacimiento || undefined,
    sexo: value.sexo || undefined,
    estado_civil: value.estado_civil ? value.estado_civil.toLowerCase() : undefined,
    email: value.email || undefined,
    telefono: value.telefono || undefined,
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
    foto_casa: value.foto_casa,
    foto_negocio: value.foto_negocio,
  };
}

interface ClienteCreateFieldsProps {
  value: ClienteCreateFormValue;
  onChange: (value: ClienteCreateFormValue) => void;
  /** Rendered between "Referencia" and the "Fotos" section — e.g. ClientesPage's empresa/agencia pickers for sistemas users. */
  extraFields?: ReactNode;
}

/**
 * The cliente "create" field set — shared by ClientesPage's own Nuevo
 * cliente dialog and CreditosPrendariosPage's quick-create dialog (same
 * fields, per this project's "lift on the second use" convention). Fields
 * only, no Dialog/submit wrapper — each page owns that, since the
 * post-create behavior differs (ClientesPage stays open in edit mode to add
 * bienes; CreditosPrendariosPage closes and selects the cliente).
 */
export function ClienteCreateFields({ value, onChange, extraFields }: ClienteCreateFieldsProps) {
  const [dniLoading, setDniLoading] = useState(false);
  const [dniError, setDniError] = useState<string | null>(null);

  function patch(partial: Partial<ClienteCreateFormValue>) {
    onChange({ ...value, ...partial });
  }

  function handleConsultarDni() {
    setDniError(null);
    setDniLoading(true);

    consultarDni(value.numero_documento)
      .then((res) => {
        patch({
          nombre: res.data.nombre ? res.data.nombre.toUpperCase() : value.nombre,
          apellido: res.data.apellido ? res.data.apellido.toUpperCase() : value.apellido,
          direccion: res.data.direccion ? res.data.direccion.toUpperCase() : value.direccion,
        });
      })
      .catch((err) => setDniError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setDniLoading(false));
  }

  return (
    <>
      <Stack direction="row" spacing={2}>
        <TextField
          select
          label="Tipo de documento"
          value={value.tipo_documento}
          onChange={(e) => patch({ tipo_documento: e.target.value as TipoDocumento })}
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
          value={value.numero_documento}
          onChange={(e) => {
            setDniError(null);
            patch({ numero_documento: e.target.value });
          }}
          required
          autoFocus
          fullWidth
          slotProps={{
            input: {
              endAdornment:
                value.tipo_documento === 'dni' ? (
                  <InputAdornment position="end">
                    <Tooltip title="Consultar DNI">
                      <IconButton
                        aria-label="Consultar DNI"
                        onClick={handleConsultarDni}
                        disabled={dniLoading || !/^\d{8}$/.test(value.numero_documento)}
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
          value={value.nombre}
          onChange={(e) => patch({ nombre: e.target.value })}
          required
          fullWidth
        />
        <UpperTextField
          label="Apellido"
          value={value.apellido}
          onChange={(e) => patch({ apellido: e.target.value })}
          required
          fullWidth
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Fecha de nacimiento"
          type="date"
          value={value.fecha_nacimiento}
          onChange={(e) => patch({ fecha_nacimiento: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
        <TextField
          select
          label="Sexo"
          value={value.sexo}
          onChange={(e) => patch({ sexo: e.target.value as ClienteCreateFormValue['sexo'] })}
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
          value={value.estado_civil}
          onChange={(e) => patch({ estado_civil: e.target.value })}
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
          value={value.email}
          onChange={(e) => patch({ email: e.target.value })}
          fullWidth
        />
      </Stack>
      <TextField label="Teléfono" value={value.telefono} onChange={(e) => patch({ telefono: e.target.value })} />

      <Typography variant="subtitle2">Dirección de casa</Typography>
      <UpperTextField
        label="Dirección"
        value={value.direccion}
        onChange={(e) => patch({ direccion: e.target.value })}
      />
      <UbigeoSelect value={value.ubigeo_distrito_id} onChange={(id) => patch({ ubigeo_distrito_id: id })} />
      <UpperTextField
        label="Referencia"
        value={value.referencia}
        onChange={(e) => patch({ referencia: e.target.value })}
        multiline
        minRows={2}
      />
      <LocationMap
        latitud={value.latitud}
        longitud={value.longitud}
        onChange={(latitud, longitud) => patch({ latitud, longitud })}
      />

      <Typography variant="subtitle2">Dirección de negocio / trabajo</Typography>
      <UpperTextField
        label="Dirección del negocio"
        value={value.direccion_negocio}
        onChange={(e) => patch({ direccion_negocio: e.target.value })}
      />
      <UbigeoSelect
        value={value.ubigeo_distrito_negocio_id}
        onChange={(id) => patch({ ubigeo_distrito_negocio_id: id })}
      />
      <UpperTextField
        label="Referencia del negocio"
        value={value.referencia_negocio}
        onChange={(e) => patch({ referencia_negocio: e.target.value })}
        multiline
        minRows={2}
      />
      <LocationMap
        latitud={value.latitud_negocio}
        longitud={value.longitud_negocio}
        onChange={(latitud_negocio, longitud_negocio) => patch({ latitud_negocio, longitud_negocio })}
        label="Detectar GPS del negocio"
      />

      {extraFields}

      <Typography variant="subtitle2">Fotos</Typography>
      <PhotoField label="Foto del cliente" file={value.foto_cliente} onChange={(file) => patch({ foto_cliente: file })} />
      <PhotoField
        label="Foto del DNI (anverso)"
        file={value.foto_dni}
        onChange={(file) => patch({ foto_dni: file })}
      />
      <PhotoField
        label="Foto del DNI (reverso)"
        file={value.foto_dni_reverso}
        onChange={(file) => patch({ foto_dni_reverso: file })}
      />
      <PhotoField label="Foto de la casa" file={value.foto_casa} onChange={(file) => patch({ foto_casa: file })} />
      <PhotoField
        label="Foto del negocio"
        file={value.foto_negocio}
        onChange={(file) => patch({ foto_negocio: file })}
      />
    </>
  );
}
