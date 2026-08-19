/* MIGUEL LANCHES — CORREÇÃO FINAL SACOLA + CHECKOUT
   Este arquivo é carregado por último e assume o controle dos botões,
   sem depender dos onclicks anteriores.
*/
(() => {
  const $=id=>document.getElementById(id);

  function render(){
    if(typeof window.renderCart==="function") window.renderCart();
  }

  function getCart(){
    /* cart foi declarado como let no app.js e fica acessível neste script. */
    return window.__ML_CART_REF || (typeof cart!=="undefined" ? cart : null);
  }

  function setCart(next){
    if(typeof cart!=="undefined"){
      cart.length=0;
      next.forEach(x=>cart.push(x));
      return;
    }
    window.__ML_CART_REF=next;
  }

  function clear(){
    const c=getCart();
    if(!c)return;
    setCart([]);
    render();
  }

  function remove(key){
    const c=getCart();
    if(!c)return;
    setCart(c.filter(x=>String(x.key)!==String(key)));
    render();
  }

  function change(key,delta){
    const c=getCart();
    if(!c)return;
    const item=c.find(x=>String(x.key)===String(key));
    if(!item)return;
    item.quantidade=Math.max(0,Number(item.quantidade||1)+delta);
    if(item.quantidade===0) setCart(c.filter(x=>String(x.key)!==String(key)));
    render();
  }

  function closeCartSafe(){
    if(typeof window.closeCart==="function") window.closeCart();
    else {
      $("cart")?.classList.remove("open");
      $("overlay")?.classList.remove("open");
      document.body.style.overflow="";
    }
  }

  function openCheckoutSafe(){
    if(typeof window.continueOrder==="function") window.continueOrder();
    else $("checkout")?.classList.remove("hidden");
  }

  function showCustomer(method){
    const section=$("customerSection");
    const fields=$("deliveryFields");
    if(!section)return;
    section.classList.remove("hidden");
    if(fields) fields.classList.toggle("hidden",method==="retirada");
    if(window.mlCheckoutFix?.showCustomer) window.mlCheckoutFix.showCustomer(method);
  }

  function changeAddress(){
    const section=$("customerSection");
    const fields=$("deliveryFields");
    if(section) section.classList.remove("hidden");
    if(fields) fields.classList.remove("hidden");
    $("endereco")?.focus();
    if(window.mlCheckoutFix?.changeAddress) window.mlCheckoutFix.changeAddress();
  }

  document.addEventListener("click",e=>{
    const t=e.target?.closest?.("#clearCart");
    if(t){e.preventDefault();e.stopPropagation();clear();return;}

    const q=e.target?.closest?.(".cartItem .qty button");
    if(q){
      e.preventDefault();e.stopPropagation();
      const onclick=q.getAttribute("onclick")||"";
      let m=onclick.match(/qty\(['"]([^'"]+)['"],\s*(-?\d+)\)/);
      if(m){change(m[1],Number(m[2]));return;}
      m=onclick.match(/removeItem\(['"]([^'"]+)['"]\)/);
      if(m){remove(m[1]);return;}
    }

    const more=e.target?.closest?.("#addMore");
    if(more){e.preventDefault();e.stopPropagation();closeCartSafe();window.scrollTo({top:0,behavior:"smooth"});return;}

    const cont=e.target?.closest?.("#continueOrder");
    if(cont){e.preventDefault();e.stopPropagation();openCheckoutSafe();return;}

    const receive=e.target?.closest?.(".receive-option");
    if(receive){e.preventDefault();e.stopPropagation();showCustomer(receive.dataset.method||"entrega");return;}

    const swap=e.target?.closest?.("#changeAddress");
    if(swap){e.preventDefault();e.stopPropagation();changeAddress();return;}
  },true);

  /* Não deixa o checkout esconder os controles quando o cliente escolhe
     Entrega/Retirada. */
  const observer=new MutationObserver(()=>{
    const checkout=$("checkout");
    if(!checkout || checkout.classList.contains("hidden"))return;
    const saved=$("savedAddress");
    if(saved){
      let raw=null;
      try{raw=JSON.parse(localStorage.getItem("miguel_lanches_cliente_v1")||"null")}catch{}
      const has=!!(raw && (String(raw.endereco||"").trim()||String(raw.bairro||"").trim()));
      saved.classList.toggle("hidden",!has);
      if(has){
        const text=$("savedAddressText");
        if(text) text.textContent=[raw.bairro,raw.endereco,raw.referencia].filter(Boolean).join(" • ");
      }
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});

  window.mlFinalCartCheckoutFix={clear,remove,change};
})();