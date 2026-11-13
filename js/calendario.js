// DoneUp | Calendário mensal: mostra as tarefas nas datas de vencimento

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

let ano = new Date().getFullYear();
let mes = new Date().getMonth(); // 0 = janeiro
let diaSelecionado = hojeISO();
let tarefas = [];

// Cor do ponto: concluída (verde), atrasada (vermelho) ou em aberto (azul)
function cor(tarefa) {
    if (tarefa.status === 'concluida') return 'concluida';
    return estaAtrasada(tarefa) ? 'atrasada' : 'em_andamento';
}

async function carregar() {
    tarefas = (await api(RAIZ + 'api/tarefas?acao=listar')).tarefas;
    desenhar();
}

function desenhar() {
    document.getElementById('titulo-mes').textContent = `${MESES[mes][0].toUpperCase()}${MESES[mes].slice(1)} de ${ano}`;

    const primeiroDiaDaSemana = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    let html = '<div></div>'.repeat(primeiroDiaDaSemana); // espaços vazios antes do dia 1
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const pontos = tarefas.filter((t) => t.data_vencimento === data).map((t) => `<i class="ponto ${cor(t)}"></i>`).join('');
        const classes = (data === hojeISO() ? ' hoje' : '') + (data === diaSelecionado ? ' selecionado' : '');
        html += `<button type="button" class="dia${classes}" data-data="${data}">${dia}<span>${pontos}</span></button>`;
    }
    document.getElementById('dias').innerHTML = html;

    // Painel com as tarefas do dia escolhido
    document.getElementById('titulo-dia').textContent = formatarData(diaSelecionado);
    document.getElementById('tarefas-dia').innerHTML = tarefas
        .filter((t) => t.data_vencimento === diaSelecionado)
        .map((t) => `
            <button class="item" data-id="${t.id}">
                <strong>${escapar(t.titulo)}</strong>
                ${estaAtrasada(t) ? selo('atrasada', 'Atrasada') : selo(t.status, NOME_STATUS[t.status])}
            </button>`).join('') || '<p class="suave">Nenhuma tarefa neste dia.</p>';
}

function mudarMes(direcao) {
    const data = new Date(ano, mes + direcao, 1); // o JavaScript acerta a virada de ano sozinho
    ano = data.getFullYear();
    mes = data.getMonth();
    desenhar();
}

iniciarPagina(() => {
    document.getElementById('anterior').addEventListener('click', () => mudarMes(-1));
    document.getElementById('proximo').addEventListener('click', () => mudarMes(1));
    document.getElementById('hoje').addEventListener('click', () => {
        ano = new Date().getFullYear();
        mes = new Date().getMonth();
        diaSelecionado = hojeISO();
        desenhar();
    });

    document.getElementById('dias').addEventListener('click', (evento) => {
        const dia = evento.target.closest('.dia');
        if (dia) {
            diaSelecionado = dia.dataset.data;
            desenhar();
        }
    });
    document.getElementById('tarefas-dia').addEventListener('click', (evento) => {
        const item = evento.target.closest('.item');
        if (item) abrirFormularioTarefa(tarefas.find((t) => t.id === Number(item.dataset.id)));
    });

    document.addEventListener('tarefasalteradas', carregar);
    carregar();
});
