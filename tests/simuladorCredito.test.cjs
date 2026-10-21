const mobile = false;

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks, extras = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => mocks(name), console, Error, ...extras });
  return exports;
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function text(node) {
  if (node == null || node === false) return '';
  if (Array.isArray(node)) return node.map(text).join(' ');
  return typeof node === 'object' ? text(node.props?.children) : String(node);
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function harness() {
  const states = [], effects = [], timers = new Map(), pending = [], saved = [];
  let si = 0, ei = 0, timerId = 0;
  const hooks = {
    useState(initial) {
      const index = si++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useEffect(fn, deps) {
      const index = ei++;
      const old = effects[index];
      if (!old || deps.some((value, i) => value !== old.deps[i])) {
        old?.cleanup?.(); effects[index] = { deps, fn, changed: true };
      }
    },
    useCallback: fn => fn,
  };
  const api = {
    listSimulaciones: async () => ({ data: { data: [], last_page: 1 } }),
    getConfiguracionSimulador: async () => ({ data: {} }),
    calcularSimulacion: payload => new Promise((resolve, reject) => pending.push({ payload, resolve, reject })),
    createSimulacion: async payload => { saved.push(payload); return { data: {} }; },
  };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const component = name => new Proxy(function () {}, { get: (_, key) => key === 'default' ? name : name + '.' + String(key) });
  const proxy = new Proxy({}, { get: (_, key) => component(String(key)) });
  const mocks = name => {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === '@react-navigation/native') return { useFocusEffect() {} };
    if (name === 'react-native') return { View: 'View', ScrollView: 'Scroll', FlatList: 'FlatList', StyleSheet: { create: x => x } };
    if (name === 'react-native-paper') return new Proxy({ useTheme: () => ({ colors: {} }) }, { get: (target, key) => target[key] ?? component(String(key)) });
    if (name.endsWith('/api/simulacionesCredito')) return api;
    if (name.endsWith('/hooks/useAuth')) return { useAuth: () => ({ user: {} }) };
    if (name.endsWith('/utils/simuladorHierarchy')) return { canCrearSimulaciones: () => true, canVerSimulaciones: () => true };
    if (name.endsWith('/utils/creditoPrendarioHierarchy')) return { TIPO_CREDITO_LABELS: {}, TIPO_CUOTA_LABELS: {} };
    if (name.endsWith('/utils/format')) return { formatMonto: x => x, formatFecha: x => x };
    if (name.endsWith('/utils/dialog')) return { preventBackdropClose: x => x };
    return proxy;
  };
  const page = load(mobile ? 'src/screens/creditos/SimuladorCreditoScreen.tsx' : 'src/pages/SimuladorCreditoPage.tsx', mocks, {
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); },
  });
  const render = () => {
    si = ei = 0;
    const tree = mobile ? page.SimuladorCreditoScreen({}) : page.SimuladorCreditoPage();
    for (const effect of effects) if (effect.changed) { effect.changed = false; effect.cleanup = effect.fn(); }
    return tree;
  };
  const fire = tree => {
    const button = nodes(tree).find(n => text(n) === 'Nueva simulación' && n.props.onClick || n.props.icon === 'plus');
    (mobile ? button.props.onPress : button.props.onClick)();
  };
  const input = (tree, amount) => {
    const node = nodes(tree).find(n => n.props.label === 'Monto del préstamo');
    mobile ? node.props.onChangeText(amount) : node.props.onChange({ target: { value: amount } });
  };
  const saveButton = tree => nodes(tree).find(n => text(n) === 'Guardar simulación' && (n.props.onPress || n.props.type === 'submit'));
  const change = (tree, label, value) => {
    const node = nodes(tree).find(n => n.props.label === label);
    if (!node) throw Error('Missing field: ' + label);
    if (!mobile) node.props.onChange({ target: { value } });
    else if (node.props.onChangeText) node.props.onChangeText(value);
    else node.props.onChange(value);
  };
  return { render, fire, input, change, saveButton, pending, saved, timers };
}
const result = amount => ({ data: {
  numero_cuotas_calculadas: 1, monto_total_pagar: amount, total_interes: '10.00', saldo_residual: '0.00',
  cronograma: [{ numero_cuota: 1, fecha_vencimiento: '2026-11-21', monto_total: amount,
    monto_interes: '10.00', monto_capital: '100.00', saldo_pendiente: '0.00' }],
} });
test('simulates without client, displays the schedule and saves only on explicit action', async () => {
  const h = harness(); h.fire(h.render()); await flush();
  let tree = h.render(); h.input(tree, '100'); tree = h.render();
  assert.equal(h.saveButton(tree).props.disabled, true);
  for (const fn of h.timers.values()) fn(); h.timers.clear();
  assert.equal(h.pending.length, 1);
  assert.equal(h.pending[0].payload.numero_cuotas, 1);
  assert.equal(h.pending[0].payload.cliente_id, undefined);
  h.pending[0].resolve(result('110.00')); await flush(); tree = h.render();
  assert.match(text(tree), /Cronograma tentativo/);
  assert.match(text(tree), /2026-11-21/);
  assert.equal(h.saved.length, 0);
  assert.equal(h.saveButton(tree).props.disabled, false);
  if (mobile) await h.saveButton(tree).props.onPress();
  else await nodes(tree).find(n => n.props.onSubmit).props.onSubmit({ preventDefault() {} });
  assert.equal(h.saved.length, 1); assert.equal(h.saved[0].cliente_id, undefined);
});
test('ignores stale calculation responses and disables saving when parameters change', async () => {
  const h = harness(); h.fire(h.render()); await flush();
  h.input(h.render(), '100'); h.render();
  for (const fn of h.timers.values()) fn(); h.timers.clear();
  h.input(h.render(), '200'); let tree = h.render();
  assert.equal(h.saveButton(tree).props.disabled, true);
  for (const fn of h.timers.values()) fn(); h.timers.clear();
  h.pending[1].resolve(result('210.00')); await flush();
  h.pending[0].resolve(result('110.00')); await flush(); tree = h.render();
  assert.match(text(tree), /210\.00/); assert.doesNotMatch(text(tree), /110\.00/);
  h.input(tree, '300'); tree = h.render();
  assert.equal(h.saveButton(tree).props.disabled, true);
});
test('calculation and persistence use separate API endpoints', async () => {
  const calls = [];
  const api = load('src/api/simulacionesCredito.ts', name => {
    assert.equal(name, './client'); return { apiFetch: async (...args) => { calls.push(args); return { data: {} }; } };
  });
  const payload = { tipo_credito: 'diario', monto_prestamo: '100.10', tipo_cuota: 'diario', numero_cuotas: 10 };
  await api.calcularSimulacion(payload); await api.createSimulacion(payload);
  assert.equal(calls[0][0], '/simulaciones-credito/calcular'); assert.equal(calls[1][0], '/simulaciones-credito');
  assert.equal(JSON.parse(calls[0][1].body).monto_prestamo, '100.10');
});

test('fixed amount mode sends only the desired amount and saves the same parameters', async () => {
  const h = harness(); h.fire(h.render()); await flush();
  h.input(h.render(), '1000'); h.change(h.render(), 'Calcular por', 'importe_cuota');
  h.change(h.render(), 'Importe fijo de cuota', '300.25'); let tree = h.render();
  assert.equal(h.saveButton(tree).props.disabled, true);
  for (const fn of h.timers.values()) fn(); h.timers.clear();
  assert.equal(h.pending.length, 1);
  assert.equal(h.pending[0].payload.modo_calculo, 'importe_cuota');
  assert.equal(h.pending[0].payload.importe_cuota, '300.25');
  assert.equal(h.pending[0].payload.numero_cuotas, undefined);
  h.pending[0].resolve(result('1100.25')); await flush(); tree = h.render();
  assert.equal(h.saveButton(tree).props.disabled, false);
  if (mobile) await h.saveButton(tree).props.onPress();
  else await nodes(tree).find(n => n.props.onSubmit).props.onSubmit({ preventDefault() {} });
  assert.equal(h.saved[0].modo_calculo, 'importe_cuota');
  assert.equal(h.saved[0].importe_cuota, '300.25');
  assert.equal(h.saved[0].numero_cuotas, undefined);
});
test('insufficient payment errors prevent saving and switching modes clears stale results', async () => {
  const h = harness(); h.fire(h.render()); await flush();
  h.input(h.render(), '1000'); h.change(h.render(), 'Calcular por', 'importe_cuota');
  h.change(h.render(), 'Importe fijo de cuota', '1'); h.render();
  for (const fn of h.timers.values()) fn(); h.timers.clear();
  h.pending[0].reject(new Error('La cuota no cubre los intereses.')); await flush();
  let tree = h.render(); assert.equal(h.saveButton(tree).props.disabled, true);
  assert.ok(nodes(tree).some(n => n.props.error === 'La cuota no cubre los intereses.'));
  h.change(tree, 'Calcular por', 'numero_cuotas'); tree = h.render();
  assert.equal(h.saveButton(tree).props.disabled, true);
  for (const fn of h.timers.values()) fn(); h.timers.clear();
  assert.equal(h.pending[1].payload.modo_calculo, 'numero_cuotas');
  assert.equal(h.pending[1].payload.numero_cuotas, 1);
  assert.equal(h.pending[1].payload.importe_cuota, undefined);
});
