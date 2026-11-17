import {cp,mkdir,readdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),output=new URL('../dist-public/',import.meta.url);
await mkdir(output,{recursive:true});
for(const folder of ['assets','public','admin'])await cp(new URL(folder+'/',root),new URL(folder+'/',output),{recursive:true});
for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith('.html'))await cp(new URL(entry.name,root),new URL(entry.name,output));
console.log('Static storefront built from allowlisted HTML, assets, public and admin only.');
