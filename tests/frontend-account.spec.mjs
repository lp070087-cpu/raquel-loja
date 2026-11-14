import { test, expect } from '../backend/node_modules/@playwright/test/index.mjs';
import { CATEGORIAS } from '../assets/js/dados.js';

// These are browser integration tests with an explicitly mocked HTTP API.
// They verify UI behavior, not Neon connectivity or backend authorization.
async function mockApi(page, authenticated = false) {
  const state = {
    authenticated,
    user: { id:'customer-1', name:'Raquel Teste', email:'raquel@example.test', phone:'81999999999', emailVerifiedAt:null },
    addresses:[], motorcycles:[], favorites:[], orders:[], cart:[], calls:[],
  };
  await page.route('**/api/**', async route => {
    const request=route.request(), url=new URL(request.url()), path=url.pathname.replace(/^\/api/,''), method=request.method();
    const body=request.postDataJSON(); state.calls.push({path,method,body});
    let data={}, status=200;
    const id=path.split('/').at(-1);
    if(method==='OPTIONS') return route.fulfill({status:204,headers:{'access-control-allow-origin':'http://127.0.0.1:8000','access-control-allow-credentials':'true','access-control-allow-headers':'content-type,x-csrf-token','access-control-allow-methods':'GET,POST,PATCH,PUT,DELETE,OPTIONS'}});
    if(path==='/store') data={settings:{}};
    else if(path==='/categories') data={categories:CATEGORIAS.map(category=>({id:category.slug,name:category.nome,slug:category.slug,active:true}))};
    else if(path==='/auth/csrf') data={csrfToken:'mock-csrf'};
    else if(['/auth/register','/auth/login'].includes(path)) { state.authenticated=true; if(path.endsWith('register')) Object.assign(state.user,{name:body.name,email:body.email,phone:body.phone}); data={user:state.user}; }
    else if(path==='/auth/me') { if(state.authenticated) data={user:state.user}; else { status=401; data={message:'Entre para continuar.'}; } }
    else if(path==='/auth/logout') state.authenticated=false;
    else if(path==='/auth/forgot-password') data={message:'Se houver uma conta cadastrada, as instruções serão enviadas quando o serviço estiver configurado.'};
    else if(path==='/auth/reset-password') data={message:'Senha redefinida.'};
    else if(path==='/auth/request-verification') data={emailConfigured:false,message:'Serviço de e-mail ainda não configurado.'};
    else if(path==='/auth/verify-email') { state.user.emailVerifiedAt='2026-10-27T12:00:00Z'; data={message:'E-mail verificado.'}; }
    else if(path==='/profile') { Object.assign(state.user,body); data={user:state.user}; }
    else if(path==='/profile/password') data={message:'Senha alterada.'};
    else if(path==='/sessions') data={sessions:[{id:'session-1',createdAt:'2026-10-27T12:00:00Z',current:true}]};
    else if(path.startsWith('/sessions/')) data={};
    else if(path==='/cart') data={items:state.cart};
    else if(path.startsWith('/cart/items/')) { state.cart=[{productId:id,quantity:body.quantity}]; data={items:state.cart}; }
    else if(path==='/favorites' && method==='GET') data={products:state.favorites};
    else if(path.startsWith('/favorites/')) { state.favorites=state.favorites.filter(p=>p.id!==id); data={}; }
    else if(path==='/orders') data={orders:state.orders};
    else if(path.startsWith('/orders/')) data={order:state.orders.find(order=>order.id===id)};
    else if(/^\/(addresses|motorcycles)(\/|$)/.test(path)) {
      const collection=path.split('/')[1], key=collection==='addresses'?'address':'motorcycle';
      if(method==='GET') data={[collection]:state[collection]};
      else if(method==='POST') { const item={...body,id:`${key}-${state[collection].length+1}`}; state[collection].push(item); data={[key]:item}; }
      else if(method==='PATCH') { const item=state[collection].find(item=>item.id===id); Object.assign(item,body); data={[key]:item}; }
      else if(method==='DELETE') state[collection]=state[collection].filter(item=>item.id!==id);
    }
    else if(path==='/products') data={products:[{id:'p001',name:'Peça de teste',priceCents:2500,stock:5,active:true,images:[],compat:[],marca:'Teste',categoria:'freios'}]};
    else { status=404; data={message:`Mock sem rota: ${method} ${path}`}; }
    return route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'http://127.0.0.1:8000','access-control-allow-credentials':'true'},body:JSON.stringify(data)});
  });
  return state;
}

test('cadastro e perfil — API simulada', async ({page},testInfo) => {
  const state=await mockApi(page);
  await page.goto('/conta.html');
  await page.getByRole('button',{name:'Criar uma conta',exact:true}).click();
  await page.getByLabel('Nome completo').fill('Raquel Teste');
  await page.getByLabel('E-mail',{exact:true}).fill('raquel@example.test');
  await page.getByLabel('Telefone',{exact:true}).fill('81999999999');
  await page.getByLabel('Senha',{exact:true}).fill('SenhaSegura123!');
  await page.getByRole('button',{name:'Mostrar senha',exact:true}).click();
  await expect(page.getByLabel('Senha',{exact:true})).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Olá, Raquel Teste!'})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('cadastro-confirmado.png'),fullPage:true});
  expect(state.calls.find(call=>call.path==='/auth/register').body.password).toBe('SenhaSegura123!');
  await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
  await page.getByLabel('Nome completo').fill('Raquel Atualizada');
  await page.getByRole('button',{name:'Salvar dados',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('atualizados');
});

test('endereços cadastrar editar — API simulada', async ({page},testInfo) => {
  await mockApi(page,true);
  await page.goto('/conta.html');
  await page.getByRole('button',{name:'Endereços',exact:true}).click();
  await page.getByRole('button',{name:'Novo endereço',exact:true}).click();
  for(const [label,value] of Object.entries({'Destinatário':'Raquel','Telefone':'81999999999','CEP':'53160-010','Rua':'Rua de Teste','Número':'27','Bairro':'Centro','Cidade':'Olinda','Estado (UF)':'PE'})) await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByLabel('Usar como endereço padrão').check();
  await page.getByRole('button',{name:'Salvar endereço',exact:true}).click();
  await expect(page.getByText('Rua de Teste, 27')).toBeVisible();
  await page.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByLabel('Número',{exact:true}).fill('28');
  await page.getByRole('button',{name:'Salvar endereço',exact:true}).click();
  await expect(page.getByText('Rua de Teste, 28')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('endereco-salvo.png'),fullPage:true});
});

test('motos cadastrar editar — API simulada', async ({page},testInfo) => {
  await mockApi(page,true);
  await page.goto('/conta.html');
  await page.getByRole('button',{name:'Minhas motos',exact:true}).click();
  await page.getByRole('button',{name:'Cadastrar moto',exact:true}).click();
  await page.getByLabel('Marca',{exact:true}).selectOption('Honda');
  await page.getByLabel('Modelo',{exact:true}).selectOption('CG 160');
  await page.getByLabel('Versão',{exact:true}).selectOption({index:1});
  await page.getByLabel('Ano',{exact:true}).selectOption({index:1});
  await page.getByLabel('Apelido (opcional)').fill('Minha Honda');
  await page.getByLabel('Minha moto principal').check();
  await page.getByRole('button',{name:'Salvar moto',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Minha Honda'})).toBeVisible();
  await page.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByLabel('Apelido (opcional)').fill('Honda principal');
  await page.getByRole('button',{name:'Salvar moto',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Honda principal'})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('moto-salva.png'),fullPage:true});
});

test('senha e logout — API simulada', async ({page}) => {
  const state=await mockApi(page,true);
  await page.goto('/conta.html');
  await page.getByRole('button',{name:'Segurança',exact:true}).click();
  await page.getByLabel('Senha atual',{exact:true}).fill('SenhaSegura123!');
  await page.getByLabel('Nova senha',{exact:true}).fill('OutraSenhaSegura123!');
  await page.getByRole('button',{name:'Alterar senha',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Senha alterada');
  expect(await page.evaluate(()=>Object.keys(localStorage).some(key=>/session|password|token/i.test(key)))).toBe(false);
  await page.getByRole('button',{name:'Sair da conta',exact:true}).click();
  await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();
  expect(state.authenticated).toBe(false);
});

test('login, recuperação e redefinição — API simulada', async ({page}) => {
  await mockApi(page);
  await page.goto('/conta.html');
  await page.getByRole('button',{name:'Esqueci minha senha'}).click();
  await page.getByLabel('E-mail',{exact:true}).fill('raquel@example.test');
  await page.getByRole('button',{name:'Solicitar recuperação'}).click();
  await expect(page.getByRole('status')).toContainText('Se houver uma conta');
  await page.goto('/conta.html?reset=mock-token');
  await page.getByLabel('Nova senha',{exact:true}).fill('NovaSenhaSegura123!');
  await page.getByRole('button',{name:'Salvar nova senha'}).click();
  await expect(page.getByRole('status')).toContainText('Senha redefinida');
  await page.getByLabel('E-mail',{exact:true}).fill('raquel@example.test');
  await page.getByLabel('Senha',{exact:true}).fill('NovaSenhaSegura123!');
  await page.getByLabel('Manter conectado neste dispositivo').check();
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
  await page.getByRole('button',{name:'Solicitar verificação do e-mail'}).click();
  await expect(page.getByRole('status')).toContainText('Serviço de e-mail ainda não configurado.');
  await page.goto('/conta.html?verify=mock-verification-token');
  await expect(page.getByRole('status')).toContainText('E-mail verificado.');
});

test('favoritos, detalhes do pedido e exclusão — API simulada',async({page},testInfo)=>{
  const state=await mockApi(page,true);
  state.favorites=[{id:'p001',name:'Peça de teste',priceCents:2500,stock:5,images:[]}];
  state.orders=[{id:'order-1',orderNumber:'RQ-0001',status:'PENDING',fulfillmentType:'PICKUP',paymentMethod:'ON_PICKUP',paymentStatus:'PENDING',subtotalCents:2500,discountCents:0,shippingCents:0,totalCents:2500,createdAt:'2026-10-27T12:00:00Z',pickupCode:'01234',items:[{nameSnapshot:'Peça de teste',quantity:1,unitPriceCents:2500,totalCents:2500}]}];
  await page.goto('/conta.html');
  await page.getByRole('button',{name:'Favoritos',exact:true}).first().click();
  await expect(page.getByRole('heading',{name:'Peça de teste'})).toBeVisible();
  await page.getByRole('button',{name:'Adicionar ao carrinho',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Produto adicionado');
  expect(state.cart[0].quantity).toBe(1);
  await page.getByRole('button',{name:'Remover favorito'}).click();
  await expect(page.getByText('Salve seus produtos favoritos tocando no coração do catálogo.')).toBeVisible();
  await page.getByRole('button',{name:'Meus pedidos',exact:true}).click();
  await page.getByRole('button',{name:'Ver detalhes',exact:true}).click();
  await expect(page.getByText('Código de retirada: 01234')).toBeVisible();
  await expect(page.getByText(/Pagamento: Na retirada, diretamente na loja · Pendente/)).toBeVisible();
  await expect(page.getByText(/O recebimento é confirmado pela equipe/)).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('pedido-detalhes.png'),fullPage:true});
});

test('erro de conexão é visível e mantém formulário utilizável',async({page})=>{
  await page.route('**/api/**',route=>route.abort());
  await page.goto('/conta.html');
  await expect(page.getByRole('status')).toContainText('Não foi possível conectar');
  await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeEnabled();
});

test('exclusões confirmadas e sessão expirada — API simulada',async({page})=>{
  const state=await mockApi(page,true);
  state.addresses=[{id:'address-1',recipientName:'Raquel',phone:'81999999999',zipCode:'53160010',street:'Rua Teste',number:'27',neighborhood:'Centro',city:'Olinda',state:'PE',isDefault:true}];
  state.motorcycles=[{id:'motorcycle-1',brand:'Honda',model:'CG 160',version:'Fan',year:2020,nickname:'Honda',isPrimary:true}];
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('/conta.html');
  await page.getByRole('button',{name:'Endereços',exact:true}).click();
  await page.getByRole('button',{name:'Excluir',exact:true}).click();
  await expect(page.getByText('Nenhum endereço cadastrado.')).toBeVisible();
  expect(state.addresses).toHaveLength(0);
  await page.getByRole('button',{name:'Minhas motos',exact:true}).click();
  await page.getByRole('button',{name:'Excluir',exact:true}).click();
  await expect(page.getByText('Cadastre sua primeira moto. Usamos somente as compatibilidades do catálogo.')).toBeVisible();
  expect(state.motorcycles).toHaveLength(0);
  await page.route('**/api/addresses',route=>route.fulfill({status:401,contentType:'application/json',headers:{'access-control-allow-origin':'http://127.0.0.1:8000','access-control-allow-credentials':'true'},body:JSON.stringify({error:'SESSION_EXPIRED',message:'Sua sessão expirou.'})}));
  await page.getByRole('button',{name:'Endereços',exact:true}).click();
  await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('expirou');
});

for(const width of [320,375,390,430,768,1024,1440]) test(`responsividade ${width}px — API simulada`,async({page},testInfo)=>{
  await mockApi(page,true);
  await page.setViewportSize({width,height:950});
  await page.goto('/conta.html');
  await expect(page.getByRole('heading',{name:'Olá, Raquel Teste!'})).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.conta-nav').evaluate(nav=>nav.scrollWidth<=nav.clientWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`account-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
  await expect(page.getByLabel('Nome completo')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`profile-${width}.png`),fullPage:true});
});
