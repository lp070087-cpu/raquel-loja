import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { assertRealNeonIsolation } from '../src/neon-isolation.js';
import { boundedDatabaseUrl } from '../src/database.js';
try {
 await assertRealNeonIsolation(process.env.DATABASE_URL!,process.env.TEST_DATABASE_URL!);
 const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.TEST_DATABASE_URL!),errorFormat:'minimal'});
 try {
  const users=await db.user.findMany({where:{email:{startsWith:'raquel-live-'}},orderBy:{createdAt:'desc'},take:4,select:{createdAt:true,_count:{select:{favorites:true,orders:true,addresses:true,motorcycles:true}}}});
  console.log(JSON.stringify({controlledCustomers:users.map(u=>({createdAt:u.createdAt,counts:u._count})),scope:'testing-only'},null,2));
 } finally {await db.$disconnect();}
} catch {console.log('TESTING_STATE_UNAVAILABLE');process.exitCode=1;}
