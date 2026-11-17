from flask import Flask, jsonify, request, send_from_directory
import sqlite3
from pathlib import Path
from datetime import date

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / 'database' / 'doneup.db'
app = Flask(__name__, static_folder=None)


def conectar():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def resposta(dados, status=200):
    return jsonify(dados), status


def inicializar_banco():
    DB_PATH.parent.mkdir(exist_ok=True)
    with conectar() as db:
        db.executescript('''
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE CHECK(length(nome) <= 50)
        );
        CREATE TABLE IF NOT EXISTS tarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria_id INTEGER NULL,
            titulo TEXT NOT NULL CHECK(length(titulo) <= 150),
            descricao TEXT,
            prioridade TEXT NOT NULL DEFAULT 'media' CHECK(prioridade IN ('baixa','media','alta')),
            status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','em_andamento','concluida')),
            data_vencimento TEXT NULL,
            criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
        CREATE INDEX IF NOT EXISTS idx_tarefas_vencimento ON tarefas(data_vencimento);
        ''')
        for nome in ('Estudos', 'Trabalho', 'Projetos', 'Pessoal'):
            db.execute('INSERT OR IGNORE INTO categorias(nome) VALUES (?)', (nome,))


@app.get('/')
def inicio():
    return send_from_directory(BASE_DIR, 'index.html')


@app.get('/<path:caminho>')
def arquivos(caminho):
    # Impede que arquivos internos, como o banco, sejam servidos pelo navegador.
    if caminho.startswith(('database/', '__pycache__/')) or caminho in ('app.py', 'requirements.txt'):
        return resposta({'erro': 'Arquivo não encontrado.'}, 404)
    return send_from_directory(BASE_DIR, caminho)


def validar_tarefa(dados, db):
    titulo = str(dados.get('titulo', '')).strip()
    descricao = str(dados.get('descricao', '')).strip()
    prioridade = dados.get('prioridade', 'media')
    status = dados.get('status', 'pendente')
    data = dados.get('data_vencimento') or None
    categoria = dados.get('categoria_id') or None
    if not titulo or len(titulo) > 150:
        return None, 'Informe um título de até 150 caracteres.'
    if prioridade not in ('baixa', 'media', 'alta'):
        return None, 'Prioridade inválida.'
    if status not in ('pendente', 'em_andamento', 'concluida'):
        return None, 'Status inválido.'
    if data:
        try:
            date.fromisoformat(data)
        except (TypeError, ValueError):
            return None, 'Data de vencimento inválida.'
    if categoria:
        try:
            categoria = int(categoria)
        except (ValueError, TypeError):
            return None, 'Categoria inválida.'
        if not db.execute('SELECT id FROM categorias WHERE id = ?', (categoria,)).fetchone():
            return None, 'Categoria inválida.'
    return {'titulo': titulo, 'descricao': descricao, 'prioridade': prioridade,
            'status': status, 'data': data, 'categoria': categoria}, None


@app.route('/api/tarefas', methods=['GET', 'POST'])
def tarefas():
    acao = request.args.get('acao', '')
    dados = request.get_json(silent=True) or {}
    with conectar() as db:
        if request.method == 'GET' and acao == 'listar':
            sql = '''SELECT t.*, c.nome AS categoria FROM tarefas t
                     LEFT JOIN categorias c ON c.id = t.categoria_id WHERE 1=1'''
            params = []
            busca = request.args.get('busca', '').strip()
            if busca:
                sql += ' AND (t.titulo LIKE ? OR t.descricao LIKE ?)'
                params.extend([f'%{busca}%', f'%{busca}%'])
            for campo, coluna in [('status', 't.status'), ('prioridade', 't.prioridade'),
                                  ('categoria', 't.categoria_id'), ('data', 't.data_vencimento')]:
                valor = request.args.get(campo, '')
                if valor:
                    sql += f' AND {coluna} = ?'
                    params.append(valor)
            sql += ' ORDER BY t.data_vencimento IS NULL, t.data_vencimento, t.id DESC'
            return resposta({'tarefas': [dict(r) for r in db.execute(sql, params).fetchall()]})
        if request.method != 'POST':
            return resposta({'erro': 'Método não permitido.'}, 405)
        tarefa, erro = validar_tarefa(dados, db) if acao in ('criar', 'editar') else (None, None)
        if erro:
            return resposta({'erro': erro}, 422)
        if acao == 'criar':
            cur = db.execute('''INSERT INTO tarefas(categoria_id,titulo,descricao,prioridade,status,data_vencimento)
                                VALUES(?,?,?,?,?,?)''', (tarefa['categoria'], tarefa['titulo'], tarefa['descricao'], tarefa['prioridade'], tarefa['status'], tarefa['data']))
            return resposta({'mensagem': 'Tarefa criada!', 'id': cur.lastrowid}, 201)
        if acao == 'editar':
            db.execute('''UPDATE tarefas SET categoria_id=?,titulo=?,descricao=?,prioridade=?,status=?,
                          data_vencimento=?,atualizado_em=CURRENT_TIMESTAMP WHERE id=?''',
                       (tarefa['categoria'], tarefa['titulo'], tarefa['descricao'], tarefa['prioridade'], tarefa['status'], tarefa['data'], dados.get('id')))
            return resposta({'mensagem': 'Tarefa atualizada!'})
        if acao == 'mudar_status':
            if dados.get('status') not in ('pendente', 'em_andamento', 'concluida'):
                return resposta({'erro': 'Status inválido.'}, 422)
            db.execute('UPDATE tarefas SET status=?, atualizado_em=CURRENT_TIMESTAMP WHERE id=?', (dados['status'], dados.get('id')))
            return resposta({'mensagem': 'Status atualizado!'})
        if acao == 'excluir':
            db.execute('DELETE FROM tarefas WHERE id=?', (dados.get('id'),))
            return resposta({'mensagem': 'Tarefa excluída.'})
    return resposta({'erro': 'Ação inválida.'}, 400)


@app.route('/api/categorias', methods=['GET', 'POST'])
def categorias():
    acao = request.args.get('acao', '')
    dados = request.get_json(silent=True) or {}
    with conectar() as db:
        if request.method == 'GET' and acao == 'listar':
            rows = db.execute('''SELECT c.id,c.nome,COUNT(t.id) AS total_tarefas FROM categorias c
                                 LEFT JOIN tarefas t ON t.categoria_id=c.id GROUP BY c.id,c.nome ORDER BY c.nome''').fetchall()
            return resposta({'categorias': [dict(r) for r in rows]})
        if request.method != 'POST':
            return resposta({'erro': 'Método não permitido.'}, 405)
        if acao in ('criar', 'editar'):
            nome = str(dados.get('nome', '')).strip()
            if not nome or len(nome) > 50:
                return resposta({'erro': 'Informe um nome de até 50 caracteres.'}, 422)
            try:
                if acao == 'criar':
                    db.execute('INSERT INTO categorias(nome) VALUES(?)', (nome,))
                else:
                    db.execute('UPDATE categorias SET nome=? WHERE id=?', (nome, dados.get('id')))
            except sqlite3.IntegrityError:
                return resposta({'erro': 'Já existe uma categoria com esse nome.'}, 409)
            return resposta({'mensagem': 'Categoria salva!'})
        if acao == 'excluir':
            db.execute('DELETE FROM categorias WHERE id=?', (dados.get('id'),))
            return resposta({'mensagem': 'Categoria excluída.'})
    return resposta({'erro': 'Ação inválida.'}, 400)


@app.get('/api/estatisticas')
def estatisticas():
    with conectar() as db:
        status = {k: 0 for k in ('pendente', 'em_andamento', 'concluida')}
        status.update({r['status']: r['total'] for r in db.execute('SELECT status,COUNT(*) AS total FROM tarefas GROUP BY status')})
        prioridade = {k: 0 for k in ('baixa', 'media', 'alta')}
        prioridade.update({r['prioridade']: r['total'] for r in db.execute('SELECT prioridade,COUNT(*) AS total FROM tarefas GROUP BY prioridade')})
        categoria = {r['nome']: r['total'] for r in db.execute("SELECT COALESCE(c.nome,'Sem categoria') AS nome,COUNT(*) AS total FROM tarefas t LEFT JOIN categorias c ON c.id=t.categoria_id GROUP BY c.id,c.nome ORDER BY total DESC")}
        atrasadas = db.execute("SELECT COUNT(*) FROM tarefas WHERE status <> 'concluida' AND data_vencimento < ?", (date.today().isoformat(),)).fetchone()[0]
    total = sum(status.values())
    return resposta({'total': total, 'status': status, 'prioridade': prioridade, 'categoria': categoria,
                     'atrasadas': atrasadas, 'porcentagem': round(status['concluida'] * 100 / total) if total else 0})


inicializar_banco()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
