/* MIGUEL LANCHES - NOVOS PEDIDOS DENTRO DE COMANDAS */
(function(){
  function orders(){
    return (window.state && Array.isArray(window.state.orders)) ? window.state.orders : [];
  }
  function status(text){
    const m=[...String(text||"").matchAll(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];
    return m.length ? m[m.length-1][1] : "novo";
  }
  function items(text){
    const m=String(text||"").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);
    if(!m)return[];
    try{return JSON.parse(decodeURIComponent(m[1]))}catch(e){return[]}
  }
  function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
  function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}

  window.imprimirNovoComanda=function(id){
    const p=orders().find(x=>String(x.id)===String(id));
    if(!p)return alert("Pedido não encontrado.");
    const its=items(p.observacoes);
    const rows=its.map(x=>{
      const adds=(x.adicionais||[]).map(a=>a.nome).join(", ");
      return `<div class="item">
        <div class="row"><span><b>${esc(x.quantidade)}x</b> ${esc(x.nome)}</span><b>${money(Number(x.preco||0)*Number(x.quantidade||1))}</b></div>
        ${adds?`<div class="sub">+ ${esc(adds)}</div>`:""}
        ${x.obs?`<div class="sub">Obs: ${esc(x.obs)}</div>`:""}
      </div>`;
    }).join("");

    const w=window.open("","_blank","width=420,height=700");
    if(!w)return alert("Permita pop-ups para imprimir.");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8">
    <title>Pedido #${esc(String(p.id).slice(-5))}</title>
    <style>
      @page{size:58mm auto;margin:0}*{box-sizing:border-box}
      body{width:58mm;margin:0;padding:3mm;font:12px Arial;color:#000}
      .c{text-align:center}.logo{font-size:18px;font-weight:900}
      .line{border-top:1px dashed #000;margin:7px 0}
      .row{display:flex;justify-content:space-between;gap:5px;padding:5px 0}
      .item{border-bottom:1px dotted #777}.sub{font-size:10px;padding:2px 0}
      .total{font-size:16px;font-weight:900;display:flex;justify-content:space-between}
    </style></head><body>
    <div class="c"><div class="logo">MIGUEL LANCHES</div><div class="line"></div>
    <b>PEDIDO #${esc(String(p.id).slice(-5))}</b><br>${esc(new Date(p.created_at).toLocaleString("pt-BR"))}</div>
    <div class="line"></div>
    <b>CLIENTE:</b> ${esc(p.Cliente||"-")}<br>
    <b>TELEFONE:</b> ${esc(p.telefone||"-")}<br>
    <b>ENDEREÇO:</b> ${esc(p.endereco||"-")}<br>
    <b>REF:</b> ${esc(p.referencia||"-")}
    <div class="line"></div>${rows}
    <div class="line"></div><div class="total"><span>TOTAL</span><span>${money(p.total)}</span></div>
    <div class="line"></div><div class="c"><b>OBRIGADO!</b></div>
    <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
    </body></html>`);
    w.document.close();
  };

  window.mandarFazerNovo=function(id){
    const p=orders().find(x=>String(x.id)===String(id));
    if(!p)return;

    const old=String(p.observacoes||"");
    const clean=old.replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim();
    const obs=clean+"\n\n[ML_STATUS]preparo[/ML_STATUS]";

    /* O app principal expõe db no escopo global em algumas versões.
       Tenta primeiro window.db e depois o cliente Supabase conhecido. */
    const database=window.db;
    if(!database)return alert("Banco de dados não encontrado. Recarregue a página e tente novamente.");

    database.from("pedidos").update({observacoes:obs}).eq("id",p.id).then(async r=>{
      if(r.error)return alert(r.error.message);
      if(p.telefone){
        let n=String(p.telefone).replace(/\D/g,"");
        if(n.length===10||n.length===11)n="55"+n;
        const msg=encodeURIComponent(`Olá, ${p.Cliente||"cliente"}! 😊 Recebemos seu pedido e já vamos começar a preparar. Obrigado pela preferência! 🍔`);
        window.open(`https://wa.me/${n}?text=${msg}`,"_blank");
      }
      if(typeof window.loadAll==="function") await window.loadAll();
      setTimeout(renderNovosEmComandas,300);
    });
  };

  window.recusarNovoComanda=function(id){
    const p=orders().find(x=>String(x.id)===String(id));
    if(!p || !confirm("Deseja recusar este pedido?"))return;
    const old=String(p.observacoes||"");
    const clean=old.replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim();
    const obs=clean+"\n\n[ML_STATUS]cancelado[/ML_STATUS]";
    if(!window.db)return alert("Banco de dados não encontrado.");
    window.db.from("pedidos").update({observacoes:obs}).eq("id",p.id).then(async r=>{
      if(r.error)return alert(r.error.message);
      if(typeof window.loadAll==="function")await window.loadAll();
      setTimeout(renderNovosEmComandas,300);
    });
  };

  window.renderNovosEmComandas=function(){
    const target=document.querySelector("#page-comandas .page-head");
    if(!target)return;
    let box=document.getElementById("novosComandasBox");
    if(!box){
      box=document.createElement("div");
      box.id="novosComandasBox";
      box.className="novos-comandas";
      target.insertAdjacentElement("afterend",box);
    }
    const novos=orders().filter(p=>status(p.observacoes)==="novo");

    if(!novos.length){box.innerHTML="";return;}

    box.innerHTML=`<div class="new-title"><h2>🆕 Novos pedidos</h2><span class="new-count">${novos.length}</span></div>
      ${novos.map(p=>{
        const its=items(p.observacoes);
        return `<div class="novo-pedido-card">
          <h3>Pedido #${esc(String(p.id).slice(-5))} — ${esc(p.Cliente||"Cliente")}</h3>
          <div class="novo-pedido-meta">${esc(new Date(p.created_at).toLocaleString("pt-BR"))}${p.telefone?" · "+esc(p.telefone):""}</div>
          <div class="novo-pedido-itens">${its.length?its.map(x=>`${esc(x.quantidade)}x ${esc(x.nome)}`).join("<br>"):"Pedido"}</div>
          <div class="novo-pedido-total">TOTAL: ${money(p.total)}</div>
          <div class="novo-pedido-actions">
            <button class="novo-imprimir" onclick="imprimirNovoComanda('${p.id}')">🖨️ Imprimir</button>
            <button class="novo-preparar" onclick="mandarFazerNovo('${p.id}')">🍔 Mandar fazer pedido</button>
            <button class="novo-recusar" onclick="recusarNovoComanda('${p.id}')">❌ Recusar</button>
          </div>
        </div>`;
      }).join("")}`;
  };

  setTimeout(renderNovosEmComandas,800);
  setInterval(renderNovosEmComandas,2000);
})();