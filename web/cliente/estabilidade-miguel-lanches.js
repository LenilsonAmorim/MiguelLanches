/* ============================================================
   MIGUEL LANCHES — CORREÇÃO DE ESTABILIDADE/SINCRONIZAÇÃO
   Coloque este arquivo DEPOIS de todos os outros scripts do index.html.
   ============================================================ */
(function () {
  "use strict";

  if (window.__ML_STABILITY_PATCH__) return;
  window.__ML_STABILITY_PATCH__ = true;

  let syncing = false;
  let lastGood = {
    cats: null,
    products: null,
    ingredients: null,
    sizes: null,
    combos: null,
    clients: null,
    orders: null
  };

  function setSync(text) {
    const el = document.getElementById("syncStatus");
    if (el) el.textContent = text;
  }

  function safeRender(fn) {
    try {
      if (typeof fn === "function") fn();
    } catch (e) {
      console.warn("[Miguel Lanches] Erro ao renderizar:", e);
    }
  }

  async function stableLoadAll() {
    if (syncing) return;
    syncing = true;
    setSync("● sincronizando");

    try {
      const results = await Promise.allSettled([
        db.from("categorias").select("*").order("ordem"),
        db.from("produtos").select("*,categorias(nome,emoji)").eq("ativo", true).order("ordem"),
        db.from("ingredientes").select("*").eq("ativo", true).order("nome"),
        db.from("tamanhos").select("*").eq("ativo", true).order("ordem"),
        db.from("combos").select("*").eq("ativo", true).order("nome"),
        db.from("clientes").select("*").order("nome"),
        db.from("pedidos").select("*").order("created_at", { ascending: false })
      ]);

      const names = [
        "cats",
        "products",
        "ingredients",
        "sizes",
        "combos",
        "clients",
        "orders"
      ];

      let success = 0;

      results.forEach((result, index) => {
        const name = names[index];

        if (
          result.status === "fulfilled" &&
          result.value &&
          !result.value.error &&
          Array.isArray(result.value.data)
        ) {
          state[name] = result.value.data;
          lastGood[name] = result.value.data;
          success++;
        } else {
          // IMPORTANTE:
          // Se uma consulta falhar, NÃO substituímos os dados atuais por [].
          console.warn(
            "[Miguel Lanches] Consulta falhou; mantendo dados anteriores:",
            name,
            result.reason || result.value?.error
          );

          if (lastGood[name] && (!Array.isArray(state[name]) || state[name].length === 0)) {
            state[name] = lastGood[name];
          }
        }
      });

      // Renderiza somente depois que os dados foram processados.
      safeRender(window.renderCats);
      safeRender(window.renderProducts);
      safeRender(window.renderCart);
      safeRender(window.renderOrders);
      safeRender(window.renderHistory);
      safeRender(window.renderClients);
      safeRender(window.renderAdmin);

      setSync(success === results.length ? "● online" : "● online · reconectando");
    } catch (err) {
      console.error("[Miguel Lanches] Falha geral na sincronização:", err);
      setSync("● conexão instável");
    } finally {
      syncing = false;
    }
  }

  // Substitui qualquer loadAll anterior, inclusive wrappers antigos.
  window.loadAll = stableLoadAll;

  // Pequena proteção: se o site chamar renderAll, renderiza com segurança.
  if (typeof window.renderAll === "function") {
    const originalRenderAll = window.renderAll;
    window.renderAll = function () {
      try {
        originalRenderAll();
      } catch (e) {
        console.warn("[Miguel Lanches] renderAll protegido:", e);
        safeRender(window.renderCats);
        safeRender(window.renderProducts);
        safeRender(window.renderCart);
        safeRender(window.renderOrders);
        safeRender(window.renderHistory);
        safeRender(window.renderClients);
        safeRender(window.renderAdmin);
      }
    };
  }

  // Evita várias chamadas ao mesmo tempo.
  let timer = null;
  function scheduleSync(delay) {
    clearTimeout(timer);
    timer = setTimeout(stableLoadAll, delay);
  }

  // Primeira sincronização depois que todos os scripts terminaram.
  scheduleSync(250);

  // Se o celular voltar para a aba, atualiza.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      scheduleSync(500);
    }
  });

  // Reconfere periodicamente, sem apagar os dados se o Supabase falhar.
  setInterval(function () {
    if (document.visibilityState === "visible") stableLoadAll();
  }, 15000);

  // Quando a conexão do aparelho voltar.
  window.addEventListener("online", function () {
    scheduleSync(300);
  });

  window.addEventListener("offline", function () {
    setSync("● sem internet");
  });

  console.log("[Miguel Lanches] Correção de estabilidade carregada.");
})();
