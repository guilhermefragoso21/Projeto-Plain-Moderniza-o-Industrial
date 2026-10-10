# PLAIN – Modernização Industrial

Plataforma web que conecta empresas que querem modernizar suas máquinas (retrofit industrial) a profissionais e prestadores de serviço especializados.

Projeto desenvolvido como Trabalho de Conclusão de Curso do Técnico em Desenvolvimento de Sistemas – Colégio Estadual Professor Júlio Szymanski (Araucária/PR, 2026).

---

## Funcionalidades

- **Cadastro e login** de contas do tipo **Empresa** ou **Pessoal**, com senha criptografada (bcrypt)
- **Início (feed):** perfil do usuário, estatísticas e indicadores
- **Rede:** lista de empresas e profissionais cadastrados, com busca, filtros e botão Conectar/Desconectar
- **Projetos:** criar, editar, excluir e alterar o status de projetos (Planejamento, Em andamento, Concluído, Pausado), com prazo e destaque para projetos atrasados
- **Mensagens:** área reservada para comunicação entre usuários (em desenvolvimento)

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Interface | HTML, CSS e JavaScript |
| Servidor | Node.js + Express |
| Banco de dados | MySQL |
| Bibliotecas | mysql2, bcrypt, cors |

---

## Requisitos

Antes de começar, instale no computador:

1. **Node.js** (versão 18 ou superior) – https://nodejs.org
2. **MySQL Server** (versão 8.0 ou superior) – https://dev.mysql.com/downloads/mysql/
   - Opcional: **MySQL Workbench**, para gerenciar o banco com interface gráfica.

Para conferir se o Node.js está instalado, abra o terminal (cmd) e digite:

```bash
node -v
npm -v
```

---

## Estrutura de arquivos

```
plain/
├── imagens/
│   ├── Logo PLAIN.png
│   └── fundosite.png
├── index.html            # Tela de login
├── criar-conta.html      # Tela de cadastro
├── dashboard.html        # Painel principal (Início)
├── rede.html             # Página Rede
├── projetos.html         # Página Projetos
├── mensagens.html        # Página Mensagens
├── style.css             # Estilos do login e cadastro
├── dashboard.css         # Estilos do painel e páginas internas
├── main.js               # Login e cadastro
├── dashboard.js          # Painel principal
├── comum.js              # Funções compartilhadas (Rede, Projetos, Mensagens)
├── rede.js               # Lógica da página Rede
├── projetos.js           # Lógica da página Projetos
├── server.js             # Servidor (API + arquivos do site)
├── banco_plain.sql       # Script completo do banco de dados
└── atualizacao_banco.sql # Cria só as tabelas novas em um banco já existente
```

---

## Passo a passo para executar

### 1. Criar o banco de dados

> ⚠️ O script `banco_plain.sql` **apaga e recria** o banco `plain_db`. Use-o só na primeira instalação ou quando quiser começar do zero.

**Opção A – pelo MySQL Workbench**

1. Abra o MySQL Workbench e conecte com o usuário `root`.
2. Vá em **File › Open SQL Script** e abra o arquivo `banco_plain.sql`.
3. Clique no raio (⚡) para executar.

**Opção B – pelo terminal (cmd)**

```bash
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
mysql -u root -p < "C:\caminho\para\a\pasta\plain\banco_plain.sql"
```

Troque `8.0` pela sua versão do MySQL e `C:\caminho\para\a\pasta\plain` pelo local onde está o projeto. Digite a senha do MySQL quando for pedida.

> **Já tem o banco criado e não quer perder os dados?** Rode o `atualizacao_banco.sql` em vez do `banco_plain.sql`. Ele só cria as tabelas `projetos` e `conexoes`, sem apagar nada.
> O servidor também cria essas duas tabelas automaticamente ao iniciar, caso não existam.

### 2. Configurar a conexão com o banco

Abra o `server.js` e confira os dados de acesso ao MySQL (por volta da linha 17):

```js
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "212026",   // ← troque pela senha do SEU MySQL
  database: "plain_db",
  ...
});
```

### 3. Instalar as dependências

Abra o terminal **dentro da pasta do projeto** e rode:

```bash
npm init -y
npm install express mysql2 bcrypt cors
```

> Se a pasta já tiver os arquivos `package.json` e `node_modules`, basta rodar `npm install`.
> Esse passo só precisa ser feito uma vez.

### 4. Iniciar o servidor

Ainda na pasta do projeto:

```bash
node server.js
```

Se tudo estiver certo, o terminal mostra:

```
Tabelas projetos e conexoes OK.
Servidor PLAIN rodando em http://localhost:3000
```

**Deixe esse terminal aberto** enquanto usar o sistema. Para parar o servidor, aperte **Ctrl + C**.

### 5. Acessar o sistema

Abra o navegador e acesse:

**http://localhost:3000**

1. Clique em **Criar conta**, escolha **Empresa** ou **Pessoal** e preencha os dados.
2. Volte ao login e entre com o e-mail e a senha cadastrados.
3. Use o menu superior para acessar **Rede**, **Projetos** e **Mensagens**.

> Sempre acesse pelo endereço `http://localhost:3000`. Abrir o arquivo `index.html` direto (clicando duas vezes) não funciona, porque o site precisa do servidor para salvar e ler os dados.

---

## Rotas da API

| Método | Rota | Função |
|---|---|---|
| POST | `/api/cadastro` | Cria uma conta |
| POST | `/api/login` | Faz login |
| GET | `/api/conta/:usuarioId` | Dados de uma conta |
| GET | `/api/contas` | Lista todas as contas |
| GET | `/api/estatisticas` | Total de contas, empresas e pessoas |
| PUT | `/api/empresa/:usuarioId` | Atualiza dados de uma empresa |
| DELETE | `/api/conta/:usuarioId` | Remove uma conta |
| GET | `/api/projetos/:usuarioId` | Lista os projetos do usuário |
| POST | `/api/projetos` | Cria um projeto |
| PUT | `/api/projetos/:id` | Edita um projeto |
| DELETE | `/api/projetos/:id?usuario_id=` | Exclui um projeto |
| GET | `/api/rede/:usuarioId` | Lista as contas da rede e quem já está conectado |
| POST | `/api/conexoes` | Conecta dois usuários |
| DELETE | `/api/conexoes/:usuarioId/:conectadoId` | Desfaz uma conexão |

---

## Problemas comuns

| Problema | Causa provável | Solução |
|---|---|---|
| `Erro de conexão. O servidor (server.js) está rodando?` | O servidor não foi iniciado | Rode `node server.js` e mantenha o terminal aberto |
| `Erro 404` ao salvar projeto | Está rodando uma versão antiga do `server.js` | Pare o servidor (Ctrl + C), substitua o `server.js` e rode de novo |
| `Access denied for user 'root'@'localhost'` | Senha do MySQL errada no `server.js` | Corrija o campo `password` no `server.js` |
| `Unknown database 'plain_db'` | O banco não foi criado | Execute o `banco_plain.sql` (passo 1) |
| `Table 'plain_db.projetos' doesn't exist` | Banco antigo, sem as tabelas novas | Rode o `atualizacao_banco.sql` ou reinicie o servidor |
| `EADDRINUSE: address already in use :::3000` | Já existe outro servidor rodando na porta 3000 | Feche o outro terminal com o `node` ou reinicie o computador |
| `Cannot find module 'express'` | Dependências não instaladas | Rode o passo 3 dentro da pasta do projeto |
| Acentos aparecendo errado (ex.: `JoÃ£o`) | Banco importado sem UTF-8 | Recrie o banco com o `banco_plain.sql` atualizado |
| Logo ou imagem de fundo não aparecem | Pasta `imagens` ausente ou com nome diferente | Confira se existem `imagens/Logo PLAIN.png` e `imagens/fundosite.png` |

---

## Autor

**Guilherme Fragoso Pereira de Sousa**
Orientador: Prof. Antonio Carlos