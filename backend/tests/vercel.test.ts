import {afterEach,describe,expect,it} from 'vitest';
import Fastify,{type FastifyInstance} from 'fastify';
import {createServer,type Server} from 'node:http';
import {createNodeHandler,serverlessConfig,safeDeploymentDetail} from '../src/vercel.js';

const apps:FastifyInstance[]=[],servers:Server[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise<void>(resolve=>server.close(()=>resolve()))));await Promise.all(apps.splice(0).map(app=>app.close()));});
async function listen(load:()=>Promise<FastifyInstance>){const server=createServer(createNodeHandler(load));servers.push(server);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+(server.address() as {port:number}).port;}
const configuration={VERCEL_ENV:'production',DATABASE_BRANCH:'production',NEON_BRANCH_ID:'br-production',DATABASE_URL:'postgresql://example:example@ep-example.neon.tech/neondb?sslmode=require',SESSION_SECRET:'test-only-secret-'.repeat(4),FRONTEND_URL:'https://shop.example.test',FRONTEND_ORIGINS:'https://shop.example.test'};
describe('Vercel native HTTP transport and environment isolation',()=>{
 it('redacts connection strings, passwords and session secrets',()=>{
  const url='postgresql://example:private-password@ep-example.neon.tech/neondb';const detail=safeDeploymentDetail(new Error(url+' private-password session-private'),{DATABASE_URL:url,SESSION_SECRET:'session-private'});
  expect(detail).not.toContain('private-password');expect(detail).not.toContain('session-private');expect(detail).not.toContain('postgresql://');
 });
 it('blocks cross-environment connections and enables Secure cookies on preview',()=>{
  expect(()=>serverlessConfig({...configuration,DATABASE_BRANCH:'testing'})).toThrow('DATABASE_BRANCH_MISMATCH');
  const config=serverlessConfig({...configuration,VERCEL_ENV:'preview',VERCEL:'1',DATABASE_BRANCH:'testing',VERCEL_URL:'shop-preview.vercel.app'});
  expect(config.config.production).toBe(true);expect(config.config.trustProxy).toBe(true);expect(config.config.origins).toContain('https://shop-preview.vercel.app');
 });
 it('preserves path, JSON, cookies, CSRF and distinct Set-Cookie headers over real HTTP',async()=>{
  const app=Fastify();apps.push(app);let loads=0;
  app.post('/api/echo',async(req,reply)=>{reply.header('set-cookie',['first=one; HttpOnly; Secure; SameSite=Lax','second=two; HttpOnly; Secure; SameSite=Lax']);return {url:req.url,body:req.body,cookie:req.headers.cookie,csrf:req.headers['x-csrf-token']};});
  const base=await listen(async()=>{loads++;await app.ready();return app;});
  const call=()=>fetch(base+'/api/echo?filter=one',{method:'POST',headers:{'content-type':'application/json',cookie:'session=test-session','x-csrf-token':'test-csrf'},body:JSON.stringify({name:'Cliente de teste'})});
  const responses=await Promise.all([call(),call()]);expect(loads).toBe(1);expect(await responses[0].json()).toEqual({url:'/api/echo?filter=one',body:{name:'Cliente de teste'},cookie:'session=test-session',csrf:'test-csrf'});expect(responses[0].headers.getSetCookie()).toHaveLength(2);await responses[1].arrayBuffer();
 });
 it('preserves Fastify body size rejection',async()=>{
  const app=Fastify({bodyLimit:32768});apps.push(app);let called=false;app.post('/api/echo',async()=>{called=true;return {};});
  const base=await listen(async()=>{await app.ready();return app;});const response=await fetch(base+'/api/echo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({value:'x'.repeat(32769)})});expect(response.status).toBe(413);expect(called).toBe(false);await response.arrayBuffer();
 });
 it('hides initialization errors and retries on the next request',async()=>{
  const app=Fastify();apps.push(app);app.get('/api/health',async()=>({ok:true}));let loads=0;
  const base=await listen(async()=>{if(++loads===1)throw new Error('private connection details');await app.ready();return app;});
  const first=await fetch(base+'/api/health');expect(first.status).toBe(503);expect(await first.text()).not.toContain('private connection details');const second=await fetch(base+'/api/health');expect(second.status).toBe(200);await second.arrayBuffer();expect(loads).toBe(2);
 });
});
