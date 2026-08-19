import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
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
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { BIEN_TIPO_LABELS, canVerConfiguracion } from '../utils/creditoPrendarioHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import {
  listConfiguraciones,
  updateConfiguracion,
  type UpdateConfiguracionPayload,
} from '../api/configuracionesCreditoPrendario';
import { listEmpresas } from '../api/empresas';
import { listAgencias } from '../api/agencias';
import type { Agencia, BienTipo, ConfiguracionCreditoPrendario, Empresa } from '../types/api';

interface FormState {
  ambito: 'empresa' | 'agencia';
  empresa_id?: number;
  agencia_id?: number;
  tipo: BienTipo;
  interes_default: string;
  plazo_dias: string;
  dias_espera_mora: string;
  tasa_mora_diaria: string;
  max_refrendos: string;
}

const emptyForm: FormState = {
  ambito: 'empresa',
  tipo: 'varios',
  interes_default: '',
  plazo_dias: '',
  dias_espera_mora: '',
  tasa_mora_diaria: '',
  max_refrendos: '',
};

export function ConfiguracionCreditoPrendarioPage() {
  const { user } = useAuth();
  const isSistemas = hasRole(user, 'sistemas');

  const [configuraciones, setConfiguraciones] = useState<ConfiguracionCreditoPrendario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function loadConfiguraciones() {
    setIsLoading(true);
    setLoadError(null);

    listConfiguraciones()
      .then((res) => setConfiguraciones(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadConfiguraciones, []);

  useEffect(() => {
    if (isSistemas) {
      listEmpresas().then((res) => setEmpresas(res.data.data));
    }
    listAgencias().then((res) => setAgencias(res.data.data));
  }, [isSistemas]);

  if (!canVerConfiguracion(user)) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(config: ConfiguracionCreditoPrendario) {
    setForm({
      ambito: config.agencia_id ? 'agencia' : 'empresa',
      empresa_id: config.empresa_id,
      agencia_id: config.agencia_id ?? undefined,
      tipo: config.tipo,
      interes_default: config.interes_default,
      plazo_dias: String(config.plazo_dias),
      dias_espera_mora: String(config.dias_espera_mora),
      tasa_mora_diaria: config.tasa_mora_diaria,
      max_refrendos: config.max_refrendos != null ? String(config.max_refrendos) : '',
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const payload: UpdateConfiguracionPayload = {
        tipo: form.tipo,
        interes_default: form.interes_default,
        plazo_dias: Number(form.plazo_dias),
        dias_espera_mora: Number(form.dias_espera_mora),
        tasa_mora_diaria: form.tasa_mora_diaria,
        max_refrendos: form.max_refrendos ? Number(form.max_refrendos) : undefined,
      };

      if (isSistemas) payload.empresa_id = form.empresa_id;
      if (form.ambito === 'agencia') payload.agencia_id = form.agencia_id;

      await updateConfiguracion(payload);
      setDialogOpen(false);
      loadConfiguraciones();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<ConfiguracionCreditoPrendario>[] = [
    { header: 'Ámbito', render: (c) => c.agencia?.nombre ?? 'Empresa (default)' },
    { header: 'Tipo', render: (c) => BIEN_TIPO_LABELS[c.tipo] },
    { header: 'Interés', render: (c) => `${c.interes_default}%` },
    { header: 'Plazo (días)', render: (c) => c.plazo_dias },
    { header: 'Espera mora (días)', render: (c) => c.dias_espera_mora },
    { header: 'Tasa mora diaria', render: (c) => `${c.tasa_mora_diaria}%` },
    { header: 'Máx. refrendos', render: (c) => c.max_refrendos ?? 'Sin límite' },
    {
      header: 'Acciones',
      align: 'right',
      render: (c) => (
        <RowActions
          actions={[
            {
              key: 'editar',
              label: 'Editar',
              icon: <EditIcon fontSize="small" />,
              onClick: () => openEditDialog(c),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Configuración de créditos prendarios
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Nueva configuración
        </Button>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={configuraciones}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay configuraciones registradas"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>Configuración de crédito prendario</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              {isSistemas && (
                <TextField
                  select
                  label="Empresa"
                  value={form.empresa_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, empresa_id: Number(e.target.value) }))}
                  required
                >
                  {empresas.map((empresa) => (
                    <MenuItem key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                select
                label="Ámbito"
                value={form.ambito}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ambito: e.target.value as FormState['ambito'] }))
                }
              >
                <MenuItem value="empresa">Toda la empresa (default)</MenuItem>
                <MenuItem value="agencia">Agencia específica</MenuItem>
              </TextField>
              {form.ambito === 'agencia' && (
                <TextField
                  select
                  label="Agencia"
                  value={form.agencia_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, agencia_id: Number(e.target.value) }))}
                  required
                >
                  {agencias.map((agencia) => (
                    <MenuItem key={agencia.id} value={agencia.id}>
                      {agencia.nombre}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                select
                label="Tipo de bien"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as BienTipo }))}
              >
                <MenuItem value="varios">Varios</MenuItem>
                <MenuItem value="electro">Electrodoméstico</MenuItem>
              </TextField>
              <TextField
                label="Interés por defecto (%)"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={form.interes_default}
                onChange={(e) => setForm((f) => ({ ...f, interes_default: e.target.value }))}
                required
              />
              <TextField
                label="Plazo (días)"
                type="number"
                slotProps={{ htmlInput: { min: 1 } }}
                value={form.plazo_dias}
                onChange={(e) => setForm((f) => ({ ...f, plazo_dias: e.target.value }))}
                required
              />
              <TextField
                label="Días de espera antes de mora"
                type="number"
                slotProps={{ htmlInput: { min: 0 } }}
                value={form.dias_espera_mora}
                onChange={(e) => setForm((f) => ({ ...f, dias_espera_mora: e.target.value }))}
                required
              />
              <TextField
                label="Tasa de mora diaria (%)"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={form.tasa_mora_diaria}
                onChange={(e) => setForm((f) => ({ ...f, tasa_mora_diaria: e.target.value }))}
                required
              />
              <TextField
                label="Máximo de refrendos"
                type="number"
                slotProps={{ htmlInput: { min: 0 } }}
                value={form.max_refrendos}
                onChange={(e) => setForm((f) => ({ ...f, max_refrendos: e.target.value }))}
                helperText="Vacío = sin límite"
              />
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
    </Stack>
  );
}
