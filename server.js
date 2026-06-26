// ============================================================
//  PLAIN – Back-end (API)  |  Node.js + Express + MySQL

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
  password: "SUA_SENHA_AQUI",
  database: "plain_db",
  waitForConnections: true,
  connectionLimit: 10
});

// ============================================================
//  POST /api/cadastro  -> cria conta (empresa ou pessoal)
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
//  POST /api/login 
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
//  GET /api/contas  
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
//  PUT /api/empresa/:usuarioId  
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
//  DELETE /api/conta/:usuarioId  
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

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor PLAIN rodando em http://localhost:${PORT}`));
