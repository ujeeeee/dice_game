// ==========================================
// ===== СОСТОЯНИЕ ИГРЫ =====
// ==========================================

const MAIN_LABELS = ['1', '2', '3', '4', '5', '6'];
const COMBO_LABELS = ['Пара', '2 пары', 'Сет', '3+2', 'Каре', 'Малый стрит', 'Большой стрит', 'Чёт', 'Нечет', 'Покер'];

let state = {
    scores: {},
    dice: [1, 2, 3, 4, 5],
    selected: [false, false, false, false, false],
    rollCount: 0,
    turn: 1,
    gameOver: false,
    available: [],
    isRolling: false,
};

// ==========================================
// ===== ИНИЦИАЛИЗАЦИЯ =====
// ==========================================

function initState() {
    state.scores = {};
    MAIN_LABELS.forEach(l => state.scores[l] = null);
    COMBO_LABELS.forEach(l => state.scores[l] = null);
    state.dice = [1, 2, 3, 4, 5];
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
}

function renderTable() {
    const wrap = document.getElementById('tableWrap');
    let html = '';

    MAIN_LABELS.forEach(label => {
        html += rowHTML(label);
    });

    const mainSum = getMainSum();
    html += `
        <div class="table-row summary">
            <span class="label">📊 Сумма 1-6</span>
            <span class="value" id="mainSumDisplay">${mainSum}</span>
        </div>
        <div class="table-row divider"></div>
    `;

    COMBO_LABELS.forEach(label => {
        html += rowHTML(label);
    });

    const total = getTotal();
    html += `
        <div class="table-row total">
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

    let displayVal;
    let cls = 'table-row';

    if (isClosed) {
        displayVal = val;
        cls += isNegative ? ' closed-negative' : ' closed';
    } else {
        const score = calculateScore(label);
        displayVal = (isNaN(score) || score === undefined) ? 0 : score;
        if (displayVal > 0) displayVal = '+' + displayVal;
        
        // Если комбинация доступна — оранжевый цвет
        if (state.available.includes(label) && state.rollCount > 0) {
            cls += ' available';
        }
        // Если НЕ доступна — остаётся серым (стандартный цвет .value)
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
    if (state.gameOver) {
        btn.disabled = true;
        btn.textContent = '🏁 КОНЕЦ';
        return;
    }
    if (state.isRolling) {
        btn.disabled = true;
        btn.textContent = '🌀 ...';
        return;
    }
    if (state.rollCount === 3) {
        btn.disabled = true;
        btn.textContent = '⛔ ВСЕ БРОСКИ';
        return;
    }
    if (state.rollCount === 0) {
        btn.textContent = '🎲 КРУТИТЬ';
    } else {
        btn.textContent = '🔄 ПЕРЕБРОСИТЬ';
    }
    btn.disabled = false;
}

// ==========================================
// ===== ЛОГИКА =====
// ==========================================

function rollDice() {
    if (state.gameOver || state.isRolling || state.rollCount === 3) return;

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
        if (count > 8) {
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
    state.selected[index] = !state.selected[index];
    renderDice();
}

function onRowClick(label) {
    if (state.isRolling || state.gameOver || state.rollCount === 0) return;
    if (state.scores[label] !== null) return;

    let val;
    if (state.available.includes(label)) {
        val = calculateScore(label);
        if (isNaN(val) || val === undefined) val = 0;
    } else {
        val = 0;
    }

    state.scores[label] = val;

    state.available = [];
    state.selected = [false, false, false, false, false];
    state.rollCount = 0;
    state.turn++;

    render();
    checkGameOver();
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

function calculateScore(label) {
    const dice = state.dice.slice();

    // Основная часть
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

    // Комбинации
    const freq = {};
    dice.forEach(d => { freq[d] = (freq[d] || 0) + 1; });
    const keys = Object.keys(freq).map(Number);
    const values = Object.values(freq);

    switch (label) {
        case 'Пара': {
            const k = keys.find(k => freq[k] >= 2);
            if (k === undefined) return 0;
            return k * 2;
        }
        case '2 пары': {
            const pairs = keys.filter(k => freq[k] >= 2);
            if (pairs.length < 2) return 0;
            return pairs.reduce((a, b) => a + b, 0) * 2;
        }
        case 'Сет': {
            const k = keys.find(k => freq[k] >= 3);
            if (k === undefined) return 0;
            return k * 3;
        }
        case '3+2': {
            const has3 = keys.some(k => freq[k] === 3);
            const has2 = keys.some(k => freq[k] === 2);
            if (!has3 || !has2) return 0;
            return dice.reduce((a, b) => a + b, 0);
        }
        case 'Каре': {
            const k = keys.find(k => freq[k] >= 4);
            if (k === undefined) return 0;
            return k * 4;
        }
        case 'Малый стрит': {
            const sorted = dice.slice().sort();
            if (sorted.join(',') === [1, 2, 3, 4, 5].join(',')) return 15;
            return 0;
        }
        case 'Большой стрит': {
            const sorted = dice.slice().sort();
            if (sorted.join(',') === [2, 3, 4, 5, 6].join(',')) return 20;
            return 0;
        }
        case 'Чёт': {
            if (dice.every(d => d % 2 === 0)) return dice.reduce((a, b) => a + b, 0);
            return 0;
        }
        case 'Нечет': {
            if (dice.every(d => d % 2 === 1)) return dice.reduce((a, b) => a + b, 0);
            return 0;
        }
        case 'Покер': {
            const k = keys.find(k => freq[k] === 5);
            if (k === undefined) return 0;
            return 50 + k * 5;
        }
        default:
            return 0;
    }
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
        setTimeout(() => {
            alert('🎉 Игра окончена!\nИтоговый счёт: ' + getTotal());
        }, 300);
    }
}

function resetGame() {
    if (!confirm('Начать новую игру?')) return;
    initState();
    render();
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
render();