const SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let state={cats:[],products:[],ingredients:[],sizes:[],combos:[],clients:[],orders:[],cart:[],cat:"todos",history:"todos",admin:"produtos",delivery:0};
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const uid=()=>crypto.randomUUID();
const statusOf=o=>{let m=[...String(o||"").matchAll(/\[ML_STATUS\](preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];return m.length?m.at(-1)[1]:"preparo"};
const setStatus=(o,s)=>String(o||"").replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim()+`\n\n[ML_STATUS]${s}[/ML_STATUS]`;
const itemsOf=o=>{let m=String(o||"").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);if(!m)return[];try{return JSON.parse(decodeURIComponent(m[1]))}catch{return[]}};
const packItems=(items,o)=>String(o||"").replace(/\n?\n?\[ML_ITENS\][\s\S]*?\[\/ML_ITENS\]/g,"").trim()+`\n\n[ML_ITENS]${encodeURIComponent(JSON.stringify(items))}[/ML_ITENS]`;

async function loadAll(){
  $("syncStatus").textContent="● sincronizando";
  const queries=await Promise.all([
    db.from("categorias").select("*").order("ordem"),
    db.from("produtos").select("*,categorias(nome,emoji)").eq("ativo",true).order("ordem"),
    db.from("ingredientes").select("*").eq("ativo",true).order("nome"),
    db.from("tamanhos").select("*").eq("ativo",true).order("ordem"),
    db.from("combos").select("*").eq("ativo",true).order("nome"),
    db.from("clientes").select("*").order("nome"),
    db.from("pedidos").select("*").order("created_at",{ascending:false})
  ]);
  state.cats=queries[0].data||[]; state.products=queries[1].data||[]; state.ingredients=queries[2].data||[]; state.sizes=queries[3].data||[]; state.combos=queries[4].data||[]; state.clients=queries[5].data||[]; state.orders=queries[6].data||[];
  renderAll(); $("syncStatus").textContent="● online";
}
function renderAll(){renderCats();renderProducts();renderCart();renderOrders();renderHistory();renderClients();renderAdmin()}
function renderCats(){
  $("categoryTabs").innerHTML=`<button class="${state.cat==="todos"?"active":""}" onclick="chooseCat('todos')">🍽️ Todos</button>`+
    state.cats.filter(c=>c.ativo!==false).map(c=>`<button class="${state.cat===c.id?"active":""}" onclick="chooseCat('${c.id}')">${esc(c.emoji||"📦")} ${esc(c.nome)}</button>`).join("");
}
function chooseCat(id){state.cat=id;renderCats();renderProducts()}
function renderProducts(){
  let q=$("search").value.toLowerCase().trim();
  let list=state.products.filter(p=>(state.cat==="todos"||String(p.categoria_id)===String(state.cat))&&(!q||p.nome.toLowerCase().includes(q)));
  $("productGrid").innerHTML=list.length?list.map(p=>`<article class="product-card"><div class="product-img">${p.imagem_url?`<img src="${esc(p.imagem_url)}" alt="">`:esc(p.emoji||"🍔")}</div><div class="product-info"><h3>${esc(p.nome)}</h3><div class="product-bottom"><span class="price">${money(p.preco)}</span><button class="plus" onclick="openProduct('${p.id}')">+</button></div></div></article>`).join(""):`<div class="empty">Nenhum produto encontrado.</div>`;
}
async function openProduct(id){
  let p=state.products.find(x=>String(x.id)===String(id)); if(!p)return;
  let rel=await db.from("produto_ingredientes").select("ingrediente_id").eq("produto_id",id); let allowed=new Set((rel.data||[]).map(x=>String(x.ingrediente_id)));
  $("modalContent").innerHTML=`<h2>${esc(p.nome)}</h2><p class="muted">Escolha os adicionais e a quantidade.</p>
  <div class="form"><label>Quantidade<input id="mQty" type="number" min="1" value="1"></label>
  ${state.ingredients.length?`<label>Ingredientes adicionais</label><div class="checkboxes">${state.ingredients.filter(i=>allowed.has(String(i.id))).map(i=>`<label class="check"><input type="checkbox" value="${i.id}" data-name="${esc(i.nome)}" data-price="${i.preco}"> ${esc(i.nome)} + ${money(i.preco)}</label>`).join("")||"<small>Este produto não possui adicionais cadastrados.</small>"}</div>`:""}
  <label>Observação<textarea id="mObs" placeholder="Ex.: sem cebola..."></textarea></label>
  <div class="form-actions"><button class="mini" onclick="closeModal()">Voltar</button><button class="primary" onclick="addConfigured('${p.id}')">Adicionar ao pedido</button></div></div>`;
  $("modal").classList.remove("hidden");
}
function addConfigured(id){
  let p=state.products.find(x=>String(x.id)===String(id));let qty=Math.max(1,Number($("mQty").value||1));let adds=[...document.querySelectorAll("#modalContent input[type=checkbox]:checked")].map(x=>({id:x.value,nome:x.dataset.name,preco:Number(x.dataset.price||0)}));let obs=$("mObs").value.trim();
  let unit=Number(p.preco)+adds.reduce((s,x)=>s+x.preco,0);state.cart.push({key:uid(),id:p.id,nome:p.nome,preco:unit,quantidade:qty,base:Number(p.preco),adicionais:adds,obs});closeModal();renderCart();
}
function openCart(){ $("cart").classList.add("open"); $("cartOverlay").classList.add("open"); document.body.style.overflow="hidden"; }
function closeCart(){ $("cart").classList.remove("open"); $("cartOverlay").classList.remove("open"); document.body.style.overflow=""; }
function renderCart(){
  let n=state.cart.reduce((s,x)=>s+x.quantidade,0);$("cartCount").textContent=`${n} ${n===1?"item":"itens"}`;
  $("viewCartCount").textContent=`${n} ${n===1?"item":"itens"}`;
  $("cartItems").innerHTML=state.cart.length?state.cart.map(x=>`<div class="cart-item"><div class="cart-main"><span class="cart-name">${x.quantidade}x ${esc(x.nome)}</span><span class="cart-price">${money(x.preco*x.quantidade)}</span></div>${x.adicionais.length?`<div class="cart-addons">+ ${x.adicionais.map(a=>esc(a.nome)).join(", ")}</div>`:""}${x.obs?`<div class="cart-addons">${esc(x.obs)}</div>`:""}<div class="qty"><button onclick="changeQty('${x.key}',-1)">−</button><b>${x.quantidade}</b><button onclick="changeQty('${x.key}',1)">+</button><button class="remove" onclick="removeCart('${x.key}')">🗑</button></div></div>`).join(""):`<div class="cart-empty">Sua comanda está vazia.<br>Toque no + de um produto.</div>`;
  let sub=state.cart.reduce((s,x)=>s+x.preco*x.quantidade,0),fee=Number($("taxaEntrega").value||0);$("subtotal").textContent=money(sub);$("deliveryShow").textContent=money(fee);$("total").textContent=money(sub+fee);$("viewCartTotal").textContent=money(sub+fee);
}
function changeQty(k,d){let x=state.cart.find(x=>x.key===k);if(!x)return;x.quantidade+=d;if(x.quantidade<1)state.cart=state.cart.filter(y=>y.key!==k);renderCart()}
function removeCart(k){state.cart=state.cart.filter(x=>x.key!==k);renderCart()}
$("search").oninput=renderProducts;
$("taxaEntrega").oninput=renderCart;
$("clearCart").onclick=()=>{state.cart=[];renderCart()};
$("viewCart").onclick=openCart;
$("closeCart").onclick=closeCart;
$("cartOverlay").onclick=closeCart;
$("finish").onclick=finishOrder;
async function finishOrder(){
  if(!state.cart.length)return alert("Adicione pelo menos um produto.");
  let nome=$("cliente").value.trim();if(!nome)return alert("Informe o nome do cliente.");
  let phone=$("telefone").value.trim(),addr=$("endereco").value.trim(),ref=$("referencia").value.trim(),obs=$("observacoes").value.trim(),fee=Number($("taxaEntrega").value||0);
  let items=state.cart.map(x=>({nome:x.nome,quantidade:x.quantidade,preco:x.preco,adicionais:x.adicionais,obs:x.obs}));let total=state.cart.reduce((s,x)=>s+x.preco*x.quantidade,0)+fee;
  let finalObs=packItems(items,obs)+`\n[ML_ENTREGA]${fee}[/ML_ENTREGA]`+"\n[ML_STATUS]preparo[/ML_STATUS]";
  let {data,error}=await db.from("pedidos").insert({Cliente:nome,telefone:phone,endereco:addr,referencia:ref,observacoes:finalObs,total}).select().single();
  if(error)return alert("Erro ao salvar: "+error.message);
  if(phone&&!state.clients.some(c=>c.telefone===phone))await db.from("clientes").upsert({nome,telefone:phone,endereco:addr,referencia:ref},{onConflict:"telefone"});
  state.cart=[];closeCart();["cliente","telefone","endereco","referencia","observacoes"].forEach(id=>$(id).value="");$("taxaEntrega").value=0;await loadAll();go("comandas");alert("Pedido criado com sucesso!");
}
function orderCard(p){
  let s=statusOf(p.observacoes),it=itemsOf(p.observacoes),sum=it.map(x=>`${x.quantidade}x ${x.nome}`).join(", ");return `<div class="order-card"><h3>#${String(p.id).slice(-5)} — ${esc(p.Cliente||"Cliente")}</h3><div class="meta">${esc(sum||"Pedido")} · ${money(p.total)} · ${new Date(p.created_at).toLocaleString("pt-BR")}</div><span class="badge ${s==="entrega"?"green":""}">${s==="preparo"?"🍔 Em preparo":"🛵 Saiu para entrega"}</span><div class="order-actions">${s==="preparo"?`<button class="action green" onclick="changeStatus('${p.id}','entrega')">🛵 Saiu para entrega</button>`:`<button class="action green" onclick="changeStatus('${p.id}','entregue')">✓ Entregue</button>`}<button class="action red" onclick="cancelOrder('${p.id}')">Cancelar</button>${p.telefone?`<button class="action whats" onclick="wa('${p.id}')">WhatsApp</button>`:""}</div></div>`;
}
function renderOrders(){
 let open=state.orders.filter(p=>!["entregue","cancelado"].includes(statusOf(p.observacoes))),prep=open.filter(p=>statusOf(p.observacoes)==="preparo"),del=open.filter(p=>statusOf(p.observacoes)==="entrega");
 $("prepList").innerHTML=prep.length?prep.map(orderCard).join(""):`<div class="empty">Nenhum pedido em preparo.</div>`;$("deliveryList").innerHTML=del.length?del.map(orderCard).join(""):`<div class="empty">Nenhum pedido para entrega.</div>`;$("countPrep").textContent=prep.length;$("countDelivery").textContent=del.length;$("openCount").textContent=open.length;
}
async function changeStatus(id,s){let p=state.orders.find(x=>String(x.id)===String(id));if(!p)return;let {error}=await db.from("pedidos").update({observacoes:setStatus(p.observacoes,s)}).eq("id",p.id);if(error)return alert(error.message);if(s==="entrega"&&p.telefone)wa(id);await loadAll()}
async function cancelOrder(id){if(!confirm("Cancelar este pedido?"))return;let p=state.orders.find(x=>String(x.id)===String(id));if(!p)return;let {error}=await db.from("pedidos").update({observacoes:setStatus(p.observacoes,"cancelado")}).eq("id",p.id);if(error)return alert(error.message);await loadAll()}
function wa(id){let p=state.orders.find(x=>String(x.id)===String(id));if(!p?.telefone)return;let n=p.telefone.replace(/\D/g,"");if(n.length===10||n.length===11)n="55"+n;let s=statusOf(p.observacoes),msg=encodeURIComponent(s==="entrega"?`Olá, ${p.Cliente}! 🛵 Seu pedido saiu para entrega e está a caminho.`:"Olá! Seu pedido foi atualizado.");location.href=`whatsapp://send?phone=${n}&text=${msg}`}
function renderHistory(){
 let list=state.orders.filter(p=>state.history==="todos"||statusOf(p.observacoes)===state.history),valid=state.orders.filter(p=>statusOf(p.observacoes)!=="cancelado"),today=new Date().toLocaleDateString("pt-BR"),td=valid.filter(p=>new Date(p.created_at).toLocaleDateString("pt-BR")===today),sum=td.reduce((s,p)=>s+Number(p.total||0),0);
 $("stats").innerHTML=`<div class="stat"><span>Vendas de hoje</span><strong>${money(sum)}</strong></div><div class="stat"><span>Pedidos válidos</span><strong>${td.length}</strong></div><div class="stat"><span>Ticket médio</span><strong>${money(td.length?sum/td.length:0)}</strong></div>`;
 $("history").innerHTML=list.length?list.map(p=>{let s=statusOf(p.observacoes);return `<tr><td>#${String(p.id).slice(-5)}</td><td>${esc(p.Cliente||"")}</td><td>${new Date(p.created_at).toLocaleString("pt-BR")}</td><td><span class="badge ${s==="entregue"?"green":s==="cancelado"?"red":""}">${s}</span></td><td>${money(p.total)}</td></tr>`}).join(""):`<tr><td colspan="5">Nenhum pedido.</td></tr>`;
}
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.history=b.dataset.history;renderHistory()});
function renderClients(){let q=($("clientSearch")?.value||"").toLowerCase();let list=state.clients.filter(c=>(c.nome||"").toLowerCase().includes(q)||(c.telefone||"").includes(q));$("clientGrid").innerHTML=list.length?list.map(c=>`<div class="client-card"><h3>${esc(c.nome)}</h3><p>📞 ${esc(c.telefone||"Sem telefone")}</p><p>📍 ${esc(c.endereco||"Sem endereço")}</p><p>📌 ${esc(c.referencia||"")}</p><div class="client-actions"><button class="mini" onclick="useClient('${c.id}')">Usar no pedido</button><button class="mini" onclick="editClient('${c.id}')">Editar</button></div></div>`).join(""):`<div class="empty">Nenhum cliente.</div>`}
$("clientSearch").oninput=renderClients;
function useClient(id){let c=state.clients.find(x=>String(x.id)===String(id));if(!c)return;$("cliente").value=c.nome||"";$("telefone").value=c.telefone||"";$("endereco").value=c.endereco||"";$("referencia").value=c.referencia||"";go("pedido")}
function clientForm(c={}){$("modalContent").innerHTML=`<h2>${c.id?"Editar":"Novo"} cliente</h2><div class="form"><label>Nome<input id="fNome" value="${esc(c.nome||"")}"></label><label>Telefone<input id="fTel" value="${esc(c.telefone||"")}"></label><label>Endereço<input id="fEnd" value="${esc(c.endereco||"")}"></label><label>Referência<input id="fRef" value="${esc(c.referencia||"")}"></label><div class="form-actions"><button class="mini" onclick="closeModal()">Cancelar</button><button class="primary" onclick="saveClient('${c.id||""}')">Salvar</button></div></div>`;$("modal").classList.remove("hidden")}
$("newClient").onclick=()=>clientForm();window.editClient=id=>clientForm(state.clients.find(c=>String(c.id)===String(id)));
window.saveClient=async id=>{let row={nome:$("fNome").value.trim(),telefone:$("fTel").value.trim(),endereco:$("fEnd").value.trim(),referencia:$("fRef").value.trim()};let r=id?await db.from("clientes").update(row).eq("id",id):await db.from("clientes").insert(row);if(r.error)return alert(r.error.message);closeModal();loadAll()};
function adminTitle(type){return{produtos:"Produtos",categorias:"Categorias",adicionais:"Ingredientes adicionais",tamanhos:"Tamanhos",combos:"Combos",entrega:"Entrega",pagamento:"Pagamento"}[type]}
function renderAdmin(){
 let type=state.admin, html=`<div class="admin-top"><h2>${adminTitle(type)}</h2>${["entrega","pagamento"].includes(type)?"":`<button class="primary" onclick="adminNew('${type}')">+ Adicionar</button>`}</div>`;
 if(type==="produtos")html+=state.products.map(p=>`<div class="admin-row"><div class="product-img" style="width:70px;height:55px;border-radius:8px;font-size:25px">${p.imagem_url?`<img src="${esc(p.imagem_url)}" style="width:100%;height:100%;object-fit:cover">`:esc(p.emoji||"🍔")}</div><div class="grow"><h3>${esc(p.nome)}</h3><small>${money(p.preco)} · ${esc(p.categorias?.nome||"Sem categoria")}</small></div><div class="row-actions"><button class="mini" onclick="adminEdit('produtos','${p.id}')">Editar</button><button class="mini danger" onclick="adminDelete('produtos','${p.id}')">Desativar</button></div></div>`).join("")||`<div class="empty">Nenhum produto.</div>`;
 if(type==="categorias")html+=state.cats.map(c=>`<div class="admin-row"><div class="grow"><h3>${esc(c.emoji||"📦")} ${esc(c.nome)}</h3><small>Ordem ${c.ordem||99}</small></div><div class="row-actions"><button class="mini" onclick="adminEdit('categorias','${c.id}')">Editar</button><button class="mini danger" onclick="adminDelete('categorias','${c.id}')">Desativar</button></div></div>`).join("")||`<div class="empty">Nenhuma categoria.</div>`;
 if(type==="adicionais")html+=state.ingredients.map(i=>`<div class="admin-row"><div class="grow"><h3>${esc(i.nome)}</h3><small>${money(i.preco)}</small></div><div class="row-actions"><button class="mini" onclick="adminEdit('adicionais','${i.id}')">Editar</button><button class="mini danger" onclick="adminDelete('adicionais','${i.id}')">Desativar</button></div></div>`).join("")||`<div class="empty">Nenhum adicional.</div>`;
 if(type==="tamanhos")html+=state.sizes.map(s=>`<div class="admin-row"><div class="grow"><h3>${esc(s.nome)}</h3><small>${money(s.acrescimo||s.preco||0)}</small></div><div class="row-actions"><button class="mini" onclick="adminEdit('tamanhos','${s.id}')">Editar</button><button class="mini danger" onclick="adminDelete('tamanhos','${s.id}')">Desativar</button></div></div>`).join("")||`<div class="empty">Nenhum tamanho.</div>`;
 if(type==="combos")html+=state.combos.map(c=>`<div class="admin-row"><div class="grow"><h3>${esc(c.nome)}</h3><small>${money(c.preco)}</small></div><div class="row-actions"><button class="mini" onclick="adminEdit('combos','${c.id}')">Editar</button><button class="mini danger" onclick="adminDelete('combos','${c.id}')">Desativar</button></div></div>`).join("")||`<div class="empty">Nenhum combo.</div>`;
 if(type==="entrega")html+=`<div class="panel"><div class="form"><label>Taxa padrão de entrega<input id="cfgFee" type="number" step="0.01" value="${state.delivery}"></label><button class="primary" onclick="saveDelivery()">Salvar configuração</button></div></div>`;
 if(type==="pagamento")html+=`<div class="panel"><div class="form"><label>Formas de pagamento</label><div class="checkboxes">${["Dinheiro","Pix","Cartão de débito","Cartão de crédito"].map(x=>`<label class="check"><input type="checkbox" checked> ${x}</label>`).join("")}</div><small>O cálculo de troco será usado no pedido; a impressão fica para a próxima etapa.</small></div></div>`;
 $("adminContent").innerHTML=html;
}
document.querySelectorAll(".admin-tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".admin-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.admin=b.dataset.admin;renderAdmin()});
function formFor(type,row={}){
 let fields="";
 if(type==="categorias")fields=`<label>Nome<input id="f1" value="${esc(row.nome||"")}"></label><label>Emoji<input id="f2" value="${esc(row.emoji||"📦")}"></label><label>Ordem<input id="f3" type="number" value="${row.ordem||99}"></label>`;
 if(type==="adicionais")fields=`<label>Nome<input id="f1" value="${esc(row.nome||"")}"></label><label>Preço<input id="f2" type="number" step="0.01" value="${row.preco||0}"></label>`;
 if(type==="tamanhos")fields=`<label>Nome<input id="f1" value="${esc(row.nome||"")}"></label><label>Acréscimo<input id="f2" type="number" step="0.01" value="${row.acrescimo||0}"></label><label>Ordem<input id="f3" type="number" value="${row.ordem||99}"></label>`;
 if(type==="combos")fields=`<label>Nome<input id="f1" value="${esc(row.nome||"")}"></label><label>Preço<input id="f2" type="number" step="0.01" value="${row.preco||0}"></label><label>Descrição<textarea id="f3">${esc(row.descricao||"")}</textarea></label>`;
 if(type==="produtos")fields=`<label>Nome<input id="f1" value="${esc(row.nome||"")}"></label><label>Categoria<select id="f2">${state.cats.map(c=>`<option value="${c.id}" ${String(c.id)===String(row.categoria_id)?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></label><label>Preço<input id="f3" type="number" step="0.01" value="${row.preco||0}"></label><label>URL da imagem<input id="f4" placeholder="https://..." value="${esc(row.imagem_url||"")}"></label><label>Emoji reserva<input id="f5" value="${esc(row.emoji||"🍔")}"></label><label>Ordem<input id="f6" type="number" value="${row.ordem||99}"></label>`;
 $("modalContent").innerHTML=`<h2>${row.id?"Editar":"Adicionar"} ${adminTitle(type)}</h2><div class="form">${fields}<div class="form-actions"><button class="mini" onclick="closeModal()">Cancelar</button><button class="primary" onclick="adminSave('${type}','${row.id||""}')">Salvar</button></div></div>`;$("modal").classList.remove("hidden");
}
window.adminNew=t=>formFor(t);window.adminEdit=(t,id)=>{let maps={produtos:state.products,categorias:state.cats,adicionais:state.ingredients,tamanhos:state.sizes,combos:state.combos};formFor(t,(maps[t]||[]).find(x=>String(x.id)===String(id))||{})};
window.adminSave=async(t,id)=>{let row={};if(t==="categorias")row={nome:$("f1").value.trim(),emoji:$("f2").value.trim(),ordem:Number($("f3").value||99),ativo:true};if(t==="adicionais")row={nome:$("f1").value.trim(),preco:Number($("f2").value||0),ativo:true};if(t==="tamanhos")row={nome:$("f1").value.trim(),acrescimo:Number($("f2").value||0),ordem:Number($("f3").value||99),ativo:true};if(t==="combos")row={nome:$("f1").value.trim(),preco:Number($("f2").value||0),descricao:$("f3").value.trim(),ativo:true};if(t==="produtos")row={nome:$("f1").value.trim(),categoria_id:$("f2").value,preco:Number($("f3").value||0),imagem_url:$("f4").value.trim()||null,emoji:$("f5").value.trim(),ordem:Number($("f6").value||99),ativo:true};let table={produtos:"produtos",categorias:"categorias",adicionais:"ingredientes",tamanhos:"tamanhos",combos:"combos"}[t];let r=id?await db.from(table).update(row).eq("id",id):await db.from(table).insert(row);if(r.error)return alert(r.error.message);closeModal();loadAll()};
window.adminDelete=async(t,id)=>{if(!confirm("Desativar este item?"))return;let table={produtos:"produtos",categorias:"categorias",adicionais:"ingredientes",tamanhos:"tamanhos",combos:"combos"}[t];let r=await db.from(table).update({ativo:false}).eq("id",id);if(r.error)return alert(r.error.message);loadAll()};
async function saveDelivery(){let v=Number($("cfgFee").value||0);let r=await db.from("configuracoes").upsert({chave:"taxa_entrega",valor:String(v),updated_at:new Date().toISOString()},{onConflict:"chave"});if(r.error)return alert(r.error.message);state.delivery=v;alert("Taxa salva.");}
async function loadConfig(){let r=await db.from("configuracoes").select("*").eq("chave","taxa_entrega").maybeSingle();state.delivery=Number(r.data?.valor||0);$("taxaEntrega").value=state.delivery}
function go(page){if(typeof closeCart==="function")closeCart();document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$("page-"+page).classList.add("active");document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===page));let names={pedido:["Novo Pedido","Monte o pedido rapidamente"],comandas:["Comandas","Acompanhe os pedidos em tempo real"],historico:["Histórico","Vendas e pedidos cancelados"],clientes:["Clientes","Clientes salvos"],admin:["Administração","Gerencie seu cardápio"]};$("pageTitle").textContent=names[page][0];$("pageSubtitle").textContent=names[page][1];$("sidebar").classList.remove("open");if(page==="pedido")loadConfig()}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>go(b.dataset.page));$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");$("closeModal").onclick=closeModal;$("modal").onclick=e=>{if(e.target===$("modal"))closeModal()};function closeModal(){$("modal").classList.add("hidden")}
$("findClient").onclick=()=>go("clientes");
function realtime(){db.channel("ml-web").on("postgres_changes",{event:"*",schema:"public",table:"pedidos"},loadAll).subscribe();db.channel("ml-cardapio").on("postgres_changes",{event:"*",schema:"public",table:"produtos"},loadAll).subscribe()}
loadConfig();loadAll();realtime();