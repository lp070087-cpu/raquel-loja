import {createHash} from 'node:crypto';
import {ApiError} from './domain.js';
export function jpegUpload(value:string){
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw new ApiError(400,'INVALID_JPEG','Selecione uma imagem JPG válida.');
 const bytes=Buffer.from(value,'base64');
 if(bytes.length>524288)throw new ApiError(413,'IMAGE_TOO_LARGE','A foto deve ter até 512 KB após otimização.');
 if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw new ApiError(400,'INVALID_JPEG','O arquivo precisa ser uma imagem JPG.');
 let width=0,height=0,pos=2;
 while(pos+4<bytes.length){
   if(bytes[pos++]!==255)break;while(bytes[pos]===255)pos++;
   const marker=bytes[pos++];if(marker===218||marker===217)break;
   if(marker===216||marker===1||marker>=208&&marker<=215)continue;
   const length=bytes.readUInt16BE(pos);if(length<2||pos+length>bytes.length)break;
   if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=8){height=bytes.readUInt16BE(pos+3);width=bytes.readUInt16BE(pos+5);break;}
   pos+=length;
 }
 if(!width||!height||width>1600||height>1600)throw new ApiError(400,'INVALID_IMAGE_DIMENSIONS','Use uma foto de até 1600 pixels em cada lado.');
 return {id:createHash('sha256').update(bytes).digest('hex'),content:new Uint8Array(bytes)};
}
