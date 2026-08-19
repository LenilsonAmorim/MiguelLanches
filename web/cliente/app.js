const SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let products=[],cats=[],cart=[],cat="todos",catCfg={},acaiCfg={tamanhos:[],coberturas:[]},receiveMethod=null;
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const uid=()=>crypto.randomUUID();
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const ADDRESS_KEY="miguel_lanches_cliente_v1";

async function cfg(key,fallback){const r=await db.from("configuracoes").select("valor").eq("chave",key).maybeSingle();try{return JSON.parse(r.data?.valor||"null")??fallback}catch{return fallback}}

async function init(){
 const [c,p,cc,aa]=await Promise.all([
  db.from("categorias").select("*").eq("ativo",true).order("ordem"),
  db.from("produtos").select("*,categorias(nome,emoji,imagem_url)").eq("ativo",true).order("ordem"),
  cfg("categoria_config",{}),cfg("acai_config",{tamanhos:[],coberturas:[]})
 ]);
 if(c.error||p.error){$("products").innerHTML='<div class="empty">Não foi possível carregar o cardápio.</div>';return}
 cats=c.data||[];products=p.data||[];catCfg=cc||{};acaiCfg=aa||{tamanhos:[],coberturas:[]};
 renderCats();renderProducts();renderCart();
}

function renderCats(){
 $("categories").innerHTML=`<button class="${cat==="todos"?"active":""}" onclick="chooseCat('todos')">🍽️ Todos</button>`+
 cats.map(c=>`<button class="${String(cat)===String(c.id)?"active":""}" onclick="chooseCat('${c.id}')">${c.imagem_url?`<img class="cat-icon" src="${esc(c.imagem_url)}">`:esc(c.emoji||"📦")} ${esc(c.nome)}</button>`).join("");
}
function chooseCat(id){cat=id;renderCats();renderProducts()}
function renderProducts(){
 const q=$("search").value.toLowerCase().trim();
 let list=products.filter(p=>(cat==="todos"||String(p.categoria_id)===String(cat))&&(!q||norm(p.nome).includes(norm(q))));
 if(cat==="todos"){
  const order=new Map(cats.map((c,i)=>[String(c.id),[Number.isFinite(Number(c.ordem))?Number(c.ordem):i,i]]));
  list.sort((a,b)=>{const A=order.get(String(a.categoria_id))||[999999,999999],B=order.get(String(b.categoria_id))||[999999,999999];return A[0]-B[0]||A[1]-B[1]||Number(a.ordem||999999)-Number(b.ordem||999999)||String(a.nome).localeCompare(String(b.nome))});
 }
 $("products").innerHTML=list.length?list.map(p=>`<article class="card"><div class="photo">${p.imagem_url?`<img src="${esc(p.imagem_url)}" alt="${esc(p.nome)}">`:esc(p.emoji||"🍔")}</div><div class="info"><h3>${esc(p.nome)}</h3>${p.descricao?`<div class="desc">${esc(p.descricao)}</div>`:""}<div class="bottom"><span class="price">${money(p.preco)}</span><button class="plus" onclick="openProduct('${p.id}')">+</button></div></div></article>`).join(""):'<div class="empty">Nenhum produto encontrado.</div>';
}

async function openProduct(id){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return;
 const category=catCfg[p.categoria_id]||{ingredientes:true,observacao:true};
 if(norm(p.nome).includes("acai"))return openAcai(p,category);
 const rel=await db.from("produto_ingredientes").select("ingrediente_id").eq("produto_id",id);
 const allowed=new Set((rel.data||[]).map(x=>String(x.ingrediente_id)));
 const ing=await db.from("ingredientes").select("*").eq("ativo",true).order("nome");
 let list=(ing.data||[]).filter(x=>allowed.has(String(x.id)));
 if(category.ingredientes!==false&&!list.length)list=ing.data||[];
 if(category.ingredientes===false)list=[];
 $("modalContent").innerHTML=`<h2>${esc(p.nome)}</h2><div class="form"><label>Quantidade<input id="itemQty" type="number" min="1" value="1"></label>${list.length?`<label>Adicionais</label><div class="checks">${list.map(i=>`<label class="check"><input type="checkbox" value="${i.id}" data-name="${esc(i.nome)}" data-price="${i.preco}"> ${esc(i.nome)} + ${money(i.preco)}</label>`).join("")}</div>`:""}${category.observacao!==false?`<label>Observação<textarea id="itemObs" placeholder="Alguma observação?"></textarea></label>`:""}<div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" onclick="addProduct('${p.id}')">Adicionar</button></div></div>`;
 $("modal").classList.remove("hidden");
}
function openAcai(p,category){
 const sizes=acaiCfg.tamanhos?.length?acaiCfg.tamanhos:[{nome:"200 ml",preco:0},{nome:"300 ml",preco:0},{nome:"500 ml",preco:0},{nome:"1 litro",preco:0}];
 const tops=Array.isArray(acaiCfg.coberturas)?acaiCfg.coberturas:[];
 $("modalContent").innerHTML=`<h2>🍧 ${esc(p.nome)}</h2><div class="form"><label>Tamanho</label><div class="checks">${sizes.map((s,i)=>`<label class="check"><input type="radio" name="acaiSize" value="${i}" ${i===0?"checked":""} data-name="${esc(s.nome)}" data-price="${Number(s.preco||0)}"> ${esc(s.nome)} — ${money(s.preco)}</label>`).join("")}</div><label>Coberturas <small>(até 3)</small></label><div class="checks" id="tops">${tops.map((t,i)=>`<label class="check"><input class="top" type="checkbox" data-name="${esc(t.nome)}" data-price="${Number(t.preco||0)}"> ${esc(t.nome)}${Number(t.preco||0)?` + ${money(t.preco)}`:""}</label>`).join("")}</div>${category.observacao!==false?`<label>Observação<textarea id="itemObs"></textarea></label>`:""}<label>Quantidade<input id="itemQty" type="number" min="1" value="1"></label><div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" onclick="addAcai('${p.id}')">Adicionar</button></div></div>`;
 $("modal").classList.remove("hidden");
 document.querySelectorAll(".top").forEach(x=>x.onchange=()=>{const n=document.querySelectorAll(".top:checked").length;document.querySelectorAll(".top:not(:checked)").forEach(y=>y.disabled=n>=3)});
}
function closeModal(){$("modal").classList.add("hidden")}
function addProduct(id){
 const p=products.find(x=>String(x.id)===String(id));const q=Math.max(1,Number($("itemQty").value||1));
 const adds=[...document.querySelectorAll("#modalContent input[type=checkbox]:checked")].map(x=>({nome:x.dataset.name,preco:Number(x.dataset.price||0)}));
 const obs=$("itemObs")?.value.trim()||"";cart.push({key:uid(),id:p.id,nome:p.nome,preco:Number(p.preco)+adds.reduce((s,x)=>s+x.preco,0),quantidade:q,adicionais:adds,obs});closeModal();renderCart();
}
function addAcai(id){
 const p=products.find(x=>String(x.id)===String(id));const q=Math.max(1,Number($("itemQty").value||1));const s=document.querySelector('input[name="acaiSize"]:checked');
 const adds=[...document.querySelectorAll(".top:checked")].map(x=>({nome:x.dataset.name,preco:Number(x.dataset.price||0)}));
 const obs=$("itemObs")?.value.trim()||"";cart.push({key:uid(),id:p.id,nome:`${p.nome} (${s?.dataset.name||""})`,preco:Number(p.preco)+Number(s?.dataset.price||0)+adds.reduce((a,x)=>a+x.preco,0),quantidade:q,adicionais:adds,obs});closeModal();renderCart();
}
function renderCart(){
 const n=cart.reduce((s,x)=>s+x.quantidade,0),sub=cart.reduce((s,x)=>s+x.preco*x.quantidade,0);
 $("cartCount").textContent=n;$("cartItemCount").textContent=`${n} ${n===1?"item":"itens"}`;
 $("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cartItem"><div class="cartLine"><span class="cartName">${x.quantidade}x ${esc(x.nome)}</span><b>${money(x.preco*x.quantidade)}</b></div>${x.adicionais?.length?`<small>+ ${x.adicionais.map(a=>esc(a.nome)).join(", ")}</small>`:""}${x.obs?`<small>${esc(x.obs)}</small>`:""}<div class="qty"><button onclick="changeQty('${x.key}',-1)">−</button><b>${x.quantidade}</b><button onclick="changeQty('${x.key}',1)">+</button><button class="remove" onclick="removeItem('${x.key}')">Excluir</button></div></div>`).join(""):'<div class="empty">Sua sacola está vazia.</div>';
 $("subtotal").textContent=money(sub);$("total").textContent=money(sub);$("deliveryFee").textContent="R$ 0,00";$("bottomCartTotal").textContent=money(sub);
}
function changeQty(k,d){const x=cart.find(x=>x.key===k);if(!x)return;x.quantidade+=d;if(x.quantidade<=0)cart=cart.filter(y=>y.key!==k);renderCart()}
function removeItem(k){cart=cart.filter(x=>x.key!==k);renderCart()}
function clearCart(){if(!cart.length)return;if(confirm("Tem certeza que deseja limpar a sacola?")){cart=[];renderCart();closeCart()}}
function openCart(){$("cart").classList.add("open");$("overlay").classList.add("open");document.body.style.overflow="hidden"}
function closeCart(){$("cart").classList.remove("open");$("overlay").classList.remove("open");document.body.style.overflow=""}
function addMoreItems(){closeCart();window.scrollTo({top:0,behavior:"smooth"})}
function continueOrder(){if(!cart.length)return alert("Adicione pelo menos um produto.");$("checkout").classList.remove("hidden");closeCart();updateCheckoutTotals();}

function getSaved(){try{return JSON.parse(localStorage.getItem(ADDRESS_KEY)||"null")}catch{return null}}
function saveCustomer(){const d={nome:$("nome").value.trim(),telefone:$("telefone").value.trim(),bairro:$("bairro").value,endereco:$("endereco").value.trim(),referencia:$("referencia").value.trim()};if(d.endereco)localStorage.setItem(ADDRESS_KEY,JSON.stringify(d))}
function showSaved(){const d=getSaved(),ok=!!d?.endereco?.trim();$("savedAddress").classList.toggle("hidden",!ok);$("savedAddressText").textContent=ok?[d.bairro,d.endereco,d.referencia].filter(Boolean).join(" • "):""}
function setReceive(method){receiveMethod=method;const delivery=method==="entrega";$("customerSection").classList.remove("hidden");$("deliveryFields").classList.toggle("hidden",!delivery);$("savedAddress").classList.toggle("hidden",!(delivery&&getSaved()?.endereco?.trim()));document.querySelectorAll(".receive-option").forEach(b=>b.classList.toggle("selected",b.dataset.method===method));if(delivery){const d=getSaved();if(d){$("nome").value||=d.nome||"";$("telefone").value||=d.telefone||"";$("bairro").value=d.bairro||"";$("endereco").value=d.endereco||"";$("referencia").value=d.referencia||""}showSaved()}else{$("savedAddress").classList.add("hidden")}}
function updatePayment(){const is=$("pagamento").value==="Dinheiro";$("paymentMoney").classList.toggle("hidden",!is);if(!is){$("valorPago").value="";$("trocoPreview").textContent=""}else updateChange()}
function updateChange(){if($("pagamento").value!=="Dinheiro")return;const paid=Number($("valorPago").value||0),total=Number($("checkoutTotal").dataset.value||0);$("trocoPreview").textContent=paid>0&&paid>=total?`Troco: ${money(paid-total)}`:""}
function updateCheckoutTotals(){const sub=cart.reduce((s,x)=>s+x.preco*x.quantidade,0);$("checkoutSubtotal").textContent=money(sub);$("checkoutFee").textContent="R$ 0,00";$("checkoutTotal").textContent=money(sub);$("checkoutTotal").dataset.value=sub;updatePayment();showSaved()}
async function loadBairros(){const r=await db.from("bairros").select("*").eq("ativo",true).order("nome");if(r.data) $("bairro").innerHTML='<option value="">Selecione o bairro *</option>'+r.data.map(x=>`<option value="${esc(x.nome)}">${esc(x.nome)}</option>`).join("")}
async function sendOrder(){
 if(!cart.length)return alert("A sacola está vazia.");
 const nome=$("nome").value.trim(),telefone=$("telefone").value.trim(),obs=$("observacoes").value.trim();
 if(!nome||!telefone)return alert("Informe nome e WhatsApp.");
 if(!$("pagamento").value)return alert("Selecione a forma de pagamento.");
 const delivery=receiveMethod==="entrega",end=delivery?$("endereco").value.trim():"",ref=delivery?$("referencia").value.trim():"",bairro=delivery?$("bairro").value:"";
 if(delivery&&!end)return alert("Informe o endereço.");
 if(delivery)saveCustomer();
 const total=cart.reduce((s,x)=>s+x.preco*x.quantidade,0),items=cart.map(x=>({nome:x.nome,quantidade:x.quantidade,preco:x.preco,adicionais:x.adicionais||[],obs:x.obs||""}));
 const packed=`${obs}\n\n[ML_ITENS]${encodeURIComponent(JSON.stringify(items))}[/ML_ITENS]\n\n[ML_STATUS]novo[/ML_STATUS]`;
 const {error}=await db.from("pedidos").insert({Cliente:nome,telefone,endereco:end,referencia:ref,observacoes:packed,total});
 if(error)return alert("Não foi possível enviar o pedido: "+error.message);
 cart=[];renderCart();$("checkout").classList.add("hidden");alert("Pedido enviado com sucesso!");
}

$("search").oninput=renderProducts;$("openCart").onclick=openCart;$("closeCart").onclick=closeCart;$("overlay").onclick=closeCart;$("clearCart").onclick=clearCart;$("addMore").onclick=addMoreItems;$("continueOrder").onclick=continueOrder;$("closeCheckout").onclick=()=>$("checkout").classList.add("hidden");$("modalClose").onclick=closeModal;$("send").onclick=sendOrder;
document.querySelectorAll(".receive-option").forEach(b=>b.onclick=()=>setReceive(b.dataset.method));$("changeAddress").onclick=()=>setReceive("entrega");$("pagamento").onchange=updatePayment;$("valorPago").oninput=updateChange;
loadBairros();init();
