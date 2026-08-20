/* MIGUEL LANCHES — correção do scroll dos filtros de pedidos
   Os filtros "Novos / Preparando / Saiu para entrega..." devem mover
   somente o quadro de pedidos na horizontal, sem alterar a posição vertical
   da página.
*/
(() => {
  "use strict";

  function installStatusTabs() {
    const orders = document.getElementById("orders");
    if (!orders) return false;

    let tabs = document.getElementById("statusTabs");
    if (!tabs) {
      tabs = document.createElement("div");
      tabs.id = "statusTabs";
      tabs.className = "status-tabs";
      orders.parentNode.insertBefore(tabs, orders);
    }

    return true;
  }

  function scrollOnlyOrders(status) {
    const board = document.getElementById("orders");
    const column = board?.querySelector(`.column[data-status="${CSS.escape(status)}"]`);
    if (!board || !column) return;

    const boardRect = board.getBoundingClientRect();
    const columnRect = column.getBoundingClientRect();

    const target =
      board.scrollLeft +
      (columnRect.left - boardRect.left) -
      Math.max(0, (board.clientWidth - columnRect.width) / 2);

    board.scrollTo({
      left: Math.max(0, target),
      behavior: "smooth"
    });
  }

  // Impede o scrollIntoView() vertical usado pelo código antigo.
  document.addEventListener("click", event => {
    const button = event.target.closest?.("[data-status-tab]");
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    document.querySelectorAll("#statusTabs .status-tab")
      .forEach(x => x.classList.remove("active"));
    button.classList.add("active");

    scrollOnlyOrders(button.dataset.statusTab);
  }, true);

  const ready = () => {
    installStatusTabs();
    setTimeout(installStatusTabs, 300);
    setTimeout(installStatusTabs, 1000);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready, {once:true});
  } else {
    ready();
  }

  // O painel recria os filtros quando atualiza os pedidos.
  const observer = new MutationObserver(() => installStatusTabs());
  observer.observe(document.body, {childList:true, subtree:true});
})();
