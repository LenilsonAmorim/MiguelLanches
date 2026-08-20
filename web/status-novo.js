/* Miguel Lanches - status inicial NOVO
   Este arquivo é carregado ANTES do app.js do cliente.
   Ele intercepta apenas pedidos enviados para a tabela "pedidos"
   e acrescenta [ML_STATUS]novo[/ML_STATUS] às observações.
*/
(function () {
  if (!window.supabase || !window.supabase.createClient) return;

  const originalCreateClient = window.supabase.createClient;

  window.supabase.createClient = function () {
    const client = originalCreateClient.apply(this, arguments);
    const originalFrom = client.from.bind(client);

    client.from = function (table) {
      const builder = originalFrom(table);

      if (table !== "pedidos" || !builder || typeof builder.insert !== "function") {
        return builder;
      }

      const originalInsert = builder.insert.bind(builder);

      builder.insert = function (values, options) {
        const patch = function (row) {
          if (!row || typeof row !== "object") return row;

          const copy = Object.assign({}, row);
          const obs = String(copy.observacoes || "");

          if (!/\[ML_STATUS\]/.test(obs)) {
            copy.observacoes =
              (obs ? obs + "\n" : "") +
              "[ML_STATUS]novo[/ML_STATUS]";
          }

          return copy;
        };

        const fixedValues = Array.isArray(values)
          ? values.map(patch)
          : patch(values);

        return originalInsert(fixedValues, options);
      };

      return builder;
    };

    return client;
  };
})();
