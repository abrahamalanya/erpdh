import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../utils/roles';
import {
  canEditarConfigFacturacion,
  canVerConfigFacturacion,
  TIPO_DOCUMENTO_SUNAT_LABEL,
} from '../utils/facturacion';
import {
  createSerieComprobante,
  deleteCredencialesSunat,
  deleteSerieComprobante,
  getConfiguracionFacturacion,
  getCredencialesSunat,
  listSeriesComprobante,
  saveCredencialesSunat,
  updateConfiguracionFacturacion,
  updateSerieComprobante,
  validarCredencialesSunat,
  type ConfiguracionFacturacionPayload,
} from '../api/facturacion';
import { listEmpresas } from '../api/empresas';
import { listAgencias } from '../api/agencias';
import { NavigationTabs } from '../components/NavigationTabs';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { DialogHeader } from '../components/DialogHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { preventBackdropClose } from '../utils/dialog';
import { formatFecha, formatFechaHora } from '../utils/format';
import type {
  Agencia,
  ConfiguracionFacturacion,
  CredencialesSunat,
  Empresa,
  SerieComprobante,
  TipoDocumentoSunat,
} from '../types/api';

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Error desconocido');

/**
 * Configuración de facturación electrónica: parámetros generales, series y
 * credenciales SUNAT de la empresa. Sistemas no tiene empresa propia, así que
 * elige una arriba (mismo patrón que ConceptosPage).
 */
export function ConfiguracionFacturacionPage() {
  const { user } = useAuth();
  const isSistemas = hasRole(user, 'sistemas');

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSistemas, setEmpresaSistemas] = useState<number | ''>('');

  useEffect(() => {
    if (isSistemas) listEmpresas().then((res) => setEmpresas(res.data.data));
  }, [isSistemas]);

  if (!canVerConfigFacturacion(user)) {
    return <Navigate to="/" replace />;
  }

  const empresaId = isSistemas ? empresaSistemas || null : (user?.empresa_id ?? null);
  const editable = canEditarConfigFacturacion(user);

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Configuración de facturación
      </Typography>

      {isSistemas && (
        <TextField
          select
          label="Empresa"
          value={empresaSistemas}
          onChange={(e) => setEmpresaSistemas(e.target.value ? Number(e.target.value) : '')}
          sx={{ maxWidth: 360 }}
        >
          {empresas.map((e) => (
            <MenuItem key={e.id} value={e.id}>
              {(e.razon_social ?? e.nombre).toUpperCase()}
            </MenuItem>
          ))}
        </TextField>
      )}

      {empresaId === null ? (
        <Typography variant="body2" color="text.secondary">
          {isSistemas ? 'Elige una empresa.' : 'Tu usuario no tiene empresa asignada.'}
        </Typography>
      ) : (
        <NavigationTabs
          key={empresaId}
          tabs={[
            {
              key: 'general',
              label: 'General',
              content: <GeneralTab empresaId={isSistemas ? empresaId : undefined} editable={editable} />,
            },
            { key: 'series', label: 'Series', content: <SeriesTab editable={editable} /> },
            {
              key: 'credenciales',
              label: 'Credenciales SUNAT',
              content: <CredencialesTab empresaId={empresaId} editable={editable} />,
            },
          ]}
        />
      )}
    </Stack>
  );
}

/* ===== General ===== */

interface GeneralForm {
  modo: 'beta' | 'produccion';
  igv_porcentaje: string;
  moneda: 'PEN' | 'USD';
  interes_incluye_igv: boolean;
  serie_factura_defecto: string;
  serie_boleta_defecto: string;
  bloquear_si_supera_umbral: boolean;
  activo: boolean;
}

const DEFAULT_GENERAL: GeneralForm = {
  modo: 'beta',
  igv_porcentaje: '18',
  moneda: 'PEN',
  interes_incluye_igv: false,
  serie_factura_defecto: '',
  serie_boleta_defecto: '',
  bloquear_si_supera_umbral: false,
  activo: true,
};

function toGeneralForm(c: ConfiguracionFacturacion): GeneralForm {
  return {
    modo: c.modo,
    igv_porcentaje: c.igv_porcentaje,
    moneda: c.moneda,
    interes_incluye_igv: c.interes_incluye_igv,
    serie_factura_defecto: c.serie_factura_defecto ?? '',
    serie_boleta_defecto: c.serie_boleta_defecto ?? '',
    bloquear_si_supera_umbral: c.bloquear_si_supera_umbral,
    activo: c.activo,
  };
}

/** `empresaId` solo para sistemas (el backend usa la empresa del actor en los demás casos). */
function GeneralTab({ empresaId, editable }: { empresaId?: number; editable: boolean }) {
  const [existe, setExiste] = useState(false);
  const [form, setForm] = useState<GeneralForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getConfiguracionFacturacion()
      .then((res) => {
        setExiste(res.data !== null);
        setForm(res.data ? toGeneralForm(res.data) : DEFAULT_GENERAL);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [empresaId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;

    setError(null);
    setSaved(false);
    setIsSaving(true);

    const payload: ConfiguracionFacturacionPayload = {
      modo: form.modo,
      igv_porcentaje: form.igv_porcentaje,
      moneda: form.moneda,
      interes_incluye_igv: form.interes_incluye_igv,
      serie_factura_defecto: form.serie_factura_defecto || null,
      serie_boleta_defecto: form.serie_boleta_defecto || null,
      bloquear_si_supera_umbral: form.bloquear_si_supera_umbral,
      activo: form.activo,
      empresa_id: empresaId,
    };

    try {
      const res = await updateConfiguracionFacturacion(payload);
      setForm(toGeneralForm(res.data));
      setExiste(true);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  if (!form) {
    return error ? <Alert severity="error">{error}</Alert> : <CircularProgress color="inherit" />;
  }

  const set = (patch: Partial<GeneralForm>) => setForm({ ...form, ...patch });

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 560 }}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {saved && <Alert severity="success">Configuración guardada.</Alert>}
        {!existe && (
          <Alert severity="info">
            La empresa aún no tiene configuración de facturación. Revisa los valores y guarda para crearla.
          </Alert>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="Modo"
            value={form.modo}
            onChange={(e) => set({ modo: e.target.value as GeneralForm['modo'] })}
            disabled={!editable}
            helperText={form.modo === 'beta' ? 'Pruebas: SUNAT no los registra como reales' : 'Comprobantes reales'}
          >
            <MenuItem value="beta">Beta (pruebas)</MenuItem>
            <MenuItem value="produccion">Producción</MenuItem>
          </TextField>
          <TextField
            select
            label="Moneda"
            value={form.moneda}
            onChange={(e) => set({ moneda: e.target.value as GeneralForm['moneda'] })}
            disabled={!editable}
          >
            <MenuItem value="PEN">Soles (PEN)</MenuItem>
            <MenuItem value="USD">Dólares (USD)</MenuItem>
          </TextField>
          <TextField
            label="IGV (%)"
            type="number"
            slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }}
            value={form.igv_porcentaje}
            onChange={(e) => set({ igv_porcentaje: e.target.value })}
            disabled={!editable}
            required
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Serie de factura por defecto"
            value={form.serie_factura_defecto}
            onChange={(e) => set({ serie_factura_defecto: e.target.value.toUpperCase() })}
            slotProps={{ htmlInput: { maxLength: 4 } }}
            placeholder="F001"
            disabled={!editable}
          />
          <TextField
            label="Serie de boleta por defecto"
            value={form.serie_boleta_defecto}
            onChange={(e) => set({ serie_boleta_defecto: e.target.value.toUpperCase() })}
            slotProps={{ htmlInput: { maxLength: 4 } }}
            placeholder="B001"
            disabled={!editable}
          />
        </Stack>

        <FormControlLabel
          control={
            <Switch
              checked={form.interes_incluye_igv}
              onChange={(e) => set({ interes_incluye_igv: e.target.checked })}
              disabled={!editable}
            />
          }
          label="El interés cobrado ya incluye IGV"
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.bloquear_si_supera_umbral}
              onChange={(e) => set({ bloquear_si_supera_umbral: e.target.checked })}
              disabled={!editable}
            />
          }
          label="Bloquear la emisión si se supera el umbral"
        />
        <FormControlLabel
          control={<Switch checked={form.activo} onChange={(e) => set({ activo: e.target.checked })} disabled={!editable} />}
          label="Facturación activa"
        />

        {editable && (
          <Box>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? 'Guardando...' : existe ? 'Guardar' : 'Crear configuración'}
            </Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

/* ===== Series ===== */

interface SerieForm {
  tipo_documento: TipoDocumentoSunat;
  serie: string;
  agencia_id: number | '';
  descripcion: string;
  limite_numeracion: string;
  estado: boolean;
}

const EMPTY_SERIE: SerieForm = {
  tipo_documento: '03',
  serie: '',
  agencia_id: '',
  descripcion: '',
  limite_numeracion: '',
  estado: true,
};

function SeriesTab({ editable }: { editable: boolean }) {
  const [series, setSeries] = useState<SerieComprobante[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SerieComprobante | null>(null);
  const [form, setForm] = useState<SerieForm>(EMPTY_SERIE);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SerieComprobante | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function loadSeries() {
    setIsLoading(true);
    setLoadError(null);
    listSeriesComprobante()
      .then((res) => setSeries(res.data))
      .catch((err) => setLoadError(errorMessage(err)))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadSeries();
    listAgencias().then((res) => setAgencias(res.data.data));
  }, []);

  const agenciaNombre = (id: number | null) =>
    id === null ? 'Todas' : (agencias.find((a) => a.id === id)?.nombre.toUpperCase() ?? `#${id}`);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_SERIE);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(s: SerieComprobante) {
    setEditing(s);
    setForm({
      tipo_documento: s.tipo_documento,
      serie: s.serie,
      agencia_id: s.agencia_id ?? '',
      descripcion: s.descripcion ?? '',
      limite_numeracion: s.limite_numeracion !== null ? String(s.limite_numeracion) : '',
      estado: s.estado,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (editing) {
        await updateSerieComprobante(editing.serie, {
          descripcion: form.descripcion,
          estado: form.estado,
          limite_numeracion: form.limite_numeracion ? Number(form.limite_numeracion) : null,
        });
      } else {
        await createSerieComprobante({
          tipo_documento: form.tipo_documento,
          serie: form.serie,
          agencia_id: form.agencia_id || undefined,
          descripcion: form.descripcion || undefined,
          limite_numeracion: form.limite_numeracion ? Number(form.limite_numeracion) : undefined,
        });
      }
      setDialogOpen(false);
      loadSeries();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setIsDeleting(true);

    try {
      await deleteSerieComprobante(deleteTarget.serie);
      setDeleteTarget(null);
      loadSeries();
    } catch (err) {
      // 422 si ya emitió comprobantes: se muestra el mensaje del backend (inactivarla en vez de borrarla).
      setDeleteError(errorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<SerieComprobante>[] = [
    { header: 'Serie', render: (s) => <strong>{s.serie}</strong> },
    { header: 'Tipo', render: (s) => TIPO_DOCUMENTO_SUNAT_LABEL[s.tipo_documento] },
    { header: 'Agencia', render: (s) => agenciaNombre(s.agencia_id) },
    { header: 'Descripción', render: (s) => s.descripcion ?? '—' },
    { header: 'Último correlativo', align: 'right', render: (s) => s.ultimo_correlativo },
    { header: 'Límite', align: 'right', render: (s) => s.limite_numeracion ?? '—' },
    {
      header: 'Estado',
      render: (s) => <Chip label={s.estado ? 'Activa' : 'Inactiva'} size="small" color={s.estado ? 'success' : 'default'} />,
    },
    ...(editable
      ? [
          {
            header: 'Acciones',
            align: 'right' as const,
            render: (s: SerieComprobante) => (
              <RowActions
                actions={[
                  { key: 'editar', label: 'Editar', icon: <EditIcon fontSize="small" />, onClick: () => openEdit(s) },
                  {
                    key: 'eliminar',
                    label: 'Eliminar',
                    icon: <DeleteIcon fontSize="small" />,
                    disabled: s.ultimo_correlativo > 0,
                    onClick: () => {
                      setDeleteError(null);
                      setDeleteTarget(s);
                    },
                  },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Stack spacing={2}>
      {editable && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nueva serie
          </Button>
        </Box>
      )}
      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={series}
        keyExtractor={(s) => s.serie}
        isLoading={isLoading}
        emptyMessage="No hay series registradas"
        page={1}
        lastPage={1}
        onPageChange={() => {}}
      />

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="xs">
        <form onSubmit={handleSubmit}>
          <DialogHeader onClose={() => setDialogOpen(false)}>{editing ? `Editar serie ${editing.serie}` : 'Nueva serie'}</DialogHeader>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                select
                label="Tipo de comprobante"
                value={form.tipo_documento}
                onChange={(e) => setForm({ ...form, tipo_documento: e.target.value as TipoDocumentoSunat })}
                disabled={!!editing}
              >
                {(Object.keys(TIPO_DOCUMENTO_SUNAT_LABEL) as TipoDocumentoSunat[]).map((t) => (
                  <MenuItem key={t} value={t}>
                    {TIPO_DOCUMENTO_SUNAT_LABEL[t]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Serie"
                value={form.serie}
                onChange={(e) => setForm({ ...form, serie: e.target.value.toUpperCase() })}
                slotProps={{ htmlInput: { minLength: 4, maxLength: 4 } }}
                helperText="Exactamente 4 caracteres, p.ej. F001 o B001"
                disabled={!!editing}
                required
              />
              <TextField
                select
                label="Agencia"
                value={form.agencia_id}
                onChange={(e) => setForm({ ...form, agencia_id: e.target.value ? Number(e.target.value) : '' })}
                disabled={!!editing}
              >
                <MenuItem value="">Todas</MenuItem>
                {agencias.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.nombre.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Descripción"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
              <TextField
                label="Límite de numeración"
                type="number"
                slotProps={{ htmlInput: { min: 1 } }}
                value={form.limite_numeracion}
                onChange={(e) => setForm({ ...form, limite_numeracion: e.target.value })}
                helperText="Vacío = sin límite"
              />
              {editing && (
                <FormControlLabel
                  control={<Switch checked={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.checked })} />}
                  label="Serie activa"
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
        open={!!deleteTarget}
        title="Eliminar serie"
        message={`¿Eliminar la serie ${deleteTarget?.serie ?? ''}? Solo se puede si aún no emitió comprobantes; si ya emitió, inactívala.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        error={deleteError}
      />
    </Stack>
  );
}

/* ===== Credenciales SUNAT ===== */

interface CredencialesForm {
  usuario_sol: string;
  clave_sol: string;
  certificado: File | null;
  certificado_password: string;
  razon_social_certificado: string;
  certificado_vence_en: string;
  modo_facturacion: 'beta' | 'produccion' | '';
}

const EMPTY_CREDENCIALES: CredencialesForm = {
  usuario_sol: '',
  clave_sol: '',
  certificado: null,
  certificado_password: '',
  razon_social_certificado: '',
  certificado_vence_en: '',
  modo_facturacion: '',
};

function CredencialesTab({ empresaId, editable }: { empresaId: number; editable: boolean }) {
  const [cred, setCred] = useState<CredencialesSunat | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CredencialesForm>(EMPTY_CREDENCIALES);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isValidando, setIsValidando] = useState(false);
  const [validarError, setValidarError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    getCredencialesSunat(empresaId)
      .then((res) => setCred(res.data))
      .catch((err) => setLoadError(errorMessage(err)));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [empresaId]);

  function openForm() {
    // La clave SOL y la contraseña del certificado son write-only: siempre vacías (= no cambiar).
    setForm(EMPTY_CREDENCIALES);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const res = await saveCredencialesSunat(empresaId, {
        usuario_sol: form.usuario_sol,
        clave_sol: form.clave_sol,
        certificado: form.certificado,
        certificado_password: form.certificado_password,
        razon_social_certificado: form.razon_social_certificado,
        certificado_vence_en: form.certificado_vence_en,
        modo_facturacion: form.modo_facturacion || undefined,
      });
      setCred(res.data);
      setDialogOpen(false);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleValidar() {
    setValidarError(null);
    setIsValidando(true);

    try {
      const res = await validarCredencialesSunat(empresaId);
      setCred(res.data);
    } catch (err) {
      setValidarError(errorMessage(err));
    } finally {
      setIsValidando(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);

    try {
      await deleteCredencialesSunat(empresaId);
      setConfirmDelete(false);
      load();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }

  if (!cred) {
    return loadError ? <Alert severity="error">{loadError}</Alert> : <CircularProgress color="inherit" />;
  }

  const filas: [string, string][] = [
    ['Usuario SOL', cred.usuario_sol ?? '—'],
    ['Clave SOL', cred.tiene_clave_sol ? 'Registrada' : 'No registrada'],
    ['Certificado', cred.certificado_path ? 'Cargado' : 'No cargado'],
    ['Certificado cargado', formatFechaHora(cred.certificado_cargado_at)],
    ['Certificado vence', formatFecha(cred.certificado_vence_en)],
    ['Última validación', formatFechaHora(cred.ultima_validacion_at)],
  ];

  return (
    <Stack spacing={2} sx={{ maxWidth: 640 }}>
      {loadError && <Alert severity="error">{loadError}</Alert>}

      {!cred.existe ? (
        <Alert severity="info">La empresa no tiene credenciales SUNAT registradas.</Alert>
      ) : (
        <>
          {cred.esta_vencida && <Alert severity="error">El certificado digital está vencido.</Alert>}
          {!cred.esta_vencida && cred.dias_para_vencer !== null && cred.dias_para_vencer <= 30 && (
            <Alert severity="warning">El certificado vence en {cred.dias_para_vencer} días.</Alert>
          )}
          {!cred.esta_completa && (
            <Alert severity="warning">Faltan datos: se necesita usuario SOL, clave SOL y certificado.</Alert>
          )}
          {cred.ultima_validacion_ok === false && (
            <Alert severity="error">Última validación fallida: {cred.ultima_validacion_error ?? 'sin detalle'}</Alert>
          )}
          {cred.ultima_validacion_ok === true && <Alert severity="success">El certificado firmó correctamente en la última validación.</Alert>}

          <Stack spacing={0.5}>
            {filas.map(([label, valor]) => (
              <Stack key={label} direction="row" spacing={2}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 180 }}>
                  {label}
                </Typography>
                <Typography variant="body2">{valor}</Typography>
              </Stack>
            ))}
          </Stack>
        </>
      )}

      {validarError && <Alert severity="error">{validarError}</Alert>}

      {editable && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {cred.existe && (
            <Button
              variant="contained"
              startIcon={<VerifiedIcon />}
              onClick={handleValidar}
              disabled={isValidando || !cred.certificado_path}
            >
              {isValidando ? 'Validando...' : 'Validar certificado'}
            </Button>
          )}
          <Button variant="outlined" onClick={openForm}>
            {cred.existe ? 'Actualizar credenciales' : 'Registrar credenciales'}
          </Button>
          {cred.existe && (
            <Button
              color="error"
              onClick={() => {
                setDeleteError(null);
                setConfirmDelete(true);
              }}
            >
              Eliminar
            </Button>
          )}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={preventBackdropClose(() => setDialogOpen(false))} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader onClose={() => setDialogOpen(false)}>Credenciales SUNAT</DialogHeader>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              {cred.existe && (
                <Typography variant="body2" color="text.secondary">
                  Las claves no se muestran. Deja vacío lo que no quieras cambiar.
                </Typography>
              )}
              <TextField
                label="Usuario SOL"
                value={form.usuario_sol}
                onChange={(e) => setForm({ ...form, usuario_sol: e.target.value })}
                helperText={cred.usuario_sol ? `Actual: ${cred.usuario_sol}` : undefined}
                required
                autoComplete="off"
              />
              <TextField
                label="Clave SOL"
                type="password"
                value={form.clave_sol}
                onChange={(e) => setForm({ ...form, clave_sol: e.target.value })}
                required={!cred.tiene_clave_sol}
                autoComplete="new-password"
              />
              <Button variant="outlined" component="label">
                {form.certificado ? form.certificado.name : 'Seleccionar certificado (.pfx / .p12)'}
                <input
                  type="file"
                  hidden
                  accept=".pfx,.p12,application/x-pkcs12"
                  onChange={(e) => setForm({ ...form, certificado: e.target.files?.[0] ?? null })}
                />
              </Button>
              <Typography variant="caption" color="text.secondary">
                Sube el archivo tal como lo entregaron (también los de RENIEC).
                {cred.certificado_path && ' Si no eliges uno, se conserva el actual.'}
              </Typography>
              <TextField
                label="Contraseña del certificado"
                type="password"
                value={form.certificado_password}
                onChange={(e) => setForm({ ...form, certificado_password: e.target.value })}
                required={!!form.certificado}
                autoComplete="new-password"
              />
              <TextField
                label="Razón social del certificado"
                value={form.razon_social_certificado}
                onChange={(e) => setForm({ ...form, razon_social_certificado: e.target.value })}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Vencimiento del certificado"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={form.certificado_vence_en}
                  onChange={(e) => setForm({ ...form, certificado_vence_en: e.target.value })}
                />
                <TextField
                  select
                  label="Modo"
                  value={form.modo_facturacion}
                  onChange={(e) => setForm({ ...form, modo_facturacion: e.target.value as CredencialesForm['modo_facturacion'] })}
                >
                  <MenuItem value="">Sin cambios</MenuItem>
                  <MenuItem value="beta">Beta (pruebas)</MenuItem>
                  <MenuItem value="produccion">Producción</MenuItem>
                </TextField>
              </Stack>
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
        open={confirmDelete}
        title="Eliminar credenciales SUNAT"
        message="Se borrarán el usuario y la clave SOL y el certificado. No se podrán enviar comprobantes a SUNAT hasta registrarlos de nuevo."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        error={deleteError}
      />
    </Stack>
  );
}
