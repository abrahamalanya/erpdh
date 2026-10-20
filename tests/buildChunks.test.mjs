import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'vite';

test('production defers maps and charts and keeps every JS chunk below 500 kB', async () => {
  const result = await build({ logLevel: 'silent', build: { write: false } });
  const chunks = result.output.filter(item => item.type === 'chunk');
  const byName = new Map(chunks.map(chunk => [chunk.fileName, chunk]));
  const initial = new Set();
  function visit(chunk) {
    if (!chunk || initial.has(chunk)) return;
    initial.add(chunk);
    chunk.imports.forEach(name => visit(byName.get(name)));
  }
  chunks.filter(chunk => chunk.isEntry).forEach(visit);
  assert.ok(initial.size > 0);

  for (const dependency of ['/leaflet/', '/react-leaflet/', '/@mui/x-charts/']) {
    const owners = chunks.filter(chunk => Object.keys(chunk.modules).some(id => id.replaceAll('\\', '/').includes(dependency)));
    assert.ok(owners.length > 0, `${dependency} remains available in the production build`);
    assert.ok(owners.every(chunk => !initial.has(chunk)), `${dependency} must not load before a panel needs it`);
  }
  for (const chunk of chunks) {
    assert.ok(Buffer.byteLength(chunk.code) < 500_000, `${chunk.fileName} exceeds the production JS chunk budget`);
  }
});
