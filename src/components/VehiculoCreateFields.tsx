import { MenuItem, Stack, TextField } from '@mui/material';
import { UpperTextField } from './UpperTextField';
import { PhotoField, VideoField, MultiPhotoField } from './MediaFields';
import type { CreateVehiculoPayload } from '../api/vehiculos';

export interface VehiculoCreateFormValue {
  placa: string;
  motor: string;
  serie: string;
  color: string;
  marca: string;
  modelo: string;
  anio: string;
  clase: string;
  propietario: string;
  tiene_soat: 'si' | 'no';
  dejo_llave: 'si' | 'no';
  dejo_tarjeta_propiedad: 'si' | 'no';
  observacion: string;
  valorizacion: string;
  puntaje: string;
  foto_cliente_producto: File | null;
  fotos: File[];
  video: File | null;
}

export const emptyVehiculoCreateForm: VehiculoCreateFormValue = {
  placa: '',
  motor: '',
  serie: '',
  color: '',
  marca: '',
  modelo: '',
  anio: '',
  clase: '',
  propietario: '',
  tiene_soat: 'no',
  dejo_llave: 'no',
  dejo_tarjeta_propiedad: 'no',
  observacion: '',
  valorizacion: '',
  puntaje: '5',
  foto_cliente_producto: null,
  fotos: [],
  video: null,
};

/** Builds the create payload minus cliente_id — the caller knows the cliente. */
export function vehiculoCreatePayload(v: VehiculoCreateFormValue): Omit<CreateVehiculoPayload, 'cliente_id'> {
  return {
    placa: v.placa.toUpperCase(),
    motor: v.motor.toUpperCase(),
    serie: v.serie.toUpperCase(),
    color: v.color.toLowerCase(),
    marca: v.marca.toLowerCase(),
    modelo: v.modelo ? v.modelo.toLowerCase() : undefined,
    anio: v.anio ? Number(v.anio) : undefined,
    clase: v.clase ? v.clase.toLowerCase() : undefined,
    propietario: v.propietario.toLowerCase(),
    tiene_soat: v.tiene_soat === 'si',
    dejo_llave: v.dejo_llave === 'si',
    dejo_tarjeta_propiedad: v.dejo_tarjeta_propiedad === 'si',
    observacion: v.observacion ? v.observacion.toLowerCase() : undefined,
    valorizacion: v.valorizacion,
    puntaje: v.puntaje ? Number(v.puntaje) : undefined,
    foto_cliente_producto: v.foto_cliente_producto,
    fotos: v.fotos,
    video: v.video,
  };
}

interface Props {
  value: VehiculoCreateFormValue;
  onChange: (value: VehiculoCreateFormValue) => void;
  autoFocus?: boolean;
}

/**
 * Vehículo "create"/"edit" field set — los datos de la tarjeta de propiedad.
 * Solo campos; el cliente y el Dialog/submit los pone la página.
 */
export function VehiculoCreateFields({ value, onChange, autoFocus }: Props) {
  function patch(partial: Partial<VehiculoCreateFormValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <>
      <Stack direction="row" spacing={2}>
        <UpperTextField
          label="Placa"
          value={value.placa}
          onChange={(e) => patch({ placa: e.target.value })}
          required
          autoFocus={autoFocus}
          fullWidth
        />
        <TextField
          select
          label="SOAT"
          value={value.tiene_soat}
          onChange={(e) => patch({ tiene_soat: e.target.value as 'si' | 'no' })}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="si">Sí</MenuItem>
          <MenuItem value="no">No</MenuItem>
        </TextField>
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField
          select
          label="¿Dejó la llave?"
          value={value.dejo_llave}
          onChange={(e) => patch({ dejo_llave: e.target.value as 'si' | 'no' })}
          fullWidth
        >
          <MenuItem value="si">Sí</MenuItem>
          <MenuItem value="no">No</MenuItem>
        </TextField>
        <TextField
          select
          label="¿Dejó la tarjeta de propiedad?"
          value={value.dejo_tarjeta_propiedad}
          onChange={(e) => patch({ dejo_tarjeta_propiedad: e.target.value as 'si' | 'no' })}
          fullWidth
        >
          <MenuItem value="si">Sí</MenuItem>
          <MenuItem value="no">No</MenuItem>
        </TextField>
      </Stack>
      <Stack direction="row" spacing={2}>
        <UpperTextField
          label="Marca"
          value={value.marca}
          onChange={(e) => patch({ marca: e.target.value })}
          required
          fullWidth
        />
        <UpperTextField
          label="Modelo"
          value={value.modelo}
          onChange={(e) => patch({ modelo: e.target.value })}
          fullWidth
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <UpperTextField
          label="N° de motor"
          value={value.motor}
          onChange={(e) => patch({ motor: e.target.value })}
          required
          fullWidth
        />
        <UpperTextField
          label="N° de serie / VIN"
          value={value.serie}
          onChange={(e) => patch({ serie: e.target.value })}
          required
          fullWidth
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <UpperTextField
          label="Color"
          value={value.color}
          onChange={(e) => patch({ color: e.target.value })}
          required
          fullWidth
        />
        <UpperTextField
          label="Clase"
          value={value.clase}
          onChange={(e) => patch({ clase: e.target.value })}
          fullWidth
        />
        <TextField
          label="Año"
          type="number"
          slotProps={{ htmlInput: { min: 1950, max: new Date().getFullYear() + 1 } }}
          value={value.anio}
          onChange={(e) => patch({ anio: e.target.value })}
          sx={{ minWidth: 110 }}
        />
      </Stack>
      <UpperTextField
        label="Propietario (según tarjeta de propiedad)"
        value={value.propietario}
        onChange={(e) => patch({ propietario: e.target.value })}
        required
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
        label="Foto del cliente con el vehículo"
        file={value.foto_cliente_producto}
        onChange={(file) => patch({ foto_cliente_producto: file })}
      />
      <MultiPhotoField files={value.fotos} onChange={(fotos) => patch({ fotos })} />
      <VideoField label="Video del vehículo" file={value.video} onChange={(file) => patch({ video: file })} />
    </>
  );
}
