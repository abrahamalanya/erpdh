import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
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
import { BIEN_TIPO_LABELS, canCrearBienes, canVerBienes } from '../utils/creditoPrendarioHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RowActions, type RowAction } from '../components/RowActions';
import { PhotoField } from '../components/MediaFields';
import { UpperTextField } from '../components/UpperTextField';
import {
  ClienteCreateFields,
  clienteCreatePayload,
  emptyClienteCreateForm,
  type ClienteCreateFormValue,
} from '../components/ClienteCreateFields';
import { BienCreateFields, bienCreatePayload, emptyBienCreateForm, type BienCreateFormValue } from '../components/BienCreateFields';
import { capitalize } from '../utils/format';
import { preventBackdropClose } from '../utils/dialog';
import {
  asignarCliente,
  createCliente,
  deleteCliente,
  listClientes,
  updateCliente,
  type CreateClientePayload,
  type UpdateClientePayload,
} from '../api/clientes';
import { createBien, listBienes } from '../api/bienes';
import { listEmpresas } from '../api/empresas';
import { listAgencias } from '../api/agencias';
import { listUsers } from '../api/users';
import { formatMonto } from '../utils/format';
import type { Agencia, Bien, Cliente, Empresa, Estado, PaginatedData, TipoDocumento, User } from '../types/api';

interface CreateFormState extends ClienteCreateFormValue {
  empresa_id?: number;
  agencia_id?: number;
}

interface EditFormState {
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  telefono: string;
  direccion: string;
  referencia: string;
  estado: Estado;
  foto_cliente: File | null;
  foto_dni: File | null;
  foto_dni_reverso: File | null;
  foto_casa: File | null;
  foto_negocio: File | null;
}

const emptyCreateForm: CreateFormState = { ...emptyClienteCreateForm };

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
  const [subordinados, setSubordinados] = useState<User[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [bienes, setBienes] = useState<Bien[]>([]);
  const [bienesLoading, setBienesLoading] = useState(false);
  const [bienDialogOpen, setBienDialogOpen] = useState(false);
  const [bienForm, setBienForm] = useState<BienCreateFormValue>(emptyBienCreateForm);
  const [bienFormError, setBienFormError] = useState<string | null>(null);
  const [isSavingBien, setIsSavingBien] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [asignarTarget, setAsignarTarget] = useState<Cliente | null>(null);
  const [asesorId, setAsesorId] = useState<number | ''>('');
  const [isAsignando, setIsAsignando] = useState(false);

  function loadClientes() {
    setIsLoading(true);
    setLoadError(null);

    listClientes(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadClientes, [page]);

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
    if (canAsignar && user) {
      listUsers(1).then((res) => {
        setSubordinados(
          res.data.data.filter(
            (u) => u.supervisor_id === user.id && u.roles?.some((r) => r.name === 'asesor')
          )
        );
      });
    }
  }, [canAsignar, user]);

  function loadBienesDeCliente(clienteId: number) {
    setBienesLoading(true);

    listBienes(1, { clienteId })
      .then((res) => setBienes(res.data.data))
      .finally(() => setBienesLoading(false));
  }

  useEffect(() => {
    if (editing && canVerBienes(user)) {
      loadBienesDeCliente(editing.id);
    } else {
      setBienes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  function openAddBienDialog() {
    setBienForm(emptyBienCreateForm);
    setBienFormError(null);
    setBienDialogOpen(true);
  }

  async function handleAddBien(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setBienFormError(null);
    setIsSavingBien(true);

    try {
      await createBien({ cliente_id: editing.id, ...bienCreatePayload(bienForm) });
      setBienDialogOpen(false);
      loadBienesDeCliente(editing.id);
    } catch (err) {
      setBienFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSavingBien(false);
    }
  }

  if (!canViewClientes(user)) {
    return <Navigate to="/" replace />;
  }

  const availableAgencias = isSistemas
    ? agencias.filter((a) => a.empresa_id === createForm.empresa_id)
    : agencias;

  function openCreateDialog() {
    setEditing(null);
    setCreateForm(emptyCreateForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(cliente: Cliente) {
    setEditing(cliente);
    setEditForm({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      tipo_documento: cliente.tipo_documento,
      numero_documento: cliente.numero_documento,
      telefono: cliente.telefono ?? '',
      direccion: cliente.direccion ?? '',
      referencia: cliente.referencia ?? '',
      estado: cliente.estado,
      foto_cliente: null,
      foto_dni: null,
      foto_dni_reverso: null,
      foto_casa: null,
      foto_negocio: null,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (editing && editForm) {
        const payload: UpdateClientePayload = {
          nombre: editForm.nombre.toLowerCase(),
          apellido: editForm.apellido.toLowerCase(),
          tipo_documento: editForm.tipo_documento,
          numero_documento: editForm.numero_documento,
          telefono: editForm.telefono || undefined,
          direccion: editForm.direccion ? editForm.direccion.toLowerCase() : undefined,
          referencia: editForm.referencia ? editForm.referencia.toLowerCase() : undefined,
          estado: editForm.estado,
          foto_cliente: editForm.foto_cliente,
          foto_dni: editForm.foto_dni,
          foto_dni_reverso: editForm.foto_dni_reverso,
          foto_casa: editForm.foto_casa,
          foto_negocio: editForm.foto_negocio,
        };

        await updateCliente(editing.id, payload);
      } else {
        const payload: CreateClientePayload = { ...clienteCreatePayload(createForm) };

        if (isSistemas) payload.empresa_id = createForm.empresa_id;
        if (needsAgenciaPicker) payload.agencia_id = createForm.agencia_id;

        const created = await createCliente(payload);
        loadClientes();

        // Keep the dialog open, switched into edit mode on the cliente we
        // just created, so bienes can be added right away without leaving
        // the modal — a brand-new cliente has no id until this point, so
        // the Bienes section can only appear from here on.
        openEditDialog(created.data);
        return;
      }

      setDialogOpen(false);
      loadClientes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
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
      render: (c) => `${TIPO_DOCUMENTO_LABELS[c.tipo_documento] ?? c.tipo_documento} ${c.numero_documento}`,
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

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Clientes
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nuevo cliente
          </Button>
        )}
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

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}

              {editing && editForm ? (
                <>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      select
                      label="Tipo de documento"
                      value={editForm.tipo_documento}
                      onChange={(e) =>
                        setEditForm((f) => f && { ...f, tipo_documento: e.target.value as TipoDocumento })
                      }
                      fullWidth
                      sx={{ maxWidth: 160 }}
                    >
                      <MenuItem value="dni">DNI</MenuItem>
                      <MenuItem value="ce">CE</MenuItem>
                      <MenuItem value="pasaporte">Pasaporte</MenuItem>
                    </TextField>
                    <TextField
                      label="Número de documento"
                      value={editForm.numero_documento}
                      onChange={(e) =>
                        setEditForm((f) => f && { ...f, numero_documento: e.target.value })
                      }
                      required
                      autoFocus
                      fullWidth
                    />
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <UpperTextField
                      label="Nombre"
                      value={editForm.nombre}
                      onChange={(e) => setEditForm((f) => f && { ...f, nombre: e.target.value })}
                      required
                      fullWidth
                    />
                    <UpperTextField
                      label="Apellido"
                      value={editForm.apellido}
                      onChange={(e) => setEditForm((f) => f && { ...f, apellido: e.target.value })}
                      required
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Teléfono"
                    value={editForm.telefono}
                    onChange={(e) => setEditForm((f) => f && { ...f, telefono: e.target.value })}
                  />
                  <UpperTextField
                    label="Dirección"
                    value={editForm.direccion}
                    onChange={(e) => setEditForm((f) => f && { ...f, direccion: e.target.value })}
                  />
                  <UpperTextField
                    label="Referencia"
                    value={editForm.referencia}
                    onChange={(e) => setEditForm((f) => f && { ...f, referencia: e.target.value })}
                    multiline
                    minRows={2}
                  />
                  <TextField
                    select
                    label="Estado"
                    value={editForm.estado}
                    onChange={(e) => setEditForm((f) => f && { ...f, estado: e.target.value as Estado })}
                  >
                    <MenuItem value="activo">Activo</MenuItem>
                    <MenuItem value="inactivo">Inactivo</MenuItem>
                  </TextField>

                  <Typography variant="subtitle2">Fotos</Typography>
                  <PhotoField
                    label="Foto del cliente"
                    file={editForm.foto_cliente}
                    currentUrl={editing.foto_cliente_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_cliente: file })}
                  />
                  <PhotoField
                    label="Foto del DNI (anverso)"
                    file={editForm.foto_dni}
                    currentUrl={editing.foto_dni_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_dni: file })}
                  />
                  <PhotoField
                    label="Foto del DNI (reverso)"
                    file={editForm.foto_dni_reverso}
                    currentUrl={editing.foto_dni_reverso_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_dni_reverso: file })}
                  />
                  <PhotoField
                    label="Foto de la casa"
                    file={editForm.foto_casa}
                    currentUrl={editing.foto_casa_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_casa: file })}
                  />
                  <PhotoField
                    label="Foto del negocio"
                    file={editForm.foto_negocio}
                    currentUrl={editing.foto_negocio_url}
                    onChange={(file) => setEditForm((f) => f && { ...f, foto_negocio: file })}
                  />

                  {canVerBienes(user) && (
                    <>
                      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2">Bienes</Typography>
                        {canCrearBienes(user) && (
                          <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={openAddBienDialog}>
                            Agregar bien
                          </Button>
                        )}
                      </Stack>
                      {bienesLoading ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Cargando bienes...
                        </Typography>
                      ) : bienes.length === 0 ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Este cliente no tiene bienes registrados.
                        </Typography>
                      ) : (
                        <Stack spacing={0.5}>
                          {bienes.map((bien) => (
                            <Stack key={bien.id} direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                              <Typography variant="body2">
                                {bien.nombre} ({BIEN_TIPO_LABELS[bien.tipo]})
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {formatMonto(bien.valorizacion)}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      )}
                    </>
                  )}
                </>
              ) : (
                <ClienteCreateFields
                  value={createForm}
                  onChange={(v) => setCreateForm((f) => ({ ...f, ...v }))}
                  extraFields={
                    <>
                      {isSistemas && (
                        <TextField
                          select
                          label="Empresa"
                          value={createForm.empresa_id ?? ''}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              empresa_id: Number(e.target.value),
                              agencia_id: undefined,
                            }))
                          }
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
                          value={createForm.agencia_id ?? ''}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, agencia_id: Number(e.target.value) }))
                          }
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
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={bienDialogOpen} onClose={preventBackdropClose(() => setBienDialogOpen(false))} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleAddBien}>
          <DialogTitle>Agregar bien</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {bienFormError && <Alert severity="error">{bienFormError}</Alert>}
              <BienCreateFields value={bienForm} onChange={setBienForm} autoFocus />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setBienDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSavingBien}>
              {isSavingBien ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!asignarTarget} onClose={preventBackdropClose(() => setAsignarTarget(null))} fullWidth maxWidth="xs">
        <DialogTitle>Asignar cliente</DialogTitle>
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
              helperText={subordinados.length === 0 ? 'No tienes asesores a cargo' : undefined}
            >
              {subordinados.map((asesor) => (
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
    </Stack>
  );
}
