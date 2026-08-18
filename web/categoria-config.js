/* Configuração de categorias — ingredientes e observação */
(function(){
const KEY="categoria_config";
async function load(){const r=await db.from("configuracoes").select("valor").eq("chave",KEY).maybeSingle();try{return JSON.parse(r.data?.valor||"{}")}catch{return{}}}
async function save(v){const r=await db.from("configuracoes").upsert({chave:KEY,valor:JSON.stringify(v)},{onConflict:"chave"});if(r.error)throw r.error}
async function render(){
 const box=document.getElementById("adminContent");if(!box)return;
 const cfg=await load(), cats=(window.state?.cats||[]);
 box.innerHTML=`<div class="panel"><h2>⚙️ Opções por categoria</h2><p>Defina o que aparece para o cliente em cada categoria.</p>
 ${cats.map(c=>{let x=cfg[c.id]||{ingredientes:true,observacao:true};return `<div class="catcfg"><strong>${c.emoji||"📦"} ${c.nome}</strong><label><input type="checkbox" data-id="${c.id}" data-k="ingredientes" ${x.ingredientes!==false?"checked":""}> Ingredientes adicionais</label><label><input type="checkbox" data-id="${c.id}" data-k="observacao" ${x.observacao!==false?"checked":""}> Observação</label></div>`}).join("")}
 <button class="primary" id="saveCatCfg">Salvar configurações</button></div>`;
 box.querySelector("#saveCatCfg").onclick=async()=>{box.querySelectorAll("[data-id]").forEach(e=>{cfg[e.dataset.id]??={ingredientes:true,observacao:true};cfg[e.dataset.id][e.dataset.k]=e.checked});try{await save(cfg);alert("Configurações salvas.")}catch(e){alert(e.message)}};
}
function hook(){const t=document.querySelector('.admin-tab[data-admin="categorias"]');if(!t)return setTimeout(hook,300);t.addEventListener("click",()=>setTimeout(render,100))}
hook();
})();