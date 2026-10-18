import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { assembleInterface, expected, inventory } from '../scripts/assemble-interface.mjs';
async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), 'pages-interface-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
test('isolated assembly contains only hash-pinned real interface HTML/CSS', async t => {
  const root = await temporary(t), target = join(root, 'site');
  await writeFile(join(root, 'unrelated.bin'), 'not for publication');
  await assembleInterface(target);
  assert.deepEqual((await readdir(target)).sort(), inventory);
  for (const name of inventory) assert.equal(createHash('sha256').update(await readFile(join(target,name))).digest('hex'),expected[name]);
  await assert.rejects(assembleInterface(target), /existing output/);
  await symlink(target, join(root,'link'));
  await assert.rejects(assembleInterface(join(root,'link')), /existing output/);
  await assert.rejects(assembleInterface('relative'), /absolute/);
});
test('published UI explicitly disables gameplay and has no execution or asset loading', async t => {
  const target=join(await temporary(t),'site'); await assembleInterface(target);
  const html=await readFile(join(target,'index.html'),'utf8');
  assert.match(html,/Gameplay is not enabled yet/);
  assert.match(html,/<button id="play"[^>]* disabled[^>]*>Play Hercules — unavailable/);
  for (const id of ['fullscreen','window','reset']) assert.match(html,new RegExp('<button id="'+id+'"[^>]* disabled'));
  assert(!/<script\b|<iframe\b|<canvas\b|<img\b|<audio\b|<video\b|\son\w+=/i.test(html));
  assert.match(html,/script-src 'none'/); assert.match(html,/connect-src 'none'/);assert.match(html,/worker-src 'none'/);
  assert(!/\b(?:src|href)=["'][^"']*(?:\.pbp|\.bin|\.wasm|\.data|loader|https?:)/i.test(html));
  assert(!/@import|url\(/i.test(await readFile(join(target,'style.css'),'utf8')));
  assert.match(html,/<details id="reload-evidence"><summary>Startup diagnostics \/ availability<\/summary>/);
});
test('relative stylesheet resolves under project-site path, including canonical redirect target', async () => {
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  assert.match(html,/href="style.css"/);
  assert.equal(new URL('style.css','https://aafadar-git.github.io/hercules-player-pages/').pathname,'/hercules-player-pages/style.css');
});
