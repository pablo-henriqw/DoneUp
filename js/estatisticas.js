// DoneUp | Estatísticas: gráficos com dados reais do banco (estatisticas.Flask)

async function carregar() {
    const stats = await api(RAIZ + 'api/estatisticas');

    document.getElementById('porcentagem').textContent = stats.porcentagem + '%';
    document.getElementById('barra').style.width = stats.porcentagem + '%';

    desenharGrafico('grafico-status', 'doughnut', Object.values(NOME_STATUS), Object.values(stats.status), ['#94a3b8', '#3b82f6', '#22c55e']);
    desenharGrafico('grafico-prioridade', 'bar', Object.values(NOME_PRIORIDADE), Object.values(stats.prioridade), ['#0ea5e9', '#d97706', '#f43f5e']);
    desenharGrafico('grafico-categoria', 'doughnut', Object.keys(stats.categoria), Object.values(stats.categoria),
        ['#8b5cf6', '#3b82f6', '#06b6d4', '#f59e0b', '#ec4899', '#22c55e', '#94a3b8', '#f97316']);
}

iniciarPagina(() => {
    document.addEventListener('tarefasalteradas', carregar);
    carregar();
});
