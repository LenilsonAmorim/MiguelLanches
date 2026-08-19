/* Miguel Lanches — proteção do site ADMIN */
(() => {
  const SUPABASE_URL = "https://lifsxhyeqwppfvajvhpn.supabase.co";
  const SUPABASE_KEY = "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";

  if (!window.supabase) return;

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let isAdmin = false;

  const style = document.createElement("style");
  style.textContent = `
    #mlAdminLock{position:fixed;inset:0;background:rgba(0,0,0,.68);z-index:999999;display:flex;align-items:center;justify-content:center;padding:18px}
    #mlAdminLock.hidden{display:none}
    .ml-auth-box{width:min(420px,100%);background:#fff;border-radius:20px;padding:24px;box-shadow:0 18px 60px rgba(0,0,0,.35)}
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

  const modal = document.createElement("div");
  modal.id = "mlAdminLock";
  modal.innerHTML = `
    <div class="ml-auth-box">
      <h2>🔐 Administração</h2>
      <p>Entre para acessar o painel do Miguel Lanches.</p>
      <label>Usuário</label>
      <input id="mlAuthUser" type="text" autocomplete="username" placeholder="admin">
      <label>Senha</label>
      <input id="mlAuthPassword" type="password" autocomplete="current-password" placeholder="Senha">
      <div id="mlAuthMsg"></div>
      <div class="ml-auth-actions">
        <button class="ml-auth-cancel" id="mlAuthCancel" type="button">Cancelar</button>
        <button id="mlAuthLogin" type="button">Entrar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const msg = t => document.getElementById("mlAuthMsg").textContent = t || "";
  const open = () => {
    msg("");
    modal.classList.remove("hidden");
    setTimeout(() => document.getElementById("mlAuthUser").focus(), 100);
  };
  const close = () => modal.classList.add("hidden");

  async function checkAdmin(session) {
    if (!session) {
      isAdmin = false;
      return false;
    }
    const result = await db.rpc("is_admin");
    isAdmin = !result.error && result.data === true;
    return isAdmin;
  }

  async function login() {
    const username = document.getElementById("mlAuthUser").value.trim().toLowerCase();
    const password = document.getElementById("mlAuthPassword").value;

    if (!username || !password) {
      msg("Informe usuário e senha.");
      return;
    }

    msg("Entrando...");

    const lookup = await db.rpc("get_admin_login_email", {
      p_username: username
    });

    if (lookup.error || !lookup.data) {
      msg("Usuário ou senha inválidos.");
      return;
    }

    const auth = await db.auth.signInWithPassword({
      email: lookup.data,
      password: password
    });

    if (auth.error) {
      msg("Usuário ou senha inválidos.");
      return;
    }

    const autorizado = await checkAdmin(auth.data.session);

    if (!autorizado) {
      await db.auth.signOut();
      msg("Usuário sem permissão de administrador.");
      return;
    }

    close();
    refreshAdminSession();
  }

  document.getElementById("mlAuthLogin").onclick = login;

  document.getElementById("mlAuthPassword").addEventListener("keydown", event => {
    if (event.key === "Enter") login();
  });

  document.getElementById("mlAuthUser").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      document.getElementById("mlAuthPassword").focus();
    }
  });

  document.getElementById("mlAuthCancel").onclick = () => window.location.reload();

  function refreshAdminSession() {
    const host = document.querySelector(".top-actions");
    if (!host || !isAdmin) return;

    let el = document.getElementById("mlAdminSession");
    if (el) return;

    el = document.createElement("div");
    el.id = "mlAdminSession";
    el.className = "ml-admin-session";
    el.innerHTML = `<small>🔐 Admin</small><button type="button" id="mlAdminLogout">Sair</button>`;
    host.appendChild(el);

    el.querySelector("#mlAdminLogout").onclick = async () => {
      await db.auth.signOut();
      window.location.reload();
    };
  }

  async function start() {
    const session = await db.auth.getSession();
    const autorizado = await checkAdmin(session.data.session);

    if (autorizado) {
      modal.classList.add("hidden");
      refreshAdminSession();
    } else {
      open();
    }
  }

  db.auth.onAuthStateChange(async (_event, session) => {
    await checkAdmin(session);
    if (isAdmin) {
      close();
      refreshAdminSession();
    }
  });

  setTimeout(start, 500);
})();
