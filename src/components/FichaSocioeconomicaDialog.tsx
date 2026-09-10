import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import {
  getFichaSocioeconomica,
  saveFichaSocioeconomica,
  type FichaFamiliar,
} from '../api/fichaSocioeconomica';
import {
  INGRESO_FIELDS,
  EGRESO_PERSONAL_FIELDS,
  EGRESO_NEGOCIO_FIELDS,
  GRADO_INSTRUCCION_OPTS,
  VIV_TENENCIA_OPTS,
  VIV_MATERIAL_OPTS,
  VIV_HABITACIONES_OPTS,
  VIV_TIPO_OPTS,
  VIV_REDES_OPTS,
  VIV_MUEBLES_OPTS,
  sumFields,
} from '../utils/fichaSocioeconomica';
import { formatMonto } from '../utils/format';

type FormState = Record<string, string>;

interface FichaSocioeconomicaDialogProps {
  clienteId: number;
  clienteNombre?: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const MONTO_KEYS = [
  ...INGRESO_FIELDS.map((f) => f.key),
  ...EGRESO_PERSONAL_FIELDS.map((f) => f.key),
  ...EGRESO_NEGOCIO_FIELDS.map((f) => f.key),
  'viv_total_activo_mueble',
  'viv_total_activo_inmueble',
];

const TEXT_KEYS = [
  'grado_instruccion',
  'profesion',
  'laboral_institucion',
  'laboral_cargo',
  'laboral_fecha_ingreso',
  'viv_tenencia',
  'viv_material',
  'viv_habitaciones',
  'viv_tipo',
  'viv_nro_pisos',
  'viv_piso_vive',
  'viv_agua',
  'viv_telefono',
  'declarante_nombres',
  'declarante_parentesco',
  'declarante_direccion',
  'declarante_telefono',
  'observaciones',
  'responsable_ficha',
];

function emptyForm(): FormState {
  const f: FormState = {};
  for (const k of [...MONTO_KEYS, ...TEXT_KEYS]) f[k] = '';
  return f;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

export function FichaSocioeconomicaDialog({
  clienteId,
  clienteNombre,
  open,
  onClose,
  onSaved,
}: FichaSocioeconomicaDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [familiares, setFamiliares] = useState<FichaFamiliar[]>([]);
  const [redes, setRedes] = useState<string[]>([]);
  const [muebles, setMuebles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setIsLoading(true);
    getFichaSocioeconomica(clienteId)
      .then((res) => {
        const ficha = res.data;
        if (!ficha) {
          setForm(emptyForm());
          setFamiliares([]);
          setRedes([]);
          setMuebles([]);
          return;
        }
        const next = emptyForm();
        for (const k of Object.keys(next)) {
          const v = ficha[k];
          next[k] = v === null || v === undefined ? '' : String(v);
        }
        setForm(next);
        setFamiliares((ficha.familiares ?? []).map((f) => ({ ...f, edad: f.edad ?? '' })));
        setRedes(ficha.viv_redes_servicio ?? []);
        setMuebles(ficha.viv_bienes_muebles ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }, [open, clienteId]);

  const patch = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const totalIngresos = useMemo(
    () => sumFields(form, INGRESO_FIELDS.map((f) => f.key)),
    [form]
  );
  const totalEgresosPer = useMemo(
    () => sumFields(form, EGRESO_PERSONAL_FIELDS.map((f) => f.key)),
    [form]
  );
  const totalEgresosNeg = useMemo(
    () => sumFields(form, EGRESO_NEGOCIO_FIELDS.map((f) => f.key)),
    [form]
  );
  const totalNeto = totalIngresos - totalEgresosPer - totalEgresosNeg;

  async function handleSave() {
    setError(null);
    setIsSaving(true);

    const payload: Record<string, unknown> = {};
    for (const k of MONTO_KEYS) payload[k] = form[k] === '' ? 0 : Number(form[k]);
    for (const k of TEXT_KEYS) payload[k] = form[k] === '' ? null : form[k];
    payload.viv_nro_pisos = form.viv_nro_pisos === '' ? null : Number(form.viv_nro_pisos);
    payload.viv_piso_vive = form.viv_piso_vive === '' ? null : Number(form.viv_piso_vive);
    payload.viv_redes_servicio = redes;
    payload.viv_bienes_muebles = muebles;
    payload.familiares = familiares
      .filter((f) => (f.nombres ?? '').trim() !== '')
      .map((f) => ({
        nombres: f.nombres,
        edad: f.edad === '' || f.edad === null || f.edad === undefined ? null : Number(f.edad),
        parentesco: f.parentesco || null,
        estado_civil: f.estado_civil || null,
        ocupacion: f.ocupacion || null,
      }));

    try {
      await saveFichaSocioeconomica(clienteId, payload);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  const montoField = (key: string, label: string) => (
    <TextField
      key={key}
      label={label}
      type="number"
      size="small"
      slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
      value={form[key]}
      onChange={(e) => patch(key, e.target.value)}
      fullWidth
    />
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Ficha socioeconómica{clienteNombre ? ` — ${clienteNombre}` : ''}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {isLoading ? (
          <Typography variant="body2" color="text.secondary">Cargando…</Typography>
        ) : (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              Los datos personales (DNI, nombre, fecha de nacimiento, domicilio, distrito…) se
              editan en el formulario del cliente. Aquí va el resto de la ficha.
            </Typography>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">1. Datos personales · complemento</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    select
                    label="Grado de instrucción"
                    value={form.grado_instruccion}
                    onChange={(e) => patch('grado_instruccion', e.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">—</MenuItem>
                    {GRADO_INSTRUCCION_OPTS.map((v) => (
                      <MenuItem key={v} value={v}>{cap(v)}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Profesión"
                    value={form.profesion}
                    onChange={(e) => patch('profesion', e.target.value)}
                    fullWidth
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">2. Datos laborales</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    label="Nombre de institución"
                    value={form.laboral_institucion}
                    onChange={(e) => patch('laboral_institucion', e.target.value)}
                    fullWidth
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Cargo"
                      value={form.laboral_cargo}
                      onChange={(e) => patch('laboral_cargo', e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Fecha de ingreso"
                      type="date"
                      value={form.laboral_fecha_ingreso}
                      onChange={(e) => patch('laboral_fecha_ingreso', e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                    />
                  </Stack>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">3. Datos familiares (solo con quienes viven)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombres y apellidos</TableCell>
                      <TableCell sx={{ width: 70 }}>Edad</TableCell>
                      <TableCell>Parentesco</TableCell>
                      <TableCell>Estado civil</TableCell>
                      <TableCell>Ocupación</TableCell>
                      <TableCell sx={{ width: 40 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {familiares.map((fam, i) => (
                      <TableRow key={i}>
                        {(['nombres', 'edad', 'parentesco', 'estado_civil', 'ocupacion'] as const).map(
                          (campo) => (
                            <TableCell key={campo}>
                              <TextField
                                variant="standard"
                                type={campo === 'edad' ? 'number' : 'text'}
                                value={(fam[campo] as string | number | undefined) ?? ''}
                                onChange={(e) =>
                                  setFamiliares((list) =>
                                    list.map((x, j) =>
                                      j === i ? { ...x, [campo]: e.target.value } : x
                                    )
                                  )
                                }
                                fullWidth
                              />
                            </TableCell>
                          )
                        )}
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setFamiliares((list) => list.filter((_, j) => j !== i))}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setFamiliares((list) => [...list, { nombres: '', edad: '' }])}
                  sx={{ mt: 1 }}
                >
                  Agregar familiar
                </Button>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">4. Datos económicos</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Ingresos mensuales (S/)
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                      {INGRESO_FIELDS.map((f) => montoField(f.key, f.label))}
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Total ingresos: <strong>{formatMonto(totalIngresos)}</strong>
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Egresos mensuales personales (S/)
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                      {EGRESO_PERSONAL_FIELDS.map((f) => montoField(f.key, f.label))}
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Total egresos personales: <strong>{formatMonto(totalEgresosPer)}</strong>
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Egresos mensuales negocio (S/)
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                      {EGRESO_NEGOCIO_FIELDS.map((f) => montoField(f.key, f.label))}
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Total egresos negocio: <strong>{formatMonto(totalEgresosNeg)}</strong>
                    </Typography>
                  </Box>
                  <Alert severity="info">
                    TOTAL (ingresos − egresos personales − egresos negocio):{' '}
                    <strong>{formatMonto(totalNeto)}</strong>
                  </Alert>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">5. Datos de la vivienda</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    {(
                      [
                        ['viv_tenencia', 'Tenencia', VIV_TENENCIA_OPTS],
                        ['viv_material', 'Material', VIV_MATERIAL_OPTS],
                        ['viv_habitaciones', 'N° de habitaciones', VIV_HABITACIONES_OPTS],
                        ['viv_tipo', 'Tipo', VIV_TIPO_OPTS],
                      ] as const
                    ).map(([key, label, opts]) => (
                      <TextField
                        key={key}
                        select
                        size="small"
                        label={label}
                        value={form[key]}
                        onChange={(e) => patch(key, e.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">—</MenuItem>
                        {opts.map((o) => (
                          <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                      </TextField>
                    ))}
                    <TextField
                      size="small"
                      label="N° de pisos"
                      type="number"
                      value={form.viv_nro_pisos}
                      onChange={(e) => patch('viv_nro_pisos', e.target.value)}
                    />
                    <TextField
                      size="small"
                      label="Piso en que vive"
                      type="number"
                      value={form.viv_piso_vive}
                      onChange={(e) => patch('viv_piso_vive', e.target.value)}
                    />
                    <TextField
                      size="small"
                      label="Agua"
                      value={form.viv_agua}
                      onChange={(e) => patch('viv_agua', e.target.value)}
                    />
                    <TextField
                      size="small"
                      label="Teléfono"
                      value={form.viv_telefono}
                      onChange={(e) => patch('viv_telefono', e.target.value)}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Redes de servicio público</Typography>
                    <FormGroup row>
                      {VIV_REDES_OPTS.map((o) => (
                        <FormControlLabel
                          key={o.value}
                          control={
                            <Checkbox
                              checked={redes.includes(o.value)}
                              onChange={() => toggle(redes, setRedes, o.value)}
                            />
                          }
                          label={o.label}
                        />
                      ))}
                    </FormGroup>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Bienes muebles</Typography>
                    <FormGroup row>
                      {VIV_MUEBLES_OPTS.map((o) => (
                        <FormControlLabel
                          key={o.value}
                          control={
                            <Checkbox
                              checked={muebles.includes(o.value)}
                              onChange={() => toggle(muebles, setMuebles, o.value)}
                            />
                          }
                          label={o.label}
                        />
                      ))}
                    </FormGroup>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    {montoField('viv_total_activo_mueble', 'Total activo mueble (S/)')}
                    {montoField('viv_total_activo_inmueble', 'Total activo inmueble (S/)')}
                  </Stack>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Declarante y observaciones</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Typography variant="caption" color="text.secondary">
                    Completar solo si el contacto es otro familiar.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Apellidos y nombres"
                      value={form.declarante_nombres}
                      onChange={(e) => patch('declarante_nombres', e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Parentesco"
                      value={form.declarante_parentesco}
                      onChange={(e) => patch('declarante_parentesco', e.target.value)}
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Dirección"
                      value={form.declarante_direccion}
                      onChange={(e) => patch('declarante_direccion', e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Teléfono"
                      value={form.declarante_telefono}
                      onChange={(e) => patch('declarante_telefono', e.target.value)}
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Observaciones"
                    value={form.observaciones}
                    onChange={(e) => patch('observaciones', e.target.value)}
                    multiline
                    minRows={3}
                    fullWidth
                  />
                  <TextField
                    label="Responsable de la ficha"
                    value={form.responsable_ficha}
                    onChange={(e) => patch('responsable_ficha', e.target.value)}
                    fullWidth
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={isSaving || isLoading}>
          {isSaving ? 'Guardando…' : 'Guardar ficha'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
