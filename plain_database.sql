-- ============================================================
--  PLAIN – Modernização Industrial
--  Banco de Dados Completo
--  Gerado para: index.html (landing/cadastro) + dashboard.html
-- ============================================================

-- ------------------------------------------------------------
-- CONFIGURAÇÕES INICIAIS
-- ------------------------------------------------------------
SET NAMES 'utf8mb4';
SET time_zone = '-03:00';  -- Horário de Brasília

-- ============================================================
-- 1. USUÁRIOS
--    Suporta os dois tipos do formulário: Empresa e Pessoal
-- ============================================================
CREATE TABLE usuarios (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipo            ENUM('empresa', 'pessoal') NOT NULL,

    -- Campos comuns
    email           VARCHAR(255) NOT NULL UNIQUE,
    telefone        VARCHAR(20),
    senha_hash      VARCHAR(255) NOT NULL,

    -- Campos exclusivos – Empresa
    razao_social    VARCHAR(255),
    cnpj            VARCHAR(18),
    setor           VARCHAR(100),
    cargo           VARCHAR(100),

    -- Campos exclusivos – Pessoal
    nome            VARCHAR(100),
    sobrenome       VARCHAR(100),
    cidade          VARCHAR(100),
    estado          CHAR(2),

    -- Foto / avatar (inicial gerada automaticamente no front-end)
    avatar_url      VARCHAR(500),

    -- Métricas exibidas no dashboard
    disponibilidade_pct  TINYINT UNSIGNED DEFAULT 0,   -- ex.: 94
    projetos_ativos      SMALLINT UNSIGNED DEFAULT 0,
    servicos_concluidos  SMALLINT UNSIGNED DEFAULT 0,

    -- Controle de acesso
    ativo           BOOLEAN DEFAULT TRUE,
    criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_tipo  (tipo)
);

-- ============================================================
-- 2. SESSÕES DE LOGIN
-- ============================================================
CREATE TABLE sessoes (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT UNSIGNED NOT NULL,
    token       VARCHAR(512) NOT NULL UNIQUE,
    ip          VARCHAR(45),
    user_agent  TEXT,
    expira_em   TIMESTAMP NOT NULL,
    criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_usuario (usuario_id)
);

-- ============================================================
-- 3. CONTATOS / LEADS  (formulário da index.html)
--    Registra cada tentativa de "Entrar em contato" antes
--    de criar conta, para funil de marketing
-- ============================================================
CREATE TABLE leads (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipo        ENUM('empresa', 'pessoal') NOT NULL,

    -- Empresa
    razao_social VARCHAR(255),
    cnpj         VARCHAR(18),
    setor        VARCHAR(100),
    cargo        VARCHAR(100),

    -- Pessoal
    nome         VARCHAR(100),
    sobrenome    VARCHAR(100),
    cidade       VARCHAR(100),
    estado       CHAR(2),

    -- Comuns
    email        VARCHAR(255) NOT NULL,
    telefone     VARCHAR(20),

    -- Rastreamento
    convertido   BOOLEAN DEFAULT FALSE,   -- TRUE quando vira usuario
    usuario_id   INT UNSIGNED,            -- referência após conversão
    ip_origem    VARCHAR(45),
    criado_em    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_convertido (convertido)
);

-- ============================================================
-- 4. CONEXÕES ENTRE USUÁRIOS  (dashboard – "Conectar")
-- ============================================================
CREATE TABLE conexoes (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    solicitante_id  INT UNSIGNED NOT NULL,
    destinatario_id INT UNSIGNED NOT NULL,
    status          ENUM('pendente', 'aceita', 'recusada', 'bloqueada') DEFAULT 'pendente',
    criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_par (solicitante_id, destinatario_id),
    FOREIGN KEY (solicitante_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_destinatario (destinatario_id)
);

-- ============================================================
-- 5. PUBLICAÇÕES  (feed do dashboard)
-- ============================================================
CREATE TABLE publicacoes (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    autor_id    INT UNSIGNED NOT NULL,
    conteudo    TEXT NOT NULL,
    visibilidade ENUM('publico', 'conexoes', 'privado') DEFAULT 'publico',
    total_reacoes   INT UNSIGNED DEFAULT 0,
    total_comentarios INT UNSIGNED DEFAULT 0,
    total_compartilhamentos INT UNSIGNED DEFAULT 0,
    criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    editado_em  TIMESTAMP NULL,
    excluido    BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_autor (autor_id),
    INDEX idx_criado (criado_em)
);

-- ============================================================
-- 6. REAÇÕES NAS PUBLICAÇÕES  (curtir 👍 💡 🔥)
-- ============================================================
CREATE TABLE reacoes (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    publicacao_id   INT UNSIGNED NOT NULL,
    usuario_id      INT UNSIGNED NOT NULL,
    tipo            ENUM('curtir','util','destaque','fogo','enviar') DEFAULT 'curtir',
    criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_reacao (publicacao_id, usuario_id, tipo),
    FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id)    REFERENCES usuarios(id)    ON DELETE CASCADE
);

-- ============================================================
-- 7. COMENTÁRIOS
-- ============================================================
CREATE TABLE comentarios (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    publicacao_id   INT UNSIGNED NOT NULL,
    autor_id        INT UNSIGNED NOT NULL,
    pai_id          INT UNSIGNED,           -- para respostas aninhadas
    conteudo        TEXT NOT NULL,
    criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    excluido        BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE,
    FOREIGN KEY (autor_id)      REFERENCES usuarios(id)    ON DELETE CASCADE,
    FOREIGN KEY (pai_id)        REFERENCES comentarios(id) ON DELETE SET NULL,
    INDEX idx_publicacao (publicacao_id)
);

-- ============================================================
-- 8. PROJETOS  (painel de métricas – "Projetos Ativos")
-- ============================================================
CREATE TABLE projetos (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    responsavel_id  INT UNSIGNED NOT NULL,
    titulo          VARCHAR(255) NOT NULL,
    descricao       TEXT,
    status          ENUM('ativo','concluido','pausado','cancelado') DEFAULT 'ativo',
    data_inicio     DATE,
    data_fim_prev   DATE,
    data_fim_real   DATE,
    criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_responsavel (responsavel_id),
    INDEX idx_status (status)
);

-- ============================================================
-- 9. SERVIÇOS / ORDENS DE SERVIÇO  ("Serviços Concluídos")
-- ============================================================
CREATE TABLE servicos (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    projeto_id      INT UNSIGNED,
    responsavel_id  INT UNSIGNED NOT NULL,
    titulo          VARCHAR(255) NOT NULL,
    descricao       TEXT,
    status          ENUM('aberto','em_andamento','concluido','cancelado') DEFAULT 'aberto',
    prioridade      ENUM('baixa','media','alta','critica') DEFAULT 'media',
    data_abertura   DATE NOT NULL,
    data_conclusao  DATE,
    criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (projeto_id)     REFERENCES projetos(id)  ON DELETE SET NULL,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)  ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_responsavel (responsavel_id)
);

-- ============================================================
-- 10. NOTIFICAÇÕES  (contador no dashboard – "Notificações")
-- ============================================================
CREATE TABLE notificacoes (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT UNSIGNED NOT NULL,
    tipo        ENUM(
                    'conexao_solicitada',
                    'conexao_aceita',
                    'comentario',
                    'reacao',
                    'mensagem',
                    'projeto_atualizado',
                    'servico_concluido',
                    'sistema'
                ) NOT NULL,
    titulo      VARCHAR(255) NOT NULL,
    corpo       TEXT,
    referencia_tipo  VARCHAR(50),   -- 'publicacao', 'projeto', 'servico', etc.
    referencia_id    INT UNSIGNED,
    lida        BOOLEAN DEFAULT FALSE,
    criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_lida (usuario_id, lida),
    INDEX idx_criado (criado_em)
);

-- ============================================================
-- 11. MENSAGENS DIRETAS
-- ============================================================
CREATE TABLE mensagens (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    remetente_id    INT UNSIGNED NOT NULL,
    destinatario_id INT UNSIGNED NOT NULL,
    conteudo        TEXT NOT NULL,
    lida            BOOLEAN DEFAULT FALSE,
    criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (remetente_id)    REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_conversa (remetente_id, destinatario_id),
    INDEX idx_nao_lidas (destinatario_id, lida)
);

-- ============================================================
-- 12. NOTÍCIAS DO SETOR  (widget do dashboard – admin gerencia)
-- ============================================================
CREATE TABLE noticias (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    titulo      VARCHAR(500) NOT NULL,
    url         VARCHAR(1000),
    fonte       VARCHAR(100),
    total_leitores INT UNSIGNED DEFAULT 0,
    destaque    BOOLEAN DEFAULT FALSE,
    publicado_em TIMESTAMP NOT NULL,
    criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_publicado (publicado_em)
);

-- ============================================================
-- 13. LEITURAS DE NOTÍCIAS  (rastreio de leitores únicos)
-- ============================================================
CREATE TABLE noticias_leituras (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    noticia_id  INT UNSIGNED NOT NULL,
    usuario_id  INT UNSIGNED NOT NULL,
    lido_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_leitura (noticia_id, usuario_id),
    FOREIGN KEY (noticia_id)  REFERENCES noticias(id)  ON DELETE CASCADE,
    FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE
);

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- Resumo de métricas do usuário (alimenta os cards do dashboard)
CREATE OR REPLACE VIEW vw_metricas_usuario AS
SELECT
    u.id,
    u.disponibilidade_pct,
    COUNT(DISTINCT CASE WHEN p.status = 'ativo'     THEN p.id END) AS projetos_ativos,
    COUNT(DISTINCT CASE WHEN s.status = 'concluido' THEN s.id END) AS servicos_concluidos,
    COUNT(DISTINCT CASE WHEN n.lida = FALSE          THEN n.id END) AS notificacoes_nao_lidas
FROM usuarios u
LEFT JOIN projetos    p ON p.responsavel_id = u.id
LEFT JOIN servicos    s ON s.responsavel_id = u.id
LEFT JOIN notificacoes n ON n.usuario_id    = u.id
WHERE u.ativo = TRUE
GROUP BY u.id, u.disponibilidade_pct;

-- Feed do dashboard: publicações com dados do autor
CREATE OR REPLACE VIEW vw_feed AS
SELECT
    pub.id,
    pub.conteudo,
    pub.visibilidade,
    pub.total_reacoes,
    pub.total_comentarios,
    pub.total_compartilhamentos,
    pub.criado_em,
    u.id            AS autor_id,
    COALESCE(u.razao_social, CONCAT(u.nome, ' ', u.sobrenome)) AS autor_nome,
    u.cargo         AS autor_cargo,
    u.setor         AS autor_setor,
    u.avatar_url    AS autor_avatar
FROM publicacoes pub
JOIN usuarios u ON u.id = pub.autor_id
WHERE pub.excluido = FALSE
ORDER BY pub.criado_em DESC;

-- ============================================================
-- DADOS INICIAIS (SEED)
-- ============================================================

-- Usuários de exemplo (senhas fictícias – usar bcrypt em produção)
INSERT INTO usuarios (tipo, email, telefone, senha_hash, razao_social, cnpj, setor, cargo, disponibilidade_pct, projetos_ativos, servicos_concluidos) VALUES
('empresa', 'contato@grupometalpro.com.br', '(41) 99000-0001', '$2b$12$placeholder_hash_1', 'Grupo MetalPro Ltda.',   '12.345.678/0001-90', 'Metalurgia',    'Gerente de Manutenção', 94, 12, 7),
('empresa', 'marina@voith.com.br',          '(11) 98000-0002', '$2b$12$placeholder_hash_2', 'Grupo Voith S.A.',       '98.765.432/0001-10', 'Mecânica',      'Gestora de Manutenção',  88, 8,  5),
('pessoal', 'ricardo.alves@email.com',      '(21) 97000-0003', '$2b$12$placeholder_hash_3', NULL, NULL, NULL, NULL,                                          91, 5,  3);

-- Atualiza campos pessoais para o usuário tipo pessoal
UPDATE usuarios SET nome='Ricardo', sobrenome='Alves', cidade='Rio de Janeiro', estado='RJ' WHERE id=3;

-- Notícias de exemplo
INSERT INTO noticias (titulo, url, fonte, total_leitores, destaque, publicado_em) VALUES
('Indústria 4.0: Brasil avança no ranking global de automação',          'https://exemplo.com/1', 'ABIMAQ',    1240, TRUE,  NOW() - INTERVAL 3 HOUR),
('Siemens lança nova linha de CLPs para retrofit em ambientes críticos', 'https://exemplo.com/2', 'Siemens',    890, FALSE, NOW() - INTERVAL 8 HOUR),
('ABIMAQ: crescimento de 12% na demanda por modernização industrial em 2025','https://exemplo.com/3','ABIMAQ', 2100, FALSE, NOW() - INTERVAL 1 DAY),
('Manutenção preditiva via IA reduz falhas em 40% nas montadoras',      'https://exemplo.com/4', 'AutoData',  3450, FALSE, NOW() - INTERVAL 2 DAY);

-- Publicações de exemplo
INSERT INTO publicacoes (autor_id, conteudo, total_reacoes, total_comentarios, total_compartilhamentos) VALUES
(1, 'Acabamos de concluir o retrofit completo de uma linha de solda com 20 anos de uso. Resultado: redução de 35% no consumo energético e aumento de 28% na produtividade. Retrofit industrial não é apenas sobre economia — é sobre competitividade. 🏭⚙️', 143, 31, 18),
(2, 'Quem mais acha que a gestão de manutenção ainda é subutilizada em ambientes industriais brasileiros? 🤔\n\nTemos feito uma transição de manutenção corretiva para manutenção preditiva baseada em IoT e os ganhos têm sido impressionantes. Sensores de vibração + análise de dados = menos surpresas na linha de produção.', 89, 44, 0),
(3, '📊 Dados que impressionam: Empresas que investem em retrofit industrial economizam em média 60–70% do custo de aquisição de equipamentos novos, mantendo performance equivalente ou superior.', 312, 67, 41);

-- Conexões sugeridas (status pendente = aguardando resposta)
INSERT INTO conexoes (solicitante_id, destinatario_id, status) VALUES
(1, 2, 'pendente'),
(1, 3, 'aceita');

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
