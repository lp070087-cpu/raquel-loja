import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {assertTestingBranch} from '../src/test-database.js';
import {assertRealNeonIsolation} from '../src/neon-isolation.js';
import {boundedDatabaseUrl} from '../src/database.js';
import {fixturePrefix,isPrivilegedPanelFixture} from './panel-fixture-selector.js';

async function main(){
 const args=process.argv.slice(2);
 if(!args.includes('--testing')||!args.includes('--confirm-retire-fixtures'))throw new Error('CONFIRMATION_REQUIRED');
 const prefixArgs=args.filter(a=>a.startsWith('--prefix='));
 if(prefixArgs.length>1||args.some(a=>!['--testing','--confirm-retire-fixtures'].includes(a)&&!a.startsWith('--prefix=')))throw new Error('INVALID_ARGUMENTS');
 const prefix=prefixArgs[0]?.slice('--prefix='.length);
 if(prefix!==undefined&&!fixturePrefix.test(prefix))throw new Error('INVALID_PREFIX');
 assertTestingBranch(process.env.TEST_DATABASE_URL!,process.env.DATABASE_URL,process.env.TEST_DATABASE_BRANCH);
 await assertRealNeonIsolation(process.env.DATABASE_URL!,process.env.TEST_DATABASE_URL!);
 const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.TEST_DATABASE_URL!)});
 try{
  const counts=await db.$transaction(async tx=>{
   // All three selectors must agree. Never match a real account by role alone.
   const candidates=await tx.user.findMany({where:{OR:prefix?[{email:{startsWith:prefix+'-'}}]:[{email:{startsWith:'admin-browser-'}},{email:{startsWith:'counter-browser-'}}],role:{in:['ADMIN','STAFF']},name:{in:['Administradora de teste','Funcionário de teste','Cliente de teste','Atendente Teste']}},select:{id:true,email:true,name:true,role:true}});
   const selected=candidates.filter(user=>isPrivilegedPanelFixture(user,prefix));
   if(!selected.length)return {accounts:0,sessions:0};
   // Recheck every selected identity and role in one atomic update. A concurrent
   // identity/role change rolls the whole transaction back, including demotions.
   const changed=await tx.user.updateMany({where:{OR:selected.map(user=>({id:user.id,email:user.email,name:user.name,role:user.role}))},data:{role:'CUSTOMER'}});
   if(changed.count!==selected.length)throw new Error('FIXTURE_IDENTITY_CHANGED');
   const sessions=await tx.session.updateMany({where:{userId:{in:selected.map(user=>user.id)},revokedAt:null},data:{revokedAt:new Date()}});
   return {accounts:changed.count,sessions:sessions.count};
  },{isolationLevel:'Serializable',timeout:15000,maxWait:10000});
  console.log(JSON.stringify({operation:'retire-panel-fixtures',branch:'testing',accountsDemoted:counts.accounts,sessionsRevoked:counts.sessions}));
 }finally{await db.$disconnect();}
}
main().catch(()=>{console.error(JSON.stringify({error:'FIXTURE_RETIREMENT_FAILED',credentialsSuppressed:true}));process.exitCode=1;});
