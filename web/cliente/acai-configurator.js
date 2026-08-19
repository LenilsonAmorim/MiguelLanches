/* Miguel Lanches - Correção definitiva do configurador de Açaí */
(() => {
  const money = v => Number(v || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const $ = id => document.getElementById(id);

  function currentProduct(id){
    return (window.products || []).find(p => String(p.id) === String(id));
  }

  window.openAcai = function(p, category){
    const sizes = Array.isArray(window.acaiCfg?.tamanhos) && window.acaiCfg.tamanhos.length
      ? window.acaiCfg.tamanhos : [
          {nome:"200 ml",preco:0},{nome:"300 ml",preco:0},
          {nome:"500 ml",preco:0},{nome:"1 litro",preco:0}
        ];
    const tops = Array.isArray(window.acaiCfg?.coberturas) ? window.acaiCfg.coberturas : [];
    const obsAllowed = !category || category.observacao !== false;

    const sizeHtml = sizes.map((s,i) =>
      '<label class="check" style="display:flex;align-items:center;gap:12px;">' +
      '<input type="radio" name="mlAcaiSize" value="'+i+'" '+(i===0?'checked':'')+
      ' data-name="'+esc(s.nome)+'" data-price="'+Number(s.preco||0)+'">' +
      '<span>'+esc(s.nome)+' — '+money(s.preco)+'</span></label>'
    ).join("");

    const topHtml = tops.map((t,i) =>
      '<label class="check" style="display:flex;align-items:center;gap:12px;">' +
      '<input class="mlAcaiTop" type="checkbox" value="'+i+
      '" data-name="'+esc(t.nome)+'" data-price="'+Number(t.preco||0)+'">' +
      '<span>'+esc(t.nome)+(Number(t.preco||0)>0?' + '+money(t.preco):'')+'</span></label>'
    ).join("");

    let html =
      '<h2>🍧 '+esc(p.nome)+'</h2>' +
      '<div class="form">' +
      '<label>Tamanho</label>' +
      '<div class="checks">'+sizeHtml+'</div>' +
      '<label>Coberturas <small>(escolha até 3)</small></label>' +
      '<div class="checks" id="mlAcaiTops">'+
      (topHtml || '<p class="muted">Nenhuma cobertura cadastrada ainda.</p>')+
      '</div>';

    if(obsAllowed){
      html += '<label>Observação<textarea id="itemObs" placeholder="Ex.: sem açúcar..."></textarea></label>';
    }

    html +=
      '<label>Quantidade<input id="qty" type="number" min="1" value="1"></label>' +
      '<div class="actions">' +
      '<button type="button" id="mlAcaiBack">Voltar</button>' +
      '<button type="button" class="primary" id="mlAcaiAdd">Adicionar</button>' +
      '</div></div>';

    $("modalContent").innerHTML = html;
    $("modal").classList.remove("hidden");

    document.querySelectorAll(".mlAcaiTop").forEach(cb => {
      cb.addEventListener("change", () => {
        const selected = document.querySelectorAll(".mlAcaiTop:checked").length;
        if(selected >= 3){
          document.querySelectorAll(".mlAcaiTop:not(:checked)").forEach(x => x.disabled = true);
        }else{
          document.querySelectorAll(".mlAcaiTop").forEach(x => x.disabled = false);
        }
      });
    });

    $("mlAcaiBack").onclick = () => {
      if(typeof window.closeModal === "function") window.closeModal();
    };
    $("mlAcaiAdd").onclick = () => window.mlAddAcai(p.id);
  };

  window.mlAddAcai = function(id){
    const p = currentProduct(id);
    if(!p) return alert("Produto Açaí não encontrado.");

    const q = Math.max(1, Number($("qty")?.value || 1));
    const size = document.querySelector('input[name="mlAcaiSize"]:checked');
    const tops = [...document.querySelectorAll(".mlAcaiTop:checked")];

    if(tops.length > 3){
      return alert("Você pode escolher no máximo 3 coberturas.");
    }

    const sizeName = size?.dataset.name || "200 ml";
    const sizePrice = Number(size?.dataset.price || 0);
    const additions = tops.map(x => ({
      nome:x.dataset.name || "",
      preco:Number(x.dataset.price || 0)
    }));
    const obs = $("itemObs")?.value.trim() || "";
    const price = Number(p.preco || 0) + sizePrice +
      additions.reduce((sum,x)=>sum+x.preco,0);

    if(!Array.isArray(window.cart)) window.cart = [];
    window.cart.push({
      key: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random())),
      id:p.id,
      nome:p.nome+" ("+sizeName+")",
      preco:price,
      quantidade:q,
      adicionais:additions,
      obs:obs
    });

    if(typeof window.closeModal === "function") window.closeModal();
    if(typeof window.renderCart === "function") window.renderCart();
  };

  // app.js loads before this file and defines its own openAcai.
  // Re-apply the override after the page has settled.
  const install = () => {
    if(window.products && window.acaiCfg) {
      window.openAcai = window.openAcai;
    }
  };
  setTimeout(install,50);
})();