const SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let products=[],categories=[],cart=[],selectedCategory="todos",receiveMethod=null,neighborhoods=[];
const ADDRESS_KEY="miguel_lanches_cliente_v1";
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const id=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);

const fallbackCats=[
 {id:"fallback-lanches",nome:"Lanches",emoji:"🍔",ordem:1},
 {id:"fallback-pizzas",nome:"Pizzas",emoji:"🍕",ordem:2},
 {id:"fallback-pasteis",nome:"Pastéis",emoji:"🥟",ordem:3},
 {id:"fallback-porcoes",nome:"Porções",emoji:"🍟",ordem:4},
 {id:"fallback-bebidas",nome:"Bebidas",emoji:"🥤",ordem:5},
 {id:"fallback-acai",nome:"Açaí",emoji:"🍧",ordem:6}
];

async function load(){
 const c=await db.from("categorias").select("*").eq("ativo",true).order("ordem");
 const p=await db.from("produtos").select("*,categorias(nome,emoji,imagem_url)").eq("ativo",true).order("ordem");
 if(!c.error&&c.data?.length)categories=c.data; else categories=fallbackCats;
 if(!p.error&&p.data)products=p.data; else products=[];
 renderCategories();renderFeatured();renderProducts();renderCart();
 loadNeighborhoods();
}

async function loadNeighborhoods(){
 const r=await db.from("bairros").select("*").eq("ativo",true).order("nome");
 if(!r.error&&r.data)neighborhoods=r.data;
 $("neighborhood").innerHTML='<option value="">Bairro *</option>'+neighborhoods.map(n=>`<option>${esc(n.nome)}</option>`).join("");
}

function renderCategories(){
 $("categories").innerHTML=`<button class="${selectedCategory==="todos"?"active":""}" onclick="selectCategory('todos')"><span class="cat-emoji">🍽️</span>Todos</button>`+
 categories.map(c=>`<button class="${String(selectedCategory)===String(c.id)?"active":""}" onclick="selectCategory('${esc(c.id)}')"><span class="cat-emoji">${esc(c.emoji||"📦")}</span>${esc(c.nome)}</button>`).join("");
}

function selectCategory(c){selectedCategory=c;renderCategories();renderProducts();document.getElementById("productsTitle").scrollIntoView({behavior:"smooth",block:"start"})}

function productCategory(p){return String(p.categoria_id||"")}
function listProducts(){
 const q=norm($("search").value);
 let list=products.filter(p=>{
   const categoryOk=selectedCategory==="todos"||productCategory(p)===String(selectedCategory);
   const searchOk=!q||norm(p.nome).includes(q)||norm(p.descricao).includes(q);
   return categoryOk&&searchOk;
 });
 if(selectedCategory==="todos"){
   const order=new Map(categories.map((c,i)=>[String(c.id),Number(c.ordem??i)]));
   list.sort((a,b)=>(order.get(productCategory(a))??99999)-(order.get(productCategory(b))??99999)||Number(a.ordem??99999)-Number(b.ordem??99999)||String(a.nome).localeCompare(String(b.nome)));
 }
 return list;
}

function renderProducts(){
 const list=listProducts();
 $("productsTitle").textContent=selectedCategory==="todos"?"Cardápio":(categories.find(c=>String(c.id)===String(selectedCategory))?.nome||"Cardápio");
 $("products").innerHTML=list.length?list.map(card).join(""):'<div class="empty" style="grid-column:1/-1">Nenhum produto encontrado.</div>';
}

function card(p){
 return `<article class="card" onclick="openProduct('${p.id}')"><div class="photo">${p.imagem_url?`<img src="${esc(p.imagem_url)}" alt="${esc(p.nome)}">`:esc(p.emoji||p.categorias?.emoji||"🍔")}</div><div class="card-body"><h3>${esc(p.nome)}</h3><div class="desc">${esc(p.descricao||"Toque para ver as opções.")}</div><div class="card-foot"><span class="price">${money(p.preco)}</span><button class="plus" onclick="event.stopPropagation();openProduct('${p.id}')">+</button></div></div></article>`;
}

function renderFeatured(){
 const list=[...products].slice(0,6);
 $("featured").innerHTML=list.length?list.map(p=>`<button class="mini" onclick="openProduct('${p.id}')"><b>${esc(p.nome)}</b><small>${esc(p.descricao||"Mais pedido")}</small><span class="price">${money(p.preco)}</span></button>`).join(""):'<div class="empty">Os produtos aparecerão aqui.</div>';
}

function isPizza(p){return norm(p.categorias?.nome||"").includes("pizza")||norm(p.nome).includes("pizza")}
function isPastel(p){return norm(p.categorias?.nome||"").includes("pastel")}
function isAcai(p){return norm(p.categorias?.nome||"").includes("acai")||norm(p.nome).includes("acai")}

async function openProduct(pid){
 const p=products.find(x=>String(x.id)===String(pid));if(!p)return;
 if(isPizza(p))return openPizza(p);
 if(isPastel(p))return openPastel(p);
 if(isAcai(p))return openAcai(p);
 openGeneric(p);
}

function showModal(html){$("productBody").innerHTML=html;$("productModal").classList.remove("hidden")}

function baseOptions(p){
 return `<div class="product-main"><h2>${esc(p.nome)}</h2><div class="big-price">${money(p.preco)}</div>${p.descricao?`<p>${esc(p.descricao)}</p>`:""}<div class="option-title">Observação (opcional)</div><textarea class="modal-field" id="optNote" rows="3" placeholder="Ex.: sem cebola..."></textarea><div class="option-title">Quantidade</div><input class="modal-field" id="optQty" type="number" min="1" value="1"><div class="modal-actions"><button class="primary" onclick="addSimple('${p.id}')">ADICIONAR À SACOLA · ${money(p.preco)}</button></div></div>`;
}

function openGeneric(p){showModal(baseOptions(p))}

function openPizza(p){
 const two=norm(p.nome).includes("2 sabores")||norm(p.nome).includes("2 sabor")||norm(p.nome).includes("duas");
 const flavors=products.filter(x=>isPizza(x)&&String(x.id)!==String(p.id)).slice(0,20);
 showModal(`<div class="product-main"><h2>🍕 ${esc(p.nome)}</h2><div class="big-price">A partir de ${money(p.preco)}</div><p>${two?"Escolha exatamente 2 sabores. O maior preço permanece no pedido.":"Escolha exatamente 1 sabor."}</p><div class="option-title">Escolha o sabor ${two?"(2 opções)":"(1 opção)"}</div><div class="options" id="pizzaOptions">${flavors.map(f=>`<button class="option pizza-opt" data-price="${Number(f.preco||0)}" data-name="${esc(f.nome)}" onclick="pickPizza(this,${two})"><span><b>${esc(f.nome)}</b><small>${esc(f.descricao||"")}</small></span><strong>${money(f.preco)}</strong></button>`).join("")}</div><div class="option-title">Observação</div><textarea class="modal-field" id="optNote" rows="3" placeholder="Ex.: borda, sem cebola..."></textarea><div class="option-title">Quantidade</div><input class="modal-field" id="optQty" type="number" min="1" value="1"><div class="modal-actions"><button class="primary" onclick="addPizza('${p.id}',${two})">ADICIONAR À SACOLA</button></div></div>`);
}

function pickPizza(el,two){
 const all=[...document.querySelectorAll(".pizza-opt")];
 if(!two)all.forEach(x=>x.classList.remove("selected"));
 if(two&&el.classList.contains("selected")){el.classList.remove("selected");return}
 if(two&&document.querySelectorAll(".pizza-opt.selected").length>=2)return;
 el.classList.add("selected");
}

function addPizza(pid,two){
 const p=products.find(x=>String(x.id)===String(pid)), opts=[...document.querySelectorAll(".pizza-opt.selected")];
 if(opts.length!==(two?2:1))return alert(two?"Escolha 2 sabores.":"Escolha 1 sabor.");
 const highest=Math.max(...opts.map(x=>Number(x.dataset.price||0)),Number(p.preco||0));
 const names=opts.map(x=>x.dataset.name);
 addToCart({nome:`${p.nome} — ${names.join(" + ")}`,preco:highest,obs:$("optNote").value.trim(),quantidade:Number($("optQty").value||1),config:{tipo:two?"pizza-2-sabores":"pizza-1-sabor",sabores:names}});
 closeProduct();
}

function openPastel(p){
 const sabores=products.filter(x=>isPastel(x)&&String(x.id)!==String(p.id)).slice(0,30);
 showModal(`<div class="product-main"><h2>🥟 ${esc(p.nome)}</h2><div class="big-price">Escolha o tamanho</div><div class="option-title">Tamanho</div><div class="options"><button class="option pastel-size selected" data-size="M" data-price="${Number(p.preco||0)}" onclick="pickOne('.pastel-size',this)"><b>Pastel M</b><strong>${money(p.preco)}</strong></button><button class="option pastel-size" data-size="G" data-price="${Number(p.preco||0)}" onclick="pickOne('.pastel-size',this)"><b>Pastel G</b><strong>${money(p.preco)}</strong></button></div><div class="option-title">Escolha 1 sabor</div><div class="options" id="pastelFlavors">${sabores.map(s=>`<button class="option pastel-flavor" data-name="${esc(s.nome)}" data-price="${Number(s.preco||0)}" onclick="pickOne('.pastel-flavor',this)"><b>${esc(s.nome)}</b><strong>${money(s.preco)}</strong></button>`).join("")}</div><div class="option-title">Observação</div><textarea class="modal-field" id="optNote" rows="3" placeholder="Alguma observação?"></textarea><div class="option-title">Quantidade</div><input class="modal-field" id="optQty" type="number" min="1" value="1"><div class="modal-actions"><button class="primary" onclick="addPastel('${p.id}')">ADICIONAR À SACOLA</button></div></div>`);
}
function pickOne(sel,el){document.querySelectorAll(sel).forEach(x=>x.classList.remove("selected"));el.classList.add("selected")}

function addPastel(pid){
 const p=products.find(x=>String(x.id)===String(pid)),size=document.querySelector(".pastel-size.selected"),fl=document.querySelector(".pastel-flavor.selected");
 if(!size||!fl)return alert("Escolha o tamanho e 1 sabor.");
 const price=Math.max(Number(size.dataset.price||0),Number(fl.dataset.price||0));
 addToCart({nome:`Pastel ${size.dataset.size} — ${fl.dataset.name}`,preco:price,obs:$("optNote").value.trim(),quantidade:Number($("optQty").value||1),config:{tipo:"pastel",tamanho:size.dataset.size,sabor:fl.dataset.name}});
 closeProduct();
}

function openAcai(p){
 const sizes=[{nome:"200 ml",preco:0},{nome:"300 ml",preco:0},{nome:"500 ml",preco:0},{nome:"1 litro",preco:0}];
 showModal(`<div class="product-main"><h2>🍧 ${esc(p.nome)}</h2><div class="big-price">Escolha seu açaí</div><div class="option-title">Tamanho</div><div class="options">${sizes.map((s,i)=>`<button class="option acai-size ${i===0?"selected":""}" data-size="${s.nome}" data-price="${s.preco}" onclick="pickOne('.acai-size',this)"><b>${s.nome}</b><strong>${money(s.preco)}</strong></button>`).join("")}</div><div class="option-title">Coberturas <small>(até 3)</small></div><div class="options" id="toppings">${["Leite em pó","Leite condensado","Paçoca","Granola","Morango","Banana","Ovomaltine","Confete"].map(n=>`<button class="option topping" data-name="${n}" onclick="toggleTop(this)"><b>${n}</b></button>`).join("")}</div><div class="option-title">Observação</div><textarea class="modal-field" id="optNote" rows="3" placeholder="Alguma observação?"></textarea><div class="option-title">Quantidade</div><input class="modal-field" id="optQty" type="number" min="1" value="1"><div class="modal-actions"><button class="primary" onclick="addAcai('${p.id}')">ADICIONAR À SACOLA</button></div></div>`);
}
function toggleTop(el){const selected=document.querySelectorAll(".topping.selected");if(!el.classList.contains("selected")&&selected.length>=3)return alert("Você pode escolher no máximo 3 coberturas.");el.classList.toggle("selected")}

function addAcai(pid){
 const p=products.find(x=>String(x.id)===String(pid)),s=document.querySelector(".acai-size.selected"),tops=[...document.querySelectorAll(".topping.selected")];
 if(!s)return alert("Escolha o tamanho.");
 addToCart({nome:`Açaí ${s.dataset.size}`,preco:Number(p.preco||0)+Number(s.dataset.price||0),obs:$("optNote").value.trim(),quantidade:Number($("optQty").value||1),config:{tipo:"acai",tamanho:s.dataset.size,coberturas:tops.map(x=>x.dataset.name)}});
 closeProduct();
}

function addSimple(pid){
 const p=products.find(x=>String(x.id)===String(pid));addToCart({nome:p.nome,preco:Number(p.preco||0),obs:$("optNote").value.trim(),quantidade:Number($("optQty").value||1),config:{tipo:"normal"}});closeProduct();
}

function addToCart(item){cart.push({id:id(),...item});renderCart();openCart();}

function renderCart(){
 const count=cart.reduce((s,x)=>s+x.quantidade,0),sub=cart.reduce((s,x)=>s+Number(x.preco||0)*x.quantidade,0);
 $("headerCount").textContent=count;$("navCount").textContent=count;$("headerCount").style.display=count?"block":"none";
 $("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cart-item"><div class="cart-row"><span class="cart-name">${x.quantidade}x ${esc(x.nome)}</span><b>${money(x.preco*x.quantidade)}</b></div>${x.config?.coberturas?.length?`<div class="cart-sub">Coberturas: ${esc(x.config.coberturas.join(", "))}</div>`:""}${x.config?.sabores?.length?`<div class="cart-sub">Sabores: ${esc(x.config.sabores.join(" + "))}</div>`:""}${x.obs?`<div class="cart-sub">Obs.: ${esc(x.obs)}</div>`:""}<div class="qty"><button onclick="changeQty('${x.id}',-1)">−</button><b>${x.quantidade}</b><button onclick="changeQty('${x.id}',1)">+</button><button class="remove" onclick="removeItem('${x.id}')">Excluir</button></div></div>`).join(""):'';
 $("emptyCart").classList.toggle("hidden",cart.length>0);$("cartItems").classList.toggle("hidden",!cart.length);
 $("cartSubtotal").textContent=money(sub);$("cartFee").textContent="R$ 0,00";$("cartTotal").textContent=money(sub);
 $("checkoutSubtotal").textContent=money(sub);$("checkoutFee").textContent="R$ 0,00";$("checkoutTotal").textContent=money(sub);$("checkoutTotal").dataset.value=sub;
}

function changeQty(k,d){const x=cart.find(i=>i.id===k);if(!x)return;x.quantidade+=d;if(x.quantidade<1)cart=cart.filter(i=>i.id!==k);renderCart()}
function removeItem(k){cart=cart.filter(i=>i.id!==k);renderCart()}
function clearCart(){if(confirm("Deseja realmente limpar a sacola?")){cart=[];renderCart()}}
function openCart(){$("cartDrawer").classList.add("open");$("shade").classList.add("open")}
function closeCart(){$("cartDrawer").classList.remove("open");$("shade").classList.remove("open")}
function closeProduct(){$("productModal").classList.add("hidden")}
function closeCheckout(){$("checkoutModal").classList.add("hidden")}

function getSaved(){try{return JSON.parse(localStorage.getItem(ADDRESS_KEY)||"null")}catch{return null}}
function renderSaved(){
 const d=getSaved(),valid=!!d?.endereco?.trim()&&receiveMethod==="entrega";
 $("savedBox").classList.toggle("hidden",!valid);
 $("savedText").textContent=valid?[d.bairro,d.endereco,d.referencia].filter(Boolean).join(" • "):"";
}
function selectReceive(method){
 receiveMethod=method;
 document.querySelectorAll(".receive").forEach(b=>b.classList.toggle("selected",b.dataset.method===method));
 const delivery=method==="entrega";
 $("deliveryBox").classList.toggle("hidden",!delivery);
 renderSaved();
 const d=getSaved();
 if(delivery&&d){$("customerName").value ||= d.nome||"";$("customerPhone").value ||= d.telefone||"";$("neighborhood").value=d.bairro||"";$("address").value=d.endereco||"";$("reference").value=d.referencia||""}
}
function updatePayment(){
 const cash=$("payment").value==="Dinheiro";
 $("cashBox").classList.toggle("hidden",!cash);
 if(!cash){$("cashValue").value="";$("change").textContent=""}else updateChange();
}
function updateChange(){
 const paid=Number($("cashValue").value||0),total=Number($("checkoutTotal").dataset.value||0);
 $("change").textContent=paid>=total&&paid?`Troco: ${money(paid-total)}`:"";
}

async function checkout(){
 if(!cart.length)return alert("Sua sacola está vazia.");
 $("checkoutModal").classList.remove("hidden");closeCart();
 selectReceive(receiveMethod||"entrega");updatePayment();
}

async function sendOrder(e){
 e.preventDefault();
 if(!receiveMethod)return alert("Escolha Entrega ou Retirada.");
 if(!$("customerName").value.trim()||!$("customerPhone").value.trim())return alert("Informe nome e WhatsApp.");
 if(!$("payment").value)return alert("Escolha a forma de pagamento.");
 const delivery=receiveMethod==="entrega";
 if(delivery&&!$("address").value.trim())return alert("Informe o endereço.");
 if($("payment").value==="Dinheiro"&&Number($("cashValue").value||0)<Number($("checkoutTotal").dataset.value||0))return alert("O valor pago precisa ser igual ou maior que o total.");

 if(delivery)localStorage.setItem(ADDRESS_KEY,JSON.stringify({nome:$("customerName").value.trim(),telefone:$("customerPhone").value.trim(),bairro:$("neighborhood").value,endereco:$("address").value.trim(),referencia:$("reference").value.trim()}));

 const total=Number($("checkoutTotal").dataset.value||0);
 const payload={cliente:$("customerName").value.trim(),telefone:$("customerPhone").value.trim(),forma_recebimento:receiveMethod, bairro:delivery?$("neighborhood").value:"",endereco:delivery?$("address").value.trim():"",referencia:delivery?$("reference").value.trim():"",pagamento:$("payment").value,valor_pago:$("payment").value==="Dinheiro"?Number($("cashValue").value||0):null,total,observacoes:$("orderNote").value.trim(),itens:cart};
 let r=await db.from("pedidos").insert(payload).select("id").maybeSingle();
 if(r.error){
   const packed=`${payload.observacoes}\n[ML_ITENS]${encodeURIComponent(JSON.stringify(cart))}[/ML_ITENS]\n[ML_RECEBIMENTO]${receiveMethod}[/ML_RECEBIMENTO]\n[ML_PAGAMENTO]${payload.pagamento}[/ML_PAGAMENTO]`;
   r=await db.from("pedidos").insert({Cliente:payload.cliente,telefone:payload.telefone,endereco:payload.endereco,referencia:payload.referencia,observacoes:packed,total}).select("id").maybeSingle();
 }
 if(r.error)return alert("Não foi possível enviar o pedido. Verifique a conexão com o sistema.");
 const num=r.data?.id||Math.floor(Math.random()*9000+1000);
 cart=[];renderCart();closeCheckout();$("orderNumber").textContent=`Pedido #${num}`;$("successModal").classList.remove("hidden");
}

$("search").addEventListener("input",()=>{renderProducts();$("featuredSection").classList.toggle("hidden",!!$("search").value.trim())});
$("clearSearch").onclick=()=>{$("search").value="";selectedCategory="todos";renderCategories();renderProducts();$("featuredSection").classList.remove("hidden")};
$("headerCart").onclick=openCart;$("navCart").onclick=openCart;$("closeCart").onclick=closeCart;$("shade").onclick=closeCart;$("clearCart").onclick=clearCart;$("shopNow").onclick=closeCart;
$("checkoutBtn").onclick=checkout;$("productClose").onclick=closeProduct;$("checkoutClose").onclick=closeCheckout;$("successClose").onclick=()=>$("successModal").classList.add("hidden");
document.querySelectorAll(".receive").forEach(b=>b.onclick=()=>selectReceive(b.dataset.method));
$("changeAddress").onclick=()=>selectReceive("entrega");$("payment").onchange=updatePayment;$("cashValue").oninput=updateChange;$("checkoutForm").onsubmit=sendOrder;
$("navCategories").onclick=()=>document.querySelector(".categories").scrollIntoView({behavior:"smooth"});
$("navOrders").onclick=()=>alert("A área de acompanhamento de pedidos será conectada ao Admin na próxima etapa.");
load();
