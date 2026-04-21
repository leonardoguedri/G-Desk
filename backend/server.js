const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const SECRET = 'guedri_secret_2026';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const db = new sqlite3.Database('./database.db');

// TABELAS
db.run(`CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT, email TEXT UNIQUE,
  senha TEXT, perfil TEXT, setor TEXT
)`);

db.run(`ALTER TABLE usuarios ADD COLUMN setor TEXT`, () => {});

db.run(`CREATE TABLE IF NOT EXISTS chamados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protocolo TEXT, titulo TEXT, descricao TEXT,
  categoria TEXT, status TEXT DEFAULT 'Pendente',
  prioridade TEXT DEFAULT 'Normal', canal TEXT,
  instituicao TEXT, unidade TEXT,
  solicitante_nome TEXT, solicitante_email TEXT,
  solicitante_telefone TEXT, setor_destino TEXT,
  usuario_id INTEGER, responsavel_id INTEGER,
  data_criacao TEXT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
)`);

db.run(`CREATE TABLE IF NOT EXISTS movimentacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chamado_id INTEGER, usuario_nome TEXT,
  tipo TEXT, descricao TEXT, data TEXT,
  FOREIGN KEY (chamado_id) REFERENCES chamados(id)
)`);

db.run(`CREATE TABLE IF NOT EXISTS comentarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chamado_id INTEGER, usuario_nome TEXT,
  texto TEXT, data TEXT,
  FOREIGN KEY (chamado_id) REFERENCES chamados(id)
)`);

db.run(`CREATE TABLE IF NOT EXISTS anexos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chamado_id INTEGER, nome TEXT,
  caminho TEXT, data TEXT,
  FOREIGN KEY (chamado_id) REFERENCES chamados(id)
)`);

db.run(`CREATE TABLE IF NOT EXISTS setores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS instituicoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT, cidade TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT, sla_resposta TEXT, sla_solucao TEXT
)`);

// UPLOAD
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// MIDDLEWARE JWT
function autenticar(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ erro: 'Token não fornecido' });

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.usuario = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ erro: 'Token inválido' });
  }
}

// ROTA TESTE
app.get('/', (req, res) => res.send('API rodando'));

// LOGIN
app.post('/login', (req, res) => {
  const { email, senha } = req.body;

  db.get(`SELECT * FROM usuarios WHERE email = ?`, [email], async (err, user) => {
    if (err) return res.status(500).json(err);
    if (!user) return res.status(401).json({ erro: 'Usuário ou senha inválidos' });

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) return res.status(401).json({ erro: 'Usuário ou senha inválidos' });

    const token = jwt.sign(
      { id: user.id, nome: user.nome, perfil: user.perfil, setor: user.setor },
      SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, usuario: { id: user.id, nome: user.nome, perfil: user.perfil, setor: user.setor } });
  });
});

// CRIAR USUÁRIO (com senha criptografada)
app.post('/usuarios', async (req, res) => {
  const { nome, email, senha, perfil, setor } = req.body;
  const senhaCriptografada = await bcrypt.hash(senha, 10);

  db.run(
    `INSERT INTO usuarios (nome, email, senha, perfil, setor) VALUES (?, ?, ?, ?, ?)`,
    [nome, email, senhaCriptografada, perfil, setor],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

// LISTAR USUÁRIOS
app.get('/usuarios', autenticar, (req, res) => {
  db.all(`SELECT id, nome, email, perfil, setor FROM usuarios`, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// DELETAR USUÁRIO
app.delete('/usuarios/:id', autenticar, (req, res) => {
  db.run(`DELETE FROM usuarios WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ sucesso: true });
  });
});

// CRIAR CHAMADO
app.post('/chamados', autenticar, (req, res) => {
  const {
    titulo, descricao, categoria, prioridade, canal,
    instituicao, unidade, solicitante_nome, solicitante_email,
    solicitante_telefone, setor_destino, usuario_id
  } = req.body;

  const protocolo = `${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
  const data_criacao = new Date().toLocaleDateString('pt-BR');

  db.run(
    `INSERT INTO chamados (
      protocolo, titulo, descricao, categoria, prioridade, canal,
      instituicao, unidade, solicitante_nome, solicitante_email,
      solicitante_telefone, setor_destino, usuario_id, data_criacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [protocolo, titulo, descricao, categoria, prioridade, canal,
     instituicao, unidade, solicitante_nome, solicitante_email,
     solicitante_telefone, setor_destino, usuario_id, data_criacao],
    function (err) {
      if (err) return res.status(500).json(err);
      db.run(
        `INSERT INTO movimentacoes (chamado_id, usuario_nome, tipo, descricao, data)
         VALUES (?, ?, ?, ?, ?)`,
        [this.lastID, req.usuario.nome, 'abertura', 'Chamado aberto', data_criacao]
      );
      res.json({ id: this.lastID, protocolo });
    }
  );
});

// BUSCAR CHAMADO POR ID
app.get('/chamados/:id', autenticar, (req, res) => {
  db.get(`SELECT * FROM chamados WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json(err);
    if (!row) return res.status(404).json({ erro: 'Chamado não encontrado' });
    res.json(row);
  });
});

// LISTAR CHAMADOS
app.get('/chamados', autenticar, (req, res) => {
  db.all(`SELECT * FROM chamados ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// CHAMADOS POR SETOR
app.get('/chamados/setor/:setor', autenticar, (req, res) => {
  db.all(
    `SELECT * FROM chamados WHERE setor_destino = ? ORDER BY id DESC`,
    [req.params.setor],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

// ASSUMIR CHAMADO
app.put('/chamados/:id/assumir', autenticar, (req, res) => {
  const { id } = req.params;
  const { usuario_id, usuario_nome } = req.body;
  const data = new Date().toLocaleString('pt-BR');

  db.run(
    `UPDATE chamados SET responsavel_id = ?, status = 'Em Execução' WHERE id = ?`,
    [usuario_id, id],
    function (err) {
      if (err) return res.status(500).json(err);
      db.run(
        `INSERT INTO movimentacoes (chamado_id, usuario_nome, tipo, descricao, data)
         VALUES (?, ?, ?, ?, ?)`,
        [id, usuario_nome, 'assumido', `Chamado assumido por ${usuario_nome}`, data]
      );
      res.json({ sucesso: true });
    }
  );
});

// CONCLUIR CHAMADO
app.put('/chamados/:id/concluir', autenticar, (req, res) => {
  const { id } = req.params;
  const { usuario_nome } = req.body;
  const data = new Date().toLocaleString('pt-BR');

  db.run(
    `UPDATE chamados SET status = 'Concluído' WHERE id = ?`,
    [id],
    function (err) {
      if (err) return res.status(500).json(err);
      db.run(
        `INSERT INTO movimentacoes (chamado_id, usuario_nome, tipo, descricao, data)
         VALUES (?, ?, ?, ?, ?)`,
        [id, usuario_nome, 'concluido', `Chamado concluído por ${usuario_nome}`, data]
      );
      res.json({ sucesso: true });
    }
  );
});

// MOVIMENTAÇÕES
app.get('/chamados/:id/movimentacoes', autenticar, (req, res) => {
  db.all(
    `SELECT * FROM movimentacoes WHERE chamado_id = ? ORDER BY id ASC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

// COMENTÁRIOS
app.post('/chamados/:id/comentarios', autenticar, (req, res) => {
  const { usuario_nome, texto } = req.body;
  const data = new Date().toLocaleString('pt-BR');

  db.run(
    `INSERT INTO comentarios (chamado_id, usuario_nome, texto, data) VALUES (?, ?, ?, ?)`,
    [req.params.id, usuario_nome, texto, data],
    function (err) {
      if (err) return res.status(500).json(err);
      db.run(
        `INSERT INTO movimentacoes (chamado_id, usuario_nome, tipo, descricao, data)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, usuario_nome, 'comentario', 'Comentário adicionado', data]
      );
      res.json({ id: this.lastID });
    }
  );
});

app.get('/chamados/:id/comentarios', autenticar, (req, res) => {
  db.all(
    `SELECT * FROM comentarios WHERE chamado_id = ? ORDER BY id ASC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

// ANEXOS
app.post('/chamados/:id/anexos', autenticar, upload.single('arquivo'), (req, res) => {
  const { usuario_nome } = req.body;
  const data = new Date().toLocaleString('pt-BR');

  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });

  db.run(
    `INSERT INTO anexos (chamado_id, nome, caminho, data) VALUES (?, ?, ?, ?)`,
    [req.params.id, req.file.originalname, req.file.filename, data],
    function (err) {
      if (err) return res.status(500).json(err);
      db.run(
        `INSERT INTO movimentacoes (chamado_id, usuario_nome, tipo, descricao, data)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, usuario_nome, 'anexo', `Anexo: ${req.file?.originalname}`, data]
      );
      res.json({ id: this.lastID, nome: req.file?.originalname });
    }
  );
});

app.get('/chamados/:id/anexos', autenticar, (req, res) => {
  db.all(
    `SELECT * FROM anexos WHERE chamado_id = ? ORDER BY id ASC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

// SETORES
app.get('/setores', autenticar, (req, res) => {
  db.all(`SELECT * FROM setores`, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post('/setores', autenticar, (req, res) => {
  db.run(`INSERT INTO setores (nome) VALUES (?)`, [req.body.nome], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ id: this.lastID });
  });
});

app.delete('/setores/:id', autenticar, (req, res) => {
  db.run(`DELETE FROM setores WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ sucesso: true });
  });
});

// INSTITUIÇÕES
app.get('/instituicoes', autenticar, (req, res) => {
  db.all(`SELECT * FROM instituicoes`, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post('/instituicoes', autenticar, (req, res) => {
  const { nome, cidade } = req.body;
  db.run(`INSERT INTO instituicoes (nome, cidade) VALUES (?, ?)`, [nome, cidade], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ id: this.lastID });
  });
});

app.delete('/instituicoes/:id', autenticar, (req, res) => {
  db.run(`DELETE FROM instituicoes WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ sucesso: true });
  });
});

// CATEGORIAS
app.get('/categorias', autenticar, (req, res) => {
  db.all(`SELECT * FROM categorias`, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post('/categorias', autenticar, (req, res) => {
  const { nome, sla_resposta, sla_solucao } = req.body;
  db.run(
    `INSERT INTO categorias (nome, sla_resposta, sla_solucao) VALUES (?, ?, ?)`,
    [nome, sla_resposta, sla_solucao],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

app.delete('/categorias/:id', autenticar, (req, res) => {
  db.run(`DELETE FROM categorias WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ sucesso: true });
  });
});

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));