import { useEffect, useState } from 'react';
import { Alert, MenuItem, TextField } from '@mui/material';
import { listPerfiles, type PerfilAcceso } from '../api/perfilesAcceso';
export function PerfilAccesoSelect({ value, onChange, disabled = false }: { value: number | null; onChange: (id: number | null) => void; disabled?: boolean ;}) {
  const [perfiles, setPerfiles] = useState<PerfilAcceso[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { listPerfiles().then(r => setPerfiles(r.data)).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  return <>{error && <Alert severity="error">{error}</Alert>}<TextField select fullWidth label="Perfil de acceso" value={value ?? ''} disabled={disabled || loading || !!error} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)} helperText="Sin perfil conserva los accesos heredados actuales.">
    <MenuItem value="">Sin perfil (heredado)</MenuItem>
    {value != null && !perfiles.some(p => p.id === value) && <MenuItem value={value}>Perfil actual</MenuItem>}
    {perfiles.filter(p => p.activo || p.id === value).map(p => <MenuItem key={p.id} value={p.id} disabled={!p.activo}>{p.nombre}{!p.activo ? ' (inactivo)' : ''}</MenuItem>)}
  </TextField></>;
}
