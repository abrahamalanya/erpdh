const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const mobile = fs.existsSync('src/screens/admin/QrGeneratorScreen.tsx');
const screenPath = mobile ? 'src/screens/admin/QrGeneratorScreen.tsx' : 'src/pages/QrGeneratorPage.tsx';
const componentName = mobile ? 'QrGeneratorScreen' : 'QrGeneratorPage';
const qr = { id: 41, url: 'https://example.com/pago?a=1&b=2#detalle', user_id: 7, generado_por: 'Ana Perez', created_at: '2026-10-19T20:00:00Z', imagen_png: 'data:image/png;base64,cG5n' };
const response = { success: true, data: qr };
const history = { success: true, data: { data: [qr], current_page: 1, last_page: 2, total: 16 } };

function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, URL, Error, require: name => {
    assert.ok(name in mocks, 'Unexpected import: ' + name);
    return mocks[name];
  }});
  return exports;
}

test('QR API separates creation from listing, repeated downloads and deletion', async () => {
  const calls = [];
  const binary = {};
  const api = load('src/api/qr.ts', { './client': {
    apiFetch: async (url, options) => { calls.push([url, options]); return response; },
    apiFetchBlob: async url => { calls.push([url]); return binary; },
    apiFetchFile: async (url, name) => { calls.push([url, name]); return binary; },
  }});
  assert.equal(await api.generarQr(qr.url), response);
  assert.equal(calls[0][0], '/qr');
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(JSON.parse(calls[0][1].body).url, qr.url);
  await api.listQr(2);
  assert.equal(calls[1][0], '/qr?page=2');
  const download = mobile ? api.getQrPng : api.descargarQr;
  assert.equal(await download(41), binary);
  assert.equal(await download(41), binary);
  assert.equal(calls[2][0], '/qr/41/png');
  assert.equal(calls[3][0], '/qr/41/png');
  if (mobile) assert.equal(calls[2][1], 'qr-41.png');
  await api.eliminarQr(41);
  assert.equal(calls[4][0], '/qr/41');
  assert.equal(calls[4][1].method, 'DELETE');
  assert.equal(calls.length, 5);
});

function harness(role = 'sistemas') {
  const state = [];
  const effects = [];
  const refs = [];
  const calls = [];
  let index = 0;
  let refIndex = 0;
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const api = {
    listQr: async page => { calls.push(['list', page]); return history; },
    generarQr: async url => { calls.push(['create', url]); return response; },
    eliminarQr: async id => { calls.push(['delete', id]); return { success: true, data: null }; },
    descargarQr: async id => { calls.push(['download', id]); return 'png-blob'; },
    getQrPng: async id => { calls.push(['download', id]); return { uri: `file:///cache/qr-${id}.png` }; },
  };
  const mocks = {
    react: {
      useState: initial => { const key = index++; if (!(key in state)) state[key] = initial; return [state[key], value => { state[key] = typeof value === 'function' ? value(state[key]) : value; }]; },
      useRef: initial => { const key = refIndex++; refs[key] ??= { current: initial }; return refs[key]; },
      useEffect: effect => effects.push(effect), useCallback: fn => fn,
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-router-dom': { Navigate: 'Navigate' },
    '@react-navigation/native': { useFocusEffect: effect => effects.push(effect) },
    '@mui/material': Object.fromEntries(['Box', 'Button', 'Dialog', 'DialogActions', 'DialogContent', 'Stack', 'TextField', 'Typography'].map(name => [name, name])),
    '@mui/icons-material/Download': { default: 'DownloadIcon' },
    'react-native': { FlatList: 'FlatList', Image: 'Image', Pressable: 'Pressable', View: 'View', StyleSheet: { create: x => x } },
    'react-native-paper': { ActivityIndicator: 'Loading', Button: 'Button', Text: 'Text', TextInput: 'TextInput', Card: Object.assign('Card', { Content: 'CardContent' }) },
  };
  const prefix = mobile ? '../../' : '../';
  mocks[prefix + 'api/qr'] = api;
  mocks[prefix + 'hooks/useAuth'] = { useAuth: () => ({ user: { roles: [{ name: role }] } }) };
  mocks[prefix + 'utils/roles'] = { hasRole: (user, ...roles) => user.roles.some(r => roles.includes(r.name)) };
  mocks[prefix + 'utils/format'] = { formatFechaHora: value => value };
  mocks[prefix + 'utils/download'] = { downloadBlob: (blob, name) => calls.push(['save', blob, name]) };
  mocks[prefix + 'utils/pdf'] = { compartirImagen: async file => calls.push(['save', file.uri]) };
  for (const name of ['ConfirmDialog', 'DataTable', 'DialogHeader', 'ErrorBanner', 'FullscreenImageViewer', 'Pagination']) mocks[prefix + 'components/' + name] = { [name]: name };
  const screen = load(screenPath, mocks)[componentName];
  return {
    calls, api,
    render: () => { index = 0; refIndex = 0; effects.length = 0; return screen(); },
    runEffects: async () => { for (const effect of [...effects]) effect(); await tick(); },
  };
}

const tick = () => new Promise(resolve => setImmediate(resolve));
function find(root, predicate) {
  if (!root || typeof root !== 'object') return undefined;
  if (Array.isArray(root)) return root.map(child => find(child, predicate)).find(Boolean);
  if (predicate(root)) return root;
  return find(root.props?.children, predicate) || find(root.props?.ListHeaderComponent, predicate);
}
const byType = (root, type) => find(root, node => node.type === type);
const button = (root, text) => find(root, node => node.type === 'Button' && node.props.children === text);
function row(root) {
  if (mobile) return byType(root, 'FlatList').props.renderItem({ item: qr });
  return byType(root, 'DataTable').props.columns.find(column => column.header === 'Acciones').render(qr);
}
function press(node) { return (node.props.onPress || node.props.onClick)(); }

test('both permitted roles can list and preview saved QR images', async () => {
  for (const role of ['sistemas', 'administrador_general']) {
    const h = harness(role);
    h.render();
    await h.runEffects();
    let root = h.render();
    assert.equal(h.calls[0][0], 'list');
    const list = byType(root, mobile ? 'FlatList' : 'DataTable');
    assert.equal((mobile ? list.props.data : list.props.rows)[0].url, qr.url);
    press(button(row(root), 'Ver'));
    root = h.render();
    if (mobile) assert.equal(byType(root, 'FullscreenImageViewer').props.uri, qr.imagen_png);
    else assert.equal(byType(root, 'Dialog').props.open, true);
    assert.equal(h.calls.length, 1);
  }
});

test('other roles do not render the module or request its history', async () => {
  const h = harness('asesor');
  const root = h.render();
  await h.runEffects();
  assert.equal(byType(root, mobile ? 'FlatList' : 'DataTable'), undefined);
  assert.equal(h.calls.length, 0);
});

test('deletion requires confirmation and cancellation never sends DELETE', async () => {
  const h = harness();
  let root = h.render();
  press(button(row(root), 'Eliminar'));
  assert.equal(h.calls.length, 0);
  root = h.render();
  let confirm = byType(root, 'ConfirmDialog');
  assert.equal(mobile ? confirm.props.visible : confirm.props.open, true);
  assert.match(confirm.props.message, /imágenes ya descargadas seguirán funcionando/);
  confirm.props.onCancel();
  root = h.render();
  assert.equal(mobile ? byType(root, 'ConfirmDialog').props.visible : byType(root, 'ConfirmDialog').props.open, false);
  assert.equal(h.calls.length, 0);
  press(button(row(root), 'Eliminar'));
  root = h.render();
  confirm = byType(root, 'ConfirmDialog');
  confirm.props.onConfirm();
  confirm.props.onConfirm();
  await tick();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0], 'delete');
  assert.equal(h.calls[0][1], 41);
});

test('failed deletion stays open with the backend error', async () => {
  const h = harness();
  h.api.eliminarQr = async () => { throw new Error('Sin permiso'); };
  let root = h.render();
  press(button(row(root), 'Eliminar'));
  root = h.render();
  byType(root, 'ConfirmDialog').props.onConfirm();
  await tick();
  const confirm = byType(h.render(), 'ConfirmDialog');
  assert.equal(mobile ? confirm.props.visible : confirm.props.open, true);
  assert.equal(confirm.props.error, 'Sin permiso');
});

test('generation persists once and repeated PNG downloads do not create more records', async () => {
  const h = harness();
  let root = h.render();
  if (mobile) byType(root, 'TextInput').props.onChangeText(qr.url);
  else byType(root, 'TextField').props.onChange({ target: { value: qr.url } });
  root = h.render();
  if (mobile) press(button(root, 'Generar y guardar'));
  else byType(root, 'Box').props.onSubmit({ preventDefault() {} });
  await tick();
  assert.equal(h.calls[0][0], 'create');
  assert.equal(h.calls[0][1], qr.url);
  root = h.render();
  const download = button(row(root), mobile ? 'Descargar PNG' : 'PNG');
  press(download);
  await tick();
  press(button(row(h.render()), mobile ? 'Descargar PNG' : 'PNG'));
  await tick();
  assert.equal(h.calls.filter(call => call[0] === 'create').length, 1);
  assert.equal(h.calls.filter(call => call[0] === 'download').length, 2);
  assert.equal(h.calls.filter(call => call[0] === 'save').length, 2);
});

test('invalid URL schemes do not create records and generation errors are visible', async () => {
  const h = harness();
  let root = h.render();
  const enter = value => {
    if (mobile) byType(root, 'TextInput').props.onChangeText(value);
    else byType(root, 'TextField').props.onChange({ target: { value } });
    root = h.render();
  };
  const submit = () => mobile ? press(button(root, 'Generar y guardar')) : byType(root, 'Box').props.onSubmit({ preventDefault() {} });
  enter('javascript:alert(1)');
  submit();
  await tick();
  assert.equal(h.calls.length, 0);
  assert.match(byType(h.render(), 'ErrorBanner').props.error, /URL válida/);
  enter(qr.url);
  h.api.generarQr = async () => { throw new Error('Servidor no disponible'); };
  submit();
  await tick();
  assert.equal(byType(h.render(), 'ErrorBanner').props.error, 'Servidor no disponible');
});

test('changing pages requests the next page without creating records', async () => {
  const h = harness();
  let root = h.render();
  if (mobile) byType(root, 'FlatList').props.ListFooterComponent.props.onPageChange(2);
  else byType(root, 'DataTable').props.onPageChange(2);
  h.render();
  await h.runEffects();
  assert.equal(h.calls[0][0], 'list');
  assert.equal(h.calls[0][1], 2);
});
