const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Follow the existing tests' isolated-module approach; native/browser layout is
// left to device/browser verification, while event handling is exercised here.
function loadBanner() {
  let state = [];
  let index = 0;
  const ref = { current: null };
  const body = {};
  const jsx = (type, props, key) => ({ type, props, key });
  const paper = { Portal: 'Portal', Snackbar: 'Snackbar', Alert: 'Alert', Text: 'Text', useTheme: () => ({ colors: { errorContainer: 'error-bg', onErrorContainer: 'error-text' } }) };
  const imports = {
    react: {
      useState: initial => {
        const slot = index++;
        if (!(slot in state)) state[slot] = initial;
        return [state[slot], next => { state[slot] = next; }];
      },
      useRef: () => ref,
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    '@mui/material': paper,
    'react-native-paper': paper,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24 }) },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/components/ErrorBanner.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, document: { body }, require: name => {
    assert.ok(name in imports, 'Unexpected import: ' + name);
    return imports[name];
  }});
  const banner = exports.ErrorBanner;
  return {
    banner, ref, body,
    mount: props => {
      const element = banner(props);
      assert.ok(element);
      state = [];
      return () => { index = 0; return element.type(element.props); };
    },
  };
}

test('empty errors render nothing; changed messages receive independent state', () => {
  const { banner } = loadBanner();
  assert.equal(banner({ error: null }), null);
  assert.equal(banner({ error: '' }), null);
  assert.notEqual(banner({ error: 'A' }).key, banner({ error: 'B' }).key);
});

test('errors persist when clicking the form and close explicitly or with Escape', () => {
  const { mount } = loadBanner();
  const render = mount({ error: 'No se pudo guardar' });
  const snackbar = () => render().props.children[1].props.children;
  assert.equal(snackbar().props.open, true);
  snackbar().props.onClose({}, 'clickaway');
  assert.equal(snackbar().props.open, true);
  snackbar().props.onClose({}, 'escapeKeyDown');
  assert.equal(snackbar().props.open, false);
  const fresh = mount({ error: 'No se pudo guardar' });
  fresh().props.children[1].props.children.props.children.props.onClose();
  assert.equal(fresh().props.children[1].props.children.props.open, false);
});

test('the portal escapes scrollable content while staying in the active dialog', () => {
  const { mount, ref, body } = loadBanner();
  const render = mount({ error: 'Error' });
  const portal = render().props.children[1];
  assert.equal(portal.props.container(), body);
  const dialog = {};
  ref.current = { closest: selector => { assert.equal(selector, '.MuiDialog-container'); return dialog; } };
  assert.equal(portal.props.container(), dialog);
});

test('retry actions and multiline error text are preserved', () => {
  const { mount } = loadBanner();
  const action = { type: 'retry' };
  const error = 'Campo requerido\nNo se pudo guardar';
  const alert = mount({ error, action })().props.children[1].props.children.props.children;
  assert.equal(alert.props.children, error);
  assert.equal(alert.props.action, action);
  assert.equal(alert.props.severity, 'error');
  assert.equal(alert.props.closeText, 'Cerrar error');
});
