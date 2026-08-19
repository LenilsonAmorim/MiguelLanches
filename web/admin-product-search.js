/* Miguel Lanches — Pesquisa rápida de produtos no Admin */
(() => {
  const style = document.createElement("style");
  style.textContent = `
    .ml-product-search-panel{margin:0 0 18px;padding:16px;background:#fff;border:1px solid #e6e8ec;border-radius:14px}
    .ml-product-search-row{display:flex;gap:10px;align-items:center}
    .ml-product-search-row input{flex:1;min-width:0;padding:12px 14px;border:1px solid #d0d5dd;border-radius:10px;font-size:15px}
    .ml-product-search-count{font-size:13px;color:#667085;margin-top:8px}
    .ml-product-search-results{display:grid;gap:8px;margin-top:12px}
    .ml-product-result{display:flex;align-items:center;gap:12px;padding:11px;border:1px solid #eaecf0;border-radius:11px;background:#fff}
    .ml-product-result img{width:48px;height:48px;object-fit:cover;border-radius:9px;background:#f2f4f7}
    .ml-product-result-main{flex:1;min-width:0}
    .ml-product-result-main strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ml-product-result-main small{color:#667085}
    .ml-product-result-actions{display:flex;gap:6px}
    .ml-product-result-actions button{border:0;border-radius:8px;padding:8px 10px;font-weight:700;cursor:pointer}
    .ml-edit-product{background:#b71924;color:#fff}.ml-find-product{background:#f2f4f7;color:#344054}
    @media(max-width:650px){.ml-product-result{align-items:flex-start}.ml-product-result-actions{flex-direction:column}.ml-product-result img{width:42px;height:42px}}
  `;
  document.head.appendChild(style);

  const norm = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

  function findProduct(id){
    const list = window.state?.products || window.products || [];
    return list.find(p => String(p.id) === String(id));
  }

  function editProduct(id){
    const p = findProduct(id);
    if (!p) return alert("Produto não encontrado.");
    // Use the existing edit function when available.
    if (typeof window.openProductModal === "function") return window.openProductModal(p);
    if (typeof window.editProduct === "function") return window.editProduct(id);
    if (typeof window.openEditProduct === "function") return window.openEditProduct(id);
    // Fallback: click the existing product edit button if the product appears in the admin list.
    const btn = [...document.querySelectorAll("button")].find(b =>
      /editar/i.test(b.textContent) && (b.dataset.id === String(id) || b.getAttribute("data-product-id") === String(id))
    );
    if (btn) return btn.click();
    alert("O editor de produto existente não foi encontrado.");
  }

  function renderResults(term){
    const box = document.getElementById("mlProductSearchResults");
    const count = document.getElementById("mlProductSearchCount");
    if (!box || !count) return;

    const list = window.state?.products || window.products || [];
    const cats = window.state?.cats || [];
    const q = norm(term).trim();

    const results = q ? list.filter(p => {
      const cat = cats.find(c => String(c.id) === String(p.categoria_id || p.categoriaId));
      return norm(p.nome).includes(q) || norm(cat?.nome).includes(q);
    }) : [];

    count.textContent = q ? `${results.length} produto(s) encontrado(s)` : "Digite o nome do produto ou categoria.";

    box.innerHTML = results.slice(0,80).map(p => {
      const cat = cats.find(c => String(c.id) === String(p.categoria_id || p.categoriaId));
      const img = p.imagem_url || p.imagem || "";
      return `
        <div class="ml-product-result">
          ${img ? `<img src="${String(img).replace(/"/g,"&quot;")}" alt="">` : `<div style="width:48px;height:48px;border-radius:9px;background:#f2f4f7;display:grid;place-items:center">🍔</div>`}
          <div class="ml-product-result-main">
            <strong>${String(p.nome||"").replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]))}</strong>
            <small>${String(cat?.nome || "Sem categoria")} · ${Number(p.preco||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</small>
          </div>
          <div class="ml-product-result-actions">
            <button class="ml-edit-product" data-ml-edit="${p.id}">Editar</button>
          </div>
        </div>`;
    }).join("") || (q ? `<div style="padding:12px;color:#667085">Nenhum produto encontrado.</div>` : "");
    box.querySelectorAll("[data-ml-edit]").forEach(b => b.onclick = () => editProduct(b.dataset.mlEdit));
  }

  function install(){
    const adminContent = document.getElementById("adminContent");
    if (!adminContent || document.getElementById("mlProductSearchPanel")) return;

    const panel = document.createElement("div");
    panel.id = "mlProductSearchPanel";
    panel.className = "ml-product-search-panel";
    panel.innerHTML = `
      <div class="ml-product-search-row">
        <span style="font-size:20px">🔎</span>
        <input id="mlProductSearch" type="search" placeholder="Pesquisar produto ou categoria...">
      </div>
      <div id="mlProductSearchCount" class="ml-product-search-count">Digite o nome do produto ou categoria.</div>
      <div id="mlProductSearchResults" class="ml-product-search-results"></div>
    `;

    adminContent.parentNode.insertBefore(panel, adminContent);

    const input = panel.querySelector("#mlProductSearch");
    input.addEventListener("input", e => renderResults(e.target.value));

    // Keep the search list synchronized after products are loaded/edited.
    setTimeout(() => renderResults(input.value), 300);
  }

  const obs = new MutationObserver(() => install());
  obs.observe(document.body, {childList:true, subtree:true});
  setTimeout(install, 500);
})();
