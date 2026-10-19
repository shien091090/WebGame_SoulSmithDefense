'use strict';
// 魂匠共鳴 — 玩法驗證 Demo。邏輯與繪製分離: update 改狀態, render 只呼叫 Art.drawXxx。

const Placeholder = {}; // 目前 interface.json 涵蓋所有圖形, 無佔位

const W = Art.canvas.width, H = Art.canvas.height;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const DPR = window.devicePixelRatio || 1;
canvas.width = W * DPR;
canvas.height = H * DPR;
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

// ───────── 常數 ─────────
const BASIC = { ranged: 1, melee: 1, frost: 1, seek: 1, march: 1, drum: 1 };
const COMBO_KIND = ['pierce', 'iceArrow', 'whirl', 'frostSmash', 'charge'];
const COMBO_NAME = ['穿透箭', '冰箭', '旋風斬', '冰霜重擊', '衝鋒'];
const COMBO_IDX = { pierce: 0, iceArrow: 1, whirl: 2, frostSmash: 3, charge: 4 };
const RECIPES = [['ranged', 'ranged'], ['ranged', 'frost'], ['melee', 'melee'], ['melee', 'frost'], ['drum', 'melee']];
const KITS = { crossbowKit: 1, pillarKit: 1, soldierKit: 1, golemKit: 1 };
const CASTLE_POS = { x: 1180, y: 434, half: 56 };
const TOTAL_WAVES = 6;
const SHOP = [
  ['crossbowKit', '弩塔', 15], ['pillarKit', '魂柱', 12], ['soldierKit', '步兵', 12], ['ranged', '遠攻', 8],
  ['melee', '近戰', 8], ['frost', '冰霜', 12], ['slotStone', '擴槽石', 20], ['golemKit', '石魔像', 18]
];
const ENEMY_DEF = {
  imp: { name: '小鬼', hp: 40, speed: 45, half: 16, items: ['melee', 'march'], coins: 1, dmg: 2 },
  archer: { name: '弓鬼', hp: 30, speed: 50, half: 16, items: ['ranged', 'march'], coins: 2, dmg: 2 },
  ice: { name: '冰鬼', hp: 50, speed: 42, half: 16, items: ['frost', 'march'], coins: 2, dmg: 2 },
  drummer: { name: '鼓鬼', hp: 45, speed: 48, half: 18, items: ['drum', 'march'], coins: 2, dmg: 2 },
  brute: { name: '狂鬼', hp: 80, speed: 40, half: 22, items: ['melee', 'seek', 'march'], coins: 3, dmg: 3 }
};
function rep(t, n) { const a = []; for (let i = 0; i < n; i++) a.push(t); return a; }
const WAVES = [
  [{ lane: 'N', list: rep('imp', 5) }],
  [{ lane: 'S', list: rep('imp', 3).concat(rep('archer', 3)) }],
  [{ lane: 'N', list: rep('drummer', 3).concat(rep('imp', 3)) }, { lane: 'S', list: rep('imp', 3) }],
  [{ lane: 'S', list: rep('ice', 3).concat(rep('brute', 2)) }, { lane: 'N', list: rep('archer', 3) }],
  [{ lane: 'N', list: rep('brute', 3).concat(rep('drummer', 2)) }, { lane: 'S', list: rep('ice', 3).concat(rep('imp', 3)) }],
  [{ lane: 'N', list: rep('imp', 3).concat(rep('brute', 2), ['ice', 'drummer']) }, { lane: 'S', list: rep('imp', 3).concat(rep('brute', 2), ['ice', 'drummer']) }]
];
const GUIDE = [
  ['守住主堡', '撐過 6 波, 別讓鬼走進主堡'],
  ['移動與撿錢', '方向鍵移動, 靠近金幣就吸過來'],
  ['拿魂件', 'Z 開窗, ← → 選格, Z 拿起'],
  ['裝上與互換', '拿著魂件對格子按 Z, 裝上或互換'],
  ['裝在自己身上', 'X 打開自己, 裝上的魂件就能出手'],
  ['魂柱共鳴', '魂柱的魂件, 會借給範圍內的大家'],
  ['購買與蓋塔', '主堡旁按空白鍵買, Z 放下'],
  ['招募中立單位', '中立石魔像裝上進攻主堡會投靠']
];

// ───────── 幾何 ─────────
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function mkPath(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
const LANES = {
  N: mkPath([[0, 194], [720, 194], [720, 434], [1180, 434]]),
  S: mkPath([[0, 626], [720, 626], [720, 434], [1180, 434]])
};
function pathPoint(P, s) {
  s = clamp(s, 0, P.len);
  for (let i = 1; i < P.pts.length; i++) {
    if (s <= P.cum[i] || i === P.pts.length - 1) {
      const seg = P.cum[i] - P.cum[i - 1] || 1;
      const t = (s - P.cum[i - 1]) / seg;
      return { x: P.pts[i - 1][0] + (P.pts[i][0] - P.pts[i - 1][0]) * t, y: P.pts[i - 1][1] + (P.pts[i][1] - P.pts[i - 1][1]) * t };
    }
  }
  return { x: P.pts[0][0], y: P.pts[0][1] };
}
function segProject(ax, ay, bx, by, x, y) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
  const px = ax + dx * t, py = ay + dy * t;
  return { t, x: px, y: py, d: Math.hypot(x - px, y - py) };
}
function pathProject(P, x, y) {
  let best = null;
  for (let i = 1; i < P.pts.length; i++) {
    const a = P.pts[i - 1], b = P.pts[i];
    const r = segProject(a[0], a[1], b[0], b[1], x, y);
    if (!best || r.d < best.d) best = { d: r.d, x: r.x, y: r.y, s: P.cum[i - 1] + (P.cum[i] - P.cum[i - 1]) * r.t };
  }
  return best;
}
// Y 型網路(行軍 / 衝鋒用): 每段 [起, 終, 逆向目標節點]
const NODES = { SN: [0, 194], NC: [720, 194], J: [720, 434], SC: [720, 626], SS: [0, 626], C: [1180, 434] };
const NET = [
  { a: 'SN', b: 'NC', target: 'SN' }, { a: 'NC', b: 'J', target: 'NC' },
  { a: 'SS', b: 'SC', target: 'SS' }, { a: 'SC', b: 'J', target: 'SC' },
  { a: 'J', b: 'C', target: 'J' }
];
function nearestNet(x, y) {
  let best = null;
  for (const s of NET) {
    const A = NODES[s.a], B = NODES[s.b];
    const r = segProject(A[0], A[1], B[0], B[1], x, y);
    if (!best || r.d < best.d) best = { d: r.d, x: r.x, y: r.y, target: s.target };
  }
  return best;
}
function routeDist(x, y) {
  let m = 1e9;
  for (const s of NET) {
    const A = NODES[s.a], B = NODES[s.b];
    m = Math.min(m, segProject(A[0], A[1], B[0], B[1], x, y).d);
  }
  return m;
}

// ───────── 狀態 ─────────
const keys = { L: false, R: false, U: false, D: false };
let zHeld = false;
const G = { screen: 'guide', guidePage: 0, started: false, guideFromPlay: false };

function mkUnit(cat, x, y, half, slots, max) {
  return {
    cat, x, y, half, slots, max: max || 0, cd: {}, ev: emptyEv(),
    hitAge: 0.2, attackAge: 0.15, moving: false, charging: false, down: false, downAge: 5,
    hp: 1, maxHp: 1, slowT: 0, auraSlow: false, home: { x, y }, mNode: null,
    prevCombos: [0, 0, 0, 0, 0], comboLast: [-99, -99, -99, -99, -99], removed: false
  };
}
function emptyEv() { return { combos: [], singles: { ranged: 0, melee: 0, frost: 0, seek: 0, march: 0, drum: 0 }, virt: [], resonating: false }; }

function initPatrol(u) {
  const a = pathProject(LANES.N, u.x, u.y), b = pathProject(LANES.S, u.x, u.y);
  u.lane = a.d <= b.d ? 'N' : 'S';
  u.pc = (a.d <= b.d ? a : b).s;
  u.ps = u.pc;
  u.pdir = 1;
}
function mkTower(x, y) { const u = mkUnit('tower', x, y, 24, [null, null], 4); return u; }
function mkPillar(x, y) { const u = mkUnit('pillar', x, y, 18, [null], 2); u.changeAge = 0.5; return u; }
function mkSoldier(x, y) {
  const u = mkUnit('soldier', x, y, 16, ['melee', null], 0);
  u.team = 'ally'; u.hp = u.maxHp = 80; u.speed = 50; initPatrol(u); return u;
}
function mkGolem(x, y, team) {
  const u = mkUnit('golem', x, y, 28, [null, null, null], 4);
  u.team = team; u.hp = u.maxHp = 220; u.speed = 40;
  if (team === 'ally') initPatrol(u);
  else { u.wx = x; u.wy = y; u.wanderT = 0; }
  return u;
}

function newGame() {
  G.screen = 'play';
  G.time = 0; G.gold = 40; G.castleHp = 20; G.wave = 0;
  G.towers = [mkTower(456, 266), mkTower(456, 554)];
  G.towers.forEach(t => { t.slots = ['ranged', null]; });
  G.pillars = [mkPillar(456, 410)];
  G.pillars[0].slots = ['frost'];
  G.soldiers = [];
  G.golems = [mkGolem(264, 410, 'neutral'), mkGolem(960, 290, 'neutral')];
  G.enemies = []; G.corpses = []; G.parts = []; G.coins = [];
  G.projs = []; G.beams = []; G.areas = []; G.sparks = []; G.names = [];
  G.castle = mkUnit('castle', 1180, 434, 56, ['ranged', 'melee', null], 4);
  G.castle.hitAge = 0.3; G.castle.attackAge = 0.15;
  G.player = mkUnit('player', 1060, 560, 16, ['melee', null, null], 0);
  G.player.stealing = false;
  G.hand = null;
  G.popup = null; G.steal = null; G.target = null;
  G.forge = [false, false, false, false, false];
  G.golemUnlocked = false;
  G.queue = [];
  WAVES.forEach((groups, k) => {
    groups.forEach(g => g.list.forEach((type, i) => G.queue.push({ t: 12 + k * 26 + i * 1.2, lane: g.lane, type })));
  });
  G.queue.sort((a, b) => a.t - b.t);
  G.waveStarted = 0;
  G.win = false; G.resultT = 0;
}
newGame();
G.screen = 'guide';

// ───────── 組合評估 ─────────
function evalUnit(u, virt) {
  const real = [];
  const combos = [];
  const mobile = u.cat === 'soldier' || u.cat === 'golem';
  for (const k of u.slots) {
    if (!k) continue;
    if (BASIC[k]) real.push({ kind: k, used: false });
    else if (COMBO_IDX[k] !== undefined) {
      const ci = COMBO_IDX[k];
      if (ci === 4 && !mobile) continue;
      combos.push(ci);
    }
  }
  function take(kind) {
    for (const v of virt) if (!v.used && v.kind === kind) { v.used = true; return v; }
    for (const r of real) if (!r.used && r.kind === kind) { r.used = true; return r; }
    return null;
  }
  for (let ci = 0; ci < 5; ci++) {
    if (ci === 4 && !mobile) continue;
    const [a, b] = RECIPES[ci];
    for (;;) {
      const x = take(a);
      if (!x) break;
      const y = take(b);
      if (!y) { x.used = false; break; }
      combos.push(ci);
    }
  }
  const singles = { ranged: 0, melee: 0, frost: 0, seek: 0, march: 0, drum: 0 };
  for (const r of real) if (!r.used) singles[r.kind]++;
  let resonating = false;
  for (const v of virt) if (v.used) resonating = true;
  u.ev = { combos, singles, virt, resonating };
}
function evalEnemy(e) {
  const singles = { ranged: 0, melee: 0, frost: 0, seek: 0, march: 0, drum: 0 };
  for (const k of e.slots) if (k && BASIC[k]) singles[k]++;
  e.ev = { combos: [], singles, virt: [], resonating: false };
}
function receivers() {
  return G.towers.concat(G.soldiers, G.golems.filter(g => g.team === 'ally'), [G.castle, G.player]);
}
function computeEvals() {
  for (const r of receivers()) {
    const virt = [];
    const ps = G.pillars.map(p => ({ p, d: dist(p, r) })).filter(o => o.d <= 150).sort((a, b) => a.d - b.d);
    for (const o of ps) o.p.slots.forEach((k, i) => { if (k && BASIC[k]) virt.push({ kind: k, used: false, pillar: o.p, slotIdx: i }); });
    evalUnit(r, virt);
  }
  G.enemies.forEach(evalEnemy);
}

// ───────── 戰鬥輔助 ─────────
function allyAlive() { return G.soldiers.concat(G.golems.filter(g => g.team === 'ally')).filter(u => !u.down); }
function liveEnemies() { return G.enemies.filter(e => !e.dead && !e.gone); }
function nearest(u, list, test) {
  let best = null, bd = 1e9;
  for (const t of list) {
    const d = dist(u, t);
    if (d < bd && (!test || test(t, d))) { bd = d; best = t; }
  }
  return best;
}
function speedMult(u) { return 1 - Math.max(u.auraSlow ? 0.3 : 0, u.slowT > 0 ? 0.5 : 0); }
function hurt(t, amt) {
  if (t.dead || t.down) return;
  t.hp -= amt; t.hitAge = 0;
  G.sparks.push({ x: t.x, y: t.y, age: 0 });
  if (t.hp <= 0) {
    if (t.cat === 'enemy') t.dead = true;
    else { t.hp = 0; t.down = true; t.downAge = 0; t.mNode = null; }
  }
}
function slowIt(t) { t.slowT = 2; }
function knockBack(t) {
  if (t.cat !== 'enemy') return;
  const P = LANES[t.lane];
  const pr = pathProject(P, t.x, t.y);
  const p1 = pathPoint(P, Math.max(0, pr.s - 30));
  const dx = p1.x - pr.x, dy = p1.y - pr.y, d = Math.hypot(dx, dy);
  if (d < 0.001) return;
  t.x += dx / d * 30; t.y += dy / d * 30;
  t.s = pathProject(P, t.x, t.y).s;
}
function effectsOf(u) {
  const ev = u.ev, ef = [], seen = [0, 0, 0, 0, 0];
  for (const ci of ev.combos) { seen[ci]++; ef.push({ key: 'c' + ci + '_' + seen[ci], t: COMBO_KIND[ci] }); }
  if (ev.singles.ranged) ef.push({ key: 's_ranged', t: 'ranged', n: ev.singles.ranged });
  if (ev.singles.melee) ef.push({ key: 's_melee', t: 'melee', n: ev.singles.melee });
  return ef;
}
function hasRangedEffect(u) {
  return u.ev.singles.ranged > 0 || u.ev.combos.indexOf(0) >= 0 || u.ev.combos.indexOf(1) >= 0;
}
function contact(u, t) { return dist(u, t) <= u.half + t.half + 12; }
function spawnProj(u, t, kind, dmg, owner) {
  G.projs.push({ x: u.x, y: u.y, angle: Math.atan2(t.y - u.y, t.x - u.x), kind, owner, dmg, target: t, travel: 0 });
}
function runAttacks(u, side, gdt) {
  const hostiles = side === 'ally' ? liveEnemies() : allyAlive();
  for (const k in u.cd) if (u.cd[k] > 0) u.cd[k] = Math.max(0, u.cd[k] - gdt);
  let standing = false;
  for (const ef of effectsOf(u)) {
    let tgt = null, period = 1;
    switch (ef.t) {
      case 'ranged': tgt = nearest(u, hostiles, (t, d) => d <= 200); period = 1; break;
      case 'melee': tgt = nearest(u, hostiles, t => contact(u, t)); period = 0.8; break;
      case 'pierce': tgt = nearest(u, hostiles, (t, d) => d <= 260); period = 1; break;
      case 'iceArrow': tgt = nearest(u, hostiles, (t, d) => d <= 200); period = 1; break;
      case 'whirl': tgt = nearest(u, hostiles, (t, d) => d <= 60); period = 0.8; break;
      case 'frostSmash': tgt = nearest(u, hostiles, t => contact(u, t)); period = 0.8; break;
      case 'charge': tgt = nearest(u, hostiles, t => contact(u, t)); period = 1; break;
    }
    if (!tgt) continue;
    if (ef.t !== 'charge') standing = true;
    if ((u.cd[ef.key] || 0) > 0) continue;
    u.cd[ef.key] = period;
    u.attackAge = 0;
    const owner = side;
    switch (ef.t) {
      case 'ranged': spawnProj(u, tgt, 'normal', 10 * ef.n, owner); break;
      case 'melee': hurt(tgt, 14 * ef.n); break;
      case 'iceArrow': spawnProj(u, tgt, 'ice', 10, owner); break;
      case 'pierce': {
        const ang = Math.atan2(tgt.y - u.y, tgt.x - u.x);
        const x2 = u.x + Math.cos(ang) * 260, y2 = u.y + Math.sin(ang) * 260;
        G.beams.push({ x1: u.x, y1: u.y, x2, y2, age: 0 });
        for (const h of hostiles) if (segProject(u.x, u.y, x2, y2, h.x, h.y).d <= 14) hurt(h, 14);
        break;
      }
      case 'whirl':
        G.areas.push({ kind: 'whirl', x: u.x, y: u.y, radius: 60, age: 0 });
        for (const h of hostiles) if (dist(u, h) <= 60) hurt(h, 16);
        break;
      case 'frostSmash':
        G.areas.push({ kind: 'frostSmash', x: tgt.x, y: tgt.y, radius: 60, age: 0 });
        hurt(tgt, 16);
        for (const h of hostiles) if (h === tgt || dist(h, tgt) <= 60) slowIt(h);
        break;
      case 'charge':
        G.areas.push({ kind: 'charge', x: tgt.x, y: tgt.y, radius: 30, age: 0 });
        hurt(tgt, 30); knockBack(tgt);
        break;
    }
  }
  return standing;
}

// ───────── 移動 ─────────
function moveToward(u, tx, ty, spd, dt) {
  const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
  if (d < 0.001) return true;
  const st = spd * dt;
  u.moving = true;
  if (d <= st) { u.x = tx; u.y = ty; return true; }
  u.x += dx / d * st; u.y += dy / d * st;
  return false;
}
function enemiesOnLane(l) { return liveEnemies().filter(e => e.lane === l).length; }
function marchReverse(u, spd, dt) {
  const near = nearestNet(u.x, u.y);
  if (near.d > 2) { u.mNode = null; moveToward(u, near.x, near.y, spd, dt); return; }
  if (!u.mNode) {
    if (Math.hypot(u.x - NODES.J[0], u.y - NODES.J[1]) < 2) u.mNode = 'J';
    else u.mNode = near.target;
  }
  for (let guard = 0; guard < 4; guard++) {
    const T = NODES[u.mNode];
    if (Math.hypot(u.x - T[0], u.y - T[1]) < 1.5) {
      if (u.mNode === 'J') u.mNode = enemiesOnLane('S') > enemiesOnLane('N') ? 'SC' : 'NC';
      else if (u.mNode === 'NC') u.mNode = 'SN';
      else if (u.mNode === 'SC') u.mNode = 'SS';
      else return; // 到出怪點, 停住
    } else {
      moveToward(u, T[0], T[1], spd, dt);
      return;
    }
  }
}
function patrol(u, dt, spd) {
  const P = LANES[u.lane];
  const lo = Math.max(0, u.pc - 120), hi = Math.min(P.len, u.pc + 120);
  const p = pathPoint(P, u.ps);
  if (Math.hypot(p.x - u.x, p.y - u.y) > 2) { moveToward(u, p.x, p.y, spd, dt); return; }
  u.ps += u.pdir * spd * dt;
  if (u.ps > hi) { u.ps = hi; u.pdir = -1; } else if (u.ps < lo) { u.ps = lo; u.pdir = 1; }
  const q = pathPoint(P, u.ps);
  u.x = q.x; u.y = q.y; u.moving = true;
}
function allyBehavior(u, dt, standing) {
  u.moving = false; u.charging = false;
  const mobile = u.cat === 'soldier' || u.cat === 'golem';
  const mult = speedMult(u);
  const hasCharge = mobile && u.ev.combos.indexOf(4) >= 0;
  if (standing && !hasCharge) { u.mNode = null; return; }
  if (hasCharge) { marchReverse(u, 90 * mult, dt); u.charging = u.moving; return; }
  if (mobile && u.ev.singles.drum > 0) { marchReverse(u, 50 * mult, dt); return; }
  u.mNode = null;
  const s = u.ev.singles;
  if (s.seek > 0) {
    const tgt = nearest(u, liveEnemies(), t => Math.hypot(t.x - u.home.x, t.y - u.home.y) <= 200);
    if (tgt) {
      const stop = hasRangedEffect(u) ? 180 : u.half + tgt.half + 6;
      if (dist(u, tgt) > stop) moveToward(u, tgt.x, tgt.y, Math.min(70 * s.seek, 140) * mult, dt);
      return;
    }
    if (!(s.march > 0)) { moveToward(u, u.home.x, u.home.y, 80 * mult, dt); return; }
  }
  if (s.march > 0) {
    const stop = CASTLE_POS.half + u.half;
    if (dist(u, CASTLE_POS) > stop) {
      const d = dist(u, CASTLE_POS), st = 60 * mult * dt;
      u.moving = true;
      const k = Math.min(st, d - stop) / d;
      u.x += (CASTLE_POS.x - u.x) * k; u.y += (CASTLE_POS.y - u.y) * k;
    }
    if (dist(u, CASTLE_POS) <= stop + 0.01) { u.home = { x: u.x, y: u.y }; }
    return;
  }
  if (mobile) patrol(u, dt, u.speed * mult);
}
function enemyBehavior(e, dt, standing) {
  e.moving = false;
  if (standing) return;
  const s = e.ev.singles, mult = speedMult(e);
  if (s.seek > 0) {
    const tgt = nearest(e, allyAlive(), (t, d) => d <= 160);
    if (tgt) {
      const stop = hasRangedEffect(e) ? 180 : e.half + tgt.half + 6;
      if (dist(e, tgt) > stop) {
        moveToward(e, tgt.x, tgt.y, Math.min(70 * s.seek, 140) * mult, dt);
        e.s = pathProject(LANES[e.lane], e.x, e.y).s;
      }
      return;
    }
  }
  if (s.march > 0) {
    const P = LANES[e.lane];
    const p = pathPoint(P, e.s);
    if (Math.hypot(p.x - e.x, p.y - e.y) > 1) moveToward(e, p.x, p.y, e.speed * mult, dt);
    else {
      e.s += e.speed * mult * dt;
      const q = pathPoint(P, e.s);
      e.x = q.x; e.y = q.y; e.moving = true;
    }
  }
}

// ───────── 敵人 / 屍體 / 金幣 ─────────
function spawnEnemy(type, lane) {
  const d = ENEMY_DEF[type];
  const e = mkUnit('enemy', 0, 0, d.half, d.items.slice(), 0);
  e.type = type; e.lane = lane; e.s = 10; e.hp = e.maxHp = d.hp; e.speed = d.speed; e.isEnemy = true;
  const p = pathPoint(LANES[lane], e.s);
  e.x = p.x; e.y = p.y; e.dead = false; e.gone = false;
  G.enemies.push(e);
}
function cleanupEnemies() {
  G.enemies = G.enemies.filter(e => {
    if (e.gone) { e.removed = true; return false; }
    if (e.dead) {
      e.removed = true;
      const d = ENEMY_DEF[e.type];
      const c = { cat: 'corpse', kind: e.type, x: e.x, y: e.y, half: d.half, life: 15, slots: e.slots, removed: false };
      G.corpses.push(c);
      for (let i = 0; i < d.coins; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 40;
        G.coins.push({ x: clamp(e.x + Math.cos(a) * r, 8, W - 8), y: clamp(e.y + Math.sin(a) * r, 58, H - 8) });
      }
      return false;
    }
    return true;
  });
}

// ───────── 更新 ─────────
function tickAge(o, k, dur, dt) { if (o[k] < dur) o[k] = Math.min(dur, o[k] + dt); }
function tickUnit(u, gdt) {
  tickAge(u, 'hitAge', u.cat === 'castle' ? 0.3 : 0.2, gdt);
  tickAge(u, 'attackAge', 0.15, gdt);
  if (u.slowT > 0) u.slowT = Math.max(0, u.slowT - gdt);
  if (u.down) {
    u.downAge += gdt;
    if (u.downAge >= 5) { u.down = false; u.downAge = 5; u.hp = u.maxHp; }
  }
}
function castleHit(e) {
  G.castleHp -= ENEMY_DEF[e.type].dmg;
  G.castle.hitAge = 0;
  e.gone = true;
}
function placeInfo(kit) {
  const P = G.player;
  if (kit === 'crossbowKit' || kit === 'pillarKit') {
    const col = Math.floor(P.x / 48), row = Math.floor((P.y - 50) / 48);
    const cx = 24 + 48 * col, cy = 74 + 48 * row;
    let valid = col >= 0 && col <= 26 && row >= 0 && row <= 13;
    if (valid && routeDist(cx, cy) < 52) valid = false;
    if (valid && Math.hypot(cx - CASTLE_POS.x, cy - CASTLE_POS.y) < 90) valid = false;
    if (valid) {
      for (const s of G.towers.concat(G.pillars)) {
        if (Math.floor(s.x / 48) === col && Math.floor((s.y - 50) / 48) === row) { valid = false; break; }
      }
    }
    return { x: cx, y: cy, valid, kind: kit === 'crossbowKit' ? 'crossbow' : 'pillar' };
  }
  return { x: P.x, y: P.y, valid: dist(P, CASTLE_POS) >= 90, kind: kit === 'soldierKit' ? 'soldier' : 'golem' };
}
function findTarget() {
  const P = G.player;
  let best = null, bd = 1e9;
  const test = (o, half) => {
    if (o.removed) return;
    const d = dist(P, o);
    if (d <= half + 48 && d < bd) { bd = d; best = o; }
  };
  G.towers.forEach(o => test(o, 24));
  G.pillars.forEach(o => test(o, 18));
  G.soldiers.forEach(o => test(o, 16));
  G.golems.forEach(o => test(o, 28));
  test(G.castle, 56);
  G.corpses.forEach(o => test(o, o.half));
  G.parts.forEach(o => test(o, 14));
  liveEnemies().forEach(o => test(o, o.half));
  return best;
}

function update(dt) {
  if (G.screen === 'result') { G.resultT += dt; return; }
  if (G.screen !== 'play') return;
  if (G.popup) G.popup.shake = Math.min(0.25, G.popup.shake + dt);
  const gdt = dt * (G.popup ? 0.2 : 1);
  G.time += gdt;
  const P = G.player;

  // 玩家移動
  P.moving = false;
  if (!G.popup) {
    let dx = (keys.R ? 1 : 0) - (keys.L ? 1 : 0), dy = (keys.D ? 1 : 0) - (keys.U ? 1 : 0);
    if (dx || dy) {
      const l = Math.hypot(dx, dy);
      P.x = clamp(P.x + dx / l * 260 * gdt, 16, W - 16);
      P.y = clamp(P.y + dy / l * 260 * gdt, 66, H - 16);
      P.moving = true;
    }
  }

  // 搶奪
  if (G.steal) {
    const s = G.steal, e = s.enemy;
    if (e.removed || e.dead || e.gone || dist(P, e) > e.half + 68 || !e.slots[s.index]) G.steal = null;
    else {
      s.t += gdt;
      if (s.t >= 1.5) { G.hand = e.slots[s.index]; e.slots[s.index] = null; G.steal = null; }
    }
  }

  computeEvals();

  // 波次
  while (G.waveStarted < TOTAL_WAVES && G.time >= 12 + G.waveStarted * 26) {
    G.waveStarted++;
    G.wave = G.waveStarted;
    for (let c = 0; c < 5; c++) {
      if (!G.forge[c]) continue;
      const x = 1052 + 32 * c, y = 530;
      if (G.parts.some(p => Math.hypot(p.x - x, p.y - y) < 16)) continue;
      G.parts.push({ cat: 'part', item: COMBO_KIND[c], x, y, half: 14, spawnAge: 0, removed: false });
    }
  }
  while (G.queue.length && G.queue[0].t <= G.time) { const q = G.queue.shift(); spawnEnemy(q.type, q.lane); }
  const liveE = liveEnemies();
  G.enemies.forEach(evalEnemy);

  // 冰霜減速範圍
  const frostSrcAlly = [], frostSrcEnemy = [];
  liveE.forEach(e => { e.auraSlow = false; });
  allyAlive().forEach(u => { u.auraSlow = false; });
  for (const u of G.towers.concat(allyAlive(), [G.castle, P])) {
    if (u.down || u.ev.singles.frost < 1) continue;
    frostSrcAlly.push(u);
    for (const e of liveE) if (dist(u, e) <= 70) e.auraSlow = true;
  }
  for (const e of liveE) {
    if (e.ev.singles.frost < 1) continue;
    frostSrcEnemy.push(e);
    for (const a of allyAlive()) if (dist(e, a) <= 70) a.auraSlow = true;
  }
  G.frostAlly = frostSrcAlly; G.frostEnemy = frostSrcEnemy;

  // 我方
  G.towers.forEach(u => { tickUnit(u, gdt); const st = runAttacks(u, 'ally', gdt); allyBehavior(u, gdt, st); });
  G.soldiers.concat(G.golems.filter(g => g.team === 'ally')).forEach(u => {
    tickUnit(u, gdt);
    if (u.down) { u.moving = false; u.charging = false; return; }
    const st = runAttacks(u, 'ally', gdt);
    allyBehavior(u, gdt, st);
  });
  tickUnit(G.castle, gdt); runAttacks(G.castle, 'ally', gdt);
  tickUnit(P, gdt); runAttacks(P, 'ally', gdt);
  G.pillars.forEach(p => tickAge(p, 'changeAge', 0.5, gdt));

  // 中立石魔像
  for (const g of G.golems) {
    if (g.team !== 'neutral') continue;
    tickUnit(g, gdt);
    g.moving = false;
    if (g.slots.indexOf('march') >= 0) {
      if (moveToward(g, CASTLE_POS.x, CASTLE_POS.y, 60, gdt) || dist(g, CASTLE_POS) <= 66) { g.recruited = true; }
      if (dist(g, CASTLE_POS) <= 66) g.recruited = true;
    } else {
      g.wanderT -= gdt;
      if (g.wanderT <= 0) {
        g.wanderT = 2;
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 100;
        g.wx = g.home.x + Math.cos(a) * r; g.wy = g.home.y + Math.sin(a) * r;
      }
      moveToward(g, g.wx, g.wy, 40, gdt);
    }
  }
  const rec = G.golems.filter(g => g.recruited);
  if (rec.length) {
    for (const g of rec) {
      g.removed = true;
      let k = 0;
      for (const it of g.slots) {
        if (!it) continue;
        G.parts.push({ cat: 'part', item: it, x: 1052 + 32 * k, y: 580, half: 14, spawnAge: 0.6, removed: false });
        k++;
      }
    }
    G.golems = G.golems.filter(g => !g.recruited);
    G.golemUnlocked = true;
  }

  // 敵人
  for (const e of liveE) {
    tickUnit(e, gdt);
    const st = runAttacks(e, 'enemy', gdt);
    enemyBehavior(e, gdt, st);
    if (dist(e, CASTLE_POS) <= 66) castleHit(e);
  }

  // 投射物
  G.projs = G.projs.filter(p => {
    const t = p.target;
    if (t && !t.dead && !t.gone && !t.down && !t.removed) p.angle = Math.atan2(t.y - p.y, t.x - p.x);
    const st = 420 * gdt;
    p.x += Math.cos(p.angle) * st; p.y += Math.sin(p.angle) * st; p.travel += st;
    const list = p.owner === 'ally' ? liveEnemies() : allyAlive();
    for (const h of list) {
      if (h.dead || h.gone) continue;
      if (dist(p, h) <= h.half + 6) {
        hurt(h, p.dmg);
        if (p.kind === 'ice') slowIt(h);
        return false;
      }
    }
    return p.travel < 320;
  });

  // 結算單次特效 / 金幣 / 屍體
  for (const arr of [G.beams, G.areas, G.sparks, G.names]) arr.forEach(o => { o.age += gdt; });
  G.beams = G.beams.filter(o => o.age < 0.15);
  G.areas = G.areas.filter(o => o.age < 0.3);
  G.sparks = G.sparks.filter(o => o.age < 0.25);
  G.names = G.names.filter(o => o.age < 1.5);
  G.parts.forEach(p => { if (p.spawnAge < 0.6) p.spawnAge = Math.min(0.6, p.spawnAge + gdt); });
  G.coins = G.coins.filter(c => {
    const d = Math.hypot(P.x - c.x, P.y - c.y);
    if (d <= 20) { G.gold += 2; return false; }
    if (d <= 90) {
      const st = Math.min(420 * gdt, d);
      c.x += (P.x - c.x) / d * st; c.y += (P.y - c.y) / d * st;
      if (Math.hypot(P.x - c.x, P.y - c.y) <= 20) { G.gold += 2; return false; }
    }
    return true;
  });
  G.corpses.forEach(c => { c.life -= gdt; });
  G.corpses = G.corpses.filter(c => { if (c.life <= 0) { c.removed = true; return false; } return true; });

  cleanupEnemies();
  G.parts = G.parts.filter(p => !p.removed);

  // 組合名稱
  for (const u of G.towers.concat(G.soldiers, G.golems.filter(g => g.team === 'ally'), [G.castle, P])) {
    for (let ci = 0; ci < 5; ci++) {
      const n = u.ev.combos.filter(c => c === ci).length;
      if (n > u.prevCombos[ci] && G.time - u.comboLast[ci] >= 4) {
        u.comboLast[ci] = G.time;
        const isNew = !G.forge[ci];
        G.forge[ci] = true;
        G.names.push({ unit: u, name: COMBO_NAME[ci], isNew, age: 0 });
      }
      u.prevCombos[ci] = n;
    }
  }

  // 彈窗自動關閉
  if (G.popup && G.popup.target && G.popup.target !== P) {
    const t = G.popup.target;
    if (t.removed || t.dead || t.gone || dist(P, t) > t.half + 68) G.popup = null;
  }
  // 互動目標
  G.target = G.popup ? (G.popup.target !== P ? G.popup.target : null) : findTarget();

  // 結束判定(批次尾端只判一次)
  if (G.castleHp <= 0) endGame(false);
  else if (G.waveStarted >= TOTAL_WAVES && G.queue.length === 0 && liveEnemies().length === 0) endGame(true);
}
function endGame(win) {
  G.screen = 'result'; G.win = win; G.resultT = 0;
  G.popup = null; G.steal = null;
}

// ───────── 輸入 ─────────
function halfOf(t) { return t.half; }
function isSoul(it) { return !!it && (BASIC[it] || COMBO_IDX[it] !== undefined); }
function openSoulPopup(t) {
  const slots = t.slots;
  let idx = -1;
  if (!G.hand) idx = slots.findIndex(s => s);
  else if (isSoul(G.hand)) idx = slots.findIndex(s => !s);
  G.popup = { type: 'soul', target: t, index: idx < 0 ? 0 : idx, shake: 0.25, msg: '' };
}
function openSelfPopup() {
  const slots = G.player.slots;
  let idx = -1;
  if (!G.hand) idx = slots.findIndex(s => s);
  else if (isSoul(G.hand)) idx = slots.findIndex(s => !s);
  G.popup = { type: 'self', target: G.player, index: idx < 0 ? 0 : idx, shake: 0.25, msg: '' };
}
function soulAction(p) {
  const t = p.target, cat = t.cat, hand = G.hand, i = p.index, slots = t.slots;
  if (p.type === 'self' && i === slots.length) {
    if (isSoul(hand) || hand === 'slotStone') return { label: '丟下', run() { G.parts.push({ cat: 'part', item: hand, x: G.player.x, y: G.player.y, half: 14, spawnAge: 0.6, removed: false }); G.hand = null; } };
    return null;
  }
  const cell = slots[i];
  const canEquip = cat !== 'corpse' && cat !== 'enemy';
  const changed = () => { if (cat === 'pillar') t.changeAge = 0; };
  if (!hand) {
    if (!cell) return null;
    if (cat === 'enemy') return { label: '搶奪', run() { G.steal = { enemy: t, index: i, t: 0 }; } };
    return { label: '拿起', run() { G.hand = cell; slots[i] = null; changed(); } };
  }
  if (isSoul(hand)) {
    if (!canEquip) return null;
    if (cat === 'pillar' && !BASIC[hand]) return null;
    if (!cell) return { label: '裝上', run() { slots[i] = hand; G.hand = null; changed(); } };
    return { label: '互換', run() { slots[i] = hand; G.hand = cell; changed(); } };
  }
  if (hand === 'slotStone') {
    if (p.type === 'self' || !canEquip) return null;
    if (t.max && slots.length < t.max) return { label: '擴槽', run() { slots.push(null); G.hand = null; } };
    return null;
  }
  return null;
}
function popupZ() {
  const p = G.popup;
  if (p.type === 'shop') {
    const it = SHOP[p.index];
    if (p.index === 7 && !G.golemUnlocked) { p.msg = '尚未解鎖'; p.shake = 0; }
    else if (G.gold < it[2]) { p.msg = '金幣不足'; p.shake = 0; }
    else if (G.hand) { p.msg = '手上要空著'; p.shake = 0; }
    else { G.gold -= it[2]; G.hand = it[0]; G.popup = null; }
    return;
  }
  const act = soulAction(p);
  if (act) { act.run(); G.popup = null; }
  else p.shake = 0;
}
function tryPlace() {
  const info = placeInfo(G.hand);
  if (!info.valid) return;
  const k = G.hand;
  if (k === 'crossbowKit') G.towers.push(mkTower(info.x, info.y));
  else if (k === 'pillarKit') G.pillars.push(mkPillar(info.x, info.y));
  else if (k === 'soldierKit') G.soldiers.push(mkSoldier(info.x, info.y));
  else G.golems.push(mkGolem(info.x, info.y, 'ally'));
  G.hand = null;
}
function zPress() {
  if (G.steal) { G.steal = null; return; }
  if (G.popup) { popupZ(); return; }
  if (KITS[G.hand]) { tryPlace(); return; }
  const t = findTarget();
  if (!t) return;
  if (t.cat === 'part') {
    if (!G.hand) { G.hand = t.item; t.removed = true; G.parts = G.parts.filter(p => !p.removed); }
    else { const h = G.hand; G.hand = t.item; t.item = h; }
    return;
  }
  openSoulPopup(t);
}
function guideClose() {
  G.screen = G.guideFromPlay ? 'play' : 'play';
  if (!G.started) { G.started = true; newGame(); }
  G.guideFromPlay = false;
}
function onKey(k) {
  if (G.screen === 'guide') {
    if (k === 'L') { if (G.guidePage > 0) G.guidePage--; }
    else if (k === 'R') { if (G.guidePage < GUIDE.length - 1) G.guidePage++; }
    else if (k === 'Z') {
      if (G.guidePage < GUIDE.length - 1) G.guidePage++;
      else { guideClose(); zNeedRelease = true; }
    } else if (k === 'X' && G.started) { guideClose(); }
    return;
  }
  if (G.screen === 'result') {
    if (k === 'Z' && G.resultT >= 0.5) { newGame(); zNeedRelease = true; }
    return;
  }
  if (k === 'Z') { if (zNeedRelease) return; zPress(); }
  else if (k === 'X') {
    if (G.steal) return;
    if (G.popup) G.popup = null; else openSelfPopup();
  } else if (k === 'S') {
    if (G.steal || G.popup) return;
    if (dist(G.player, CASTLE_POS) <= 110) G.popup = { type: 'shop', target: null, index: 0, shake: 0.25, msg: '' };
    else { G.screen = 'guide'; G.guideFromPlay = true; G.guidePage = 0; }
  } else if (k === 'L' || k === 'R') {
    const p = G.popup;
    if (!p) return;
    const n = p.type === 'shop' ? 8 : p.target.slots.length + (p.type === 'self' ? 1 : 0);
    p.index = (p.index + (k === 'R' ? 1 : n - 1)) % n;
    if (p.type === 'shop') p.msg = '';
  }
}
let zNeedRelease = false;
const KEYMAP = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', KeyZ: 'Z', KeyX: 'X', Space: 'S' };
window.addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  if (k === 'Z') zHeld = true;
  if (k === 'L' || k === 'R' || k === 'U' || k === 'D') keys[k] = true;
  onKey(k);
});
window.addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (k === 'Z') { zHeld = false; zNeedRelease = false; }
  if (k === 'L' || k === 'R' || k === 'U' || k === 'D') keys[k] = false;
});
window.addEventListener('blur', () => { keys.L = keys.R = keys.U = keys.D = false; zHeld = false; zNeedRelease = false; });

// ───────── 繪製 ─────────
function basicKinds(slots) { return slots.filter(k => k && BASIC[k]); }
function slotCenterX(L, i, x) { return x - L * 10 + 10 + 20 * i; }
function render() {
  ctx.clearRect(0, 0, W, H);
  if (G.screen === 'guide') { drawGuide(); return; }
  drawScene();
}
function drawGuide() {
  ctx.fillStyle = '#14161f';
  ctx.fillRect(0, 0, W, H);
  const pg = GUIDE[G.guidePage];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd96a'; ctx.font = 'bold 40px "Microsoft JhengHei", sans-serif';
  ctx.fillText('魂匠共鳴 — ' + pg[0], 640, 52);
  Art.drawGuidePage(ctx, { page: G.guidePage + 1, x: 240, y: 100, w: 800, h: 440 });
  ctx.fillStyle = '#ffffff'; ctx.font = '30px "Microsoft JhengHei", sans-serif';
  ctx.fillText(pg[1], 640, 590);
  ctx.fillStyle = '#9aa3b8'; ctx.font = '22px "Microsoft JhengHei", sans-serif';
  ctx.fillText('第 ' + (G.guidePage + 1) + ' / ' + GUIDE.length + ' 頁', 640, 642);
  const last = G.guidePage === GUIDE.length - 1;
  const hint = '← 上一頁    ' + (last ? 'Z ' + (G.started ? '繼續遊戲' : '開始遊戲') : 'Z / → 下一頁') + (G.started ? '    X 返回遊戲' : '');
  ctx.fillText(hint, 640, 682);
}
function entityDrawList() {
  const L = [];
  const T = G.target;
  L.push({ y: G.castle.y, f: () => Art.drawCastle(ctx, { x: 1180, y: 434, hitAge: G.castle.hitAge, hitDuration: 0.3, attackAge: G.castle.attackAge, attackDuration: 0.15, zoneActive: dist(G.player, CASTLE_POS) <= 110, targeted: T === G.castle }) });
  G.towers.forEach(u => L.push({ y: u.y, f: () => Art.drawCrossbow(ctx, { x: u.x, y: u.y, attackAge: u.attackAge, attackDuration: 0.15, moving: u.moving, resonating: u.ev.resonating, targeted: T === u }) }));
  G.pillars.forEach(u => L.push({ y: u.y, f: () => Art.drawPillar(ctx, { x: u.x, y: u.y, kinds: basicKinds(u.slots), targeted: T === u }) }));
  const mob = (u) => ({
    x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp, hitAge: u.hitAge, hitDuration: 0.2, attackAge: u.attackAge, attackDuration: 0.15,
    moving: u.moving, charging: u.charging, resonating: u.ev.resonating, downAge: u.down ? u.downAge : 5, downDuration: 5, targeted: T === u
  });
  G.soldiers.forEach(u => L.push({ y: u.y, f: () => Art.drawSoldier(ctx, mob(u)) }));
  G.golems.forEach(u => L.push({
    y: u.y, f: () => {
      const s = mob(u); s.team = u.team;
      if (u.team === 'neutral') { s.hp = s.maxHp; s.charging = false; s.resonating = false; s.downAge = 5; }
      Art.drawGolem(ctx, s);
    }
  }));
  G.enemies.forEach(e => L.push({
    y: e.y, f: () => Art.drawEnemy(ctx, {
      type: e.type, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, hitAge: e.hitAge, hitDuration: 0.2, attackAge: e.attackAge, attackDuration: 0.15,
      moving: e.ev.singles.march > 0 || e.moving, slowed: e.slowT > 0 || e.auraSlow, targeted: T === e
    })
  }));
  const P = G.player;
  L.push({ y: P.y, f: () => Art.drawPlayer(ctx, { x: P.x, y: P.y, moving: P.moving, attackAge: P.attackAge, attackDuration: 0.15, resonating: P.ev.resonating, handItem: G.hand, stealing: !!G.steal, stealProgress: G.steal ? Math.min(1, G.steal.t / 1.5) : 0 }) });
  L.sort((a, b) => a.y - b.y);
  return L;
}
function virtOf(u) { return u.ev.virt.map(v => ({ kind: v.kind, used: v.used })); }
function drawScene() {
  const P = G.player, T = G.target;
  Art.drawBackground(ctx);
  G.pillars.forEach(p => Art.drawPillarRange(ctx, { x: p.x, y: p.y, radius: 150, kinds: basicKinds(p.slots), changeAge: p.changeAge, changeDuration: 0.5 }));
  // 共鳴線
  for (const r of receivers()) {
    const byP = new Map();
    r.ev.virt.forEach(v => { if (!byP.has(v.pillar)) byP.set(v.pillar, []); byP.get(v.pillar).push(v); });
    byP.forEach((arr, p) => {
      const dx = r.x - p.x, dy = r.y - p.y, d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d;
      arr.forEach((v, j) => {
        const off = (j - (arr.length - 1) / 2) * 4;
        Art.drawResonanceLine(ctx, { x1: p.x + nx * off, y1: p.y + ny * off, x2: r.x + nx * off, y2: r.y + ny * off, kind: v.kind, active: v.used });
      });
    });
  }
  (G.frostAlly || []).forEach(u => Art.drawFrostAura(ctx, { x: u.x, y: u.y, radius: 70, owner: 'ally' }));
  (G.frostEnemy || []).forEach(u => Art.drawFrostAura(ctx, { x: u.x, y: u.y, radius: 70, owner: 'enemy' }));
  G.coins.forEach(c => Art.drawCoin(ctx, { x: c.x, y: c.y }));
  G.corpses.forEach(c => Art.drawCorpse(ctx, { kind: c.kind, x: c.x, y: c.y, life: c.life, maxLife: 15, targeted: T === c }));
  G.parts.forEach(p => Art.drawGroundPart(ctx, { item: p.item, x: p.x, y: p.y, spawnAge: p.spawnAge, spawnDuration: 0.6, targeted: T === p }));
  if (KITS[G.hand]) { const i = placeInfo(G.hand); Art.drawPlacePreview(ctx, { kind: i.kind, x: i.x, y: i.y, valid: i.valid }); }
  entityDrawList().forEach(o => o.f());
  // 魂件槽列
  const sl = (u, x, y) => Art.drawSoulSlots(ctx, { x, y, slots: u.slots.slice(), virtual: virtOf(u) });
  G.towers.forEach(u => sl(u, u.x, u.y - 44));
  G.pillars.forEach(u => Art.drawSoulSlots(ctx, { x: u.x, y: u.y - 38, slots: u.slots.slice(), virtual: [] }));
  G.soldiers.forEach(u => sl(u, u.x, u.y - 36));
  G.golems.forEach(u => { if (u.team === 'ally') sl(u, u.x, u.y - 48); else Art.drawSoulSlots(ctx, { x: u.x, y: u.y - 48, slots: u.slots.slice(), virtual: [] }); });
  sl(G.castle, 1180, 358);
  sl(P, P.x, P.y - 36);
  G.corpses.forEach(c => Art.drawSoulSlots(ctx, { x: c.x, y: c.y - c.half - 12, slots: c.slots.slice(), virtual: [] }));
  G.enemies.forEach(e => { if (T === e) Art.drawSoulSlots(ctx, { x: e.x, y: e.y - e.half - 20, slots: e.slots.slice(), virtual: [] }); });
  // 投射物與特效
  G.projs.forEach(p => Art.drawProjectile(ctx, { x: p.x, y: p.y, angle: p.angle, kind: p.kind, owner: p.owner }));
  G.beams.forEach(b => Art.drawPierceBeam(ctx, { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, age: b.age, duration: 0.15 }));
  G.areas.forEach(a => Art.drawAreaHit(ctx, { kind: a.kind, x: a.x, y: a.y, radius: a.radius, age: a.age, duration: 0.3 }));
  G.sparks.forEach(s => Art.drawHitSpark(ctx, { x: s.x, y: s.y, age: s.age, duration: 0.25 }));
  if (G.steal) {
    const e = G.steal.enemy, L = e.slots.length;
    Art.drawStealLink(ctx, { x1: P.x, y1: P.y, x2: slotCenterX(L, G.steal.index, e.x), y2: e.y - e.half - 20, progress: Math.min(1, G.steal.t / 1.5) });
  }
  G.names.forEach(n => Art.drawComboName(ctx, { x: n.unit.x, y: n.unit.y - n.unit.half - 44, name: n.name, isNew: n.isNew, age: n.age, duration: 1.5 }));
  // 預警
  const nextStart = 12 + G.waveStarted * 26;
  if (G.waveStarted < TOTAL_WAVES) {
    const rem = nextStart - G.time;
    if (rem > 0 && rem <= 6) {
      const lanes = {};
      WAVES[G.waveStarted].forEach(g => { lanes[g.lane] = true; });
      if (lanes.N) Art.drawSpawnWarning(ctx, { x: 40, y: 194, remaining: rem, total: 6 });
      if (lanes.S) Art.drawSpawnWarning(ctx, { x: 40, y: 626, remaining: rem, total: 6 });
    }
  }
  Art.drawHud(ctx, {
    gold: G.gold, castleHp: Math.max(0, G.castleHp), castleMaxHp: 20, wave: G.wave, totalWaves: TOTAL_WAVES,
    nextWaveIn: G.waveStarted < TOTAL_WAVES ? Math.ceil(nextStart - G.time) : -1, forge: G.forge.slice()
  });
  if (G.popup) {
    Art.drawSlowMo(ctx);
    drawPopup();
  }
  if (G.screen === 'result') {
    Art.drawResult(ctx, { win: G.win, wave: G.wave, totalWaves: TOTAL_WAVES, comboCount: G.forge.filter(Boolean).length });
  }
}
function drawPopup() {
  const p = G.popup;
  if (p.type === 'shop') {
    const items = SHOP.map((s, i) => ({
      item: s[0], name: s[1], price: s[2],
      state: (i === 7 && !G.golemUnlocked) ? 'locked' : (G.gold < s[2] ? 'poor' : 'ok')
    }));
    Art.drawShopPopup(ctx, { items, cursorIndex: p.index, message: p.msg, shakeAge: p.shake, shakeDuration: 0.25 });
    return;
  }
  const t = p.target, self = p.type === 'self';
  const n = t.slots.length + (self ? 1 : 0);
  const w = n * 48 + 120, h = 116;
  let x = t.x, y = t.y - t.half - 92;
  if (y - h / 2 < 50) y = t.y + t.half + h / 2 + 12;
  x = clamp(x, w / 2 + 4, W - w / 2 - 4); y = clamp(y, h / 2 + 4, H - h / 2 - 4);
  const act = soulAction(p);
  let title = '自己';
  if (!self) {
    if (t.cat === 'tower') title = '弩塔';
    else if (t.cat === 'pillar') title = '魂柱';
    else if (t.cat === 'soldier') title = '步兵';
    else if (t.cat === 'golem') title = t.team === 'neutral' ? '石魔像(中立)' : '石魔像';
    else if (t.cat === 'castle') title = '主堡';
    else if (t.cat === 'enemy') title = ENEMY_DEF[t.type].name + '(活)';
    else title = ENEMY_DEF[t.kind].name + '的屍體';
  }
  Art.drawSoulPopup(ctx, {
    x, y, w, h, title, slots: t.slots.slice(), dropCell: self, index: p.index, hand: G.hand,
    actionLabel: act ? act.label : '', shakeAge: p.shake, shakeDuration: 0.25
  });
}

// ───────── 主迴圈 ─────────
let lastTs = null;
function frame(ts) {
  requestAnimationFrame(frame);
  let dt = lastTs === null ? 0 : (ts - lastTs) / 1000;
  lastTs = ts;
  dt = clamp(dt, 0, 1 / 30);
  try { update(dt); render(); } catch (err) { console.error(err); }
}
requestAnimationFrame(frame);
