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
  const featuredGroups=groupVariants((filtered.length?filtered:state.products).slice(0,12)).slice(0,6);
  $("featured").innerHTML=featuredGroups.length?featuredGroups.map(productCard).join(""):`<div class="empty">Seu cardápio ainda está vazio.<br>Cadastre produtos no Admin.</div>`;
  renderCatalog(filtered);
}

function renderChips(){
  $("categoryTabs").innerHTML=`<button class="${state.cat==="todos"?"active":""}" onclick="setCat('todos')">Todos</button>`+state.cats.map(c=>`<button class="${String(state.cat)===String(c.id)?"active":""}" onclick="setCat('${c.id}')">${esc(c.emoji||"🍽️")} ${esc(c.nome)}</button>`).join("");
}
function setCat(id){state.cat=id;renderHome()}
function localImageFor(p){
  const n=String(p.nome||"").toLowerCase();
  if(n.includes("x-tudo")||n.includes("x tudo")) return "assets/x-tudo.png";
  if(n.includes("smash onions")||n.includes("smash onion")) return "assets/smash-onions-bbq.png";
  if(n.includes("pense grande")) return "assets/pense-grande.png";
  if(n.includes("batata")) return "assets/batata-frita.png";
  if(n.includes("calabresa") && (n.includes("pizza") || String(p.categorias?.nome||"").toLowerCase().includes("pizza"))) return "assets/pizza-calabresa.png";
  if(n.includes("frango") && n.includes("catup") && String(p.categorias?.nome||"").toLowerCase().includes("pizza")) return "assets/pizza-frango.png";
  if(n.includes("portuguesa") && String(p.categorias?.nome||"").toLowerCase().includes("pizza")) return "assets/pizza-portuguesa.png";
  if(n.includes("4 queijos")||n.includes("4 queijo")) return "assets/pizza-4-queijos.png";
  return "";
}
function variantBaseName(name){
  return String(name||"")
    .replace(/\s+—\s+(Média|Grande|Médio|300 ml|500 ml|200 ml|1 litro|Jarra 1L)(?:\s+\((?:água|leite)\))?$/i,"")
    .trim();
}
function variantLabel(name){
  const m=String(name||"").match(/—\s*(Média|Grande|Médio|300 ml|500 ml|200 ml|1 litro|Jarra 1L)(?:\s+\((água|leite)\))?$/i);
  if(!m)return "";
  return m[2]?`${m[1]} • ${m[2]}`:m[1];
}
function groupVariants(list){
  const map=new Map();
  list.forEach(p=>{
    const key=variantBaseName(p.nome);
    if(!map.has(key))map.set(key,[]);
    map.get(key).push(p);
  });
  return [...map.values()].map(items=>{
    items.sort((a,b)=>Number(a.preco)-Number(b.preco));
    return {base:variantBaseName(items[0].nome),items,main:items[0]};
  });
}
function productCard(group){
  const p=group.main;
  const local=localImageFor(p);
  const img=p.imagem_url?`<img src="${esc(p.imagem_url)}" alt="${esc(group.base)}">`:local?`<img src="${local}" alt="${esc(group.base)}">`:`<span style="font-size:60px">${esc(p.emoji||"🍔")}</span>`;
  const hasVariants=group.items.length>1;
  const min=Math.min(...group.items.map(x=>Number(x.preco||0)));
  return `<article class="product-card"><div class="product-img">${img}</div><div class="product-info"><h3>${esc(group.base)}</h3><div class="desc">${esc(p.descricao||"Delicioso, preparado na hora.")}</div><div class="product-bottom"><span class="price">${hasVariants?"a partir de ":""}${money(min)}</span><button class="plus" onclick="openProductGroup('${group.items.map(x=>x.id).join(",")}')">+</button></div></div></article>`;
}

function renderCatalog(list=state.products){
  let arr=list.filter(p=>state.cat==="todos"||String(p.categoria_id)===String(state.cat));
  if(state.cat!=="todos"){
    const groups=groupVariants(arr);
    $("catalog").innerHTML=`<div class="catalog-category"><h2>${esc(state.cats.find(c=>String(c.id)===String(state.cat))?.nome||"Produtos")}</h2><div class="product-grid">${groups.map(productCard).join("")||`<div class="empty">Nenhum produto nesta categoria.</div>`}</div></div>`;
    return;
  }
  const groups=state.cats.map(c=>({c,items:arr.filter(p=>String(p.categoria_id)===String(c.id))})).filter(g=>g.items.length);
  $("catalog").innerHTML=groups.map(g=>`<div class="catalog-category"><h2>${esc(g.c.emoji||"")} ${esc(g.c.nome)}</h2><div class="product-grid">${groupVariants(g.items).map(productCard).join("")}</div></div>`).join("")||`<div class="empty">Nenhum produto cadastrado ainda.</div>`;
}

async function openProductGroup(ids){
  const products=String(ids).split(",").map(id=>state.products.find(p=>String(p.id)===String(id))).filter(Boolean);
  if(!products.length)return;
  const base=variantBaseName(products[0].nome);
  const isAcai=/^Açaí$/i.test(base);
  const isCreme=/^Creme de /i.test(base);
  const variants=products.map(p=>({id:p.id,label:variantLabel(p.nome)||"Único",price:Number(p.preco||0)}));
  const minPrice=Math.min(...variants.map(v=>v.price));
  const toppings=["Granola","Confetes","Leite em pó","Amendoim triturado","Jujuba","Ovomaltine","Chocoboll","Coco","Sucrilhos","Farinha láctea","Granulado","Leite condensado","Morango calda","Chocolate calda","Caramelo calda"];
  $("productModalContent").innerHTML=`<h2>${esc(base)}</h2>
    <p class="muted">${esc(products[0].descricao||"Escolha as opções para montar seu pedido.")}</p>
    <div class="form-card" style="margin:0;padding:0;background:none;border:0">
      <h3>${variants.length>1?"Escolha o tamanho":"Quantidade"}</h3>
      ${variants.length>1?`<div class="payment-grid">${variants.map((v,i)=>`<button type="button" class="pay ${i===0?"active":""}" data-variant-id="${v.id}" data-variant-price="${v.price}" onclick="selectVariant(this)">${esc(v.label)}<br><b>${money(v.price)}</b></button>`).join("")}</div>`:`<input id="selectedVariant" type="hidden" value="${products[0].id}">`}
      <label>Quantidade<input id="qty" type="number" min="1" value="1"></label>
      ${isAcai?`<h3>Coberturas <small class="muted">(escolha até 3)</small></h3><div class="checkboxes">${toppings.map(t=>`<label class="check"><input class="topping" type="checkbox" value="${esc(t)}" onchange="limitToppings()"> ${esc(t)}</label>`).join("")}</div>`:""}
      ${isCreme?`<p class="notice">Os cremes seguem os mesmos tamanhos e preços informados no cardápio.</p>`:""}
      <label>Observação<textarea id="prodObs" placeholder="Ex.: sem cebola..."></textarea></label>
      <button class="primary wide" onclick="addVariantToCart('${esc(base)}')">Adicionar — a partir de ${money(minPrice)}</button>
    </div>`;
  $("productModal").classList.remove("hidden");
}
function selectVariant(btn){
  document.querySelectorAll("[data-variant-id]").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
}
function limitToppings(){
  const checked=[...document.querySelectorAll(".topping:checked")];
  if(checked.length>3){checked.at(-1).checked=false;alert("Você pode escolher no máximo 3 coberturas.");}
}
async function addVariantToCart(base){
  const variants=state.products.filter(p=>variantBaseName(p.nome)===base);
  const selected=document.querySelector("[data-variant-id].active")?.dataset.variantId||$("selectedVariant")?.value||variants[0]?.id;
  const p=variants.find(x=>String(x.id)===String(selected))||variants[0];
  if(!p)return;
  const q=Math.max(1,Number($("qty").value||1));
  const toppings=[...document.querySelectorAll(".topping:checked")].map(x=>({id:null,nome:x.value,preco:0}));
  const unit=Number(p.preco);
  state.cart.push({key:crypto.randomUUID(),id:p.id,nome:base+(variantLabel(p.nome)?` — ${variantLabel(p.nome)}`:""),base:Number(p.preco),preco:unit,quantidade:q,adicionais:toppings,obs:$("prodObs").value.trim()});
  $("productModal").classList.add("hidden");renderCart();
}

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
