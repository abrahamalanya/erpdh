import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Stack,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { roleLabel } from '../utils/userHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { listRoles, updateRolePermissions } from '../api/roles';
import { listPermissions } from '../api/permissions';
import type { Permission, RoleWithPermissions } from '../types/api';

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function groupByModule(permissions: Permission[]): [string, Permission[]][] {
  const groups = new Map<string, Permission[]>();

  for (const permission of permissions) {
    const [module] = permission.name.split('.');
    groups.set(module, [...(groups.get(module) ?? []), permission]);
  }

  return Array.from(groups.entries());
}

export function RolesPage() {
  const { user } = useAuth();

  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState<RoleWithPermissions | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function loadRoles() {
    setIsLoading(true);
    setLoadError(null);

    listRoles()
      .then((res) => setRoles(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadRoles, []);

  useEffect(() => {
    listPermissions().then((res) => setPermissions(res.data));
  }, []);

  if (!hasRole(user, 'sistemas')) {
    return <Navigate to="/" replace />;
  }

  function openEditDialog(role: RoleWithPermissions) {
    setEditing(role);
    setSelected(new Set(role.permissions.map((p) => p.name)));
    setFormError(null);
  }

  function togglePermission(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!editing) return;

    setFormError(null);
    setIsSaving(true);

    try {
      await updateRolePermissions(editing.id, Array.from(selected));
      setEditing(null);
      loadRoles();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<RoleWithPermissions>[] = [
    { header: 'Rol', render: (role) => roleLabel(role.name) },
    {
      header: 'Permisos',
      render: (role) => <Chip label={`${role.permissions.length} permisos`} size="small" />,
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (role) =>
        role.name === 'sistemas' ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Acceso total
          </Typography>
        ) : (
          <RowActions
            actions={[
              {
                key: 'editar',
                label: 'Editar permisos',
                icon: <EditIcon fontSize="small" />,
                onClick: () => openEditDialog(role),
              },
            ]}
          />
        ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Roles y permisos
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={roles}
        keyExtractor={(role) => role.id}
        isLoading={isLoading}
        emptyMessage="No hay roles registrados"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Permisos de {editing ? roleLabel(editing.name) : ''}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            {groupByModule(permissions).map(([module, modulePermissions]) => (
              <Box key={module}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {capitalize(module)}
                </Typography>
                <FormGroup row>
                  {modulePermissions.map((permission) => (
                    <FormControlLabel
                      key={permission.name}
                      control={
                        <Checkbox
                          checked={selected.has(permission.name)}
                          onChange={() => togglePermission(permission.name)}
                        />
                      }
                      label={capitalize(permission.name.split('.')[1] ?? permission.name)}
                    />
                  ))}
                </FormGroup>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditing(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
