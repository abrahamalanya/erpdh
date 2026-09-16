import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { listUsers } from '../api/users';
import type { User } from '../types/api';

const asesorLabel = (u: User) => `${u.nombre} ${u.apellido}`;

interface AsesorAutocompleteProps {
  value: User | null;
  onChange: (asesor: User | null) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Server-side searchable asesor picker — mismo patrón que ClienteAutocomplete
 * (../components/ClienteAutocomplete.tsx), pero contra `listUsers({role:
 * 'asesor'})`. Ese endpoint (GET /usuarios) exige el permiso `usuarios.ver`,
 * que solo tienen administrador_general/administrador_agencia/sistemas — no
 * uses este componente en una pantalla accesible para asesor/supervisor.
 */
export function AsesorAutocomplete({ value, onChange, label = 'Asesor', disabled = false }: AsesorAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setIsLoading(true);

    const handle = setTimeout(() => {
      listUsers(1, { role: 'asesor', nombre: input.trim() || undefined })
        .then((res) => {
          if (active) {
            setOptions(res.data.data);
          }
        })
        .catch(() => {
          if (active) {
            setOptions([]);
          }
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [input, open]);

  const mergedOptions = useMemo(() => {
    if (value && !options.some((u) => u.id === value.id)) {
      return [value, ...options];
    }

    return options;
  }, [value, options]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={mergedOptions}
      filterOptions={(x) => x}
      getOptionLabel={asesorLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      value={value}
      onChange={(_, asesor) => onChange(asesor)}
      onInputChange={(_, v, reason) => {
        if (reason === 'input') {
          setInput(v);
        }
      }}
      loading={isLoading}
      loadingText="Buscando..."
      noOptionsText={input.trim() ? 'Sin coincidencias' : 'Escribe para buscar'}
      disabled={disabled}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}
