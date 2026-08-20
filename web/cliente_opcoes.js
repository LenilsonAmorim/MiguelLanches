/* Miguel Lanches — opções genéricas do cliente
   Pastel Médio/Grande são produtos independentes: NÃO existe seletor Tamanho.
   Todas as categorias podem usar configuração do Admin:
   sabor_preco, adicional_preco, sabor ou nenhuma.
*/
(() => {
  "use strict";

  const C = window.ML_CONFIG || {};
  const optDb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);

  const $c = id => document.getElementById(id);
  const escC = v => String(v ?? "").replace(/[&<>"]/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));
  const moneyC = v => Number(v || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  const normC = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

  function category(product){
    return normC(product?.categorias?.nome || "");
  }
  function inferType(product){
    const c = category(product);
    if (c.includes("pizza") || c.includes("pastel")) return "sabor_preco";
    if (c.includes("suco") || c.includes("milk") || c.includes("creme") || c.includes("acai")) return "sabor";
    return "adicional_preco";
  }
  function isPastel(product){
    return category(product).includes("pastel") || normC(product?.nome).includes("pastel");
  }

  async function getConfiguration(productId, product){
    const [c,o] = await Promise.all([
      optDb.from("configuracao_opcoes").select("*").eq("produto_id",productId).maybeSingle(),
      optDb.from("opcoes_produto").select("*").eq("produto_id",productId).eq("ativo",true).order("ordem")
    ]);

    return {
      cfg:c.data || null,
      options:o.data || [],
      error:c.error || o.error,
      inferred:!c.data ? inferType(product) : false
    };
  }

  function optionTitle(type, limit){
    const text = {
      sabor_preco:"Escolha os sabores",
      adicional_preco:"Escolha os adicionais",
      sabor:"Escolha o sabor"
    }[type] || "Escolha as opções";
    return `${text} <small>(até ${limit})</small>`;
  }

  function renderOptions(cfg,options){
    if(!cfg || cfg.tipo==="nenhuma") return "";
    const limit=Math.max(1,Number(cfg.limite||1));
    const priceMode=cfg.tipo==="sabor_preco" || cfg.tipo==="adicional_preco";

    return `
      <div class="ml-option-title">${optionTitle(cfg.tipo,limit)}</div>
      <div class="ml-options" data-limit="${limit}">
        ${options.map(o=>`
          <button type="button" class="ml-option"
            data-name="${escC(o.nome)}"
            data-price="${Number(o.preco_adicional||0)}"
            onclick="window.mlPickOption(this)">
            <span>${escC(o.nome)}</span>
            ${priceMode ? `<strong>${Number(o.preco_adicional||0)>0?"+ "+moneyC(o.preco_adicional):"Sem adicional"}</strong>`:""}
          </button>
        `).join("")}
      </div>`;
  }

  window.mlPickOption = function(el){
    const box=el.closest(".ml-options");
    if(!box) return;

    const limit=Number(box.dataset.limit||1);
    const selected=box.querySelectorAll(".selected").length;

    if(!el.classList.contains("selected") && selected>=limit) return;

    if(limit===1) box.querySelectorAll(".selected").forEach(x=>x.classList.remove("selected"));
    el.classList.toggle("selected");
    updatePrice();
  };

  function updatePrice(){
    const p=window.currentProduct;
    if(!p) return;

    const add=[...document.querySelectorAll(".ml-option.selected")]
      .reduce((s,x)=>s+Number(x.dataset.price||0),0);

    const qty=window.currentQty||1;
    const priceEl=$c("addPrice");
    if(priceEl) priceEl.textContent=moneyC((Number(p.preco||0)+add)*qty);
  }

  function renderProduct(p,cfg,options){
    const img = (typeof productImage==="function") ? productImage(p) : (p.imagem_url || "");
    const hasOptions = cfg && cfg.tipo!=="nenhuma";
    const titleBlock = hasOptions
      ? renderOptions(cfg,options)
      : (isPastel(p) ? `<div class="ml-empty-options">Cadastre os sabores deste pastel no painel Admin em <b>Opções</b>.</div>` : "");

    const disabled = isPastel(p) && hasOptions && options.length===0;

    $c("productBody").innerHTML=`
      <div class="product-main">
        <div class="product-hero">
          ${img?`<img src="${escC(img)}" alt="${escC(p.nome)}">`:`<span>${escC(p.emoji||p.categorias?.emoji||"")}</span>`}
          <button class="hero-close" onclick="closeProduct()">×</button>
        </div>

        <div class="product-content">
          <h2>${escC(p.nome)}</h2>
          <div class="modal-price">${moneyC(p.preco)}</div>
          ${p.descricao?`<p class="modal-desc">${escC(p.descricao)}</p>`:""}
          ${titleBlock}

          <label class="field-label">
            Observação <small>(opcional)</small>
          </label>
          <textarea id="productNote" class="field" placeholder="Ex.: sem açúcar, bem gelado..."></textarea>

          <div class="qty-row">
            <b>Quantidade</b>
            <div class="stepper">
              <button type="button" onclick="stepQty(-1)">−</button>
              <span id="productQty">1</span>
              <button type="button" onclick="stepQty(1)">+</button>
            </div>
          </div>

          <button type="button" class="main-btn" id="mlAddBtn">
            Adicionar à sacola · <span id="addPrice">${moneyC(p.preco)}</span>
          </button>
        </div>
      </div>`;

    if(disabled){
      $c("mlAddBtn").disabled=true;
      $c("mlAddBtn").textContent="Cadastre os sabores no Admin";
    }else{
      $c("mlAddBtn").onclick=()=>addGeneric(p.id,cfg);
    }

    const style=document.createElement("style");
    style.textContent=`
      .ml-option-title{font-weight:900;margin:18px 0 8px}
      .ml-option-title small{font-weight:700;color:#777}
      .ml-options{display:grid;gap:8px}
      .ml-option{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;border:1px solid #dedede;background:#fff;border-radius:12px;padding:13px;text-align:left;font-weight:700}
      .ml-option strong{color:#bd1f2b;white-space:nowrap}
      .ml-option.selected{border-color:#f4bd17;background:#fff8d8;box-shadow:0 0 0 2px #f4bd1740}
      .ml-empty-options{padding:12px;border-radius:10px;background:#fff7cf;border:1px solid #f4bd17;color:#604f00;margin:12px 0}
      .ml-option:disabled{opacity:.5}
    `;
    document.head.appendChild(style);

    $c("productModal").classList.remove("hidden");
    window.currentProduct=p;
    window.currentQty=1;
    window.currentGenericConfig=cfg;
  }

  function addGeneric(pid,cfg){
    const p=products.find(x=>String(x.id)===String(pid));
    if(!p) return;

    const selected=[...document.querySelectorAll(".ml-option.selected")];
    const limit=Math.max(1,Number(cfg?.limite||1));

    if(cfg && cfg.tipo!=="nenhuma" && selected.length<1){
      alert("Escolha pelo menos 1 opção.");
      return;
    }
    if(selected.length>limit){
      alert(`Escolha no máximo ${limit} opções.`);
      return;
    }

    const qty=window.currentQty||1;
    const note=$c("productNote").value.trim();
    const extra=selected.reduce((s,x)=>s+Number(x.dataset.price||0),0);
    const names=selected.map(x=>x.dataset.name);

    const item={
      id:uid(),
      nome:names.length ? `${p.nome} — ${names.join(", ")}` : p.nome,
      preco:Number(p.preco||0)+extra,
      quantidade:qty,
      obs:note,
      config:{
        tipo:cfg?.tipo||"nenhuma",
        opcoes:names
      }
    };

    cart.push(item);
    renderCart();
    closeProduct();
    closeCart();
  }

  const originalOpen = window.openProduct;
  window.openProduct = async function(pid){
    const p=products.find(x=>String(x.id)===String(pid));
    if(!p) return;

    const r=await getConfiguration(pid,p);

    // When tables are unavailable, preserve the existing product modal.
    if(r.error){
      if(typeof originalOpen==="function") originalOpen(pid);
      return;
    }

    // If Admin explicitly disabled options, use the normal modal.
    if(r.cfg?.tipo==="nenhuma"){
      if(typeof originalOpen==="function") originalOpen(pid);
      return;
    }

    // For configured products or categories using the default rule,
    // use the new generic modal. Pastéis never get a Tamanho selector.
    const cfg=r.cfg || {tipo:r.inferred || inferType(p),limite:1};

    // No configured options: show clean modal and instruct Admin.
    if(!r.options.length){
      if(isPastel(p)){
        renderProduct(p,cfg,[]);
      }else if(r.cfg){
        renderProduct(p,cfg,[]);
      }else if(typeof originalOpen==="function"){
        originalOpen(pid);
      }
      return;
    }

    renderProduct(p,cfg,r.options);
  };

  // Make the old hard-coded pastel path unreachable whenever our override is used.
  window.mlRemovePastelSize = true;
})();