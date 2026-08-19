/* Miguel Lanches — correção de exclusão de categorias */
(() => {
  const originalRender = window.renderCategoriasX;

  window.adminDeleteCategory = async function(id) {
    if (!confirm("Desativar esta categoria? Os produtos dela também deixarão de aparecer no cardápio.")) return;

    const r = await db.from("categorias").update({ativo:false}).eq("id", id);
    if (r.error) return alert("Não foi possível desativar a categoria: " + r.error.message);

    // Limpa a configuração específica da categoria para evitar lixo no cadastro.
    try {
      const c = await db.from("configuracoes").select("valor").eq("chave","categoria_config").maybeSingle();
      if (!c.error && c.data) {
        let cfg = {};
        try { cfg = JSON.parse(c.data.valor || "{}") || {}; } catch {}
        delete cfg[id];
        await db.from("configuracoes").upsert(
          {chave:"categoria_config", valor:JSON.stringify(cfg), updated_at:new Date().toISOString()},
          {onConflict:"chave"}
        );
      }
    } catch {}

    await loadAll();
    if (typeof renderCategoriasX === "function") renderCategoriasX();
  };

  // Aguarda o módulo de categorias criar os botões e troca o handler.
  function patch() {
    document.querySelectorAll("[data-del-cat]").forEach(btn => {
      btn.onclick = () => adminDeleteCategory(btn.dataset.delCat);
    });
  }

  const observer = new MutationObserver(patch);
  observer.observe(document.body, {childList:true, subtree:true});
  setTimeout(patch, 300);
  setTimeout(patch, 1000);
})();
