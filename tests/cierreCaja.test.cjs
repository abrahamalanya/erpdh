const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: name => { if (!(name in mocks)) throw Error(name); return mocks[name]; }, console });
  return exports;
}
const utils = load('src/utils/cierreCaja.ts');
const fila = overrides => ({ estado: 'cerrada', valor_aperturado: '50.00', total_billetaje: '80.00',
  total_cobranza: '250.00', total_ingresos: '110.00', total_desembolso: '150.00', total_egresos: '35.00',
  diferencia: '-5.00', ...overrides });
test('period totals include opening balance and each category once, while keeping cash differences separate', () => {
  const totals = utils.totalesCierreCaja([fila()]);
  assert.equal(totals.saldo, '305.00'); assert.equal(totals.neto, '300.00');
  assert.equal(totals.faltante, '5.00'); assert.equal(totals.sobrante, '0.00');
  const both = utils.totalesCierreCaja([fila(), fila({ diferencia: '10.00' })]);
  assert.equal(both.saldo, '610.00'); assert.equal(both.neto, '615.00');
  assert.equal(both.faltante, '5.00'); assert.equal(both.sobrante, '10.00');
});
test('open cycles do not declare shortages and decimal additions stay exact', () => {
  const empty = fila({ estado: 'abierta', valor_aperturado: '0', total_billetaje: '0', total_cobranza: '0',
    total_ingresos: '0.10', total_desembolso: '0', total_egresos: '0', diferencia: '-99' });
  const total = utils.totalesCierreCaja([empty, { ...empty, total_ingresos: '0.20' }]);
  assert.equal(total.neto, '0.30'); assert.equal(total.faltante, '0.00');
  assert.equal(utils.totalesCierreCaja([]).neto, '0.00');
});
test('date filters reject incomplete, impossible and reversed dates', () => {
  for (const dates of [['2026-10', ''], ['2026-02-30',''], ['2026-10-16','2026-10-15'], ['invalid','']]) assert.equal(utils.rangoCierreValido(...dates), false);
  for (const dates of [['',''], ['2026-10-15','2026-10-15'], ['2024-02-29',''], ['','2026-10-15']]) assert.equal(utils.rangoCierreValido(...dates), true);
});

test('cash actions send counted amount and target the caja rather than its cycle', async () => {
  const calls = [];
  const api = load('src/api/caja.ts', {
    './client': { apiFetch: async (...args) => { calls.push(args); return { success: true, data: {} }; } },
    '../utils/formData': {},
  });
  await api.cerrarCaja('123.45');
  assert.equal(calls[0][0], '/caja/cerrar');
  assert.equal(JSON.parse(calls[0][1].body).monto_contado, '123.45');
  await api.cerrarForzadoCaja(7, '55.00');
  assert.equal(calls[1][0], '/cajas/7/cerrar-forzado');
  assert.equal(JSON.parse(calls[1][1].body).monto_contado, '55.00');
  await api.reabrirCaja(7);
  assert.equal(calls[2][0], '/cajas/7/reabrir');
  assert.equal(calls[2][1].method, 'POST');
});

test('the unified web screen exposes management only to authorized users and selects the correct default', () => {
  let profile = { propia: true, historial: true, gestion: false };
  const jsx = (type, props) => ({ type, props });
  const page = load('src/pages/CierreCajaPage.tsx', {
    react: { useState: initial => [initial, () => {}] }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-router-dom': { Navigate: 'Navigate' },
    '@mui/material': { Box: 'Box', Stack: 'Stack', Tab: 'Tab', Tabs: 'Tabs', Typography: 'Typography' },
    '../hooks/useAuth': { useAuth: () => ({ user: {} }) },
    '../utils/cajaHierarchy': {
      canAccederCajaPropia: () => profile.propia, canVerCajas: () => profile.historial,
      canCerrarForzado: () => profile.gestion, canReabrirCaja: () => false,
    },
    './CajaPage': { CajaPage: 'MiCaja' }, './CajasPage': { CajasPage: 'Gestion' },
    './ReporteCajasPage': { ReporteCajasPage: 'Historial' },
  });
  function find(node, type) {
    if (!node) return null;
    if (Array.isArray(node)) return node.map(child => find(child, type)).find(Boolean);
    return node.type === type ? node : find(node.props?.children, type);
  }
  let root = page.CierreCajaPage();
  assert.equal(find(root, 'Tabs').props.value, 'propia');
  assert.equal(find(root, 'Tabs').props.children.length, 2);
  profile = { propia: true, historial: true, gestion: true };
  root = page.CierreCajaPage();
  assert.equal(find(root, 'Tabs').props.value, 'historial');
  assert.equal(find(root, 'Tabs').props.children.length, 3);
  assert.equal(find(root, 'Historial').props.tarjetas, true);
  profile = { propia: false, historial: false, gestion: false };
  assert.equal(page.CierreCajaPage().type, 'Navigate');
});
