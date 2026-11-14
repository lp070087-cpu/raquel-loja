import ts from 'typescript';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
for(const folder of ['src','prisma','tests','scripts'])for(const entry of readdirSync(folder,{withFileTypes:true})){
 if(!entry.isFile()||!entry.name.endsWith('.ts'))continue;
 const path=join(folder,entry.name);const source=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const result=ts.transform(source,[(context)=>{
  const visit=(node)=>{const updated=ts.visitEachChild(node,visit,context);if(ts.isBlock(updated))return ts.factory.createBlock(updated.statements,true);if(ts.isObjectLiteralExpression(updated)&&updated.properties.length>1)return ts.factory.createObjectLiteralExpression(updated.properties,true);return updated;};
  return root=>ts.visitNode(root,visit);
 }]);
 writeFileSync(path,printer.printFile(result.transformed[0]));result.dispose();
}
