var LOGO_SRC = "imagens/Logo PLAIN.png";
var BG_SRC   = "imagens/fundosite.png";

function initImages() {
  var logo = document.getElementById("logo-img");
  var bg = document.getElementById("bg-img");

  if (LOGO_SRC) {
    logo.src = LOGO_SRC;
    logo.style.display = "block";
  } else {
    logo.style.display = "none";
  }

  if (BG_SRC) {
    bg.src = BG_SRC;
    bg.style.display = "block";
  } else {
    bg.style.display = "none";
  }
}

// Alterna entre o card de login e o card de criação de conta
function showCard(card) {
  var login = document.getElementById("card-login");
  var cadastro = document.getElementById("card-cadastro");

  if (card === "cadastro") {
    login.classList.add("hidden");
    cadastro.classList.remove("hidden");
  } else {
    cadastro.classList.add("hidden");
    login.classList.remove("hidden");
  }
}

// Alterna entre as abas Empresa / Pessoal (apenas dentro do card de cadastro)
function switchTab(tab) {
  var cadastro = document.getElementById("card-cadastro");
  var tabs = cadastro.querySelectorAll(".tab");
  var forms = cadastro.querySelectorAll(".card__form");

  tabs.forEach(function(t) { t.classList.remove("active"); });
  forms.forEach(function(f) { f.classList.add("hidden"); });

  document.getElementById("tab-" + tab).classList.add("active");
  document.getElementById("form-" + tab).classList.remove("hidden");
}

// Validação genérica de um formulário de cadastro
function handleSubmit() {
  var cadastro = document.getElementById("card-cadastro");
  var activeForm = cadastro.querySelector(".card__form:not(.hidden)");
  validateAndGo(activeForm);
}

// Validação do formulário de login
function handleLogin() {
  var loginForm = document.getElementById("form-login");
  validateAndGo(loginForm);
}

function validateAndGo(form) {
  var inputs = form.querySelectorAll(".form-input");
  var filled = true;

  inputs.forEach(function(input) {
    if (!input.value.trim()) {
      input.style.borderColor = "#ff4d6d";
      filled = false;
    } else {
      input.style.borderColor = "";
    }
  });

  if (filled) {
    window.location.href = "dashboard.html";
  }
}

initImages();