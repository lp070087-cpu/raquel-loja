import Fastify from 'fastify';
import {describe,it,expect,vi} from 'vitest';
import {registerAdmin} from '../src/admin.js';

describe('staff operational reads and admin category filtering — simulated ORM',()=>{
  async function fixture(role='STAFF'){
    const app=Fastify();
    const db:any={product:{findMany:vi.fn(async()=>[]),count:vi.fn(async()=>0)},order:{count:vi.fn(async()=>2),findMany:vi.fn(async()=>[])},user:{findMany:vi.fn(async()=>[]),count:vi.fn(async()=>0)}};
    app.setErrorHandler((error:any,_req,reply)=>reply.code(error.status||error.statusCode|| (error.name==='ZodError'?400:500)).send({error:error.name}));
    registerAdmin(app,db,async()=>({user:{role},userId:'controlled-actor'}));return {app,db};
  }
  it('allows six-section read resources but denies administrative resources to STAFF',async()=>{
    const {app}=await fixture();try{
      for(const path of ['/staff/dashboard','/staff/customers','/staff/pickups'])expect((await app.inject('/api'+path)).statusCode).toBe(200);
      for(const path of ['/admin/products','/admin/employees','/admin/settings','/admin/reports','/admin/payments'])expect((await app.inject('/api'+path)).statusCode).toBe(403);
    }finally{await app.close();}
  });
  it('denies operational data to a customer',async()=>{
    const {app}=await fixture('CUSTOMER');try{for(const path of ['/staff/dashboard','/staff/customers','/staff/pickups'])expect((await app.inject('/api'+path)).statusCode).toBe(403);}finally{await app.close();}
  });
  it('limits customer fields and never selects pickup secrets in operational reads',async()=>{
    const {app,db}=await fixture();try{
      await app.inject('/api/staff/customers?q=Lucas');const selection=db.user.findMany.mock.calls[0][0].select;
      expect(Object.keys(selection).sort()).toEqual(['_count','id','name','phone']);
      await app.inject('/api/staff/pickups?q=oleo&status=READY');const query=db.order.findMany.mock.calls[0][0];
      expect(query.where).toMatchObject({fulfillmentType:'PICKUP',status:'READY'});expect(query.where.OR).toHaveLength(3);
      expect(query.select).not.toHaveProperty('pickupCodeEncrypted');expect(query.select).not.toHaveProperty('pickupCodeHash');
    }finally{await app.close();}
  });
  it('combines category and search before database pagination and total count',async()=>{
    const {app,db}=await fixture('ADMIN');try{
      expect((await app.inject('/api/admin/products?categoryId=oil&q=20W50&take=25&skip=25')).statusCode).toBe(200);
      const query=db.product.findMany.mock.calls[0][0];expect(query).toMatchObject({where:{categoryId:'oil'},take:25,skip:25});expect(query.where.OR).toHaveLength(2);expect(db.product.count.mock.calls[0][0].where).toEqual(query.where);
      expect((await app.inject('/api/admin/products?categoryId='+ 'x'.repeat(101))).statusCode).toBe(400);
    }finally{await app.close();}
  });
});
