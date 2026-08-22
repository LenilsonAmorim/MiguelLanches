/* MIGUEL LANCHES — Destaques reais
   Só aparece no cliente quem estiver com produtos.destaque = true.
   "Ver todos" abre somente os produtos marcados como destaque.
*/
(() => {
  "use strict";

  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  const money = v => Number(v || 0).toLocaleString("pt-BR", {
    style:"currency", currency:"BRL"
  });

  const products = () => Array.isArray(window.products) ? window.products : [];

  const image = p => p?.imagem_url || p?.imagem || p?.image_url || "";

  const featured = () => products().filter(p =>
    p && (p.destaque === true || p.destaque === "true")
  );

  function card(p) {
    const src = image(p);
    return `<button class="highlight" type="button" data-featured-id="${esc(p.id)}">
      <div class="highlight-img">
        ${src
          ? `<img src="${esc(src)}" alt="${esc(p.nome)}">`
          : `<span>${esc(p.emoji || "🍔")}</span>`}
      </div>
      <div class="highlight-body">
        <small>EM DESTAQUE</small>
        <b>${esc(p.nome)}</b>
        <strong>${money(p.preco)}</strong>
      </div>
    </button>`;
  }

  function bind(root) {
    root.querySelectorAll("[data-featured-id]").forEach(button => {
      if (button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      button.addEventListener("click", () => {
        window.openProduct?.(button.dataset.featuredId);
      });
    });
  }

  function render() {
    const host = document.getElementById("featured");
    if (!host) return;

    const items = featured();

    host.innerHTML = items.length
      ? items.slice(0, 6).map(card).join("")
      : `<div class="featured-empty">Nenhum produto em destaque no momento.</div>`;

    bind(host);
  }

  function openAll() {
    const items = featured();

    let modal = document.getElementById("featuredAllModal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "featuredAllModal";
      modal.className = "featured-all-modal hidden";

      modal.innerHTML = `
        <div class="featured-all-card">
          <div class="featured-all-head">
            <div>
              <small>SELEÇÃO DA CASA</small>
              <h2>Todos os destaques</h2>
              <p id="featuredAllCount"></p>
            </div>
            <button class="featured-all-close" type="button">×</button>
          </div>
          <div id="featuredAllList" class="featured-all-list"></div>
        </div>`;

      document.body.appendChild(modal);

      modal.addEventListener("click", e => {
        if (e.target === modal) closeAll();
      });

      modal.querySelector(".featured-all-close")
        .addEventListener("click", closeAll);
    }

    document.getElementById("featuredAllCount").textContent =
      `${items.length} ${items.length === 1 ? "produto" : "produtos"} em destaque`;

    const host = document.getElementById("featuredAllList");

    host.innerHTML = items.length
      ? items.map(card).join("")
      : `<div class="featured-empty">Nenhum produto em destaque no momento.</div>`;

    bind(host);

    modal.classList.remove("hidden");
    document.body.classList.add("featured-modal-open");
  }

  function closeAll() {
    document.getElementById("featuredAllModal")?.classList.add("hidden");
    document.body.classList.remove("featured-modal-open");
  }

  function install() {
    const link = document.querySelector(".featured-section .section-link");

    if (link && link.dataset.featuredBound !== "1") {
      link.dataset.featuredBound = "1";
      link.removeAttribute("onclick");
      link.addEventListener("click", e => {
        e.preventDefault();
        openAll();
      });
    }

    render();
  }

  /*
   * Atualização em tempo real:
   * quando o Admin marca/desmarca destaque, o cliente atualiza sem precisar
   * recarregar a página. Se o Realtime não estiver habilitado, o funcionamento
   * normal continua e a página pode ser recarregada.
   */
  function setupRealtime() {
    try {
      const cfg = window.ML_CONFIG || {};
      if (!window.supabase?.createClient || !cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) return;

      const client = window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_KEY
      );

      client
        .channel("miguel-lanches-client-featured")
        .on(
          "postgres_changes",
          { event:"UPDATE", schema:"public", table:"produtos" },
          payload => {
            const changed = payload.new;
            if (!changed?.id) return;

            const p = products().find(x => String(x.id) === String(changed.id));

            if (p) Object.assign(p, changed);

            render();
          }
        )
        .subscribe();
    } catch (error) {
      console.warn("Realtime dos destaques indisponível.", error);
    }
  }

  window.renderRealFeatured = render;
  window.openAllFeatured = openAll;
  window.closeAllFeatured = closeAll;

  const timer = setInterval(() => {
    install();

    if (products().length) {
      clearInterval(timer);
      setupRealtime();
    }
  }, 200);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once:true });
  } else {
    install();
  }
})();
