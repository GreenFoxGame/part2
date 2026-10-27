// ============================================
// ХОД ВРАГОВ
// ============================================

function enemiesTurn() {
  const enemies = [];
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'enemy') enemies.push({ cell: FIELD[y][x], e });
    }

  for (const { cell, e } of enemies) {
    if (!cell.entity || cell.entity !== e) continue;
    if (e.hp <= 0) continue;

    switch (e.behavior) {
      case 'static':
        break;

      case 'dead_man': {
        if (!e.risen) {
          e.buried = (e.buried || 0) - 1;
          if (e.buried > 0) {
            log(`💀 Мертвец ещё в могиле (${e.buried})`);
            break;
          }
          e.risen = true;
          log('💀 Мертвец вылез!');
        }

        if (isAdjacentToPlayer(cell.x, cell.y)) {
          if (player.hp > 1) {
            playerTakeDamage(1);
            log('💀 Мертвец тянет к игроку: -1 HP');
            animateHitById('player', 'player');
          } else {
            log('💀 Мертвец не трогает игрока (1 HP)');
          }
        }
        break;
      }

      case 'chase_seduce':
        chasePlayer(cell, e);
        break;

      case 'summon': {
        if (e.cooldown === undefined) e.cooldown = 0;
        if (e.cooldown > 0) {
          e.cooldown--;
          break;
        }
        const summoned = summonGhost(cell, e);
        if (summoned) e.cooldown = CONFIG.SECTANT_COOLDOWN;
        break;
      }

      case 'scare_dead_man':
        scareDeadMenAround(cell, e);
        break;
    }
  }
}

// ============================================
// РЯДОМ С ИГРОКОМ?
// ============================================
function isAdjacentToPlayer(x, y) {
  const dx = Math.abs(player.x - x);
  const dy = Math.abs(player.y - y);
  return (dx + dy === 1);
}

// ============================================
// НЕКРОФИЛ: ПУГАЕТ МЕРТВЕЦОВ
// Меняется с ЛЮБОЙ картой, КРОМЕ игрока и другого Некрофила.
// Если мертвец НЕ смог убежать ни в одну сторону — теряет 1 HP.
// ============================================
function scareDeadMenAround(cell, e) {
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  let scared = 0;
  let hurt = 0;

  // Сначала собираем мертвецов вокруг некрофила
  const victims = [];
  for (const [dx, dy] of dirs) {
    const nx = cell.x + dx;
    const ny = cell.y + dy;
    const n = getCell(nx, ny);
    if (!n || !n.entity || n.entity.kind !== 'enemy') continue;
    if (n.entity.type !== 'dead_man') continue;
    victims.push({ cell: n, dx, dy });
  }

  for (const { cell: n, dx, dy } of victims) {
    if (!n.entity || n.entity.type !== 'dead_man') continue;

    const tx = n.x + dx;
    const ty = n.y + dy;
    const t = getCell(tx, ty);

    let escaped = false;

    if (t && !(tx === player.x && ty === player.y)) {
      if (!(t.entity && t.entity.kind === 'enemy' && t.entity.type === 'nekrofil')) {
        // Меняемся местами — мертвец убежал
        const tmp = t.entity;
        t.entity = n.entity;
        t.type = n.type;
        n.entity = tmp;
        n.type = tmp ? tmp.kind : 'empty';
        escaped = true;
        scared++;
      }
    }

    if (!escaped) {
      // Не смог убежать — теряет 1 HP
      n.entity.hp -= 1;
      animateHitById(n.entity.id, 'enemy');
      log(`💀 Мертвец не смог убежать от Некрофила: -1 HP (${Math.max(0, n.entity.hp)} HP)`);
      hurt++;

      if (n.entity.hp <= 0) {
        killEnemy(n.entity, true);
      }
    }
  }

  if (scared > 0) log(`🧟‍♂️ Некрофил распугал мертвецов: ${scared}`);
  if (hurt > 0 && scared === 0) log(`🧟‍♂️ Некрофил измучил мертвецов: ${hurt}`);
}

// ============================================
// ДУХ: ПРЕСЛЕДОВАНИЕ + СОБЛАЗН
// Меняется с ЛЮБОЙ картой по направлению к игроку
// ============================================
function chasePlayer(cell, e) {
  const dx = player.x - cell.x;
  const dy = player.y - cell.y;

  // Уже рядом — соблазняет
  if (Math.abs(dx) + Math.abs(dy) === 1) {
    e.seduceActive = true;
    if (player.weapon) {
      player.weapon.hp = Math.max(0, player.weapon.hp - 1);
      log(`👻 Дух соблазняет: урон оружия -1 (${player.weapon.hp} HP)`);
      if (player.weapon.hp <= 0) {
        log('Оружие рассыпалось от соблазна!');
        player.weapon = null;
      }
    } else {
      log('👻 Дух соблазняет, но оружия нет');
    }
    return;
  }

  let tx = cell.x;
  let ty = cell.y;
  if (dx !== 0) tx += Math.sign(dx);
  else if (dy !== 0) ty += Math.sign(dy);

  const target = getCell(tx, ty);
  if (!target) return;

  // Единственное ограничение — не вставать на игрока
  if (tx === player.x && ty === player.y) return;

  // Меняемся с ЛЮБОЙ картой
  const tmp = target.entity;
  target.entity = cell.entity;
  target.type = cell.type;
  cell.entity = tmp;
  cell.type = tmp ? tmp.kind : 'empty';

  if (target.entity) target.entity.seduceActive = false;
}

// ============================================
// СЕКТАНТ: ПРИЗЫВ ПРИЗРАКА
// ============================================
function summonGhost(cell, e) {
  const others = [];
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const c = FIELD[y][x];
      const en = c.entity;
      if (!en || en.kind !== 'enemy') continue;
      if (en === e) continue;
      if (en.type === 'spirit_maiden') continue;
      others.push({ cell: c, e: en });
    }

  if (others.length === 0) {
    log('🧙 Сектанту некого призывать');
    return false;
  }

  others.sort((a, b) => a.e.hp - b.e.hp);
  const target = others[0];

  const hp = getEnemyHp('ghost');
  log(`🧙 Сектант превращает ${CONFIG.ENEMIES[target.e.type].name} в Призрака!`);

  skipNextSpawnAnimation = true;
  target.cell.entity = {
    id: newEntityId(),
    kind: 'enemy',
    type: 'ghost',
    hp, maxHp: hp,
    behavior: 'static',
    variant: Math.random() < 0.5 ? 0 : 1
  };
  target.cell.type = 'enemy';

  return true;
}

// ============================================
// УБИТЬ ВРАГА
// reward:
//   'candle'  → свеча
//   'shovel' / 'dagger' / ... → соответствующее оружие с HP по getWeaponHp
// ============================================
function killEnemy(enemy, killedByWeapon) {
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      if (FIELD[y][x].entity !== enemy) continue;

      const cell = FIELD[y][x];
      const cfg = CONFIG.ENEMIES[enemy.type];
      let reward = null;

      if (killedByWeapon && cfg && cfg.reward) {
        if (cfg.reward === 'candle') {
          reward = { id: newEntityId(), kind: 'candle', value: 1 };
        } else if (CONFIG.WEAPONS[cfg.reward]) {
          // Любое оружие
          const wType = cfg.reward;
          let hp = getWeaponHp(wType);
          if (isNaN(hp) || !hp) hp = CONFIG.WEAPONS[wType].hp;
          reward = {
            id: newEntityId(),
            kind: 'weapon',
            type: wType,
            hp: hp,
            maxHp: hp
          };
        }
      }

      if (reward) {
        skipNextSpawnAnimation = true;
        cell.entity = reward;
        cell.type = reward.kind; // 'candle' или 'weapon'
      } else {
        cell.entity = null;
        cell.type = 'empty';
      }
      return;
    }
  }
}