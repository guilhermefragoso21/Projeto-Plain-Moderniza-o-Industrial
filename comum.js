/* ============================================================
   PLAIN — funções compartilhadas pelas páginas Rede, Projetos
   e Mensagens. Carregue este arquivo ANTES do script da página.
   ============================================================ */
var API = "http://localhost:3000";
var USUARIO_ID = localStorage.getItem("usuario_id");

// Sem login -> volta para a tela de login
if (!USUARIO_ID) {
  window.location.href = "index.html";
}

function escapeHtml(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setText(id, txt) {
  var el = document.getElementById(id);
  if (el) el.textContent = txt;
}

/* Chamada ao servidor. Devolve uma Promise com o JSON da resposta,
   ou rejeita com um Error contendo a mensagem de erro do servidor. */
function api(metodo, caminho, corpo) {
  var opts = { method: metodo, headers: {} };
  if (corpo !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(corpo);
  }
  return fetch(API + caminho, opts).then(
    function (res) {
      return res.json()
        .catch(function () { return {}; })
        .then(function (b) {
          if (!res.ok) throw new Error(b.erro || ("Erro " + res.status));
          return b;
        });
    },
    function () {
      throw new Error("Erro de conexão. O servidor (server.js) está rodando?");
    }
  );
}

/* Monta nome, descrição e inicial de uma conta (empresa ou pessoal) */
function dadosDaConta(c) {
  var nome, role;
  if (c.tipo_conta === "empresa") {
    nome = c.razao_social || "Empresa";
    role = [c.setor, c.cargo].filter(Boolean).join(" · ") || "Conta Empresa";
  } else {
    nome = ((c.nome || "") + " " + (c.sobrenome || "")).trim() || "Usuário";
    role = [c.cidade, c.estado].filter(Boolean).join(" · ") || "Conta Pessoal";
  }
  return { nome: nome, role: role, inicial: nome.charAt(0).toUpperCase() };
}

/* Preenche avatar do topo e o card de perfil lateral (se existir) */
function carregarPerfilTopo() {
  if (!USUARIO_ID) return;
  api("GET", "/api/conta/" + USUARIO_ID)
    .then(function (c) {
      var d = dadosDaConta(c);
      setText("topAvatar", d.inicial);
      setText("profileAvatar", d.inicial);
      setText("profileName", d.nome);
      setText("profileRole", d.role);
    })
    .catch(function () {
      showToast("Não foi possível carregar seu perfil.");
    });
}

function logout() {
  localStorage.removeItem("usuario_id");
  localStorage.removeItem("tipo_conta");
  window.location.href = "index.html";
}

/* Menu do avatar com a opção Sair */
function iniciarMenuAvatar() {
  var btn = document.querySelector(".avatar-btn");
  if (!btn) return;
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    var aberto = document.querySelector(".avatar-menu");
    if (aberto) { aberto.remove(); return; }

    var menu = document.createElement("div");
    menu.className = "avatar-menu";
    var sair = document.createElement("button");
    sair.textContent = "Sair";
    sair.onclick = logout;
    menu.appendChild(sair);

    btn.style.position = "relative";
    btn.appendChild(menu);
    setTimeout(function () {
      document.addEventListener("click", function () { menu.remove(); }, { once: true });
    }, 0);
  });
}

/* Busca do topo: Enter leva para a página Rede filtrando pelo termo */
function iniciarBuscaTopo() {
  var input = document.querySelector(".topbar__search input");
  if (!input || document.body.dataset.pagina === "rede") return;
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && this.value.trim()) {
      window.location.href = "rede.html?q=" + encodeURIComponent(this.value.trim());
    }
  });
}

/* Aviso flutuante no rodapé */
function showToast(msg, duration) {
  duration = duration || 2400;
  var toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("toast--show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () {
    toast.classList.remove("toast--show");
  }, duration);
}

document.addEventListener("DOMContentLoaded", function () {
  carregarPerfilTopo();
  iniciarMenuAvatar();
  iniciarBuscaTopo();
});
