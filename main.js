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

function switchTab(tab) {
  var tabs = document.querySelectorAll(".tab");
  var forms = document.querySelectorAll(".card__form");

  tabs.forEach(function(t) { t.classList.remove("active"); });
  forms.forEach(function(f) { f.classList.add("hidden"); });  // 

  document.getElementById("tab-" + tab).classList.add("active");
  document.getElementById("form-" + tab).classList.remove("hidden");
}

function handleSubmit() {
  var activeForm = document.querySelector(".card__form:not(.hidden)");
  var inputs = activeForm.querySelectorAll(".form-input");
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
    alert("Mensagem enviada com sucesso!");
    inputs.forEach(function(input) { input.value = ""; });
  }
