import { test } from 'node:test';
import assert from 'node:assert/strict';

// Run against the actual local frontend server; no mocked HTTP responses.
const base = process.env.FRONTEND_TEST_URL || 'http://127.0.0.1:8000';
test('servidor entrega páginas e módulos com tipo correto', async () => {
  for (const [file, mime] of [['conta.html', 'text/html'], ['catalogo.html', 'text/html'], ['assets/js/api.js', 'text/javascript'], ['assets/css/conta.css', 'text/css']]) {
    const response = await fetch(`${base}/${file}`);
    assert.equal(response.status, 200, file);
    assert.ok(response.headers.get('content-type')?.startsWith(mime), file);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
});
test('servidor não expõe backend, ambiente, Git ou ferramentas', async () => {
  for (const file of ['backend/.env', 'backend/src/app.ts', '.git/config', '%2egit/config', 'scripts/serve-frontend.mjs', 'package.json', 'tests/commerce.test.mjs']) {
    const response = await fetch(`${base}/${file}`);
    assert.equal(response.status, 404, file);
    assert.ok(!(await response.text()).includes('DATABASE_URL='), file);
  }
});
