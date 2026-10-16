import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64');
const clientUrl = moduleUrl(readFileSync(new URL('../src/api/client.ts', import.meta.url), 'utf8').replace('import.meta.env.VITE_API_URL', JSON.stringify('/api')));
const api = await import(moduleUrl(readFileSync(new URL('../src/api/billetajes.ts', import.meta.url), 'utf8').replace("'./client'", JSON.stringify(clientUrl))));
globalThis.localStorage = { getItem: () => 'test-token' };

test('billetaje request contract and backend validation messages', async () => {
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return { ok: true, json: async () => ({ data: { id: 9 } }) };
  };
  try {
    await api.enviarBilletaje({ asesor_id: 7, monto: '100.50', motivo: 'Capital', medio_egreso: 'efectivo' });
    let request = requests.at(-1);
    assert.equal(request.url, '/api/billetajes');
    assert.equal(request.method, 'POST');
    assert.deepEqual(Object.fromEntries(request.body), { asesor_id: '7', monto: '100.50', motivo: 'Capital', medio_egreso: 'efectivo' });
    assert.equal(request.headers['Content-Type'], undefined);
    const comprobante = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });
    await api.enviarBilletaje({ asesor_id: 7, monto: '20', motivo: 'Banco', medio_egreso: 'cuenta_bancaria', canal_egreso: 'transferencia', cuenta_bancaria_id: 4, comprobante });
    request = requests.at(-1);
    assert.equal(request.body.get('canal_egreso'), 'transferencia');
    assert.equal(request.body.get('cuenta_bancaria_id'), '4');
    assert.equal(request.body.get('comprobante').name, 'receipt.pdf');
    await api.aceptarBilletaje(9);
    assert.equal(requests.at(-1).url, '/api/billetajes/9/aceptar');
    assert.equal(requests.at(-1).body, undefined);
    await api.rechazarBilletaje(9, 'Monto incorrecto');
    assert.deepEqual(JSON.parse(requests.at(-1).body), { motivo: 'Monto incorrecto' });
    await api.listBilletajes(2);
    assert.equal(requests.at(-1).url, '/api/billetajes?page=2');
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ message: 'Datos invalidos', errors: { asesor_id: ['Caja cerrada'], comprobante: ['Archivo requerido'] } }) });
    await assert.rejects(api.enviarBilletaje({}), error => error.message.includes('Caja cerrada') && error.message.includes('Archivo requerido'));
  } finally { globalThis.fetch = originalFetch; }
});
