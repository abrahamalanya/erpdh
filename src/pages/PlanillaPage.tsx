import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlockIcon from '@mui/icons-material/Block';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import { tieneModulo } from '../utils/modulos';
import {
  canCrearPlanillas,
  canGestionarDescuentos,
  canVerPlanillas,
  formatPeriodo,
  PLANILLA_ESTADO_LABEL,
} from '../utils/planilla';
import {
  anularPlanillaDescuento,
  createPlanilla,
  createPlanillaDescuento,
  listPlanillaDescuentos,
  listPlanillas,
  PLANILLA_DESCUENTO_TIPOS,
  type CreatePlanillaDescuentoPayload,
} from '../api/planillas';
import { listAgencias } from '../api/agencias';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { DialogHeader } from '../components/DialogHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { NavigationTabs } from '../components/NavigationTabs';
import { AsesorAutocomplete } from '../components/AsesorAutocomplete';
import { preventBackdropClose } from '../utils/dialog';
import { formatFecha, formatFechaHora, formatMonto, hoyLima } from '../utils/format';
import type {
  Agencia,
  PlanillaDescuento,
  PlanillaDescuentoEstado,
  PlanillaResumen,
  User,
} from '../types/api';

/**
 * Planilla (sueldos del personal): cabeceras por periodo y, en otra pestaña,
 * los descuentos (adelantos, préstamos, faltas) que el backend aplica al
 * cerrar. Todos los importes vienen calculados del backend.
 */
export function PlanillaPage() {
  const { user } = useAuth();

  const tabs = [
    ...(canVerPlanillas(user) ? [{ key: 'planillas', label: 'Planillas', content: <PlanillasTab /> }] : []),
    ...(canGestionarDescuentos(user) ? [{ key: 'descuentos', label: 'Descuentos', content: <DescuentosTab /> }] : []),
  ];

  if (!tieneModulo(user, 'planilla') || tabs.length === 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Planilla
      </Typography>
      <NavigationTabs tabs={tabs} />
    </Stack>
  );
}

function useAgenciasSeleccionables() {
  const { user } = useAuth();
  // El administrador de agencia solo opera sobre la suya: el backend la fija.
  const puedeElegir = !hasRole(user, 'administrador_agencia');
  const [agencias, setAgencias] = useState<Agencia[]>([]);

  useEffect(() => {
    if (puedeElegir) {
      listAgencias().then((res) => setAgencias(res.data.data));
    }
  }, [puedeElegir]);

  return { puedeElegir, agencias };
}

function PlanillasTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { puedeElegir, agencias } = useAgenciasSeleccionables();

  const [periodo, setPeriodo] = useState('');
  const [planillas, setPlanillas] = useState<PlanillaResumen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ periodo: '', fecha_pago: '', agencia_id: '' as number | '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);

    listPlanillas(periodo || undefined)
      .then((res) => setPlanillas(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [periodo]);

  function openCreateDialog() {
    setForm({ periodo: hoyLima().slice(0, 7), fecha_pago: '', agencia_id: '' });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const res = await createPlanilla({
        periodo: form.periodo,
        fecha_pago: form.fecha_pago,
        agencia_id: form.agencia_id || undefined,
      });
      navigate(`/planilla/${res.data.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<PlanillaResumen>[] = [
    { header: 'Periodo', render: (p) => formatPeriodo(p.periodo) },
    { header: 'Fecha de pago', render: (p) => formatFecha(p.fecha_pago) },
    { header: 'Agencia', render: (p) => p.agencia ?? 'Toda la empresa' },
    {
      header: 'Estado',
      render: (p) => (
        <Chip
          label={PLANILLA_ESTADO_LABEL[p.estado]}
          size="small"
          color={p.estado === 'confirmada' ? 'success' : 'default'}
        />
      ),
    },
    { header: 'Ingresos', align: 'right', render: (p) => formatMonto(p.total_ingresos) },
    { header: 'Descuentos', align: 'right', render: (p) => formatMonto(p.total_descuentos) },
    { header: 'Tributos trabajador', align: 'right', render: (p) => formatMonto(p.total_tributos_trabajador) },
    { header: 'Neto', align: 'right', render: (p) => formatMonto(p.total_neto) },
    { header: 'Aportes empleador', align: 'right', render: (p) => formatMonto(p.total_aportes_empleador) },
    { header: 'Cerrada', render: (p) => formatFechaHora(p.cerrada_at) },
    {
      header: 'Acciones',
      align: 'right',
      render: (p) => (
        <RowActions
          actions={[
            {
              key: 'ver',
              label: 'Ver planilla',
              icon: <VisibilityIcon fontSize="small" />,
              onClick: () => navigate(`/planilla/${p.id}`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
        <TextField
          label="Periodo"
          type="month"
          slotProps={{ inputLabel: { shrink: true } }}
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          sx={{ maxWidth: { sm: 240 } }}
        />
        {canCrearPlanillas(user) && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ alignSelf: { sm: 'center' } }}>
            Abrir planilla del mes
          </Button>
        )}
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={planillas}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyMessage="No hay planillas"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="xs">
        <form onSubmit={handleSubmit}>
          <DialogHeader onClose={() => setDialogOpen(false)}>Abrir planilla</DialogHeader>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <Typography variant="body2" color="text.secondary">
                Si ya existe la planilla de ese periodo y agencia, se abre la existente.
              </Typography>
              <TextField
                label="Periodo"
                type="month"
                required
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.periodo}
                onChange={(e) => setForm({ ...form, periodo: e.target.value })}
              />
              <TextField
                label="Fecha de pago"
                type="date"
                required
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.fecha_pago}
                onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })}
              />
              {puedeElegir && (
                <TextField
                  select
                  label="Agencia"
                  value={form.agencia_id}
                  onChange={(e) => setForm({ ...form, agencia_id: e.target.value ? Number(e.target.value) : '' })}
                >
                  <MenuItem value="">Toda la empresa</MenuItem>
                  {agencias.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.nombre.toUpperCase()}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? 'Abriendo...' : 'Abrir'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}

const DESCUENTO_ESTADO_LABEL: Record<PlanillaDescuentoEstado, string> = {
  pendiente: 'Pendiente',
  saldado: 'Saldado',
  anulado: 'Anulado',
};

const DESCUENTO_ESTADO_COLOR: Record<PlanillaDescuentoEstado, 'warning' | 'success' | 'default'> = {
  pendiente: 'warning',
  saldado: 'success',
  anulado: 'default',
};

interface DescuentoForm {
  trabajador: User | null;
  tipo: CreatePlanillaDescuentoPayload['tipo'];
  concepto: string;
  monto: string;
  cuota: string;
  fecha_registro: string;
}

function DescuentosTab() {
  const [trabajador, setTrabajador] = useState<User | null>(null);
  const [estado, setEstado] = useState<PlanillaDescuentoEstado | ''>('pendiente');
  const [descuentos, setDescuentos] = useState<PlanillaDescuento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<DescuentoForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [anularTarget, setAnularTarget] = useState<PlanillaDescuento | null>(null);
  const [isAnulando, setIsAnulando] = useState(false);
  const [anularError, setAnularError] = useState<string | null>(null);

  function loadDescuentos() {
    setIsLoading(true);
    setLoadError(null);

    listPlanillaDescuentos({ user_id: trabajador?.id, estado: estado || undefined })
      .then((res) => setDescuentos(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadDescuentos, [trabajador, estado]);

  function openCreateDialog() {
    setForm({ trabajador: null, tipo: 'adelanto', concepto: '', monto: '', cuota: '', fecha_registro: hoyLima() });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;

    if (!form.trabajador) {
      setFormError('Selecciona un trabajador.');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      await createPlanillaDescuento({
        user_id: form.trabajador.id,
        tipo: form.tipo,
        concepto: form.concepto,
        monto: form.monto,
        cuota: form.cuota || null,
        fecha_registro: form.fecha_registro,
      });
      setDialogOpen(false);
      loadDescuentos();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAnular() {
    if (!anularTarget) return;
    setAnularError(null);
    setIsAnulando(true);

    try {
      await anularPlanillaDescuento(anularTarget.id);
      setAnularTarget(null);
      loadDescuentos();
    } catch (err) {
      setAnularError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsAnulando(false);
    }
  }

  const columns: DataTableColumn<PlanillaDescuento>[] = [
    { header: 'Fecha', render: (d) => formatFecha(d.fecha_registro) },
    { header: 'Trabajador', render: (d) => d.trabajador },
    { header: 'Tipo', render: (d) => d.tipo_label },
    { header: 'Concepto', render: (d) => d.concepto },
    { header: 'Monto', align: 'right', render: (d) => formatMonto(d.monto) },
    { header: 'Cuota', align: 'right', render: (d) => (d.cuota !== null ? formatMonto(d.cuota) : 'Todo de una vez') },
    { header: 'Pagado', align: 'right', render: (d) => formatMonto(d.pagado) },
    { header: 'Saldo', align: 'right', render: (d) => formatMonto(d.saldo) },
    {
      header: 'Este mes',
      align: 'right',
      render: (d) => (d.estado === 'pendiente' ? formatMonto(d.cuota_del_mes) : '—'),
    },
    {
      header: 'Estado',
      render: (d) => <Chip label={DESCUENTO_ESTADO_LABEL[d.estado]} size="small" color={DESCUENTO_ESTADO_COLOR[d.estado]} />,
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (d) => (
        <RowActions
          actions={
            d.estado === 'pendiente'
              ? [
                  {
                    key: 'anular',
                    label: 'Anular',
                    icon: <BlockIcon fontSize="small" />,
                    onClick: () => {
                      setAnularError(null);
                      setAnularTarget(d);
                    },
                  },
                ]
              : []
          }
        />
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <AsesorAutocomplete value={trabajador} onChange={setTrabajador} label="Trabajador" role={null} enPlanilla />
        <TextField
          select
          label="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as PlanillaDescuentoEstado | '')}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="pendiente">Pendiente</MenuItem>
          <MenuItem value="saldado">Saldado</MenuItem>
          <MenuItem value="anulado">Anulado</MenuItem>
        </TextField>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ flexShrink: 0 }}>
          Nuevo descuento
        </Button>
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={descuentos}
        keyExtractor={(d) => d.id}
        isLoading={isLoading}
        emptyMessage="No hay descuentos"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="sm">
        {form && (
          <form onSubmit={handleSubmit}>
            <DialogHeader onClose={() => setDialogOpen(false)}>Nuevo descuento</DialogHeader>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                {formError && <Alert severity="error">{formError}</Alert>}
                <AsesorAutocomplete
                  value={form.trabajador}
                  onChange={(t) => setForm({ ...form, trabajador: t })}
                  label="Trabajador"
                  role={null}
                  enPlanilla
                />
                <TextField
                  select
                  label="Tipo"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as DescuentoForm['tipo'] })}
                >
                  {PLANILLA_DESCUENTO_TIPOS.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Concepto"
                  required
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Monto"
                    type="number"
                    required
                    slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }}
                    value={form.monto}
                    onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  />
                  <TextField
                    label="Cuota mensual"
                    type="number"
                    slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }}
                    helperText="Vacío = se descuenta todo de una vez"
                    value={form.cuota}
                    onChange={(e) => setForm({ ...form, cuota: e.target.value })}
                  />
                </Stack>
                <TextField
                  label="Fecha de registro"
                  type="date"
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={form.fecha_registro}
                  onChange={(e) => setForm({ ...form, fecha_registro: e.target.value })}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!anularTarget}
        title="Anular descuento"
        message={
          anularTarget
            ? `¿Anular "${anularTarget.concepto}" de ${anularTarget.trabajador}? Ya no se descontará en planilla.`
            : ''
        }
        onCancel={() => setAnularTarget(null)}
        onConfirm={handleAnular}
        isLoading={isAnulando}
        confirmLabel="Anular"
        loadingLabel="Anulando..."
        error={anularError}
      />
    </Stack>
  );
}
