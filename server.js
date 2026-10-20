// ============================================================
//  PLAIN

// ============================================================

const express = require("express");
const mysql   = require("mysql2/promise");
const bcrypt  = require("bcrypt");
const cors    = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(".")); // serve index.html, criar-conta.html, etc.

// ---------- Conexão com o banco ----------
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "212026",
  database: "plain_db",
  waitForConnections: true,
  connectionLimit: 10
});

// ============================================================
// cadastro 
// ============================================================
app.post("/api/cadastro", async (req, res) => {
  const { tipo, email, senha, dados } = req.body;

  if (!email || !senha || !tipo) {
    return res.status(400).json({ erro: "Campos obrigatórios faltando." });
  }
  if (tipo !== "empresa" && tipo !== "pessoal") {
    return res.status(400).json({ erro: "Tipo de conta inválido." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const senhaHash = await bcrypt.hash(senha, 10);

    const [r] = await conn.execute(
      "INSERT INTO usuarios (email, senha_hash, tipo_conta) VALUES (?, ?, ?)",
      [email, senhaHash, tipo]
    );
    const usuarioId = r.insertId;

    if (tipo === "empresa") {
      await conn.execute(
        `INSERT INTO empresas (usuario_id, razao_social, cnpj, telefone, setor, cargo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [usuarioId, dados.razao_social, dados.cnpj, dados.telefone, dados.setor, dados.cargo]
      );
    } else {
      await conn.execute(
        `INSERT INTO pessoas (usuario_id, nome, sobrenome, telefone, cidade, estado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [usuarioId, dados.nome, dados.sobrenome, dados.telefone, dados.cidade, dados.estado]
      );
    }

    await conn.commit();
    res.status(201).json({ ok: true, usuario_id: usuarioId });
  } catch (e) {
    await conn.rollback();
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ erro: "E-mail ou CNPJ já cadastrado." });
    }
    console.error(e);
    res.status(500).json({ erro: "Erro ao cadastrar." });
  } finally {
    conn.release();
  }
});

// ============================================================
//  login 
// ============================================================
app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: "Informe e-mail e senha." });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT id, senha_hash, tipo_conta FROM usuarios WHERE email = ? AND ativo = 1",
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ erro: "Credenciais inválidas." });
    }

    const ok = await bcrypt.compare(senha, rows[0].senha_hash);
    if (!ok) {
      return res.status(401).json({ erro: "Credenciais inválidas." });
    }

    await pool.execute(
      "UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?",
      [rows[0].id]
    );

    res.json({ ok: true, usuario_id: rows[0].id, tipo_conta: rows[0].tipo_conta });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao autenticar." });
  }
});

// ============================================================
//  contas  
// ============================================================
app.get("/api/contas", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM vw_contas ORDER BY criado_em DESC");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao consultar." });
  }
});

// ============================================================
//  usuarioId  
// ============================================================
app.get("/api/conta/:usuarioId", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM vw_contas WHERE usuario_id = ?",
      [req.params.usuarioId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: "Conta não encontrada." });
    }
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao consultar." });
  }
});

// ============================================================
//  estatisticas  
// ============================================================
app.get("/api/estatisticas", async (req, res) => {
  try {
    const [tot] = await pool.query("SELECT COUNT(*) AS n FROM usuarios");
    const [emp] = await pool.query("SELECT COUNT(*) AS n FROM empresas");
    const [pes] = await pool.query("SELECT COUNT(*) AS n FROM pessoas");
    res.json({
      total_contas: tot[0].n,
      total_empresas: emp[0].n,
      total_pessoas: pes[0].n
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao consultar estatísticas." });
  }
});

// ============================================================
//  usuarioId  
// ============================================================
app.put("/api/empresa/:usuarioId", async (req, res) => {
  const { razao_social, telefone, setor, cargo } = req.body;
  try {
    await pool.execute(
      `UPDATE empresas SET razao_social=?, telefone=?, setor=?, cargo=?
       WHERE usuario_id=?`,
      [razao_social, telefone, setor, cargo, req.params.usuarioId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao atualizar." });
  }
});

// ============================================================
//  delete usuarioId  
// ============================================================
app.delete("/api/conta/:usuarioId", async (req, res) => {
  try {
    await pool.execute("DELETE FROM usuarios WHERE id=?", [req.params.usuarioId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao remover." });
  }
});

// ============================================================
//  PROJETOS
// ============================================================
const STATUS_PROJETO = ["planejamento", "em_andamento", "concluido", "pausado"];

// Normaliza e valida o corpo enviado pelo formulário de projeto
function lerProjeto(body) {
  const titulo   = (body.titulo || "").trim();
  const cliente  = (body.cliente || "").trim() || null;
  const descricao = (body.descricao || "").trim() || null;
  const status   = body.status || "planejamento";
  const prazo    = body.prazo || null; // "AAAA-MM-DD" ou null

  if (!titulo) return { erro: "Informe o título do projeto." };
  if (titulo.length > 150) return { erro: "Título muito longo (máx. 150 caracteres)." };
  if (!STATUS_PROJETO.includes(status)) return { erro: "Status inválido." };
  if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) return { erro: "Prazo inválido." };

  return { titulo, cliente, descricao, status, prazo };
}

// Lista os projetos do usuário
app.get("/api/projetos/:usuarioId", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, titulo, cliente, descricao, status,
              DATE_FORMAT(prazo, '%Y-%m-%d') AS prazo, criado_em
         FROM projetos
        WHERE usuario_id = ?
        ORDER BY criado_em DESC, id DESC`,
      [req.params.usuarioId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao consultar projetos." });
  }
});

// Cria um projeto novo
app.post("/api/projetos", async (req, res) => {
  const usuarioId = req.body.usuario_id;
  if (!usuarioId) return res.status(400).json({ erro: "Usuário não informado." });

  const p = lerProjeto(req.body);
  if (p.erro) return res.status(400).json({ erro: p.erro });

  try {
    const [r] = await pool.execute(
      `INSERT INTO projetos (usuario_id, titulo, cliente, descricao, status, prazo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioId, p.titulo, p.cliente, p.descricao, p.status, p.prazo]
    );
    res.status(201).json({ ok: true, id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao salvar projeto." });
  }
});

// Atualiza um projeto (só se for do próprio usuário)
app.put("/api/projetos/:id", async (req, res) => {
  const usuarioId = req.body.usuario_id;
  if (!usuarioId) return res.status(400).json({ erro: "Usuário não informado." });

  const p = lerProjeto(req.body);
  if (p.erro) return res.status(400).json({ erro: p.erro });

  try {
    const [r] = await pool.execute(
      `UPDATE projetos
          SET titulo = ?, cliente = ?, descricao = ?, status = ?, prazo = ?
        WHERE id = ? AND usuario_id = ?`,
      [p.titulo, p.cliente, p.descricao, p.status, p.prazo, req.params.id, usuarioId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ erro: "Projeto não encontrado." });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao atualizar projeto." });
  }
});

// Exclui um projeto (só se for do próprio usuário)
app.delete("/api/projetos/:id", async (req, res) => {
  const usuarioId = req.query.usuario_id;
  if (!usuarioId) return res.status(400).json({ erro: "Usuário não informado." });

  try {
    const [r] = await pool.execute(
      "DELETE FROM projetos WHERE id = ? AND usuario_id = ?",
      [req.params.id, usuarioId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ erro: "Projeto não encontrado." });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao excluir projeto." });
  }
});

// ============================================================
//  REDE / CONEXÕES
// ============================================================

// Lista as outras contas e indica se o usuário já está conectado a cada uma
app.get("/api/rede/:usuarioId", async (req, res) => {
  const id = req.params.usuarioId;
  try {
    const [rows] = await pool.execute(
      `SELECT v.usuario_id, v.tipo_conta, v.razao_social, v.setor, v.cargo,
              v.nome, v.sobrenome, v.cidade, v.estado,
              (c.id IS NOT NULL) AS conectado
         FROM vw_contas v
         LEFT JOIN conexoes c
                ON c.usuario_id = ? AND c.conectado_id = v.usuario_id
        WHERE v.usuario_id <> ? AND v.ativo = 1
        ORDER BY conectado DESC, v.criado_em DESC`,
      [id, id]
    );
    res.json(rows.map(r => ({ ...r, conectado: Number(r.conectado) === 1 })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao consultar a rede." });
  }
});

// Conectar
app.post("/api/conexoes", async (req, res) => {
  const { usuario_id, conectado_id } = req.body;
  if (!usuario_id || !conectado_id) {
    return res.status(400).json({ erro: "Dados da conexão incompletos." });
  }
  if (String(usuario_id) === String(conectado_id)) {
    return res.status(400).json({ erro: "Você não pode se conectar a si mesmo." });
  }
  try {
    await pool.execute(
      "INSERT IGNORE INTO conexoes (usuario_id, conectado_id) VALUES (?, ?)",
      [usuario_id, conectado_id]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(404).json({ erro: "Conta não encontrada." });
    }
    console.error(e);
    res.status(500).json({ erro: "Erro ao conectar." });
  }
});

// Desconectar
app.delete("/api/conexoes/:usuarioId/:conectadoId", async (req, res) => {
  try {
    await pool.execute(
      "DELETE FROM conexoes WHERE usuario_id = ? AND conectado_id = ?",
      [req.params.usuarioId, req.params.conectadoId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao desconectar." });
  }
});

// ============================================================
//  CONTATO (formulário da página contato.html)
// ============================================================
const ASSUNTOS_CONTATO = ["duvida", "sugestao", "problema", "parceria", "outro"];

app.post("/api/contato", async (req, res) => {
  const nome     = String(req.body.nome || "").trim();
  const email    = String(req.body.email || "").trim();
  const assunto  = req.body.assunto || "duvida";
  const mensagem = String(req.body.mensagem || "").trim();
  const usuarioId = req.body.usuario_id || null; // opcional: visitante sem login também pode enviar

  if (!nome) return res.status(400).json({ erro: "Informe seu nome." });
  if (nome.length > 150) return res.status(400).json({ erro: "Nome muito longo (máx. 150 caracteres)." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
    return res.status(400).json({ erro: "Informe um e-mail válido." });
  }
  if (!ASSUNTOS_CONTATO.includes(assunto)) return res.status(400).json({ erro: "Assunto inválido." });
  if (mensagem.length < 10) return res.status(400).json({ erro: "A mensagem precisa ter pelo menos 10 caracteres." });
  if (mensagem.length > 2000) return res.status(400).json({ erro: "Mensagem muito longa (máx. 2000 caracteres)." });

  try {
    const [r] = await pool.execute(
      `INSERT INTO contatos (usuario_id, nome, email, assunto, mensagem)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, nome, email, assunto, mensagem]
    );
    res.status(201).json({ ok: true, id: r.insertId });
  } catch (e) {
    // usuario_id que não existe mais: salva a mensagem sem vínculo com a conta
    if (e.code === "ER_NO_REFERENCED_ROW_2") {
      try {
        const [r] = await pool.execute(
          `INSERT INTO contatos (usuario_id, nome, email, assunto, mensagem)
           VALUES (NULL, ?, ?, ?, ?)`,
          [nome, email, assunto, mensagem]
        );
        return res.status(201).json({ ok: true, id: r.insertId });
      } catch (e2) { console.error(e2); }
    } else {
      console.error(e);
    }
    res.status(500).json({ erro: "Erro ao enviar a mensagem." });
  }
});

// Obs.: as mensagens recebidas ficam na tabela "contatos".
// Para ler, use no MySQL Workbench:  SELECT * FROM contatos ORDER BY criado_em DESC;
// (não há rota pública de leitura, para não expor e-mails de quem escreveu)

// ============================================================
//  EQUIPAMENTOS (menu "Equipamentos" do Início)
// ============================================================
const STATUS_EQUIP = ["operando", "manutencao", "parado", "retrofit"];

function texto(v, max) {
  const t = (v === undefined || v === null) ? "" : String(v).trim();
  return t ? t.slice(0, max) : null;
}

function lerEquipamento(body) {
  const nome = (body.nome || "").trim();
  const status = body.status || "operando";
  const anoTxt = body.ano_fabricacao;
  const ano = (anoTxt === "" || anoTxt === null || anoTxt === undefined) ? null : Number(anoTxt);

  if (!nome) return { erro: "Informe o nome do equipamento." };
  if (nome.length > 150) return { erro: "Nome muito longo (máx. 150 caracteres)." };
  if (!STATUS_EQUIP.includes(status)) return { erro: "Status inválido." };
  if (ano !== null && (!Number.isInteger(ano) || ano < 1900 || ano > new Date().getFullYear() + 1)) {
    return { erro: "Ano de fabricação inválido." };
  }
  return {
    nome, status, ano_fabricacao: ano,
    tipo:        texto(body.tipo, 80),
    fabricante:  texto(body.fabricante, 100),
    modelo:      texto(body.modelo, 100),
    localizacao: texto(body.localizacao, 150),
    observacoes: texto(body.observacoes, 2000)
  };
}

app.get("/api/equipamentos/:usuarioId", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, nome, tipo, fabricante, modelo, localizacao, ano_fabricacao,
              status, observacoes, criado_em, atualizado_em
         FROM equipamentos
        WHERE usuario_id = ?
        ORDER BY nome`,
      [req.params.usuarioId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao consultar equipamentos." });
  }
});

app.post("/api/equipamentos", async (req, res) => {
  const usuarioId = req.body.usuario_id;
  if (!usuarioId) return res.status(400).json({ erro: "Usuário não informado." });
  const e = lerEquipamento(req.body);
  if (e.erro) return res.status(400).json({ erro: e.erro });
  try {
    const [r] = await pool.execute(
      `INSERT INTO equipamentos
         (usuario_id, nome, tipo, fabricante, modelo, localizacao, ano_fabricacao, status, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, e.nome, e.tipo, e.fabricante, e.modelo, e.localizacao, e.ano_fabricacao, e.status, e.observacoes]
    );
    res.status(201).json({ ok: true, id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar equipamento." });
  }
});

app.put("/api/equipamentos/:id", async (req, res) => {
  const usuarioId = req.body.usuario_id;
  if (!usuarioId) return res.status(400).json({ erro: "Usuário não informado." });
  const e = lerEquipamento(req.body);
  if (e.erro) return res.status(400).json({ erro: e.erro });
  try {
    const [r] = await pool.execute(
      `UPDATE equipamentos
          SET nome = ?, tipo = ?, fabricante = ?, modelo = ?, localizacao = ?,
              ano_fabricacao = ?, status = ?, observacoes = ?
        WHERE id = ? AND usuario_id = ?`,
      [e.nome, e.tipo, e.fabricante, e.modelo, e.localizacao, e.ano_fabricacao, e.status, e.observacoes,
       req.params.id, usuarioId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ erro: "Equipamento não encontrado." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar equipamento." });
  }
});

// Excluir um equipamento apaga também as manutenções dele (ON DELETE CASCADE)
app.delete("/api/equipamentos/:id", async (req, res) => {
  const usuarioId = req.query.usuario_id;
  if (!usuarioId) return res.status(400).json({ erro: "Usuário não informado." });
  try {
    const [r] = await pool.execute(
      "DELETE FROM equipamentos WHERE id = ? AND usuario_id = ?",
      [req.params.id, usuarioId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ erro: "Equipamento não encontrado." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao excluir equipamento." });
  }
});

// ============================================================
//  MANUTENÇÕES (menu "Manutenções" do Início)
// ============================================================
const TIPOS_MANUT  = ["preventiva", "corretiva", "preditiva"];
const STATUS_MANUT = ["agendada", "em_execucao", "concluida", "cancelada"];
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

function lerManutencao(body) {
  const titulo = (body.titulo || "").trim();
  const tipo = body.tipo || "preventiva";
  const status = body.status || "agendada";
  const dataPrevista = body.data_prevista || null;
  let dataConclusao = body.data_conclusao || null;
  const custoTxt = body.custo;
  const custo = (custoTxt === "" || custoTxt === null || custoTxt === undefined) ? null : Number(custoTxt);

  if (!body.equipamento_id) return { erro: "Escolha o equipamento." };
  if (!titulo) return { erro: "Informe o serviço a ser feito." };
  if (titulo.length > 150) return { erro: "Título muito longo (máx. 150 caracteres)." };
  if (!TIPOS_MANUT.includes(tipo)) return { erro: "Tipo de manutenção inválido." };
  if (!STATUS_MANUT.includes(status)) return { erro: "Status inválido." };
  if (!dataPrevista || !DATA_RE.test(dataPrevista)) return { erro: "Informe a data prevista." };
  if (dataConclusao && !DATA_RE.test(dataConclusao)) return { erro: "Data de conclusão inválida." };
  if (custo !== null && (!Number.isFinite(custo) || custo < 0 || custo > 99999999)) return { erro: "Custo inválido." };
  if (status !== "concluida") dataConclusao = null; // só manutenção concluída tem data de conclusão

  return {
    equipamento_id: body.equipamento_id, titulo, tipo, status,
    data_prevista: dataPrevista, data_conclusao: dataConclusao, custo,
    responsavel: texto(body.responsavel, 150),
    observacoes: texto(body.observacoes, 2000)
  };
}

// Confere se o equipamento existe e pertence ao usuário
async function equipamentoDoUsuario(equipamentoId, usuarioId) {
  const [rows] = await pool.execute(
    "SELECT id FROM equipamentos WHERE id = ? AND usuario_id = ?",
    [equipamentoId, usuarioId]
  );
  return rows.length > 0;
}

app.get("/api/manutencoes/:usuarioId", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT m.id, m.equipamento_id, e.nome AS equipamento_nome,
              m.titulo, m.tipo, m.status,
              DATE_FORMAT(m.data_prevista,  '%Y-%m-%d') AS data_prevista,
              DATE_FORMAT(m.data_conclusao, '%Y-%m-%d') AS data_conclusao,
              m.custo, m.responsavel, m.observacoes, m.criado_em
         FROM manutencoes m
         JOIN equipamentos e ON e.id = m.equipamento_id
        WHERE m.usuario_id = ?
        ORDER BY m.data_prevista DESC, m.id DESC`,
      [req.params.usuarioId]
    );
    res.json(rows.map(r => ({ ...r, custo: r.custo === null ? null : Number(r.custo) })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao consultar manutenções." });
  }
});

app.post("/api/manutencoes", async (req, res) => {
  const usuarioId = req.body.usuario_id;
  if (!usuarioId) return res.status(400).json({ erro: "Usuário não informado." });
  const m = lerManutencao(req.body);
  if (m.erro) return res.status(400).json({ erro: m.erro });
  try {
    if (!(await equipamentoDoUsuario(m.equipamento_id, usuarioId))) {
      return res.status(404).json({ erro: "Equipamento não encontrado." });
    }
    const [r] = await pool.execute(
      `INSERT INTO manutencoes
         (usuario_id, equipamento_id, titulo, tipo, status, data_prevista, data_conclusao,
          custo, responsavel, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, m.equipamento_id, m.titulo, m.tipo, m.status, m.data_prevista, m.data_conclusao,
       m.custo, m.responsavel, m.observacoes]
    );
    res.status(201).json({ ok: true, id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar manutenção." });
  }
});

app.put("/api/manutencoes/:id", async (req, res) => {
  const usuarioId = req.body.usuario_id;
  if (!usuarioId) return res.status(400).json({ erro: "Usuário não informado." });
  const m = lerManutencao(req.body);
  if (m.erro) return res.status(400).json({ erro: m.erro });
  try {
    if (!(await equipamentoDoUsuario(m.equipamento_id, usuarioId))) {
      return res.status(404).json({ erro: "Equipamento não encontrado." });
    }
    const [r] = await pool.execute(
      `UPDATE manutencoes
          SET equipamento_id = ?, titulo = ?, tipo = ?, status = ?, data_prevista = ?,
              data_conclusao = ?, custo = ?, responsavel = ?, observacoes = ?
        WHERE id = ? AND usuario_id = ?`,
      [m.equipamento_id, m.titulo, m.tipo, m.status, m.data_prevista, m.data_conclusao,
       m.custo, m.responsavel, m.observacoes, req.params.id, usuarioId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ erro: "Manutenção não encontrada." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar manutenção." });
  }
});

app.delete("/api/manutencoes/:id", async (req, res) => {
  const usuarioId = req.query.usuario_id;
  if (!usuarioId) return res.status(400).json({ erro: "Usuário não informado." });
  try {
    const [r] = await pool.execute(
      "DELETE FROM manutencoes WHERE id = ? AND usuario_id = ?",
      [req.params.id, usuarioId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ erro: "Manutenção não encontrada." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao excluir manutenção." });
  }
});

// ============================================================
//  Cria as tabelas novas ao iniciar, caso ainda não existam
// ============================================================
const TABELAS_NOVAS = {
  contatos: `
    CREATE TABLE IF NOT EXISTS contatos (
      id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
      usuario_id  INT UNSIGNED NULL,
      nome        VARCHAR(150) NOT NULL,
      email       VARCHAR(150) NOT NULL,
      assunto     ENUM('duvida','sugestao','problema','parceria','outro') NOT NULL DEFAULT 'duvida',
      mensagem    TEXT NOT NULL,
      lida        TINYINT(1) NOT NULL DEFAULT 0,
      criado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_contatos_usuario (usuario_id),
      CONSTRAINT fk_contatos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  equipamentos: `
    CREATE TABLE IF NOT EXISTS equipamentos (
      id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
      usuario_id      INT UNSIGNED NOT NULL,
      nome            VARCHAR(150) NOT NULL,
      tipo            VARCHAR(80)  NULL,
      fabricante      VARCHAR(100) NULL,
      modelo          VARCHAR(100) NULL,
      localizacao     VARCHAR(150) NULL,
      ano_fabricacao  SMALLINT UNSIGNED NULL,
      status          ENUM('operando','manutencao','parado','retrofit') NOT NULL DEFAULT 'operando',
      observacoes     TEXT NULL,
      criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_equipamentos_usuario (usuario_id),
      CONSTRAINT fk_equipamentos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  manutencoes: `
    CREATE TABLE IF NOT EXISTS manutencoes (
      id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
      usuario_id      INT UNSIGNED NOT NULL,
      equipamento_id  INT UNSIGNED NOT NULL,
      titulo          VARCHAR(150) NOT NULL,
      tipo            ENUM('preventiva','corretiva','preditiva') NOT NULL DEFAULT 'preventiva',
      status          ENUM('agendada','em_execucao','concluida','cancelada') NOT NULL DEFAULT 'agendada',
      data_prevista   DATE NOT NULL,
      data_conclusao  DATE NULL,
      custo           DECIMAL(10,2) NULL,
      responsavel     VARCHAR(150) NULL,
      observacoes     TEXT NULL,
      criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_manutencoes_usuario (usuario_id),
      KEY idx_manutencoes_equipamento (equipamento_id),
      CONSTRAINT fk_manutencoes_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_manutencoes_equipamento
        FOREIGN KEY (equipamento_id) REFERENCES equipamentos (id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
};

async function prepararBanco() {
  // A ordem importa: manutencoes depende de equipamentos
  for (const nome of ["contatos", "equipamentos", "manutencoes"]) {
    try {
      await pool.query(TABELAS_NOVAS[nome]);
    } catch (e) {
      console.error(`Aviso: não foi possível criar a tabela ${nome}:`, e.message);
    }
  }
  console.log("Tabelas contatos, equipamentos e manutencoes OK.");
}

const PORT = 3000;
prepararBanco().finally(() => {
  app.listen(PORT, () => console.log(`Servidor PLAIN rodando em http://localhost:${PORT}`));
});
