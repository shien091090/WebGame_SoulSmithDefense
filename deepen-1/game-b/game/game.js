'use strict';
// 魂匠惑亂 — 玩法驗證 Demo。只用鍵盤: 方向鍵 + Z / X / 空白鍵

var W = (typeof Art !== 'undefined' && Art.canvas && Art.canvas.width) || 1280;
var H = (typeof Art !== 'undefined' && Art.canvas && Art.canvas.height) || 720;

// ---------------------------------------------------------------- 常數
var PATH = [[0, 626], [528, 626], [528, 146], [1008, 146], [1008, 386], [1180, 386]];
var PATH_CUM = [0];
(function () {
  for (var i = 1; i < PATH.length; i++) {
    PATH_CUM.push(PATH_CUM[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]));
  }
})();
var PATH_LEN = PATH_CUM[PATH_CUM.length - 1];
var SPAWN_S = 10;
var CASTLE_X = 1180, CASTLE_Y = 386, CASTLE_R = 56;

var BASE_KINDS = { ranged: 1, melee: 1, frost: 1, blast: 1, march: 1 };
var COMBO_KINDS = { pierce: 1, iceArrow: 1, bomb: 1, whirl: 1, frostSmash: 1 };
var RECIPES = [
  ['pierce', 'ranged', 'ranged'],
  ['iceArrow', 'ranged', 'frost'],
  ['bomb', 'ranged', 'blast'],
  ['whirl', 'melee', 'melee'],
  ['frostSmash', 'melee', 'frost']
];
var COMBO_NAME = { pierce: '穿透箭', iceArrow: '冰箭', bomb: '爆裂彈', whirl: '旋風斬', frostSmash: '冰霜重擊' };
var FX = {
  ranged: { interval: 1.0, mode: 'range', range: 200 },
  melee: { interval: 0.8, mode: 'touch' },
  blast: { interval: 2.0, mode: 'radius', range: 70 },
  pierce: { interval: 1.0, mode: 'range', range: 260 },
  iceArrow: { interval: 1.0, mode: 'range', range: 200 },
  bomb: { interval: 1.2, mode: 'range', range: 200 },
  whirl: { interval: 0.8, mode: 'radius', range: 60 },
  frostSmash: { interval: 0.8, mode: 'touch' }
};
var ETYPES = {
  imp: { name: '小鬼', hp: 40, speed: 45, half: 16, slots: ['melee', 'march', null], coins: 1, dmg: 2 },
  archer: { name: '弓鬼', hp: 30, speed: 50, half: 16, slots: ['ranged', 'march', null], coins: 2, dmg: 2 },
  ice: { name: '冰鬼', hp: 50, speed: 42, half: 16, slots: ['frost', 'march', null], coins: 2, dmg: 2 },
  blaster: { name: '爆鬼', hp: 45, speed: 45, half: 18, slots: ['blast', 'march', null], coins: 2, dmg: 2 },
  giant: { name: '巨鬼', hp: 180, speed: 30, half: 26, slots: ['whirl', 'march', null], coins: 5, dmg: 4 }
};
var WAVES = [
  [['imp', 6]],
  [['imp', 3], ['archer', 4]],
  [['ice', 4], ['imp', 4]],
  [['blaster', 4], ['giant', 1], ['archer', 3]],
  [['giant', 2], ['ice', 3], ['imp', 5]],
  [['giant', 3], ['blaster', 3], ['archer', 3], ['imp', 4]]
];
var TOTAL_WAVES = WAVES.length;
var SHOP = [
  { item: 'towerKit', name: '箭塔', price: 15 },
  { item: 'soldierKit', name: '步兵', price: 12 },
  { item: 'ranged', name: '遠攻', price: 8 },
  { item: 'melee', name: '近戰', price: 8 },
  { item: 'frost', name: '冰霜', price: 12 },
  { item: 'blast', name: '爆裂', price: 12 },
  { item: 'slotStone', name: '擴槽石', price: 20 },
  { item: 'wispKit', name: '遊魂', price: 16 }
];
var GUIDE = [
  { title: '守住主堡', text: '撐過 6 波, 別讓鬼走進主堡', min: [480, 270] },
  { title: '移動與撿錢', text: '方向鍵移動, 靠近金幣就吸過來', min: [400, 240] },
  { title: '拿魂件', text: 'Z 開窗, ← → 選格, Z 拿起', min: [560, 300] },
  { title: '裝上與互換', text: '拿著魂件對格子按 Z, 裝上或互換', min: [560, 260] },
  { title: '裝在自己身上', text: 'X 打開自己, 裝上的魂件就能出手', min: [560, 280] },
  { title: '塞進敵人', text: '魂件塞進敵人的空格, 它就倒戈', min: [600, 280] },
  { title: '購買與蓋塔', text: '主堡旁按空白鍵買, Z 放下', min: [600, 300] },
  { title: '招募中立單位', text: '中立遊魂裝上進攻主堡會投靠', min: [480, 270] }
];

// 沒有需要的佔位圖形
var Placeholder = {};

// ---------------------------------------------------------------- 工具
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function isBase(k) { return !!BASE_KINDS[k]; }
function isCombo(k) { return !!COMBO_KINDS[k]; }
function isSoul(k) { return !!k && (isBase(k) || isCombo(k)); }
function isKit(k) { return k === 'towerKit' || k === 'soldierKit' || k === 'wispKit'; }

function pointAt(s) {
  s = clamp(s, 0, PATH_LEN);
  for (var i = 1; i < PATH.length; i++) {
    if (s <= PATH_CUM[i] || i === PATH.length - 1) {
      var segLen = PATH_CUM[i] - PATH_CUM[i - 1];
      var f = segLen > 0 ? (s - PATH_CUM[i - 1]) / segLen : 0;
      return [PATH[i - 1][0] + (PATH[i][0] - PATH[i - 1][0]) * f, PATH[i - 1][1] + (PATH[i][1] - PATH[i - 1][1]) * f];
    }
  }
  return [PATH[0][0], PATH[0][1]];
}
function nearestOnPath(x, y) {
  var best = { s: 0, d: 1e9 };
  for (var i = 1; i < PATH.length; i++) {
    var ax = PATH[i - 1][0], ay = PATH[i - 1][1], bx = PATH[i][0], by = PATH[i][1];
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var f = l2 > 0 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1) : 0;
    var px = ax + dx * f, py = ay + dy * f;
    var d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { s: PATH_CUM[i - 1] + Math.sqrt(l2) * f, d: d };
  }
  return best;
}
function segDist(px, py, ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  var f = l2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * f), py - (ay + dy * f));
}
function moveToward(o, tx, ty, step) {
  var dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
  if (d <= step || d < 0.001) { o.x = tx; o.y = ty; return true; }
  o.x += dx / d * step; o.y += dy / d * step;
  return false;
}
function countKind(slots, k) {
  var n = 0;
  for (var i = 0; i < slots.length; i++) if (slots[i] === k) n++;
  return n;
}

// ---------------------------------------------------------------- 狀態
var G = null;
var keys = { left: false, right: false, up: false, down: false };
var P = null; // 目前彈窗: {type:'soul'|'shop', ...}

function newGame(screen) {
  G = {
    screen: screen, guidePage: 0, guideFrom: 'start',
    t: 0, idc: 0, gold: 40, castleHp: 20, wispUnlocked: false,
    castle: { type: 'castle', x: CASTLE_X, y: CASTLE_Y, half: CASTLE_R, slots: ['ranged', 'melee', null], expandable: true,
      hitAge: 0.3, attackAge: 0.15, cd: {}, side: 'ally' },
    player: { type: 'player', x: 1060, y: 520, half: 16, slots: ['melee', null, null], cd: {}, side: 'ally',
      attackAge: 0.15, moving: false, expandable: false },
    hand: null,
    towers: [], soldiers: [], wisps: [], enemies: [], corpses: [], grounds: [], coins: [],
    projs: [], beams: [], areas: [], sparks: [], names: [],
    steal: null, found: {}, confusedTotal: 0,
    queue: [], qi: 0, target: null,
    resultT: 0, win: false, wavesReached: 0
  };
  G.towers.push(makeTower(456, 410, ['ranged', null]));
  G.towers.push(makeTower(600, 218, ['ranged', null]));
  G.wisps.push(makeWisp('neutral', 264, 386));
  G.wisps.push(makeWisp('neutral', 792, 290));
  for (var k = 0; k < WAVES.length; k++) {
    var start = 12 + k * 26, idx = 0;
    for (var g = 0; g < WAVES[k].length; g++) {
      for (var n = 0; n < WAVES[k][g][1]; n++) {
        G.queue.push({ time: start + idx * 1.2, type: WAVES[k][g][0], wave: k + 1 });
        idx++;
      }
    }
  }
  P = null;
}

function makeTower(x, y, slots) {
  return { type: 'tower', x: x, y: y, half: 24, slots: slots, expandable: true, cd: {}, side: 'ally',
    attackAge: 0.15, moving: false, speed: 50, attacking: false, id: ++G.idc };
}
function makeSoldier(x, y) {
  var u = { type: 'soldier', x: x, y: y, half: 16, slots: ['melee', null], expandable: false, cd: {}, side: 'ally',
    attackAge: 0.15, moving: false, speed: 50, mode: 'toCenter', c: nearestOnPath(x, y).s, ps: 0, dir: 1, attacking: false, id: ++G.idc };
  return u;
}
function makeWisp(team, x, y) {
  var u = { type: 'wisp', team: team, x: x, y: y, hx: x, hy: y, half: 16, slots: [null, null, null], expandable: false, cd: {},
    side: team === 'ally' ? 'ally' : 'none', attackAge: 0.15, moving: false, speed: team === 'ally' ? 70 : 40,
    mode: team === 'ally' ? 'toCenter' : 'drift', c: nearestOnPath(x, y).s, ps: 0, dir: 1,
    driftT: 0, dx: x, dy: y, attacking: false, id: ++G.idc };
  return u;
}
function spawnEnemy(type) {
  var d = ETYPES[type];
  var p = pointAt(SPAWN_S);
  G.enemies.push({ type: 'enemy', kind: type, x: p[0], y: p[1], s: SPAWN_S, half: d.half, hp: d.hp, maxHp: d.hp,
    speed: d.speed, slots: d.slots.slice(), confused: false, dead: false, slowUntil: 0, slowAmt: 0, auraSlow: 0,
    hitAge: 0.2, attackAge: 0.15, cd: {}, coins: d.coins, dmg: d.dmg, moving: true, attacking: false, slowed: false,
    side: 'enemy', id: ++G.idc });
}

// ---------------------------------------------------------------- 合成 / 名稱提示
function canFuse(e) {
  if (e.type === 'wisp') return e.team === 'ally';
  if (e.type === 'enemy') return e.confused;
  if (e.type === 'corpse') return false;
  return true;
}
function fuseSlots(slots) {
  var made = [], again = true;
  while (again) {
    again = false;
    for (var r = 0; r < RECIPES.length; r++) {
      var rec = RECIPES[r], a = -1, b = -1, i;
      if (rec[1] === rec[2]) {
        for (i = 0; i < slots.length; i++) {
          if (slots[i] === rec[1]) { if (a < 0) a = i; else { b = i; break; } }
        }
      } else { a = slots.indexOf(rec[1]); b = slots.indexOf(rec[2]); }
      if (a >= 0 && b >= 0) {
        var lo = Math.min(a, b), hi = Math.max(a, b);
        slots[lo] = rec[0]; slots[hi] = null;
        made.push(rec[0]); again = true; break;
      }
    }
  }
  return made;
}
function refuse(e) {
  if (!canFuse(e)) return;
  var made = fuseSlots(e.slots);
  for (var i = 0; i < made.length; i++) {
    var first = !G.found[made[i]];
    G.found[made[i]] = true;
    addName(e, first ? 'newCombo' : 'fuse', COMBO_NAME[made[i]]);
  }
}
function addName(ref, kind, name) {
  var dur = (kind === 'fuse' || kind === 'newCombo') ? 1.5 : 1.0;
  G.names.push({ ref: ref, x: ref.x, y: ref.y - ref.half - 44, kind: kind, name: name, age: 0, dur: dur });
}

// ---------------------------------------------------------------- 戰鬥
function hostiles(side) {
  var out = [];
  if (side === 'ally') {
    for (var i = 0; i < G.enemies.length; i++) if (!G.enemies[i].dead && !G.enemies[i].confused) out.push(G.enemies[i]);
  } else if (side === 'enemy') {
    for (var j = 0; j < G.enemies.length; j++) if (!G.enemies[j].dead && G.enemies[j].confused) out.push(G.enemies[j]);
  }
  return out;
}
function getEffects(slots) {
  var cnt = { ranged: 0, melee: 0, blast: 0 }, out = [];
  for (var i = 0; i < slots.length; i++) {
    var s = slots[i];
    if (cnt[s] !== undefined) cnt[s]++;
    else if (isCombo(s)) out.push({ key: 'c' + i, kind: s, n: 1 });
  }
  if (cnt.ranged) out.push({ key: 'ranged', kind: 'ranged', n: cnt.ranged });
  if (cnt.melee) out.push({ key: 'melee', kind: 'melee', n: cnt.melee });
  if (cnt.blast) out.push({ key: 'blast', kind: 'blast', n: cnt.blast });
  return out;
}
function findTarget(src, kind, list) {
  var def = FX[kind], best = null, bd = 1e9;
  for (var i = 0; i < list.length; i++) {
    var t = list[i];
    var d = Math.hypot(t.x - src.x, t.y - src.y);
    var lim = def.mode === 'touch' ? src.half + t.half + 12 : def.range;
    if (d <= lim && d < bd) { best = t; bd = d; }
  }
  return best;
}
function applySlow(t, amt, dur) {
  if (G.t >= t.slowUntil || amt >= t.slowAmt) { t.slowAmt = amt; }
  t.slowUntil = Math.max(t.slowUntil, G.t + dur);
}
function addSpark(t) { G.sparks.push({ x: t.x, y: t.y, age: 0, dur: 0.25 }); }
function hurt(t, amt, combo) {
  if (t.dead) return;
  t.hp -= amt; t.hitAge = 0;
  if (t.hp <= 0) killEnemy(t, combo);
}
function dropCoins(x, y, n) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 40;
    G.coins.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
  }
}
function killEnemy(e, combo) {
  e.dead = true;
  if (G.steal && G.steal.t === e) G.steal = null;
  if (e.confused) {
    var k = 0;
    for (var i = 0; i < e.slots.length; i++) {
      if (!e.slots[i]) continue;
      var a = k * Math.PI / 2;
      G.grounds.push({ item: e.slots[i], x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30, half: 14 });
      k++;
    }
    dropCoins(e.x, e.y, e.coins);
    return;
  }
  var c = { type: 'corpse', kind: e.kind, x: e.x, y: e.y, half: e.half, slots: e.slots.slice(), life: 15, maxLife: 15, gone: false, side: 'none' };
  G.corpses.push(c);
  if (combo) { c.slots.push(combo); addName(c, 'drop', COMBO_NAME[combo]); }
  dropCoins(e.x, e.y, e.coins);
}
function areaHitAt(kind, x, y, radius, owner, list, dmg, combo) {
  G.areas.push({ kind: kind, x: x, y: y, radius: radius, owner: owner, age: 0, dur: 0.3 });
  for (var i = 0; i < list.length; i++) {
    var t = list[i];
    if (!t.dead && Math.hypot(t.x - x, t.y - y) <= radius) hurt(t, dmg, combo);
  }
}
function fire(src, fx, target, side) {
  var kind = fx.kind;
  src.attackAge = 0;
  if (kind === 'ranged') {
    G.projs.push({ x: src.x, y: src.y, target: target, kind: 'normal', owner: side, dmg: 10 * fx.n, angle: 0 });
  } else if (kind === 'iceArrow') {
    G.projs.push({ x: src.x, y: src.y, target: target, kind: 'ice', owner: side, dmg: 10, angle: 0 });
  } else if (kind === 'bomb') {
    G.projs.push({ x: src.x, y: src.y, target: target, kind: 'bomb', owner: side, dmg: 12, angle: 0 });
  } else if (kind === 'melee') {
    hurt(target, 14 * fx.n, null); addSpark(target);
  } else if (kind === 'blast') {
    areaHitAt('blast', src.x, src.y, 70, side, hostiles(side), 10 * fx.n, null);
  } else if (kind === 'whirl') {
    areaHitAt('whirl', src.x, src.y, 60, side, hostiles(side), 16, 'whirl');
  } else if (kind === 'frostSmash') {
    var list = hostiles(side);
    hurt(target, 16, 'frostSmash'); addSpark(target);
    G.areas.push({ kind: 'frostSmash', x: target.x, y: target.y, radius: 60, owner: side, age: 0, dur: 0.3 });
    for (var i = 0; i < list.length; i++) {
      if (Math.hypot(list[i].x - target.x, list[i].y - target.y) <= 60) applySlow(list[i], 0.5, 2);
    }
  } else if (kind === 'pierce') {
    var dx = target.x - src.x, dy = target.y - src.y, d = Math.hypot(dx, dy);
    if (d < 0.001) { dx = 1; dy = 0; d = 1; }
    var ex = src.x + dx / d * 260, ey = src.y + dy / d * 260;
    G.beams.push({ x1: src.x, y1: src.y, x2: ex, y2: ey, owner: side, age: 0, dur: 0.15 });
    var hs = hostiles(side);
    for (var j = 0; j < hs.length; j++) {
      var h = hs[j];
      if (!h.dead && segDist(h.x, h.y, src.x, src.y, ex, ey) <= 14) { hurt(h, 14, 'pierce'); addSpark(h); }
    }
  }
}
function runCombat(src, side, dt) {
  var attacking = false;
  var hs = hostiles(side);
  if (!hs.length) { src.attacking = false; return false; }
  var fxs = getEffects(src.slots);
  for (var i = 0; i < fxs.length; i++) {
    var fx = fxs[i];
    var cdv = (src.cd[fx.key] || 0) - dt;
    var tg = findTarget(src, fx.kind, hs);
    if (!tg) { src.cd[fx.key] = Math.max(0, cdv); continue; }
    attacking = true;
    if (cdv <= 0) {
      fire(src, fx, tg, side);
      cdv = FX[fx.kind].interval;
      hs = hostiles(side);
      if (!hs.length) { src.cd[fx.key] = cdv; break; }
    }
    src.cd[fx.key] = cdv;
  }
  src.attacking = attacking;
  return attacking;
}
function isHostileTo(t, owner) {
  if (t.dead) return false;
  return owner === 'ally' ? !t.confused : t.confused;
}
function updateProjectiles(dt) {
  var keep = [];
  for (var i = 0; i < G.projs.length; i++) {
    var p = G.projs[i], t = p.target;
    if (!t || !isHostileTo(t, p.owner)) continue;
    var dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy), step = 420 * dt;
    p.angle = Math.atan2(dy, dx);
    if (d <= step + t.half * 0.5) {
      if (p.kind === 'normal') { hurt(t, p.dmg, null); addSpark(t); }
      else if (p.kind === 'ice') { hurt(t, p.dmg, 'iceArrow'); applySlow(t, 0.5, 2); addSpark(t); }
      else if (p.kind === 'bomb') { areaHitAt('blast', t.x, t.y, 70, p.owner, hostiles(p.owner), 12, 'bomb'); }
      continue;
    }
    p.x += dx / d * step; p.y += dy / d * step;
    keep.push(p);
  }
  G.projs = keep;
}

// ---------------------------------------------------------------- 更新
function speedMul(e) {
  var m = e.auraSlow;
  if (G.t < e.slowUntil && e.slowAmt > m) m = e.slowAmt;
  return 1 - m;
}
function hasMarch(e) { return e.slots.indexOf('march') >= 0; }

function updateMobileAlly(u, dt) {
  var hm = hasMarch(u);
  if (hm) {
    u.mode = 'march';
    var d = Math.hypot(CASTLE_X - u.x, CASTLE_Y - u.y);
    if (!u.attacking && d > CASTLE_R + u.half) { moveToward(u, CASTLE_X, CASTLE_Y, u.speed * dt); u.moving = true; }
    else u.moving = false;
    return;
  }
  if (u.mode === 'march') { u.mode = 'toCenter'; u.c = nearestOnPath(u.x, u.y).s; }
  if (u.attacking) { u.moving = false; return; }
  if (u.mode === 'toCenter') {
    var p = pointAt(u.c);
    if (moveToward(u, p[0], p[1], u.speed * dt)) { u.mode = 'patrol'; u.ps = u.c; u.dir = 1; }
    u.moving = true;
  } else {
    u.ps += u.dir * u.speed * dt;
    var hi = Math.min(u.c + 120, PATH_LEN), lo = Math.max(u.c - 120, 0);
    if (u.ps >= hi) { u.ps = hi; u.dir = -1; } else if (u.ps <= lo) { u.ps = lo; u.dir = 1; }
    var q = pointAt(u.ps); u.x = q[0]; u.y = q[1];
    u.moving = true;
  }
}
function updateNeutralWisp(w, dt) {
  if (hasMarch(w)) {
    w.moving = true;
    moveToward(w, CASTLE_X, CASTLE_Y, 60 * dt);
    if (Math.hypot(CASTLE_X - w.x, CASTLE_Y - w.y) <= CASTLE_R + 10) {
      var k = 0;
      for (var i = 0; i < w.slots.length; i++) {
        if (!w.slots[i]) continue;
        G.grounds.push({ item: w.slots[i], x: 1100 + 32 * k, y: 480, half: 14 });
        k++;
      }
      w.gone = true;
      G.wispUnlocked = true;
    }
    return;
  }
  w.driftT -= dt;
  if (w.driftT <= 0) {
    w.driftT += 2;
    var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 120;
    w.dx = w.hx + Math.cos(a) * r; w.dy = w.hy + Math.sin(a) * r;
  }
  w.moving = !moveToward(w, w.dx, w.dy, 40 * dt);
}

function updateEnemy(e, dt) {
  var hm = hasMarch(e);
  e.slowed = speedMul(e) < 1;
  if (e.confused) {
    e.moving = hm && e.s > SPAWN_S + 0.5;
    if (hm && !e.attacking) {
      e.s = Math.max(SPAWN_S, e.s - e.speed * speedMul(e) * dt);
      var p = pointAt(e.s); e.x = p[0]; e.y = p[1];
    }
    return;
  }
  e.moving = hm;
  if (hm && !e.attacking) {
    e.s += e.speed * speedMul(e) * dt;
    var q = pointAt(e.s); e.x = q[0]; e.y = q[1];
  }
  if (Math.hypot(CASTLE_X - e.x, CASTLE_Y - e.y) <= CASTLE_R + 10) {
    G.castleHp -= e.dmg; G.castle.hitAge = 0;
    e.dead = true;
  }
}

function ageAll(dt) {
  var c = G.castle;
  c.hitAge = Math.min(0.3, c.hitAge + dt); c.attackAge = Math.min(0.15, c.attackAge + dt);
  var pl = G.player; pl.attackAge = Math.min(0.15, pl.attackAge + dt);
  var i, u;
  for (i = 0; i < G.towers.length; i++) { u = G.towers[i]; u.attackAge = Math.min(0.15, u.attackAge + dt); }
  for (i = 0; i < G.soldiers.length; i++) { u = G.soldiers[i]; u.attackAge = Math.min(0.15, u.attackAge + dt); }
  for (i = 0; i < G.wisps.length; i++) { u = G.wisps[i]; u.attackAge = Math.min(0.15, u.attackAge + dt); }
  for (i = 0; i < G.enemies.length; i++) {
    u = G.enemies[i]; u.attackAge = Math.min(0.15, u.attackAge + dt); u.hitAge = Math.min(0.2, u.hitAge + dt);
  }
  var arrs = [G.beams, G.areas, G.sparks, G.names];
  for (var a = 0; a < arrs.length; a++) {
    for (i = 0; i < arrs[a].length; i++) arrs[a][i].age = Math.min(arrs[a][i].dur, arrs[a][i].age + dt);
    // 播完的移除
    for (i = arrs[a].length - 1; i >= 0; i--) if (arrs[a][i].age >= arrs[a][i].dur) arrs[a].splice(i, 1);
  }
}

function updateWorld(dt, rdt) {
  var i, e, u;
  G.t += dt;
  // 出怪
  while (G.qi < G.queue.length && G.queue[G.qi].time <= G.t) { spawnEnemy(G.queue[G.qi].type); G.qi++; }
  var wn = 0;
  for (i = 0; i < TOTAL_WAVES; i++) if (12 + i * 26 <= G.t) wn = i + 1;
  G.wavesReached = wn;

  ageAll(dt);

  // 玩家移動
  var pl = G.player;
  var mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  pl.moving = false;
  if (!P && (mx || my)) {
    var l = Math.hypot(mx, my);
    pl.x = clamp(pl.x + mx / l * 260 * dt, 16, W - 16);
    pl.y = clamp(pl.y + my / l * 260 * dt, 50 + 16, H - 16);
    pl.moving = true;
  }

  // 減速範圍
  for (i = 0; i < G.enemies.length; i++) G.enemies[i].auraSlow = 0;
  var srcs = frostSources();
  for (i = 0; i < srcs.length; i++) {
    var hs = hostiles(srcs[i].side);
    for (var j = 0; j < hs.length; j++) {
      if (Math.hypot(hs[j].x - srcs[i].x, hs[j].y - srcs[i].y) <= 70) hs[j].auraSlow = 0.3;
    }
  }

  // 戰鬥
  runCombat(G.player, 'ally', dt);
  runCombat(G.castle, 'ally', dt);
  for (i = 0; i < G.towers.length; i++) runCombat(G.towers[i], 'ally', dt);
  for (i = 0; i < G.soldiers.length; i++) runCombat(G.soldiers[i], 'ally', dt);
  for (i = 0; i < G.wisps.length; i++) { u = G.wisps[i]; if (u.team === 'ally') runCombat(u, 'ally', dt); }
  var es = G.enemies.slice();
  for (i = 0; i < es.length; i++) {
    e = es[i]; if (e.dead) continue;
    runCombat(e, e.confused ? 'ally' : 'enemy', dt);
  }

  // 移動
  for (i = 0; i < G.towers.length; i++) {
    u = G.towers[i];
    if (hasMarch(u) && !u.attacking && Math.hypot(CASTLE_X - u.x, CASTLE_Y - u.y) > CASTLE_R + u.half) {
      moveToward(u, CASTLE_X, CASTLE_Y, u.speed * dt); u.moving = true;
    } else u.moving = false;
  }
  for (i = 0; i < G.soldiers.length; i++) updateMobileAlly(G.soldiers[i], dt);
  for (i = 0; i < G.wisps.length; i++) {
    u = G.wisps[i];
    if (u.team === 'ally') updateMobileAlly(u, dt); else updateNeutralWisp(u, dt);
  }
  G.wisps = G.wisps.filter(function (w) { return !w.gone; });
  for (i = 0; i < es.length; i++) { if (!es[i].dead) updateEnemy(es[i], dt); }

  updateProjectiles(dt);
  updateSteal(dt);
  updateCoins(dt);
  for (i = 0; i < G.corpses.length; i++) { G.corpses[i].life -= dt; if (G.corpses[i].life <= 0) G.corpses[i].gone = true; }
  G.corpses = G.corpses.filter(function (c) { return !c.gone; });
  for (i = 0; i < G.names.length; i++) {
    var n = G.names[i];
    if (n.ref && !n.ref.dead && !n.ref.gone) { n.x = n.ref.x; n.y = n.ref.y - n.ref.half - 44; }
  }
  G.enemies = G.enemies.filter(function (en) { return !en.dead; });

  // 目標與彈窗自動關閉
  updatePopupValidity();
  G.target = P && P.type === 'soul' ? P.target : pickTarget();

  // 勝負
  if (G.castleHp <= 0) { G.castleHp = 0; endGame(false); }
  else if (G.qi >= G.queue.length && hostiles('ally').length === 0) endGame(true);
}

function frostSources() {
  var out = [], i, u;
  function add(o, side) { if (countKind(o.slots, 'frost') > 0) out.push({ x: o.x, y: o.y, side: side, ref: o }); }
  add(G.player, 'ally'); add(G.castle, 'ally');
  for (i = 0; i < G.towers.length; i++) add(G.towers[i], 'ally');
  for (i = 0; i < G.soldiers.length; i++) add(G.soldiers[i], 'ally');
  for (i = 0; i < G.wisps.length; i++) { u = G.wisps[i]; if (u.team === 'ally') add(u, 'ally'); }
  for (i = 0; i < G.enemies.length; i++) { u = G.enemies[i]; if (!u.dead) add(u, u.confused ? 'ally' : 'enemy'); }
  return out;
}

function updateCoins(dt) {
  var pl = G.player, keep = [];
  for (var i = 0; i < G.coins.length; i++) {
    var c = G.coins[i];
    var d = Math.hypot(pl.x - c.x, pl.y - c.y);
    if (d <= 90) {
      if (moveToward(c, pl.x, pl.y, 420 * dt) || d < 10) { G.gold += 2; continue; }
    }
    keep.push(c);
  }
  G.coins = keep;
}

function endGame(win) {
  G.screen = 'result'; G.win = win; G.resultT = 0; P = null; G.steal = null;
  if (win) { G.wavesReached = TOTAL_WAVES; G.enemies = G.enemies.filter(function (e) { return !e.confused; }); }
}

// ---------------------------------------------------------------- 互動目標
function pickTarget() {
  var pl = G.player, best = null, bd = 1e9;
  function cand(o) {
    var d = Math.hypot(o.x - pl.x, o.y - pl.y);
    if (d <= o.half + 48 && d < bd) { best = o; bd = d; }
  }
  var i;
  for (i = 0; i < G.towers.length; i++) cand(G.towers[i]);
  for (i = 0; i < G.soldiers.length; i++) cand(G.soldiers[i]);
  for (i = 0; i < G.wisps.length; i++) cand(G.wisps[i]);
  cand(G.castle);
  for (i = 0; i < G.corpses.length; i++) cand(G.corpses[i]);
  for (i = 0; i < G.grounds.length; i++) cand(G.grounds[i]);
  for (i = 0; i < G.enemies.length; i++) if (!G.enemies[i].dead) cand(G.enemies[i]);
  return best;
}
function isNormalEnemy(t) { return t.type === 'enemy' && !t.confused; }

// ---------------------------------------------------------------- 搶奪
function startSteal(e, idx) { G.steal = { t: e, i: idx, age: 0 }; }
function updateSteal(dt) {
  var s = G.steal;
  if (!s) return;
  var e = s.t, pl = G.player;
  if (e.dead || e.confused || !e.slots[s.i] || Math.hypot(e.x - pl.x, e.y - pl.y) > e.half + 68) { G.steal = null; return; }
  s.age += dt;
  if (s.age >= 1.5) {
    if (G.hand === null) { G.hand = e.slots[s.i]; e.slots[s.i] = null; }
    G.steal = null;
  }
}

// ---------------------------------------------------------------- 魂亂
function confuse(e) {
  e.confused = true; e.side = 'ally';
  e.maxHp *= 2; e.hp = e.maxHp;
  G.confusedTotal++;
  if (G.steal && G.steal.t === e) G.steal = null;
  addName(e, 'confuse', '');
}

// ---------------------------------------------------------------- 放置
function validPlacement(kind) {
  var pl = G.player;
  if (Math.hypot(pl.x - CASTLE_X, pl.y - CASTLE_Y) < 90) return { ok: false, x: pl.x, y: pl.y };
  if (kind !== 'tower') return { ok: true, x: pl.x, y: pl.y };
  var ci = Math.floor(pl.x / 48), cj = Math.floor((pl.y - 50) / 48);
  var cx = 24 + 48 * ci, cy = 74 + 48 * cj;
  var res = { ok: true, x: cx, y: cy };
  if (ci < 0 || ci > 26 || cj < 0 || cj > 13) res.ok = false;
  for (var i = 1; i < PATH.length; i++) {
    if (segDist(cx, cy, PATH[i - 1][0], PATH[i - 1][1], PATH[i][0], PATH[i][1]) < 52) res.ok = false;
  }
  if (Math.hypot(cx - CASTLE_X, cy - CASTLE_Y) < 90) res.ok = false;
  for (var t = 0; t < G.towers.length; t++) {
    if (Math.floor(G.towers[t].x / 48) === ci && Math.floor((G.towers[t].y - 50) / 48) === cj) res.ok = false;
  }
  return res;
}
function tryPlace() {
  var kind = G.hand === 'towerKit' ? 'tower' : (G.hand === 'soldierKit' ? 'soldier' : 'wisp');
  var v = validPlacement(kind);
  if (!v.ok) return false;
  if (kind === 'tower') G.towers.push(makeTower(v.x, v.y, [null, null]));
  else if (kind === 'soldier') G.soldiers.push(makeSoldier(v.x, v.y));
  else { var w = makeWisp('ally', v.x, v.y); G.wisps.push(w); }
  G.hand = null;
  return true;
}

// ---------------------------------------------------------------- 彈窗
function cursorInit(slots) {
  var hand = G.hand, i;
  if (hand === null) { for (i = 0; i < slots.length; i++) if (slots[i]) return i; }
  else if (isSoul(hand)) { for (i = 0; i < slots.length; i++) if (!slots[i]) return i; }
  return 0;
}
function openSoul(target, self) {
  P = { type: 'soul', target: target, self: self, cursor: cursorInit(target.slots), shake: 0.25 };
}
function openShop() {
  P = { type: 'shop', cursor: 0, msg: '', shake: 0.25 };
}
function closePopup() { P = null; }
function popupCells() { return P.target.slots.length + (P.self ? 1 : 0); }
function updatePopupValidity() {
  if (!P || P.type !== 'soul' || P.self) return;
  var t = P.target;
  if (t.dead || t.gone || G.corpses.indexOf(t) < 0 && t.type === 'corpse') { P = null; return; }
  if (Math.hypot(t.x - G.player.x, t.y - G.player.y) > t.half + 68) P = null;
}
function soulTitle(t) {
  if (t.type === 'player') return '自己';
  if (t.type === 'tower') return '箭塔';
  if (t.type === 'soldier') return '步兵';
  if (t.type === 'wisp') return '遊魂';
  if (t.type === 'castle') return '主堡';
  if (t.type === 'corpse') return ETYPES[t.kind].name + '的屍體';
  if (t.type === 'enemy') return ETYPES[t.kind].name + (t.confused ? '(魂亂)' : '(活)');
  return '';
}
function actionLabel() {
  if (!P || P.type !== 'soul') return '';
  var t = P.target, hand = G.hand, i = P.cursor, slots = t.slots;
  if (P.self && i === slots.length) return (isSoul(hand) || hand === 'slotStone') ? '丟下' : '';
  var cell = slots[i];
  if (hand === null) {
    if (!cell) return '';
    return isNormalEnemy(t) ? '搶奪' : '拿起';
  }
  if (isSoul(hand)) {
    if (t.type === 'corpse') return '';
    if (!cell) return isNormalEnemy(t) ? '塞進去' : '裝上';
    return isNormalEnemy(t) ? '' : '互換';
  }
  if (hand === 'slotStone') return (t.expandable && slots.length < 4) ? '擴槽' : '';
  return '';
}
function execSoul() {
  var t = P.target, hand = G.hand, i = P.cursor, slots = t.slots;
  if (P.self && i === slots.length) {
    if (isSoul(hand) || hand === 'slotStone') {
      G.grounds.push({ item: hand, x: G.player.x, y: G.player.y, half: 14 });
      G.hand = null; closePopup();
    } else P.shake = 0;
    return;
  }
  var cell = slots[i];
  if (hand === null) {
    if (!cell) { P.shake = 0; return; }
    if (isNormalEnemy(t)) { startSteal(t, i); closePopup(); }
    else { G.hand = cell; slots[i] = null; closePopup(); }
    return;
  }
  if (isSoul(hand)) {
    if (t.type === 'corpse') { P.shake = 0; return; }
    if (!cell) {
      slots[i] = hand; G.hand = null;
      if (isNormalEnemy(t)) confuse(t);
      refuse(t); closePopup();
    } else if (isNormalEnemy(t)) { P.shake = 0; }
    else { slots[i] = hand; G.hand = cell; refuse(t); closePopup(); }
    return;
  }
  if (hand === 'slotStone' && t.expandable && slots.length < 4) {
    slots.push(null); G.hand = null; closePopup(); return;
  }
  P.shake = 0;
}
function shopState(i) {
  var it = SHOP[i];
  if (i === 7 && !G.wispUnlocked) return 'locked';
  return G.gold >= it.price ? 'ok' : 'poor';
}
function execShop() {
  var i = P.cursor, it = SHOP[i], st = shopState(i);
  if (st === 'locked') { P.msg = '尚未解鎖'; P.shake = 0; return; }
  if (G.gold < it.price) { P.msg = '金幣不足'; P.shake = 0; return; }
  if (G.hand !== null) { P.msg = '手上要空著'; P.shake = 0; return; }
  G.gold -= it.price; G.hand = it.item; closePopup();
}

// ---------------------------------------------------------------- 輸入(只有鍵盤)
function inZone() { return Math.hypot(G.player.x - CASTLE_X, G.player.y - CASTLE_Y) <= 110; }

function onZ() {
  if (G.screen === 'guide') {
    if (G.guidePage < GUIDE.length - 1) G.guidePage++;
    else closeGuide();
    return;
  }
  if (G.screen === 'result') {
    if (G.resultT >= 0.5) newGame('play');
    return;
  }
  if (P) { if (P.type === 'soul') execSoul(); else execShop(); return; }
  if (G.steal) { G.steal = null; return; }
  if (isKit(G.hand)) { tryPlace(); return; }
  var t = G.target = pickTarget();
  if (!t) return;
  if (t.item !== undefined && t.type === undefined) { // 地上的魂件
    var tmp = t.item;
    if (G.hand === null) { G.grounds.splice(G.grounds.indexOf(t), 1); G.hand = tmp; }
    else { t.item = G.hand; G.hand = tmp; }
    return;
  }
  openSoul(t, false);
}
function onX() {
  if (G.screen !== 'play') return;
  if (P) { closePopup(); return; }
  openSoul(G.player, true);
  P.self = true;
}
function onSpace() {
  if (G.screen !== 'play' || P) return;
  if (inZone()) openShop();
  else openGuide('play');
}
function onArrowKey(dir) { // dir: -1 / +1, 只用在說明頁與彈窗內
  if (G.screen === 'guide') { G.guidePage = clamp(G.guidePage + dir, 0, GUIDE.length - 1); return; }
  if (G.screen !== 'play' || !P) return;
  var n = P.type === 'soul' ? popupCells() : SHOP.length;
  P.cursor = (P.cursor + dir + n) % n;
  if (P.type === 'shop') P.msg = '';
}
function openGuide(from) { G.screen = 'guide'; G.guideFrom = from; G.guidePage = 0; }
function closeGuide() { G.screen = 'play'; }

var KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
function onKeyDown(e) {
  var k = e.key, code = e.code;
  var isZ = (k === 'z' || k === 'Z' || code === 'KeyZ');
  var isX = (k === 'x' || k === 'X' || code === 'KeyX');
  var isSp = (k === ' ' || code === 'Space');
  var arrow = KEYMAP[k];
  if (!(isZ || isX || isSp || arrow)) return;
  e.preventDefault();
  if (e.repeat) return;
  if (arrow) {
    keys[arrow] = true;
    if (arrow === 'left') onArrowKey(-1);
    else if (arrow === 'right') onArrowKey(1);
    return;
  }
  if (isZ) onZ(); else if (isX) onX(); else onSpace();
}
function onKeyUp(e) {
  var arrow = KEYMAP[e.key];
  if (arrow) { keys[arrow] = false; e.preventDefault(); }
}
function onBlur() { keys.left = keys.right = keys.up = keys.down = false; }

// ---------------------------------------------------------------- 繪製
var canvas = null, ctx = null;

function slotsDrawY(e) {
  if (e.type === 'corpse') return e.y - e.half - 12;
  return e.y - e.half - 20;
}
function drawSlotsOf(e) {
  Art.drawSoulSlots(ctx, { x: e.x, y: slotsDrawY(e), slots: e.slots.slice() });
}
function popupRect() {
  var t = P.target, n = popupCells();
  var w = n * 48 + 120, h = 116;
  var x = clamp(t.x, w / 2, W - w / 2);
  var y = t.y - t.half - 60 - h / 2;
  if (y - h / 2 < 54) y = t.y + t.half + 30 + h / 2;
  y = clamp(y, 54 + h / 2, H - h / 2);
  return { x: x, y: y, w: w, h: h };
}

function drawScene() {
  var i, t = G.target;
  Art.drawBackground(ctx);
  var srcs = frostSources();
  for (i = 0; i < srcs.length; i++) {
    Art.drawFrostAura(ctx, { x: srcs[i].x, y: srcs[i].y, radius: 70, owner: srcs[i].side === 'enemy' ? 'enemy' : 'ally' });
  }
  for (i = 0; i < G.coins.length; i++) Art.drawCoin(ctx, { x: G.coins[i].x, y: G.coins[i].y });
  for (i = 0; i < G.corpses.length; i++) {
    var c = G.corpses[i];
    Art.drawCorpse(ctx, { kind: c.kind, x: c.x, y: c.y, life: Math.max(0, c.life), maxLife: c.maxLife, targeted: t === c });
  }
  for (i = 0; i < G.grounds.length; i++) {
    var g = G.grounds[i];
    Art.drawGroundPart(ctx, { item: g.item, x: g.x, y: g.y, targeted: t === g });
  }
  if (isKit(G.hand)) {
    var kind = G.hand === 'towerKit' ? 'tower' : (G.hand === 'soldierKit' ? 'soldier' : 'wisp');
    var v = validPlacement(kind);
    Art.drawPlacePreview(ctx, { kind: kind, x: v.x, y: v.y, valid: v.ok });
  }

  // 單位層(依 y 排序), 遊魂最後
  var list = [], pl = G.player;
  list.push({ y: G.castle.y, f: function () {
    Art.drawCastle(ctx, { x: G.castle.x, y: G.castle.y, hitAge: G.castle.hitAge, hitDuration: 0.3,
      attackAge: G.castle.attackAge, attackDuration: 0.15, zoneActive: inZone(), targeted: t === G.castle });
  } });
  G.towers.forEach(function (u) { list.push({ y: u.y, f: function () {
    Art.drawTower(ctx, { x: u.x, y: u.y, attackAge: u.attackAge, attackDuration: 0.15, moving: u.moving, targeted: t === u });
  } }); });
  G.soldiers.forEach(function (u) { list.push({ y: u.y, f: function () {
    Art.drawSoldier(ctx, { x: u.x, y: u.y, attackAge: u.attackAge, attackDuration: 0.15, moving: u.moving, targeted: t === u });
  } }); });
  G.enemies.forEach(function (e) { list.push({ y: e.y, f: function () {
    Art.drawEnemy(ctx, { type: e.kind, x: e.x, y: e.y, team: e.confused ? 'confused' : 'normal', hp: e.hp, maxHp: e.maxHp,
      hitAge: e.hitAge, hitDuration: 0.2, attackAge: e.attackAge, attackDuration: 0.15, moving: e.moving,
      slowed: speedMul(e) < 1, targeted: t === e });
  } }); });
  var stealing = !!G.steal;
  list.push({ y: pl.y, f: function () {
    Art.drawPlayer(ctx, { x: pl.x, y: pl.y, moving: pl.moving, attackAge: pl.attackAge, attackDuration: 0.15,
      handItem: G.hand, stealing: stealing, stealProgress: stealing ? Math.min(1, G.steal.age / 1.5) : 0 });
  } });
  list.sort(function (a, b) { return a.y - b.y; });
  for (i = 0; i < list.length; i++) list[i].f();
  G.wisps.forEach(function (u) {
    Art.drawWisp(ctx, { x: u.x, y: u.y, team: u.team, attackAge: u.attackAge, attackDuration: 0.15, moving: u.moving, targeted: t === u });
  });

  // 魂件槽列
  Art.drawSoulSlots(ctx, { x: G.castle.x, y: G.castle.y - CASTLE_R - 20, slots: G.castle.slots.slice() });
  G.towers.forEach(drawSlotsOf);
  G.soldiers.forEach(drawSlotsOf);
  G.wisps.forEach(drawSlotsOf);
  G.corpses.forEach(drawSlotsOf);
  drawSlotsOf(pl);
  G.enemies.forEach(function (e) { if (e.confused || t === e) drawSlotsOf(e); });

  G.projs.forEach(function (p) {
    Art.drawProjectile(ctx, { x: p.x, y: p.y, angle: p.angle, kind: p.kind, owner: p.owner });
  });
  G.beams.forEach(function (b) {
    Art.drawPierceBeam(ctx, { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, owner: b.owner, age: b.age, duration: b.dur });
  });
  G.areas.forEach(function (a) {
    Art.drawAreaHit(ctx, { kind: a.kind, x: a.x, y: a.y, radius: a.radius, owner: a.owner, age: a.age, duration: a.dur });
  });
  G.sparks.forEach(function (s) { Art.drawHitSpark(ctx, { x: s.x, y: s.y, age: s.age, duration: s.dur }); });
  if (G.steal) {
    var e = G.steal.t, n = e.slots.length;
    var sx = e.x - n * 10 + 10 + 20 * G.steal.i, sy = e.y - e.half - 20;
    Art.drawStealLink(ctx, { x1: pl.x, y1: pl.y, x2: sx, y2: sy, progress: Math.min(1, G.steal.age / 1.5) });
  }
  G.names.forEach(function (n) {
    Art.drawComboName(ctx, { x: n.x, y: n.y, kind: n.kind, name: n.name, age: n.age, duration: n.dur });
  });
  var next = -1, warn = 0;
  for (i = 0; i < TOTAL_WAVES; i++) {
    var st = 12 + i * 26;
    if (st > G.t) { next = Math.ceil(st - G.t); warn = st - G.t; break; }
  }
  if (warn > 0 && warn <= 6) Art.drawSpawnWarning(ctx, { remaining: warn, total: 6 });
  var alive = 0;
  G.enemies.forEach(function (e) { if (e.confused && !e.dead) alive++; });
  Art.drawHud(ctx, { gold: G.gold, castleHp: G.castleHp, castleMaxHp: 20, wave: G.wavesReached, totalWaves: TOTAL_WAVES,
    nextWaveIn: next, confusedAlive: alive });
  if (P) {
    Art.drawSlowMo(ctx, {});
    if (P.type === 'soul') {
      var r = popupRect();
      Art.drawSoulPopup(ctx, { x: r.x, y: r.y, w: r.w, h: r.h, title: soulTitle(P.target), slots: P.target.slots.slice(),
        dropCell: P.self, index: P.cursor, hand: G.hand, actionLabel: actionLabel(), shakeAge: P.shake, shakeDuration: 0.25 });
    } else {
      var items = SHOP.map(function (it, idx) { return { item: it.item, name: it.name, price: it.price, state: shopState(idx) }; });
      Art.drawShopPopup(ctx, { items: items, cursorIndex: P.cursor, message: P.msg, shakeAge: P.shake, shakeDuration: 0.25 });
    }
  }
}

function drawGuide() {
  var pg = GUIDE[G.guidePage], n = G.guidePage + 1;
  ctx.fillStyle = '#14161f'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8d93a8'; ctx.font = '20px sans-serif';
  ctx.fillText('魂匠惑亂 說明', W / 2, 36);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px sans-serif';
  ctx.fillText(pg.title, W / 2, 88);
  ctx.fillStyle = '#e8d9a0'; ctx.font = '28px sans-serif';
  ctx.fillText(pg.text, W / 2, 142);
  var fw = Math.round(pg.min[0] * 1.3), fh = Math.round(pg.min[1] * 1.3);
  var fx = Math.round((W - fw) / 2), fy = Math.round(400 - fh / 2);
  Art.drawGuidePage(ctx, { page: n, x: fx, y: fy, w: fw, h: fh });
  ctx.fillStyle = '#ffffff'; ctx.font = '24px sans-serif';
  ctx.fillText(n + ' / ' + GUIDE.length, W / 2, 626);
  var last = G.guidePage === GUIDE.length - 1;
  var go = G.guideFrom === 'start' ? '開始遊戲' : '回到遊戲';
  ctx.fillStyle = '#c8cde0'; ctx.font = '22px sans-serif';
  ctx.fillText('← 上一頁    → 下一頁    Z ' + (last ? go : '下一頁'), W / 2, 668);
  ctx.fillStyle = '#7f869c'; ctx.font = '16px sans-serif';
  ctx.fillText('遊戲中在主堡區外按空白鍵可再叫出說明', W / 2, 698);
}

function render() {
  var sx = canvas.width / W, sy = canvas.height / H;
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
  if (G.screen === 'guide') { drawGuide(); return; }
  drawScene();
  if (G.screen === 'result') {
    Art.drawResult(ctx, { win: G.win, wave: G.wavesReached, totalWaves: TOTAL_WAVES,
      comboCount: Object.keys(G.found).length, confusedCount: G.confusedTotal });
  }
}

// ---------------------------------------------------------------- 主迴圈
function step(rdt) {
  if (G.screen === 'play') {
    if (P) P.shake = Math.min(0.25, P.shake + rdt);
    updateWorld(P ? rdt * 0.2 : rdt, rdt);
  } else if (G.screen === 'result') {
    G.resultT += rdt;
  }
}

var lastTs = null;
function frame(ts) {
  requestAnimationFrame(frame);
  var dt = lastTs === null ? 0 : (ts - lastTs) / 1000;
  lastTs = ts;
  if (!(dt > 0)) dt = 0;
  if (dt > 1 / 30) dt = 1 / 30;
  try { step(dt); render(); } catch (err) { console.error(err); }
}

function resize() {
  var dpr = window.devicePixelRatio || 1;
  var s = Math.min(window.innerWidth / W, window.innerHeight / H);
  var cw = Math.floor(W * s), ch = Math.floor(H * s);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
}

function boot() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  newGame('guide');
  requestAnimationFrame(frame);
}
if (typeof document !== 'undefined' && document.getElementById && !(typeof __NO_BOOT !== 'undefined' && __NO_BOOT)) boot();
