/* MIGUEL LANCHES — foto padrão para produtos sem foto */
(() => {
  "use strict";
  const NO_PHOTO = "assets/sem-foto.svg";
  const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const products = () => Array.isArray(window.products) ? window.products : [];
  const hasImage = p => !!String(p?.imagem_url || p?.imagem || p?.image_url || "").trim();
  const findByName = name => products().find(p => String(p.nome || "") === String(name || ""));

  function fixImages(root = document) {
    root.querySelectorAll(".product img, .highlight img").forEach(img => {
      const p = findByName(img.alt || "");
      if (!p || hasImage(p)) return;
      if (img.dataset.noPhotoFixed === "1") return;
      img.dataset.noPhotoFixed = "1";
      img.src = NO_PHOTO;
      img.alt = p.nome;
    });
  }

  function fixEmojiFallbacks(root = document) {
    root.querySelectorAll(".product-img, .highlight-img").forEach(box => {
      if (box.querySelector("img")) return;
      const text = box.textContent.trim();
      if (!text) {
        box.innerHTML = `<img src="${NO_PHOTO}" alt="Sem foto">`;
      }
    });
  }

  function run() {
    fixImages();
    fixEmojiFallbacks();
  }

  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList:true, subtree:true });
  setInterval(run, 1200);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, {once:true});
  else run();
})();
