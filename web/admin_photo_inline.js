/* MIGUEL LANCHES — FORMULÁRIO DE FOTO DIRETO NO ADMIN
   Corrige o formulário antigo (Emoji + Imagem URL).
   O script é carregado DEPOIS do admin.js e intercepta os cliques antes
   do handler antigo, sem mexer na lógica de pedidos/destaques.
*/
(() => {
  "use strict";

  const BUCKET = "produtos";
  const NO_PHOTO = "../assets/sem-foto.svg";
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  const toast = msg => typeof window.toast === "function"
    ? window.toast(msg) : console.log(msg);

  function openPhotoProduct(product) {
    const editing = !!product;
    const cats = Array.isArray(window.cats) ? window.cats : [];
    const modal = $("modal");
    const body = $("body");
    if (!modal || !body) return;

    body.innerHTML = `
      <h2>${editing ? "Editar produto" : "Novo produto"}</h2>
      <div class="modal-form ml-photo-form">
        <label>Nome
          <input id="mlpName" value="${esc(product?.nome || "")}">
        </label>

        <label>Descrição
          <textarea id="mlpDesc" rows="3">${esc(product?.descricao || "")}</textarea>
        </label>

        <label>Preço
          <input id="mlpPrice" type="number" min="0" step="0.01"
                 value="${product?.preco ?? ""}">
        </label>

        <label>Categoria
          <select id="mlpCat">
            ${cats.map(c => `
              <option value="${esc(c.id)}"
                ${String(c.id) === String(product?.categoria_id) ? "selected" : ""}>
                ${esc(c.nome)}
              </option>`).join("")}
          </select>
        </label>

        <div class="ml-photo-box">
          <label>📷 Foto do produto
            <input id="mlpFile" type="file"
                   accept="image/jpeg,image/png,image/webp,image/avif"
                   capture="environment">
          </label>
          <small class="muted">
            Escolha uma foto da galeria ou tire uma foto com a câmera.
          </small>

          <div class="ml-photo-preview">
            <img id="mlpPreview"
                 src="${esc(product?.imagem_url || NO_PHOTO)}"
                 alt="Prévia da foto"
                 onerror="this.onerror=null;this.src='${NO_PHOTO}'">
          </div>

          ${editing && product?.imagem_url
            ? `<button type="button" class="btn danger" id="mlpRemove">Remover foto</button>`
            : ""}
        </div>

        <small class="ml-photo-info">
          A foto será armazenada no Supabase Storage. O banco guarda somente a URL.
        </small>

        <label>Ordem
          <input id="mlpOrder" type="number" value="${product?.ordem ?? 0}">
        </label>

        <div class="modal-actions">
          <button class="btn" id="mlpCancel" type="button">Cancelar</button>
          <button class="btn primary" id="mlpSave" type="button">Salvar</button>
        </div>
      </div>`;

    modal.classList.remove("hidden");

    const file = $("mlpFile");
    const preview = $("mlpPreview");

    file?.addEventListener("change", () => {
      const f = file.files?.[0];
      if (!f) return;

      if (!["image/jpeg","image/png","image/webp","image/avif"].includes(f.type))
        return toast("Use JPG, PNG, WEBP ou AVIF.");

      if (f.size > 5 * 1024 * 1024)
        return toast("A foto deve ter no máximo 5 MB.");

      const u = URL.createObjectURL(f);
      preview.src = u;
      preview.onload = () => URL.revokeObjectURL(u);
    });

    $("mlpRemove")?.addEventListener("click", () => {
      file.value = "";
      file.dataset.remove = "1";
      preview.src = NO_PHOTO;
    });

    $("mlpCancel").onclick = () => modal.classList.add("hidden");
    $("mlpSave").onclick = () => savePhotoProduct(product);
  }

  function storagePath(url) {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const s = String(url || "");
    const i = s.indexOf(marker);
    return i < 0 ? null : decodeURIComponent(s.slice(i + marker.length).split("?")[0]);
  }

  async function upload(file, productId) {
    const db = window.db;
    const ext = ({
      "image/jpeg":"jpg",
      "image/png":"png",
      "image/webp":"webp",
      "image/avif":"avif"
    })[file.type];

    const path = `produtos/${productId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const r = await db.storage.from(BUCKET).upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false
    });
    if (r.error) throw r.error;

    const p = db.storage.from(BUCKET).getPublicUrl(path);
    if (!p.data?.publicUrl) throw new Error("Não foi possível gerar a URL da foto.");

    return { path, url: p.data.publicUrl };
  }

  async function savePhotoProduct(product) {
    const db = window.db;
    if (!db) return toast("Banco de dados não conectado.");

    const name = $("mlpName").value.trim();
    const price = Number($("mlpPrice").value || 0);
    const category = $("mlpCat").value || null;
    const desc = $("mlpDesc").value.trim() || null;
    const order = Number($("mlpOrder").value || 0);
    const fileInput = $("mlpFile");
    const file = fileInput.files?.[0] || null;
    const remove = fileInput.dataset.remove === "1";

    if (!name) return toast("Informe o nome.");
    if (price < 0) return toast("Preço inválido.");

    let id = product?.id;
    let oldUrl = product?.imagem_url || null;
    let newUrl = oldUrl;
    let uploadedPath = null;

    try {
      // Produto novo: cria primeiro para obter o ID.
      if (!id) {
        const r = await db.from("produtos").insert({
          nome: name,
          descricao: desc,
          preco: price,
          categoria_id: category,
          imagem_url: null,
          ordem: order,
          ativo: true,
          destaque: false
        }).select("id").single();

        if (r.error) {
          if (/descricao.*column|schema cache|PGRST204/i.test(r.error.message || "")) {
            const retry = await db.from("produtos").insert({
              nome: name,
              preco: price,
              categoria_id: category,
              imagem_url: null,
              ordem: order,
              ativo: true,
              destaque: false
            }).select("id").single();
            if (retry.error) throw retry.error;
            id = retry.data.id;
          } else throw r.error;
        } else id = r.data.id;
      }

      if (file) {
        toast("Enviando foto...");
        const uploaded = await upload(file, id);
        newUrl = uploaded.url;
        uploadedPath = uploaded.path;
      } else if (remove) {
        newUrl = null;
      }

      const data = {
        nome: name,
        descricao: desc,
        preco: price,
        categoria_id: category,
        imagem_url: newUrl,
        ordem: order
      };

      let r = await db.from("produtos").update(data).eq("id", id);

      if (r.error && /descricao.*column|schema cache|PGRST204/i.test(r.error.message || "")) {
        delete data.descricao;
        r = await db.from("produtos").update(data).eq("id", id);
      }

      if (r.error) {
        if (uploadedPath)
          await db.storage.from(BUCKET).remove([uploadedPath]);
        throw r.error;
      }

      // Só remove a antiga depois da nova URL estar salva.
      if ((file || remove) && oldUrl && oldUrl !== newUrl) {
        const oldPath = storagePath(oldUrl);
        if (oldPath)
          await db.storage.from(BUCKET).remove([oldPath]);
      }

      $("modal")?.classList.add("hidden");
      toast(file ? "Produto e foto salvos." : "Produto salvo.");
      if (typeof window.load === "function") await window.load();

    } catch (e) {
      if (uploadedPath)
        await db.storage.from(BUCKET).remove([uploadedPath]);
      console.error(e);
      toast("Erro ao salvar: " + (e.message || e));
    }
  }

  // CAPTURE: roda antes do onclick antigo do admin.js.
  document.addEventListener("click", e => {
    const edit = e.target.closest?.("[data-edit]");
    const novo = e.target.closest?.("#newProduct");

    if (!edit && !novo) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (novo) {
      openPhotoProduct(null);
      return;
    }

    const id = edit.dataset.edit;
    const list = Array.isArray(window.products) ? window.products : [];
    const product = list.find(p => String(p.id) === String(id));

    if (product) openPhotoProduct(product);
  }, true);

  const style = document.createElement("style");
  style.textContent = `
    .ml-photo-form{gap:12px}
    .ml-photo-box{display:grid;gap:8px}
    .ml-photo-preview{
      display:flex;justify-content:center;align-items:center;
      width:100%;min-height:190px;padding:10px;
      background:#f5f5f5;border:1px solid #ddd;border-radius:14px;
      overflow:hidden
    }
    .ml-photo-preview img{
      width:min(100%,320px);height:190px;object-fit:cover;
      border-radius:10px;background:#eee
    }
    .ml-photo-info{
      display:block;padding:10px 12px;border-radius:10px;
      background:#fff8df;color:#725900;font-weight:700
    }
  `;
  document.head.appendChild(style);
})();
