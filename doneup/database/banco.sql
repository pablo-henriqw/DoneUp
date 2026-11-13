-- O banco SQLite é criado automaticamente por app.py.
-- Este arquivo fica apenas como referência do modelo; não precisa ser importado.
CREATE TABLE categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE CHECK(length(nome) <= 50)
);

CREATE TABLE tarefas (
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
