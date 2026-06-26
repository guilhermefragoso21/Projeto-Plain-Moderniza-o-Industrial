-- ============================================================
--  PLAIN – Modernização Industrial (Retrofit)
--  Banco de dados MySQL
--  Compatível com MySQL 8.x / MariaDB 10.4+
-- ============================================================

-- ---------- 1. Criação do banco ----------
DROP DATABASE IF EXISTS plain_db;
CREATE DATABASE plain_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE plain_db;

-- ============================================================
--  2. TABELA: usuarios
--  Guarda as credenciais de acesso (tela de login).
--  A senha NUNCA deve ser salva em texto puro:
--  o back-end grava o HASH (ex.: bcrypt) na coluna senha_hash.
-- ============================================================
CREATE TABLE usuarios (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email           VARCHAR(150) NOT NULL,
  senha_hash      VARCHAR(255) NOT NULL,
  tipo_conta      ENUM('empresa','pessoal') NOT NULL,
  ativo           TINYINT(1) NOT NULL DEFAULT 1,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
  ultimo_login    TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  3. TABELA: empresas
--  Dados do formulário "Empresa" da tela de criar conta.
--  Relacionamento 1:1 com usuarios.
-- ============================================================
CREATE TABLE empresas (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED NOT NULL,
  razao_social    VARCHAR(200) NOT NULL,
  cnpj            CHAR(14) NOT NULL,             -- somente dígitos
  telefone        VARCHAR(20) NULL,
  setor           VARCHAR(100) NULL,
  cargo           VARCHAR(100) NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_empresas_cnpj (cnpj),
  UNIQUE KEY uq_empresas_usuario (usuario_id),
  CONSTRAINT fk_empresas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  4. TABELA: pessoas
--  Dados do formulário "Pessoal" da tela de criar conta.
--  Relacionamento 1:1 com usuarios.
-- ============================================================
CREATE TABLE pessoas (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED NOT NULL,
  nome            VARCHAR(100) NOT NULL,
  sobrenome       VARCHAR(100) NOT NULL,
  telefone        VARCHAR(20) NULL,
  cidade          VARCHAR(100) NULL,
  estado          VARCHAR(50) NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pessoas_usuario (usuario_id),
  CONSTRAINT fk_pessoas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  5. TABELA: sessoes  (opcional, mas recomendada)
--  Registra logins para autenticação por token / auditoria.
-- ============================================================
CREATE TABLE sessoes (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED NOT NULL,
  token           CHAR(64) NOT NULL,            -- hash do token de sessão
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em       TIMESTAMP NOT NULL,
  ip              VARCHAR(45) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessoes_token (token),
  KEY idx_sessoes_usuario (usuario_id),
  CONSTRAINT fk_sessoes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  6. VIEW: vw_contas
--  Junta usuário + dados específicos para consultas rápidas.
-- ============================================================
CREATE OR REPLACE VIEW vw_contas AS
SELECT
  u.id              AS usuario_id,
  u.email,
  u.tipo_conta,
  u.ativo,
  u.criado_em,
  e.razao_social,
  e.cnpj,
  e.setor,
  e.cargo,
  p.nome,
  p.sobrenome,
  p.cidade,
  p.estado,
  COALESCE(e.telefone, p.telefone) AS telefone
FROM usuarios u
LEFT JOIN empresas e ON e.usuario_id = u.id
LEFT JOIN pessoas  p ON p.usuario_id = u.id;

-- ============================================================
--  7. DADOS DE EXEMPLO (seed)
--  As senhas abaixo são apenas placeholders de hash.
--  No sistema real, gere o hash no back-end (bcrypt/argon2).
-- ============================================================
INSERT INTO usuarios (email, senha_hash, tipo_conta) VALUES
  ('contato@metalurgicaxyz.com.br', '$2y$10$exemploDeHashEmpresa000000000000000000000000', 'empresa'),
  ('joao.silva@email.com',          '$2y$10$exemploDeHashPessoa0000000000000000000000000', 'pessoal');

INSERT INTO empresas (usuario_id, razao_social, cnpj, telefone, setor, cargo) VALUES
  (1, 'Metalúrgica XYZ Ltda', '12345678000190', '4133221100', 'Metalurgia', 'Gerente de Manutenção');

INSERT INTO pessoas (usuario_id, nome, sobrenome, telefone, cidade, estado) VALUES
  (2, 'João', 'Silva', '41999887766', 'Curitiba', 'PR');
