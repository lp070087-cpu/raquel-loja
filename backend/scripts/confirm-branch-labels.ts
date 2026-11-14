import { readFile,writeFile } from 'node:fs/promises';
let text=await readFile('.env','utf8');
for(const [name,value] of [['DATABASE_BRANCH','production'],['TEST_DATABASE_BRANCH','testing']]) {
  const pattern=new RegExp('^'+name+'=.*$','m');
  text=pattern.test(text)?text.replace(pattern,name+'='+value):text.trimEnd()+'\n'+name+'='+value+'\n';
}
await writeFile('.env',text);
console.log('Only non-secret branch labels updated from explicit user confirmation; connection values preserved.');
