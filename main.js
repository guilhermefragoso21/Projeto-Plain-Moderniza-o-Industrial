var LOGO_SRC = "imagens/Logo PLAIN.png";
var BG_SRC   = "imagens/fundosite.png";

// Endereço do back-end (server.js)
var API = "http://localhost:3000";

function initImages() {
  var logo = document.getElementById("logo-img");
  var bg = document.getElementById("bg-img");

  if (logo) {
    if (LOGO_SRC) { logo.src = LOGO_SRC; logo.style.display = "block"; }
    else { logo.style.display = "none"; }
  }
  if (bg) {
    if (BG_SRC) { bg.src = BG_SRC; bg.style.display = "block"; }
    else { bg.style.display = "none"; }
  }
}

// Alterna entre as abas Empresa / Pessoal (página de criar conta)
function switchTab(tab) {
  var tabs = document.querySelectorAll(".tab");
  var forms = document.querySelectorAll(".card__form");

  tabs.forEach(function(t) { t.classList.remove("active"); });
  forms.forEach(function(f) { f.classList.add("hidden"); });

  document.getElementById("tab-" + tab).classList.add("active");
  document.getElementById("form-" + tab).classList.remove("hidden");
}

// Marca em vermelho os campos vazios; retorna true se todos preenchidos
function validarCampos(form) {
  var inputs = form.querySelectorAll(".form-input");
  var ok = true;
  inputs.forEach(function(input) {
    if (!input.value.trim()) {
      input.style.borderColor = "#ff4d6d";
      ok = false;
    } else {
      input.style.borderColor = "";
    }
  });
  return ok;
}

// ============================================================
//  LOGIN  ->  POST /api/login  ->  dashboard.html
// ============================================================
function handleLogin() {
  var form = document.getElementById("form-login");
  if (!validarCampos(form)) return;

  var inputs = form.querySelectorAll(".form-input");
  var dados = {
    email: inputs[0].value.trim(),
    senha: inputs[1].value
  };

  fetch(API + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  })
  .then(function(res) { return res.json().then(function(b){ return { status: res.status, body: b }; }); })
  .then(function(r) {
    if (r.status === 200 && r.body.ok) {
      // guarda quem está logado (opcional, útil no dashboard)
      localStorage.setItem("usuario_id", r.body.usuario_id);
      localStorage.setItem("tipo_conta", r.body.tipo_conta);
      window.location.href = "dashboard.html";
    } else {
      alert(r.body.erro || "Não foi possível entrar.");
    }
  })
  .catch(function() {
    alert("Erro de conexão. O servidor (server.js) está rodando?");
  });
}

// ============================================================
//  CADASTRO  ->  POST /api/cadastro  ->  volta para o login
// ============================================================
function handleSubmit() {
  var activeForm = document.querySelector(".card__form:not(.hidden)");
  if (!validarCampos(activeForm)) return;

  var inputs = activeForm.querySelectorAll(".form-input");
  var tipo, dados, email, senha;

  // Detecta qual aba está ativa pelo id do formulário
  if (activeForm.id === "form-empresa") {
    tipo  = "empresa";
    email = inputs[2].value.trim();   // Razão Social, CNPJ, E-mail, Telefone, Setor, Cargo
    dados = {
      razao_social: inputs[0].value.trim(),
      cnpj:         inputs[1].value.replace(/\D/g, ""), // só dígitos
      telefone:     inputs[3].value.trim(),
      setor:        inputs[4].value.trim(),
      cargo:        inputs[5].value.trim()
    };
  } else {
    tipo  = "pessoal";
    email = inputs[2].value.trim();   // Nome, Sobrenome, E-mail, Telefone, Cidade, Estado
    dados = {
      nome:      inputs[0].value.trim(),
      sobrenome: inputs[1].value.trim(),
      telefone:  inputs[3].value.trim(),
      cidade:    inputs[4].value.trim(),
      estado:    inputs[5].value.trim()
    };
  }

  // Pede uma senha para a nova conta (os formulários de cadastro não têm campo de senha)
  senha = prompt("Crie uma senha para sua conta:");
  if (!senha) { alert("É preciso definir uma senha."); return; }

  var corpo = { tipo: tipo, email: email, senha: senha, dados: dados };

  fetch(API + "/api/cadastro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo)
  })
  .then(function(res) { return res.json().then(function(b){ return { status: res.status, body: b }; }); })
  .then(function(r) {
    if (r.status === 201 && r.body.ok) {
      alert("Conta criada com sucesso! Faça login para entrar.");
      window.location.href = "index.html";   // volta para o login
    } else {
      alert(r.body.erro || "Não foi possível criar a conta.");
    }
  })
  .catch(function() {
    alert("Erro de conexão. O servidor (server.js) está rodando?");
  });
}

initImages();