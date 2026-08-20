/* MIGUEL LANCHES - NOVOS PEDIDOS EM COMANDAS
   Versão corrigida: não depende de window.state/window.db.
*/
(function(){
  const SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
  const SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
  const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

  let novosCache=[];

  function status(text){
    const m=[...String(text||"").matchAll(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];
    return m.length?m[m.length-1][1]:"preparo";
  }
  function items(text){
    const m=String(text||"").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);
    if(!m)return[];
    try{return JSON.parse(decodeURIComponent(m[1]))}catch(e){return[]}
  }
  function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
  function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}

  async function carregarNovos(){
    const {data,error}=await sb.from("pedidos").select("*").order("created_at",{ascending:false});
    if(error){console.error("Novos pedidos:",error);return;}
    novosCache=(data||[]).filter(p=>status(p.observacoes)==="novo");
    render();
  }

  function render(){
    const page=document.getElementById("page-comandas");
    if(!page)return;

    let box=document.getElementById("novosComandasBox");
    if(!box){
      box=document.createElement("div");
      box.id="novosComandasBox";
      box.className="novos-comandas";
      const head=page.querySelector(".page-head");
      if(head)head.insertAdjacentElement("afterend",box);
    }
    if(!box)return;

    box.innerHTML=`
      <div class="novos-cabecalho">
        <div>
          <div class="novos-titulo">🆕 Novos pedidos</div>
          <div class="novos-subtitulo">Pedidos aguardando sua confirmação</div>
        </div>
        <span class="novos-contador">${novosCache.length}</span>
      </div>
      ${novosCache.length?novosCache.map(card).join(""):`
        <div class="novos-vazio">Nenhum pedido novo.</div>
      `}
    `;

    // Garante que Novos fique acima de Em preparo.
    const statusCols=page.querySelector(".status-columns");
    if(statusCols && box.nextElementSibling!==statusCols){
      page.insertBefore(box,statusCols);
    }
  }

  function card(p){
    const its=items(p.observacoes);
    return `<article class="novo-card">
      <div class="novo-card-top">
        <div>
          <h3>#${esc(String(p.id).slice(-5))} — ${esc(p.Cliente||"Cliente")}</h3>
          <div class="novo-meta">${esc(new Date(p.created_at).toLocaleString("pt-BR"))}${p.telefone?" · "+esc(p.telefone):""}</div>
        </div>
        <strong class="novo-total">${money(p.total)}</strong>
      </div>
      <div class="novo-itens">
        ${its.length?its.map(x=>`
          <div><b>${esc(x.quantidade)}x</b> ${esc(x.nome)}</div>
          ${(x.adicionais||[]).length?`<small>+ ${esc(x.adicionais.map(a=>a.nome).join(", "))}</small>`:""}
          ${x.obs?`<small>Obs: ${esc(x.obs)}</small>`:""}
        `).join(""):"Pedido"}
      </div>
      <div class="novo-acoes">
        <button class="novo-btn imprimir" onclick="imprimirNovoPedido('${p.id}')">🖨️ Imprimir</button>
        <button class="novo-btn preparar" onclick="prepararNovoPedido('${p.id}')">🍔 Mandar fazer pedido</button>
        <button class="novo-btn recusar" onclick="recusarNovoPedido('${p.id}')">❌ Recusar</button>
      </div>
    </article>`;
  }

  window.imprimirNovoPedido=function(id){
    const p=novosCache.find(x=>String(x.id)===String(id));
    if(!p)return alert("Pedido não encontrado.");
    const its=items(p.observacoes);
    const rows=its.map(x=>`
      <div class="item">
        <div class="r"><span><b>${esc(x.quantidade)}x</b> ${esc(x.nome)}</span><b>${money(Number(x.preco||0)*Number(x.quantidade||1))}</b></div>
        ${(x.adicionais||[]).length?`<div class="sub">+ ${esc(x.adicionais.map(a=>a.nome).join(", "))}</div>`:""}
        ${x.obs?`<div class="sub">Obs: ${esc(x.obs)}</div>`:""}
      </div>`).join("");

    const w=window.open("","_blank","width=420,height=700");
    if(!w)return alert("O navegador bloqueou a impressão. Permita pop-ups.");

    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${esc(String(p.id).slice(-5))}</title>
    <style>
      @page{size:58mm auto;margin:0}
      *{box-sizing:border-box}
      body{width:58mm;margin:0;padding:3mm;font-family:Arial,sans-serif;font-size:12px;color:#000}
      .c{text-align:center}.logo{font-size:18px;font-weight:900}
      .line{border-top:1px dashed #000;margin:7px 0}
      .r{display:flex;justify-content:space-between;gap:5px;padding:5px 0}
      .item{border-bottom:1px dotted #777}.sub{font-size:10px;padding:2px 0}
      .tot{display:flex;justify-content:space-between;font-size:16px;font-weight:900}
    </style></head><body>
      <div class="c"><div class="logo">MIGUEL LANCHES</div><div class="line"></div>
      <b>PEDIDO #${esc(String(p.id).slice(-5))}</b><br>${esc(new Date(p.created_at).toLocaleString("pt-BR"))}</div>
      <div class="line"></div>
      <b>CLIENTE:</b> ${esc(p.Cliente||"-")}<br>
      <b>TELEFONE:</b> ${esc(p.telefone||"-")}<br>
      <b>ENDEREÇO:</b> ${esc(p.endereco||"-")}<br>
      <b>REF:</b> ${esc(p.referencia||"-")}
      <div class="line"></div>${rows}
      <div class="line"></div><div class="tot"><span>TOTAL</span><span>${money(p.total)}</span></div>
      <div class="line"></div><div class="c"><b>OBRIGADO!</b></div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
    </body></html>`);
    w.document.close();
  };

  window.prepararNovoPedido=async function(id){
    const p=novosCache.find(x=>String(x.id)===String(id));
    if(!p)return;
    const clean=String(p.observacoes||"").replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim();
    const obs=clean+"\n\n[ML_STATUS]preparo[/ML_STATUS]";

    const {error}=await sb.from("pedidos").update({observacoes:obs}).eq("id",p.id);
    if(error)return alert("Erro: "+error.message);

    if(p.telefone){
      let n=String(p.telefone).replace(/\D/g,"");
      if(n.length===10||n.length===11)n="55"+n;
      const msg=encodeURIComponent(`Olá, ${p.Cliente||"cliente"}! 😊 Recebemos seu pedido e já vamos começar a preparar. Obrigado pela preferência! 🍔`);
      window.open(`https://wa.me/${n}?text=${msg}`,"_blank");
    }
    await carregarNovos();
    if(typeof window.loadAll==="function")window.loadAll();
  };

  window.recusarNovoPedido=async function(id){
    const p=novosCache.find(x=>String(x.id)===String(id));
    if(!p||!confirm("Deseja recusar este pedido?"))return;
    const clean=String(p.observacoes||"").replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim();
    const {error}=await sb.from("pedidos").update({observacoes:clean+"\n\n[ML_STATUS]cancelado[/ML_STATUS]"}).eq("id",p.id);
    if(error)return alert("Erro: "+error.message);
    await carregarNovos();
    if(typeof window.loadAll==="function")window.loadAll();
  };

  // Exibe imediatamente e atualiza a cada 2 segundos.
  setTimeout(carregarNovos,500);
  setInterval(carregarNovos,2000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)carregarNovos()});
})();