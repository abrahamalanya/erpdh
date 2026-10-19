const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code=ts.transpileModule(fs.readFileSync('src/utils/perfilAcceso.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exportsPolicy={};vm.runInNewContext(code,{exports:exportsPolicy});
const user=(id,mods=[],roles=['asesor'])=>({id:7,perfil_acceso_id:id,modulos_efectivos:mods,roles:roles.map(name=>({name}))});

test('legacy routes preserve existing access while profiles restrict direct routes',()=>{
 assert.equal(exportsPolicy.perfilPermiteRuta(user(null),'/ventas'),true);
 assert.equal(exportsPolicy.perfilPermiteRuta(user(2,['diario']),'/ventas'),false);
 assert.equal(exportsPolicy.perfilPermiteRuta(user(2,['diario']),'/creditos-prendarios/diarios'),true);
 assert.equal(exportsPolicy.perfilPermiteRuta(user(2,['diario']),'/creditos-prendarios/prendarios'),false);
 assert.equal(exportsPolicy.perfilPermiteRuta(user(2,[]),'/'),true);
 assert.equal(exportsPolicy.perfilPermiteRuta(user(2,[]),'/roles'),false);
 assert.equal(exportsPolicy.perfilPermiteRuta(user(2,[],['sistemas']),'/roles'),true);
 assert.equal(exportsPolicy.perfilPermiteRuta(user(2,[]),'/qr'),false);
 assert.equal(exportsPolicy.perfilPermiteRuta(user(2,[],['sistemas']),'/qr'),true);
 assert.equal(exportsPolicy.perfilPermiteRuta(user(2,[],['administrador_general']),'/qr'),true);
 assert.equal(exportsPolicy.perfilPermiteRuta(user(2,[],['administrador_agencia']),'/qr'),false);
});
test('all declared web routes have a profile policy',()=>{
 const app=fs.readFileSync('src/App.tsx','utf8');
 const keys=fs.readFileSync('src/utils/perfilAcceso.ts','utf8').match(/: \"([^\"]+)\"/g)||[];
 const modules=keys.map(k=>k.match(/\"([^\"]+)\"/)[1]);
 for(const [,route] of app.matchAll(/<Route path="([^"*:]+)"/g)) {
  if(['/login','/tienda','/roles','/configuracion-sistema','/bancos','/perfiles-acceso','/modulos','/qr'].includes(route))continue;
  assert.equal(exportsPolicy.perfilPermiteRuta(user(1,modules),route),true,route);
 }
});
