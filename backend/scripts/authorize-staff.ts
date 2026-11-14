import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {assertTestingBranch} from '../src/test-database.js';
import {assertRealNeonIsolation} from '../src/neon-isolation.js';
import {boundedDatabaseUrl} from '../src/database.js';
import {setStaffAccess} from '../src/staff-access.js';

// Local operator tool. Never creates a password or accepts a database URL via CLI.
// The employee first registers their own password through the regular secure form.
async function main() {
 const args=process.argv.slice(2);
 const email=z.email().parse(args.find(a=>a.startsWith('--email='))?.slice(8)).toLowerCase();
 const role=z.enum(['STAFF','CUSTOMER']).parse(args.find(a=>a.startsWith('--role='))?.slice(7));
 if(!args.includes('--testing')||!args.includes('--confirm-role-change'))throw new Error('CONFIRMATION_REQUIRED');
 assertTestingBranch(process.env.TEST_DATABASE_URL!,process.env.DATABASE_URL,process.env.TEST_DATABASE_BRANCH);
 await assertRealNeonIsolation(process.env.DATABASE_URL!,process.env.TEST_DATABASE_URL!);
 const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.TEST_DATABASE_URL!)});
 try {
  await setStaffAccess(db,email,role);
  console.log('Permissão atualizada somente em testing. Sessões revogadas; novo login necessário.');
 } finally {await db.$disconnect();}
}
main().catch(()=>{console.error('Permissão não alterada: confira os argumentos, a conta existente e o isolamento de testing. Detalhes sensíveis suprimidos.');process.exitCode=1;});
