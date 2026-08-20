(function(){
  const FLOW=[
    ["novo","Novos"],
    ["preparo","Preparando"],
    ["entrega","Rota de entrega"],
    ["entregue","Entregues"],
    ["cancelado","Cancelados"]
  ];

  function renderFlow(){
    const tabs=document.getElementById("statusTabs");
    const board=document.getElementById("orders");
    if(!tabs||!board)return;

    tabs.innerHTML=FLOW.map(([status,label],i)=>{
      const count=(window.orders||[]).filter(o=>statusOf(o.observacoes)===status).length;
      return `<button class="status-tab ${i===0?"active":""}" type="button" data-scroll-status="${status}">
        ${label}<small>${count}</small>
      </button>`;
    }).join("");

    board.innerHTML=FLOW.map(([status,label])=>{
      const arr=(window.orders||[]).filter(o=>statusOf(o.observacoes)===status);
      return `<div class="column" data-drop-status="${status}">
        <h2>${label}<small>${arr.length}</small></h2>
        ${arr.map(orderCard).join("")||"<p class='muted'>Nenhum pedido.</p>"}
      </div>`;
    }).join("");

    bindFlow();
  }

  async function moveOrder(id,status){
    const o=(window.orders||[]).find(x=>String(x.id)===String(id));
    if(!o)return;
    if(status==="cancelado"&&!confirm("Cancelar este pedido?"))return;

    const clean=String(o.observacoes||"").replace(/\n?\[ML_STATUS\].*?\[\/ML_STATUS\]/,"");
    const obs=clean+`\n[ML_STATUS]${status}[/ML_STATUS]`;
    const r=await db.from("pedidos").update({observacoes:obs}).eq("id",o.id);

    if(r.error)toast(r.error.message);
    else{
      toast("Pedido movido para "+statusLabel(status));
      load();
    }
  }

  function bindFlow(){
    document.querySelectorAll("[data-scroll-status]").forEach(btn=>{
      btn.onclick=()=>{
        document.querySelectorAll(".status-tab").forEach(x=>x.classList.remove("active"));
        btn.classList.add("active");
        const col=document.querySelector(`[data-drop-status="${btn.dataset.scrollStatus}"]`);
        col?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
      };
    });

    document.querySelectorAll(".order").forEach(card=>{
      card.draggable=true;

      card.addEventListener("dragstart",e=>{
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed="move";
        e.dataTransfer.setData("text/plain",card.querySelector("h3")?.textContent?.replace(/^Pedido #/,"")||"");
        card.dataset.dragId=(window.orders||[]).find(o=>{
          const text=String(o.id).slice(-5);
          return text===e.dataTransfer.getData("text/plain");
        })?.id||"";
      });

      card.addEventListener("dragend",()=>{
        card.classList.remove("dragging");
        document.querySelectorAll(".column").forEach(c=>c.classList.remove("drop-ready"));
      });

      // No celular, toque no botão da etapa continua sendo a forma mais confiável.
      card.querySelectorAll("[data-next]").forEach(btn=>{
        btn.onclick=()=>moveOrder(btn.dataset.next,btn.dataset.status);
      });

      card.querySelectorAll("[data-print]").forEach(btn=>{
        btn.onclick=()=>printOrder((window.orders||[]).find(o=>String(o.id)===String(btn.dataset.print)));
      });
    });

    document.querySelectorAll(".column").forEach(col=>{
      col.addEventListener("dragover",e=>{
        e.preventDefault();
        col.classList.add("drop-ready");
        e.dataTransfer.dropEffect="move";
      });
      col.addEventListener("dragleave",e=>{
        if(!col.contains(e.relatedTarget))col.classList.remove("drop-ready");
      });
      col.addEventListener("drop",e=>{
        e.preventDefault();
        col.classList.remove("drop-ready");
        const card=document.querySelector(".order.dragging");
        const id=card?.dataset.dragId;
        if(id)moveOrder(id,col.dataset.dropStatus);
      });
    });
  }

  // O admin.js chama renderOrders() dentro de load().
  // Substituímos apenas essa parte; o restante do painel continua original.
  window.renderOrders=renderFlow;

  // Quando o painel já estiver aberto, desenha imediatamente.
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>setTimeout(renderFlow,0));
  }else{
    setTimeout(renderFlow,0);
  }
})();