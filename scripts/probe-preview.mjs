import {readFile,writeFile,mkdir} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../config/deployment.json',import.meta.url),'utf8'));
const auth=JSON.parse(await readFile(process.env.APPDATA+'/com.vercel.cli/Data/auth.json','utf8'));
const base=new URL(process.argv[2]);
if(!base.hostname.startsWith('raquel-loja-ew91-')||!base.hostname.endsWith('.vercel.app'))throw new Error('PREVIEW_HOST_REQUIRED');
const project=await(await fetch('https://api.vercel.com/v9/projects/'+config.vercelProjectId+'?teamId='+config.vercelTeamId,{headers:{Authorization:'Bearer '+auth.token}})).json();
const secret=Object.entries(project.protectionBypass||{}).find(([,value])=>value.scope==='automation-bypass')?.[0];
if(!secret)throw new Error('AUTHENTICATED_PREVIEW_REQUIRED');
const checks=[];
for(const [path,expected]of [['/api/health',200],['/api/products',200],['/api/admin/products',401],['/backend/.env',404],['/backend/src/app.ts',404],['/config/deployment.json',404]]){
 const response=await fetch(new URL(path,base),{headers:{'x-vercel-protection-bypass':secret},redirect:'manual',signal:AbortSignal.timeout(30000)});
 let data={};try{data=await response.json();}catch{}
 checks.push({path,status:response.status,expected,...(path==='/api/health'?{databaseConnected:data.database==='connected',emailConfigured:data.emailConfigured}:{}),...(path==='/api/products'?{products:data.products?.length}:{}),...(data.error?{error:data.error}:{})});
}
const report={previewUrl:base.origin,passed:checks.every(c=>c.status===c.expected),productionWrites:false,checks};
await mkdir('evidence/deployment',{recursive:true});await writeFile('evidence/deployment/preview-probe.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
