/* Miguel Lanches - correções do cliente
   Pastel Médio e Pastel Grande são produtos independentes.
   O modal nunca mostra "Tamanho" para pastéis: mostra apenas o sabor.
   Para produtos configurados no Admin, usa configuracao_opcoes/opcoes_produto.
*/
(function(){
  const oldOpen = window.openProduct;
  const oldAdd = window.addCurrent;

  function isPastelLocal(p){
    const c = norm(p?.categorias?.nome || "");
    return c.includes("pastel") || norm(p?.nome || "").includes("pastel");
  }

  async function cfgFor(pid){
    try{
      const [c,o] = await Promise.all([
        db.from("configuracao_opcoes").select("*").eq("produto_id",pid).maybeSingle(),
        db.from("opcoes_produto").select("*").eq("produto_id",pid).eq("ativo",true).order("ordem")
      ]);
      return {cfg:c.data || null, options:o.data || [], error:c.error || o.error};
    }catch(e){ return {cfg:null,options:[],error:e}; }
  }

  function renderGeneric(cfg, options){
    if(!cfg || cfg.tipo==="nenhuma") return "";
    const limit=Math.max(1,Number(cfg.limite||1));
    const priceMode=cfg.tipo==="sabor_preco" || cfg.tipo==="adicional_preco";
    const title={
      sabor_preco:"Escolha os sabores",
      adicional_preco:"Escolha os adicionais",
      sabor:"Escolha o sabor"
    }[cfg.tipo] || "Escolha as opções";
    return `<div class="option-title">${title} <small>(até ${limit})</small></div>
      <div class="options generic-options" data-limit="${limit}" data-type="${esc(cfg.tipo)}">
      ${options.map(o=>`<button type="button" class="option generic-option"
        data-name="${esc(o.nome)}" data-price="${Number(o.preco_adicional||0)}"
        onclick="pickGenericOption(this)">
        <span>${esc(o.nome)}</span>
        ${priceMode ? `<strong>${Number(o.preco_adicional||0)>0 ? "+ "+money(o.preco_adicional) : "Sem adicional"}</strong>` : ""}
      </button>`).join("")}
      </div>`;
  }

  window.pickGenericOption=function(el){
    const box=el.closest(".generic-options");
    const limit=Number(box?.dataset.limit||1);
    if(!el.classList.contains("selected") && box.querySelectorAll(".selected").length>=limit) return;
    if(limit===1) box.querySelectorAll(".selected").forEach(x=>x.classList.remove("selected"));
    el.classList.toggle("selected");
    updateGenericPrice();
  };

  function updateGenericPrice(){
    const p=window.currentProduct;
    if(!p) return;
    const selected=[...document.querySelectorAll(".generic-option.selected")];
    const add=selected.reduce((s,x)=>s+Number(x.dataset.price||0),0);
    const el=$("addPrice");
    if(el) el.textContent=money((Number(p.preco||0)+add)*(window.currentQty||1));
  }

  window.openProduct=async function(pid){
    const p=products.find(x=>String(x.id)===String(pid));
    if(!p) return;

    /* Pastéis: primeiro tenta configuração do Admin. Se não houver,
       usa os outros produtos da mesma categoria como sabores, sem tamanho. */
    if(isPastelLocal(p)){
      const r=await cfgFor(pid);
      if(!r.error && r.options.length){
        return renderConfiguredProduct(p, r.cfg || {tipo:"sabor", limite:1}, r.options);
      }
      return renderPastelProduct(p);
    }

    /* Todas as outras categorias podem ser controladas pelo Admin. */
    const r=await cfgFor(pid);
    if(r.cfg && r.cfg.tipo!=="nenhuma" && !r.error){
      return renderConfiguredProduct(p,r.cfg,r.options);
    }
    return oldOpen(pid);
  };

  function renderConfiguredProduct(p,cfg,options){
    const img=productImage(p);
    const extra=renderGeneric(cfg,options);
    $("productBody").innerHTML=`<div class="product-main">
      <div class="product-hero">${img?`<img src="${esc(img)}" alt="${esc(p.nome)}">`:`<span>${esc(p.emoji||p.categorias?.emoji||"")}</span>`}
        <button class="hero-close" onclick="closeProduct()">×</button>
      </div>
      <div class="product-content">
        <h2>${esc(p.nome)}</h2>
        <div class="modal-price">${money(p.preco)}</div>
        ${p.descricao?`<p class="modal-desc">${esc(p.descricao)}</p>`:""}
        ${extra}
        <label class="field-label">Observação <small>(opcional)</small></label>
        <textarea id="productNote" class="field" placeholder="Ex.: sem açúcar, bem gelado..."></textarea>
        <div class="qty-row"><b>Quantidade</b><div class="stepper">
          <button onclick="stepQty(-1)">−</button><span id="productQty">1</span><button onclick="stepQty(1)">+</button>
        </div></div>
        <button class="main-btn" onclick="addCurrent('${p.id}')">Adicionar à sacola · <span id="addPrice">${money(p.preco)}</span></button>
      </div>
    </div>`;
    $("productModal").classList.remove("hidden");
    window.currentProduct=p; window.currentQty=1; window.currentGenericConfig=cfg;
  }

  function renderPastelProduct(p){
    const options=`<p class="muted">Cadastre os sabores deste pastel em Opções no Admin.</p>`;

    const img=productImage(p);
    $("productBody").innerHTML=`<div class="product-main">
      <div class="product-hero">${img?`<img src="${esc(img)}" alt="${esc(p.nome)}">`:`<span>${esc(p.emoji||p.categorias?.emoji||"🥟")}</span>`}
        <button class="hero-close" onclick="closeProduct()">×</button>
      </div>
      <div class="product-content">
        <h2>${esc(p.nome)}</h2>
        <div class="modal-price">${money(p.preco)}</div>
        ${p.descricao?`<p class="modal-desc">${esc(p.descricao)}</p>`:""}
        <div class="option-title">Escolha 1 sabor</div>
        <div class="options">${options}</div>
        <label class="field-label">Observação <small>(opcional)</small></label>
        <textarea id="productNote" class="field" placeholder="Ex.: sem açúcar, bem gelado..."></textarea>
        <div class="qty-row"><b>Quantidade</b><div class="stepper">
          <button onclick="stepQty(-1)">−</button><span id="productQty">1</span><button onclick="stepQty(1)">+</button>
        </div></div>
        <button class="main-btn" onclick="addCurrent('${p.id}')">Adicionar à sacola · <span id="addPrice">${money(p.preco)}</span></button>
      </div>
    </div>`;
    $("productModal").classList.remove("hidden");
    window.currentProduct=p; window.currentQty=1; window.currentGenericConfig=null;
  }

  window.addCurrent=async function(pid){
    const p=products.find(x=>String(x.id)===String(pid));
    if(!p) return;

    if(isPastelLocal(p)){
      const f=document.querySelector(".pastel-flavor.selected");
      if(!f) return alert("Escolha 1 sabor.");
      const qty=window.currentQty||1, note=$("productNote").value.trim();
      const item={
        id:uid(),
        nome:`${p.nome} — ${f.dataset.name}`,
        preco:Number(p.preco||0),
        quantidade:qty,
        obs:note,
        config:{tipo:"pastel",sabor:f.dataset.name}
      };
      cart.push(item); renderCart(); closeProduct(); closeCart();
      return;
    }

    const cfg=window.currentGenericConfig;
    if(cfg && cfg.tipo!=="nenhuma"){
      const selected=[...document.querySelectorAll(".generic-option.selected")];
      if(!selected.length) return alert("Escolha pelo menos 1 opção.");
      const limit=Math.max(1,Number(cfg.limite||1));
      if(selected.length>limit) return alert(`Escolha no máximo ${limit} opções.`);
      const qty=window.currentQty||1, note=$("productNote").value.trim();
      const add=selected.reduce((s,x)=>s+Number(x.dataset.price||0),0);
      const names=selected.map(x=>x.dataset.name);
      const item={
        id:uid(),
        nome:`${p.nome} — ${names.join(", ")}`,
        preco:Number(p.preco||0)+add,
        quantidade:qty,
        obs:note,
        config:{tipo:cfg.tipo,opcoes:names,adicionais:cfg.tipo==="adicional_preco"?add:0}
      };
      cart.push(item);renderCart();closeProduct();closeCart();
      return;
    }

    return oldAdd(pid);
  };
})();
