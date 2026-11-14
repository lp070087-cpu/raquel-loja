import { createHmac, randomInt } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { ApiError, encrypt } from './domain.js';
export function generatePickupCode() { return randomInt(0,100000).toString().padStart(5,'0'); }
export function pickupHash(code:string,secret:string) {
  return createHmac('sha256',secret).update('raquel-pickup-v1:'+code).digest('hex');
}
export async function reservePickupCode(tx:Prisma.TransactionClient,secret:string,generate=generatePickupCode) {
  for(let i=0;i<128;i++) {
    const code=generate();
    if(!/^\d{5}$/.test(code)) throw new Error('INVALID_PICKUP_GENERATOR');
    const codeHash=pickupHash(code,secret);
    const result=await tx.pickupCodeReservation.createMany({data:[{codeHash}],skipDuplicates:true});
    if(result.count) return {codeHash,encrypted:encrypt(code,secret)};
  }
  throw new ApiError(503,'PICKUP_CODE_UNAVAILABLE','Não foi possível reservar um código. Contate a loja.');
}
