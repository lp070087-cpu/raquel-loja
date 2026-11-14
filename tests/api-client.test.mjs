import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document={querySelector:()=>null};
globalThis.location={hostname:'127.0.0.1'};
globalThis.window=new EventTarget();
const {api,apiBase,ApiError}=await import('../assets/js/api.js');
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});

test('API do cliente mantém mesmo hostname e envia cookies em GET',async()=>{
  let request;
  globalThis.fetch=async(url,options)=>{request={url,options};return json({user:{id:'customer-1'}});};
  assert.equal(apiBase,'http://127.0.0.1:3001/api');
  assert.deepEqual(await api('/auth/me'),{user:{id:'customer-1'}});
  assert.equal(request.options.credentials,'include');
  assert.equal(request.options.body,undefined);
});
test('mutações buscam CSRF e enviam corpo JSON sem expor sessão',async()=>{
  const requests=[];
  globalThis.fetch=async(url,options)=>{requests.push({url,options});return json(url.endsWith('/auth/csrf')?{csrfToken:'signed-csrf'}:{ok:true});};
  await api('/addresses',{method:'POST',body:{street:'Rua Teste'}});
  assert.equal(requests.length,2);
  assert.equal(requests[0].options.credentials,'include');
  assert.equal(requests[1].options.credentials,'include');
  assert.equal(requests[1].options.headers.get('X-CSRF-Token'),'signed-csrf');
  assert.equal(requests[1].options.body,JSON.stringify({street:'Rua Teste'}));
  assert.equal(requests[1].options.headers.get('Authorization'),null);
});
test('senha atual inválida não encerra sessão; sessão expirada produz evento',async()=>{
  let expirations=0;
  window.addEventListener('raquel:session-expired',()=>expirations++);
  globalThis.fetch=async()=>json({error:'INVALID_CREDENTIALS',message:'Senha atual incorreta.'},401);
  await assert.rejects(api('/profile/password',{method:'POST',body:{}}),error=>error instanceof ApiError && error.status===401);
  assert.equal(expirations,0);
  globalThis.fetch=async()=>json({error:'SESSION_EXPIRED',message:'Sua sessão expirou.'},401);
  await assert.rejects(api('/auth/me'),ApiError);
  assert.equal(expirations,1);
});
test('falha de rede apresenta mensagem útil',async()=>{
  globalThis.fetch=async()=>{throw new TypeError('fetch failed');};
  await assert.rejects(api('/orders'),error=>error instanceof ApiError && error.status===0 && error.message.includes('conectar à loja'));
});
