
SET NAMES utf8mb4;

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
--  TABELA: projetos  
-- ============================================================
CREATE TABLE projetos (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED NOT NULL,
  titulo          VARCHAR(150) NOT NULL,
  cliente         VARCHAR(150) NULL,
  descricao       TEXT NULL,
  status          ENUM('planejamento','em_andamento','concluido','pausado')
                    NOT NULL DEFAULT 'planejamento',
  prazo           DATE NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projetos_usuario (usuario_id),
  CONSTRAINT fk_projetos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  TABELA: conexoes  
-- ============================================================
CREATE TABLE conexoes (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED NOT NULL,
  conectado_id    INT UNSIGNED NOT NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_conexoes_par (usuario_id, conectado_id),
  KEY idx_conexoes_conectado (conectado_id),
  CONSTRAINT fk_conexoes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_conexoes_conectado
    FOREIGN KEY (conectado_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  TABELA: contatos  (mensagens da página Contato)
-- ============================================================
CREATE TABLE contatos (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED NULL,               -- NULL = visitante sem login
  nome            VARCHAR(150) NOT NULL,
  email           VARCHAR(150) NOT NULL,
  assunto         ENUM('duvida','sugestao','problema','parceria','outro')
                    NOT NULL DEFAULT 'duvida',
  mensagem        TEXT NOT NULL,
  lida            TINYINT(1) NOT NULL DEFAULT 0,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contatos_usuario (usuario_id),
  CONSTRAINT fk_contatos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  TABELA: equipamentos  (menu Equipamentos)
-- ============================================================
CREATE TABLE equipamentos (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED NOT NULL,
  nome            VARCHAR(150) NOT NULL,
  tipo            VARCHAR(80)  NULL,
  fabricante      VARCHAR(100) NULL,
  modelo          VARCHAR(100) NULL,
  localizacao     VARCHAR(150) NULL,
  ano_fabricacao  SMALLINT UNSIGNED NULL,
  status          ENUM('operando','manutencao','parado','retrofit')
                    NOT NULL DEFAULT 'operando',
  observacoes     TEXT NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_equipamentos_usuario (usuario_id),
  CONSTRAINT fk_equipamentos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  TABELA: manutencoes  (menu Manutenções)
-- ============================================================
CREATE TABLE manutencoes (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED NOT NULL,
  equipamento_id  INT UNSIGNED NOT NULL,
  titulo          VARCHAR(150) NOT NULL,
  tipo            ENUM('preventiva','corretiva','preditiva')
                    NOT NULL DEFAULT 'preventiva',
  status          ENUM('agendada','em_execucao','concluida','cancelada')
                    NOT NULL DEFAULT 'agendada',
  data_prevista   DATE NOT NULL,
  data_conclusao  DATE NULL,
  custo           DECIMAL(10,2) NULL,
  responsavel     VARCHAR(150) NULL,
  observacoes     TEXT NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_manutencoes_usuario (usuario_id),
  KEY idx_manutencoes_equipamento (equipamento_id),
  CONSTRAINT fk_manutencoes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_manutencoes_equipamento
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos (id)
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

INSERT INTO projetos (usuario_id, titulo, cliente, descricao, status, prazo) VALUES
  (1, 'Retrofit prensa hidráulica PH-02', 'Linha de estampagem', 'Troca do CLP e do painel elétrico, com IHM nova.', 'em_andamento', '2026-12-15');

INSERT INTO equipamentos (usuario_id, nome, tipo, fabricante, modelo, localizacao, ano_fabricacao, status) VALUES
  (1, 'Prensa hidráulica PH-02', 'Prensa', 'Schuler', 'PH-250', 'Linha de estampagem', 1998, 'retrofit'),
  (1, 'Torno CNC T-01',          'Torno CNC', 'Romi', 'Centur 30D', 'Usinagem', 2005, 'operando'),
  (1, 'Compressor C-03',         'Compressor', 'Atlas Copco', 'GA 37', 'Casa de máquinas', 2012, 'operando');

INSERT INTO manutencoes (usuario_id, equipamento_id, titulo, tipo, status, data_prevista, data_conclusao, custo, responsavel) VALUES
  (1, 2, 'Troca de óleo e filtros do cabeçote', 'preventiva', 'concluida', '2026-09-10', '2026-09-10', 850.00, 'Equipe interna'),
  (1, 3, 'Análise de vibração',                 'preditiva',  'agendada',  '2026-11-05', NULL, NULL, 'João Silva'),
  (1, 1, 'Substituição do CLP e painel',        'corretiva',  'em_execucao','2026-10-25', NULL, 18500.00, 'João Silva');
