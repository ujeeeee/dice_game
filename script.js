// ==========================================
// ===== СОСТОЯНИЕ ИГРЫ =====
// ==========================================

const MAIN_LABELS = ['1', '2', '3', '4', '5', '6'];
const COMBO_LABELS = ['Пара', '2 пары', 'Сет', '3+2', 'Каре', 'Малый стрит', 'Большой стрит', 'Чёт', 'Нечет', 'Покер'];

// Глобальное состояние
let game = {
    mode: 'setup', // 'setup' | 'game' | 'results'
    players: [],
    currentPlayerIndex: 0,
    showScoreboard: false,
};

// Состояние текущего игрока (для отрисовки)
let state = {
    scores: {},
    dice: ['P', 'O', 'K', 'E', 'R'],
    selected: [false, false, false, false, false],
    rollCount: 0,
    turn: 1,
    gameOver: false,
    available: [],
    isRolling: false,
    playerIndex: 0,
};

// ==========================================
// ===== НАСТРОЙКА ИГРЫ =====
// ==========================================

let playersCount = 2;

function setPlayersCount(count) {
    playersCount = count;
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
    });
    renderPlayerInputs();
}

function renderPlayerInputs() {
    const container = document.getElementById('playersNamesContainer');
    let html = '';
    for (let i = 1; i <= playersCount; i++) {
        const defaultName = `Игрок ${i}`;
        html += `
            <div class="player-name-input">
                <label>${i}.</label>
                <input type="text" id="playerName${i}" placeholder="${defaultName}" value="${defaultName}" maxlength="15" />
            </div>
        `;
    }
    container.innerHTML = html;
}

function getPlayerNames() {
    const names = [];
    for (let i = 1; i <= playersCount; i++) {
        const input = document.getElementById(`playerName${i}`);
        names.push(input.value.trim() || `Игрок ${i}`);
    }
    return names;
}

function startMultiplayerGame() {
    const names = getPlayerNames();
    
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
        alert('❌ Имена игроков не должны повторяться!');
        return;
    }

    game.players = names.map(name => ({
        name: name,
        scores: {},
        turn: 1,
        finished: false,
    }));

    game.players.forEach(p => {
        MAIN_LABELS.forEach(l => p.scores[l] = null);
        COMBO_LABELS.forEach(l => p.scores[l] = null);
    });

    game.currentPlayerIndex = 0;
    game.mode = 'game';
    game.showScoreboard = false;

    document.getElementById('setupModal').classList.remove('open');

    loadPlayerState(0);
    render();
}

function loadPlayerState(index) {
    const player = game.players[index];
    state.scores = { ...player.scores };
    state.dice = ['P', 'O', 'K', 'E', 'R'];
    state.selected = [false, false, false, false, false];
    state.rollCount = 0;
    state.turn = player.turn;
    state.gameOver = false;
    state.available = [];
    state.isRolling = false;
    state.playerIndex = index;
}

function savePlayerState(index) {
    const player = game.players[index];
    player.scores = { ...state.scores };
    player.turn = state.turn;
    player.finished = state.gameOver;
}

// ==========================================
// ===== ПЕРЕКЛЮЧЕНИЕ ИГРОКОВ =====
// ==========================================

function endTurn() {
    if (state.isRolling) return;
    if (state.gameOver) return;

    savePlayerState(game.currentPlayerIndex);

    const allClosed = MAIN_LABELS.every(l => state.scores[l] !== null) &&
        COMBO_LABELS.every(l => state.scores[l] !== null);
    if (allClosed || state.turn > 16) {
        game.players[game.currentPlayerIndex].finished = true;
    }

    let nextIndex = game.currentPlayerIndex;
    let found = false;
    for (let i = 1; i <= game.players.length; i++) {
        const idx = (game.currentPlayerIndex + i) % game.players.length;
        if (!game.players[idx].finished) {
            nextIndex = idx;
            found = true;
            break;
        }
    }

    if (!found) {
        showResults();
        return;
    }

    game.currentPlayerIndex = nextIndex;
    loadPlayerState(nextIndex);
    render();
}

// ==========================================
// ===== ТАБЛИЦА ВСЕХ ИГРОКОВ =====
// ==========================================

function toggleScoreboard() {
    game.showScoreboard = !game.showScoreboard;
    if (game.showScoreboard) {
        renderScoreboard();
        document.getElementById('scoreboardModal').classList.add('open');
    } else {
        document.getElementById('scoreboardModal').classList.remove('open');
    }
}

function closeScoreboard() {
    game.showScoreboard = false;
    document.getElementById('scoreboardModal').classList.remove('open');
}

function renderScoreboard() {
    const container = document.getElementById('scoreboardContent');
    
    let html = `
        <table class="scoreboard-table">
            <thead>
                <tr>
                    <th>Комбинация</th>
                    ${game.players.map(p => `<th>${p.name}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    MAIN_LABELS.forEach(label => {
        html += `<tr><td>${label}</td>`;
        game.players.forEach((p, idx) => {
            const val = p.scores[label];
            const isCurrent = idx === game.currentPlayerIndex;
            const displayVal = val !== null ? val : '—';
            html += `<td${isCurrent ? ' class="current-player"' : ''}>${displayVal}</td>`;
        });
        html += `</tr>`;
    });

    html += `<tr><td>📊 Сумма</td>`;
    game.players.forEach((p, idx) => {
        const sum = getMainSumForPlayer(p);
        const isCurrent = idx === game.currentPlayerIndex;
        html += `<td${isCurrent ? ' class="current-player"' : ''}>${sum}</td>`;
    });
    html += `</tr>`;

    COMBO_LABELS.forEach(label => {
        html += `<tr><td>${label}</td>`;
        game.players.forEach((p, idx) => {
            const val = p.scores[label];
            const isCurrent = idx === game.currentPlayerIndex;
            const displayVal = val !== null ? val : '—';
            html += `<td${isCurrent ? ' class="current-player"' : ''}>${displayVal}</td>`;
        });
        html += `</tr>`;
    });

    html += `<tr class="total-row"><td>🏆 ИТОГО</td>`;
    game.players.forEach((p, idx) => {
        const total = getTotalForPlayer(p);
        const isCurrent = idx === game.currentPlayerIndex;
        html += `<td${isCurrent ? ' class="current-player"' : ''}>${total}</td>`;
    });
    html += `</tr>`;

    html += `</tbody></table>`;

    container.innerHTML = html;
}

function getMainSumForPlayer(player) {
    let sum = 0;
    MAIN_LABELS.forEach(label => {
        const val = player.scores[label];
        if (val !== null) sum += val;
    });
    return sum < 0 ? sum * 10 : sum;
}

function getTotalForPlayer(player) {
    let total = getMainSumForPlayer(player);
    COMBO_LABELS.forEach(label => {
        const val = player.scores[label];
        if (val !== null) total += val;
    });
    return total;
}

// ==========================================
// ===== РЕЗУЛЬТАТЫ =====
// ==========================================

function showResults() {
    game.mode = 'results';
    
    savePlayerState(game.currentPlayerIndex);

    const container = document.getElementById('resultsContent');
    
    const sorted = game.players.map((p, idx) => ({
        ...p,
        index: idx,
        total: getTotalForPlayer(p),
    })).sort((a, b) => b.total - a.total);

    const medals = ['🥇', '🥈', '🥉'];

    let html = '';
    sorted.forEach((p, idx) => {
        const medal = idx < 3 ? medals[idx] : `${idx + 1}.`;
        const isWinner = idx === 0;
        html += `
            <div class="result-item ${isWinner ? 'winner' : ''}">
                <span class="place">${medal}</span>
                <span class="name">${p.name}</span>
                <span class="score">${p.total} очков</span>
            </div>
        `;
    });

    container.innerHTML = html;
    document.getElementById('resultsModal').classList.add('open');
}

function closeResults() {
    document.getElementById('resultsModal').classList.remove('open');
    resetGame();
}

// ==========================================
// ===== ИНИЦИАЛИЗАЦИЯ =====
// ==========================================

function initState() {
    state.scores = {};
    MAIN_LABELS.forEach(l => state.scores[l] = null);
    COMBO_LABELS.forEach(l => state.scores[l] = null);
    state.dice = ['P', 'O', 'K', 'E', 'R'];
    state.selected = [false, false, false, false, false];
    state.rollCount = 0;
    state.turn = 1;
    state.gameOver = false;
    state.available = [];
    state.isRolling = false;
}

// Telegram
try {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
} catch (e) {
    console.log('Not in Telegram');
}

// ==========================================
// ===== ОТРИСОВКА =====
// ==========================================

function render() {
    renderTable();
    renderDice();
    renderInfo();
    updateButtons();
    renderPlayerName();
}

function renderPlayerName() {
    const el = document.getElementById('playerNameDisplay');
    if (game.mode === 'game' && game.players.length > 0) {
        const player = game.players[game.currentPlayerIndex];
        const turnText = state.turn > 16 ? '🏁' : `${state.turn}/16`;
        el.textContent = `🎲 ${player.name}  (${turnText})`;
        el.style.display = 'block';
    } else {
        el.style.display = 'none';
    }
}

function renderTable() {
    const wrap = document.getElementById('tableWrap');
    let html = '';

    const maxRows = Math.max(MAIN_LABELS.length + 1, COMBO_LABELS.length);

    for (let i = 0; i < maxRows; i++) {
        let mainLabel = null;
        let comboLabel = null;
        let mainExtra = false;

        if (i < MAIN_LABELS.length) {
            mainLabel = MAIN_LABELS[i];
        } else if (i === MAIN_LABELS.length) {
            mainExtra = true;
        }

        if (i < COMBO_LABELS.length) {
            comboLabel = COMBO_LABELS[i];
        }

        let mainHTML = '';
        let comboHTML = '';

        if (mainLabel) {
            mainHTML = rowHTML(mainLabel);
        } else if (mainExtra) {
            const mainSum = getMainSum();
            mainHTML = `
                <div class="table-row-item summary">
                    <span class="label">📊 Сумма 1-6</span>
                    <span class="value" id="mainSumDisplay">${mainSum}</span>
                </div>
            `;
        } else {
            mainHTML = `<div class="table-row-item empty"></div>`;
        }

        if (comboLabel) {
            comboHTML = rowHTML(comboLabel);
        } else {
            comboHTML = `<div class="table-row-item empty"></div>`;
        }

        html += `
            <div class="table-row-group">
                ${mainHTML}
                ${comboHTML}
            </div>
        `;
    }

    const total = getTotal();
    html += `
        <div class="table-row full-width">
            <span class="label">🏆 ИТОГО</span>
            <span class="value" id="totalDisplay">${total}</span>
        </div>
    `;

    wrap.innerHTML = html;
}

function rowHTML(label) {
    const val = state.scores[label];
    const isClosed = val !== null;
    const isNegative = isClosed && val < 0;

    let cls = 'table-row-item';
    let displayVal;

    if (isClosed) {
        displayVal = val;
        cls += isNegative ? ' closed-negative' : ' closed';
    } else {
        if (state.rollCount === 0) {
            displayVal = '—';
        } else {
            const isFromHand = (state.rollCount === 1);
            const score = calculateScore(label, isFromHand);
            displayVal = (isNaN(score) || score === undefined) ? 0 : score;
            if (displayVal > 0) displayVal = '+' + displayVal;
        }

        if (state.available.includes(label) && state.rollCount > 0) {
            cls += ' available';
        }
    }

    return `
        <div class="${cls}" data-label="${label}" onclick="onRowClick('${label}')">
            <span class="label">${label}</span>
            <span class="value">${displayVal}</span>
        </div>
    `;
}

function renderDice() {
    const container = document.getElementById('diceContainer');
    let html = '';
    state.dice.forEach((val, i) => {
        const sel = state.selected[i] ? 'selected' : '';
        const rolling = state.isRolling ? 'rolling' : '';
        html += `
            <div class="die ${sel} ${rolling}" data-index="${i}" onclick="onDieClick(${i})">
                ${renderDieValue(val)}
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderDieValue(val) {
    if (typeof val === 'string' && ['P', 'O', 'K', 'E', 'R'].includes(val)) {
        return `<div class="dots" style="display:flex;justify-content:center;align-items:center;font-size:28px;font-weight:700;color:#ff8906;letter-spacing:2px;">${val}</div>`;
    }
    if (val === 0) {
        return '<div class="dots" style="display:flex;justify-content:center;align-items:center;font-size:20px;color:#2a2a4a;">?</div>';
    }
    const dots = getDots(val);
    let html = '<div class="dots">';
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const idx = r * 3 + c;
            html += `<div class="dot${dots[idx] ? '' : ' empty'}"></div>`;
        }
    }
    html += '</div>';
    return html;
}

function getDots(val) {
    const map = {
        1: [0, 0, 0, 0, 1, 0, 0, 0, 0],
        2: [0, 0, 1, 0, 0, 0, 1, 0, 0],
        3: [0, 0, 1, 0, 1, 0, 1, 0, 0],
        4: [1, 0, 1, 0, 0, 0, 1, 0, 1],
        5: [1, 0, 1, 0, 1, 0, 1, 0, 1],
        6: [1, 0, 1, 1, 0, 1, 1, 0, 1],
    };
    return map[val] || map[1];
}

function renderInfo() {
    document.getElementById('turnNum').textContent = state.turn;
    document.getElementById('rollNum').textContent = state.rollCount;
    document.getElementById('totalScore').textContent = getTotal();
}

function updateButtons() {
    const btn = document.getElementById('rollBtn');
    if (game.mode !== 'game') {
        btn.disabled = true;
        btn.textContent = '⏳ Ожидание...';
        return;
    }
    if (state.gameOver) {
        btn.disabled = true;
        btn.textContent = '🏁 КОНЕЦ';
        return;
    }
    if (state.isRolling) {
        btn.disabled = true;
        btn.textContent = '🌀🌀🌀';
        return;
    }
    if (state.rollCount === 3) {
        btn.disabled = true;
        btn.textContent = '⛔⛔⛔';
        return;
    }
    if (state.rollCount === 0) {
        btn.textContent = '🎲🎲🎲';
    } else {
        btn.textContent = '🔄🔄🔄';
    }
    btn.disabled = false;
}

// ==========================================
// ===== ЛОГИКА =====
// ==========================================

function rollDice() {
    if (game.mode !== 'game') return;
    if (state.gameOver || state.isRolling || state.rollCount === 3) return;

    if (state.dice.every(d => typeof d === 'string')) {
        state.dice = [1, 2, 3, 4, 5];
    }

    state.isRolling = true;
    updateButtons();

    let count = 0;
    const interval = setInterval(() => {
        state.dice = state.dice.map((v, i) => {
            if (state.selected[i]) return v;
            return Math.floor(Math.random() * 6) + 1;
        });
        renderDice();
        count++;
        if (count > 15) {
            clearInterval(interval);
            state.dice = state.dice.map((v, i) => {
                if (state.selected[i]) return v;
                return Math.floor(Math.random() * 6) + 1;
            });
            state.rollCount++;
            state.isRolling = false;

            if (state.rollCount < 3) {
                state.selected = [false, false, false, false, false];
            }

            state.available = getAvailableCombos();

            if (state.rollCount === 3 && state.available.length === 0) {
                state.available = getAllEmpty();
            }

            render();
            checkGameOver();
        }
    }, 60);
}

function onDieClick(index) {
    if (state.isRolling || state.rollCount === 0 || state.rollCount === 3 || state.gameOver) return;
    if (game.mode !== 'game') return;
    state.selected[index] = !state.selected[index];
    renderDice();
}

function onRowClick(label) {
    if (state.isRolling || state.gameOver || state.rollCount === 0) return;
    if (game.mode !== 'game') return;
    if (state.scores[label] !== null) return;

    const isFromHand = (state.rollCount === 1);
    let val = calculateScore(label, isFromHand);
    if (isNaN(val) || val === undefined) val = 0;

    state.scores[label] = val;

    state.available = [];
    state.selected = [false, false, false, false, false];
    state.rollCount = 0;
    state.turn++;

    savePlayerState(game.currentPlayerIndex);

    render();

    const allClosed = MAIN_LABELS.every(l => state.scores[l] !== null) &&
        COMBO_LABELS.every(l => state.scores[l] !== null);
    if (allClosed || state.turn > 16) {
        state.gameOver = true;
        game.players[game.currentPlayerIndex].finished = true;
        render();
        setTimeout(() => endTurn(), 300);
    } else {
        setTimeout(() => endTurn(), 300);
    }
}

function getAvailableCombos() {
    const available = [];

    MAIN_LABELS.forEach(label => {
        if (state.scores[label] !== null) return;
        const num = parseInt(label);
        const count = state.dice.filter(d => d === num).length;
        if (count >= 3) available.push(label);
    });

    const combos = checkCombos();
    COMBO_LABELS.forEach(label => {
        if (state.scores[label] !== null) return;
        if (combos[label]) available.push(label);
    });

    return available;
}

function getAllEmpty() {
    const empty = [];
    MAIN_LABELS.forEach(l => { if (state.scores[l] === null) empty.push(l); });
    COMBO_LABELS.forEach(l => { if (state.scores[l] === null) empty.push(l); });
    return empty;
}

function checkCombos() {
    const result = {};
    const dice = state.dice.slice().sort();
    const freq = {};
    dice.forEach(d => { freq[d] = (freq[d] || 0) + 1; });
    const counts = Object.values(freq);

    if (counts.some(c => c >= 2)) result['Пара'] = true;
    const pairs = counts.filter(c => c >= 2);
    if (pairs.length >= 2) result['2 пары'] = true;
    if (counts.some(c => c >= 3)) result['Сет'] = true;
    if (counts.some(c => c === 3) && counts.some(c => c === 2)) result['3+2'] = true;
    if (counts.some(c => c >= 4)) result['Каре'] = true;

    const sorted = dice.slice().sort();
    if (sorted.join(',') === [1, 2, 3, 4, 5].join(',')) result['Малый стрит'] = true;
    if (sorted.join(',') === [2, 3, 4, 5, 6].join(',')) result['Большой стрит'] = true;

    if (dice.every(d => d % 2 === 0)) result['Чёт'] = true;
    if (dice.every(d => d % 2 === 1)) result['Нечет'] = true;

    if (counts.some(c => c === 5)) result['Покер'] = true;

    return result;
}

function calculateScore(label, isFromHand = false) {
    const dice = state.dice.slice();

    if (MAIN_LABELS.includes(label)) {
        const num = parseInt(label);
        const count = dice.filter(d => d === num).length;
        if (count === 3) return 0;
        if (count === 4) return num;
        if (count === 5) return num * 2;
        if (count === 2) return -num;
        if (count === 1) return -num * 2;
        if (count === 0) return -num * 3;
        return 0;
    }

    const freq = {};
    dice.forEach(d => { freq[d] = (freq[d] || 0) + 1; });
    const keys = Object.keys(freq).map(Number);

    let score = 0;

    switch (label) {
        case 'Пара': {
            // Находим максимальную пару
            let maxK = 0;
            for (const k of keys) {
                if (freq[k] >= 2 && k > maxK) {
                    maxK = k;
                }
            }
            if (maxK === 0) return 0;
            score = maxK * 2;
            break;
        }
        case '2 пары': {
            const pairs = keys.filter(k => freq[k] >= 2);
            if (pairs.length < 2) return 0;
            score = pairs.reduce((a, b) => a + b, 0) * 2;
            break;
        }
        case 'Сет': {
            const k = keys.find(k => freq[k] >= 3);
            if (k === undefined) return 0;
            score = k * 3;
            break;
        }
        case '3+2': {
            const has3 = keys.some(k => freq[k] === 3);
            const has2 = keys.some(k => freq[k] === 2);
            if (!has3 || !has2) return 0;
            score = dice.reduce((a, b) => a + b, 0);
            break;
        }
        case 'Каре': {
            const k = keys.find(k => freq[k] >= 4);
            if (k === undefined) return 0;
            score = k * 4;
            break;
        }
        case 'Малый стрит': {
            const sorted = dice.slice().sort();
            if (sorted.join(',') === [1, 2, 3, 4, 5].join(',')) score = 15;
            else return 0;
            break;
        }
        case 'Большой стрит': {
            const sorted = dice.slice().sort();
            if (sorted.join(',') === [2, 3, 4, 5, 6].join(',')) score = 20;
            else return 0;
            break;
        }
        case 'Чёт': {
            if (dice.every(d => d % 2 === 0)) score = dice.reduce((a, b) => a + b, 0);
            else return 0;
            break;
        }
        case 'Нечет': {
            if (dice.every(d => d % 2 === 1)) score = dice.reduce((a, b) => a + b, 0);
            else return 0;
            break;
        }
        case 'Покер': {
            const k = keys.find(k => freq[k] === 5);
            if (k === undefined) return 0;
            score = 50 + k * 5;
            break;
        }
        default:
            return 0;
    }

    if (isFromHand && !MAIN_LABELS.includes(label)) {
        if (label === 'Покер') {
            const k = keys.find(k => freq[k] === 5);
            if (k !== undefined) {
                score = 50 + k * 5 * 2;
            }
        } else {
            score *= 2;
        }
    }

    return score;
}

function getMainSum() {
    let sum = 0;
    MAIN_LABELS.forEach(label => {
        const val = state.scores[label];
        if (val !== null) sum += val;
    });
    return sum < 0 ? sum * 10 : sum;
}

function getTotal() {
    let total = getMainSum();
    COMBO_LABELS.forEach(label => {
        const val = state.scores[label];
        if (val !== null) total += val;
    });
    return total;
}

function checkGameOver() {
    const allClosed = MAIN_LABELS.every(l => state.scores[l] !== null) &&
        COMBO_LABELS.every(l => state.scores[l] !== null);

    if (allClosed || state.turn > 16) {
        state.gameOver = true;
        state.rollCount = 3;
        document.getElementById('rollBtn').disabled = true;
        document.getElementById('rollBtn').textContent = '🏁 КОНЕЦ';
        
        savePlayerState(game.currentPlayerIndex);
        render();
    }
}

function resetGame() {
    if (!confirm('Начать новую игру?')) return;
    
    game = {
        mode: 'setup',
        players: [],
        currentPlayerIndex: 0,
        showScoreboard: false,
    };
    
    document.getElementById('resultsModal').classList.remove('open');
    document.getElementById('scoreboardModal').classList.remove('open');
    
    initState();
    render();
    
    document.getElementById('setupModal').classList.add('open');
    
    document.getElementById('rollBtn').disabled = false;
    document.getElementById('rollBtn').textContent = '🎲🎲🎲';
}

// ==========================================
// ===== СПРАВКА =====
// ==========================================

function showHelp() {
    document.getElementById('helpModal').classList.add('open');
}

function closeHelp() {
    document.getElementById('helpModal').classList.remove('open');
}

document.getElementById('helpModal').addEventListener('click', function(e) {
    if (e.target === this) closeHelp();
});

// ==========================================
// ===== ЗАПУСК =====
// ==========================================

initState();

document.getElementById('setupModal').classList.add('open');

document.querySelector('.count-btn[data-count="2"]').classList.add('active');
renderPlayerInputs();

render();