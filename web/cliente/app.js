const cfg=window.ML_CONFIG;
const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_KEY);
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
let state={cats:[],products:[],ingredients:[],neighborhoods:[],cart:[],cat:"todos",mode:"entrega",payment:"Dinheiro",delivery:0,currentOrder:null};

function statusOf(o){const m=[...String(o||"").matchAll(/\[ML_STATUS\](preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];return m.length?m.at(-1)[1]:"preparo"}
function itemsOf(o){const m=String(o||"").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);if(!m)return[];try{return JSON.parse(decodeURIComponent(m[1]))}catch{return[]}}
function go(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  $(view).classList.add("active");
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  window.scrollTo({top:0,behavior:"smooth"});
  $("backBtn").style.visibility=view==="homeView"?"hidden":"visible";
  if(view==="trackingView")renderTracking();
  if(view==="checkoutView")renderCheckout();
  renderCartBar();
}
$("backBtn").onclick=()=>go("homeView");
document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>go(b.dataset.view));
$("headerCart").onclick=()=>go("cartView");$("openCart").onclick=()=>go("cartView");
$("allProducts").onclick=()=>{state.cat="todos";go("homeView");renderCatalog()};
$("search").oninput=renderHome;

async function load(){
  try{
    const [c,p,i,b]=await Promise.all([
      db.from("categorias").select("*").eq("ativo",true).order("ordem"),
      db.from("produtos").select("*,categorias(nome,emoji)").eq("ativo",true).order("ordem"),
      db.from("ingredientes").select("*").eq("ativo",true).order("nome"),
      db.from("bairros").select("*").order("nome")
    ]);
    state.cats=c.data||[];state.products=p.data||[];state.ingredients=i.data||[];state.neighborhoods=b.data||[];
    $("storeStatus").textContent="● aberto agora";
    renderHome();renderCategories();fillNeighborhoods();
  }catch(e){$("storeStatus").textContent="● modo local";renderHome()}
  setTimeout(()=>{$("splash").classList.add("hidden")},500);
}
function renderHome(){
  const q=$("search").value.toLowerCase().trim();
  renderChips();
  const filtered=state.products.filter(p=>!q||p.nome.toLowerCase().includes(q)||(p.categorias?.nome||"").toLowerCase().includes(q));
  const featured=(filtered.length?filtered:state.products).slice(0,6);
  $("featured").innerHTML=featured.length?featured.map(productCard).join(""):`<div class="empty">Seu cardápio ainda está vazio.<br>Cadastre produtos no Admin.</div>`;
  renderCatalog(filtered);
}
function renderChips(){
  $("categoryTabs").innerHTML=`<button class="${state.cat==="todos"?"active":""}" onclick="setCat('todos')">Todos</button>`+state.cats.map(c=>`<button class="${String(state.cat)===String(c.id)?"active":""}" onclick="setCat('${c.id}')">${esc(c.emoji||"🍽️")} ${esc(c.nome)}</button>`).join("");
}
function setCat(id){state.cat=id;renderHome()}
function productCard(p){
  const img=p.imagem_url?`<img src="${esc(p.imagem_url)}" alt="${esc(p.nome)}">`:`<span style="font-size:60px">${esc(p.emoji||"🍔")}</span>`;
  return `<article class="product-card"><div class="product-img">${img}</div><div class="product-info"><h3>${esc(p.nome)}</h3><div class="desc">${esc(p.descricao||"Delicioso, preparado na hora.")}</div><div class="product-bottom"><span class="price">${money(p.preco)}</span><button class="plus" onclick="openProduct('${p.id}')">+</button></div></div></article>`
}
function renderCatalog(list=state.products){
  let arr=list.filter(p=>state.cat==="todos"||String(p.categoria_id)===String(state.cat));
  if(state.cat!=="todos"){$("catalog").innerHTML=`<div class="catalog-category"><h2>${esc(state.cats.find(c=>String(c.id)===String(state.cat))?.nome||"Produtos")}</h2><div class="product-grid">${arr.map(productCard).join("")||`<div class="empty">Nenhum produto nesta categoria.</div>`}</div></div>`;return}
  const groups=state.cats.map(c=>({c,items:arr.filter(p=>String(p.categoria_id)===String(c.id))})).filter(g=>g.items.length);
  $("catalog").innerHTML=groups.map(g=>`<div class="catalog-category"><h2>${esc(g.c.emoji||"")} ${esc(g.c.nome)}</h2><div class="product-grid">${g.items.map(productCard).join("")}</div></div>`).join("")||`<div class="empty">Nenhum produto cadastrado ainda.</div>`;
}
async function openProduct(id){
  const p=state.products.find(x=>String(x.id)===String(id));if(!p)return;
  let allowed=[];
  try{const r=await db.from("produto_ingredientes").select("ingrediente_id").eq("produto_id",id);allowed=(r.data||[]).map(x=>String(x.ingrediente_id))}catch{}
  const adds=state.ingredients.filter(i=>allowed.includes(String(i.id)));
  $("productModalContent").innerHTML=`<h2>${esc(p.nome)}</h2><p class="muted">${esc(p.descricao||"Escolha os adicionais e a quantidade.")}</p>
  <div class="form-card" style="margin:0;padding:0;background:none;border:0">
  <label>Quantidade<input id="qty" type="number" min="1" value="1"></label>
  ${adds.length?`<h3>Adicionais</h3>${adds.map(i=>`<label><input class="addon" type="checkbox" value="${i.id}" data-name="${esc(i.nome)}" data-price="${i.preco}"> ${esc(i.nome)} + ${money(i.preco)}</label>`).join("")}`:"<p class='muted'>Sem adicionais cadastrados para este produto.</p>"}
  <label>Observação<textarea id="prodObs" placeholder="Ex.: sem cebola..."></textarea></label>
  <button class="primary wide" onclick="addToCart('${p.id}')">Adicionar — ${money(p.preco)}</button></div>`;
  $("productModal").classList.remove("hidden")
}
$("closeProduct").onclick=()=>$("productModal").classList.add("hidden");
$("productModal").onclick=e=>{if(e.target.id==="productModal")$("productModal").classList.add("hidden")};
function addToCart(id){
  const p=state.products.find(x=>String(x.id)===String(id));const q=Math.max(1,Number($("qty").value||1));
  const adds=[...document.querySelectorAll(".addon:checked")].map(x=>({id:x.value,nome:x.dataset.name,preco:Number(x.dataset.price||0)}));
  const unit=Number(p.preco)+adds.reduce((s,a)=>s+a.preco,0);
  state.cart.push({key:crypto.randomUUID(),id:p.id,nome:p.nome,base:Number(p.preco),preco:unit,quantidade:q,adicionais:adds,obs:$("prodObs").value.trim()});
  $("productModal").classList.add("hidden");renderCartBar();
}
function cartCount(){return state.cart.reduce((s,x)=>s+x.quantidade,0)}
function subtotal(){return state.cart.reduce((s,x)=>s+x.preco*x.quantidade,0)}
function renderCartBar(){const n=cartCount(),total=subtotal()+Number(state.delivery||0);$("badge").textContent=n;$("barCount").textContent=n;$("barTotal").textContent=money(total);$("cartBar").classList.toggle("hidden",n===0)}
function renderCart(){
  $("cartList").innerHTML=state.cart.length?state.cart.map(x=>`<div class="cart-item"><div class="cart-main"><span class="cart-name">${x.quantidade}x ${esc(x.nome)}</span><span class="cart-price">${money(x.preco*x.quantidade)}</span></div>${x.adicionais.length?`<div class="cart-addons">+ ${x.adicionais.map(a=>esc(a.nome)).join(", ")}</div>`:""}${x.obs?`<div class="cart-addons">Obs.: ${esc(x.obs)}</div>`:""}<div class="qty"><button onclick="changeQty('${x.key}',-1)">−</button><b>${x.quantidade}</b><button onclick="changeQty('${x.key}',1)">+</button><button class="remove" onclick="removeCart('${x.key}')">🗑</button></div></div>`).join(""):`<div class="empty">Sua sacola está vazia.<br>Escolha um produto para começar.</div>`;
  const fee=state.mode==="entrega"?Number(state.delivery||0):0;
  $("cartSummary").innerHTML=`<div class="summary-row"><span>Subtotal</span><b>${money(subtotal())}</b></div><div class="summary-row"><span>Taxa de entrega</span><b>${money(fee)}</b></div><div class="summary-row total"><span>Total</span><b>${money(subtotal()+fee)}</b></div>`;
  $("goCheckout").disabled=!state.cart.length;$("goCheckout").style.opacity=state.cart.length?1:.5;renderCartBar();
}
function changeQty(k,d){const x=state.cart.find(i=>i.key===k);if(!x)return;x.quantidade+=d;if(x.quantidade<1)removeCart(k);else renderCart()}
function removeCart(k){state.cart=state.cart.filter(x=>x.key!==k);renderCart()}
$("clearCart").onclick=()=>{state.cart=[];renderCart()};$("goCheckout").onclick=()=>go("checkoutView");

function renderCheckout(){
  $("checkoutTotal").innerHTML=`<div class="summary-card" style="margin:15px 0"><div class="summary-row"><span>Subtotal</span><b>${money(subtotal())}</b></div><div class="summary-row"><span>Entrega</span><b>${money(state.mode==="entrega"?state.delivery:0)}</b></div><div class="summary-row total"><span>Total</span><b>${money(subtotal()+(state.mode==="entrega"?state.delivery:0))}</b></div></div>`;
}
document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-mode]").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.mode=b.dataset.mode;$("addressFields").style.display=state.mode==="entrega"?"block":"none";renderCheckout()});
document.querySelectorAll(".pay").forEach(b=>b.onclick=()=>{document.querySelectorAll(".pay").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.payment=b.dataset.payment;$("changeWrap").style.display=state.payment==="Dinheiro"?"block":"none"});
$("neighborhood").onchange=()=>{const n=state.neighborhoods.find(x=>String(x.id)===String($("neighborhood").value));state.delivery=Number(n?.taxa||n?.taxa_entrega||n?.valor||0);renderCheckout()};
function fillNeighborhoods(){const s=$("neighborhood");s.innerHTML=`<option value="">Selecione o bairro</option>`+state.neighborhoods.map(n=>`<option value="${n.id}">${esc(n.nome)}</option>`).join("")}
$("checkoutForm").onsubmit=submitOrder;
async function submitOrder(e){
  e.preventDefault();if(!state.cart.length)return alert("Sua sacola está vazia.");
  const name=$("clientName").value.trim(),phone=$("phone").value.trim(),address=$("address").value.trim(),ref=$("reference").value.trim();
  if(state.mode==="entrega"&&!address)return alert("Informe o endereço.");
  const fee=state.mode==="entrega"?Number(state.delivery||0):0;
  const total=subtotal()+fee;
  const items=state.cart.map(x=>({nome:x.nome,quantidade:x.quantidade,preco:x.preco,adicionais:x.adicionais,obs:x.obs}));
  let obs=$("notes").value.trim();
  obs += `\n[ML_ITENS]${encodeURIComponent(JSON.stringify(items))}[/ML_ITENS]`;
  obs += `\n[ML_ENTREGA]${fee}[/ML_ENTREGA]`;
  obs += `\n[ML_PAGAMENTO]${state.payment}[/ML_PAGAMENTO]`;
  if($("changeFor").value.trim())obs+=`\n[ML_TROCO]${$("changeFor").value.trim()}[/ML_TROCO]`;
  obs+=`\n[ML_STATUS]preparo[/ML_STATUS]`;
  const payload={Cliente:name,telefone:phone,endereco:state.mode==="entrega"?address:"Retirada no local",referencia:ref,observacoes:obs,total};
  const {data,error}=await db.from("pedidos").insert(payload).select().single();
  if(error){alert("Não foi possível enviar o pedido: "+error.message);return}
  if(phone){try{await db.from("clientes").upsert({nome:name,telefone:phone,endereco:address,referencia:ref},{onConflict:"telefone"})}catch{}}
  state.currentOrder=data;localStorage.setItem("ML_LAST_ORDER",JSON.stringify({id:data.id,created_at:data.created_at}));
  state.cart=[];renderCartBar();go("trackingView");
}
function renderTracking(){
  const o=state.currentOrder;if(!o){$("trackingCard").innerHTML=`<div class="tracking-icon">📦</div><h2>Nenhum pedido recente</h2><p class="muted">Faça um pedido e ele aparecerá aqui.</p>`;return}
  const s=statusOf(o.observacoes),labels=[["preparo","Pedido confirmado","Seu pedido foi recebido."],["entrega","Saiu para entrega","Seu pedido está a caminho."],["entregue","Entregue","Bom apetite!"],["cancelado","Cancelado","Este pedido foi cancelado."]];
  const idx=s==="preparo"?0:s==="entrega"?1:s==="entregue"?2:0;
  $("trackingCard").innerHTML=`<div class="tracking-icon">${s==="entrega"?"🛵":s==="entregue"?"🎉":s==="cancelado"?"❌":"🍔"}</div><h2>Pedido #${String(o.id).slice(-5)}</h2><span class="status-pill">${labels[idx][1]}</span><p class="muted">${labels[idx][2]}</p><div class="timeline">${labels.slice(0,3).map((x,i)=>`<div class="step ${i<=idx?"done":""}"><span class="dot"></span><div><b>${x[1]}</b><small>${i===idx?"Atual":i<idx?"Concluído":"Aguardando"}</small></div></div>`).join("")}</div><p><b>Total: ${money(o.total)}</b></p><button class="primary wide" onclick="refreshOrder()">Atualizar status</button>`;
}
async function refreshOrder(){
  if(!state.currentOrder)return;
  const {data,error}=await db.from("pedidos").select("*").eq("id",state.currentOrder.id).single();
  if(!error){state.currentOrder=data;localStorage.setItem("ML_LAST_ORDER",JSON.stringify({id:data.id,created_at:data.created_at}));renderTracking()}
}
async function restoreOrder(){
  try{const x=JSON.parse(localStorage.getItem("ML_LAST_ORDER"));if(!x?.id)return;const r=await db.from("pedidos").select("*").eq("id",x.id).single();if(r.data)state.currentOrder=r.data}catch{}
}
function renderCategories(){$("categoryGrid").innerHTML=state.cats.map(c=>`<button class="category-card" onclick="setCat('${c.id}');go('homeView')"><span style="font-size:38px">${esc(c.emoji||"🍽️")}</span><b>${esc(c.nome)}</b></button>`).join("")||`<div class="empty">Nenhuma categoria cadastrada.</div>`}
setInterval(()=>{if($("trackingView").classList.contains("active")&&state.currentOrder)refreshOrder()},30000);
restoreOrder().then(()=>load());
