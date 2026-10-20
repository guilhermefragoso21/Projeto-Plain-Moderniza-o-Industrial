/* ============================================================
   PLAIN — página Contato
   ============================================================ */
var EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function el(id) { return document.getElementById(id); }

// Mostra/esconde o erro de um campo
function marcarErro(campoId, erroId, mostrar) {
  el(campoId).classList.toggle("invalid", mostrar);
  el(erroId).hidden = !mostrar;
}

function atualizarContador() {
  el("contador").textContent = el("cMensagem").value.length + " / 2000";
}

// Se estiver logado, já preenche nome e e-mail com os dados da conta
function preencherComConta() {
  if (!USUARIO_ID) return;
  api("GET", "/api/conta/" + USUARIO_ID)
    .then(function (c) {
      if (!el("cNome").value)  el("cNome").value  = dadosDaConta(c).nome;
      if (!el("cEmail").value) el("cEmail").value = c.email || "";
    })
    .catch(function () { /* campos ficam em branco */ });
}

function validar() {
  var nome = el("cNome").value.trim();
  var email = el("cEmail").value.trim();
  var msg = el("cMensagem").value.trim();

  var okNome = nome.length > 0;
  var okEmail = EMAIL_OK.test(email);
  var okMsg = msg.length >= 10;

  marcarErro("cNome", "erroNome", !okNome);
  marcarErro("cEmail", "erroEmail", !okEmail);
  marcarErro("cMensagem", "erroMensagem", !okMsg);

  // Coloca o cursor no primeiro campo com problema
  if (!okNome) el("cNome").focus();
  else if (!okEmail) el("cEmail").focus();
  else if (!okMsg) el("cMensagem").focus();

  return okNome && okEmail && okMsg;
}

function enviar(e) {
  e.preventDefault();
  if (!validar()) return;

  var corpo = {
    usuario_id: USUARIO_ID || null,
    nome:     el("cNome").value.trim(),
    email:    el("cEmail").value.trim(),
    assunto:  el("cAssunto").value,
    mensagem: el("cMensagem").value.trim()
  };

  var btn = el("btnEnviar");
  btn.disabled = true;
  btn.lastChild.textContent = " Enviando…";

  api("POST", "/api/contato", corpo)
    .then(function () {
      el("sucessoTexto").textContent =
        "Obrigado, " + corpo.nome.split(" ")[0] + "! Vamos responder no e-mail " + corpo.email + ".";
      el("formContato").hidden = true;
      el("sucessoContato").hidden = false;
      el("formContato").reset();
      atualizarContador();
    })
    .catch(function (err) { showToast(err.message, 3500); })
    .finally(function () {
      btn.disabled = false;
      btn.lastChild.textContent = " Enviar mensagem";
    });
}

document.addEventListener("DOMContentLoaded", function () {
  // Abre já com um assunto escolhido: contato.html?assunto=problema
  var assunto = new URLSearchParams(window.location.search).get("assunto");
  if (assunto && el("cAssunto").querySelector('option[value="' + assunto + '"]')) {
    el("cAssunto").value = assunto;
  }

  preencherComConta();
  el("formContato").addEventListener("submit", enviar);
  el("cMensagem").addEventListener("input", atualizarContador);

  // Apaga o aviso de erro assim que o campo é corrigido
  el("cNome").addEventListener("input", function () {
    if (this.value.trim()) marcarErro("cNome", "erroNome", false);
  });
  el("cEmail").addEventListener("input", function () {
    if (EMAIL_OK.test(this.value.trim())) marcarErro("cEmail", "erroEmail", false);
  });
  el("cMensagem").addEventListener("input", function () {
    if (this.value.trim().length >= 10) marcarErro("cMensagem", "erroMensagem", false);
  });

  el("btnNovaMensagem").addEventListener("click", function () {
    el("sucessoContato").hidden = true;
    el("formContato").hidden = false;
    preencherComConta();
    el("cMensagem").focus();
  });
});
