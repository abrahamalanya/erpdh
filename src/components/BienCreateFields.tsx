import { Stack, TextField, MenuItem } from '@mui/material';
import { UpperTextField } from './UpperTextField';
import { PhotoField, VideoField, MultiPhotoField } from './MediaFields';
import { BIEN_TIPO_LABELS } from '../utils/creditoPrendarioHierarchy';
import type { BienTipo } from '../types/api';
import type { CreateBienPayload } from '../api/bienes';

export interface BienCreateFormValue {
  tipo: BienTipo;
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  observacion: string;
  valorizacion: string;
  puntaje: string;
  foto_cliente_producto: File | null;
  fotos: File[];
  video: File | null;
}

export const emptyBienCreateForm: BienCreateFormValue = {
  tipo: 'varios',
  nombre: '',
  marca: '',
  modelo: '',
  serie: '',
  observacion: '',
  valorizacion: '',
  puntaje: '5',
  foto_cliente_producto: null,
  fotos: [],
  video: null,
};

/** Builds the create payload minus cliente_id — the caller always knows which cliente it's for. */
export function bienCreatePayload(value: BienCreateFormValue): Omit<CreateBienPayload, 'cliente_id'> {
  return {
    tipo: value.tipo,
    nombre: value.nombre.toLowerCase(),
    marca: value.tipo === 'electro' ? value.marca.toLowerCase() || undefined : undefined,
    modelo: value.tipo === 'electro' ? value.modelo.toLowerCase() || undefined : undefined,
    serie: value.serie ? value.serie.toLowerCase() : undefined,
    observacion: value.observacion ? value.observacion.toLowerCase() : undefined,
    valorizacion: value.valorizacion,
    puntaje: Number(value.puntaje),
    foto_cliente_producto: value.foto_cliente_producto,
    fotos: value.fotos,
    video: value.video,
  };
}

interface BienCreateFieldsProps {
  value: BienCreateFormValue;
  onChange: (value: BienCreateFormValue) => void;
  autoFocus?: boolean;
}

/**
 * The bien "create" field set — shared by BienesPage's own Nuevo bien
 * dialog and CreditosPrendariosPage's quick-create dialog (same fields, per
 * this project's "lift on the second use" convention). Fields only, no
 * cliente picker — BienesPage renders its own Autocomplete before this
 * (needed there, fixed from context in CreditosPrendariosPage), and no
 * Dialog/submit wrapper, since each page owns that.
 */
export function BienCreateFields({ value, onChange, autoFocus }: BienCreateFieldsProps) {
  function patch(partial: Partial<BienCreateFormValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <>
      <TextField select label="Tipo" value={value.tipo} onChange={(e) => patch({ tipo: e.target.value as BienTipo })}>
        {Object.entries(BIEN_TIPO_LABELS).map(([v, label]) => (
          <MenuItem key={v} value={v}>
            {label}
          </MenuItem>
        ))}
      </TextField>
      <UpperTextField
        label="Nombre"
        value={value.nombre}
        onChange={(e) => patch({ nombre: e.target.value })}
        required
        autoFocus={autoFocus}
      />
      {value.tipo === 'electro' && (
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
            required
            fullWidth
          />
        </Stack>
      )}
      <UpperTextField label="Serie" value={value.serie} onChange={(e) => patch({ serie: e.target.value })} />
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
          helperText="Según el estado del producto"
          required
          fullWidth
        />
      </Stack>

      <PhotoField
        label="Foto del cliente con el producto"
        file={value.foto_cliente_producto}
        onChange={(file) => patch({ foto_cliente_producto: file })}
      />
      <MultiPhotoField files={value.fotos} onChange={(fotos) => patch({ fotos })} />
      <VideoField label="Video del producto" file={value.video} onChange={(file) => patch({ video: file })} />
    </>
  );
}
