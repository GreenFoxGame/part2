// ============================================
// ИГРОК
// ============================================

let player = {
  x: 1, y: 1,
  hp: 10,
  weapon: null,
  candles: 0,
  score: 0
};

let playerWasHit = false;
let playerHitX = null;
let playerHitY = null;

function initPlayer() {
  player.x = CONFIG.PLAYER_START_X;
  player.y = CONFIG.PLAYER_START_Y;
  player.hp = CONFIG.PLAYER_START_HP;
  player.weapon = null;
  player.candles = 0;
  player.score = 0;
  playerWasHit = false;
  playerHitX = null;
  playerHitY = null;
}

function playerTakeDamage(amount) {
  player.hp -= amount;
  playerWasHit = true;
  if (playerHitX === null) {
    playerHitX = player.x;
    playerHitY = player.y;
  }
  log(`Игрок получает ${amount} урона. HP: ${player.hp}`);
  if (player.hp <= 0) gameOver();
}

function playerHeal(amount) {
  player.hp += amount;
  if (player.hp > CONFIG.PLAYER_MAX_HP) {
    player.hp = CONFIG.PLAYER_MAX_HP;
  }
  log(`Игрок восстанавливает ${amount} HP. HP: ${player.hp}`);
}

function playerPickupWeapon(newWeapon) {
  if (!player.weapon) {
    player.weapon = newWeapon;
    log(`Взял ${CONFIG.WEAPONS[newWeapon.type].name} (${newWeapon.hp} HP)`);
    if (newWeapon.type === 'cross') {
      scareEnemiesAround();
    }
    return true;
  }
  if (newWeapon.hp > player.weapon.hp) {
    log(`Выкинул ${CONFIG.WEAPONS[player.weapon.type].name}, взял ${CONFIG.WEAPONS[newWeapon.type].name}`);
    player.weapon = newWeapon;
    if (newWeapon.type === 'cross') {
      scareEnemiesAround();
    }
    return true;
  }
  log(`Не взял ${CONFIG.WEAPONS[newWeapon.type].name} — хуже текущего`);
  return false;
}

function addCandle(n = 1) {
  player.candles += n;
  log(`🕯️ Свеча! Всего: ${player.candles}`);
}