// ============================================
// ОТРИСОВКА
// ============================================

let fieldInitialized = false;
let cardMap = {};
let clickSlots = [];
let cardWidth = 0;
let cardHeight = 0;
let gapSize = 6;
let paddingSize = 0;

const ICON_PATHS = {
  fox_idle:     'assets/characters/fox_idle.png',
  fox_shovel:   'assets/characters/fox_shovel.png',
  fox_iron_rod: 'assets/characters/fox_iron_rod.png',
  fox_dagger:   'assets/characters/fox_dagger.png',
  fox_cross:    'assets/characters/fox_cross.png',
  fox_crowbar:  'assets/characters/fox_crowbar.png',

  // Скин 6-го игрока: без оружия и со всеми оружиями
  skin_6:            'assets/characters/skin_6.png',
  skin_6_shovel:     'assets/characters/skin_6_shovel.png',
  skin_6_iron_rod:   'assets/characters/skin_6_iron_rod.png',
  skin_6_dagger:     'assets/characters/skin_6_dagger.png',
  skin_6_cross:      'assets/characters/skin_6_cross.png',
  skin_6_crowbar:    'assets/characters/skin_6_crowbar.png',

  dead_man_1: 'assets/characters/dead_man_1.png',
  dead_man_2: 'assets/characters/dead_man_2.png',

  spirit_maiden_1: 'assets/characters/spirit_maiden_1.png',
  spirit_maiden_2: 'assets/characters/spirit_maiden_2.png',

  ghost_1: 'assets/characters/ghost_1.png',
  ghost_2: 'assets/characters/ghost_2.png',

  sectant: 'assets/characters/sectant.png',

  nekrofil: 'assets/characters/nekrofil.png',

  shovel:   'assets/characters/shovel.png',
  iron_rod: 'assets/characters/iron_rod.png',
  dagger:   'assets/characters/dagger.png',
  cross:    'assets/characters/cross.png',
  crowbar:  'assets/characters/crowbar.png',

  grave:  'assets/characters/grave.png',
  chapel: 'assets/characters/chapel.png',
  candy_1: 'assets/characters/candy_1.png',
  candy_2: 'assets/characters/candy_2.png',
  candle:  'assets/characters/candle.png'
};

function getIconHTML(iconKey, emoji) {
  const path = ICON_PATHS[iconKey];
  const fallback = emoji || '';
  if (path) {
    const safeFallback = String(fallback).replace(/'/g, "\\'");
    return `<img src="${path}" alt="" class="card-img"
                 onerror="this.style.display='none'; this.insertAdjacentHTML('afterend','${safeFallback}')">`;
  }
  return fallback;
}

// ============================================
// ВЫБОР СКИНА ИГРОКА
// 1) если есть CONFIG.PLAYER_SKINS[playerId] — берём оттуда
// 2) иначе если есть оружие — fox_<weapon>
// 3) иначе fox_idle
// ============================================
function getPlayerSkinKey() {
  const hasSkin = typeof playerId !== 'undefined'
    && playerId
    && CONFIG.PLAYER_SKINS
    && CONFIG.PLAYER_SKINS[String(playerId)];

  // Считаем «настоящим» скином всё, кроме fox_idle
  if (hasSkin) {
    const baseSkin = CONFIG.PLAYER_SKINS[String(playerId)];

    if (baseSkin !== 'fox_idle') {
      // Настоящий скин — с оружием skin_<weapon>, иначе сам скин
      if (player.weapon) {
        const withWeapon = baseSkin + '_' + player.weapon.type;
        if (ICON_PATHS[withWeapon]) return withWeapon;
      }
      if (ICON_PATHS[baseSkin]) return baseSkin;
    }
  }

  // Обычный лис с оружием / без
  if (player.weapon) {
    const foxWeapon = 'fox_' + player.weapon.type;
    if (ICON_PATHS[foxWeapon]) return foxWeapon;
  }
  return 'fox_idle';
}

// ============================================
// ГЕОМЕТРИЯ
// ============================================
function measureField() {
  const fieldEl = document.getElementById('field');
  const style = getComputedStyle(fieldEl);
  const padding = parseFloat(style.paddingLeft) || 0;

  const innerW = fieldEl.clientWidth - padding * 2;
  const innerH = fieldEl.clientHeight - padding * 2;

  const size = CONFIG.FIELD_SIZE;
  const gap = 6;

  cardWidth = (innerW - gap * (size - 1)) / size;
  cardHeight = (innerH - gap * (size - 1)) / size;

  gapSize = gap;
  paddingSize = padding;
}

function cellToPx(x, y) {
  const left = paddingSize + x * (cardWidth + gapSize);
  const top  = paddingSize + y * (cardHeight + gapSize);
  return { left, top };
}

function initFieldDOM() {
  const field = document.getElementById('field');
  field.innerHTML = '';
  cardMap = {};
  clickSlots = [];

  measureField();

  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    clickSlots[y] = [];
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const slot = document.createElement('div');
      slot.className = 'click-slot';
      slot.style.width = cardWidth + 'px';
      slot.style.height = cardHeight + 'px';

      const pos = cellToPx(x, y);
      slot.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
      slot.addEventListener('click', () => onCellClick(x, y));

      field.appendChild(slot);
      clickSlots[y][x] = slot;
    }
  }

  fieldInitialized = true;
}

function getOrCreateCard(id) {
  if (cardMap[id]) return cardMap[id];

  const field = document.getElementById('field');
  const card = document.createElement('div');
  card.className = 'card empty';
  card.style.width = cardWidth + 'px';
  card.style.height = cardHeight + 'px';
  card.dataset.entityId = id;

  field.appendChild(card);
  cardMap[id] = { el: card, x: -1, y: -1, isNew: true };
  return cardMap[id];
}

function removeCard(id) {
  if (!cardMap[id]) return;
  cardMap[id].el.remove();
  delete cardMap[id];
}

function render() {
  if (!fieldInitialized) initFieldDOM();

  measureField();

  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const slot = clickSlots[y][x];
      slot.style.width = cardWidth + 'px';
      slot.style.height = cardHeight + 'px';
      const pos = cellToPx(x, y);
      slot.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
    }
  }

  const activeIds = new Set();
  activeIds.add('player');
  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (e && e.id) activeIds.add(e.id);
    }
  }

  for (const id of Object.keys(cardMap)) {
    if (!activeIds.has(id)) {
      removeCard(id);
    }
  }

  {
    const card = getOrCreateCard('player');
    card.el.style.width = cardWidth + 'px';
    card.el.style.height = cardHeight + 'px';
    updateCardContent(card.el, 'player', null);
    positionCard(card, player.x, player.y);
  }

  const skipAllNew = skipNextSpawnAnimation;
  skipNextSpawnAnimation = false;

  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const e = FIELD[y][x].entity;
      if (!e || !e.id) continue;

      const isNewCard = !cardMap[e.id];
      const card = getOrCreateCard(e.id);

      card.el.style.width = cardWidth + 'px';
      card.el.style.height = cardHeight + 'px';
      updateCardContent(card.el, e.kind, e);

      if (isNewCard) {
        card.x = x;
        card.y = y;
        card.isNew = false;

        if (skipAllNew) {
          const pos = cellToPx(x, y);
          card.el.style.transition = 'none';
          card.el.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
        } else {
          animateSpawn(card.el, x, y);
        }
      } else {
        positionCard(card, x, y);
      }
    }
  }

  updateHUD();
}

function positionCard(cardEntry, x, y) {
  const pos = cellToPx(x, y);
  const card = cardEntry.el;

  if (cardEntry.x === x && cardEntry.y === y) return;

  const wasFirst = (cardEntry.x === -1);
  const oldRect = card.getBoundingClientRect();
  card.style.transform = `translate(${pos.left}px, ${pos.top}px)`;

  cardEntry.x = x;
  cardEntry.y = y;

  if (wasFirst) return;

  const newRect = card.getBoundingClientRect();
  const dx = oldRect.left - newRect.left;
  const dy = oldRect.top - newRect.top;

  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

  card.style.transition = 'none';
  card.style.transform = `translate(${pos.left + dx}px, ${pos.top + dy}px)`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.style.transition = 'transform 0.3s ease-out';
      card.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
      setTimeout(() => { card.style.transition = ''; }, 310);
    });
  });
}

function animateSpawn(cardEl, x, y) {
  const pos = cellToPx(x, y);
  const dir = lastShiftDirection;

  let startLeft = pos.left;
  let startTop = pos.top;

  if (dir === 'right') {
    startLeft = -cardWidth - gapSize;
  } else if (dir === 'left') {
    startLeft = paddingSize * 2 + cardWidth * CONFIG.FIELD_SIZE + gapSize * CONFIG.FIELD_SIZE;
  } else if (dir === 'down') {
    startTop = -cardHeight - gapSize;
  } else if (dir === 'up') {
    startTop = paddingSize * 2 + cardHeight * CONFIG.FIELD_SIZE + gapSize * CONFIG.FIELD_SIZE;
  } else {
    cardEl.style.transition = 'none';
    cardEl.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
    return;
  }

  cardEl.style.transition = 'none';
  cardEl.style.transform = `translate(${startLeft}px, ${startTop}px)`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cardEl.style.transition = 'transform 0.3s ease-out';
      cardEl.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
      setTimeout(() => { cardEl.style.transition = ''; }, 310);
    });
  });
}

// ============================================
// КОНТЕНТ КАРТЫ
// ============================================
function updateCardContent(cardEl, kind, entity) {
  const keepPulse = cardEl.classList.contains('pulse');
  const keepPulsePlayer = cardEl.classList.contains('pulse-player');

  let html = '';
  let className = 'card';

  if (keepPulse) className += ' pulse';
  if (keepPulsePlayer) className += ' pulse-player';

  if (kind === 'player') {
    className += ' player';
    const skinKey = getPlayerSkinKey();

    html = `
      <div class="hp hp-player">${player.hp}</div>
      ${player.weapon ? `<div class="hp hp-weapon">${player.weapon.hp}</div>` : ''}
      <div class="icon">${getIconHTML(skinKey, '🦊')}</div>
      <div class="name">Лисёнок</div>
    `;
  } else if (!entity || entity.kind === 'empty') {
    className += ' empty';
    html = '';
  } else if (entity.kind === 'enemy') {
    className += ' enemy';
    const cfg = CONFIG.ENEMIES[entity.type];

    let iconKey = entity.type;

    if (entity.type === 'dead_man') {
      iconKey = entity.risen ? 'dead_man_2' : 'dead_man_1';
    } else if (entity.type === 'spirit_maiden') {
      iconKey = (entity.variant || 0) === 0 ? 'spirit_maiden_1' : 'spirit_maiden_2';
    } else if (entity.type === 'ghost') {
      iconKey = (entity.variant || 0) === 0 ? 'ghost_1' : 'ghost_2';
    }

    html = `
      <div class="hp">${entity.hp}</div>
      <div class="icon">${getIconHTML(iconKey, cfg.icon)}</div>
      <div class="name">${cfg.name}</div>
    `;
  } else if (entity.kind === 'weapon') {
    className += ' weapon';
    const cfg = CONFIG.WEAPONS[entity.type];
    html = `
      <div class="hp">${entity.hp}</div>
      <div class="icon">${getIconHTML(entity.type, cfg.icon)}</div>
      <div class="name">${cfg.name}</div>
    `;
  } else if (entity.kind === 'food') {
    className += ' item';
    const candyKey = (entity.variant || 0) === 0 ? 'candy_1' : 'candy_2';
    html = `
      <div class="icon">${getIconHTML(candyKey, '🍬')}</div>
      <div class="name">Конфета</div>
    `;
  } else if (entity.kind === 'grave') {
    className += ' grave';
    html = `
      <div class="icon">${getIconHTML('grave', '🪦')}</div>
      <div class="name">Могила</div>
    `;
  } else if (entity.kind === 'chapel') {
    className += ' chapel';
    html = `
      <div class="icon">${getIconHTML('chapel', '⛪')}</div>
      <div class="name">Часовня</div>
    `;
  } else if (entity.kind === 'candle') {
    className += ' candle';
    html = `
      <div class="icon">${getIconHTML('candle', '🕯️')}</div>
      <div class="name">Свеча</div>
    `;
  }

  if (cardEl._lastHTML !== html || cardEl._lastClass !== className) {
    cardEl._lastHTML = html;
    cardEl._lastClass = className;
    cardEl.className = className;
    cardEl.innerHTML = html;
  }

  // Пересчитываем шрифт имени (даже если html не менялся — на случай resize)
  fitCardName(cardEl);
}

// ============================================
// АДАПТИВНЫЙ ШРИФТ НАЗВАНИЯ
// Слова не рвутся. Максимум 2 строки.
// Минимум 5px — если не влезло, всё равно оставляем (не обрезаем!)
// ============================================
function fitCardName(cardEl) {
  const nameEl = cardEl.querySelector('.name');
  if (!nameEl) return;

  const text = (nameEl.textContent || '').trim();
  if (!text) return;

  // Сброс
  nameEl.style.fontSize = '';
  nameEl.style.lineHeight = '';
  nameEl.style.whiteSpace = '';
  nameEl.style.overflow = '';

  const cardRect = cardEl.getBoundingClientRect();
  const maxW = Math.max(0, cardRect.width - 8);
  const maxH = Math.max(0, cardRect.height * 0.4);
  if (maxW <= 0 || maxH <= 0) return;

  const cs = getComputedStyle(nameEl);
  const fontFamily = cs.fontFamily;
  const baseSize = parseFloat(cs.fontSize) || 12;

  const words = text.split(/\s+/);
  const maxLines = words.length >= 2 ? 2 : 1;

  let size = baseSize;

  while (size > 5) {
    // каждое слово должно влезть в одну строку
    const widest = widestWordWidth(text, size, fontFamily);
    if (widest > maxW) {
      size -= 1;
      continue;
    }

    const lines = measureLines(text, size, fontFamily, maxW);
    const totalH = lines * size * 1.15;

    if (lines <= maxLines && totalH <= maxH) break;

    size -= 1;
  }

  // Применяем
  nameEl.style.fontSize = size + 'px';
  nameEl.style.lineHeight = '1.15';

  // Гарантия: даже если не влезло — не обрезаем
  nameEl.style.whiteSpace = 'normal';
  nameEl.style.overflow = 'visible';
}

function measureLines(text, size, fontFamily, maxWidth) {
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.left = '-9999px';
  probe.style.top = '-9999px';
  probe.style.width = maxWidth + 'px';
  probe.style.fontFamily = fontFamily;
  probe.style.fontSize = size + 'px';
  probe.style.lineHeight = '1.15';
  probe.style.whiteSpace = 'normal';
  probe.style.wordBreak = 'keep-all';
  probe.style.overflowWrap = 'normal';
  probe.style.textAlign = 'center';
  probe.textContent = text;

  document.body.appendChild(probe);
  const lh = size * 1.15;
  const lines = Math.max(1, Math.round(probe.scrollHeight / lh));
  document.body.removeChild(probe);
  return lines;
}

function widestWordWidth(text, size, fontFamily) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${size}px ${fontFamily}`;
  let max = 0;
  for (const w of text.split(/\s+/)) {
    const width = ctx.measureText(w).width;
    if (width > max) max = width;
  }
  return max;
}

function measureLines(text, size, fontFamily, maxWidth) {
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.left = '-9999px';
  probe.style.top = '-9999px';
  probe.style.width = maxWidth + 'px';
  probe.style.fontFamily = fontFamily;
  probe.style.fontSize = size + 'px';
  probe.style.lineHeight = '1.15';
  probe.style.whiteSpace = 'normal';
  probe.style.wordBreak = 'keep-all';
  probe.style.overflowWrap = 'normal';
  probe.style.textAlign = 'center';
  probe.textContent = text;

  document.body.appendChild(probe);
  const lh = size * 1.15;
  const lines = Math.max(1, Math.round(probe.scrollHeight / lh));
  document.body.removeChild(probe);
  return lines;
}

function widestWordWidth(text, size, fontFamily) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${size}px ${fontFamily}`;
  let max = 0;
  for (const w of text.split(/\s+/)) {
    const width = ctx.measureText(w).width;
    if (width > max) max = width;
  }
  return max;
}

// ============================================
// HUD, анимации, лог, resize
// ============================================
function updateHUD() {
  document.getElementById('score').textContent = `🕯️ ${player.candles}`;
}

function animateHitById(id, type) {
  const entry = cardMap[id];
  if (!entry) return;

  const className = type === 'player' ? 'pulse-player' : 'pulse';
  entry.el.classList.add(className);

  setTimeout(() => {
    entry.el.classList.remove(className);
  }, 500);
}

function animateHit(x, y, type) {
  if (type === 'player') {
    animateHitById('player', 'player');
  } else {
    const cell = getCell(x, y);
    if (cell && cell.entity && cell.entity.id) {
      animateHitById(cell.entity.id, 'enemy');
    }
  }
}

function log(msg) {
  const logEl = document.getElementById('log');
  if (!logEl) return;
  const line = document.createElement('div');
  line.textContent = msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
  while (logEl.children.length > 30) {
    logEl.removeChild(logEl.firstChild);
  }
}

function handleResize() {
  if (!fieldInitialized) return;

  measureField();

  for (let y = 0; y < CONFIG.FIELD_SIZE; y++) {
    for (let x = 0; x < CONFIG.FIELD_SIZE; x++) {
      const slot = clickSlots[y][x];
      slot.style.width = cardWidth + 'px';
      slot.style.height = cardHeight + 'px';
      const pos = cellToPx(x, y);
      slot.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
    }
  }

  for (const id in cardMap) {
    cardMap[id].x = -1;
    cardMap[id].y = -1;
  }

  render();
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
  setTimeout(handleResize, 150);
});