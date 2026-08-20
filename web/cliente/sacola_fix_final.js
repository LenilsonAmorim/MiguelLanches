/* Miguel Lanches — correção final da sacola.
   Usa a sacola existente; não cria outra função de pedidos.
*/
(function(){
  const $=id=>document.getElementById(id);
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

  function getCart(){return Array.isArray(window.cart)?window.cart:[]}
  function total(){return getCart().reduce((s,x)=>s+Number(x.preco||0)*Number(x.quantidade||0),0)}
  function count(){return getCart().reduce((s,x)=>s+Number(x.quantidade||0),0)}

  function renderBag(){
    const c=count(), t=total(), bar=$('bagBar');
    if(bar)bar.classList.toggle('empty',c===0);
    if($('bagText'))$('bagText').textContent=c?`${c} ${c===1?'item':'itens'} na sacola`:'Sua sacola está vazia';
    if($('bagTotal'))$('bagTotal').textContent=money(t);
    if($('cartSubtotal'))$('cartSubtotal').textContent=money(t);
    if($('checkoutTotal'))$('checkoutTotal').textContent=money(t);
  }

  function openCart(){
    $('shade')?.classList.add('open');
    $('cartDrawer')?.classList.add('open');
    $('cartDrawer')?.setAttribute('aria-hidden','false');
    renderBag();
  }
  function closeCart(){
    $('shade')?.classList.remove('open');
    $('cartDrawer')?.classList.remove('open');
    $('cartDrawer')?.setAttribute('aria-hidden','true');
  }
  window.openCart=openCart;
  window.closeCart=closeCart;

  function bind(){
    $('openCart')?.addEventListener('click',openCart);
    $('closeCart')?.addEventListener('click',closeCart);
    $('shade')?.addEventListener('click',closeCart);
    $('addMoreItems')?.addEventListener('click',closeCart);
    renderBag();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();

  const oldRender=window.renderCart;
  window.renderCart=function(){
    if(typeof oldRender==='function')oldRender();
    renderBag();
  };

  // Impede a página principal de acompanhar o gesto enquanto a gaveta/modal está rolando.
  document.addEventListener('touchmove',e=>{
    if($('cartDrawer')?.classList.contains('open')){
      if(e.target.closest('#cartDrawer'))return;
      e.preventDefault();
    }
  },{passive:false});
})();
