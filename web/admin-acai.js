
/* Admin das coberturas do Açaí: salva na tabela configuracoes */
async function renderAcaiAdmin(container){
 const r=await db.from("configuracoes").select("valor").eq("chave","acai_coberturas").maybeSingle();
 let list=[];try{list=JSON.parse(r.data?.valor||"[]")}catch{}
 container.innerHTML=`<div class="panel"><h2>🍧 Coberturas do Açaí</h2>
 <div class="form"><label>Nome da cobertura<input id="acaiNome" placeholder="Ex.: Morango"></label>
 <button class="primary" id="acaiAdd">+ Adicionar cobertura</button></div>
 <div id="acaiList">${list.map((x,i)=>`<div class="admin-row"><div class="grow"><h3>${esc(x.nome)}</h3></div><div class="row-actions"><button class="mini" onclick="acaiEdit(${i})">Editar</button><button class="mini danger" onclick="acaiDel(${i})">Excluir</button></div></div>`).join("")||'<div class="empty">Nenhuma cobertura cadastrada.</div>'}</div></div>`;
 const save=async()=>{const q=await db.from("configuracoes").upsert({chave:"acai_coberturas",valor:JSON.stringify(list)},{onConflict:"chave"});if(q.error)alert(q.error.message);else renderAcaiAdmin(container)};
 window.acaiEdit=async i=>{const n=prompt("Nome da cobertura:",list[i].nome);if(n===null)return;list[i].nome=n.trim();await save()};
 window.acaiDel=async i=>{if(!confirm("Excluir esta cobertura?"))return;list.splice(i,1);await save()};
 $("acaiAdd").onclick=async()=>{const n=$("acaiNome").value.trim();if(!n)return alert("Informe a cobertura.");list.push({nome:n,ativo:true});await save()};
}
