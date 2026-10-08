/* ============================================================
   PLAIN — Página de Projetos
   Lista, cria, edita, muda status e exclui projetos no banco.
   Depende de comum.js (API, USUARIO_ID, api(), showToast...).
   ============================================================ */
var projetos = [];
var filtroAtual = "todos";
var editandoId = null; // null = criando um projeto novo

var STATUS = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  concluido:    "Concluído",
  pausado:      "Pausado"
};

var ICON_CAL  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
var ICON_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
var ICON_BOX  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>';

/* ---------- Carregar do servidor ---------- */
function carregarProjetos() {
  return api("GET", "/api/projetos/" + USUARIO_ID)
    .then(function (lista) {
      projetos = lista;
      renderizar();
    })
    .catch(function (e) {
      document.getElementById("listaProjetos").innerHTML =
        '<div class="card empty-state"><div class="empty-state__title">Não foi possível carregar</div>' +
        '<div class="empty-state__text">' + escapeHtml(e.message) + '</div></div>';
    });
}

/* ---------- Datas ---------- */
function hojeISO() {
  var d = new Date();
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}
function formatarData(iso) {
  if (!iso) return "";
  var p = iso.split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}

/* ---------- Desenhar a lista ---------- */
function renderizar() {
  // Contadores das abas e do card lateral
  var cont = { todos: projetos.length, planejamento: 0, em_andamento: 0, concluido: 0, pausado: 0 };
  projetos.forEach(function (p) { cont[p.status]++; });
  document.querySelectorAll("[data-count]").forEach(function (el) {
    el.textContent = cont[el.dataset.count] || 0;
  });
  setText("statTotal", cont.todos);
  setText("statAndamento", cont.em_andamento);
  setText("statConcluidos", cont.concluido);

  var lista = document.getElementById("listaProjetos");
  var visiveis = projetos.filter(function (p) {
    return filtroAtual === "todos" || p.status === filtroAtual;
  });

  if (projetos.length === 0) {
    lista.innerHTML =
      '<div class="card empty-state">' +
        '<div class="empty-state__icon">' + ICON_BOX + '</div>' +
        '<div class="empty-state__title">Você ainda não tem projetos</div>' +
        '<div class="empty-state__text">Crie seu primeiro projeto para acompanhar status, prazo e escopo.</div>' +
        '<button class="btn btn-primary" data-acao="novo">' + ICON_PLUS + ' Criar projeto</button>' +
      '</div>';
    return;
  }
  if (visiveis.length === 0) {
    lista.innerHTML =
      '<div class="card empty-state"><div class="empty-state__text">Nenhum projeto com o status “' +
      escapeHtml(STATUS[filtroAtual]) + '”.</div></div>';
    return;
  }

  lista.innerHTML = visiveis.map(cardHtml).join("");
}

function cardHtml(p) {
  var opcoes = Object.keys(STATUS).map(function (k) {
    return '<option value="' + k + '"' + (k === p.status ? " selected" : "") + ">" + STATUS[k] + "</option>";
  }).join("");

  var meta = [];
  if (p.prazo) {
    var atrasado = p.status !== "concluido" && p.prazo < hojeISO();
    meta.push('<span class="' + (atrasado ? "late" : "") + '">' + ICON_CAL +
      "Prazo " + formatarData(p.prazo) + (atrasado ? " · atrasado" : "") + "</span>");
  } else {
    meta.push("<span>" + ICON_CAL + "Sem prazo</span>");
  }

  return (
    '<article class="card project-card" data-id="' + p.id + '">' +
      '<div class="project-card__top">' +
        "<div>" +
          '<div class="project-card__title">' + escapeHtml(p.titulo) + "</div>" +
          (p.cliente ? '<div class="project-card__client">' + escapeHtml(p.cliente) + "</div>" : "") +
        "</div>" +
        '<select class="status-select st-' + p.status + '" data-acao="status" aria-label="Status do projeto">' + opcoes + "</select>" +
      "</div>" +
      (p.descricao ? '<div class="project-card__desc">' + escapeHtml(p.descricao) + "</div>" : "") +
      '<div class="project-card__foot">' +
        '<div class="project-card__meta">' + meta.join("") + "</div>" +
        '<div class="project-card__actions">' +
          '<button class="btn btn-ghost btn-sm" data-acao="editar">Editar</button>' +
          '<button class="btn btn-danger btn-sm" data-acao="excluir">Excluir</button>' +
        "</div>" +
      "</div>" +
    "</article>"
  );
}

/* ---------- Modal ---------- */
function abrirModal(projeto) {
  editandoId = projeto ? projeto.id : null;
  document.getElementById("modalTitulo").textContent = projeto ? "Editar projeto" : "Novo projeto";
  document.getElementById("fTitulo").value    = projeto ? projeto.titulo : "";
  document.getElementById("fCliente").value   = projeto ? (projeto.cliente || "") : "";
  document.getElementById("fStatus").value    = projeto ? projeto.status : "planejamento";
  document.getElementById("fPrazo").value     = projeto ? (projeto.prazo || "") : "";
  document.getElementById("fDescricao").value = projeto ? (projeto.descricao || "") : "";
  marcarErroTitulo(false);

  document.getElementById("modalProjeto").hidden = false;
  document.getElementById("fTitulo").focus();
}

function fecharModal() {
  document.getElementById("modalProjeto").hidden = true;
  editandoId = null;
}

function marcarErroTitulo(mostrar) {
  document.getElementById("fTitulo").classList.toggle("invalid", mostrar);
  document.getElementById("erroTitulo").hidden = !mostrar;
}

function salvarProjeto(e) {
  e.preventDefault();
  var titulo = document.getElementById("fTitulo").value.trim();
  if (!titulo) {
    marcarErroTitulo(true);
    document.getElementById("fTitulo").focus();
    return;
  }

  var corpo = {
    usuario_id: USUARIO_ID,
    titulo:     titulo,
    cliente:    document.getElementById("fCliente").value.trim(),
    status:     document.getElementById("fStatus").value,
    prazo:      document.getElementById("fPrazo").value || null,
    descricao:  document.getElementById("fDescricao").value.trim()
  };

  var btn = document.getElementById("btnSalvar");
  btn.disabled = true;
  btn.textContent = "Salvando…";

  var criando = editandoId === null;
  var req = criando
    ? api("POST", "/api/projetos", corpo)
    : api("PUT", "/api/projetos/" + editandoId, corpo);

  req.then(function () {
      fecharModal();
      showToast(criando ? "✅ Projeto criado!" : "✅ Projeto atualizado!");
      return carregarProjetos();
    })
    .catch(function (err) { showToast(err.message, 3500); })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = "Salvar projeto";
    });
}

/* ---------- Ações nos cards ---------- */
function acharProjeto(id) {
  return projetos.find(function (p) { return String(p.id) === String(id); });
}

function mudarStatus(projeto, novoStatus, select) {
  var antigo = projeto.status;
  var corpo = {
    usuario_id: USUARIO_ID,
    titulo: projeto.titulo, cliente: projeto.cliente, descricao: projeto.descricao,
    prazo: projeto.prazo, status: novoStatus
  };
  select.disabled = true;
  api("PUT", "/api/projetos/" + projeto.id, corpo)
    .then(function () {
      projeto.status = novoStatus;
      showToast("Status: " + STATUS[novoStatus]);
      renderizar();
    })
    .catch(function (err) {
      select.value = antigo;
      select.disabled = false;
      showToast(err.message, 3500);
    });
}

function excluirProjeto(projeto) {
  if (!confirm('Excluir o projeto "' + projeto.titulo + '"? Essa ação não pode ser desfeita.')) return;
  api("DELETE", "/api/projetos/" + projeto.id + "?usuario_id=" + encodeURIComponent(USUARIO_ID))
    .then(function () {
      showToast("🗑️ Projeto excluído.");
      return carregarProjetos();
    })
    .catch(function (err) { showToast(err.message, 3500); });
}

/* ---------- Eventos ---------- */
document.addEventListener("DOMContentLoaded", function () {
  carregarProjetos();

  document.getElementById("btnNovoProjeto").addEventListener("click", function () { abrirModal(null); });

  // Abas de filtro
  document.getElementById("filtros").addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    filtroAtual = chip.dataset.filtro;
    document.querySelectorAll("#filtros .chip").forEach(function (c) {
      c.classList.toggle("active", c === chip);
    });
    renderizar();
  });

  // Botões dentro da lista (delegação de eventos)
  var lista = document.getElementById("listaProjetos");
  lista.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-acao]");
    if (!btn || btn.tagName === "SELECT") return;
    if (btn.dataset.acao === "novo") return abrirModal(null);

    var card = btn.closest(".project-card");
    var projeto = card && acharProjeto(card.dataset.id);
    if (!projeto) return;
    if (btn.dataset.acao === "editar")  abrirModal(projeto);
    if (btn.dataset.acao === "excluir") excluirProjeto(projeto);
  });
  lista.addEventListener("change", function (e) {
    if (e.target.dataset.acao !== "status") return;
    var projeto = acharProjeto(e.target.closest(".project-card").dataset.id);
    if (projeto) mudarStatus(projeto, e.target.value, e.target);
  });

  // Modal
  var modal = document.getElementById("modalProjeto");
  document.getElementById("formProjeto").addEventListener("submit", salvarProjeto);
  document.getElementById("fTitulo").addEventListener("input", function () {
    if (this.value.trim()) marcarErroTitulo(false);
  });
  modal.addEventListener("click", function (e) {
    if (e.target === modal || e.target.closest("[data-fechar]")) fecharModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) fecharModal();
  });
});
