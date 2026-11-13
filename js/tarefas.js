// Depois de qualquer mudança, cada página escuta este aviso e recarrega os seus dados
function avisarMudanca() {
    document.dispatchEvent(new Event('tarefasalteradas'));
}

function criarModal() {
    if (document.getElementById('modal-tarefa')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <dialog id="modal-tarefa" class="modal">
            <form id="form-tarefa">
                <h2 id="modal-titulo"></h2>
                <input type="hidden" id="tarefa-id">
                <label>Título <input id="tarefa-titulo" maxlength="150" required></label>
                <label>Descrição <textarea id="tarefa-descricao" maxlength="2000" rows="3"></textarea></label>
                <div class="linha">
                    <label>Categoria <select id="tarefa-categoria"></select></label>
                    <label>Vencimento <input type="date" id="tarefa-data"></label>
                </div>
                <div class="linha">
                    <label>Prioridade <select id="tarefa-prioridade">${opcoes(NOME_PRIORIDADE)}</select></label>
                    <label>Status <select id="tarefa-status">${opcoes(NOME_STATUS)}</select></label>
                </div>
                <p class="erro" id="tarefa-erro" hidden></p>
                <div class="acoes">
                    <button type="button" class="botao secundario" id="tarefa-cancelar">Cancelar</button>
                    <button class="botao">Salvar</button>
                </div>
            </form>
        </dialog>`);

    document.getElementById('tarefa-cancelar').addEventListener('click', () => document.getElementById('modal-tarefa').close());
    document.getElementById('form-tarefa').addEventListener('submit', salvarTarefa);
}

// Abre o formulário vazio (nova tarefa) ou preenchido (editar)
async function abrirFormularioTarefa(tarefa = null) {
    criarModal();
    const { categorias } = await api(RAIZ + 'api/categorias?acao=listar');
    const dados = tarefa || { prioridade: 'media', status: 'pendente' };

    document.getElementById('modal-titulo').textContent = tarefa ? 'Editar tarefa' : 'Nova tarefa';
    document.getElementById('tarefa-categoria').innerHTML =
        '<option value="">Sem categoria</option>' + categorias.map((c) => `<option value="${c.id}">${escapar(c.nome)}</option>`).join('');

    document.getElementById('tarefa-id').value = tarefa ? tarefa.id : '';
    document.getElementById('tarefa-titulo').value = dados.titulo || '';
    document.getElementById('tarefa-descricao').value = dados.descricao || '';
    document.getElementById('tarefa-categoria').value = dados.categoria_id ?? '';
    document.getElementById('tarefa-data').value = dados.data_vencimento || '';
    document.getElementById('tarefa-prioridade').value = dados.prioridade;
    document.getElementById('tarefa-status').value = dados.status;
    document.getElementById('tarefa-erro').hidden = true;
    document.getElementById('modal-tarefa').showModal();
}

async function salvarTarefa(evento) {
    evento.preventDefault(); // o campo "required" do título já foi validado pelo navegador

    const id = document.getElementById('tarefa-id').value;
    try {
        await api(`${RAIZ}api/tarefas?acao=${id ? 'editar' : 'criar'}`, {
            id,
            titulo: document.getElementById('tarefa-titulo').value,
            descricao: document.getElementById('tarefa-descricao').value,
            categoria_id: document.getElementById('tarefa-categoria').value,
            prioridade: document.getElementById('tarefa-prioridade').value,
            status: document.getElementById('tarefa-status').value,
            data_vencimento: document.getElementById('tarefa-data').value,
        });
    } catch (erro) {
        const mensagem = document.getElementById('tarefa-erro');
        mensagem.textContent = erro.message;
        mensagem.hidden = false;
        return;
    }
    document.getElementById('modal-tarefa').close();
    mostrarMensagem(id ? 'Tarefa atualizada!' : 'Tarefa criada!');
    avisarMudanca();
}

async function excluirTarefa(tarefa) {
    if (!confirm(`Excluir a tarefa "${tarefa.titulo}"?`)) return;
    await api(RAIZ + 'api/tarefas?acao=excluir', { id: tarefa.id });
    mostrarMensagem('Tarefa excluída.');
    avisarMudanca();
}

// Usado pelo Kanban. Recarrega a página mesmo se der erro, para a tela voltar a refletir o banco.
async function mudarStatus(id, status) {
    try {
        await api(RAIZ + 'api/tarefas?acao=mudar_status', { id, status });
    } finally {
        avisarMudanca();
    }
}

/* ========== Parte 2: página "Minhas tarefas" ========== */

let tarefasDaLista = [];

async function carregarTarefas() {
    // Os filtros vão na URL. O Flask ignora os que estiverem vazios.
    const filtros = new URLSearchParams({
        acao: 'listar',
        busca: document.getElementById('busca').value.trim(),
        status: document.getElementById('filtro-status').value,
        prioridade: document.getElementById('filtro-prioridade').value,
        categoria: document.getElementById('filtro-categoria').value,
        data: document.getElementById('filtro-data').value,
    });
    tarefasDaLista = (await api(`${RAIZ}api/tarefas?${filtros}`)).tarefas;

    document.getElementById('contagem').textContent = tarefasDaLista.length + (tarefasDaLista.length === 1 ? ' tarefa' : ' tarefas');
    document.getElementById('lista').innerHTML = tarefasDaLista.map((t) => `
        <article class="tarefa">
            <div>
                <h3>${escapar(t.titulo)}</h3>
                <p class="suave">${escapar(t.descricao)}</p>
                ${t.categoria ? selo('categoria', t.categoria) : ''}
                ${selo(t.prioridade, NOME_PRIORIDADE[t.prioridade])}
                ${estaAtrasada(t) ? selo('atrasada', 'Atrasada') : selo(t.status, NOME_STATUS[t.status])}
                <small class="suave">${formatarData(t.data_vencimento)}</small>
            </div>
            <div>
                <button class="mini" data-acao="editar" data-id="${t.id}">Editar</button>
                <button class="mini" data-acao="excluir" data-id="${t.id}">Excluir</button>
            </div>
        </article>`).join('') || '<p class="painel suave">Nenhuma tarefa encontrada.</p>';
}

// Atualiza o filtro de categorias e a lista de categorias (com botões de renomear e excluir)
async function carregarCategorias() {
    const { categorias } = await api(RAIZ + 'api/categorias?acao=listar');

    const filtro = document.getElementById('filtro-categoria');
    const escolhida = filtro.value;
    filtro.innerHTML = '<option value="">Todas</option>' + categorias.map((c) => `<option value="${c.id}">${escapar(c.nome)}</option>`).join('');
    filtro.value = escolhida;
    if (filtro.selectedIndex < 0) filtro.selectedIndex = 0; // a categoria filtrada foi excluída

    document.getElementById('lista-categorias').innerHTML = categorias.map((c) => `
        <span class="chip">${escapar(c.nome)} (${c.total_tarefas})
            <button class="mini" data-acao="renomear" data-id="${c.id}" data-nome="${escapar(c.nome)}">Renomear</button>
            <button class="mini" data-acao="excluir" data-id="${c.id}" data-nome="${escapar(c.nome)}" data-total="${c.total_tarefas}">Excluir</button>
        </span>`).join('');
}

async function clicarEmCategoria(evento) {
    const botao = evento.target.closest('button');
    if (!botao) return;
    const { acao, id, nome, total } = botao.dataset;

    if (acao === 'renomear') {
        const novoNome = prompt('Novo nome da categoria:', nome);
        if (!novoNome) return;
        await api(RAIZ + 'api/categorias?acao=editar', { id, nome: novoNome });
    } else {
        if (!confirm(`Excluir a categoria "${nome}"? As ${total} tarefa(s) dela ficarão sem categoria.`)) return;
        await api(RAIZ + 'api/categorias?acao=excluir', { id });
    }
    await carregarCategorias();
    carregarTarefas();
}

if (document.body.dataset.pagina === 'tarefas') {
    iniciarPagina(async () => {
        document.getElementById('filtro-status').innerHTML = '<option value="">Todos</option>' + opcoes(NOME_STATUS);
        document.getElementById('filtro-prioridade').innerHTML = '<option value="">Todas</option>' + opcoes(NOME_PRIORIDADE);
        document.getElementById('busca').value = new URLSearchParams(window.location.search).get('busca') || '';

        // Mudou qualquer filtro (ou digitou na busca): lista de novo
        document.querySelectorAll('.filtros select, .filtros input, #busca').forEach((campo) => campo.addEventListener('input', carregarTarefas));
        document.getElementById('limpar').addEventListener('click', () => {
            document.querySelectorAll('.filtros select, .filtros input, #busca').forEach((campo) => { campo.value = ''; });
            carregarTarefas();
        });

        document.getElementById('lista').addEventListener('click', (evento) => {
            const botao = evento.target.closest('button');
            if (!botao) return;
            const tarefa = tarefasDaLista.find((t) => t.id === Number(botao.dataset.id));
            if (botao.dataset.acao === 'editar') abrirFormularioTarefa(tarefa);
            else excluirTarefa(tarefa);
        });

        document.getElementById('lista-categorias').addEventListener('click', clicarEmCategoria);
        document.getElementById('form-categoria').addEventListener('submit', async (evento) => {
            evento.preventDefault();
            const campo = document.getElementById('categoria-nome');
            await api(RAIZ + 'api/categorias?acao=criar', { nome: campo.value });
            campo.value = '';
            carregarCategorias();
        });

        document.addEventListener('tarefasalteradas', carregarTarefas);
        await carregarCategorias();
        carregarTarefas();
    });
}
