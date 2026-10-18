'use strict';
// 魂匠收編 — 玩法驗證 Demo。邏輯在 update, 繪製只呼叫 Art.drawXxx。
// 沒有佔位圖形(Placeholder 不需要)。

const CW = Art.canvas.width, CH = Art.canvas.height;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
(function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(CW * dpr);
  canvas.height = Math.round(CH * dpr);
  canvas.style.width = CW + 'px';
  canvas.style.height = CH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
})();

// ---------- 常數 ----------
const PADS = [[300, 100], [760, 100], [520, 278], [520, 492], [300, 670], [760, 670]];
const LANES = [
  { name: 'top', y: 170, pts: [[0, 170], [1040, 170], [1180, 385]] },
  { name: 'mid', y: 385, pts: [[0, 385], [1180, 385]] },
  { name: 'bottom', y: 600, pts: [[0, 600], [1040, 600], [1180, 385]] }
];
LANES.forEach(function (l) {
  l.cum = [0];
  for (let i = 1; i < l.pts.length; i++) {
    l.cum[i] = l.cum[i - 1] + Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]);
  }
  l.len = l.cum[l.cum.length - 1];
});
const CASTLE_X = 1180, CASTLE_Y = 385, CASTLE_R = 56;
const TOTAL_WAVES = 6, RECRUIT_TOTAL = 5;
const SOULS = ['ranged', 'melee', 'guard', 'seek', 'march'];

// 我方單位
const UT = {
  tower:   { hp: 150, cap: 2, half: 24, speed: 0,  start: [] },
  soldier: { hp: 80,  cap: 2, half: 16, speed: 50, start: ['melee'] },
  wolf:    { hp: 90,  cap: 2, half: 18, speed: 70, start: ['melee', 'seek'] },
  imp:     { hp: 30,  cap: 2, half: 16, speed: 45, start: ['melee'] },
  archer:  { hp: 24,  cap: 2, half: 16, speed: 45, start: ['ranged'] },
  shield:  { hp: 60,  cap: 3, half: 20, speed: 36, start: ['guard', 'melee'] },
  elite:   { hp: 160, cap: 4, half: 30, speed: 35, start: ['melee', 'melee', 'guard'] }
};
// 敵人
const ET = {
  imp:    { hp: 30,  speed: 45, half: 16, slots: ['melee', 'march'], coins: 1, dmg: 2 },
  archer: { hp: 24,  speed: 45, half: 16, slots: ['ranged', 'march'], coins: 2, dmg: 2 },
  shield: { hp: 60,  speed: 36, half: 20, slots: ['guard', 'melee', 'march'], coins: 3, dmg: 3 },
  elite:  { hp: 160, speed: 35, half: 30, slots: ['melee', 'melee', 'guard', 'march'], coins: 8, dmg: 6 }
};
const KIT_KIND = { soldierKit: 'soldier', wolfKit: 'wolf', impKit: 'imp', archerKit: 'archer', shieldKit: 'shield', eliteKit: 'elite' };
const KIND_NAME = { tower: '箭塔', soldier: '步兵', wolf: '野狼', imp: '小鬼', archer: '弓鬼', shield: '盾鬼', elite: '魂王鬼' };
const SHOP = [
  { key: '1', name: '箭塔材料', price: 15, item: 'towerKit' },
  { key: '2', name: '步兵', price: 12, item: 'soldierKit' },
  { key: '3', name: '遠攻魂件', price: 10, item: 'ranged' },
  { key: '4', name: '近戰魂件', price: 10, item: 'melee' },
  { key: '5', name: '擴槽石', price: 20, item: 'slotStone' },
  { key: '6', name: '野狼', price: 12, item: 'wolfKit', unlock: 'wolf' },
  { key: '7', name: '小鬼兵', price: 8, item: 'impKit', unlock: 'imp' },
  { key: '8', name: '弓鬼兵', price: 10, item: 'archerKit', unlock: 'archer' },
  { key: '9', name: '盾鬼兵', price: 16, item: 'shieldKit', unlock: 'shield' },
  { key: '0', name: '魂王兵', price: 30, item: 'eliteKit', unlock: 'elite' }
];

// 波次: [上, 中, 下]
function rep(t, n) { const a = []; for (let i = 0; i < n; i++) a.push(t); return a; }
const WAVES = [
  [[], rep('imp', 5), []],
  [rep('imp', 4).concat(rep('archer', 2)), [], []],
  [[], ['elite'].concat(rep('imp', 3)), rep('shield', 3)],
  [rep('archer', 4).concat(rep('shield', 2)), [], rep('imp', 5)],
  [rep('imp', 3), rep('imp', 3).concat(['elite']), rep('imp', 3)],
  [0, 1, 2].map(function (l) { return rep('imp', 3).concat(rep('archer', 2), rep('shield', 1), l === 2 ? ['elite'] : []); })
];
function waveStart(k) { return 12 + k * 24; } // k 從 0 起算
const EVENTS = [];
WAVES.forEach(function (w, k) {
  w.forEach(function (list, lane) {
    list.forEach(function (t, i) { EVENTS.push({ time: waveStart(k) + i * 1.3, lane: lane, type: t }); });
  });
});
EVENTS.sort(function (a, b) { return a.time - b.time; });

// ---------- 說明頁 ----------
const GUIDE = [
  ['守住主堡', '撐過 6 波, 別讓鬼走進主堡'],
  ['移動與撿錢', 'WASD 移動, 走過金幣就撿起'],
  ['拿魂件', '按 J 開窗, ← → 選格, J 拿起'],
  ['搶活鬼', '活鬼也能搶, 要貼著撐一下'],
  ['裝上與互換', '拿著魂件對格子按 J, 裝上或互換'],
  ['收編', '拆光變中立, 裝進攻主堡就投靠'],
  ['購買與放兵', '主堡旁按數字鍵買, J 放下']
];
const GF = { x: 280, y: 150, w: 720, h: 360 }; // 示意圖框(左上角), 文字都在框外

// ---------- 狀態 ----------
let units, corpses, coins, grounds, projs, areaHits, sparks, combos, respawns, pads, castle;
let player, hand, steal, popup, gold, gt, evIdx, unlocked, seen, over, overAge, target;
let guideOpen = true, guidePage = 0, jBlock = false;
const keys = {};

function resetGame() {
  units = []; corpses = []; coins = []; grounds = []; projs = []; areaHits = []; sparks = []; combos = []; respawns = [];
  castle = { kind: 'castle', team: 'ally', x: CASTLE_X, y: CASTLE_Y, half: CASTLE_R, slots: ['ranged', 'ranged', null], cap: 3,
    hp: 20, maxHp: 20, hitAge: 1, attackAge: 1, cdR: 0, cdM: 0 };
  pads = PADS.map(function (p) { return { x: p[0], y: p[1], tower: null, rebuild: 0, saved: null }; });
  [1, 3].forEach(function (i) {
    const t = mkAlly('tower', pads[i].x, pads[i].y, -1);
    t.slots = ['ranged', null]; t.pad = pads[i]; pads[i].tower = t;
  });
  [[200, 278], [200, 492]].forEach(function (p) {
    const w = mkAlly('wolf', p[0], p[1], -1); w.team = 'neutral'; w.slots = [null, null];
  });
  player = { x: 1060, y: 480, moving: false };
  hand = null; steal = null; popup = null; gold = 40; gt = 0; evIdx = 0;
  unlocked = {}; seen = {}; over = null; overAge = 0; target = null;
}

function mkUnit(kind, team, x, y, o) {
  const u = { kind: kind, team: team, x: x, y: y, hp: o.hp, maxHp: o.hp, slots: o.slots, cap: o.slots.length, half: o.half, speed: o.speed,
    lane: o.lane, hitAge: 1, attackAge: 1, cdR: 0, cdM: 0, moving: false, facing: o.facing, dead: false, removed: false,
    entering: false, pad: null, returning: false, coins: o.coins || 0, dmg: o.dmg || 0 };
  units.push(u);
  return u;
}
function padSlots(arr, cap) { const s = arr.slice(); while (s.length < cap) s.push(null); return s; }
function mkAlly(kind, x, y, lane) {
  const t = UT[kind];
  return mkUnit(kind, 'ally', x, y, { hp: t.hp, slots: padSlots(t.start, t.cap), half: t.half, speed: t.speed, lane: lane, facing: -1 });
}
function mkEnemy(type, lane) {
  const t = ET[type];
  return mkUnit(type, 'enemy', 10, LANES[lane].y, { hp: t.hp, slots: t.slots.slice(), half: t.half, speed: t.speed, lane: lane, facing: 1, coins: t.coins, dmg: t.dmg });
}

// ---------- 工具 ----------
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function cnt(slots, k) { let n = 0; for (let i = 0; i < slots.length; i++) if (slots[i] === k) n++; return n; }
function isSoul(it) { return SOULS.indexOf(it) >= 0; }
function guardMult(n) { return n <= 0 ? 1 : n === 1 ? 0.5 : n === 2 ? 0.25 : 0.1; }
function lvName(kind, n) {
  if (kind === 'ranged') return n >= 3 ? '箭雨' : n === 2 ? '連射' : null;
  if (kind === 'melee') return n >= 3 ? '裂地斬' : n === 2 ? '旋風斬' : null;
  return n >= 3 ? '不動城' : n === 2 ? '堅守' : null;
}
function lvNames(slots) { return ['ranged', 'melee', 'guard'].map(function (k) { return lvName(k, cnt(slots, k)); }); }
function project(l, x, y) {
  let best = null;
  for (let i = 1; i < l.pts.length; i++) {
    const ax = l.pts[i - 1][0], ay = l.pts[i - 1][1], bx = l.pts[i][0], by = l.pts[i][1];
    const sl = Math.hypot(bx - ax, by - ay);
    let t = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (sl * sl);
    t = Math.max(0, Math.min(1, t));
    const px = ax + (bx - ax) * t, py = ay + (by - ay) * t, d = Math.hypot(x - px, y - py);
    if (!best || d < best.d) best = { x: px, y: py, d: d, s: l.cum[i - 1] + t * sl };
  }
  return best;
}
function pointAt(l, s) {
  s = Math.max(0, Math.min(l.len, s));
  for (let i = 1; i < l.pts.length; i++) {
    if (s <= l.cum[i] || i === l.pts.length - 1) {
      const sl = l.cum[i] - l.cum[i - 1], t = sl > 0 ? (s - l.cum[i - 1]) / sl : 0;
      return { x: l.pts[i - 1][0] + (l.pts[i][0] - l.pts[i - 1][0]) * t, y: l.pts[i - 1][1] + (l.pts[i][1] - l.pts[i - 1][1]) * t };
    }
  }
}
function moveToward(u, tx, ty, sp, dt) {
  const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
  if (d < 0.001) return true;
  if (Math.abs(dx) > 0.5) u.facing = dx > 0 ? 1 : -1;
  const step = sp * dt;
  u.moving = true;
  if (step >= d) { u.x = tx; u.y = ty; return true; }
  u.x += dx / d * step; u.y += dy / d * step;
  return false;
}
function followPath(u, dir, dt) {
  const l = LANES[u.lane], pr = project(l, u.x, u.y);
  if (pr.d > 2) { moveToward(u, pr.x, pr.y, u.speed, dt); return; }
  if (dir < 0 && pr.s <= 40) return;
  let ns = pr.s + dir * u.speed * dt;
  if (dir < 0) ns = Math.max(ns, 40);
  const p = pointAt(l, ns);
  if (Math.abs(p.x - u.x) > 0.01) u.facing = p.x > u.x ? 1 : -1;
  u.x = p.x; u.y = p.y; u.moving = true;
}
function placePoint() {
  let best = null;
  LANES.forEach(function (l, i) {
    const cx = Math.max(0, Math.min(1040, player.x)), cy = l.y, d = Math.hypot(player.x - cx, player.y - cy);
    if (!best || d < best.d) best = { x: cx, y: cy, d: d, lane: i };
  });
  best.valid = best.d <= 40;
  return best;
}
function cornerHalf(kind) { return ET[kind].half; }

// ---------- 戰鬥 ----------
function hurt(h, amt, spark) {
  if (h.dead) return;
  h.hp -= amt * guardMult(cnt(h.slots, 'guard'));
  h.hitAge = 0;
  if (spark) sparks.push({ x: h.x, y: h.y, age: 0 });
  if (h.hp <= 0) { h.hp = 0; h.dead = true; }
}
function pickTarget(u, hostiles, range, touch) {
  let best = null, bd = 1e9, tb = null, tbd = 1e9;
  for (let i = 0; i < hostiles.length; i++) {
    const h = hostiles[i];
    if (h.dead) continue;
    const d = dist(u, h);
    if (touch ? d > u.half + h.half + 12 : d > range) continue;
    if (d < bd) { bd = d; best = h; }
    const g = cnt(h.slots, 'guard');
    if (g >= 2 && d <= (g >= 3 ? 140 : 100) && d < tbd) { tbd = d; tb = h; }
  }
  return tb || best;
}
function doAttacks(u, hostiles) {
  let engaged = false;
  const nR = cnt(u.slots, 'ranged'), nM = cnt(u.slots, 'melee');
  if (nR > 0) {
    const t = pickTarget(u, hostiles, nR >= 3 ? 220 : 200, false);
    if (t) {
      engaged = true;
      if (u.cdR <= 0) {
        u.attackAge = 0;
        if (nR >= 3) {
          u.cdR = 1.0;
          const dmg = 16 + 8 * (nR - 3);
          for (let i = 0; i < hostiles.length; i++) {
            const h = hostiles[i];
            if (!h.dead && Math.hypot(h.x - t.x, h.y - t.y) <= 60) hurt(h, dmg, false);
          }
          areaHits.push({ kind: 'rain', x: t.x, y: t.y, radius: 60, team: u.team, age: 0 });
        } else {
          u.cdR = nR === 2 ? 0.4 : 1.0;
          projs.push({ x: u.x, y: u.y, team: u.team, target: t, angle: Math.atan2(t.y - u.y, t.x - u.x), dmg: 8 });
        }
      }
    }
  }
  if (nM > 0) {
    if (nM === 1) {
      const t = pickTarget(u, hostiles, 0, true);
      if (t) {
        engaged = true;
        if (u.cdM <= 0) { u.cdM = 0.8; u.attackAge = 0; hurt(t, 12, true); }
      }
    } else {
      const r = nM >= 3 ? 90 : 60;
      let any = false;
      for (let i = 0; i < hostiles.length; i++) if (!hostiles[i].dead && dist(u, hostiles[i]) <= r) { any = true; break; }
      if (any) {
        engaged = true;
        if (u.cdM <= 0) {
          u.cdM = 0.8; u.attackAge = 0;
          const dmg = nM >= 3 ? 26 + 8 * (nM - 3) : 16;
          for (let i = 0; i < hostiles.length; i++) if (!hostiles[i].dead && dist(u, hostiles[i]) <= r) hurt(hostiles[i], dmg, false);
          areaHits.push({ kind: nM >= 3 ? 'quake' : 'whirl', x: u.x, y: u.y, radius: r, team: u.team, age: 0 });
        }
      }
    }
  }
  return engaged;
}

function nearestHostile(u, hostiles, range) {
  let best = null, bd = 1e9;
  for (let i = 0; i < hostiles.length; i++) {
    const h = hostiles[i];
    if (h.dead) continue;
    const d = dist(u, h);
    if (d <= range && d < bd) { bd = d; best = h; }
  }
  return best;
}

let allyList = [], enemyList = [];
function updateUnit(u, dt) {
  u.hitAge += dt; u.attackAge += dt; u.cdR -= dt; u.cdM -= dt;
  u.moving = false;
  if (u.team === 'neutral') {
    if (u.slots.indexOf('march') >= 0) {
      moveToward(u, CASTLE_X, CASTLE_Y, 45, dt);
      if (dist(u, castle) <= CASTLE_R + 10) recruit(u);
    }
    return;
  }
  const hostiles = u.team === 'enemy' ? allyList : enemyList;
  if (doAttacks(u, hostiles)) return;
  const nS = cnt(u.slots, 'seek'), hasMarch = u.slots.indexOf('march') >= 0;
  if (u.kind === 'tower') {
    if (nS <= 0) return;
    const sp = Math.min(70 * nS, 140), pp = u.pad;
    const dp = Math.hypot(u.x - pp.x, u.y - pp.y);
    if (dp > 240) u.returning = true;
    if (u.returning) {
      if (moveToward(u, pp.x, pp.y, sp, dt)) u.returning = false;
      return;
    }
    const t = nearestHostile(u, hostiles, 240);
    if (t) {
      const stop = cnt(u.slots, 'ranged') > 0 ? 180 : u.half + t.half + 12;
      if (dist(u, t) > stop) moveToward(u, t.x, t.y, sp, dt);
    } else if (dp > 0.5) moveToward(u, pp.x, pp.y, sp, dt);
    return;
  }
  if (nS > 0) {
    const t = nearestHostile(u, hostiles, 240);
    if (t) {
      const stop = cnt(u.slots, 'ranged') > 0 ? 180 : u.half + t.half + 12;
      if (dist(u, t) > stop) moveToward(u, t.x, t.y, Math.min(70 * nS, 140), dt);
      return;
    }
  }
  if (u.team === 'enemy') {
    if (hasMarch) followPath(u, 1, dt);
    else if (nS > 0) {
      const pr = project(LANES[u.lane], u.x, u.y);
      if (pr.d > 2) moveToward(u, pr.x, pr.y, u.speed, dt);
    }
    return;
  }
  // 我方移動單位
  if (hasMarch) {
    if (dist(u, castle) > CASTLE_R + u.half) moveToward(u, CASTLE_X, CASTLE_Y, u.speed, dt);
  } else if (u.entering) {
    if (moveToward(u, 1000, LANES[u.lane].y, u.speed, dt)) u.entering = false;
  } else followPath(u, -1, dt);
}

function recruit(u) {
  u.removed = true;
  let k = 0;
  for (let i = 0; i < u.slots.length; i++) {
    if (u.slots[i]) { grounds.push({ item: u.slots[i], x: 1100 + 32 * k, y: 480 }); k++; }
  }
  unlocked[u.kind] = true;
}

function updateProjs(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i], t = p.target;
    const wantTeam = p.team === 'ally' ? 'enemy' : 'ally';
    if (t.dead || t.removed || t.team !== wantTeam) { projs.splice(i, 1); continue; }
    const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy), step = 400 * dt;
    if (d > 0.001) p.angle = Math.atan2(dy, dx);
    if (d <= step + 4) { hurt(t, p.dmg, true); projs.splice(i, 1); continue; }
    p.x += dx / d * step; p.y += dy / d * step;
  }
}

// ---------- 更新 ----------
function wavesStarted() { let n = 0; for (let k = 0; k < TOTAL_WAVES; k++) if (gt >= waveStart(k)) n++; return n; }

function update(dt, rdt) {
  gt += dt;
  while (evIdx < EVENTS.length && EVENTS[evIdx].time <= gt) { mkEnemy(EVENTS[evIdx].type, EVENTS[evIdx].lane); evIdx++; }

  // 玩家
  player.moving = false;
  if (!popup) {
    let dx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), dy = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
    if (dx || dy) {
      const l = Math.hypot(dx, dy);
      player.x = Math.max(16, Math.min(CW - 16, player.x + dx / l * 260 * dt));
      player.y = Math.max(66, Math.min(CH - 16, player.y + dy / l * 260 * dt));
      player.moving = true;
    }
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    if (Math.hypot(coins[i].x - player.x, coins[i].y - player.y) <= 34) { gold += 2; coins.splice(i, 1); }
  }

  // 搶奪
  if (steal) {
    const t = steal.tgt;
    if (t.dead || t.removed || t.team !== 'enemy' || Math.hypot(t.x - player.x, t.y - player.y) > t.half + 68) steal = null;
    else {
      steal.t += dt;
      if (steal.t >= 1.5) {
        if (hand === null && t.slots[steal.idx]) {
          hand = t.slots[steal.idx]; t.slots[steal.idx] = null;
          if (t.slots.every(function (s) { return !s; })) { t.team = 'neutral'; t.moving = false; }
        }
        steal = null;
      }
    }
  }

  allyList = units.filter(function (u) { return u.team === 'ally' && !u.dead; });
  enemyList = units.filter(function (u) { return u.team === 'enemy' && !u.dead; });
  const snapshot = units.slice();
  for (let i = 0; i < snapshot.length; i++) { if (!snapshot[i].dead && !snapshot[i].removed) updateUnit(snapshot[i], dt); }
  // 主堡
  castle.hitAge += dt; castle.attackAge += dt; castle.cdR -= dt; castle.cdM -= dt;
  doAttacks(castle, enemyList);
  // 敵人抵達主堡
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.team === 'enemy' && !u.dead && !u.removed && dist(u, castle) <= CASTLE_R + 10) {
      u.removed = true; castle.hp -= u.dmg; castle.hitAge = 0;
    }
  }
  updateProjs(dt);

  // 死亡與清理
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (!u.dead || u.removed) continue;
    u.removed = true;
    if (u.team === 'enemy') {
      corpses.push({ kind: u.kind, x: u.x, y: u.y, life: 15, slots: u.slots, half: cornerHalf(u.kind), gone: false });
      for (let c = 0; c < u.coins; c++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 40;
        coins.push({ x: u.x + Math.cos(a) * r, y: u.y + Math.sin(a) * r });
      }
    } else if (u.team === 'ally') {
      if (u.kind === 'tower') { u.pad.tower = null; u.pad.rebuild = 8; u.pad.saved = u.slots; }
      else respawns.push({ kind: u.kind, slots: u.slots, lane: u.lane, t: 8 });
    }
  }
  units = units.filter(function (u) { return !u.removed; });
  for (let i = respawns.length - 1; i >= 0; i--) {
    const r = respawns[i];
    r.t -= dt;
    if (r.t <= 0) {
      respawns.splice(i, 1);
      const u = mkAlly(r.kind, 1100, 385, r.lane);
      u.slots = r.slots; u.cap = r.slots.length; u.entering = true;
    }
  }
  pads.forEach(function (p) {
    if (p.rebuild > 0) {
      p.rebuild -= dt;
      if (p.rebuild <= 0) {
        p.rebuild = 0;
        const t = mkAlly('tower', p.x, p.y, -1);
        t.slots = p.saved; t.cap = p.saved.length; t.pad = p; p.tower = t; p.saved = null;
      }
    }
  });
  for (let i = corpses.length - 1; i >= 0; i--) {
    corpses[i].life -= dt;
    if (corpses[i].life <= 0) { corpses[i].gone = true; corpses.splice(i, 1); }
  }
  [areaHits, sparks, combos].forEach(function (arr, idx) {
    const dur = idx === 0 ? 0.3 : idx === 1 ? 0.25 : 1.5;
    for (let i = arr.length - 1; i >= 0; i--) { arr[i].age += dt; if (arr[i].age >= dur) arr.splice(i, 1); }
  });
  if (popup) popup.shake += rdt;

  // 互動目標與彈窗自動關閉
  target = findTarget();
  if (popup) {
    const r = popup.tgt.ref;
    const gone = r.dead || r.removed || r.gone;
    const half = popup.tgt.type === 'castle' ? CASTLE_R : r.half;
    if (gone || Math.hypot(r.x - player.x, r.y - player.y) > half + 68) popup = null;
  }

  // 勝負(批次最尾端判一次)
  checkEnd();
}

function checkEnd() {
  if (over) return;
  if (castle.hp <= 0) { over = { win: false, wave: wavesStarted() }; overAge = 0; return; }
  if (evIdx >= EVENTS.length && !units.some(function (u) { return u.team === 'enemy' && !u.dead; })) {
    over = { win: true, wave: TOTAL_WAVES }; overAge = 0;
  }
}

function findTarget() {
  let best = null, bd = 1e9;
  function test(type, ref, half) {
    const d = Math.hypot(ref.x - player.x, ref.y - player.y);
    if (d <= half + 48 && d < bd) { bd = d; best = { type: type, ref: ref }; }
  }
  units.forEach(function (u) { if (!u.dead && !u.removed) test('unit', u, u.half); });
  test('castle', castle, CASTLE_R);
  corpses.forEach(function (c) { test('corpse', c, c.half); });
  grounds.forEach(function (g) { test('ground', g, 14); });
  if (hand === 'towerKit') pads.forEach(function (p) { if (!p.tower && p.rebuild <= 0) test('pad', p, 32); });
  return best;
}

// ---------- 操作 ----------
function inZone() { return Math.hypot(player.x - CASTLE_X, player.y - CASTLE_Y) <= 120; }

function expandable(tg) {
  const r = tg.ref;
  if (tg.type === 'castle') return r.cap < 4;
  return tg.type === 'unit' && (r.kind === 'tower' || r.kind === 'wolf') && r.team !== 'enemy' && r.cap < 4;
}
// 回傳 {label, run} 或 null
function popupAction(tg, idx) {
  const o = tg.ref, item = o.slots[idx] || null;
  const isEnemy = tg.type === 'unit' && o.team === 'enemy';
  if (hand === null) {
    if (!item) return null;
    if (isEnemy) return { label: '搶奪', run: function () { steal = { tgt: o, idx: idx, t: 0 }; } };
    return { label: '拿起', run: function () { hand = item; o.slots[idx] = null; } };
  }
  if (isSoul(hand)) {
    if (isEnemy || tg.type === 'corpse') return null;
    return {
      label: item ? '互換' : '裝上',
      run: function () {
        const before = lvNames(o.slots);
        o.slots[idx] = hand; hand = item;
        if (o.team === 'ally') {
          const after = lvNames(o.slots);
          for (let i = 0; i < 3; i++) {
            if (after[i] && after[i] !== before[i]) {
              combos.push({ ref: o, name: after[i], isNew: !seen[after[i]], age: 0 });
              seen[after[i]] = true;
            }
          }
        }
      }
    };
  }
  if (hand === 'slotStone' && expandable(tg)) return { label: '擴槽', run: function () { o.cap++; o.slots.push(null); hand = null; } };
  return null;
}

function targetTitle(tg) {
  const r = tg.ref;
  if (tg.type === 'castle') return '主堡';
  if (tg.type === 'corpse') return KIND_NAME[r.kind] + '的屍體';
  if (r.kind === 'tower' || r.kind === 'soldier' || r.kind === 'wolf') return KIND_NAME[r.kind];
  if (r.team === 'enemy') return KIND_NAME[r.kind] + '(活)';
  if (r.team === 'neutral') return KIND_NAME[r.kind] + '迷魂';
  return KIND_NAME[r.kind] + '兵';
}

function openPopup(tg) {
  const slots = tg.ref.slots;
  let idx = 0;
  if (hand === null) { const f = slots.findIndex(function (s) { return !!s; }); if (f >= 0) idx = f; }
  else if (isSoul(hand)) { const f = slots.findIndex(function (s) { return !s; }); if (f >= 0) idx = f; }
  popup = { tgt: tg, index: idx, shake: 0.25 };
}

function pressJ() {
  if (popup) {
    const a = popupAction(popup.tgt, popup.index);
    if (a) { a.run(); popup = null; } else popup.shake = 0;
    return;
  }
  if (steal) { steal = null; return; }
  if (hand && !isSoul(hand) && hand !== 'slotStone') { // 單位材料
    if (hand === 'towerKit') {
      if (target && target.type === 'pad') {
        const p = target.ref;
        const t = mkAlly('tower', p.x, p.y, -1);
        t.pad = p; p.tower = t; hand = null;
      }
    } else {
      const pp = placePoint();
      if (pp.valid) { mkAlly(KIT_KIND[hand], pp.x, pp.y, pp.lane); hand = null; }
    }
    return;
  }
  if (!target) return;
  if (target.type === 'ground') {
    const g = target.ref;
    if (hand === null) { hand = g.item; grounds.splice(grounds.indexOf(g), 1); }
    else { const t = g.item; g.item = hand; hand = t; }
    return;
  }
  if (target.type === 'pad') return;
  openPopup(target);
}

function pressK() {
  if (popup) { popup = null; return; }
  if (hand && (isSoul(hand) || hand === 'slotStone')) { grounds.push({ item: hand, x: player.x, y: player.y }); hand = null; }
}

function buy(i) {
  if (!inZone() || popup || hand !== null) return;
  const s = SHOP[i];
  if (s.unlock && !unlocked[s.unlock]) return;
  if (gold < s.price) return;
  gold -= s.price; hand = s.item;
}

const KEYMAP = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyJ: 1, KeyK: 1, KeyH: 1, ArrowLeft: 1, ArrowRight: 1 };
function digitOf(e) {
  const m = /^(?:Digit|Numpad)([0-9])$/.exec(e.code || '');
  return m ? Number(m[1]) : -1;
}
window.addEventListener('keydown', function (e) {
  const dg = digitOf(e);
  if (KEYMAP[e.code] || dg >= 0) e.preventDefault();
  if (e.repeat) return;
  if (KEYMAP[e.code]) keys[e.code] = true;
  if (guideOpen) {
    if (e.code === 'KeyJ' || e.code === 'ArrowRight') {
      if (guidePage < GUIDE.length - 1) guidePage++;
      else if (e.code === 'KeyJ') { guideOpen = false; jBlock = true; }
    } else if (e.code === 'ArrowLeft') { if (guidePage > 0) guidePage--; }
    return;
  }
  if (over) {
    if (e.code === 'KeyJ' && overAge >= 0.5) { resetGame(); jBlock = true; }
    return;
  }
  if (e.code === 'KeyJ') { if (!jBlock) pressJ(); }
  else if (e.code === 'KeyK') pressK();
  else if (e.code === 'KeyH') { if (!popup) { guideOpen = true; guidePage = 0; } }
  else if (popup && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
    const n = popup.tgt.ref.slots.length;
    popup.index = (popup.index + (e.code === 'ArrowRight' ? 1 : -1) + n) % n;
  } else if (dg >= 0) buy(dg === 0 ? 9 : dg - 1);
});
window.addEventListener('keyup', function (e) {
  if (KEYMAP[e.code]) e.preventDefault();
  keys[e.code] = false;
  if (e.code === 'KeyJ') jBlock = false;
});
window.addEventListener('blur', function () { for (const k in keys) keys[k] = false; });

// ---------- 繪製 ----------
const HIT = 0.2, ATK = 0.15;
function isT(ref) { const t = popup ? popup.tgt : target; return !!t && t.ref === ref; }
function unitState(u) {
  const s = { x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp, hitAge: Math.min(u.hitAge, HIT), hitDuration: HIT,
    attackAge: Math.min(u.attackAge, ATK), attackDuration: ATK, moving: u.moving, targeted: isT(u) };
  if (u.kind !== 'tower') s.facing = u.facing;
  if (u.kind === 'wolf') s.team = u.team;
  if (ET[u.kind] && u.kind !== 'tower') {
    s.type = u.kind; s.team = u.team;
    s.harmless = u.team === 'neutral' || (cnt(u.slots, 'ranged') + cnt(u.slots, 'melee') === 0);
  }
  return s;
}
function drawUnit(u) {
  const s = unitState(u);
  if (u.kind === 'tower') Art.drawTower(ctx, s);
  else if (u.kind === 'soldier') Art.drawSoldier(ctx, s);
  else if (u.kind === 'wolf') Art.drawWolf(ctx, s);
  else Art.drawDemon(ctx, s);
}

function drawGuide() {
  ctx.fillStyle = '#161a24';
  ctx.fillRect(0, 0, CW, CH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd966';
  ctx.font = 'bold 40px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('魂匠收編 — ' + GUIDE[guidePage][0], CW / 2, 70);
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px sans-serif';
  ctx.fillText(GUIDE[guidePage][1], CW / 2, 120);
  ctx.fillStyle = '#232938';
  ctx.fillRect(GF.x, GF.y, GF.w, GF.h);
  Art.drawGuidePage(ctx, { page: guidePage + 1, x: GF.x, y: GF.y, w: GF.w, h: GF.h });
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px sans-serif';
  ctx.fillText('第 ' + (guidePage + 1) + ' / ' + GUIDE.length + ' 頁', CW / 2, 570);
  ctx.fillStyle = '#b8c0d0';
  ctx.font = '22px sans-serif';
  const last = guidePage === GUIDE.length - 1;
  ctx.fillText((guidePage > 0 ? '← 上一頁    ' : '') + (last ? 'J 開始遊戲' : 'J 下一頁'), CW / 2, 620);
  ctx.font = '18px sans-serif';
  ctx.fillText('遊戲中按 H 可再叫出說明', CW / 2, 660);
}

function render() {
  if (guideOpen) { drawGuide(); return; }
  Art.drawBackground(ctx, {});
  pads.forEach(function (p, i) {
    Art.drawBuildPad(ctx, { x: p.x, y: p.y, state: p.rebuild > 0 ? 'rebuilding' : p.tower ? 'occupied' : 'empty',
      rebuildRemaining: p.rebuild, rebuildTotal: 8, highlight: !!target && target.type === 'pad' && target.ref === p });
  });
  coins.forEach(function (c) { Art.drawCoin(ctx, { x: c.x, y: c.y }); });
  units.forEach(function (u) {
    const g = u.team !== 'neutral' ? cnt(u.slots, 'guard') : 0;
    if (g >= 2) Art.drawGuardAura(ctx, { x: u.x, y: u.y, radius: g >= 3 ? 140 : 100 });
  });
  corpses.forEach(function (c) { Art.drawCorpse(ctx, { kind: c.kind, x: c.x, y: c.y, life: c.life, maxLife: 15, targeted: isT(c) }); });
  grounds.forEach(function (g) { Art.drawGroundPart(ctx, { item: g.item, x: g.x, y: g.y, targeted: isT(g) }); });
  let pp = null;
  if (hand && KIT_KIND[hand]) {
    pp = placePoint();
    Art.drawPlacePreview(ctx, { kind: KIT_KIND[hand], x: pp.valid ? pp.x : player.x, y: pp.valid ? pp.y : player.y, valid: pp.valid });
  }
  const list = [];
  list.push({ y: castle.y, f: function () {
    Art.drawCastle(ctx, { x: castle.x, y: castle.y, hitAge: Math.min(castle.hitAge, 0.3), hitDuration: 0.3,
      attackAge: Math.min(castle.attackAge, ATK), attackDuration: ATK, zoneActive: inZone(), targeted: isT(castle) });
  } });
  units.forEach(function (u) { list.push({ y: u.y, f: function () { drawUnit(u); } }); });
  list.push({ y: player.y, f: function () {
    Art.drawPlayer(ctx, { x: player.x, y: player.y, moving: player.moving, handItem: hand, stealing: !!steal, stealProgress: steal ? Math.min(1, steal.t / 1.5) : 0 });
  } });
  list.sort(function (a, b) { return a.y - b.y; });
  list.forEach(function (d) { d.f(); });
  Art.drawSoulSlots(ctx, { x: castle.x, y: castle.y - CASTLE_R - 20, slots: castle.slots });
  units.forEach(function (u) { Art.drawSoulSlots(ctx, { x: u.x, y: u.y - u.half - 20, slots: u.slots }); });
  corpses.forEach(function (c) { Art.drawSoulSlots(ctx, { x: c.x, y: c.y - c.half - 12, slots: c.slots }); });
  projs.forEach(function (p) { Art.drawProjectile(ctx, { x: p.x, y: p.y, angle: p.angle, team: p.team }); });
  areaHits.forEach(function (a) { Art.drawAreaHit(ctx, { kind: a.kind, x: a.x, y: a.y, radius: a.radius, team: a.team, age: a.age, duration: 0.3 }); });
  sparks.forEach(function (s) { Art.drawHitSpark(ctx, { x: s.x, y: s.y, age: s.age, duration: 0.25 }); });
  if (steal) {
    const t = steal.tgt, n = t.slots.length;
    Art.drawStealLink(ctx, { x1: player.x, y1: player.y, x2: t.x - n * 10 + 10 + steal.idx * 20, y2: t.y - t.half - 20,
      progress: Math.min(1, steal.t / 1.5) });
  }
  combos.forEach(function (c) {
    Art.drawComboName(ctx, { x: c.ref.x, y: c.ref.y - c.ref.half - 44, name: c.name, isNew: c.isNew, age: c.age, duration: 1.5 });
  });
  const lanesWarn = ['top', 'mid', 'bottom'];
  const warned = {};
  for (let k = 0; k < TOTAL_WAVES; k++) {
    const rem = waveStart(k) - gt;
    if (rem > 0 && rem <= 6) {
      WAVES[k].forEach(function (l, i) { if (l.length) warned[i] = rem; });
    }
  }
  for (const i in warned) Art.drawSpawnWarning(ctx, { lane: lanesWarn[i], remaining: warned[i], total: 6 });
  if (respawns.length) {
    Art.drawRespawnList(ctx, { items: respawns.map(function (r) { return { kind: r.kind, remaining: Math.max(0, r.t), total: 8 }; }) });
  }
  if (inZone() && !popup && hand === null) {
    Art.drawShopPanel(ctx, { items: SHOP.map(function (s) {
      return { key: s.key, name: s.name, price: s.price, state: s.unlock && !unlocked[s.unlock] ? 'locked' : gold < s.price ? 'poor' : 'ok' };
    }) });
  }
  const started = wavesStarted();
  let next = -1;
  if (started < TOTAL_WAVES) next = Math.ceil(waveStart(started) - gt);
  Art.drawHud(ctx, { gold: gold, castleHp: Math.max(0, Math.ceil(castle.hp)), castleMaxHp: 20, wave: started, totalWaves: TOTAL_WAVES,
    nextWaveIn: next, recruited: Object.keys(unlocked).length, recruitTotal: RECRUIT_TOTAL });
  if (popup) {
    Art.drawSlowMo(ctx, {});
    const tg = popup.tgt, r = tg.ref, n = r.slots.length, w = n * 48 + 120, h = 116;
    const half = tg.type === 'castle' ? CASTLE_R : r.half;
    let py = r.y - half - 50 - h / 2;
    if (py - h / 2 < 0) py = r.y + half + 24 + h / 2;
    py = Math.max(h / 2, Math.min(CH - h / 2, py));
    const px = Math.max(w / 2, Math.min(CW - w / 2, r.x));
    const a = popupAction(tg, popup.index);
    Art.drawSoulPopup(ctx, { x: px, y: py, w: w, h: h, title: targetTitle(tg), slots: r.slots, index: popup.index, hand: hand,
      actionLabel: a ? a.label : '', shakeAge: Math.min(popup.shake, 0.25), shakeDuration: 0.25 });
  }
  if (over) Art.drawResult(ctx, { win: over.win, wave: over.wave, totalWaves: TOTAL_WAVES, recruited: Object.keys(unlocked).length, recruitTotal: RECRUIT_TOTAL });
}

// ---------- 主迴圈 ----------
let last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  try {
    const rdt = Math.min(Math.max((ts - last) / 1000, 0), 1 / 30);
    last = ts;
    if (!guideOpen) {
      if (over) overAge += rdt;
      else update(rdt * (popup ? 0.2 : 1), rdt);
    }
    render();
  } catch (err) { console.error(err); }
}
resetGame();
requestAnimationFrame(function (ts) { last = ts; frame(ts); });
