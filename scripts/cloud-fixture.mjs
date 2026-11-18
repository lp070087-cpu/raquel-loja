// Test-only fixture over the deployed HTTPS API; no DB credentials or test backdoor.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const folder=new URL('../evidence/cloud-fixture/',import.meta.url);
export async function createCloudFixture(){
 const base=process.env.RAQUEL_PREVIEW_URL;
 if(!base||!/^https:\/\/raquel-loja-ew91-[a-z0-9-]+\.vercel\.app$/.test(base))throw new Error('VERIFIED_PREVIEW_REQUIRED');
 const config=JSON.parse(await readFile(new URL('../config/deployment.json',import.meta.url),'utf8')),auth=JSON.parse(await readFile(process.env.APPDATA+'/com.vercel.cli/Data/auth.json','utf8'));
 const project=await(await fetch(`https://api.vercel.com/v9/projects/${config.vercelProjectId}?teamId=${config.vercelTeamId}`,{headers:{Authorization:'Bearer '+auth.token}})).json();
 const access=Object.entries(project.protectionBypass||{}).find(([,value])=>value.scope==='automation-bypass')?.[0];if(!access)throw new Error('PREVIEW_ACCESS_REQUIRED');
 const accounts={},prefix='admin-browser-'+Date.now()+'-'+randomBytes(3).toString('hex');
 async function client(){
   const cookies=new Map();let csrf;
   const req=async(path,method='GET',body)=>{
     const headers={'x-vercel-protection-bypass':access,Origin:base,Cookie:[...cookies].map(([k,v])=>k+'='+v).join(';'),...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})};
     const response=await fetch(base+'/api'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
     for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1));}
     const json=await response.json();if(!response.ok)throw new Error('CLOUD_FIXTURE_HTTP_'+response.status);return json;
   };
   csrf=(await req('/auth/csrf')).csrfToken;return req;
 }
 for(const [role,name]of [['admin','Administradora de teste'],['staff','Funcionário de teste'],['customer','Cliente de teste']]){
   const email=`${prefix}-${role}@example.test`,password=randomBytes(32).toString('base64url'),req=await client();
   const {user}=await req('/auth/register','POST',{name,email,password,phone:'81999999999'});accounts[role]={id:user.id,email,password};
 }
 await mkdir(folder,{recursive:true});
 const request={prefix,branchId:'br-rough-haze-b616aomd',projectId:'steep-hill-55153393',adminId:accounts.admin.id,staffId:accounts.staff.id,customerId:accounts.customer.id};
 await writeFile(new URL('promotion-request.json',folder),JSON.stringify(request));console.log('CONTROLLED_TEST_ROLE_REQUEST '+JSON.stringify(request));
 // External supervisor/MCP coordination only. HTTP and browser timeouts stay unchanged.
 const deadline=Date.now()+180000;let approved=false;
 while(Date.now()<deadline){try{const flag=JSON.parse(await readFile(new URL('promotion-approved.json',folder),'utf8'));if(flag.prefix===prefix){approved=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
 if(!approved)throw new Error('CONTROLLED_TEST_ROLE_TIMEOUT');
 await writeFile(new URL('cleanup-'+prefix+'.json',folder),JSON.stringify(request));
 const req=await client();await req('/auth/login','POST',{email:accounts.admin.email,password:accounts.admin.password});
 if((await req('/auth/me')).user.role!=='ADMIN')throw new Error('CONTROLLED_ADMIN_ROLE_REQUIRED');
 const {category}=await req('/admin/categories','POST',{name:'Categoria controlada',slug:prefix,currentPassword:accounts.admin.password});
 const {product}=await req('/admin/products','POST',{name:'Produto de gestão controlado',slug:prefix,sku:prefix,description:'Fixture exclusiva em testing',priceCents:4567,initialStock:20,categoryId:category.id,active:true,images:[{imageUrl:'public/produtos/oleos/oleo-01.jpg',position:0}],compatibilities:[],currentPassword:accounts.admin.password});
 await req('/auth/logout','POST');return {prefix,...accounts,productId:product.id,categoryId:category.id,cloudHttp:true};
}
export async function retireCloudFixture(fixture){
 const request={prefix:fixture.prefix,branchId:'br-rough-haze-b616aomd',projectId:'steep-hill-55153393',adminId:fixture.admin.id,staffId:fixture.staff.id,customerId:fixture.customer.id};
 await mkdir(folder,{recursive:true});await writeFile(new URL('cleanup-'+fixture.prefix+'.json',folder),JSON.stringify(request));
 console.log('CONTROLLED_TEST_ROLE_CLEANUP_REQUIRED '+JSON.stringify(request));
}
