const CFG=window.ML_CONFIG||{};
const SUPABASE_URL=CFG.SUPABASE_URL||"https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY=CFG.SUPABASE_KEY||"";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let products=[],categories=[],cart=[],receiveMethod=null,neighborhoods=[];
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);

const fallbackCats=[
 {id:"fallback-lanches",nome:"Lanches",ordem:1},{id:"fallback-porcoes",nome:"Porções",ordem:2},
 {id:"fallback-churrasco",nome:"Churrasco",ordem:3},{id:"fallback-dogao",nome:"Dogão",ordem:4},
 {id:"fallback-petiscos",nome:"Petiscos",ordem:5},{id:"fallback-bebidas",nome:"Bebidas",ordem:6},
 {id:"fallback-pizzas",nome:"Pizzas",ordem:7},{id:"fallback-pasteis",nome:"Pastéis",ordem:8},
 {id:"fallback-acai",nome:"Açaí",ordem:9},{id:"fallback-sucos",nome:"Sucos",ordem:10},
 {id:"fallback-milk-shake",nome:"Milk Shake",ordem:11},{id:"fallback-cremes",nome:"Cremes",ordem:12}
];

const FLAVORS={
 suco:["Laranja","Acerola","Maracujá","Goiaba","Abacaxi","Morango","Limão","Caju","Graviola","Manga","Cajá","Cupuaçu"],
 "milk shake":["Chocolate","Morango","Ovomaltine","Baunilha","Flocos","Oreo","Nutella","Paçoca","Doce de leite","Ninho"],
 creme:["Morango","Maracujá","Chocolate","Cupuaçu","Açaí","Ninho","Oreo","Ovomaltine","Paçoca","Nutella"]
};

function productImage(p){return p?.imagem_url||p?.imagem||p?.image_url||""}
function catName(p){return norm(p?.categorias?.nome||"")}
function isPizza(p){return catName(p).includes("pizza")||norm(p?.nome).includes("pizza")}
function isPastel(p){return catName(p).includes("pastel")||norm(p?.nome).includes("pastel")}
function isAcai(p){return catName(p).includes("acai")||norm(p?.nome).includes("acai")}
function isSuco(p){return catName(p).includes("suco")||norm(p?.nome).includes("suco")}
function isMilkShake(p){return catName(p).includes("milk shake")||catName(p).includes("milkshake")||norm(p?.nome).includes("milk shake")||norm(p?.nome).includes("milkshake")}
function isCreme(p){return catName(p).includes("creme")||norm(p?.nome).includes("creme")}
function categoryId(p){return String(p.categoria_id||"")}

async function load(){
 try{
  const [c,p]=await Promise.all([
   db.from("categorias").select("*").eq("ativo",true).order("ordem"),
   db.from("produtos").select("*,categorias(nome,emoji,imagem_url)").eq("ativo",true).order("ordem")
  ]);
  categories=(!c.error&&c.data?.length)?c.data.filter(x=>norm(x.nome)!=="todos"):fallbackCats;
  products=(!p.error&&p.data)?p.data:[];
  renderCategories();renderFeatured();renderProducts();await loadNeighborhoods();
 }catch(e){console.error(e)}
 setTimeout(()=>{$("splash")?.classList.add("hide");$("site")?.classList.remove("hidden")},1500);
}

async function loadNeighborhoods(){
 const r=await db.from("bairros").select("*").eq("ativo",true).order("nome");
 if(!r.error&&r.data)neighborhoods=r.data;
 if($("neighborhood"))$("neighborhood").innerHTML='<option value="">Bairro *</option>'+neighborhoods.map(n=>`<option value="${esc(n.nome)}">${esc(n.nome)}</option>`).join("");
}
function renderCategories(){
 $("categories").innerHTML=categories.map(c=>`<button type="button" data-id="${esc(c.id)}" onclick="goCategory('${esc(c.id)}')">${esc(c.nome)}</button>`).join("");
}
function goCategory(id){
 const el=document.querySelector(`[data-category="${CSS.escape(String(id))}"]`);
 if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
}
function renderFeatured(){
 const list=products.slice(0,6);
 $("featured").innerHTML=list.length?list.map(p=>{
  const img=productImage(p);
  return `<button class="highlight" onclick="openProduct('${p.id}')"><div class="highlight-img">${img?`<img src="${esc(img)}" alt="${esc(p.nome)}">`:`<span>${esc(p.emoji||p.categorias?.emoji||"")}</span>`}</div><div class="highlight-body"><small>Mais pedido</small><b>${esc(p.nome)}</b><strong>${money(p.preco)}</strong></div></button>`;
 }).join(""):"<p class='muted'>Nenhum destaque cadastrado.</p>";
}
function renderProducts(){
 const q=norm($("search").value);
 const list=products.filter(p=>!q||norm(p.nome).includes(q)||norm(p.descricao).includes(q));
 let html="";
 for(const c of categories){
  const items=list.filter(p=>categoryId(p)===String(c.id));
  if(!items.length)continue;
  html+=`<section class="category-block" data-category="${esc(c.id)}"><h2>${esc(c.nome)}</h2><div class="products">${items.map(card).join("")}</div></section>`;
 }
 const other=list.filter(p=>!categories.some(c=>String(c.id)===categoryId(p)));
 if(other.length)html+=`<section class="category-block"><h2>Outros</h2><div class="products">${other.map(card).join("")}</div></section>`;
 $("products").innerHTML=html||"<div class='no-results'>Nenhum produto encontrado.</div>";
}
function card(p){
 const img=productImage(p);
 return `<article class="product" onclick="openProduct('${p.id}')"><div class="product-img">${img?`<img src="${esc(img)}" alt="${esc(p.nome)}">`:`<span>${esc(p.emoji||p.categorias?.emoji||"")}</span>`}</div><div class="product-body"><h3>${esc(p.nome)}</h3><p>${esc(p.descricao||"Toque para ver as opções.")}</p><div class="product-foot"><strong>${money(p.preco)}</strong><button type="button" onclick="event.stopPropagation();openProduct('${p.id}')">+</button></div></div></article>`;
}

/* As opções agora vêm do mesmo cadastro usado pelo Admin. */
async function getSavedOptions(pid){
 try{
  const [c,o]=await Promise.all([
   db.from("configuracao_opcoes").select("*").eq("produto_id",pid).maybeSingle(),
   db.from("opcoes_produto").select("*").eq("produto_id",pid).eq("ativo",true).order("ordem")
  ]);
  if(c.error && o.error)return null;
  return {config:c.data||null,options:o.data||[]};
 }catch(e){
  console.error("Erro ao carregar opções:",e);
  return null;
}

function fallbackOptions(p){
 if(isPizza(p))return pizzaOptions(p);
 if(isPastel(p))return pastelOptions(p);
 if(isAcai(p))return acaiOptions(p);
 if(isSuco(p))return flavorOptions(p,"suco","Escolha o sabor");
 if(isMilkShake(p))return flavorOptions(p,"milk shake","Escolha o sabor");
 if(isCreme(p))return flavorOptions(p,"creme","Escolha o sabor");
 return "";
}

async function openProduct(pid){
 const p=products.find(x=>String(x.id)===String(pid));if(!p)return;
 const saved=await getSavedOptions(pid);
 const hasSaved=!!(saved?.config || saved?.options?.length);
 let extra="";
 if(hasSaved)extra=renderSavedOptions(saved.config,saved.options);
 else extra=fallbackOptions(p);

 const img=productImage(p);
 $("productBody").innerHTML=`<div class="product-main"><div class="product-hero">${img?`<img src="${esc(img)}" alt="${esc(p.nome)}">`:`<span>${esc(p.emoji||p.categorias?.emoji||"")}</span>`}<button class="hero-close" onclick="closeProduct()">×</button></div><div class="product-content"><h2>${esc(p.nome)}</h2><div class="modal-price">${money(p.preco)}</div>${p.descricao?`<p class="modal-desc">${esc(p.descricao)}</p>`:""}${extra}<label class="field-label">Observação <small>(opcional)</small></label><textarea id="productNote" class="field" placeholder="Ex.: sem açúcar, bem gelado..."></textarea><div class="qty-row"><b>Quantidade</b><div class="stepper"><button onclick="stepQty(-1)">−</button><span id="productQty">1</span><button onclick="stepQty(1)">+</button></div></div><button class="main-btn" onclick="addCurrent('${p.id}')">Adicionar à sacola · <span id="addPrice">${money(p.preco)}</span></button></div></div>`;
 $("productModal").classList.remove("hidden");window.currentProduct=p;window.currentQty=1;
}
function stepQty(d){window.currentQty=Math.max(1,Math.min(99,(window.currentQty||1)+d));$("productQty").textContent=window.currentQty}
function closeProduct(){$("productModal").classList.add("hidden")}

/* Opções cadastradas no Admin/Supabase. */
function renderSavedOptions(config,options){
 const tipo=config?.tipo||"adicional_preco";
 const limite=Math.max(1,Number(config?.limite||1));
 if(tipo==="nenhuma" || !options.length)return "";

 const title=tipo==="sabor"||tipo==="sabor_preco"?"Escolha "+(limite===1?"1 opção":`até ${limite} opções`):"Escolha "+(limite===1?"1 opção":`até ${limite} opções`);
 const price=tipo==="sabor_preco"||tipo==="adicional_preco";
 return `<div class="option-title">${title}</div><div class="options saved-options" data-type="${esc(tipo)}" data-limit="${limite}">${options.map(o=>{
   const add=Number(o.preco_adicional||0);
   return `<button type="button" class="option saved-option" data-id="${esc(o.id)}" data-name="${esc(o.nome)}" data-price="${add}" onclick="pickSavedOption(this)"><span>${esc(o.nome)}</span>${price&&add>0?`<strong>+ ${money(add)}</strong>`:""}</button>`;
 }).join("")}</div>`;
}
function pickSavedOption(el){
 const box=el.closest(".saved-options");
 const limit=Math.max(1,Number(box?.dataset.limit||1));
 const selected=box?.querySelectorAll(".saved-option.selected").length||0;
 if(!el.classList.contains("selected") && selected>=limit){
  if(limit===1)box.querySelectorAll(".saved-option").forEach(x=>x.classList.remove("selected"));
  else return;
 }
 el.classList.toggle("selected");
 updateAddPrice();
}
function selectedSavedOptions(){
 return [...document.querySelectorAll(".saved-option.selected")];
}
function updateAddPrice(){
 const base=Number(window.currentProduct?.preco||0);
 const extra=selectedSavedOptions().reduce((s,x)=>s+Number(x.dataset.price||0),0);
 const total=(base+extra)*(window.currentQty||1);
 if($("addPrice"))$("addPrice").textContent=money(total);
}

/* Fallback antigo, usado somente quando o produto ainda não possui opções no Admin. */
function flavorOptions(p,type,title){
 const flavors=FLAVORS[type]||[];
 return `<div class="option-title">${title}</div><div class="options flavor-options">${flavors.map(f=>`<button type="button" class="option flavor-option" data-name="${esc(f)}" onclick="pickOne('.flavor-option',this)"><span>${esc(f)}</span></button>`).join("")}</div>`;
}
function pizzaOptions(p){
 const two=/2\s*sabores?|duas/.test(norm(p.nome));
 const flavors=products.filter(x=>isPizza(x)&&String(x.id)!==String(p.id)).slice(0,30);
 return `<div class="option-title">Escolha ${two?"2 sabores":"1 sabor"}</div><div class="options">${flavors.map(f=>`<button class="option pizza-option ${two?"two":""}" data-name="${esc(f.nome)}" data-price="${Number(f.preco||0)}" onclick="pickPizza(this)"><span>${esc(f.nome)}</span><strong>${money(f.preco)}</strong></button>`).join("")}</div>`;
}
function pickPizza(el){
 const two=el.classList.contains("two");
 if(!two)document.querySelectorAll(".pizza-option").forEach(x=>x.classList.remove("selected"));
 if(two&&!el.classList.contains("selected")&&document.querySelectorAll(".pizza-option.selected").length>=2)return;
 el.classList.toggle("selected");updateAddPrice();
}
function pastelOptions(p){
 const flavors=products.filter(x=>isPastel(x)&&String(x.id)!==String(p.id)).slice(0,30);
 return `<div class="option-title">Escolha 1 sabor</div><div class="options pastel-flavors">${flavors.map(f=>`<button class="option pastel-flavor" data-name="${esc(f.nome)}" onclick="pickOne('.pastel-flavor',this)"><span>${esc(f.nome)}</span></button>`).join("")}</div>`;
}
function acaiOptions(){
 return `<div class="option-title">Coberturas <small>(até 3)</small></div><div class="options">${["Leite em pó","Leite condensado","Paçoca","Granola","Morango","Banana","Ovomaltine","Confete"].map(x=>`<button class="option topping" data-name="${esc(x)}" onclick="toggleTopping(this)">${esc(x)}</button>`).join("")}</div>`;
}
function pickOne(sel,el){document.querySelectorAll(sel).forEach(x=>x.classList.remove("selected"));el.classList.add("selected");updateAddPrice()}
function toggleTopping(el){const n=document.querySelectorAll(".topping.selected").length;if(!el.classList.contains("selected")&&n>=3)return;el.classList.toggle("selected");updateAddPrice()}

function addCurrent(pid){
 const p=products.find(x=>String(x.id)===String(pid));if(!p)return;
 const qty=window.currentQty||1,note=$("productNote").value.trim();
 let item={id:uid(),nome:p.nome,preco:Number(p.preco||0),quantidade:qty,obs:note,config:{tipo:"normal"}};

 const savedSelected=selectedSavedOptions();
 const savedBox=document.querySelector(".saved-options");
 if(savedBox){
  const tipo=savedBox.dataset.type;
  const limit=Math.max(1,Number(savedBox.dataset.limit||1));
  if(!savedSelected.length)return alert("Escolha uma opção.");
  if(savedSelected.length>limit)return alert(`Escolha no máximo ${limit} opções.`);
  const names=savedSelected.map(x=>x.dataset.name);
  const extra=savedSelected.reduce((s,x)=>s+Number(x.dataset.price||0),0);
  item.nome=`${p.nome} — ${names.join(" + ")}`;
  item.preco=Number(p.preco||0)+extra;
  item.config={tipo,opcoes:names};
 }else if(isPizza(p)){
  const opts=[...document.querySelectorAll(".pizza-option.selected")],two=/2\s*sabores?|duas/.test(norm(p.nome));
  if(opts.length!==(two?2:1))return alert(two?"Escolha 2 sabores.":"Escolha 1 sabor.");
  const flavors=opts.map(x=>x.dataset.name);item.nome=`${p.nome} — ${flavors.join(" + ")}`;
  item.preco=Math.max(Number(p.preco||0),...opts.map(x=>Number(x.dataset.price||0)));
  item.config={tipo:two?"pizza-2-sabores":"pizza-1-sabor",sabores:flavors};
 }else if(isPastel(p)){
  const f=document.querySelector(".pastel-flavor.selected");
  if(!f)return alert("Escolha 1 sabor.");
  item.nome=`${p.nome} — ${f.dataset.name}`;item.preco=Number(p.preco||0);
  item.config={tipo:"pastel",sabor:f.dataset.name};
 }else if(isAcai(p)){
  const tops=[...document.querySelectorAll(".topping.selected")].map(x=>x.dataset.name);
  item.nome=`${p.nome}${tops.length?" — "+tops.join(", "):""}`;item.config={tipo:"acai",coberturas:tops};
 }else if(isSuco(p)||isMilkShake(p)||isCreme(p)){
  const f=document.querySelector(".flavor-option.selected");
  if(!f)return alert("Escolha o sabor.");
  const tipo=isSuco(p)?"suco":isMilkShake(p)?"milk-shake":"creme";
  item.nome=`${p.nome} — ${f.dataset.name}`;item.config={tipo,sabor:f.dataset.name};
 }
 cart.push(item);renderCart();closeProduct();closeCart();
}

function renderCart(){
 const count=cart.reduce((s,x)=>s+Number(x.quantidade||1),0),total=cart.reduce((s,x)=>s+Number(x.preco||0)*Number(x.quantidade||1),0);
 $("bagBar").classList.toggle("empty",count===0);
 $("bagText").textContent=count===1?"1 item na sacola":`${count} itens na sacola`;
 $("bagTotal").textContent=money(total);$("cartSubtotal").textContent=money(total);
 $("checkoutSubtotal").textContent=money(total);$("checkoutTotal").textContent=money(total);$("checkoutTotal").dataset.value=total;
 $("cartItems").innerHTML=cart.map(x=>`<div class="cart-item"><div class="cart-item-top"><b>${x.quantidade}× ${esc(x.nome)}</b><strong>${money(x.preco*x.quantidade)}</strong></div>${x.config?.coberturas?.length?`<small>Coberturas: ${esc(x.config.coberturas.join(", "))}</small>`:""}${x.config?.sabores?.length?`<small>Sabores: ${esc(x.config.sabores.join(" + "))}</small>`:""}${x.config?.opcoes?.length?`<small>Opções: ${esc(x.config.opcoes.join(" + "))}</small>`:""}${x.config?.sabor?`<small>Sabor: ${esc(x.config.sabor)}</small>`:""}${x.obs?`<small>Obs.: ${esc(x.obs)}</small>`:""}<div class="item-actions"><button onclick="changeQty('${x.id}',-1)">−</button><span>${x.quantidade}</span><button onclick="changeQty('${x.id}',1)">+</button><button class="remove" onclick="removeItem('${x.id}')">Remover</button></div></div>`).join("");
 $("emptyCart").classList.toggle("hidden",cart.length>0);$("checkoutBtn").disabled=!cart.length;
}
function changeQty(id,d){const x=cart.find(i=>i.id===id);if(!x)return;x.quantidade+=d;if(x.quantidade<1)cart=cart.filter(i=>i.id!==id);renderCart()}
function removeItem(id){cart=cart.filter(x=>x.id!==id);renderCart()}
function openCart(){$("cartDrawer").classList.add("open");$("shade").classList.add("open")}
function closeCart(){$("cartDrawer").classList.remove("open");$("shade").classList.remove("open")}
function openCheckout(){if(!cart.length)return alert("Sua sacola está vazia.");closeCart();$("checkoutModal").classList.remove("hidden");if(!receiveMethod)selectReceive("retirada");updatePayment()}
function closeCheckout(){$("checkoutModal").classList.add("hidden")}
function selectReceive(m){
 receiveMethod=m;document.querySelectorAll(".receive").forEach(b=>b.classList.toggle("selected",b.dataset.method===m));
 const delivery=m==="entrega";$("deliveryBox").classList.toggle("hidden",!delivery);if(delivery)loadSavedAddress();
}
function loadSavedAddress(){try{const d=JSON.parse(localStorage.getItem("miguel_lanches_cliente_v1")||"null");if(!d)return;$("customerName").value||=d.nome||"";$("customerPhone").value||=d.telefone||"";$("neighborhood").value=d.bairro||"";$("address").value=d.endereco||"";$("reference").value=d.referencia||""}catch{}}
function updatePayment(){
 const cash=$("payment").value==="Dinheiro";$("cashBox").classList.toggle("hidden",!cash);
 if(!cash){$("cashValue").value="";$("change").textContent=""}else updateChange();
}
function updateChange(){
 const paid=Number($("cashValue").value||0),total=Number($("checkoutTotal").dataset.value||0);
 $("change").textContent=paid>=total&&paid?`Troco: ${money(paid-total)}`:"";
}
async function sendOrder(e){
 e.preventDefault();if(!cart.length)return alert("Sua sacola está vazia.");if(!receiveMethod)return alert("Escolha Entrega ou Retirada.");
 const name=$("customerName").value.trim(),phone=$("customerPhone").value.trim(),payment=$("payment").value,delivery=receiveMethod==="entrega";
 if(!name||!phone)return alert("Informe nome e WhatsApp.");if(!payment)return alert("Escolha a forma de pagamento.");
 if(delivery&&!$("address").value.trim())return alert("Informe o endereço.");
 const total=cart.reduce((s,x)=>s+Number(x.preco||0)*Number(x.quantidade||1),0);
 if(payment==="Dinheiro"&&Number($("cashValue").value||0)<total)return alert("O valor pago precisa ser igual ou maior que o total.");
 const payload={cliente:name,telefone:phone,forma_recebimento:receiveMethod,bairro:delivery?$("neighborhood").value:"",endereco:delivery?$("address").value.trim():"",referencia:delivery?$("reference").value.trim():"",pagamento:payment,valor_pago:payment==="Dinheiro"?Number($("cashValue").value||0):null,total,observacoes:$("orderNote").value.trim(),itens:cart};
 let r=await db.from("pedidos").insert(payload).select("id").maybeSingle();
 if(r.error){
  const packed=`${payload.observacoes||""}\n[ML_ITENS]${encodeURIComponent(JSON.stringify(cart))}[/ML_ITENS]\n[ML_RECEBIMENTO]${receiveMethod}[/ML_RECEBIMENTO]\n[ML_PAGAMENTO]${payment}[/ML_PAGAMENTO]`;
  r=await db.from("pedidos").insert({Cliente:name,telefone:phone,endereco:payload.endereco,referencia:payload.referencia,observacoes:packed,total}).select("id").maybeSingle();
 }
 if(r.error){console.error(r.error);return alert("Não foi possível enviar o pedido. Verifique a conexão com o sistema.");}
 localStorage.setItem("miguel_lanches_cliente_v1",JSON.stringify({nome:name,telefone:phone,bairro:payload.bairro,endereco:payload.endereco,referencia:payload.referencia}));
 const num=r.data?.id||"";cart=[];renderCart();closeCheckout();$("orderNumber").textContent=num?`Pedido #${num}`:"Pedido recebido";$("successModal").classList.remove("hidden");
}
function closeSuccess(){$("successModal").classList.add("hidden")}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
$("search").addEventListener("input",renderProducts);$("payment").addEventListener("change",updatePayment);$("cashValue").addEventListener("input",updateChange);$("checkoutForm").addEventListener("submit",sendOrder);
load();
