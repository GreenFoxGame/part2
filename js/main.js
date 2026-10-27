// ============================================
// ГЛАВНЫЙ ФАЙЛ
// ============================================

let gameState = 'start';
let playerId = "-";

let pressTimer = null;
let isLongPress = false;

// ============================================
// GOOGLE ТАБЛИЦА — ВСТАВЬ ССЫЛКУ СЮДА
// ============================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUnosqu4GbziU1oWStveHftltLfhq6y9_mCUGRxgwP6KUa4kTpYBc5IPaQLh69tePL/exec';

let stats = {};

function loadStats() {
  try {
    const saved = localStorage.getItem('cemetery_player_stats');
    if (saved) stats = JSON.parse(saved);
    else stats = {};
  } catch (e) {
    stats = {};
  }
}

function saveStats() {
  try {
    localStorage.setItem('cemetery_player_stats', JSON.stringify(stats));
  } catch (e) {
    console.warn("Не удалось сохранить статистику", e);
  }
}

function getPlayerRecord(id) {
  if (!stats[id]) stats[id] = { games: 0, maxScore: 0 };
  return stats[id];
}

function updateStats(id, score) {
  const record = getPlayerRecord(id);
  record.games += 1;
  if (score > record.maxScore) record.maxScore = score;
  saveStats();
  return record;
}

loadStats();

// ============================================
// ЗАГЛУШКА
// ============================================
function gameOver() {
  if (typeof window.showGameOver === 'function') {
    window.showGameOver();
  } else {
    console.error("showGameOver ещё не загружен");
  }
}

// ============================================
// ПОПАП
// ============================================
function showTooltip(title, desc) {
  const tt = document.getElementById('tooltip');
  document.getElementById('tt-title').textContent = title;
  document.getElementById('tt-desc').innerHTML = desc;
  tt.classList.add('active');
}

function hideTooltip() {
  document.getElementById('tooltip').classList.remove('active');
  isLongPress = false;
}

document.getElementById('tt-close-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  hideTooltip();
});

// ============================================
// СТАРТ
// ============================================
document.getElementById('start-btn').addEventListener('click', () => {
  const input = document.getElementById('player-id-input');
  const val = input.value.trim();

  if (!val) {
    alert("Пожалуйста, введите номер!");
    return;
  }

  playerId = val;
  document.getElementById('start-modal').classList.remove('active');
  gameState = 'playing';

  startGame();
});

document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('gameover-modal').classList.remove('active');
  document.getElementById('start-modal').classList.add('active');
  document.getElementById('player-id-input').value = playerId;
  gameState = 'start';
});

// ============================================
// ПОРАЖЕНИЕ
// ============================================
window.showGameOver = function() {
  gameState = 'gameover';

  const record = updateStats(playerId, player.candles);

  document.getElementById('final-player-id').textContent = playerId;
  document.getElementById('final-score').textContent = player.candles;
  document.getElementById('final-max-score').textContent = record.maxScore;
  document.getElementById('final-games').textContent = record.games;

  document.getElementById('gameover-modal').classList.add('active');

  sendToGoogleSheets(playerId, player.candles, record.games, record.maxScore);
};

// ============================================
// ОТПРАВКА В GOOGLE
// ============================================
function sendToGoogleSheets(id, score, games, maxScore) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('ВСТАВЬ_СЮДА')) {
    console.warn("Google Script URL не настроен. Данные не отправлены.");
    return;
  }

  const formData = new FormData();
  formData.append('playerId', id);
  formData.append('score', score);
  formData.append('games', games);
  formData.append('maxScore', maxScore);

  fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => console.log('Успешно отправлено:', data))
    .catch(err => console.error('Ошибка отправки:', err));
}

// ============================================
// ПОПАП ПРИ ДОЛГОМ НАЖАТИИ
// ============================================
function buildAndShowTooltip(x, y) {
  let title = "Пусто";
  let desc = "Здесь ничего нет.";

  if (player.x === x && player.y === y) {
    title = "Лисёнок";
    desc = `HP: ${player.hp}/${CONFIG.PLAYER_MAX_HP}<br>Оружие: ${player.weapon ? CONFIG.WEAPONS[player.weapon.type].name + ' (' + player.weapon.hp + ' HP)' : 'нет'}<br>Свечей: ${player.candles}`;
  } else {
    const cell = getCell(x, y);
    if (cell && cell.entity) {
      const e = cell.entity;

      if (e.kind === 'enemy') {
        const cfg = CONFIG.ENEMIES[e.type];
        title = cfg.name;
        desc = `HP: ${e.hp}<br>`;
        if (e.type === 'dead_man') {
          if (!e.risen) desc += `Не атакует, находясь в могиле. Вылезает спустя 3 хода после появления.`;
          else desc += 'Атакует рядом стоящего игрока.';
        }
        if (e.type === 'spirit_maiden') desc += 'Преследует и соблазняет: -1 урон оружия.';
        if (e.type === 'ghost') desc += 'Просто стоит.';
        if (e.type === 'sectant') desc += 'Призывает призраков раз в 3 хода. Умирая, оставляет после себя свечу.';
        if (e.type === 'nekrofil') desc += 'Имеет специфические предпочтения. Мертвецы убегают в страхе. Вытрахивает -1 HP из мертвецов, которые не смогли убежать.';

      } else if (e.kind === 'weapon') {
        title = CONFIG.WEAPONS[e.type].name;
        desc = `Прочность: ${e.hp} HP<br>Урон равен прочности.`;
        if (e.type === 'cross') desc += '<br>Распугивает нечисть вокруг.';

      } else if (e.kind === 'food') {
        title = 'Конфета';
        desc = `Восстанавливает +${e.heal} HP.`;

      } else if (e.kind === 'grave') {
        title = 'Могила';
        desc = 'Можно осмотреть. Возможные находки: свеча, конфета, мертвец.';

      } else if (e.kind === 'chapel') {
        title = 'Часовня';
        desc = `Лечит +${CONFIG.CHAPEL_HEAL} HP каждый ход. Осталось: ${e.turnsLeft}.`;

      } else if (e.kind === 'candle') {
        title = 'Свеча';
        desc = 'Идёт в счётчик.';
      }
    }
  }

  showTooltip(title, desc);
  try { if (navigator.vibrate) navigator.vibrate(50); } catch (err) {}
}

// ============================================
// ДОЛГОЕ НАЖАТИЕ
// ============================================
function attachLongPressHandlers() {
  const slots = document.querySelectorAll('.click-slot');

  slots.forEach((slot, index) => {
    const x = index % CONFIG.FIELD_SIZE;
    const y = Math.floor(index / CONFIG.FIELD_SIZE);

    const onStart = (e) => {
      if (gameState !== 'playing') return;
      const tt = document.getElementById('tooltip');
      if (tt.classList.contains('active')) return;

      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        buildAndShowTooltip(x, y);
      }, 500);
    };

    const onEnd = (e) => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }

      const tt = document.getElementById('tooltip');
      if (isLongPress || tt.classList.contains('active')) {
        e.stopPropagation();
        e.preventDefault();
      }
      isLongPress = false;
    };

    const onCancel = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      isLongPress = false;
    };

    slot.addEventListener('mousedown', onStart);
    slot.addEventListener('touchstart', onStart, { passive: false });
    slot.addEventListener('mouseup', onEnd);
    slot.addEventListener('touchend', onEnd);
    slot.addEventListener('mouseleave', onCancel);
    slot.addEventListener('touchcancel', onCancel);
  });
}

// ============================================
// КЛИК ПО КЛЕТКЕ
// ============================================
function onCellClick(x, y) {
  if (gameState !== 'playing') return;
  if (x < 0 || y < 0 || x >= CONFIG.FIELD_SIZE || y >= CONFIG.FIELD_SIZE) return;

  const cell = getCell(x, y);
  if (!cell) return;
  if (x === player.x && y === player.y) return;

  const dx = x - player.x;
  const dy = y - player.y;
  const isAdjacent = (Math.abs(dx) + Math.abs(dy) === 1);
  const targetEntity = cell.entity;

  if (targetEntity && targetEntity.kind === 'grave') {
    if (!isAdjacent) return;
    openGrave(cell);
    render();
    if (gameState !== 'playing') return;
    setTimeout(() => { if (gameState === 'playing') endPlayerTurn(); }, 350);
    return;
  }

  if (targetEntity && targetEntity.kind === 'chapel') {
    log('⛪ Часовня. Она лечит каждый ход.');
    return;
  }

  if (!isAdjacent) return;

  const direction = dx === -1 ? 'left' : dx === 1 ? 'right' : dy === -1 ? 'up' : 'down';
  const oldX = player.x;
  const oldY = player.y;

  if (targetEntity && targetEntity.kind === 'enemy') {
    const enemyId = targetEntity.id;
    const result = attackEnemy(targetEntity);
    animateHitById(enemyId, 'enemy');

    if (result.shouldMove === true) {
      player.x = x;
      player.y = y;
      shiftLine(direction, oldX, oldY);
      pickupOnCell(getCell(player.x, player.y));
    }

    setTimeout(() => {
      if (gameState !== 'playing') return;
      render();
      setTimeout(() => { if (gameState === 'playing') endPlayerTurn(); }, 350);
    }, 300);
    return;
  }

  if (targetEntity) {
    if (targetEntity.kind === 'empty') {
      cell.entity = null;
      cell.type = 'empty';
    } else {
      pickupEntity(targetEntity);
      cell.entity = null;
      cell.type = 'empty';
    }
    if (gameState !== 'playing') return;
  }

  player.x = x;
  player.y = y;
  shiftLine(direction, oldX, oldY);
  render();

  if (gameState !== 'playing') return;
  setTimeout(() => { if (gameState === 'playing') endPlayerTurn(); }, 350);
}

// ============================================
// ПОДБОР
// ============================================
function pickupEntity(e) {
  if (!e) return;
  if (e.kind === 'food') {
    playerHeal(e.heal);
    log(`🍬 Конфета: +${e.heal} HP`);
  } else if (e.kind === 'weapon') {
    playerPickupWeapon(e);
  } else if (e.kind === 'candle') {
    addCandle(e.value || 1);
  }
}

function pickupOnCell(cell) {
  if (!cell || !cell.entity) return;
  const e = cell.entity;
  if (e.kind === 'weapon' || e.kind === 'food' || e.kind === 'candle') {
    pickupEntity(e);
    cell.entity = null;
    cell.type = 'empty';
  }
}

// ============================================
// СТАРТ ИГРЫ
// ============================================
function startGame() {
  initField();
  initPlayer();
  document.getElementById('log').innerHTML = '';
  fillAllCells();

  fieldInitialized = false;
  initFieldDOM();
  render();

  setTimeout(attachLongPressHandlers, 100);
}