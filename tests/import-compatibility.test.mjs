import test from 'node:test';
import assert from 'node:assert/strict';
import {ehUniversal,produtoServeEm} from '../assets/js/dados.js';
test('imported products without verified applications never become universal',()=>{
 const imported={compat:[],compatibilidadePendente:true};
 assert.equal(ehUniversal(imported),false);assert.equal(produtoServeEm(imported,{marca:'Honda',modelo:'CG 160',ano:2024}),false);
 assert.equal(ehUniversal({compat:[]}),true);
});
