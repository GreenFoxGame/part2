// ============================================
// ВСЕ НАСТРОЙКИ ИГРЫ — КЛАДБИЩЕ (Green Fox Season)
// ============================================

const CONFIG = {
  FIELD_SIZE: 4,

  PLAYER_START_HP: 10,
  PLAYER_MAX_HP: 10,
  PLAYER_START_X: 1,
  PLAYER_START_Y: 1,

    // ============================================
  // СКИНЫ ИГРОКОВ (по номеру, введённому на старте)
  // id — ключ в ICON_PATHS (render.js)
  // Если id нет в таблице — используется fox_idle
  // ============================================
  PLAYER_SKINS: {
    "6":  "skin_6",
  },

  MAX_ENEMIES_ON_FIELD: 9,
  MAX_WEAPONS_ON_FIELD: 6,

  CANDLES_UNLOCK_ALL: 7,
  ENEMY_HP_PER_CANDLE: 0.15,
  ENEMY_HP_CANDLE_CAP: 2.0,

  DEAD_MAN_HP_START: 2,
  DEAD_MAN_HP_MAX: 10,
  DEAD_MAN_HP_PER_TURN: 0.15,
  DEAD_MAN_BURIED_TURNS: 3,

  WEAPON_HP_CALIBRATION: {
    ENEMY_HP_DIVISOR: 20,
    MIN_ENEMY_FACTOR: 0.7,
    MAX_ENEMY_FACTOR: 3.0,
    WEAPON_PENALTY_PER: 0.1,
    MIN_WEAPON_PENALTY: 0.6,
    RANDOM_MIN: 0.85,
    RANDOM_MAX: 1.15,
    CROSS_PENALTY: 0.55
  },

  GUARANTEED_SPAWN_INTERVAL: 10,
  GUARANTEED_SPAWN_IGNORE_LIMIT: true,

  FORGOTTEN_ENEMY_AFTER_TURNS: 12,
  FORGOTTEN_CHECK_INTERVAL: 5,

  SECTANT_COOLDOWN: 3,
  DEAD_MEN_FOR_NEKROFIL: 3,

  GRAVE_GUARANTEED_DEAD_MAN_CHANCE: 1.0,

  BASE_WEIGHTS: {
    dead_man: 0,
    ghost: 0,
    spirit_maiden: 0,
    sectant: 0,
    nekrofil: 6,
    shovel: 14,
    iron_rod: 14,
    dagger: 14,
    cross: 10,
    crowbar: 14,
    grave: 22,
    candy: 0,
    chapel: 0
  },

  GHOST_WEIGHT: 10,

  FOOD_MULT_BY_HP: [
    { hpRatio: 0.6, mult: 0.0, pieMult: 0.0 },
    { hpRatio: 0.4, mult: 0.2, pieMult: 0.1 },
    { hpRatio: 0.2, mult: 1.0, pieMult: 0.5 },
    { hpRatio: 0.0, mult: 2.0, pieMult: 1.0 }
  ],

  WEAPON_MULT_BY_ENEMIES: [
    { enemyCount: 0, mult: 1.0 },
    { enemyCount: 3, mult: 1.3 },
    { enemyCount: 6, mult: 1.7 },
    { enemyCount: 99, mult: 2.2 }
  ],

  ENEMY_MULT_BY_RESOURCES: [
    { resourceCount: 0, mult: 1.5 },
    { resourceCount: 3, mult: 1.2 },
    { resourceCount: 6, mult: 1.0 },
    { resourceCount: 10, mult: 0.8 },
    { resourceCount: 99, mult: 0.5 }
  ],

  ENEMY_GROWTH_PER_TURN: 0.01,
  ENEMY_MAX_MULTIPLIER: 1.5,
  RESOURCE_DECAY_PER_TURN: 0.003,
  RESOURCE_MIN_MULTIPLIER: 0.8,

  CANDY_HEAL: 2,

  WEAPONS: {
    shovel: { name: 'Лопата', hp: 5, icon: '🪏' },
    iron_rod: { name: 'Железный прут', hp: 6, icon: '🦯' },
    dagger: { name: 'Кинжал', hp: 5, icon: '🗡️' },
    cross: { name: 'Деревянный крест', hp: 4, icon: '✝️' },
    crowbar: { name: 'Ржавый лом', hp: 7, icon: '🔧' }
  },

  ENEMIES: {
    dead_man: { name: 'Мертвец', icon: '💀', hpMin: 2, hpMax: 2, behavior: 'dead_man', reward: null },
    spirit_maiden: { name: 'Дух блудной девы', icon: '👻', hpMin: 7, hpMax: 10, behavior: 'chase_seduce', reward: null },
    ghost: { name: 'Призрак', icon: '👤', hpMin: 6, hpMax: 9, behavior: 'static', reward: null },
    sectant: { name: 'Сектант', icon: '🧙', hpMin: 4, hpMax: 6, behavior: 'summon', reward: 'candle' },
        nekrofil: { name: 'Некрофил', icon: '🧟‍♂️', hpMin: 3, hpMax: 5, behavior: 'scare_dead_man', reward: 'shovel' }
  },

  CHAPEL_TURNS: 3,
  CHAPEL_HEAL: 2,

  GRAVE_CHANCE_CANDLE: 0.35,
  GRAVE_CHANCE_CANDY: 0.20
};

// ============================================
// ВЗВЕШЕННЫЙ РАНДОМ
// ============================================
function weightedRandom(weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function randomHp(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getWeaponHp(type) {
  const base = CONFIG.WEAPONS[type].hp;
  const cal = CONFIG.WEAPON_HP_CALIBRATION;

  let totalEnemyHp = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'enemy') totalEnemyHp += e.hp;
    }

  let enemyFactor = 1 + (totalEnemyHp / cal.ENEMY_HP_DIVISOR);
  enemyFactor = Math.max(cal.MIN_ENEMY_FACTOR, Math.min(cal.MAX_ENEMY_FACTOR, enemyFactor));

  const weaponCount = countWeapons();
  let weaponPenalty = 1 - (weaponCount * cal.WEAPON_PENALTY_PER);
  weaponPenalty = Math.max(cal.MIN_WEAPON_PENALTY, weaponPenalty);

  const randomFactor = cal.RANDOM_MIN + Math.random() * (cal.RANDOM_MAX - cal.RANDOM_MIN);

  let finalHp = base * enemyFactor * weaponPenalty * randomFactor;

  if (type === 'cross') finalHp *= cal.CROSS_PENALTY;
  if (isNaN(finalHp) || finalHp === undefined) finalHp = base;

  return Math.max(1, Math.round(finalHp));
}

function getEnemyHp(type) {
  const cfg = CONFIG.ENEMIES[type];

  if (type === 'dead_man') {
    const turn = (typeof gameTurn !== 'undefined') ? gameTurn : 0;
    const raw = CONFIG.DEAD_MAN_HP_START + turn * CONFIG.DEAD_MAN_HP_PER_TURN;
    return Math.max(1, Math.min(CONFIG.DEAD_MAN_HP_MAX, Math.round(raw)));
  }

  const baseHp = Math.floor(Math.random() * (cfg.hpMax - cfg.hpMin + 1)) + cfg.hpMin;
  const candles = (typeof player !== 'undefined' && player) ? player.candles : 0;
  let mult = 1 + candles * CONFIG.ENEMY_HP_PER_CANDLE;
  mult = Math.min(mult, CONFIG.ENEMY_HP_CANDLE_CAP);
  return Math.max(1, Math.round(baseHp * mult));
}

function countEnemies() {
  let n = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'enemy') n++;
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

function countWeapons() {
  let n = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.kind === 'weapon') n++;
    }
  return n;
}

function countResources() {
  let n = 0;
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++)
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && (e.kind === 'weapon' || e.kind === 'food' || e.kind === 'grave' || e.kind === 'chapel')) n++;
    }
  return n;
}

function getMultiplier(table, value) {
  for (const row of table) {
    const threshold = row.hpRatio ?? row.enemyCount ?? row.resourceCount;
    if (value <= threshold) return row.mult;
  }
  return table[table.length - 1].mult;
}

function allUnlocked() {
  const candles = (typeof player !== 'undefined' && player) ? player.candles : 0;
  return candles >= CONFIG.CANDLES_UNLOCK_ALL;
}

// ============================================
// ВЕСА СПАВНА
// ============================================
function getSpawnWeights() {
  const base = { ...CONFIG.BASE_WEIGHTS };

  // Мертвец и конфета — только из могил
  base.dead_man = 0;
  base.candy = 0;

  const lateEnemies = ['ghost', 'spirit_maiden', 'sectant'];
  const weaponKeys = ['shovel', 'iron_rod', 'dagger', 'cross', 'crowbar'];
  const resourceKeys = ['grave', 'shovel', 'iron_rod', 'dagger', 'cross', 'crowbar', 'chapel'];

  if (!allUnlocked()) {
    for (const k of lateEnemies) base[k] = 0;
    for (const k of weaponKeys) {
      if (base[k] !== undefined) base[k] *= 0.35;
    }

    // До 7 свечей могил чуть больше — чтобы мертвецы появлялись
    if (base.grave !== undefined) base.grave *= 1.8;
  } else {
    base.ghost = 10;
    base.spirit_maiden = 5;
    base.sectant = 5;
  }

  const enemyCount = countEnemies();
  const weaponMult = getMultiplier(CONFIG.WEAPON_MULT_BY_ENEMIES, enemyCount);
  for (const w of weaponKeys) {
    if (base[w] !== undefined && base[w] > 0) base[w] *= weaponMult;
  }

  const resourceCount = countResources();
  const enemyMult = getMultiplier(CONFIG.ENEMY_MULT_BY_RESOURCES, resourceCount);
  for (const key of ['nekrofil', ...lateEnemies]) {
    if (base[key] !== undefined && base[key] > 0) base[key] *= enemyMult;
  }

  const turn = (typeof gameTurn !== 'undefined') ? gameTurn : 0;
  const timeEnemyMult = Math.min(1 + turn * CONFIG.ENEMY_GROWTH_PER_TURN, CONFIG.ENEMY_MAX_MULTIPLIER);
  const timeResourceMult = Math.max(1 - turn * CONFIG.RESOURCE_DECAY_PER_TURN, CONFIG.RESOURCE_MIN_MULTIPLIER);

  for (const key of ['nekrofil', ...lateEnemies]) {
    if (base[key] !== undefined && base[key] > 0) base[key] *= timeEnemyMult;
  }
  for (const key of resourceKeys) {
    if (base[key] !== undefined) base[key] *= timeResourceMult;
  }

  // ============================================
  // ЖЁСТКИЙ ЛИМИТ: не более 2 Некрофилов на поле
  // ============================================
  if (countNekrofil() >= 2) {
    if (base.nekrofil !== undefined) base.nekrofil = 0;
  }

  if (enemyCount >= CONFIG.MAX_ENEMIES_ON_FIELD) {
    for (const key of ['nekrofil', ...lateEnemies]) {
      if (base[key] !== undefined) base[key] = 0;
    }
  }

  const weaponCount = countWeapons();
  if (weaponCount >= CONFIG.MAX_WEAPONS_ON_FIELD) {
    for (const key of weaponKeys) {
      if (base[key] !== undefined) base[key] = 0;
    }
  }

  const total = Object.values(base).reduce((s, w) => s + (w > 0 ? w : 0), 0);
  if (total === 0) base.grave = 1;

  return base;
}