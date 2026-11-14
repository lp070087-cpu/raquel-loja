import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
let checks = 0;
let failures = 0;
for (const file of await readdir(path.join(root, 'assets/js'))) {
  if (!file.endsWith('.js')) continue;
  const result = spawnSync(process.execPath, ['--check', path.join(root, 'assets/js', file)], { encoding: 'utf8' });
  checks++;
  if (result.status) { failures++; console.error(file, result.stderr); }
}
for (const dir of ['', 'admin']) {
  for (const file of await readdir(path.join(root, dir))) {
    if (!file.endsWith('.html')) continue;
    const content = await readFile(path.join(root, dir, file), 'utf8');
    for (const match of content.matchAll(/<script\b[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)) {
      const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: match[1], encoding: 'utf8' });
      checks++;
      if (result.status) { failures++; console.error(file, result.stderr); }
    }
  }
}
console.log(`${checks} verificações de sintaxe; ${failures} falhas. Não substitui testes de navegador.`);
process.exitCode = failures ? 1 : 0;
