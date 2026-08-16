const SUPABASE_URL = "https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY = "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";

let supabaseClient = null;
let items = [];
let sent = [];

function $(id) {
  return document.getElementById(id);
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* =========================
   SUPABASE
========================= */

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

    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.onload = function () {

      try {

        supabaseClient = window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_KEY
        );

        resolve();

      } catch (error) {
        reject(error);
      }
    };

    script.onerror = function () {
      reject(new Error("Não foi possível carregar o Supabase."));
    };

    document.head.appendChild(script);
  });
}

/* =========================
   ITENS DO PEDIDO
========================= */

function renderItems() {

  const container = $("items");

  if (!container) {
    return;
  }

  container.innerHTML = items.map((item, index) => {

    return `
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
          type="button"
          data-del="${index}"
          class="secondary"
        >
          ×
        </button>

      </div>
    `;

  }).join("");

  container
    .querySelectorAll("[data-name]")
    .forEach(input => {

      input.addEventListener("input", function () {

        const index = Number(this.dataset.name);

        items[index].name = this.value;

      });

    });

  container
    .querySelectorAll("[data-quantity]")
    .forEach(input => {

      input.addEventListener("input", function () {

        const index = Number(this.dataset.quantity);

        items[index].quantity =
          Number(this.value) || 1;

        calcularTotal();

      });

    });

  container
    .querySelectorAll("[data-price]")
    .forEach(input => {

      input.addEventListener("input", function () {

        const index = Number(this.dataset.price);

        items[index].price =
          Number(this.value) || 0;

        calcularTotal();

      });

    });

  container
    .querySelectorAll("[data-del]")
    .forEach(button => {

      button.addEventListener("click", function () {

        const index = Number(this.dataset.del);

        items.splice(index, 1);

        if (items.length === 0) {

          items.push({
            name: "",
            quantity: 1,
            price: 0
          });

        }

        renderItems();
        calcularTotal();

      });

    });
}

/* =========================
   TOTAL
========================= */

function calcularTotal() {

  const total = items.reduce(
    (sum, item) => {

      const quantidade =
        Number(item.quantity) || 1;

      const preco =
        Number(item.price) || 0;

      return sum + quantidade * preco;

    },
    0
  );

  const totalElement = $("total");

  if (totalElement) {
    totalElement.textContent = money(total);
  }

  return total;
}

/* =========================
   LOGIN
========================= */

function fazerLogin() {

  const usuario =
    $("username")?.value.trim();

  const senha =
    $("password")?.value;

  if (!usuario || !senha) {

    if ($("loginMsg")) {

      $("loginMsg").textContent =
        "Informe usuário e senha.";

    }

    return;
  }

  if ($("loginMsg")) {
    $("loginMsg").textContent = "";
  }

  $("login")?.classList.add("hidden");

  $("orders")?.classList.remove("hidden");

  if (items.length === 0) {

    items.push({
      name: "",
      quantity: 1,
      price: 0
    });

    renderItems();
