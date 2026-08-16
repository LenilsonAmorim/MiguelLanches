const SUPABASE_URL = "https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY = "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";

let supabaseClient;
let items = [];
let sent = [];

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function $(id) {
  return document.getElementById(id);
}

/* Carrega a biblioteca do Supabase */
function carregarSupabase() {
  return new Promise((resolve, reject) => {
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.onload = () => {
      supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );
      resolve();
    };

    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/* Produtos do pedido */
function renderItems() {
  const container = $("items");

  if (!container) return;

  container.innerHTML = items.map((item, index) => `
    <div class="item">

      <input
        data-name="${index}"
        placeholder="Produto"
        value="${item.name || ""}"
      >

      <input
        data-quantity="${index}"
        type="number"
        min="1"
        step="1"
        placeholder="Qtd"
        value="${item.quantity || 1}"
      >

      <input
        data-price="${index}"
        type="number"
        min="0"
        step="0.01"
        placeholder="Preço"
        value="${item.price || ""}"
      >

      <button
        data-del="${index}"
        class="secondary"
        type="button"
      >×</button>

    </div>
  `).join("");

  container.querySelectorAll("[data-name]").forEach(input => {
    input.oninput = () => {
      items[input.dataset.name].name = input.value;
    };
  });

  container.querySelectorAll("[data-quantity]").forEach(input => {
    input.oninput = () => {
      items[input.dataset.quantity].quantity =
        Number(input.value) || 1;

      calcularTotal();
    };
  });

  container.querySelectorAll("[data-price]").forEach(input => {
    input.oninput = () => {
      items[input.dataset.price].price =
        Number(input.value) || 0;

      calcularTotal();
    };
  });

  container.querySelectorAll("[data-del]").forEach(button => {
    button.onclick = () => {
      items.splice(Number(button.dataset.del), 1);

      if (!items.length) {
        items.push({
          name: "",
          quantity: 1,
          price: 0
        });
      }

      renderItems();
      calcularTotal();
    };
  });
}

/* Calcula o total */
function calcularTotal() {
  const total = items.reduce((sum, item) => {
    return sum +
      ((Number(item.price) || 0) *
       (Number(item.quantity) || 1));
  }, 0);

 
