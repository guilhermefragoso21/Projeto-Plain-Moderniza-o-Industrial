/* ── PERFIL REAL (vindo do servidor) ───────────── */
var API = "http://localhost:3000";

function escapeHtml(v) {
  if (v === null || v === undefined || v === "") return "";
  return String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function carregarPerfil() {
  var usuarioId = localStorage.getItem("usuario_id");

  // Se ninguém estiver logado, volta para a tela de login
  if (!usuarioId) {
    window.location.href = "index.html";
    return;
  }

  fetch(API + "/api/conta/" + usuarioId)
    .then(function (res) {
      if (!res.ok) throw new Error("perfil nao encontrado");
      return res.json();
    })
    .then(function (c) { aplicarPerfil(c); })
    .catch(function () {
      showToast("Não foi possível carregar seu perfil.");
    });
}

function aplicarPerfil(c) {
  var nome, role, inicial;

  if (c.tipo_conta === "empresa") {
    nome    = c.razao_social || "Empresa";
    var partes = [];
    if (c.setor) partes.push(c.setor);
    if (c.cargo) partes.push(c.cargo);
    role    = partes.join(" · ") || "Conta Empresa";
    inicial = nome.charAt(0).toUpperCase();
  } else {
    nome    = ((c.nome || "") + " " + (c.sobrenome || "")).trim() || "Usuário";
    var local = [c.cidade, c.estado].filter(Boolean).join(" · ");
    role    = local || "Conta Pessoal";
    inicial = (c.nome || "U").charAt(0).toUpperCase();
  }

  // Card de perfil (lateral)
  setText("profileName", nome);
  setText("profileRole", role);
  setText("profileAvatar", inicial);
  // Avatar do topo e do composer
  setText("topAvatar", inicial);
  setText("composerAvatar", inicial);

  // Guarda a inicial para usar nos comentários
  window.__inicialUsuario = inicial;
}

function setText(id, txt) {
  var el = document.getElementById(id);
  if (el) el.textContent = txt;
}

// Busca contagens reais do banco e preenche o card de estatísticas
function carregarEstatisticas() {
  fetch(API + "/api/estatisticas")
    .then(function (res) {
      if (!res.ok) throw new Error("estatisticas indisponiveis");
      return res.json();
    })
    .then(function (s) {
      setText("statContas", s.total_contas);
      setText("statEmpresas", s.total_empresas);
      setText("statPessoas", s.total_pessoas);
    })
    .catch(function () {
      setText("statContas", "—");
      setText("statEmpresas", "—");
      setText("statPessoas", "—");
    });
}

// Encerra a sessão e volta para o login
function logout() {
  localStorage.removeItem("usuario_id");
  localStorage.removeItem("tipo_conta");
  window.location.href = "index.html";
}

/* ── CONECTAR ──────────────────────────────────── */
function toggleConnect(btn) {
  if (btn.classList.contains('connected')) {
    btn.classList.remove('connected');
    btn.textContent = '+ Conectar';
  } else {
    btn.classList.add('connected');
    btn.textContent = '✓ Conectado';
    showToast('Conexão enviada!');
  }
}

/* ── TOAST NOTIFICATION ────────────────────────── */
function showToast(msg, duration = 2200) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(12px);
      background:#1e293b;color:#fff;padding:10px 20px;border-radius:8px;
      font-family:'Barlow',sans-serif;font-size:14px;font-weight:600;
      box-shadow:0 4px 20px rgba(0,0,0,.35);z-index:9999;
      opacity:0;transition:opacity .22s,transform .22s;pointer-events:none;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(12px)';
  }, duration);
}

/* ── MODAL ENVIAR ──────────────────────────────── */
function openSendModal(postTitle) {
  let overlay = document.getElementById('send-modal-overlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'send-modal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;
    display:flex;align-items:center;justify-content:center;
  `;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:360px;max-width:90vw;box-shadow:0 16px 48px rgba(0,0,0,.25);font-family:'Barlow',sans-serif;">
      <div style="font-size:17px;font-weight:700;margin-bottom:16px;color:var(--text);">Enviar publicação</div>
      <input id="send-to-input" placeholder="Nome ou conexão…"
        style="width:100%;height:38px;border:1.5px solid var(--border);border-radius:8px;padding:0 12px;font-family:'Barlow',sans-serif;font-size:14px;outline:none;margin-bottom:12px;"
        onfocus="this.style.borderColor='var(--blue)'"
        onblur="this.style.borderColor='var(--border)'"
      />
      <textarea placeholder="Adicione uma mensagem (opcional)…"
        style="width:100%;height:80px;border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;font-family:'Barlow',sans-serif;font-size:13px;outline:none;resize:none;margin-bottom:16px;"
        onfocus="this.style.borderColor='var(--blue)'"
        onblur="this.style.borderColor='var(--border)'"
      ></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button onclick="document.getElementById('send-modal-overlay').remove()"
          style="padding:8px 18px;border-radius:8px;border:1.5px solid var(--border);background:none;font-family:'Barlow',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">
          Cancelar
        </button>
        <button onclick="confirmSend()"
          style="padding:8px 18px;border-radius:8px;border:none;background:var(--blue);color:#fff;font-family:'Barlow',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">
          Enviar
        </button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  document.getElementById('send-to-input').focus();
}

function confirmSend() {
  const to = document.getElementById('send-to-input').value.trim();
  document.getElementById('send-modal-overlay').remove();
  showToast(to ? `✉️ Enviado para ${to}!` : '✉️ Publicação enviada!');
}

/* ── SUBMIT COMENTÁRIO ─────────────────────────── */
function submitComment(sendBtn) {
  const input = sendBtn.previousElementSibling;
  const text = input.value.trim();
  if (!text) return;
  showToast('💬 Comentário publicado!');
  input.value = '';
  sendBtn.closest('.comment-box').remove();
}

/* ── INIT (aguarda o DOM carregar) ─────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* CARREGA O PERFIL REAL DA CONTA LOGADA */
  carregarPerfil();
  carregarEstatisticas();

  /* NAV TOPBAR */
  document.querySelectorAll('.topnav-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.topnav-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  /* SIDEBAR LINKS */
  document.querySelectorAll('.profile-card__link').forEach(link => {
    link.addEventListener('click', function () {
      document.querySelectorAll('.profile-card__link').forEach(l => l.classList.remove('active'));
      this.classList.add('active');
    });
  });

  /* AVATAR (abre menu com opção Sair) */
  document.querySelector('.avatar-btn').addEventListener('click', function (e) {
    e.stopPropagation();
    document.querySelectorAll('.avatar-menu').forEach(m => m.remove());

    var menu = document.createElement('div');
    menu.className = 'avatar-menu';
    menu.style.cssText =
      'position:absolute;right:0;top:calc(100% + 8px);background:#fff;' +
      'border:1px solid var(--border);border-radius:10px;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.18);min-width:160px;z-index:300;overflow:hidden;';

    var sair = document.createElement('button');
    sair.textContent = 'Sair';
    sair.style.cssText =
      'display:block;width:100%;padding:11px 16px;border:none;background:none;text-align:left;' +
      "font-family:'Barlow',sans-serif;font-size:14px;font-weight:600;color:var(--text);cursor:pointer;";
    sair.onmouseenter = function () { sair.style.background = 'var(--sidebar)'; };
    sair.onmouseleave = function () { sair.style.background = 'none'; };
    sair.onclick = function () { logout(); };
    menu.appendChild(sair);

    this.style.position = 'relative';
    this.appendChild(menu);
    setTimeout(function () {
      document.addEventListener('click', function () { menu.remove(); }, { once: true });
    }, 0);
  });

  /* BUSCA */
  const searchInput = document.querySelector('.topbar__search input');
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && this.value.trim()) {
      showToast(`Buscando por "${this.value.trim()}"…`);
    }
  });

  /* COMPOSER */
  const composerInput = document.querySelector('.post-composer__input');
  composerInput.removeAttribute('readonly');
  composerInput.style.cursor = 'text';

  const composerLabels = {
    Foto:   '📷 Foto anexada!',
    Vídeo:  '🎬 Vídeo anexado!',
    Artigo: '📄 Rascunho de artigo aberto!',
    Evento: '📅 Formulário de evento aberto!',
  };
  document.querySelectorAll('.composer-action').forEach(btn => {
    btn.addEventListener('click', function () {
      const label = this.textContent.trim();
      showToast(composerLabels[label] || label);
      this.style.color = 'var(--blue)';
      setTimeout(() => this.style.color = '', 1200);
    });
  });

  /* AÇÕES DOS POSTS */
  document.querySelectorAll('.post-card__actions').forEach(actionsBar => {
    const post = actionsBar.closest('article');
    let reactionCount = parseInt(
      post.querySelector('.post-card__reactions span[style]')?.textContent
    ) || 0;

    actionsBar.querySelectorAll('.post-action').forEach(btn => {
      const label = btn.textContent.trim();

      if (label === 'Curtir') {
        btn.addEventListener('click', function () {
          const liked = this.classList.toggle('liked');
          const svg = this.querySelector('svg');
          if (liked) {
            this.style.color = 'var(--blue)';
            svg.setAttribute('fill', 'var(--blue)');
            svg.setAttribute('stroke', 'var(--blue)');
            reactionCount++;
            showToast('👍 Curtido!');
          } else {
            this.style.color = '';
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            reactionCount--;
          }
          const countSpan = post.querySelector('.post-card__reactions span[style]');
          if (countSpan) countSpan.textContent = ` ${reactionCount} reações`;
        });
      }

      if (label === 'Comentar') {
        btn.addEventListener('click', function () {
          const existing = post.querySelector('.comment-box');
          if (existing) { existing.remove(); return; }

          const box = document.createElement('div');
          box.className = 'comment-box';
          box.style.cssText = 'padding:10px 16px 14px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:center;';
          box.innerHTML = `
            <div style="width:32px;height:32px;border-radius:50%;background:var(--blue);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;flex-shrink:0;">${window.__inicialUsuario || 'J'}</div>
            <input placeholder="Escreva um comentário…"
              style="flex:1;height:34px;border:1.5px solid var(--border);border-radius:20px;padding:0 14px;font-family:'Barlow',sans-serif;font-size:13px;outline:none;background:none;transition:border-color .2s;"
              onfocus="this.style.borderColor='var(--blue)'"
              onblur="this.style.borderColor='var(--border)'"
            />
            <button onclick="submitComment(this)" style="padding:6px 14px;border-radius:16px;border:none;background:var(--blue);color:#fff;font-family:'Barlow',sans-serif;font-size:12px;font-weight:600;cursor:pointer;">Enviar</button>
          `;
          actionsBar.insertAdjacentElement('afterend', box);
          box.querySelector('input').focus();
        });
      }

      if (label === 'Compartilhar') {
        btn.addEventListener('click', function () {
          this.style.color = 'var(--blue)';
          setTimeout(() => this.style.color = '', 1200);
          showToast('🔗 Link copiado para a área de transferência!');
        });
      }

      if (label === 'Enviar') {
        btn.addEventListener('click', function () {
          openSendModal(post.querySelector('.post-card__name')?.textContent?.trim() || 'post');
        });
      }
    });

    /* MENU "…" */
    const moreBtn = post.querySelector('.post-card__more');
    if (moreBtn) {
      moreBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        document.querySelectorAll('.more-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'more-menu';
        menu.style.cssText = `
          position:absolute;right:0;top:calc(100% + 4px);
          background:#fff;border:1px solid var(--border);border-radius:10px;
          box-shadow:0 8px 24px rgba(0,0,0,.12);min-width:180px;z-index:200;overflow:hidden;
        `;
        const items = ['Salvar publicação', 'Seguir autor', 'Copiar link', 'Não tenho interesse', 'Denunciar'];
        items.forEach(item => {
          const el = document.createElement('button');
          el.textContent = item;
          el.style.cssText = `
            display:block;width:100%;padding:10px 16px;border:none;background:none;text-align:left;
            font-family:'Barlow',sans-serif;font-size:13px;font-weight:600;color:var(--text);cursor:pointer;
          `;
          el.onmouseenter = () => el.style.background = 'var(--sidebar)';
          el.onmouseleave = () => el.style.background = 'none';
          el.onclick = () => { showToast(`"${item}" selecionado`); menu.remove(); };
          menu.appendChild(el);
        });

        this.style.position = 'relative';
        this.appendChild(menu);
        setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
      });
    }
  });

  /* NOTÍCIAS */
  document.querySelectorAll('.news-item__title').forEach(title => {
    title.addEventListener('click', function () {
      showToast(`📰 Abrindo: "${this.textContent.substring(0, 32)}…"`);
    });
  });

  /* MÉTRICAS */
  document.querySelectorAll('.metric-box').forEach(box => {
    box.style.cursor = 'pointer';
    box.style.transition = 'transform .15s, box-shadow .15s';
    box.addEventListener('mouseenter', () => {
      box.style.transform = 'scale(1.04)';
      box.style.boxShadow = '0 4px 14px rgba(26,86,219,.12)';
    });
    box.addEventListener('mouseleave', () => {
      box.style.transform = '';
      box.style.boxShadow = '';
    });
    box.addEventListener('click', () => {
      const label = box.querySelector('.metric-box__label').textContent;
      showToast(`📊 Abrindo detalhes: ${label}`);
    });
  });

}); //