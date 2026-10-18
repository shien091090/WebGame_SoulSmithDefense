'use strict';
// 魂匠急行 - 玩法驗證 Demo。邏輯與繪製分離: update() 改狀態, render() 呼叫 Art。

var W = Art.canvas.width, H = Art.canvas.height;
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');

// ---------- 畫布 ----------
function setupCanvas() {
  var dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  var s = Math.min(window.innerWidth / W, window.innerHeight / H);
  if (!(s > 0)) s = 1;
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
}
setupCanvas();
window.addEventListener('resize', setupCanvas);

// ---------- 常數 ----------
var CASTLE_POS = { x: 640, y: 430, r: 56 };
var ZONE_R = 110;
var PADS = [
  { x: 220, y: 340 }, { x: 420, y: 520 }, { x: 1060, y: 340 },
  { x: 860, y: 520 }, { x: 540, y: 170 }, { x: 740, y: 290 }
];
var SPAWN = { west: { x: 10, y: 430 }, east: { x: 1270, y: 430 }, north: { x: 640, y: 60 } };
var HALF = { castle: 56, tower: 24, soldier: 16, golem: 28, imp: 16, archer: 16, brute: 22 };
var ENEMY = {
  imp:    { hp: 30, speed: 45, coins: 2, dmg: 2, souls: ['melee', 'march'] },
  archer: { hp: 24, speed: 45, coins: 3, dmg: 2, souls: ['ranged', 'march'] },
  brute:  { hp: 70, speed: 40, coins: 4, dmg: 4, souls: ['melee', 'seek', 'march'] }
};
var SOULS = ['ranged', 'melee', 'seek', 'march'];
var HIT_DUR = 0.2, ATK_DUR = 0.15, CASTLE_HIT_DUR = 0.3, SPARK_DUR = 0.25;
var PLAYER_SPEED = 260;
var TOTAL_WAVES = 6;
var WAVES = [
  { west: [['imp', 4]] },
  { east: [['imp', 4], ['archer', 2]] },
  { north: [['imp', 5]], west: [['archer', 2]] },
  { west: [['brute', 3]], east: [['imp', 4]] },
  { north: [['archer', 4], ['brute', 3]], east: [['imp', 3]] },
  { west: [['imp', 4], ['brute', 2]], north: [['imp', 4], ['brute', 2]], east: [['imp', 4], ['brute', 2]] }
];
var SHOP = [
  { key: '1', name: '箭塔材料', price: 15, item: 'towerKit' },
  { key: '2', name: '步兵', price: 12, item: 'soldierKit' },
  { key: '3', name: '擴槽石', price: 20, item: 'slotStone' },
  { key: '4', name: '石魔像', price: 18, item: 'golemKit' }
];
var GUIDE = [
  { title: '守住主堡', text: '撐過 6 波, 別讓敵人走進主堡' },
  { title: '移動與撿錢', text: 'WASD 移動, 走過金幣就撿起' },
  { title: '拆魂件', text: '站在旁邊按住 J 拆下魂件' },
  { title: '裝魂件', text: '拿著魂件按住 J 裝上, L 丟下' },
  { title: '購買', text: '主堡旁按 1~4 購買, J 放置' },
  { title: '招募中立單位', text: '中立單位裝上進攻主堡會來投靠' }
];

// ---------- 狀態 ----------
var phase = 'guide';          // guide | play | result
var guidePage = 0;
var guideFromGame = false;
var keys = {};
var jLock = false;            // 動作完成 / 轉場後, 要等 J 放開才接受下一次按住
var uid = 0;
var G;                        // 一局的狀態

function mkUnit(kind, team, x, y, slots) {
  return {
    id: ++uid, kind: kind, team: team, x: x, y: y, half: HALF[kind],
    hp: 0, maxHp: 0, slots: slots, hitAge: HIT_DUR, atkAge: ATK_DUR,
    moving: false, cdR: 0, cdM: 0, pad: -1, lane: null, dead: false
  };
}
function mkTower(x, y, slots, pad) {
  var u = mkUnit('tower', 'ally', x, y, slots);
  u.hp = u.maxHp = 120; u.pad = pad; return u;
}
function mkSoldier(x, y) {
  var u = mkUnit('soldier', 'ally', x, y, ['melee', 'seek']);
  u.hp = u.maxHp = 60; return u;
}
function mkGolem(team, x, y) {
  var u = mkUnit('golem', team, x, y, [null, null, null]);
  u.hp = u.maxHp = 250; return u;
}
function mkEnemy(type, lane) {
  var d = ENEMY[type], sp = SPAWN[lane];
  var u = mkUnit(type, 'enemy', sp.x, sp.y, d.souls.slice());
  u.hp = u.maxHp = d.hp; u.lane = lane; return u;
}

function resetGame() {
  var castle = mkUnit('castle', 'ally', CASTLE_POS.x, CASTLE_POS.y, ['ranged', 'ranged', null]);
  castle.hp = castle.maxHp = 20;
  var units = [castle];
  [0, 2, 4].forEach(function (i) { units.push(mkTower(PADS[i].x, PADS[i].y, ['ranged', null], i)); });
  units.push(mkGolem('neutral', 160, 640));
  units.push(mkGolem('neutral', 1120, 640));
  G = {
    t: 0, gold: 30, castle: castle, castleHitAge: CASTLE_HIT_DUR,
    units: units, corpses: [], coins: [], items: [], projs: [], sparks: [],
    player: { x: 640, y: 560, moving: false, hand: null, holdT: 0, holdKey: null, act: null },
    golemUnlocked: false, spawns: [], spawnIdx: 0, win: false,
    target: null, selIdx: -1, selRef: null
  };
  WAVES.forEach(function (w, k) {
    var start = 10 + k * 22;
    ['west', 'north', 'east'].forEach(function (lane) {
      if (!w[lane]) return;
      var seq = [];
      w[lane].forEach(function (p) { for (var i = 0; i < p[1]; i++) seq.push(p[0]); });
      seq.forEach(function (type, i) { G.spawns.push({ time: start + i * 1.2, lane: lane, type: type }); });
    });
  });
  G.spawns.sort(function (a, b) { return a.time - b.time; });
  jLock = !!keys.j;
}

// ---------- 工具 ----------
function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
function count(u, kind) { var n = 0; for (var i = 0; i < u.slots.length; i++) if (u.slots[i] === kind) n++; return n; }
function isSoul(k) { return SOULS.indexOf(k) >= 0; }
function hasSoul(slots) { for (var i = 0; i < slots.length; i++) if (slots[i]) return true; return false; }
function nearestOf(list, x, y, maxD, extra) {
  var best = null, bd = Infinity;
  for (var i = 0; i < list.length; i++) {
    var o = list[i]; if (o.dead) continue;
    var d = dist(x, y, o.x, o.y);
    var lim = extra ? maxD + o.half + extra : maxD;
    if (d <= lim && d < bd) { bd = d; best = o; }
  }
  return best;
}
function moveToward(u, tx, ty, speed, dt) {
  var dx = tx - u.x, dy = ty - u.y, d = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.01) return;
  var step = Math.min(speed * dt, d);
  u.x += dx / d * step; u.y += dy / d * step;
  u.moving = true;
  if (u.kind === 'tower' && u.pad >= 0) u.pad = -1;   // 離開地基
}
function padOccupied(i) {
  for (var k = 0; k < G.units.length; k++) if (G.units[k].pad === i && !G.units[k].dead) return true;
  return false;
}

// ---------- 戰鬥 ----------
function damage(u, dmg) {
  if (u.dead) return;
  u.hp -= dmg; u.hitAge = 0;
  if (u.hp <= 0) kill(u);
}
function kill(u) {
  u.dead = true;
  G.corpses.push({ id: ++uid, kind: u.kind, x: u.x, y: u.y, life: 10, slots: u.slots, half: u.half });
  if (u.team === 'enemy') {
    var n = ENEMY[u.kind].coins;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 40;
      G.coins.push({ x: u.x + Math.cos(a) * r, y: u.y + Math.sin(a) * r, life: 7 });
    }
  }
}
function spark(x, y) { G.sparks.push({ x: x, y: y, age: 0 }); }

function updateUnit(u, dt) {
  if (u.dead) return;
  if (u.hitAge < HIT_DUR) u.hitAge = Math.min(HIT_DUR, u.hitAge + dt);
  if (u.atkAge < ATK_DUR) u.atkAge = Math.min(ATK_DUR, u.atkAge + dt);
  u.moving = false;
  var nR = count(u, 'ranged'), nM = count(u, 'melee'), nS = count(u, 'seek'), nC = count(u, 'march');

  if (u.team === 'neutral') {
    if (nC > 0) {
      moveToward(u, CASTLE_POS.x, CASTLE_POS.y, 45, dt);
      if (dist(u.x, u.y, CASTLE_POS.x, CASTLE_POS.y) <= CASTLE_POS.r + 10) {
        u.dead = true;
        var k = 0;
        for (var i = 0; i < u.slots.length; i++) if (u.slots[i]) {
          G.items.push({ id: ++uid, item: u.slots[i], x: 640 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 18, y: 520 });
          k++;
        }
        G.golemUnlocked = true;
      }
    }
    return;
  }

  var hostile = [];
  for (var h = 0; h < G.units.length; h++) {
    var o = G.units[h];
    if (o.dead) continue;
    if (u.team === 'enemy') { if (o.team === 'ally' && o.kind !== 'castle') hostile.push(o); }
    else if (o.team === 'enemy') hostile.push(o);
  }

  if (u.cdR > 0) u.cdR -= dt;
  if (u.cdM > 0) u.cdM -= dt;
  var tR = nR ? nearestOf(hostile, u.x, u.y, 200, 0) : null;
  // 碰觸距離 = 兩者半徑和 + 12: nearestOf 在 extra 非 0 時才加上對方半徑
  var tM = nM ? nearestOf(hostile, u.x, u.y, u.half + 12, 1e-9) : null;
  if (tR && u.cdR <= 0) {
    u.cdR = 1.0; u.atkAge = 0;
    G.projs.push({ x: u.x, y: u.y, target: tR, dmg: 8 * nR, team: u.team === 'enemy' ? 'enemy' : 'ally', angle: Math.atan2(tR.y - u.y, tR.x - u.x) });
  }
  if (tM && u.cdM <= 0) {
    u.cdM = 0.8; u.atkAge = 0;
    spark(tM.x, tM.y);
    damage(tM, 12 * nM);
  }
  if (u.kind === 'castle') return;

  if (!(tR || tM)) {
    var handled = false;
    if (nS) {
      var ts = nearestOf(hostile, u.x, u.y, 240, 0);
      if (ts) {
        handled = true;
        var d = dist(u.x, u.y, ts.x, ts.y);
        var stop = nR ? 180 : (u.half + ts.half + 12);
        if (d > stop) moveToward(u, ts.x, ts.y, Math.min(70 * nS, 140), dt);
      }
    }
    if (!handled && nC) {
      if (u.team === 'enemy') {
        var sp = ENEMY[u.kind].speed, px, py;
        if (u.lane === 'north') { px = 640; py = Math.min(u.y + 60, 430); }
        else if (u.lane === 'west') { px = Math.min(u.x + 60, 640); py = 430; }
        else { px = Math.max(u.x - 60, 640); py = 430; }
        moveToward(u, px, py, sp, dt);
      } else {
        if (dist(u.x, u.y, CASTLE_POS.x, CASTLE_POS.y) > CASTLE_POS.r + u.half) {
          moveToward(u, CASTLE_POS.x, CASTLE_POS.y, 45, dt);
        }
      }
    }
  }

  if (u.team === 'enemy' && dist(u.x, u.y, CASTLE_POS.x, CASTLE_POS.y) <= CASTLE_POS.r + 10) {
    G.castle.hp -= ENEMY[u.kind].dmg;
    G.castleHitAge = 0;
    u.dead = true;      // 抵達主堡: 消失, 不留屍體、不掉金幣
  }
}

function updateProjs(dt) {
  for (var i = G.projs.length - 1; i >= 0; i--) {
    var p = G.projs[i], t = p.target;
    if (!t || t.dead) { G.projs.splice(i, 1); continue; }
    var d = dist(p.x, p.y, t.x, t.y), step = 400 * dt;
    p.angle = Math.atan2(t.y - p.y, t.x - p.x);
    if (d <= step || d <= t.half) {
      spark(t.x, t.y);
      damage(t, p.dmg);
      G.projs.splice(i, 1);
    } else {
      p.x += Math.cos(p.angle) * step; p.y += Math.sin(p.angle) * step;
    }
  }
}

// ---------- 互動目標 ----------
function computeTarget() {
  var P = G.player, best = null, bd = Infinity;
  function consider(type, ref, x, y, half) {
    var d = dist(P.x, P.y, x, y);
    if (d <= half + 44 && d < bd) { bd = d; best = { type: type, ref: ref, key: type + ref.id }; }
  }
  G.units.forEach(function (u) { if (!u.dead && u.team !== 'enemy') consider('unit', u, u.x, u.y, u.half); });
  G.corpses.forEach(function (c) { consider('corpse', c, c.x, c.y, c.half); });
  G.items.forEach(function (it) { consider('item', it, it.x, it.y, 14); });
  PADS.forEach(function (pd, i) {
    if (!padOccupied(i)) consider('pad', { id: 'pad' + i, idx: i }, pd.x, pd.y, 32);
  });
  G.target = best;
  var sl = best && best.ref.slots;
  if (sl && hasSoul(sl)) {
    if (G.selRef !== best.ref || G.selIdx < 0 || G.selIdx >= sl.length || !sl[G.selIdx]) {
      G.selIdx = -1;
      for (var i = sl.length - 1; i >= 0; i--) if (sl[i]) { G.selIdx = i; break; }
    }
    G.selRef = best.ref;
  } else {
    G.selIdx = -1; G.selRef = best ? best.ref : null;
  }
}

function getAction() {
  var t = G.target, h = G.player.hand;
  if (!t) return null;
  if (h === null) {
    if ((t.type === 'unit' || t.type === 'corpse') && G.selIdx >= 0) return { type: 'take', dur: 1.2 };
    if (t.type === 'item') return { type: 'pickup', dur: 0.3 };
  } else if (isSoul(h)) {
    if (t.type === 'unit' && t.ref.slots.indexOf(null) >= 0) return { type: 'install', dur: 0.8 };
  } else if (h === 'slotStone') {
    if (t.type === 'unit' && t.ref.slots.length < 4) return { type: 'expand', dur: 0.8 };
  } else if (h === 'towerKit') {
    if (t.type === 'pad') return { type: 'build', dur: 0.8 };
  }
  return null;
}

function completeAction(act) {
  var P = G.player, t = G.target;
  if (act.type === 'take') {
    P.hand = t.ref.slots[G.selIdx]; t.ref.slots[G.selIdx] = null;
  } else if (act.type === 'pickup') {
    P.hand = t.ref.item;
    G.items.splice(G.items.indexOf(t.ref), 1);
  } else if (act.type === 'install') {
    t.ref.slots[t.ref.slots.indexOf(null)] = P.hand; P.hand = null;
  } else if (act.type === 'expand') {
    t.ref.slots.push(null); P.hand = null;
  } else if (act.type === 'build') {
    var pd = PADS[t.ref.idx];
    G.units.push(mkTower(pd.x, pd.y, [null, null], t.ref.idx));
    P.hand = null;
  }
}

function moveDir() {
  var dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), dy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
  return { dx: dx, dy: dy };
}
function inZone() { return dist(G.player.x, G.player.y, CASTLE_POS.x, CASTLE_POS.y) <= ZONE_R; }

// ---------- 更新 ----------
function update(dt) {
  G.t += dt;
  var P = G.player;

  // 玩家移動
  var m = moveDir();
  P.moving = (m.dx !== 0 || m.dy !== 0);
  if (P.moving) {
    var l = Math.sqrt(m.dx * m.dx + m.dy * m.dy);
    P.x = Math.max(16, Math.min(W - 16, P.x + m.dx / l * PLAYER_SPEED * dt));
    P.y = Math.max(66, Math.min(H - 16, P.y + m.dy / l * PLAYER_SPEED * dt));
  }

  // 出怪
  while (G.spawnIdx < G.spawns.length && G.spawns[G.spawnIdx].time <= G.t) {
    var s = G.spawns[G.spawnIdx++];
    G.units.push(mkEnemy(s.type, s.lane));
  }

  // 單位
  var list = G.units.slice();
  for (var i = 0; i < list.length; i++) updateUnit(list[i], dt);
  G.units = G.units.filter(function (u) { return !u.dead; });
  updateProjs(dt);
  if (G.castleHitAge < CASTLE_HIT_DUR) G.castleHitAge = Math.min(CASTLE_HIT_DUR, G.castleHitAge + dt);

  // 屍體、金幣、火花
  G.corpses.forEach(function (c) { c.life -= dt; });
  G.corpses = G.corpses.filter(function (c) { return c.life > 0; });
  G.coins.forEach(function (c) { c.life -= dt; });
  G.coins = G.coins.filter(function (c) {
    if (c.life <= 0) return false;
    if (dist(P.x, P.y, c.x, c.y) <= 34) { G.gold += 2; return false; }
    return true;
  });
  G.sparks.forEach(function (s) { s.age += dt; });
  G.sparks = G.sparks.filter(function (s) { return s.age < SPARK_DUR; });

  // 互動與按住
  computeTarget();
  var act = null;
  if (keys.j && !jLock && !P.moving) act = getAction();
  P.act = null;
  if (act) {
    var key = act.type + '|' + G.target.key + '|' + G.selIdx;
    if (key !== P.holdKey) { P.holdKey = key; P.holdT = 0; }
    P.holdT += dt;
    if (P.holdT >= act.dur) {
      completeAction(act);
      P.holdT = 0; P.holdKey = null; jLock = true;
    } else {
      P.act = act;
    }
  } else {
    P.holdKey = null; P.holdT = 0;
  }

  // 結束判定(每幀最尾端)
  if (G.castle.hp <= 0) { G.castle.hp = 0; endGame(false); }
  else if (G.spawnIdx >= G.spawns.length && !G.units.some(function (u) { return u.team === 'enemy'; })) endGame(true);
}

function endGame(win) {
  G.win = win; phase = 'result';
  G.player.holdT = 0; G.player.holdKey = null; G.player.act = null;
}

// ---------- 輸入(只有鍵盤) ----------
var KEYMAP = {
  KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', KeyJ: 'j', KeyK: 'k', KeyL: 'l', KeyH: 'h',
  Enter: 'enter', NumpadEnter: 'enter',
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
  Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4'
};

function closeGuide() {
  phase = 'play'; guideFromGame = false;
  jLock = !!keys.j;
}
function openGuide() {
  phase = 'guide'; guidePage = 0; guideFromGame = true;
  G.player.holdT = 0; G.player.holdKey = null; G.player.act = null;
}

function onKeyDown(k) {
  if (phase === 'guide') {
    if (k === 'j') { if (guidePage < GUIDE.length - 1) guidePage++; else closeGuide(); }
    else if (k === 'k') { if (guidePage > 0) guidePage--; }
    else if (k === 'h' && guideFromGame) closeGuide();
    return;
  }
  if (phase === 'result') {
    if (k === 'enter') { resetGame(); phase = 'play'; }
    return;
  }
  var P = G.player;
  if (k === 'h') { openGuide(); return; }
  if (k === 'k') {
    var sl = G.target && G.target.ref.slots;
    if (sl && hasSoul(sl)) {
      for (var n = 1; n <= sl.length; n++) {
        var idx = (G.selIdx + n) % sl.length;
        if (sl[idx]) { G.selIdx = idx; break; }
      }
    }
  } else if (k === 'l') {
    if (P.hand) { G.items.push({ id: ++uid, item: P.hand, x: P.x, y: P.y }); P.hand = null; }
  } else if (k === 'j') {
    if (P.hand === 'soldierKit') {
      var s = mkSoldier(P.x, P.y); G.units.push(s); P.hand = null; jLock = true;
    } else if (P.hand === 'golemKit') {
      G.units.push(mkGolem('ally', P.x, P.y)); P.hand = null; jLock = true;
    }
  } else if (k === '1' || k === '2' || k === '3' || k === '4') {
    if (P.hand === null && inZone()) {
      var it = SHOP[Number(k) - 1];
      if (k === '4' && !G.golemUnlocked) return;
      if (G.gold >= it.price) { G.gold -= it.price; P.hand = it.item; }
    }
  }
}

window.addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  var k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  keys[k] = true;
  onKeyDown(k);
});
window.addEventListener('keyup', function (e) {
  var k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  keys[k] = false;
  if (k === 'j') jLock = false;
});
window.addEventListener('blur', function () { keys = {}; jLock = false; });

// ---------- 繪製 ----------
var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
var GUIDE_FRAME = { x: 284, y: 180, w: 712, h: 400 };

function renderGuide() {
  ctx.fillStyle = '#14161f';
  ctx.fillRect(0, 0, W, H);
  var g = GUIDE[guidePage];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f2c14e'; ctx.font = 'bold 44px ' + FONT;
  ctx.fillText('魂匠急行  ' + g.title, W / 2, 70);
  ctx.fillStyle = '#ffffff'; ctx.font = '28px ' + FONT;
  ctx.fillText(g.text, W / 2, 130);
  Art.drawGuidePage(ctx, { page: guidePage + 1, x: GUIDE_FRAME.x, y: GUIDE_FRAME.y, w: GUIDE_FRAME.w, h: GUIDE_FRAME.h });
  ctx.fillStyle = '#aab'; ctx.font = '22px ' + FONT;
  ctx.fillText('第 ' + (guidePage + 1) + ' / ' + GUIDE.length + ' 頁', W / 2, 622);
  var last = guidePage === GUIDE.length - 1;
  var hint = 'J 下一頁' + (guidePage > 0 ? '   K 上一頁' : '');
  if (last) hint = (guideFromGame ? 'J 回到遊戲' : 'J 開始遊戲') + '   K 上一頁';
  ctx.fillStyle = '#f2c14e'; ctx.font = '24px ' + FONT;
  ctx.fillText(hint, W / 2, 664);
  if (guideFromGame) {
    ctx.fillStyle = '#aab'; ctx.font = '18px ' + FONT;
    ctx.fillText('H 關閉說明', W / 2, 695);
  }
}

function slotY(u, kindTop) { return u.y - u.half - kindTop; }

function render() {
  if (phase === 'guide') { renderGuide(); return; }
  var P = G.player, T = G.target;
  var tRef = (phase === 'play' && T) ? T.ref : null;

  Art.drawBackground(ctx, {});
  PADS.forEach(function (pd, i) {
    var occ = padOccupied(i);
    Art.drawBuildPad(ctx, { x: pd.x, y: pd.y, occupied: occ,
      highlight: !!(tRef && T.type === 'pad' && T.ref.idx === i && P.hand === 'towerKit') });
  });
  G.coins.forEach(function (c) { Art.drawCoin(ctx, { x: c.x, y: c.y, life: c.life, maxLife: 7 }); });
  G.items.forEach(function (it) {
    Art.drawGroundItem(ctx, { item: it.item, x: it.x, y: it.y, targeted: tRef === it });
  });
  G.corpses.forEach(function (c) {
    Art.drawCorpse(ctx, { kind: c.kind, x: c.x, y: c.y, life: c.life, maxLife: 10, targeted: tRef === c });
  });

  var order = G.units.slice().sort(function (a, b) { return a.y - b.y; });
  order.forEach(function (u) {
    var s = { x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp, hitAge: u.hitAge, hitDuration: HIT_DUR,
      attackAge: u.atkAge, attackDuration: ATK_DUR, moving: u.moving, targeted: tRef === u };
    if (u.kind === 'castle') {
      Art.drawCastle(ctx, { x: u.x, y: u.y, hitAge: G.castleHitAge, hitDuration: CASTLE_HIT_DUR,
        zoneActive: inZone(), targeted: tRef === u });
    } else if (u.kind === 'tower') Art.drawTower(ctx, s);
    else if (u.kind === 'soldier') Art.drawSoldier(ctx, s);
    else if (u.kind === 'golem') { s.team = u.team; if (u.team === 'neutral') s.hp = s.maxHp; Art.drawGolem(ctx, s); }
    else { s.type = u.kind; Art.drawEnemy(ctx, s); }
  });

  // 魂件槽列
  order.forEach(function (u) {
    var hi = (tRef === u) ? G.selIdx : -1;
    Art.drawSoulSlots(ctx, { x: u.x, y: u.y - u.half - 20, slots: u.slots.slice(), highlight: hi });
  });
  G.corpses.forEach(function (c) {
    var hi = (tRef === c) ? G.selIdx : -1;
    Art.drawSoulSlots(ctx, { x: c.x, y: c.y - c.half - 12, slots: c.slots.slice(), highlight: hi });
  });

  G.projs.forEach(function (p) { Art.drawProjectile(ctx, { x: p.x, y: p.y, angle: p.angle, team: p.team }); });
  G.sparks.forEach(function (s) {
    if (s.age >= 0 && s.age < SPARK_DUR) Art.drawHitSpark(ctx, { x: s.x, y: s.y, age: s.age, duration: SPARK_DUR });
  });

  // 路線預警
  WAVES.forEach(function (w, k) {
    var start = 10 + k * 22, rem = start - G.t;
    if (rem > 0 && rem <= 5) {
      Object.keys(w).forEach(function (lane) {
        Art.drawLaneWarning(ctx, { lane: lane, remaining: rem, total: 5 });
      });
    }
  });

  var act = P.act;
  Art.drawPlayer(ctx, { x: P.x, y: P.y, moving: P.moving, handItem: P.hand,
    holding: !!act, holdProgress: act ? Math.min(1, P.holdT / act.dur) : 0 });

  if (phase === 'play' && P.hand === null && inZone()) {
    Art.drawShopPanel(ctx, { items: SHOP.map(function (it, i) {
      var st = (i === 3 && !G.golemUnlocked) ? 'locked' : (G.gold >= it.price ? 'ok' : 'poor');
      return { key: it.key, name: it.name, price: it.price, state: st };
    }) });
  }

  var started = 0;
  for (var k2 = 0; k2 < TOTAL_WAVES; k2++) if (G.t >= 10 + k2 * 22) started++;
  Art.drawHud(ctx, { gold: G.gold, castleHp: Math.max(0, G.castle.hp), castleMaxHp: 20, wave: started,
    totalWaves: TOTAL_WAVES, nextWaveIn: started >= TOTAL_WAVES ? -1 : Math.ceil(10 + started * 22 - G.t) });

  if (phase === 'result') Art.drawResult(ctx, { win: G.win, wave: started, totalWaves: TOTAL_WAVES });
}

// ---------- 主迴圈 ----------
var lastTs = null;
function frame(ts) {
  requestAnimationFrame(frame);
  var dt = lastTs === null ? 0 : (ts - lastTs) / 1000;
  lastTs = ts;
  if (!(dt > 0)) dt = 0;
  dt = Math.min(dt, 1 / 30);
  try {
    if (phase === 'play') update(dt);
    render();
  } catch (err) { console.error(err); }
}

resetGame();
requestAnimationFrame(frame);
