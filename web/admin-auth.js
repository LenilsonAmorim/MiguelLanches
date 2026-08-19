/* Miguel Lanches — acesso protegido da Administração */
(() => {
  const db = window.db;
  if (!db) return;
  let isAdmin = false;

  const style=document.createElement("style");
  style.textContent=`
    #mlAdminLock{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px}
    #mlAdminLock.hidden{display:none}
    .ml-auth-box{width:min(420px,100%);background:#fff;border-radius:20px;padding:24px;box-shadow:0 18px 60px rgba(0,0,0,.28)}
    .ml-auth-box h2{margin:0 0 6px}.ml-auth-box p{margin:0 0 18px;color:#667085}
    .ml-auth-box label{display:block;font-weight:700;margin:12px 0 6px}
    .ml-auth-box input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #d0d5dd;border-radius:11px;font-size:16px}
    .ml-auth-actions{display:flex;gap:9px;margin-top:18px}
    .ml-auth-actions button{flex:1;padding:13px;border-radius:11px;border:0;font-weight:800;font-size:15px}
    #mlAuthLogin{background:#b71924;color:#fff}.ml-auth-cancel{background:#f2f4f7;color:#344054}
    #mlAuthMsg{min-height:20px;margin-top:10px;color:#b42318;font-size:14px}
    .ml-admin-session{display:flex;gap:8px;align-items:center;margin-left:auto}
    .ml-admin-session small{color:#667085}.ml-admin-session button{border:1px solid #d0d5dd;background:#fff;border-radius:9px;padding:7px 10px;font-weight:700}
  `;
  document.head.appendChild(style);

  const modal=document.createElement("div");
  modal.id="mlAdminLock";modal.className="hidden";
  modal.innerHTML=`
    <div class="ml-auth-box">
      <h2>🔐 Administração</h2>
      <p>Entre com a conta de administrador para gerenciar o cardápio.</p>
      <label>E-mail</label>
      <input id="mlAuthEmail" type="email" autocomplete="username" placeholder="seu@email.com">
      <label>Senha</label>
      <input id="mlAuthPassword" type="password" autocomplete="current-password" placeholder="Sua senha">
      <div id="mlAuthMsg"></div>
      <div class="ml-auth-actions">
        <button class="ml-auth-cancel" id="mlAuthCancel">Cancelar</button>
        <button id="mlAuthLogin">Entrar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const msg=t=>document.getElementById("mlAuthMsg").textContent=t||"";
  const open=()=>{msg("");modal.classList.remove("hidden");setTimeout(()=>document.getElementById("mlAuthEmail").focus(),50)};
  const close=()=>modal.classList.add("hidden");

  async function checkAdmin(session){
    if(!session){isAdmin=false;return false}
    const r=await db.rpc("is_admin");
    isAdmin=!r.error && r.data===true;
    return isAdmin;
  }

  async function requireAdmin(){
    const {data}=await db.auth.getSession();
    if(await checkAdmin(data.session)) return true;
    open();return false;
  }

  document.getElementById("mlAuthCancel").onclick=close;
  modal.addEventListener("click",e=>{if(e.target===modal)close()});

  document.getElementById("mlAuthLogin").onclick=async()=>{
    const email=document.getElementById("mlAuthEmail").value.trim();
    const password=document.getElementById("mlAuthPassword").value;
    if(!email||!password){msg("Informe e-mail e senha.");return}
    msg("Entrando...");
    const r=await db.auth.signInWithPassword({email,password});
    if(r.error){msg(r.error.message||"Não foi possível entrar.");return}
    if(!await checkAdmin(r.data.session)){
      await db.auth.signOut();
      msg("Esta conta não tem permissão de administrador.");
      return;
    }
    close();
    const adminBtn=document.querySelector('.nav-item[data-page="admin"]');
    if(adminBtn) adminBtn.click();
    refreshAdminSession();
  };

  function refreshAdminSession(){
    const host=document.querySelector(".top-actions");
    if(!host)return;
    let el=document.getElementById("mlAdminSession");
    if(!isAdmin){if(el)el.remove();return}
    if(el)return;
    el=document.createElement("div");
    el.id="mlAdminSession";el.className="ml-admin-session";
    el.innerHTML=`<small>🔐 Admin</small><button type="button" id="mlAdminLogout">Sair</button>`;
    host.appendChild(el);
    el.querySelector("#mlAdminLogout").onclick=async()=>{await db.auth.signOut();location.reload()};
  }

  document.addEventListener("click",async e=>{
    const btn=e.target.closest?.('.nav-item[data-page="admin"]');
    if(!btn)return;
    if(isAdmin){refreshAdminSession();return}
    e.preventDefault();e.stopImmediatePropagation();
    await requireAdmin();
  },true);

  db.auth.onAuthStateChange(async(_event,session)=>{
    await checkAdmin(session);refreshAdminSession();
  });

  setTimeout(async()=>{
    const {data}=await db.auth.getSession();
    await checkAdmin(data.session);refreshAdminSession();
  },500);
})();