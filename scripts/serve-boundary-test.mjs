// Real Fastify transport for CORS/cookie/CSRF browser tests only.
// No database client or fake successful account operation is provided.
import { buildApp } from '../backend/dist/src/app.js';

const app = await buildApp({}, {
  origins: ['http://127.0.0.1:8000'],
  frontendUrl: 'http://127.0.0.1:8000',
  production: false,
  secret: 'boundary-test-only-public-secret-no-production-use',
});
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  await app.close();
  process.exit(0);
}
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
await app.listen({ port: 3101, host: '127.0.0.1' });
process.stdout.write('BOUNDARY_READY\n');
