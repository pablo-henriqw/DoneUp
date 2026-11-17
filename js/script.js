const RAIZ = document.body.dataset.raiz || ''; // '' na raiz do projeto e '../' dentro de /pages

const NOME_STATUS = { pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída' };
const NOME_PRIORIDADE = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };

/* ---------- Tema (a escolha fica salva no localStorage) ---------- */
document.documentElement.dataset.tema = localStorage.getItem('doneup_tema') || 'escuro';

function definirTema(tema) {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem('doneup_tema', tema);
}

/* ---------- Comunicação com o Flask ---------- */

// Sem "corpo" faz um GET. Com "corpo" envia um POST com JSON. Devolve o JSON da resposta.
async function api(url, corpo) {
    let resposta;
    try {
        resposta = await fetch(url, corpo ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) } : {});
    } catch (erro) {
        throw new Error('Não foi possível falar com o servidor. Confira se o Flask está em execução em http://127.0.0.1:5000/.');
    }
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.erro || 'Erro inesperado. Tente novamente.');
    return dados;
}

// Qualquer erro de api() que não for tratado aparece como mensagem na tela
window.addEventListener('unhandledrejection', (evento) => {
    evento.preventDefault(); // já mostramos a mensagem, então não precisa de erro no console
    mostrarMensagem(evento.reason.message, 'erro');
});

function mostrarMensagem(texto, tipo = 'sucesso') {
    let area = document.getElementById('avisos');
    if (!area) {
        area = document.createElement('div');
        area.id = 'avisos';
        document.body.appendChild(area);
    }
    const aviso = document.createElement('div');
    aviso.className = 'aviso ' + tipo;
    aviso.textContent = texto;
    area.appendChild(aviso);
    setTimeout(() => aviso.remove(), 3500);
}
/* ---------- Frase motivacional ---------- */

const frases = [
    "Pequenos passos também levam a grandes conquistas.",
    "Não espere pela motivação, comece e ela virá.",
    "Seu único limite é aquele que você aceita.",
    "A disciplina supera a motivação.",
    "Cada tarefa concluída é uma vitória.",
    "O segredo do progresso é nunca parar.",
    "Faça hoje o que seu futuro agradecerá.",
    "Você é capaz de muito mais do que imagina.",
    "Grandes resultados começam com pequenas atitudes.",
    "Não precisa ser perfeito, só precisa começar.",
    "Um dia de cada vez, uma conquista de cada vez.",
    "Seu esforço de hoje constrói seu amanhã."
];

const hoje = new Date().toDateString();

// Usa sempre a mesma frase durante o dia
let indice = Math.floor(
    new Date().setHours(0, 0, 0, 0) / 86400000
) % frases.length;

const elementoFrase = document.getElementById("frase-motivacional");
if (elementoFrase) elementoFrase.textContent = frases[indice];

/* ---------- Utilidades ---------- */

// Troca < > & " ' por códigos HTML (evita XSS ao montar HTML com textos digitados)
function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function hojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// '2026-11-05' vira '05/11/2026'
function formatarData(data) {
    return data ? data.split('-').reverse().join('/') : 'Sem data';
}

function estaAtrasada(tarefa) {
    return tarefa.status !== 'concluida' && tarefa.data_vencimento && tarefa.data_vencimento < hojeISO();
}

// Etiqueta colorida (a cor vem da classe no CSS)
function selo(classe, texto) {
    return `<span class="selo ${classe}">${escapar(texto)}</span>`;
}

// Monta as <option> de um <select> a partir de um objeto { valor: 'Texto' }
function opcoes(nomes, selecionado) {
    return Object.entries(nomes)
        .map(([valor, nome]) => `<option value="${valor}"${valor === selecionado ? ' selected' : ''}>${nome}</option>`)
        .join('');
}

/* ---------- Gráficos (Chart.js) ---------- */
const graficos = {};

function desenharGrafico(idCanvas, tipo, rotulos, valores, cores) {
    if (typeof Chart === 'undefined') return; // sem internet o Chart.js não carrega
    if (graficos[idCanvas]) graficos[idCanvas].destroy();

    Chart.defaults.color = '#9b9fbd';
    graficos[idCanvas] = new Chart(document.getElementById(idCanvas), {
        type: tipo,
        data: { labels: rotulos, datasets: [{ data: valores, backgroundColor: cores, borderWidth: 0 }] },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { display: tipo !== 'bar', position: 'bottom' } },
            scales: tipo === 'bar' ? { y: { beginAtZero: true, ticks: { precision: 0 } } } : {},
        },
    });
}

/* ---------- Menu lateral e barra superior ---------- */

// O menu e a barra são montados aqui, em vez de repetir o mesmo HTML em cada página
function montarLayout() {
    const pagina = document.body.dataset.pagina;
    const links = [
        ['dashboard', 'Dashboard', 'layout-dashboard', 'index.html'],
        ['tarefas', 'Minhas tarefas', 'list-checks', 'pages/tarefas.html'],
        ['kanban', 'Quadro Kanban', 'kanban', 'pages/kanban.html'],
        ['calendario', 'Calendário', 'calendar-days', 'pages/calendario.html'],
        ['estatisticas', 'Estatísticas', 'trending-up', 'pages/estatisticas.html'],
        ['configuracoes', 'Configurações', 'settings', 'pages/configuracoes.html'],
    ].map(([id, texto, icone, caminho]) =>
        `<a href="${RAIZ}${caminho}" class="${id === pagina ? 'ativo' : ''}"><i data-lucide="${icone}"></i>${texto}</a>`
    ).join('');

    document.body.insertAdjacentHTML('afterbegin', `
        <aside class="menu">
            <div class="logo">Done<span>Up</span></div>
            <nav>${links}</nav>
        </aside>
        <header class="topo">
            <button type="button" class="mini" id="botao-menu" aria-label="Abrir menu">☰</button>
            <h1>${document.body.dataset.titulo}</h1>
            <input type="search" id="busca" placeholder="Buscar tarefas..." aria-label="Buscar tarefas">
            <button type="button" class="botao" id="botao-nova">+ Nova tarefa</button>
            <button type="button" class="mini" id="botao-tema" aria-label="Alternar tema claro e escuro">◐</button>
        </header>`);

    document.getElementById('botao-menu').addEventListener('click', () => document.body.classList.toggle('menu-aberto'));
    document.querySelector('main').addEventListener('click', () => document.body.classList.remove('menu-aberto'));
    document.getElementById('botao-nova').addEventListener('click', () => abrirFormularioTarefa());
    document.getElementById('botao-tema').addEventListener('click', () => {
        definirTema(document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro');
    });
    document.querySelectorAll('button[data-tema]').forEach((botao) => {
        botao.addEventListener('click', () => definirTema(botao.dataset.tema)); // botões da página Configurações
    });

    // Fora da página "Minhas tarefas", a busca leva para lá ao apertar Enter
    const busca = document.getElementById('busca');
    busca.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' && pagina !== 'tarefas') {
            window.location.href = `${RAIZ}pages/tarefas.html?busca=${encodeURIComponent(busca.value)}`;
        }
    });

    // Animação ao trocar de página: a tela atual some e só depois abre a próxima
    document.querySelectorAll('.menu nav a').forEach((link) => {
        link.addEventListener('click', (evento) => {
            evento.preventDefault();
            document.body.classList.add('saindo');
            setTimeout(() => { window.location.href = link.href; }, 200);
        });
    });
    window.addEventListener('pageshow', () => document.body.classList.remove('saindo')); // botão "voltar"

    if (window.lucide) lucide.createIcons(); // desenha os ícones
    document.body.classList.add('pronto');    // mostra a página com a animação de entrada
}

// Cada página chama iniciarPagina() com o que ela precisa fazer ao abrir
function iniciarPagina(funcao) {
    montarLayout();
    funcao();
}

// A página Configurações não tem script próprio: só precisa do menu e da barra superior
if (document.body.dataset.pagina === 'configuracoes') montarLayout();
