const SUPABASE_URL = "https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY = "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";

let supabaseClient = null;
let carrinho = [];
let pedidos = [];
let categoriaAtual = "todos";
let pedidoSelecionado = null;

const produtos = [
  {id:1,nome:"X-Burger",categoria:"lanches",preco:18,emoji:"🍔"},
  {id:2,nome:"X-Egg Bacon",categoria:"lanches",preco:20,emoji:"🍔"},
  {id:3,nome:"X-Salada",categoria:"lanches",preco:19,emoji:"🍔"},
  {id:4,nome:"X-Frango",categoria:"lanches",preco:17,emoji:"🍔"},
  {id:5,nome:"Cachorro Quente",categoria:"lanches",preco:13,emoji:"🌭"},
  {id:6,nome:"X-Calabresa",categoria:"lanches",preco:19,emoji:"🍔"},
  {id:7,nome:"X-Tudo",categoria:"lanches",preco:24,emoji:"🍔"},
  {id:8,nome:"Duplo Burger",categoria:"lanches",preco:22,emoji:"🍔"},
  {id:9,nome:"Batata Frita",categoria:"porcoes",preco:15,emoji:"🍟"},
  {id:10,nome:"Calabresa",categoria:"porcoes",preco:20,emoji:"🍟"},
  {id:11,nome:"Frango",categoria:"porcoes",preco:22,emoji:"🍗"},
  {id:12,nome:"Coca-Cola Lata",categoria:"bebidas",preco:5,emoji:"🥤"},
  {id:13,nome:"Guaraná",categoria:"bebidas",preco:5,emoji:"🥤"},
  {id:14,nome:"Suco",categoria:"bebidas",preco:7,emoji:"🧃"},
  {id:15,nome:"Açaí",categoria:"sobremesas",preco:12,emoji:"🍧"},
  {id:16,nome:"Pudim",categoria:"sobremesas",preco:8,emoji:"🍮"}
];

function pegar(id){return document.getElementById(id);}
function moeda(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function escapar(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}

function mostrarProdutos(){
  const area=pegar("productsGrid"); if(!area)return;
  const campo=pegar("productSearch");
  const busca=campo?campo.value.toLowerCase().trim():"";
  const lista=produtos.filter(p=>
    (categoriaAtual==="todos"||p.categoria===categoriaAtual) &&
    (!busca||p.nome.toLowerCase().includes(busca))
  );
  area.innerHTML=lista.length?lista.map(p=>`
    <article class="product-card">
      <div class="product-image">${p.emoji}</div>
      <div class="product-info">
        <div class="product-name">${escapar(p.nome)}</div>
        <div class="product-bottom">
          <span class="product-price">${moeda(p.preco)}</span>
          <button class="add-product" type="button" onclick="adicionarProduto(${p.id})">+</button>
        </div>
      </div>
    </article>`).join(""):`<div class="empty-state">Nenhum produto encontrado.</div>`;
}

function selecionarCategoria(categoria){
  categoriaAtual=categoria;
  document.querySelectorAll(".category").forEach(b=>b.classList.toggle("active",b.dataset.category===categoria));
  mostrarProdutos();
}

function adicionarProduto(id){
  const p=produtos.find(x=>x.id===Number(id)); if(!p)return;
  const item=carrinho.find(x=>x.id===p.id);
  if(item)item.quantidade++; else carrinho.push({id:p.id,nome:p.nome,preco:p.preco,quantidade:1});
  mostrarCarrinho();
}
function aumentarQuantidade(id){const i=carrinho.find(x=>x.id===Number(id));if(i){i.quantidade++;mostrarCarrinho();}}
function diminuirQuantidade(id){
  const i=carrinho.find(x=>x.id===Number(id));if(!i)return;
  i.quantidade--; if(i.quantidade<=0)carrinho=carrinho.filter(x=>x.id!==Number(id));
  mostrarCarrinho();
}
function removerProduto(id){carrinho=carrinho.filter(x=>x.id!==Number(id));mostrarCarrinho();}
function limparCarrinho(){carrinho=[];mostrarCarrinho();}
function calcularTotal(){return carrinho.reduce((s,x)=>s+x.preco*x.quantidade,0);}

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
  const area=pegar("cartItems");if(!area)return;
  if(!carrinho.length){
    area.innerHTML=`<div class="cart-empty"><strong>Sua comanda está vazia</strong><span>Toque no + de um produto para adicionar.</span></div>`;
    atualizarTotal();return;
  }
  area.innerHTML=carrinho.map(i=>`
    <div class="cart-item">
      <div>
        <div class="cart-item-name">${escapar(i.nome)}</div>
        <div class="cart-item-controls">
          <button class="quantity-btn" type="button" onclick="diminuirQuantidade(${i.id})">−</button>
          <span class="quantity-value">${i.quantidade}</span>
          <button class="quantity-btn" type="button" onclick="aumentarQuantidade(${i.id})">+</button>
          <button class="remove-item" type="button" onclick="removerProduto(${i.id})">🗑</button>
        </div>
      </div>
      <div class="cart-item-price">${moeda(i.preco*i.quantidade)}</div>
    </div>`).join("");
  atualizarTotal();
}

function conectarBanco(){
  return new Promise(resolve=>{
    if(window.supabase){
      supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      resolve(true);return;
    }
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload=()=>{supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);resolve(true);};
    s.onerror=()=>{console.error("Supabase não carregou.");resolve(false);};
    document.head.appendChild(s);
  });
}

/*
  Os itens do pedido são gravados dentro da coluna observacoes.
  Isso permite guardar os produtos sem exigir uma nova tabela no Supabase.
*/
function codificarItens(itens,obs){
  return String(obs||"")+"\n\n[ML_ITENS]"+encodeURIComponent(JSON.stringify(itens))+"[/ML_ITENS]";
}
function extrairItens(obs){
  const m=String(obs||"").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);
  if(!m)return[];
  try{return JSON.parse(decodeURIComponent(m[1]));}catch(e){return[];}
}
function observacaoVisivel(obs){
  return String(obs||"").replace(/\n?\n?\[ML_ITENS\][\s\S]*?\[\/ML_ITENS\]/,"").trim();
}
function nomeCliente(p){return p?.Cliente??p?.cliente??p?.nome??"Sem nome";}
function totalPedido(p){return Number(p?.total??p?.Total??0);}
function dataPedido(p){return p?.created_at||p?.data_hora||p?.dataHora||p?.createdAt||"";}
function numeroPedido(p,i){
  const v=p?.id??p?.numero??p?.Numero;
  return v!==undefined&&v!==null&&v!==""?String(v).slice(-6).padStart(3,"0"):String(i+1).padStart(3,"0");
}
function formatarData(v){
  if(!v)return"—";
  const d=new Date(v); if(Number.isNaN(d.getTime()))return String(v);
  return d.toLocaleString("pt-BR");
}
function ordenarPedidos(a){
  return [...a].sort((x,y)=>{
    const dx=dataPedido(x)?new Date(dataPedido(x)).getTime():Number(x?.id||0);
    const dy=dataPedido(y)?new Date(dataPedido(y)).getTime():Number(y?.id||0);
    return dy-dx;
  });
}

function salvarStatusLocal(id,status){
  try{
    const mapa=JSON.parse(localStorage.getItem("miguel_lanches_status")||"{}");
    mapa[String(id)]=status;
    localStorage.setItem("miguel_lanches_status",JSON.stringify(mapa));
  }catch(e){}
}
function statusLocal(id){
  try{
    const mapa=JSON.parse(localStorage.getItem("miguel_lanches_status")||"{}");
    return mapa[String(id)]||"";
  }catch(e){return "";}
}

let canalPedidosRealtime=null;
let fallbackSincronizacao=null;
function iniciarFallbackSincronizacao(){
  if(fallbackSincronizacao)clearInterval(fallbackSincronizacao);
  fallbackSincronizacao=setInterval(async()=>{
    if(!document.hidden && supabaseClient){
      await carregarPedidos();
    }
  },1000);
}

function iniciarRealtimePedidos(){
  if(!supabaseClient)return;
  if(canalPedidosRealtime){
    try{supabaseClient.removeChannel(canalPedidosRealtime);}catch(e){}
  }

  canalPedidosRealtime=supabaseClient
    .channel("miguel-lanches-pedidos")
    .on(
      "postgres_changes",
      {event:"*",schema:"public",table:"pedidos"},
      async ()=>{
        await carregarPedidos();
      }
    )
    .subscribe((status)=>{
      console.log("Realtime pedidos:",status);
    });
}

async function carregarPedidos(){
  if(!supabaseClient)return;
  const {data,error}=await supabaseClient.from("pedidos").select("*");
  if(error){
    console.error("Erro ao carregar pedidos:",error);
    pedidos=[];mostrarComandas();mostrarHistorico();return;
  }
  pedidos=ordenarPedidos(data||[]).map(p=>{
    const bancoStatus=p.status_pedido||extrairStatus(p.observacoes);
    p.status_pedido=bancoStatus;
    p.__entregue=(bancoStatus==="entregue");
    return p;
  });
  mostrarComandas();mostrarHistorico();
  if(pedidoSelecionado){
    const p=pedidos.find(x=>String(x.id)===String(pedidoSelecionado.id));
    if(p){pedidoSelecionado=p;mostrarImpressao();}
  }
}


function statusLabel(status){
  return ({preparo:"🍔 Em preparo",entrega:"🛵 Saiu para entrega",entregue:"✅ Entregue"})[status]||"🍔 Em preparo";
}
function codificarStatus(obs,status){
  const limpo=String(obs||"").replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/,"").trim();
  return limpo+`\n\n[ML_STATUS]${status}[/ML_STATUS]`;
}
function extrairStatus(obs){
  const m=String(obs||"").match(/\[ML_STATUS\](preparo|entrega|entregue)\[\/ML_STATUS\]/);
  return m?m[1]:"preparo";
}
function normalizarTelefone(t){
  let n=String(t||"").replace(/\D/g,"");
  if(n.startsWith("55"))n=n.slice(2);
  if(n.startsWith("0"))n=n.slice(1);
  return (n.length===10||n.length===11)?"55"+n:"";
}
function telefoneValido(t){
  const n=String(t||"").replace(/\D/g,"");
  if(!n)return true;
  let br=n.startsWith("55")?n.slice(2):n;
  if(br.startsWith("0"))br=br.slice(1);
  return br.length===10||br.length===11;
}
function statusMensagem(status,p){
  const nome=nomeCliente(p);
  return ({
    preparo:`Olá, ${nome}! 😊 Seu pedido já está sendo preparado. 🍔`,
    entrega:`Olá, ${nome}! 🛵 Seu pedido saiu para entrega e está a caminho.`,
    entregue:`Olá, ${nome}! ❤️ Seu pedido foi entregue. Muito obrigado pela compra e pela preferência!`
  })[status];
}
let janelaWhatsApp=null;
function abrirWhatsAppMensagem(p,status){
  const numero=normalizarTelefone(p?.telefone);
  if(!numero)return false;

  const texto=encodeURIComponent(statusMensagem(status,p));
  const web="https://web.whatsapp.com/send?phone="+numero+"&text="+texto;
  const app="whatsapp://send?phone="+numero+"&text="+texto;
  const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if(mobile){
    window.location.href=app;
    setTimeout(()=>{
      if(document.visibilityState==="visible") window.location.href=web;
    },1200);
  }else{
    // Nome fixo do alvo: o navegador reutiliza a mesma aba/janela
    // em todos os pedidos, em vez de criar uma nova a cada clique.
    window.open(web,"MiguelLanchesWhatsApp");
  }
  return true;
}
async function alterarStatusPedido(i,status){
  const p=pedidos[i];
  if(!p)return;
  p.observacoes=codificarStatus(p.observacoes,status);
  p.status_pedido=status;
  p.__entregue=(status==="entregue");
  salvarStatusLocal(p.id,status);

  if(supabaseClient&&p.id){
    const {error}=await supabaseClient.from("pedidos").update({status_pedido:status,observacoes:p.observacoes}).eq("id",p.id);
    if(error)console.error("Erro ao atualizar status no banco:",error);
  }

  // Atualiza a tela somente depois de registrar o status.
  mostrarComandas();
  mostrarHistorico();

  if((status==="entrega"||status==="entregue")&&normalizarTelefone(p.telefone)){
    abrirWhatsAppMensagem(p,status);
  }
}
function acaoStatusComanda(i,p,status){
  if(!normalizarTelefone(p?.telefone)){
    return `<button type="button" class="status-action delivered-only" onclick="event.stopPropagation();alterarStatusPedido(${i},'entregue')">✅ Entregue</button>`;
  }
  if(status==="preparo"){
    return `<button type="button" class="status-action" onclick="event.stopPropagation();alterarStatusPedido(${i},'entrega')">🛵 Saiu para entrega</button>`;
  }
  if(status==="entrega"){
    return `<button type="button" class="status-action delivered" onclick="event.stopPropagation();alterarStatusPedido(${i},'entregue')">✅ Entregue</button>`;
  }
  return "";
}
function mostrarComandas(){
  const area=pegar("openOrders");if(!area)return;
  const abertos=pedidos.filter(p=>!p.__entregue&&p.status_pedido!=="entregue"&&extrairStatus(p.observacoes)!=="entregue");
  if(!abertos.length){
    area.innerHTML=`<div class="empty-state">Nenhuma comanda aberta.</div>`;
    return;
  }
  area.innerHTML=abertos.map(p=>{
    const i=pedidos.indexOf(p);
    const itens=extrairItens(p.observacoes);
    const resumo=itens.length?itens.map(x=>`${x.quantidade}x ${escapar(x.nome)}`).join(", "):"Pedido registrado";
    const st=extrairStatus(p.observacoes);
    return `<div class="order-card" style="padding:14px;border-bottom:1px solid #eee">
      <div onclick="selecionarPedido(${i})" style="cursor:pointer">
        <strong>#${numeroPedido(p,i)} - ${escapar(nomeCliente(p))}</strong>
        <div>${resumo}</div>
        <strong>${moeda(totalPedido(p))}</strong>
        <div class="order-status">${statusLabel(st)}</div>
      </div>
      <div class="status-action-row">${acaoStatusComanda(i,p,st)}</div>
    </div>`;
  }).join("");
}

function atualizarResumoHistorico(){
  const hoje=new Date().toLocaleDateString("pt-BR");
  const lista=pedidos.filter(p=>{
    const d=dataPedido(p)?new Date(dataPedido(p)):new Date();
    return d.toLocaleDateString("pt-BR")===hoje;
  });
  const total=lista.reduce((s,p)=>s+totalPedido(p),0);
  const media=lista.length?total/lista.length:0;
  const painel=pegar("historyTable")?.closest(".panel");
  if(!painel)return;
  let box=pegar("dailySalesSummary");
  if(!box){
    box=document.createElement("div");
    box.id="dailySalesSummary";
    box.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 16px";
    painel.insertBefore(box,painel.querySelector(".table-container"));
  }
  box.innerHTML=`<div class="summary-card"><strong>💰 Vendas de hoje</strong><div style="font-size:24px;font-weight:800">${moeda(total)}</div></div>
  <div class="summary-card"><strong>🧾 Pedidos</strong><div style="font-size:24px;font-weight:800">${lista.length}</div></div>
  <div class="summary-card"><strong>🎟️ Ticket médio</strong><div style="font-size:24px;font-weight:800">${moeda(media)}</div></div>`;
}

function mostrarHistorico(){
  const t=pegar("historyTable");if(!t)return;
  const grupos={};
  pedidos.forEach(p=>{
    const d=dataPedido(p)?new Date(dataPedido(p)):new Date();
    const k=d.toLocaleDateString("pt-BR");
    (grupos[k]??=[]).push(p);
  });
  const dias=Object.entries(grupos).sort((a,b)=>{
    const da=a[1][0],db=b[1][0];
    return new Date(dataPedido(db)||0)-new Date(dataPedido(da)||0);
  });
  t.innerHTML=dias.map(([dia,lista])=>{
    const total=lista.reduce((s,p)=>s+totalPedido(p),0);
    const media=lista.length?total/lista.length:0;
    return `<tr><td colspan="6"><strong>📅 ${dia}</strong> — 🧾 ${lista.length} pedidos — 💰 ${moeda(total)} — 🎟️ Média ${moeda(media)}</td></tr>`+
      lista.map(p=>`<tr><td>#${numeroPedido(p,0)}</td><td>${escapar(nomeCliente(p))}</td><td>${formatarData(dataPedido(p))}</td><td>${statusLabel(p.status_pedido||extrairStatus(p.observacoes))}</td><td>${moeda(totalPedido(p))}</td><td>—</td></tr>`).join("");
  }).join("");
  atualizarResumoHistorico();
}

function selecionarPedido(i){
  pedidoSelecionado=ordenarPedidos(pedidos)[i]||null;
  abrirPagina("impressao");
  mostrarImpressao();
}

function mostrarImpressao(){
  const area=pegar("printPreview");if(!area)return;
  if(!pedidoSelecionado){
    area.innerHTML=`<div class="receipt-empty">Selecione um pedido para visualizar.</div>`;return;
  }
  const p=pedidoSelecionado;
  const itens=extrairItens(p.observacoes);
  const obs=observacaoVisivel(p.observacoes);
  const idx=pedidos.findIndex(x=>String(x.id)===String(p.id));
  const linhas=itens.length?itens.map(x=>`
    <div style="display:flex;justify-content:space-between;gap:10px;margin:5px 0">
      <span>${x.quantidade}x ${escapar(x.nome)}</span><strong>${moeda(x.preco*x.quantidade)}</strong>
    </div>`).join(""):`<div>Nenhum item detalhado salvo.</div>`;
  area.innerHTML=`<div class="receipt-content">
    <div style="text-align:center;font-weight:bold;font-size:18px">MIGUEL LANCHES</div><hr>
    <div><strong>PEDIDO:</strong> #${numeroPedido(p,idx<0?0:idx)}</div>
    <div><strong>DATA/HORA:</strong> ${formatarData(dataPedido(p))}</div><hr>
    <div><strong>CLIENTE:</strong> ${escapar(nomeCliente(p))}</div>
    <div><strong>TELEFONE:</strong> ${escapar(p.telefone||"")}</div>
    <div><strong>ENDEREÇO:</strong> ${escapar(p.endereco||"")}</div>
    <div><strong>REF:</strong> ${escapar(p.referencia||"")}</div><hr>
    <div><strong>QTD  ITEM                         VALOR</strong></div>
    ${linhas}
    ${obs?`<hr><div><strong>OBSERVAÇÕES:</strong><br>${escapar(obs)}</div>`:""}
    <hr><div style="display:flex;justify-content:space-between;font-size:17px"><strong>TOTAL:</strong><strong>${moeda(totalPedido(p))}</strong></div>
    <hr><div style="text-align:center">Obrigado pela preferência!</div>
  </div>`;
}

async function finalizarPedido(){
  if(!carrinho.length){alert("Adicione pelo menos um produto.");return;}
  const cliente=pegar("cliente")?pegar("cliente").value.trim():"";
  if(!cliente){alert("Informe o nome do cliente.");return;}

  const telefone=pegar("telefone")?pegar("telefone").value.trim():"";
  if(telefone&&!telefoneValido(telefone)){
    alert("O número de WhatsApp informado parece inválido.\n\nCorrija o número e tente finalizar novamente.");
    if(pegar("telefone")){pegar("telefone").focus();pegar("telefone").select();}
    return;
  }

  if(!supabaseClient){alert("Banco de dados ainda não conectado. Recarregue a página e tente novamente.");return;}

  const obs=pegar("observacoes")?pegar("observacoes").value.trim():"";
  const dados={
    Cliente:cliente,
    telefone:telefone,
    endereco:pegar("endereco")?pegar("endereco").value.trim():"",
    referencia:pegar("referencia")?pegar("referencia").value.trim():"",
    observacoes:codificarStatus(codificarItens(carrinho,obs),"preparo"),
    total:calcularTotal()
  };

  const botao=pegar("finishBtn");
  if(botao){botao.disabled=true;botao.textContent="Salvando...";}

  try{
    // Mantemos o INSERT simples porque ele já está salvando corretamente no Supabase.
    const {error}=await supabaseClient.from("pedidos").insert(dados);
    if(error)throw error;

    const pedidoLocal={...dados,status_pedido:"preparo",__entregue:false};
    pedidos.unshift(pedidoLocal);

    carrinho=[];mostrarCarrinho();
    ["cliente","telefone","endereco","referencia","observacoes"].forEach(id=>{
      if(pegar(id))pegar(id).value="";
    });

    mostrarComandas();
    await carregarPedidos();

    // Só depois de o banco confirmar o pedido, abre o WhatsApp.
    if(normalizarTelefone(telefone)){
      abrirWhatsAppMensagem(pedidoLocal,"preparo");
    }
  }catch(e){
    console.error("Erro ao salvar pedido:",e);
    alert("Erro ao salvar o pedido: "+(e.message||"Verifique as permissões da tabela pedidos no Supabase."));
  }finally{
    if(botao){botao.disabled=false;botao.textContent="✓ Finalizar Pedido";}
  }
}

function abrirPagina(nome){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active-page"));
  const pagina=pegar("page-"+nome);if(pagina)pagina.classList.add("active-page");
  document.querySelectorAll(".menu-item").forEach(b=>b.classList.toggle("active",b.dataset.page===nome));
  const titulo=pegar("pageTitle");
  if(titulo)titulo.textContent=({dashboard:"Fazer Pedido",comandas:"Comandas Abertas",historico:"Histórico de Pedidos",impressao:"Impressão"})[nome]||"Miguel Lanches";
  if(nome==="comandas"||nome==="historico"||nome==="impressao")carregarPedidos();
  if(nome==="impressao")mostrarImpressao();
  const sidebar=pegar("sidebar");if(sidebar)sidebar.classList.remove("open");
}

function imprimirComanda(){
  if(!pedidoSelecionado){alert("Selecione um pedido primeiro.");return;}
  const area=pegar("printPreview");if(!area)return;
  const janela=window.open("","_blank","width=420,height=700");
  if(!janela){alert("O navegador bloqueou a janela de impressão.");return;}
  janela.document.write(`<!doctype html><html><head><title>Comanda Miguel Lanches</title><style>body{font-family:Arial,sans-serif;width:80mm;margin:0 auto;padding:8px;font-size:12px}hr{border:0;border-top:1px dashed #000}@media print{body{width:80mm}}</style></head><body>${area.innerHTML}</body></html>`);
  janela.document.close();janela.focus();setTimeout(()=>janela.print(),250);
}


function iniciarApp(){
  try{
    mostrarProdutos();
    mostrarCarrinho();

    document.querySelectorAll(".category").forEach(b=>{
      b.onclick=()=>selecionarCategoria(b.dataset.category);
    });

    const busca=pegar("productSearch");
    if(busca)busca.oninput=mostrarProdutos;

    const limpar=pegar("clearCart");
    if(limpar)limpar.onclick=limparCarrinho;

    const finalizar=pegar("finishBtn");
    if(finalizar)finalizar.onclick=finalizarPedido;

    const imprimir=pegar("printBtn");
    if(imprimir)imprimir.onclick=imprimirComanda;

    document.querySelectorAll(".menu-item").forEach(b=>{
      b.onclick=()=>abrirPagina(b.dataset.page);
    });

    const menu=pegar("menuToggle");
    if(menu)menu.onclick=()=>{
      const s=pegar("sidebar");
      if(s)s.classList.toggle("open");
    };

    conectarBanco().then(async ok=>{
      if(ok){
        await carregarPedidos();
        iniciarRealtimePedidos();
        iniciarFallbackSincronizacao();
      }
    });
  }catch(e){
    console.error("Falha ao iniciar Miguel Lanches:",e);
  }
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",iniciarApp,{once:true});
}else{
  iniciarApp();
}

window.adicionarProduto=adicionarProduto;
window.aumentarQuantidade=aumentarQuantidade;
window.diminuirQuantidade=diminuirQuantidade;
window.removerProduto=removerProduto;
window.limparCarrinho=limparCarrinho;
window.selecionarCategoria=selecionarCategoria;
window.abrirPagina=abrirPagina;
window.selecionarPedido=selecionarPedido;window.alterarStatusPedido=alterarStatusPedido;window.abrirWhatsAppMensagem=abrirWhatsAppMensagem;
window.imprimirComanda=imprimirComanda;
