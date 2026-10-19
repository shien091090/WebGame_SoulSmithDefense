'use strict';
// 魂匠守衛者(打磨版) — 玩法驗證 Demo。邏輯與繪製分離: update 改狀態, render 只呼叫 Art.drawXxx。

const Placeholder = {}; // interface.json 涵蓋所有圖形, 無佔位

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
const CASTLE_DOOR = { x: 1124, y: 434 };
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
const KIND_OF = { tower: 'crossbow', pillar: 'pillar', soldier: 'soldier', castle: 'castle', corpse: 'corpse', enemy: 'enemy' };

// ───────── 關卡資料 ─────────
function gp(sp, pairs) { return { sp, list: pairs }; } // 一組出怪: 出怪點序號 + [[種類, 隻數], ...]
const LEVELS = [
  {
    name: '初陣', gold: 30, mul: 1.0, t1: 15, gap: 24,
    paths: [[[0, 290], [600, 290], [600, 434], [1180, 434]]],
    spawns: [{ name: 'A', x: 40, y: 290, ang: 0 }],
    towers: [[456, 362, ['ranged']]], pillars: [[456, 218, []]], castle: ['ranged', 'frost'], soldiers: [], neutrals: [],
    waves: [
      [gp(0, [['imp', 4]])],
      [gp(0, [['imp', 6]])],
      [gp(0, [['imp', 4], ['archer', 3]])],
      [gp(0, [['imp', 6], ['archer', 2], ['ice', 2]])]
    ]
  },
  {
    name: '雙路', gold: 40, mul: 1.0, t1: 15, gap: 26,
    paths: [[[0, 194], [720, 194], [720, 434], [1180, 434]], [[0, 626], [720, 626], [720, 434], [1180, 434]]],
    spawns: [{ name: '北', x: 40, y: 194, ang: 0 }, { name: '南', x: 40, y: 626, ang: 0 }],
    towers: [[456, 266, ['ranged']], [456, 554, ['ranged']]], pillars: [[456, 410, ['frost']]], castle: ['ranged', 'melee'], soldiers: [], neutrals: [],
    waves: [
      [gp(0, [['imp', 5]])],
      [gp(1, [['imp', 3], ['archer', 3]])],
      [gp(0, [['imp', 4], ['archer', 2]]), gp(1, [['imp', 4]])],
      [gp(0, [['archer', 3], ['ice', 2]]), gp(1, [['imp', 5]])],
      [gp(0, [['imp', 4], ['ice', 2]]), gp(1, [['archer', 3], ['ice', 2], ['brute', 1]])]
    ]
  },
  {
    name: '長蛇', gold: 40, mul: 1.1, t1: 15, gap: 28,
    paths: [[[0, 146], [1000, 146], [1000, 290], [300, 290], [300, 578], [860, 578], [860, 434], [1180, 434]]],
    spawns: [{ name: 'A', x: 40, y: 146, ang: 0 }],
    towers: [[504, 218, ['ranged']], [600, 506, ['ranged']]], pillars: [[600, 218, ['frost']]], castle: ['ranged', 'melee'], soldiers: [], neutrals: [[600, 434]],
    waves: [
      [gp(0, [['imp', 6]])],
      [gp(0, [['imp', 4], ['archer', 3]])],
      [gp(0, [['ice', 3], ['imp', 4]])],
      [gp(0, [['brute', 2], ['archer', 3], ['imp', 3]])],
      [gp(0, [['brute', 3], ['ice', 3], ['archer', 3]])]
    ]
  },
  {
    name: '夾擊', gold: 50, mul: 1.2, t1: 15, gap: 26,
    paths: [[[360, 50], [360, 434], [1180, 434]], [[360, 720], [360, 434], [1180, 434]]],
    spawns: [{ name: '上', x: 360, y: 90, ang: Math.PI / 2 }, { name: '下', x: 360, y: 690, ang: -Math.PI / 2 }],
    towers: [[456, 314, ['ranged']], [456, 554, ['ranged']]], pillars: [[552, 362, ['ranged']]], castle: ['ranged', 'melee'], soldiers: [[640, 490]], neutrals: [],
    waves: [
      [gp(0, [['imp', 5]])],
      [gp(1, [['drummer', 3], ['imp', 3]])],
      [gp(0, [['drummer', 2], ['archer', 3]]), gp(1, [['imp', 4]])],
      [gp(0, [['ice', 3], ['brute', 2]]), gp(1, [['drummer', 2], ['archer', 3]])],
      [gp(0, [['brute', 3], ['imp', 3]]), gp(1, [['ice', 3], ['drummer', 2]])],
      [gp(0, [['imp', 3], ['brute', 2], ['ice', 1], ['drummer', 1]]), gp(1, [['imp', 3], ['brute', 2], ['ice', 1], ['drummer', 1]])]
    ]
  },
  {
    name: '三叉', gold: 60, mul: 1.35, t1: 15, gap: 24,
    paths: [[[0, 146], [720, 146], [720, 434], [1180, 434]], [[0, 434], [1180, 434]], [[0, 674], [720, 674], [720, 434], [1180, 434]]],
    spawns: [{ name: '北', x: 40, y: 146, ang: 0 }, { name: '中', x: 40, y: 434, ang: 0 }, { name: '南', x: 40, y: 674, ang: 0 }],
    towers: [[456, 218, ['ranged']], [456, 602, ['ranged']]], pillars: [[456, 266, ['frost']], [456, 506, ['ranged']]], castle: ['ranged', 'melee'], soldiers: [], neutrals: [[960, 290], [960, 578]],
    waves: [
      [gp(0, [['imp', 4]]), gp(2, [['imp', 4]])],
      [gp(1, [['archer', 3], ['ice', 2]]), gp(0, [['imp', 4]])],
      [gp(2, [['drummer', 3], ['brute', 1]]), gp(1, [['imp', 5]])],
      [gp(0, [['brute', 2], ['ice', 3]]), gp(2, [['archer', 4]]), gp(1, [['imp', 3]])],
      [gp(0, [['imp', 3], ['archer', 2]]), gp(1, [['imp', 3], ['archer', 2]]), gp(2, [['imp', 3], ['archer', 2]])],
      [gp(0, [['brute', 3], ['drummer', 2]]), gp(1, [['ice', 3], ['brute', 2]]), gp(2, [['imp', 5]])],
      [0, 1, 2].map(i => gp(i, [['imp', 3], ['brute', 2], ['ice', 1], ['drummer', 1]]))
    ]
  }
];

// ───────── 幾何 ─────────
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function mkPath(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
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
// 把別條路線的頂點插進落在本路線線段中間的位置(例: 第 5 關中路在 (720,434) 與北 / 南匯流), 讓分岔點成為節點
function augmentPaths(paths) {
  return paths.map((pts, i) => {
    const out = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], ins = [];
      paths.forEach((q, j) => {
        if (j === i) return;
        q.forEach(v => {
          const r = segProject(a[0], a[1], b[0], b[1], v[0], v[1]);
          if (r.d < 0.5 && r.t > 0.001 && r.t < 0.999) ins.push({ t: r.t, v });
        });
      });
      ins.sort((x, y) => x.t - y.t);
      ins.forEach(o => { if (!out.some(p => p[0] === o.v[0] && p[1] === o.v[1])) out.push(o.v); });
      out.push(b);
    }
    return out;
  });
}
function buildNet(paths) {
  const nodes = [], key = {}, edges = [], seen = {};
  const nid = p => { const k = p[0] + ',' + p[1]; if (!(k in key)) { key[k] = nodes.length; nodes.push(p); } return key[k]; };
  paths.forEach((pts, pi) => {
    for (let k = 1; k < pts.length; k++) {
      const a = nid(pts[k - 1]), b = nid(pts[k]), ek = a + '>' + b;
      if (!(ek in seen)) { seen[ek] = edges.length; edges.push({ a, b, paths: [pi] }); } else edges[seen[ek]].paths.push(pi);
    }
  });
  return { nodes, edges };
}

// ───────── 狀態 ─────────
const keys = { L: false, R: false, U: false, D: false };
let zNeedRelease = false;
let RT = 0; // 真實秒數(未夾 dt, 埋點用)

// 這次開網頁期間的狀態(重新整理才重置)
const S = {
  unlocked: [true, false, false, false, false], best: [0, 0, 0, 0, 0], attempts: [0, 0, 0, 0, 0], fails: [0, 0, 0, 0, 0],
  combos: [false, false, false, false, false], golemUnlocked: false, muted: false,
  tut: { done: [], shownSt: [], doneSt: [], cur: 0, fx: null, view: null, pend: {}, pressed: {} }
};
const G = { screen: 'title', cursor: 0, titleT: 0, sq: [], music: null, inited: false, level: 1, popup: null, steal: null, hand: null };

function emptyEv() { return { combos: [], singles: { ranged: 0, melee: 0, frost: 0, seek: 0, march: 0, drum: 0 }, virt: [], resonating: false }; }
function mkUnit(cat, x, y, half, slots, max) {
  return {
    cat, x, y, half, slots, max: max || 0, cd: {}, ev: emptyEv(),
    hitAge: 0.2, attackAge: 0.15, moving: false, charging: false, state: 'normal', goneT: 0,
    hp: 1, maxHp: 1, slowT: 0, auraSlow: false, home: { x, y }, mNode: null,
    prevCombos: [0, 0, 0, 0, 0], comboLast: [-99, -99, -99, -99, -99], removed: false, chHit: new Map()
  };
}
function initPatrol(u) {
  let bi = 0, bp = null;
  LV.lanes.forEach((P, i) => { const r = pathProject(P, u.x, u.y); if (!bp || r.d < bp.d) { bp = r; bi = i; } });
  u.lane = bi; u.pc = bp.s; u.ps = bp.s; u.pdir = 1;
}
function mkTower(x, y) { return mkUnit('tower', x, y, 24, [null, null], 4); }
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

let LV = null; // 目前關卡資料(含 lanes / net)
function prepLevel(n) {
  const base = LEVELS[n - 1];
  const aug = augmentPaths(base.paths);
  LV = Object.assign({}, base, { n, lanes: aug.map(mkPath), net: buildNet(aug) });
}

// ───────── 埋點 ─────────
function r1(v) { return Math.round(v * 10) / 10; }
function ev(type, extra) {
  if (!G.log) return;
  const o = { type, t: r1(RT - G.log.t0), st: r1(RT) };
  if (extra) for (const k in extra) o[k] = extra[k];
  G.log.events.push(o);
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function downloadLog(obj) {
  try {
    const d = new Date();
    const name = 'gamelog-SoulSmithDefense-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds()) + '.json';
    const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  } catch (err) { console.error(err); }
}
function newStat() {
  return {
    gameSec: 0, slowMoSec: 0, leaks: 0, leaksByWave: [], leaksBySpawn: {}, kills: 0, goldEarned: 0, goldSpent: 0, purchases: {},
    steals: { started: 0, done: 0, canceled: 0 }, installs: { direct: 0, replace: 0, slotStone: 0 }, drops: 0, unitDowns: 0, recruits: 0, combosNew: []
  };
}

// ───────── 聲音(防呆: sound.js 沒載入也不當) ─────────
let lastArrowRT = -9;
function snd(name) { if (G.sq.indexOf(name) < 0) G.sq.push(name); }
function flushSnd() {
  const q = G.sq; G.sq = [];
  if (S.muted || typeof Sound === 'undefined' || !Sound.play) return;
  for (const n of q) {
    if (n === 'arrow_shot') { if (RT - lastArrowRT < 0.1) continue; lastArrowRT = RT; }
    try { Sound.play(n); } catch (err) { console.error(err); }
  }
}
function setMusic(name) {
  G.music = name;
  if (typeof Sound === 'undefined' || !G.inited) return;
  try {
    if (S.muted) return;
    if (name) Sound.playMusic(name);
    else if (Sound.stopMusic) Sound.stopMusic();
    else Sound.playMusic(null);
  } catch (err) { console.error(err); }
}
function applyMute() {
  if (typeof Sound === 'undefined') return;
  try {
    if (Sound.setMuted) Sound.setMuted(S.muted);
    else if (S.muted) { if (Sound.stopMusic) Sound.stopMusic(); }
    else if (G.music) Sound.playMusic(G.music);
  } catch (err) { console.error(err); }
}
function muffle(on) { try { if (typeof Sound !== 'undefined' && Sound.setSlowMo) Sound.setSlowMo(on); } catch (err) { console.error(err); } }
function toggleMute() {
  S.muted = !S.muted; applyMute();
  if (G.screen === 'play') ev('mute', { muted: S.muted });
}

// ───────── 開局 / 結算 ─────────
function startLevel(n) {
  G.level = n; prepLevel(n);
  S.attempts[n - 1]++;
  G.screen = 'play';
  G.time = 0; G.clock = 0; G.gold = LV.gold; G.castleHp = 20; G.wave = 0; G.waveStarted = 0;
  G.towers = LV.towers.map(t => { const u = mkTower(t[0], t[1]); t[2].forEach((k, i) => { u.slots[i] = k; }); return u; });
  G.pillars = LV.pillars.map(p => { const u = mkPillar(p[0], p[1]); p[2].forEach((k, i) => { u.slots[i] = k; }); return u; });
  G.soldiers = LV.soldiers.map(s => mkSoldier(s[0], s[1]));
  G.golems = LV.neutrals.map(g => mkGolem(g[0], g[1], 'neutral'));
  G.enemies = []; G.corpses = []; G.parts = []; G.coins = [];
  G.projs = []; G.beams = []; G.areas = []; G.sparks = []; G.names = []; G.breaks = [];
  G.castle = mkUnit('castle', 1180, 434, 56, [null, null, null], 4);
  LV.castle.forEach((k, i) => { G.castle.slots[i] = k; });
  G.castle.hitAge = 0.3;
  G.player = { x: 1060, y: 560, moving: false };
  G.hand = null; G.popup = null; G.steal = null; G.target = null;
  G.queue = [];
  LV.waves.forEach((groups, k) => {
    const st = LV.t1 + k * LV.gap;
    groups.forEach(g => {
      let i = 0;
      g.list.forEach(([type, cnt]) => { for (let c = 0; c < cnt; c++) { G.queue.push({ t: st + i * 1.2, sp: g.sp, type, wave: k }); i++; } });
    });
  });
  G.queue.sort((a, b) => a.t - b.t);
  G.warned = {};
  G.win = false; G.resultT = 0; G.stat = newStat();
  G.stat.leaksByWave = LV.waves.map(() => 0);
  G.log = { t0: RT, events: [], spawnsUsed: 0 };
  G.clockOn = !(n === 1 && !S.tut.done[3]);
  G.comboFlag = 0;
  const T = S.tut; T.cur = 0; T.fx = null; T.view = null; T.pend = {}; T.pressed = {};
  ev('level_start', { level: n, attempt: S.attempts[n - 1] });
  if (G.clockOn) ev('clock_start');
  zNeedRelease = true;
  setMusic('battle');
}
function toTitle() {
  G.screen = 'title'; G.titleT = 0; G.popup = null; G.steal = null;
  let c = 0; for (let i = 0; i < 5; i++) if (S.unlocked[i]) c = i;
  G.cursor = c;
  muffle(false);
  setMusic('title');
}
function endLevel(win) {
  const hp = Math.max(0, G.castleHp);
  const stars = win ? 1 + (hp >= 10 ? 1 : 0) + (hp === 20 ? 1 : 0) : 0;
  G.screen = 'result'; G.win = win; G.resultT = 0; G.stars = stars; G.starsPlayed = 0; G.resultCursor = 0;
  G.options = win ? (G.level < 5 ? ['下一關', '重玩', '標題'] : ['重玩', '標題']) : ['重來', '標題'];
  G.popup = null; G.steal = null; muffle(false);
  G.sq = G.sq.filter(n => n !== 'castle_hit');
  if (win) { S.unlocked[Math.min(4, G.level)] = true; S.best[G.level - 1] = Math.max(S.best[G.level - 1], stars); }
  else S.fails[G.level - 1]++;
  const T = S.tut; T.cur = 0; T.fx = null; T.view = null;
  ev('level_end', { result: win ? 'win' : 'lose', wave: G.wave, castleHp: hp, stars });
  const st = G.stat;
  const tut = {};
  for (let k = 1; k <= 12; k++) tut[String(k)] = { shownSt: T.shownSt[k] === undefined ? null : T.shownSt[k], doneSt: T.doneSt[k] === undefined ? null : T.doneSt[k] };
  const summary = {
    level: G.level, levelName: LV.name, attempt: S.attempts[G.level - 1], failsBefore: win ? S.fails[G.level - 1] : S.fails[G.level - 1] - 1,
    result: win ? 'win' : 'lose', durationSec: r1(RT - G.log.t0), gameSec: r1(st.gameSec), slowMoSec: r1(st.slowMoSec),
    waveReached: G.wave, totalWaves: LV.waves.length, castleHp: hp, stars, leaks: st.leaks, leaksByWave: st.leaksByWave, leaksBySpawn: st.leaksBySpawn,
    kills: st.kills, goldEarned: st.goldEarned, goldSpent: st.goldSpent, goldEnd: G.gold, purchases: st.purchases, steals: st.steals, installs: st.installs,
    drops: st.drops, unitDowns: st.unitDowns, recruits: st.recruits, combosFoundThisLevel: st.combosNew, combosFoundTotal: S.combos.filter(Boolean).length
  };
  downloadLog({ game: 'SoulSmithDefense', version: 'polish-1', summary, tutorial: tut, events: G.log.events });
  setMusic(null);
  snd(win ? 'level_win' : 'level_lose');
}

// ───────── 組合評估 ─────────
function evalUnit(u, virt) {
  const real = [];
  const combos = [];
  const mobile = u.cat === 'soldier' || u.cat === 'golem';
  for (const k of u.slots) if (k && BASIC[k]) real.push({ kind: k, used: false });
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
function allyMobile() { return G.soldiers.concat(G.golems.filter(g => g.team === 'ally')); }
function allyAlive() { return allyMobile().filter(u => u.state === 'normal'); }
function receivers() { return G.towers.concat(allyAlive(), [G.castle]); }
function liveEnemies() { return G.enemies.filter(e => !e.dead && !e.gone); }
function computeEvals() {
  const rs = receivers();
  for (const r of rs) {
    const virt = [];
    const ps = G.pillars.map(p => ({ p, d: dist(p, r) })).filter(o => o.d <= 150).sort((a, b) => a.d - b.d);
    for (const o of ps) o.p.slots.forEach((k, i) => { if (k && BASIC[k]) virt.push({ kind: k, used: false, pillar: o.p, slotIdx: i }); });
    evalUnit(r, virt);
  }
  // 非接收者(歸隊中 / 潰散中 / 魂柱 / 中立): 不產生任何效果
  for (const u of allyMobile()) if (u.state !== 'normal') { u.ev = emptyEv(); u.prevCombos = [0, 0, 0, 0, 0]; }
  for (const g of G.golems) if (g.team === 'neutral') g.ev = emptyEv();
  G.pillars.forEach(p => { p.ev = emptyEv(); });
  G.enemies.forEach(evalEnemy);
}

// ───────── 戰鬥輔助 ─────────
function nearest(u, list, test) {
  let best = null, bd = 1e9;
  for (const t of list) {
    const d = dist(u, t);
    if (d < bd && (!test || test(t, d))) { bd = d; best = t; }
  }
  return best;
}
function stolenBy(u) { return G.steal && G.steal.enemy === u; }
function speedMult(u) { return 1 - Math.max(u.auraSlow ? 0.3 : 0, u.slowT > 0 ? 0.5 : 0, stolenBy(u) ? 0.6 : 0); }
function hurt(t, amt) {
  if (t.dead || t.state === 'gone') return;
  t.hp -= amt; t.hitAge = 0;
  G.sparks.push({ x: t.x, y: t.y, age: 0 });
  if (t.hp <= 0) {
    t.hp = 0;
    if (t.cat === 'enemy') { t.dead = true; G.stat.kills++; snd('enemy_die'); }
    else {
      t.state = 'gone'; t.goneT = 0; t.mNode = null; t.moving = false; t.charging = false;
      G.breaks.push({ kind: t.cat === 'soldier' ? 'soldier' : 'golem', x: t.x, y: t.y, age: 0 });
      G.stat.unitDowns++; snd('unit_down');
      ev('unit_down', { unit: t.cat, x: Math.round(t.x), y: Math.round(t.y) });
    }
  }
}
function slowIt(t) { t.slowT = 2; }
function onPath(e) { return pathProject(LV.lanes[e.lane], e.x, e.y).d <= 4; }
function knockBack(e, from) {
  const P = LV.lanes[e.lane];
  const pr = pathProject(P, e.x, e.y);
  let ang;
  if (pr.d <= 4) {
    const s1 = Math.max(0, pr.s - 60), q = pathPoint(P, s1);
    e.kb = { mode: 'path', s0: pr.s, s1, t: 0 };
    ang = (Math.abs(q.x - e.x) + Math.abs(q.y - e.y) < 0.01) ? Math.atan2(e.y - from.y, e.x - from.x) : Math.atan2(q.y - e.y, q.x - e.x);
  } else {
    let dx = e.x - from.x, dy = e.y - from.y, d = Math.hypot(dx, dy);
    if (d < 1) { const a = Math.random() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
    e.kb = { mode: 'line', x0: e.x, y0: e.y, x1: clamp(e.x + dx / d * 60, 0, W), y1: clamp(e.y + dy / d * 60, 50, H), t: 0 };
    ang = Math.atan2(dy, dx);
  }
  return ang;
}
function effectsOf(u) {
  const ev2 = u.ev, ef = [], seen = [0, 0, 0, 0, 0];
  for (const ci of ev2.combos) { if (ci === 4) continue; seen[ci]++; ef.push({ key: 'c' + ci + '_' + seen[ci], t: COMBO_KIND[ci] }); }
  if (ev2.singles.ranged) ef.push({ key: 's_ranged', t: 'ranged', n: ev2.singles.ranged });
  if (ev2.singles.melee) ef.push({ key: 's_melee', t: 'melee', n: ev2.singles.melee });
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
    }
    if (!tgt) continue;
    standing = true;
    if ((u.cd[ef.key] || 0) > 0) continue;
    u.cd[ef.key] = period;
    u.attackAge = 0;
    switch (ef.t) {
      case 'ranged': spawnProj(u, tgt, 'normal', 10 * ef.n, side); snd(side === 'ally' ? 'arrow_shot' : 'enemy_shot'); break;
      case 'melee': hurt(tgt, 14 * ef.n); if (side === 'ally') snd('melee_hit'); break;
      case 'iceArrow': spawnProj(u, tgt, 'ice', 10, side); snd('arrow_shot'); break;
      case 'pierce': {
        const ang = Math.atan2(tgt.y - u.y, tgt.x - u.x);
        const x2 = u.x + Math.cos(ang) * 260, y2 = u.y + Math.sin(ang) * 260;
        G.beams.push({ x1: u.x, y1: u.y, x2, y2, age: 0 });
        for (const h of hostiles) if (segProject(u.x, u.y, x2, y2, h.x, h.y).d <= 14) hurt(h, 14);
        snd('pierce_shot');
        break;
      }
      case 'whirl':
        G.areas.push({ kind: 'whirl', x: u.x, y: u.y, radius: 60, angle: 0, age: 0 });
        for (const h of hostiles) if (dist(u, h) <= 60) hurt(h, 16);
        snd('whirl');
        break;
      case 'frostSmash':
        G.areas.push({ kind: 'frostSmash', x: tgt.x, y: tgt.y, radius: 60, angle: 0, age: 0 });
        hurt(tgt, 16);
        for (const h of hostiles) if (h === tgt || dist(h, tgt) <= 60) slowIt(h);
        snd('melee_hit');
        break;
    }
  }
  return standing;
}
// 衝鋒衝撞: 每隻進入碰觸距離的敵人(同一隻 1 秒內只撞一次)受傷、被撞退 60、暈眩 1 秒
function chargeHits(u) {
  if (u.state !== 'normal' || u.ev.combos.indexOf(4) < 0) return;
  for (const h of liveEnemies()) {
    if (!contact(u, h)) continue;
    const last = u.chHit.get(h);
    if (last !== undefined && G.time - last < 1.0) continue;
    u.chHit.set(h, G.time);
    u.attackAge = 0;
    hurt(h, 30);
    if (h.dead) { G.areas.push({ kind: 'charge', x: h.x, y: h.y, radius: 30, angle: Math.atan2(h.y - u.y, h.x - u.x), age: 0 }); snd('charge_hit'); continue; }
    const ang = knockBack(h, u);
    h.stunAge = 0;
    G.areas.push({ kind: 'charge', x: h.x, y: h.y, radius: 30, angle: ang, age: 0 });
    snd('charge_hit');
  }
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
function nearestNet(x, y) {
  let best = null;
  for (const e of LV.net.edges) {
    const A = LV.net.nodes[e.a], B = LV.net.nodes[e.b];
    const r = segProject(A[0], A[1], B[0], B[1], x, y);
    if (!best || r.d < best.d) best = { d: r.d, x: r.x, y: r.y, edge: e };
  }
  return best;
}
function routeDist(x, y) {
  let m = 1e9;
  for (const P of LV.lanes) m = Math.min(m, pathProject(P, x, y).d);
  return m;
}
function enemiesOnPaths(ps) { return liveEnemies().filter(e => ps.indexOf(e.lane) >= 0).length; }
// 沿路線逆向走向出怪點; 分岔點選活著敵人較多的那條, 一樣多選列在前面的
function marchReverse(u, spd, dt) {
  const N = LV.net.nodes;
  for (let guard = 0; guard < 4; guard++) {
    if (u.mNode === null) {
      const near = nearestNet(u.x, u.y);
      if (near.d > 2) { moveToward(u, near.x, near.y, spd, dt); return; }
      let at = -1;
      for (let i = 0; i < N.length; i++) if (Math.hypot(u.x - N[i][0], u.y - N[i][1]) < 2) { at = i; break; }
      if (at >= 0) {
        const opts = LV.net.edges.filter(e => e.b === at);
        if (!opts.length) return; // 已在出怪點
        let best = null, bc = -1;
        for (const o of opts) {
          const c = enemiesOnPaths(o.paths);
          if (c > bc || (c === bc && Math.min.apply(null, o.paths) < Math.min.apply(null, best.paths))) { best = o; bc = c; }
        }
        u.mNode = best.a;
      } else u.mNode = near.edge.a;
    }
    const T = N[u.mNode];
    if (Math.hypot(u.x - T[0], u.y - T[1]) < 1.5) { u.mNode = null; continue; }
    moveToward(u, T[0], T[1], spd, dt);
    return;
  }
}
function patrol(u, dt, spd) {
  const P = LV.lanes[u.lane];
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
        e.s = pathProject(LV.lanes[e.lane], e.x, e.y).s;
      }
      return;
    }
  }
  if (s.march > 0) {
    const P = LV.lanes[e.lane];
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
function spawnEnemy(q) {
  const d = ENEMY_DEF[q.type];
  const e = mkUnit('enemy', 0, 0, d.half, d.items.slice(), 0);
  e.type = q.type; e.lane = q.sp; e.s = 0; e.speed = d.speed; e.wave = q.wave;
  e.hp = e.maxHp = Math.round(d.hp * LV.mul);
  e.stunAge = 1.0; e.kb = null;
  const p = pathPoint(LV.lanes[q.sp], 0);
  e.x = p.x; e.y = p.y; e.dead = false; e.gone = false;
  G.enemies.push(e);
}
function cleanupEnemies() {
  G.enemies = G.enemies.filter(e => {
    if (e.gone) { e.removed = true; return false; }
    if (e.dead) {
      e.removed = true;
      const d = ENEMY_DEF[e.type];
      G.corpses.push({ cat: 'corpse', kind: e.type, x: e.x, y: e.y, half: d.half, life: 15, slots: e.slots, removed: false });
      for (let i = 0; i < d.coins; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 40;
        G.coins.push({ x: clamp(e.x + Math.cos(a) * r, 8, W - 8), y: clamp(e.y + Math.sin(a) * r, 58, H - 8) });
      }
      return false;
    }
    return true;
  });
}

// ───────── 互動目標 ─────────
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
function unitKind(u) {
  if (u.cat === 'golem') return u.team === 'neutral' ? 'neutral' : 'golem';
  return KIND_OF[u.cat];
}
function hasItem(u) { return u.slots.some(s => !!s); }
function interactables() { // 可被安裝 / 拿取的單位
  const L = [];
  G.towers.forEach(o => L.push(o));
  G.pillars.forEach(o => L.push(o));
  G.soldiers.forEach(o => { if (o.state !== 'gone') L.push(o); });
  G.golems.forEach(o => { if (o.state !== 'gone' && !o.removed) L.push(o); });
  L.push(G.castle);
  return L;
}
function nearestInRange(list) {
  const P = G.player;
  let best = null, bd = 1e9;
  for (const o of list) {
    const d = dist(P, o);
    if (d <= o.half + 48 && d < bd) { bd = d; best = o; }
  }
  return best;
}
function partObj(p) { p.half = 14; return p; }
function findInstallTarget() {
  const stone = G.hand === 'slotStone';
  const L = interactables().filter(u => !stone || (u.max && u.slots.length < u.max));
  G.parts.forEach(p => L.push(partObj(p)));
  return nearestInRange(L);
}
function findTakeTarget() {
  const L = interactables().filter(hasItem);
  G.parts.forEach(p => L.push(partObj(p)));
  G.corpses.forEach(c => { if (!c.removed && hasItem(c)) L.push(c); });
  liveEnemies().forEach(e => { if (hasItem(e)) L.push(e); });
  return nearestInRange(L);
}
function findTarget() {
  if (G.steal) return G.steal.enemy;
  if (!G.hand) return findTakeTarget();
  if (KITS[G.hand]) return null;
  return findInstallTarget();
}
function actionLabel() {
  if (G.steal) return '取消搶奪';
  if (KITS[G.hand]) return placeInfo(G.hand).valid ? '蓋下' : '不能蓋';
  const t = findTarget();
  if (G.hand) {
    if (!t) return '丟下';
    if (t.cat === 'part') return '互換';
    if (G.hand === 'slotStone') return '擴槽';
    return t.slots.some(s => !s) ? '裝上' : '替換';
  }
  if (!t) return '';
  if (t.cat === 'enemy') return '搶奪';
  return '拿起';
}

// ───────── 更新 ─────────
function tickAge(o, k, dur, dt) { if (o[k] < dur) o[k] = Math.min(dur, o[k] + dt); }
function tickUnit(u, gdt) {
  tickAge(u, 'hitAge', u.cat === 'castle' ? 0.3 : 0.2, gdt);
  tickAge(u, 'attackAge', 0.15, gdt);
  if (u.slowT > 0) u.slowT = Math.max(0, u.slowT - gdt);
}
function castleHit(e) {
  G.castleHp -= ENEMY_DEF[e.type].dmg;
  G.castle.hitAge = 0;
  e.gone = true;
  G.stat.leaks++; G.stat.leaksByWave[e.wave]++;
  const nm = LV.spawns[e.lane].name;
  G.stat.leaksBySpawn[nm] = (G.stat.leaksBySpawn[nm] || 0) + 1;
  ev('leak', { wave: e.wave + 1, enemy: e.type, spawn: nm, castleHpAfter: G.castleHp });
  if (G.castleHp > 0) snd('castle_hit');
}
function openPopup(p) { G.popup = p; snd('popup_open'); muffle(true); }
function closePopup() { if (!G.popup) return; G.popup = null; snd('popup_close'); muffle(false); }
function startClock() { if (G.clockOn) return; G.clockOn = true; ev('clock_start'); }
function unitMobileTick(u, gdt) {
  // 我方移動單位: 潰散中 / 歸隊中 / 正常
  if (u.state === 'gone') {
    u.goneT += gdt;
    if (u.goneT >= 2) { u.state = 'returning'; u.x = CASTLE_DOOR.x; u.y = CASTLE_DOOR.y; u.hp = u.maxHp; u.mNode = null; snd('unit_return'); }
    return;
  }
  tickUnit(u, gdt);
  if (u.state === 'returning') {
    u.moving = false; u.charging = false;
    if (moveToward(u, u.home.x, u.home.y, 100, gdt)) { u.state = 'normal'; u.moving = false; }
    return;
  }
  const st = runAttacks(u, 'ally', gdt);
  allyBehavior(u, gdt, st);
  chargeHits(u);
}

function update(dt) {
  if (G.screen === 'title') { G.titleT += dt; return; }
  if (G.screen === 'result') {
    G.resultT += dt;
    while (G.starsPlayed < G.stars && G.resultT >= 0.4 * G.starsPlayed) { snd('star'); G.starsPlayed++; }
    flushSnd();
    return;
  }
  if (G.screen !== 'play') return;
  if (G.popup) { G.popup.shake = Math.min(0.25, G.popup.shake + dt); G.stat.slowMoSec += dt; }
  const gdt = dt * (G.popup ? 0.2 : 1);
  G.time += gdt; G.stat.gameSec += gdt;
  const P = G.player;

  // 玩家移動
  P.moving = false;
  if (!G.popup) {
    const dx = (keys.R ? 1 : 0) - (keys.L ? 1 : 0), dy = (keys.D ? 1 : 0) - (keys.U ? 1 : 0);
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
    if (e.removed || e.dead || e.gone) cancelSteal('dead');
    else if (dist(P, e) > e.half + 68) cancelSteal('far');
    else {
      s.t += gdt;
      if (s.t >= 1.5) {
        const item = e.slots[s.index];
        G.hand = item; e.slots[s.index] = null; G.steal = null;
        G.stat.steals.done++; snd('steal_done'); ev('steal_done', { enemy: e.type, item });
        tutEv(8);
      }
    }
  }

  computeEvals();

  // 波次(倒數從 clockOn 起算)
  if (G.clockOn) {
    G.clock += gdt;
    while (G.waveStarted < LV.waves.length && G.clock >= LV.t1 + G.waveStarted * LV.gap) {
      G.waveStarted++; G.wave = G.waveStarted;
      snd('wave_start'); ev('wave_start', { wave: G.wave });
    }
    while (G.queue.length && G.queue[0].t <= G.clock) spawnEnemy(G.queue.shift());
    if (G.waveStarted < LV.waves.length) {
      const rem = LV.t1 + G.waveStarted * LV.gap - G.clock;
      if (rem <= 6 && rem > 0 && !G.warned[G.waveStarted]) { G.warned[G.waveStarted] = true; snd('wave_warning'); }
    }
  }
  const liveE = liveEnemies();
  G.enemies.forEach(evalEnemy);

  // 冰霜減速範圍
  const frostSrcAlly = [], frostSrcEnemy = [];
  liveE.forEach(e => { e.auraSlow = false; });
  allyMobile().forEach(u => { u.auraSlow = false; });
  for (const u of G.towers.concat(allyAlive(), [G.castle])) {
    if (u.ev.singles.frost < 1) continue;
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
  allyMobile().forEach(u => unitMobileTick(u, gdt));
  tickUnit(G.castle, gdt); runAttacks(G.castle, 'ally', gdt);
  G.pillars.forEach(p => tickAge(p, 'changeAge', 0.5, gdt));

  // 中立石魔像
  for (const g of G.golems) {
    if (g.team !== 'neutral') continue;
    tickUnit(g, gdt);
    g.moving = false;
    if (g.slots.indexOf('march') >= 0) {
      moveToward(g, CASTLE_POS.x, CASTLE_POS.y, 60, gdt);
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
        G.parts.push({ cat: 'part', item: it, x: 1052 + 32 * k, y: 580, half: 14, spawnAge: 0, removed: false });
        k++;
      }
      G.stat.recruits++; snd('recruit'); ev('recruit');
    }
    G.golems = G.golems.filter(g => !g.recruited);
    S.golemUnlocked = true;
    if (G.popup && G.popup.target && G.popup.target.removed) closePopup();
  }

  // 敵人
  for (const e of liveE) {
    tickUnit(e, gdt);
    if (e.stunAge < 1.0) e.stunAge = Math.min(1.0, e.stunAge + gdt);
    if (e.kb) {
      const k = e.kb; k.t += gdt / 0.2;
      const f = Math.min(1, k.t);
      if (k.mode === 'path') { const q = pathPoint(LV.lanes[e.lane], k.s0 + (k.s1 - k.s0) * f); e.x = q.x; e.y = q.y; if (f >= 1) e.s = k.s1; }
      else { e.x = k.x0 + (k.x1 - k.x0) * f; e.y = k.y0 + (k.y1 - k.y0) * f; if (f >= 1) e.s = pathProject(LV.lanes[e.lane], e.x, e.y).s; }
      if (f >= 1) e.kb = null;
      e.moving = false;
    } else if (e.stunAge < 1.0) {
      e.moving = false;
    } else {
      const st = runAttacks(e, 'enemy', gdt);
      enemyBehavior(e, gdt, st);
    }
    if (dist(e, CASTLE_POS) <= 66) castleHit(e);
  }

  // 投射物
  G.projs = G.projs.filter(p => {
    const t = p.target;
    if (t && !t.dead && !t.gone && t.state !== 'gone' && !t.removed) p.angle = Math.atan2(t.y - p.y, t.x - p.x);
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

  // 單次特效 / 金幣 / 屍體
  for (const arr of [G.beams, G.areas, G.sparks, G.names, G.breaks]) arr.forEach(o => { o.age += gdt; });
  G.beams = G.beams.filter(o => o.age < 0.15);
  G.areas = G.areas.filter(o => o.age < 0.3);
  G.sparks = G.sparks.filter(o => o.age < 0.25);
  G.names = G.names.filter(o => o.age < 1.5);
  G.breaks = G.breaks.filter(o => o.age < 0.5);
  G.parts.forEach(p => { if (p.spawnAge < 0.6) p.spawnAge = Math.min(0.6, p.spawnAge + gdt); });
  G.coins = G.coins.filter(c => {
    const d = Math.hypot(P.x - c.x, P.y - c.y);
    let got = false;
    if (d <= 20) got = true;
    else if (d <= 90) {
      const st = Math.min(420 * gdt, d);
      c.x += (P.x - c.x) / d * st; c.y += (P.y - c.y) / d * st;
      if (Math.hypot(P.x - c.x, P.y - c.y) <= 20) got = true;
    }
    if (got) { G.gold += 2; G.stat.goldEarned += 2; snd('coin_pickup'); tutEv(4); return false; }
    return true;
  });
  G.corpses.forEach(c => { c.life -= gdt; });
  G.corpses = G.corpses.filter(c => { if (c.life <= 0) { c.removed = true; return false; } return true; });

  cleanupEnemies();
  G.parts = G.parts.filter(p => !p.removed);

  // 組合名稱(同一幀多個只播一次: 有首次就只播 combo_new)
  let flag = 0;
  for (const u of G.towers.concat(allyAlive(), [G.castle])) {
    for (let ci = 0; ci < 5; ci++) {
      const n = u.ev.combos.filter(c => c === ci).length;
      if (n > u.prevCombos[ci] && G.time - u.comboLast[ci] >= 4) {
        u.comboLast[ci] = G.time;
        const isNew = !S.combos[ci];
        if (isNew) { S.combos[ci] = true; G.stat.combosNew.push(COMBO_NAME[ci]); ev('combo_new', { name: COMBO_NAME[ci], unit: unitKind(u) }); }
        flag = Math.max(flag, isNew ? 2 : 1);
        G.names.push({ unit: u, name: COMBO_NAME[ci], isNew, age: 0 });
      }
      u.prevCombos[ci] = n;
    }
  }
  if (flag) snd(flag === 2 ? 'combo_new' : 'combo');

  // 彈窗自動關閉
  if (G.popup && G.popup.target) {
    const t = G.popup.target;
    if (t.removed || t.dead || t.gone || t.state === 'gone' || dist(G.player, t) > t.half + 68) closePopup();
  }
  G.target = findTarget();
  if (G.popup) G.target = G.popup.target || null;

  updateTutorial(dt);

  // 結束判定(批次尾端只判一次)
  if (G.castleHp <= 0) endLevel(false);
  else if (G.waveStarted >= LV.waves.length && G.queue.length === 0 && liveEnemies().length === 0) endLevel(true);
  flushSnd();
}

// ───────── 新手教學 ─────────
function tutEv(k) { const T = S.tut; if (T.cur === k) T.pend[k] = true; }
function enemyWithItem() { return liveEnemies().filter(hasItem); }
function drumTargets() {
  const L = [];
  G.corpses.forEach(c => { if (!c.removed && c.kind === 'drummer' && c.slots.indexOf('drum') >= 0) L.push(c); });
  liveEnemies().forEach(e => { if (e.type === 'drummer' && e.slots.indexOf('drum') >= 0) L.push(e); });
  return L;
}
function tutCond(k) {
  const T = S.tut, n = G.level;
  switch (k) {
    case 1: return n === 1;
    case 2: return !!T.done[1];
    case 3: return !!T.done[2];
    case 4: return !!T.done[3] && G.coins.length > 0;
    case 5: return !!T.done[4];
    case 6: return !!T.done[5] && !!KITS[G.hand];
    case 7: return n >= 2 && enemyWithItem().length > 0 && G.hand !== null;
    case 8: return n >= 2 && enemyWithItem().length > 0 && G.hand === null;
    case 10: return n >= 3 && G.golems.some(g => g.team === 'neutral');
    case 11: return n >= 4 && drumTargets().length > 0;
    case 12: return !!T.done[11] && G.hand === 'drum';
  }
  return false;
}
function tutChoose() {
  const T = S.tut, p = G.popup;
  if (p && p.type === 'soul' && p.mode === 'replace' && !T.done[9]) return 9;
  for (let k = 1; k <= 12; k++) if (!T.done[k] && tutCond(k)) return k;
  return 0;
}
function tutState(k) { // 狀態型完成條件
  switch (k) {
    case 2: return (!!G.hand && !!BASIC[G.hand]) || G.pillars.some(hasItem); // 已先裝進魂柱也算拿過, 避免卡死
    case 3: return G.pillars.some(hasItem);
    case 7: return G.hand === null;
    case 11: return G.hand === 'drum';
  }
  return false;
}
const TUT_TEXT = {
  1: ['方向鍵移動', ['left', 'up', 'right', 'down']], 2: ['靠近主堡按 Z, 拿起魂件', ['z']], 3: ['靠近魂柱按 Z 裝上', ['z']],
  4: ['走近金幣就會撿起', []], 5: ['回主堡按空白鍵, Z 購買', ['space', 'z']], 6: ['走到路旁空地按 Z 蓋下', ['z']],
  7: ['離開單位按 Z, 放下東西', ['z']], 8: ['空手靠近活鬼按 Z 搶', ['z']], 9: ['← → 選要換掉的格, Z', ['left', 'right', 'z']],
  10: ['鬼的進攻主堡, 裝給魔像', ['z']], 11: ['拿起鼓鬼的行軍魂件', ['z']], 12: ['裝給步兵, 牠會往前衝', ['z']]
};
function tutView(k) {
  const P = G.player;
  let tx, up, down;
  const near = list => nearest(P, list) || { x: NaN, y: NaN, half: 0, cat: '' };
  switch (k) {
    case 1: case 6: case 7: tx = P.x; up = P.y - 20; down = P.y + 44; break;
    case 2: case 5: tx = 1180; up = 344; down = 434 + 56 + 4; break;
    case 3: { const o = near(G.pillars); tx = o.x; up = o.y - 52; down = o.y + 18 + 4; break; }
    case 4: { const o = near(G.coins); tx = o.x; up = o.y - 12; down = o.y + 8 + 4; break; }
    case 8: { const o = near(enemyWithItem()); tx = o.x; up = o.y - o.half - 34; down = o.y + o.half + 4; break; }
    case 9: { const p = G.popup; tx = p.x; up = p.y - 62; down = p.y + 62; break; }
    case 10: { const o = near(G.golems.filter(g => g.team === 'neutral')); tx = o.x; up = o.y - 62; down = o.y + 28 + 4; break; }
    case 11: { const o = near(drumTargets()); tx = o.x; up = o.cat === 'corpse' ? o.y - o.half - 26 : o.y - o.half - 34; down = o.y + o.half + 4; break; }
    case 12: { const o = near(allyMobile().filter(u => u.state !== 'gone')); tx = o.x; up = o.y - (o.cat === 'golem' ? 62 : 50); down = o.y + o.half + 4; break; }
  }
  if (tx === undefined || tx !== tx || up !== up) return null;
  let side = 'up', tipY = up, by = tipY - 20 - 36;
  if (by - 36 < 50) { side = 'down'; tipY = down; by = tipY + 20 + 36; }
  const bx = clamp(tx, 150, 1130);
  const T = S.tut, td = TUT_TEXT[k];
  const pressed = [];
  if (k === 1) td[1].forEach(nm => { if (T.pressed[nm]) pressed.push(nm); });
  return { stage: k, text: td[0], keys: td[1].slice(), pressedKeys: pressed, tipX: tx, tipY, side, bodyX: bx, bodyY: by };
}
function completeStage(k) {
  const T = S.tut;
  T.done[k] = true; T.doneSt[k] = r1(RT);
  ev('tutorial_done', { stage: k });
  snd('tutorial_done');
  T.fx = { view: T.view, t: 0 };
  T.cur = 0; T.pend = {};
  if (k === 3) startClock();
}
function updateTutorial(dt) {
  const T = S.tut;
  if (T.fx) { T.fx.t += dt; if (T.fx.t >= 0.6) T.fx = null; return; }
  if (T.cur && T.view && (T.pend[T.cur] || tutState(T.cur))) { completeStage(T.cur); return; }
  const c = tutChoose();
  T.cur = c;
  T.view = c ? tutView(c) : null;
  if (c && (!G.popup || c === 9) && T.shownSt[c] === undefined) { T.shownSt[c] = r1(RT); ev('tutorial_show', { stage: c }); }
}

// ───────── 輸入動作 ─────────
function cancelSteal(reason) {
  const s = G.steal; if (!s) return;
  G.steal = null;
  G.stat.steals.canceled++; snd('steal_cancel');
  ev('steal_cancel', { enemy: s.enemy.type, item: s.enemy.slots[s.index], reason });
}
function isMobileAlly(t) { return t.cat === 'soldier' || (t.cat === 'golem' && t.team === 'ally'); }
function doInstall(t, mode, item, swappedOut) {
  if (t.cat === 'pillar') t.changeAge = 0;
  ev('install', { item, to: unitKind(t), mode, swappedOut: swappedOut || null });
  G.stat.installs[mode]++;
  if (item === 'march' && t.cat === 'golem' && t.team === 'neutral') tutEv(10);
  if (item === 'drum' && isMobileAlly(t)) tutEv(12);
}
function popupZ() {
  const p = G.popup;
  if (p.type === 'shop') {
    const it = SHOP[p.index];
    if (p.index === 7 && !S.golemUnlocked) { p.msg = '尚未解鎖'; p.shake = 0; snd('ui_invalid'); }
    else if (G.gold < it[2]) { p.msg = '金幣不足'; p.shake = 0; snd('ui_invalid'); }
    else if (G.hand) { p.msg = '手上要空著'; p.shake = 0; snd('ui_invalid'); }
    else {
      G.gold -= it[2]; G.hand = it[0]; G.stat.goldSpent += it[2];
      G.stat.purchases[it[0]] = (G.stat.purchases[it[0]] || 0) + 1;
      ev('purchase', { item: it[0], price: it[2], goldAfter: G.gold });
      snd('purchase'); tutEv(5);
      closePopup();
    }
    return;
  }
  const t = p.target, i = p.index;
  if (p.mode === 'take') {
    const cell = t.slots[i];
    if (!cell) { p.shake = 0; snd('ui_invalid'); return; }
    G.hand = cell; t.slots[i] = null;
    if (t.cat === 'pillar') t.changeAge = 0;
    ev('take', { item: cell, from: unitKind(t) });
    snd('take_part');
    closePopup();
  } else {
    const cell = t.slots[i], h = G.hand;
    t.slots[i] = h; G.hand = cell;
    snd('swap_part');
    doInstall(t, 'replace', h, cell);
    tutEv(9);
    closePopup();
  }
}
function tryPlace() {
  const info = placeInfo(G.hand);
  if (!info.valid) { snd('ui_invalid'); return; }
  const k = G.hand;
  if (k === 'crossbowKit') G.towers.push(mkTower(info.x, info.y));
  else if (k === 'pillarKit') G.pillars.push(mkPillar(info.x, info.y));
  else if (k === 'soldierKit') G.soldiers.push(mkSoldier(info.x, info.y));
  else G.golems.push(mkGolem(info.x, info.y, 'ally'));
  ev('place', { kind: info.kind, x: Math.round(info.x), y: Math.round(info.y) });
  G.hand = null;
  snd('place_unit'); tutEv(6);
}
function zPress() {
  const P = G.player;
  if (G.steal) { cancelSteal('key'); return; }
  if (G.popup) { popupZ(); return; }
  if (KITS[G.hand]) { tryPlace(); return; }
  if (G.hand) { // 魂件 / 擴槽石
    const t = findInstallTarget();
    if (!t) {
      G.parts.push({ cat: 'part', item: G.hand, x: P.x, y: P.y, half: 14, spawnAge: 0.6, removed: false });
      ev('drop', { item: G.hand }); G.stat.drops++; G.hand = null; snd('drop_part');
      return;
    }
    if (t.cat === 'part') {
      const h = G.hand; G.hand = t.item; t.item = h;
      ev('ground_swap', { item: h, got: G.hand }); snd('swap_part');
      return;
    }
    if (G.hand === 'slotStone') {
      t.slots.push(null); ev('install', { item: 'slotStone', to: unitKind(t), mode: 'slotStone', swappedOut: null });
      G.stat.installs.slotStone++; G.hand = null; snd('slot_expand');
      return;
    }
    const ei = t.slots.findIndex(s => !s);
    if (ei >= 0) {
      const h = G.hand;
      t.slots[ei] = h; G.hand = null;
      snd('install_part'); doInstall(t, 'direct', h, null);
      return;
    }
    openPopup({ type: 'soul', mode: 'replace', target: t, index: 0, shake: 0.25, msg: '', x: 0, y: 0 });
    layoutPopup(G.popup);
    return;
  }
  const t = findTakeTarget();
  if (!t) return;
  if (t.cat === 'part') {
    G.hand = t.item; t.removed = true; G.parts = G.parts.filter(p => !p.removed);
    ev('take', { item: G.hand, from: 'ground' }); snd('take_part');
    return;
  }
  if (t.cat === 'enemy') {
    const idxs = []; t.slots.forEach((s, i) => { if (s) idxs.push(i); });
    const index = idxs[Math.floor(Math.random() * idxs.length)];
    G.steal = { enemy: t, index, t: 0 };
    G.stat.steals.started++; snd('steal_start');
    ev('steal_start', { enemy: t.type, item: t.slots[index] });
    return;
  }
  openPopup({ type: 'soul', mode: 'take', target: t, index: Math.max(0, t.slots.findIndex(s => s)), shake: 0.25, msg: '', x: 0, y: 0 });
  layoutPopup(G.popup);
}
function popupTitle(t) {
  if (t.cat === 'tower') return '弩塔';
  if (t.cat === 'pillar') return '魂柱';
  if (t.cat === 'soldier') return '步兵';
  if (t.cat === 'golem') return t.team === 'neutral' ? '中立石魔像' : '石魔像';
  if (t.cat === 'castle') return '主堡';
  if (t.cat === 'corpse') return ENEMY_DEF[t.kind].name + '的屍體';
  return ENEMY_DEF[t.type].name;
}
function layoutPopup(p) {
  const t = p.target, n = t.slots.length;
  const w = n * 48 + 120, h = 116;
  let x = t.x, y = t.y - t.half - 92;
  if (y - h / 2 < 50) y = t.y + t.half + h / 2 + 12;
  p.w = w; p.h = h;
  p.x = clamp(x, w / 2 + 4, W - w / 2 - 4); p.y = clamp(y, h / 2 + 4, H - h / 2 - 4);
}
function onKey(k) {
  if (G.screen === 'title') {
    if (k === 'L' || k === 'R') {
      let c = G.cursor + (k === 'R' ? 1 : -1);
      if (c >= 0 && c <= 4 && S.unlocked[c]) { G.cursor = c; snd('ui_move'); }
    } else if (k === 'Z') { snd('ui_confirm'); startLevel(G.cursor + 1); }
    else if (k === 'X') toggleMute();
    return;
  }
  if (G.screen === 'result') {
    const n = G.options.length;
    if (k === 'L' || k === 'R') { G.resultCursor = clamp(G.resultCursor + (k === 'R' ? 1 : -1), 0, n - 1); snd('ui_move'); }
    else if (k === 'Z' && G.resultT >= 0.5) {
      const o = G.options[G.resultCursor];
      snd('ui_confirm');
      if (o === '下一關') startLevel(G.level + 1);
      else if (o === '重玩' || o === '重來') startLevel(G.level);
      else toTitle();
    }
    return;
  }
  // 遊戲中
  const T = S.tut;
  if (k === 'L' || k === 'R' || k === 'U' || k === 'D') {
    if (T.cur === 1) {
      T.pressed[{ L: 'left', R: 'right', U: 'up', D: 'down' }[k]] = true;
      if (T.pressed.left && T.pressed.right && T.pressed.up && T.pressed.down) T.pend[1] = true;
    }
  }
  if (k === 'Z') { if (zNeedRelease) return; zPress(); }
  else if (k === 'X') {
    if (G.popup) closePopup(); else toggleMute();
  } else if (k === 'S') {
    if (G.steal || G.popup) return;
    if (dist(G.player, CASTLE_POS) <= 110) openPopup({ type: 'shop', target: null, index: 0, shake: 0.25, msg: '' });
  } else if (k === 'L' || k === 'R') {
    const p = G.popup;
    if (!p) return;
    const n = p.type === 'shop' ? 8 : p.target.slots.length;
    p.index = (p.index + (k === 'R' ? 1 : n - 1)) % n;
    if (p.type === 'shop') p.msg = '';
    snd('ui_move');
  }
}
const KEYMAP = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', KeyZ: 'Z', KeyX: 'X', Space: 'S' };
window.addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  if (!G.inited) { G.inited = true; try { if (typeof Sound !== 'undefined' && Sound.init) Sound.init(); } catch (err) { console.error(err); } setMusic(G.music); }
  if (k === 'L' || k === 'R' || k === 'U' || k === 'D') keys[k] = true;
  try { onKey(k); } catch (err) { console.error(err); }
  flushSnd();
});
window.addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (k === 'Z') zNeedRelease = false;
  if (k === 'L' || k === 'R' || k === 'U' || k === 'D') keys[k] = false;
});
window.addEventListener('blur', () => { keys.L = keys.R = keys.U = keys.D = false; zNeedRelease = false; });

// ───────── 繪製 ─────────
function basicKinds(slots) { return slots.filter(k => k && BASIC[k]); }
function slotCenterX(L, i, x) { return x - L * 10 + 10 + 20 * i; }
function render() {
  ctx.clearRect(0, 0, W, H);
  if (G.screen === 'title') {
    Art.drawTitle(ctx, {
      levels: LEVELS.map((l, i) => ({ name: l.name, unlocked: S.unlocked[i], bestStars: S.unlocked[i] ? S.best[i] : 0 })),
      cursorIndex: G.cursor, muted: S.muted, blinkTime: G.titleT
    });
    return;
  }
  drawScene();
}
function entityDrawList() {
  const L = [];
  const T = G.target;
  L.push({ y: G.castle.y, f: () => Art.drawCastle(ctx, { x: 1180, y: 434, hitAge: G.castle.hitAge, hitDuration: 0.3, attackAge: G.castle.attackAge, attackDuration: 0.15, zoneActive: dist(G.player, CASTLE_POS) <= 110, targeted: T === G.castle }) });
  G.towers.forEach(u => L.push({ y: u.y, f: () => Art.drawCrossbow(ctx, { x: u.x, y: u.y, attackAge: u.attackAge, attackDuration: 0.15, moving: u.moving, resonating: u.ev.resonating, targeted: T === u }) }));
  G.pillars.forEach(u => L.push({ y: u.y, f: () => Art.drawPillar(ctx, { x: u.x, y: u.y, kinds: basicKinds(u.slots), targeted: T === u }) }));
  const mob = (u) => {
    const ret = u.state === 'returning';
    return {
      x: u.x, y: u.y, hp: ret ? u.maxHp : u.hp, maxHp: u.maxHp, hitAge: u.hitAge, hitDuration: 0.2, attackAge: u.attackAge, attackDuration: 0.15,
      moving: u.moving, charging: ret ? false : u.charging, resonating: ret ? false : u.ev.resonating, returning: ret, targeted: T === u
    };
  };
  G.soldiers.forEach(u => { if (u.state !== 'gone') L.push({ y: u.y, f: () => Art.drawSoldier(ctx, mob(u)) }); });
  G.golems.forEach(u => {
    if (u.state === 'gone') return;
    L.push({
      y: u.y, f: () => {
        const s = mob(u); s.team = u.team;
        if (u.team === 'neutral') { s.hp = s.maxHp; s.charging = false; s.resonating = false; s.returning = false; }
        Art.drawGolem(ctx, s);
      }
    });
  });
  G.enemies.forEach(e => L.push({
    y: e.y, f: () => Art.drawEnemy(ctx, {
      type: e.type, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, hitAge: e.hitAge, hitDuration: 0.2, attackAge: e.attackAge, attackDuration: 0.15,
      moving: e.ev.singles.march > 0 || e.moving, slowed: e.slowT > 0 || e.auraSlow || stolenBy(e), stunAge: e.stunAge, stunDuration: 1.0, targeted: T === e
    })
  }));
  const P = G.player;
  L.push({ y: P.y, f: () => Art.drawPlayer(ctx, { x: P.x, y: P.y, moving: P.moving, handItem: G.hand, stealing: !!G.steal, stealProgress: G.steal ? Math.min(1, G.steal.t / 1.5) : 0 }) });
  L.sort((a, b) => a.y - b.y);
  return L;
}
function virtOf(u) { return u.ev.virt.map(v => ({ kind: v.kind, used: v.used })); }
function drawTut(afterPopup) {
  const T = S.tut;
  if (G.screen !== 'play') return;
  let v = null, doneAge = 0.6;
  if (T.fx) { v = T.fx.view; doneAge = T.fx.t; if (!v) return; if (!!G.popup !== afterPopup) return; }
  else {
    if (!T.cur || !T.view) return;
    if (G.popup) { if (!(afterPopup && T.cur === 9)) return; } else if (afterPopup) return;
    v = T.view;
  }
  Art.drawTutorial(ctx, { stage: v.stage, text: v.text, keys: v.keys, pressedKeys: v.pressedKeys, tipX: v.tipX, tipY: v.tipY, side: v.side, bodyX: v.bodyX, bodyY: v.bodyY, doneAge, doneDuration: 0.6 });
}
function drawScene() {
  const P = G.player, T = G.target;
  Art.drawBackground(ctx, { paths: LV.paths.map(p => p.map(q => [q[0], q[1]])) });
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
  // 魂件槽列(玩家沒有)
  const sl = (u, x, y) => Art.drawSoulSlots(ctx, { x, y, slots: u.slots.slice(), virtual: u.state === 'normal' ? virtOf(u) : [] });
  G.towers.forEach(u => sl(u, u.x, u.y - 44));
  G.pillars.forEach(u => Art.drawSoulSlots(ctx, { x: u.x, y: u.y - 38, slots: u.slots.slice(), virtual: [] }));
  G.soldiers.forEach(u => { if (u.state !== 'gone') sl(u, u.x, u.y - 36); });
  G.golems.forEach(u => { if (u.state === 'gone') return; if (u.team === 'ally') sl(u, u.x, u.y - 48); else Art.drawSoulSlots(ctx, { x: u.x, y: u.y - 48, slots: u.slots.slice(), virtual: [] }); });
  sl(G.castle, 1180, 358);
  G.corpses.forEach(c => Art.drawSoulSlots(ctx, { x: c.x, y: c.y - c.half - 12, slots: c.slots.slice(), virtual: [] }));
  G.enemies.forEach(e => { if (T === e || stolenBy(e)) Art.drawSoulSlots(ctx, { x: e.x, y: e.y - e.half - 20, slots: e.slots.slice(), virtual: [] }); });
  // 投射物與特效
  G.projs.forEach(p => Art.drawProjectile(ctx, { x: p.x, y: p.y, angle: p.angle, kind: p.kind, owner: p.owner }));
  G.beams.forEach(b => Art.drawPierceBeam(ctx, { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, age: b.age, duration: 0.15 }));
  G.areas.forEach(a => Art.drawAreaHit(ctx, { kind: a.kind, x: a.x, y: a.y, radius: a.radius, angle: a.angle, age: a.age, duration: 0.3 }));
  G.sparks.forEach(s => Art.drawHitSpark(ctx, { x: s.x, y: s.y, age: s.age, duration: 0.25 }));
  G.breaks.forEach(b => Art.drawUnitBreak(ctx, { kind: b.kind, x: b.x, y: b.y, age: b.age, duration: 0.5 }));
  if (G.steal) {
    const e = G.steal.enemy, L = e.slots.length;
    Art.drawStealLink(ctx, { x1: P.x, y1: P.y, x2: slotCenterX(L, G.steal.index, e.x), y2: e.y - e.half - 20, progress: Math.min(1, G.steal.t / 1.5) });
  }
  G.names.forEach(n => { if (n.unit.state !== 'gone') Art.drawComboName(ctx, { x: n.unit.x, y: n.unit.y - n.unit.half - 44, name: n.name, isNew: n.isNew, age: n.age, duration: 1.5 }); });
  // 預警
  if (G.clockOn && G.waveStarted < LV.waves.length) {
    const rem = LV.t1 + G.waveStarted * LV.gap - G.clock;
    if (rem > 0 && rem <= 6) {
      const used = {};
      LV.waves[G.waveStarted].forEach(g => { used[g.sp] = true; });
      LV.spawns.forEach((s, i) => { if (used[i]) Art.drawSpawnWarning(ctx, { x: s.x, y: s.y, angle: s.ang, remaining: rem, total: 6 }); });
    }
  }
  if (G.screen === 'play' && !G.popup) {
    const lb = actionLabel();
    if (lb) Art.drawActionHint(ctx, { x: P.x, y: P.y + 30, label: lb });
  }
  drawTut(false);
  const hpShow = Math.max(0, G.castleHp);
  Art.drawHud(ctx, {
    level: G.level, levelName: LV.name, gold: G.gold, castleHp: hpShow, castleMaxHp: 20, wave: G.wave, totalWaves: LV.waves.length,
    nextWaveIn: G.waveStarted < LV.waves.length ? Math.max(0, Math.ceil(LV.t1 + G.waveStarted * LV.gap - G.clock)) : -1,
    clockPaused: !G.clockOn, combos: S.combos.slice(), muted: S.muted
  });
  if (G.popup) {
    Art.drawSlowMo(ctx);
    drawPopup();
  }
  drawTut(true);
  if (G.screen === 'result') {
    Art.drawResult(ctx, {
      win: G.win, allClear: G.win && G.level === 5, level: G.level, levelName: LV.name, wave: G.wave, totalWaves: LV.waves.length,
      castleHp: hpShow, castleMaxHp: 20, stars: G.stars, starAge: Math.min(1.2, G.resultT), starDuration: 1.2,
      comboCount: S.combos.filter(Boolean).length, options: G.options.slice(), cursorIndex: G.resultCursor
    });
  }
}
function drawPopup() {
  const p = G.popup;
  if (p.type === 'shop') {
    const items = SHOP.map((s, i) => ({
      item: s[0], name: s[1], price: s[2],
      state: (i === 7 && !S.golemUnlocked) ? 'locked' : (G.gold < s[2] ? 'poor' : 'ok')
    }));
    Art.drawShopPopup(ctx, { items, cursorIndex: p.index, message: p.msg, shakeAge: p.shake, shakeDuration: 0.25 });
    return;
  }
  const t = p.target;
  layoutPopup(p);
  let label = '';
  if (p.mode === 'take') label = t.slots[p.index] ? '拿起' : '';
  else label = '互換';
  Art.drawSoulPopup(ctx, {
    mode: p.mode, x: p.x, y: p.y, w: p.w, h: p.h, title: popupTitle(t), slots: t.slots.slice(), index: p.index,
    hand: p.mode === 'replace' ? G.hand : null, actionLabel: label, shakeAge: p.shake, shakeDuration: 0.25
  });
}

// ───────── 主迴圈 ─────────
let lastTs = null;
function frame(ts) {
  requestAnimationFrame(frame);
  const raw = lastTs === null ? 0 : (ts - lastTs) / 1000;
  lastTs = ts;
  RT += Math.max(0, raw);
  const dt = clamp(raw, 0, 1 / 30);
  try { update(dt); render(); } catch (err) { console.error(err); }
}
toTitle();
requestAnimationFrame(frame);
