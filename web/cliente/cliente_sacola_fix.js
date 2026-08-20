/* Miguel Lanches — correção da sacola
   cliente_opcoes.js usa closeCart() depois de cart.push().
   Este arquivo garante que a função exista e feche apenas a gaveta,
   sem apagar os itens recém-adicionados.
*/
(function(){
  function closeBag(){
    const drawer=document.getElementById("cartDrawer");
    const shade=document.getElementById("shade");
    if(drawer){
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden","true");
    }
    if(shade) shade.classList.remove("open");
  }

  // Garante que a chamada feita por addGeneric()/addCurrent()
  // nunca interrompa a inclusão do item.
  window.closeCart = closeBag;

  document.getElementById("closeCart")?.addEventListener("click",closeBag);
  document.getElementById("openCart")?.addEventListener("click",function(){
    const drawer=document.getElementById("cartDrawer");
    const shade=document.getElementById("shade");
    if(drawer){
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden","false");
    }
    if(shade) shade.classList.add("open");
  });
})();
