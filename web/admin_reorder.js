/* MIGUEL LANCHES — REORDENAÇÃO DE PRODUTOS
   Permite arrastar os produtos no Cardápio do Admin.
   A ordem é salva na coluna "ordem" da tabela produtos.
*/
(() => {
  "use strict";

  let saveTimer = null;
  let touchState = null;

  const $ = id => document.getElementById(id);

  function toast(msg) {
    if (typeof window.toast === "function") window.toast(msg);
    else console.log(msg);
  }

  function rows() {
    return Array.from(document.querySelectorAll("#products tr"))
      .filter(tr => tr.querySelector("[data-edit]"));
  }

  function installHeader() {
    const head = document.querySelector("#products")?.closest("table")?.querySelector("thead tr");
    if (!head || head.dataset.reorderHeader === "1") return;
    const th = document.createElement("th");
    th.className = "reorder-th";
    th.textContent = "↕";
    th.title = "Arraste para mudar a posição";
    head.insertBefore(th, head.firstElementChild);
    head.dataset.reorderHeader = "1";
  }

  function installRow(row) {
    if (!row || row.dataset.reorderReady === "1") return;
    const first = row.cells[0];
    if (!first) return;

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.setAttribute("aria-label", "Arrastar produto");
    handle.setAttribute("title", "Arraste para mudar a posição");
    handle.textContent = "⋮⋮";

    first.prepend(handle);
    row.draggable = true;
    row.dataset.reorderReady = "1";

    row.addEventListener("dragstart", e => {
      if (e.target.closest("button,a,input,textarea,select")) {
        e.preventDefault();
        return;
      }
      row.classList.add("reorder-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", row.dataset.editId || "");
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("reorder-dragging");
      document.querySelectorAll("#products tr.reorder-over")
        .forEach(x => x.classList.remove("reorder-over"));
    });

    row.addEventListener("dragover", e => {
      e.preventDefault();
      const dragging = document.querySelector("#products tr.reorder-dragging");
      if (!dragging || dragging === row) return;
      row.classList.add("reorder-over");
    });

    row.addEventListener("dragleave", () => row.classList.remove("reorder-over"));

    row.addEventListener("drop", e => {
      e.preventDefault();
      row.classList.remove("reorder-over");
      const dragging = document.querySelector("#products tr.reorder-dragging");
      if (!dragging || dragging === row) return;

      const rect = row.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      if (after) row.parentNode.insertBefore(dragging, row.nextSibling);
      else row.parentNode.insertBefore(dragging, row);

      saveOrder();
    });

    handle.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse" && e.button !== 0) return;

      touchState = {
        row,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        active: false,
        timer: setTimeout(() => {
          touchState.active = true;
          row.classList.add("reorder-dragging");
          if (navigator.vibrate) navigator.vibrate(30);
        }, 300)
      };

      try { handle.setPointerCapture(e.pointerId); } catch (_) {}
    });

    handle.addEventListener("pointermove", e => {
      if (!touchState || touchState.pointerId !== e.pointerId) return;

      const dx = Math.abs(e.clientX - touchState.startX);
      const dy = Math.abs(e.clientY - touchState.startY);

      if (!touchState.active && (dx > 8 || dy > 8)) {
        clearTimeout(touchState.timer);
        touchState = null;
        return;
      }

      if (!touchState.active) return;

      e.preventDefault();

      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest("#products tr");
      if (!target || target === touchState.row || !target.querySelector("[data-edit]")) return;

      const rect = target.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;

      if (after) target.parentNode.insertBefore(touchState.row, target.nextSibling);
      else target.parentNode.insertBefore(touchState.row, target);
    });

    handle.addEventListener("pointerup", e => {
      if (!touchState || touchState.pointerId !== e.pointerId) return;
      clearTimeout(touchState.timer);

      const wasActive = touchState.active;
      const changed = wasActive;
      touchState.row.classList.remove("reorder-dragging");
      touchState = null;

      if (changed) saveOrder();
    });

    handle.addEventListener("pointercancel", () => {
      if (!touchState) return;
      clearTimeout(touchState.timer);
      touchState.row.classList.remove("reorder-dragging");
      touchState = null;
    });
  }

  async function saveOrder() {
    const db = window.db;
    if (!db) {
      toast("Banco de dados não conectado.");
      return;
    }

    const search = ($("ps")?.value || "").trim();
    if (search) {
      toast("Apague a busca antes de alterar a posição.");
      if (typeof window.renderProducts === "function") window.renderProducts();
      return;
    }

    const visibleRows = rows();
    if (!visibleRows.length) return;

    const allProducts = Array.isArray(window.products) ? window.products.slice() : [];
    const visibleIds = visibleRows
      .map(row => row.querySelector("[data-edit]")?.dataset.edit)
      .filter(Boolean);

    if (!visibleIds.length) return;

    // Mantém os produtos que não estão na tabela sem alterar sua posição relativa.
    const visibleSet = new Set(visibleIds);
    const ordered = [];
    const remaining = allProducts.filter(p => !visibleSet.has(String(p.id)));

    // A posição dos produtos exibidos é exatamente a posição atual da tabela.
    for (const id of visibleIds) {
      const p = allProducts.find(x => String(x.id) === String(id));
      if (p) ordered.push(p);
    }

    // Produtos ocultos ficam depois dos exibidos.
    const finalOrder = ordered.concat(remaining);

    try {
      // Salva em pequenos lotes para evitar muitas requisições simultâneas.
      for (let i = 0; i < finalOrder.length; i++) {
        const p = finalOrder[i];
        const newOrder = i + 1;
        if (Number(p.ordem) === newOrder) continue;

        const r = await db.from("produtos")
          .update({ ordem: newOrder })
          .eq("id", p.id);

        if (r.error) throw r.error;
        p.ordem = newOrder;
      }

      window.products = finalOrder;
      if (typeof window.syncGlobals === "function") window.syncGlobals();

      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (typeof window.load === "function") window.load();
      }, 250);

      toast("Posição dos produtos salva.");
    } catch (err) {
      console.error("Erro ao salvar ordem:", err);
      toast("Não foi possível salvar a nova posição.");
      if (typeof window.load === "function") window.load();
    }
  }

  function bind() {
    const body = $("products");
    if (!body) return;

    installHeader();

    rows().forEach((row, index) => {
      const edit = row.querySelector("[data-edit]");
      if (edit) row.dataset.editId = edit.dataset.edit;
      installRow(row);
    });
  }

  function start() {
    bind();

    const body = $("products");
    if (body) {
      new MutationObserver(() => {
        requestAnimationFrame(bind);
      }).observe(body, { childList: true, subtree: true });
    }

    // Reaplica ao trocar de página, atualizar ou pesquisar.
    document.addEventListener("click", e => {
      if (e.target.closest('[data-page="cardapio"],#refresh,#newProduct')) {
        setTimeout(bind, 200);
      }
    });

    $("ps")?.addEventListener("input", () => setTimeout(bind, 50));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.saveProductOrder = saveOrder;
})();
