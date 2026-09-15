import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { ClienteCreateFields, type ClienteCreateFormValue } from './ClienteCreateFields';
import { updateCliente, type UpdateClientePayload } from '../api/clientes';
import { preventBackdropClose } from '../utils/dialog';
import type { Cliente, Estado } from '../types/api';

function formFromCliente(cliente: Cliente): ClienteCreateFormValue {
  return {
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    tipo_documento: cliente.tipo_documento,
    numero_documento: cliente.numero_documento,
    fecha_nacimiento: cliente.fecha_nacimiento ? cliente.fecha_nacimiento.slice(0, 10) : '',
    sexo: cliente.sexo ?? '',
    estado_civil: cliente.estado_civil ?? '',
    email: cliente.email ?? '',
    telefono: cliente.telefono ?? '',
    direccion: cliente.direccion ?? '',
    ubigeo_distrito_id: cliente.ubigeo_distrito_id ?? null,
    referencia: cliente.referencia ?? '',
    latitud: cliente.latitud ? Number(cliente.latitud) : null,
    longitud: cliente.longitud ? Number(cliente.longitud) : null,
    direccion_negocio: cliente.direccion_negocio ?? '',
    ubigeo_distrito_negocio_id: cliente.ubigeo_distrito_negocio_id ?? null,
    referencia_negocio: cliente.referencia_negocio ?? '',
    latitud_negocio: cliente.latitud_negocio ? Number(cliente.latitud_negocio) : null,
    longitud_negocio: cliente.longitud_negocio ? Number(cliente.longitud_negocio) : null,
    foto_cliente: null,
    foto_dni: null,
    foto_dni_reverso: null,
    foto_casa: null,
    foto_negocio: null,
  };
}

interface ClienteEditDialogProps {
  /** null cierra el diálogo. */
  cliente: Cliente | null;
  onClose: () => void;
  onSaved: (cliente: Cliente) => void;
}

/**
 * Diálogo de edición de cliente, autocontenido (mismos campos que
 * ClientesPage vía ClienteCreateFields) — para usarlo desde cualquier
 * página que ya tenga un cliente seleccionado y necesite corregirlo sin
 * salir a Clientes (ver CreditosPrendariosPage: editar el cliente elegido al
 * registrar un crédito).
 */
export function ClienteEditDialog({ cliente, onClose, onSaved }: ClienteEditDialogProps) {
  const [form, setForm] = useState<ClienteCreateFormValue | null>(null);
  const [estado, setEstado] = useState<Estado>('activo');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cliente) {
      setForm(formFromCliente(cliente));
      setEstado(cliente.estado);
      setError(null);
    }
  }, [cliente]);

  if (!cliente || !form) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!cliente || !form) return;

    setError(null);
    setIsSaving(true);

    try {
      const payload: UpdateClientePayload = {
        nombre: form.nombre.toLowerCase(),
        apellido: form.apellido.toLowerCase(),
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento,
        fecha_nacimiento: form.fecha_nacimiento || undefined,
        sexo: form.sexo || undefined,
        estado_civil: form.estado_civil ? form.estado_civil.toLowerCase() : undefined,
        email: form.email || undefined,
        telefono: form.telefono || undefined,
        direccion: form.direccion ? form.direccion.toLowerCase() : undefined,
        ubigeo_distrito_id: form.ubigeo_distrito_id ?? undefined,
        referencia: form.referencia ? form.referencia.toLowerCase() : undefined,
        latitud: form.latitud ?? undefined,
        longitud: form.longitud ?? undefined,
        direccion_negocio: form.direccion_negocio ? form.direccion_negocio.toLowerCase() : undefined,
        ubigeo_distrito_negocio_id: form.ubigeo_distrito_negocio_id ?? undefined,
        referencia_negocio: form.referencia_negocio ? form.referencia_negocio.toLowerCase() : undefined,
        latitud_negocio: form.latitud_negocio ?? undefined,
        longitud_negocio: form.longitud_negocio ?? undefined,
        estado,
        foto_cliente: form.foto_cliente,
        foto_dni: form.foto_dni,
        foto_dni_reverso: form.foto_dni_reverso,
        foto_casa: form.foto_casa,
        foto_negocio: form.foto_negocio,
      };

      const res = await updateCliente(cliente.id, payload);
      onSaved(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={!!cliente} onClose={preventBackdropClose(onClose)} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>Editar cliente</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <ClienteCreateFields value={form} onChange={setForm} />
            <TextField select label="Estado" value={estado} onChange={(e) => setEstado(e.target.value as Estado)}>
              <MenuItem value="activo">Activo</MenuItem>
              <MenuItem value="inactivo">Inactivo</MenuItem>
            </TextField>
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
