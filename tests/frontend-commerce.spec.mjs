import { test, expect } from '../backend/node_modules/@playwright/test/index.mjs';
import { PRODUTOS, CATEGORIAS } from '../assets/js/dados.js';
test.setTimeout(90000);

test('erro de sincronização não vira carrinho vazio e recarregar recupera itens — API MOCKED',async({page})=>{
 const state=await mockCommerce(page);state.items=[{productId:product.id,quantity:2}];let failure=true;
 await page.route('**/api/favorites',async route=>{if(!failure)return route.fallback();failure=false;await route.fulfill({status:503,json:{message:'Falha temporária controlada'},headers:{'access-control-allow-origin':'http://127.0.0.1:8000','access-control-allow-credentials':'true'}});});
 await page.goto('/carrinho.html');await expect(page.getByRole('alert')).toContainText('Seus itens não foram apagados');await expect(page.getByRole('heading',{name:'Seu carrinho está vazio',exact:true})).toHaveCount(0);expect(state.items[0].quantity).toBe(2);
 await page.getByRole('button',{name:'Carregar carrinho novamente',exact:true}).click();await expect(page.locator('[data-qtd]')).toHaveValue('2');await expect(page.getByRole('alert')).toHaveCount(0);
});

// Explicit HTTP mocks: these tests exercise the browser UI and API contract,
// not PostgreSQL persistence or backend authorization.
const product = { ...PRODUTOS[0], active: true, priceCents: 10000, stock: 8, preco: 100, estoque: 8 };
async function mockCommerce(page, options = {}) {
  const state = { items: options.empty ? [] : [{ productId: product.id, quantity: 1 }], favorites: [], calls: [], orders: [], errors: [] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/api/**', async route => {
    const req = route.request(), method = req.method(), path = new URL(req.url()).pathname.replace(/^\/api/, '');
    const body = req.postDataJSON();
    const headers = { 'access-control-allow-origin': 'http://127.0.0.1:8000', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,x-csrf-token', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS' };
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    state.calls.push({ path, method, body });
    let data = {}, status = 200;
    if (path === '/store') data = { settings: {} };
    else if (path === '/categories') data = { categories: CATEGORIAS.map(category => ({ id: category.slug, name: category.nome, slug: category.slug, active: true })) };
    else if (path === '/products') data = { products: [product] };
    else if (path === '/auth/csrf') data = { csrfToken: 'MOCK-CSRF' };
    else if (path === '/auth/me' && options.unauthorized) { status = 401; data = { message: 'Entre para continuar.' }; }
    else if (path === '/auth/me' || path === '/profile') data = { user: { id: 'u1', name: 'Raquel Cliente', phone: '81999999999', email: 'cliente@example.test' } };
    else if (path === '/addresses') data = { addresses: [{ id: 'address-1', recipientName: 'Raquel', phone: '81999999999', zipCode: '53160010', street: 'Rua Teste', number: '27', neighborhood: 'Centro', city: 'Olinda', state: 'PE', isDefault: true }] };
    else if (path === '/cart') data = { items: state.items, subtotalCents: state.items.reduce((s, i) => s + i.quantity * product.priceCents, 0) };
    else if (path.startsWith('/cart/items/')) { state.items = body.quantity ? [{ productId: product.id, quantity: body.quantity }] : []; data = { items: state.items }; }
    else if (path === '/favorites') data = { products: state.favorites };
    else if (path.startsWith('/favorites/')) { state.favorites = method === 'DELETE' ? [] : [product]; }
    else if (path === '/coupons/validate') {
      if (body.code === 'INVALIDO') { status = 422; data = { message: 'Cupom inválido ou indisponível.' }; }
      else data = { code: body.code, discountCents: 1000, subtotalCents: 20000, totalCents: 19000 };
    }
    else if (path === '/orders' && method === 'POST') {
      const order = { id: 'order-1', orderNumber: 'RQ-MOCK-001', status: 'PENDING', fulfillmentType: body.fulfillmentType, paymentMethod: body.paymentMethod, paymentStatus: 'PENDING', subtotalCents: 20000, discountCents: body.couponCode ? 1000 : 0, shippingCents: 0, totalCents: body.couponCode ? 19000 : 20000, pickupCode: '123456', createdAt: '2026-10-27T12:00:00Z', items: [{ productId: product.id, nameSnapshot: product.nome, unitPriceCents: 10000, quantity: 2, totalCents: 20000 }] };
      state.orders = [order]; state.items = []; data = { order };
    }
    else if (path === '/orders/order-1') data = { order: state.orders[0] };
    else if (path.startsWith('/orders/')) { status = 404; data = { message: 'Pedido não encontrado.' }; }
    else { status = 404; data = { message: `Mock sem rota ${path}` }; }
    await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
  });
  return state;
}

test('catálogo, favoritos, carrinho, cupom e pedido de retirada — API MOCKED', async ({ page }, info) => {
  const state = await mockCommerce(page, { empty: true });
  await page.goto('/catalogo.html');
  await page.locator('[data-favoritar]').first().click();
  await expect.poll(() => state.favorites.length).toBe(1);
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).first().click();
  await expect.poll(() => state.items.length).toBe(1);
  await page.goto('/carrinho.html');
  await page.locator('[data-mais]').first().click();
  await expect.poll(() => state.items[0]?.quantity).toBe(2);
  await page.locator('#campo-cupom').fill('INVALIDO');
  await page.locator('#form-cupom button').click();
  await expect(page.locator('#caixa-avisos')).toContainText('Cupom inválido');
  await page.locator('#campo-cupom').fill('RAQUEL10');
  await page.locator('#form-cupom button').click();
  await expect(page.locator('.resumo')).toContainText('RAQUEL10');
  await page.screenshot({ path: info.outputPath('MOCKED-cart-coupon.png'), fullPage: true });
  await page.goto('/checkout.html');
  await expect(page.locator('#nome')).toHaveValue('Raquel Cliente');
  await page.locator('#btn-finalizar').click();
  await expect(page).toHaveURL(/pedido.html\?id=order-1/);
  await expect(page.locator('#pedido-container')).toContainText('RQ-MOCK-001');
  await expect(page.locator('#pedido-container')).toContainText('123456');
  await expect(page.locator('#pedido-container')).toContainText('pendente');
  const posted = state.calls.find(c => c.path === '/orders' && c.method === 'POST').body;
  expect(posted).toMatchObject({ fulfillmentType: 'PICKUP', paymentMethod: 'CASH', couponCode: 'RAQUEL10' });
  expect(posted.idempotencyKey.length).toBeGreaterThan(15);
  expect(posted).not.toHaveProperty('totalCents');
  expect(posted).not.toHaveProperty('priceCents');
  expect(state.errors).toEqual([]);
  await page.screenshot({ path: info.outputPath('MOCKED-order-confirmation.png'), fullPage: true });
});

test('pedido inexistente não usa pedidos locais — API MOCKED', async ({ page }) => {
  await mockCommerce(page);
  await page.goto('/pedido.html?id=foreign-order');
  await expect(page.locator('#pedido-container')).toContainText('Pedido não encontrado');
  await expect(page.locator('#pedido-container')).not.toContainText('Pedido reservado!');
});

test('checkout privado exige autenticação — API MOCKED', async ({ page }) => {
  await mockCommerce(page, { unauthorized: true });
  await page.goto('/checkout.html');
  await expect(page).toHaveURL(/conta.html\?next=checkout.html/);
});

for (const width of [320,375,390,430,768,1024,1280,1440]) test(`carrinho e checkout responsivos ${width}px — API MOCKED`, async ({ page }, info) => {
  const state = await mockCommerce(page);
  await page.setViewportSize({ width, height: 950 });
  for (const name of ['carrinho', 'checkout']) {
    await page.goto(`/${name}.html`);
    await expect(page.locator(name === 'carrinho' ? '.item-carrinho' : '#form-checkout')).toBeVisible();
    if(name==='checkout'){
      await expect(page.locator('[name="tipo"][value="entrega"]')).toBeDisabled();
      await expect(page.locator('[name="tipo"][value="retirada"]')).toBeChecked();
    }
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`MOCKED-${name}-${width}.png`), fullPage: true });
  }
  expect(state.errors).toEqual([]);
});
