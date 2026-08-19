const SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let products=[],cats=[],cart=[],cat="todos",catCfg={},acaiCfg={tamanhos:[],coberturas:[]};
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const uid=()=>crypto.randomUUID();
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
async function cfg(key,fallback){const r=await db.from("configuracoes").select("valor").eq("chave",key).maybeSingle();try{return JSON.parse(r.data?.valor||"null")??fallback}catch{return fallback}}
async function init(){
 const [c,p,cc,aa]=await Promise.all([
  db.from("categorias").select("*").eq("ativo",true).order("ordem"),
  db.from("produtos").select("*,categorias(nome,emoji,imagem_url)").eq("ativo",true).order("ordem"),
  cfg("categoria_config",{}),cfg("acai_config",{tamanhos:[],coberturas:[]})
 ]);
 if(c.error||p.error){$("products").innerHTML='<div class="empty">Não foi possível carregar o cardápio.</div>';return}
 cats=c.data||[];products=p.data||[];catCfg=cc||{};acaiCfg=aa||{tamanhos:[],coberturas:[]};renderCats();renderProducts();
}
function catSettings(){return cat==="todos"?{ingredientes:false,observacao:true}:(catCfg[cat]||{ingredientes:true,observacao:true})}
function renderCats(){
 const all=`<button class="${cat==="todos"?"active":""}" onclick="chooseCat('todos')">🍽️ Todos</button>`;
 $("categories").innerHTML=all+cats.map(c=>`<button class="${String(cat)===String(c.id)?"active":""}" onclick="chooseCat('${c.id}')">${c.imagem_url?`<img class="cat-icon" src="${esc(c.imagem_url)}" alt="" onerror="this.style.display='none'">`:esc(c.emoji||"📦")} ${esc(c.nome)}</button>`).join("");
}
function chooseCat(id){cat=id;renderCats();renderProducts()}
function renderProducts(){
 const q=$("search").value.toLowerCase().trim();
 const list=products.filter(p=>(cat==="todos"||String(p.categoria_id)===String(cat))&&(!q||p.nome.toLowerCase().includes(q)));
 $("products").innerHTML=list.length?list.map(p=>`<article class="card"><div class="photo">${p.imagem_url?`<img src="${esc(p.imagem_url)}" alt="${esc(p.nome)}">`:esc(p.emoji||"🍔")}</div><div class="info"><h3>${esc(p.nome)}</h3><div class="bottom"><span class="price">${money(p.preco)}</span><button class="plus" onclick="openProduct('${p.id}')">+</button></div></div></article>`).join(""):'<div class="empty">Nenhum produto encontrado.</div>';
}
async function openProduct(id){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return;
 const category=catCfg[p.categoria_id]||{ingredientes:true,observacao:true};
 const isAcai=norm(p.nome).includes("acai");
 const rel=await db.from("produto_ingredientes").select("ingrediente_id").eq("produto_id",id);
 const allowed=new Set((rel.data||[]).map(x=>String(x.ingrediente_id)));
 const ing=await db.from("ingredientes").select("*").eq("ativo",true).order("nome");
 let list=(ing.data||[]).filter(x=>allowed.has(String(x.id)));
 if(category.ingredientes!==false && !list.length && !isAcai) list=ing.data||[];
 if(category.ingredientes===false) list=[];
 if(isAcai){openAcai(p,category);return;}
 $("modalContent").innerHTML=`<h2>${esc(p.nome)}</h2><div class="form"><label>Quantidade<input id="qty" type="number" min="1" value="1"></label>${list.length?`<label>Ingredientes adicionais</label><div class="checks">${list.map(i=>`<label class="check"><input type="checkbox" value="${i.id}" data-name="${esc(i.nome)}" data-price="${i.preco}"> ${esc(i.nome)} + ${money(i.preco)}</label>`).join("")}</div>`:""}${category.observacao!==false?`<label>Observação<textarea id="itemObs" placeholder="Ex.: sem cebola..."></textarea></label>`:""}<div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" onclick="addProduct('${p.id}')">Adicionar</button></div></div>`;
 $("modal").classList.remove("hidden");
}
function openAcai(p,category){
 const sizes=Array.isArray(acaiCfg.tamanhos)&&acaiCfg.tamanhos.length?acaiCfg.tamanhos:[{nome:"200 ml",preco:0},{nome:"300 ml",preco:0},{nome:"500 ml",preco:0},{nome:"1 litro",preco:0}];
 const tops=Array.isArray(acaiCfg.coberturas)?acaiCfg.coberturas:[];
 $("modalContent").innerHTML=`<h2>🍧 ${esc(p.nome)}</h2><div class="form"><label>Tamanho</label><div class="checks">${sizes.map((s,i)=>`<label class="check"><input type="radio" name="acaiSize" value="${i}" ${i===0?'checked':''} data-name="${esc(s.nome)}" data-price="${Number(s.preco||0)}"> ${esc(s.nome)} — ${money(s.preco)}</label>`).join("")}</div>${tops.length?`<label>Coberturas <small>(escolha até 3)</small></label><div class="checks" id="acaiTops">${tops.map((t,i)=>`<label class="check"><input class="acai-top" type="checkbox" value="${i}" data-name="${esc(t.nome)}" data-price="${Number(t.preco||0)}"> ${esc(t.nome)}${Number(t.preco||0)>0?' + '+money(t.preco):''}</label>`).join("")}</div>`:`<p class="muted">Nenhuma cobertura cadastrada ainda.</p>`}${category.observacao!==false?`<label>Observação<textarea id="itemObs" placeholder="Ex.: sem açúcar..."></textarea></label>`:""}<label>Quantidade<input id="qty" type="number" min="1" value="1"></label><div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" onclick="addAcai('${p.id}')">Adicionar</button></div></div>`;
 $("modal").classList.remove("hidden");
 document.querySelectorAll('.acai-top').forEach(cb=>cb.addEventListener('change',()=>{const checked=[...document.querySelectorAll('.acai-top:checked')];if(checked.length>=3){document.querySelectorAll('.acai-top:not(:checked)').forEach(x=>x.disabled=true)}else document.querySelectorAll('.acai-top').forEach(x=>x.disabled=false)}));
}
function closeModal(){$("modal").classList.add("hidden")}
function addAcai(id){
 const p=products.find(x=>String(x.id)===String(id));const q=Math.max(1,Number($("qty").value||1));const s=document.querySelector('input[name="acaiSize"]:checked');
 const adds=[...document.querySelectorAll('.acai-top:checked')].map(x=>({nome:x.dataset.name,preco:Number(x.dataset.price||0)}));
 const sizeName=s?.dataset.name||"";const sizePrice=Number(s?.dataset.price||0);const obs=$("itemObs")?.value.trim()||"";const price=Number(p.preco)+sizePrice+adds.reduce((a,x)=>a+x.preco,0);
 cart.push({key:uid(),id:p.id,nome:`${p.nome} (${sizeName})`,preco:price,quantidade:q,adicionais:adds,obs});closeModal();renderCart();
}
function addProduct(id){const p=products.find(x=>String(x.id)===String(id));let q=Math.max(1,Number($("qty").value||1));const adds=[...document.querySelectorAll("#modalContent input[type=checkbox]:checked")].map(x=>({nome:x.dataset.name,preco:Number(x.dataset.price||0)}));const obs=$("itemObs")?.value.trim()||"";const price=Number(p.preco)+adds.reduce((s,x)=>s+x.preco,0);cart.push({key:uid(),id:p.id,nome:p.nome,preco:price,quantidade:q,adicionais:adds,obs});closeModal();renderCart()}
function renderCart(){const n=cart.reduce((s,x)=>s+x.quantidade,0);$("cartCount").textContent=n;$("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cartItem"><div class="cartLine"><span class="cartName">${x.quantidade}x ${esc(x.nome)}</span><span class="cartPrice">${money(x.preco*x.quantidade)}</span></div>${x.adicionais.length?`<small>+ ${x.adicionais.map(a=>esc(a.nome)).join(", ")}</small>`:""}${x.obs?`<small>${esc(x.obs)}</small>`:""}<div class="qty"><button onclick="qty('${x.key}',-1)">−</button><b>${x.quantidade}</b><button onclick="qty('${x.key}',1)">+</button><button class="remove" onclick="removeItem('${x.key}')">Excluir</button></div></div>`).join(""):'<div class="empty">Seu pedido está vazio.<br>Toque no + para adicionar.</div>';$("total").textContent=money(cart.reduce((s,x)=>s+x.preco*x.quantidade,0))}
function qty(k,d){const x=cart.find(x=>x.key===k);if(!x)return;x.quantidade+=d;if(x.quantidade<1)cart=cart.filter(y=>y.key!==k);renderCart()}
function removeItem(k){cart=cart.filter(x=>x.key!==k);renderCart()}
function openCart(){$("cart").classList.add("open");$("overlay").classList.add("open");document.body.style.overflow="hidden"}
function closeCart(){$("cart").classList.remove("open");$("overlay").classList.remove("open");document.body.style.overflow=""}
async function sendOrder(){
 if(!cart.length)return alert("Adicione pelo menos um produto.");
 const nome=$("nome").value.trim();if(!nome)return alert("Informe seu nome.");
 const phone=$("telefone").value.trim(),end=$("endereco").value.trim(),ref=$("referencia").value.trim(),obs=$("observacoes").value.trim();
 const items=cart.map(x=>({nome:x.nome,quantidade:x.quantidade,preco:x.preco,adicionais:x.adicionais,obs:x.obs}));
 const total=cart.reduce((s,x)=>s+x.preco*x.quantidade,0);
 /* CLIENTE: sempre entra como NOVO. O Admin é quem confirma e passa para PREPARO. */
 const packed=`${obs}\n\n[ML_ITENS]${encodeURIComponent(JSON.stringify(items))}[/ML_ITENS]\n\n[ML_STATUS]novo[/ML_STATUS]`;
 const {error}=await db.from("pedidos").insert({Cliente:nome,telefone:phone,endereco:end,referencia:ref,observacoes:packed,total});
 if(error)return alert("Não foi possível enviar o pedido: "+error.message);
 if(phone)await db.from("clientes").upsert({nome,telefone:phone,endereco:end,referencia:ref},{onConflict:"telefone"});
 cart=[];renderCart();closeCart();$("nome").value=$("telefone").value=$("endereco").value=$("referencia").value=$("observacoes").value="";
 alert("Pedido enviado com sucesso! Obrigado.")
}
$("search").oninput=renderProducts;$('openCart').onclick=openCart;$('closeCart').onclick=closeCart;$('overlay').onclick=closeCart;$('modalClose').onclick=closeModal;$('send').onclick=sendOrder;init();renderCart();
