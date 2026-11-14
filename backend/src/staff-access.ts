import type {PrismaClient} from '@prisma/client';

// Trusted local operator only; never exposed as a public registration endpoint.
export async function setStaffAccess(db:PrismaClient,email:string,role:'STAFF'|'CUSTOMER') {
 return db.$transaction(async tx=>{
  const user=await tx.user.findUnique({where:{email}});
  if(!user||user.role==='ADMIN')throw new Error('ACCOUNT_UNAVAILABLE');
  await tx.user.update({where:{id:user.id},data:{role}});
  await tx.session.updateMany({where:{userId:user.id,revokedAt:null},data:{revokedAt:new Date()}});
 });
}
