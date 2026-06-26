
DROP DATABASE IF EXISTS plain_db;
CREATE DATABASE plain_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE plain_db;

-- ============================================================
--   TABELA: usuarios
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
--   TABELA: empresas
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
--   TABELA: pessoas
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
--  TABELA: sessoes 
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
--  VIEW: vw_contas
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
--   DADOS DE EXEMPLO 
-- ============================================================
INSERT INTO usuarios (email, senha_hash, tipo_conta) VALUES
  ('contato@metalurgicaxyz.com.br', '$2y$10$exemploDeHashEmpresa000000000000000000000000', 'empresa'),
  ('joao.silva@email.com',          '$2y$10$exemploDeHashPessoa0000000000000000000000000', 'pessoal');

INSERT INTO empresas (usuario_id, razao_social, cnpj, telefone, setor, cargo) VALUES
  (1, 'Metalúrgica XYZ Ltda', '12345678000190', '4133221100', 'Metalurgia', 'Gerente de Manutenção');

INSERT INTO pessoas (usuario_id, nome, sobrenome, telefone, cidade, estado) VALUES
  (2, 'João', 'Silva', '41999887766', 'Curitiba', 'PR');
