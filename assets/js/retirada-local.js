import {LOJA,enderecoEmLinha} from './dados.js';
import {esc} from './utils.js';
export function localRetirada(){
 const confirmed=LOJA.enderecoConfirmado===true;
 const address=confirmed?enderecoEmLinha(LOJA):'';
 return `<section class="retirada-local"><h3>Como chegar à loja</h3><p>${confirmed?esc(address):'O endereço definitivo será confirmado pela loja. Os dados atuais são de demonstração; confirme o local antes de se deslocar.'}</p>${confirmed?`<a class="btn btn--pequeno btn--contorno" href="${esc('https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(address))}" target="_blank" rel="noopener noreferrer">Abrir rota no mapa</a>`:''}</section>`;
}
