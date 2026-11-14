import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function bridge(handler) {
  globalThis.window = new EventTarget();
  globalThis.CustomEvent = class extends Event { constructor(type, options) { super(type); this.detail = options?.detail; } };
  globalThis.__commerceApi = handler;
  const source = (await readFile(new URL('../assets/js/comercio-api.js', import.meta.url), 'utf8'))
    .replace("import { api } from './api.js';", 'const api = globalThis.__commerceApi;');
  return import('data:text/javascript;base64,' + Buffer.from(source + `\n// ${Math.random()}`).toString('base64'));
}

test('authenticated commerce hydrates server cart and favorites and confirms anonymous merge', async () => {
  let merged = false;
  const calls = [];
  const module = await bridge(async (path, options) => {
    calls.push({ path, options });
    if (path === '/auth/me') return { user: { id: 'u' } };
    if (path === '/cart/merge') return {};
    if (path === '/cart') return { items: [{ productId: 'p1', quantity: 3 }] };
    if (path === '/favorites') return { products: [{ id: 'p2' }] };
    return {};
  });
  await module.sincronizarConta([{ id: 'p1', qtd: 2 }], ['p2'], { carrinho: () => { merged = true; } });
  assert.equal(merged, true);
  assert.deepEqual(calls.find(c => c.path === '/cart/merge').options.body.items, [{ productId: 'p1', quantity: 2 }]);
  assert.deepEqual(module.comercio.itens(), [{ id: 'p1', qtd: 3 }]);
  assert.deepEqual(module.comercio.favoritos(), ['p2']);
  module.esquecerConta();
  assert.equal(module.comercio.autenticado(), false);
  assert.deepEqual(module.comercio.itens(), []);
});

test('failed cart synchronization restores server state and blocks checkout until a successful retry', async () => {
  const module = await bridge(async path => path === '/cart' ? { items: [{ productId: 'p1', quantity: 1 }] } : path === '/favorites' ? { products: [] } : {});
  await assert.rejects(module.comercio.enfileirar(async () => { throw new Error('Estoque insuficiente'); }), /Estoque/);
  await assert.rejects(module.aguardarSincronizacao(), /Estoque/);
  assert.deepEqual(module.comercio.itens(), [{ id: 'p1', qtd: 1 }]);
  await module.comercio.enfileirar(async () => ({}));
  await module.aguardarSincronizacao();
});

test('expired session never leaves authenticated customer data in memory', async () => {
  const module = await bridge(async path => path === '/cart' ? { items: [{ productId: 'p1', quantity: 1 }] } : path === '/favorites' ? { products: [{ id: 'p1' }] } : {});
  await module.sincronizarConta();
  window.dispatchEvent(new Event('raquel:session-expired'));
  assert.equal(module.comercio.autenticado(), false);
  assert.deepEqual(module.comercio.itens(), []);
  assert.deepEqual(module.comercio.favoritos(), []);
});

test('successful cart merge is acknowledged even if a subsequent favorite import fails', async () => {
  let confirmed = false;
  const module = await bridge(async path => {
    if (path.startsWith('/favorites/')) throw new Error('Falha temporária');
    return {};
  });
  await assert.rejects(module.sincronizarConta([{ id: 'p1', qtd: 2 }], ['p2'], { carrinho: () => { confirmed = true; } }), /Falha temporária/);
  assert.equal(confirmed, true, 'anonymous cart must be cleared before retrying favorite synchronization');
});

test('checkout waits for all cart writes and submits only server checkout fields', async () => {
  const calls = [];
  const module = await bridge(async (path, options) => {
    calls.push({ path, options });
    return { order: { id: 'order-1', totalCents: 1500 } };
  });
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  module.comercio.enfileirar(() => pending);
  const body = { fulfillmentType: 'PICKUP', paymentMethod: 'CASH', idempotencyKey: 'fixed-key' };
  const checkout = module.criarPedido(body);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(calls.length, 0);
  release();
  const result = await checkout;
  assert.equal(result.order.id, 'order-1');
  assert.deepEqual(calls[0], { path: '/orders', options: { method: 'POST', body } });
});

test('lost merge response retains the same key so the server can replay without adding twice', async () => {
  const keys = [];
  const module = await bridge(async (path, options) => {
    if (path === '/cart/merge') {
      keys.push(options.body.mergeKey);
      if (keys.length === 1) throw new Error('Conexão interrompida');
    }
    if (path === '/cart') return { items: [] };
    if (path === '/favorites') return { products: [] };
    return {};
  });
  const anonymous = [{ id: 'p1', qtd: 2 }];
  await assert.rejects(module.sincronizarConta(anonymous), /Conexão/);
  await module.sincronizarConta(anonymous);
  assert.equal(keys[0], keys[1]);
  assert.ok(keys[0].length >= 16);
  await module.sincronizarConta(anonymous);
  assert.notEqual(keys[1], keys[2], 'a new anonymous cart gets a fresh merge operation');
});

test('queued writes from a logged out account never execute under the next session', async () => {
  const module = await bridge(async () => ({}));
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const first = module.comercio.enfileirar(() => pending);
  let staleWrite = false;
  const second = module.comercio.enfileirar(() => { staleWrite = true; });
  module.esquecerConta();
  release();
  await Promise.all([first, second]);
  assert.equal(staleWrite, false);
  await module.aguardarSincronizacao();
});
