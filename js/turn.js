// ============================================
// КОНЕЦ ХОДА ИГРОКА
// ============================================
function endPlayerTurn() {
  gameTurn++;

  if (player.weapon && player.weapon.type === 'cross') {
    scareEnemiesAround();
  }

  enemiesTurn();
  if (gameState !== 'playing') return;

  // Если ≥ 3 мертвецов и нет Некрофила — форсим следующего Некрофила
  if (typeof countDeadMen === 'function'
      && typeof countNekrofil === 'function'
      && countDeadMen() >= CONFIG.DEAD_MEN_FOR_NEKROFIL
      && countNekrofil() === 0) {
    forceNekrofilNextSpawn = true;
  }

  itemsTurn();
  if (gameState !== 'playing') return;

  if (gameTurn % CONFIG.GUARANTEED_SPAWN_INTERVAL === 0) {
    forceGuaranteedNextSpawn = true;
  }

  maybeSpawnChapel();

  render();

  if (playerWasHit) {
    playerWasHit = false;
    const hx = (playerHitX !== null) ? playerHitX : player.x;
    const hy = (playerHitY !== null) ? playerHitY : player.y;
    playerHitX = null;
    playerHitY = null;
    animateHitById('player', 'player');
  }
}

// ============================================
// КРЕСТ — ОТПУГИВАЕТ ВРАГОВ (МЕНЯЕТ МЕСТАМИ С ЛЮБОЙ КАРТОЙ)
// ============================================
function scareEnemiesAround() {
  const px = player.x;
  const py = player.y;
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // вниз, вверх, вправо, влево

  // Собираем всех врагов вокруг игрока
  const enemiesAround = [];

  for (const [dx, dy] of dirs) {
    const nx = px + dx;
    const ny = py + dy;
    const cell = getCell(nx, ny);
    if (!cell || !cell.entity) continue;
    if (cell.entity.kind !== 'enemy') continue;

    enemiesAround.push({ x: nx, y: ny, cell: cell, entity: cell.entity });
  }

  if (enemiesAround.length === 0) return;

  // Каждый враг пытается убежать, меняясь местами с любой соседней картой
  for (const enemy of enemiesAround) {
    const { x, y, cell } = enemy;

    // Ищем соседние клетки (не игрока)
    const swapCandidates = [];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;

      // Не меняемся с игроком
      if (nx === player.x && ny === player.y) continue;

      const targetCell = getCell(nx, ny);
      if (!targetCell) continue;

      // Меняемся с любой картой (могила, оружие, еда, другой враг)
      // Но не с пустой клеткой (пустая не считается картой)
      if (targetCell.entity) {
        swapCandidates.push({ x: nx, y: ny, cell: targetCell });
      }
    }

    if (swapCandidates.length === 0) {
      log(`✝️ ${CONFIG.ENEMIES[enemy.entity.type].name} не может убежать!`);
      continue;
    }

    // Выбираем случайную карту для обмена
    const target = swapCandidates[Math.floor(Math.random() * swapCandidates.length)];

    // Меняем местами
    const tempEntity = cell.entity;
    const tempType = cell.type;

    cell.entity = target.cell.entity;
    cell.type = target.cell.type;

    target.cell.entity = tempEntity;
    target.cell.type = tempType;

    log(`✝️ ${CONFIG.ENEMIES[enemy.entity.type].name} в панике меняется местами с ${getEntityName(target.cell.entity)}!`);
  }
}

// ============================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ НАЗВАНИЯ КАРТЫ
// ============================================
function getEntityName(entity) {
  if (!entity) return 'пустой клеткой';
  if (entity.kind === 'enemy') return CONFIG.ENEMIES[entity.type].name;
  if (entity.kind === 'weapon') return CONFIG.WEAPONS[entity.type].name;
  if (entity.kind === 'grave') return 'могилой';
  if (entity.kind === 'food') return entity.type === 'candy' ? 'конфетой' : 'едой';
  if (entity.kind === 'chapel') return 'часовней';
  return 'чем-то странным';
}

// ============================================
// ЧАСОВНЯ (появляется только при HP < 3, с убывающей вероятностью)
// ============================================
function maybeSpawnChapel() {
  // 1. Если часовня уже есть — не спавним
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'chapel') return;
    }

  // 2. Порог HP поднят с 3 до 6
  if (player.hp >= 6) return;

  // 3. Проверяем раз в 3 хода (было 5)
  if (gameTurn % 3 !== 0) return;

  // 4. Базовый шанс 0.4, слегка падает со временем (не до нуля)
  let chance = 0.4;
  if (gameTurn > 20) {
    chance = Math.max(0.15, 0.4 / (1 + (gameTurn - 20) / 40));
  }

  if (Math.random() > chance) return;

  // 5. Ищем пустую клетку
  const empties = [];
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      if (player.x === x && player.y === y) continue;
      const c = FIELD[y][x];
      if (!c.entity) empties.push(c);
    }
  if (empties.length === 0) return;

  const cell = empties[Math.floor(Math.random() * empties.length)];
  skipNextSpawnAnimation = true;
  cell.entity = { id: newEntityId(), kind: 'chapel', turnsLeft: CONFIG.CHAPEL_TURNS };
  cell.type = 'chapel';
  log('⛪ Появилась часовня! Спасение близко...');
}