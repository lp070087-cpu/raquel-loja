import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {assertTestingBranch} from '../src/test-database.js';
import {assertRealNeonIsolation} from '../src/neon-isolation.js';
import {boundedDatabaseUrl} from '../src/database.js';
import {reservePickupCode} from '../src/pickup.js';
async function main() {
  const test=process.env.TEST_DATABASE_URL!;
  assertTestingBranch(test,process.env.DATABASE_URL,process.env.TEST_DATABASE_BRANCH);
  await assertRealNeonIsolation(process.env.DATABASE_URL!,test);
  if(!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length<32) throw new Error('SECRET_REQUIRED');
  const db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(test),errorFormat:'minimal'});
  let updated=0;
  try {
    const orders=await db.order.findMany({where:{fulfillmentType:'PICKUP',pickedUpAt:null,status:{notIn:['COMPLETED','CANCELLED']}},select:{id:true}});
    for(const order of orders) {
      await db.$transaction(async tx=>{
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id"=${order.id} FOR UPDATE`;
        if(await tx.pickupCodeReservation.findUnique({where:{orderId:order.id}})) return;
        const code=await reservePickupCode(tx,process.env.SESSION_SECRET!);
        await tx.order.update({where:{id:order.id},data:{pickupCodeHash:code.codeHash,pickupCodeEncrypted:code.encrypted}});
        await tx.pickupCodeReservation.update({where:{codeHash:code.codeHash},data:{orderId:order.id}});
        updated++;
      },{timeout:15000});
    }
    console.log(JSON.stringify({phase:'testing-pickup-backfill',updated,credentialsLogged:false}));
  } finally {await db.$disconnect();}
}
main().catch(()=>{console.error('PICKUP_BACKFILL_FAILED_DETAILS_SUPPRESSED');process.exitCode=1;});
