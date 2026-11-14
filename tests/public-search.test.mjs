import test from 'node:test';
import assert from 'node:assert/strict';

// Import the public module without a browser; these tests never call the API.
globalThis.document = { querySelector: () => null };
globalThis.location = { hostname: '127.0.0.1' };
globalThis.window = new EventTarget();
const storage = new Map();
window.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
};

const { buscarProdutos } = await import('../assets/js/carrinho.js');
const { ehUniversal } = await import('../assets/js/dados.js');
const products = [
  { id: 'capa', nome: 'Capa de chuva', marca: 'Teste', sku: 'CP01', categoria: 'capas', descricao: '', compat: [] },
  { id: 'pastilha', nome: 'Pastilha dianteira', marca: 'Teste', sku: 'FR01', categoria: 'freios', descricao: '', compat: [{ marca: 'Honda', modelo: 'CG 160' }] },
  { id: 'acessorio', nome: 'Acessório para piloto', marca: 'Teste', sku: 'AC01', categoria: 'acessorios', descricao: '' },
];

test('busca universal não inclui uma peça específica pelo marcador automático', () => {
  const result = buscarProdutos('universal', products);
  assert.deepEqual(result.map(p => p.id), products.filter(ehUniversal).map(p => p.id));
  assert.equal(result.some(p => p.id === 'pastilha'), false);
});

test('busca combina palavras de peça e moto ignorando maiúsculas', () => {
  assert.deepEqual(buscarProdutos('PASTILHA cg 160', products).map(p => p.id), ['pastilha']);
  assert.deepEqual(buscarProdutos('pastilha Yamaha', products), []);
});

test('busca aceita SKU e mantém catálogo quando termo está vazio', () => {
  assert.deepEqual(buscarProdutos('FR01', products).map(p => p.id), ['pastilha']);
  assert.equal(buscarProdutos('   ', products), products);
});
