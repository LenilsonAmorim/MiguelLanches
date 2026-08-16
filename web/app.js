const SUPABASE_URL = "https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY = "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";

let supabaseClient = null;

let items = [];

let sent = [];


/* =========================
   FUNÇÕES AUXILIARES
========================= */

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

function conectarSupabase() {

  return new Promise(function(resolve, reject) {

    if (window.supabase) {

      try {

        supabaseClient =
          window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
          );

        resolve();

      } catch (error) {

        reject(error);

      }

      return;
    }


    const script =
      document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";


    script.onload = function() {

      try {

        supabaseClient =
          window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
          );

        resolve();

      } catch (error) {

        reject(error);

      }

    };


    script.onerror = function() {

      reject(
        new Error(
          "Não foi possível carregar o Supabase."
        )
      );

    };


    document.head.appendChild(script);

  });

}


/* =========================
   LOGIN
========================= */

function fazerLogin() {

  const usuario =
    $("username").value.trim();

  const senha =
    $("password").value;


  if (!usuario || !senha) {

    $("loginMsg").textContent =
      "Informe usuário e senha.";

    return;

  }


  $("loginMsg").textContent = "";


  $("login").classList.add("hidden");

  $("orders").classList.remove("hidden");


  if (items.length === 0) {

    items.push({
      name: "",
      quantity: 1,
      price: 0
    });

  }


  renderItems();

  calcularTotal();


  if (supabaseClient) {

    carregarPedidos();

  }

}


/* =========================
   SAIR
========================= */

function fazerLogout() {

  $("orders").classList.add("hidden");

  $("login").classList.remove("hidden");

}


/* =========================
   ITENS
========================= */

function renderItems() {

  const container =
    $("items");


  if (!container) {
    return;
  }


  container.innerHTML =
    items.map(function(item, index) {

      return `
        <div class="item">

          <input
            type="text"
            data-name="${index}"
            placeholder="Produto"
            value="${item.name || ""}"
          >

          <input
            type="number"
            data-quantity="${index}"
            min="1"
            step="1"
            placeholder="Qtd"
            value="${item.quantity || 1}"
          >

          <input
            type="number"
            data-price="${index}"
            min="0"
            step="0.01"
            placeholder="Preço"
            value="${item.price || ""}"
          >

          <button
            type="button"
            class="secondary"
            data-delete="${index}"
          >
            ×
          </button>

        </div>
      `;

    }).join("");


  container
    .querySelectorAll("[data-name]")
    .forEach(function(input) {

      input.addEventListener(
        "input",
        function() {

          const index =
            Number(this.dataset.name);

          items[index].name =
            this.value;

        }
      );

    });


  container
    .querySelectorAll("[data-quantity]")
    .forEach(function(input) {

      input.addEventListener(
        "input",
        function() {

          const index =
            Number(this.dataset.quantity);

          items[index].quantity =
            Number(this.value) || 1;

          calcularTotal();

        }
      );

    });


  container
    .querySelectorAll("[data-price]")
    .forEach(function(input) {

      input.addEventListener(
        "input",
        function() {

          const index =
            Number(this.dataset.price);

          items[index].price =
            Number(this.value) || 0;

          calcularTotal();

        }
      );

    });


  container
    .querySelectorAll("[data-delete]")
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          const index =
            Number(this.dataset.delete);

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

        }
      );

    });

}


/* =========================
   ADICIONAR ITEM
========================= */

function adicionarItem() {

  items.push({
    name: "",
    quantity: 1,
    price: 0
  });


  renderItems();

  calcularTotal();

}


/* =========================
   TOTAL
========================= */

function calcularTotal() {

  const total =
    items.reduce(
      function(soma, item) {

        const quantidade =
          Number(item.quantity) || 1;

        const preco =
          Number(item.price) || 0;

        return soma +
          quantidade * preco;

      },
      0
    );


  const elemento =
    $("total");


  if (elemento) {

    elemento.textContent =
      money(total);

  }


  return total;

}


/* =========================
   ENVIAR PEDIDO
========================= */

async function enviarPedido() {

  if (!supabaseClient) {

    alert(
      "A conexão com o banco ainda não foi estabelecida. Aguarde alguns segundos e tente novamente."
    );

    return;

  }


  const cliente =
    $("cliente").value.trim();

  const telefone =
    $("telefone").value.trim();

  const endereco =
    $("endereco").value.trim();

  const referencia =
    $("referencia").value.trim();

  const observacoes =
    $("observacoes").value.trim();


  const itensValidos =
    items.filter(function(item) {

      return item.name &&
        item.name.trim();

    });


  if (!cliente) {

    alert(
      "Informe o nome do cliente."
    );

    return;

  }


  if (itensValidos.length === 0) {

    alert(
      "Adicione pelo menos um item."
    );

    return;

  }


  const total =
    calcularTotal();


  try {

    const resultadoPedido =
      await supabaseClient
        .from("pedidos")
        .insert({

          Cliente: cliente,

          telefone: telefone,

          endereco: endereco,

          referencia: referencia,

          observacoes: observacoes,

          total: total

        })
        .select()
        .single();


    if (resultadoPedido.error) {

      console.error(
        resultadoPedido.error
      );

      throw resultadoPedido.error;

    }


    const pedido =
      resultadoPedido.data;


    const dadosItens =
      itensValidos.map(function(item) {

        const quantidade =
          Number(item.quantity) || 1;

        const preco =
          Number(item.price) || 0;


        return {

          pedido_id: pedido.id,

          produto: item.name.trim(),

          quantidade: quantidade,

          preco_unitario: preco,

          subtotal:
            quantidade * preco

        };

      });


    const resultadoItens =
      await supabaseClient
        .from("itens_pedido")
        .insert(dadosItens);


    if (resultadoItens.error) {

      console.error(
        resultadoItens.error
      );

      throw resultadoItens.error;

    }


    alert(
      "Pedido #" +
      String(pedido.id).padStart(3, "0") +
      " salvo com sucesso!"
    );


    $("cliente").value = "";

    $("telefone").value = "";

    $("endereco").value = "";

    $("referencia").value = "";

    $("observacoes").value = "";


    items = [
      {
        name: "",
        quantity: 1,
        price: 0
      }
    ];


    renderItems();

    calcularTotal();

    carregarPedidos();


  } catch (error) {

    console.error(
      "Erro ao salvar pedido:",
      error
    );


    alert(
      "Não foi possível salvar o pedido."
    );

  }

}


/* =========================
   CARREGAR PEDIDOS
========================= */

async function carregarPedidos() {

  if (!supabaseClient) {
    return;
  }


  const lista =
    $("ordersList");


  if (!lista) {
    return;
  }


  try {

    const resultado =
      await supabaseClient
        .from("pedidos")
        .select("*")
        .order(
          "id",
          {
            ascending: false
          }
        );


    if (resultado.error) {

      console.error(
        resultado.error
      );

      return;

    }


    sent =
      resultado.data || [];


    if (sent.length === 0) {

      lista.innerHTML =
        '<p class="muted">Nenhum pedido enviado.</p>';

      return;

    }


    lista.innerHTML =
      sent.map(function(pedido) {

        const numero =
          String(pedido.id)
            .padStart(3, "0");


        const data =
          pedido.created_at
            ? new Date(
                pedido.created_at
              ).toLocaleString("pt-BR")
            : "";


        return `
          <div class="order">

            <strong>
              #${numero} —
              ${pedido.Cliente || ""}
            </strong>

            <small>
              ${data} ·
              ${money(pedido.total)}
            </small>

          </div>
        `;

      }).join("");


  } catch (error) {

    console.error(
      "Erro ao carregar pedidos:",
      error
    );

  }

}


/* =========================
   INICIALIZAÇÃO
========================= */

function iniciar() {

  /* LOGIN */

  $("loginBtn")
    .addEventListener(
      "click",
      fazerLogin
    );


  /* SAIR */

  $("logoutBtn")
    .addEventListener(
      "click",
      fazerLogout
    );


  /* ADICIONAR ITEM */

  $("addItemBtn")
    .addEventListener(
      "click",
      adicionarItem
    );


  /* ENVIAR */

  $("sendBtn")
    .addEventListener(
      "click",
      enviarPedido
    );


  /* PRIMEIRO ITEM */

  items = [
    {
      name: "",
     
