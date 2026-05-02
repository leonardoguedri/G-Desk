require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'seuemail@gmail.com',
    pass: process.env.EMAIL_PASS || 'sua_senha_de_app'
  }
});

function enviarEmail(para, assunto, corpo) {
  if (!para) return;
  transporter.sendMail({
    from: `"G-Desk" <${process.env.EMAIL_USER || 'seuemail@gmail.com'}>`,
    to: para,
    subject: assunto,
    html: corpo
  }, (err) => {
    if (err) console.error('Erro ao enviar email:', err.message);
    else console.log(`Email enviado para ${para}`);
  });
}

function templateEmail(titulo, mensagem, protocolo) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e3a5f; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">G-Desk</h2>
        <p style="color: #93c5fd; margin: 4px 0 0;">Sistema de Gestão de Chamados</p>
      </div>
      <div style="padding: 24px; background: #f9fafb;">
        <h3 style="color: #1e3a5f;">${titulo}</h3>
        <p style="color: #374151;">${mensagem}</p>
        <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin-top: 16px;">
          <strong style="color: #6b7280;">Protocolo:</strong>
          <span style="color: #1e3a5f; font-size: 18px; font-weight: bold; margin-left: 8px;">${protocolo}</span>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
          Enviado por PRODEPA-Empresa de Tecnologia da Informação e Comunicação do Estado do Pará atravéz da GCI - Guedri Codificando o Impossivel, Você está recebendo esse e-mail por ser parceiro da PRODEPA. Por mais informações entre em contato com nossas centrais de atendimento.
        </p>
      </div>
    </div>
  `;
}
const app = express();
const SECRET = 'guedri_secret_2026';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT, email TEXT UNIQUE,
    senha TEXT, perfil TEXT, setor TEXT,
    ultimo_acesso TEXT
  )`);

  db.run(`ALTER TABLE usuarios ADD COLUMN setor TEXT`, () => {});
  db.run(`ALTER TABLE usuarios ADD COLUMN ultimo_acesso TEXT`, () => {});
  db.run(`ALTER TABLE setores ADD COLUMN email TEXT`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS chamados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocolo TEXT, titulo TEXT, descricao TEXT,
    categoria TEXT, status TEXT DEFAULT 'Pendente',
    prioridade TEXT DEFAULT 'Normal', canal TEXT,
    instituicao TEXT, unidade TEXT,
    solicitante_nome TEXT, solicitante_email TEXT,
    solicitante_telefone TEXT, setor_destino TEXT,
    usuario_id INTEGER, responsavel_id INTEGER,
    responsavel_nome TEXT, responsavel_email TEXT,
    criador_nome TEXT, setor_abertura TEXT,
    data_criacao TEXT, data_conclusao TEXT,
    sla_resposta TEXT, sla_solucao TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`);

  db.run(`ALTER TABLE chamados ADD COLUMN criador_nome TEXT`, () => {});
  db.run(`ALTER TABLE chamados ADD COLUMN setor_abertura TEXT`, () => {});
  db.run(`ALTER TABLE chamados ADD COLUMN responsavel_nome TEXT`, () => {});
  db.run(`ALTER TABLE chamados ADD COLUMN responsavel_email TEXT`, () => {});
  db.run(`ALTER TABLE chamados ADD COLUMN data_conclusao TEXT`, () => {});
  db.run(`ALTER TABLE chamados ADD COLUMN sla_resposta TEXT`, () => {});
  db.run(`ALTER TABLE chamados ADD COLUMN sla_solucao TEXT`, () => {});

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
    nome TEXT, sla_resposta TEXT, sla_solucao TEXT,
    setor_id INTEGER,
    FOREIGN KEY (setor_id) REFERENCES setores(id)
  )`);

  db.run(`ALTER TABLE categorias ADD COLUMN setor_id INTEGER`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS notificacoes_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER, chamado_id INTEGER,
    protocolo TEXT, titulo TEXT,
    tipo TEXT, descricao TEXT,
    lida INTEGER DEFAULT 0, data TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (chamado_id) REFERENCES chamados(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS solicitantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT, email TEXT, telefone TEXT,
    instituicao TEXT, unidade TEXT,
    observacoes TEXT,
    data_cadastro TEXT
  )`);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// INATIVIDADE EM MINUTOS PARA TESTES (padrão: 40 dias = 57600 minutos)
const INATIVIDADE_MINUTOS = process.env.INATIVIDADE_MINUTOS
  ? parseInt(process.env.INATIVIDADE_MINUTOS)
  : 57600;

function limparUsuariosInativos() {
  const limite = new Date();
  limite.setMinutes(limite.getMinutes() - INATIVIDADE_MINUTOS);
  const dataLimite = limite.toISOString();

  db.run(
    `DELETE FROM usuarios WHERE ultimo_acesso < ? AND perfil != 'admin'`,
    [dataLimite],
    function (err) {
      if (err) return;
      if (this.changes > 0) {
        console.log(`${this.changes} usuário(s) inativo(s) removido(s).`);
      }
    }
  );
}

setInterval(limparUsuariosInativos, 60 * 60 * 1000);

function autenticar(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ erro: 'Token não fornecido' });
  const token = auth.split(' ')[1];
  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ erro: 'Token inválido' });
  }
}
function notificarSetor(chamado_id, tipo, descricao) {
  db.get(
    `SELECT c.protocolo, c.titulo, c.setor_destino,
     s.email as email_setor
     FROM chamados c
     LEFT JOIN setores s ON c.setor_destino = s.nome
     WHERE c.id=?`,
    [chamado_id],
    (err, row) => {
      if (err || !row || !row.email_setor) return;
      enviarEmail(
        row.email_setor,
        `[G-Desk] Movimentação no chamado ${row.protocolo} — ${row.setor_destino}`,
        templateEmail(
          `Atualização no chamado do seu setor`,
          descricao,
          row.protocolo
        )
      );
    }
  );
}

function notificarCriadorEResponsavel(chamado_id, tipo, descricao, excluir_usuario_id) {
  db.get(
    `SELECT c.id, c.protocolo, c.titulo, c.usuario_id, c.responsavel_id,
     c.solicitante_email, c.setor_destino,
     u1.email as email_criador, u1.nome as nome_criador,
     u2.email as email_responsavel, u2.nome as nome_responsavel,
     s.email as email_setor
     FROM chamados c
     LEFT JOIN usuarios u1 ON c.usuario_id = u1.id
     LEFT JOIN usuarios u2 ON c.responsavel_id = u2.id
     LEFT JOIN setores s ON c.setor_destino = s.nome
     WHERE c.id=?`,
    [chamado_id],
    (err, chamado) => {
      if (err || !chamado) return;
      const data = new Date().toLocaleString('pt-BR');

      if (chamado.usuario_id && chamado.usuario_id !== excluir_usuario_id) {
        db.run(
          `INSERT INTO notificacoes_usuario
           (usuario_id, chamado_id, protocolo, titulo, tipo, descricao, data)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [chamado.usuario_id, chamado_id, chamado.protocolo,
           chamado.titulo, tipo, descricao, data]
        );
        if (chamado.email_criador) {
          enviarEmail(
            chamado.email_criador,
            `[G-Desk] Atualização no chamado ${chamado.protocolo}`,
            templateEmail(`Atualização no seu chamado`, descricao, chamado.protocolo)
          );
        }
      }

      if (chamado.responsavel_id &&
          chamado.responsavel_id !== excluir_usuario_id &&
          chamado.responsavel_id !== chamado.usuario_id) {
        db.run(
          `INSERT INTO notificacoes_usuario
           (usuario_id, chamado_id, protocolo, titulo, tipo, descricao, data)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [chamado.responsavel_id, chamado_id, chamado.protocolo,
           chamado.titulo, tipo, descricao, data]
        );
        if (chamado.email_responsavel) {
          enviarEmail(
            chamado.email_responsavel,
            `[G-Desk] Atualização no chamado ${chamado.protocolo}`,
            templateEmail(`Atualização em chamado sob sua responsabilidade`, descricao, chamado.protocolo)
          );
        }
      }

      // Notifica email do setor
      if (chamado.email_setor) {
        enviarEmail(
          chamado.email_setor,
          `[G-Desk] Movimentação no chamado ${chamado.protocolo}`,
          templateEmail(`Movimentação no chamado do setor ${chamado.setor_destino}`, descricao, chamado.protocolo)
        );
      }
    }
  );
}

// ENVIAR INFORMATIVO POR EMAIL
app.post('/informativos/enviar', autenticar, async (req, res) => {
  const { cidade, instituicao_id, assunto, corpo } = req.body;

  let query = `SELECT DISTINCT s.nome, s.email FROM solicitantes s
               INNER JOIN instituicoes i ON s.instituicao = i.nome
               WHERE 1=1`;
  const params = [];

  if (instituicao_id) {
    query += ` AND i.id = ?`;
    params.push(instituicao_id);
  } else if (cidade) {
    query += ` AND i.cidade = ?`;
    params.push(cidade);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    if (rows.length === 0) return res.json({ enviados: 0, naoEnviados: 0, semEmail: [] });

    const comEmail = rows.filter(r => r.email && r.email.trim() !== '');
    const semEmail = rows.filter(r => !r.email || r.email.trim() === '').map(r => r.nome);

    comEmail.forEach(r => {
      enviarEmail(r.email, assunto, corpo);
    });

    res.json({
      enviados: comEmail.length,
      naoEnviados: semEmail.length,
      semEmail: semEmail
    });
  });
});

// Função separada para notificar solicitante apenas na conclusão
function notificarSolicitante(chamado_id, texto_conclusao) {
  db.get(
    `SELECT protocolo, titulo, solicitante_email, solicitante_nome FROM chamados WHERE id=?`,
    [chamado_id],
    (err, chamado) => {
      if (err || !chamado || !chamado.solicitante_email) return;

      enviarEmail(
        chamado.solicitante_email,
        `[G-Desk] Seu chamado ${chamado.protocolo} foi concluído`,
        templateEmail(
          `Seu chamado foi concluído`,
          `Olá ${chamado.solicitante_nome || ''},<br><br>
           Seu chamado foi concluído com a seguinte resolução:<br><br>
           <em>${texto_conclusao}</em>`,
          chamado.protocolo
        )
      );
    }
  );
}

app.get('/', (req, res) => res.send('API rodando'));

app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  db.get(`SELECT * FROM usuarios WHERE email=?`, [email], async (err, user) => {
    if (err) return res.status(500).json(err);
    if (!user) return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    const agora = new Date().toISOString();
    db.run(`UPDATE usuarios SET ultimo_acesso=? WHERE id=?`, [agora, user.id]);
    const token = jwt.sign(
      { id: user.id, nome: user.nome, perfil: user.perfil, setor: user.setor, email: user.email },
      SECRET, { expiresIn: '8h' }
    );
    res.json({
      token,
      usuario: { id: user.id, nome: user.nome, perfil: user.perfil, setor: user.setor, email: user.email }
    });
  });
});

app.post('/usuarios', async (req, res) => {
  const { nome, email, senha, perfil, setor } = req.body;
  const hash = await bcrypt.hash(senha, 10);
  const agora = new Date().toISOString();
  db.run(
    `INSERT INTO usuarios (nome, email, senha, perfil, setor, ultimo_acesso) VALUES (?, ?, ?, ?, ?, ?)`,
    [nome, email, hash, perfil, setor, agora],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

app.get('/usuarios', autenticar, (req, res) => {
  db.all(`SELECT id, nome, email, perfil, setor, ultimo_acesso FROM usuarios`, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.put('/usuarios/:id', autenticar, async (req, res) => {
  const { nome, email, senha, perfil, setor } = req.body;
  if (senha) {
    const hash = await bcrypt.hash(senha, 10);
    db.run(
      `UPDATE usuarios SET nome=?, email=?, senha=?, perfil=?, setor=? WHERE id=?`,
      [nome, email, hash, perfil, setor, req.params.id],
      function (err) {
        if (err) return res.status(500).json(err);
        res.json({ sucesso: true });
      }
    );
  } else {
    db.run(
      `UPDATE usuarios SET nome=?, email=?, perfil=?, setor=? WHERE id=?`,
      [nome, email, perfil, setor, req.params.id],
      function (err) {
        if (err) return res.status(500).json(err);
        res.json({ sucesso: true });
      }
    );
  }
});

app.delete('/usuarios/:id', autenticar, (req, res) => {
  db.run(`DELETE FROM usuarios WHERE id=?`, [req.params.id], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ sucesso: true });
  });
});

// TESTAR LIMPEZA MANUAL
app.post('/admin/limpar-inativos', autenticar, (req, res) => {
  limparUsuariosInativos();
  res.json({ sucesso: true, mensagem: 'Limpeza executada' });
});

app.post('/chamados', autenticar, (req, res) => {
  const {
    titulo, descricao, categoria, prioridade, canal,
    instituicao, unidade, solicitante_nome, solicitante_email,
    solicitante_telefone, setor_destino, usuario_id,
    sla_resposta, sla_solucao
  } = req.body;

  const protocolo = req.body.protocolo || `${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
  const data_criacao = new Date().toLocaleDateString('pt-BR');
  const criador_nome = req.usuario.nome;
  const setor_abertura = req.usuario.setor || '-';

  db.run(
    `INSERT INTO chamados (
      protocolo, titulo, descricao, categoria, prioridade, canal,
      instituicao, unidade, solicitante_nome, solicitante_email,
      solicitante_telefone, setor_destino, usuario_id, data_criacao,
      criador_nome, setor_abertura, sla_resposta, sla_solucao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [protocolo, titulo, descricao, categoria, prioridade, canal,
     instituicao, unidade, solicitante_nome, solicitante_email,
     solicitante_telefone, setor_destino, usuario_id, data_criacao,
     criador_nome, setor_abertura, sla_resposta || '', sla_solucao || ''],
    function (err) {
      if (err) return res.status(500).json(err);

      const chamadoId = this.lastID;

      db.run(
        `INSERT INTO movimentacoes (chamado_id, usuario_nome, tipo, descricao, data)
         VALUES (?, ?, ?, ?, ?)`,
        [chamadoId, criador_nome, 'abertura', 'Chamado aberto', data_criacao]
      );

      // Notifica email do setor sobre novo chamado
      if (setor_destino) {
        db.get(`SELECT email FROM setores WHERE nome=?`, [setor_destino], (err, setor) => {
          if (!err && setor && setor.email) {
            enviarEmail(
              setor.email,
              `[G-Desk] Novo chamado criado para o setor ${setor_destino} — ${protocolo}`,
              templateEmail(
                `Novo chamado criado para o seu setor`,
                `Um novo chamado foi aberto por <strong>${criador_nome}</strong> para o setor <strong>${setor_destino}</strong>.<br><br>
                 <strong>Solicitante:</strong> ${solicitante_nome || '-'}<br>
                 <strong>Categoria:</strong> ${categoria || '-'}<br>
                 <strong>Prioridade:</strong> ${prioridade || '-'}<br>
                 <strong>Descrição:</strong> ${descricao || '-'}`,
                protocolo
              )
            );
          }
        });
      }

      res.json({ id: chamadoId, protocolo });
    }
  );
});

app.get('/chamados/:id', autenticar, (req, res) => {
  db.get(`SELECT * FROM chamados WHERE id=?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json(err);
    if (!row) return res.status(404).json({ erro: 'Não encontrado' });
    res.json(row);
  });
});

app.get('/chamados', autenticar, (req, res) => {
  const { campo, valor, data_inicio, data_fim, conclusao_inicio, conclusao_fim } = req.query;

 let query = `SELECT * FROM chamados WHERE 1=1`;
const params = [];

if (campo && valor && typeof campo === 'string') {
  const camposPermitidos = {
    protocolo: 'protocolo',
    setor_destino: 'setor_destino',
    canal: 'canal',
    categoria: 'categoria',
    solicitante_nome: 'solicitante_nome',
    criador_nome: 'criador_nome',
    setor_abertura: 'setor_abertura',
    status: 'status',
    titulo: 'titulo',
    instituicao: 'instituicao',
    unidade: 'unidade',
    responsavel_nome: 'responsavel_nome'
  };

  if (Object.prototype.hasOwnProperty.call(camposPermitidos, campo)) {
    query += ` AND ${camposPermitidos[campo]} LIKE ?`;
    params.push(`%${valor}%`);
  }
}

  if (data_inicio && data_fim) {
    // Converte dd/mm/yyyy para comparação correta
    query += ` AND (
      substr(data_criacao, 7, 4) || '-' ||
      substr(data_criacao, 4, 2) || '-' ||
      substr(data_criacao, 1, 2)
    ) BETWEEN ? AND ?`;
    params.push(data_inicio, data_fim);
  } else if (data_inicio) {
    query += ` AND (
      substr(data_criacao, 7, 4) || '-' ||
      substr(data_criacao, 4, 2) || '-' ||
      substr(data_criacao, 1, 2)
    ) >= ?`;
    params.push(data_inicio);
  } else if (data_fim) {
    query += ` AND (
      substr(data_criacao, 7, 4) || '-' ||
      substr(data_criacao, 4, 2) || '-' ||
      substr(data_criacao, 1, 2)
    ) <= ?`;
    params.push(data_fim);
  }

  if (conclusao_inicio && conclusao_fim) {
    query += ` AND data_conclusao BETWEEN ? AND ?`;
    params.push(conclusao_inicio, conclusao_fim);
  }

  query += ` ORDER BY id DESC`;

 db.all(query, params, (err, rows) => {
  if (err) return res.status(500).json(err);
  res.json(rows);
});
});


app.get('/chamados/setor/:setor', autenticar, (req, res) => {
  db.all(
    `SELECT * FROM chamados WHERE setor_destino=? ORDER BY id DESC`,
    [req.params.setor],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

app.put('/chamados/:id/redirecionar', autenticar, (req, res) => {
  const { setor_destino, categoria, usuario_nome } = req.body;
  const data = new Date().toLocaleString('pt-BR');
  db.run(
    `UPDATE chamados SET setor_destino=?, categoria=? WHERE id=?`,
    [setor_destino, categoria, req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      db.run(
        `INSERT INTO movimentacoes (chamado_id, usuario_nome, tipo, descricao, data)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, usuario_nome, 'redirecionamento',
         `Chamado redirecionado para ${setor_destino}`, data]
      );
      notificarCriadorEResponsavel(req.params.id, 'status',
        `Chamado redirecionado para ${setor_destino} por ${usuario_nome}`, null);
      res.json({ sucesso: true });
    }
  );
});

app.put('/chamados/:id/assumir', autenticar, (req, res) => {
  const { usuario_id, usuario_nome, usuario_email } = req.body;
  const data = new Date().toLocaleString('pt-BR');
  db.run(
    `UPDATE chamados SET responsavel_id=?, responsavel_nome=?,
     responsavel_email=?, status='Em Execução' WHERE id=?`,
    [usuario_id, usuario_nome, usuario_email, req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      db.run(
        `INSERT INTO movimentacoes (chamado_id, usuario_nome, tipo, descricao, data)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, usuario_nome, 'assumido',
         `Chamado assumido por ${usuario_nome}`, data]
      );
      notificarCriadorEResponsavel(req.params.id, 'status',
        `Seu chamado foi assumido por ${usuario_nome}`, usuario_id);
      res.json({ sucesso: true });
    }
  );
});

app.put('/chamados/:id/concluir', autenticar, (req, res) => {
  const { usuario_nome, texto_conclusao } = req.body;
  const data = new Date().toLocaleString('pt-BR');
  db.run(
    `UPDATE chamados SET status='Concluído', data_conclusao=? WHERE id=?`,
    [data, req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      db.run(
        `INSERT INTO movimentacoes (chamado_id, usuario_nome, tipo, descricao, data)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, usuario_nome, 'conclusao', texto_conclusao, data]
      );
      notificarCriadorEResponsavel(req.params.id, 'concluido',
        `Chamado concluído por ${usuario_nome}`, null);
      notificarSolicitante(req.params.id, texto_conclusao);
      res.json({ sucesso: true });
    }
  );
});

app.put('/chamados/:id/rejeitar', autenticar, (req, res) => {
  const { usuario_nome, motivo_rejeicao } = req.body;
  const data = new Date().toLocaleString('pt-BR');
  db.run(
    `UPDATE chamados SET status='Pendente', responsavel_id=NULL,
     responsavel_nome=NULL, responsavel_email=NULL WHERE id=?`,
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      db.run(
        `INSERT INTO movimentacoes (chamado_id, usuario_nome, tipo, descricao, data)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, usuario_nome, 'rejeicao', motivo_rejeicao, data]
      );
      notificarCriadorEResponsavel(req.params.id, 'status',
        `Chamado rejeitado por ${usuario_nome}: ${motivo_rejeicao}`, null);
      res.json({ sucesso: true });
    }
  );
});

app.get('/chamados/:id/movimentacoes', autenticar, (req, res) => {
  db.all(
    `SELECT * FROM movimentacoes WHERE chamado_id=? ORDER BY id ASC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

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
      notificarCriadorEResponsavel(req.params.id, 'comentario',
        `${usuario_nome} adicionou um comentário`, null);
      res.json({ id: this.lastID });
    }
  );
});

app.get('/chamados/:id/comentarios', autenticar, (req, res) => {
  db.all(
    `SELECT * FROM comentarios WHERE chamado_id=? ORDER BY id ASC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

app.post('/chamados/:id/anexos', autenticar, upload.single('arquivo'), (req, res) => {
  const { usuario_nome } = req.body;
  const data = new Date().toLocaleString('pt-BR');
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo' });
  db.run(
    `INSERT INTO anexos (chamado_id, nome, caminho, data) VALUES (?, ?, ?, ?)`,
    [req.params.id, req.file.originalname, req.file.filename, data],
    function (err) {
      if (err) return res.status(500).json(err);
      db.run(
        `INSERT INTO movimentacoes (chamado_id, usuario_nome, tipo, descricao, data)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, usuario_nome, 'anexo',
         `Anexo adicionado: ${req.file?.originalname}`, data]
      );
      notificarCriadorEResponsavel(req.params.id, 'anexo',
        `${usuario_nome} adicionou um anexo`, null);
      res.json({ id: this.lastID, nome: req.file?.originalname });
    }
  );
});

app.get('/chamados/:id/anexos', autenticar, (req, res) => {
  db.all(
    `SELECT * FROM anexos WHERE chamado_id=? ORDER BY id ASC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

app.get('/notificacoes/:usuario_id', autenticar, (req, res) => {
  db.all(
    `SELECT * FROM notificacoes_usuario
     WHERE usuario_id=? AND lida=0
     ORDER BY id DESC LIMIT 20`,
    [req.params.usuario_id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

app.put('/notificacoes/:id/lida', autenticar, (req, res) => {
  db.run(`UPDATE notificacoes_usuario SET lida=1 WHERE id=?`,
    [req.params.id], function (err) {
      if (err) return res.status(500).json(err);
      res.json({ sucesso: true });
    }
  );
});

app.put('/notificacoes/usuario/:usuario_id/todas-lidas', autenticar, (req, res) => {
  db.run(
    `UPDATE notificacoes_usuario SET lida=1 WHERE usuario_id=?`,
    [req.params.usuario_id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ sucesso: true });
    }
  );
});

app.get('/notificacoes-setor/:usuario_id', autenticar, (req, res) => {
  db.get(`SELECT setor FROM usuarios WHERE id=?`, [req.params.usuario_id], (err, user) => {
    if (err) return res.status(500).json(err);
    if (!user || !user.setor) return res.json([]);
    db.all(
      `SELECT id, protocolo, titulo, data_criacao FROM chamados
       WHERE setor_destino=? AND status='Pendente' ORDER BY id DESC LIMIT 10`,
      [user.setor],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  });
});

// SOLICITANTES
app.get('/solicitantes', autenticar, (req, res) => {
  const { busca } = req.query;
  if (busca) {
    db.all(
      `SELECT * FROM solicitantes WHERE nome LIKE ? OR email LIKE ? ORDER BY nome ASC`,
      [`%${busca}%`, `%${busca}%`],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  } else {
    db.all(`SELECT * FROM solicitantes ORDER BY nome ASC`, [], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  }
});

app.post('/solicitantes', autenticar, (req, res) => {
  const { nome, email, telefone, instituicao, unidade, observacoes } = req.body;
  const data_cadastro = new Date().toLocaleDateString('pt-BR');
  db.run(
    `INSERT INTO solicitantes (nome, email, telefone, instituicao, unidade, observacoes, data_cadastro)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nome, email, telefone, instituicao, unidade, observacoes, data_cadastro],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

app.put('/solicitantes/:id', autenticar, (req, res) => {
  const { nome, email, telefone, instituicao, unidade, observacoes } = req.body;
  db.run(
    `UPDATE solicitantes SET nome=?, email=?, telefone=?, instituicao=?, unidade=?, observacoes=? WHERE id=?`,
    [nome, email, telefone, instituicao, unidade, observacoes, req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ sucesso: true });
    }
  );
});

app.delete('/solicitantes/:id', autenticar, (req, res) => {
  db.run(`DELETE FROM solicitantes WHERE id=?`, [req.params.id], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ sucesso: true });
  });
});

app.get('/setores', autenticar, (req, res) => {
  db.all(`SELECT * FROM setores`, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post('/setores', autenticar, (req, res) => {
  const { nome, email } = req.body;
  db.run(`INSERT INTO setores (nome, email) VALUES (?, ?)`, [nome, email || ''], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ id: this.lastID });
  });
});

app.put('/setores/:id', autenticar, (req, res) => {
  const { nome, email } = req.body;
  db.run(`UPDATE setores SET nome=?, email=? WHERE id=?`,
    [nome, email || '', req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ sucesso: true });
    }
  );
});

app.delete('/setores/:id', autenticar, (req, res) => {
  db.run(`DELETE FROM setores WHERE id=?`, [req.params.id], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ sucesso: true });
  });
});

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

app.put('/instituicoes/:id', autenticar, (req, res) => {
  const { nome, cidade } = req.body;
  db.run(`UPDATE instituicoes SET nome=?, cidade=? WHERE id=?`,
    [nome, cidade, req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ sucesso: true });
    }
  );
});

app.delete('/instituicoes/:id', autenticar, (req, res) => {
  db.run(`DELETE FROM instituicoes WHERE id=?`, [req.params.id], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ sucesso: true });
  });
});

app.get('/categorias', autenticar, (req, res) => {
  db.all(`SELECT c.*, s.nome as setor_nome FROM categorias c
          LEFT JOIN setores s ON c.setor_id = s.id`, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post('/categorias', autenticar, (req, res) => {
  const { nome, sla_resposta, sla_solucao, setor_id } = req.body;
  db.run(
    `INSERT INTO categorias (nome, sla_resposta, sla_solucao, setor_id) VALUES (?, ?, ?, ?)`,
    [nome, sla_resposta, sla_solucao, setor_id || null],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

app.put('/categorias/:id', autenticar, (req, res) => {
  const { nome, sla_resposta, sla_solucao, setor_id } = req.body;
  db.run(
    `UPDATE categorias SET nome=?, sla_resposta=?, sla_solucao=?, setor_id=? WHERE id=?`,
    [nome, sla_resposta, sla_solucao, setor_id || null, req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ sucesso: true });
    }
  );
});

app.delete('/categorias/:id', autenticar, (req, res) => {
  db.run(`DELETE FROM categorias WHERE id=?`, [req.params.id], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ sucesso: true });
  });
});

db.run(`CREATE TABLE IF NOT EXISTS unidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT,
  instituicao_id INTEGER,
  FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id)
)`);

// LISTAR UNIDADES
app.get('/unidades', autenticar, (req, res) => {
  const { instituicao_id } = req.query;
  if (instituicao_id) {
    db.all(
      `SELECT * FROM unidades WHERE instituicao_id=? ORDER BY nome ASC`,
      [instituicao_id],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  } else {
    db.all(`SELECT u.*, i.nome as instituicao_nome FROM unidades u
            LEFT JOIN instituicoes i ON u.instituicao_id = i.id
            ORDER BY u.nome ASC`, [], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  }
});

// CRIAR UNIDADE
app.post('/unidades', autenticar, (req, res) => {
  const { nome, instituicao_id } = req.body;
  db.run(
    `INSERT INTO unidades (nome, instituicao_id) VALUES (?, ?)`,
    [nome, instituicao_id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

// EDITAR UNIDADE
app.put('/unidades/:id', autenticar, (req, res) => {
  const { nome, instituicao_id } = req.body;
  db.run(
    `UPDATE unidades SET nome=?, instituicao_id=? WHERE id=?`,
    [nome, instituicao_id, req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ sucesso: true });
    }
  );
});

// DELETAR UNIDADE
app.delete('/unidades/:id', autenticar, (req, res) => {
  db.run(`DELETE FROM unidades WHERE id=?`, [req.params.id], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ sucesso: true });
  });
});

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));