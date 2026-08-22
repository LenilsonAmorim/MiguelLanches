/* MIGUEL LANCHES — fallback de foto do cliente
   Produtos sem imagem usam ../assets/sem-foto.svg.
   Produtos com imagem cadastrada continuam usando a imagem cadastrada.
*/
(() => {
  "use strict";

  const NO_PHOTO = "../assets/sem-foto.svg";

  const getProducts = () =>
    Array.isArray(window.products) ? window.products : [];

  const getImage = p =>
    String(p?.imagem_url || p?.imagem || p?.image_url || "").trim();

  const findProduct = (img) => {
    const alt = img?.alt || "";
    return getProducts().find(p => String(p?.nome || "") === String(alt));
  };

  function applyFallback(root = document) {
    root.querySelectorAll(
      ".product img, .highlight img, .product-hero img, .highlight-img img"
    ).forEach(img => {
      const p = findProduct(img);
      if (!p) return;

      // Se o produto não possui foto cadastrada, SEM FOTO é obrigatório.
      if (!getImage(p)) {
        img.onerror = null;
        img.src = NO_PHOTO;
        img.dataset.noPhoto = "1";
        return;
      }

      // Se a foto cadastrada não carregar, mostra SEM FOTO,
      // em vez de voltar para uma foto genérica de outra categoria.
      if (img.dataset.photoErrorBound !== "1") {
        img.dataset.photoErrorBound = "1";
        img.addEventListener("error", () => {
          img.onerror = null;
          img.src = NO_PHOTO;
          img.dataset.noPhoto = "1";
        }, { once: true });
      }
    });

    root.querySelectorAll(".product-img, .highlight-img, .product-hero").forEach(box => {
      if (box.querySelector("img")) return;
      const text = box.textContent.trim();

      if (!text || /^[^\wÀ-ÿ]*$/.test(text)) {
        box.innerHTML = `<img src="${NO_PHOTO}" alt="Sem foto">`;
      }
    });
  }

  function run() {
    try { applyFallback(); } catch (e) { console.warn("Fallback de fotos:", e); }
  }

  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }

  // Garante a correção depois de renderizações assíncronas do cardápio.
  setInterval(run, 1200);
})();
