import {api} from './api.js';
import {esc} from './utils.js';
export function camposFotos(urls=[],multiple=true){return `<fieldset class="admin-span admin-fotos"><legend>${multiple?'Fotos do produto':'Imagem da categoria'}</legend><label>Selecionar ${multiple?'fotos JPG':'foto JPG'}<input class="entrada" type="file" name="photoFiles" accept="image/jpeg,.jpg,.jpeg" ${multiple?'multiple':''}></label><p class="micro texto-2">Arquivo JPG de até 8 MB. A imagem será reduzida sem deformar e otimizada antes de salvar.</p><div class="admin-photo-preview">${urls.map(url=>`<img src="${esc(url.startsWith('public/')?'../'+url:url)}" alt="Foto cadastrada" loading="lazy">`).join('')}</div><textarea name="imageValues" hidden>${esc(urls.join('\n'))}</textarea></fieldset>`;}
async function optimize(file){
 if(file.type!=='image/jpeg'||file.size>8*1024*1024)throw new Error('Selecione uma foto JPG de até 8 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  const ratio=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  let blob;for(const quality of [.85,.7,.55]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size<=524288)break;}
  canvas.width=canvas.height=0;if(!blob||blob.size>524288)throw new Error('Esta foto ainda está muito grande. Selecione outra imagem.');
  return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Não foi possível ler a foto.'));reader.readAsDataURL(blob);});
 }finally{bitmap.close();}
}
export async function enviarFotos(form,multiple=true){
 const existing=form.elements.imageValues.value.split('\n').filter(Boolean),files=[...form.elements.photoFiles.files];
 if(files.length>(multiple?10:1)||multiple&&existing.length+files.length>20)throw new Error('Limite de fotos excedido.');
 const urls=[];for(const file of files){const base64=await optimize(file);const result=await api('/admin/media',{method:'POST',body:{base64}});urls.push(result.imageUrl);}
 return multiple?[...existing,...urls]:urls.length?urls:[...existing];
}
