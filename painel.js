/* ============================================================
   PLAIN — Menu interativo do Início
   Seções: Equipamentos, Manutenções, Relatórios, Monitoramento
   Navegação por "#" na URL (ex.: dashboard.html#equipamentos),
   então o botão Voltar do navegador funciona.
   Usa escapeHtml, setText e showToast definidos em dashboard.js.
   ============================================================ */
(function () {
  var U = localStorage.getItem("usuario_id");
  if (!U) return; // dashboard.js já manda para o login

  /* ---------- Rótulos ---------- */
  var STATUS_EQ = { operando: "Operando", manutencao: "Em manutenção", parado: "Parado", retrofit: "Em retrofit" };
  var STATUS_MA = { agendada: "Agendada", em_execucao: "Em execução", concluida: "Concluída", cancelada: "Cancelada" };
  var TIPO_MA   = { preventiva: "Preventiva", corretiva: "Corretiva", preditiva: "Preditiva" };
  var TIPOS_SUGERIDOS = ["Torno CNC", "Centro de usinagem", "Fresadora", "Prensa", "Injetora", "Compressor",
                         "Esteira", "Robô", "Forno", "Bomba", "Painel elétrico"];

  var ICON = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    cal:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2A2.5 2.5 0 0 1 9.5 15M12 6v1.5M12 16.5V18"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>',
    equip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    tool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
    alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>',
    print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/></svg>'
  };

  /* ---------- Estado ---------- */
  var D = { equip: [], manut: [], proj: [] };
  var UI = {
    secao: "feed",
    eqFiltro: "todos", eqBusca: "",
    maFiltro: "todas", maEquip: "",
    relPeriodo: "6m",
    monAuto: true, monTimer: null, monHora: null
  };

  /* ---------- Servidor ---------- */
  function api(metodo, caminho, corpo) {
    var opts = { method: metodo, headers: {} };
    if (corpo !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(corpo);
    }
    return fetch(API + caminho, opts).then(
      function (res) {
        return res.json().catch(function () { return {}; }).then(function (b) {
          if (!res.ok) throw new Error(b.erro || ("Erro " + res.status));
          return b;
        });
      },
      function () { throw new Error("Erro de conexão. O servidor (server.js) está rodando?"); }
    );
  }

  function carregar() {
    return Promise.all([
      api("GET", "/api/equipamentos/" + U),
      api("GET", "/api/manutencoes/" + U),
      api("GET", "/api/projetos/" + U).catch(function () { return []; })
    ]).then(function (r) {
      D.equip = r[0]; D.manut = r[1]; D.proj = r[2];
      UI.monHora = new Date();
      atualizarMetricas();
    });
  }

  /* ---------- Datas e números ---------- */
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function hoje() { return iso(new Date()); }
  function data(isoTxt) { return new Date(isoTxt + "T00:00:00"); }
  function difDias(de, ate) { return Math.round((data(ate) - data(de)) / 864e5); }
  function fmtData(isoTxt) {
    if (!isoTxt) return "—";
    var p = isoTxt.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  var MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  var MOEDA0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  function fmtMoeda(v) { return MOEDA.format(v || 0); }
  function fmtMoedaCurta(v) { return MOEDA0.format(Math.round(v || 0)); } // sem centavos, para caber nos gráficos
  function plural(n, um, varios) { return n + " " + (n === 1 ? um : varios); }
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  /* ---------- Regras derivadas ---------- */
  function aberta(m) { return m.status === "agendada" || m.status === "em_execucao"; }
  function atrasada(m) { return aberta(m) && m.data_prevista < hoje(); }
  function manutsDo(eqId) { return D.manut.filter(function (m) { return String(m.equipamento_id) === String(eqId); }); }
  function proxima(eqId) {
    return manutsDo(eqId).filter(aberta)
      .sort(function (a, b) { return a.data_prevista < b.data_prevista ? -1 : 1; })[0] || null;
  }
  function ultima(eqId) {
    return manutsDo(eqId).filter(function (m) { return m.status === "concluida" && m.data_conclusao; })
      .sort(function (a, b) { return a.data_conclusao > b.data_conclusao ? -1 : 1; })[0] || null;
  }
  function acharEquip(id) { return D.equip.find(function (e) { return String(e.id) === String(id); }); }
  function acharManut(id) { return D.manut.find(function (m) { return String(m.id) === String(id); }); }

  function disponibilidade() {
    if (!D.equip.length) return null;
    var op = D.equip.filter(function (e) { return e.status === "operando"; }).length;
    return Math.round(op / D.equip.length * 100);
  }

  // Alertas mostrados no Monitoramento (e contados no Início)
  function alertas() {
    var lista = [], h = hoje();
    D.manut.filter(atrasada).forEach(function (m) {
      var d = difDias(m.data_prevista, h);
      lista.push({ nivel: "alto", equipId: m.equipamento_id, manutId: m.id,
        titulo: "Manutenção atrasada há " + plural(d, "dia", "dias"),
        texto: m.titulo + " — " + m.equipamento_nome + " (prevista " + fmtData(m.data_prevista) + ")" });
    });
    D.equip.filter(function (e) { return e.status === "parado"; }).forEach(function (e) {
      lista.push({ nivel: "alto", equipId: e.id,
        titulo: "Equipamento parado",
        texto: e.nome + (proxima(e.id) ? "" : " — nenhuma manutenção agendada") });
    });
    D.manut.filter(function (m) {
      if (!aberta(m) || m.data_prevista < h) return false;
      return difDias(h, m.data_prevista) <= 7;
    }).forEach(function (m) {
      var d = difDias(h, m.data_prevista);
      lista.push({ nivel: "medio", equipId: m.equipamento_id, manutId: m.id,
        titulo: d === 0 ? "Manutenção prevista para hoje" : "Manutenção em " + plural(d, "dia", "dias"),
        texto: m.titulo + " — " + m.equipamento_nome });
    });
    return lista;
  }

  // Indicadores do card "Seus Indicadores" no Início
  function atualizarMetricas() {
    var disp = disponibilidade();
    setText("metricDisponibilidade", disp === null ? "—" : disp + "%");
    setText("metricAlertas", D.equip.length || D.manut.length ? alertas().length : "—");
    setText("metricConcluidos", D.manut.filter(function (m) { return m.status === "concluida"; }).length);
  }

  /* ---------- Pedaços de HTML reutilizados ---------- */
  function opcoes(mapa, atual) {
    return Object.keys(mapa).map(function (k) {
      return '<option value="' + k + '"' + (k === atual ? " selected" : "") + ">" + mapa[k] + "</option>";
    }).join("");
  }
  function cabecalho(titulo, sub, direita) {
    return '<div class="card page-head"><div>' +
      '<h1 class="page-head__title">' + titulo + '</h1>' +
      '<p class="page-head__sub">' + sub + "</p></div>" + (direita || "") + "</div>";
  }
  function vazio(icone, titulo, texto, botao) {
    return '<div class="card empty-state"><div class="empty-state__icon">' + icone + "</div>" +
      '<div class="empty-state__title">' + titulo + "</div>" +
      '<div class="empty-state__text">' + texto + "</div>" + (botao || "") + "</div>";
  }
  function chip(attr, valor, rotulo, n, ativo) {
    return '<button class="chip' + (ativo ? " active" : "") + '" ' + attr + '="' + valor + '">' + rotulo +
      ' <span class="chip__count">' + n + "</span></button>";
  }
  function campo(id, rotulo, html, cheio, erro) {
    return '<div class="field' + (cheio ? " field--full" : "") + '"><label for="' + id + '">' + rotulo + "</label>" + html +
      (erro ? '<span class="field__error" id="' + id + 'Erro" hidden>' + erro + "</span>" : "") + "</div>";
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function erroCampo(id, mostrar) {
    var el = document.getElementById(id), er = document.getElementById(id + "Erro");
    if (el) el.classList.toggle("invalid", mostrar);
    if (er) er.hidden = !mostrar;
    if (mostrar && el) el.focus();
  }

  /* ---------- Modal genérico ---------- */
  function modal() {
    var ov = document.getElementById("painelModal");
    if (ov) return ov;
    ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.id = "painelModal";
    ov.hidden = true;
    ov.innerHTML =
      '<form class="modal" novalidate>' +
        '<div class="modal__head"><h2 class="modal__title"></h2>' +
          '<button type="button" class="modal__close" data-fechar aria-label="Fechar">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
        '<div class="modal__body"></div>' +
        '<div class="modal__foot"><button type="button" class="btn btn-ghost" data-fechar>Cancelar</button>' +
          '<button type="submit" class="btn btn-primary">Salvar</button></div>' +
      "</form>";
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) {
      if (e.target === ov || e.target.closest("[data-fechar]")) fecharModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !ov.hidden) fecharModal();
    });
    ov.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var r = ov._salvar && ov._salvar();
      if (!r || !r.then) return; // validação falhou
      var btn = ov.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = "Salvando…";
      r.then(fecharModal)
        .catch(function (err) { showToast(err.message, 3500); })
        .finally(function () { btn.disabled = false; btn.textContent = ov._rotuloBotao; });
    });
    return ov;
  }
  function abrirModal(titulo, corpo, rotuloBotao, salvar, aoAbrir) {
    var ov = modal();
    ov.querySelector(".modal__title").textContent = titulo;
    ov.querySelector(".modal__body").innerHTML = corpo;
    ov._rotuloBotao = rotuloBotao;
    ov.querySelector('button[type="submit"]').textContent = rotuloBotao;
    ov._salvar = salvar;
    ov.hidden = false;
    if (aoAbrir) aoAbrir(ov);
    var primeiro = ov.querySelector(".modal__body input, .modal__body select");
    if (primeiro) primeiro.focus();
  }
  function fecharModal() {
    var ov = document.getElementById("painelModal");
    if (ov) ov.hidden = true;
  }

  // Depois de salvar algo: recarrega os dados e redesenha a seção atual
  function recarregar(msg) {
    if (msg) showToast(msg);
    return carregar().then(renderizar);
  }

  /* ============================================================
     EQUIPAMENTOS
     ============================================================ */
  function secaoEquipamentos() {
    var p = document.getElementById("painel");
    var botao = '<button class="btn btn-primary" data-acao="novo-equip">' + ICON.plus + " Novo equipamento</button>";
    var html = cabecalho("Equipamentos", "Cadastre as máquinas da sua planta e acompanhe a situação de cada uma.", botao);

    if (!D.equip.length) {
      p.innerHTML = html + vazio(ICON.equip, "Nenhum equipamento cadastrado",
        "Cadastre suas máquinas para registrar manutenções, ver relatórios e acompanhar a situação da planta.",
        '<button class="btn btn-primary" data-acao="novo-equip">' + ICON.plus + " Cadastrar equipamento</button>");
      return;
    }

    var cont = { todos: D.equip.length, operando: 0, manutencao: 0, parado: 0, retrofit: 0 };
    D.equip.forEach(function (e) { cont[e.status]++; });
    html += '<div class="card filter-bar" id="filtrosEquip">' +
      chip("data-filtro-eq", "todos", "Todos", cont.todos, UI.eqFiltro === "todos") +
      Object.keys(STATUS_EQ).map(function (k) {
        return chip("data-filtro-eq", k, STATUS_EQ[k], cont[k], UI.eqFiltro === k);
      }).join("") +
      '<input class="filter-bar__search" id="buscaEquip" type="search" placeholder="Buscar por nome, tipo, local…" value="' +
      escapeHtml(UI.eqBusca) + '" /></div>' +
      '<div id="listaEquip"></div>';
    p.innerHTML = html;
    listaEquipamentos();
  }

  function listaEquipamentos() {
    var termo = UI.eqBusca.toLowerCase();
    var visiveis = D.equip.filter(function (e) {
      if (UI.eqFiltro !== "todos" && e.status !== UI.eqFiltro) return false;
      if (!termo) return true;
      return [e.nome, e.tipo, e.fabricante, e.modelo, e.localizacao].join(" ").toLowerCase().indexOf(termo) !== -1;
    });
    var alvo = document.getElementById("listaEquip");
    if (!visiveis.length) {
      alvo.innerHTML = '<div class="card empty-state"><div class="empty-state__text">Nenhum equipamento encontrado com esse filtro.</div></div>';
      return;
    }
    alvo.innerHTML = '<div class="equip-grid">' + visiveis.map(cardEquip).join("") + "</div>";
  }

  function cardEquip(e) {
    var prox = proxima(e.id), ult = ultima(e.id), qtd = manutsDo(e.id).length;
    var sub = [e.tipo, [e.fabricante, e.modelo].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
    var proxTxt = prox
      ? '<b class="' + (atrasada(prox) ? "late" : "") + '">' + fmtData(prox.data_prevista) + (atrasada(prox) ? " · atrasada" : "") + "</b>"
      : "<b>—</b>";
    return '<article class="card equip-card eq-' + e.status + '" data-id="' + e.id + '">' +
      '<div class="project-card__top"><div>' +
        '<div class="project-card__title">' + escapeHtml(e.nome) + "</div>" +
        (sub ? '<div class="project-card__client">' + escapeHtml(sub) + "</div>" : "") +
      "</div>" +
      '<select class="status-select st-eq-' + e.status + '" data-acao="status-equip" aria-label="Status do equipamento">' +
        opcoes(STATUS_EQ, e.status) + "</select></div>" +
      '<dl class="equip-card__info">' +
        "<div><dt>Local</dt><dd>" + escapeHtml(e.localizacao || "—") + "</dd></div>" +
        "<div><dt>Ano</dt><dd>" + (e.ano_fabricacao || "—") + "</dd></div>" +
        "<div><dt>Última manutenção</dt><dd>" + (ult ? fmtData(ult.data_conclusao) : "—") + "</dd></div>" +
        "<div><dt>Próxima</dt><dd>" + proxTxt + "</dd></div>" +
      "</dl>" +
      '<div class="project-card__foot">' +
        '<button class="link-btn" data-acao="ver-manut">' + ICON.tool + plural(qtd, "manutenção", "manutenções") + "</button>" +
        '<div class="project-card__actions">' +
          '<button class="btn btn-ghost btn-sm" data-acao="editar-equip">Editar</button>' +
          '<button class="btn btn-danger btn-sm" data-acao="excluir-equip">Excluir</button>' +
        "</div></div></article>";
  }

  function modalEquipamento(e) {
    var corpo =
      campo("fEqNome", "Nome / identificação", '<input id="fEqNome" maxlength="150" placeholder="Ex.: Torno CNC T-01" value="' + escapeHtml(e ? e.nome : "") + '" />', true, "Informe o nome do equipamento.") +
      campo("fEqTipo", "Tipo <small>(opcional)</small>", '<input id="fEqTipo" maxlength="80" list="tiposEquip" placeholder="Ex.: Prensa" value="' + escapeHtml(e ? e.tipo || "" : "") + '" />' +
        '<datalist id="tiposEquip">' + TIPOS_SUGERIDOS.map(function (t) { return '<option value="' + t + '">'; }).join("") + "</datalist>") +
      campo("fEqStatus", "Status", '<select id="fEqStatus">' + opcoes(STATUS_EQ, e ? e.status : "operando") + "</select>") +
      campo("fEqFab", "Fabricante <small>(opcional)</small>", '<input id="fEqFab" maxlength="100" placeholder="Ex.: Romi" value="' + escapeHtml(e ? e.fabricante || "" : "") + '" />') +
      campo("fEqModelo", "Modelo <small>(opcional)</small>", '<input id="fEqModelo" maxlength="100" placeholder="Ex.: Centur 30D" value="' + escapeHtml(e ? e.modelo || "" : "") + '" />') +
      campo("fEqLocal", "Localização <small>(opcional)</small>", '<input id="fEqLocal" maxlength="150" placeholder="Ex.: Galpão 2 — Usinagem" value="' + escapeHtml(e ? e.localizacao || "" : "") + '" />') +
      campo("fEqAno", "Ano de fabricação <small>(opcional)</small>", '<input id="fEqAno" type="number" min="1900" max="' + (new Date().getFullYear() + 1) + '" placeholder="Ex.: 2005" value="' + (e && e.ano_fabricacao ? e.ano_fabricacao : "") + '" />', false, "Ano inválido.") +
      campo("fEqObs", "Observações <small>(opcional)</small>", '<textarea id="fEqObs" maxlength="2000" placeholder="Características, histórico, cuidados…">' + escapeHtml(e ? e.observacoes || "" : "") + "</textarea>", true);

    abrirModal(e ? "Editar equipamento" : "Novo equipamento", corpo, "Salvar equipamento", function () {
      var nome = val("fEqNome"), ano = val("fEqAno");
      erroCampo("fEqAno", false);
      if (!nome) { erroCampo("fEqNome", true); return false; }
      erroCampo("fEqNome", false);
      var anoNum = Number(ano);
      if (ano && (!Number.isInteger(anoNum) || anoNum < 1900 || anoNum > new Date().getFullYear() + 1)) {
        erroCampo("fEqAno", true); return false;
      }
      var corpo = {
        usuario_id: U, nome: nome, tipo: val("fEqTipo"), status: val("fEqStatus"),
        fabricante: val("fEqFab"), modelo: val("fEqModelo"), localizacao: val("fEqLocal"),
        ano_fabricacao: ano || null, observacoes: val("fEqObs")
      };
      var req = e ? api("PUT", "/api/equipamentos/" + e.id, corpo) : api("POST", "/api/equipamentos", corpo);
      return req.then(function () { return recarregar(e ? "✅ Equipamento atualizado!" : "✅ Equipamento cadastrado!"); });
    });
  }

  function corpoEquip(e, novoStatus) {
    return {
      usuario_id: U, nome: e.nome, tipo: e.tipo, fabricante: e.fabricante, modelo: e.modelo,
      localizacao: e.localizacao, ano_fabricacao: e.ano_fabricacao, observacoes: e.observacoes,
      status: novoStatus || e.status
    };
  }

  function mudarStatusEquip(e, novo) {
    if (!e || e.status === novo) return;
    api("PUT", "/api/equipamentos/" + e.id, corpoEquip(e, novo))
      .then(function () { return recarregar(e.nome + ": " + STATUS_EQ[novo]); })
      .catch(function (err) { showToast(err.message, 3500); renderizar(); });
  }

  function excluirEquip(e) {
    var n = manutsDo(e.id).length;
    var aviso = 'Excluir o equipamento "' + e.nome + '"?' +
      (n ? "\n\nAs " + plural(n, "manutenção registrada", "manutenções registradas") + " dele também serão apagadas." : "") +
      "\n\nEssa ação não pode ser desfeita.";
    if (!confirm(aviso)) return;
    api("DELETE", "/api/equipamentos/" + e.id + "?usuario_id=" + encodeURIComponent(U))
      .then(function () { return recarregar("🗑️ Equipamento excluído."); })
      .catch(function (err) { showToast(err.message, 3500); });
  }

  /* ============================================================
     MANUTENÇÕES
     ============================================================ */
  function secaoManutencoes() {
    var p = document.getElementById("painel");
    var temEquip = D.equip.length > 0;
    var botao = temEquip ? '<button class="btn btn-primary" data-acao="nova-manut">' + ICON.plus + " Nova manutenção</button>" : "";
    var html = cabecalho("Manutenções", "Agende e registre as manutenções preventivas, corretivas e preditivas.", botao);

    if (!temEquip) {
      p.innerHTML = html + vazio(ICON.tool, "Cadastre um equipamento primeiro",
        "Toda manutenção fica ligada a uma máquina. Cadastre seus equipamentos para começar.",
        '<a class="btn btn-primary" href="#equipamentos">Ir para Equipamentos</a>');
      return;
    }
    if (!D.manut.length) {
      p.innerHTML = html + vazio(ICON.tool, "Nenhuma manutenção registrada",
        "Agende a próxima preventiva ou registre um serviço já feito para montar o histórico.",
        '<button class="btn btn-primary" data-acao="nova-manut">' + ICON.plus + " Registrar manutenção</button>");
      return;
    }

    var doEquip = D.manut.filter(function (m) { return !UI.maEquip || String(m.equipamento_id) === String(UI.maEquip); });
    var cont = {
      todas: doEquip.length,
      atrasadas: doEquip.filter(atrasada).length,
      agendada: 0, em_execucao: 0, concluida: 0, cancelada: 0
    };
    doEquip.forEach(function (m) { cont[m.status]++; });

    html += '<div class="card filter-bar" id="filtrosManut">' +
      chip("data-filtro-ma", "todas", "Todas", cont.todas, UI.maFiltro === "todas") +
      chip("data-filtro-ma", "atrasadas", "Atrasadas", cont.atrasadas, UI.maFiltro === "atrasadas") +
      ["agendada", "em_execucao", "concluida", "cancelada"].map(function (k) {
        return chip("data-filtro-ma", k, STATUS_MA[k], cont[k], UI.maFiltro === k);
      }).join("") +
      '<select class="filter-bar__select" id="filtroEquipManut" aria-label="Filtrar por equipamento">' +
        '<option value="">Todos os equipamentos</option>' +
        D.equip.map(function (e) {
          return '<option value="' + e.id + '"' + (String(e.id) === String(UI.maEquip) ? " selected" : "") + ">" + escapeHtml(e.nome) + "</option>";
        }).join("") +
      "</select></div>";

    var visiveis = doEquip.filter(function (m) {
      if (UI.maFiltro === "todas") return true;
      if (UI.maFiltro === "atrasadas") return atrasada(m);
      return m.status === UI.maFiltro;
    }).sort(function (a, b) {
      // Abertas primeiro (mais urgentes no topo); depois o histórico, mais recente primeiro
      var aa = aberta(a), bb = aberta(b);
      if (aa !== bb) return aa ? -1 : 1;
      if (aa) return a.data_prevista < b.data_prevista ? -1 : 1;
      var da = a.data_conclusao || a.data_prevista, db = b.data_conclusao || b.data_prevista;
      return da > db ? -1 : 1;
    });

    html += visiveis.length
      ? '<div class="project-list">' + visiveis.map(cardManut).join("") + "</div>"
      : '<div class="card empty-state"><div class="empty-state__text">Nenhuma manutenção com esse filtro.</div></div>';
    p.innerHTML = html;
  }

  function cardManut(m) {
    var late = atrasada(m);
    var meta = [];
    if (m.status === "concluida") {
      meta.push("<span>" + ICON.check + "Concluída em " + fmtData(m.data_conclusao || m.data_prevista) + "</span>");
    } else {
      meta.push('<span class="' + (late ? "late" : "") + '">' + ICON.cal + "Prevista " + fmtData(m.data_prevista) +
        (late ? " · atrasada " + plural(difDias(m.data_prevista, hoje()), "dia", "dias") : "") + "</span>");
    }
    if (m.responsavel) meta.push("<span>" + ICON.user + escapeHtml(m.responsavel) + "</span>");
    if (m.custo !== null && m.custo !== undefined) meta.push("<span>" + ICON.coin + fmtMoeda(m.custo) + "</span>");

    return '<article class="card project-card manut-card' + (late ? " manut-card--late" : "") + '" data-id="' + m.id + '">' +
      '<div class="project-card__top"><div>' +
        '<div class="project-card__title">' + escapeHtml(m.titulo) + "</div>" +
        '<div class="project-card__client"><span class="tag tipo-' + m.tipo + '">' + TIPO_MA[m.tipo] + "</span> " + escapeHtml(m.equipamento_nome) + "</div>" +
      "</div>" +
      '<select class="status-select st-ma-' + m.status + '" data-acao="status-manut" aria-label="Status da manutenção">' +
        opcoes(STATUS_MA, m.status) + "</select></div>" +
      (m.observacoes ? '<div class="project-card__desc">' + escapeHtml(m.observacoes) + "</div>" : "") +
      '<div class="project-card__foot"><div class="project-card__meta">' + meta.join("") + "</div>" +
        '<div class="project-card__actions">' +
          '<button class="btn btn-ghost btn-sm" data-acao="editar-manut">Editar</button>' +
          '<button class="btn btn-danger btn-sm" data-acao="excluir-manut">Excluir</button>' +
        "</div></div></article>";
  }

  function modalManutencao(m, equipPadrao) {
    var eqSel = m ? m.equipamento_id : (equipPadrao || UI.maEquip || (D.equip[0] && D.equip[0].id));
    var status = m ? m.status : "agendada";
    var corpo =
      campo("fMaEquip", "Equipamento", '<select id="fMaEquip">' + D.equip.map(function (e) {
        return '<option value="' + e.id + '"' + (String(e.id) === String(eqSel) ? " selected" : "") + ">" + escapeHtml(e.nome) + "</option>";
      }).join("") + "</select>", true) +
      campo("fMaTitulo", "Serviço", '<input id="fMaTitulo" maxlength="150" placeholder="Ex.: Troca de rolamentos do eixo-árvore" value="' + escapeHtml(m ? m.titulo : "") + '" />', true, "Descreva o serviço.") +
      campo("fMaTipo", "Tipo", '<select id="fMaTipo">' + opcoes(TIPO_MA, m ? m.tipo : "preventiva") + "</select>") +
      campo("fMaStatus", "Status", '<select id="fMaStatus">' + opcoes(STATUS_MA, status) + "</select>") +
      campo("fMaPrev", "Data prevista", '<input id="fMaPrev" type="date" value="' + (m ? m.data_prevista : hoje()) + '" />', false, "Informe a data prevista.") +
      '<div class="field" id="campoConclusao"' + (status === "concluida" ? "" : " hidden") + '><label for="fMaConc">Data de conclusão</label>' +
        '<input id="fMaConc" type="date" value="' + (m && m.data_conclusao ? m.data_conclusao : hoje()) + '" /></div>' +
      campo("fMaResp", "Responsável <small>(opcional)</small>", '<input id="fMaResp" maxlength="150" placeholder="Técnico ou empresa" value="' + escapeHtml(m ? m.responsavel || "" : "") + '" />') +
      campo("fMaCusto", "Custo em R$ <small>(opcional)</small>", '<input id="fMaCusto" type="number" min="0" step="0.01" placeholder="0,00" value="' + (m && m.custo !== null && m.custo !== undefined ? m.custo : "") + '" />', false, "Custo inválido.") +
      campo("fMaObs", "Observações <small>(opcional)</small>", '<textarea id="fMaObs" maxlength="2000" placeholder="Peças trocadas, causa da falha, recomendações…">' + escapeHtml(m ? m.observacoes || "" : "") + "</textarea>", true);

    abrirModal(m ? "Editar manutenção" : "Nova manutenção", corpo, "Salvar manutenção", function () {
      var titulo = val("fMaTitulo"), prev = val("fMaPrev"), custo = val("fMaCusto");
      ["fMaTitulo", "fMaPrev", "fMaCusto"].forEach(function (id) { erroCampo(id, false); });
      if (!titulo) { erroCampo("fMaTitulo", true); return false; }
      if (!prev) { erroCampo("fMaPrev", true); return false; }
      if (custo && (isNaN(Number(custo)) || Number(custo) < 0)) { erroCampo("fMaCusto", true); return false; }
      var st = val("fMaStatus");
      var corpo = {
        usuario_id: U, equipamento_id: val("fMaEquip"), titulo: titulo, tipo: val("fMaTipo"), status: st,
        data_prevista: prev, data_conclusao: st === "concluida" ? (val("fMaConc") || hoje()) : null,
        responsavel: val("fMaResp"), custo: custo === "" ? null : Number(custo), observacoes: val("fMaObs")
      };
      var req = m ? api("PUT", "/api/manutencoes/" + m.id, corpo) : api("POST", "/api/manutencoes", corpo);
      return req.then(function () { return recarregar(m ? "✅ Manutenção atualizada!" : "✅ Manutenção registrada!"); });
    }, function () {
      // Data de conclusão só aparece quando o status é "Concluída"
      document.getElementById("fMaStatus").addEventListener("change", function () {
        document.getElementById("campoConclusao").hidden = this.value !== "concluida";
      });
    });
  }

  function mudarStatusManut(m, novo) {
    if (!m || m.status === novo) return;
    var corpo = {
      usuario_id: U, equipamento_id: m.equipamento_id, titulo: m.titulo, tipo: m.tipo, status: novo,
      data_prevista: m.data_prevista, data_conclusao: novo === "concluida" ? hoje() : null,
      responsavel: m.responsavel, custo: m.custo, observacoes: m.observacoes
    };
    api("PUT", "/api/manutencoes/" + m.id, corpo)
      .then(function () { return recarregar("Manutenção: " + STATUS_MA[novo]); })
      .catch(function (err) { showToast(err.message, 3500); renderizar(); });
  }

  function excluirManut(m) {
    if (!confirm('Excluir a manutenção "' + m.titulo + '"? Essa ação não pode ser desfeita.')) return;
    api("DELETE", "/api/manutencoes/" + m.id + "?usuario_id=" + encodeURIComponent(U))
      .then(function () { return recarregar("🗑️ Manutenção excluída."); })
      .catch(function (err) { showToast(err.message, 3500); });
  }

  /* ============================================================
     RELATÓRIOS
     ============================================================ */
  var PERIODOS = { "30d": "Últimos 30 dias", "6m": "Últimos 6 meses", "12m": "Últimos 12 meses", "tudo": "Todo o período" };

  function inicioPeriodo() {
    var d = new Date();
    if (UI.relPeriodo === "30d") { d.setDate(d.getDate() - 30); return iso(d); }
    if (UI.relPeriodo === "6m")  { return iso(new Date(d.getFullYear(), d.getMonth() - 5, 1)); }
    if (UI.relPeriodo === "12m") { return iso(new Date(d.getFullYear(), d.getMonth() - 11, 1)); }
    return "0000-00-00";
  }
  function dataRef(m) { return m.data_conclusao || m.data_prevista; }
  function manutsPeriodo() {
    var ini = inicioPeriodo(), fim = hoje();
    // Entra no período o que foi concluído ou estava previsto entre o início e hoje
    return D.manut.filter(function (m) { var d = dataRef(m); return d >= ini && d <= fim; });
  }

  function barras(itens, total, formato) {
    if (!itens.length || !total) return '<p class="rel-vazio">Sem dados no período.</p>';
    return '<div class="hbars">' + itens.map(function (i) {
      var pct = Math.round(i.valor / total * 100);
      return '<div class="hbar"><span class="hbar__label">' + i.rotulo + "</span>" +
        '<span class="hbar__track"><span class="hbar__fill ' + (i.classe || "") + '" style="width:' + Math.max(pct, i.valor ? 2 : 0) + '%"></span></span>' +
        '<span class="hbar__valor">' + (formato ? formato(i.valor) : i.valor) + ' <small>' + pct + "%</small></span></div>";
    }).join("") + "</div>";
  }

  function secaoRelatorios() {
    var p = document.getElementById("painel");
    var botoes = '<div class="page-head__acoes">' +
      '<button class="btn btn-ghost" data-acao="csv">' + ICON.down + " Exportar CSV</button>" +
      '<button class="btn btn-ghost" data-acao="imprimir">' + ICON.print + " Imprimir</button></div>";
    var html = cabecalho("Relatórios", "Indicadores calculados a partir dos seus equipamentos, manutenções e projetos.", botoes);

    if (!D.equip.length && !D.manut.length) {
      p.innerHTML = cabecalho("Relatórios", "Indicadores calculados a partir dos seus equipamentos, manutenções e projetos.") +
        vazio(ICON.chart, "Ainda não há dados para relatório",
          "Cadastre equipamentos e registre manutenções — os gráficos aparecem aqui automaticamente.",
          '<a class="btn btn-primary" href="#equipamentos">Cadastrar equipamentos</a>');
      return;
    }

    html += '<div class="card filter-bar" id="filtrosRel">' + Object.keys(PERIODOS).map(function (k) {
      return '<button class="chip' + (UI.relPeriodo === k ? " active" : "") + '" data-periodo="' + k + '">' + PERIODOS[k] + "</button>";
    }).join("") + "</div>";

    var lista = manutsPeriodo();
    var validas = lista.filter(function (m) { return m.status !== "cancelada"; });
    var concl = validas.filter(function (m) { return m.status === "concluida"; });
    var noPrazo = concl.filter(function (m) { return (m.data_conclusao || m.data_prevista) <= m.data_prevista; });
    var custo = validas.reduce(function (s, m) { return s + (m.custo || 0); }, 0);
    var disp = disponibilidade();
    var atrasadasAgora = D.manut.filter(atrasada).length;

    html += '<div class="kpi-grid">' +
      kpi(validas.length, "Manutenções no período", plural(concl.length, "concluída", "concluídas")) +
      kpi(concl.length ? Math.round(noPrazo.length / concl.length * 100) + "%" : "—", "Concluídas no prazo", concl.length ? noPrazo.length + " de " + concl.length : "nenhuma concluída") +
      kpi('<span title="' + fmtMoeda(custo) + '">' + fmtMoedaCurta(custo) + "</span>", "Custo no período", validas.length ? "média " + fmtMoeda(custo / validas.length) : "") +
      kpi(disp === null ? "—" : disp + "%", "Disponibilidade atual", plural(D.equip.length, "equipamento", "equipamentos")) +
      kpi(atrasadasAgora, "Atrasadas agora", atrasadasAgora ? "precisam de atenção" : "tudo em dia", atrasadasAgora ? "kpi--alerta" : "kpi--ok") +
      "</div>";

    // 1) Por tipo
    var porTipo = Object.keys(TIPO_MA).map(function (k) {
      return { rotulo: TIPO_MA[k], valor: validas.filter(function (m) { return m.tipo === k; }).length, classe: "tipo-" + k };
    });
    // 2) Equipamentos por status (situação atual)
    var porStatus = Object.keys(STATUS_EQ).map(function (k) {
      return { rotulo: STATUS_EQ[k], valor: D.equip.filter(function (e) { return e.status === k; }).length, classe: "st-bar-" + k };
    });

    html += '<div class="rel-grid">' +
      '<section class="card rel-card"><h2 class="widget-card__title">Manutenções por tipo</h2>' + barras(porTipo, validas.length) +
        '<p class="rel-nota">Quanto mais preventivas e preditivas em relação às corretivas, menos paradas inesperadas.</p></section>' +
      '<section class="card rel-card"><h2 class="widget-card__title">Equipamentos por situação</h2>' + barras(porStatus, D.equip.length) + "</section>" +
      '<section class="card rel-card rel-card--largo"><h2 class="widget-card__title">Custo de manutenção por mês</h2>' + graficoMeses(validas) + "</section>" +
      '<section class="card rel-card rel-card--largo"><h2 class="widget-card__title">Equipamentos com mais manutenções no período</h2>' + rankingEquip(validas) + "</section>" +
      '<section class="card rel-card rel-card--largo"><h2 class="widget-card__title">Projetos</h2>' + resumoProjetos() + "</section>" +
      "</div>";
    p.innerHTML = html;
  }

  function kpi(valor, rotulo, sub, classe) {
    return '<div class="card kpi ' + (classe || "") + '"><div class="kpi__valor">' + valor + "</div>" +
      '<div class="kpi__rotulo">' + rotulo + "</div>" + (sub ? '<div class="kpi__sub">' + sub + "</div>" : "") + "</div>";
  }

  function graficoMeses(lista) {
    var n = UI.relPeriodo === "30d" ? 3 : (UI.relPeriodo === "6m" ? 6 : 12);
    var agora = new Date(), meses = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      meses.push({ chave: iso(d).slice(0, 7), rotulo: MESES[d.getMonth()] + (d.getMonth() === 0 || i === n - 1 ? "/" + String(d.getFullYear()).slice(2) : ""), valor: 0, qtd: 0 });
    }
    D.manut.forEach(function (m) {
      if (m.status === "cancelada") return;
      var mes = meses.find(function (x) { return x.chave === dataRef(m).slice(0, 7); });
      if (mes && dataRef(m) <= hoje()) { mes.valor += m.custo || 0; mes.qtd++; }
    });
    var max = Math.max.apply(null, meses.map(function (x) { return x.valor; }));
    if (!max) return '<p class="rel-vazio">Nenhum custo registrado nesses meses. Preencha o campo “Custo” nas manutenções.</p>';
    return '<div class="colchart">' + meses.map(function (x) {
      var h = Math.round(x.valor / max * 100);
      return '<div class="colchart__col" title="' + x.rotulo + ": " + fmtMoeda(x.valor) + " (" + plural(x.qtd, "manutenção", "manutenções") + ')">' +
        '<span class="colchart__valor">' + (x.valor ? fmtMoedaCurta(x.valor) : "") + "</span>" +
        '<span class="colchart__barra" style="height:' + Math.max(h, x.valor ? 3 : 0) + '%"></span>' +
        '<span class="colchart__rotulo">' + x.rotulo + "</span></div>";
    }).join("") + "</div>";
  }

  function rankingEquip(lista) {
    var mapa = {};
    lista.forEach(function (m) {
      var r = mapa[m.equipamento_id] || (mapa[m.equipamento_id] = { nome: m.equipamento_nome, total: 0, corretivas: 0, custo: 0 });
      r.total++; r.custo += m.custo || 0;
      if (m.tipo === "corretiva") r.corretivas++;
    });
    var top = Object.keys(mapa).map(function (k) { return mapa[k]; })
      .sort(function (a, b) { return b.total - a.total || b.custo - a.custo; }).slice(0, 5);
    if (!top.length) return '<p class="rel-vazio">Sem manutenções no período.</p>';
    return '<table class="tabela"><thead><tr><th>Equipamento</th><th class="num">Manutenções</th><th class="num">Corretivas</th><th class="num">Custo</th></tr></thead><tbody>' +
      top.map(function (r) {
        return "<tr><td>" + escapeHtml(r.nome) + '</td><td class="num">' + r.total + '</td><td class="num">' + r.corretivas +
          '</td><td class="num">' + fmtMoeda(r.custo) + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function resumoProjetos() {
    if (!D.proj.length) return '<p class="rel-vazio">Nenhum projeto cadastrado. <a href="projetos.html">Criar projeto</a></p>';
    var rot = { planejamento: "Planejamento", em_andamento: "Em andamento", concluido: "Concluídos", pausado: "Pausados" };
    var atrasados = D.proj.filter(function (p) { return p.status !== "concluido" && p.prazo && p.prazo < hoje(); }).length;
    return '<div class="proj-resumo">' + Object.keys(rot).map(function (k) {
      return '<div class="metric-box"><div class="metric-box__value">' + D.proj.filter(function (p) { return p.status === k; }).length +
        '</div><div class="metric-box__label">' + rot[k] + "</div></div>";
    }).join("") +
      '<div class="metric-box"><div class="metric-box__value' + (atrasados ? " warn" : "") + '">' + atrasados +
      '</div><div class="metric-box__label">Com prazo vencido</div></div></div>';
  }

  // Planilha das manutenções do período (abre no Excel, separada por ";")
  function exportarCSV() {
    var lista = manutsPeriodo();
    if (!lista.length) { showToast("Não há manutenções no período escolhido."); return; }
    function c(v) { v = v === null || v === undefined ? "" : String(v); return '"' + v.replace(/"/g, '""') + '"'; }
    var linhas = [["Equipamento", "Serviço", "Tipo", "Status", "Data prevista", "Data de conclusão", "Responsável", "Custo (R$)"].map(c).join(";")];
    lista.forEach(function (m) {
      linhas.push([m.equipamento_nome, m.titulo, TIPO_MA[m.tipo], STATUS_MA[m.status], fmtData(m.data_prevista),
        m.data_conclusao ? fmtData(m.data_conclusao) : "", m.responsavel || "",
        m.custo === null || m.custo === undefined ? "" : m.custo.toFixed(2).replace(".", ",")].map(c).join(";"));
    });
    var blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plain-manutencoes-" + hoje() + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    showToast("📄 Planilha gerada com " + plural(lista.length, "manutenção", "manutenções") + ".");
  }

  /* ============================================================
     MONITORAMENTO
     ============================================================ */
  function secaoMonitoramento() {
    var p = document.getElementById("painel");
    var hora = UI.monHora ? UI.monHora.toLocaleTimeString("pt-BR") : "—";
    var direita = '<div class="mon-controles">' +
      '<span class="mon-hora"><span class="mon-pulso' + (UI.monAuto ? "" : " mon-pulso--off") + '"></span>Atualizado às ' + hora + "</span>" +
      '<label class="mon-auto"><input type="checkbox" id="monAuto"' + (UI.monAuto ? " checked" : "") + " /> Automático (30 s)</label>" +
      '<button class="btn btn-ghost btn-sm" data-acao="atualizar">' + ICON.refresh + " Atualizar</button></div>";
    var html = cabecalho("Monitoramento", "Situação atual da planta, alertas e próximas manutenções.", direita);

    if (!D.equip.length) {
      p.innerHTML = html + vazio(ICON.equip, "Nada para monitorar ainda",
        "Cadastre seus equipamentos para acompanhar a situação de cada um aqui.",
        '<a class="btn btn-primary" href="#equipamentos">Cadastrar equipamentos</a>');
      return;
    }

    var cont = { operando: 0, manutencao: 0, parado: 0, retrofit: 0 };
    D.equip.forEach(function (e) { cont[e.status]++; });
    var disp = disponibilidade();

    html += '<div class="mon-resumo card">' +
      '<div class="mon-disp"><div class="mon-disp__anel" style="--pct:' + disp + '"><span>' + disp + '%</span></div>' +
        '<div><div class="mon-disp__titulo">Disponibilidade</div><div class="mon-disp__sub">' + cont.operando + " de " + plural(D.equip.length, "equipamento operando", "equipamentos operando") + "</div></div></div>" +
      Object.keys(STATUS_EQ).map(function (k) {
        return '<div class="mon-contador"><span class="dot dot--' + k + '"></span><b>' + cont[k] + "</b><span>" + STATUS_EQ[k] + "</span></div>";
      }).join("") + "</div>";

    var al = alertas();
    html += '<section class="card mon-alertas"><h2 class="widget-card__title">' + ICON.alert + " Alertas " +
      '<span class="chip__count">' + al.length + "</span></h2>" +
      (al.length ? al.map(function (a) {
        return '<div class="alerta alerta--' + a.nivel + '" data-equip="' + a.equipId + '"' + (a.manutId ? ' data-manut="' + a.manutId + '"' : "") + ">" +
          '<div class="alerta__texto"><b>' + a.titulo + "</b><span>" + escapeHtml(a.texto) + "</span></div>" +
          (a.manutId
            ? '<button class="btn btn-ghost btn-sm" data-acao="abrir-manut">Ver</button>'
            : '<button class="btn btn-ghost btn-sm" data-acao="agendar">Agendar manutenção</button>') +
          "</div>";
      }).join("") : '<p class="rel-vazio">' + ICON.check + " Nenhum alerta. Tudo em dia!</p>") + "</section>";

    // Ordena: parados e em manutenção primeiro
    var ordem = { parado: 0, manutencao: 1, retrofit: 2, operando: 3 };
    var eqs = D.equip.slice().sort(function (a, b) { return ordem[a.status] - ordem[b.status] || a.nome.localeCompare(b.nome); });
    html += '<div class="mon-grid">' + eqs.map(tileMonitor).join("") + "</div>";
    html += '<p class="mon-nota">O status de cada máquina é atualizado pela equipe (nos botões acima ou em Equipamentos). ' +
      "A leitura automática por sensores (IIoT) é uma evolução prevista para a plataforma.</p>";
    p.innerHTML = html;
  }

  function tileMonitor(e) {
    var prox = proxima(e.id), ult = ultima(e.id), h = hoje();
    var proxTxt = "Nenhuma agendada", proxClasse = "";
    if (prox) {
      var d = difDias(h, prox.data_prevista);
      proxTxt = fmtData(prox.data_prevista) + (d < 0 ? " · atrasada " + plural(-d, "dia", "dias") : d === 0 ? " · hoje" : " · em " + plural(d, "dia", "dias"));
      proxClasse = d < 0 ? "late" : (d <= 7 ? "soon" : "");
    }
    return '<article class="card mon-tile mon-tile--' + e.status + '" data-id="' + e.id + '">' +
      '<div class="mon-tile__topo"><span class="dot dot--' + e.status + '"></span><span class="mon-tile__status">' + STATUS_EQ[e.status] + "</span></div>" +
      '<div class="mon-tile__nome">' + escapeHtml(e.nome) + "</div>" +
      '<div class="mon-tile__sub">' + escapeHtml([e.tipo, e.localizacao].filter(Boolean).join(" · ") || "—") + "</div>" +
      '<dl class="mon-tile__dados">' +
        "<div><dt>Próxima manutenção</dt><dd class=\"" + proxClasse + '">' + proxTxt + "</dd></div>" +
        "<div><dt>Última concluída</dt><dd>" + (ult ? fmtData(ult.data_conclusao) : "—") + "</dd></div>" +
      "</dl>" +
      '<div class="mon-tile__acoes" role="group" aria-label="Mudar status">' +
        Object.keys(STATUS_EQ).map(function (k) {
          return '<button class="st-btn' + (k === e.status ? " st-btn--on st-btn--" + k : "") + '" data-acao="set-status" data-status="' + k +
            '" title="Marcar como ' + STATUS_EQ[k] + '">' + STATUS_EQ[k].replace("Em ", "") + "</button>";
        }).join("") +
      "</div>" +
      '<button class="link-btn mon-tile__agendar" data-acao="agendar">' + ICON.plus + " Agendar manutenção</button>" +
      "</article>";
  }

  function iniciarMonitor() {
    pararMonitor();
    if (!UI.monAuto) return;
    UI.monTimer = setInterval(function () {
      if (document.hidden || UI.secao !== "monitoramento") return;
      if (!document.getElementById("painelModal") || document.getElementById("painelModal").hidden) {
        carregar().then(renderizar).catch(function () { /* tenta de novo no próximo ciclo */ });
      }
    }, 30000);
  }
  function pararMonitor() {
    if (UI.monTimer) { clearInterval(UI.monTimer); UI.monTimer = null; }
  }

  /* ============================================================
     NAVEGAÇÃO
     ============================================================ */
  var SECOES = {
    equipamentos: secaoEquipamentos,
    manutencoes: secaoManutencoes,
    relatorios: secaoRelatorios,
    monitoramento: secaoMonitoramento
  };

  function renderizar() {
    if (SECOES[UI.secao]) SECOES[UI.secao]();
  }

  function irPara(secao) {
    if (secao !== "feed" && !SECOES[secao]) secao = "feed";
    UI.secao = secao;

    document.querySelectorAll(".profile-card__link[data-secao]").forEach(function (l) {
      l.classList.toggle("active", l.dataset.secao === secao);
    });

    var feed = document.querySelector(".feed");
    var painel = document.getElementById("painel");
    pararMonitor();

    if (secao === "feed") {
      feed.hidden = false;
      painel.hidden = true;
      document.body.classList.remove("modo-painel");
      return;
    }

    feed.hidden = true;
    painel.hidden = false;
    document.body.classList.add("modo-painel");
    painel.innerHTML = '<div class="card empty-state"><div class="empty-state__text">Carregando…</div></div>';
    window.scrollTo(0, 0);

    carregar()
      .then(function () {
        if (UI.secao !== secao) return; // usuário já trocou de seção
        renderizar();
        if (secao === "monitoramento") iniciarMonitor();
      })
      .catch(function (err) {
        painel.innerHTML = vazio(ICON.alert, "Não foi possível carregar", escapeHtml(err.message),
          '<button class="btn btn-primary" data-acao="tentar">Tentar de novo</button>');
      });
  }

  /* ---------- Eventos (delegação no container do painel) ---------- */
  function ligarEventos() {
    var painel = document.getElementById("painel");

    painel.addEventListener("click", function (e) {
      // Filtros
      var c = e.target.closest("[data-filtro-eq]");
      if (c) { UI.eqFiltro = c.dataset.filtroEq; return secaoEquipamentos(); }
      c = e.target.closest("[data-filtro-ma]");
      if (c) { UI.maFiltro = c.dataset.filtroMa; return secaoManutencoes(); }
      c = e.target.closest("[data-periodo]");
      if (c) { UI.relPeriodo = c.dataset.periodo; return secaoRelatorios(); }

      var btn = e.target.closest("[data-acao]");
      if (!btn || btn.tagName === "SELECT") return;
      var acao = btn.dataset.acao;
      var card = btn.closest("[data-id]");
      var alerta = btn.closest(".alerta");

      if (acao === "tentar") return irPara(UI.secao);
      if (acao === "novo-equip") return modalEquipamento(null);
      if (acao === "nova-manut") return modalManutencao(null);
      if (acao === "csv") return exportarCSV();
      if (acao === "imprimir") return window.print();
      if (acao === "atualizar") {
        return carregar().then(function () { renderizar(); showToast("Dados atualizados."); })
          .catch(function (err) { showToast(err.message, 3500); });
      }

      if (alerta) {
        if (acao === "abrir-manut") { var ma = acharManut(alerta.dataset.manut); if (ma) modalManutencao(ma); return; }
        if (acao === "agendar") return modalManutencao(null, alerta.dataset.equip);
      }

      if (!card) return;
      var id = card.dataset.id;
      if (acao === "editar-equip")  return modalEquipamento(acharEquip(id));
      if (acao === "excluir-equip") return excluirEquip(acharEquip(id));
      if (acao === "ver-manut") { UI.maEquip = id; UI.maFiltro = "todas"; window.location.hash = "manutencoes"; return; }
      if (acao === "set-status") return mudarStatusEquip(acharEquip(id), btn.dataset.status);
      if (acao === "agendar") return modalManutencao(null, id);
      if (acao === "editar-manut")  return modalManutencao(acharManut(id));
      if (acao === "excluir-manut") return excluirManut(acharManut(id));
    });

    painel.addEventListener("change", function (e) {
      var t = e.target;
      if (t.dataset.acao === "status-equip") return mudarStatusEquip(acharEquip(t.closest("[data-id]").dataset.id), t.value);
      if (t.dataset.acao === "status-manut") return mudarStatusManut(acharManut(t.closest("[data-id]").dataset.id), t.value);
      if (t.id === "filtroEquipManut") { UI.maEquip = t.value; return secaoManutencoes(); }
      if (t.id === "monAuto") { UI.monAuto = t.checked; iniciarMonitor(); return secaoMonitoramento(); }
    });

    painel.addEventListener("input", function (e) {
      if (e.target.id === "buscaEquip") { UI.eqBusca = e.target.value.trim(); listaEquipamentos(); }
    });

    // Quando a aba do navegador volta a ficar visível, atualiza o monitoramento
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && UI.secao === "monitoramento" && UI.monAuto) {
        carregar().then(renderizar).catch(function () {});
      }
    });

    window.addEventListener("hashchange", function () {
      irPara(window.location.hash.slice(1) || "feed");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    ligarEventos();
    var inicial = window.location.hash.slice(1) || "feed";
    irPara(inicial);
    // No feed, carrega os dados só para preencher os indicadores reais
    if (inicial === "feed") carregar().catch(function () {
      setText("metricDisponibilidade", "—"); setText("metricAlertas", "—"); setText("metricConcluidos", "—");
    });
  });
})();
