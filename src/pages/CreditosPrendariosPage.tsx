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
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DrawIcon from '@mui/icons-material/Draw';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PaidIcon from '@mui/icons-material/Paid';
import { useAuth } from '../hooks/useAuth';
import {
  canAprobarCreditos,
  canCrearCreditos,
  canFirmarCreditos,
  canLiquidarCreditos,
  canRefrendarCreditos,
  canVerCreditos,
  CREDITO_ESTADO_COLOR,
  CREDITO_ESTADO_LABELS,
  puedeAprobarCredito,
  TIPO_CUOTA_LABELS,
} from '../utils/creditoPrendarioHierarchy';
import { extractUserName } from '../utils/cajaHierarchy';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import {
  aprobarCredito,
  createCredito,
  firmarCredito,
  getCredito,
  liquidarCredito,
  listCreditos,
  marcarFirmadoDocumento,
  marcarImpresoDocumento,
  rechazarCredito,
  refrendarCredito,
  type CreateCreditoPayload,
} from '../api/creditosPrendarios';
import { listBienes } from '../api/bienes';
import { listClientes } from '../api/clientes';
import { formatMonto } from '../utils/format';
import type { Bien, Cliente, CreditoPrendario, PaginatedData, TipoCuota } from '../types/api';

export function CreditosPrendariosPage() {
  const { user } = useAuth();
  const canCreate = canCrearCreditos(user);

  const [result, setResult] = useState<PaginatedData<CreditoPrendario> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [bienes, setBienes] = useState<Bien[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{
    bien_id?: number;
    cliente_id?: number;
    monto_prestamo: string;
    interes: string;
    tipo_cuota: TipoCuota;
  }>({ monto_prestamo: '', interes: '', tipo_cuota: 'mensual' });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [actingId, setActingId] = useState<number | null>(null);

  const [rechazarTarget, setRechazarTarget] = useState<CreditoPrendario | null>(null);
  const [motivo, setMotivo] = useState('');
  const [isRechazando, setIsRechazando] = useState(false);

  const [refrendarTarget, setRefrendarTarget] = useState<CreditoPrendario | null>(null);
  const [montoInteres, setMontoInteres] = useState('');
  const [isRefrendando, setIsRefrendando] = useState(false);

  const [detalle, setDetalle] = useState<CreditoPrendario | null>(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  function loadCreditos() {
    setIsLoading(true);
    setLoadError(null);

    listCreditos(page)
      .then((res) => setResult(res.data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadCreditos, [page]);

  if (!canVerCreditos(user)) {
    return <Navigate to="/" replace />;
  }

  function openCreateDialog() {
    setForm({ monto_prestamo: '', interes: '', tipo_cuota: 'mensual' });
    setFormError(null);
    setDialogOpen(true);

    listBienes().then((res) => setBienes(res.data.data.filter((b) => b.estado === 'en_garantia')));
    listClientes().then((res) => setClientes(res.data.data));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.bien_id || !form.cliente_id) return;

    setFormError(null);
    setIsSaving(true);

    try {
      const payload: CreateCreditoPayload = {
        bien_id: form.bien_id,
        cliente_id: form.cliente_id,
        monto_prestamo: form.monto_prestamo,
        interes: form.interes || undefined,
        tipo_cuota: form.tipo_cuota,
      };

      await createCredito(payload);
      setDialogOpen(false);
      loadCreditos();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAprobar(credito: CreditoPrendario) {
    setLoadError(null);
    setActingId(credito.id);

    try {
      await aprobarCredito(credito.id);
      loadCreditos();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setActingId(null);
    }
  }

  async function handleFirmar(credito: CreditoPrendario) {
    setLoadError(null);
    setActingId(credito.id);

    try {
      await firmarCredito(credito.id);
      loadCreditos();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setActingId(null);
    }
  }

  async function handleLiquidar(credito: CreditoPrendario) {
    setLoadError(null);
    setActingId(credito.id);

    try {
      await liquidarCredito(credito.id);
      loadCreditos();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setActingId(null);
    }
  }

  async function handleRechazar() {
    if (!rechazarTarget) return;

    setIsRechazando(true);

    try {
      await rechazarCredito(rechazarTarget.id, motivo || undefined);
      setRechazarTarget(null);
      setMotivo('');
      loadCreditos();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsRechazando(false);
    }
  }

  async function handleRefrendar() {
    if (!refrendarTarget) return;

    setIsRefrendando(true);

    try {
      await refrendarCredito(refrendarTarget.id, montoInteres);
      setRefrendarTarget(null);
      setMontoInteres('');
      loadCreditos();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsRefrendando(false);
    }
  }

  function openDetalle(credito: CreditoPrendario) {
    setDetalle(null);
    setDialogError(null);
    setIsLoadingDetalle(true);

    getCredito(credito.id)
      .then((res) => setDetalle(res.data))
      .catch((err) => setDialogError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setIsLoadingDetalle(false));
  }

  async function handleMarcarImpreso(documentoId: number) {
    if (!detalle) return;

    try {
      const res = await marcarImpresoDocumento(detalle.id, documentoId);
      setDetalle((d) =>
        d ? { ...d, documentos: d.documentos?.map((doc) => (doc.id === documentoId ? res.data : doc)) } : d
      );
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  async function handleMarcarFirmado(documentoId: number) {
    if (!detalle) return;

    try {
      const res = await marcarFirmadoDocumento(detalle.id, documentoId);
      setDetalle((d) =>
        d ? { ...d, documentos: d.documentos?.map((doc) => (doc.id === documentoId ? res.data : doc)) } : d
      );
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  const columns: DataTableColumn<CreditoPrendario>[] = [
    { header: 'Cliente', render: (c) => (c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}` : '—') },
    { header: 'Bien', render: (c) => c.bien?.nombre ?? '—' },
    { header: 'Monto', render: (c) => formatMonto(c.monto_prestamo) },
    { header: 'Interés', render: (c) => `${c.interes}%` },
    { header: 'Cuota', render: (c) => TIPO_CUOTA_LABELS[c.tipo_cuota] },
    {
      header: 'Estado',
      render: (c) => (
        <Chip label={CREDITO_ESTADO_LABELS[c.estado]} size="small" color={CREDITO_ESTADO_COLOR[c.estado]} />
      ),
    },
    {
      header: 'Vencimiento',
      render: (c) => (c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString() : '—'),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: (c) => (
        <>
          <IconButton size="small" aria-label="Ver detalle" onClick={() => openDetalle(c)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
          {c.estado === 'pendiente' && canAprobarCreditos(user) && puedeAprobarCredito(user, c) && (
            <>
              <IconButton
                size="small"
                aria-label="Aprobar"
                disabled={actingId === c.id}
                onClick={() => handleAprobar(c)}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="Rechazar" onClick={() => setRechazarTarget(c)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          )}
          {c.estado === 'aprobado' && canFirmarCreditos(user) && (
            <IconButton
              size="small"
              aria-label="Firmar"
              disabled={actingId === c.id}
              onClick={() => handleFirmar(c)}
            >
              <DrawIcon fontSize="small" />
            </IconButton>
          )}
          {(c.estado === 'activo' || c.estado === 'vencido') && (
            <>
              {canRefrendarCreditos(user) && (
                <IconButton size="small" aria-label="Refrendar" onClick={() => setRefrendarTarget(c)}>
                  <AutorenewIcon fontSize="small" />
                </IconButton>
              )}
              {canLiquidarCreditos(user) && (
                <IconButton
                  size="small"
                  aria-label="Liquidar"
                  disabled={actingId === c.id}
                  onClick={() => handleLiquidar(c)}
                >
                  <PaidIcon fontSize="small" />
                </IconButton>
              )}
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Créditos prendarios
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nuevo crédito
          </Button>
        )}
      </Stack>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <DataTable
        columns={columns}
        rows={result?.data ?? []}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No hay créditos registrados"
        page={page}
        lastPage={result?.last_page ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>Nuevo crédito prendario</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                select
                label="Bien"
                value={form.bien_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, bien_id: Number(e.target.value) }))}
                required
                helperText={bienes.length === 0 ? 'No hay bienes en garantía disponibles' : undefined}
              >
                {bienes.map((bien) => (
                  <MenuItem key={bien.id} value={bien.id}>
                    {bien.nombre} — {formatMonto(bien.valorizacion)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Cliente"
                value={form.cliente_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, cliente_id: Number(e.target.value) }))}
                required
              >
                {clientes.map((cliente) => (
                  <MenuItem key={cliente.id} value={cliente.id}>
                    {cliente.nombre} {cliente.apellido}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Monto del préstamo"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
                value={form.monto_prestamo}
                onChange={(e) => setForm((f) => ({ ...f, monto_prestamo: e.target.value }))}
                required
              />
              <TextField
                label="Interés (%)"
                type="number"
                slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                value={form.interes}
                onChange={(e) => setForm((f) => ({ ...f, interes: e.target.value }))}
                helperText="Vacío = usa el interés configurado por defecto"
              />
              <TextField
                select
                label="Tipo de cuota"
                value={form.tipo_cuota}
                onChange={(e) => setForm((f) => ({ ...f, tipo_cuota: e.target.value as TipoCuota }))}
              >
                {Object.entries(TIPO_CUOTA_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
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

      <Dialog open={!!rechazarTarget} onClose={() => setRechazarTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Rechazar crédito</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Motivo (opcional)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              multiline
              minRows={2}
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setRechazarTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleRechazar} disabled={isRechazando}>
            {isRechazando ? 'Rechazando...' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!refrendarTarget} onClose={() => setRefrendarTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Refrendar crédito</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Registra el pago de interés y genera un nuevo ciclo activo del crédito.
            </Typography>
            <TextField
              label="Monto de interés pagado"
              type="number"
              slotProps={{ htmlInput: { step: '0.01', min: 0.01 } }}
              value={montoInteres}
              onChange={(e) => setMontoInteres(e.target.value)}
              required
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setRefrendarTarget(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleRefrendar} disabled={isRefrendando}>
            {isRefrendando ? 'Refrendando...' : 'Refrendar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detalle || isLoadingDetalle} onClose={() => setDetalle(null)} fullWidth maxWidth="sm">
        <DialogTitle>Detalle del crédito</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            {detalle && (
              <>
                <Typography variant="body2">
                  <strong>Cliente:</strong> {detalle.cliente?.nombre} {detalle.cliente?.apellido} ·{' '}
                  {detalle.cliente?.numero_documento}
                </Typography>
                <Typography variant="body2">
                  <strong>Bien:</strong> {detalle.bien?.nombre} ({formatMonto(detalle.bien?.valorizacion ?? '0')})
                </Typography>
                <Typography variant="body2">
                  <strong>Registrado por:</strong> {extractUserName(detalle.registrado_por) ?? '—'}
                </Typography>
                {detalle.motivo_rechazo && (
                  <Alert severity="warning">Motivo de rechazo: {detalle.motivo_rechazo}</Alert>
                )}

                <Typography variant="subtitle2">Documentos</Typography>
                {detalle.documentos && detalle.documentos.length > 0 ? (
                  <Stack spacing={1}>
                    {detalle.documentos.map((documento) => (
                      <Stack
                        key={documento.id}
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Typography
                          variant="body2"
                          component="a"
                          href={documento.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {documento.tipo}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={documento.impreso_at ? 'Impreso' : 'No impreso'}
                            size="small"
                            onClick={
                              documento.impreso_at ? undefined : () => handleMarcarImpreso(documento.id)
                            }
                            color={documento.impreso_at ? 'success' : 'default'}
                          />
                          <Chip
                            label={documento.firmado_at ? 'Firmado' : 'No firmado'}
                            size="small"
                            onClick={
                              documento.firmado_at ? undefined : () => handleMarcarFirmado(documento.id)
                            }
                            color={documento.firmado_at ? 'success' : 'default'}
                          />
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Aún no se generaron documentos (se generan al aprobar el crédito).
                  </Typography>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDetalle(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
