-- ============================================================
--  PLAIN — atualização do banco (Rede + Projetos)
--  Rode este arquivo UMA vez no banco que já existe.
--  Ele NÃO apaga nada: só cria as tabelas novas se não existirem.
-- ============================================================
SET NAMES utf8mb4;
USE plain_db;

-- ============================================================
--  TABELA: projetos  (cada projeto pertence a um usuário)
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
--  TABELA: conexoes  (usuario_id se conectou a conectado_id)
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
