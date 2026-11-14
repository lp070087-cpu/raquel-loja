import {describe,it,expect} from 'vitest';
import {isPrivilegedPanelFixture} from '../scripts/panel-fixture-selector.js';

const prefix='admin-browser-1793220000000-a1b2c';
const identity=(kind:string,name:string,role:string)=>({email:`${prefix}-${kind}@example.test`,name,role});

describe('controlled panel fixture privilege retirement',()=>{
 it.each([
  ['admin','Administradora de teste','ADMIN'],
  ['staff','Funcionário de teste','STAFF'],
  ['customer','Cliente de teste','STAFF']
 ])('accepts the exact temporary %s identity',(kind,name,role)=>{
  expect(isPrivilegedPanelFixture(identity(kind,name,role))).toBe(true);
  expect(isPrivilegedPanelFixture(identity(kind,name,role),prefix)).toBe(true);
 });
 it.each([
  ['customer','Cliente de teste','CUSTOMER'],
  ['customer','Cliente de teste','ADMIN'],
  ['staff','Funcionário de teste','ADMIN'],
  ['admin','Administradora de teste','STAFF'],
  ['customer','Cliente real','STAFF'],
  ['staff','Cliente de teste','STAFF'],
  ['admin','Administradora real','ADMIN']
 ])('rejects mismatched identity %s/%s/%s',(kind,name,role)=>{
  expect(isPrivilegedPanelFixture(identity(kind,name,role))).toBe(false);
 });
 it.each([
  'cliente@example.test',
  `${prefix}-customer@example.com`,
  `${prefix}-customer@example.test.evil`,
  `${prefix}-customer@example.test\n`,
  'admin-browser-not-a-timestamp-a1b2c-customer@example.test',
  'admin-browser-1793220000000-a_b-customer@example.test'
 ])('rejects an unrelated or malformed email',(email)=>{
  expect(isPrivilegedPanelFixture({email,name:'Cliente de teste',role:'STAFF'})).toBe(false);
 });
 it('requires an exact optional prefix, including validation',()=>{
  const customer=identity('customer','Cliente de teste','STAFF');
  expect(isPrivilegedPanelFixture(customer,prefix+'x')).toBe(false);
  expect(isPrivilegedPanelFixture(customer,'')).toBe(false);
  expect(isPrivilegedPanelFixture(customer,'admin-browser-')).toBe(false);
 });
 it.each(['a1b2c','a_b-c','_____','-----'])('accepts the exact generated counter STAFF identity %s',(suffix)=>{
  expect(isPrivilegedPanelFixture({email:`counter-browser-1793220000000-${suffix}@example.test`,name:'Atendente Teste',role:'STAFF'})).toBe(true);
 });
 it.each([
  ['counter-browser-1793220000000-a1b2c@example.test','Atendente Teste','ADMIN'],
  ['counter-browser-1793220000000-a1b2c@example.test','Atendente Teste','CUSTOMER'],
  ['counter-browser-1793220000000-a1b2c@example.test','Atendente Real','STAFF'],
  ['counter-browser-1793220000000-abcd@example.test','Atendente Teste','STAFF'],
  ['counter-browser-1793220000000-abcdef@example.test','Atendente Teste','STAFF'],
  ['counter-browser-1793220000000-A1b2c@example.test','Atendente Teste','STAFF'],
  ['counter-browser-no-a1b2c@example.test','Atendente Teste','STAFF'],
  ['counter-browser-1793220000000-a1b2c@example.test.evil','Atendente Teste','STAFF'],
  ['counter-browser-1793220000000-a1b2c@example.test\n','Atendente Teste','STAFF'],
  ['other-browser-1793220000000-a1b2c@example.test','Atendente Teste','STAFF']
 ])('rejects an unrelated counter identity',(email,name,role)=>{
  expect(isPrivilegedPanelFixture({email,name,role})).toBe(false);
 });
 it('never selects counter fixtures when an admin prefix was specified',()=>{
  const counter={email:'counter-browser-1793220000000-a1b2c@example.test',name:'Atendente Teste',role:'STAFF'};
  expect(isPrivilegedPanelFixture(counter,prefix)).toBe(false);
  expect(isPrivilegedPanelFixture(counter,'')).toBe(false);
 });
});
