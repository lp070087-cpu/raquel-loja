import {api} from './api.js';
import {esc} from './utils.js';

export async function montarAcessosBalcao(root,employees){
  const box=document.createElement('section');box.className='admin-summary-panel admin-counter-access';root.querySelector('[data-list]').append(box);
  async function draw(){
    box.innerHTML='<p role="status">Consultando os acessos do balcão…</p>';
    try{
      const {terminals}=await api('/admin/terminals');
      box.innerHTML=`<h2>Acesso rápido do balcão</h2><p class="admin-section-note">Autorize cada computador da loja. Depois, o funcionário escolhe seu nome e digita o PIN individual. A senha da administração continua separada.</p><button type="button" class="btn btn--pequeno" data-enroll-terminal>Autorizar este computador</button><div class="admin-counter-people">${employees.filter(e=>e.role==='STAFF').map(e=>`<div><strong>${esc(e.name)}</strong><button class="btn btn--pequeno btn--contorno" data-set-pin="${esc(e.id)}">Definir PIN</button><button class="link-simples" data-remove-pin="${esc(e.id)}">Desativar PIN</button></div>`).join('')||'<p class="texto-2">Libere um funcionário para configurar o PIN.</p>'}</div><h3>Computadores autorizados</h3><div class="admin-counter-people">${terminals.map(t=>`<div><span>${esc(t.name)}<small>${t.revokedAt?'Revogado':`Válido até ${esc(new Date(t.expiresAt).toLocaleDateString('pt-BR'))}`}</small></span>${!t.revokedAt?`<button class="btn btn--pequeno btn--contorno" data-revoke-terminal="${esc(t.id)}">Revogar acesso</button>`:''}</div>`).join('')||'<p class="texto-2">Nenhum computador autorizado.</p>'}</div><div data-counter-editor></div>`;
    }catch(error){box.innerHTML=`<p role="alert">${esc(error.message)}</p>`;}
  }
  box.addEventListener('click',event=>{
    const target=event.target.closest('[data-enroll-terminal],[data-set-pin],[data-remove-pin],[data-revoke-terminal]');if(!target)return;
    const isPin=target.hasAttribute('data-set-pin'),enroll=target.hasAttribute('data-enroll-terminal');
    const path=enroll?'/admin/terminals':isPin||target.hasAttribute('data-remove-pin')?`/admin/employees/${encodeURIComponent(target.dataset.setPin||target.dataset.removePin)}/pin`:`/admin/terminals/${encodeURIComponent(target.dataset.revokeTerminal)}`;
    const title=enroll?'Autorizar este computador':isPin?'Definir PIN individual':target.hasAttribute('data-remove-pin')?'Desativar PIN':'Revogar computador';
    const slot=box.querySelector('[data-counter-editor]');
    slot.innerHTML=`<form class="admin-pin-form"><h3>${title}</h3>${enroll?'<label>Nome do computador<input class="entrada" name="name" required maxlength="80" placeholder="Ex.: Balcão 1"></label>':''}${isPin?'<label>PIN de 6 dígitos<input class="entrada" name="pin" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{6}" minlength="6" maxlength="6" required></label><label>Confirmar PIN<input class="entrada" name="confirmPin" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{6}" minlength="6" maxlength="6" required></label>':''}<label>Senha da administração<input class="entrada" name="currentPassword" type="password" autocomplete="current-password" required maxlength="128"></label><p role="status" data-counter-feedback></p><div class="admin-actions"><button class="btn btn--pequeno" type="submit">${title}</button><button class="btn btn--pequeno btn--contorno" type="button" data-counter-cancel>Cancelar</button></div></form>`;
    slot.querySelector('[data-counter-cancel]').addEventListener('click',()=>slot.replaceChildren());slot.querySelector('input').focus({preventScroll:true});
    slot.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget,feedback=form.querySelector('[data-counter-feedback]'),button=form.querySelector('[type="submit"]');if(!form.reportValidity())return;
      if(isPin&&form.elements.pin.value!==form.elements.confirmPin.value){feedback.textContent='Os PINs precisam ser iguais.';return;}
      button.disabled=true;feedback.textContent='Confirmando acesso…';
      try{await api(path,{method:enroll?'POST':isPin?'PUT':'DELETE',body:{currentPassword:form.elements.currentPassword.value,...(enroll?{name:form.elements.name.value.trim()}:{}),...(isPin?{pin:form.elements.pin.value}:{})}});form.reset();await draw();}
      catch(error){feedback.textContent=error.message;button.disabled=false;form.elements.currentPassword.value='';if(isPin){form.elements.pin.value='';form.elements.confirmPin.value='';}}
    });
  });await draw();
}

export function montarLoginBalcao(){
  const standard=document.querySelector('#form-login');if(!standard)return;
  const button=document.createElement('button');button.type='button';button.className='btn btn--contorno btn--bloco mt-3';button.textContent='Entrar com nome e PIN';standard.after(button);
  const box=document.createElement('div');button.after(box);
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
      const {terminal,employees}=await api('/counter/access');standard.hidden=true;button.hidden=true;
      box.innerHTML=`<p class="admin-section-note">Computador: ${esc(terminal.name)}. Escolha quem está atendendo.</p><form id="form-pin"><label>Atendente<select class="entrada" name="employeeId" aria-label="Atendente" required><option value="">Selecione seu nome</option>${employees.map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('')}</select></label><label>PIN individual<input class="entrada" name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="off" required></label><p role="status" data-pin-feedback></p><button class="btn btn--bloco" type="submit">Iniciar atendimento</button></form><button class="link-simples mt-3" type="button" data-standard-login>Entrar com e-mail e senha</button>`;
      box.querySelector('[data-standard-login]').addEventListener('click',()=>{box.replaceChildren();standard.hidden=false;button.hidden=false;});
      box.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,submit=form.querySelector('[type="submit"]'),feedback=form.querySelector('[data-pin-feedback]');if(!form.reportValidity())return;submit.disabled=true;feedback.textContent='Verificando PIN…';try{await api('/counter/login',{method:'POST',body:{employeeId:form.elements.employeeId.value,pin:form.elements.pin.value}});form.reset();location.replace('funcionario.html');}catch(error){form.elements.pin.value='';feedback.textContent=error.message;submit.disabled=false;}});
    }catch(error){box.innerHTML=`<p class="mensagem mensagem--erro" role="status">${esc(error.message)} A administradora pode autorizar este computador em Funcionários.</p>`;}
    finally{button.disabled=false;}
  });
  if(new URLSearchParams(location.search).get('modo')==='balcao')button.click();
}
