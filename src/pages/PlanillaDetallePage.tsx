import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useAuth } from '../hooks/useAuth';
import { canEditarPlanillas, canVerPlanillas, formatPeriodo, PLANILLA_ESTADO_LABEL } from '../utils/planilla';
import { cerrarPlanilla, getPlanilla, guardarLineasPlanilla, reabrirPlanilla } from '../api/planillas';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { DialogHeader } from '../components/DialogHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AsesorAutocomplete } from '../components/AsesorAutocomplete';
import { preventBackdropClose } from '../utils/dialog';
import { formatFecha, formatFechaHora, formatMonto } from '../utils/format';
import type { PlanillaDetalle, PlanillaTrabajador, User } from '../types/api';
import { ErrorBanner } from '../components/ErrorBanner';

interface LineaForm {
  /** null al editar: el trabajador ya está fijado por `editing`. */
  trabajador: User | null;
  ingresos: string;
  bonificaciones: string;
  situacion: string;
  descuentos_devengado: string;
}

const EMPTY_LINEA: LineaForm = {
  trabajador: null,
  ingresos: '',
  bonificaciones: '',
  situacion: '',
  descuentos_devengado: '',
};

const nombreTrabajador = (t: PlanillaTrabajador) => `${t.apellidos}, ${t.nombres}`;

export function PlanillaDetallePage() {
  const { user } = useAuth();
  const { id } = useParams();
  const planillaId = Number(id);

  const [planilla, setPlanilla] = useState<PlanillaDetalle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlanillaTrabajador | null>(null);
  const [form, setForm] = useState<LineaForm>(EMPTY_LINEA);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [accion, setAccion] = useState<'cerrar' | 'reabrir' | null>(null);
  const [isRunningAccion, setIsRunningAccion] = useState(false);
  const [accionError, setAccionError] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
    getPlanilla(planillaId)
      .then((res) => setPlanilla(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'));
  }, [planillaId]);

  if (!canVerPlanillas(user)) {
    return <Navigate to="/" replace />;
  }

  const editable = planilla?.estado === 'borrador' && canEditarPlanillas(user);

  function openCreateDialog() {
    setEditing(null);
    setForm(EMPTY_LINEA);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(t: PlanillaTrabajador) {
    setEditing(t);
    setForm({
      trabajador: null,
      ingresos: t.sueldo_base,
      bonificaciones: t.bonificaciones,
      situacion: t.situacion ?? '',
      descuentos_devengado: t.descuentos_devengado,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const userId = editing?.user_id ?? form.trabajador?.id;

    if (!userId) {
      setFormError('Selecciona un trabajador.');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const res = await guardarLineasPlanilla(planillaId, [
        {
          user_id: userId,
          ingresos: form.ingresos,
          bonificaciones: form.bonificaciones || undefined,
          situacion: form.situacion || undefined,
          descuentos_devengado: form.descuentos_devengado || undefined,
        },
      ]);
      setPlanilla(res.data);
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAccion() {
    if (!accion) return;
    setAccionError(null);
    setIsRunningAccion(true);

    try {
      const res = await (accion === 'cerrar' ? cerrarPlanilla(planillaId) : reabrirPlanilla(planillaId));
      setPlanilla(res.data);
      setAccion(null);
    } catch (err) {
      setAccionError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsRunningAccion(false);
    }
  }

  if (loadError) {
    return (
      <Stack spacing={2}>
        <BackButton />
        <Alert severity="error">{loadError}</Alert>
      </Stack>
    );
  }

  if (!planilla) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress color="inherit" />
      </Box>
    );
  }

  const columns: DataTableColumn<PlanillaTrabajador>[] = [
    { header: 'Documento', render: (t) => `${t.tipo_documento} ${t.numero_documento}` },
    { header: 'Trabajador', render: nombreTrabajador },
    { header: 'Situación', render: (t) => t.situacion ?? '—' },
    { header: 'Ingresos', align: 'right', render: (t) => formatMonto(t.ingresos) },
    { header: 'Desc. devengado', align: 'right', render: (t) => formatMonto(t.descuentos_devengado) },
    { header: 'Desc. pagado', align: 'right', render: (t) => formatMonto(t.descuentos_pagado) },
    { header: 'Pensión', render: (t) => (t.es_afp ? 'AFP' : 'ONP') },
    { header: 'AFP / ONP', align: 'right', render: (t) => formatMonto(t.es_afp ? t.afp : t.onp) },
    { header: 'Tributos trabajador', align: 'right', render: (t) => formatMonto(t.tributos_trabajador) },
    { header: 'Neto', align: 'right', render: (t) => <strong>{formatMonto(t.neto)}</strong> },
    { header: 'Salud', render: (t) => (t.es_sis ? 'SIS' : 'EsSalud') },
    {
      header: 'EsSalud / SIS',
      align: 'right',
      render: (t) => formatMonto(t.es_sis ? t.sis : t.essalud_empleador),
    },
    { header: 'Aportes empleador', align: 'right', render: (t) => formatMonto(t.aportes_empleador) },
    ...(editable
      ? [
          {
            header: 'Acciones',
            align: 'right' as const,
            render: (t: PlanillaTrabajador) => (
              <RowActions
                actions={[
                  { key: 'editar', label: 'Editar', icon: <EditIcon fontSize="small" />, onClick: () => openEditDialog(t) },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  const totales: [string, string][] = [
    ['Ingresos', planilla.total_ingresos],
    ['Descuentos', planilla.total_descuentos],
    ['Tributos trabajador', planilla.total_tributos_trabajador],
    ['Neto a pagar', planilla.total_neto],
    ['Aportes empleador', planilla.total_aportes_empleador],
  ];

  return (
    <Stack spacing={3}>
      <BackButton />

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', gap: 2 }}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Planilla {formatPeriodo(planilla.periodo)}
            </Typography>
            <Chip
              label={PLANILLA_ESTADO_LABEL[planilla.estado]}
              size="small"
              color={planilla.estado === 'confirmada' ? 'success' : 'default'}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {planilla.agencia ?? 'Toda la empresa'} · Pago: {formatFecha(planilla.fecha_pago)}
            {planilla.cerrada_at && ` · Cerrada: ${formatFechaHora(planilla.cerrada_at)}`}
          </Typography>
        </Stack>

        {canEditarPlanillas(user) && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {planilla.estado === 'borrador' ? (
              <>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateDialog}>
                  Agregar trabajador
                </Button>
                <Button
                  variant="contained"
                  startIcon={<LockIcon />}
                  disabled={planilla.trabajadores.length === 0}
                  onClick={() => {
                    setAccionError(null);
                    setAccion('cerrar');
                  }}
                >
                  Cerrar planilla
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                startIcon={<LockOpenIcon />}
                onClick={() => {
                  setAccionError(null);
                  setAccion('reabrir');
                }}
              >
                Reabrir
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      <Grid container spacing={2}>
        {totales.map(([label, monto]) => (
          <Grid key={label} size={{ xs: 12, sm: 6, md: 'grow' }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h6">{formatMonto(monto)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <DataTable
        columns={columns}
        rows={planilla.trabajadores}
        keyExtractor={(t) => t.user_id}
        isLoading={false}
        emptyMessage="Aún no hay trabajadores en esta planilla"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader onClose={() => setDialogOpen(false)}>
            {editing ? 'Editar trabajador' : 'Agregar trabajador'}
          </DialogHeader>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <ErrorBanner error={formError} />
              {editing ? (
                <>
                  <TextField label="Trabajador" value={nombreTrabajador(editing)} disabled />
                  <TextField
                    label="Régimen"
                    value={`${editing.es_afp ? 'AFP' : 'ONP'} · ${editing.es_sis ? 'SIS' : 'EsSalud'}`}
                    disabled
                    helperText="Se toma del usuario; se cambia desde Usuarios"
                  />
                </>
              ) : (
                <AsesorAutocomplete
                  value={form.trabajador}
                  onChange={(t) => setForm({ ...form, trabajador: t })}
                  label="Trabajador"
                  role={null}
                  enPlanilla
                />
              )}
              {!editing && (
                <Typography variant="body2" color="text.secondary">
                  Solo aparecen usuarios marcados para planilla. El régimen (AFP/ONP, EsSalud/SIS) se toma de cada
                  usuario.
                </Typography>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Sueldo básico"
                  type="number"
                  required
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                  value={form.ingresos}
                  onChange={(e) => setForm({ ...form, ingresos: e.target.value })}
                />
                <TextField
                  label="Bonificaciones"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                  helperText="No afectas a aportes del trabajador"
                  value={form.bonificaciones}
                  onChange={(e) => setForm({ ...form, bonificaciones: e.target.value })}
                />
              </Stack>
              <TextField
                label="Situación"
                value={form.situacion}
                onChange={(e) => setForm({ ...form, situacion: e.target.value })}
              />
              <TextField
                label="Descuentos devengados"
                type="number"
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                value={form.descuentos_devengado}
                onChange={(e) => setForm({ ...form, descuentos_devengado: e.target.value })}
              />
              {editing && (
                <TextField
                  label="Descuentos pagados (adelantos/préstamos del mes)"
                  value={formatMonto(editing.descuentos_pagado)}
                  disabled
                  helperText={`Neto actual: ${formatMonto(editing.neto)} — se recalcula al guardar`}
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
        </form>
      </Dialog>

      <ConfirmDialog
        open={accion !== null}
        title={accion === 'cerrar' ? 'Cerrar planilla' : 'Reabrir planilla'}
        message={
          accion === 'cerrar'
            ? 'Se congelarán los totales y se aplicarán los descuentos (adelantos, préstamos) a cada trabajador. Ya no podrás editar las líneas.'
            : 'La planilla volverá a borrador y se devolverán los descuentos aplicados. Al volver a cerrarla se aplicarán de nuevo.'
        }
        onCancel={() => setAccion(null)}
        onConfirm={handleAccion}
        isLoading={isRunningAccion}
        confirmLabel={accion === 'cerrar' ? 'Cerrar planilla' : 'Reabrir'}
        loadingLabel="Procesando..."
        error={accionError}
      />
    </Stack>
  );
}

function BackButton() {
  return (
    <Box>
      <Button component={Link} to="/planilla" startIcon={<ArrowBackIcon />}>
        Volver a planillas
      </Button>
    </Box>
  );
}
