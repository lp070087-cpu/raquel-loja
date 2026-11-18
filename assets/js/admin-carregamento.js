import {esc} from './utils.js';

export function carregamentoPainel(label='Carregando a seção') {
  return `<div class="admin-loading" role="status" aria-live="polite" aria-label="${esc(label)}"><p>${esc(label)}…</p><div class="admin-card-grid" aria-hidden="true">${Array.from({length:4},()=>'<div class="admin-loading-card"><span></span><i></i><i></i><b></b></div>').join('')}</div></div>`;
}
