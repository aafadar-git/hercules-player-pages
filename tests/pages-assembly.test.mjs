import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { assembleSynthetic, inventory, validatePolicy } from '../scripts/assemble-pages.mjs';

const policy = JSON.parse(await readFile(new URL('../scripts/pages-policy.json', import.meta.url)));
const workflow = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), 'pages-synthetic-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('only the reviewed synthetic policy is accepted', () => {
  const bytes = validatePolicy(policy);
  assert.equal(bytes.length, policy.fixture.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), policy.fixture.sha256);
  for (const change of [p => p.mode = 'real-assets', p => p.projectPath = '/',
    p => p.fixture.name = 'hercules.pbp', p => p.fixture.hex += '00', p => p.fixture.sha256 = 'a'.repeat(64)]) {
    const changed = structuredClone(policy); change(changed);
    assert.throws(() => validatePolicy(changed), /policy mismatch/);
  }
});

test('fresh isolated output contains exactly synthetic files and preserves unrelated inputs', async t => {
  const root = await temporary(t), target = join(root, 'site');
  await writeFile(join(root, 'unrelated.txt'), 'DO NOT COPY');
  await assembleSynthetic(target, policy);
  assert.deepEqual((await readdir(target)).sort(), ['app.js', 'assets', 'index.html', 'message.js']);
  assert.deepEqual(await readdir(join(target, 'assets')), ['sentinel.bin']);
  assert.equal(await readFile(join(root, 'unrelated.txt'), 'utf8'), 'DO NOT COPY');
  assert.deepEqual(await readFile(join(target, 'assets/sentinel.bin')), validatePolicy(policy));
  await assert.rejects(assembleSynthetic(target, policy), /existing output/);
  const link = join(root, 'symlink'); await symlink(target, link);
  await assert.rejects(assembleSynthetic(link, policy), /existing output/);
  await assert.rejects(assembleSynthetic('relative', policy), /absolute/);
});

test('module and asset URLs retain the intended project prefix', async t => {
  const target = join(await temporary(t), 'site'); await assembleSynthetic(target, policy);
  const page = new URL('https://example.invalid' + policy.projectPath);
  assert.equal(new URL('app.js', page).pathname, policy.projectPath + 'app.js');
  assert.equal(new URL('./message.js', new URL('app.js', page)).pathname, policy.projectPath + 'message.js');
  assert.equal(new URL('assets/sentinel.bin', new URL('app.js', page)).pathname, policy.projectPath + 'assets/sentinel.bin');
  assert.match(await readFile(join(target, 'index.html'), 'utf8'), /src="app.js"/);
  assert.match(await readFile(join(target, 'app.js'), 'utf8'), /new URL\('assets\/sentinel.bin', import.meta.url\)/);
});

test('workflow is manual-only, pinned, explicitly gated and needs no asset secrets', () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert(!/^  (push|pull_request|schedule):/m.test(workflow));
  assert(!/secrets\.|hercules-private-assets|game-test|NETLIFY|continue-on-error|\bretry\b/.test(workflow));
  assert.match(workflow, /github.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /inputs.publication == 'synthetic' && inputs.confirm_synthetic_publication && !inputs.confirm_interface_publication/);
  assert.match(workflow, /inputs.publication == 'interface-only' && inputs.confirm_interface_publication && !inputs.confirm_synthetic_publication/);
  assert.match(workflow, /retention-days: 1/);
  assert.match(workflow, /pages: write\n      id-token: write/);
  assert([...workflow.matchAll(/uses: (\S+)/g)].every(match => /@[a-f0-9]{40}$/.test(match[1])));
  assert.equal((workflow.match(/actions\/deploy-pages@/g) || []).length, 1);
  assert.equal((workflow.match(/actions\/upload-pages-artifact@/g) || []).length, 1);
  assert.equal(inventory.length, 4);
});

test('HTTP loading beneath the project path returns exact bytes and usable modules', async t => {
  const root = await temporary(t), target = join(root, 'site'); await assembleSynthetic(target, policy);
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const relative = path.startsWith(policy.projectPath) ? path.slice(policy.projectPath.length) || 'index.html' : '';
    if (!inventory.includes(relative)) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'Content-Type': relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    response.end(await readFile(join(target, relative)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const name of inventory) {
    const response = await fetch(origin + policy.projectPath + name);
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(join(target, name)));
    if (name.endsWith('.js')) assert.equal(response.headers.get('content-type'), 'text/javascript');
  }
  const wrongRoot = await fetch(origin + '/assets/sentinel.bin');
  assert.equal(wrongRoot.status, 404); await wrongRoot.text();
});
