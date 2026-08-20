const SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const state={orders:[],products:[],cats:[],clients:[],filter:"todos",menu:"products"};
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
function statusOf(o){let m=[...String(o||"").matchAll(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];return m.length?m.at(-1)[1]:"novo"}
function setStatus(o,s){return String(o||"").replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim()+`\n\n[ML_STATUS]${s}[/ML_STATUS]`}
function itemsOf(o){let m=String(o||"").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);if(!m)return[];try{return JSON.parse(decodeURIComponent(m[1]))}catch{return[]}}
async function load(){
 const [o,p,c,cl]=await Promise.all([
  db.from("pedidos").select("*").order("created_at",{ascending:false}).limit(300),
  db.from("produtos").select("*,categorias(nome,emoji)").order("ordem"),
  db.from("categorias").select("*").order("ordem"),
  db.from("clientes").select("*").order("nome")
 ]);
 state.orders=o.data||[];state.products=p.data||[];state.cats=c.data||[];state.clients=cl.data||[];
 $("connection").textContent="● online";
 renderDashboard();renderOrders();renderMenu();renderClients();renderFinance();
}
function renderDashboard(){
 const today=new Date().toISOString().slice(0,10),tod=state.orders.filter(o=>(o.created_at||"").slice(0,10)===today&&statusOf(o.observacoes)!=="cancelado"),sales=tod.reduce((a,o)=>a+Number(o.total||0),0);
 $("kpis").innerHTML=`<div class=kpi><small>Pedidos hoje</small><b>${tod.length}</b></div><div class=kpi><small>Faturamento hoje</small><b>${money(sales)}</b></div><div class=kpi><small>Ticket médio</small><b>${money(tod.length?sales/tod.length:0)}</b></div><div class=kpi><small>Novos pedidos</small><b>${state.orders.filter(o=>statusOf(o.observacoes)==="novo").length}</b></div>`;
 $("recent").innerHTML=state.orders.slice(0,8).map(o=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee"><span><b>#${String(o.id).slice(-5)}</b> · ${esc(o.Cliente||"Cliente")}</span><b>${money(o.total)}</b></div>`).join("")||"<span class=muted>Nenhum pedido.</span>";
 const ss=["novo","preparo","entrega","entregue","cancelado"],nm={novo:"Novos",preparo:"Em preparo",entrega:"Para entrega",entregue:"Entregues",cancelado:"Cancelados"};
 $("statusBox").innerHTML=ss.map(s=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee"><span>${nm[s]}</span><b>${state.orders.filter(o=>statusOf(o.observacoes)===s).length}</b></div>`).join("");
 $("newCount").textContent=state.orders.filter(o=>statusOf(o.observacoes)==="novo").length;
}
function renderOrders(){
 let list=state.filter==="todos"?state.orders:state.orders.filter(o=>statusOf(o.observacoes)===state.filter);
 $("orders").innerHTML=list.map(o=>{let s=statusOf(o.observacoes),its=itemsOf(o.observacoes);return `<article class=order><div class=order-top><div><h3>Pedido #${String(o.id).slice(-5)}</h3><span class=muted>${esc(o.Cliente||"Cliente")} · ${new Date(o.created_at).toLocaleString("pt-BR")}</span></div><span class="status ${s}">${label(s)}</span></div><div class=items>${its.map(i=>`${i.quantidade}x ${esc(i.nome)} — ${money(Number(i.preco)*Number(i.quantidade))}${i.adicionais?.length?`<br><span class=muted>+ ${i.adicionais.map(a=>esc(a.nome)).join(", ")}</span>`:""}`).join("<br>")||"Itens não detalhados"}<br><br><span class=muted>${esc(o.endereco||"")} ${o.referencia?`· ${esc(o.referencia)}`:""}</span></div><div class=order-foot><b>${money(o.total)}</b><div><button class=print data-print="${o.id}">🖨</button> <select data-change="${o.id}">${["novo","preparo","entrega","entregue","cancelado"].map(x=>`<option value="${x}" ${x===s?"selected":""}>${label(x)}</option>`).join("")}</select></div></div></article>`}).join("")||"<div class=panel>Nenhum pedido encontrado.</div>";
 document.querySelectorAll("[data-change]").forEach(x=>x.onchange=()=>changeStatus(x.dataset.change,x.value));
 document.querySelectorAll("[data-print]").forEach(x=>x.onclick=()=>printOrder(state.orders.find(o=>String(o.id)===String(x.dataset.print))));
}
function label(s){return{novo:"Novo",preparo:"Em preparo",entrega:"Saiu para entrega",entregue:"Entregue",cancelado:"Cancelado"}[s]||s}
async function changeStatus(id,s){const o=state.orders.find(x=>String(x.id)===String(id));if(!o)return;const r=await db.from("pedidos").update({observacoes:setStatus(o.observacoes,s)}).eq("id",o.id);if(r.error)return toast(r.error.message);o.observacoes=setStatus(o.observacoes,s);renderDashboard();renderOrders();toast("Status atualizado")}
function printOrder(o){
 if(!o)return;let its=itemsOf(o.observacoes);let rows=its.map(i=>`<div style="padding:5px 0;border-bottom:1px dotted #777"><b>${i.quantidade}x</b> ${esc(i.nome)}<br><span>${money(Number(i.preco)*Number(i.quantidade))}</span>${i.adicionais?.length?`<br><small>+ ${i.adicionais.map(a=>esc(a.nome)).join(", ")}</small>`:""}${i.obs?`<br><small>Obs: ${esc(i.obs)}</small>`:""}</div>`).join("");
 const w=window.open("","_blank","width=420,height=700");if(!w)return toast("Permita pop-ups para imprimir");
 w.document.write(`<!doctype html><html><head><meta charset=utf-8><title>Pedido</title><style>@page{size:58mm auto;margin:0}body{width:58mm;margin:0;padding:3mm;font:12px Arial;color:#000}.center{text-align:center}.line{border-top:1px dashed #000;margin:7px 0}.total{font-weight:900;font-size:15px;display:flex;justify-content:space-between}</style></head><body><div class=center><b style="font-size:17px">MIGUEL LANCHES</b><br>PEDIDO #${String(o.id).slice(-5)}</div><div class=line></div><b>CLIENTE:</b> ${esc(o.Cliente)}<br><b>END:</b> ${esc(o.endereco||"")}<br><b>REF:</b> ${esc(o.referencia||"")}<div class=line></div>${rows}<div class=line></div><b>OBS:</b> ${esc(String(o.observacoes||"").replace(/\[ML_ITENS\][\s\S]*?\[\/ML_ITENS\]/,"").replace(/\[ML_ENTREGA\].*?\[\/ML_ENTREGA\]/,"").replace(/\[ML_STATUS\].*?\[\/ML_STATUS\]/,"").trim())||"—"}<div class=line></div><div class=total><span>TOTAL</span><span>${money(o.total)}</span></div><div class=line></div><div class=center>Obrigado!</div><script>window.print()</script></body></html>`);w.document.close();
}
function renderMenu(){
 if(state.menu==="categories"){$("menu").innerHTML=`<div class=panel><table class=table><tr><th>Categoria</th><th>Ícone</th><th>Status</th></tr>${state.cats.map(c=>`<tr><td>${esc(c.nome)}</td><td>${esc(c.emoji||"")}</td><td>${c.ativo===false?"Inativa":"Ativa"}</td></tr>`).join("")}</table></div>`;return}
 $("menu").innerHTML=`<div class=panel style="overflow:auto"><table class=table><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Status</th><th>Ação</th></tr>${state.products.map(p=>`<tr><td><b>${esc(p.nome)}</b><br><small class=muted>${esc(p.descricao||"")}</small></td><td>${esc(p.categorias?.nome||"—")}</td><td>${money(p.preco)}</td><td>${p.ativo===false?"Inativo":"Ativo"}</td><td><button class=print data-edit="${p.id}">Editar</button></td></tr>`).join("")}</table></div>`;
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editProduct(state.products.find(p=>String(p.id)===String(b.dataset.edit))));
}
function editProduct(p=null){
 $("modal").classList.remove("hidden");$("modalBody").innerHTML=`<h2>${p?"Editar produto":"Novo produto"}</h2><div class=form><label>Nome<input id=fName value="${esc(p?.nome||"")}"></label><label>Descrição<textarea id=fDesc>${esc(p?.descricao||"")}</textarea></label><label>Preço<input id=fPrice type=number step=0.01 value="${p?.preco||""}"></label><label>Categoria<select id=fCat>${state.cats.map(c=>`<option value="${c.id}" ${String(p?.categoria_id)===String(c.id)?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></label><button class=red id=saveProduct>Salvar</button></div>`;
 $("saveProduct").onclick=async()=>{const data={nome:$("fName").value.trim(),descricao:$("fDesc").value.trim(),preco:Number($("fPrice").value),categoria_id:$("fCat").value,ativo:true};if(!data.nome||!data.preco)return toast("Preencha nome e preço");let r=p?await db.from("produtos").update(data).eq("id",p.id):await db.from("produtos").insert(data);if(r.error)return toast(r.error.message);$("modal").classList.add("hidden");await load();toast("Produto salvo")};
}
function renderClients(){const q=($("clientSearch").value||"").toLowerCase();$("clients").innerHTML=state.clients.filter(c=>(c.nome||"").toLowerCase().includes(q)||(c.telefone||"").includes(q)).map(c=>`<div class=client><b>${esc(c.nome)}</b><p class=muted>${esc(c.telefone||"")}</p><p>${esc(c.endereco||"")}</p></div>`).join("")||"<div class=panel>Nenhum cliente encontrado.</div>"}
function renderFinance(){const ok=state.orders.filter(o=>statusOf(o.observacoes)!=="cancelado"),sales=ok.reduce((a,o)=>a+Number(o.total||0),0);$("finance").innerHTML=`<div class=finance-card><small>Faturamento</small><br><b>${money(sales)}</b></div><div class=finance-card><small>Pedidos</small><br><b>${ok.length}</b></div><div class=finance-card><small>Ticket médio</small><br><b>${money(ok.length?sales/ok.length:0)}</b></div>`}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$("page-"+b.dataset.page).classList.add("active");$("pageTitle").textContent=b.querySelector("span")?.textContent||"Gestão"});
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.filter=b.dataset.filter;renderOrders()});
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.menu=b.dataset.menu;renderMenu()});
$("addProduct").onclick=()=>editProduct();$("closeModal").onclick=()=>$("modal").classList.add("hidden");$("clientSearch").oninput=renderClients;$("refresh").onclick=load;
db.channel("pedidos-v2").on("postgres_changes",{event:"*",schema:"public",table:"pedidos"},()=>load()).subscribe();
load();
