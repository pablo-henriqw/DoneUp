# DoneUp

Sistema web de gerenciamento de tarefas e produtividade. Inclui dashboard, lista de tarefas com filtros, categorias, quadro Kanban, calendário e estatísticas.

**Tecnologias:** HTML5, CSS3, JavaScript puro (Fetch API), Python com Flask e SQLite. Não utiliza PHP, MySQL ou XAMPP.

## Como executar

1. Instale o [Python 3](https://www.python.org/downloads/) caso ainda não tenha.
2. Abra a pasta `doneup` no VS Code.
3. Abra o terminal dentro dessa pasta.
4. (Recomendado) Crie e ative um ambiente virtual:

   **Windows:**
   ```bash
   py -m venv venv
   venv\\Scripts\\activate
   ```

5. Instale as dependências:
   ```bash
   py -m pip install -r requirements.txt
   ```
6. Inicie o servidor:
   ```bash
   py app.py
   ```
7. Acesse **http://127.0.0.1:5000/** no navegador. Mantenha o terminal aberto enquanto usar o sistema.

O banco SQLite `database/doneup.db` é criado automaticamente na primeira execução, junto com as categorias iniciais. Não é necessário importar SQL nem iniciar Apache/MySQL.

Para encerrar, pressione `Ctrl + C` no terminal.

## Estrutura

```
doneup/
├── app.py                 API Flask e inicialização automática do SQLite
├── requirements.txt       Dependências Python
├── index.html             Dashboard
├── css/style.css          Estilos
├── js/                    JavaScript das páginas e chamadas à API
├── pages/                 tarefas, kanban, calendário, estatísticas e configurações
└── database/
    └── doneup.db          Banco criado automaticamente ao iniciar
```

## Como funciona

```
HTML/CSS -> JavaScript (fetch) -> Flask (Python) -> SQLite
```

O JavaScript envia e recebe JSON pelas rotas `/api/tarefas`, `/api/categorias` e `/api/estatisticas`. O Flask valida os dados e executa comandos SQL parametrizados no SQLite.

## Recursos

- Criar, editar, excluir e filtrar tarefas.
- Definir prioridade, status, categoria e vencimento.
- Criar, renomear e excluir categorias.
- Visualizar tarefas no Kanban e no calendário.
- Acompanhar indicadores e gráficos no dashboard/estatísticas.
- Tema claro/escuro salvo no navegador.

## Observações

- Esta versão não possui login: todas as pessoas que acessarem a aplicação verão os mesmos dados.
- O arquivo `database/doneup.db` guarda os dados entre execuções. Faça uma cópia dele para backup.
- O modo `debug=True` está habilitado para desenvolvimento local. Não use essa configuração ao publicar o sistema na internet.
- Ícones, gráficos e fonte são carregados por CDN e precisam de internet para aparecer corretamente.
