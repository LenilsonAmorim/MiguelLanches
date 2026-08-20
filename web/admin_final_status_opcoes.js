/* MIGUEL LANCHES — ADMIN FINAL
   Produto: disponível/esgotado + excluir
   Opções: disponível/esgotado + criar/editar/excluir
*/
(() => {
"use strict";
const cfg=window.ML_CONFIG||{};
const S=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const toastM=t=>typeof window.toast==="function"?window.toast(t):alert(t);
const close=()=>$("modal")?.classList.add("hidden");
const open=h=>{ $("body").innerHTML=h; $("modal").classList.remove("hidden"); };

function typeFor(p){
 const c=String(p?.categorias?.nome||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 if(c.includes("pizza")||c.includes("pastel")) return "sabor_preco";
 if(c.includes("suco")||c.includes("milk")||c.includes("creme")||c.includes("acai")) return "sabor";
 return "adicional_preco";
}

async function opts(pid){
 const [c,o]=await Promise.all([
   S.from("configuracao_opcoes").select("*").eq("produto_id",pid).maybeSingle(),
   S.from("opcoes_produto").select("*").eq("produto_id",pid).order("ordem")
 ]);
 return {c:c.data,o:o.data||[],e:c.error||o.error};
}

function row(o){
 return `<div class="ml-opt-row" data-id="${esc(o?.id||"")}">
   <input class="ml-opt-name" placeholder="Nome" value="${esc(o?.nome||"")}">
   <input class="ml-opt-price" type="number" min="0" step=".01" placeholder="Adicional" value="${Number(o?.preco_adicional||0)}">
   <label><input class="ml-opt-active" type="checkbox" ${o?.ativo!==false?"checked":""}> Disponível</label>
   <button type="button" class="table-btn ml-opt-delete">Excluir</button>
 </div>`;
}

window.openProductOptions=async p=>{
 const r=await opts(p.id);
 if(r.e){toastM("Erro ao carregar opções: "+r.e.message);return;}
 const c=r.c||{tipo:typeFor(p),limite:1};
 open(`<div class="ml-options-editor">
   <div class="muted">OPÇÕES DO PRODUTO</div><h2>${esc(p.nome)}</h2>
   <label>Tipo
    <select id="mlType">
     <option value="sabor_preco" ${c.tipo==="sabor_preco"?"selected":""}>Sabores + valor</option>
     <option value="adicional_preco" ${c.tipo==="adicional_preco"?"selected":""}>Adicionais + valor</option>
     <option value="sabor" ${c.tipo==="sabor"?"selected":""}>Sabores sem valor</option>
     <option value="nenhuma" ${c.tipo==="nenhuma"?"selected":""}>Sem opções</option>
    </select>
   </label>
   <label>Limite de escolhas
    <input id="mlLimit" type="number" min="1" max="20" value="${Math.max(1,Number(c.limite||1))}">
   </label>
   <div class="ml-option-list" id="mlOptionList">${r.o.map(row).join("")}</div>
   <button type="button" class="btn" id="mlAddOption">+ Adicionar opção</button>
   <div class="modal-actions"><button type="button" class="btn" id="mlClose">Cancelar</button><button type="button" class="btn primary" id="mlSave">Salvar opções</button></div>
 </div>`);
 $("mlAddOption").onclick=()=>$("mlOptionList").insertAdjacentHTML("beforeend",row(null));
 $("mlClose").onclick=close;
 $("mlSave").onclick=async()=>{
   const type=$("mlType").value, limit=Math.max(1,Math.min(20,Number($("mlLimit").value||1)));
   let q=await S.from("configuracao_opcoes").upsert({produto_id:p.id,tipo:type,limite,updated_at:new Date().toISOString()},{onConflict:"produto_id"});
   if(q.error){toastM(q.error.message);return;}
   const rows=[...document.querySelectorAll(".ml-opt-row")];
   for(let i=0;i<rows.length;i++){
     const x=rows[i], name=x.querySelector(".ml-opt-name").value.trim();
     if(!name) continue;
     const data={produto_id:p.id,nome:name,preco_adicional:Number(x.querySelector(".ml-opt-price").value||0),ativo:x.querySelector(".ml-opt-active").checked,ordem:i};
     const id=x.dataset.id;
     q=id?await S.from("opcoes_produto").update(data).eq("id",id):await S.from("opcoes_produto").insert(data);
     if(q.error){toastM(q.error.message);return;}
   }
   toastM("Opções salvas.");close();
 };
 document.querySelectorAll(".ml-opt-delete").forEach(b=>b.onclick=async()=>{
   const x=b.closest(".ml-opt-row"), id=x.dataset.id;
   if(!id){x.remove();return;}
   if(!confirm("Excluir esta opção?"))return;
   const q=await S.from("opcoes_produto").delete().eq("id",id);
   if(q.error)toastM(q.error.message);else x.remove();
 });
};

window.renderProducts=()=>{
 const q=($("ps")?.value||"").toLowerCase();
 const list=(typeof products!=="undefined"?products:[]).filter(p=>String(p.nome||"").toLowerCase().includes(q));
 $("products").innerHTML=list.map(p=>`
 <tr>
  <td><b>${esc(p.nome)}</b></td><td>${esc(p.categorias?.nome||"Sem categoria")}</td><td>${money(p.preco)}</td>
  <td><button class="table-btn ${p.ativo===false?"ml-soldout":""}" data-av="${esc(p.id)}">${p.ativo===false?"ESGOTADO":"Disponível"}</button></td>
  <td><button class="table-btn" data-feat="${esc(p.id)}">${p.destaque?"★ Destaque":"☆ Destacar"}</button></td>
  <td><button class="table-btn" data-edit="${esc(p.id)}">Editar</button><button class="table-btn" data-opt="${esc(p.id)}">Opções</button><button class="table-btn ml-delete" data-del="${esc(p.id)}">Excluir</button></td>
 </tr>`).join("")||`<tr><td colspan="6">Nenhum produto encontrado.</td></tr>`;

 document.querySelectorAll("[data-av]").forEach(b=>b.onclick=async()=>{
   const p=list.find(x=>String(x.id)===String(b.dataset.av)); if(!p)return;
   const q=await S.from("produtos").update({ativo:p.ativo===false}).eq("id",p.id);
   if(q.error)toastM(q.error.message);else{toastM(p.ativo===false?"Produto disponível":"Produto esgotado");if(typeof load==="function")load();}
 });
 document.querySelectorAll("[data-feat]").forEach(b=>b.onclick=async()=>{
   const p=list.find(x=>String(x.id)===String(b.dataset.feat));if(!p)return;
   const q=await S.from("produtos").update({destaque:!p.destaque}).eq("id",p.id);
   if(q.error)toastM(q.error.message);else if(typeof load==="function")load();
 });
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{
   const p=list.find(x=>String(x.id)===String(b.dataset.edit));if(p&&typeof productModal==="function")productModal(p);
 });
 document.querySelectorAll("[data-opt]").forEach(b=>b.onclick=()=>{
   const p=list.find(x=>String(x.id)===String(b.dataset.opt));if(p)openProductOptions(p);
 });
 document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{
   const p=list.find(x=>String(x.id)===String(b.dataset.del));if(!p)return;
   if(!confirm(`Excluir "${p.nome}" definitivamente?`))return;
   const q=await S.from("produtos").delete().eq("id",p.id);
   if(q.error)toastM("Erro ao excluir: "+q.error.message);else{toastM("Produto excluído.");if(typeof load==="function")load();}
 });
};

const st=document.createElement("style");st.textContent=`
.ml-soldout{background:#fff0f0!important;color:#c62828!important;border-color:#efb2b2!important;font-weight:900!important}
.ml-delete{color:#c62828!important;border-color:#efb2b2!important}
.ml-options-editor{display:grid;gap:12px}.ml-options-editor label{display:grid;gap:5px;font-weight:800;font-size:13px}
.ml-options-editor input,.ml-options-editor select{padding:11px;border:1px solid #ddd;border-radius:10px}
.ml-option-list{display:grid;gap:8px}.ml-opt-row{display:grid;grid-template-columns:1fr 130px auto auto;gap:7px;align-items:center;border:1px solid #eee;padding:8px;border-radius:10px}
.ml-opt-row label{display:flex;align-items:center;gap:5px;white-space:nowrap}.ml-opt-row input{min-width:0}
@media(max-width:650px){.ml-opt-row{grid-template-columns:1fr 1fr}.ml-opt-row label{grid-column:1}.ml-opt-row button{grid-column:2}.table-btn{margin:2px}}
`;document.head.appendChild(st);
setTimeout(()=>{if(typeof renderProducts==="function")renderProducts();},100);
})();