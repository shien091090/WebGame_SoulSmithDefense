(function () {
'use strict';

var W = Art.canvas.width, H = Art.canvas.height;
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr; canvas.height = H * dpr;
function fit() {
  var s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
}
fit(); window.addEventListener('resize', fit);

// 沒有 style.md 缺少的圖形, 不需要佔位
var Placeholder = {};

// ---------- 常數 ----------
var PATH = [[0,130],[1060,130],[1060,300],[220,300],[220,470],[1180,470]];
var SEGLEN = [], PATHCUM = [0], PATHLEN = 0;
(function () {
  for (var i = 0; i < PATH.length - 1; i++) {
    var l = Math.hypot(PATH[i+1][0]-PATH[i][0], PATH[i+1][1]-PATH[i][1]);
    SEGLEN.push(l); PATHLEN += l; PATHCUM.push(PATHLEN);
  }
})();
var CASTLE = { x: 1180, y: 470, r: 56 };
var SLOWMO = 0.2;
var SOULS = { ranged:1, melee:1, seek:1, march:1, frost:1, blast:1 };
var COMBOS = [
  { name:'穿透箭', a:'ranged', b:'ranged' },
  { name:'冰箭', a:'ranged', b:'frost' },
  { name:'爆裂彈', a:'ranged', b:'blast' },
  { name:'旋風斬', a:'melee', b:'melee' },
  { name:'冰霜重擊', a:'melee', b:'frost' },
  { name:'爆裂拳', a:'melee', b:'blast' }
];
var ETYPES = {
  imp:   { name:'小鬼',   hp:40, speed:45, half:16, souls:['melee','march'],  coins:1, dmg:2, fly:false },
  armor: { name:'鐵甲鬼', hp:90, speed:34, half:20, souls:['blast','march'],  coins:3, dmg:3, fly:false },
  bat:   { name:'蝠鬼',   hp:30, speed:55, half:16, souls:['ranged','march'], coins:2, dmg:2, fly:true },
  swarm: { name:'群鬼',   hp:10, speed:50, half:10, souls:['march'],          coins:1, dmg:1, fly:false },
  swift: { name:'疾鬼',   hp:35, speed:95, half:16, souls:['frost','march'],  coins:2, dmg:2, fly:false }
};
var WAVES = [
  [['imp',6]], [['armor',5]], [['bat',6],['imp',3]], [['swarm',5]],
  [['swift',6],['armor',3]],
  [['imp',4],['armor',3],['bat',3],['swarm',3],['swift',3]]
];
var TOTAL_WAVES = 6;
function waveStart(k) { return 12 + (k - 1) * 26; } // k 從 1 起
function waveTypes(k) {
  var out = [];
  WAVES[k-1].forEach(function (p) { if (out.indexOf(p[0]) < 0) out.push(p[0]); });
  return out;
}
var SHOP = [
  { key:'1', name:'箭塔材料', price:15, item:'towerKit' },
  { key:'2', name:'步兵', price:12, item:'soldierKit' },
  { key:'3', name:'遠攻魂件', price:8, item:'ranged' },
  { key:'4', name:'近戰魂件', price:8, item:'melee' },
  { key:'5', name:'擴槽石', price:20, item:'slotStone' },
  { key:'6', name:'石魔像', price:18, item:'golemKit' }
];
var GUIDE = [
  { title:'守住主堡', text:'撐過 6 波, 別讓鬼走進主堡', w:624, h:351 },
  { title:'看預告', text:'上方預告下一波是誰', w:624, h:312 },
  { title:'移動與撿錢', text:'WASD 移動, 靠近金幣就吸過來', w:520, h:312 },
  { title:'拿魂件', text:'按 J 開窗, ← → 選格, J 拿起', w:728, h:364 },
  { title:'裝上與互換', text:'拿著魂件對格子按 J, 裝上或互換', w:728, h:338 },
  { title:'蓋塔與購買', text:'主堡旁按 1~6 買, J 放在腳下', w:754, h:390 },
  { title:'招募中立單位', text:'中立單位裝上進攻主堡會投靠', w:624, h:351 }
];
var FONT = "'Microsoft JhengHei','PingFang TC','Noto Sans TC',sans-serif";

// ---------- 工具 ----------
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function distSeg(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1, l2 = dx*dx + dy*dy;
  var t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, x1 + dx * t, y1 + dy * t);
}
function distToPath(px, py) {
  var m = 1e9;
  for (var i = 0; i < PATH.length - 1; i++)
    m = Math.min(m, distSeg(px, py, PATH[i][0], PATH[i][1], PATH[i+1][0], PATH[i+1][1]));
  return m;
}
function pathPoint(s, off) {
  var i = 0;
  while (i < SEGLEN.length - 1 && s > PATHCUM[i+1]) i++;
  var l = SEGLEN[i], t = Math.max(0, Math.min(1, (s - PATHCUM[i]) / l));
  var dx = (PATH[i+1][0] - PATH[i][0]) / l, dy = (PATH[i+1][1] - PATH[i][1]) / l;
  return [PATH[i][0] + dx * l * t - dy * off, PATH[i][1] + dy * l * t + dx * off];
}
function isSoul(k) { return !!SOULS[k]; }
function rnd() { return Math.random(); }

// ---------- 狀態 ----------
var G; // 遊戲狀態
var screen = 'guide';       // guide | play | result
var guidePage = 0;
var guideFirst = true;      // 第一次說明: 關閉後才開局
var held = {};
var found = [false,false,false,false,false,false];

function newGame() {
  found = [false,false,false,false,false,false];
  G = {
    t: 0, gold: 40, hp: 20, wave: 0,
    queue: [], spawnTimer: 0,
    player: { x:1000, y:580, hand:null, moving:false },
    units: [], enemies: [], corpses: [], parts: [], coins: [],
    projs: [], beams: [], areas: [], sparks: [], combos: [],
    popup: null, steal: null,
    golemUnlocked: false, castleHit: 0.3,
    win: false, resultAge: 0, over: false
  };
  G.castle = mkUnit('castle', 'ally', CASTLE.x, CASTLE.y);
  G.castle.slots = ['ranged', 'frost', null];
  G.units.push(G.castle);
  var t1 = mkUnit('tower', 'ally', 504, 218); t1.slots = ['ranged', null]; t1.cell = [Math.floor(504/48), Math.floor((218-50)/48)];
  var t2 = mkUnit('tower', 'ally', 888, 362); t2.slots = ['ranged', null]; t2.cell = [Math.floor(888/48), Math.floor((362-50)/48)];
  G.units.push(t1, t2);
  var g1 = mkUnit('golem', 'neutral', 120, 218), g2 = mkUnit('golem', 'neutral', 600, 602);
  G.units.push(g1, g2);
}
function mkUnit(kind, team, x, y) {
  var half = { tower:24, soldier:16, golem:28, castle:56 }[kind];
  var cap = { tower:2, soldier:2, golem:3, castle:3 }[kind];
  var maxCap = { tower:4, soldier:2, golem:4, castle:4 }[kind];
  var slots = []; for (var i = 0; i < cap; i++) slots.push(null);
  return { kind:kind, team:team, x:x, y:y, hx:x, hy:y, half:half, slots:slots, maxCap:maxCap,
    cd:{}, attackAge:0.15, attackDur:0.15, moving:false, cell:null, gone:false };
}

// ---------- 組合分析 ----------
function analyze(slots) {
  var cnt = { ranged:0, melee:0, seek:0, march:0, frost:0, blast:0 };
  slots.forEach(function (s) { if (s) cnt[s]++; });
  var combos = [];
  COMBOS.forEach(function (c, id) {
    for (;;) {
      var ok = c.a === c.b ? cnt[c.a] >= 2 : (cnt[c.a] >= 1 && cnt[c.b] >= 1);
      if (!ok) break;
      cnt[c.a]--; cnt[c.b]--; combos.push(id);
    }
  });
  return { combos: combos, rest: cnt };
}
function comboCounts(slots) {
  var a = analyze(slots).combos, c = [0,0,0,0,0,0];
  a.forEach(function (id) { c[id]++; });
  return c;
}
function hasRangedType(an) {
  if (an.rest.ranged > 0) return true;
  return an.combos.some(function (id) { return id <= 2; });
}

// ---------- 傷害 ----------
function damage(e, amount, armorMul, spark) {
  if (e.dead) return;
  if (armorMul && e.type === 'armor') amount *= 0.25;
  e.hp -= amount; e.hitAge = 0;
  if (spark) G.sparks.push({ x:e.x, y:e.y, age:0, dur:0.25 });
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  var d = ETYPES[e.type];
  if (e.type !== 'swarm')
    G.corpses.push({ kind:e.type, x:e.x, y:e.y, life:15, slots:e.slots.slice(), half:d.half, gone:false });
  for (var i = 0; i < d.coins; i++) {
    var a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 40;
    G.coins.push({ x:e.x + Math.cos(a) * r, y:e.y + Math.sin(a) * r });
  }
}
function slowEnemy(e, amt, dur) { if (amt >= (e.slowT > 0 ? e.slowAmt : 0)) { e.slowAmt = amt; } e.slowT = Math.max(e.slowT, dur); }
function aliveEnemies() { return G.enemies.filter(function (e) { return !e.dead; }); }
function nearestEnemy(x, y, maxD, pred, useTouch, half) {
  var best = null, bd = 1e9;
  G.enemies.forEach(function (e) {
    if (e.dead || (pred && !pred(e))) return;
    var d = dist(x, y, e.x, e.y), lim = useTouch ? half + e.half + 12 : maxD;
    if (d <= lim && d < bd) { bd = d; best = e; }
  });
  return best;
}
function notFly(e) { return !ETYPES[e.type].fly; }
function addArea(kind, x, y, r) { G.areas.push({ kind:kind, x:x, y:y, radius:r, age:0, dur:0.3 }); }

// ---------- 單位更新 ----------
function moveToward(u, tx, ty, speed, dt) {
  var d = dist(u.x, u.y, tx, ty);
  if (d < 0.01) return;
  var st = Math.min(d, speed * dt);
  u.x += (tx - u.x) / d * st; u.y += (ty - u.y) / d * st;
  u.moving = true;
}
function updateUnit(u, dt) {
  u.attackAge = Math.min(u.attackDur, u.attackAge + dt);
  u.moving = false;
  for (var k in u.cd) if (u.cd[k] > 0) u.cd[k] -= dt;
  if (u.team === 'neutral') return;
  var an = analyze(u.slots);
  u.an = an;
  var rest = an.rest, hasTarget = false;
  function ready(key, interval, target, fire) {
    if (!target) return;
    hasTarget = true;
    if (!(u.cd[key] > 0)) { u.cd[key] = interval; u.attackAge = 0; fire(target); }
  }
  // 組合
  var seen = {};
  an.combos.forEach(function (id) {
    seen[id] = (seen[id] || 0) + 1;
    var key = 'c' + id + '_' + seen[id];
    if (id === 0) ready(key, 1.0, nearestEnemy(u.x, u.y, 260), function (t) {
      var d = dist(u.x, u.y, t.x, t.y) || 1;
      var ex = u.x + (t.x - u.x) / d * 260, ey = u.y + (t.y - u.y) / d * 260;
      G.beams.push({ x1:u.x, y1:u.y, x2:ex, y2:ey, age:0, dur:0.15 });
      G.enemies.slice().forEach(function (e) {
        if (!e.dead && distSeg(e.x, e.y, u.x, u.y, ex, ey) <= 14) damage(e, 14, false, true);
      });
    });
    else if (id === 1) ready(key, 1.0, nearestEnemy(u.x, u.y, 200), function (t) { shoot(u, t, 'ice', 10); });
    else if (id === 2) ready(key, 1.2, nearestEnemy(u.x, u.y, 200), function (t) { shoot(u, t, 'bomb', 12); });
    else if (id === 3) ready(key, 0.8, nearestEnemy(u.x, u.y, 60, notFly), function () {
      addArea('whirl', u.x, u.y, 60);
      G.enemies.slice().forEach(function (e) {
        if (!e.dead && notFly(e) && dist(u.x, u.y, e.x, e.y) <= 60) damage(e, 16, false, true);
      });
    });
    else if (id === 4) ready(key, 0.8, nearestEnemy(u.x, u.y, 0, notFly, true, u.half), function (t) {
      var cx = t.x, cy = t.y;
      addArea('frostSmash', cx, cy, 60);
      G.enemies.slice().forEach(function (e) {
        if (e.dead || !notFly(e)) return;
        if (e === t || dist(cx, cy, e.x, e.y) <= 60) slowEnemy(e, 0.5, 2);
      });
      damage(t, 16, false, true);
    });
    else if (id === 5) ready(key, 1.0, nearestEnemy(u.x, u.y, 0, notFly, true, u.half), function (t) {
      var cx = t.x, cy = t.y;
      addArea('blast', cx, cy, 60);
      G.sparks.push({ x:cx, y:cy, age:0, dur:0.25 });
      G.enemies.slice().forEach(function (e) {
        if (!e.dead && notFly(e) && dist(cx, cy, e.x, e.y) <= 60) damage(e, 20, false, false);
      });
    });
  });
  // 單件
  if (rest.ranged > 0) ready('ranged', 1.0, nearestEnemy(u.x, u.y, 200), function (t) { shoot(u, t, 'normal', 10 * rest.ranged); });
  if (rest.melee > 0) ready('melee', 0.8, nearestEnemy(u.x, u.y, 0, notFly, true, u.half), function (t) { damage(t, 14 * rest.melee, false, true); });
  if (rest.blast > 0) ready('blast', 2.0, nearestEnemy(u.x, u.y, 70), function () {
    addArea('blast', u.x, u.y, 70);
    G.enemies.slice().forEach(function (e) {
      if (!e.dead && dist(u.x, u.y, e.x, e.y) <= 70) damage(e, 10 * rest.blast, false, false);
    });
  });
  if (rest.frost > 0) {
    G.enemies.forEach(function (e) { if (!e.dead && notFly(e) && dist(u.x, u.y, e.x, e.y) <= 70) e.aura = true; });
  }
  if (hasTarget || u.kind === 'castle') return;
  // 移動: 索敵 > 進攻主堡 > 原地
  var chased = false;
  if (rest.seek > 0) {
    var t = nearestEnemy(u.hx, u.hy, 200);
    if (t) {
      chased = true;
      var ad = hasRangedType(an) ? 180 : u.half + t.half + 12;
      if (dist(u.x, u.y, t.x, t.y) > ad) moveToward(u, t.x, t.y, Math.min(70 * rest.seek, 140), dt);
    }
  }
  if (!chased) {
    if (rest.march > 0) {
      var stopD = CASTLE.r + u.half;
      if (dist(u.x, u.y, CASTLE.x, CASTLE.y) > stopD) {
        moveToward(u, CASTLE.x, CASTLE.y, 70, dt);
        if (dist(u.x, u.y, CASTLE.x, CASTLE.y) <= stopD) { u.hx = u.x; u.hy = u.y; }
      } else { u.hx = u.x; u.hy = u.y; }
    } else if (rest.seek > 0) {
      if (dist(u.x, u.y, u.hx, u.hy) > 0.5) moveToward(u, u.hx, u.hy, 80, dt);
    }
  }
}
function shoot(u, t, kind, dmg) {
  G.projs.push({ x:u.x, y:u.y, kind:kind, dmg:dmg, target:t, tx:t.x, ty:t.y, angle:0 });
}
function updateProj(p, dt) {
  if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y; }
  var d = dist(p.x, p.y, p.tx, p.ty), st = 420 * dt;
  p.angle = Math.atan2(p.ty - p.y, p.tx - p.x);
  var hitR = (p.target && !p.target.dead) ? p.target.half : 2;
  if (d <= st + hitR) {
    p.done = true;
    var tg = (p.target && !p.target.dead) ? p.target : null;
    if (p.kind === 'bomb') {
      addArea('blast', p.tx, p.ty, 70);
      G.enemies.slice().forEach(function (e) {
        if (!e.dead && dist(p.tx, p.ty, e.x, e.y) <= 70) damage(e, p.dmg, false, false);
      });
      if (tg) G.sparks.push({ x:tg.x, y:tg.y, age:0, dur:0.25 });
    } else if (tg) {
      if (p.kind === 'ice') slowEnemy(tg, 0.5, 2);
      damage(tg, p.dmg, true, true);
    }
    return;
  }
  p.x += (p.tx - p.x) / d * st; p.y += (p.ty - p.y) / d * st;
}

// ---------- 敵人 ----------
function spawnEnemy(type, off) {
  var d = ETYPES[type];
  var e = { type:type, hp:d.hp, maxHp:d.hp, half:d.half, s:10, off:off, slots:d.souls.slice(),
    hitAge:0.2, slowT:0, slowAmt:0, aura:false, dead:false, x:10, y:130 + off, moving:true };
  var p = pathPoint(e.s, off); e.x = p[0]; e.y = p[1];
  G.enemies.push(e);
}
function updateEnemy(e, dt) {
  e.hitAge = Math.min(0.2, e.hitAge + dt);
  if (e.slowT > 0) e.slowT -= dt;
  var d = ETYPES[e.type];
  e.moving = e.slots.indexOf('march') >= 0;
  var amt = 0;
  if (e.slowT > 0) amt = e.slowAmt;
  if (e.aura && !d.fly) amt = Math.max(amt, 0.3);
  e.slowed = amt > 0;
  if (e.moving) {
    e.s = Math.min(PATHLEN, e.s + d.speed * (1 - amt) * dt);
    var p = pathPoint(e.s, e.off); e.x = p[0]; e.y = p[1];
    if (dist(e.x, e.y, CASTLE.x, CASTLE.y) <= CASTLE.r + 10) {
      e.dead = true; e.gone = true;
      G.hp -= d.dmg; G.castleHit = 0;
    }
  }
}

// ---------- 玩家 / 目標 ----------
function playerCell() {
  var p = G.player;
  var i = Math.floor(p.x / 48), j = Math.floor((p.y - 50) / 48);
  return { i:i, j:j, x:24 + 48 * i, y:74 + 48 * j };
}
function placement(kind) {
  var p = G.player;
  if (kind === 'tower') {
    var c = playerCell();
    var ok = c.i >= 0 && c.i <= 26 && c.j >= 0 && c.j <= 11;
    if (ok && distToPath(c.x, c.y) < 52) ok = false;
    if (ok && dist(c.x, c.y, CASTLE.x, CASTLE.y) < 90) ok = false;
    if (ok && G.units.some(function (u) { return u.kind === 'tower' && u.cell && u.cell[0] === c.i && u.cell[1] === c.j; })) ok = false;
    return { valid: ok, x: c.x, y: c.y, cell: [c.i, c.j] };
  }
  return { valid: dist(p.x, p.y, CASTLE.x, CASTLE.y) >= 90, x: p.x, y: p.y };
}
function interactTarget() {
  var p = G.player, best = null, bd = 1e9;
  function cand(type, obj, half) {
    var d = dist(p.x, p.y, obj.x, obj.y);
    if (d <= half + 48 && d < bd) { bd = d; best = { type:type, obj:obj, half:half }; }
  }
  G.units.forEach(function (u) { if (!u.gone) cand('unit', u, u.half); });
  G.corpses.forEach(function (c) { cand('corpse', c, c.half); });
  G.parts.forEach(function (c) { cand('part', c, 14); });
  G.enemies.forEach(function (e) { if (!e.dead) cand('enemy', e, e.half); });
  return best;
}
function inZone() { return dist(G.player.x, G.player.y, CASTLE.x, CASTLE.y) <= 110; }

function targetName(T) {
  if (T.type === 'unit') {
    var u = T.obj;
    if (u.kind === 'castle') return '主堡';
    if (u.kind === 'tower') return '箭塔';
    if (u.kind === 'soldier') return '步兵';
    return u.team === 'neutral' ? '中立石魔像' : '石魔像';
  }
  if (T.type === 'enemy') return ETYPES[T.obj.type].name + '(活)';
  return ETYPES[T.obj.kind].name + '的屍體';
}
function targetSlots(T) { return T.obj.slots; }
function targetMaxCap(T) { return T.type === 'unit' ? T.obj.maxCap : 0; }

function openPopup(T) {
  var hand = G.player.hand, slots = targetSlots(T), idx = 0, i;
  if (hand === null) { for (i = 0; i < slots.length; i++) if (slots[i]) { idx = i; break; } }
  else if (isSoul(hand)) { for (i = 0; i < slots.length; i++) if (!slots[i]) { idx = i; break; } }
  G.popup = { T:T, index:idx, shakeAge:0.25 };
}
function popupLen(P) { return Math.max(2, targetSlots(P.T).length); }
function popupEval(P) {
  var T = P.T, hand = G.player.hand, slots = targetSlots(T), i = P.index;
  if (i >= slots.length) return { label:'' };
  var cur = slots[i], own = T.type === 'unit';
  if (hand === null) {
    if (!cur) return { label:'' };
    if (T.type === 'enemy') return { label:'搶奪', run:function () { startSteal(T.obj, i); G.popup = null; } };
    return { label:'拿起', run:function () { G.player.hand = cur; slots[i] = null; G.popup = null; } };
  }
  if (isSoul(hand) && own) {
    return { label: cur ? '互換' : '裝上', run:function () {
      var before = comboCounts(slots);
      slots[i] = hand; G.player.hand = cur || null;
      if (T.obj.team === 'ally') announceCombos(T.obj, before, comboCounts(slots));
      G.popup = null;
    } };
  }
  if (hand === 'slotStone' && own && slots.length < T.obj.maxCap) {
    return { label:'擴槽', run:function () { slots.push(null); G.player.hand = null; G.popup = null; } };
  }
  return { label:'' };
}
function announceCombos(u, before, after) {
  for (var id = 0; id < 6; id++) {
    for (var k = before[id]; k < after[id]; k++) {
      var isNew = !found[id]; found[id] = true;
      G.combos.push({ unit:u, name:COMBOS[id].name, isNew:isNew, age:0 });
    }
  }
}
function startSteal(e, i) { G.steal = { e:e, i:i, t:0 }; }
function cancelSteal() { G.steal = null; }

// ---------- 輸入 ----------
var GAMEKEYS = { KeyW:1, KeyA:1, KeyS:1, KeyD:1, KeyJ:1, KeyK:1, KeyH:1, ArrowLeft:1, ArrowRight:1, ArrowUp:1, ArrowDown:1, Space:1,
  Digit1:1, Digit2:1, Digit3:1, Digit4:1, Digit5:1, Digit6:1 };
window.addEventListener('keydown', function (e) {
  if (GAMEKEYS[e.code]) e.preventDefault();
  if (e.repeat) return;
  held[e.code] = true;
  try { onKey(e.code); } catch (err) { console.error(err); }
});
window.addEventListener('keyup', function (e) { held[e.code] = false; });
window.addEventListener('blur', function () { held = {}; });

function onKey(code) {
  if (screen === 'guide') {
    if (code === 'KeyJ') {
      if (guidePage < GUIDE.length - 1) guidePage++;
      else { screen = 'play'; if (guideFirst) { guideFirst = false; } }
    } else if (code === 'KeyK' || code === 'ArrowLeft') {
      if (guidePage > 0) guidePage--;
    }
    return;
  }
  if (screen === 'result') {
    if (code === 'KeyJ' && G.resultAge >= 0.5) { newGame(); screen = 'play'; }
    return;
  }
  if (G.over) return;
  var P = G.popup;
  if (P) {
    if (code === 'ArrowLeft') { P.index = (P.index + popupLen(P) - 1) % popupLen(P); }
    else if (code === 'ArrowRight') { P.index = (P.index + 1) % popupLen(P); }
    else if (code === 'KeyK') { G.popup = null; }
    else if (code === 'KeyJ') {
      var r = popupEval(P);
      if (r.run) r.run(); else P.shakeAge = 0;
    }
    return;
  }
  var pl = G.player;
  if (code === 'KeyH') { screen = 'guide'; guidePage = 0; return; }
  if (code === 'KeyJ') {
    if (G.steal) { cancelSteal(); return; }
    if (pl.hand === 'towerKit' || pl.hand === 'soldierKit' || pl.hand === 'golemKit') { placeKit(); return; }
    var T = interactTarget();
    if (!T) return;
    if (T.type === 'part') {
      var part = T.obj;
      if (pl.hand === null) { pl.hand = part.item; G.parts.splice(G.parts.indexOf(part), 1); }
      else { var old = pl.hand; pl.hand = part.item; part.item = old; }
      return;
    }
    openPopup(T);
    return;
  }
  if (code === 'KeyK') {
    if (isSoul(pl.hand) || pl.hand === 'slotStone') {
      G.parts.push({ item:pl.hand, x:pl.x, y:pl.y });
      pl.hand = null;
    }
    return;
  }
  var m = /^Digit([1-6])$/.exec(code);
  if (m && inZone() && pl.hand === null) {
    var it = SHOP[+m[1] - 1];
    if (it.item === 'golemKit' && !G.golemUnlocked) return;
    if (G.gold < it.price) return;
    G.gold -= it.price; pl.hand = it.item;
    cancelSteal();
  }
}
function placeKit() {
  var pl = G.player, kind = { towerKit:'tower', soldierKit:'soldier', golemKit:'golem' }[pl.hand];
  var pc = placement(kind);
  if (!pc.valid) return;
  var u;
  if (kind === 'tower') { u = mkUnit('tower', 'ally', pc.x, pc.y); u.cell = pc.cell; }
  else if (kind === 'soldier') { u = mkUnit('soldier', 'ally', pc.x, pc.y); u.slots = ['melee', 'seek']; }
  else u = mkUnit('golem', 'ally', pc.x, pc.y);
  G.units.push(u);
  pl.hand = null;
}

// ---------- 更新 ----------
function update(rdt) {
  if (G.over) { G.resultAge += rdt; return; }
  var P = G.popup;
  var dt = P ? rdt * SLOWMO : rdt;
  var pl = G.player;
  // 彈窗抖動用真實時間(慢動作下抖 0.25 秒遊戲時間會太久)
  if (P) P.shakeAge = Math.min(0.25, P.shakeAge + rdt);

  G.t += dt;
  G.castleHit = Math.min(0.3, G.castleHit + dt);

  // 波次
  while (G.wave < TOTAL_WAVES && G.t >= waveStart(G.wave + 1)) {
    G.wave++;
    WAVES[G.wave - 1].forEach(function (p) { for (var i = 0; i < p[1]; i++) G.queue.push(p[0]); });
    if (G.queue.length === WAVES[G.wave - 1].reduce(function (a, p) { return a + p[1]; }, 0)) G.spawnTimer = 0;
  }
  if (G.queue.length) {
    G.spawnTimer -= dt;
    while (G.queue.length && G.spawnTimer <= 0) {
      var ty = G.queue.shift();
      if (ty === 'swarm') { spawnEnemy(ty, -14); spawnEnemy(ty, 0); spawnEnemy(ty, 14); }
      else spawnEnemy(ty, 0);
      G.spawnTimer += 1.3;
    }
  }

  // 玩家移動
  pl.moving = false;
  if (!P) {
    var dx = (held.KeyD ? 1 : 0) - (held.KeyA ? 1 : 0), dy = (held.KeyS ? 1 : 0) - (held.KeyW ? 1 : 0);
    if (dx || dy) {
      var l = Math.hypot(dx, dy);
      pl.x = Math.max(16, Math.min(W - 16, pl.x + dx / l * 260 * rdt));
      pl.y = Math.max(66, Math.min(634, pl.y + dy / l * 260 * rdt));
      pl.moving = true;
    }
  }

  // 搶奪
  var S = G.steal;
  if (S) {
    var e = S.e;
    if (e.dead || pl.hand !== null || dist(pl.x, pl.y, e.x, e.y) > e.half + 68 || !e.slots[S.i]) G.steal = null;
    else {
      S.t += dt;
      if (S.t >= 1.5) {
        pl.hand = e.slots[S.i]; e.slots[S.i] = null; G.steal = null;
      }
    }
  }

  // 單位
  G.enemies.forEach(function (e) { e.aura = false; });
  G.units.forEach(function (u) { updateUnit(u, dt); });
  // 中立單位
  G.units.forEach(function (u) {
    if (u.team !== 'neutral' || u.gone || u.slots.indexOf('march') < 0) return;
    moveToward(u, CASTLE.x, CASTLE.y, 45, dt);
    if (dist(u.x, u.y, CASTLE.x, CASTLE.y) <= CASTLE.r + 10) {
      u.gone = true; G.golemUnlocked = true;
      var k = 0;
      u.slots.forEach(function (s) { if (s) { G.parts.push({ item:s, x:1120 + 32 * k, y:572 }); k++; } });
      if (G.popup && G.popup.T.obj === u) G.popup = null;
    }
  });
  G.units = G.units.filter(function (u) { return !u.gone; });

  // 敵人 / 投射物
  G.projs.forEach(function (p) { updateProj(p, dt); });
  G.projs = G.projs.filter(function (p) { return !p.done; });
  G.enemies.slice().forEach(function (e) { if (!e.dead) updateEnemy(e, dt); });
  G.enemies = G.enemies.filter(function (e) { return !e.dead; });

  // 屍體
  G.corpses.forEach(function (c) { c.life -= dt; if (c.life <= 0) c.gone = true; });
  G.corpses = G.corpses.filter(function (c) { return !c.gone; });

  // 金幣
  G.coins = G.coins.filter(function (c) {
    var d = dist(c.x, c.y, pl.x, pl.y);
    if (d <= 20) { G.gold += 2; return false; }
    if (d <= 90) {
      var st = Math.min(d, 420 * dt);
      c.x += (pl.x - c.x) / d * st; c.y += (pl.y - c.y) / d * st;
      if (dist(c.x, c.y, pl.x, pl.y) <= 20) { G.gold += 2; return false; }
    }
    return true;
  });

  // 特效時間
  function age(arr) { arr.forEach(function (a) { a.age += dt; }); return arr; }
  G.beams = age(G.beams).filter(function (a) { return a.age < a.dur; });
  G.areas = age(G.areas).filter(function (a) { return a.age < a.dur; });
  G.sparks = age(G.sparks).filter(function (a) { return a.age < a.dur; });
  G.combos = age(G.combos).filter(function (a) { return a.age < 1.5; });

  // 彈窗合法性
  if (G.popup) {
    var T = G.popup.T, o = T.obj, gone = o.gone || o.dead || (T.type === 'corpse' && G.corpses.indexOf(o) < 0);
    if (gone || dist(pl.x, pl.y, o.x, o.y) > T.half + 68) G.popup = null;
  }

  // 結束判定(批次最尾端只判一次)
  if (G.hp <= 0) endGame(false);
  else if (G.wave >= TOTAL_WAVES && !G.queue.length && !G.enemies.length) endGame(true);
}
function endGame(win) {
  G.over = true; G.win = win; G.resultAge = 0; G.popup = null; G.steal = null; screen = 'result';
}

// ---------- 繪製 ----------
function foundCount() { return found.filter(Boolean).length; }
function slotRowPos(e) { return [e.x, e.y - e.half - 20]; }

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (screen === 'guide') { drawGuide(); return; }
  var pl = G.player, T = interactTarget();
  if (G.popup) T = G.popup.T;
  function tg(type, obj) { return !!T && T.type === type && T.obj === obj; }

  Art.drawBackground(ctx, {});
  G.coins.forEach(function (c) { Art.drawCoin(ctx, { x:c.x, y:c.y }); });
  G.units.forEach(function (u) {
    if (u.team === 'ally' && u.an && u.an.rest.frost > 0 && u.kind !== 'castle' || (u.kind === 'castle' && u.an && u.an.rest.frost > 0))
      Art.drawFrostAura(ctx, { x:u.x, y:u.y, radius:70 });
  });
  G.corpses.forEach(function (c) {
    Art.drawCorpse(ctx, { kind:c.kind, x:c.x, y:c.y, life:c.life, maxLife:15, targeted:tg('corpse', c) });
  });
  G.parts.forEach(function (c) { Art.drawGroundPart(ctx, { item:c.item, x:c.x, y:c.y, targeted:tg('part', c) }); });
  var hk = { towerKit:'tower', soldierKit:'soldier', golemKit:'golem' }[pl.hand];
  if (hk && !G.popup) {
    var pc = placement(hk);
    Art.drawPlacePreview(ctx, { kind:hk, x:pc.x, y:pc.y, valid:pc.valid });
  }

  var list = [], flyers = [];
  G.units.forEach(function (u) { list.push({ y:u.y, f:function () { drawUnit(u, tg('unit', u)); } }); });
  G.enemies.forEach(function (e) {
    var it = { y:e.y, f:function () {
      Art.drawEnemy(ctx, { type:e.type, x:e.x, y:e.y, hp:e.hp, maxHp:e.maxHp, hitAge:e.hitAge, hitDuration:0.2,
        moving:e.moving, slowed:!!e.slowed, targeted:tg('enemy', e) });
    } };
    (ETYPES[e.type].fly ? flyers : list).push(it);
  });
  list.push({ y:pl.y, f:function () {
    Art.drawPlayer(ctx, { x:pl.x, y:pl.y, moving:pl.moving, handItem:pl.hand,
      stealing:!!G.steal, stealProgress:G.steal ? Math.min(1, G.steal.t / 1.5) : 0 });
  } });
  list.sort(function (a, b) { return a.y - b.y; });
  flyers.sort(function (a, b) { return a.y - b.y; });
  list.concat(flyers).forEach(function (it) { it.f(); });

  // 魂件槽列
  G.units.forEach(function (u) {
    Art.drawSoulSlots(ctx, { x:u.x, y:u.y - u.half - 20, slots:u.slots.slice() });
  });
  G.corpses.forEach(function (c) {
    Art.drawSoulSlots(ctx, { x:c.x, y:c.y - c.half - 12, slots:c.slots.slice() });
  });
  G.enemies.forEach(function (e) {
    if (tg('enemy', e)) Art.drawSoulSlots(ctx, { x:e.x, y:e.y - e.half - 20, slots:e.slots.slice() });
  });

  G.projs.forEach(function (p) { Art.drawProjectile(ctx, { x:p.x, y:p.y, angle:p.angle, kind:p.kind }); });
  G.beams.forEach(function (b) { Art.drawPierceBeam(ctx, { x1:b.x1, y1:b.y1, x2:b.x2, y2:b.y2, age:b.age, duration:b.dur }); });
  G.areas.forEach(function (a) { Art.drawAreaHit(ctx, { kind:a.kind, x:a.x, y:a.y, radius:a.radius, age:a.age, duration:a.dur }); });
  G.sparks.forEach(function (s) { Art.drawHitSpark(ctx, { x:s.x, y:s.y, age:s.age, duration:s.dur }); });
  if (G.steal) {
    var e = G.steal.e, n = e.slots.length, sx = e.x - n * 20 / 2 + 10 + 20 * G.steal.i;
    Art.drawStealLink(ctx, { x1:pl.x, y1:pl.y, x2:sx, y2:e.y - e.half - 20, progress:Math.min(1, G.steal.t / 1.5) });
  }
  G.combos.forEach(function (c) {
    Art.drawComboName(ctx, { x:c.unit.x, y:c.unit.y - c.unit.half - 44, name:c.name, isNew:c.isNew, age:c.age, duration:1.5 });
  });
  if (G.wave < TOTAL_WAVES) {
    var rem = waveStart(G.wave + 1) - G.t;
    if (rem > 0 && rem <= 6) Art.drawSpawnWarning(ctx, { remaining:rem, total:6 });
  }
  if (inZone() && !G.popup && pl.hand === null) {
    Art.drawShopPanel(ctx, { items: SHOP.map(function (s) {
      var st = 'ok';
      if (s.item === 'golemKit' && !G.golemUnlocked) st = 'locked';
      else if (G.gold < s.price) st = 'poor';
      return { key:s.key, name:s.name, price:s.price, state:st };
    }) });
  }
  var title, types;
  if (G.wave >= TOTAL_WAVES) { title = '最後一波'; types = []; }
  else { title = '下一波: 第 ' + (G.wave + 1) + ' 波'; types = waveTypes(G.wave + 1); }
  Art.drawHud(ctx, { gold:G.gold, castleHp:Math.max(0, G.hp), castleMaxHp:20, wave:G.wave, totalWaves:TOTAL_WAVES,
    nextWaveIn: G.wave < TOTAL_WAVES ? Math.max(0, Math.ceil(waveStart(G.wave + 1) - G.t)) : -1,
    previewTitle:title, previewTypes:types });
  Art.drawCodex(ctx, { foundCount:foundCount(), entries: COMBOS.map(function (c, i) {
    return { name:c.name, parts:[c.a, c.b], found:found[i] };
  }) });
  if (G.popup) {
    Art.drawSlowMo(ctx, {});
    drawPopup();
  }
  if (screen === 'result') Art.drawResult(ctx, { win:G.win, wave:G.wave, totalWaves:TOTAL_WAVES, foundCount:foundCount() });
}
function drawUnit(u, targeted) {
  var base = { x:u.x, y:u.y, attackAge:u.attackAge, attackDuration:u.attackDur, moving:u.moving, targeted:targeted };
  if (u.kind === 'castle') {
    base.hitAge = G.castleHit; base.hitDuration = 0.3; base.zoneActive = inZone();
    delete base.moving;
    Art.drawCastle(ctx, base);
  } else if (u.kind === 'tower') Art.drawTower(ctx, base);
  else if (u.kind === 'soldier') Art.drawSoldier(ctx, base);
  else { base.team = u.team; Art.drawGolem(ctx, base); }
}
function drawPopup() {
  var P = G.popup, T = P.T, o = T.obj, n = popupLen(P);
  var w = n * 48 + 120, h = 116;
  var x = o.x, y = o.y - T.half - 50 - h / 2;
  if (y - h / 2 < 0) y = o.y + T.half + 12 + h / 2;
  x = Math.max(w / 2, Math.min(W - w / 2, x)); y = Math.max(h / 2, Math.min(H - h / 2, y));
  var slots = targetSlots(T).slice(); while (slots.length < n) slots.push(null);
  var r = popupEval(P);
  Art.drawSoulPopup(ctx, { x:x, y:y, w:w, h:h, title:targetName(T), slots:slots, index:P.index,
    hand:G.player.hand && (isSoul(G.player.hand) || G.player.hand === 'slotStone') ? G.player.hand : null,
    actionLabel:r.label, shakeAge:P.shakeAge, shakeDuration:0.25 });
}
function drawGuide() {
  var g = GUIDE[guidePage];
  ctx.fillStyle = '#10141c'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd86b'; ctx.font = 'bold 44px ' + FONT;
  ctx.fillText(g.title, W / 2, 60);
  ctx.fillStyle = '#ffffff'; ctx.font = '28px ' + FONT;
  ctx.fillText(g.text, W / 2, 125);
  var bx = Math.round((W - g.w) / 2), by = 170;
  Art.drawGuidePage(ctx, { page:guidePage + 1, x:bx, y:by, w:g.w, h:g.h });
  ctx.fillStyle = '#9fb0c8'; ctx.font = '22px ' + FONT;
  ctx.fillText('第 ' + (guidePage + 1) + ' / ' + GUIDE.length + ' 頁', W / 2, 600);
  var hint = 'J ' + (guidePage < GUIDE.length - 1 ? '下一頁' : (guideFirst ? '開始遊戲' : '繼續遊戲')) +
    (guidePage > 0 ? '    K / ← 上一頁' : '');
  ctx.fillStyle = '#ffffff'; ctx.font = '24px ' + FONT;
  ctx.fillText(hint, W / 2, 650);
  if (!guideFirst) { ctx.fillStyle = '#9fb0c8'; ctx.font = '18px ' + FONT; ctx.fillText('遊戲中按 H 可再叫出說明', W / 2, 690); }
  else { ctx.fillStyle = '#9fb0c8'; ctx.font = '18px ' + FONT; ctx.fillText('遊戲中按 H 可再叫出說明', W / 2, 690); }
}

// ---------- 主迴圈 ----------
var last = 0;
function frame(ts) {
  try {
    var dt = last ? Math.min((ts - last) / 1000, 1 / 30) : 0;
    last = ts;
    if (screen === 'play' || screen === 'result') update(dt);
    render();
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
newGame();
requestAnimationFrame(frame);
})();
