
(function(){
  const cfg=window.ML_CONFIG||{};
  const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_KEY);
  const app=document.getElementById("app");
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  function empty(){
    app.innerHTML='<section class="card empty"><h2>Você não tem nenhum pedido</h2><p>Quando fizer um pedido, ele aparecerá aqui para você acompanhar.</p><button class="primary" onclick="location.href=\'index.html\'">Fazer um pedido</button></section>';
  }
  function status(o){
    return String(o.status||o.situacao||"novo").toLowerCase();
  }
  function items(o){
    if(Array.isArray(o.itens))return o.itens;
    const m=String(o.observacoes||"").match(/\[ML_ITENS\](.*?)\[\/ML_ITENS\]/i);
    if(m)try{return JSON.parse(decodeURIComponent(m[1]))||[]}catch(e){}
    return [];
  }
  function label(s){return ({novo:"Pedido recebido",recebido:"Pedido recebido",preparo:"Em preparo",em_preparo:"Em preparo",preparando:"Em preparo",pronto:"Pronto",entregue:"Entregue",cancelado:"Cancelado"}[s]||"Pedido recebido")}
  function render(o){
    let s=status(o);if(s==="em preparo")s="preparo";
    const steps=[["novo","Pedido recebido","Seu pedido foi recebido pela lanchonete."],["preparo","Em preparo","Seu pedido está sendo preparado."],["pronto","Pronto","Seu pedido está pronto."],["entregue","Entregue","Pedido finalizado."]];
    const idx=Math.max(0,steps.findIndex(x=>x[0]===s));
    const its=items(o);
    const timeline=s==="cancelado"?'<p><b>Pedido cancelado.</b></p>':`<div class="timeline">${steps.map((x,i)=>`<div class="step ${i===idx?"active":""} ${i<idx?"done":""}"><div><div class="dot">${i<idx?"✓":i+1}</div>${i<3?'<div class="line"></div>':""}</div><div><h3>${x[1]}</h3><p>${x[2]}</p></div></div>`).join("")}</div>`;
    app.innerHTML=`<section class="card"><div class="head"><div><h2>Pedido #${esc(String(o.id).slice(-5))}</h2><div class="date">${o.created_at?new Date(o.created_at).toLocaleString("pt-BR"):""}</div></div><span class="badge">${label(s)}</span></div>${timeline}<div class="items"><b>Itens do pedido</b>${its.length?its.map(x=>`<div class="item"><div><strong>${Number(x.quantidade)||1}x ${esc(x.nome)}</strong>${x.obs?`<small>${esc(x.obs)}</small>`:""}</div><strong>${money(Number(x.preco||0)*(Number(x.quantidade)||1))}</strong></div>`).join(""):"<p style='color:#777;font-size:12px'>Itens não disponíveis.</p>"}<div class="total"><span>Total</span><span>${money(o.total)}</span></div></div><button class="primary" onclick="location.href='index.html'">Voltar ao cardápio</button><div class="refresh">Atualizando automaticamente a cada 8 segundos</div></section>`;
  }
  async function load(){
    const phone=localStorage.getItem("miguel_lanches_ultimo_telefone");
    if(!phone){empty();return;}
    const r=await db.from("pedidos").select("*").eq("telefone",phone).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(r.error||!r.data){empty();return;}
    render(r.data);
  }
  load();setInterval(load,8000);
})();
