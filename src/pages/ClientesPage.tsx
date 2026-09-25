import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import DescriptionIcon from '@mui/icons-material/Description';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import {
  canAsignarClientes,
  canCreateClientes,
  canDeleteClientes,
  canEditCliente,
  canViewClientes,
  TIPO_DOCUMENTO_LABELS,
} from '../utils/clienteHierarchy';
import {
  BIEN_TIPO_LABELS,
  canCrearBienes,
  canCrearInmuebles,
  canCrearVehiculos,
  canVerBienes,
  canVerInmuebles,
  canVerVehiculos,
} from '../utils/creditoPrendarioHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { DialogHeader } from '../components/DialogHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { RowActions, type RowAction } from '../components/RowActions';
import { ClienteEditDialog } from '../components/ClienteEditDialog';
import { ClienteCreateDialog } from '../components/ClienteCreateDialog';
import { BienCreateFields, bienCreatePayload, emptyBienCreateForm, type BienCreateFormValue } from '../components/BienCreateFields';
import {
  VehiculoCreateFields,
  vehiculoCreatePayload,
  emptyVehiculoCreateForm,
  type VehiculoCreateFormValue,
} from '../components/VehiculoCreateFields';
import {
  InmuebleCreateFields,
  inmuebleCreatePayload,
  emptyInmuebleCreateForm,
  type InmuebleCreateFormValue,
} from '../components/InmuebleCreateFields';
import { FichaSocioeconomicaDialog } from '../components/FichaSocioeconomicaDialog';
import { ClienteGarantiaDialog } from '../components/ClienteGarantiaDialog';
import { capitalize } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import {
  asignarCliente,
  deleteCliente,
  getAsesoresParaAsignar,
  listClientes,
  type AsesorParaAsignar,
} from '../api/clientes';
import { createBien, listBienes } from '../api/bienes';
import { createVehiculo, listVehiculos } from '../api/vehiculos';
import { createInmueble, listInmuebles } from '../api/inmuebles';
import { listEmpresas } from '../api/empresas';
import { listAgencias } from '../api/agencias';
import { formatMonto } from '../utils/format';
import type { Agencia, Bien, Cliente, Empresa, Estado, Inmueble, PaginatedData, TipoDocumento, Vehiculo } from '../types/api';

interface FiltersState {
  q: string;
  estado: Estado | '';
  tipo_documento: TipoDocumento | '';
  agencia_id?: number;
}

const emptyFilters: FiltersState = { q: '', estado: '', tipo_documento: '' };

export function ClientesPage() {
  const { user } = useAuth();
  const isSistemas = hasRole(user, 'sistemas');
  const needsAgenciaPicker = hasRole(user, 'sistemas', 'administrador_general', 'secretaria');
  const canCreate = canCreateClientes(user);
  const canDelete = canDeleteClientes(user);
  const canAsignar = canAsignarClientes(user);

  const [result, setResult] = useState<PaginatedData<Cliente> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [asesoresDisponibles, setAsesoresDisponibles] = useState<AsesorParaAsignar[]>([]);

  const [filters, setFilters] = useState<FiltersState>(emptyFilters);

  function updateFilters(patch: Partial<FiltersState>) {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Cliente | null>(null);
  const [createEmpresaId, setCreateEmpresaId] = useState<number | undefined>(undefined);
  const [createAgenciaId, setCreateAgenciaId] = useState<number | undefined>(undefined);

  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dniCopied, setDniCopied] = useState(false);
  const [fichaTarget, setFichaTarget] = useState<Cliente | null>(null);
  const [bienesTarget, setBienesTarget] = useState<Cliente | null>(null);
  const [vehiculosTarget, setVehiculosTarget] = useState<Cliente | null>(null);
  const [inmueblesTarget, setInmueblesTarget] = useState<Cliente | null>(null);

  const [asignarTarget, setAsignarTarget] = useState<Cliente | null>(null);
  const [asesorId, setAsesorId] = useState<number | ''>('');
  const [isAsignando, setIsAsignando] = useState(false);

  function loadClientes() {
    setIsLoading(true);
    setLoadError(null);

    listClientes({
      page,
      q: filters.q || undefined,
      estado: filters.estado || undefined,
      tipo_documento: filters.tipo_documento || undefined,
      agencia_id: filters.agencia_id,
    })
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadClientes, [page, filters]);

  useEffect(() => {
    if (isSistemas) {
      listEmpresas().then((res) => setEmpresas(res.data.data));
    }
  }, [isSistemas]);

  useEffect(() => {
    if (needsAgenciaPicker) {
      listAgencias().then((res) => setAgencias(res.data.data));
    }
  }, [needsAgenciaPicker]);

  useEffect(() => {
    if (canAsignar && asignarTarget) {
      getAsesoresParaAsignar(asignarTarget.agencia_id)
        .then((res) => setAsesoresDisponibles(res.data))
        .catch(() => setAsesoresDisponibles([]));
    } else {
      setAsesoresDisponibles([]);
    }
  }, [canAsignar, asignarTarget]);

  if (!canViewClientes(user)) {
    return <Navigate to="/" replace />;
  }

  const availableAgencias = isSistemas
    ? agencias.filter((a) => a.empresa_id === createEmpresaId)
    : agencias;

  function openCreateDialog() {
    setCreateEmpresaId(undefined);
    setCreateAgenciaId(undefined);
    setDialogOpen(true);
  }

  function openEditDialog(cliente: Cliente) {
    setEditTarget(cliente);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      await deleteCliente(deleteTarget.id);
      setDeleteTarget(null);
      loadClientes();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeleting(false);
    }
  }

  function handleCopyDni(dni: string) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(dni).then(() => setDniCopied(true));
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = dni;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      document.execCommand('copy');
      setDniCopied(true);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  async function handleAsignar() {
    if (!asignarTarget || asesorId === '') return;

    setIsAsignando(true);

    try {
      await asignarCliente(asignarTarget.id, asesorId);
      setAsignarTarget(null);
      setAsesorId('');
      loadClientes();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsAsignando(false);
    }
  }

  const columns: DataTableColumn<Cliente>[] = [
    { header: 'Nombre', render: (c) => `${c.nombre} ${c.apellido}`.toUpperCase() },
    {
      header: 'Documento',
      render: (c) => (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Typography variant="body2">
            {TIPO_DOCUMENTO_LABELS[c.tipo_documento] ?? c.tipo_documento} {c.numero_documento}
          </Typography>
          <Tooltip title="Copiar número de documento">
            <IconButton
              size="small"
              aria-label="Copiar número de documento"
              onClick={() => handleCopyDni(c.numero_documento)}
            >
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
    { header: 'Teléfono', render: (c) => c.telefono ?? '—' },
    { header: 'Agencia', render: (c) => c.agencia?.nombre.toUpperCase() ?? '—' },
    {
      header: 'Asesor',
      render: (c) => (c.asesor ? `${c.asesor.nombre} ${c.asesor.apellido}`.toUpperCase() : 'Sin asignar'),
    },
    {
      header: 'Estado',
      render: (c) => (
        <Chip
          label={capitalize(c.estado)}
          size="small"
          color={c.estado === 'activo' ? 'success' : 'default'}
        />
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (c) => {
        const actions: RowAction[] = [];

        if (canEditCliente(user, c)) {
          actions.push({
            key: 'editar',
            label: 'Editar',
            icon: <EditIcon fontSize="small" />,
            onClick: () => openEditDialog(c),
          });
          actions.push({
            key: 'ficha',
            label: 'Ficha socioeconómica',
            icon: <DescriptionIcon fontSize="small" />,
            onClick: () => setFichaTarget(c),
          });
        }
        if (canVerBienes(user)) {
          actions.push({
            key: 'bienes',
            label: 'Bienes',
            icon: <Inventory2Icon fontSize="small" />,
            onClick: () => setBienesTarget(c),
          });
        }
        if (canVerVehiculos(user)) {
          actions.push({
            key: 'vehiculos',
            label: 'Vehículos',
            icon: <DirectionsCarIcon fontSize="small" />,
            onClick: () => setVehiculosTarget(c),
          });
        }
        if (canVerInmuebles(user)) {
          actions.push({
            key: 'inmuebles',
            label: 'Inmuebles',
            icon: <HomeWorkIcon fontSize="small" />,
            onClick: () => setInmueblesTarget(c),
          });
        }
        if (canAsignar) {
          actions.push({
            key: 'asignar',
            label: 'Asignar asesor',
            icon: <AssignmentIndIcon fontSize="small" />,
            onClick: () => setAsignarTarget(c),
          });
        }
        if (canDelete) {
          actions.push({
            key: 'eliminar',
            label: 'Eliminar',
            icon: <DeleteIcon fontSize="small" />,
            onClick: () => setDeleteTarget(c),
          });
        }

        return <RowActions actions={actions} />;
      },
    },
  ];

  const activeFiltersCount = [
    filters.q,
    filters.estado,
    filters.tipo_documento,
    filters.agencia_id,
  ].filter((value) => value !== '' && value !== undefined).length;

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Clientes
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <FiltrosPanel activeCount={activeFiltersCount} onClear={() => updateFilters(emptyFilters)}>
            <TextField
              label="Buscar"
              placeholder="Nombre, apellido o documento"
              value={filters.q}
              onChange={(e) => updateFilters({ q: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              select
              label="Estado"
              value={filters.estado}
              onChange={(e) => updateFilters({ estado: e.target.value as Estado | '' })}
              size="small"
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="activo">Activo</MenuItem>
              <MenuItem value="inactivo">Inactivo</MenuItem>
            </TextField>
            <TextField
              select
              label="Tipo de documento"
              value={filters.tipo_documento}
              onChange={(e) =>
                updateFilters({ tipo_documento: e.target.value as TipoDocumento | '' })
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(TIPO_DOCUMENTO_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            {agencias.length > 0 && (
              <TextField
                select
                label="Agencia"
                value={filters.agencia_id ?? ''}
                onChange={(e) =>
                  updateFilters({
                    agencia_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                size="small"
                fullWidth
              >
                <MenuItem value="">Todas</MenuItem>
                {agencias.map((agencia) => (
                  <MenuItem key={agencia.id} value={agencia.id}>
                    {agencia.nombre.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </FiltrosPanel>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Nuevo cliente
            </Button>
          )}
        </Stack>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay clientes registrados"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <ClienteCreateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(cliente) => {
          loadClientes();
          setDialogOpen(false);
          // Un asesor solo puede abrir el formulario si ya tiene una
          // concesión temporal vigente; los roles con permiso estático
          // mantienen el flujo de crear → editar para agregar adjunctos.
          if (canEditCliente(user, cliente)) {
            openEditDialog(cliente);
          }
        }}
        draftKey="cliente-create"
        payloadExtra={{
          empresa_id: isSistemas ? createEmpresaId : undefined,
          agencia_id: needsAgenciaPicker ? createAgenciaId : undefined,
        }}
        extraFields={
          <>
            {isSistemas && (
              <TextField
                select
                label="Empresa"
                value={createEmpresaId ?? ''}
                onChange={(e) => {
                  setCreateEmpresaId(Number(e.target.value));
                  setCreateAgenciaId(undefined);
                }}
                required
              >
                {empresas.map((empresa) => (
                  <MenuItem key={empresa.id} value={empresa.id}>
                    {empresa.nombre.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {needsAgenciaPicker && (
              <TextField
                select
                label="Agencia"
                value={createAgenciaId ?? ''}
                onChange={(e) => setCreateAgenciaId(Number(e.target.value))}
                required
              >
                {availableAgencias.map((agencia) => (
                  <MenuItem key={agencia.id} value={agencia.id}>
                    {agencia.nombre.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </>
        }
      />

      <ClienteEditDialog
        cliente={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          loadClientes();
          setEditTarget(null);
        }}
      />

      <Dialog open={!!asignarTarget} onClose={preventBackdropClose(() => setAsignarTarget(null))} fullWidth maxWidth="xs">
        <DialogHeader onClose={() => setAsignarTarget(null)}>Asignar cliente</DialogHeader>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {asignarTarget?.nombre} {asignarTarget?.apellido}
            </Typography>
            <TextField
              select
              label="Asesor"
              value={asesorId}
              onChange={(e) => setAsesorId(Number(e.target.value))}
              required
              helperText={asesoresDisponibles.length === 0 ? 'No hay asesores disponibles en esta agencia' : undefined}
            >
              {asesoresDisponibles.map((asesor) => (
                <MenuItem key={asesor.id} value={asesor.id}>
                  {`${asesor.nombre} ${asesor.apellido}`.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAsignarTarget(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAsignar}
            disabled={isAsignando || asesorId === ''}
          >
            {isAsignando ? 'Asignando...' : 'Asignar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar cliente"
        message={
          <Typography>
            ¿Seguro que deseas eliminar a{' '}
            <strong>
              {deleteTarget?.nombre} {deleteTarget?.apellido}
            </strong>
            ?
          </Typography>
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />

      <Snackbar
        open={dniCopied}
        autoHideDuration={2000}
        onClose={() => setDniCopied(false)}
        message="Número de documento copiado"
      />

      {fichaTarget && (
        <FichaSocioeconomicaDialog
          clienteId={fichaTarget.id}
          clienteNombre={`${fichaTarget.nombre} ${fichaTarget.apellido}`.toUpperCase()}
          open={!!fichaTarget}
          onClose={() => setFichaTarget(null)}
        />
      )}

      {bienesTarget && (
        <ClienteGarantiaDialog<Bien, BienCreateFormValue>
          open={!!bienesTarget}
          onClose={() => setBienesTarget(null)}
          clienteId={bienesTarget.id}
          clienteNombre={`${bienesTarget.nombre} ${bienesTarget.apellido}`.toUpperCase()}
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
              <Typography variant="body2">
                {bien.nombre} ({BIEN_TIPO_LABELS[bien.tipo]})
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {formatMonto(bien.valorizacion)}
              </Typography>
            </Stack>
          )}
        />
      )}

      {vehiculosTarget && (
        <ClienteGarantiaDialog<Vehiculo, VehiculoCreateFormValue>
          open={!!vehiculosTarget}
          onClose={() => setVehiculosTarget(null)}
          clienteId={vehiculosTarget.id}
          clienteNombre={`${vehiculosTarget.nombre} ${vehiculosTarget.apellido}`.toUpperCase()}
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
              <Typography variant="body2">
                {vehiculo.marca} {vehiculo.modelo} — {vehiculo.placa.toUpperCase()}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {formatMonto(vehiculo.valorizacion)}
              </Typography>
            </Stack>
          )}
        />
      )}

      {inmueblesTarget && (
        <ClienteGarantiaDialog<Inmueble, InmuebleCreateFormValue>
          open={!!inmueblesTarget}
          onClose={() => setInmueblesTarget(null)}
          clienteId={inmueblesTarget.id}
          clienteNombre={`${inmueblesTarget.nombre} ${inmueblesTarget.apellido}`.toUpperCase()}
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
              <Typography variant="body2">
                {inmueble.partida_registral} — {inmueble.direccion.toUpperCase()}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {formatMonto(inmueble.valorizacion)}
              </Typography>
            </Stack>
          )}
        />
      )}
    </Stack>
  );
}
