/* Miguel Lanches — patch dos botões de categoria */
(() => {
  function patch() {
    document.querySelectorAll("[data-del-cat]").forEach(btn => {
      if (btn.dataset.deletePatched === "1") return;
      btn.dataset.deletePatched = "1";
      btn.onclick = () => window.adminDeleteCategory(btn.dataset.delCat);
    });
  }
  new MutationObserver(patch).observe(document.body, {childList:true,subtree:true});
  setTimeout(patch, 200);
  setTimeout(patch, 800);
})();
