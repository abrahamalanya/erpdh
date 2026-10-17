const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, JSON, require: name => {
    if (!(name in imports)) throw new Error('Unexpected import: ' + name);
    return imports[name];
  }});
  return exports;
}

test('catalog requests preserve technical identity and send revisions for edits and deletion', async () => {
  const requests = [];
  const api = load('src/api/moduloCatalogo.ts', { './client': { apiFetch: async (url, options) => {
    requests.push({url, ...options});
    return {data:null};
  }}});
  await api.listModulosCatalogo();
  await api.getModulo(9);
  await api.createModulo({key:'inventario',nombre:'Inventario',grupo:'ventas'});
  await api.updateModulo(9,{nombre:'Stock',grupo:'almacen',revision:'revision-vigente'});
  await api.deleteModulo(9,'revision-vigente');
  assert.equal(requests[0].url,'/modulos');
  assert.equal(requests[1].url,'/modulos/9');
  assert.equal(requests[2].method,'POST');
  assert.equal(JSON.parse(requests[2].body).key,'inventario');
  assert.equal(requests[3].method,'PUT');
  assert.equal('key' in JSON.parse(requests[3].body),false);
  assert.equal(JSON.parse(requests[3].body).revision,'revision-vigente');
  assert.equal(requests[4].method,'DELETE');
  assert.equal(JSON.parse(requests[4].body).revision,'revision-vigente');
});

test('only sistemas can open module administration, even with a module key or multiple roles', () => {
  const policy = load('src/utils/perfilAcceso.ts');
  const user = roles => ({id:7,roles:roles.map(name=>({name})),perfil_acceso_id:null,modulos_efectivos:['modulos']});
  const allowed = u => policy.perfilPermiteRuta(u, '/modulos');
  assert.equal(allowed(user(['sistemas'])),true);
  assert.equal(allowed(user(['administrador_general'])),false);
  assert.equal(allowed(user(['asesor','supervisor'])),false);
  assert.equal(allowed(null),false);
});
