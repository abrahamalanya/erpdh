import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL?.includes('/src/')) {
      const url = new URL(specifier, context.parentURL);
      for (const extension of ['.ts', '.tsx']) {
        if (existsSync(new URL(url.href + extension))) return next(url.href + extension, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.tsx?$/.test(url)) {
      const source = readFileSync(new URL(url), 'utf8').replace('import.meta.env.VITE_API_URL', JSON.stringify('/api'));
      return { format: 'module', source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, shortCircuit: true };
    }
    return next(url, context);
  },
});

const { ReporteCierreCajaContent } = await import('../src/components/ReporteCierreCajaContent.tsx');
const api = await import('../src/api/reportes.ts');
const { ApiError } = await import('../src/api/client.ts');
const fixture = () => ({
  cierre: { id: 71, caja_id: 9, fecha: '2026-10-15', estado: 'abierta', hora_apertura: '08:15', hora_cierre: null, cerrada_por: null },
  usuario: { id: 1, nombre: 'Ana', apellido: 'Perez' }, agencia: null,
  billetajes: [], pagos_por_medio: { efectivo: [], yape: [], plin: [], transferencia: [] },
  totales_por_medio: { efectivo: '0.00', yape: '0.00', plin: '0.00', transferencia: '0.00' },
  ingresos: [], desembolsos: [], gastos: [], gastos_por_concepto: [],
  resumen: { saldo_apertura: '50.00', total_billetaje: '0.00', total_cobrado: '0.00', total_ingresos: '0.00', total_desembolsos: '0.00', total_gastos: '0.00', saldo_total: '50.00', saldo_efectivo: '50.00', monto_contado: null, diferencia: null, faltante: '0.00', sobrante: '0.00', neto: '50.00' },
});
const render = reporte => renderToStaticMarkup(React.createElement(ReporteCierreCajaContent, { reporte }));

test('open cycle shows pending cash count, optional relations, empty sections and backend local hours', () => {
  const html = render(fixture());
  for (const text of ['Ana Perez', 'Sin agencia', 'Abierta', '08:15', 'America/Lima', 'Pendiente', 'Sin registros', 'Sin gastos registrados', 'Cobros · yape', 'Cobros · plin', 'Cobros · transferencia']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('NaN'));
});

test('closed cycle displays supplied financial totals, digital subtotals, grouped expenses and receipts', () => {
  const r = fixture();
  r.cierre = { ...r.cierre, estado: 'cerrada', hora_cierre: '23:30', cierre_forzado: true, cierre_automatico: true };
  r.resumen = { ...r.resumen, saldo_total: '305.00', saldo_efectivo: '255.00', monto_contado: '250.00', diferencia: '-5.00', faltante: '5.00', total_gastos: '35.00', neto: '300.00' };
  r.totales_por_medio.yape = '123.45'; // Deliberately differs from item amounts: never recompute.
  r.pagos_por_medio.yape = [{ id: 3, cliente: null, credito_id: 8, credito_codigo: 'CR-008', hora: '22:10', monto: '25.00', estado_credito: 'mora', dias_atraso: 16, estado_credito_al_cobrar: 'activo' }];
  r.gastos_por_concepto = [{ concepto: 'Movilidad', cantidad: 1, total: '35.00', items: [{ id: 4, hora: '19:15', monto: '35.00', observacion: 'Combustible', serie: 'B001', numero: '123', comprobante_url: 'https://example.com/receipt.pdf' }] }];
  const html = render(r);
  for (const text of ['Cerrada', '23:30', 'Cierre forzado', 'Cierre automático', 'S/ 305.00', 'S/ 255.00', 'S/ -5.00', 'S/ 300.00', 'S/ 123.45', 'CR-008', '22:10', 'Movilidad (1)', 'Combustible', 'B001', 'https://example.com/receipt.pdf']) assert.ok(html.includes(text), text);
  r.resumen = { ...r.resumen, monto_contado: '265.00', diferencia: '10.00', faltante: '0.00', sobrante: '10.00', neto: '315.00' };
  assert.ok(render(r).includes('S/ 315.00'));
});

test('all credit states include text and their specified color, including null', () => {
  for (const [estado, label, color] of [[null, 'Sin información', null], ['al_dia', 'Al día', '#1565c0'], ['atraso_leve', 'Atraso leve', '#b45309'], ['atraso', 'Atraso (4–15 días)', '#c62828'], ['mora', 'Mora (más de 15 días)', '#7f1d1d'], ['liquidado', 'Liquidado', '#2e7d32']]) {
    const r = fixture();
    r.pagos_por_medio.efectivo = [{ id: 1, monto: '1.00', estado_credito: estado, dias_atraso: null }];
    const html = render(r);
    assert.ok(html.includes(label));
    if (color) assert.ok(html.includes(color));
  }
});

test('JSON and binary endpoints use cycle id, Bearer authentication, and preserve 401/403/404', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => 'test-token' };
  const requests = [];
  try {
    globalThis.fetch = async (url, options) => {
      requests.push({ url, ...options });
      return { ok: true, json: async () => ({ data: fixture() }), blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }) };
    };
    const result = await api.getReporteCierreCaja(71);
    assert.equal(result.data.cierre.id, 71);
    assert.equal(requests.at(-1).url, '/api/reportes/cajas-apertura-cierre/71/reporte');
    const pdf = await api.getReporteCierreCajaPdf(71);
    assert.equal(await pdf.text(), '%PDF-1.4');
    assert.equal(requests.at(-1).url, '/api/reportes/cajas-apertura-cierre/71/reporte/pdf');
    assert.ok(requests.every(r => r.headers.Authorization === 'Bearer test-token'));
    for (const status of [401, 403, 404]) {
      globalThis.fetch = async () => ({ ok: false, status, json: async () => ({ message: 'Sin acceso' }) });
      for (const fn of [api.getReporteCierreCaja, api.getReporteCierreCajaPdf]) await assert.rejects(fn(72), e => e instanceof ApiError && e.status === status);
    }
    globalThis.fetch = async (_url, options) => { assert.ok(options.signal.aborted); throw new DOMException('Aborted', 'AbortError'); };
    const controller = new AbortController(); controller.abort();
    await assert.rejects(api.getReporteCierreCaja(73, controller.signal), { name: 'AbortError' });
  } finally { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; }
});
