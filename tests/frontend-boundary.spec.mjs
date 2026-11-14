import { test, expect } from '../backend/node_modules/@playwright/test/index.mjs';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

// Actual HTTP/browser transport: no page.route mocks and no database.
// Only routes that complete validation before database access are exercised.
let server;
test.beforeAll(async () => {
  server = spawn(process.execPath, ['scripts/serve-boundary-test.mjs'], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test' },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Real Fastify boundary server did not start. ' + output)), 45000);
    server.on('error', error => { clearTimeout(timeout); reject(error); });
    server.on('exit', code => { clearTimeout(timeout); reject(new Error(`Boundary server exited ${code}: ${output}`)); });
    server.stderr.on('data', chunk => { output += chunk; });
    server.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('BOUNDARY_READY')) { clearTimeout(timeout); resolve(); }
    });
  });
});
test.afterAll(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve => server.once('exit', resolve)),
    new Promise(resolve => { const timeout = setTimeout(resolve, 5000); timeout.unref(); }),
  ]);
  if (server.exitCode === null) server.kill('SIGKILL');
});

test('CORS, cookie HttpOnly e CSRF entre navegador e Fastify reais — sem banco', async ({ page, context }) => {
  await page.goto('/assets/css/tokens.css');
  const result = await page.evaluate(async () => {
    const csrf = await fetch('http://127.0.0.1:3101/api/auth/csrf', { credentials: 'include' });
    const { csrfToken } = await csrf.json();
    const validTransport = await fetch('http://127.0.0.1:3101/api/auth/register', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({}),
    });
    const rejected = await fetch('http://127.0.0.1:3101/api/auth/register', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    return { csrfStatus: csrf.status, validTransportStatus: validTransport.status,
      validTransportError: (await validTransport.json()).error,
      missingCsrfStatus: rejected.status, missingCsrfError: (await rejected.json()).error };
  });
  expect(result).toEqual({ csrfStatus: 200, validTransportStatus: 400, validTransportError: 'VALIDATION', missingCsrfStatus: 403, missingCsrfError: 'CSRF' });
  const cookies = await context.cookies('http://127.0.0.1:3101/api');
  const csrfCookie = cookies.find(cookie => cookie.name === 'raquel_csrf');
  expect(csrfCookie).toMatchObject({ httpOnly: true, secure: false, sameSite: 'Lax', path: '/api' });
  expect(cookies.some(cookie => cookie.name === 'raquel_session')).toBe(false);
  // Check the real preflight response for an unlisted origin as well.
  const deniedOrigin = await context.request.fetch('http://127.0.0.1:3101/api/auth/register', {
    method: 'OPTIONS', headers: { Origin: 'https://unlisted.example.test', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-csrf-token' },
  });
  expect(deniedOrigin.headers()['access-control-allow-origin']).toBeUndefined();
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/real-http-boundary.json', JSON.stringify({
    scope: 'Real browser + real Fastify HTTP, no database and no API mocks',
    ...result, cookieHttpOnly: csrfCookie.httpOnly, sameSite: csrfCookie.sameSite,
    unlistedOriginAllowed: false, databaseValidated: false,
  }, null, 2));
});
