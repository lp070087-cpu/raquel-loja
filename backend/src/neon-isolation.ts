import { PrismaClient } from '@prisma/client';
import { boundedDatabaseUrl } from './database.js';
import { assertIsolatedTestDatabase } from './test-database.js';
export async function assertRealNeonIsolation(primary:string,testing:string) {
  assertIsolatedTestDatabase(testing,primary);
  const ids:string[]=[];
  for(const raw of [primary,testing]) {
    for(let attempt=1;attempt<=3;attempt++){
      const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(raw),errorFormat:'minimal'});
      try {
        await db.$connect();
        const rows=await db.$queryRaw<{id:string|null}[]>`SELECT current_setting('neon.branch_id',true) AS id`;
        if(!rows[0]?.id) throw new Error('NEON_BRANCH_ID_UNAVAILABLE');
        ids.push(rows[0].id);break;
      }catch(error:any){
        if(attempt===3||!(['P1001','P2024'].includes(error.code||error.errorCode)||/Timed out fetching a new connection/.test(String(error.message))))throw error;
        console.warn(JSON.stringify({event:'TESTING_CONNECTION_RETRY',attempt,maximumAttempts:3,credentialsSuppressed:true}));
        await new Promise(resolve=>setTimeout(resolve,attempt*500));
      }finally{await db.$disconnect();}
    }
  }
  if(ids[0]===ids[1]) throw new Error('SAME_REAL_NEON_BRANCH_BLOCKED');
}
