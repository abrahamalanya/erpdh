import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { listClientes } from '../api/clientes';
import type { Cliente } from '../types/api';

const clienteLabel = (c: Cliente) => `${c.nombre} ${c.apellido} — ${c.numero_documento}`.toUpperCase();

interface ClienteAutocompleteProps {
  value: Cliente | null;
  onChange: (cliente: Cliente | null) => void;
  label?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Server-side searchable cliente picker. The old approach loaded a single
 * page (15 clientes) into a plain Autocomplete, so an asesor with more than
 * 15 clientes could never see or search the rest. This queries `/clientes?q=`
 * with a debounce and always keeps the selected cliente as an option even
 * when it falls outside the latest result page.
 */
export function ClienteAutocomplete({
  value,
  onChange,
  label = 'Cliente',
  required = false,
  autoFocus = false,
  disabled = false,
}: ClienteAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setIsLoading(true);

    const handle = setTimeout(() => {
      listClientes({ q: input.trim() || undefined, perPage: 20 })
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
    if (value && !options.some((c) => c.id === value.id)) {
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
      getOptionLabel={clienteLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      value={value}
      onChange={(_, cliente) => onChange(cliente)}
      onInputChange={(_, v, reason) => {
        if (reason === 'input') {
          setInput(v);
        }
      }}
      loading={isLoading}
      loadingText="Buscando..."
      noOptionsText={input.trim() ? 'Sin coincidencias' : 'Escribe para buscar'}
      disabled={disabled}
      renderInput={(params) => (
        <TextField {...params} label={label} required={required} autoFocus={autoFocus} />
      )}
    />
  );
}
