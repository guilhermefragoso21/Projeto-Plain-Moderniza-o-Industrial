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

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor PLAIN rodando em http://localhost:${PORT}`));