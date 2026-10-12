import { IconButton, Stack, TextField, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

interface PhoneListFieldProps {
  /** Lista completa de números — el backend la reemplaza entera al guardar. */
  values: string[];
  onChange: (values: string[]) => void;
  /** Tope que valida el backend (`ClienteTelefono::MAX_POR_CLIENTE`). */
  maxItems: number;
  label?: string;
}

/** Lista de teléfonos de texto libre (agregar/quitar), capada a `maxItems`. */
export function PhoneListField({ values, onChange, maxItems, label = 'Teléfonos' }: PhoneListFieldProps) {
  const quedan = Math.max(0, maxItems - values.length);

  function agregar() {
    onChange([...values, '']);
  }

  function cambiar(index: number, value: string) {
    onChange(values.map((v, i) => (i === index ? value : v)));
  }

  function quitar(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <Stack spacing={1}>
      <Typography variant="body2">{label}</Typography>

      {values.map((value, index) => (
        <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            value={value}
            onChange={(e) => cambiar(index, e.target.value)}
            placeholder="Número de teléfono"
            size="small"
          />
          <IconButton size="small" aria-label="Quitar teléfono" onClick={() => quitar(index)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Button startIcon={<AddIcon />} disabled={quedan === 0} onClick={agregar} sx={{ alignSelf: 'flex-start' }}>
          Agregar
        </Button>
        <Typography variant="caption" sx={{ color: quedan === 0 ? 'error.main' : 'text.secondary' }}>
          {quedan === 0 ? `Máximo ${maxItems} teléfonos` : `${values.length} de ${maxItems}`}
        </Typography>
      </Stack>
    </Stack>
  );
}
