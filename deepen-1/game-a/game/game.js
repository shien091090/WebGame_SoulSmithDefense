// 魂匠陣紋 — 玩法驗證 Demo。邏輯與繪製分離: update() 改狀態, render() 只呼叫 Art.drawXxx。
// 傳統腳本(非 module), 載入順序 art/art.js → game.js。

// 需要但 interface.json 沒有的圖形: 無
var Placeholder = {};

var W = (typeof Art !== 'undefined' && Art.canvas) ? Art.canvas.width : 1280;
var H = (typeof Art !== 'undefined' && Art.canvas) ? Art.canvas.height : 720;
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var K = 1;

function fitCanvas() {
  var dpr = window.devicePixelRatio || 1;
  var fit = Math.min(window.innerWidth / W, window.innerHeight / H);
  if (!(fit > 0)) fit = 1;
  canvas.style.width = Math.floor(W * fit) + 'px';
  canvas.style.height = Math.floor(H * fit) + 'px';
  K = dpr * fit;
  canvas.width = Math.round(W * K);
  canvas.height = Math.round(H * K);
  ctx.setTransform(K, 0, 0, K, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

// ---------------------------------------------------------------- 常數
var PATH = [[0, 146], [960, 146], [960, 434], [336, 434], [336, 626], [1180, 626]];
var SEGCUM = [0];
for (var _i = 1; _i < PATH.length; _i++) {
  SEGCUM.push(SEGCUM[_i - 1] + Math.hypot(PATH[_i][0] - PATH[_i - 1][0], PATH[_i][1] - PATH[_i - 1][1]));
}
var PATHLEN = SEGCUM[SEGCUM.length - 1];
var CASTLE_X = 1180, CASTLE_Y = 626, CASTLE_HALF = 56;
var BASIC = ['ranged', 'melee', 'frost', 'seek', 'march'];
var COMBOS = ['pierce', 'iceArrow', 'whirl', 'frostSmash', 'counter'];
var COMBO_NAME = { pierce: '穿透箭', iceArrow: '冰箭', whirl: '旋風斬', frostSmash: '冰霜重擊', counter: '逆襲' };
var RECIPES = [
  { k: 'pierce', a: 'ranged', b: 'ranged' },
  { k: 'iceArrow', a: 'ranged', b: 'frost' },
  { k: 'whirl', a: 'melee', b: 'melee' },
  { k: 'frostSmash', a: 'melee', b: 'frost' },
  { k: 'counter', a: 'seek', b: 'march' }
];
var INTERVAL = { ranged: 1.0, melee: 0.8, pierce: 1.0, iceArrow: 1.0, whirl: 0.8, frostSmash: 0.8 };
var LINK_NAME = { frost: '霜紋', blade: '刃紋', arrow: '箭紋' };
var LINK_INTERVAL = { blade: 0.8, arrow: 0.5 };
var LINK_DMG = { blade: 12, arrow: 6 };
var ENEMY = {
  imp: { name: '小鬼', hp: 40, speed: 45, half: 16, slots: ['melee', 'march'], coins: 1, dmg: 2 },
  archer: { name: '弓鬼', hp: 30, speed: 50, half: 16, slots: ['ranged', 'march'], coins: 2, dmg: 2 },
  ice: { name: '冰鬼', hp: 50, speed: 42, half: 16, slots: ['frost', 'march'], coins: 2, dmg: 2 },
  swift: { name: '疾鬼', hp: 35, speed: 80, half: 16, slots: ['seek', 'march'], coins: 2, dmg: 2 },
  frostArmor: { name: '霜甲鬼', hp: 120, speed: 34, half: 22, slots: ['melee', 'frost', 'march'], coins: 4, dmg: 3 }
};
var WAVES = [
  [['imp', 6]],
  [['imp', 4], ['archer', 3]],
  [['swift', 5], ['imp', 3]],
  [['ice', 4], ['frostArmor', 2]],
  [['swift', 4], ['frostArmor', 2], ['archer', 3]],
  [['imp', 5], ['swift', 4], ['frostArmor', 3], ['ice', 3]]
];
var TOTAL_WAVES = WAVES.length;
var UNIT_HALF = { tower: 24, stele: 16, soldier: 16, wolf: 18, castle: 56, player: 16 };
var UNIT_NAME = { tower: '箭塔', stele: '魂碑', soldier: '步兵', wolf: '野狼', castle: '主堡' };
var KITS = { towerKit: 'tower', steleKit: 'stele', soldierKit: 'soldier', wolfKit: 'wolf' };
var SHOP0 = [
  { item: 'towerKit', name: '箭塔', price: 15 },
  { item: 'steleKit', name: '魂碑', price: 6 },
  { item: 'soldierKit', name: '步兵', price: 12 },
  { item: 'ranged', name: '遠攻', price: 8 },
  { item: 'melee', name: '近戰', price: 8 },
  { item: 'frost', name: '冰霜', price: 12 },
  { item: 'slotStone', name: '擴槽石', price: 20 },
  { item: 'wolfKit', name: '野狼', price: 14 }
];
var SHOP1 = COMBOS.map(function (k) { return { item: k, name: COMBO_NAME[k], price: 24 }; });
var GUIDE = [
  { title: '守住主堡', text: '撐過 6 波, 別讓鬼走進主堡', w: 480, h: 270 },
  { title: '移動與撿錢', text: '方向鍵移動, 靠近金幣就吸過來', w: 400, h: 240 },
  { title: '拿魂件', text: 'Z 開窗, ← → 選格, Z 拿起', w: 560, h: 300 },
  { title: '裝上與互換', text: '拿著魂件對格子按 Z, 裝上或互換', w: 560, h: 260 },
  { title: '裝在自己身上', text: 'X 打開自己, 裝上的魂件就能出手', w: 560, h: 280 },
  { title: '陣紋', text: '同種魂件靠近, 就連成陣紋', w: 560, h: 300 },
  { title: '購買與蓋塔', text: '主堡旁按空白鍵買, Z 放下', w: 600, h: 320 },
  { title: '招募中立單位', text: '中立野狼裝上進攻主堡會投靠', w: 480, h: 270 }
];
var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

// ---------------------------------------------------------------- 工具
function dd(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function isSoul(it) { return BASIC.indexOf(it) >= 0 || COMBOS.indexOf(it) >= 0; }
function distSeg(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  var t = l2 > 0 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function distToPath(x, y) {
  var m = 1e9;
  for (var i = 1; i < PATH.length; i++) m = Math.min(m, distSeg(x, y, PATH[i - 1][0], PATH[i - 1][1], PATH[i][0], PATH[i][1]));
  return m;
}
function pathPoint(s) {
  s = clamp(s, 0, PATHLEN);
  for (var i = 1; i < PATH.length; i++) {
    if (s <= SEGCUM[i] || i === PATH.length - 1) {
      var l = SEGCUM[i] - SEGCUM[i - 1], t = l > 0 ? (s - SEGCUM[i - 1]) / l : 0;
      return [PATH[i - 1][0] + (PATH[i][0] - PATH[i - 1][0]) * t, PATH[i - 1][1] + (PATH[i][1] - PATH[i - 1][1]) * t];
    }
  }
  return [PATH[0][0], PATH[0][1]];
}
function pathNearest(x, y) {
  var best = { d: 1e9, s: 0, x: PATH[0][0], y: PATH[0][1] };
  for (var i = 1; i < PATH.length; i++) {
    var x1 = PATH[i - 1][0], y1 = PATH[i - 1][1], x2 = PATH[i][0], y2 = PATH[i][1];
    var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    var t = l2 > 0 ? clamp(((x - x1) * dx + (y - y1) * dy) / l2, 0, 1) : 0;
    var qx = x1 + t * dx, qy = y1 + t * dy, d = Math.hypot(x - qx, y - qy);
    if (d < best.d) best = { d: d, s: SEGCUM[i - 1] + t * Math.sqrt(l2), x: qx, y: qy };
  }
  return best;
}
function count(u, kind) { var n = 0; for (var i = 0; i < u.slots.length; i++) if (u.slots[i] === kind) n++; return n; }
function has(u, kind) { return u.slots.indexOf(kind) >= 0; }
function moveToward(u, tx, ty, sp, dt, stopDist) {
  var d = dd(u.x, u.y, tx, ty) - (stopDist || 0);
  if (d <= 1e-6) return false;
  var step = Math.min(sp * dt, d), full = dd(u.x, u.y, tx, ty);
  u.x += (tx - u.x) / full * step;
  u.y += (ty - u.y) / full * step;
  u.moving = true;
  return true;
}

// ---------------------------------------------------------------- 狀態
var screen = 'guide';   // guide | play
var guidePage = 0;
var G = null;
var keysHeld = {};
var keyQueue = [];
var zBlock = false;

function mkUnit(type, team, x, y, slots, cap) {
  var s = slots.slice();
  while (s.length < cap) s.push(null);
  return {
    id: G.nextId++, type: type, team: team, x: x, y: y, half: UNIT_HALF[type],
    slots: s, cap: cap, maxCap: (type === 'tower' || type === 'castle') ? 4 : cap,
    cd: {}, cdk: {}, attackAge: 0.15, moving: false, engaged: false,
    home: { x: x, y: y }, dead: false
  };
}
function cellKey(i, j) { return i + ',' + j; }

function newGame() {
  G = {
    t: 0, gold: 40, hp: 20, nextId: 1, realT: 0,
    units: [], enemies: [], corpses: [], coins: [], grounds: [], projs: [], beams: [], areas: [], sparks: [],
    names: [], links: [], linkMap: {}, comboFound: {}, linkFound: {}, wolfUnlocked: false,
    hand: null, popup: null, steal: null, result: null, resultAge: 0, occupied: {},
    spawns: [], spawnIdx: 0, waveReached: 0
  };
  G.castle = mkUnit('castle', 'ally', CASTLE_X, CASTLE_Y, ['ranged', 'melee'], 3);
  G.castle.hitAge = 0.3;
  G.player = mkUnit('player', 'ally', 1060, 530, ['melee'], 3);
  G.player.maxCap = 3;
  var t1 = mkUnit('tower', 'ally', 408, 218, ['ranged'], 2); t1.cell = cellKey(8, 3);
  var t2 = mkUnit('tower', 'ally', 600, 218, ['ranged'], 2); t2.cell = cellKey(12, 3);
  var s1 = mkUnit('stele', 'ally', 888, 74, ['frost'], 1); s1.cell = cellKey(18, 0);
  G.units.push(t1, t2, s1);
  G.occupied[t1.cell] = true; G.occupied[t2.cell] = true; G.occupied[s1.cell] = true;
  [[168, 314], [696, 530]].forEach(function (p) {
    var w = mkUnit('wolf', 'neutral', p[0], p[1], [], 2);
    w.wt = 0; w.wx = p[0]; w.wy = p[1];
    G.units.push(w);
  });
  for (var k = 0; k < WAVES.length; k++) {
    var start = 12 + k * 26, n = 0;
    WAVES[k].forEach(function (g) {
      for (var q = 0; q < g[1]; q++) { G.spawns.push({ t: start + n * 1.2, type: g[0], wave: k + 1 }); n++; }
    });
  }
}
newGame();

function waveStart(k) { return 12 + (k - 1) * 26; }

// ---------------------------------------------------------------- 輸入(只有鍵盤)
var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, KeyZ: 1, KeyX: 1, Space: 1 };
window.addEventListener('keydown', function (e) {
  if (!GAME_KEYS[e.code]) return;
  e.preventDefault();
  if (e.repeat) return;
  keysHeld[e.code] = true;
  keyQueue.push({ k: e.code, down: true });
});
window.addEventListener('keyup', function (e) {
  if (!GAME_KEYS[e.code]) return;
  e.preventDefault();
  keysHeld[e.code] = false;
  keyQueue.push({ k: e.code, down: false });
});
window.addEventListener('blur', function () { keysHeld = {}; zBlock = false; });

function processInput() {
  var dropDown = false;   // 轉場後, 同一批剩下的「按下」事件作廢(放開事件照處理)
  while (keyQueue.length) {
    var ev = keyQueue.shift();
    if (!ev.down) { if (ev.k === 'KeyZ') zBlock = false; continue; }
    if (dropDown) continue;
    var before = screen, beforeRes = !!(G && G.result);
    if (screen === 'guide') handleGuideKey(ev.k);
    else if (G.result) handleResultKey(ev.k);
    else handlePlayKey(ev.k);
    if (before !== screen || beforeRes !== !!(G && G.result)) dropDown = true;
  }
}

function handleGuideKey(k) {
  if (k === 'ArrowLeft') guidePage = Math.max(0, guidePage - 1);
  else if (k === 'ArrowRight') guidePage = Math.min(GUIDE.length - 1, guidePage + 1);
  else if (k === 'KeyZ') {
    if (guidePage < GUIDE.length - 1) guidePage++;
    else { newGame(); screen = 'play'; zBlock = true; }
  }
}
function handleResultKey(k) {
  if (k === 'KeyZ' && G.resultAge >= 0.5) { newGame(); zBlock = true; }
}

function handlePlayKey(k) {
  var pop = G.popup;
  if (k === 'KeyZ' && zBlock) return;
  if (pop) {
    if (pop.type === 'shop') shopKey(k); else soulKey(k);
    return;
  }
  if (k === 'KeyZ') {
    if (G.steal) { G.steal = null; return; }
    pressZ();
  } else if (k === 'KeyX') {
    openSelfPopup();
  } else if (k === 'Space') {
    if (dd(G.player.x, G.player.y, G.castle.x, G.castle.y) <= 110) {
      G.popup = { type: 'shop', row: 0, idx: 0, message: '', shakeAge: 0.25 };
    }
  }
}

// ---- 互動目標
function findTarget() {
  var p = G.player, best = null, bd = 1e9;
  function consider(o, half, kind) {
    var d = dd(p.x, p.y, o.x, o.y);
    if (d <= half + 48 && d < bd) { bd = d; best = { kind: kind, obj: o, half: half }; }
  }
  consider(G.castle, G.castle.half, 'unit');
  G.units.forEach(function (u) { if (!u.dead) consider(u, u.half, 'unit'); });
  G.corpses.forEach(function (c) { consider(c, c.half, 'corpse'); });
  G.grounds.forEach(function (g) { consider(g, 14, 'ground'); });
  G.enemies.forEach(function (e) { if (!e.dead) consider(e, e.half, 'enemy'); });
  return best;
}

// ---- 放置
function playerCell() {
  var p = G.player;
  return { i: Math.floor(p.x / 48), j: Math.floor((p.y - 50) / 48) };
}
function placeInfo(kit) {
  var p = G.player, type = KITS[kit];
  if (type === 'tower' || type === 'stele') {
    var c = playerCell(), cx = 24 + 48 * c.i, cy = 74 + 48 * c.j;
    var ok = c.i >= 0 && c.i <= 26 && c.j >= 0 && c.j <= 13 &&
      distToPath(cx, cy) >= 52 && dd(cx, cy, CASTLE_X, CASTLE_Y) >= 90 && !G.occupied[cellKey(c.i, c.j)];
    return { kind: type, x: cx, y: cy, valid: ok, cell: c };
  }
  return { kind: type, x: p.x, y: p.y, valid: dd(p.x, p.y, CASTLE_X, CASTLE_Y) >= 90 };
}
function doPlace(kit) {
  var info = placeInfo(kit);
  if (!info.valid) return;
  var u;
  if (info.kind === 'tower') u = mkUnit('tower', 'ally', info.x, info.y, [], 2);
  else if (info.kind === 'stele') u = mkUnit('stele', 'ally', info.x, info.y, [], 1);
  else if (info.kind === 'soldier') u = mkUnit('soldier', 'ally', info.x, info.y, ['melee'], 2);
  else u = mkUnit('wolf', 'ally', info.x, info.y, ['melee'], 2);
  if (info.cell) { u.cell = cellKey(info.cell.i, info.cell.j); G.occupied[u.cell] = true; }
  G.units.push(u);
  G.hand = null;
}

function pressZ() {
  var hand = G.hand;
  if (hand && KITS[hand]) { doPlace(hand); return; }
  var tgt = findTarget();
  if (!tgt) return;
  if (tgt.kind === 'ground') {
    var g = tgt.obj;
    if (!hand) { G.hand = g.item; removeGround(g); }
    else if (isSoul(hand) || hand === 'slotStone') { var old = g.item; g.item = hand; G.hand = old; }
    return;
  }
  openSoulPopup(tgt, false);
}
function removeGround(g) { var i = G.grounds.indexOf(g); if (i >= 0) G.grounds.splice(i, 1); }

// ---- 魂件彈窗
function openSoulPopup(tgt, self) {
  var u = tgt.obj, hand = G.hand, cur = 0, i;
  if (!hand) { for (i = 0; i < u.slots.length; i++) if (u.slots[i]) { cur = i; break; } }
  else if (isSoul(hand)) { for (i = 0; i < u.slots.length; i++) if (!u.slots[i]) { cur = i; break; } }
  G.popup = { type: 'soul', target: tgt, self: self, cursor: cur, shakeAge: 0.25 };
}
function openSelfPopup() {
  openSoulPopup({ kind: 'self', obj: G.player, half: 16 }, true);
}
function popupCells(pop) { return pop.target.obj.slots.length + (pop.self ? 1 : 0); }
function canFuse(u) { return u.team === 'ally' || u.type === 'castle' || u.type === 'player'; }
function popupAction(pop) {
  var u = pop.target.obj, hand = G.hand, i = pop.cursor, kind = pop.target.kind;
  if (pop.self && i === u.slots.length) return (isSoul(hand) || hand === 'slotStone') ? '丟下' : '';
  var cell = u.slots[i];
  if (!hand) { if (!cell) return ''; return kind === 'enemy' ? '搶奪' : '拿起'; }
  if (isSoul(hand)) {
    if (kind === 'unit' || kind === 'self') return cell ? '互換' : '裝上';
    return '';
  }
  if (hand === 'slotStone') return (kind === 'unit' && u.maxCap > u.cap) ? '擴槽' : '';
  return '';
}
function popupShake(pop) { pop.shakeAge = 0; }
function soulKey(k) {
  var pop = G.popup, n = popupCells(pop);
  if (k === 'ArrowLeft') pop.cursor = (pop.cursor + n - 1) % n;
  else if (k === 'ArrowRight') pop.cursor = (pop.cursor + 1) % n;
  else if (k === 'KeyX') G.popup = null;
  else if (k === 'KeyZ') soulConfirm(pop);
}
function soulConfirm(pop) {
  var u = pop.target.obj, hand = G.hand, i = pop.cursor, kind = pop.target.kind;
  var act = popupAction(pop);
  if (!act) { popupShake(pop); return; }
  if (act === '丟下') {
    G.grounds.push({ id: G.nextId++, item: hand, x: G.player.x, y: G.player.y });
    G.hand = null; G.popup = null; return;
  }
  if (act === '搶奪') {
    G.steal = { enemy: u, idx: i, item: u.slots[i], t: 0 };
    G.popup = null; return;
  }
  if (act === '拿起') { G.hand = u.slots[i]; u.slots[i] = null; G.popup = null; return; }
  if (act === '裝上' || act === '互換') {
    var old = u.slots[i];
    u.slots[i] = hand; G.hand = old || null;
    if (canFuse(u)) fuseUnit(u);
    G.popup = null; return;
  }
  if (act === '擴槽') { u.cap++; u.slots.push(null); G.hand = null; G.popup = null; return; }
}

// ---- 商店
function shopRows() {
  function mk(list, row) {
    return list.map(function (it) {
      var st = 'ok';
      if (row === 0 && it.item === 'wolfKit' && !G.wolfUnlocked) st = 'locked';
      else if (row === 1 && !G.comboFound[it.item]) st = 'locked';
      else if (G.gold < it.price) st = 'poor';
      return { item: it.item, name: it.name, price: it.price, state: st };
    });
  }
  return [mk(SHOP0, 0), mk(SHOP1, 1)];
}
function shopKey(k) {
  var pop = G.popup, rows = shopRows();
  if (k === 'ArrowLeft') pop.idx = (pop.idx + rows[pop.row].length - 1) % rows[pop.row].length;
  else if (k === 'ArrowRight') pop.idx = (pop.idx + 1) % rows[pop.row].length;
  else if (k === 'ArrowUp' || k === 'ArrowDown') {
    pop.row = 1 - pop.row;
    pop.idx = Math.min(pop.idx, rows[pop.row].length - 1);
  } else if (k === 'KeyX') G.popup = null;
  else if (k === 'KeyZ') {
    var it = rows[pop.row][pop.idx], msg = '';
    if (it.state === 'locked') msg = '尚未解鎖';
    else if (it.state === 'poor') msg = '金幣不足';
    else if (G.hand) msg = '手上要空著';
    if (msg) { pop.message = msg; pop.shakeAge = 0; return; }
    G.gold -= it.price; G.hand = it.item; G.popup = null;
  }
}

// ---------------------------------------------------------------- 合成與陣紋
function addName(kind, name, dur, ref) {
  G.names.push({ kind: kind, name: name, age: 0, dur: dur, unit: ref.unit || null, link: ref.link || null, x: ref.x || 0, y: ref.y || 0 });
}
function fuseUnit(u) {
  var again = true;
  while (again) {
    again = false;
    for (var r = 0; r < RECIPES.length; r++) {
      var rc = RECIPES[r], i = u.slots.indexOf(rc.a), j;
      if (i < 0) continue;
      if (rc.a === rc.b) { j = -1; for (var q = i + 1; q < u.slots.length; q++) if (u.slots[q] === rc.b) { j = q; break; } }
      else j = u.slots.indexOf(rc.b);
      if (j < 0) continue;
      var lo = Math.min(i, j), hi = Math.max(i, j);
      u.slots[lo] = rc.k; u.slots[hi] = null;
      var first = !G.comboFound[rc.k];
      if (first) G.comboFound[rc.k] = true;
      addName(first ? 'newCombo' : 'fuse', COMBO_NAME[rc.k], 1.5, { unit: u });
      again = true; break;
    }
  }
}
function linkTags(u) {
  var t = { frost: false, blade: false, arrow: false }, i, s;
  for (i = 0; i < u.slots.length; i++) {
    s = u.slots[i];
    if (!s) continue;
    if (s === 'frost' || s === 'iceArrow' || s === 'frostSmash') t.frost = true;
    if (s === 'melee' || s === 'whirl' || s === 'frostSmash') t.blade = true;
    if (s === 'ranged' || s === 'pierce' || s === 'iceArrow') t.arrow = true;
  }
  return t;
}
function linkEndpoints() {
  var eps = [G.castle, G.player];
  G.units.forEach(function (u) { if (!u.dead && u.team === 'ally' && (u.type === 'tower' || u.type === 'stele')) eps.push(u); });
  return eps;
}
function updateLinks(dt) {
  var eps = linkEndpoints(), tags = eps.map(linkTags), newMap = {}, newList = [];
  for (var i = 0; i < eps.length; i++) {
    for (var j = i + 1; j < eps.length; j++) {
      var a = eps[i], b = eps[j];
      if (dd(a.x, a.y, b.x, b.y) > 200) continue;
      var kind = null, order = ['frost', 'blade', 'arrow'];
      for (var o = 0; o < 3; o++) if (tags[i][order[o]] && tags[j][order[o]]) { kind = order[o]; break; }
      if (!kind) continue;
      var key = a.id + '_' + b.id, l = G.linkMap[key];
      if (!l || l.kind !== kind) {
        l = { key: key, kind: kind, a: a, b: b, timer: 0, tickAge: 0.15, formAge: 0, alive: true, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
        var first = !G.linkFound[kind], withPlayer = (a === G.player || b === G.player);
        if (first) G.linkFound[kind] = true;
        if (first) addName('newLink', LINK_NAME[kind], 1.2, { link: l, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        else if (!withPlayer) addName('link', LINK_NAME[kind], 1.2, { link: l, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
      newMap[key] = l; newList.push(l);
    }
  }
  for (var k in G.linkMap) if (!newMap[k]) G.linkMap[k].alive = false;
  G.linkMap = newMap; G.links = newList;
  newList.forEach(function (l) {
    l.x1 = l.a.x; l.y1 = l.a.y; l.x2 = l.b.x; l.y2 = l.b.y;
    l.formAge = Math.min(0.4, l.formAge + dt);
    if (l.kind === 'frost') { l.tickAge = 0.15; }
    else l.tickAge = Math.min(0.15, l.tickAge + dt);
    var touched = [];
    G.enemies.forEach(function (e) {
      if (!e.dead && distSeg(e.x, e.y, l.x1, l.y1, l.x2, l.y2) <= 80) touched.push(e);
    });
    if (l.kind === 'frost') {
      touched.forEach(function (e) { e.linkSlowT = 0.3; });
    } else {
      l.timer += dt;
      if (l.timer >= LINK_INTERVAL[l.kind]) {
        l.timer -= LINK_INTERVAL[l.kind];
        if (touched.length) l.tickAge = 0;
        touched.forEach(function (e) { damageEnemy(e, LINK_DMG[l.kind]); });
      }
    }
  });
}

// ---------------------------------------------------------------- 戰鬥
function damageEnemy(e, amount) {
  if (e.dead) return;
  e.hp -= amount; e.hitAge = 0;
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  G.corpses.push({ id: G.nextId++, kind: e.type, x: e.x, y: e.y, life: 15, half: e.half, slots: e.slots, dead: false });
  var n = ENEMY[e.type].coins;
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 40;
    G.coins.push({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r });
  }
}
function spark(x, y) { G.sparks.push({ x: x, y: y, age: 0 }); }
function slowEnemy(e) { e.iceT = Math.max(e.iceT, 2); }

function effectList(u) {
  var list = [], nr = count(u, 'ranged'), nm = count(u, 'melee');
  if (nr) list.push({ kind: 'ranged', idx: u.slots.indexOf('ranged'), n: nr });
  if (nm) list.push({ kind: 'melee', idx: u.slots.indexOf('melee'), n: nm });
  for (var i = 0; i < u.slots.length; i++) {
    var s = u.slots[i];
    if (s === 'pierce' || s === 'iceArrow' || s === 'whirl' || s === 'frostSmash') list.push({ kind: s, idx: i, n: 1 });
  }
  return list;
}
function nearestEnemy(u, rangeFn) {
  var best = null, bd = 1e9;
  G.enemies.forEach(function (e) {
    if (e.dead) return;
    var d = dd(u.x, u.y, e.x, e.y);
    if (d <= rangeFn(e) && d < bd) { bd = d; best = e; }
  });
  return best;
}
function unitCombat(u, dt) {
  u.attackAge = Math.min(0.15, u.attackAge + dt);
  u.engaged = false;
  var list = effectList(u);
  for (var li = 0; li < list.length; li++) {
    var ef = list[li], key = ef.idx;
    if (u.cdk[key] !== ef.kind) { u.cdk[key] = ef.kind; u.cd[key] = INTERVAL[ef.kind]; }
    u.cd[key] = Math.max(0, u.cd[key] - dt);
    var tgt = null, kind = ef.kind;
    if (kind === 'ranged' || kind === 'iceArrow') tgt = nearestEnemy(u, function () { return 200; });
    else if (kind === 'pierce') tgt = nearestEnemy(u, function () { return 260; });
    else if (kind === 'melee' || kind === 'frostSmash') tgt = nearestEnemy(u, function (e) { return u.half + e.half + 12; });
    else if (kind === 'whirl') tgt = nearestEnemy(u, function () { return 60; });
    if (!tgt) continue;
    u.engaged = true;
    if (u.cd[key] > 0) continue;
    u.cd[key] = INTERVAL[kind]; u.attackAge = 0;
    fireEffect(u, ef, tgt);
  }
}
function fireEffect(u, ef, tgt) {
  var kind = ef.kind;
  if (kind === 'ranged') {
    G.projs.push({ x: u.x, y: u.y, angle: Math.atan2(tgt.y - u.y, tgt.x - u.x), kind: 'normal', target: tgt, dmg: 10 * ef.n });
  } else if (kind === 'iceArrow') {
    G.projs.push({ x: u.x, y: u.y, angle: Math.atan2(tgt.y - u.y, tgt.x - u.x), kind: 'ice', target: tgt, dmg: 10 });
  } else if (kind === 'melee') {
    damageEnemy(tgt, 14 * ef.n); spark(tgt.x, tgt.y);
  } else if (kind === 'pierce') {
    var ang = Math.atan2(tgt.y - u.y, tgt.x - u.x), ex = u.x + Math.cos(ang) * 260, ey = u.y + Math.sin(ang) * 260;
    G.beams.push({ x1: u.x, y1: u.y, x2: ex, y2: ey, age: 0 });
    G.enemies.forEach(function (e) {
      if (!e.dead && distSeg(e.x, e.y, u.x, u.y, ex, ey) <= 14) { damageEnemy(e, 14); spark(e.x, e.y); }
    });
  } else if (kind === 'whirl') {
    G.areas.push({ kind: 'whirl', x: u.x, y: u.y, age: 0 });
    G.enemies.forEach(function (e) { if (!e.dead && dd(u.x, u.y, e.x, e.y) <= 60) damageEnemy(e, 16); });
  } else if (kind === 'frostSmash') {
    var cx = tgt.x, cy = tgt.y;
    damageEnemy(tgt, 16); spark(cx, cy);
    G.areas.push({ kind: 'frostSmash', x: cx, y: cy, age: 0 });
    G.enemies.forEach(function (e) { if (!e.dead && dd(cx, cy, e.x, e.y) <= 60) slowEnemy(e); });
  }
}
function updateProjectiles(dt) {
  G.projs = G.projs.filter(function (p) {
    var e = p.target;
    if (e.dead) return false;
    var d = dd(p.x, p.y, e.x, e.y), step = 420 * dt;
    p.angle = Math.atan2(e.y - p.y, e.x - p.x);
    if (d <= step + e.half) {
      damageEnemy(e, p.dmg); spark(e.x, e.y);
      if (p.kind === 'ice') slowEnemy(e);
      return false;
    }
    p.x += Math.cos(p.angle) * step; p.y += Math.sin(p.angle) * step;
    return true;
  });
}

// ---------------------------------------------------------------- 單位移動
function kindOfMove(u) {
  if (u.type === 'player') return null;
  if (has(u, 'counter')) return 'counter';
  if (has(u, 'seek')) return 'seek';
  if (has(u, 'march')) return 'march';
  if (u.type === 'soldier' || u.type === 'wolf') return 'patrol';
  return null;
}
function updateAllyMove(u, dt) {
  u.moving = false;
  if (u.type === 'castle' || u.type === 'stele' || u.type === 'player') return;
  var m = kindOfMove(u);
  if (m !== 'counter') u.cs = null;
  if (m !== 'march') u.marchDone = false;
  if (u.engaged || !m) return;
  if (m === 'counter') {
    if (u.cs == null) {
      var n = pathNearest(u.x, u.y);
      if (n.d > 2) { moveToward(u, n.x, n.y, 60, dt); return; }
      u.cs = n.s;
    }
    u.cs = Math.max(10, u.cs - 60 * dt);
    var pt = pathPoint(u.cs);
    u.moving = (u.cs > 10 || dd(u.x, u.y, pt[0], pt[1]) > 0.5);
    u.x = pt[0]; u.y = pt[1];
  } else if (m === 'seek') {
    var best = null, bd = 1e9;
    G.enemies.forEach(function (e) {
      if (e.dead) return;
      var d = dd(u.home.x, u.home.y, e.x, e.y);
      if (d <= 200 && d < bd) { bd = d; best = e; }
    });
    var sp = Math.min(70 * count(u, 'seek'), 140);
    if (best) {
      var ranged = has(u, 'ranged') || has(u, 'pierce') || has(u, 'iceArrow');
      moveToward(u, best.x, best.y, sp, dt, ranged ? 180 : (u.half + best.half));
    } else {
      moveToward(u, u.home.x, u.home.y, 80, dt);
    }
  } else if (m === 'march') {
    var stop = G.castle.half + u.half;
    if (dd(u.x, u.y, G.castle.x, G.castle.y) > stop + 1e-6) moveToward(u, G.castle.x, G.castle.y, 60, dt, stop);
    if (dd(u.x, u.y, G.castle.x, G.castle.y) <= stop + 1e-6 && !u.marchDone) { u.marchDone = true; u.home = { x: u.x, y: u.y }; }
  } else if (m === 'patrol') {
    patrolMove(u, dt);
  }
}
function patrolMove(u, dt) {
  var sp = u.type === 'soldier' ? 50 : 90;
  if (u.ps == null) { var n = pathNearest(u.home.x, u.home.y); u.ps = n.s; u.pc = n.s; u.pdir = 1; }
  var pt = pathPoint(u.ps);
  if (dd(u.x, u.y, pt[0], pt[1]) > 3) { moveToward(u, pt[0], pt[1], sp, dt); return; }
  u.ps += u.pdir * sp * dt;
  var lo = Math.max(0, u.pc - 120), hi = Math.min(PATHLEN, u.pc + 120);
  if (u.ps > hi) { u.ps = hi; u.pdir = -1; } else if (u.ps < lo) { u.ps = lo; u.pdir = 1; }
  pt = pathPoint(u.ps); u.x = pt[0]; u.y = pt[1]; u.moving = true;
}
function updateNeutral(u, dt) {
  u.moving = false;
  if (has(u, 'march')) {
    moveToward(u, G.castle.x, G.castle.y, 60, dt);
    if (dd(u.x, u.y, G.castle.x, G.castle.y) <= CASTLE_HALF + 10) {
      u.dead = true;
      var k = 0;
      u.slots.forEach(function (s) {
        if (!s) return;
        G.grounds.push({ id: G.nextId++, item: s, x: 1100 + 32 * k, y: 540 });
        k++;
      });
      G.wolfUnlocked = true;
    }
    return;
  }
  u.wt -= dt;
  if (u.wt <= 0 || u.tx == null) {
    var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 110;
    u.tx = u.wx + Math.cos(a) * r; u.ty = u.wy + Math.sin(a) * r; u.wt = 2;
  }
  moveToward(u, u.tx, u.ty, 50, dt);
}

// ---------------------------------------------------------------- 敵人
function spawnEnemy(type) {
  var d = ENEMY[type], p = pathPoint(10);
  G.enemies.push({
    id: G.nextId++, type: type, s: 10, x: p[0], y: p[1], hp: d.hp, maxHp: d.hp, half: d.half,
    slots: d.slots.slice(), cap: d.slots.length, hitAge: 0.2, moving: true, slowed: false,
    iceT: 0, linkSlowT: 0, dead: false
  });
}
function auraSlow(e) {
  var s = 0;
  var srcs = [G.castle, G.player];
  G.units.forEach(function (u) { if (!u.dead && u.team === 'ally' && u.type !== 'stele') srcs.push(u); });
  for (var i = 0; i < srcs.length; i++) {
    if (has(srcs[i], 'frost') && dd(srcs[i].x, srcs[i].y, e.x, e.y) <= 70) { s = 0.3; break; }
  }
  return s;
}
function updateEnemies(dt) {
  G.enemies.forEach(function (e) {
    if (e.dead) return;
    e.hitAge = Math.min(0.2, e.hitAge + dt);
    e.iceT = Math.max(0, e.iceT - dt);
    var slow = auraSlow(e);
    if (e.iceT > 0 || e.linkSlowT > 0) slow = Math.max(slow, 0.5);
    e.linkSlowT = Math.max(0, e.linkSlowT - dt);
    e.slowed = slow > 0;
    e.moving = has(e, 'march');
    if (!e.moving) return;
    e.s += ENEMY[e.type].speed * (1 - slow) * dt;
    var pt = pathPoint(e.s); e.x = pt[0]; e.y = pt[1];
    if (dd(e.x, e.y, CASTLE_X, CASTLE_Y) <= CASTLE_HALF + 10) {
      G.hp -= ENEMY[e.type].dmg; G.castle.hitAge = 0; e.dead = true;
    }
  });
}

// ---------------------------------------------------------------- 主更新
function update(rdt) {
  G.realT += rdt;
  if (G.popup) G.popup.shakeAge = Math.min(0.25, G.popup.shakeAge + rdt);
  if (G.result) { G.resultAge += rdt; return; }
  var dt = rdt * (G.popup ? 0.2 : 1), p = G.player;
  G.t += dt;

  // 出怪
  while (G.spawnIdx < G.spawns.length && G.spawns[G.spawnIdx].t <= G.t) {
    spawnEnemy(G.spawns[G.spawnIdx].type);
    G.waveReached = Math.max(G.waveReached, G.spawns[G.spawnIdx].wave);
    G.spawnIdx++;
  }

  // 玩家
  p.moving = false;
  if (!G.popup) {
    var dx = (keysHeld.ArrowRight ? 1 : 0) - (keysHeld.ArrowLeft ? 1 : 0);
    var dy = (keysHeld.ArrowDown ? 1 : 0) - (keysHeld.ArrowUp ? 1 : 0);
    if (dx || dy) {
      var l = Math.hypot(dx, dy);
      p.x = clamp(p.x + dx / l * 260 * dt, 16, W - 16);
      p.y = clamp(p.y + dy / l * 260 * dt, 66, H - 16);
      p.moving = true;
    }
  }
  if (G.steal) {
    var st = G.steal, e = st.enemy;
    if (e.dead || dd(p.x, p.y, e.x, e.y) > e.half + 68 || e.slots[st.idx] !== st.item) G.steal = null;
    else {
      st.t += dt;
      if (st.t >= 1.5) {
        if (!G.hand) { G.hand = st.item; e.slots[st.idx] = null; }
        G.steal = null;
      }
    }
  }

  // 單位
  G.units.forEach(function (u) {
    if (u.dead) return;
    if (u.team === 'neutral') { updateNeutral(u, dt); return; }
    unitCombat(u, dt);
    updateAllyMove(u, dt);
  });
  G.units = G.units.filter(function (u) { return !u.dead; });
  unitCombat(G.castle, dt);
  unitCombat(p, dt);
  G.castle.hitAge = Math.min(0.3, G.castle.hitAge + dt);

  updateLinks(dt);
  updateEnemies(dt);
  updateProjectiles(dt);

  // 特效計時
  G.beams.forEach(function (b) { b.age += dt; });
  G.beams = G.beams.filter(function (b) { return b.age < 0.15; });
  G.areas.forEach(function (b) { b.age += dt; });
  G.areas = G.areas.filter(function (b) { return b.age < 0.3; });
  G.sparks.forEach(function (b) { b.age += dt; });
  G.sparks = G.sparks.filter(function (b) { return b.age < 0.25; });
  G.names.forEach(function (n) {
    n.age += dt;
    if (n.link) { if (n.link.alive) { n.x = (n.link.x1 + n.link.x2) / 2; n.y = (n.link.y1 + n.link.y2) / 2; } }
  });
  G.names = G.names.filter(function (n) { return n.age < n.dur; });

  // 屍體
  G.corpses.forEach(function (c) { c.life -= dt; if (c.life <= 0) c.dead = true; });
  G.corpses = G.corpses.filter(function (c) { return !c.dead; });

  // 金幣
  G.coins = G.coins.filter(function (c) {
    var d = dd(c.x, c.y, p.x, p.y);
    if (d <= 20) { G.gold += 2; return false; }
    if (d <= 90) {
      var step = Math.min(420 * dt, d);
      c.x += (p.x - c.x) / d * step; c.y += (p.y - c.y) / d * step;
    }
    return true;
  });

  G.enemies = G.enemies.filter(function (e) { return !e.dead; });

  // 彈窗有效性
  if (G.popup && G.popup.type === 'soul' && !G.popup.self) {
    var tg = G.popup.target, o = tg.obj;
    if (o.dead || dd(p.x, p.y, o.x, o.y) > tg.half + 68) G.popup = null;
  }

  // 結束判定(只在最尾端判一次)
  if (G.hp <= 0) endGame(false);
  else if (G.spawnIdx >= G.spawns.length && G.enemies.length === 0) endGame(true);
}
function endGame(win) {
  G.hp = Math.max(0, G.hp);
  G.result = { win: win }; G.resultAge = 0; G.popup = null; G.steal = null;
}

// ---------------------------------------------------------------- 繪製
function renderGuide() {
  ctx.fillStyle = '#161b26';
  ctx.fillRect(0, 0, W, H);
  var pg = GUIDE[guidePage], sc = 1.5;
  var w = pg.w * sc, h = pg.h * sc, fx = Math.round((W - w) / 2), fy = 150 + Math.round((480 - h) / 2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 40px ' + FONT;
  ctx.fillText('魂匠陣紋 — ' + pg.title, W / 2, 56);
  ctx.fillStyle = '#ffffff'; ctx.font = '28px ' + FONT;
  ctx.fillText(pg.text, W / 2, 108);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
  ctx.strokeRect(fx - 0.5, fy - 0.5, w + 1, h + 1);
  Art.drawGuidePage(ctx, { page: guidePage + 1, x: fx, y: fy, w: w, h: h });
  ctx.fillStyle = '#cfd6e6'; ctx.font = '22px ' + FONT;
  ctx.fillText('第 ' + (guidePage + 1) + ' / ' + GUIDE.length + ' 頁', W / 2, 660);
  ctx.fillStyle = '#9fb0d0'; ctx.font = '20px ' + FONT;
  var last = guidePage === GUIDE.length - 1;
  ctx.fillText((guidePage > 0 ? '← 上一頁    ' : '') + (last ? 'Z 開始遊戲' : 'Z / → 下一頁'), W / 2, 694);
}

function slotsPos(u) {
  if (u.type === 'castle') return [u.x, u.y - 56 - 20];
  return [u.x, u.y - u.half - 20];
}

function renderGame() {
  var p = G.player, i;
  var tgt = null;
  if (G.popup && G.popup.type === 'soul') tgt = G.popup.self ? null : G.popup.target;
  else if (!G.popup) tgt = findTarget();
  if (G.steal) tgt = { kind: 'enemy', obj: G.steal.enemy, half: G.steal.enemy.half };
  var tobj = tgt ? tgt.obj : null;

  Art.drawBackground(ctx);
  G.links.forEach(function (l) {
    Art.drawLink(ctx, { x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, kind: l.kind, reach: 80, tickAge: l.tickAge, tickDuration: 0.15, formAge: l.formAge, formDuration: 0.4 });
  });
  var auraSrc = [G.castle, p].concat(G.units.filter(function (u) { return u.team === 'ally' && u.type !== 'stele'; }));
  auraSrc.forEach(function (u) { if (has(u, 'frost')) Art.drawFrostAura(ctx, { x: u.x, y: u.y, radius: 70 }); });
  G.coins.forEach(function (c) { Art.drawCoin(ctx, { x: c.x, y: c.y }); });
  G.corpses.forEach(function (c) { Art.drawCorpse(ctx, { kind: c.kind, x: c.x, y: c.y, life: c.life, maxLife: 15, targeted: c === tobj }); });
  G.grounds.forEach(function (g) { Art.drawGroundPart(ctx, { item: g.item, x: g.x, y: g.y, targeted: g === tobj }); });
  if (G.hand && KITS[G.hand] && !G.popup) {
    var pi = placeInfo(G.hand);
    Art.drawPlacePreview(ctx, { kind: pi.kind, x: pi.x, y: pi.y, valid: pi.valid });
  }

  var ents = [];
  ents.push({ y: G.castle.y, f: function () { var c = G.castle; Art.drawCastle(ctx, { x: c.x, y: c.y, hitAge: c.hitAge, hitDuration: 0.3, attackAge: c.attackAge, attackDuration: 0.15, zoneActive: dd(p.x, p.y, c.x, c.y) <= 110, targeted: c === tobj }); } });
  G.units.forEach(function (u) {
    ents.push({ y: u.y, f: function () {
      var s = { x: u.x, y: u.y, attackAge: u.attackAge, attackDuration: 0.15, moving: u.moving, targeted: u === tobj };
      if (u.type === 'tower') Art.drawTower(ctx, s);
      else if (u.type === 'stele') Art.drawStele(ctx, { x: u.x, y: u.y, targeted: u === tobj });
      else if (u.type === 'soldier') Art.drawSoldier(ctx, s);
      else { s.team = u.team; Art.drawWolf(ctx, s); }
    } });
  });
  G.enemies.forEach(function (e) {
    ents.push({ y: e.y, f: function () { Art.drawEnemy(ctx, { type: e.type, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, hitAge: e.hitAge, hitDuration: 0.2, moving: e.moving, slowed: e.slowed, targeted: e === tobj }); } });
  });
  ents.push({ y: p.y, f: function () {
    Art.drawPlayer(ctx, { x: p.x, y: p.y, moving: p.moving, attackAge: p.attackAge, attackDuration: 0.15, handItem: G.hand, stealing: !!G.steal, stealProgress: G.steal ? Math.min(1, G.steal.t / 1.5) : 0 });
  } });
  ents.sort(function (a, b) { return a.y - b.y; });
  ents.forEach(function (en) { en.f(); });

  // 魂件槽列
  var cp = slotsPos(G.castle);
  Art.drawSoulSlots(ctx, { x: cp[0], y: cp[1], slots: G.castle.slots.slice() });
  G.units.forEach(function (u) {
    var sp = slotsPos(u);
    Art.drawSoulSlots(ctx, { x: sp[0], y: sp[1], slots: u.slots.slice() });
  });
  G.corpses.forEach(function (c) { Art.drawSoulSlots(ctx, { x: c.x, y: c.y - c.half - 12, slots: c.slots.slice() }); });
  Art.drawSoulSlots(ctx, { x: p.x, y: p.y - 16 - 20, slots: p.slots.slice() });
  G.enemies.forEach(function (e) {
    if (e === tobj) Art.drawSoulSlots(ctx, { x: e.x, y: e.y - e.half - 20, slots: e.slots.slice() });
  });

  G.projs.forEach(function (q) { Art.drawProjectile(ctx, { x: q.x, y: q.y, angle: q.angle, kind: q.kind }); });
  G.beams.forEach(function (b) { Art.drawPierceBeam(ctx, { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, age: b.age, duration: 0.15 }); });
  G.areas.forEach(function (a) { Art.drawAreaHit(ctx, { kind: a.kind, x: a.x, y: a.y, radius: 60, age: a.age, duration: 0.3 }); });
  G.sparks.forEach(function (s) { Art.drawHitSpark(ctx, { x: s.x, y: s.y, age: s.age, duration: 0.25 }); });
  if (G.steal) {
    var e = G.steal.enemy, L = e.slots.length;
    Art.drawStealLink(ctx, { x1: p.x, y1: p.y, x2: e.x - L * 10 + 10 + 20 * G.steal.idx, y2: e.y - e.half - 20, progress: Math.min(1, G.steal.t / 1.5) });
  }
  G.names.forEach(function (n) {
    var x = n.x, y = n.y;
    if (n.unit) { x = n.unit.x; y = n.unit.y - n.unit.half - 44; }
    Art.drawComboName(ctx, { x: x, y: y, kind: n.kind, name: n.name, age: n.age, duration: n.dur });
  });
  // 預警 / HUD
  var next = 0;
  for (i = 1; i <= TOTAL_WAVES; i++) if (waveStart(i) > G.t) { next = i; break; }
  var wave = next ? next - 1 : TOTAL_WAVES;
  if (next) {
    var rem = waveStart(next) - G.t;
    if (rem > 0 && rem <= 6) Art.drawSpawnWarning(ctx, { remaining: rem, total: 6 });
  }
  Art.drawHud(ctx, { gold: G.gold, castleHp: Math.max(0, G.hp), castleMaxHp: 20, wave: wave, totalWaves: TOTAL_WAVES, nextWaveIn: next ? Math.ceil(waveStart(next) - G.t) : -1 });

  if (G.popup) {
    Art.drawSlowMo(ctx, {});
    if (G.popup.type === 'shop') {
      var rows = shopRows(), pp = G.popup;
      Art.drawShopPopup(ctx, { row0: rows[0], row1: rows[1], cursorRow: pp.row, cursorIndex: pp.idx, message: pp.message, shakeAge: pp.shakeAge, shakeDuration: 0.25 });
    } else renderSoulPopup();
  }
  if (G.result) {
    Art.drawResult(ctx, { win: G.result.win, wave: G.waveReached, totalWaves: TOTAL_WAVES, comboCount: Object.keys(G.comboFound).length, linkCount: Object.keys(G.linkFound).length });
  }
}

function popupTitle(tg) {
  if (tg.kind === 'self') return '自己';
  var o = tg.obj;
  if (tg.kind === 'unit') return UNIT_NAME[o.type];
  if (tg.kind === 'corpse') return ENEMY[o.kind].name + '的屍體';
  return ENEMY[o.type].name + '(活)';
}
function renderSoulPopup() {
  var pop = G.popup, tg = pop.target, o = tg.obj, p = G.player;
  var cells = o.slots.length + (pop.self ? 1 : 0);
  var w = cells * 48 + 120, h = 116;
  var tx = o.x, top = o.y - tg.half - 40 - h / 2, bottom = o.y + tg.half + 40 + h / 2;
  var y = top - h / 2 < 0 ? bottom : top;
  if (tg.kind === 'enemy' || tg.kind === 'corpse') { top -= 10; y = top - h / 2 < 0 ? bottom + 10 : top; }
  var x = clamp(tx, w / 2, W - w / 2);
  y = clamp(y, h / 2, H - h / 2);
  Art.drawSoulPopup(ctx, {
    x: x, y: y, w: w, h: h, title: popupTitle(tg), slots: o.slots.slice(), dropCell: pop.self,
    index: pop.cursor, hand: G.hand, actionLabel: popupAction(pop), shakeAge: pop.shakeAge, shakeDuration: 0.25
  });
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  if (screen === 'guide') renderGuide(); else renderGame();
}

// ---------------------------------------------------------------- 主迴圈
var lastTs = null;
function frame(ts) {
  var dt = lastTs == null ? 0 : (ts - lastTs) / 1000;
  lastTs = ts;
  dt = clamp(dt, 0, 1 / 30);
  try {
    processInput();
    if (screen === 'play') update(dt);
    render();
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
