/* Miguel Lanches - quadro de pedidos com arrastar e soltar */
(function(){
  const statusNames={novo:"Novos",preparo:"Preparando",entrega:"Rota de entrega",entregue:"Entregues",cancelado:"Cancelados"};
  const nextStatus={novo:"preparo",preparo:"entrega",entrega:"entregue"};

  function install(){
    const board=document.getElementById("orders");
    if(!board) return;
    board.querySelectorAll(".column").forEach((col,i)=>{
      const status=["novo","preparo","entrega","entregue","cancelado"][i];
      col.dataset.status=status;
      col.classList.add("drop-column");
      const h=col.querySelector("h2");
      if(h && h.firstChild) h.firstChild.textContent=statusNames[status];
      col.addEventListener("dragover",e=>{e.preventDefault();col.classList.add("drag-over");});
      col.addEventListener("dragleave",()=>col.classList.remove("drag-over"));
      col.addEventListener("drop",async e=>{
        e.preventDefault();col.classList.remove("drag-over");
        const id=e.dataTransfer?.getData("text/plain");
        if(!id)return;
        await moveOrder(id,status);
      });
    });

    board.querySelectorAll(".order").forEach(card=>{
      const id=(card.querySelector("[data-next]")||card.querySelector("[data-print]"))?.dataset.next
        || card.querySelector("[data-print]")?.dataset.print;
      if(!id)return;
      card.draggable=true;
      card.classList.add("draggable-order");
      card.addEventListener("dragstart",e=>{
        e.dataTransfer.setData("text/plain",String(id));
        e.dataTransfer.effectAllowed="move";
        card.classList.add("dragging");
      });
      card.addEventListener("dragend",()=>card.classList.remove("dragging"));

      const current=statusOf(orders.find(o=>String(o.id)===String(id))?.observacoes);
      const target=nextStatus[current];
      if(target){
        const btn=document.createElement("button");
        btn.type="button";
        btn.className="drag-next";
        btn.textContent="→ "+statusNames[target];
        btn.onclick=()=>moveOrder(id,target);
        card.querySelector(".actions")?.appendChild(btn);
      }
    });
  }

  async function moveOrder(id,target){
    const o=orders.find(x=>String(x.id)===String(id));
    if(!o)return;
    const current=statusOf(o.observacoes);
    if(current===target)return;
    if(target==="cancelado" && !confirm("Cancelar este pedido?"))return;
    const clean=String(o.observacoes||"").replace(/\n?\[ML_STATUS\].*?\[\/ML_STATUS\]/,"");
    const obs=clean+`\n[ML_STATUS]${target}[/ML_STATUS]`;
    const r=await db.from("pedidos").update({observacoes:obs}).eq("id",o.id);
    if(r.error)toast(r.error.message);
    else{toast("Pedido movido para "+statusNames[target]);load();}
  }

  /* Substitui o renderOrders apenas para reinstalar o comportamento depois de cada atualização. */
  const originalRenderOrders=window.renderOrders;
  if(typeof originalRenderOrders==="function"){
    window.renderOrders=function(){
      originalRenderOrders();
      setTimeout(install,0);
    };
  }

  /* Se o admin já renderizou antes deste script carregar. */
  setTimeout(install,50);

  const style=document.createElement("style");
  style.textContent=`
    .drop-column{transition:.15s ease;outline:2px solid transparent}
    .drop-column.drag-over{outline-color:#f4bd17;background:#fff4c7}
    .draggable-order{cursor:grab}
    .draggable-order.dragging{opacity:.45;transform:scale(.98)}
    .drag-next{border:0!important;background:#111!important;color:#fff!important;border-radius:8px;padding:8px 9px;font-size:11px;font-weight:900}
    .column:before{content:"Arraste pedidos para cá";display:block;font-size:10px;color:#999;margin:0 5px 8px}
  `;
  document.head.appendChild(style);
})();
