// DoneUp | Quadro Kanban: três colunas. O status muda pelo seletor de cada cartão.

const COLUNAS = ['pendente', 'em_andamento', 'concluida'];
let tarefas = [];

async function carregar() {
    tarefas = (await api(RAIZ + 'api/tarefas?acao=listar')).tarefas;

    for (const status of COLUNAS) {
        const daColuna = tarefas.filter((t) => t.status === status);
        document.getElementById('contador-' + status).textContent = daColuna.length;
        document.getElementById('coluna-' + status).innerHTML = daColuna.map((t) => `
            <article class="cartao" data-id="${t.id}">
                <h3>${escapar(t.titulo)}</h3>
                <div>${t.categoria ? selo('categoria', t.categoria) : ''} ${selo(t.prioridade, NOME_PRIORIDADE[t.prioridade])}</div>
                <small class="data ${estaAtrasada(t) ? 'atrasada' : ''}">${formatarData(t.data_vencimento)}</small>
                <select data-id="${t.id}" aria-label="Mover para outra coluna">${opcoes(NOME_STATUS, t.status)}</select>
            </article>`).join('') || '<p class="suave">Nenhuma tarefa.</p>';
    }
}

iniciarPagina(() => {
    const quadro = document.getElementById('quadro');

    // Trocou o seletor: grava o novo status no banco (o quadro é recarregado em seguida)
    quadro.addEventListener('change', (evento) => mudarStatus(Number(evento.target.dataset.id), evento.target.value));

    // Clicou no cartão (fora do seletor): abre para editar
    quadro.addEventListener('click', (evento) => {
        const cartao = evento.target.closest('.cartao');
        if (cartao && evento.target.tagName !== 'SELECT') {
            abrirFormularioTarefa(tarefas.find((t) => t.id === Number(cartao.dataset.id)));
        }
    });

    document.addEventListener('tarefasalteradas', carregar);
    carregar();
});
