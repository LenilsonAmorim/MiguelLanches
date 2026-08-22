/* MIGUEL LANCHES — fallback definitivo de imagens */
(() => {
  "use strict";
  const NO_PHOTO = "../assets/sem-foto.svg";

  function guard(root=document) {
    root.querySelectorAll(
      ".product img,.highlight img,.product-hero img,.highlight-img img"
    ).forEach(img => {
      if (img.dataset.mlPhotoGuard === "1") return;
      img.dataset.mlPhotoGuard = "1";
      img.addEventListener("error", () => {
        img.onerror = null;
        img.src = NO_PHOTO;
      }, {once:true});
    });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => guard(), {once:true});
  else guard();

  new MutationObserver(() => guard())
    .observe(document.body, {childList:true, subtree:true});
})();
