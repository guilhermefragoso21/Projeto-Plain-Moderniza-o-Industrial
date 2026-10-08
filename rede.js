/* ============================================================
   PLAIN — Página Rede
   Lista as contas cadastradas e salva conexões no banco.
   Depende de comum.js (API, USUARIO_ID, api(), showToast...).
   ============================================================ */
var contas = [];
var abaAtual = "todos";
var termoBusca = "";
var CORES = ["av-blue", "av-teal", "av-indigo", "av-rose"];

function carregarRede() {
  api("GET", "/api/rede/" + USUARIO_ID)
    .then(function (lista) {
      contas = lista.map(function (c) {
        var d = dadosDaConta(c);
        c._nome = d.nome; c._role = d.role; c._inicial = d.inicial;
        c._busca = (d.nome + " " + d.role).toLowerCase();
        return c;
      });
      renderizar();
    })
    .catch(function (e) {
      document.getElementById("listaRede").innerHTML =
        '<div class="card empty-state"><div class="empty-state__title">Não foi possível carregar</div>' +
        '<div class="empty-state__text">' + escapeHtml(e.message) + "</div></div>";
    });
}

function passaNaAba(c, aba) {
  if (aba === "conexoes") return c.conectado;
  if (aba === "empresa" || aba === "pessoal") return c.tipo_conta === aba;
  return true;
}

function renderizar() {
  // Contadores
  var cont = { todos: contas.length, conexoes: 0, empresa: 0, pessoal: 0 };
  contas.forEach(function (c) {
    if (c.conectado) cont.conexoes++;
    cont[c.tipo_conta]++;
  });
  document.querySelectorAll("[data-count]").forEach(function (el) {
    el.textContent = cont[el.dataset.count] || 0;
  });
  setText("statConexoes", cont.conexoes);
  setText("statRede", cont.todos);

  var termo = termoBusca.toLowerCase();
  var visiveis = contas.filter(function (c) {
    return passaNaAba(c, abaAtual) && (!termo || c._busca.indexOf(termo) !== -1);
  });

  var alvo = document.getElementById("listaRede");
  if (visiveis.length === 0) {
    var msg;
    if (contas.length === 0) msg = "Ainda não há outras contas cadastradas na PLAIN.";
    else if (termo) msg = "Nenhuma conta encontrada para “" + escapeHtml(termoBusca) + "”.";
    else if (abaAtual === "conexoes") msg = "Você ainda não se conectou a ninguém. Veja a aba “Todos”.";
    else msg = "Nenhuma conta nesta categoria.";
    alvo.innerHTML = '<div class="card empty-state"><div class="empty-state__text">' + msg + "</div></div>";
    return;
  }

  alvo.innerHTML = '<div class="people-grid">' + visiveis.map(cardHtml).join("") + "</div>";
}

function cardHtml(c) {
  var cor = CORES[c.usuario_id % CORES.length];
  var tag = c.tipo_conta === "empresa"
    ? '<span class="tag tag-blue person-card__tag">Empresa</span>'
    : '<span class="tag tag-green person-card__tag">Pessoa</span>';
  return (
    '<div class="card person-card">' +
      '<div class="person-card__banner"></div>' +
      '<div class="person-card__avatar ' + cor + '">' + escapeHtml(c._inicial) + "</div>" +
      '<div class="person-card__body">' +
        '<div class="person-card__name">' + escapeHtml(c._nome) + "</div>" +
        '<div class="person-card__role">' + escapeHtml(c._role) + "</div>" +
        tag +
        '<button class="connect-btn' + (c.conectado ? " connected" : "") + '" data-id="' + c.usuario_id + '">' +
          (c.conectado ? "✓ Conectado" : "+ Conectar") +
        "</button>" +
      "</div>" +
    "</div>"
  );
}

function alternarConexao(btn) {
  var conta = contas.find(function (c) { return String(c.usuario_id) === btn.dataset.id; });
  if (!conta) return;

  btn.disabled = true;
  var req = conta.conectado
    ? api("DELETE", "/api/conexoes/" + USUARIO_ID + "/" + conta.usuario_id)
    : api("POST", "/api/conexoes", { usuario_id: USUARIO_ID, conectado_id: conta.usuario_id });

  req.then(function () {
      conta.conectado = !conta.conectado;
      showToast(conta.conectado ? "🤝 Conectado a " + conta._nome + "!" : "Conexão removida.");
      renderizar();
    })
    .catch(function (e) {
      btn.disabled = false;
      showToast(e.message, 3500);
    });
}

document.addEventListener("DOMContentLoaded", function () {
  // Termo vindo da busca do topo (rede.html?q=...)
  var q = new URLSearchParams(window.location.search).get("q") || "";
  var buscaTopo = document.querySelector(".topbar__search input");
  var buscaLocal = document.getElementById("buscaRede");
  termoBusca = q;
  buscaLocal.value = q;
  buscaTopo.value = q;

  function aoBuscar(valor) {
    termoBusca = valor.trim();
    buscaLocal.value = valor;
    buscaTopo.value = valor;
    renderizar();
  }
  buscaLocal.addEventListener("input", function () { aoBuscar(this.value); });
  buscaTopo.addEventListener("input", function () { aoBuscar(this.value); });

  document.getElementById("filtros").addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    abaAtual = chip.dataset.aba;
    document.querySelectorAll("#filtros .chip").forEach(function (c) {
      c.classList.toggle("active", c === chip);
    });
    renderizar();
  });

  document.getElementById("listaRede").addEventListener("click", function (e) {
    var btn = e.target.closest(".connect-btn");
    if (btn) alternarConexao(btn);
  });

  carregarRede();
});
