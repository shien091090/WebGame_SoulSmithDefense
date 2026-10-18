'use strict';
// 魂匠煉成 — 玩法驗證 Demo。只用滑鼠左鍵。邏輯(update)與繪製(render)分離。

const CW = Art.canvas.width, CH = Art.canvas.height;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let dpr = Math.max(1, window.devicePixelRatio || 1);

// ---------- 佔位圖形(style 沒有的才放這) ----------
const Placeholder = {
  // 說明按鈕: HUD 下方右上角的小圓「?」, 遊戲中可再叫出說明頁
  drawHelpButton(c, hx, hy, r) {
    c.save();
    c.beginPath(); c.arc(hx, hy, r, 0, Math.PI * 2);
    c.fillStyle = 'rgba(20,20,40,0.8)'; c.fill();
    c.lineWidth = 2; c.strokeStyle = '#e8d9a0'; c.stroke();
    c.fillStyle = '#e8d9a0'; c.font = 'bold 18px sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('?', hx, hy + 1);
    c.restore();
  }
};
const HELP = { x: 700, y: 118, r: 14 };

// ---------- 常數 ----------
const PATH = [[640,130],[80,130],[80,430],[640,430],[640,730],[80,730],[80,1000],[360,1000],[360,1090]];
const CASTLE = { x: 360, y: 1090, r: 56 };
const ZONE_R = 130, PANEL_DIST = 150, SLOWMO = 0.3;
const TOTAL_WAVES = 6;
const COMBOS = [
  { name: '穿透箭', a: 'ranged', b: 'ranged' },
  { name: '冰箭', a: 'ranged', b: 'frost' },
  { name: '爆裂彈', a: 'ranged', b: 'blast' },
  { name: '旋風斬', a: 'melee', b: 'melee' },
  { name: '冰霜重擊', a: 'melee', b: 'frost' },
  { name: '突襲', a: 'melee', b: 'seek' },
  { name: '冰爆', a: 'frost', b: 'blast' },
  { name: '自爆衝鋒', a: 'seek', b: 'blast' }
];
const DEF = {
  tower:   { size: 48, hp: 150, slots: 3, name: '箭塔' },
  soldier: { size: 32, hp: 70,  slots: 2, name: '步兵' },
  treant:  { size: 52, hp: 200, slots: 3, name: '樹精' },
  castle:  { size: 112, slots: 3, name: '主堡' },
  player:  { size: 32, slots: 2, name: '自己' },
  imp:     { size: 32, hp: 30, speed: 45,  parts: ['melee','march'], coins: 2, dmg: 2, name: '小鬼' },
  runner:  { size: 32, hp: 40, speed: 100, parts: ['melee','march','frost'], coins: 3, dmg: 2, name: '疾行鬼' },
  armored: { size: 44, hp: 90, speed: 35,  parts: ['melee','march','blast'], coins: 4, dmg: 4, name: '鐵甲鬼' },
  bat:     { size: 24, hp: 14, speed: 75,  parts: ['melee','march'], coins: 1, dmg: 1, name: '小蝠' }
};
const WAVES = [
  [['imp', 6]],
  [['imp', 4], ['runner', 3]],
  [['armored', 4]],
  [['bat', 16]],
  [['armored', 3], ['runner', 4]],
  [['bat', 8], ['armored', 3], ['runner', 3], ['imp', 4]]
];
const WAVE_START = k => 12 + (k - 1) * 26; // k 從 1 起算
const SHOP = [
  { name: '箭塔', price: 15, kind: null },
  { name: '步兵', price: 10, kind: null },
  { name: '樹精', price: 15, kind: null },
  { name: '遠攻', price: 8, kind: 'ranged' },
  { name: '近戰', price: 8, kind: 'melee' },
  { name: '冰霜', price: 14, kind: 'frost' },
  { name: '爆裂', price: 14, kind: 'blast' }
];
const SHOP_POS = [[390,1192],[476,1192],[562,1192],[648,1192],[390,1248],[476,1248],[562,1248]];

// ---------- 遊戲狀態 ----------
let units, corpses, coins, groundParts, projs, areas, sparks, markers;
let bag, player, castle, gold, castleHp, gameT, spawnIdx, schedule;
let discovered, bannerQueue, banner, treantUnlocked;
let panel, pending, mode, mouse;
let phase, resultWin, resultT, showGuide, guideStarted, guidePage;
let nextId = 1;

function mkUnit(kind, team, x, y, parts) {
  const d = DEF[kind];
  const n = d.parts ? d.parts.length : d.slots;
  const slots = [];
  for (let i = 0; i < n; i++) slots.push((parts && parts[i]) || null);
  return {
    id: nextId++, kind, team, x, y, size: d.size, r: d.size / 2,
    hp: d.hp || 1, maxHp: d.hp || 1, slots,
    dead: false, flushed: false, noCorpse: false,
    hitAge: 0.2, attackAge: 0.15, moving: false,
    slowAmt: 0, slowT: 0, auraSlow: 0, slow: 0,
    cd: {}, rally: null, wp: 1, speed: d.speed || 0,
    fx: null, pairs: []
  };
}

function reset() {
  units = []; corpses = []; coins = []; groundParts = []; projs = []; areas = []; sparks = []; markers = [];
  bag = [null, null, null, null];
  gold = 30; castleHp = 20; gameT = 0; spawnIdx = 0;
  discovered = [false, false, false, false, false, false, false, false];
  bannerQueue = []; banner = null; treantUnlocked = false;
  panel = null; pending = null; mode = null;
  resultWin = false; resultT = 0;
  castle = mkUnit('castle', 'ally', CASTLE.x, CASTLE.y, ['ranged']);
  castle.hitAge = 0.3; castle.r = 56;
  units.push(castle);
  units.push(mkUnit('tower', 'ally', 200, 280, ['ranged']));
  units.push(mkUnit('tower', 'ally', 500, 580, ['ranged']));
  units.push(mkUnit('treant', 'neutral', 380, 280, []));
  units.push(mkUnit('treant', 'neutral', 380, 880, []));
  player = mkUnit('player', 'player', 360, 960, ['ranged']);
  player.moveTo = null;
  units.push(player);
  schedule = [];
  for (let k = 1; k <= TOTAL_WAVES; k++) {
    let t = WAVE_START(k);
    for (const [type, cnt] of WAVES[k - 1]) {
      for (let i = 0; i < cnt; i++) {
        schedule.push({ t, type });
        t += (type === 'bat') ? 0.4 : 1.0;
      }
    }
  }
  phase = 'play';
}

// ---------- 工具 ----------
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function distU(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function pairsOf(slots) {
  const used = {};
  const out = [];
  for (let c = 0; c < COMBOS.length; c++) {
    const A = COMBOS[c].a, B = COMBOS[c].b;
    let found = false;
    for (let i = 0; i < slots.length && !found; i++) {
      if (used[i] || slots[i] !== A) continue;
      for (let j = 0; j < slots.length; j++) {
        if (j === i || used[j] || slots[j] !== B) continue;
        used[i] = true; used[j] = true;
        out.push({ a: Math.min(i, j), b: Math.max(i, j), combo: c });
        found = true;
        break;
      }
    }
  }
  return out;
}

function analyze(slots) {
  const pairs = pairsOf(slots);
  const used = {};
  const c = [false, false, false, false, false, false, false, false];
  for (const p of pairs) { used[p.a] = true; used[p.b] = true; c[p.combo] = true; }
  const s = { ranged: 0, melee: 0, seek: 0, march: 0, frost: 0, blast: 0 };
  for (let i = 0; i < slots.length; i++) if (slots[i] && !used[i]) s[slots[i]]++;
  return { pairs, c, s };
}

function hostileList(o) {
  if (o.team === 'enemy') return units.filter(v => !v.dead && v.team === 'ally' && (v.kind === 'tower' || v.kind === 'soldier' || v.kind === 'treant'));
  if (o.team === 'ally' || o.team === 'player') return units.filter(v => !v.dead && v.team === 'enemy');
  return [];
}
function nearest(o, list, range) {
  let best = null, bd = Infinity;
  for (const v of list) {
    const d = distU(o, v);
    if (d <= range && d < bd) { bd = d; best = v; }
  }
  return best;
}

function distToPath(x, y) {
  let best = Infinity;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, ay] = PATH[i], [bx, by] = PATH[i + 1];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = ((x - ax) * dx + (y - ay) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, dist(x, y, ax + dx * t, ay + dy * t));
  }
  return best;
}
function towerValid(x, y) {
  if (x < 24 || x > 696 || y < 124 || y > 1150) return false;
  if (distToPath(x, y) <= 40) return false;
  if (dist(x, y, CASTLE.x, CASTLE.y) <= 56) return false;
  for (const u of units) if (!u.dead && u.kind === 'tower' && dist(x, y, u.x, u.y) <= 56) return false;
  return true;
}
function inZone() { return dist(player.x, player.y, CASTLE.x, CASTLE.y) <= ZONE_R; }
function nameOf(t) {
  if (t.isCorpse) return DEF[t.kind].name + '的屍體';
  if (t.kind === 'treant' && t.team === 'neutral') return '中立樹精';
  return DEF[t.kind].name;
}
function exists(t) {
  if (!t) return false;
  if (t.isCorpse) return corpses.indexOf(t) >= 0 && t.life > 0;
  return units.indexOf(t) >= 0 && !t.dead;
}
function slotsOfTarget(t) { return t.slots; }

// ---------- 傷害 / 死亡 ----------
function pushSpark(x, y) { sparks.push({ x, y, age: 0 }); }
function addArea(kind, x, y, radius, duration) { areas.push({ kind, x, y, radius, age: 0, duration }); }

function dmgUnit(v, amount, single) {
  if (v.dead || v.team === 'neutral' || v.kind === 'player' || v.kind === 'castle') return;
  if (v.kind === 'armored' && single) amount = 1;
  v.hp -= amount;
  v.hitAge = 0;
  pushSpark(v.x, v.y);
  if (v.hp <= 0) v.dead = true;
}
function applySlow(v, amt, dur) {
  if (v.dead || v.team === 'neutral' || v.kind === 'player' || v.kind === 'castle') return;
  const cur = v.slowT > 0 ? v.slowAmt : 0;
  v.slowAmt = Math.max(cur, amt);
  v.slowT = Math.max(v.slowT, dur);
}

function flushDeaths() {
  for (let guard = 0; guard < 50; guard++) {
    const d = units.filter(u => u.dead && !u.flushed);
    if (!d.length) break;
    for (const u of d) {
      u.flushed = true;
      if (u.noCorpse) continue;
      const k = u.kind;
      corpses.push({ isCorpse: true, kind: k, x: u.x, y: u.y, size: u.size, r: u.r, slots: u.slots.slice(), life: 12 });
      if (u.team === 'enemy') {
        const n = DEF[k].coins;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 40;
          coins.push({ x: Math.max(8, Math.min(712, u.x + Math.cos(a) * rr)), y: Math.max(110, Math.min(1150, u.y + Math.sin(a) * rr)) });
        }
      }
      const fx = analyze(u.slots);
      for (let b = 0; b < fx.s.blast; b++) {
        addArea('deathBlast', u.x, u.y, 80, 0.3);
        for (const v of hostileList(u)) if (distU(u, v) <= 80) dmgUnit(v, 40, false);
      }
    }
  }
  units = units.filter(u => !u.flushed);
}

// ---------- 投射物 ----------
function fireProj(o, kind, tgt, dmg, extra) {
  const ang = Math.atan2(tgt.y - o.y, tgt.x - o.x);
  projs.push(Object.assign({
    kind, x: o.x, y: o.y, angle: ang, team: (o.team === 'enemy') ? 'enemy' : 'ally',
    travel: 0, maxTravel: kind === 'pierce' ? 260 : 450, target: kind === 'pierce' ? null : tgt,
    dmg, hit: [], owner: o
  }, extra || {}));
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return { d: dist(px, py, ax + dx * t, ay + dy * t), t };
}
function updateProjs(dt) {
  const keep = [];
  for (const p of projs) {
    if (p.target && !p.target.dead && units.indexOf(p.target) >= 0) {
      p.angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
    }
    const step = 420 * dt;
    const x0 = p.x, y0 = p.y;
    const x1 = x0 + Math.cos(p.angle) * step, y1 = y0 + Math.sin(p.angle) * step;
    const hs = hostileList({ team: p.team === 'enemy' ? 'enemy' : 'ally' });
    let removed = false;
    if (p.kind === 'pierce') {
      for (const v of hs) {
        if (v.dead || p.hit.indexOf(v) >= 0) continue;
        if (segDist(v.x, v.y, x0, y0, x1, y1).d <= v.r + 4) { p.hit.push(v); dmgUnit(v, 12, false); }
      }
    } else {
      let bestV = null, bestT = Infinity;
      for (const v of hs) {
        if (v.dead) continue;
        const r = segDist(v.x, v.y, x0, y0, x1, y1);
        if (r.d <= v.r + 5 && r.t < bestT) { bestT = r.t; bestV = v; }
      }
      if (bestV) {
        if (p.kind === 'normal') dmgUnit(bestV, p.dmg, true);
        else if (p.kind === 'frost') { dmgUnit(bestV, p.dmg, false); applySlow(bestV, 0.5, 2); }
        else if (p.kind === 'blast') {
          addArea('blast', bestV.x, bestV.y, 70, 0.3);
          for (const v of hs) if (!v.dead && dist(v.x, v.y, bestV.x, bestV.y) <= 70) dmgUnit(v, 10, false);
        }
        removed = true;
      }
    }
    p.x = x1; p.y = y1; p.travel += step;
    if (!removed && p.travel < p.maxTravel) keep.push(p);
  }
  projs = keep;
}

// ---------- 單位行為 ----------
function attackEffs(u) {
  const fx = u.fx, e = [];
  if (fx.s.ranged) e.push({ key: 'sranged', type: 'shoot', proj: 'normal', cd: 1.0, range: 200 });
  if (fx.c[0]) e.push({ key: 'c0', type: 'shoot', proj: 'pierce', cd: 1.0, range: 260 });
  if (fx.c[1]) e.push({ key: 'c1', type: 'shoot', proj: 'frost', cd: 1.0, range: 200 });
  if (fx.c[2]) e.push({ key: 'c2', type: 'shoot', proj: 'blast', cd: 1.0, range: 200 });
  if (fx.s.melee) e.push({ key: 'smelee', type: 'melee', cd: 0.8 });
  if (fx.c[3]) e.push({ key: 'c3', type: 'whirl', cd: 0.8 });
  if (fx.c[4]) e.push({ key: 'c4', type: 'melee', frost: true, cd: 0.8 });
  if (fx.c[5]) e.push({ key: 'c5', type: 'melee', cd: 0.8 });
  if (fx.c[6]) e.push({ key: 'c6', type: 'nova', cd: 3.0 });
  if (fx.c[7] && u.kind !== 'player') e.push({ key: 'c7', type: 'charge', cd: 0 });
  return e;
}

function moveToward(u, tx, ty, speed, dt, stopDist) {
  const d = dist(u.x, u.y, tx, ty);
  if (d <= stopDist) return;
  const step = Math.min(speed * (1 - u.slow) * dt, d - stopDist);
  u.x += (tx - u.x) / d * step;
  u.y += (ty - u.y) / d * step;
  u.moving = true;
}

function moveEnemy(u, dt) {
  let rem = u.speed * (1 - u.slow) * dt;
  while (rem > 0 && u.wp < PATH.length) {
    const w = PATH[u.wp];
    const d = dist(u.x, u.y, w[0], w[1]);
    if (d <= rem) { u.x = w[0]; u.y = w[1]; rem -= d; u.wp++; }
    else { u.x += (w[0] - u.x) / d * rem; u.y += (w[1] - u.y) / d * rem; rem = 0; }
    u.moving = true;
  }
}

function breach(u) {
  castleHp -= DEF[u.kind].dmg;
  castle.hitAge = 0;
  u.dead = true; u.noCorpse = true;
}

function bagAdd(kind) {
  const i = bag.indexOf(null);
  if (i < 0) return false;
  bag[i] = kind;
  return true;
}

function joinCastle(u) {
  u.dead = true; u.noCorpse = true;
  let n = 0;
  for (const p of u.slots) {
    if (!p) continue;
    if (!bagAdd(p)) {
      groundParts.push({ kind: p, x: CASTLE.x + (n % 3 - 1) * 16, y: 1010 });
      n++;
    }
  }
  treantUnlocked = true;
}

function behave(u, dt) {
  u.moving = false;
  const fx = u.fx;
  let inRange = false;
  if (u.team !== 'neutral') {
    const hs = hostileList(u);
    for (const e of attackEffs(u)) {
      if (u.dead) break;
      if (e.type === 'charge') {
        const t = nearest(u, hs, 320);
        if (t && distU(u, t) <= u.r + t.r) {
          addArea('selfDestruct', u.x, u.y, 90, 0.4);
          for (const v of hs) if (!v.dead && distU(u, v) <= 90) dmgUnit(v, 60, false);
          u.attackAge = 0;
          u.dead = true;
        }
        continue;
      }
      let tgt = null;
      if (e.type === 'shoot') tgt = nearest(u, hs, e.range);
      else if (e.type === 'melee') {
        let bd = Infinity;
        for (const v of hs) { const d = distU(u, v); if (d <= u.r + v.r + 12 && d < bd) { bd = d; tgt = v; } }
      } else if (e.type === 'whirl') tgt = nearest(u, hs, 56);
      else if (e.type === 'nova') tgt = nearest(u, hs, 100);
      if (tgt) inRange = true;
      u.cd[e.key] = Math.min((u.cd[e.key] || 0) + dt, e.cd);
      if (tgt && u.cd[e.key] >= e.cd) {
        u.cd[e.key] = 0;
        u.attackAge = 0;
        if (e.type === 'shoot') fireProj(u, e.proj, tgt, e.proj === 'pierce' ? 12 : 10);
        else if (e.type === 'melee') {
          dmgUnit(tgt, 14, false);
          if (e.frost) for (const v of hs) if (v === tgt || dist(v.x, v.y, tgt.x, tgt.y) <= 50) applySlow(v, 0.5, 2);
        } else if (e.type === 'whirl') {
          addArea('whirl', u.x, u.y, 56, 0.2);
          for (const v of hs) if (!v.dead && distU(u, v) <= 56) dmgUnit(v, 14, false);
        } else if (e.type === 'nova') {
          addArea('nova', u.x, u.y, 100, 0.4);
          for (const v of hs) if (!v.dead && distU(u, v) <= 100) { dmgUnit(v, 10, false); applySlow(v, 0.5, 1.5); }
        }
      }
    }
  }
  if (u.dead) return;
  if (u.kind === 'player' || u.kind === 'castle') return;

  if (u.team === 'enemy') {
    if (!inRange && fx.s.march) moveEnemy(u, dt);
    return;
  }
  if (u.rally) {
    moveToward(u, u.rally.x, u.rally.y, 60, dt, 0);
    if (dist(u.x, u.y, u.rally.x, u.rally.y) < 1) u.rally = null;
    return;
  }
  if (u.team === 'neutral') {
    if (fx.s.march) {
      moveToward(u, CASTLE.x, CASTLE.y, 45, dt, 0);
      if (dist(u.x, u.y, CASTLE.x, CASTLE.y) <= CASTLE.r + 10) joinCastle(u);
    }
    return;
  }
  // 我方可動單位
  if (inRange) return;
  let seek = null;
  if (fx.s.seek) seek = { range: 240, speed: 70, charge: false };
  if (fx.c[5] && (!seek || 150 > seek.speed)) seek = { range: 320, speed: 150, charge: false };
  if (fx.c[7] && (!seek || 160 > seek.speed)) seek = { range: 320, speed: 160, charge: true };
  if (seek) {
    const t = nearest(u, hostileList(u), seek.range);
    if (t) {
      const ranged = fx.s.ranged || fx.c[0] || fx.c[1] || fx.c[2];
      let stop;
      if (seek.charge) stop = 0;
      else if (ranged) stop = 180;
      else stop = u.r + t.r + 12;
      moveToward(u, t.x, t.y, seek.speed, dt, stop);
      return;
    }
  }
  if (fx.s.march) moveToward(u, CASTLE.x, CASTLE.y, 60, dt, CASTLE.r + u.r);
}

function spawnEnemy(type) {
  const u = mkUnit(type, 'enemy', PATH[0][0], PATH[0][1], DEF[type].parts);
  u.hp = u.maxHp = DEF[type].hp;
  u.wp = 1;
  units.push(u);
}

function openPanel(t) {
  panel = t; pending = null; mode = null; player.moveTo = null;
}

function update(dt, realDt) {
  gameT += dt;
  while (spawnIdx < schedule.length && schedule[spawnIdx].t <= gameT) { spawnEnemy(schedule[spawnIdx].type); spawnIdx++; }

  const all = units.slice();
  for (const u of all) {
    u.fx = analyze(u.slots); u.pairs = u.fx.pairs;
    u.hitAge = Math.min(u.hitAge + dt, 0.3);
    u.attackAge = Math.min(u.attackAge + dt, 0.4);
    if (u.slowT > 0) { u.slowT -= dt; if (u.slowT <= 0) { u.slowT = 0; u.slowAmt = 0; } }
    u.auraSlow = 0;
  }
  for (const o of all) {
    if (o.dead || o.team === 'neutral' || !o.fx.s.frost) continue;
    for (const v of hostileList(o)) if (distU(o, v) <= 60) v.auraSlow = 0.3;
  }
  for (const u of all) u.slow = Math.max(u.auraSlow, u.slowT > 0 ? u.slowAmt : 0);

  for (const u of all) {
    if (u.dead) continue;
    behave(u, dt);
    if (u.team === 'enemy' && !u.dead && dist(u.x, u.y, CASTLE.x, CASTLE.y) <= CASTLE.r + 10) breach(u);
  }
  updatePlayer(dt);
  updateProjs(dt);
  flushDeaths();

  // 金幣 / 地上魂件
  coins = coins.filter(c => {
    if (dist(c.x, c.y, player.x, player.y) <= 30) { gold += 2; return false; }
    return true;
  });
  groundParts = groundParts.filter(g => {
    if (dist(g.x, g.y, player.x, player.y) <= 30 && bagAdd(g.kind)) return false;
    return true;
  });
  for (const c of corpses) c.life -= dt;
  corpses = corpses.filter(c => c.life > 0);
  for (const a of areas) a.age += dt;
  areas = areas.filter(a => a.age < a.duration);
  for (const s of sparks) s.age += dt;
  sparks = sparks.filter(s => s.age < 0.25);
  for (const m of markers) m.age += dt;
  markers = markers.filter(m => m.age < 0.5);

  // 發現組合
  for (const u of units) {
    if (u.dead || !(u.team === 'ally' || u.team === 'player')) continue;
    for (const p of u.pairs) {
      if (!discovered[p.combo]) {
        discovered[p.combo] = true;
        bannerQueue.push(p.combo);
      }
    }
  }
  if (!banner && bannerQueue.length) { const c = bannerQueue.shift(); banner = { combo: c, name: COMBOS[c].name, age: 0 }; }
  else if (banner) { banner.age += realDt; if (banner.age >= 2.5) banner = null; }

  // 面板有效性 / 模式取消
  if (panel && (!exists(panel) || (panel !== player && distU(panel, player) > PANEL_DIST))) panel = null;
  if (!inZone()) mode = null;

  // 勝負
  if (castleHp <= 0) endGame(false);
  else if (spawnIdx >= schedule.length && !units.some(u => !u.dead && u.team === 'enemy')) endGame(true);
}

function updatePlayer(dt) {
  const p = player;
  p.moving = false;
  if (pending) {
    if (!exists(pending) && pending !== player) pending = null;
    else if (pending === player || distU(p, pending) <= PANEL_DIST) openPanel(pending);
    else moveToward(p, pending.x, pending.y, 240, dt, 0);
  } else if (p.moveTo) {
    moveToward(p, p.moveTo.x, p.moveTo.y, 240, dt, 0);
    if (dist(p.x, p.y, p.moveTo.x, p.moveTo.y) < 1) p.moveTo = null;
  }
  p.x = Math.max(16, Math.min(704, p.x));
  p.y = Math.max(116, Math.min(1144, p.y));
}

function endGame(win) {
  phase = 'result'; resultWin = win; resultT = 0;
  panel = null; pending = null; mode = null;
}

// ---------- 輸入(只用滑鼠左鍵) ----------
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * CW / r.width, y: (e.clientY - r.top) * CH / r.height };
}
function inRect(x, y, cx, cy, w, h) { return Math.abs(x - cx) <= w / 2 && Math.abs(y - cy) <= h / 2; }

canvas.addEventListener('mousedown', function (e) {
  e.preventDefault();
  if (e.button !== 0) return;
  const p = toLogical(e);
  mouse = p;
  onClick(p.x, p.y);
});
canvas.addEventListener('mousemove', function (e) { mouse = toLogical(e); });

const GUIDE = [
  { title: '守住主堡', text: '撐過 6 波, 別讓敵人走進主堡', w: 480, h: 672 },
  { title: '移動與撿錢', text: '點地面移動, 走過金幣就撿起', w: 640, h: 384 },
  { title: '拆與裝', text: '點單位打開魂件, 點一下就拆或裝', w: 640, h: 394 },
  { title: '魂件會組合', text: '同一單位的兩個魂件會變出新招', w: 640, h: 373 },
  { title: '購買', text: '在主堡旁點商店購買', w: 640, h: 366 },
  { title: '招募中立單位', text: '中立單位裝上進攻主堡會來投靠', w: 640, h: 373 }
];
const GUIDE_TOP = 260;
const GUIDE_PREV = { x: 140, y: 1150, w: 200, h: 80 };
const GUIDE_NEXT = { x: 460, y: 1150, w: 360, h: 80 };

function onClick(x, y) {
  if (phase === 'result') { if (resultT > 0.6) reset(); return; }
  if (showGuide) {
    if (guidePage > 0 && inRect(x, y, GUIDE_PREV.x, GUIDE_PREV.y, GUIDE_PREV.w, GUIDE_PREV.h)) { guidePage--; return; }
    if (guidePage < GUIDE.length - 1) guidePage++;
    else { showGuide = false; guideStarted = true; }
    return;
  }
  if (dist(x, y, HELP.x, HELP.y) <= HELP.r + 6) { showGuide = true; guidePage = 0; return; }
  if (y >= 1160) { panelClick(x, y); return; }
  if (y < 100) return;
  groundClick(x, y);
}

function bagClick(i) {
  if (!panel || !bag[i] || panel.isCorpse) return;
  const s = slotsOfTarget(panel);
  const k = s.indexOf(null);
  if (k < 0) return;
  s[k] = bag[i]; bag[i] = null;
}
function targetClick(i) {
  const s = slotsOfTarget(panel);
  if (!s[i]) return;
  if (bag.indexOf(null) < 0) return;
  bagAdd(s[i]); s[i] = null;
}

function panelClick(x, y) {
  for (let i = 0; i < 4; i++) if (inRect(x, y, 56 + 80 * i, 1220, 72, 72)) { bagClick(i); return; }
  if (panel) {
    if (inRect(x, y, 684, 1196, 40, 40)) { panel = null; return; }
    const n = panel.slots.length;
    for (let i = 0; i < n; i++) if (inRect(x, y, 420 + 80 * i, 1228, 72, 72)) { targetClick(i); return; }
    return;
  }
  if (inZone()) {
    for (let i = 0; i < SHOP.length; i++) if (inRect(x, y, SHOP_POS[i][0], SHOP_POS[i][1], 84, 50)) { buyItem(i); return; }
  }
}

function buyItem(i) {
  const it = SHOP[i];
  if (i === 0 || i === 1 || i === 2) {
    if (i === 2 && !treantUnlocked) return;
    const kind = i === 0 ? 'tower' : (i === 1 ? 'soldier' : 'treant');
    if (mode && mode.kind === kind) { mode = null; return; }
    if (gold < it.price) return;
    mode = { kind };
    pending = null; player.moveTo = null;
    return;
  }
  if (gold < it.price) return;
  if (!bagAdd(it.kind)) return;
  gold -= it.price;
}

function groundClick(x, y) {
  if (mode) {
    if (mode.kind === 'tower') {
      if (gold >= 15 && towerValid(x, y)) {
        gold -= 15;
        units.push(mkUnit('tower', 'ally', x, y, []));
        mode = null;
      }
    } else {
      const price = mode.kind === 'soldier' ? 10 : 15;
      if (gold < price) { mode = null; return; }
      gold -= price;
      const u = mkUnit(mode.kind, 'ally', CASTLE.x, 1030, mode.kind === 'soldier' ? ['melee'] : []);
      u.rally = { x, y };
      units.push(u);
      mode = null;
    }
    return;
  }
  const t = pick(x, y);
  if (t) {
    pending = t; player.moveTo = null;
    if (t === player || distU(player, t) <= PANEL_DIST) openPanel(t);
    else panel = null;
    return;
  }
  panel = null; pending = null;
  player.moveTo = { x, y };
  markers.push({ x, y, age: 0 });
}

function pick(x, y) {
  let best = null, bd = Infinity;
  const consider = (t) => {
    const d = dist(x, y, t.x, t.y);
    const lim = Math.max(t.r + 8, 22);
    if (d <= lim && d < bd) { bd = d; best = t; }
  };
  for (const u of units) {
    if (u.dead || u.team === 'enemy') continue;
    consider(u);
  }
  for (const c of corpses) consider(c);
  return best;
}

// ---------- 繪製 ----------
function slotsPos(t) {
  if (t.isCorpse) return t.y - t.size / 2 - 12;
  if (t.kind === 'castle') return 1090 - 56 - 20;
  return t.y - t.size / 2 - 20;
}
function drawUnit(u) {
  const targeted = panel === u;
  const hitAge = Math.min(u.hitAge, 0.2), atkAge = Math.min(u.attackAge, 0.15);
  const base = { x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp, hitAge, hitDuration: 0.2,
    attackAge: atkAge, attackDuration: 0.15, moving: u.moving, slowed: u.slow > 0, targeted };
  switch (u.kind) {
    case 'castle':
      Art.drawCastle(ctx, { x: u.x, y: u.y, hitAge: Math.min(u.hitAge, 0.3), hitDuration: 0.3, zoneActive: inZone(), targeted });
      break;
    case 'tower': Art.drawTower(ctx, base); break;
    case 'soldier': Art.drawSoldier(ctx, base); break;
    case 'treant': base.team = u.team === 'neutral' ? 'neutral' : 'ally'; Art.drawTreant(ctx, base); break;
    default:
      Art.drawEnemy(ctx, { type: u.kind, x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp, hitAge, hitDuration: 0.2,
        attackAge: atkAge, attackDuration: 0.15, moving: u.moving, slowed: u.slow > 0 });
  }
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (showGuide) { renderGuide(); return; }
  Art.drawBackground(ctx, {});
  for (const c of coins) Art.drawCoin(ctx, { x: c.x, y: c.y });
  for (const g of groundParts) Art.drawGroundPart(ctx, { kind: g.kind, x: g.x, y: g.y });
  for (const c of corpses) Art.drawCorpse(ctx, { kind: c.kind, x: c.x, y: c.y, life: c.life, maxLife: 12, targeted: panel === c });
  const drawList = units.filter(u => u.kind !== 'player').sort((a, b) => a.y - b.y);
  for (const u of drawList) drawUnit(u);
  Art.drawPlayer(ctx, { x: player.x, y: player.y, moving: player.moving, attackAge: Math.min(player.attackAge, 0.15),
    attackDuration: 0.15, targeted: panel === player });
  for (const u of units) {
    Art.drawSoulSlots(ctx, { x: u.x, y: slotsPos(u), slots: u.slots, pairs: pairsOf(u.slots) });
  }
  for (const c of corpses) Art.drawSoulSlots(ctx, { x: c.x, y: slotsPos(c), slots: c.slots, pairs: pairsOf(c.slots) });
  for (const p of projs) Art.drawProjectile(ctx, { kind: p.kind, x: p.x, y: p.y, angle: p.angle, team: p.team });
  for (const a of areas) Art.drawAreaEffect(ctx, { kind: a.kind, x: a.x, y: a.y, radius: a.radius, age: a.age, duration: a.duration });
  for (const s of sparks) Art.drawHitSpark(ctx, { x: s.x, y: s.y, age: s.age, duration: 0.25 });
  for (const m of markers) Art.drawMoveMarker(ctx, { x: m.x, y: m.y, age: m.age, duration: 0.5 });
  if (mode && phase === 'play') {
    const mp = mouse || { x: 360, y: 700 };
    if (mp.y < 1160) {
      if (mode.kind === 'tower') Art.drawPlacementGhost(ctx, { kind: 'tower', x: mp.x, y: mp.y, valid: towerValid(mp.x, mp.y) });
      else Art.drawPlacementGhost(ctx, { kind: 'rally', x: mp.x, y: mp.y, valid: true });
    }
  }
  if (banner) Art.drawComboBanner(ctx, { combo: banner.combo, name: banner.name, age: banner.age, duration: 2.5 });

  // HUD
  let wave = 0;
  for (let k = 1; k <= TOTAL_WAVES; k++) if (gameT >= WAVE_START(k)) wave = k;
  const nextWave = [];
  let nextIn = -1;
  if (wave < TOTAL_WAVES) {
    nextIn = Math.ceil(WAVE_START(wave + 1) - gameT);
    for (const [type, count] of WAVES[wave]) nextWave.push({ type, count });
  }
  Art.drawHud(ctx, { gold, castleHp: Math.max(0, castleHp), castleMaxHp: 20, wave, totalWaves: TOTAL_WAVES,
    nextWaveIn: nextIn, nextWave, discovered: discovered.slice(), slowMo: !!panel });

  // 底部面板
  const bp = { bag: bag.slice(), mode: 'none', targetName: '', targetSlots: [], targetPairs: [], shopItems: [] };
  if (panel) {
    bp.mode = 'target'; bp.targetName = nameOf(panel);
    bp.targetSlots = panel.slots.slice(); bp.targetPairs = pairsOf(panel.slots);
  } else if (inZone()) {
    bp.mode = 'shop';
    bp.shopItems = SHOP.map((it, i) => {
      let state = 'ok';
      if (i === 2 && !treantUnlocked) state = 'locked';
      else if (mode && ((i === 0 && mode.kind === 'tower') || (i === 1 && mode.kind === 'soldier') || (i === 2 && mode.kind === 'treant'))) state = 'active';
      else if (gold < it.price) state = 'poor';
      return { name: it.name, price: it.price, state, kind: it.kind };
    });
  }
  Art.drawBottomPanel(ctx, bp);
  Placeholder.drawHelpButton(ctx, HELP.x, HELP.y, HELP.r);
  if (phase === 'result') {
    Art.drawResult(ctx, { win: resultWin, wave: Math.min(TOTAL_WAVES, wave), totalWaves: TOTAL_WAVES,
      discoveredCount: discovered.filter(Boolean).length, totalCombos: 8 });
  }
}

function renderGuide() {
  const g = GUIDE[guidePage];
  ctx.fillStyle = '#1b1b2a'; ctx.fillRect(0, 0, CW, CH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8d9a0'; ctx.font = 'bold 48px "Microsoft JhengHei", sans-serif';
  ctx.fillText(g.title, 360, 110);
  ctx.fillStyle = '#ffffff'; ctx.font = '28px "Microsoft JhengHei", sans-serif';
  ctx.fillText(g.text, 360, 190);
  const fx = Math.round((CW - g.w) / 2);
  ctx.strokeStyle = '#555a70'; ctx.lineWidth = 2;
  ctx.strokeRect(fx - 3, GUIDE_TOP - 3, g.w + 6, g.h + 6);
  Art.drawGuidePage(ctx, { page: guidePage, x: fx, y: GUIDE_TOP, w: g.w, h: g.h });
  ctx.fillStyle = '#cfd3e6'; ctx.font = '26px "Microsoft JhengHei", sans-serif';
  ctx.fillText((guidePage + 1) + ' / ' + GUIDE.length, 360, 1030);
  ctx.font = '22px "Microsoft JhengHei", sans-serif'; ctx.fillStyle = '#9aa0bd';
  ctx.fillText(guidePage > 0 ? '點「上一頁」回上一頁, 點其他處翻下一頁' : '點畫面任意處翻到下一頁', 360, 1075);
  if (guidePage > 0) {
    ctx.fillStyle = '#3a3f5c'; ctx.fillRect(GUIDE_PREV.x - GUIDE_PREV.w / 2, GUIDE_PREV.y - GUIDE_PREV.h / 2, GUIDE_PREV.w, GUIDE_PREV.h);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px "Microsoft JhengHei", sans-serif';
    ctx.fillText('上一頁', GUIDE_PREV.x, GUIDE_PREV.y);
  }
  const last = guidePage === GUIDE.length - 1;
  ctx.fillStyle = last ? '#4a7a3a' : '#3a3f5c';
  const nx = guidePage > 0 ? GUIDE_NEXT : { x: 360, y: GUIDE_NEXT.y, w: 560, h: GUIDE_NEXT.h };
  ctx.fillRect(nx.x - nx.w / 2, nx.y - nx.h / 2, nx.w, nx.h);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px "Microsoft JhengHei", sans-serif';
  ctx.fillText(last ? (guideStarted ? '回到遊戲' : '開始遊戲') : '下一頁', nx.x, nx.y);
}

// ---------- 主迴圈 / 畫布尺寸 ----------
function resize() {
  dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(CW * dpr);
  canvas.height = Math.round(CH * dpr);
  const s = Math.min(window.innerWidth / CW, window.innerHeight / CH);
  canvas.style.width = Math.floor(CW * s) + 'px';
  canvas.style.height = Math.floor(CH * s) + 'px';
}
window.addEventListener('resize', resize);

let lastT = 0;
function frame(t) {
  try {
    const rdt = Math.min(Math.max((t - lastT) / 1000, 0), 1 / 30);
    lastT = t;
    if (phase === 'result') resultT += rdt;
    else if (!showGuide) update(rdt * (panel ? SLOWMO : 1), rdt);
    render();
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}

showGuide = true; guideStarted = false; guidePage = 0;
reset();
resize();
requestAnimationFrame(function (t) { lastT = t; frame(t); });
