// ============================================
// ХОД ПРЕДМЕТОВ
// ============================================
function itemsTurn() {
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const cell = FIELD[y][x];
      const e = cell.entity;
      if (!e) continue;

      if (e.kind === 'chapel') {
        playerHeal(CONFIG.CHAPEL_HEAL);
        log(`⛪ Часовня бьёт в колокол: +${CONFIG.CHAPEL_HEAL} HP`);

        // Пульсация часовни каждый ход работы
        animateHitById(e.id, 'chapel');

        e.turnsLeft--;
        if (e.turnsLeft <= 0) {
          log('⛪ Часовня исчезает...');
          skipNextSpawnAnimation = true;
          cell.entity = null;
          cell.type = 'empty';
        }
      }
    }
  }
}

// ============================================
// ОСМОТР МОГИЛЫ
// ============================================
function openGrave(cell) {
  const guaranteed = cell.entity && cell.entity.guaranteedDeadMan;
  skipNextSpawnAnimation = true;

  if (guaranteed) {
    cell.entity = null;
    return spawnDeadManFromGrave(cell, true);
  }

  const r = Math.random();

  if (r < CONFIG.GRAVE_CHANCE_CANDLE) {
    cell.entity = { id: newEntityId(), kind: 'candle', value: 1 };
    cell.type = 'candle';
    log('🕯️ В могиле лежит свеча!');
    return 'candle';
  }

  if (r < CONFIG.GRAVE_CHANCE_CANDLE + CONFIG.GRAVE_CHANCE_CANDY) {
    cell.entity = {
      id: newEntityId(),
      kind: 'food',
      type: 'candy',
      heal: CONFIG.CANDY_HEAL,
      variant: Math.random() < 0.5 ? 0 : 1
    };
    cell.type = 'food';
    log('🍬 В могиле конфета!');
    return 'candy';
  }

  return spawnDeadManFromGrave(cell, false);
}

// ============================================
// МЕРТВЕЦ ИЗ МОГИЛЫ (ПОЯВЛЯЕТСЯ СРАЗУ)
// ============================================
function spawnDeadManFromGrave(cell, guaranteed) {
  const hp = getEnemyHp('dead_man');

  cell.entity = {
    id: newEntityId(),
    kind: 'enemy',
    type: 'dead_man',
    hp,
    maxHp: hp,
    behavior: 'dead_man',
    risen: false,                // ← СНАЧАЛА ЛЕЖИТ
    buried: CONFIG.DEAD_MAN_BURIED_TURNS  // ← 3 ХОДА
  };
  cell.type = 'enemy';

  if (guaranteed) {
    log(`💀 Гарантированно потревожили мертвеца! Вылезет через ${CONFIG.DEAD_MAN_BURIED_TURNS}`);
  } else {
    log(`💀 Потревожили мертвеца! Вылезет через ${CONFIG.DEAD_MAN_BURIED_TURNS}`);
  }
  return 'dead_man';
}