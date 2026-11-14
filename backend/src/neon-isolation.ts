import { PrismaClient } from '@prisma/client';
import { boundedDatabaseUrl } from './database.js';
import { assertIsolatedTestDatabase } from './test-database.js';
export async function assertRealNeonIsolation(primary:string,testing:string) {
  assertIsolatedTestDatabase(testing,primary);
  const ids:string[]=[];
  for(const raw of [primary,testing]) {
    const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(raw),errorFormat:'minimal'});
    try {
      const rows=await db.$queryRaw<{id:string|null}[]>`SELECT current_setting('neon.branch_id',true) AS id`;
      if(!rows[0]?.id) throw new Error('NEON_BRANCH_ID_UNAVAILABLE');
      ids.push(rows[0].id);
    } finally {await db.$disconnect();}
  }
  if(ids[0]===ids[1]) throw new Error('SAME_REAL_NEON_BRANCH_BLOCKED');
}
