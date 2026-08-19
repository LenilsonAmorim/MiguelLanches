
/* Correções da sacola */
function clearCartClient(){
  if(!cart.length) return;
  if(!confirm("Tem certeza que deseja limpar a sacola?")) return;
  cart = [];
  renderCart();
  if(typeof closeCart==="function") closeCart();
}
function backToProductsClient(){
  if(typeof closeCart==="function") closeCart();
  window.scrollTo({top:0,behavior:"smooth"});
}
const _clearCartBtn=document.getElementById("clearCart");
if(_clearCartBtn) _clearCartBtn.onclick=clearCartClient;
const _addMoreBtn=document.getElementById("addMore");
if(_addMoreBtn) _addMoreBtn.onclick=backToProductsClient;
