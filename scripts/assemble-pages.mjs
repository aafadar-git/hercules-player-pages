import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fixtureHex = '53594e5448455449432050414745532046495854555245204f4e4c590a00010203';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };
export const inventory = ['app.js', 'assets/sentinel.bin', 'index.html', 'message.js'];

export function validatePolicy(policy) {
  const bytes = Buffer.from(fixtureHex, 'hex');
  if (policy.format !== 'hercules-pages-synthetic' || policy.version !== 1 ||
      policy.mode !== 'synthetic-only' || policy.repositoryName !== 'hercules-player-pages' ||
      policy.projectPath !== '/hercules-player-pages/' || policy.fixture.name !== 'sentinel.bin' ||
      policy.fixture.hex !== fixtureHex || policy.fixture.bytes !== bytes.length ||
      policy.fixture.sha256 !== digest(bytes)) fail('Reviewed synthetic policy mismatch');
  return bytes;
}

export async function assembleSynthetic(target, policy) {
  const bytes = validatePolicy(policy);
  if (!isAbsolute(target)) fail('Assembly target must be absolute');
  try { await lstat(target); fail('Refusing an existing output directory'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(target);
  try {
    await mkdir(join(target, 'assets'));
    await writeFile(join(target, 'index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Synthetic Pages loading test</title>
</head>
<body>
  <h1>Synthetic Pages loading test</h1>
  <p>No game, BIOS or emulator is included.</p>
  <p id="result" data-result="pending">Loading synthetic asset…</p>
  <script type="module" src="app.js"></script>
</body>
</html>
`);
    await writeFile(join(target, 'message.js'), 'export const label = "Synthetic asset verified";\n');
    await writeFile(join(target, 'app.js'), `import { label } from './message.js';
const result = document.querySelector('#result');
try {
  const response = await fetch(new URL('assets/sentinel.bin', import.meta.url));
  if (!response.ok) throw new Error('Asset returned HTTP ' + response.status);
  const bytes = await response.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map(value => value.toString(16).padStart(2, '0')).join('');
  if (bytes.byteLength !== ${bytes.length} || hash !== '${digest(bytes)}')
    throw new Error('Synthetic size/hash mismatch');
  result.dataset.result = 'passed';
  result.textContent = label + ': ' + bytes.byteLength + ' bytes';
} catch (error) {
  result.dataset.result = 'failed';
  result.textContent = 'Synthetic loading failed: ' + error.message;
}
`);
    await writeFile(join(target, 'assets/sentinel.bin'), bytes);
    const files = [...await readdir(target)].filter(name => name !== 'assets');
    files.push(...(await readdir(join(target, 'assets'))).map(name => `assets/${name}`));
    if (JSON.stringify(files.sort()) !== JSON.stringify(inventory)) fail('Unexpected output inventory');
    if (digest(await readFile(join(target, 'assets/sentinel.bin'))) !== policy.fixture.sha256)
      fail('Synthetic output hash mismatch');
  } catch (error) {
    await rm(target, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const policy = JSON.parse(await readFile(new URL('./pages-policy.json', import.meta.url)));
  if (process.argv.length !== 3) fail('Usage: node scripts/assemble-pages.mjs /absolute/new/output');
  await assembleSynthetic(resolve(process.argv[2]), policy);
  console.log('Assembled only the synthetic page, modules and verified fixture.');
}
