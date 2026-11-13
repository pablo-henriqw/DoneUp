// DoneUp | Dashboard: cards de resumo, gráfico por status, progresso e próximos vencimentos

let proximas = [];

async function carregar() {
    // Os números vêm de consultas SQL (estatisticas.Flask) e a lista vem de tarefas.Flask
    const [stats, lista] = await Promise.all([
        api(RAIZ + 'api/estatisticas'),
        api(RAIZ + 'api/tarefas?acao=listar'),
    ]);

    const numeros = {
        total: stats.total,
        pendentes: stats.status.pendente,
        andamento: stats.status.em_andamento,
        concluidas: stats.status.concluida,
        atrasadas: stats.atrasadas,
    };
    for (const [nome, valor] of Object.entries(numeros)) {
        document.getElementById('n-' + nome).textContent = valor;
    }

    document.getElementById('porcentagem').textContent = stats.porcentagem + '%';
    document.getElementById('barra').style.width = stats.porcentagem + '%';
    desenharGrafico('grafico-status', 'doughnut', Object.values(NOME_STATUS), Object.values(stats.status), ['#94a3b8', '#3b82f6', '#22c55e']);

    // Próximos vencimentos: tarefas em aberto que têm data (a lista já vem ordenada por data)
    proximas = lista.tarefas.filter((t) => t.status !== 'concluida' && t.data_vencimento).slice(0, 5);
    document.getElementById('proximas').innerHTML = proximas.map((t) => `
        <button class="item" data-id="${t.id}">
            <strong>${escapar(t.titulo)}</strong>
            <small class="data ${estaAtrasada(t) ? 'atrasada' : ''}">${formatarData(t.data_vencimento)}</small>
        </button>`).join('') || '<p class="suave">Nenhuma tarefa em aberto com data.</p>';
}

iniciarPagina(() => {
    const hora = new Date().getHours();
    document.getElementById('saudacao').textContent = hora < 12 ? 'Bom dia!' : hora < 18 ? 'Boa tarde!' : 'Boa noite!';

    document.getElementById('criar-rapida').addEventListener('click', () => abrirFormularioTarefa());
    document.getElementById('proximas').addEventListener('click', (evento) => {
        const item = evento.target.closest('.item');
        if (item) abrirFormularioTarefa(proximas.find((t) => t.id === Number(item.dataset.id)));
    });

    document.addEventListener('tarefasalteradas', carregar);
    carregar();
});
