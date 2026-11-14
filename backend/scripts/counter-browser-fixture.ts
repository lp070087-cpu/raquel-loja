import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import argon2 from 'argon2';
import {token} from '../src/domain.js';
import {assertTestingBranch} from '../src/test-database.js';
import {assertRealNeonIsolation} from '../src/neon-isolation.js';
import {boundedDatabaseUrl} from '../src/database.js';
import {setStaffAccess} from '../src/staff-access.js';
// Credentials are generated only for controlled testing, returned through IPC,
// never printed to the terminal or written into source/evidence files.
async function main(){
 assertTestingBranch(process.env.TEST_DATABASE_URL!,process.env.DATABASE_URL,process.env.TEST_DATABASE_BRANCH);
 await assertRealNeonIsolation(process.env.DATABASE_URL!,process.env.TEST_DATABASE_URL!);
 const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.TEST_DATABASE_URL!)});
 try{
  const prefix=('counter-browser-'+Date.now()+'-'+token().slice(0,5)).toLowerCase(),password=token();
  const email=prefix+'@example.test',catalog=process.argv.includes('--catalog');
  const employee=catalog?null:await db.user.create({data:{name:'Atendente Teste',email,phone:'81999999999',role:'CUSTOMER',passwordHash:await argon2.hash(password,{type:argon2.argon2id})}});
  if(employee)await setStaffAccess(db,email,'STAFF');
  const source=await db.product.findUniqueOrThrow({where:{id:'oleo-motul-7100-10w40'},include:{images:true}});
  await db.product.create({data:{id:prefix,slug:prefix,sku:prefix,name:catalog?source.name:'Produto de atendimento controlado',description:'Fixture de atendimento em testing',priceCents:catalog?source.priceCents:4567,stock:10,metadata:source.metadata??{},images:{create:source.images.map(i=>({imageUrl:i.imageUrl,position:i.position}))}}});
  if(!process.send)throw new Error('IPC_REQUIRED');
  process.send({email,password,employeeId:employee?.id,productId:prefix});
 }finally{await db.$disconnect();}
}
main().catch(()=>{if(process.send)process.send({error:'FIXTURE_FAILED'});process.exitCode=1;});
