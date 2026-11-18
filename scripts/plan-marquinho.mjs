import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const snapshot=JSON.parse(await readFile(new URL('../data/importacao-marquinho.json',import.meta.url),'utf8'));
if(snapshot.source.neonProject!=='bold-forest-00881946'||snapshot.stockSelection!=='quantidade')throw new Error('SOURCE_REVIEW_REQUIRED');
const seen=new Set(),products=[];
for(const p of snapshot.products){
 const sku=String(p.codigo).trim(),match=/^(\d+)(?:\.(\d+))?$/.exec(p.precoVenda);if(!match||!sku||sku.length>80||seen.has(sku)||!Number.isInteger(p.quantidade)||p.quantidade<0||p.quantidade>1000000)throw new Error('INVALID_SOURCE_PRODUCT');seen.add(sku);
 const fraction=(match[2]||'').padEnd(2,'0');if(/[1-9]/.test(fraction.slice(2)))throw new Error('PRICE_REQUIRES_REVIEW');
 const priceCents=Number(BigInt(match[1])*100n+BigInt(fraction.slice(0,2)));if(priceCents>100000000)throw new Error('PRICE_LIMIT');
 const attributes=[p.marca,p.tamanho,p.cor].filter(v=>v&&!p.nome.toLowerCase().includes(String(v).toLowerCase()));
 const name=[p.nome.trim(),...attributes].join(' · ').slice(0,200),sourceHash=createHash('sha256').update(JSON.stringify(p)).digest('hex');
 let imageUrl=null;if(p.imagemUrl){const url=new URL(p.imagemUrl);if(url.protocol==='https:'&&!url.username&&!url.password&&!/[?&](token|signature|credential|auth|key|x-amz-)/i.test(url.href))imageUrl=url.href;}
 products.push({id:'mq-'+p.id,sku,name,slug:'mq-'+p.id,description:p.descricao?.trim()||name,priceCents,stock:p.quantidade,active:priceCents>0,categorySlug:p.targetCategory,imageUrl,metadata:{source:'marquinho',compatibilidadePendente:true,sourceProductId:p.id,sourceSku:sku,sourceHash,categoria:p.targetCategory,marca:p.marca||'',tamanho:p.tamanho||'',cor:p.cor||'',compatibilidadeInformada:p.compatibilidade||'',imagemPendente:!imageUrl}});
}
await mkdir(new URL('../evidence/catalog-import/',import.meta.url),{recursive:true});
await writeFile(new URL('../evidence/catalog-import/plan.json',import.meta.url),JSON.stringify({sourceReadOnly:true,stockField:'quantidade',products},null,2));
console.log(JSON.stringify({planned:products.length,inactiveWithoutPrice:products.filter(p=>!p.active).length,missingImage:products.filter(p=>!p.imageUrl).length,sourceWrites:false}));
