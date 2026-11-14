import {LOJA} from './dados.js';
import {api} from './api.js';
let carregamento;
/** Only public, allowlisted store information. Credentials never reach this API. */
export function carregarLoja() {
 if(carregamento)return carregamento;
 carregamento=(async()=>{
  try {
   const {settings}=await api('/store');
   if(!settings||typeof settings!=='object')return false;
   const has=key=>typeof settings[key]==='string'&&settings[key].trim();
   if(has('name'))LOJA.nome=settings.name;
   if(has('email'))LOJA.email=settings.email;
   if(has('phone')){const digits=settings.phone.replace(/\D/g,'');if(digits.length>=10&&digits.length<=15){LOJA.whatsapp=digits.length<=11?'55'+digits:digits;LOJA.whatsappExibicao=settings.phone;}}
   for(const [key,target] of Object.entries({address:'rua',neighborhood:'bairro',city:'cidade',state:'estado',zipCode:'cep'}))if(has(key))LOJA.endereco[target]=settings[key];
   if(has('city'))LOJA.cidade=settings.city;
   if(has('state'))LOJA.estado=settings.state;
   if(has('openingHours'))LOJA.horario=[{dia:'Atendimento',hora:settings.openingHours}];
   document.documentElement.dataset.loja='servidor';return true;
  } catch {document.documentElement.dataset.loja='padrao';return false;}
 })();
 return carregamento;
}
