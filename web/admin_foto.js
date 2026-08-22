/* MIGUEL LANCHES — fotos seguras no Supabase Storage
   - Upload da foto para o bucket público "produtos"
   - Banco guarda somente a URL pública
   - Foto quebrada/no foto -> cliente usa SEM FOTO
   - Só o admin autenticado pode enviar/alterar/excluir
*/
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const BUCKET = "produtos";
  const NO_PHOTO = "../assets/sem-foto.svg";

  const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  const toast = text => {
    if (typeof window.toast === "function") window.toast(text);
  };

  const cats = () => Array.isArray(window.cats) ? window.cats : [];

  function isStorageUrl(url) {
    return String(url || "").includes(`/storage/v1/object/public/${BUCKET}/`);
  }

  function storagePathFromUrl(url) {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const s = String(url || "");
    const i = s.indexOf(marker);
    return i >= 0 ? decodeURIComponent(s.slice(i + marker.length).split("?")[0]) : null;
  }

  function openPhotoModal(product) {
    const editing = !!product;
    const modal = $("modal");
    const body = $("body");
    if (!modal || !body) return;

    const currentImage = product?.imagem_url || NO_PHOTO;

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
            ${cats().map(c => `<option value="${esc(c.id)}" ${String(c.id)===String(product?.categoria_id)?"selected":""}>${esc(c.nome)}</option>`).join("")}
          </select>
        </label>

        <div class="photo-field">
          <label>Foto do produto
            <input id="pfFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif" capture="environment">
          </label>
          <small class="muted">Escolha uma foto da galeria ou tire uma foto com a câmera.</small>

          <div class="photo-preview-wrap">
            <img id="pfPreview" class="photo-preview"
                 src="${esc(currentImage)}"
                 alt="Pré-visualização"
                 onerror="this.onerror=null;this.src='${NO_PHOTO}'">
          </div>

          ${editing && product?.imagem_url
            ? `<button type="button" class="btn danger photo-remove" id="pfRemove">Remover foto</button>`
            : ""}
        </div>

        <small class="photo-no-image">
          A imagem será armazenada no Supabase Storage. O banco salvará somente o link.
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

    const fileInput = $("pfFile");
    const preview = $("pfPreview");

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) {
        fileInput.value = "";
        return toast("Use JPG, PNG, WEBP ou AVIF.");
      }

      if (file.size > 5 * 1024 * 1024) {
        fileInput.value = "";
        return toast("A foto deve ter no máximo 5 MB.");
      }

      const url = URL.createObjectURL(file);
      preview.src = url;
      preview.onload = () => URL.revokeObjectURL(url);
      fileInput.dataset.removeImage = "0";
    });

    $("pfRemove")?.addEventListener("click", () => {
      fileInput.dataset.removeImage = "1";
      fileInput.value = "";
      preview.src = NO_PHOTO;
    });

    $("pfCancel").onclick = () => modal.classList.add("hidden");
    $("pfSave").onclick = () => saveProduct(product);
  }

  async function uploadPhoto(file, productId) {
    const db = window.db;
    const ext = ({
      "image/jpeg":"jpg",
      "image/png":"png",
      "image/webp":"webp",
      "image/avif":"avif"
    })[file.type];

    if (!ext) throw new Error("Formato de imagem não permitido.");
    if (file.size > 5 * 1024 * 1024) throw new Error("A foto deve ter no máximo 5 MB.");

    const path = `produtos/${productId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error } = await db.storage.from(BUCKET).upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false
    });

    if (error) throw error;

    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Não foi possível gerar a URL pública da foto.");

    return { path, publicUrl: data.publicUrl };
  }

  async function deleteStorageFile(url) {
    const path = storagePathFromUrl(url);
    if (!path) return;

    const { error } = await window.db.storage.from(BUCKET).remove([path]);
    if (error) console.warn("Não foi possível remover foto antiga:", error);
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
    const removeImage = file?.dataset.removeImage === "1";
    const newFile = file?.files?.[0] || null;

    if (!name) return toast("Informe o nome.");
    if (price < 0) return toast("Preço inválido.");

    let productId = product?.id;

    // Para produto novo, cria primeiro para obter o ID da pasta do Storage.
    if (!productId) {
      const { data, error } = await db.from("produtos").insert({
        nome:name, descricao:desc, preco:price, categoria_id:category,
        imagem_url:null, ordem:order, ativo:true, destaque:false
      }).select("id").single();

      if (error) {
        if (/descricao.*column|schema cache|PGRST204/i.test(error.message || "")) {
          const retry = await db.from("produtos").insert({
            nome:name, preco:price, categoria_id:category,
            imagem_url:null, ordem:order, ativo:true, destaque:false
          }).select("id").single();
          if (retry.error) return toast("Erro ao salvar: " + retry.error.message);
          productId = retry.data.id;
        } else {
          return toast("Erro ao salvar: " + error.message);
        }
      } else {
        productId = data.id;
      }
    }

    let newUrl = product?.imagem_url || null;
    let newStoragePath = null;

    try {
      if (newFile) {
        toast("Enviando foto...");
        const uploaded = await uploadPhoto(newFile, productId);
        newUrl = uploaded.publicUrl;
        newStoragePath = uploaded.path;
      } else if (removeImage) {
        newUrl = null;
      }

      const data = {
        nome:name,
        descricao:desc,
        preco:price,
        categoria_id:category,
        imagem_url:newUrl,
        ordem:order
      };

      let result = await db.from("produtos").update(data).eq("id",productId);

      if (result.error && /descricao.*column|schema cache|PGRST204/i.test(result.error.message || "")) {
        delete data.descricao;
        result = await db.from("produtos").update(data).eq("id",productId);
      }

      if (result.error) {
        // Se o banco falhar depois do upload, não deixamos uma imagem nova quebrando a foto antiga.
        if (newStoragePath) {
          await db.storage.from(BUCKET).remove([newStoragePath]);
        }
        return toast("Erro ao salvar: " + result.error.message);
      }

      // Só apaga a foto antiga depois que a nova URL já foi salva no banco.
      if ((newFile || removeImage) && product?.imagem_url &&
          product.imagem_url !== newUrl && isStorageUrl(product.imagem_url)) {
        await deleteStorageFile(product.imagem_url);
      }

      modalClose();
      toast(newFile ? "Produto e foto salvos." : "Produto salvo.");
      if (typeof window.load === "function") await window.load();

    } catch (e) {
      if (newStoragePath) {
        await db.storage.from(BUCKET).remove([newStoragePath]);
      }
      console.error(e);
      toast("Não foi possível salvar a foto: " + (e.message || e));
    }
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

      if (novo) return openPhotoModal(null);

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
    .photo-preview-wrap{width:100%;display:flex;justify-content:center;background:#f5f5f5;border:1px solid #e5e5e5;border-radius:14px;padding:10px;overflow:hidden}
    .photo-preview{width:min(100%,320px);height:190px;object-fit:cover;border-radius:10px;background:#eee}
    .photo-no-image{display:block;padding:10px 12px;border-radius:10px;background:#fff8df;color:#7a6200;font-weight:700}
    .photo-remove{justify-self:start;color:#b42318}
  `;
  document.head.appendChild(style);
  interceptClicks();
})();
