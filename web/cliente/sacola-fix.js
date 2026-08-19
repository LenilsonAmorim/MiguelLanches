/* Miguel Lanches — correção definitiva da sacola
   Este arquivo deve ser carregado DEPOIS do app.js.
   Não depende de onclick inline para os controles da sacola.
*/
(function(){
  function byId(id){return document.getElementById(id)}
  function redraw(){ if(typeof window.renderCart==='function') window.renderCart(); }
  function close(){ if(typeof window.closeCart==='function') window.closeCart(); }

  function getCart(){
    // app.js usa `let cart` no escopo global. A função abaixo é executada
    // no mesmo ambiente global e consegue acessar essa variável.
    try { return cart; } catch(e) { return null; }
  }
  function setCart(next){
    try { cart = next; return true; } catch(e) { return false; }
  }

  document.addEventListener('click', function(e){
    const target=e.target;
    const clear=target && target.closest ? target.closest('#clearCart') : null;
    if(clear){
      e.preventDefault(); e.stopPropagation();
      const c=getCart();
      if(Array.isArray(c)) c.splice(0,c.length);
      redraw();
      return;
    }

    const more=target && target.closest ? target.closest('#addMore') : null;
    if(more){
      e.preventDefault(); e.stopPropagation();
      close();
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }

    const button=target && target.closest ? target.closest('#cartItems .qty button') : null;
    if(!button) return;
    e.preventDefault(); e.stopPropagation();

    const c=getCart();
    if(!Array.isArray(c)) return;

    const itemEl=button.closest('.cartItem');
    if(!itemEl) return;
    const buttons=itemEl.querySelectorAll('.qty button');
    const idx=Array.prototype.indexOf.call(buttons,button);

    // Primeiro botão = diminuir; segundo = aumentar; último = excluir.
    // A chave do item é extraída do onclick gerado pelo app atual.
    const controls=itemEl.querySelectorAll('.qty button');
    let key=null;
    for(const b of controls){
      const oc=b.getAttribute('onclick')||'';
      const m=oc.match(/(?:qty|removeItem)\\(['\"]([^'\"]+)/);
      if(m){key=m[1];break;}
    }
    if(!key) return;

    const pos=c.findIndex(x=>String(x.key)===String(key));
    if(pos<0) return;

    if(idx===controls.length-1){
      c.splice(pos,1);
    }else if(idx===0){
      c[pos].quantidade=Number(c[pos].quantidade||1)-1;
      if(c[pos].quantidade<1)c.splice(pos,1);
    }else{
      c[pos].quantidade=Number(c[pos].quantidade||1)+1;
    }
    redraw();
  }, true);

  // Também substitui as ações diretas do app.js pelos handlers robustos.
  function bind(){
    const clear=byId('clearCart');
    if(clear){ clear.onclick=function(e){e.preventDefault();const c=getCart();if(Array.isArray(c))c.splice(0,c.length);redraw();}; }
    const more=byId('addMore');
    if(more){ more.onclick=function(e){e.preventDefault();close();window.scrollTo({top:0,behavior:'smooth'});}; }
  }
  bind();
  new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
})();
