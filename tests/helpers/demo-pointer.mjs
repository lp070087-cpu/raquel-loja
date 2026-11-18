export async function ponteiroDemonstracao(page){
  if(process.env.RAQUEL_DEMO_VISIBLE!=='1')return;
  await page.addInitScript(()=>{
    document.addEventListener('DOMContentLoaded',()=>{
      const cursor=document.createElement('div');cursor.setAttribute('aria-hidden','true');
      Object.assign(cursor.style,{position:'fixed',left:'0',top:'0',width:'22px',height:'22px',border:'3px solid #ffcc00',background:'#0c142544',borderRadius:'50%',pointerEvents:'none',zIndex:'2147483647',boxShadow:'0 0 0 2px #0c1425',transform:'translate(-50%,-50%)',display:'none'});document.body.append(cursor);
      document.addEventListener('mousemove',event=>{cursor.style.display='block';cursor.style.left=event.clientX+'px';cursor.style.top=event.clientY+'px';},true);
      document.addEventListener('mousedown',()=>{cursor.style.background='#ffcc00';cursor.style.width=cursor.style.height='30px';},true);
      document.addEventListener('mouseup',()=>{cursor.style.background='#0c142544';cursor.style.width=cursor.style.height='22px';},true);
    });
  });
}
