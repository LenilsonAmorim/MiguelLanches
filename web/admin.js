const db=supabase.createClient(ML_CONFIG.SUPABASE_URL,ML_CONFIG.SUPABASE_KEY);
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
let orders=[],products=[],cats=[],clients=[],filter="todos",channel=null;

function toast(text){$("toast").textContent=text;$("toast").classList.add("show");clearTimeout(window._toast);window._toast=setTimeout(()=>$("toast").classList.remove("show"),2200)}
function statusOf(v){return (String(v||"").match(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/)||[])[1]||"novo"}
function itemsOf(v){const m=String(v||"").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);try{return m?JSON.parse(decodeURIComponent(m[1])):[]}catch{return[]}}
function statusLabel(s){return ({novo:"Novo",preparo:"Preparando",entrega:"Saiu para entrega",entregue:"Entregue",cancelado:"Cancelado"})[s]||s}

async function isAdmin(){
  const s=await db.auth.getSession();
  if(!s.data.session)return false;
  const r=await db.rpc("is_admin");
  return !r.error&&r.data===true;
}
async function login(){
  const u=$("user").value.trim().toLowerCase(),p=$("pass").value;
  if(!u||!p){$("msg").textContent="Preencha usuário e senha.";return}
  const e=await db.rpc("get_admin_login_email",{p_username:u});
  if(e.error||!e.data){$("msg").textContent="Usuário ou senha inválidos.";return}
  const r=await db.auth.signInWithPassword({email:e.data,password:p});
  if(r.error||!(await isAdmin())){await db.auth.signOut();$("msg").textContent="Usuário ou senha inválidos.";return}
  start();
}
function start(){
  $("login").classList.add("hidden");$("app").classList.remove("hidden");
  setupRealtime();load();
}
function setupRealtime(){
  if(channel)db.removeChannel(channel);
  channel=db.channel("miguel-lanches-admin")
    .on("postgres_changes",{event:"*",schema:"public",table:"pedidos"},()=>load())
    .on("postgres_changes",{event:"*",schema:"public",table:"produtos"},()=>load())
    .on("postgres_changes",{event:"*",schema:"public",table:"categorias"},()=>load())
    .subscribe(s=>{$("connection").textContent=s==="SUBSCRIBED"?"● Online":"Reconectando...";$("connection").style.color=s==="SUBSCRIBED"?"#198754":"#d19a00"});
}
async function load(){
  const [o,p,c,cl]=await Promise.all([
    db.from("pedidos").select("*").order("created_at",{ascending:false}).limit(500),
    db.from("produtos").select("*,categorias(nome,emoji)").order("ordem"),
    db.from("categorias").select("*").order("ordem"),
    db.from("clientes").select("*").order("nome")
  ]);
  if(o.error){toast("Erro nos pedidos: "+o.error.message);return}
  orders=o.data||[];products=p.data||[];cats=c.data||[];clients=cl.data||[];
  render();
}
function render(){
  renderOrders();renderDashboard();renderProducts();renderCats();renderClients();renderPromos();renderReports();renderConfig();
}
function renderOrders(){
  const groups=[["novo","Novos"],["preparo","Preparando"],["entrega","Saiu para entrega"],["entregue","Entregues"]];
  const data=filter==="cancelado"?[["cancelado","Cancelados"]]:groups;
  $("orders").innerHTML=data.map(([s,title])=>{
    const arr=orders.filter(o=>statusOf(o.observacoes)===s);
    const visible=filter==="todos"||filter===s;
    if(!visible)return `<div class="column"><h2>${title}<small>${arr.length}</small></h2><p class="muted">Use a aba ${title} para ver.</p></div>`;
    return `<div class="column"><h2>${title}<small>${arr.length}</small></h2>${arr.map(orderCard).join("")||"<p class='muted'>Nenhum pedido.</p>"}</div>`;
  }).join("");
  if(filter==="cancelado")return bindOrderButtons();
  bindOrderButtons();
  document.querySelectorAll("#tabs button").forEach(b=>b.querySelector("b").textContent=b.dataset.filter==="todos"?orders.length:orders.filter(o=>statusOf(o.observacoes)===b.dataset.filter).length);
  $("badge").textContent=orders.filter(o=>statusOf(o.observacoes)==="novo").length;
}
function orderCard(o){
  const s=statusOf(o.observacoes),items=itemsOf(o.observacoes);
  const cliente=o.cliente||o.Cliente||"Cliente";
  const endereco=o.endereco||"Retirada";
  return `<article class="order ${s==="novo"?"new":""}">
    <h3>Pedido #${esc(String(o.id).slice(-5))}</h3>
    <small>${o.created_at?new Date(o.created_at).toLocaleString("pt-BR"):""}</small>
    <p><b>${esc(cliente)}</b><br>${esc(o.telefone||"")}</p>
    <div class="items">${items.length?items.map(i=>`${esc(i.quantidade)}x ${esc(i.nome)} — ${money(Number(i.preco||0)*Number(i.quantidade||1))}`).join("<br>"):"Itens do pedido"}</div>
    <small>${esc(endereco)}${o.referencia?"<br>Ref.: "+esc(o.referencia):""}</small>
    <div class="ototal"><b>Total</b><b>${money(o.total)}</b></div>
    <div class="actions">
      <button class="black" data-print="${esc(o.id)}">Imprimir</button>
      ${s==="novo"?'<button class="primary" data-next="'+esc(o.id)+'" data-status="preparo">Preparar</button><button class="red" data-next="'+esc(o.id)+'" data-status="cancelado">Cancelar</button>':""}
      ${s==="preparo"?'<button class="blue" data-next="'+esc(o.id)+'" data-status="entrega">Saiu para entrega</button>':""}
      ${s==="entrega"?'<button class="green" data-next="'+esc(o.id)+'" data-status="entregue">Entregue</button>':""}
    </div>
  </article>`;
}
function bindOrderButtons(){
  document.querySelectorAll("[data-next]").forEach(b=>b.onclick=async()=>{
    if(b.dataset.status==="cancelado"&&!confirm("Cancelar este pedido?"))return;
    const o=orders.find(x=>String(x.id)===String(b.dataset.next));if(!o)return;
    const clean=String(o.observacoes||"").replace(/\n?\[ML_STATUS\].*?\[\/ML_STATUS\]/,"");
    const obs=clean+`\n[ML_STATUS]${b.dataset.status}[/ML_STATUS]`;
    const r=await db.from("pedidos").update({observacoes:obs}).eq("id",o.id);
    if(r.error)toast(r.error.message);else{toast("Pedido atualizado");load()}
  });
  document.querySelectorAll("[data-print]").forEach(b=>b.onclick=()=>printOrder(orders.find(o=>String(o.id)===String(b.dataset.print))));
}
function renderDashboard(){
  const active=orders.filter(o=>statusOf(o.observacoes)!=="cancelado"),sum=active.reduce((a,o)=>a+Number(o.total||0),0);
  $("stats").innerHTML=[["Pedidos",active.length],["Faturamento",money(sum)],["Novos",orders.filter(o=>statusOf(o.observacoes)==="novo").length],["Preparando",orders.filter(o=>statusOf(o.observacoes)==="preparo").length]].map(([a,b])=>`<div class="stat"><small>${a}</small><b>${b}</b></div>`).join("");
  $("recent").innerHTML=orders.slice(0,10).map(o=>`<div class="mini-product"><span>#${esc(String(o.id).slice(-5))} — ${esc(o.cliente||o.Cliente||"Cliente")}<small class="muted"> ${statusLabel(statusOf(o.observacoes))}</small></span><b>${money(o.total)}</b></div>`).join("")||"<p class='muted'>Nenhum pedido.</p>";
}
function renderProducts(){
  const q=($("ps")?.value||"").toLowerCase();
  $("products").innerHTML=products.filter(p=>String(p.nome||"").toLowerCase().includes(q)).map(p=>`<tr>
    <td><b>${esc(p.nome)}</b></td><td>${esc(p.categorias?.nome||"Sem categoria")}</td><td>${money(p.preco)}</td>
    <td><button class="table-btn" data-active="${esc(p.id)}">${p.ativo===false?"Ativar":"Ativo"}</button></td>
    <td><button class="table-btn" data-feature="${esc(p.id)}">${p.destaque?"★ Destaque":"☆ Destacar"}</button></td>
    <td><button class="table-btn" data-edit="${esc(p.id)}">Editar</button></td>
  </tr>`).join("")||`<tr><td colspan="6">Nenhum produto encontrado.</td></tr>`;
  document.querySelectorAll("[data-active]").forEach(b=>b.onclick=async()=>{const p=products.find(x=>String(x.id)===String(b.dataset.active));const r=await db.from("produtos").update({ativo:p.ativo===false}).eq("id",p.id);if(r.error)toast(r.error.message);else load()});
  document.querySelectorAll("[data-feature]").forEach(b=>b.onclick=async()=>{const p=products.find(x=>String(x.id)===String(b.dataset.feature));const r=await db.from("produtos").update({destaque:!p.destaque}).eq("id",p.id);if(r.error)toast(r.error.message);else load()});
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>productModal(products.find(x=>String(x.id)===String(b.dataset.edit))));
}
function renderCats(){
  $("cats").innerHTML=cats.map(c=>`<div class="cat-admin"><span class="emoji">${esc(c.emoji||"📦")}</span><div><strong>${esc(c.nome)}</strong><small>Ordem ${esc(c.ordem||0)} · ${c.ativo===false?"Inativa":"Ativa"}</small></div><div class="cat-actions"><button class="table-btn" data-cat-edit="${esc(c.id)}">Editar</button><button class="table-btn" data-cat-toggle="${esc(c.id)}">${c.ativo===false?"Ativar":"Desativar"}</button></div></div>`).join("")||"<p>Nenhuma categoria.</p>";
  document.querySelectorAll("[data-cat-edit]").forEach(b=>b.onclick=()=>catModal(cats.find(c=>String(c.id)===String(b.dataset.catEdit))));
  document.querySelectorAll("[data-cat-toggle]").forEach(b=>b.onclick=async()=>{const c=cats.find(x=>String(x.id)===String(b.dataset.catToggle));const r=await db.from("categorias").update({ativo:c.ativo===false}).eq("id",c.id);if(r.error)toast(r.error.message);else load()});
}
function renderClients(){
  const q=($("cs")?.value||"").toLowerCase();
  $("clients").innerHTML=clients.filter(c=>String(c.nome||"").toLowerCase().includes(q)||String(c.telefone||"").includes(q)).map(c=>{const os=orders.filter(o=>(o.telefone||"")===c.telefone);return `<tr><td><b>${esc(c.nome)}</b></td><td>${esc(c.telefone||"")}</td><td>${os.length}</td><td>${money(os.reduce((a,o)=>a+Number(o.total||0),0))}</td></tr>`}).join("")||"<tr><td colspan='4'>Nenhum cliente.</td></tr>";
}
function renderPromos(){
  $("featuredProducts").innerHTML=products.filter(p=>p.destaque).map(p=>`<div class="mini-product"><span>${esc(p.nome)}</span><b>${money(p.preco)}</b></div>`).join("")||"<p class='muted'>Nenhum produto em destaque.</p>";
}
function renderReports(){
  const active=orders.filter(o=>statusOf(o.observacoes)!=="cancelado"),sum=active.reduce((a,o)=>a+Number(o.total||0),0);
  $("reports").innerHTML=[["Faturamento",money(sum)],["Pedidos",active.length],["Ticket médio",money(active.length?sum/active.length:0)],["Cancelados",orders.filter(o=>statusOf(o.observacoes)==="cancelado").length]].map(([a,b])=>`<div class="stat"><small>${a}</small><b>${b}</b></div>`).join("");
}
function renderConfig(){
  const c=JSON.parse(localStorage.getItem("ml_admin_config")||"{}");
  $("store").value=c.store||"Miguel Lanches";$("phoneStore").value=c.phone||"";$("fee").value=c.fee??"";
}
function productModal(p){
  const editing=!!p;
  $("body").innerHTML=`<h2>${editing?"Editar produto":"Novo produto"}</h2><div class="modal-form">
    <label>Nome<input id="mName" value="${esc(p?.nome||"")}"></label>
    <label>Descrição<textarea id="mDesc" rows="3">${esc(p?.descricao||"")}</textarea></label>
    <label>Preço<input id="mPrice" type="number" step="0.01" value="${p?.preco??""}"></label>
    <label>Categoria<select id="mCat">${cats.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(p?.categoria_id)?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></label>
    <label>Emoji<input id="mEmoji" value="${esc(p?.emoji||"🍔")}"></label>
    <label>Imagem URL<input id="mImg" value="${esc(p?.imagem_url||"")}"></label>
    <label>Ordem<input id="mOrder" type="number" value="${p?.ordem??0}"></label>
    <div class="modal-actions"><button class="btn" id="cancelModal">Cancelar</button><button class="btn primary" id="saveProduct">Salvar</button></div>
  </div>`;
  openModal();
  $("cancelModal").onclick=closeModal;
  $("saveProduct").onclick=async()=>{
    const data={nome:$("mName").value.trim(),descricao:$("mDesc").value.trim(),preco:Number($("mPrice").value||0),categoria_id:$("mCat").value||null,emoji:$("mEmoji").value.trim()||"🍔",imagem_url:$("mImg").value.trim()||null,ordem:Number($("mOrder").value||0)};
    if(!data.nome)return toast("Informe o nome.");
    const r=editing?await db.from("produtos").update(data).eq("id",p.id):await db.from("produtos").insert({...data,ativo:true,destaque:false});
    if(r.error)toast(r.error.message);else{closeModal();toast("Produto salvo");load()}
  };
}
function catModal(c){
  const editing=!!c;
  $("body").innerHTML=`<h2>${editing?"Editar categoria":"Nova categoria"}</h2><div class="modal-form">
    <label>Nome<input id="mcName" value="${esc(c?.nome||"")}"></label>
    <label>Emoji<input id="mcEmoji" value="${esc(c?.emoji||"📦")}"></label>
    <label>Ordem<input id="mcOrder" type="number" value="${c?.ordem??0}"></label>
    <div class="modal-actions"><button class="btn" id="cancelModal">Cancelar</button><button class="btn primary" id="saveCat">Salvar</button></div>
  </div>`;
  openModal();$("cancelModal").onclick=closeModal;
  $("saveCat").onclick=async()=>{
    const data={nome:$("mcName").value.trim(),emoji:$("mcEmoji").value.trim()||"📦",ordem:Number($("mcOrder").value||0)};
    if(!data.nome)return toast("Informe o nome.");
    const r=editing?await db.from("categorias").update(data).eq("id",c.id):await db.from("categorias").insert({...data,ativo:true});
    if(r.error)toast(r.error.message);else{closeModal();toast("Categoria salva");load()}
  };
}
function openModal(){$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}
function printOrder(o){
  if(!o)return;
  const items=itemsOf(o.observacoes),cliente=o.cliente||o.Cliente||"Cliente";
  const w=window.open("","_blank","width=420,height=700");
  if(!w)return toast("Permita pop-ups para imprimir.");
  w.document.write(`<!doctype html><html><head><title>Pedido</title><style>@page{size:58mm auto;margin:0}*{box-sizing:border-box}body{width:58mm;margin:0;padding:3mm;font:11px Arial,sans-serif;color:#000}.center{text-align:center}.line{border-top:1px dashed #000;margin:7px 0}.row{display:flex;justify-content:space-between;gap:5px}.item{margin:5px 0}.small{font-size:9px}h3{margin:0 0 4px;font-size:15px}</style></head><body><div class="center"><h3>MIGUEL LANCHES</h3>PEDIDO #${esc(String(o.id).slice(-5))}<br>${o.created_at?new Date(o.created_at).toLocaleString("pt-BR"):""}</div><div class="line"></div><b>CLIENTE:</b> ${esc(cliente)}<br><b>TELEFONE:</b> ${esc(o.telefone||"")}<br><b>ENDEREÇO:</b> ${esc(o.endereco||"Retirada")}${o.referencia?`<br><b>REF:</b> ${esc(o.referencia)}`:""}<div class="line"></div>${items.map(i=>`<div class="item"><div class="row"><span>${esc(i.quantidade)}x ${esc(i.nome)}</span><b>${money(Number(i.preco||0)*Number(i.quantidade||1))}</b></div>${i.obs?`<div class="small">Obs.: ${esc(i.obs)}</div>`:""}</div>`).join("")}<div class="line"></div><div class="row"><b>TOTAL</b><b>${money(o.total)}</b></div><div class="line"></div><div class="center">Obrigado!</div><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}
function printTest(){
  const w=window.open("","_blank","width=420,height=500");if(!w)return toast("Permita pop-ups para imprimir.");
  w.document.write(`<style>@page{size:58mm auto;margin:0}body{width:58mm;font:12px monospace;padding:3mm}hr{border:0;border-top:1px dashed #000}</style><center><b>MIGUEL LANCHES</b><br>TESTE 58 MM</center><hr>Pedido #00001<br>1x Produto de teste — R$ 10,00<hr><b>TOTAL R$ 10,00</b><script>window.onload=()=>window.print()<\/script>`);w.document.close();
}
function setup(){
  document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$("page-"+b.dataset.page).classList.add("active");document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("title").textContent=b.querySelector("span").textContent;$("side").classList.remove("open")});
  $("menu").onclick=()=>$("side").classList.toggle("open");$("refresh").onclick=load;$("loginBtn").onclick=login;$("pass").onkeydown=e=>e.key==="Enter"&&login();$("logout").onclick=async()=>{await db.auth.signOut();location.reload()};
  document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter=b.dataset.filter;renderOrders()});
  $("ps").oninput=renderProducts;$("cs").oninput=renderClients;$("newProduct").onclick=()=>productModal();$("newCat").onclick=()=>catModal();$("close").onclick=closeModal;$("modal").onclick=e=>{if(e.target.id==="modal")closeModal()};$("test").onclick=printTest;
  $("save").onclick=()=>{localStorage.setItem("ml_admin_config",JSON.stringify({store:$("store").value.trim(),phone:$("phoneStore").value.trim(),fee:Number($("fee").value||0)}));toast("Configurações salvas")};
  $("csv").onclick=()=>{const rows=[["id","cliente","telefone","total","status","criado_em"],...orders.map(o=>[o.id,o.cliente||o.Cliente||"",o.telefone||"",o.total||0,statusOf(o.observacoes),o.created_at||""])];const csv="\ufeff"+rows.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(";")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="miguel-lanches-pedidos.csv";a.click();URL.revokeObjectURL(a.href)};
}
setup();
db.auth.getSession().then(async s=>{if(s.data.session&&await isAdmin())start()});
