const SUPABASE_URL = "https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY = "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";

let supabaseClient = null;
let carrinho = [];
let pedidos = [];
let produtos = [];
let categorias = [];
let ingredientes = [];
let clientes = [];
let categoriaAtual = "todos";
let pedidoSelecionado = null;
let canalPedidosRealtime = null;
let fallbackSincronizacao = null;
let produtoEmEdicao = null;
let ingredienteEmEdicao = null;
let categoriaEmEdicao = null;
let extrasDoProduto = [];

const produtosPadrao = [
  {id:"local-1",nome:"X-Burger",categoria:"lanches",preco:18,emoji:"🍔",ativo:true},
  {id:"local-2",nome:"X-Egg Bacon",categoria:"lanches",preco:20,emoji:"🍔",ativo:true},
  {id:"local-3",nome:"X-Salada",categoria:"lanches",preco:19,emoji:"🍔",ativo:true},
  {id:"local-4",nome:"X-Frango",categoria:"lanches",preco:17,emoji:"🍔",ativo:true},
  {id:"local-5",nome:"Cachorro Quente",categoria:"lanches",preco:13,emoji:"🌭",ativo:true},
  {id:"local-6",nome:"X-Calabresa",categoria:"lanches",preco:19,emoji:"🍔",ativo:true},
  {id:"local-7",nome:"X-Tudo",categoria:"lanches",preco:24,emoji:"🍔",ativo:true},
  {id:"local-8",nome:"Duplo Burger",categoria:"lanches",preco:22,emoji:"🍔",ativo:true},
  {id:"local-9",nome:"Batata Frita",categoria:"porcoes",preco:15,emoji:"🍟",ativo:true},
  {id:"local-10",nome:"Calabresa",categoria:"porcoes",preco:20,emoji:"🍟",ativo:true},
  {id:"local-11",nome:"Frango",categoria:"porcoes",preco:22,emoji:"🍗",ativo:true},
  {id:"local-12",nome:"Coca-Cola Lata",categoria:"bebidas",preco:5,emoji:"🥤",ativo:true},
  {id:"local-13",nome:"Guaraná",categoria:"bebidas",preco:5,emoji:"🥤",ativo:true},
  {id:"local-14",nome:"Suco",categoria:"bebidas",preco:7,emoji:"🧃",ativo:true},
  {id:"local-15",nome:"Açaí",categoria:"sobremesas",preco:12,emoji:"🍧",ativo:true},
  {id:"local-16",nome:"Pudim",categoria:"sobremesas",preco:8,emoji:"🍮",ativo:true}
];

const categoriasPadrao = [
  {id:"lanches",nome:"Lanches",emoji:"🍔",ordem:1,ativo:true},
  {id:"porcoes",nome:"Porções",emoji:"🍟",ordem:2,ativo:true},
  {id:"bebidas",nome:"Bebidas",emoji:"🥤",ordem:3,ativo:true},
  {id:"sobremesas",nome:"Sobremesas",emoji:"🍰",ordem:4,ativo:true}
];

function pegar(id){ return document.getElementById(id); }

function moeda(v){
  return Number(v || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

function escapar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function slug(v){
  return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60);
}

function conectarBanco(){
  return new Promise(resolve=>{
    if(window.supabase){
      supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      resolve(true); return;
    }
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload=()=>{supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);resolve(true);};
    s.onerror=()=>resolve(false);
    document.head.appendChild(s);
  });
}

async function carregarCatalogo(){
  if(!supabaseClient) return;

  const [c,p,i] = await Promise.all([
    supabaseClient.from("categorias").select("*").eq("ativo",true).order("ordem",{ascending:true}),
    supabaseClient.from("produtos").select("*").eq("ativo",true).order("ordem",{ascending:true}),
    supabaseClient.from("ingredientes").select("*").eq("ativo",true).order("nome",{ascending:true})
  ]);

  if(!c.error && c.data?.length) categorias=c.data;
  else categorias=[...categoriasPadrao];

  if(!p.error && p.data?.length) produtos=p.data;
  else produtos=[...produtosPadrao];

  ingredientes=!i.error && i.data ? i.data : [];
  renderCategorias();
  mostrarProdutos();
  renderAdminTudo();
}

function renderCategorias(){
  const area=pegar("categories");
  if(!area) return;
  const cats=[{id:"todos",nome:"Todos",emoji:"🍽️"},...categorias];
  area.innerHTML=cats.map(c=>`
    <button class="category ${categoriaAtual===c.id?"active":""}" data-category="${escapar(c.id)}" type="button">
      ${c.emoji||"📦"} ${escapar(c.nome)}
    </button>`).join("");
  area.querySelectorAll(".category").forEach(b=>b.onclick=()=>selecionarCategoria(b.dataset.category));
}

function selecionarCategoria(c){
  categoriaAtual=c;
  renderCategorias();
  mostrarProdutos();
}

function mostrarProdutos(){
  const area=pegar("productsGrid");
  if(!area) return;
  const busca=(pegar("productSearch")?.value||"").toLowerCase().trim();
  const lista=produtos.filter(p=>
    (categoriaAtual==="todos" || String(p.categoria_id||p.categoria)===String(categoriaAtual)) &&
    (!busca || String(p.nome).toLowerCase().includes(busca))
  );
  area.innerHTML=lista.length?lista.map(p=>`
    <article class="product-card">
      <div class="product-image">${p.imagem_url?`<img src="${escapar(p.imagem_url)}" alt="">`:escapar(p.emoji||"🍔")}</div>
      <div class="product-info">
        <div class="product-name">${escapar(p.nome)}</div>
        <div class="product-bottom">
          <span class="product-price">${moeda(p.preco)}</span>
          <button class="add-product" type="button" onclick="adicionarProduto('${String(p.id).replaceAll("'","\\'")}')">+</button>
        </div>
      </div>
    </article>`).join(""):`<div class="empty-state">Nenhum produto encontrado.</div>`;
}

async function adicionarProduto(id){
  const p=produtos.find(x=>String(x.id)===String(id));
  if(!p) return;

  let extras=[];
  if(supabaseClient && !String(p.id).startsWith("local-")){
    const {data}=await supabaseClient.from("produto_ingredientes")
      .select("ingrediente_id,ingredientes(id,nome,preco)")
      .eq("produto_id",p.id);
    extras=(data||[]).map(x=>x.ingredientes).filter(Boolean);
  }
  if(extras.length){
    abrirModalAdicionais(p,extras);
    return;
  }
  adicionarAoCarrinho(p,[]);
}

function adicionarAoCarrinho(p,extras){
  const chave=String(p.id)+"|"+extras.map(x=>x.id).sort().join(",");
  const item=carrinho.find(x=>x.chave===chave);
  const adicionalTotal=extras.reduce((s,x)=>s+Number(x.preco||0),0);
  if(item) item.quantidade++;
  else carrinho.push({
    chave,id:p.id,nome:p.nome,preco:Number(p.preco||0),quantidade:1,
    adicionais:extras.map(x=>({id:x.id,nome:x.nome,preco:Number(x.preco||0)})),
    adicionalTotal
  });
  mostrarCarrinho();
}

function abrirModalAdicionais(p,extras){
  extrasDoProduto=extras;
  const modal=pegar("extrasModal");
  const corpo=pegar("extrasOptions");
  if(!modal||!corpo){ adicionarAoCarrinho(p,[]); return; }
  corpo.innerHTML=extras.map(x=>`
    <label class="extra-option">
      <input type="checkbox" value="${escapar(x.id)}" data-price="${Number(x.preco||0)}">
      <span>${escapar(x.nome)}</span><strong>+ ${moeda(x.preco)}</strong>
    </label>`).join("");
  modal.dataset.productId=p.id;
  modal.classList.add("show");
}

function fecharExtras(){pegar("extrasModal")?.classList.remove("show");}

function confirmarExtras(){
  const modal=pegar("extrasModal"); if(!modal) return;
  const p=produtos.find(x=>String(x.id)===String(modal.dataset.productId));
  if(!p) return;
  const escolhidos=[...modal.querySelectorAll("input:checked")].map(i=>extrasDoProduto.find(x=>String(x.id)===String(i.value))).filter(Boolean);
  adicionarAoCarrinho(p,escolhidos); fecharExtras();
}

function aumentarQuantidade(chave){
  const i=carrinho.find(x=>x.chave===chave); if(i){i.quantidade++;mostrarCarrinho();}
}
function diminuirQuantidade(chave){
  const i=carrinho.find(x=>x.chave===chave); if(!i)return;
  i.quantidade--; if(i.quantidade<=0)carrinho=carrinho.filter(x=>x.chave!==chave); mostrarCarrinho();
}
function removerProduto(chave){carrinho=carrinho.filter(x=>x.chave!==chave);mostrarCarrinho();}
function limparCarrinho(){carrinho=[];mostrarCarrinho();}
function calcularTotal(){return carrinho.reduce((s,x)=>s+(x.preco+x.adicionalTotal)*x.quantidade,0);}

function atualizarTotal(){
  const total=calcularTotal();
  if(pegar("subtotal"))pegar("subtotal").textContent=moeda(total);
  if(pegar("deliveryFee"))pegar("deliveryFee").textContent=moeda(0);
  if(pegar("cartTotal"))pegar("cartTotal").textContent=moeda(total);
  if(pegar("cartCount")){
    const q=carrinho.reduce((s,x)=>s+x.quantidade,0);
    pegar("cartCount").textContent=q+(q===1?" item":" itens");
  }
}

function mostrarCarrinho(){
  const area=pegar("cartItems"); if(!area)return;
  if(!carrinho.length){
    area.innerHTML=`<div class="cart-empty"><strong>Sua comanda está vazia</strong><span>Toque no + de um produto para adicionar.</span></div>`;
    atualizarTotal();return;
  }
  area.innerHTML=carrinho.map(i=>{
    const extras=i.adicionais?.length?`<div class="cart-extras">${i.adicionais.map(e=>`+ ${escapar(e.nome)} (${moeda(e.preco)})`).join("<br>")}</div>`:"";
    return `<div class="cart-item"><div><div class="cart-item-name">${escapar(i.nome)}</div>${extras}
      <div class="cart-item-controls">
      <button class="quantity-btn" type="button" onclick="diminuirQuantidade('${String(i.chave).replaceAll("'","\\'")}')">−</button>
      <span class="quantity-value">${i.quantidade}</span>
      <button class="quantity-btn" type="button" onclick="aumentarQuantidade('${String(i.chave).replaceAll("'","\\'")}')">+</button>
      <button class="remove-item" type="button" onclick="removerProduto('${String(i.chave).replaceAll("'","\\'")}')">🗑</button>
      </div></div><div class="cart-item-price">${moeda((i.preco+i.adicionalTotal)*i.quantidade)}</div></div>`;
  }).join("");
  atualizarTotal();
}

function codificarItens(itens,obs){
  return String(obs||"")+"\n\n[ML_ITENS]"+encodeURIComponent(JSON.stringify(itens))+"[/ML_ITENS]";
}
function extrairItens(obs){
  const m=String(obs||"").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/); if(!m)return [];
  try{return JSON.parse(decodeURIComponent(m[1]));}catch(e){return [];}
}
function observacaoVisivel(obs){
  return String(obs||"").replace(/\n?\n?\[ML_ITENS\][\s\S]*?\[\/ML_ITENS\]/g,"")
    .replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim();
}
function codificarStatus(obs,status){
  const limpo=String(obs||"").replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim();
  return limpo+"\n\n[ML_STATUS]"+status+"[/ML_STATUS]";
}
function extrairStatus(obs){
  const m=[...String(obs||"").matchAll(/\[ML_STATUS\](preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];
  return m.length?m[m.length-1][1]:"preparo";
}
function nomeCliente(p){return p?.Cliente??p?.cliente??p?.nome??"Sem nome";}
function totalPedido(p){return Number(p?.total??p?.Total??0);}
function dataPedido(p){return p?.created_at||p?.data_hora||p?.dataHora||p?.createdAt||"";}
function numeroPedido(p,i){const v=p?.id??p?.numero??p?.Numero;return v!==undefined&&v!==null&&v!==""?String(v).slice(-6).padStart(3,"0"):String(i+1).padStart(3,"0");}
function formatarData(v){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString("pt-BR");}
function ordenarPedidos(a){return [...a].sort((x,y)=>new Date(dataPedido(y)||0)-new Date(dataPedido(x)||0));}
function statusLabel(s){return {preparo:"🍔 Em preparo",entrega:"🛵 Saiu para entrega",entregue:"✅ Entregue",cancelado:"❌ Cancelado"}[s]||"🍔 Em preparo";}

async function carregarPedidos(){
  if(!supabaseClient)return;
  const {data,error}=await supabaseClient.from("pedidos").select("*");
  if(error){console.error(error);pedidos=[];mostrarComandas();mostrarHistorico();return;}
  pedidos=ordenarPedidos(data||[]).map(p=>{p.status_pedido=extrairStatus(p.observacoes);p.__entregue=p.status_pedido==="entregue";return p;});
  mostrarComandas();mostrarHistorico();
  if(pedidoSelecionado){
    const p=pedidos.find(x=>String(x.id)===String(pedidoSelecionado.id));
    if(p){pedidoSelecionado=p;mostrarImpressao();}
  }
}

function iniciarRealtimePedidos(){
  if(!supabaseClient)return;
  if(canalPedidosRealtime){try{supabaseClient.removeChannel(canalPedidosRealtime);}catch(e){}}
  canalPedidosRealtime=supabaseClient.channel("miguel-lanches-pedidos")
    .on("postgres_changes",{event:"*",schema:"public",table:"pedidos"},()=>carregarPedidos())
    .subscribe();
}
function iniciarFallbackSincronizacao(){
  if(fallbackSincronizacao)clearInterval(fallbackSincronizacao);
  fallbackSincronizacao=setInterval(()=>{if(!document.hidden&&supabaseClient)carregarPedidos();},2000);
}

function mostrarComandas(){
  const area=pegar("openOrders");if(!area)return;
  const abertos=pedidos.filter(p=>!["entregue","cancelado"].includes(extrairStatus(p.observacoes)));
  if(!abertos.length){area.innerHTML=`<div class="empty-state">Nenhuma comanda aberta.</div>`;return;}
  area.innerHTML=abertos.map(p=>{
    const itens=extrairItens(p.observacoes);
    const resumo=itens.length?itens.map(x=>`${x.quantidade}x ${escapar(x.nome)}`).join(", "):"Pedido registrado";
    const status=extrairStatus(p.observacoes);
    const botao=status==="preparo"?`<button class="status-action" onclick="alterarStatusPedido('${p.id}','entrega')">🛵 Saiu para entrega</button>`:
      status==="entrega"?`<button class="status-action delivered" onclick="alterarStatusPedido('${p.id}','entregue')">✅ Entregue</button>`:"";
    return `<div class="order-card"><div onclick="selecionarPedido('${p.id}')" style="cursor:pointer">
      <strong>#${numeroPedido(p,0)} - ${escapar(nomeCliente(p))}</strong><div>${resumo}</div><strong>${moeda(totalPedido(p))}</strong>
      <div class="order-status">${statusLabel(status)}</div></div>
      <div class="status-action-row">${botao}</div>
      <div class="status-action-row"><button class="cancel-order-btn" onclick="alterarStatusPedido('${p.id}','cancelado')">❌ Cancelar pedido</button></div></div>`;
  }).join("");
}

async function alterarStatusPedido(id,status){
  const p=pedidos.find(x=>String(x.id)===String(id));if(!p||!supabaseClient)return;
  if(status==="entrega")abrirWhatsAppMensagem(p,"entrega");

  const novaObservacao=codificarStatus(p.observacoes,status);
  const {error}=await supabaseClient.from("pedidos").update({observacoes:novaObservacao}).eq("id",p.id);
  if(error){alert("Não foi possível atualizar o status do pedido.\n\n"+(error.message||""));return;}

  p.observacoes=novaObservacao;p.status_pedido=status;
  if(status==="cancelado"||status==="entregue")pedidos=pedidos.filter(x=>String(x.id)!==String(p.id));
  mostrarComandas();mostrarHistorico();
  setTimeout(carregarPedidos,500);
}

function mostrarHistorico(){
  const t=pegar("historyTable");if(!t)return;
  const grupos={};
  pedidos.forEach(p=>{
    const d=dataPedido(p)?new Date(dataPedido(p)):new Date();
    const chave=d.toLocaleDateString("pt-BR");(grupos[chave]??=[]).push(p);
  });
  t.innerHTML=Object.entries(grupos).map(([dia,lista])=>{
    const total=lista.filter(p=>extrairStatus(p.observacoes)!=="cancelado").reduce((s,p)=>s+totalPedido(p),0);
    const vendas=lista.filter(p=>extrairStatus(p.observacoes)!=="cancelado");
    const media=vendas.length?total/vendas.length:0;
    return `<tr><td colspan="6"><strong>📅 ${dia}</strong> — 🧾 ${vendas.length} vendas — 💰 ${moeda(total)} — 🎟️ Média ${moeda(media)}</td></tr>`+
      lista.map(p=>`<tr><td>#${numeroPedido(p,0)}</td><td>${escapar(nomeCliente(p))}</td><td>${formatarData(dataPedido(p))}</td><td>${statusLabel(extrairStatus(p.observacoes))}</td><td>${moeda(totalPedido(p))}</td><td><button class="table-action" onclick="selecionarPedido('${p.id}')">Ver</button></td></tr>`).join("");
  }).join("");
  const hoje=new Date().toLocaleDateString("pt-BR");
  const hojeLista=pedidos.filter(p=>(dataPedido(p)?new Date(dataPedido(p)):new Date()).toLocaleDateString("pt-BR")===hoje&&extrairStatus(p.observacoes)!=="cancelado");
  const total=hojeLista.reduce((s,p)=>s+totalPedido(p),0),media=hojeLista.length?total/hojeLista.length:0;
  const box=pegar("dailySalesSummary");
  if(box)box.innerHTML=`<div><strong>💰 Vendas de hoje</strong><b>${moeda(total)}</b></div><div><strong>🧾 Pedidos</strong><b>${hojeLista.length}</b></div><div><strong>🎟️ Ticket médio</strong><b>${moeda(media)}</b></div>`;
}

function selecionarPedido(id){pedidoSelecionado=pedidos.find(p=>String(p.id)===String(id))||null;abrirPagina("impressao");mostrarImpressao();}
function mostrarImpressao(){
  const area=pegar("printPreview");if(!area)return;
  if(!pedidoSelecionado){area.innerHTML=`<div class="receipt-empty">Selecione um pedido para visualizar.</div>`;return;}
  const p=pedidoSelecionado, itens=extrairItens(p.observacoes),obs=observacaoVisivel(p.observacoes);
  area.innerHTML=`<div class="receipt-content"><div class="receipt-title">MIGUEL LANCHES</div><hr>
  <div><b>PEDIDO:</b> #${numeroPedido(p,0)}</div><div><b>DATA/HORA:</b> ${formatarData(dataPedido(p))}</div><hr>
  <div><b>CLIENTE:</b> ${escapar(nomeCliente(p))}</div><div><b>TELEFONE:</b> ${escapar(p.telefone||"")}</div>
  <div><b>ENDEREÇO:</b> ${escapar(p.endereco||"")}</div><div><b>REF:</b> ${escapar(p.referencia||"")}</div><hr>
  ${itens.map(x=>`<div class="receipt-line"><span>${x.quantidade}x ${escapar(x.nome)}${x.adicionais?.length?"<br> ↳ "+x.adicionais.map(a=>escapar(a.nome)).join(", "):""}</span><b>${moeda((Number(x.preco)+Number(x.adicionalTotal||0))*x.quantidade)}</b></div>`).join("")}
  ${obs?`<hr><b>OBSERVAÇÕES:</b><br>${escapar(obs)}`:""}<hr><div class="receipt-total"><b>TOTAL:</b><b>${moeda(totalPedido(p))}</b></div><hr>
  <div style="text-align:center">Obrigado pela preferência!</div></div>`;
}

function imprimirComanda(){
  const area=pegar("printPreview");if(!area||!pedidoSelecionado){alert("Selecione um pedido primeiro.");return;}
  const w=window.open("","_blank","width=420,height=700");if(!w){alert("O navegador bloqueou a impressão.");return;}
  w.document.write(`<!doctype html><html><head><title>Comanda</title><style>body{font-family:Arial;width:80mm;margin:auto;font-size:12px}.receipt-line,.receipt-total{display:flex;justify-content:space-between;gap:8px;margin:5px 0}hr{border:0;border-top:1px dashed #000}</style></head><body>${area.innerHTML}</body></html>`);
  w.document.close();w.focus();setTimeout(()=>w.print(),250);
}

function normalizarTelefone(t){let n=String(t||"").replace(/\D/g,"");if(n.startsWith("55"))n=n.slice(2);if(n.startsWith("0"))n=n.slice(1);return n.length===10||n.length===11?"55"+n:"";}
function statusMensagem(status,p){const nome=nomeCliente(p);return {preparo:`Olá, ${nome}! 😊 Seu pedido já está sendo preparado. 🍔`,entrega:`Olá, ${nome}! 🛵 Seu pedido saiu para entrega e está a caminho.`,entregue:`Olá, ${nome}! ❤️ Seu pedido foi entregue. Muito obrigado pela compra e pela preferência!`}[status]||"";}
function abrirWhatsAppMensagem(p,status){
  const n=normalizarTelefone(p?.telefone);if(!n)return false;
  const url="https://web.whatsapp.com/send?phone="+n+"&text="+encodeURIComponent(statusMensagem(status,p));
  const app="whatsapp://send?phone="+n+"&text="+encodeURIComponent(statusMensagem(status,p));
  if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){window.location.href=app;setTimeout(()=>{if(document.visibilityState==="visible")window.location.href=url;},1200);}
  else window.open(url,"MiguelLanchesWhatsApp");
  return true;
}

async function finalizarPedido(){
  if(!carrinho.length){alert("Adicione pelo menos um produto.");return;}
  const cliente=pegar("cliente")?.value.trim()||"";if(!cliente){alert("Informe o nome do cliente.");return;}
  const telefone=pegar("telefone")?.value.trim()||"";
  const obs=pegar("observacoes")?.value.trim()||"";
  const dados={Cliente:cliente,telefone,endereco:pegar("endereco")?.value.trim()||"",referencia:pegar("referencia")?.value.trim()||"",
    observacoes:codificarStatus(codificarItens(carrinho,obs),"preparo"),total:calcularTotal()};
  const b=pegar("finishBtn");if(b){b.disabled=true;b.textContent="Salvando...";}
  try{
    const {data,error}=await supabaseClient.from("pedidos").insert(dados).select("*").single();
    if(error)throw error;
    carrinho=[];mostrarCarrinho();
    ["cliente","telefone","endereco","referencia","observacoes"].forEach(id=>{if(pegar(id))pegar(id).value="";});
    await carregarPedidos();
    if(normalizarTelefone(telefone)&&data)abrirWhatsAppMensagem(data,"preparo");
  }catch(e){console.error(e);alert("Erro ao salvar o pedido: "+(e.message||""));}finally{if(b){b.disabled=false;b.textContent="✓ Finalizar Pedido";}}
}

/* ========================= ADMIN ========================= */
async function adminListarCategorias(){
  const {data,error}=await supabaseClient.from("categorias").select("*").order("ordem",{ascending:true});
  if(!error)categorias=data||categorias;
  renderAdminCategorias();
}
async function adminSalvarCategoria(){
  const nome=pegar("catNome")?.value.trim();const emoji=pegar("catEmoji")?.value.trim()||"📦";if(!nome){alert("Informe o nome da categoria.");return;}
  const payload={nome,emoji,ordem:Number(pegar("catOrdem")?.value||99),ativo:true};
  const q=categoriaEmEdicao?supabaseClient.from("categorias").update(payload).eq("id",categoriaEmEdicao):supabaseClient.from("categorias").insert(payload);
  const {error}=await q;if(error){alert("Erro: "+error.message);return;}
  categoriaEmEdicao=null;limparFormCategoria();await carregarCatalogo();
}
async function adminExcluirCategoria(id){
  if(!confirm("Excluir esta categoria? Os produtos dela também deixarão de aparecer."))return;
  const {error}=await supabaseClient.from("categorias").update({ativo:false}).eq("id",id);
  if(error)alert("Erro: "+error.message);else await carregarCatalogo();
}
function editarCategoria(id){
  const c=categorias.find(x=>String(x.id)===String(id));if(!c)return;
  categoriaEmEdicao=c.id;pegar("catNome").value=c.nome||"";pegar("catEmoji").value=c.emoji||"📦";pegar("catOrdem").value=c.ordem||99;pegar("catSaveBtn").textContent="Salvar alterações";
}
function limparFormCategoria(){["catNome","catEmoji","catOrdem"].forEach(id=>{if(pegar(id))pegar(id).value=id==="catEmoji"?"📦":"";});if(pegar("catSaveBtn"))pegar("catSaveBtn").textContent="Adicionar categoria";}

async function adminSalvarProduto(){
  const nome=pegar("prodNome")?.value.trim(),preco=Number(pegar("prodPreco")?.value||0),cat=pegar("prodCategoria")?.value,emoji=pegar("prodEmoji")?.value.trim()||"🍔";
  if(!nome||!cat||preco<0){alert("Preencha nome, categoria e preço.");return;}
  const payload={nome,preco,categoria_id:cat,emoji,ativo:true,ordem:Number(pegar("prodOrdem")?.value||99)};
  const q=produtoEmEdicao?supabaseClient.from("produtos").update(payload).eq("id",produtoEmEdicao):supabaseClient.from("produtos").insert(payload).select("*").single();
  const {data,error}=await q;if(error){alert("Erro: "+error.message);return;}
  const id=produtoEmEdicao||data?.id;
  if(id){
    await supabaseClient.from("produto_ingredientes").delete().eq("produto_id",id);
    const selecionados=[...document.querySelectorAll("#prodIngredientes input:checked")].map(x=>x.value);
    if(selecionados.length)await supabaseClient.from("produto_ingredientes").insert(selecionados.map(ingrediente_id=>({produto_id:id,ingrediente_id})));
  }
  produtoEmEdicao=null;limparFormProduto();await carregarCatalogo();
}
async function adminExcluirProduto(id){
  if(!confirm("Excluir este produto do cardápio?"))return;
  const {error}=await supabaseClient.from("produtos").update({ativo:false}).eq("id",id);
  if(error)alert("Erro: "+error.message);else await carregarCatalogo();
}
async function editarProduto(id){
  const p=produtos.find(x=>String(x.id)===String(id));if(!p)return;
  produtoEmEdicao=p.id;pegar("prodNome").value=p.nome||"";pegar("prodPreco").value=p.preco||0;pegar("prodCategoria").value=p.categoria_id||p.categoria||"";pegar("prodEmoji").value=p.emoji||"🍔";pegar("prodOrdem").value=p.ordem||99;
  if(!String(id).startsWith("local-")){
    const {data}=await supabaseClient.from("produto_ingredientes").select("ingrediente_id").eq("produto_id",id);
    const set=new Set((data||[]).map(x=>String(x.ingrediente_id)));document.querySelectorAll("#prodIngredientes input").forEach(x=>x.checked=set.has(String(x.value)));
  }
  pegar("prodSaveBtn").textContent="Salvar alterações";
}
function limparFormProduto(){["prodNome","prodPreco","prodOrdem"].forEach(id=>{if(pegar(id))pegar(id).value="";});if(pegar("prodEmoji"))pegar("prodEmoji").value="🍔";if(pegar("prodSaveBtn"))pegar("prodSaveBtn").textContent="Adicionar produto";document.querySelectorAll("#prodIngredientes input").forEach(x=>x.checked=false);}

async function adminSalvarIngrediente(){
  const nome=pegar("ingNome")?.value.trim(),preco=Number(pegar("ingPreco")?.value||0);if(!nome){alert("Informe o ingrediente.");return;}
  const payload={nome,preco,ativo:true};
  const {error}=ingredienteEmEdicao?await supabaseClient.from("ingredientes").update(payload).eq("id",ingredienteEmEdicao):await supabaseClient.from("ingredientes").insert(payload);
  if(error){alert("Erro: "+error.message);return;}ingredienteEmEdicao=null;limparFormIngrediente();await carregarCatalogo();
}
async function adminExcluirIngrediente(id){
  if(!confirm("Excluir este ingrediente?"))return;
  const {error}=await supabaseClient.from("ingredientes").update({ativo:false}).eq("id",id);
  if(error)alert("Erro: "+error.message);else await carregarCatalogo();
}
function editarIngrediente(id){
  const i=ingredientes.find(x=>String(x.id)===String(id));if(!i)return;ingredienteEmEdicao=i.id;pegar("ingNome").value=i.nome||"";pegar("ingPreco").value=i.preco||0;pegar("ingSaveBtn").textContent="Salvar alterações";
}
function limparFormIngrediente(){if(pegar("ingNome"))pegar("ingNome").value="";if(pegar("ingPreco"))pegar("ingPreco").value="";if(pegar("ingSaveBtn"))pegar("ingSaveBtn").textContent="Adicionar ingrediente";}

async function adminSalvarCliente(){
  const nome=pegar("cliNome")?.value.trim(),telefone=pegar("cliTelefone")?.value.trim(),endereco=pegar("cliEndereco")?.value.trim(),referencia=pegar("cliReferencia")?.value.trim();
  if(!nome){alert("Informe o nome do cliente.");return;}
  const {error}=await supabaseClient.from("clientes").upsert({nome,telefone,endereco,referencia},{onConflict:"telefone"});
  if(error){alert("Erro: "+error.message);return;}limparFormCliente();await carregarClientes();
}
async function carregarClientes(){
  const {data,error}=await supabaseClient.from("clientes").select("*").order("nome");
  clientes=!error&&data?data:[];renderAdminClientes();
}
function limparFormCliente(){["cliNome","cliTelefone","cliEndereco","cliReferencia"].forEach(id=>{if(pegar(id))pegar(id).value="";});}

async function salvarConfiguracoes(){
  const taxa=Number(pegar("cfgTaxa")?.value||0),whatsapp=pegar("cfgWhatsApp")?.value.trim()||"";
  const rows=[{chave:"taxa_entrega",valor:String(taxa)},{chave:"whatsapp",valor:whatsapp}];
  const {error}=await supabaseClient.from("configuracoes").upsert(rows,{onConflict:"chave"});
  if(error)alert("Erro: "+error.message);else alert("Configurações salvas.");
}

function renderAdminCategorias(){
  const t=pegar("adminCategoriasTable");if(!t)return;
  t.innerHTML=categorias.map(c=>`<tr><td>${escapar(c.emoji||"📦")}</td><td>${escapar(c.nome)}</td><td>${c.ordem??""}</td><td><button class="table-action" onclick="editarCategoria('${c.id}')">Editar</button><button class="table-action danger" onclick="adminExcluirCategoria('${c.id}')">Excluir</button></td></tr>`).join("");
  const sel=pegar("prodCategoria");if(sel)sel.innerHTML=categorias.map(c=>`<option value="${c.id}">${c.emoji||"📦"} ${escapar(c.nome)}</option>`).join("");
}
function renderAdminProdutos(){
  const t=pegar("adminProdutosTable");if(!t)return;
  t.innerHTML=produtos.map(p=>`<tr><td>${escapar(p.emoji||"🍔")}</td><td>${escapar(p.nome)}</td><td>${moeda(p.preco)}</td><td>${escapar(categorias.find(c=>String(c.id)===String(p.categoria_id||p.categoria))?.nome||p.categoria_id||p.categoria||"")}</td><td><button class="table-action" onclick="editarProduto('${p.id}')">Editar</button><button class="table-action danger" onclick="adminExcluirProduto('${p.id}')">Excluir</button></td></tr>`).join("");
}
function renderAdminIngredientes(){
  const t=pegar("adminIngredientesTable");if(!t)return;
  t.innerHTML=ingredientes.map(i=>`<tr><td>${escapar(i.nome)}</td><td>${moeda(i.preco)}</td><td><button class="table-action" onclick="editarIngrediente('${i.id}')">Editar</button><button class="table-action danger" onclick="adminExcluirIngrediente('${i.id}')">Excluir</button></td></tr>`).join("");
  const box=pegar("prodIngredientes");if(box)box.innerHTML=ingredientes.map(i=>`<label class="check-option"><input type="checkbox" value="${i.id}"><span>${escapar(i.nome)}</span><b>+${moeda(i.preco)}</b></label>`).join("")||"<small>Nenhum ingrediente cadastrado.</small>";
}
function renderAdminClientes(){
  const t=pegar("adminClientesTable");if(!t)return;
  t.innerHTML=clientes.map(c=>`<tr><td>${escapar(c.nome)}</td><td>${escapar(c.telefone||"")}</td><td>${escapar(c.endereco||"")}</td><td><button class="table-action" onclick="usarCliente('${c.id}')">Usar</button></td></tr>`).join("");
}
function renderAdminTudo(){renderAdminCategorias();renderAdminProdutos();renderAdminIngredientes();renderAdminClientes();}

function usarCliente(id){
  const c=clientes.find(x=>String(x.id)===String(id));if(!c)return;
  ["cliente","telefone","endereco","referencia"].forEach((k,i)=>{if(pegar(k))pegar(k).value=[c.nome,c.telefone,c.endereco,c.referencia][i]||"";});
  abrirPagina("dashboard");
}

function abrirPagina(nome){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active-page"));
  pegar("page-"+nome)?.classList.add("active-page");
  document.querySelectorAll(".menu-item").forEach(b=>b.classList.toggle("active",b.dataset.page===nome));
  const tit={dashboard:"Fazer Pedido",comandas:"Comandas Abertas",historico:"Histórico de Pedidos",impressao:"Impressão",admin:"Administração"};
  if(pegar("pageTitle"))pegar("pageTitle").textContent=tit[nome]||"Miguel Lanches";
  if(["comandas","historico","impressao"].includes(nome))carregarPedidos();
  if(nome==="impressao")mostrarImpressao();
  if(nome==="admin"){carregarCatalogo();carregarClientes();}
  pegar("sidebar")?.classList.remove("open");
}

async function iniciarApp(){
  mostrarCarrinho();
  const busca=pegar("productSearch");if(busca)busca.oninput=mostrarProdutos;
  pegar("clearCart")?.addEventListener("click",limparCarrinho);
  pegar("finishBtn")?.addEventListener("click",finalizarPedido);
  pegar("printBtn")?.addEventListener("click",imprimirComanda);
  pegar("doPrintBtn")?.addEventListener("click",imprimirComanda);
  document.querySelectorAll(".menu-item").forEach(b=>b.onclick=()=>abrirPagina(b.dataset.page));
  pegar("menuToggle")?.addEventListener("click",()=>pegar("sidebar")?.classList.toggle("open"));
  pegar("extrasConfirm")?.addEventListener("click",confirmarExtras);
  pegar("extrasClose")?.addEventListener("click",fecharExtras);
  pegar("catSaveBtn")?.addEventListener("click",adminSalvarCategoria);
  pegar("prodSaveBtn")?.addEventListener("click",adminSalvarProduto);
  pegar("ingSaveBtn")?.addEventListener("click",adminSalvarIngrediente);
  pegar("cliSaveBtn")?.addEventListener("click",adminSalvarCliente);
  pegar("cfgSaveBtn")?.addEventListener("click",salvarConfiguracoes);
  pegar("catCancelBtn")?.addEventListener("click",limparFormCategoria);
  pegar("prodCancelBtn")?.addEventListener("click",limparFormProduto);
  pegar("ingCancelBtn")?.addEventListener("click",limparFormIngrediente);

  const ok=await conectarBanco();
  if(!ok){categorias=categoriasPadrao;produtos=produtosPadrao;renderCategorias();mostrarProdutos();return;}
  await carregarCatalogo();await carregarClientes();await carregarPedidos();
  iniciarRealtimePedidos();iniciarFallbackSincronizacao();
}

window.adicionarProduto=adicionarProduto;window.aumentarQuantidade=aumentarQuantidade;window.diminuirQuantidade=diminuirQuantidade;
window.removerProduto=removerProduto;window.limparCarrinho=limparCarrinho;window.selecionarCategoria=selecionarCategoria;
window.alterarStatusPedido=alterarStatusPedido;window.selecionarPedido=selecionarPedido;window.abrirPagina=abrirPagina;
window.editarCategoria=editarCategoria;window.adminExcluirCategoria=adminExcluirCategoria;window.editarProduto=editarProduto;
window.adminExcluirProduto=adminExcluirProduto;window.editarIngrediente=editarIngrediente;window.adminExcluirIngrediente=adminExcluirIngrediente;
window.usarCliente=usarCliente;window.abrirWhatsAppMensagem=abrirWhatsAppMensagem;

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciarApp,{once:true});else iniciarApp();
