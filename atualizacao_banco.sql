-- ============================================================
--  PLAIN — atualização do banco 
-- ============================================================
SET NAMES utf8mb4;
USE plain_db;

-- ============================================================
--  TABELA: projetos  
-- ============================================================
CREATE TABLE IF NOT EXISTS projetos (
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
CREATE TABLE IF NOT EXISTS conexoes (
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
CREATE TABLE IF NOT EXISTS contatos (
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
CREATE TABLE IF NOT EXISTS equipamentos (
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
CREATE TABLE IF NOT EXISTS manutencoes (
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
