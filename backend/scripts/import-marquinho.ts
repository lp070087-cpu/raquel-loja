import 'dotenv/config';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {assertRealNeonIsolation} from '../src/neon-isolation.js';
import {assertTestingBranch} from '../src/test-database.js';
import {boundedDatabaseUrl} from '../src/database.js';
const names:Record<string,string>={capacetes:'Capacetes',capas:'Capas de chuva',oleos:'Óleos',pneus:'Pneus',freios:'Freios',filtros:'Filtros',transmissao:'Transmissão'};
let db:PrismaClient|undefined;
function cents(value:string){const match=/^(\d+)\.(\d+)$/.exec(value)||/^(\d+)$/.exec(value);if(!match)throw new Error('INVALID_SOURCE_PRICE');const decimal=(match[2]||'').padEnd(2,'0');if(/[1-9]/.test(decimal.slice(2)))throw new Error('SOURCE_PRICE_REQUIRES_REVIEW');const result=Number(BigInt(match[1])*100n+BigInt(decimal.slice(0,2)));if(!Number.isSafeInteger(result)||result>100000000)throw new Error('INVALID_SOURCE_PRICE');return result;}
try{
 if(!process.argv.includes('--testing'))throw new Error('TESTING_FLAG_REQUIRED');
 assertTestingBranch(process.env.TEST_DATABASE_URL!,process.env.DATABASE_URL,process.env.TEST_DATABASE_BRANCH);await assertRealNeonIsolation(process.env.DATABASE_URL!,process.env.TEST_DATABASE_URL!);
 const snapshot=JSON.parse(await readFile('../data/importacao-marquinho.json','utf8'));
 if(snapshot.source.neonProject!=='bold-forest-00881946'||snapshot.source.branch!=='br-weathered-glade-ahgval1e'||snapshot.stockSelection!=='quantidade')throw new Error('SOURCE_REVIEW_REQUIRED');
 db=new PrismaClient({datasourceUrl:boundedDatabaseUrl(process.env.TEST_DATABASE_URL!)});
 const existingProducts=await db.product.findMany({where:{OR:[{id:{in:snapshot.products.map((p:any)=>'mq-'+p.id)}},{sku:{in:snapshot.products.map((p:any)=>String(p.codigo).trim())}}]},select:{id:true,sku:true,metadata:true}});
 const plan=[];const seen=new Set();
 for(const p of snapshot.products){
   if(!names[p.targetCategory]||!Number.isInteger(p.quantidade)||p.quantidade<0||p.quantidade>1000000)throw new Error('INVALID_SOURCE_STOCK');
   const id='mq-'+p.id,sku=String(p.codigo).trim(),priceCents=cents(p.precoVenda);
   if(!sku||sku.length>80||seen.has(sku))throw new Error('DUPLICATE_SOURCE_SKU');seen.add(sku);
   const sourceHash=createHash('sha256').update(JSON.stringify(p)).digest('hex');
   const existing=existingProducts.find(product=>product.id===id||product.sku===sku);
   if(existing&&(existing.id!==id||(existing.metadata as any)?.sourceHash!==sourceHash))throw new Error('IMPORT_CONFLICT_REQUIRES_REVIEW');
   plan.push({p,id,sku,priceCents,sourceHash,skip:!!existing});
 }
 let imported=0;
 if(process.argv.includes('--apply'))for(const row of plan){if(row.skip)continue;const {p,id,sku,priceCents,sourceHash}=row;
   await db.$transaction(async tx=>{
     const category=await tx.category.upsert({where:{slug:p.targetCategory},create:{name:names[p.targetCategory],slug:p.targetCategory},update:{}});
     const attributes=[p.marca,p.tamanho,p.cor].filter((v:any)=>v&&!String(p.nome).toLowerCase().includes(String(v).toLowerCase()));
     const name=[p.nome.trim(),...attributes].join(' · ').slice(0,200);
     const images=[];if(p.imagemUrl){const url=new URL(p.imagemUrl);if(url.protocol==='https:'&&!url.username&&!url.password&&!/[?&](token|signature|credential|auth|key|x-amz-)/i.test(url.href))images.push({imageUrl:url.href,position:0});}
     await tx.product.create({data:{id,sku,name,slug:id,description:p.descricao?.trim()||name,priceCents,stock:p.quantidade,active:priceCents>0,categoryId:category.id,metadata:{source:'marquinho',compatibilidadePendente:true,sourceProductId:p.id,sourceSku:sku,sourceHash,categoria:p.targetCategory,marca:p.marca||'',tamanho:p.tamanho||'',cor:p.cor||'',compatibilidadeInformada:p.compatibilidade||'',imagemPendente:images.length===0},images:{create:images}}});
   });imported++;
 }
 const report={sourceReadOnly:true,destination:'testing',productionWrites:false,stockField:'quantidade',centralStockOnly:true,selected:plan.length,imported,alreadyPresent:plan.filter(r=>r.skip).length,inactiveWithoutPrice:plan.filter(r=>r.priceCents===0).length,missingImage:plan.filter(r=>!r.p.imagemUrl).length,mode:process.argv.includes('--apply')?'apply':'plan'};
 await mkdir('../evidence/catalog-import',{recursive:true});await writeFile('../evidence/catalog-import/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error:any){const code=String(error.message||'');console.error(JSON.stringify({error:/^[A-Z_]+$/.test(code)?code:'IMPORT_FAILED',credentialsSuppressed:true}));process.exitCode=1;}finally{await db?.$disconnect();}
