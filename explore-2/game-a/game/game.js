// 魂匠親征 — 玩法驗證 Demo。只用鍵盤。繪製一律呼叫 Art.drawXxx(ctx, state)。
(function () {
'use strict';

var W = Art.canvas.width, H = Art.canvas.height;
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var dpr = window.devicePixelRatio || 1;
canvas.width = Math.round(W * dpr);
canvas.height = Math.round(H * dpr);

// ---------- 常數 ----------
var CASTLE = { x: 1150, y: 400, half: 56 };
var ROUTES = {
  north: [[0, 170], [560, 170], [720, 400], [1150, 400]],
  south: [[0, 630], [560, 630], [720, 400], [1150, 400]]
};
var GATES = { north: [10, 170], south: [10, 630] };
var ETYPES = {
  imp:    { name: '小鬼', hp: 30, speed: 45, half: 16, slots: ['melee', 'march'], coins: 1, dmg: 2 },
  archer: { name: '弓鬼', hp: 24, speed: 45, half: 16, slots: ['ranged', 'march'], coins: 2, dmg: 2 },
  brute:  { name: '狂鬼', hp: 70, speed: 40, half: 22, slots: ['melee', 'seek', 'march'], coins: 2, dmg: 3 },
  shield: { name: '盾鬼', hp: 60, speed: 36, half: 20, slots: ['guard', 'melee', 'march'], coins: 3, dmg: 3 },
  frost:  { name: '冰鬼', hp: 40, speed: 42, half: 16, slots: ['ranged', 'frost', 'march'], coins: 3, dmg: 3 }
};
var COMBO_ORDER = ['pierce', 'ice', 'whirl', 'bash'];
var COMBO_NAME = { pierce: '穿透箭', ice: '冰箭', whirl: '旋風斬', bash: '盾擊' };
var MARCH_SPEED_OTHER = 45; // 非敵人的進攻主堡速度(規格只給中立 45, 其他沿用)
var TOTAL_WAVES = 6;

var WAVES = [
  { north: rep('imp', 5) },
  { south: rep('imp', 4).concat(rep('archer', 2)) },
  { north: rep('brute', 2).concat(['shield']), south: rep('imp', 4) },
  { south: rep('frost', 2).concat(rep('brute', 2)), north: rep('archer', 3) },
  { north: rep('shield', 2).concat(rep('brute', 3)), south: rep('frost', 2).concat(rep('imp', 4)) },
  { north: rep('imp', 4).concat(rep('brute', 2), ['shield', 'frost']), south: rep('imp', 4).concat(rep('brute', 2), ['shield', 'frost']) }
];
function rep(t, n) { var a = []; for (var i = 0; i < n; i++) a.push(t); return a; }

var GUIDE = [
  { t: '守住主堡', d: '撐過 6 波, 別讓鬼走進主堡', min: [480, 270] },
  { t: '移動與撿錢', d: 'WASD 移動, 走過金幣就撿起', min: [400, 240] },
  { t: '拿魂件', d: '按 J 開窗選格, 拿到身上就生效', min: [560, 280] },
  { t: '裝魂件', d: '選身上那排, 按 J 裝給它', min: [520, 260] },
  { t: '搶活鬼', d: '活鬼也能搶, 要貼著撐一下', min: [440, 260] },
  { t: '被打倒', d: '被打倒, 身上魂件掉在原地', min: [480, 240] },
  { t: '購買', d: '主堡旁按 1~6 購買', min: [580, 300] },
  { t: '招募中立單位', d: '中立單位裝上進攻主堡會投靠', min: [480, 270] }
];

// ---------- 狀態 ----------
var screen = 'guide';       // guide | play | result
var guidePage = 1, guideReturn = 'start';
var keys = {};
var jBlock = false;
var G; // 一局的所有狀態
var idSeq = 1;

function newGame() {
  G = {
    t: 0, gold: 40, castleHp: 20, win: false, resultAge: 0,
    units: [], enemies: [], corpses: [], piles: [], coins: [],
    projs: [], beams: [], whirls: [], sparks: [], names: [],
    seen: {}, popup: null, steal: null, golemUnlocked: false,
    carryingKit: false, castleHit: 0.3, events: [], evIdx: 0, lastEvT: 0,
    curTarget: null, enemyList: [], allyList: []
  };
  G.castle = { kind: 'castle', team: 'ally', id: idSeq++, x: CASTLE.x, y: CASTLE.y, half: 56,
    slots: ['ranged', 'ranged', null], cap: 3, maxCap: 4, cd: {}, attackAge: 0.15, hitAge: 0.2,
    combos: null, fx: null, slowT: 0, auraSlow: 1, dirx: 0, diry: 0, moving: false, downed: 0 };
  refresh(G.castle, false);
  [[420, 250], [420, 550], [880, 320]].forEach(function (p) {
    var u = mkUnit('tower', p[0], p[1], 'ally'); u.slots = ['ranged', null]; refresh(u, false); G.units.push(u);
  });
  [[300, 400], [880, 600]].forEach(function (p) {
    G.units.push(mkUnit('golem', p[0], p[1], 'neutral'));
  });
  G.player = { kind: 'player', team: 'ally', id: idSeq++, x: 1000, y: 500, half: 16, hp: 100, maxHp: 100,
    slots: ['melee', null, null], cap: 3, maxCap: 3, cd: {}, attackAge: 0.15, hitAge: 0.2, invuln: 0,
    combos: null, fx: null, slowT: 0, auraSlow: 1, dirx: 0, diry: 0, moving: false, downed: 0 };
  refresh(G.player, false);
  // 波次事件表
  WAVES.forEach(function (w, k) {
    var start = 12 + k * 24;
    Object.keys(w).forEach(function (gate) {
      w[gate].forEach(function (ty, j) { G.events.push({ t: start + j * 1.2, gate: gate, type: ty }); });
    });
  });
  G.events.sort(function (a, b) { return a.t - b.t; });
  G.lastEvT = G.events[G.events.length - 1].t;
}

function mkUnit(kind, x, y, team) {
  var u = { kind: kind, team: team, id: idSeq++, x: x, y: y, moving: false, downed: 0, cd: {},
    hitAge: 0.2, attackAge: 0.15, slowT: 0, auraSlow: 1, dirx: 0, diry: 0, combos: null, fx: null,
    follower: false, following: false, dead: false, gone: false };
  if (kind === 'tower') { u.half = 24; u.hp = u.maxHp = 150; u.cap = 2; u.maxCap = 4; u.slots = [null, null]; }
  else if (kind === 'soldier') { u.half = 16; u.hp = u.maxHp = 80; u.cap = 2; u.maxCap = 2; u.slots = ['melee', 'seek']; }
  else if (kind === 'golem') { u.half = 28; u.hp = u.maxHp = 260; u.cap = 3; u.maxCap = 4; u.slots = [null, null, null]; }
  refresh(u, false);
  return u;
}

function mkEnemy(type, gate) {
  var d = ETYPES[type];
  var e = { kind: 'enemy', team: 'enemy', etype: type, id: idSeq++, x: GATES[gate][0], y: GATES[gate][1],
    half: d.half, hp: d.hp, maxHp: d.hp, slots: d.slots.slice(), cap: d.slots.length, maxCap: d.slots.length,
    speed: d.speed, path: ROUTES[gate], seg: 1, moving: false, downed: 0, cd: {}, hitAge: 0.2, attackAge: 0.15,
    slowT: 0, auraSlow: 1, dirx: 0, diry: 0, combos: null, fx: null, dead: false };
  refresh(e, false);
  return e;
}

// ---------- 組合與效果 ----------
function analyze(slots) {
  var c = { ranged: 0, melee: 0, seek: 0, march: 0, guard: 0, frost: 0 };
  slots.forEach(function (s) { if (s && c[s] !== undefined) c[s]++; });
  var k = { pierce: 0, ice: 0, whirl: 0, bash: 0 };
  k.pierce = Math.floor(c.ranged / 2); c.ranged -= 2 * k.pierce;
  k.ice = Math.min(c.ranged, c.frost); c.ranged -= k.ice; c.frost -= k.ice;
  k.whirl = Math.floor(c.melee / 2); c.melee -= 2 * k.whirl;
  k.bash = Math.min(c.melee, c.guard); c.melee -= k.bash; c.guard -= k.bash;
  return { c: c, k: k };
}

function refresh(u, announce) {
  var a = analyze(u.slots), c = a.c, k = a.k;
  var atk = [], i;
  for (i = 0; i < k.pierce; i++) atk.push({ key: 'pierce' + i, type: 'pierce', range: 260, period: 1.0, dmg: 14 });
  for (i = 0; i < k.ice; i++) atk.push({ key: 'ice' + i, type: 'ice', range: 200, period: 1.0, dmg: 10 });
  for (i = 0; i < k.whirl; i++) atk.push({ key: 'whirl' + i, type: 'whirl', range: 60, period: 0.8, dmg: 16 });
  for (i = 0; i < k.bash; i++) atk.push({ key: 'bash' + i, type: 'bash', range: 0, period: 0.8, dmg: 18 });
  if (c.ranged > 0) atk.push({ key: 'ranged', type: 'ranged', range: 200, period: 1.0, dmg: 8 * c.ranged });
  if (c.melee > 0) atk.push({ key: 'melee', type: 'melee', range: 0, period: 0.8, dmg: 12 * c.melee });
  var gm = Math.max(0.25, Math.pow(0.5, c.guard));
  if (k.bash > 0) gm *= 0.4;
  u.fx = { attacks: atk, seekN: c.seek, march: c.march > 0, frost: c.frost > 0, dmgMul: gm,
    hasRanged: c.ranged > 0 || k.pierce > 0 || k.ice > 0 };
  var old = u.combos || { pierce: 0, ice: 0, whirl: 0, bash: 0 };
  if (announce) {
    for (i = 0; i < COMBO_ORDER.length; i++) {
      var n = COMBO_ORDER[i];
      if (k[n] > old[n]) {
        G.names.push({ unit: u, name: COMBO_NAME[n], isNew: !G.seen[n], age: 0, lx: u.x, ly: u.y });
        G.seen[n] = true;
        break;
      }
    }
  }
  u.combos = k;
}

// ---------- 工具 ----------
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function isLive(o) {
  if (o.kind === 'player') return o.invuln <= 0 && o.hp > 0;
  if (o.kind === 'enemy') return !o.dead;
  return o.downed <= 0 && !o.gone;
}
function hostilesOf(u) { return u.team === 'enemy' ? G.allyList : G.enemyList; }
function slowMul(u) { return Math.min(u.slowT > 0 ? 0.5 : 1, u.auraSlow); }
function touchDist(a, b) { return a.half + b.half + 12; }
function nearest(list, from, range, touch) {
  var best = null, bd = 1e9;
  for (var i = 0; i < list.length; i++) {
    var o = list[i];
    if (!isLive(o)) continue;
    var d = dist(from, o);
    var lim = touch ? touchDist(from, o) : range;
    if (d <= lim && d < bd) { bd = d; best = o; }
  }
  return best;
}
function segDist(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  var t = l2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function projectOnPath(path, x, y) {
  var best = { d: 1e9, px: 0, py: 0, i: 0 };
  for (var i = 0; i < path.length - 1; i++) {
    var x1 = path[i][0], y1 = path[i][1], x2 = path[i + 1][0], y2 = path[i + 1][1];
    var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    var t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l2));
    var px = x1 + t * dx, py = y1 + t * dy, d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { d: d, px: px, py: py, i: i };
  }
  return best;
}
function moveToward(u, tx, ty, speed, dt) {
  var dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
  if (d < 0.001) return 0;
  var step = Math.min(d, speed * slowMul(u) * dt);
  u.x += dx / d * step; u.y += dy / d * step;
  u.dirx = dx / d; u.diry = dy / d; u.moving = true;
  return d - step;
}
function rand(a, b) { return a + Math.random() * (b - a); }

// ---------- 傷害與死亡 ----------
function dealDamage(t, dmg) {
  if (!isLive(t)) return;
  dmg *= t.fx.dmgMul;
  t.hp -= dmg; t.hitAge = 0;
  G.sparks.push({ x: t.x, y: t.y, age: 0 });
  if (t.hp <= 0) kill(t);
}
function kill(t) {
  t.hp = 0;
  if (t.kind === 'enemy') {
    t.dead = true;
    G.corpses.push({ kind: 'corpse', etype: t.etype, x: t.x, y: t.y, half: t.half, slots: t.slots, life: 15, gone: false });
    var n = ETYPES[t.etype].coins;
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2), r = 40 * Math.sqrt(Math.random());
      G.coins.push({ x: t.x + Math.cos(a) * r, y: t.y + Math.sin(a) * r });
    }
  } else if (t.kind === 'player') {
    playerDown();
  } else {
    t.downed = 6; t.moving = false; t.slowT = 0;
  }
}
function playerDown() {
  var p = G.player;
  var items = p.slots.filter(function (s) { return s; });
  if (items.length) G.piles.push({ kind: 'pile', x: p.x, y: p.y, half: 16, slots: items, life: 15, gone: false });
  p.slots = [null, null, null];
  refresh(p, false);
  p.hp = p.maxHp; p.x = 1150; p.y = 490; p.invuln = 2; p.slowT = 0;
  G.steal = null; G.popup = null;
}

// ---------- 攻擊 ----------
function findAttackTarget(u, a) {
  var list = hostilesOf(u);
  if (a.type === 'melee' || a.type === 'bash') return nearest(list, u, 0, true);
  return nearest(list, u, a.range, false);
}
function fire(u, a, t) {
  var ang = Math.atan2(t.y - u.y, t.x - u.x), i, h, list;
  if (a.type === 'ranged' || a.type === 'ice') {
    G.projs.push({ x: u.x, y: u.y, vx: Math.cos(ang) * 400, vy: Math.sin(ang) * 400, angle: ang,
      team: u.team, kind: a.type === 'ice' ? 'ice' : 'normal', dmg: a.dmg, life: (a.range + 60) / 400 });
  } else if (a.type === 'pierce') {
    var ex = u.x + Math.cos(ang) * 260, ey = u.y + Math.sin(ang) * 260;
    G.beams.push({ x1: u.x, y1: u.y, x2: ex, y2: ey, team: u.team, age: 0 });
    list = hostilesOf(u).slice();
    for (i = 0; i < list.length; i++) {
      h = list[i];
      if (isLive(h) && segDist(h.x, h.y, u.x, u.y, ex, ey) <= 14) dealDamage(h, a.dmg);
    }
  } else if (a.type === 'whirl') {
    G.whirls.push({ x: u.x, y: u.y, team: u.team, age: 0 });
    list = hostilesOf(u).slice();
    for (i = 0; i < list.length; i++) {
      h = list[i];
      if (isLive(h) && dist(u, h) <= 60) dealDamage(h, a.dmg);
    }
  } else if (a.type === 'melee') {
    dealDamage(t, a.dmg);
  } else if (a.type === 'bash') {
    dealDamage(t, a.dmg);
    var dx = -t.dirx, dy = -t.diry;
    if (Math.abs(dx) + Math.abs(dy) < 0.001) {
      var l = Math.hypot(t.x - u.x, t.y - u.y) || 1; dx = (t.x - u.x) / l; dy = (t.y - u.y) / l;
    }
    t.x += dx * 24; t.y += dy * 24;
  }
}
function doAttacks(u, dt) {
  var engaged = false, atk = u.fx.attacks;
  for (var i = 0; i < atk.length; i++) {
    var a = atk[i];
    u.cd[a.key] = Math.max(0, (u.cd[a.key] || 0) - dt);
    var t = findAttackTarget(u, a);
    if (!t) continue;
    engaged = true;
    if (u.cd[a.key] <= 0) { u.cd[a.key] = a.period; u.attackAge = 0; fire(u, a, t); }
  }
  return engaged;
}

// ---------- 單位更新 ----------
function stepMover(u, dt) {
  u.moving = false;
  u.hitAge = Math.min(0.2, u.hitAge + dt);
  u.attackAge = Math.min(0.15, u.attackAge + dt);
  if (u.slowT > 0) u.slowT -= dt;
  if (u.downed > 0) {
    u.downed -= dt;
    if (u.downed <= 0) { u.downed = 0; u.hp = u.maxHp; }
    return;
  }
  var fx = u.fx;
  if (u.team === 'neutral') {
    if (fx.march) {
      moveToward(u, CASTLE.x, CASTLE.y, MARCH_SPEED_OTHER, dt);
      if (dist(u, CASTLE) <= 66) recruit(u);
    }
    return;
  }
  var engaged = doAttacks(u, dt);
  if (u.kind === 'enemy' && dist(u, CASTLE) <= 66) { hitCastle(u); return; }
  if (engaged) return;
  if (fx.seekN > 0) {
    var tg = nearest(hostilesOf(u), u, 240, false);
    if (tg) {
      var ad = fx.hasRanged ? 180 : touchDist(u, tg);
      if (dist(u, tg) > ad) moveToward(u, tg.x, tg.y, Math.min(70 * fx.seekN, 140), dt);
      return;
    }
  }
  if (fx.march) {
    if (u.kind === 'enemy') {
      var pr = projectOnPath(u.path, u.x, u.y);
      if (pr.d > 6) { u.seg = pr.i + 1; moveToward(u, pr.px, pr.py, u.speed, dt); }
      else {
        var wp = u.path[u.seg];
        var left = moveToward(u, wp[0], wp[1], u.speed, dt);
        if (left < 0.5 && u.seg < u.path.length - 1) u.seg++;
      }
    } else if (dist(u, CASTLE) > 56 + u.half) {
      moveToward(u, CASTLE.x, CASTLE.y, MARCH_SPEED_OTHER, dt);
    }
    return;
  }
  if (u.follower) {
    var d = dist(u, G.player);
    if (d > 70) u.following = true;
    if (u.following) {
      if (d > 50) moveToward(u, G.player.x, G.player.y, 200, dt); else u.following = false;
    }
  }
}
function hitCastle(e) {
  G.castleHp -= ETYPES[e.etype].dmg;
  G.castleHit = 0;
  e.dead = true; // 不留屍體、不掉金幣
}
function recruit(u) {
  u.gone = true;
  var items = u.slots.filter(function (s) { return s; });
  if (items.length) G.piles.push({ kind: 'pile', x: 1150, y: 490, half: 16, slots: items, life: 15, gone: false });
  G.golemUnlocked = true;
}

// ---------- 互動目標 / 彈窗 ----------
function computeTarget() {
  var p = G.player, best = null, bd = 1e9;
  function chk(o) {
    if (o.gone || o.dead) return;
    var d = dist(p, o);
    if (d <= o.half + 48 && d < bd) { bd = d; best = o; }
  }
  G.units.forEach(chk); chk(G.castle);
  G.enemies.forEach(chk); G.corpses.forEach(chk); G.piles.forEach(chk);
  return best;
}
function titleOf(o) {
  if (o.kind === 'tower') return '箭塔';
  if (o.kind === 'soldier') return '步兵';
  if (o.kind === 'golem') return o.team === 'neutral' ? '中立石魔像' : '石魔像';
  if (o.kind === 'castle') return '主堡';
  if (o.kind === 'enemy') return ETYPES[o.etype].name + '(活)';
  if (o.kind === 'corpse') return ETYPES[o.etype].name + '的屍體';
  return '魂件堆';
}
function firstEmpty(arr) { return arr.indexOf(null); }
function canEquipTo(tg) { return tg.kind !== 'corpse' && tg.kind !== 'pile' && tg.kind !== 'enemy'; }
function canExpand(tg) { return canEquipTo(tg) && tg.maxCap > tg.cap; }

function openPopup(tg) {
  var p = G.player, row = 'top', idx = 0, i;
  var top = tg.slots, found = -1;
  for (i = 0; i < top.length; i++) if (top[i]) { found = i; break; }
  if (found >= 0) { row = 'top'; idx = found; }
  else {
    for (i = 0; i < p.slots.length; i++) if (p.slots[i]) { found = i; break; }
    if (found >= 0) { row = 'bottom'; idx = found; }
  }
  G.popup = { target: tg, row: row, index: idx, shakeAge: 0.25 };
}
function shake() { G.popup.shakeAge = 0; }
function popupConfirm() {
  var po = G.popup, tg = po.target, p = G.player;
  var arr = po.row === 'top' ? tg.slots : p.slots;
  var item = arr[po.index];
  if (!item) return shake();
  if (po.row === 'top') {
    var pi = firstEmpty(p.slots);
    if (pi < 0) return shake();
    if (tg.kind === 'enemy') {
      G.popup = null;
      G.steal = { target: tg, slot: po.index, t: 0 };
      return;
    }
    p.slots[pi] = item; tg.slots[po.index] = null;
    refresh(p, true);
    if (tg.fx) refresh(tg, false);
    if (tg.kind === 'pile' && tg.slots.every(function (s) { return !s; })) { tg.gone = true; G.popup = null; }
  } else {
    if (item === 'slotStone') {
      if (canExpand(tg)) { tg.cap++; tg.slots.push(null); p.slots[po.index] = null; refresh(p, false); }
      else shake();
      return;
    }
    if (!canEquipTo(tg)) return shake();
    var ti = firstEmpty(tg.slots);
    if (ti < 0) return shake();
    tg.slots[ti] = item; p.slots[po.index] = null;
    refresh(p, false);
    refresh(tg, true);
  }
}
function actionLabel() {
  var po = G.popup, tg = po.target, p = G.player;
  var arr = po.row === 'top' ? tg.slots : p.slots;
  var item = arr[po.index];
  if (!item) return '';
  if (po.row === 'top') {
    if (firstEmpty(p.slots) < 0) return '';
    return tg.kind === 'enemy' ? '搶奪' : '拿到身上';
  }
  if (item === 'slotStone') return canExpand(tg) ? '擴槽' : '';
  if (!canEquipTo(tg) || firstEmpty(tg.slots) < 0) return '';
  return '裝上去';
}
function popupValid() {
  var po = G.popup, tg = po.target;
  if (tg.gone || tg.dead) return false;
  if (dist(G.player, tg) > tg.half + 68) return false;
  return true;
}

// ---------- 搶奪 ----------
function updateSteal(dt) {
  var s = G.steal; if (!s) return;
  var t = s.target, p = G.player;
  if (t.dead || dist(p, t) > t.half + 68 || !t.slots[s.slot]) { G.steal = null; return; }
  s.t += dt;
  if (s.t >= 1.5) {
    var pi = firstEmpty(p.slots);
    if (pi >= 0) {
      p.slots[pi] = t.slots[s.slot]; t.slots[s.slot] = null;
      refresh(p, true); refresh(t, false);
    }
    G.steal = null;
  }
}

// ---------- 蓋塔 / 購買 ----------
function validBuild(x, y) {
  if (x < 24 || x > 1256 || y < 74 || y > 696) return false;
  var rd = Math.min(projectOnPath(ROUTES.north, x, y).d, projectOnPath(ROUTES.south, x, y).d);
  if (rd < 52) return false;
  if (Math.hypot(x - CASTLE.x, y - CASTLE.y) < 90) return false;
  var i, o;
  for (i = 0; i < G.units.length; i++) { o = G.units[i]; if (!o.gone && Math.hypot(x - o.x, y - o.y) < 50) return false; }
  for (i = 0; i < G.enemies.length; i++) { o = G.enemies[i]; if (!o.dead && Math.hypot(x - o.x, y - o.y) < 50) return false; }
  return true;
}
function tryBuild() {
  var p = G.player;
  if (!validBuild(p.x, p.y)) return;
  var u = mkUnit('tower', p.x, p.y, 'ally');
  G.units.push(u);
  G.carryingKit = false;
}
function inZone() { return dist(G.player, CASTLE) <= 120; }
var SHOP = [
  { name: '箭塔材料', price: 15 }, { name: '步兵', price: 12 }, { name: '遠攻', price: 10 },
  { name: '近戰', price: 10 }, { name: '擴槽石', price: 20 }, { name: '石魔像', price: 18 }
];
function shopState(i) {
  if (i === 5 && !G.golemUnlocked) return 'locked';
  var it = SHOP[i];
  if (G.gold < it.price) return 'poor';
  if (i === 0 && G.carryingKit) return 'poor';
  if (i >= 2 && i <= 4 && firstEmpty(G.player.slots) < 0) return 'poor';
  return 'ok';
}
function buy(i) {
  if (shopState(i) !== 'ok') return;
  var p = G.player;
  G.gold -= SHOP[i].price;
  if (i === 0) G.carryingKit = true;
  else if (i === 1 || i === 5) {
    var a = rand(0, Math.PI * 2);
    var u = mkUnit(i === 1 ? 'soldier' : 'golem', p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 40, 'ally');
    u.follower = true; G.units.push(u);
  } else {
    p.slots[firstEmpty(p.slots)] = ['ranged', 'melee', 'slotStone'][i - 2];
    refresh(p, true);
  }
}

// ---------- 主更新 ----------
function updateSpawns() {
  while (G.evIdx < G.events.length && G.events[G.evIdx].t <= G.t) {
    var ev = G.events[G.evIdx++];
    G.enemies.push(mkEnemy(ev.type, ev.gate));
  }
}
function update(dt) {
  if (screen === 'result') { G.resultAge += dt; return; }
  if (screen !== 'play') return;
  var po = G.popup;
  var gdt = dt * (po ? 0.2 : 1);
  var p = G.player, i;
  G.t += gdt;
  updateSpawns();

  // 快取敵對清單
  G.enemyList = G.enemies.filter(function (e) { return !e.dead; });
  G.allyList = [p];
  G.units.forEach(function (u) { if (u.team === 'ally' && !u.gone) G.allyList.push(u); });

  // 冰霜光環減速
  var all = [p, G.castle].concat(G.units, G.enemies);
  all.forEach(function (o) { o.auraSlow = 1; });
  all.forEach(function (o) {
    if (!o.fx || !o.fx.frost || o.dead || o.gone || o.downed > 0) return;
    if (o.team === 'neutral') return;
    hostilesOf(o).forEach(function (h) { if (isLive(h) && dist(o, h) <= 70) h.auraSlow = Math.min(h.auraSlow, 0.7); });
  });

  // 玩家
  p.moving = false;
  p.hitAge = Math.min(0.2, p.hitAge + gdt);
  p.attackAge = Math.min(0.15, p.attackAge + gdt);
  if (p.slowT > 0) p.slowT -= gdt;
  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - gdt);
  if (!po) {
    var dx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), dy = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
    if (dx || dy) {
      var l = Math.hypot(dx, dy), sp = 240 * slowMul(p) * gdt;
      p.x = Math.max(16, Math.min(W - 16, p.x + dx / l * sp));
      p.y = Math.max(66, Math.min(H - 16, p.y + dy / l * sp));
      p.moving = true;
    }
  }
  if (inZone() && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 20 * gdt);
  doAttacks(p, gdt);

  // 主堡
  G.castle.attackAge = Math.min(0.15, G.castle.attackAge + gdt);
  doAttacks(G.castle, gdt);
  G.castleHit = Math.min(0.3, G.castleHit + gdt);

  // 單位與敵人
  G.units.slice().forEach(function (u) { if (!u.gone) stepMover(u, gdt); });
  G.enemies.slice().forEach(function (e) { if (!e.dead) stepMover(e, gdt); });

  // 投射物
  G.projs.forEach(function (pr) {
    pr.x += pr.vx * gdt; pr.y += pr.vy * gdt; pr.life -= gdt;
    var list = pr.team === 'enemy' ? G.allyList : G.enemyList;
    var h = null;
    for (var j = 0; j < list.length; j++) {
      var o = list[j];
      if (isLive(o) && Math.hypot(o.x - pr.x, o.y - pr.y) <= o.half + 5) { h = o; break; }
    }
    if (h) {
      dealDamage(h, pr.dmg);
      if (pr.kind === 'ice') h.slowT = 2;
      pr.life = -1;
    }
  });
  G.projs = G.projs.filter(function (pr) { return pr.life > 0; });

  // 特效計時
  G.beams.forEach(function (b) { b.age += gdt; });
  G.whirls.forEach(function (b) { b.age += gdt; });
  G.sparks.forEach(function (b) { b.age += gdt; });
  G.names.forEach(function (b) { b.age += gdt; if (b.unit) { b.lx = b.unit.x; b.ly = b.unit.y; } });
  G.beams = G.beams.filter(function (b) { return b.age < 0.15; });
  G.whirls = G.whirls.filter(function (b) { return b.age < 0.25; });
  G.sparks = G.sparks.filter(function (b) { return b.age < 0.25; });
  G.names = G.names.filter(function (b) { return b.age < 1.5; });
  if (po) po.shakeAge = Math.min(0.25, po.shakeAge + gdt);

  updateSteal(gdt);

  // 金幣
  G.coins = G.coins.filter(function (c) {
    if (Math.hypot(c.x - p.x, c.y - p.y) <= 34) { G.gold += 2; return false; }
    return true;
  });
  // 屍體 / 魂件堆
  G.corpses.forEach(function (c) { c.life -= gdt; if (c.life <= 0) c.gone = true; });
  G.piles.forEach(function (c) { c.life -= gdt; if (c.life <= 0) c.gone = true; });
  G.corpses = G.corpses.filter(function (c) { return !c.gone; });
  G.piles = G.piles.filter(function (c) { return !c.gone; });
  G.enemies = G.enemies.filter(function (e) { return !e.dead; });
  G.units = G.units.filter(function (u) { return !u.gone; });

  // 彈窗自動關閉
  if (G.popup && !popupValid()) G.popup = null;

  G.curTarget = G.popup ? G.popup.target : computeTarget();

  // 結束判定(批次最尾端)
  if (G.castleHp <= 0) { G.castleHp = 0; endGame(false); }
  else if (G.evIdx >= G.events.length && G.enemies.length === 0) endGame(true);
}
function waveInfo() {
  var started = 0, next = -1;
  for (var k = 0; k < TOTAL_WAVES; k++) {
    var st = 12 + k * 24;
    if (st <= G.t) started = k + 1; else if (next < 0) next = st;
  }
  return { started: started, nextIn: next < 0 ? -1 : Math.ceil(next - G.t) };
}
function endGame(win) {
  G.win = win; G.resultAge = 0; G.popup = null; G.steal = null;
  screen = 'result';
}

// ---------- 輸入 ----------
var GAME_KEYS = {};
['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyH', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6',
  'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6'].forEach(function (k) { GAME_KEYS[k] = true; });

function closeGuide() {
  if (guideReturn === 'start') { newGame(); }
  screen = 'play';
  jBlock = !!keys.KeyJ;
}
function pressJ() {
  if (screen === 'guide') {
    if (guidePage < GUIDE.length) guidePage++; else closeGuide();
    return;
  }
  if (screen === 'result') {
    if (G.resultAge >= 0.5) { newGame(); screen = 'play'; jBlock = true; }
    return;
  }
  if (jBlock) return;
  if (G.steal) { G.steal = null; return; }
  if (G.popup) { popupConfirm(); return; }
  if (G.carryingKit) { tryBuild(); return; }
  if (G.curTarget) openPopup(G.curTarget);
}
function onKeyDown(e) {
  var c = e.code;
  if (!GAME_KEYS[c]) return;
  e.preventDefault();
  if (e.repeat) return;
  keys[c] = true;
  if (c === 'KeyJ') return pressJ();
  if (screen === 'guide') {
    if (c === 'ArrowLeft' && guidePage > 1) guidePage--;
    return;
  }
  if (screen !== 'play') return;
  if (G.popup) {
    var po = G.popup, len = po.row === 'top' ? po.target.slots.length : 3;
    if (c === 'ArrowLeft') po.index = (po.index - 1 + len) % len;
    else if (c === 'ArrowRight') po.index = (po.index + 1) % len;
    else if (c === 'ArrowUp') { po.row = 'top'; po.index = Math.min(po.index, po.target.slots.length - 1); }
    else if (c === 'ArrowDown') { po.row = 'bottom'; po.index = Math.min(po.index, 2); }
    else if (c === 'KeyK') G.popup = null;
    return;
  }
  if (c === 'KeyH') { screen = 'guide'; guidePage = 1; guideReturn = 'play'; return; }
  var m = /^(?:Digit|Numpad)([1-6])$/.exec(c);
  if (m && inZone()) buy(+m[1] - 1);
}
function onKeyUp(e) {
  if (!GAME_KEYS[e.code]) return;
  e.preventDefault();
  keys[e.code] = false;
  if (e.code === 'KeyJ') jBlock = false;
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', function () { keys = {}; });

// ---------- 繪製 ----------
var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
function slotPos(o) {
  var off = (o.kind === 'corpse' || o.kind === 'pile') ? 12 : 20;
  return { x: o.x, y: o.y - o.half - off };
}
function drawGuide() {
  var g = GUIDE[guidePage - 1];
  ctx.fillStyle = '#1b1f2a'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd36b'; ctx.font = 'bold 44px ' + FONT;
  ctx.fillText('第 ' + guidePage + ' 頁  ' + g.t, W / 2, 62);
  ctx.fillStyle = '#ffffff'; ctx.font = '30px ' + FONT;
  ctx.fillText(g.d, W / 2, 124);
  var fw = Math.round(g.min[0] * 1.4), fh = Math.round(g.min[1] * 1.4);
  var fx = Math.round((W - fw) / 2), fy = 190 + Math.round((420 - fh) / 2);
  Art.drawGuidePage(ctx, { page: guidePage, x: fx, y: fy, w: fw, h: fh });
  ctx.fillStyle = '#aab4c8'; ctx.font = '24px ' + FONT;
  var last = guidePage === GUIDE.length;
  var act = last ? (guideReturn === 'start' ? 'J 開始遊戲' : 'J 回到遊戲') : 'J 下一頁';
  ctx.fillText((guidePage > 1 ? '← 上一頁    ' : '') + act + '    (' + guidePage + ' / ' + GUIDE.length + ')', W / 2, 676);
}
function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (screen === 'guide' || !G) { drawGuide(); return; }
  var p = G.player, tgt = G.curTarget, i;
  Art.drawBackground(ctx, {});
  G.coins.forEach(function (c) { Art.drawCoin(ctx, { x: c.x, y: c.y }); });
  var auras = [p, G.castle].concat(G.units, G.enemies);
  auras.forEach(function (o) {
    if (o.fx && o.fx.frost && !o.dead && !o.gone && o.downed <= 0 && o.team !== 'neutral')
      Art.drawFrostAura(ctx, { x: o.x, y: o.y, radius: 70, team: o.team });
  });
  G.corpses.forEach(function (c) {
    Art.drawCorpse(ctx, { kind: c.etype, x: c.x, y: c.y, life: c.life, maxLife: 15, targeted: c === tgt });
  });
  G.piles.forEach(function (c) {
    Art.drawSoulPile(ctx, { x: c.x, y: c.y, life: c.life, maxLife: 15, targeted: c === tgt });
  });
  // 單位依 y 排序
  var items = [{ y: G.castle.y, o: G.castle }, { y: p.y, o: p }];
  G.units.forEach(function (u) { items.push({ y: u.y, o: u }); });
  G.enemies.forEach(function (e) { items.push({ y: e.y, o: e }); });
  items.sort(function (a, b) { return a.y - b.y; });
  items.forEach(function (it) { drawObj(it.o, tgt); });
  // 槽列
  var slotObjs = [G.castle, p].concat(G.units, G.enemies, G.corpses, G.piles);
  slotObjs.forEach(function (o) {
    var sp = slotPos(o);
    Art.drawSoulSlots(ctx, { x: sp.x, y: sp.y, slots: o.slots.slice() });
  });
  G.projs.forEach(function (pr) { Art.drawProjectile(ctx, { x: pr.x, y: pr.y, angle: pr.angle, team: pr.team, kind: pr.kind }); });
  G.beams.forEach(function (b) { Art.drawPierceBeam(ctx, { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, team: b.team, age: b.age, duration: 0.15 }); });
  G.whirls.forEach(function (b) { Art.drawWhirl(ctx, { x: b.x, y: b.y, radius: 60, team: b.team, age: b.age, duration: 0.25 }); });
  G.sparks.forEach(function (b) { Art.drawHitSpark(ctx, { x: b.x, y: b.y, age: b.age, duration: 0.25 }); });
  if (G.steal) {
    var s = G.steal, sp2 = slotPos(s.target), n = s.target.slots.length;
    Art.drawStealLink(ctx, { x1: p.x, y1: p.y, x2: sp2.x - n * 10 + 10 + 20 * s.slot, y2: sp2.y, progress: Math.min(1, s.t / 1.5) });
  }
  G.names.forEach(function (b) {
    Art.drawComboName(ctx, { x: b.lx, y: b.ly - (b.unit ? b.unit.half : 16) - 44, name: b.name, isNew: b.isNew, age: b.age, duration: 1.5 });
  });
  var wi = waveInfo();
  [['north', 0], ['south', 1]].forEach(function (g) {
    for (var k = 0; k < TOTAL_WAVES; k++) {
      var w = WAVES[k];
      if (!w[g[0]]) continue;
      var rem = 12 + k * 24 - G.t;
      if (rem > 0 && rem <= 6) Art.drawSpawnWarning(ctx, { gate: g[0], remaining: rem, total: 6 });
    }
  });
  if (G.carryingKit) Art.drawTowerPreview(ctx, { x: p.x, y: p.y, valid: validBuild(p.x, p.y) });
  if (inZone() && !G.popup) {
    var shop = [];
    for (i = 0; i < 6; i++) shop.push({ key: String(i + 1), name: SHOP[i].name, price: SHOP[i].price, state: shopState(i) });
    Art.drawShopPanel(ctx, { items: shop });
  }
  Art.drawHud(ctx, { gold: G.gold, castleHp: G.castleHp, castleMaxHp: 20, playerHp: Math.ceil(p.hp), playerMaxHp: 100,
    wave: wi.started, totalWaves: TOTAL_WAVES, nextWaveIn: wi.nextIn });
  if (G.popup) {
    Art.drawSlowMo(ctx, {});
    var po = G.popup, tg = po.target, pw = Math.max(tg.slots.length, 3) * 48 + 64, ph = 140;
    var px = Math.max(pw / 2, Math.min(W - pw / 2, tg.x));
    var py = tg.y - tg.half - 110;
    if (py - ph / 2 < 0) py = tg.y + tg.half + 12 + ph / 2;
    py = Math.max(ph / 2, Math.min(H - ph / 2, py));
    Art.drawSoulPopup(ctx, { x: px, y: py, w: pw, h: ph, title: titleOf(tg), topSlots: tg.slots.slice(),
      bottomSlots: p.slots.slice(), row: po.row, index: po.index, actionLabel: actionLabel(),
      shakeAge: po.shakeAge, shakeDuration: 0.25 });
  }
  if (screen === 'result') Art.drawResult(ctx, { win: G.win, wave: G.win ? TOTAL_WAVES : Math.max(1, wi.started), totalWaves: TOTAL_WAVES });
}
function drawObj(o, tgt) {
  var t = o === tgt;
  if (o.kind === 'castle') {
    Art.drawCastle(ctx, { x: o.x, y: o.y, hitAge: G.castleHit, hitDuration: 0.3, zoneActive: inZone(), targeted: t });
  } else if (o.kind === 'player') {
    var s = G.steal;
    Art.drawPlayer(ctx, { x: o.x, y: o.y, moving: o.moving, hp: Math.ceil(o.hp), maxHp: o.maxHp, hitAge: o.hitAge, hitDuration: 0.2,
      attackAge: o.attackAge, attackDuration: 0.15, invulnRemaining: o.invuln, invulnTotal: 2,
      stealing: !!s, stealProgress: s ? Math.min(1, s.t / 1.5) : 0, carryingKit: G.carryingKit });
  } else if (o.kind === 'enemy') {
    Art.drawEnemy(ctx, { type: o.etype, x: o.x, y: o.y, hp: o.hp, maxHp: o.maxHp, hitAge: o.hitAge, hitDuration: 0.2,
      attackAge: o.attackAge, attackDuration: 0.15, moving: o.moving, slowed: slowMul(o) < 1, targeted: t });
  } else {
    var st = { x: o.x, y: o.y, hp: o.hp, maxHp: o.maxHp, hitAge: o.hitAge, hitDuration: 0.2,
      attackAge: o.attackAge, attackDuration: 0.15, moving: o.moving, downedRemaining: o.downed,
      downedTotal: 6, targeted: t };
    if (o.kind === 'tower') Art.drawTower(ctx, st);
    else if (o.kind === 'soldier') Art.drawSoldier(ctx, st);
    else { st.team = o.team; Art.drawGolem(ctx, st); }
  }
}

// ---------- 主迴圈 ----------
var last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  var dt = (ts - last) / 1000; last = ts;
  if (!(dt > 0)) dt = 0;
  dt = Math.min(dt, 1 / 30);
  try { update(dt); render(); } catch (err) { console.error(err); }
}
newGame();
requestAnimationFrame(function (ts) { last = ts; requestAnimationFrame(frame); });
})();
