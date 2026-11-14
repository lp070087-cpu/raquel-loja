import {it,expect} from 'vitest';
import {generatePickupCode,pickupHash,reservePickupCode} from '../src/pickup.js';
import {decrypt} from '../src/domain.js';
const secret='pickup-unit-test-key-at-least-32-characters';
it('generates exactly five numeric characters',()=>{
 for(let i=0;i<1000;i++) expect(generatePickupCode()).toMatch(/^\d{5}$/);
});
it('preserves zeroes through authenticated encryption and retries a collision',async()=>{
 const hashes=new Set([pickupHash('12345',secret)]);let attempts=0;
 const tx:any={pickupCodeReservation:{async createMany({data}:any){const h=data[0].codeHash;if(hashes.has(h))return{count:0};hashes.add(h);return{count:1};}}};
 const reserved=await reservePickupCode(tx,secret,()=>++attempts===1?'12345':'00007');
 expect(attempts).toBe(2);expect(decrypt(reserved.encrypted,secret)).toBe('00007');
 expect(reserved.codeHash).not.toContain('00007');
});
it('bounds collision retries and refuses invalid generators',async()=>{
 let calls=0;const tx:any={pickupCodeReservation:{async createMany(){calls++;return{count:0};}}};
 await expect(reservePickupCode(tx,secret,()=> '00000')).rejects.toMatchObject({code:'PICKUP_CODE_UNAVAILABLE'});
 expect(calls).toBe(128);
 await expect(reservePickupCode(tx,secret,()=> '123456')).rejects.toThrow('INVALID_PICKUP_GENERATOR');
});
