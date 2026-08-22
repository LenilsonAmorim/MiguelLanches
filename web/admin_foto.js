/* MIGUEL LANCHES — cadastro de foto do produto
   A edição usa somente foto do aparelho.
   Não pede URL.
   Sem foto -> o cliente usa ../assets/sem-foto.svg.
*/
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  function toast(text) {
    if (typeof window.toast === "function") window.toast(text);
  }

  function cats() {
    return Array.isArray(window.cats) ? window.cats : [];
  }

  function openPhotoModal(product) {
    const editing = !!product;
    const modal = $("modal");
    const body = $("body");
    if (!modal || !body) return;

    const currentImage = product?.imagem_url || "../assets/sem-foto.svg";

    body.innerHTML = `
      <h2>${editing ? "Editar produto" : "Novo produto"}</h2>
      <div class="modal-form photo-product-form">
        <label>Nome
          <input id="pfName" value="${esc(product?.nome || "")}" autocomplete="off">
        </label>

        <label>Descrição
          <textarea id="pfDesc" rows="3">${esc(product?.descricao || "")}</textarea>
        </label>

        <label>Preço
          <input id="pfPrice" type="number" min="0" step="0.01" value="${product?.preco ?? ""}">
        </label>

        <label>Categoria
          <select id="pfCat">
            ${cats().map(c => `<option value="${esc(c.id)}" ${String(c.id) === String(product?.categoria_id) ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}
          </select>
        </label>

        <div class="photo-field">
          <label>Foto do produto
            <input id="pfFile" type="file" accept="image/*" capture="environment">
          </label>
          <small class="muted">
            Escolha uma foto da galeria ou tire uma foto com a câmera.
          </small>

          <div class="photo-preview-wrap">
            <img id="pfPreview"
                 class="photo-preview"
                 src="${esc(currentImage)}"
                 alt="Pré-visualização"
                 onerror="this.onerror=null;this.src='../assets/sem-foto.svg';">
          </div>

          ${editing && product?.imagem_url
            ? `<button type="button" class="btn danger photo-remove" id="pfRemove">Remover foto</button>`
            : ""}
        </div>

        <small class="photo-no-image">
          Se não cadastrar uma foto, o cliente mostrará automaticamente “SEM FOTO”.
        </small>

        <label>Ordem
          <input id="pfOrder" type="number" value="${product?.ordem ?? 0}">
        </label>

        <div class="modal-actions">
          <button class="btn" id="pfCancel" type="button">Cancelar</button>
          <button class="btn primary" id="pfSave" type="button">Salvar</button>
        </div>
      </div>`;

    modal.classList.remove("hidden");

    const preview = $("pfPreview");
    const fileInput = $("pfFile");

    const setPreview = src => {
      if (preview) {
        preview.src = src || "../assets/sem-foto.svg";
        preview.onerror = () => {
          preview.onerror = null;
          preview.src = "../assets/sem-foto.svg";
        };
      }
    };

    fileInput?.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        fileInput.value = "";
        return toast("Escolha uma imagem válida.");
      }

      try {
        const dataUrl = await compressImage(file);
        fileInput.dataset.imageData = dataUrl;
        fileInput.dataset.removeImage = "0";
        setPreview(dataUrl);
      } catch (e) {
        console.error(e);
        fileInput.value = "";
        toast("Não foi possível preparar a foto.");
      }
    });

    $("pfRemove")?.addEventListener("click", () => {
      fileInput.dataset.removeImage = "1";
      fileInput.value = "";
      delete fileInput.dataset.imageData;
      setPreview("../assets/sem-foto.svg");
    });

    $("pfCancel").onclick = () => modal.classList.add("hidden");
    $("pfSave").onclick = () => saveProduct(product);
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () =>
        reject(reader.error || new Error("Falha ao ler imagem"));

      reader.onload = () => {
        const img = new Image();

        img.onerror = () => reject(new Error("Imagem inválida"));

        img.onload = () => {
          const max = 1000;
          const scale = Math.min(1, max / Math.max(img.width, img.height));

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));

          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas indisponível"));

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };

        img.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  async function saveProduct(product) {
    const db = window.db;
    if (!db) return toast("Banco de dados não conectado.");

    const name = $("pfName")?.value.trim();
    const price = Number($("pfPrice")?.value || 0);
    const category = $("pfCat")?.value || null;
    const desc = $("pfDesc")?.value.trim() || null;
    const order = Number($("pfOrder")?.value || 0);
    const file = $("pfFile");

    const uploaded = file?.dataset.imageData || "";
    const removeImage = file?.dataset.removeImage === "1";

    let imageUrl;

    if (uploaded) {
      imageUrl = uploaded;
    } else if (removeImage) {
      imageUrl = null;
    } else {
      // Ao editar, mantém a foto atual se o usuário não escolher outra.
      imageUrl = product?.imagem_url || null;
    }

    if (!name) return toast("Informe o nome.");
    if (price < 0) return toast("Preço inválido.");

    const data = {
      nome: name,
      descricao: desc,
      preco: price,
      categoria_id: category,
      imagem_url: imageUrl,
      ordem: order
    };

    const result = product
      ? await db.from("produtos").update(data).eq("id", product.id)
      : await db.from("produtos").insert({
          ...data,
          ativo: true,
          destaque: false
        });

    if (result.error) {
      if (/descricao.*column|schema cache|PGRST204/i.test(result.error.message || "")) {
        delete data.descricao;

        const retry = product
          ? await db.from("produtos").update(data).eq("id", product.id)
          : await db.from("produtos").insert({
              ...data,
              ativo: true,
              destaque: false
            });

        if (retry.error)
          return toast("Erro ao salvar: " + retry.error.message);
      } else {
        return toast("Erro ao salvar: " + result.error.message);
      }
    }

    modalClose();
    toast("Produto salvo.");
    if (typeof window.load === "function") await window.load();
  }

  function modalClose() {
    $("modal")?.classList.add("hidden");
  }

  function interceptClicks() {
    document.addEventListener("click", e => {
      const edit = e.target.closest?.("[data-edit]");
      const novo = e.target.closest?.("#newProduct");

      if (!edit && !novo) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      if (novo) {
        openPhotoModal(null);
        return;
      }

      const id = edit.dataset.edit;
      const list = Array.isArray(window.products) ? window.products : [];
      const product = list.find(p => String(p.id) === String(id));

      if (product) openPhotoModal(product);
    }, true);
  }

  const style = document.createElement("style");
  style.textContent = `
    .photo-product-form{gap:12px}
    .photo-field{display:grid;gap:7px}
    .photo-preview-wrap{
      width:100%;
      display:flex;
      justify-content:center;
      background:#f5f5f5;
      border:1px solid #e5e5e5;
      border-radius:14px;
      padding:10px;
      overflow:hidden
    }
    .photo-preview{
      width:min(100%,320px);
      height:190px;
      object-fit:cover;
      border-radius:10px;
      background:#eee
    }
    .photo-no-image{
      display:block;
      padding:10px 12px;
      border-radius:10px;
      background:#fff8df;
      color:#7a6200;
      font-weight:700
    }
    .photo-remove{
      justify-self:start;
      color:#b42318
    }
  `;

  document.head.appendChild(style);
  interceptClicks();
})();
