import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const inventory = ['index.html', 'style.css'];
export const expected = Object.freeze({"index.html": "8a6be9f59373b49dc12a24fc05714cfd47c604d25d67e044f5117e6c9ce6963c", "style.css": "ee90722ed100810f323a14c7c9d3808f5ccb1e7ac7a082c0aaca455a58c75eac"});
const digest = data => createHash('sha256').update(data).digest('hex');
export async function assembleInterface(target) {
  if (!isAbsolute(target)) throw new Error('Assembly target must be absolute');
  try { await lstat(target); throw new Error('Refusing an existing output directory'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const inputs = await Promise.all(inventory.map(async name => {
    const source = new URL('../public/' + name, import.meta.url);
    if (!(await lstat(source)).isFile()) throw new Error('Unexpected source type');
    const bytes = await readFile(source);
    if (digest(bytes) !== expected[name]) throw new Error('Reviewed interface source mismatch');
    return [name, bytes];
  }));
  await mkdir(target);
  try {
    for (const [name, bytes] of inputs) await writeFile(join(target, name), bytes);
  } catch (error) {
    await rm(target, { recursive: true, force: true });
    throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3) throw new Error('Expected one fresh absolute output directory');
  await assembleInterface(process.argv[2]);
  console.log('Assembled reviewed interface HTML/CSS only; no runtime or assets.');
}
