import { MenuItem, Stack, TextField } from '@mui/material';
import { UpperTextField } from './UpperTextField';
import { PhotoField, VideoField, MultiPhotoField } from './MediaFields';
import type { CreateInmueblePayload } from '../api/inmuebles';

export interface InmuebleCreateFormValue {
  partida_registral: string;
  oficina_registral: string;
  tipo_inmueble: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  area_terreno: string;
  area_construida: string;
  propietario: string;
  con_gravamen: 'si' | 'no';
  linderos: string;
  observacion: string;
  valorizacion: string;
  puntaje: string;
  foto_cliente_producto: File | null;
  fotos: File[];
  video: File | null;
}

export const emptyInmuebleCreateForm: InmuebleCreateFormValue = {
  partida_registral: '',
  oficina_registral: '',
  tipo_inmueble: '',
  direccion: '',
  distrito: '',
  provincia: '',
  departamento: '',
  area_terreno: '',
  area_construida: '',
  propietario: '',
  con_gravamen: 'no',
  linderos: '',
  observacion: '',
  valorizacion: '',
  puntaje: '5',
  foto_cliente_producto: null,
  fotos: [],
  video: null,
};

/** Builds the create payload minus cliente_id — the caller knows the cliente. */
export function inmuebleCreatePayload(v: InmuebleCreateFormValue): Omit<CreateInmueblePayload, 'cliente_id'> {
  return {
    partida_registral: v.partida_registral.toUpperCase(),
    oficina_registral: v.oficina_registral ? v.oficina_registral.toLowerCase() : undefined,
    tipo_inmueble: v.tipo_inmueble ? v.tipo_inmueble.toLowerCase() : undefined,
    direccion: v.direccion.toLowerCase(),
    distrito: v.distrito ? v.distrito.toLowerCase() : undefined,
    provincia: v.provincia ? v.provincia.toLowerCase() : undefined,
    departamento: v.departamento ? v.departamento.toLowerCase() : undefined,
    area_terreno: v.area_terreno || undefined,
    area_construida: v.area_construida || undefined,
    propietario: v.propietario.toLowerCase(),
    con_gravamen: v.con_gravamen === 'si',
    linderos: v.linderos ? v.linderos.toLowerCase() : undefined,
    observacion: v.observacion ? v.observacion.toLowerCase() : undefined,
    valorizacion: v.valorizacion,
    puntaje: v.puntaje ? Number(v.puntaje) : undefined,
    foto_cliente_producto: v.foto_cliente_producto,
    fotos: v.fotos,
    video: v.video,
  };
}

interface Props {
  value: InmuebleCreateFormValue;
  onChange: (value: InmuebleCreateFormValue) => void;
  autoFocus?: boolean;
}

/**
 * Inmueble "create"/"edit" field set — los datos de la partida registral
 * SUNARP. Solo campos; el cliente y el Dialog/submit los pone la página.
 */
export function InmuebleCreateFields({ value, onChange, autoFocus }: Props) {
  function patch(partial: Partial<InmuebleCreateFormValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <>
      <Stack direction="row" spacing={2}>
        <UpperTextField
          label="Partida registral"
          value={value.partida_registral}
          onChange={(e) => patch({ partida_registral: e.target.value })}
          required
          autoFocus={autoFocus}
          fullWidth
        />
        <TextField
          select
          label="¿Con gravamen?"
          value={value.con_gravamen}
          onChange={(e) => patch({ con_gravamen: e.target.value as 'si' | 'no' })}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="no">No</MenuItem>
          <MenuItem value="si">Sí</MenuItem>
        </TextField>
      </Stack>
      <Stack direction="row" spacing={2}>
        <UpperTextField
          label="Oficina registral"
          value={value.oficina_registral}
          onChange={(e) => patch({ oficina_registral: e.target.value })}
          fullWidth
        />
        <UpperTextField
          label="Tipo de inmueble"
          value={value.tipo_inmueble}
          onChange={(e) => patch({ tipo_inmueble: e.target.value })}
          fullWidth
        />
      </Stack>
      <UpperTextField
        label="Dirección del inmueble"
        value={value.direccion}
        onChange={(e) => patch({ direccion: e.target.value })}
        required
      />
      <Stack direction="row" spacing={2}>
        <UpperTextField
          label="Distrito"
          value={value.distrito}
          onChange={(e) => patch({ distrito: e.target.value })}
          fullWidth
        />
        <UpperTextField
          label="Provincia"
          value={value.provincia}
          onChange={(e) => patch({ provincia: e.target.value })}
          fullWidth
        />
        <UpperTextField
          label="Departamento"
          value={value.departamento}
          onChange={(e) => patch({ departamento: e.target.value })}
          fullWidth
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Área de terreno (m²)"
          type="number"
          slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
          value={value.area_terreno}
          onChange={(e) => patch({ area_terreno: e.target.value })}
          fullWidth
        />
        <TextField
          label="Área construida (m²)"
          type="number"
          slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
          value={value.area_construida}
          onChange={(e) => patch({ area_construida: e.target.value })}
          fullWidth
        />
      </Stack>
      <UpperTextField
        label="Propietario (según partida registral)"
        value={value.propietario}
        onChange={(e) => patch({ propietario: e.target.value })}
        required
      />
      <UpperTextField
        label="Linderos y medidas perimétricas"
        value={value.linderos}
        onChange={(e) => patch({ linderos: e.target.value })}
        multiline
        minRows={2}
      />
      <UpperTextField
        label="Observación"
        value={value.observacion}
        onChange={(e) => patch({ observacion: e.target.value })}
        multiline
        minRows={2}
      />
      <Stack direction="row" spacing={2}>
        <TextField
          label="Valorización"
          type="number"
          slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
          value={value.valorizacion}
          onChange={(e) => patch({ valorizacion: e.target.value })}
          required
          fullWidth
        />
        <TextField
          label="Puntaje (1-10)"
          type="number"
          slotProps={{ htmlInput: { min: 1, max: 10 } }}
          value={value.puntaje}
          onChange={(e) => patch({ puntaje: e.target.value })}
          fullWidth
        />
      </Stack>

      <PhotoField
        label="Foto del cliente con el inmueble"
        file={value.foto_cliente_producto}
        onChange={(file) => patch({ foto_cliente_producto: file })}
      />
      <MultiPhotoField files={value.fotos} onChange={(fotos) => patch({ fotos })} />
      <VideoField label="Video del inmueble" file={value.video} onChange={(file) => patch({ video: file })} />
    </>
  );
}
