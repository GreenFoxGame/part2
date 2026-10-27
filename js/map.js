// ============================================
// ПОЛЕ 4×4 (Кладбище)
// ============================================

let FIELD = [];
let gameTurn = 0;
let nextEntityId = 1;
let lastShiftDirection = null;

let guaranteedQueue = [];
let forceGuaranteedNextSpawn = false;
let forceNekrofilNextSpawn = false;
let skipNextSpawnAnimation = false;

let forgottenQueue = [];
let lastForgottenCheck = 0;

function newEntityId() {
  return 'e_' + (nextEntityId++);
}

function initField() {
  FIELD = [];
  gameTurn = 0;
  nextEntityId = 1;
  lastShiftDirection = null;
  guaranteedQueue = [];
  forceGuaranteedNextSpawn = false;
  forceNekrofilNextSpawn = false;
  skipNextSpawnAnimation = false;
  forgottenQueue = [];
  lastForgottenCheck = 0;

  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    FIELD[y] = [];
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      FIELD[y][x] = { x, y, entity: null, type: 'empty' };
    }
  }
}

function getCell(x, y) {
  if (x < 0 || y < 0 || x >= CONFIG.FIELD_SIZE || y >= CONFIG.FIELD_SIZE) return null;
  return FIELD[y][x];
}

// ============================================
// СЧЁТЧИКИ
// ============================================
function countDeadMen() {
  let n = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'enemy' && e.type === 'dead_man') n++;
    }
  return n;
}

function countNekrofil() {
  let n = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'enemy' && e.type === 'nekrofil') n++;
    }
  return n;
}

function countSectants() {
  let n = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'enemy' && e.type === 'sectant') n++;
    }
  return n;
}

// ============================================
// СОЗДАТЬ СУЩНОСТЬ ПО ТИПУ
// ============================================
function createEntityByType(type) {
  if (!type) type = 'grave';

  // Оружие
  if (CONFIG.WEAPONS && CONFIG.WEAPONS[type]) {
    let hp = getWeaponHp(type);
    if (isNaN(hp) || !hp) hp = CONFIG.WEAPONS[type].hp;
    return {
      id: newEntityId(),
      kind: 'weapon', type,
      hp: hp,
      maxHp: hp
    };
  }

  // Враги
  if (CONFIG.ENEMIES && CONFIG.ENEMIES[type]) {
    const e = CONFIG.ENEMIES[type];
    const hp = getEnemyHp(type);

    const isLateEnemy = ['spirit_maiden', 'sectant'].includes(type);
    const currentEnemies = countEnemies();

    if (!isLateEnemy && currentEnemies >= CONFIG.MAX_ENEMIES_ON_FIELD) {
      return { id: newEntityId(), kind: 'grave' };
    }

    // Жёсткий лимит: не более 2 Некрофилов на поле
    if (type === 'nekrofil' && countNekrofil() >= 2) {
      return { id: newEntityId(), kind: 'grave' };
    }

    const enemy = {
      id: newEntityId(),
      kind: 'enemy', type,
      hp, maxHp: hp,
      behavior: e.behavior || 'static',
      timer: e.timer || 0,
      burning: false
    };

    if (type === 'dead_man') {
      enemy.risen = true;
      enemy.buried = 0;
    }

    if (type === 'ghost' || type === 'spirit_maiden') {
      enemy.variant = Math.random() < 0.5 ? 0 : 1;
    }

    if (type === 'sectant') {
      enemy.cooldown = 0;
    }

    return enemy;
  }

  // Конфета
  if (type === 'candy') {
    return {
      id: newEntityId(),
      kind: 'food', type: 'candy',
      heal: CONFIG.CANDY_HEAL,
      variant: Math.random() < 0.5 ? 0 : 1
    };
  }

  // Часовня
  if (type === 'chapel') {
    return {
      id: newEntityId(),
      kind: 'chapel',
      turnsLeft: CONFIG.CHAPEL_TURNS
    };
  }

  // Могила
  return { id: newEntityId(), kind: 'grave' };
}

// ============================================
// СОЗДАТЬ СЛУЧАЙНУЮ СУЩНОСТЬ
// Приоритеты:
//   0. forceNekrofilNextSpawn — если ≥ 3 мертвецов и нет Некрофила
//   1. автопроверка: ≥ 3 мертвецов и нет Некрофила → Некрофил
//   2. «забытые» враги (дух / сектант)
//   3. обычные веса
// ============================================
function createRandomEntity() {
  // 0. Форс Некрофила (из endPlayerTurn)
  if (forceNekrofilNextSpawn) {
    forceNekrofilNextSpawn = false;
    if (countDeadMen() >= CONFIG.DEAD_MEN_FOR_NEKROFIL && countNekrofil() === 0) {
      log('🧟‍♂️ Некрофил обязан появиться (на поле много мертвецов)');
      return createEntityByType('nekrofil');
    }
  }

  // 1. Автопроверка: ≥ 3 мертвецов и нет Некрофила
  if (countDeadMen() >= CONFIG.DEAD_MEN_FOR_NEKROFIL && countNekrofil() === 0) {
    log('🧟‍♂️ На поле много мертвецов — Некрофил обязан появиться!');
    return createEntityByType('nekrofil');
  }

  // 2. «Забытые» враги
  const forgottenType = trySpawnForgottenEnemy();
  if (forgottenType) {
    return createEntityByType(forgottenType);
  }

  // 3. Обычный спавн
  const weights = getSpawnWeights();
  const type = weightedRandom(weights);
  if (!type) return createEntityByType('grave');
  return createEntityByType(type);
}

// ============================================
// «ЗАБЫТЫЕ» ВРАГИ (ДУХ И СЕКТАНТ)
// ============================================
function trySpawnForgottenEnemy() {
  if (gameTurn - lastForgottenCheck < CONFIG.FORGOTTEN_CHECK_INTERVAL) return null;
  lastForgottenCheck = gameTurn;

  const available = [];
  if (player.candles >= CONFIG.CANDLES_UNLOCK_ALL) {
    available.push('spirit_maiden', 'sectant');
  }
  if (available.length === 0) return null;

  const onField = [];
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'enemy') onField.push(e.type);
    }

  for (const type of available) {
    if (!onField.includes(type)) {
      const lastSeen = forgottenQueue[type] || 0;
      if (gameTurn - lastSeen >= CONFIG.FORGOTTEN_ENEMY_AFTER_TURNS) {
        forgottenQueue[type] = gameTurn;
        return type;
      }
    } else {
      forgottenQueue[type] = gameTurn;
    }
  }

  return null;
}

// ============================================
// ДОСТУПНЫЕ ВРАГИ
// ============================================
function getAvailableEnemyTypes() {
  const candles = (typeof player !== 'undefined' && player) ? player.candles : 0;
  const available = ['nekrofil'];

  if (candles >= CONFIG.CANDLES_UNLOCK_ALL) {
    available.push('ghost', 'spirit_maiden', 'sectant');
  }

  return available;
}

// ============================================
// ГАРАНТИРОВАННЫЙ СПАВН
// ============================================
function getGuaranteedEnemyType() {
  const available = getAvailableEnemyTypes();
  if (available.length === 0) return null;

  guaranteedQueue = guaranteedQueue.filter(t => available.includes(t));

  for (const type of available) {
    if (!guaranteedQueue.includes(type)) {
      guaranteedQueue.push(type);
    }
  }

  if (guaranteedQueue.length === 0) {
    guaranteedQueue = [...available];
  }

  return guaranteedQueue.shift();
}

// ============================================
// ЗАПОЛНИТЬ ВСЕ КЛЕТКИ
// ============================================
function fillAllCells() {
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const cell = FIELD[y][x];
      if (player && player.x === x && player.y === y) continue;
      if (cell.entity) continue;
      cell.entity = createRandomEntity();
      if (cell.entity) cell.type = cell.entity.kind;
    }
  }
}

// ============================================
// СДВИГ
// ============================================
function shiftLine(direction, oldX, oldY) {
  lastShiftDirection = direction;

  if (direction === 'right') {
    const y = oldY;
    for (let x = oldX; x > 0; x--) {
      FIELD[y][x].entity = FIELD[y][x - 1].entity;
      FIELD[y][x].type = FIELD[y][x - 1].type;
    }
    FIELD[y][0].entity = createRandomEntity();
    FIELD[y][0].type = FIELD[y][0].entity ? FIELD[y][0].entity.kind : 'empty';

  } else if (direction === 'left') {
    const y = oldY;
    for (let x = oldX; x < CONFIG.FIELD_SIZE - 1; x++) {
      FIELD[y][x].entity = FIELD[y][x + 1].entity;
      FIELD[y][x].type = FIELD[y][x + 1].type;
    }
    FIELD[y][CONFIG.FIELD_SIZE - 1].entity = createRandomEntity();
    FIELD[y][CONFIG.FIELD_SIZE - 1].type =
      FIELD[y][CONFIG.FIELD_SIZE - 1].entity ? FIELD[y][CONFIG.FIELD_SIZE - 1].entity.kind : 'empty';

  } else if (direction === 'up') {
    const x = oldX;
    for (let y = oldY; y < CONFIG.FIELD_SIZE - 1; y++) {
      FIELD[y][x].entity = FIELD[y + 1][x].entity;
      FIELD[y][x].type = FIELD[y + 1][x].type;
    }
    FIELD[CONFIG.FIELD_SIZE - 1][x].entity = createRandomEntity();
    FIELD[CONFIG.FIELD_SIZE - 1][x].type =
      FIELD[CONFIG.FIELD_SIZE - 1][x].entity ? FIELD[CONFIG.FIELD_SIZE - 1][x].entity.kind : 'empty';

  } else if (direction === 'down') {
    const x = oldX;
    for (let y = oldY; y > 0; y--) {
      FIELD[y][x].entity = FIELD[y - 1][x].entity;
      FIELD[y][x].type = FIELD[y - 1][x].type;
    }
    FIELD[0][x].entity = createRandomEntity();
    FIELD[0][x].type = FIELD[0][x].entity ? FIELD[0][x].entity.kind : 'empty';
  }
}