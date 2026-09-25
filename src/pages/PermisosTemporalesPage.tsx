import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, hasRole } from '../utils/roles';
import { extractUserName } from '../utils/cajaHierarchy';
import { formatFechaHora } from '../utils/format';
import { ClienteAutocomplete } from '../components/ClienteAutocomplete';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { DialogHeader } from '../components/DialogHeader';
import { RowActions, type RowAction } from '../components/RowActions';
import { preventBackdropClose } from '../utils/dialog';
import {
  concederPermisoTemporalCliente,
  listPermisosTemporales,
  revocarPermisoTemporalCliente,
  type EstadoPermisoTemporal,
} from '../api/permisosTemporales';
import type { Cliente, PaginatedData, PermisoTemporalCliente } from '../types/api';

const ESTADOS: Array<{ value: EstadoPermisoTemporal; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'vigente', label: 'Vigentes' },
  { value: 'expirado', label: 'Expirados' },
  { value: 'revocado', label: 'Revocados' },
];

function nombreUsuario(usuario: PermisoTemporalCliente['concedido_por_usuario']): string {
  return extractUserName(usuario) ?? '—';
}

export function PermisosTemporalesPage() {
  const { user } = useAuth();
  const puedeGestionar = hasRole(user, 'sistemas') || hasPermission(user, 'gestion.permisos_temporales');

  const [result, setResult] = useState<PaginatedData<PermisoTemporalCliente> | null>(null);
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState<EstadoPermisoTemporal>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [grantOpen, setGrantOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [grantMotivo, setGrantMotivo] = useState('');
  const [grantError, setGrantError] = useState<string | null>(null);
  const [isGranting, setIsGranting] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<PermisoTemporalCliente | null>(null);
  const [revokeMotivo, setRevokeMotivo] = useState('');
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  function loadPermisos() {
    if (!puedeGestionar) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    listPermisosTemporales({ page, estado, perPage: 15 })
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadPermisos, [page, estado, puedeGestionar]);

  if (!puedeGestionar) {
    return <Navigate to="/" replace />;
  }

  function openGrantDialog() {
    setSelectedClient(null);
    setGrantMotivo('');
    setGrantError(null);
    setGrantOpen(true);
  }

  async function handleGrant(event: FormEvent) {
    event.preventDefault();
    if (!selectedClient || !grantMotivo.trim()) {
      setGrantError('Selecciona un cliente e indica el motivo.');
      return;
    }

    setGrantError(null);
    setIsGranting(true);

    try {
      await concederPermisoTemporalCliente(selectedClient.id, grantMotivo.trim());
      setGrantOpen(false);
      setPage(1);
      loadPermisos();
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsGranting(false);
    }
  }

  function openRevokeDialog(permiso: PermisoTemporalCliente) {
    setRevokeTarget(permiso);
    setRevokeMotivo('');
    setRevokeError(null);
  }

  async function handleRevoke(event: FormEvent) {
    event.preventDefault();
    if (!revokeTarget || !revokeMotivo.trim()) {
      setRevokeError('Indica el motivo de la revocación.');
      return;
    }

    setRevokeError(null);
    setIsRevoking(true);

    try {
      await revocarPermisoTemporalCliente(revokeTarget.id, revokeMotivo.trim());
      setRevokeTarget(null);
      loadPermisos();
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsRevoking(false);
    }
  }

  const columns: DataTableColumn<PermisoTemporalCliente>[] = [
    {
      header: 'Cliente',
      render: (permiso) =>
        permiso.cliente
          ? `${permiso.cliente.nombre} ${permiso.cliente.apellido} — ${permiso.cliente.numero_documento}`
          : 'Cliente eliminado',
    },
    {
      header: 'Asesor',
      render: (permiso) => extractUserName(permiso.usuario) ?? '—',
    },
    {
      header: 'Concedido por',
      render: (permiso) => nombreUsuario(permiso.concedido_por_usuario),
    },
    { header: 'Inicio', render: (permiso) => formatFechaHora(permiso.concedido_at) },
    { header: 'Expira', render: (permiso) => formatFechaHora(permiso.expira_at) },
    {
      header: 'Estado',
      render: (permiso) => (
        <Chip
          label={ESTADOS.find((item) => item.value === permiso.estado)?.label ?? permiso.estado}
          size="small"
          color={permiso.estado === 'vigente' ? 'success' : permiso.estado === 'revocado' ? 'error' : 'default'}
        />
      ),
    },
    {
      header: 'Motivo',
      render: (permiso) => (
        <Stack spacing={0.25}>
          <span>{permiso.motivo}</span>
          {permiso.motivo_revocacion && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Revocación: {permiso.motivo_revocacion}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (permiso) => {
        const actions: RowAction[] = [];
        if (permiso.estado === 'vigente') {
          actions.push({
            key: 'revocar',
            label: 'Revocar',
            icon: <BlockIcon fontSize="small" />,
            onClick: () => openRevokeDialog(permiso),
          });
        }
        return <RowActions actions={actions} />;
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Stack>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Permisos temporales
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Habilita durante 60 minutos la edición de un cliente por su asesor asignado.
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openGrantDialog}>
          Conceder permiso
        </Button>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <TextField
        select
        label="Estado"
        value={estado}
        onChange={(event) => {
          setEstado(event.target.value as EstadoPermisoTemporal);
          setPage(1);
        }}
        size="small"
        sx={{ maxWidth: 220 }}
      >
        {ESTADOS.map((item) => (
          <MenuItem key={item.value} value={item.value}>
            {item.label}
          </MenuItem>
        ))}
      </TextField>

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(permiso) => permiso.id}
        isLoading={isLoading}
        emptyMessage="No hay permisos temporales registrados"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={grantOpen} onClose={preventBackdropClose(() => setGrantOpen(false))} fullWidth maxWidth="sm">
        <DialogHeader onClose={() => setGrantOpen(false)}>Conceder permiso temporal</DialogHeader>
        <BoxForm onSubmit={handleGrant}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {grantError && <Alert severity="error">{grantError}</Alert>}
              <ClienteAutocomplete
                value={selectedClient}
                onChange={setSelectedClient}
                label="Cliente con asesor asignado"
                required
                autoFocus
              />
              {selectedClient && !selectedClient.asesor_id && (
                <Alert severity="warning">Este cliente no tiene un asesor asignado.</Alert>
              )}
              {selectedClient?.asesor && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Se concederá a {selectedClient.asesor.nombre} {selectedClient.asesor.apellido}.
                </Typography>
              )}
              <TextField
                label="Motivo"
                value={grantMotivo}
                onChange={(event) => setGrantMotivo(event.target.value)}
                multiline
                minRows={3}
                required
                helperText="Se guardará en la auditoría del permiso."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setGrantOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isGranting || !selectedClient?.asesor_id}>
              {isGranting ? 'Concediendo...' : 'Conceder por 60 minutos'}
            </Button>
          </DialogActions>
        </BoxForm>
      </Dialog>

      <Dialog
        open={!!revokeTarget}
        onClose={preventBackdropClose(() => setRevokeTarget(null))}
        fullWidth
        maxWidth="sm"
      >
        <DialogHeader onClose={() => setRevokeTarget(null)}>Revocar permiso temporal</DialogHeader>
        <BoxForm onSubmit={handleRevoke}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {revokeError && <Alert severity="error">{revokeError}</Alert>}
              <Typography variant="body2">
                Se revocará el permiso de {revokeTarget?.usuario?.nombre} {revokeTarget?.usuario?.apellido} para editar el
                cliente seleccionado.
              </Typography>
              <TextField
                label="Motivo de la revocación"
                value={revokeMotivo}
                onChange={(event) => setRevokeMotivo(event.target.value)}
                multiline
                minRows={3}
                required
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setRevokeTarget(null)}>Cancelar</Button>
            <Button type="submit" color="error" variant="contained" disabled={isRevoking}>
              {isRevoking ? 'Revocando...' : 'Revocar permiso'}
            </Button>
          </DialogActions>
        </BoxForm>
      </Dialog>
    </Stack>
  );
}

function BoxForm({ children, onSubmit }: { children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit}>{children}</form>;
}
