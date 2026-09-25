import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, MenuItem, Stack, TextField } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PersonIcon from '@mui/icons-material/Person';
import HomeIcon from '@mui/icons-material/Home';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useAuth } from '../hooks/useAuth';
import { NavigationTabs, type NavigationTabItem } from './NavigationTabs';
import { DialogHeader } from './DialogHeader';
import { PhotoField } from './MediaFields';
import { UpperTextField } from './UpperTextField';
import { UbigeoSelect } from './UbigeoSelect';
import { LocationMap } from './LocationMap';
import { FichaSocioeconomicaDialog } from './FichaSocioeconomicaDialog';
import { ClienteGarantiaDialog } from './ClienteGarantiaDialog';
import { BienCreateFields, bienCreatePayload, emptyBienCreateForm, type BienCreateFormValue } from './BienCreateFields';
import {
  VehiculoCreateFields,
  vehiculoCreatePayload,
  emptyVehiculoCreateForm,
  type VehiculoCreateFormValue,
} from './VehiculoCreateFields';
import {
  InmuebleCreateFields,
  inmuebleCreatePayload,
  emptyInmuebleCreateForm,
  type InmuebleCreateFormValue,
} from './InmuebleCreateFields';
import { updateCliente, type UpdateClientePayload } from '../api/clientes';
import { createBien, listBienes } from '../api/bienes';
import { createVehiculo, listVehiculos } from '../api/vehiculos';
import { createInmueble, listInmuebles } from '../api/inmuebles';
import { preventBackdropClose } from '../utils/dialog';
import { canEditCliente } from '../utils/clienteHierarchy';
import { formatMonto } from '../utils/format';
import {
  BIEN_TIPO_LABELS,
  canCrearBienes,
  canCrearInmuebles,
  canCrearVehiculos,
  canVerBienes,
  canVerInmuebles,
  canVerVehiculos,
} from '../utils/creditoPrendarioHierarchy';
import type { Bien, Cliente, Estado, Inmueble, TipoDocumento, Vehiculo } from '../types/api';

interface EditFormState {
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
  estado: Estado;
  foto_cliente: File | null;
  foto_dni: File | null;
  foto_dni_reverso: File | null;
  foto_casa: File | null;
  foto_negocio: File | null;
}

function formFromCliente(cliente: Cliente): EditFormState {
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
    estado: cliente.estado,
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
 * Diálogo de edición de cliente, autocontenido: mismas 4 pestañas
 * (Cliente/Casa/Negocio/Fotografías) y accesos a Ficha socioeconómica /
 * Bienes / Vehículos / Inmuebles que ClientesPage — reutilizado tal cual
 * desde cualquier página que ya tenga un cliente seleccionado y necesite
 * corregirlo sin salir a Clientes (ClientesPage mismo, y
 * CreditosPrendariosPage: editar el cliente elegido al registrar un
 * crédito, para las 4 variantes prendario/vehicular/hipotecario/diario).
 */
export function ClienteEditDialog({ cliente, onClose, onSaved }: ClienteEditDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<EditFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setAhora] = useState(() => Date.now());

  const [fichaOpen, setFichaOpen] = useState(false);
  const [bienesOpen, setBienesOpen] = useState(false);
  const [vehiculosOpen, setVehiculosOpen] = useState(false);
  const [inmueblesOpen, setInmueblesOpen] = useState(false);

  useEffect(() => {
    if (cliente) {
      setForm(formFromCliente(cliente));
      setError(null);
      setFichaOpen(false);
      setBienesOpen(false);
      setVehiculosOpen(false);
      setInmueblesOpen(false);
    }
  }, [cliente]);

  useEffect(() => {
    if (!cliente) return;

    const interval = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [cliente]);

  const puedeEditar = cliente ? canEditCliente(user, cliente) : false;

  if (!cliente || !form) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!cliente || !form) return;

    if (!puedeEditar) {
      setError('No tienes un permiso temporal vigente para editar este cliente.');
      return;
    }

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
        estado: form.estado,
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

  const clienteNombre = `${cliente.nombre} ${cliente.apellido}`.toUpperCase();

  const tabs: NavigationTabItem[] = [
    {
      key: 'cliente',
      label: 'Cliente',
      icon: <PersonIcon fontSize="small" />,
      content: (
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Tipo de documento"
              value={form.tipo_documento}
              onChange={(e) => setForm((f) => f && { ...f, tipo_documento: e.target.value as TipoDocumento })}
              fullWidth
              sx={{ maxWidth: 160 }}
            >
              <MenuItem value="dni">DNI</MenuItem>
              <MenuItem value="ce">CE</MenuItem>
              <MenuItem value="pasaporte">Pasaporte</MenuItem>
            </TextField>
            <TextField
              label="Número de documento"
              value={form.numero_documento}
              onChange={(e) => setForm((f) => f && { ...f, numero_documento: e.target.value })}
              required
              autoFocus
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <UpperTextField
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm((f) => f && { ...f, nombre: e.target.value })}
              required
              fullWidth
            />
            <UpperTextField
              label="Apellido"
              value={form.apellido}
              onChange={(e) => setForm((f) => f && { ...f, apellido: e.target.value })}
              required
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Fecha de nacimiento"
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) => setForm((f) => f && { ...f, fecha_nacimiento: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              select
              label="Sexo"
              value={form.sexo}
              onChange={(e) => setForm((f) => f && { ...f, sexo: e.target.value as EditFormState['sexo'] })}
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
              value={form.estado_civil}
              onChange={(e) => setForm((f) => f && { ...f, estado_civil: e.target.value })}
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
              value={form.email}
              onChange={(e) => setForm((f) => f && { ...f, email: e.target.value })}
              fullWidth
            />
          </Stack>
          <TextField
            label="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm((f) => f && { ...f, telefono: e.target.value })}
          />
          <TextField
            select
            label="Estado"
            value={form.estado}
            onChange={(e) => setForm((f) => f && { ...f, estado: e.target.value as Estado })}
          >
            <MenuItem value="activo">Activo</MenuItem>
            <MenuItem value="inactivo">Inactivo</MenuItem>
          </TextField>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => setFichaOpen(true)}>
              Ficha socioeconómica
            </Button>
            {canVerBienes(user) && (
              <Button variant="outlined" startIcon={<Inventory2Icon />} onClick={() => setBienesOpen(true)}>
                Bienes
              </Button>
            )}
            {canVerVehiculos(user) && (
              <Button variant="outlined" startIcon={<DirectionsCarIcon />} onClick={() => setVehiculosOpen(true)}>
                Vehículos
              </Button>
            )}
            {canVerInmuebles(user) && (
              <Button variant="outlined" startIcon={<HomeWorkIcon />} onClick={() => setInmueblesOpen(true)}>
                Inmuebles
              </Button>
            )}
          </Stack>
        </Stack>
      ),
    },
    {
      key: 'casa',
      label: 'Casa',
      icon: <HomeIcon fontSize="small" />,
      content: (
        <Stack spacing={2.5}>
          <UpperTextField
            label="Dirección"
            value={form.direccion}
            onChange={(e) => setForm((f) => f && { ...f, direccion: e.target.value })}
          />
          <UbigeoSelect
            value={form.ubigeo_distrito_id}
            onChange={(id) => setForm((f) => f && { ...f, ubigeo_distrito_id: id })}
          />
          <UpperTextField
            label="Referencia"
            value={form.referencia}
            onChange={(e) => setForm((f) => f && { ...f, referencia: e.target.value })}
            multiline
            minRows={2}
          />
          <LocationMap
            latitud={form.latitud}
            longitud={form.longitud}
            onChange={(latitud, longitud) => setForm((f) => f && { ...f, latitud, longitud })}
          />
        </Stack>
      ),
    },
    {
      key: 'negocio',
      label: 'Negocio',
      icon: <StorefrontIcon fontSize="small" />,
      content: (
        <Stack spacing={2.5}>
          <UpperTextField
            label="Dirección del negocio"
            value={form.direccion_negocio}
            onChange={(e) => setForm((f) => f && { ...f, direccion_negocio: e.target.value })}
          />
          <UbigeoSelect
            value={form.ubigeo_distrito_negocio_id}
            onChange={(id) => setForm((f) => f && { ...f, ubigeo_distrito_negocio_id: id })}
          />
          <UpperTextField
            label="Referencia del negocio"
            value={form.referencia_negocio}
            onChange={(e) => setForm((f) => f && { ...f, referencia_negocio: e.target.value })}
            multiline
            minRows={2}
          />
          <LocationMap
            latitud={form.latitud_negocio}
            longitud={form.longitud_negocio}
            onChange={(latitud_negocio, longitud_negocio) =>
              setForm((f) => f && { ...f, latitud_negocio, longitud_negocio })
            }
            label="Detectar GPS del negocio"
          />
        </Stack>
      ),
    },
    {
      key: 'fotografias',
      label: 'Fotografías',
      icon: <PhotoCameraIcon fontSize="small" />,
      content: (
        <Stack spacing={2.5}>
          <PhotoField
            label="Foto del cliente"
            file={form.foto_cliente}
            currentUrl={cliente.foto_cliente_url}
            onChange={(file) => setForm((f) => f && { ...f, foto_cliente: file })}
          />
          <PhotoField
            label="Foto del DNI (anverso)"
            file={form.foto_dni}
            currentUrl={cliente.foto_dni_url}
            onChange={(file) => setForm((f) => f && { ...f, foto_dni: file })}
          />
          <PhotoField
            label="Foto del DNI (reverso)"
            file={form.foto_dni_reverso}
            currentUrl={cliente.foto_dni_reverso_url}
            onChange={(file) => setForm((f) => f && { ...f, foto_dni_reverso: file })}
          />
          <PhotoField
            label="Foto de la casa"
            file={form.foto_casa}
            currentUrl={cliente.foto_casa_url}
            onChange={(file) => setForm((f) => f && { ...f, foto_casa: file })}
          />
          <PhotoField
            label="Foto del negocio"
            file={form.foto_negocio}
            currentUrl={cliente.foto_negocio_url}
            onChange={(file) => setForm((f) => f && { ...f, foto_negocio: file })}
          />
        </Stack>
      ),
    },
  ];

  return (
    <>
      <Dialog open={!!cliente} onClose={preventBackdropClose(onClose)} fullWidth maxWidth="lg">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogHeader onClose={onClose}>Editar cliente</DialogHeader>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {!puedeEditar && (
                <Alert severity="warning">No tienes un permiso temporal vigente para editar este cliente.</Alert>
              )}
              {error && <Alert severity="error">{error}</Alert>}
              <NavigationTabs key={cliente.id} tabs={tabs} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving || !puedeEditar}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {fichaOpen && (
        <FichaSocioeconomicaDialog
          clienteId={cliente.id}
          clienteNombre={clienteNombre}
          open={fichaOpen}
          onClose={() => setFichaOpen(false)}
        />
      )}

      {bienesOpen && (
        <ClienteGarantiaDialog<Bien, BienCreateFormValue>
          open={bienesOpen}
          onClose={() => setBienesOpen(false)}
          clienteId={cliente.id}
          clienteNombre={clienteNombre}
          title="Bienes"
          canCrear={canCrearBienes(user)}
          emptyMessage="Este cliente no tiene bienes registrados."
          addLabel="Agregar bien"
          emptyForm={emptyBienCreateForm}
          list={(clienteId) => listBienes(1, { clienteId })}
          create={(clienteId, form) => createBien({ cliente_id: clienteId, ...bienCreatePayload(form) })}
          renderFields={(value, onChange) => <BienCreateFields value={value} onChange={onChange} autoFocus />}
          renderItem={(bien) => (
            <Stack key={bien.id} direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Box component="span" sx={{ fontSize: 14 }}>
                {bien.nombre} ({BIEN_TIPO_LABELS[bien.tipo]})
              </Box>
              <Box component="span" sx={{ fontSize: 14, color: 'text.secondary' }}>
                {formatMonto(bien.valorizacion)}
              </Box>
            </Stack>
          )}
        />
      )}

      {vehiculosOpen && (
        <ClienteGarantiaDialog<Vehiculo, VehiculoCreateFormValue>
          open={vehiculosOpen}
          onClose={() => setVehiculosOpen(false)}
          clienteId={cliente.id}
          clienteNombre={clienteNombre}
          title="Vehículos"
          canCrear={canCrearVehiculos(user)}
          emptyMessage="Este cliente no tiene vehículos registrados."
          addLabel="Agregar vehículo"
          emptyForm={emptyVehiculoCreateForm}
          list={(clienteId) => listVehiculos(1, { clienteId })}
          create={(clienteId, form) => createVehiculo({ cliente_id: clienteId, ...vehiculoCreatePayload(form) })}
          renderFields={(value, onChange) => <VehiculoCreateFields value={value} onChange={onChange} autoFocus />}
          renderItem={(vehiculo) => (
            <Stack key={vehiculo.id} direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Box component="span" sx={{ fontSize: 14 }}>
                {vehiculo.marca} {vehiculo.modelo} — {vehiculo.placa.toUpperCase()}
              </Box>
              <Box component="span" sx={{ fontSize: 14, color: 'text.secondary' }}>
                {formatMonto(vehiculo.valorizacion)}
              </Box>
            </Stack>
          )}
        />
      )}

      {inmueblesOpen && (
        <ClienteGarantiaDialog<Inmueble, InmuebleCreateFormValue>
          open={inmueblesOpen}
          onClose={() => setInmueblesOpen(false)}
          clienteId={cliente.id}
          clienteNombre={clienteNombre}
          title="Inmuebles"
          canCrear={canCrearInmuebles(user)}
          emptyMessage="Este cliente no tiene inmuebles registrados."
          addLabel="Agregar inmueble"
          emptyForm={emptyInmuebleCreateForm}
          list={(clienteId) => listInmuebles(1, { clienteId })}
          create={(clienteId, form) => createInmueble({ cliente_id: clienteId, ...inmuebleCreatePayload(form) })}
          renderFields={(value, onChange) => <InmuebleCreateFields value={value} onChange={onChange} autoFocus />}
          renderItem={(inmueble) => (
            <Stack key={inmueble.id} direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
              <Box component="span" sx={{ fontSize: 14 }}>
                {inmueble.partida_registral} — {inmueble.direccion.toUpperCase()}
              </Box>
              <Box component="span" sx={{ fontSize: 14, color: 'text.secondary' }}>
                {formatMonto(inmueble.valorizacion)}
              </Box>
            </Stack>
          )}
        />
      )}
    </>
  );
}
