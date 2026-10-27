// ============================================
// АТАКА
// ============================================
function attackEnemy(enemy) {
  const enemyHp = enemy.hp;

  if (!player.weapon) {
    if (player.hp > enemyHp) {
      log(`Игрок съедает врага (${enemyHp} HP)`);
      playerHitX = player.x;
      playerHitY = player.y;
      playerTakeDamage(enemyHp);
      killEnemy(enemy, false);
      return { killed: true, shouldMove: true };
    } else {
      log(`Игрок слишком слаб — смерть!`);
      playerHitX = player.x;
      playerHitY = player.y;
      player.hp = 0;
      playerWasHit = true;
      gameOver();
      return { killed: false, shouldMove: false };
    }
  }

  const w = player.weapon;
  let weaponDamage = w.hp;

  if (weaponDamage > enemyHp) {
    log(`Оружие убивает врага (${enemyHp} HP)`);
    w.hp -= enemyHp;
    killEnemy(enemy, true);
    return { killed: true, shouldMove: false };
  } else if (weaponDamage === enemyHp) {
    log(`Оружие ломается, но враг убит!`);
    player.weapon = null;
    killEnemy(enemy, true);
    return { killed: true, shouldMove: false };
  } else {
    log(`Оружие ломается, враг теряет ${weaponDamage} HP`);
    enemy.hp -= weaponDamage;
    player.weapon = null;
    return { killed: false, shouldMove: false };
  }
}

// ============================================
// КРЕСТ: ОТСТУПЛЕНИЕ НА 1 КАРТУ В СТОРОНУ ОТ ИГРОКА
// Меняемся с ЛЮБОЙ картой (кроме самого игрока)
// ============================================
function scareEnemiesAround() {
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  let scared = 0;

  const targets = [];
  for (const [dx, dy] of dirs) {
    const nx = player.x + dx;
    const ny = player.y + dy;
    const cell = getCell(nx, ny);
    if (!cell || !cell.entity || cell.entity.kind !== 'enemy') continue;
    targets.push({ cell, dx, dy });
  }

  for (const { cell, dx, dy } of targets) {
    if (!cell.entity || cell.entity.kind !== 'enemy') continue;

    const tx = cell.x + dx;
    const ty = cell.y + dy;
    const t = getCell(tx, ty);
    if (!t) continue;

    // Единственное ограничение — не вставать на игрока
    if (tx === player.x && ty === player.y) continue;

    // Меняемся с ЛЮБОЙ картой (враг, могила, часовня, пустая, оружие, свеча, конфета)
    const tmp = t.entity;
    t.entity = cell.entity;
    t.type = cell.type;
    cell.entity = tmp;
    cell.type = tmp ? tmp.kind : 'empty';
    scared++;
  }

  if (scared > 0) log(`✝️ Крест заставил отступить: ${scared}`);
}