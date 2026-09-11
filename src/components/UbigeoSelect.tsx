import { useEffect, useState } from 'react';
import { MenuItem, Stack, TextField } from '@mui/material';
import {
  getUbigeoDistrito,
  listUbigeoDepartamentos,
  listUbigeoDistritos,
  listUbigeoProvincias,
  type UbigeoDepartamento,
  type UbigeoDistrito,
  type UbigeoProvincia,
} from '../api/ubigeo';

interface UbigeoSelectProps {
  /** ubigeo_distrito_id ya guardado, o null si aún no se eligió. */
  value: number | null;
  onChange: (distritoId: number | null) => void;
  disabled?: boolean;
}

/**
 * Select en cascada Departamento -> Provincia -> Distrito, respaldado por el
 * catálogo de ubigeo (INEI) — reemplaza los tres campos de texto libre que
 * antes tenía cada formulario de dirección (Cliente, Inmueble). El único
 * valor que se guarda/envía es el id del distrito (`value`); departamento y
 * provincia son solo pasos intermedios para llegar a él.
 */
export function UbigeoSelect({ value, onChange, disabled = false }: UbigeoSelectProps) {
  const [departamentos, setDepartamentos] = useState<UbigeoDepartamento[]>([]);
  const [provincias, setProvincias] = useState<UbigeoProvincia[]>([]);
  const [distritos, setDistritos] = useState<UbigeoDistrito[]>([]);

  const [departamentoId, setDepartamentoId] = useState<number | ''>('');
  const [provinciaId, setProvinciaId] = useState<number | ''>('');

  const [isLoadingProvincias, setIsLoadingProvincias] = useState(false);
  const [isLoadingDistritos, setIsLoadingDistritos] = useState(false);

  useEffect(() => {
    listUbigeoDepartamentos().then((res) => setDepartamentos(res.data));
  }, []);

  // Al editar un registro que ya trae un distrito guardado, resuelve su
  // cadena completa para preseleccionar los tres niveles de una sola vez —
  // sin esto, los selects de provincia/distrito quedarían vacíos hasta que
  // el usuario tocara el de departamento.
  useEffect(() => {
    if (!value) {
      return;
    }

    let active = true;
    getUbigeoDistrito(value).then((res) => {
      if (!active) return;
      const distrito = res.data;
      setDepartamentoId(distrito.provincia.departamento.id);
      setProvinciaId(distrito.provincia.id);
      setProvincias([distrito.provincia]);
      setDistritos([distrito]);
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDepartamentoChange(id: number | '') {
    setDepartamentoId(id);
    setProvinciaId('');
    setDistritos([]);
    onChange(null);

    if (!id) {
      setProvincias([]);
      return;
    }

    setIsLoadingProvincias(true);
    listUbigeoProvincias(id)
      .then((res) => setProvincias(res.data))
      .finally(() => setIsLoadingProvincias(false));
  }

  function handleProvinciaChange(id: number | '') {
    setProvinciaId(id);
    onChange(null);

    if (!id) {
      setDistritos([]);
      return;
    }

    setIsLoadingDistritos(true);
    listUbigeoDistritos(id)
      .then((res) => setDistritos(res.data))
      .finally(() => setIsLoadingDistritos(false));
  }

  return (
    <Stack direction="row" spacing={2}>
      <TextField
        select
        label="Departamento"
        value={departamentoId}
        onChange={(e) => handleDepartamentoChange(e.target.value ? Number(e.target.value) : '')}
        disabled={disabled}
        fullWidth
      >
        <MenuItem value="">—</MenuItem>
        {departamentos.map((d) => (
          <MenuItem key={d.id} value={d.id}>
            {d.nombre}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Provincia"
        value={provinciaId}
        onChange={(e) => handleProvinciaChange(e.target.value ? Number(e.target.value) : '')}
        disabled={disabled || !departamentoId || isLoadingProvincias}
        fullWidth
      >
        <MenuItem value="">—</MenuItem>
        {provincias.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.nombre}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Distrito"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={disabled || !provinciaId || isLoadingDistritos}
        fullWidth
      >
        <MenuItem value="">—</MenuItem>
        {distritos.map((d) => (
          <MenuItem key={d.id} value={d.id}>
            {d.nombre}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
