const SUPABASE_URL =
  "https://lifsxhyeqwppfvajvhpn.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";

let supabaseClient = null;

let items = [];

let pedidos = [];

let pedidoSelecionado = null;


/* =========================
   AUXILIARES
========================= */

function $(id) {
  return document.getElementById(id);
}


function dinheiro(valor) {

  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );

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

      } catch (erro) {

        reject(erro);

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

      } catch (erro) {

        reject(erro);

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
   MENU
========================= */

const nomesPaginas = {

  "dashboard":
    "Painel Inicial",

  "novo-pedido":
    "Novo Pedido",

  "comandas":
    "Comandas Abertas",

  "historico":
    "Histórico de Pedidos",

  "impressao":
    "Impressão"

};


function abrirPagina(nome) {

  document
    .querySelectorAll(".page")
    .forEach(function(pagina) {

      pagina.classList.remove(
        "active-page"
      );

    });


  const pagina =
    $("page-" + nome);


  if (pagina) {

    pagina.classList.add(
      "active-page"
    );

  }


  document
    .querySelectorAll(".menu-item")
    .forEach(function(botao) {

      botao.classList.remove(
        "active"
      );

      if (
        botao.dataset.page === nome
      ) {

        botao.classList.add(
          "active"
        );

      }

    });


  const titulo =
    $("pageTitle");


  if (titulo) {

    titulo.textContent =
      nomesPaginas[nome] ||
      "Miguel Lanches";

  }


  const sidebar =
    $("sidebar");


  if (sidebar) {

    sidebar.classList.remove(
      "open"
    );

  }


  if (
    nome === "dashboard"
  ) {

    atualizarDashboard();

  }


  if (
    nome === "comandas"
  ) {

    mostrarComandas();

  }


  if (
    nome === "historico"
  ) {

    mostrarHistorico();

  }

}


/* =========================
   ITENS DO PEDIDO
========================= */

function criarItemInicial() {

  items = [

    {
      name: "",
      quantity: 1,
      price: 0
    }

  ];

}


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
            value="${item.quantity || 1}"
          >

          <input
            type="number"
            data-price="${index}"
            min="0"
            step="0.01"
            placeholder="0,00"
            value="${item.price || ""}"
          >

          <button
            type="button"
            data-delete="${index}"
          >
            ×
          </button>

        </div>

      `;

    }).join("");


  container
    .querySelectorAll(
      "[data-name]"
    )
    .forEach(function(input) {

      input.addEventListener(
        "input",
        function() {

          const index =
            Number(
              this.dataset.name
            );

          items[index].name =
            this.value;

        }
      );

    });


  container
    .querySelectorAll(
      "[data-quantity]"
    )
    .forEach(function(input) {

      input.addEventListener(
        "input",
        function() {

          const index =
            Number(
              this.dataset.quantity
            );

          items[index].quantity =
            Number(this.value) || 1;

          calcularTotal();

        }
      );

    });


  container
    .querySelectorAll(
      "[data-price]"
    )
    .forEach(function(input) {

      input.addEventListener(
        "input",
        function() {

          const index =
            Number(
              this.dataset.price
            );

          items[index].price =
            Number(this.value) || 0;

          calcularTotal();

        }
      );

    });


  container
    .querySelectorAll(
      "[data-delete]"
    )
    .forEach(function(botao) {

      botao.addEventListener(
        "click",
        function() {

          const index =
            Number(
              this.dataset.delete
            );

          items.splice(
            index,
            1
          );


          if (
            items.length === 0
          ) {

            criarItemInicial();

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
          Number(
            item.quantity
          ) || 1;

        const preco =
          Number(
            item.price
          ) || 0;


        return soma +
          quantidade * preco;

      },
      0
    );


  const elemento =
    $("total");


  if (elemento) {

    elemento.textContent =
      dinheiro(total);

  }


  return total;

}


/* =========================
   NOVO PEDIDO
========================= */

function limparPedido() {

  if ($("cliente"))
    $("cliente").value = "";

  if ($("telefone"))
    $("telefone").value = "";

  if ($("endereco"))
    $("endereco").value = "";

  if ($("referencia"))
    $("referencia").value = "";

  if ($("observacoes"))
    $("observacoes").value = "";


  criarItemInicial();

  renderItems();

  calcularTotal();

}


async function enviarPedido() {

  if (!supabaseClient) {

    alert(
      "O banco ainda está conectando. Aguarde alguns segundos."
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

      return (
        item.name &&
        item.name.trim()
      );

    });


  if (!cliente) {

    alert(
      "Informe o nome do cliente."
    );

    return;

  }


  if (
    itensValidos.length === 0
  ) {

    alert(
      "Adicione pelo menos um item."
    );

    return;

  }


  const total =
    calcularTotal();


  try {

    const resposta =
      await supabaseClient
        .from("pedidos")
        .insert({

          Cliente:
            cliente,

          telefone:
            telefone,

          endereco:
            endereco,

          referencia:
            referencia,

          observacoes:
            observacoes,

          total:
            total

        })
        .select()
        .single();


    if (resposta.error) {

      throw resposta.error;

    }


    const pedido =
      resposta.data;


    const dadosItens =
      itensValidos.map(
        function(item) {

          const quantidade =
            Number(
              item.quantity
            ) || 1;

          const preco =
            Number(
              item.price
            ) || 0;


          return {

            pedido_id:
              pedido.id,

            produto:
              item.name.trim(),

            quantidade:
              quantidade,

            preco_unitario:
              preco,

            subtotal:
              quantidade * preco

          };

        }
      );


    const respostaItens =
      await supabaseClient
        .from("itens_pedido")
        .insert(
          dadosItens
        );


    if (
      respostaItens.error
    ) {

      throw respostaItens.error;

    }


    alert(
      "Pedido #" +
      String(
        pedido.id
      ).padStart(
        3,
        "0"
      ) +
      " salvo com sucesso!"
    );


    limparPedido();

    carregarPedidos();

    abrirPagina(
      "historico"
    );


  } catch (erro) {

    console.error(
      erro
    );


    alert(
      "Erro ao salvar o pedido.\n\n" +
      "Verifique a conexão com o banco."
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


  try {

    const resposta =
      await supabaseClient
        .from("pedidos")
        .select("*")
        .order(
          "id",
          {
            ascending:
              false
          }
        );


    if (
      resposta.error
    ) {

      console.error(
        resposta.error
      );

      return;

    }


    pedidos =
      resposta.data || [];


    atualizarDashboard();

    mostrarComandas();

    mostrarHistorico();


  } catch (erro) {

    console.error(
      erro
    );

  }

}


/* =========================
   DASHBOARD
========================= */

function atualizarDashboard() {

  const hoje =
    new Date()
      .toLocaleDateString(
        "pt-BR"
      );


  const pedidosHoje =
    pedidos.filter(
      function(pedido) {

        if (
          !pedido.created_at
        ) {

          return false;

        }


        return (
          new Date(
            pedido.created_at
          ).toLocaleDateString(
            "pt-BR"
          ) === hoje
        );

      }
    );


  const totalHoje =
    pedidosHoje.reduce(
      function(total, pedido) {

        return total +
          Number(
            pedido.total
          ) || 0;

      },
      0
    );


  if ($("statPedidos")) {

    $("statPedidos")
      .textContent =
      pedidosHoje.length;

  }


  if ($("statComandas")) {

    $("statComandas")
      .textContent =
      pedidos.length;

  }


  if ($("statTotal")) {

    $("statTotal")
      .textContent =
      dinheiro(
        totalHoje
      );

  }


  const recentes =
    $("recentOrders");


  if (!recentes) {
    return;
  }


  if (
    pedidos.length === 0
  ) {

    recentes.innerHTML =
      `
      <div class="empty-state">
        Nenhum pedido registrado.
      </div>
      `;

    return;

  }


  recentes.innerHTML =
    pedidos
      .slice(
        0,
        5
      )
      .map(
        function(pedido) {

          return `

            <div class="order-card">

              <strong>
                Pedido #${
                  String(
                    pedido.id
                  ).padStart(
                    3,
                    "0"
                  )
                }
              </strong>

              <div>
                ${
                  pedido.Cliente ||
                  "Sem cliente"
                }
              </div>

              <small>
                ${
                  dinheiro(
                    pedido.total
                  )
                }
              </small>

            </div>

          `;

        }
      )
      .join("");

}


/* =========================
   COMANDAS
========================= */

function mostrarComandas() {

  const container =
    $("openOrders");


  if (!container) {
    return;
  }


  if (
    pedidos.length === 0
  ) {

    container.innerHTML =
      `
      <div class="empty-state">
        Nenhuma comanda aberta.
      </div>
      `;

    return;

  }


  container.innerHTML =
    pedidos
      .map(
        function(pedido) {

          return `

            <div class="order-card">

              <strong>
                Comanda #${
                  String(
                    pedido.id
                  ).padStart(
                    3,
                    "0"
                  )
                }
              </strong>

              <p>
                Cliente:
                ${
                  pedido.Cliente ||
                  "-"
                }
              </p>

              <strong>
                ${
                  dinheiro(
                    pedido.total
                  )
                }
              </strong>

              <button
                class="secondary-btn"
                type="button"
                onclick="selecionarImpressao(${pedido.id})"
              >
                🖨️ Imprimir
              </button>

            </div>

          `;

        }
      )
      .join("");

}


/* =========================
   HISTÓRICO
========================= */

function mostrarHistorico() {

  const tabela =
    $("historyTable");


  if (!tabela) {
    return;
  }


  if (
    pedidos.length === 0
  ) {

    tabela.innerHTML =
      `
      <tr>
        <td
          colspan="5"
          class="empty-cell"
        >
          Nenhum pedido encontrado.
        </td>
      </tr>
      `;

    return;

  }


  tabela.innerHTML =
    pedidos
      .map(
        function(pedido) {

          const data =
            pedido.created_at
              ? new Date(
                  pedido.created_at
                ).toLocaleString(
                  "pt-BR"
                )
              : "-";


          return `

            <tr>

              <td>
                #${
                  String(
                    pedido.id
                  ).padStart(
                    3,
                    "0"
                  )
                }
              </td>

              <td>
                ${
                  pedido.Cliente ||
                  "-"
                }
              </td>

              <td>
                ${data}
              </td>

              <td>
                ${
                  dinheiro(
                    pedido.total
                  )
                }
              </td>

              <td>

                <button
                  class="secondary-btn"
                  type="button"
                  onclick="selecionarImpressao(${pedido.id})"
                >
                  Ver
                </button>

              </td>

            </tr>

          `;

        }
      )
      .join("");

}


/* =========================
   IMPRESSÃO
========================= */

function selecionarImpressao(id) {

  pedidoSelecionado =
    pedidos.find(
      function(pedido) {

        return (
          Number(
            pedido.id
          ) === Number(id)
        );

      }
    );


  if (
    !pedidoSelecionado
  ) {

    return;

  }


  abrirPagina(
    "impressao"
  );


  mostrarPreVisualizacao();

}


function mostrarPreVisualizacao() {

  const area =
    $("printPreview");


  if (!area) {
    return;
  }


  if (
    !pedidoSelecionado
  ) {

    area.innerHTML =
      `
      <div class="receipt-empty">
        Selecione um pedido para visualizar.
      </div>
      `;

    return;

  }


  area.innerHTML =
    `

      <div
        style="
          text-align:center;
          font-weight:bold;
          font-size:20px;
        "
      >
        MIGUEL LANCHES
      </div>

      <hr>

      <strong>
        PEDIDO:
      </strong>

      #${
        String(
          pedidoSelecionado.id
        ).padStart(
          3,
          "0"
        )
      }

      <br><br>

      <strong>
        CLIENTE:
      </strong>

      ${
        pedidoSelecionado.Cliente ||
        ""
      }

      <br>

      <strong>
        TELEFONE:
      </strong>

      ${
        pedidoSelecionado.telefone ||
        ""
      }

      <br>

      <strong>
        ENDEREÇO:
      </strong>

      ${
        pedidoSelecionado.endereco ||
        ""
      }

      <br>

      <strong>
        REF:
      </strong>

      ${
        pedidoSelecionado.referencia ||
        ""
      }

      <hr>

      <strong>
        TOTAL:
      </strong>

      ${
        dinheiro(
          pedidoSelecionado.total
        )
      }

      <hr>

      <div
        style="
          text-align:center;
        "
      >
        Obrigado pela preferência!
      </div>

    `;

}


/* =========================
   INICIALIZAÇÃO
========================= */

function iniciarAplicacao() {

  criarItemInicial();

  renderItems();

  calcularTotal();


  /* MENU */

  document
    .querySelectorAll(
      ".menu-item"
    )
    .forEach(
      function(botao) {

        botao.addEventListener(
          "click",
          function() {

            abrirPagina(
              this.dataset.page
            );

          }
        );

      }
    );


  /* BOTÕES data-go */

  document
    .querySelectorAll(
      "[data-go]"
    )
    .forEach(
      function(botao) {

        botao.addEventListener(
          "click",
          function() {

            abrirPagina(
              this.dataset.go
            );

          }
        );

      }
    );


  /* ADICIONAR ITEM */

  $("addItemBtn")
    ?.addEventListener(
      "click",
      adicionarItem
    );


  /* ENVIAR */

  $("sendBtn")
    ?.addEventListener(
      "click",
      enviarPedido
    );


  /* MENU MOBILE */

  $("menuToggle")
    ?.addEventListener(
      "click",
      function() {

        $("sidebar")
          ?.classList.toggle(
            "open"
          );

      }
    );


  /* LOGOUT */

  $("logoutBtn")
    ?.addEventListener(
      "click",
      function() {

        location.reload();

      }
    );


  /* IMPRIMIR */

  $("printBtn")
    ?.addEventListener(
      "click",
      function() {

        if (
          !pedidoSelecionado
        ) {

          alert(
            "Selecione um pedido primeiro."
          );

          return;

        }


        window.print();

      }
    );


  /* PRIMEIRA PÁGINA */

  abrirPagina(
    "dashboard"
  );

}


/* =========================
   INICIA
========================= */

iniciarAplicacao();


/* =========================
   CONECTA AO SUPABASE
========================= */

conectarSupabase()
  .then(
    function() {

      console.log(
        "Supabase conectado."
      );

      carregarPedidos();

    }
  )
  .catch(
    function(erro) {

      console.error(
        "Erro Supabase:",
        erro
      );

    }
  );
