import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),backend=new URL('backend/',root),require=createRequire(new URL('backend/package.json',root));
const {parse}=require('dotenv'),{PrismaClient}=require('@prisma/client');
const report={productionWrites:false,mode:'plan',migrations:[]};let db;
try{
 const config=JSON.parse(await readFile(new URL('config/deployment.json',root),'utf8')),env=parse(await readFile(new URL('backend/.env',root),'utf8'));
 const catalog=await import(new URL('assets/js/dados.js',root).href);
 const products=catalog.PRODUTOS;
 if(products.length!==23||products.some(p=>!Number.isFinite(p.preco)||p.preco<0||!Number.isInteger(p.estoque)||p.estoque<0))throw new Error('ORIGINAL_CATALOG_REQUIRES_REVIEW');
 report.originalCatalogProducts=products.length;report.originalCatalogCategories=catalog.CATEGORIAS.length;report.catalogValuesNeedBusinessConfirmation=true;
 const url=new URL(env.DATABASE_URL);url.hostname=url.hostname.replace(/-pooler(?=\.)/,'');url.searchParams.set('connect_timeout','10');
 db=new PrismaClient({datasourceUrl:url.href,errorFormat:'minimal'});
 const identity=await db.$queryRaw`SELECT current_setting('neon.branch_id',true) AS id`;if(identity[0]?.id!==config.productionBranchId)throw new Error('WRONG_PRODUCTION_BRANCH');
 const tables=await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;
 report.existingTables=tables.length;if(tables.length)throw new Error('INITIALIZATION_REQUIRES_EMPTY_DATABASE');
 const folders=(await readdir(new URL('prisma/migrations/',backend),{withFileTypes:true})).filter(d=>d.isDirectory()).map(d=>d.name).sort();
 const expected=['20261027180000_initial','20261027180100_constraints','20261028180000_pickup_codes','20261028210000_counter_payment','20261029010000_admin_management'];
 if(JSON.stringify(folders)!==JSON.stringify(expected))throw new Error('MIGRATIONS_REQUIRE_NEW_REVIEW');
 for(const name of folders){
  const source=await readFile(new URL('prisma/migrations/'+name+'/migration.sql',backend),'utf8'),sql=source.replace(/--[^\n]*/g,'');
  if(/\b(DROP\s+(TABLE|SCHEMA|DATABASE|TYPE|COLUMN|INDEX)|TRUNCATE|DELETE\s+FROM)\b/i.test(sql))throw new Error('DESTRUCTIVE_SQL_BLOCKED');
  report.migrations.push({name,sha256:createHash('sha256').update(source).digest('hex')});
 }
 report.emptyDatabaseConfirmed=true;report.dataCopiedFromTesting=false;report.testAccountsCreated=false;report.catalogSeeded=false;
 await db.$disconnect();db=undefined;
 if(process.argv.includes('--apply-production')){
  if(!process.argv.includes('--confirm-initialize-empty-production'))throw new Error('EXPLICIT_PRODUCTION_CONFIRMATION_REQUIRED');
  const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{cwd:fileURLToPath(backend),encoding:'utf8',env:{...process.env,DATABASE_URL:url.href}});
  report.mode='apply';report.productionWrites=true;report.migrationExitCode=result.status;report.rawOutputSuppressed=true;if(result.status!==0)throw new Error('PRODUCTION_MIGRATION_FAILED');
  if(process.argv.includes('--with-catalog')){
   db=new PrismaClient({datasourceUrl:url.href,errorFormat:'minimal'});
   await db.$transaction(async tx=>{
    const categories=new Map();
    for(const c of catalog.CATEGORIAS){const saved=await tx.category.upsert({where:{slug:c.slug},create:{slug:c.slug,name:c.nome},update:{}});categories.set(c.slug,saved.id);}
    for(const p of products){
     if(await tx.product.findUnique({where:{id:p.id}}))continue;
     const metadata=JSON.parse(JSON.stringify(p));delete metadata.custo;delete metadata.estoqueMinimo;
     await tx.product.create({data:{id:p.id,slug:p.id,sku:p.sku,name:p.nome,description:p.descricao||'',priceCents:Math.round(p.preco*100),stock:p.estoque,metadata,categoryId:categories.get(p.categoria)||null,images:{create:[...new Set(p.fotos?.length?p.fotos:[p.foto])].map((imageUrl,position)=>({imageUrl,position}))},compatibilities:{create:(p.compat||[]).map(c=>({brand:c.marca,model:c.modelo,version:c.versao||null,yearFrom:c.anoInicio,yearTo:c.anoFim}))}}});
    }
   },{timeout:60000});report.catalogSeeded=true;report.couponsImported=false;report.accountsImported=false;report.ordersImported=false;
  }
 }
}catch(error){const code=String(error.message||'');report.error=/^[A-Z0-9_]+$/.test(code)?code:'PRODUCTION_PREFLIGHT_FAILED';process.exitCode=1;}
finally{await db?.$disconnect();}
await mkdir(new URL('evidence/deployment/',root),{recursive:true});await writeFile(new URL('evidence/deployment/production-plan.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
