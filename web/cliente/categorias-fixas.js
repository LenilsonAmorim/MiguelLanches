/* Miguel Lanches
   Categorias fixas + uma seção por categoria + rolagem suave.
   Não usa a categoria "Todos".
*/
(function () {
  "use strict";

  const SUPABASE_URL = "https://lifsxhyeqwppfvajvhpn.supabase.co";
  const SUPABASE_KEY = "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let cats = [];
  let prods = [];

  const $ = (id) => document.getElementById(id);
  const norm = (v) => String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const esc = (v) => String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const money = (v) => Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  function orderCategories() {
    return [...cats]
      .filter(c => c && c.ativo !== false)
      .sort((a, b) =>
        Number(a.ordem ?? 99999) - Number(b.ordem ?? 99999) ||
        String(a.nome || "").localeCompare(String(b.nome || ""))
      );
  }

  function productCard(p) {
    return `
      <article class="card" onclick="openProduct('${String(p.id).replaceAll("'", "\\'")}')">
        <div class="photo">
          ${p.imagem_url
            ? `<img src="${esc(p.imagem_url)}" alt="${esc(p.nome)}">`
            : esc(p.emoji || p.categorias?.emoji || "🍔")}
        </div>
        <div class="card-body">
          <h3>${esc(p.nome)}</h3>
          <div class="desc">${esc(p.descricao || "Toque para ver as opções.")}</div>
          <div class="card-foot">
            <span class="price">${money(p.preco)}</span>
            <button class="plus" onclick="event.stopPropagation();openProduct('${String(p.id).replaceAll("'", "\\'")}')">+</button>
          </div>
        </div>
      </article>`;
  }

  function renderCategoryBar() {
    const nav = $("categories");
    if (!nav) return;

    nav.innerHTML = orderCategories().map(c => `
      <button
        class="category-link"
        data-category-id="${esc(c.id)}"
        onclick="selectFixedCategory('${String(c.id).replaceAll("'", "\\'")}')">
        <span class="cat-emoji">${esc(c.emoji || "📦")}</span>
        ${esc(c.nome)}
      </button>
    `).join("");
  }

  function renderSections() {
    const host = $("products");
    if (!host) return;

    const q = norm($("search")?.value || "");
    const ordered = orderCategories();

    host.innerHTML = ordered.map(c => {
      const list = prods
        .filter(p =>
          String(p.categoria_id) === String(c.id) &&
          (!q || norm(p.nome).includes(q) || norm(p.descricao).includes(q))
        )
        .sort((a, b) =>
          Number(a.ordem ?? 99999) - Number(b.ordem ?? 99999) ||
          String(a.nome || "").localeCompare(String(b.nome || ""))
        );

      if (!list.length) return "";

      return `
        <section
          class="menu-category-section"
          id="menu-category-${esc(c.id)}"
          data-category-id="${esc(c.id)}">
          <div class="menu-category-heading">
            <span>${esc(c.emoji || "📦")}</span>
            <h2>${esc(c.nome)}</h2>
          </div>
          <div class="products">${list.map(productCard).join("")}</div>
        </section>`;
    }).join("");

    if (!host.innerHTML) {
      host.innerHTML = '<div class="empty">Nenhum produto encontrado.</div>';
    }

    observeSections();
  }

  window.selectFixedCategory = function (categoryId) {
    const target = document.getElementById("menu-category-" + CSS.escape(String(categoryId)));
    if (!target) return;

    document.querySelectorAll("#categories .category-link").forEach(btn => {
      btn.classList.toggle(
        "active",
        String(btn.dataset.categoryId) === String(categoryId)
      );
    });

    const headerHeight = document.querySelector(".header")?.offsetHeight || 0;
    const categoriesHeight = $("categories")?.offsetHeight || 0;
    const top = target.getBoundingClientRect().top +
      window.scrollY -
      headerHeight -
      categoriesHeight -
      12;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth"
    });

    const active = document.querySelector(
      `#categories .category-link[data-category-id="${CSS.escape(String(categoryId))}"]`
    );
    active?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  };

  function observeSections() {
    if (window.__miguelCategoryObserver) {
      window.__miguelCategoryObserver.disconnect();
    }

    window.__miguelCategoryObserver = new IntersectionObserver(entries => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      const id = visible.target.dataset.categoryId;

      document.querySelectorAll("#categories .category-link").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.categoryId === id);
      });
    }, {
      rootMargin: "-130px 0px -55% 0px",
      threshold: [0.05, 0.2, 0.5]
    });

    document.querySelectorAll(".menu-category-section").forEach(section => {
      window.__miguelCategoryObserver.observe(section);
    });
  }

  async function loadFixedMenu() {
    const [catResult, prodResult] = await Promise.all([
      client.from("categorias").select("*").eq("ativo", true).order("ordem"),
      client.from("produtos").select("*,categorias(nome,emoji,imagem_url)").eq("ativo", true).order("ordem")
    ]);

    if (catResult.error) {
      console.error("Erro ao carregar categorias:", catResult.error);
      return;
    }

    if (prodResult.error) {
      console.error("Erro ao carregar produtos:", prodResult.error);
      return;
    }

    cats = catResult.data || [];
    prods = prodResult.data || [];

    renderCategoryBar();
    renderSections();

    if (cats.length) {
      document.querySelector("#categories .category-link")?.classList.add("active");
    }
  }

  /* O campo de busca passa a atualizar somente esta nova lista,
     evitando que a função antiga volte a misturar os produtos. */
  function installSearch() {
    const search = $("search");
    if (!search || search.dataset.fixedSearch === "1") return;

    search.dataset.fixedSearch = "1";
    search.addEventListener("input", function (event) {
      event.stopImmediatePropagation();
      renderSections();
    }, true);
  }

  function installStyle() {
    if ($("miguelFixedCategoryStyle")) return;

    const style = document.createElement("style");
    style.id = "miguelFixedCategoryStyle";
    style.textContent = `
      #featuredSection { display:none !important; }

      .categories {
        position:sticky;
        top:0;
        z-index:30;
        display:flex;
        gap:10px;
        overflow-x:auto;
        scrollbar-width:none;
        padding:10px 0;
        background:var(--bg,#f5f6f8);
      }

      .categories::-webkit-scrollbar { display:none; }

      .category-link {
        flex:0 0 auto;
        white-space:nowrap;
      }

      .category-link.active {
        background:#c51625 !important;
        color:#fff !important;
        border-color:#c51625 !important;
      }

      .menu-category-section {
        scroll-margin-top:130px;
        margin:0 0 34px;
      }

      .menu-category-heading {
        display:flex;
        align-items:center;
        gap:10px;
        margin:14px 0;
      }

      .menu-category-heading span {
        font-size:30px;
      }

      .menu-category-heading h2 {
        margin:0;
      }

      .category-sections > .menu-category-section:last-child {
        padding-bottom:30px;
      }
    `;
    document.head.appendChild(style);
  }

  window.addEventListener("load", function () {
    installStyle();
    installSearch();

    /* app.js já carregou o restante da interface.
       Agora substituímos somente a apresentação do cardápio. */
    setTimeout(loadFixedMenu, 150);
  });
})();
