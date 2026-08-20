/* MIGUEL LANCHES - PEDIDOS NOVOS + IMPRESSAO 58MM
   Os pedidos novos aparecem SOMENTE em Comandas.
*/
(function(){
  function getOrders(){return window.state&&Array.isArray(window.state.orders)?window.state.orders:[]}
  function getStatus(text){const m=[...String(text||"").matchAll(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];return m.length?m[m.length-1][1]:"novo"}
  function getItems(text){const m=String(text||"").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);if(!m)return[];try{return JSON.parse(decodeURIComponent(m[1]))}catch(e){return[]}}
  function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
  function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}

  window.imprimirPedidoNovo=function(id){
    const p=getOrders().find(x=>String(x.id)===String(id));if(!p)return alert("Pedido não encontrado.");
    const items=getItems(p.observacoes);
    const rows=items.map(x=>{const adds=(x.adicionais||[]).map(a=>a.nome).join(", ");return `<div class="item"><div class="row"><span><b>${esc(x.quantidade)}x</b> ${esc(x.nome)}</span><b>${money(Number(x.preco||0)*Number(x.quantidade||1))}</b></div>${adds?`<div class="sub">+ ${esc(adds)}</div>`:""}${x.obs?`<div class="sub">Obs: ${esc(x.obs)}</div>`:""}</div>`}).join("");
    const w=window.open("","_blank","width=420,height=700");if(!w)return alert("O navegador bloqueou a impressão. Permita pop-ups.");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${esc(String(p.id).slice(-5))}</title><style>@page{size:58mm auto;margin:0}*{box-sizing:border-box}body{width:58mm;margin:0;padding:3mm;font-family:Arial,sans-serif;font-size:12px;color:#000}.center{text-align:center}.logo{font-size:18px;font-weight:900}.line{border-top:1px dashed #000;margin:7px 0}.row{display:flex;justify-content:space-between;gap:5px;padding:5px 0}.item{border-bottom:1px dotted #777}.sub{font-size:10px;padding:2px 0}.total{font-size:16px;font-weight:900;display:flex;justify-content:space-between}</style></head><body><div class="center"><div class="logo">MIGUEL LANCHES</div><div class="line"></div><b>PEDIDO #${esc(String(p.id).slice(-5))}</b><br>${esc(new Date(p.created_at).toLocaleString("pt-BR"))}</div><div class="line"></div><b>CLIENTE:</b> ${esc(p.Cliente||"-")}<br><b>TELEFONE:</b> ${esc(p.telefone||"-")}<br><b>ENDEREÇO:</b> ${esc(p.endereco||"-")}<br><b>REF:</b> ${esc(p.referencia||"-")}<div class="line"></div>${rows}<div class="line"></div><div class="total"><span>TOTAL</span><span>${money(p.total)}</span></div><div class="line"></div><div class="center"><b>OBRIGADO!</b></div><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);w.document.close();
  };

  window.prepararPedidoNovo=async function(id){
    const p=getOrders().find(x=>String(x.id)===String(id));if(!p)return;
    const old=String(p.observacoes||"");const clean=old.replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim();const obs=clean+"\n\n[ML_STATUS]preparo[/ML_STATUS]";
    if(!window.db)return alert("Banco de dados não encontrado.");const r=await window.db.from("pedidos").update({observacoes:obs}).eq("id",p.id);if(r.error)return alert(r.error.message);
    if(p.telefone){let n=String(p.telefone).replace(/\D/g,"");if(n.length===10||n.length===11)n="55"+n;const msg=encodeURIComponent(`Olá, ${p.Cliente||"cliente"}! 😊 Recebemos seu pedido e já vamos começar a preparar. Obrigado pela preferência! 🍔`);window.open(`https://wa.me/${n}?text=${msg}`,"_blank")}
    if(typeof window.loadAll==="function")await window.loadAll();
  };

  window.recusarPedidoNovo=async function(id){
    const p=getOrders().find(x=>String(x.id)===String(id));if(!p)return;if(!confirm("Deseja recusar este pedido?"))return;
    const old=String(p.observacoes||"");const clean=old.replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim();const obs=clean+"\n\n[ML_STATUS]cancelado[/ML_STATUS]";
    const r=await window.db.from("pedidos").update({observacoes:obs}).eq("id",p.id);if(r.error)return alert(r.error.message);if(typeof window.loadAll==="function")await window.loadAll();
  };

  window.renderPedidosNovos=function(){
    const box=document.getElementById("novosComandasBox");if(!box)return;
    const novos=getOrders().filter(p=>getStatus(p.observacoes)==="novo");
    box.innerHTML=`<div class="novos-comandas"><div class="novos-comandas-head"><div><h2>🔔 Pedidos novos</h2><small>${novos.length?"Escolha uma ação para cada pedido.":"Pedidos aguardando sua confirmação."}</small></div><span class="novos-comandas-count">${novos.length}</span></div>${novos.length?`<div class="novos-comandas-list">${novos.map(p=>{const items=getItems(p.observacoes);return `<div class="new-order-card"><h3>#${esc(String(p.id).slice(-5))} — ${esc(p.Cliente||"Cliente")}</h3><div class="meta">${esc(new Date(p.created_at).toLocaleString("pt-BR"))} · ${money(p.total)}</div><div class="new-order-items">${items.length?items.map(x=>`${esc(x.quantidade)}x ${esc(x.nome)}`).join("<br>"):"Pedido"}</div><div class="new-order-actions"><button class="action print-new" onclick="imprimirPedidoNovo('${p.id}')">🖨️ Imprimir</button><button class="action green" onclick="prepararPedidoNovo('${p.id}')">🍔 Preparar pedido</button><button class="action red" onclick="recusarPedidoNovo('${p.id}')">✕ Recusar</button></div></div>`}).join("")}</div>`:`<div class="novos-comandas-empty">Nenhum pedido novo.</div>`}</div>`;
  };

  const oldRenderAll=window.renderAll;window.renderAll=function(){if(typeof oldRenderAll==="function")oldRenderAll.apply(this,arguments);setTimeout(window.renderPedidosNovos,50)};
  setTimeout(window.renderPedidosNovos,500);setInterval(window.renderPedidosNovos,2000);
})();
