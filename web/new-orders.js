/* Miguel Lanches - Pedidos novos + impressão 58mm */
(function(){
  function status(o){
    const m=[...String(o||"").matchAll(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];
    return m.length?m[m.length-1][1]:"preparo";
  }
  function items(o){
    const m=String(o||"").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);
    if(!m)return[];
    try{return JSON.parse(decodeURIComponent(m[1]))}catch{return[]}
  }
  function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
  function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}

  window.printNewOrder=function(id){
    const p=(window.state?.orders||[]).find(x=>String(x.id)===String(id));
    if(!p)return alert("Pedido não encontrado.");
    const its=items(p.observacoes);
    const w=window.open("","_blank","width=420,height=700");
    if(!w)return alert("Permita pop-ups para imprimir.");
    const rows=its.map(x=>`<div class="row"><span><b>${esc(x.quantidade)}x</b> ${esc(x.nome)}${x.adicionais?.length?`<small><br>+ ${esc(x.adicionais.map(a=>a.nome).join(", "))}</small>`:""}</span><b>${money(Number(x.preco||0)*Number(x.quantidade||1))}</b></div>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${esc(String(p.id).slice(-5))}</title><style>
    @page{size:58mm auto;margin:0}body{width:58mm;margin:0;padding:3mm;font:12px Arial;color:#000}
    .c{text-align:center}.logo{font-size:18px;font-weight:900}.line{border-top:1px dashed #000;margin:7px 0}
    .row{display:flex;justify-content:space-between;gap:5px;padding:5px 0;border-bottom:1px dotted #999}.row small{font-size:10px}
    .total{font-size:16px;font-weight:bold;display:flex;justify-content:space-between}
    </style></head><body>
    <div class="c"><div class="logo">MIGUEL LANCHES</div><div class="line"></div>
    <b>PEDIDO #${esc(String(p.id).slice(-5))}</b><br>${esc(new Date(p.created_at).toLocaleString("pt-BR"))}</div>
    <div class="line"></div>
    <b>CLIENTE:</b> ${esc(p.Cliente||"")}<br><b>TELEFONE:</b> ${esc(p.telefone||"-")}<br>
    <b>ENDEREÇO:</b> ${esc(p.endereco||"-")}<br><b>REF:</b> ${esc(p.referencia||"-")}
    <div class="line"></div>${rows}<div class="line"></div>
    <div class="total"><span>TOTAL</span><span>${money(p.total)}</span></div>
    <div class="line"></div><div class="c"><b>OBRIGADO!</b></div>
    <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
    </body></html>`);
    w.document.close();
  };

  window.prepareNewOrder=async function(id){
    const p=(window.state?.orders||[]).find(x=>String(x.id)===String(id));
    if(!p)return;
    const clean=String(p.observacoes||"").replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim()+"\n\n[ML_STATUS]preparo[/ML_STATUS]";
    const r=await window.db.from("pedidos").update({observacoes:clean}).eq("id",p.id);
    if(r.error)return alert(r.error.message);

    if(p.telefone){
      let n=String(p.telefone).replace(/\D/g,"");
      if(n.length===10||n.length===11)n="55"+n;
      const msg=encodeURIComponent(`Olá, ${p.Cliente||"cliente"}! 😊 Recebemos seu pedido e já vamos começar a preparar. Obrigado pela preferência! 🍔`);
      window.open(`https://wa.me/${n}?text=${msg}`,"_blank");
    }
    if(window.loadAll)await window.loadAll();
  };

  window.refuseNewOrder=async function(id){
    const p=(window.state?.orders||[]).find(x=>String(x.id)===String(id));
    if(!p)return;
    if(!confirm("Recusar este pedido?"))return;
    const clean=String(p.observacoes||"").replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim()+"\n\n[ML_STATUS]cancelado[/ML_STATUS]";
    const r=await window.db.from("pedidos").update({observacoes:clean}).eq("id",p.id);
    if(r.error)return alert(r.error.message);
    if(window.loadAll)await window.loadAll();
  };

  window.renderNewOrders=function(){
    const box=document.getElementById("newOrdersBox");
    if(!box)return;
    const orders=(window.state?.orders||[]).filter(p=>status(p.observacoes)==="novo");
    box.innerHTML=orders.length?`
      <div class="panel" style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div><h2 style="margin:0">🔔 Pedidos novos</h2><small>Aceite, imprima ou recuse.</small></div>
          <strong>${orders.length}</strong>
        </div>
        <div>${orders.map(p=>{
          const its=items(p.observacoes);
          return `<div class="order-card" style="margin-top:10px">
            <h3>#${esc(String(p.id).slice(-5))} — ${esc(p.Cliente||"Cliente")}</h3>
            <div class="meta">${esc(new Date(p.created_at).toLocaleString("pt-BR"))} · ${money(p.total)}</div>
            <p>${its.map(x=>`${esc(x.quantidade)}x ${esc(x.nome)}`).join("<br>")||"Pedido"}</p>
            <div class="order-actions">
              <button class="action" onclick="printNewOrder('${p.id}')">🖨️ Imprimir</button>
              <button class="action green" onclick="prepareNewOrder('${p.id}')">🍔 Preparar pedido</button>
              <button class="action red" onclick="refuseNewOrder('${p.id}')">✕ Recusar</button>
            </div>
          </div>`;
        }).join("")}</div>
      </div>`:"";
  };

  const oldRenderAll=window.renderAll;
  window.renderAll=function(){
    if(oldRenderAll)oldRenderAll();
    setTimeout(window.renderNewOrders,0);
  };

  setTimeout(window.renderNewOrders,500);
})();
