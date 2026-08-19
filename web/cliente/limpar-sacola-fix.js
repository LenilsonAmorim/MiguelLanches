/* Miguel Lanches — correção do botão LIMPAR SACOLA */
(() => {
  function clearClientCart(){
    if(!Array.isArray(window.cart)) return;
    if(window.cart.length && !confirm("Tem certeza que deseja limpar a sacola?")) return;

    window.cart.length = 0;

    // Atualiza a interface usando a função já existente no app.js.
    if(typeof window.renderCart === "function") window.renderCart();

    // Garante os principais contadores/valores zerados caso o render atual não os atualize.
    const ids = {
      cartCount:"0",
      cartItemCount:"0 itens",
      subtotal:"R$ 0,00",
      deliveryFee:"R$ 0,00",
      total:"R$ 0,00",
      bottomCartTotal:"R$ 0,00",
      cartCountBottom:"0",
      viewCartCount:"0 itens",
      viewCartTotal:"R$ 0,00",
      checkoutSubtotal:"R$ 0,00",
      checkoutFee:"R$ 0,00",
      checkoutTotal:"R$ 0,00"
    };
    Object.entries(ids).forEach(([id,value])=>{
      const el=document.getElementById(id);
      if(el) el.textContent=value;
    });
  }

  function bind(){
    const btn=document.getElementById("clearCart");
    if(!btn || btn.dataset.mlClearBound==="1") return;
    btn.dataset.mlClearBound="1";
    btn.addEventListener("click", clearClientCart);
  }

  new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
  setTimeout(bind,100);
  setTimeout(bind,500);
})();
