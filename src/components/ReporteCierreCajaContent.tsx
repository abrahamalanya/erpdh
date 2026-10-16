import type { ReactNode } from 'react';
import { Box, Chip, Link, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { formatFecha, formatMonto } from '../utils/format';
import type { EstadoCreditoReporte, MovimientoCierre, PersonaReporte, ReporteCierreCaja, ResumenCierre } from '../types/reporteCierreCaja';

const ESTADOS: Record<EstadoCreditoReporte, { label: string; color: string }> = {
  al_dia: { label: 'Al día', color: '#1565c0' },
  atraso_leve: { label: 'Atraso leve (1–3 días)', color: '#b45309' },
  atraso: { label: 'Atraso (4–15 días)', color: '#c62828' },
  mora: { label: 'Mora (más de 15 días)', color: '#7f1d1d' },
  liquidado: { label: 'Liquidado', color: '#2e7d32' },
};

function nombre(persona: PersonaReporte | null | undefined) {
  return persona ? [persona.nombre, persona.apellido].filter(Boolean).join(' ') : 'Sin información';
}

function comprobante(url: string | null | undefined) {
  return url ? <Link href={url} target="_blank" rel="noopener noreferrer">Ver comprobante</Link> : '—';
}

function credito(item: MovimientoCierre) {
  return item.credito_codigo ?? (item.credito_id ? `#${item.credito_id}` : '—');
}

function fechaLocal(fecha: string | null) {
  return fecha ? new Date(fecha).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) : '';
}

function Seccion({ titulo, total, columnas, filas }: {
  titulo: string; total?: string; columnas: string[]; filas: { id: number; celdas: ReactNode[] }[];
}) {
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, mb: 1 }}>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>{titulo}</Typography>
        {total != null && <Typography variant="subtitle1">{formatMonto(total)}</Typography>}
      </Stack>
      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Table size="small" aria-label={titulo}>
          <TableHead><TableRow>{columnas.map(c => <TableCell key={c}>{c}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {filas.length ? filas.map(f => <TableRow key={f.id}>{f.celdas.map((c, i) => <TableCell key={columnas[i]} sx={{ verticalAlign: 'top', whiteSpace: 'pre-line' }}>{c ?? '—'}</TableCell>)}</TableRow>) :
              <TableRow><TableCell colSpan={columnas.length} align="center" sx={{ color: 'text.secondary' }}>Sin registros</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

const RESUMEN: [keyof ResumenCierre, string][] = [
  ['saldo_apertura', 'Saldo de apertura'], ['total_billetaje', 'Billetajes recibidos'],
  ['total_cobrado', 'Total cobrado'], ['total_ingresos', 'Ingresos adicionales'],
  ['total_desembolsos', 'Desembolsos'], ['total_gastos', 'Gastos manuales'],
  ['saldo_total', 'Saldo total (incluye digital)'], ['saldo_efectivo', 'Saldo efectivo esperado'],
  ['monto_contado', 'Monto contado'], ['diferencia', 'Diferencia del arqueo'],
  ['faltante', 'Faltante'], ['sobrante', 'Sobrante'], ['neto', 'Neto'],
];

export function ReporteCierreCajaContent({ reporte: r }: { reporte: ReporteCierreCaja }) {
  const medios = [...new Set(['efectivo', 'yape', 'plin', 'transferencia', ...Object.keys(r.pagos_por_medio)])];
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">{nombre(r.usuario)}</Typography>
        <Typography variant="body2">Agencia: {r.agencia?.nombre ?? 'Sin agencia'}</Typography>
        <Typography variant="body2">Fecha: {formatFecha(r.cierre.fecha)} · Ciclo #{r.cierre.id}</Typography>
        <Typography variant="body2">Apertura: {fechaLocal(r.cierre.fecha_apertura)} {r.cierre.hora_apertura ?? 'Sin información'}</Typography>
        <Typography variant="body2">Cierre: {fechaLocal(r.cierre.fecha_cierre)} {r.cierre.hora_cierre ?? 'Pendiente'} (America/Lima)</Typography>
        <Typography variant="body2">Cerrada por: {nombre(r.cierre.cerrada_por)}</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
          <Chip size="small" label={r.cierre.estado === 'abierta' ? 'Abierta' : 'Cerrada'} color={r.cierre.estado === 'abierta' ? 'success' : 'default'} />
          {r.cierre.cierre_forzado && <Chip size="small" label="Cierre forzado" color="warning" />}
          {r.cierre.cierre_automatico && <Chip size="small" label="Cierre automático" color="info" />}
        </Stack>
      </Box>

      <Seccion titulo="Billetajes recibidos" total={r.resumen.total_billetaje} columnas={['Hora', 'Motivo', 'Medio', 'Enviado por', 'Monto', 'Comprobante']}
        filas={r.billetajes.map(b => ({ id: b.id, celdas: [b.hora, b.motivo, b.medio, nombre(b.enviado_por), formatMonto(b.monto), comprobante(b.comprobante_url)] }))} />

      {medios.map(medio => <Seccion key={medio} titulo={`Cobros · ${medio}`} total={r.totales_por_medio[medio]}
        columnas={['Cliente', 'Crédito', 'Hora', 'Operación', 'Monto', 'Interés', 'Mora', 'Descuento', 'Estado del crédito', 'Estado al cobrar']}
        filas={(r.pagos_por_medio[medio] ?? []).map(p => {
          const estado = p.estado_credito ? ESTADOS[p.estado_credito] : null;
          return { id: p.id, celdas: [nombre(p.cliente), credito(p), p.hora, p.operacion, formatMonto(p.monto),
            p.interes == null ? '—' : formatMonto(p.interes), p.mora == null ? '—' : formatMonto(p.mora), p.descuento == null ? '—' : formatMonto(p.descuento),
            <Stack key="estado" spacing={0.5}><Chip size="small" label={estado?.label ?? 'Sin información'} sx={estado ? { bgcolor: estado.color, color: '#fff', alignSelf: 'flex-start' } : {}} />{p.dias_atraso != null && <Typography variant="caption">{p.dias_atraso} días de atraso</Typography>}</Stack>, p.estado_credito_al_cobrar ?? 'Sin información'] };
        })} />)}

      <Seccion titulo="Ingresos adicionales" total={r.resumen.total_ingresos} columnas={['Hora', 'Concepto', 'Observación', 'Medio', 'Monto', 'Comprobante']}
        filas={r.ingresos.map(i => ({ id: i.id, celdas: [i.hora, i.concepto, i.observacion, i.medio, formatMonto(i.monto), comprobante(i.comprobante_url)] }))} />
      <Seccion titulo="Desembolsos" total={r.resumen.total_desembolsos} columnas={['Cliente', 'Crédito', 'Hora', 'Monto']}
        filas={r.desembolsos.map(d => ({ id: d.id, celdas: [nombre(d.cliente), credito(d), d.hora, formatMonto(d.monto)] }))} />

      <Box><Typography component="h2" variant="h6" sx={{ mb: 2 }}>Gastos por concepto · {formatMonto(r.resumen.total_gastos)}</Typography>
        <Stack spacing={2}>
          {!r.gastos_por_concepto.length && <Typography color="text.secondary">Sin gastos registrados</Typography>}
          {r.gastos_por_concepto.map((g, index) => <Seccion key={`${g.concepto}-${index}`} titulo={`${g.concepto} (${g.cantidad})`} total={g.total}
            columnas={['Hora', 'Concepto', 'Observación', 'Serie', 'Número', 'Monto', 'Comprobante']}
            filas={g.items.map(i => ({ id: i.id, celdas: [i.hora, i.concepto, i.observacion, i.serie, i.numero, formatMonto(i.monto), comprobante(i.comprobante_url)] }))} />)}
        </Stack>
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
        <Typography component="h2" variant="h6" sx={{ mb: 1 }}>Resumen financiero y arqueo</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>El arqueo compara el monto contado con el saldo efectivo esperado.</Typography>
        <Stack spacing={1}>
          {RESUMEN.map(([campo, label]) => <Stack key={campo} direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: campo.startsWith('saldo_') ? 700 : 400 }}>{label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: campo.startsWith('saldo_') ? 700 : 400 }}>{r.resumen[campo] == null ? 'Pendiente' : formatMonto(r.resumen[campo])}</Typography>
          </Stack>)}
        </Stack>
      </Box>
    </Stack>
  );
}
