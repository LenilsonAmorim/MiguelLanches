/* MIGUEL LANCHES — ADMIN: ENTREGA / MESA */
(() => {
  const $ = id => document.getElementById(id);
  const money = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const esc = v => String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const dbx = window.db;

  async function bairros(){
    const r = await dbx.from("bairros").select("*").eq("ativo",true).order("nome");
    if(r.error){ console.error(r.error); return []; }
    return r.data || [];
  }

  function ensureUI(){
    const cart = $("cart");
    if(!cart || $("mlTipoPedido")) return;

    const box = document.createElement("div");
    box.id = "mlTipoPedido";
    box.style.cssText = "padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:14px;background:#fff";
    box.innerHTML = `
      <div style="font-weight:800;margin-bottom:9px">Como será o pedido?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button type="button" id="mlEntregaBtn" style="padding:12px;border:2px solid #b71924;border-radius:10px;background:#fff;font-weight:800">🚚 Entrega</button>
        <button type="button" id="mlMesaBtn" style="padding:12px;border:2px solid #ddd;border-radius:10px;background:#fff;font-weight:800">🍽️ Mesa</button>
      </div>
      <div id="mlEntregaFields" style="margin-top:10px">
        <label style="display:block;font-weight:700;margin:8px 0 5px">Bairro *</label>
        <select id="mlBairro" style="width:100%;padding:11px;border:1px solid #ddd;border-radius:9px">
          <option>Carregando bairros...</option>
        </select>
        <label style="display:block;font-weight:700;margin:8px 0 5px">Endereço *</label>
        <input id="mlEndereco2" placeholder="Rua, número, complemento" style="width:100%;padding:11px;border:1px solid #ddd;border-radius:9px">
        <label style="display:block;font-weight:700;margin:8px 0 5px">Referência</label>
        <input id="mlReferencia2" placeholder="Ponto de referência" style="width:100%;padding:11px;border:1px solid #ddd;border-radius:9px">
        <div style="margin-top:8px;font-weight:800">Taxa: <span id="mlTaxa">R$ 0,00</span></div>
      </div>
      <div id="mlMesaFields" style="display:none;margin-top:10px;padding:10px;background:#fff7ed;border-radius:10px;font-weight:800">
        💳 Pagamento: Pendente
      </div>`;
    const customer = cart.querySelector(".customer-mini");
    if(customer) customer.insertAdjacentElement("afterend",box);
    else cart.prepend(box);

    $("mlEndereco2").value = $("endereco")?.value || "";
    $("mlReferencia2").value = $("referencia")?.value || "";

    bairros().then(list => {
      const s=$("mlBairro");
      s.innerHTML = `<option value="">Selecione o bairro</option>` +
        list.map(b=>`<option value="${esc(b.id)}" data-nome="${esc(b.nome)}" data-taxa="${Number(b.taxa_entrega||0)}">${esc(b.nome)} — ${money(b.taxa_entrega)}</option>`).join("");
    });

    $("mlBairro").onchange=()=>{
      const o=$("mlBairro").options[$("mlBairro").selectedIndex];
      $("mlTaxa").textContent=money(o?.dataset.taxa||0);
      if($("taxaEntrega")) $("taxaEntrega").value=Number(o?.dataset.taxa||0);
      if(typeof window.renderCart==="function") window.renderCart();
    };

    function tipo(t){
      const entrega=t==="entrega";
      $("mlEntregaFields").style.display=entrega?"block":"none";
      $("mlMesaFields").style.display=entrega?"none":"block";
      $("mlEntregaBtn").style.borderColor=entrega?"#b71924":"#ddd";
      $("mlMesaBtn").style.borderColor=!entrega?"#b71924":"#ddd";
      $("mlTipoPedido").dataset.tipo=t;
      if($("taxaEntrega")) $("taxaEntrega").value=entrega ? Number($("mlBairro")?.options[$("mlBairro")?.selectedIndex]?.dataset.taxa||0) : 0;
      if(typeof window.renderCart==="function") window.renderCart();
    }
    $("mlEntregaBtn").onclick=()=>tipo("entrega");
    $("mlMesaBtn").onclick=()=>tipo("mesa");
    tipo("entrega");
  }

  async function finalizar(){
    if(!window.state || !state.cart.length) return alert("Adicione pelo menos um produto.");
    const nome=$("cliente")?.value.trim();
    if(!nome) return alert("Informe o nome do cliente.");

    const tipo=$("mlTipoPedido")?.dataset.tipo || "entrega";
    const obs=$("observacoes")?.value.trim() || "";
    const items=state.cart.map(x=>({nome:x.nome,quantidade:x.quantidade,preco:x.preco,adicionais:x.adicionais||[],obs:x.obs||""}));
    const subtotal=state.cart.reduce((s,x)=>s+Number(x.preco||0)*Number(x.quantidade||1),0);

    let telefone="", endereco="", referencia="", bairro="", taxa=0, extra="";
    if(tipo==="entrega"){
      const sel=$("mlBairro");
      bairro=sel?.options[sel.selectedIndex]?.dataset.nome || "";
      taxa=Number(sel?.options[sel.selectedIndex]?.dataset.taxa || 0);
      endereco=$("mlEndereco2")?.value.trim() || "";
      referencia=$("mlReferencia2")?.value.trim() || "";
      telefone=$("telefone")?.value.trim() || "";
      if(!bairro) return alert("Selecione o bairro.");
      if(!endereco) return alert("Informe o endereço.");
      extra=`\n[ML_TIPO]entrega[/ML_TIPO]\n[ML_BAIRRO]${bairro}[/ML_BAIRRO]\n[ML_TAXA]${taxa}[/ML_TAXA]`;
    }else{
      taxa=0;
      extra=`\n[ML_TIPO]mesa[/ML_TIPO]\n[ML_PAGAMENTO]Pendente[/ML_PAGAMENTO]`;
    }

    const packed=`${obs}\n[ML_ITENS]${encodeURIComponent(JSON.stringify(items))}[/ML_ITENS]${extra}\n[ML_STATUS]preparo[/ML_STATUS]`;
    const total=subtotal+taxa;
    const payload={Cliente:nome,telefone,endereco,referencia,observacoes:packed,total};

    const r=await dbx.from("pedidos").insert(payload).select().single();
    if(r.error) return alert("Erro ao salvar pedido: "+r.error.message);

    if(tipo==="entrega" && telefone){
      try{ await dbx.from("clientes").upsert({nome,telefone,endereco,referencia},{onConflict:"telefone"}); }catch(e){}
    }
    state.cart=[];
    if(typeof window.closeCart==="function") window.closeCart();
    ["cliente","telefone","endereco","referencia","observacoes"].forEach(id=>{if($(id))$(id).value="";});
    if($("taxaEntrega")) $("taxaEntrega").value=0;
    if(typeof window.loadAll==="function") await window.loadAll();
    if(typeof window.go==="function") window.go("comandas");
    alert(tipo==="mesa" ? "Pedido de mesa registrado como pagamento pendente!" : "Pedido de entrega registrado!");
  }

  function bind(){
    ensureUI();
    const btn=$("finish");
    if(btn && !btn.dataset.mlBound){
      btn.dataset.mlBound="1";
      btn.onclick=finalizar;
    }
  }

  setTimeout(bind,300);
  setTimeout(bind,1200);
  setInterval(bind,2500);
})();
