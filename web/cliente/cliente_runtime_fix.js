/* Miguel Lanches - correções de integração do cliente */
(function(){
  "use strict";

  // Garante que as opções possam criar itens sem depender de uma função
  // uid() que não existe nas versões antigas.
  window.uid = window.uid || function(){
    return (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString(36)+Math.random().toString(36).slice(2);
  };

  // O acompanhamento usa ml_last_order_id. O checkout antigo grava os dados
  // com outro nome; sincronizamos as duas chaves.
  function syncLastOrder(){
    try{
      const raw=localStorage.getItem("miguel_lanches_ultimo_pedido");
      if(!raw)return;
      const data=JSON.parse(raw);
      if(data && data.id!=null){
        localStorage.setItem("ml_last_order_id",String(data.id));
      }
    }catch(e){}
  }

  syncLastOrder();

  const originalSend=window.sendOrder;
  if(typeof originalSend==="function"){
    window.sendOrder=async function(){
      const result=await originalSend.apply(this,arguments);
      syncLastOrder();
      return result;
    };
  }

  // Se o pedido for criado depois da instalação deste patch, observe a
  // mudança do número do pedido e sincronize novamente.
  const observer=new MutationObserver(syncLastOrder);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});

  // Mantém a sacola acima do rodapé mesmo se outro CSS tentar sobrescrever.
  const style=document.createElement("style");
  style.textContent="#bagBar{bottom:82px!important;z-index:650!important}";
  document.head.appendChild(style);
})();
