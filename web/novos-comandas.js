/* MIGUEL LANCHES - NOVOS PEDIDOS DENTRO DE COMANDAS
   Usa a mesma lista que já está funcionando em "Novo Pedido".
   Assim o pedido não é duplicado e os botões continuam funcionando.
*/
(function(){
  function montar(){
    const origem=document.getElementById("newOrdersBox");
    const cabecalho=document.querySelector("#page-comandas .page-head");
    if(!origem || !cabecalho) return;

    let box=document.getElementById("novosComandasBox");
    if(!box){
      box=document.createElement("div");
      box.id="novosComandasBox";
      box.className="novos-comandas";
      cabecalho.insertAdjacentElement("afterend",box);
    }

    const conteudo=origem.innerHTML.trim();

    if(!conteudo){
      box.innerHTML=`
        <div class="novos-comandas-head">
          <div>
            <h2>🆕 Novos pedidos</h2>
            <small>Pedidos aguardando sua confirmação</small>
          </div>
          <span class="novos-comandas-count">0</span>
        </div>
        <div class="novos-comandas-empty">Nenhum pedido novo.</div>`;
      return;
    }

    /* O new-orders.js já montou o pedido corretamente.
       Reaproveitamos exatamente o mesmo conteúdo e botões. */
    const temp=document.createElement("div");
    temp.innerHTML=conteudo;

    const cards=temp.querySelectorAll(".new-order-card");
    box.innerHTML=`
      <div class="novos-comandas-head">
        <div>
          <h2>🆕 Novos pedidos</h2>
          <small>Pedidos aguardando sua confirmação</small>
        </div>
        <span class="novos-comandas-count">${cards.length}</span>
      </div>
      <div class="novos-comandas-list"></div>`;

    const lista=box.querySelector(".novos-comandas-list");
    cards.forEach(card=>{
      /* Copia o card e mantém os onclick dos botões originais. */
      lista.appendChild(card.cloneNode(true));
    });
  }

  /* Atualiza rapidamente quando chega pedido novo. */
  setTimeout(montar,700);
  setInterval(montar,1500);

  /* Também tenta atualizar depois das funções do app. */
  const oldRenderAll=window.renderAll;
  if(typeof oldRenderAll==="function"){
    window.renderAll=function(){
      oldRenderAll.apply(this,arguments);
      setTimeout(montar,100);
      setTimeout(montar,500);
    };
  }
})();