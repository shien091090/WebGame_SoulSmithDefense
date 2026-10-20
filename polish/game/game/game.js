'use strict';
// 魂匠守衛者(打磨版第 2 輪) — 玩法驗證 Demo。邏輯與繪製分離: update 改狀態, render 只呼叫 Art.drawXxx。

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
const ATTACK = { ranged: 1, melee: 1, frost: 1, pierce: 1, iceArrow: 1, whirl: 1, frostSmash: 1 };
const COMBO_KIND = ['pierce', 'iceArrow', 'whirl', 'frostSmash', 'charge'];
const COMBO_NAME = ['穿透箭', '冰箭', '旋風斬', '冰霜重擊', '衝鋒'];
const COMBO_IDX = { pierce: 0, iceArrow: 1, whirl: 2, frostSmash: 3, charge: 4 };
const RECIPES = [['ranged', 'ranged'], ['ranged', 'frost'], ['melee', 'melee'], ['melee', 'frost'], ['drum', 'melee']];
const KITS = { crossbowKit: 1, pillarKit: 1 };
const KIT_NAME = { crossbowKit: 'crossbow', pillarKit: 'pillar', soldierKit: 'soldier', golemKit: 'golem' };
const CASTLE_POS = { x: 1180, y: 434, half: 56 };
const CASTLE_DOOR = { x: 1124, y: 434 };
const SHOP = [['pillarKit', '魂柱', 12], ['crossbowKit', '弩塔', 15], ['soldierKit', '步兵', 12], ['golemKit', '石魔像', 18]];
const PRICE = { pillar: 12, tower: 15 };
const DESC = {
  ranged: ['遠攻', '射箭打遠處的敵人'], melee: ['近戰', '近身砍擊敵人'], frost: ['冰霜', '讓敵人變慢, 攻擊會帶冰'],
  seek: ['自動索敵', '主動追打附近的敵人'], march: ['進攻主堡', '走回主堡, 建築會退款'], drum: ['行軍', '沿路往敵人出口推進'],
  pierce: ['穿透箭', '一箭貫穿整排敵人', ['ranged', 'ranged']], iceArrow: ['冰箭', '射出讓敵人大減速的箭', ['ranged', 'frost']],
  whirl: ['旋風斬', '砍擊身邊一圈敵人', ['melee', 'melee']], frostSmash: ['冰霜重擊', '重擊並凍慢一片敵人', ['melee', 'frost']],
  charge: ['衝鋒', '沿路衝撞, 撞飛敵人', ['drum', 'melee']], shop: ['購買', '裝在誰身上, 誰旁邊開店']
};
const ENEMY_DEF = {
  imp: { name: '小鬼', hp: 40, speed: 45, half: 16, items: ['melee', 'march'], coins: 1, dmg: 2 },
  archer: { name: '弓鬼', hp: 30, speed: 50, half: 16, items: ['ranged', 'march'], coins: 2, dmg: 2 },
  ice: { name: '冰鬼', hp: 50, speed: 42, half: 16, items: ['frost', 'march'], coins: 2, dmg: 2 },
  drummer: { name: '鼓鬼', hp: 45, speed: 48, half: 18, items: ['drum', 'march'], coins: 2, dmg: 2 },
  brute: { name: '狂鬼', hp: 80, speed: 40, half: 22, items: ['melee', 'seek', 'march'], coins: 3, dmg: 3 }
};
const KIND_OF = { tower: 'crossbow', pillar: 'pillar', soldier: 'soldier', castle: 'castle', corpse: 'corpse', enemy: 'enemy', player: 'player' };
function isSoul(h) { return !!h && !KITS[h]; }

// ───────── 關卡資料 ─────────
function gp(sp, pairs) { return { sp, list: pairs }; } // 一組出怪: 出怪點序號 + [[種類, 隻數], ...]
const LEVELS = [
  {
    name: '初陣', gold: 30, cap: 1, mul: 1.0, t1: 15, gap: 24,
    paths: [[[0, 290], [600, 290], [600, 434], [1180, 434]]],
    spawns: [{ name: 'A', x: 40, y: 290, ang: 0 }],
    towers: [[408, 362, ['ranged']], [504, 362, ['ranged']]], soldiers: [], neutrals: [],
    waves: [
      [gp(0, [['imp', 4]])],
      [gp(0, [['imp', 6]])],
      [gp(0, [['imp', 4], ['archer', 3]])],
      [gp(0, [['imp', 6], ['archer', 2], ['ice', 2]])]
    ]
  },
  {
    name: '雙路', gold: 40, cap: 2, mul: 1.0, t1: 15, gap: 26,
    paths: [[[0, 194], [720, 194], [720, 434], [1180, 434]], [[0, 626], [720, 626], [720, 434], [1180, 434]]],
    spawns: [{ name: '北', x: 40, y: 194, ang: 0 }, { name: '南', x: 40, y: 626, ang: 0 }],
    towers: [[456, 266, ['ranged']], [456, 554, ['ranged']]], soldiers: [], neutrals: [],
    waves: [
      [gp(0, [['imp', 5]])],
      [gp(1, [['imp', 3], ['archer', 3]])],
      [gp(0, [['imp', 4], ['archer', 2]]), gp(1, [['imp', 4]])],
      [gp(0, [['archer', 3], ['ice', 2]]), gp(1, [['imp', 5]])],
      [gp(0, [['imp', 4], ['ice', 2]]), gp(1, [['archer', 3], ['ice', 2], ['brute', 1]])]
    ]
  },
  {
    name: '長蛇', gold: 40, cap: 2, mul: 1.1, t1: 15, gap: 28,
    paths: [[[0, 146], [1000, 146], [1000, 290], [300, 290], [300, 578], [860, 578], [860, 434], [1180, 434]]],
    spawns: [{ name: 'A', x: 40, y: 146, ang: 0 }],
    towers: [[504, 218, ['ranged']], [600, 506, ['ranged']]], soldiers: [], neutrals: [[600, 434]],
    waves: [
      [gp(0, [['imp', 6]])],
      [gp(0, [['imp', 4], ['archer', 3]])],
      [gp(0, [['ice', 3], ['imp', 4]])],
      [gp(0, [['brute', 2], ['archer', 3], ['imp', 3]])],
      [gp(0, [['brute', 3], ['ice', 3], ['archer', 3]])]
    ]
  },
  {
    name: '夾擊', gold: 45, cap: 3, mul: 1.2, t1: 15, gap: 26,
    paths: [[[360, 50], [360, 434], [1180, 434]], [[360, 720], [360, 434], [1180, 434]]],
    spawns: [{ name: '上', x: 360, y: 90, ang: Math.PI / 2 }, { name: '下', x: 360, y: 690, ang: -Math.PI / 2 }],
    towers: [[456, 314, ['ranged']], [456, 554, ['ranged']]], soldiers: [[640, 490]], neutrals: [],
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
    name: '三叉', gold: 50, cap: 3, mul: 1.35, t1: 15, gap: 24,
    paths: [[[0, 146], [720, 146], [720, 434], [1180, 434]], [[0, 434], [1180, 434]], [[0, 674], [720, 674], [720, 434], [1180, 434]]],
    spawns: [{ name: '北', x: 40, y: 146, ang: 0 }, { name: '中', x: 40, y: 434, ang: 0 }, { name: '南', x: 40, y: 674, ang: 0 }],
    towers: [[456, 218, ['ranged']], [456, 602, ['ranged']]], soldiers: [], neutrals: [[960, 290], [960, 578]],
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

// ───────── 狀態 ─────────
const keys = { L: false, R: false, U: false, D: false };
let zNeedRelease = false;
let RT = 0; // 真實秒數(未夾 dt, 埋點用)
let hideAt = null;

// 這次開網頁期間的狀態(重新整理才重置)
const S = {
  unlocked: [true, false, false, false, false], best: [0, 0, 0, 0, 0], attempts: [0, 0, 0, 0, 0], fails: [0, 0, 0, 0, 0],
  combos: [false, false, false, false, false], golemUnlocked: false, muted: false,
  tut: { done: [], shownSt: [], doneSt: [], cur: 0, fx: null, view: null, pend: {}, pressed: {}, late: {} }
};
const G = { screen: 'title', cursor: 0, titleT: 0, sq: [], music: null, inited: false, level: 1, popup: null, steal: null, hand: null, flag: null, fuseSnd: 0, comboSnd: 0 };

function emptyEv() {
  return { matched: [], effects: [], singles: { ranged: 0, melee: 0, frost: 0, seek: 0, march: 0, drum: 0 }, virt: [], resonating: false, ice: false, aura: false, charge: false, ranged: false };
}
function mkUnit(cat, x, y, half, slots) {
  return {
    cat, x, y, half, slots, cd: {}, ev: emptyEv(),
    hitAge: 0.2, attackAge: 0.15, moving: false, charging: false, state: 'normal',
    hp: 1, maxHp: 1, slowT: 0, auraSlow: false, home: { x, y }, m: null, awayT: 0, flagObj: null,
    prevCombos: [0, 0, 0, 0, 0], comboLast: [-99, -99, -99, -99, -99], removed: false, chHit: new Map()
  };
}
function nulls(n) { const a = []; for (let i = 0; i < n; i++) a.push(null); return a; }
function mkTower(x, y) { const u = mkUnit('tower', x, y, 24, nulls(2)); u.price = PRICE.tower; return u; }
function mkPillar(x, y) { const u = mkUnit('pillar', x, y, 18, nulls(1)); u.changeAge = 0.5; u.price = PRICE.pillar; return u; }
function mkSoldier(x, y) {
  const u = mkUnit('soldier', x, y, 16, ['melee', 'seek']);
  u.team = 'ally'; u.hp = u.maxHp = 80; return u;
}
function mkGolem(x, y, team) {
  const u = mkUnit('golem', x, y, 28, team === 'ally' ? ['seek', null, null] : nulls(3));
  u.team = team; u.hp = u.maxHp = 220;
  if (team !== 'ally') { u.wx = x; u.wy = y; u.wanderT = 0; }
  return u;
}

let LV = null; // 目前關卡資料(含 lanes)
function prepLevel(n) {
  const base = LEVELS[n - 1];
  LV = Object.assign({}, base, { n, lanes: base.paths.map(mkPath) });
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
    gameSec: 0, slowMoSec: 0, hiddenSec: 0, leaks: 0, leaksByWave: [], leaksBySpawn: {}, kills: 0, playerKills: 0, playerHits: 0,
    goldEarned: 0, goldRefund: 0, goldSpent: 0, purchases: {}, pillarsMax: 0,
    steals: { started: 0, done: 0, canceled: 0 }, installs: { direct: 0, replace: 0 }, fuses: {}, drops: 0, groundExpired: 0,
    demolishes: 0, homeRefunds: 0, flags: { purchase: 0, rally: 0 }, unitDowns: 0, maxRespawnQueue: 0, marchLoops: 0, recruits: 0, combosNew: []
  };
}

// ───────── 聲音(防呆: sound.js 沒載入也不當) ─────────
let lastArrowRT = -9;
function snd(name) { if (G.sq.indexOf(name) < 0) G.sq.push(name); }
function composeComboSnd() {
  const f = G.fuseSnd, c = G.comboSnd;
  G.fuseSnd = 0; G.comboSnd = 0;
  if (!f && !c) return;
  if (f === 2 || c === 2) snd('combo_new');
  else if (f) snd('fuse');
  else snd('combo');
}
function flushSnd() {
  composeComboSnd();
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
  G.pillars = [];
  G.soldiers = LV.soldiers.map(s => mkSoldier(s[0], s[1]));
  G.golems = LV.neutrals.map(g => mkGolem(g[0], g[1], 'neutral'));
  G.enemies = []; G.corpses = []; G.parts = []; G.coins = []; G.flags = [];
  G.projs = []; G.beams = []; G.areas = []; G.sparks = []; G.names = []; G.breaks = [];
  G.castle = mkUnit('castle', 1180, 434, 56, nulls(3));
  G.castle.slots[0] = 'shop';
  G.castle.hitAge = 0.3;
  G.player = mkUnit('player', 1060, 560, 16, []);
  G.hand = null; G.flag = null; G.popup = null; G.steal = null; G.target = null;
  G.rq = []; G.rqT = 0; G.fuseSnd = 0; G.comboSnd = 0;
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
  G.log = { t0: RT, events: [] };
  G.clockOn = !(n === 1 && !S.tut.done[5]);
  const T = S.tut; T.cur = 0; T.fx = null; T.view = null; T.pend = {}; T.pressed = {};
  ev('level_start', { level: n, attempt: S.attempts[n - 1] });
  if (G.clockOn) ev('clock_start', { reason: 'immediate' });
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
  for (let k = 1; k <= 14; k++) tut[String(k)] = { shownSt: T.shownSt[k] === undefined ? null : T.shownSt[k], doneSt: T.doneSt[k] === undefined ? null : T.doneSt[k] };
  const summary = {
    level: G.level, levelName: LV.name, attempt: S.attempts[G.level - 1], failsBefore: win ? S.fails[G.level - 1] : S.fails[G.level - 1] - 1,
    result: win ? 'win' : 'lose', durationSec: r1(RT - G.log.t0), gameSec: r1(st.gameSec), slowMoSec: r1(st.slowMoSec), hiddenSec: r1(st.hiddenSec),
    waveReached: G.wave, totalWaves: LV.waves.length, castleHp: hp, stars, leaks: st.leaks, leaksByWave: st.leaksByWave, leaksBySpawn: st.leaksBySpawn,
    kills: st.kills, playerKills: st.playerKills, playerHits: st.playerHits,
    goldEarned: st.goldEarned, goldRefund: st.goldRefund, goldSpent: st.goldSpent, goldEnd: G.gold, purchases: st.purchases,
    pillarCap: LV.cap, pillarsMax: st.pillarsMax, steals: st.steals, installs: st.installs, fuses: st.fuses,
    drops: st.drops, groundExpired: st.groundExpired, demolishes: st.demolishes, homeRefunds: st.homeRefunds, flags: st.flags,
    unitDowns: st.unitDowns, maxRespawnQueue: st.maxRespawnQueue, marchLoops: st.marchLoops, recruits: st.recruits,
    combosFoundThisLevel: st.combosNew, combosFoundTotal: S.combos.filter(Boolean).length
  };
  downloadLog({ game: 'SoulSmithDefense', version: 'polish-2', summary, tutorial: tut, events: G.log.events });
  setMusic(null);
  snd(win ? 'level_win' : 'level_lose');
}

// ───────── 單位分類 ─────────
function unitKind(u) {
  if (u.cat === 'golem') return u.team === 'neutral' ? 'neutral' : 'golem';
  return KIND_OF[u.cat];
}
function hasItem(u) { return u.slots.some(s => !!s); }
function isMobileAlly(t) { return t.cat === 'soldier' || (t.cat === 'golem' && t.team === 'ally'); }
function allyMobile() { return G.soldiers.concat(G.golems.filter(g => g.team === 'ally')); }
function allyAlive() { return allyMobile().filter(u => u.state === 'normal'); }
function liveEnemies() { return G.enemies.filter(e => !e.dead && !e.gone); }
function canFuseUnit(u) { return u.cat === 'tower' || u.cat === 'pillar' || u.cat === 'castle' || u.cat === 'soldier' || (u.cat === 'golem' && u.team === 'ally'); }
function ownUnits() { // 我方建築 + 移動單位(含各種狀態) + 主堡
  return G.towers.concat(G.pillars, G.soldiers, G.golems.filter(g => g.team === 'ally'), [G.castle]);
}

// ───────── 合成 / 組合評估 ─────────
function findFuse(slots) {
  for (let ci = 0; ci < 5; ci++) {
    const a = RECIPES[ci][0], b = RECIPES[ci][1];
    for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
      const x = slots[i], y = slots[j];
      if ((x === a && y === b) || (x === b && y === a)) return { ci, i, j, mats: [x, y] };
    }
  }
  return null;
}
function tryFuse(u) {
  const out = [];
  if (!canFuseUnit(u)) return out;
  for (let guard = 0; guard < 6; guard++) {
    const f = findFuse(u.slots);
    if (!f) break;
    u.slots[f.i] = COMBO_KIND[f.ci]; u.slots[f.j] = null;
    out.push(f);
  }
  return out;
}
function wouldFuseAfterSwap(u, idx, item) {
  const s = u.slots.slice(); s[idx] = item;
  return !!findFuse(s);
}
function popName(u, ci) {
  const isNew = !S.combos[ci];
  if (!isNew && G.time - u.comboLast[ci] < 4) return 0;
  u.comboLast[ci] = G.time;
  if (isNew) { S.combos[ci] = true; G.stat.combosNew.push(COMBO_NAME[ci]); ev('combo_new', { name: COMBO_NAME[ci], unit: unitKind(u) }); }
  G.names.push({ unit: u, name: COMBO_NAME[ci], isNew, age: 0 });
  return isNew ? 2 : 1;
}
// 槽位改變後: 魂柱波紋、檢查合成
function afterSlotsChange(t) {
  if (t.cat === 'pillar') t.changeAge = 0;
  const fs = tryFuse(t);
  for (const f of fs) {
    const nm = COMBO_NAME[f.ci];
    G.stat.fuses[nm] = (G.stat.fuses[nm] || 0) + 1;
    ev('fuse', { item: COMBO_KIND[f.ci], unit: unitKind(t), materials: f.mats });
    const r = popName(t, f.ci);
    G.fuseSnd = Math.max(G.fuseSnd, r === 2 ? 2 : 1);
    tutEv(9);
    if (f.ci === 4) tutEv(14);
  }
  return fs.length;
}

function evalUnit(u, virt, canMove, noAttack) {
  const real = [], realCombo = [];
  for (const k of u.slots) {
    if (!k) continue;
    if (BASIC[k]) real.push({ kind: k, used: false, v: false });
    else if (COMBO_IDX[k] !== undefined) realCombo.push(COMBO_IDX[k]);
  }
  const vb = [], vcombo = [];
  for (const v of virt) {
    v.used = true;
    if (BASIC[v.kind]) vb.push({ kind: v.kind, used: false, v: true });
    else if (COMBO_IDX[v.kind] !== undefined) vcombo.push(COMBO_IDX[v.kind]);
  }
  function take(kind) {
    for (const o of vb) if (!o.used && o.kind === kind) { o.used = true; return o; }
    for (const o of real) if (!o.used && o.kind === kind) { o.used = true; return o; }
    return null;
  }
  const matched = [];
  for (let ci = 0; ci < 5; ci++) {
    if (ci === 4 && !canMove) continue;
    const a = RECIPES[ci][0], b = RECIPES[ci][1];
    for (let g = 0; g < 8; g++) {
      const x = take(a);
      if (!x) break;
      const y = take(b);
      if (!y) { x.used = false; break; }
      if (!x.v && !y.v) { x.used = false; y.used = false; break; }
      matched.push(ci);
    }
  }
  const singles = { ranged: 0, melee: 0, frost: 0, seek: 0, march: 0, drum: 0 };
  for (const o of real) if (!o.used) singles[o.kind]++;
  for (const o of vb) if (!o.used) singles[o.kind]++;
  const groups = realCombo.concat(vcombo, matched);
  const effects = [], seen = [0, 0, 0, 0, 0];
  if (!noAttack) {
    for (const ci of groups) { if (ci === 4) continue; seen[ci]++; effects.push({ key: 'c' + ci + '_' + seen[ci], t: COMBO_KIND[ci] }); }
    if (singles.ranged) effects.push({ key: 's_ranged', t: 'ranged', n: singles.ranged });
    if (singles.melee) effects.push({ key: 's_melee', t: 'melee', n: singles.melee });
  }
  const ranged = !noAttack && (singles.ranged > 0 || groups.indexOf(0) >= 0 || groups.indexOf(1) >= 0);
  const ice = !noAttack && singles.frost > 0 && effects.length > 0;
  const aura = !noAttack && singles.frost > 0 && effects.length === 0;
  u.ev = { matched, effects, singles, virt, resonating: !noAttack && virt.length > 0, ice, aura, charge: canMove && groups.indexOf(4) >= 0, ranged };
}
function evalEnemy(e) {
  const singles = { ranged: 0, melee: 0, frost: 0, seek: 0, march: 0, drum: 0 };
  for (const k of e.slots) if (k && BASIC[k]) singles[k]++;
  const effects = [];
  if (singles.ranged) effects.push({ key: 's_ranged', t: 'ranged', n: singles.ranged });
  if (singles.melee) effects.push({ key: 's_melee', t: 'melee', n: singles.melee });
  e.ev = { matched: [], effects, singles, virt: [], resonating: false, ice: false, aura: singles.frost > 0, charge: false, ranged: singles.ranged > 0 };
}
function activeTowers() { return G.towers.filter(t => t.state === 'normal'); }
function receivers() { return activeTowers().concat(allyAlive(), [G.castle], [G.player]); }
function pillarVirt(r) {
  const ps = G.pillars.filter(p => p.state === 'normal' && !p.removed && dist(p, r) <= 150).map(p => ({ p, d: dist(p, r) })).sort((a, b) => a.d - b.d);
  const virt = [];
  for (const o of ps) { const k = o.p.slots[0]; if (k && ATTACK[k]) virt.push({ kind: k, used: true, pillar: o.p }); }
  return virt;
}
function computeEvals() {
  for (const r of receivers()) evalUnit(r, pillarVirt(r), r.cat !== 'castle' && r.cat !== 'player', false);
  for (const p of G.pillars) evalUnit(p, [], p.state === 'normal', true);
  for (const u of allyMobile()) if (u.state !== 'normal') { u.ev = emptyEv(); u.prevCombos = [0, 0, 0, 0, 0]; }
  for (const t of G.towers) if (t.state !== 'normal') t.ev = emptyEv();
  for (const g of G.golems) if (g.team === 'neutral') g.ev = emptyEv();
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
function unitDown(t) {
  t.state = 'gone'; t.m = null; t.moving = false; t.charging = false; t.downAt = G.time; t.chHit = new Map();
  G.breaks.push({ kind: t.cat === 'soldier' ? 'soldier' : 'golem', x: t.x, y: t.y, age: 0 });
  G.rq.push(t);
  if (G.rq.length === 1) G.rqT = 0;
  G.stat.unitDowns++; G.stat.maxRespawnQueue = Math.max(G.stat.maxRespawnQueue, G.rq.length);
  snd('unit_down');
  ev('unit_down', { unit: t.cat, x: Math.round(t.x), y: Math.round(t.y), queueLen: G.rq.length });
}
// o: { src: 'player' | 'unit' | 'enemy', frost: bool }
function hurt(t, amt, o) {
  if (t.dead || t.state === 'gone') return;
  const src = o && o.src;
  t.hp -= amt; t.hitAge = 0;
  G.sparks.push({ x: t.x, y: t.y, frost: !!(o && o.frost), age: 0 });
  if (t.cat === 'enemy' && src === 'player') { G.stat.playerHits++; tutEv(8); }
  if (t.hp <= 0) {
    t.hp = 0;
    if (t.cat === 'enemy') {
      t.dead = true; G.stat.kills++; snd('enemy_die');
      if (src === 'player') { G.stat.playerKills++; ev('player_kill', { enemy: t.type }); }
    } else unitDown(t);
  }
}
function slowIt(t) { t.slowT = 2; }
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
function contact(u, t) { return dist(u, t) <= u.half + t.half + 12; }
function spawnProj(u, t, kind, dmg, owner, src) {
  G.projs.push({ x: u.x, y: u.y, angle: Math.atan2(t.y - u.y, t.x - u.x), kind, owner, dmg, target: t, travel: 0, src });
}
function runAttacks(u, side, gdt, src) {
  const hostiles = side === 'ally' ? liveEnemies() : allyAlive();
  for (const k in u.cd) if (u.cd[k] > 0) u.cd[k] = Math.max(0, u.cd[k] - gdt);
  const ice = u.ev.ice;
  const ho = { src, frost: ice };
  let standing = false;
  for (const ef of u.ev.effects) {
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
      case 'ranged': spawnProj(u, tgt, ice ? 'ice' : 'normal', 10 * ef.n, side, src); snd(side === 'ally' ? 'arrow_shot' : 'enemy_shot'); break;
      case 'melee': hurt(tgt, 14 * ef.n, ho); if (ice) slowIt(tgt); if (side === 'ally') snd('melee_hit'); break;
      case 'iceArrow': spawnProj(u, tgt, 'ice', 10, side, src); snd('arrow_shot'); break;
      case 'pierce': {
        const ang = Math.atan2(tgt.y - u.y, tgt.x - u.x);
        const x2 = u.x + Math.cos(ang) * 260, y2 = u.y + Math.sin(ang) * 260;
        G.beams.push({ x1: u.x, y1: u.y, x2, y2, frost: ice, age: 0 });
        for (const h of hostiles) if (segProject(u.x, u.y, x2, y2, h.x, h.y).d <= 14) { hurt(h, 14, ho); if (ice) slowIt(h); }
        snd('pierce_shot');
        break;
      }
      case 'whirl':
        G.areas.push({ kind: 'whirl', x: u.x, y: u.y, radius: 60, angle: 0, frost: ice, age: 0 });
        for (const h of hostiles) if (dist(u, h) <= 60) { hurt(h, 16, ho); if (ice) slowIt(h); }
        snd('whirl');
        break;
      case 'frostSmash':
        G.areas.push({ kind: 'frostSmash', x: tgt.x, y: tgt.y, radius: 60, angle: 0, frost: false, age: 0 });
        hurt(tgt, 16, { src, frost: true });
        for (const h of hostiles) if (h === tgt || dist(h, tgt) <= 60) slowIt(h);
        snd('melee_hit');
        break;
    }
  }
  return standing;
}
// 衝鋒衝撞: 每隻進入碰觸距離的敵人(同一隻 1 秒內只撞一次)受傷、被撞退 60、暈眩 1 秒
function chargeHits(u) {
  if (u.state !== 'normal' || !u.ev.charge) return;
  const ice = u.ev.ice;
  for (const h of liveEnemies()) {
    if (!contact(u, h)) continue;
    const last = u.chHit.get(h);
    if (last !== undefined && G.time - last < 1.0) continue;
    u.chHit.set(h, G.time);
    u.attackAge = 0;
    hurt(h, 30, { src: 'unit', frost: ice });
    if (h.dead) { G.areas.push({ kind: 'charge', x: h.x, y: h.y, radius: 30, angle: Math.atan2(h.y - u.y, h.x - u.x), frost: ice, age: 0 }); snd('charge_hit'); continue; }
    if (ice) slowIt(h);
    const ang = knockBack(h, u);
    h.stunAge = 0;
    G.areas.push({ kind: 'charge', x: h.x, y: h.y, radius: 30, angle: ang, frost: ice, age: 0 });
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
function routeDist(x, y) {
  let m = 1e9;
  for (const P of LV.lanes) m = Math.min(m, pathProject(P, x, y).d);
  return m;
}
function targetLane(u) { // 離集結點最近的路線(一樣近取列在前面的)
  let bi = 0, bd = 1e9;
  LV.lanes.forEach((P, i) => { const d = pathProject(P, u.home.x, u.home.y).d; if (d < bd - 1e-6) { bd = d; bi = i; } });
  return bi;
}
// 行軍 / 衝鋒: 走到目標路線 → 逆向走到出怪點 → 走出畫面 → 消失 1 秒 → 從主堡門出來繼續
function routeMarch(u, spd, dt) {
  let m = u.m;
  if (!m) m = u.m = { phase: 'to', lane: targetLane(u), s: 0 };
  const P = LV.lanes[m.lane];
  if (m.phase === 'to') {
    const pr = pathProject(P, u.x, u.y);
    if (pr.d > 1.5) { moveToward(u, pr.x, pr.y, spd, dt); return; }
    m.s = pr.s; m.phase = 'rev';
  }
  if (m.phase === 'rev') {
    m.s = Math.max(0, m.s - spd * dt);
    const q = pathPoint(P, m.s);
    u.x = q.x; u.y = q.y; u.moving = true;
    if (m.s <= 0) {
      const a = P.pts[0], b = P.pts[1], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      m.phase = 'out'; m.out = u.half + 8; m.dx = (a[0] - b[0]) / d; m.dy = (a[1] - b[1]) / d;
    }
    return;
  }
  if (m.phase === 'out') {
    const mv = Math.min(spd * dt, m.out);
    u.x += m.dx * mv; u.y += m.dy * mv; m.out -= mv; u.moving = true;
    if (m.out <= 0.0001) {
      u.state = 'away'; u.awayT = 1.0; u.moving = false; u.charging = false;
      G.stat.marchLoops++;
      ev('march_loop', { unit: unitKind(u), path: LV.spawns[m.lane].name });
      u.m = { phase: 'door', lane: m.lane, s: 0 };
    }
  }
}
function returnHome(u, spd, dt) {
  if (Math.hypot(u.x - u.home.x, u.y - u.home.y) > 0.5) moveToward(u, u.home.x, u.home.y, spd, dt);
}
function homeRefund(u) {
  const price = u.price;
  G.gold += price; G.stat.goldRefund += price;
  const parts = [];
  let k = 0;
  for (const it of u.slots) {
    if (!it) continue;
    G.parts.push(mkPart(it, 1052 + 32 * k, 580, 0)); parts.push(it); k++;
  }
  u.removed = true;
  G.stat.homeRefunds++;
  ev('home_refund', { unit: unitKind(u), refund: price, parts });
  snd('home_refund');
}
function allyBehavior(u, dt, standing) {
  u.moving = false; u.charging = false;
  if (u.cat === 'castle') return;
  const ev2 = u.ev, mult = speedMult(u), s = ev2.singles;
  if (!ev2.charge && !(s.drum > 0)) u.m = null;
  if (ev2.charge) { routeMarch(u, 90 * mult, dt); u.charging = u.moving; return; }
  if (standing) return;
  if (s.drum > 0) { routeMarch(u, 50 * mult, dt); return; }
  if (s.seek > 0) {
    const tgt = nearest(u, liveEnemies(), t => Math.hypot(t.x - u.home.x, t.y - u.home.y) <= 200);
    if (tgt) {
      const stop = ev2.ranged ? 180 : u.half + tgt.half + 6;
      if (dist(u, tgt) > stop) moveToward(u, tgt.x, tgt.y, Math.min(70 * s.seek, 140) * mult, dt);
      return;
    }
    if (!(s.march > 0)) { returnHome(u, 80 * mult, dt); return; }
  }
  if (s.march > 0) {
    if (u.cat === 'tower' || u.cat === 'pillar') {
      moveToward(u, CASTLE_POS.x, CASTLE_POS.y, 40 * mult, dt);
      if (dist(u, CASTLE_POS) <= 66) homeRefund(u);
      return;
    }
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
  returnHome(u, 80 * mult, dt);
}
function enemyBehavior(e, dt, standing) {
  e.moving = false;
  if (standing) return;
  const s = e.ev.singles, mult = speedMult(e);
  if (s.seek > 0) {
    const tgt = nearest(e, allyAlive(), (t, d) => d <= 160);
    if (tgt) {
      const stop = e.ev.ranged ? 180 : e.half + tgt.half + 6;
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
  const e = mkUnit('enemy', 0, 0, d.half, d.items.slice());
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
function mkPart(item, x, y, spawnAge) {
  return { cat: 'part', item, x, y, half: 14, spawnAge, life: 10, permanent: item === 'shop', removed: false };
}

// ───────── 互動目標 ─────────
function placeInfo(kit) {
  const P = G.player;
  const col = Math.floor(P.x / 48), row = Math.floor((P.y - 50) / 48);
  const cx = 24 + 48 * col, cy = 74 + 48 * row;
  let valid = col >= 0 && col <= 26 && row >= 0 && row <= 13;
  if (valid && routeDist(cx, cy) < 52) valid = false;
  if (valid && Math.hypot(cx - CASTLE_POS.x, cy - CASTLE_POS.y) < 90) valid = false;
  if (valid) {
    for (const s of G.towers.concat(G.pillars)) {
      if (Math.hypot(s.x - cx, s.y - cy) < 40) { valid = false; break; }
    }
  }
  return { x: cx, y: cy, valid, kind: kit === 'crossbowKit' ? 'crossbow' : 'pillar' };
}
function flagInfo() { return { x: G.player.x, y: G.player.y, valid: dist(G.player, CASTLE_POS) >= 90 }; }
function interactables() { // 可被安裝 / 拿取的單位
  const L = [];
  G.towers.forEach(o => L.push(o));
  G.pillars.forEach(o => L.push(o));
  G.soldiers.forEach(o => { if (o.state === 'normal' || o.state === 'returning') L.push(o); });
  G.golems.forEach(o => { if ((o.state === 'normal' || o.state === 'returning') && !o.removed) L.push(o); });
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
function findInstallTarget() {
  const shop = G.hand === 'shop';
  const L = interactables().filter(u => !(shop && u.cat === 'golem' && u.team === 'neutral'));
  G.parts.forEach(p => L.push(p));
  return nearestInRange(L);
}
function findTakeTarget() {
  const L = interactables().filter(u => (u.cat === 'castle' || (u.cat === 'golem' && u.team === 'neutral')) ? hasItem(u) : true);
  G.parts.forEach(p => L.push(p));
  G.corpses.forEach(c => { if (!c.removed && hasItem(c)) L.push(c); });
  liveEnemies().forEach(e => { if (hasItem(e)) L.push(e); });
  return nearestInRange(L);
}
function findTarget() {
  if (G.steal) return G.steal.enemy;
  if (G.flag || KITS[G.hand]) return null;
  if (!G.hand) return findTakeTarget();
  return findInstallTarget();
}
function actionLabel() {
  if (G.steal) return '取消搶奪';
  if (G.flag) return flagInfo().valid ? '插旗' : '不能插';
  if (KITS[G.hand]) return placeInfo(G.hand).valid ? '蓋下' : '不能蓋';
  const t = findTarget();
  if (G.hand) {
    if (!t) return '丟下';
    if (t.cat === 'part') return '互換';
    return t.slots.some(s => !s) ? '裝上' : '替換';
  }
  if (!t) return '';
  if (t.cat === 'enemy') return '搶奪';
  if (t.cat === 'part') return '拿起';
  if (!hasItem(t) && (t.cat === 'tower' || t.cat === 'pillar' || isMobileAlly(t))) return '選單';
  return '拿起';
}
function shopHolder() {
  for (const u of ownUnits()) {
    if (u.removed) continue;
    if ((u.cat === 'soldier' || u.cat === 'golem') && u.state !== 'normal' && u.state !== 'returning') continue;
    if (u.state === 'away') continue;
    if (u.slots.indexOf('shop') >= 0) return u;
  }
  return null;
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
function startClock(reason) { if (G.clockOn) return; G.clockOn = true; ev('clock_start', { reason }); }
function unitMobileTick(u, gdt) {
  // 我方移動單位: 排隊中 / 消失中 / 歸隊中 / 正常
  if (u.state === 'gone') return;
  if (u.state === 'away') {
    u.awayT -= gdt;
    if (u.awayT <= 0) {
      const lane = u.m ? u.m.lane : 0;
      u.state = 'normal'; u.x = CASTLE_DOOR.x; u.y = CASTLE_DOOR.y;
      u.m = { phase: 'rev', lane, s: LV.lanes[lane].len - 56 };
      snd('unit_return');
    }
    return;
  }
  tickUnit(u, gdt);
  if (u.state === 'returning') {
    u.moving = false; u.charging = false;
    if (moveToward(u, u.home.x, u.home.y, 100, gdt)) {
      u.state = 'normal'; u.moving = false;
      if (u.flagObj) { const i = G.flags.indexOf(u.flagObj); if (i >= 0) G.flags.splice(i, 1); u.flagObj = null; }
    }
    return;
  }
  const st = runAttacks(u, 'ally', gdt, 'unit');
  allyBehavior(u, gdt, st);
  chargeHits(u);
}
// 建築也能因移動類魂件移動(away 也要計時)
function buildingTick(u, gdt, attacks) {
  if (u.state === 'away') {
    u.awayT -= gdt;
    if (u.awayT <= 0) {
      const lane = u.m ? u.m.lane : 0;
      u.state = 'normal'; u.x = CASTLE_DOOR.x; u.y = CASTLE_DOOR.y;
      u.m = { phase: 'rev', lane, s: LV.lanes[lane].len - 56 };
      snd('unit_return');
    }
    return;
  }
  tickUnit(u, gdt);
  const st = attacks ? runAttacks(u, 'ally', gdt, 'unit') : false;
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
  tickAge(P, 'attackAge', 0.15, gdt);

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
        tutEv(10);
      }
    }
  }

  computeEvals();

  // 波次(倒數從 clockOn 起算)
  if (!G.clockOn && G.time >= 90) startClock('timeout');
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

  // 冰霜減速範圍(沒有任何攻擊效果的冰霜才畫圈)
  const frostSrcAlly = [], frostSrcEnemy = [];
  liveE.forEach(e => { e.auraSlow = false; });
  allyMobile().forEach(u => { u.auraSlow = false; });
  for (const u of activeTowers().concat(allyAlive(), [G.castle], [P])) {
    if (!u.ev.aura) continue;
    frostSrcAlly.push(u);
    for (const e of liveE) if (dist(u, e) <= 70) e.auraSlow = true;
  }
  for (const e of liveE) {
    if (!e.ev.aura) continue;
    frostSrcEnemy.push(e);
    for (const a of allyAlive()) if (dist(e, a) <= 70) a.auraSlow = true;
  }
  G.frostAlly = frostSrcAlly; G.frostEnemy = frostSrcEnemy;

  // 我方
  G.towers.forEach(u => buildingTick(u, gdt, true));
  G.pillars.forEach(u => { tickAge(u, 'changeAge', 0.5, gdt); buildingTick(u, gdt, false); });
  allyMobile().forEach(u => unitMobileTick(u, gdt));
  tickUnit(G.castle, gdt); runAttacks(G.castle, 'ally', gdt, 'unit');
  runAttacks(P, 'ally', gdt, 'player');
  G.towers = G.towers.filter(u => !u.removed);
  G.pillars = G.pillars.filter(u => !u.removed);

  // 重生隊伍: 一次一隻, 每隻 5 秒
  if (G.rq.length) {
    G.rqT += gdt;
    if (G.rqT >= 5) {
      const u = G.rq.shift(); G.rqT = 0;
      u.state = 'returning'; u.x = CASTLE_DOOR.x; u.y = CASTLE_DOOR.y; u.hp = u.maxHp; u.slowT = 0; u.m = null;
      snd('unit_return');
      ev('unit_respawn', { unit: u.cat, waitSec: r1(G.time - u.downAt) });
    }
  }
  G.flags.forEach(f => { if (f.plantAge < 0.3) f.plantAge = Math.min(0.3, f.plantAge + gdt); });

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
        G.parts.push(mkPart(it, 1052 + 32 * k, 580, 0));
        k++;
      }
      G.stat.recruits++; snd('recruit'); ev('recruit');
    }
    G.golems = G.golems.filter(g => !g.recruited);
    S.golemUnlocked = true;
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
      const st = runAttacks(e, 'enemy', gdt, 'enemy');
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
        const ice = p.kind === 'ice';
        hurt(h, p.dmg, { src: p.src, frost: ice });
        if (ice) slowIt(h);
        return false;
      }
    }
    return p.travel < 320;
  });

  // 單次特效 / 金幣 / 屍體 / 地上魂件
  for (const arr of [G.beams, G.areas, G.sparks, G.names, G.breaks]) arr.forEach(o => { o.age += gdt; });
  G.beams = G.beams.filter(o => o.age < 0.15);
  G.areas = G.areas.filter(o => o.age < 0.3);
  G.sparks = G.sparks.filter(o => o.age < 0.25);
  G.names = G.names.filter(o => o.age < 1.5);
  G.breaks = G.breaks.filter(o => o.age < 0.5);
  for (const p of G.parts) {
    if (p.spawnAge < 0.6) p.spawnAge = Math.min(0.6, p.spawnAge + gdt);
    if (!p.permanent) {
      p.life -= gdt;
      if (p.life <= 0) {
        p.removed = true; G.stat.groundExpired++;
        ev('ground_expire', { item: p.item }); snd('ground_expire');
      }
    }
  }
  G.coins = G.coins.filter(c => {
    const d = Math.hypot(P.x - c.x, P.y - c.y);
    let got = false;
    if (d <= 20) got = true;
    else if (d <= 90) {
      const st = Math.min(420 * gdt, d);
      c.x += (P.x - c.x) / d * st; c.y += (P.y - c.y) / d * st;
      if (Math.hypot(P.x - c.x, P.y - c.y) <= 20) got = true;
    }
    if (got) { G.gold += 2; G.stat.goldEarned += 2; snd('coin_pickup'); tutEv(6); return false; }
    return true;
  });
  G.corpses.forEach(c => { c.life -= gdt; });
  G.corpses = G.corpses.filter(c => { if (c.life <= 0) { c.removed = true; return false; } return true; });

  cleanupEnemies();
  G.parts = G.parts.filter(p => !p.removed);

  // 共鳴配組的組合名稱(同一幀多個只播一次: 有首次就只播 combo_new)
  for (const u of activeTowers().concat(allyAlive(), [G.castle], [P])) {
    for (let ci = 0; ci < 5; ci++) {
      let n = 0; for (const c of u.ev.matched) if (c === ci) n++;
      if (n > u.prevCombos[ci]) {
        const r = popName(u, ci);
        if (r) G.comboSnd = Math.max(G.comboSnd, r);
      }
      u.prevCombos[ci] = n;
    }
  }

  // 彈窗自動關閉
  if (G.popup && G.popup.target) {
    const t = G.popup.target;
    if (t.removed || t.dead || t.gone || t.state === 'gone' || t.state === 'away' || dist(G.player, t) > t.half + 68) closePopup();
  }
  if (G.popup && G.popup.type === 'soul') layoutPopup(G.popup);
  G.target = findTarget();
  if (G.popup) G.target = G.popup.target || null;

  updateTutorial(dt);

  // 結束判定(批次尾端只判一次)
  if (G.castleHp <= 0) endLevel(false);
  else if (G.waveStarted >= LV.waves.length && G.queue.length === 0 && liveEnemies().length === 0) endLevel(true);
  flushSnd();
}

// ───────── 新手教學 ─────────
function tutEv(k) {
  const T = S.tut;
  if (T.cur === k) T.pend[k] = true;
  else if ((k === 9 || k === 14) && !T.done[k] && pre(k === 9 ? 5 : 13)) T.late[k] = true; // 替換彈窗(階段 11)期間合成, 事後補記完成
}
function pre(k) { const T = S.tut; return !!T.done[k] || (k === 1 && G.level > 1); }
function enemyWithItem() { return liveEnemies().filter(hasItem); }
function drumTargets() {
  const L = [];
  G.corpses.forEach(c => { if (!c.removed && c.kind === 'drummer' && c.slots.indexOf('drum') >= 0) L.push(c); });
  liveEnemies().forEach(e => { if (e.type === 'drummer' && e.slots.indexOf('drum') >= 0) L.push(e); });
  return L;
}
function handEmpty() { return G.hand === null && !G.flag; }
function corpsesWithItem() { return G.corpses.filter(c => !c.removed && hasItem(c)); }
function fuseCandidates() { // 手上基本魂件 + 某單位身上有能湊成組合的基本魂件
  const h = G.hand;
  if (!h || !BASIC[h]) return [];
  return ownUnits().filter(u => {
    if (u.removed || !canFuseUnit(u)) return false;
    if ((u.cat === 'soldier' || u.cat === 'golem') && u.state !== 'normal' && u.state !== 'returning') return false;
    if (u.state === 'away') return false;
    const n = u.slots.length;
    return u.slots.some((x, i) => {
      if (!x || !BASIC[x]) return false;
      const pairs = RECIPES.some(r => (r[0] === h && r[1] === x) || (r[1] === h && r[0] === x));
      if (!pairs) return false;
      return u.slots.some(s => !s) || n >= 2;
    });
  });
}
function tutCond(k) {
  const n = G.level;
  const sh = shopHolder();
  switch (k) {
    case 1: return n === 1;
    case 2: return pre(1) && !!sh;
    case 3: return pre(2) && (!!KITS[G.hand] || !!G.flag);
    case 4: return pre(3) && handEmpty();
    case 5: return pre(4) && isSoul(G.hand) && G.pillars.length > 0;
    case 6: return pre(5) && G.coins.length > 0;
    case 7: return pre(6) && corpsesWithItem().length > 0 && handEmpty();
    case 8: return pre(7) && G.pillars.some(p => p.state === 'normal' && p.slots[0] && ATTACK[p.slots[0]]) && liveEnemies().length > 0;
    case 9: return pre(5) && !!G.hand && !!BASIC[G.hand] && fuseCandidates().length > 0;
    case 10: return n >= 2 && enemyWithItem().length > 0 && handEmpty();
    case 11: return !!G.popup && G.popup.type === 'soul' && G.popup.mode === 'replace';
    case 12: return n >= 3 && G.golems.some(g => g.team === 'neutral' && !g.removed);
    case 13: return n >= 4 && drumTargets().length > 0 && handEmpty();
    case 14: return pre(13) && G.hand === 'drum' && allyMobile().some(u => u.state === 'normal' || u.state === 'returning');
  }
  return false;
}
function tutChoose() {
  const T = S.tut, p = G.popup;
  if (p) {
    if (p.type === 'shop') return (!T.done[2] && tutCond(2)) ? 2 : 0;
    if (p.mode === 'replace') return !T.done[11] ? 11 : 0;
    if (!T.done[4] && tutCond(4)) return 4;
    if (!T.done[7] && p.target && p.target.cat === 'corpse' && pre(6) && handEmpty()) return 7;
    return 0;
  }
  for (let k = 1; k <= 14; k++) if (!T.done[k] && tutCond(k)) return k;
  return 0;
}
function tutState(k) { // 狀態型完成條件
  switch (k) {
    case 4: return isSoul(G.hand);
    case 5: return G.pillars.some(hasItem);
    case 13: return G.hand === 'drum';
  }
  return false;
}
const TUT_TEXT = {
  1: ['方向鍵移動', ['left', 'up', 'right', 'down']],
  2: ['到主堡旁按空白鍵', ['space']], '2p': ['選魂柱, 按 Z 買', ['left', 'right', 'z']],
  3: ['到路旁空地按 Z 蓋下', ['z']], '3f': ['到空地按 Z 插旗', ['z']],
  4: ['空手靠近弩塔按 Z', ['z']], '4p': ['選魂件, 按 Z 拿', ['left', 'right', 'z']],
  5: ['靠近魂柱按 Z 裝上', ['z']], 6: ['走近金幣就會撿起', []],
  7: ['空手靠近屍體按 Z', ['z']], '7p': ['選魂件, 按 Z 拿', ['left', 'right', 'z']],
  8: ['站進魂柱圈, 你也會攻擊', []], 9: ['裝在一起, 合成新招', ['z']],
  10: ['空手靠近活鬼按 Z 搶', ['z']], 11: ['← → 選要換的格, Z', ['left', 'right', 'z']],
  12: ['把鬼的進攻主堡裝給它', ['z']], 13: ['拿起鼓鬼的行軍魂件', ['z']], 14: ['裝給步兵, 合成衝鋒', ['z']]
};
function tipFor(o) {
  switch (o.cat) {
    case 'player': return { x: o.x, up: o.y - 20, down: o.y + 44 };
    case 'castle': return { x: 1180, up: 344, down: 434 + 56 + 4 };
    case 'tower': return { x: o.x, up: o.y - 58, down: o.y + 24 + 4 };
    case 'pillar': return { x: o.x, up: o.y - 52, down: o.y + 18 + 4 };
    case 'soldier': return { x: o.x, up: o.y - 50, down: o.y + 16 + 4 };
    case 'golem': return { x: o.x, up: o.y - 62, down: o.team === 'neutral' ? o.y + 28 + 22 + 4 : o.y + 28 + 4 };
    case 'enemy': return { x: o.x, up: o.y - o.half - 34, down: o.y + o.half + 4 };
    case 'corpse': return { x: o.x, up: o.y - o.half - 26, down: o.y + o.half + 4 };
    case 'coin': return { x: o.x, up: o.y - 12, down: o.y + 8 + 4 };
  }
  return null;
}
function mkView(k, td, o) {
  if (!o) return null;
  const t = tipFor(o);
  if (!t || t.x !== t.x || t.up !== t.up) return null;
  let side = 'up', tipY = t.up, by = tipY - 20 - 36;
  if (by - 36 < 50) { side = 'down'; tipY = t.down; by = tipY + 20 + 36; }
  const T = S.tut;
  const pressed = [];
  if (k === 1) td[1].forEach(nm => { if (T.pressed[nm]) pressed.push(nm); });
  return { stage: k, text: td[0], keys: td[1].slice(), pressedKeys: pressed, tipX: t.x, tipY, side, bodyX: clamp(t.x, 150, 1130), bodyY: by };
}
function popupView(k, td) {
  const p = G.popup;
  const cx = p.type === 'shop' ? 640 : p.x, cy = p.type === 'shop' ? 400 : p.y, w = p.type === 'shop' ? 480 : 320;
  let side, tipX, bodyX;
  if (cx >= 640) { side = 'left'; tipX = cx - w / 2 - 4; bodyX = tipX - 20 - 150; }
  else { side = 'right'; tipX = cx + w / 2 + 4; bodyX = tipX + 20 + 150; }
  return { stage: k, text: td[0], keys: td[1].slice(), pressedKeys: [], tipX, tipY: cy, side, bodyX, bodyY: cy };
}
function tutView(k) {
  const P = G.player;
  const near = list => nearest(P, list);
  const p = G.popup;
  if (p) {
    if (k === 2) return popupView(k, TUT_TEXT['2p']);
    if (k === 4) return popupView(k, TUT_TEXT['4p']);
    if (k === 7) return popupView(k, TUT_TEXT['7p']);
    if (k === 11) return popupView(k, TUT_TEXT[11]);
    return null;
  }
  switch (k) {
    case 1: return mkView(k, TUT_TEXT[1], P);
    case 2: return mkView(k, TUT_TEXT[2], shopHolder());
    case 3: return mkView(k, G.flag ? TUT_TEXT['3f'] : TUT_TEXT[3], P);
    case 4: {
      let o = near(G.towers.filter(t => hasItem(t) && !t.removed));
      if (!o) {
        const L = ownUnits().filter(u => hasItem(u) && !u.removed && u.cat !== 'castle' && u.state !== 'gone' && u.state !== 'away').concat(corpsesWithItem());
        o = near(L);
      }
      return mkView(k, TUT_TEXT[4], o);
    }
    case 5: return mkView(k, TUT_TEXT[5], near(G.pillars));
    case 6: return mkView(k, TUT_TEXT[6], near(G.coins.map(c => ({ cat: 'coin', x: c.x, y: c.y, half: 8 }))));
    case 7: return mkView(k, TUT_TEXT[7], near(corpsesWithItem()));
    case 8: return mkView(k, TUT_TEXT[8], near(G.pillars.filter(q => q.state === 'normal' && q.slots[0] && ATTACK[q.slots[0]])));
    case 9: return mkView(k, TUT_TEXT[9], near(fuseCandidates()));
    case 10: return mkView(k, TUT_TEXT[10], near(enemyWithItem()));
    case 12: return mkView(k, TUT_TEXT[12], near(G.golems.filter(g => g.team === 'neutral' && !g.removed)));
    case 13: return mkView(k, TUT_TEXT[13], near(drumTargets()));
    case 14: return mkView(k, TUT_TEXT[14], near(allyMobile().filter(u => u.state === 'normal' || u.state === 'returning')));
  }
  return null;
}
function completeStage(k) {
  const T = S.tut;
  T.done[k] = true; T.doneSt[k] = r1(RT);
  ev('tutorial_done', { stage: k });
  snd('tutorial_done');
  T.fx = { view: T.view, t: 0 };
  T.cur = 0; T.pend = {};
  if (k === 5) startClock('tutorial');
}
function updateTutorial(dt) {
  const T = S.tut;
  if (T.fx) { T.fx.t += dt; if (T.fx.t >= 0.6) T.fx = null; return; }
  for (const k of [9, 14]) {
    if (T.late[k]) {
      T.late[k] = false;
      if (!T.done[k]) { T.done[k] = true; T.doneSt[k] = r1(RT); ev('tutorial_done', { stage: k }); snd('tutorial_done'); }
    }
  }
  if (T.cur && (T.pend[T.cur] || tutState(T.cur))) { completeStage(T.cur); return; }
  const c = tutChoose();
  T.cur = c;
  T.view = c ? tutView(c) : null;
  if (c && T.view && T.shownSt[c] === undefined) { T.shownSt[c] = r1(RT); ev('tutorial_show', { stage: c }); }
  if (c && tutState(c)) completeStage(c); // 條件早已成立: 出現的同一幀完成
}

// ───────── 輸入動作 ─────────
function cancelSteal(reason) {
  const s = G.steal; if (!s) return;
  G.steal = null;
  G.stat.steals.canceled++; snd('steal_cancel');
  ev('steal_cancel', { enemy: s.enemy.type, item: s.enemy.slots[s.index], reason });
}
function doInstall(t, mode, item, swappedOut) {
  ev('install', { item, to: unitKind(t), mode, swappedOut: swappedOut || null });
  G.stat.installs[mode]++;
  if (item === 'march' && t.cat === 'golem' && t.team === 'neutral') tutEv(12);
  if (mode === 'replace') tutEv(11);
  afterSlotsChange(t);
}
function menuCells(t) {
  const cells = t.slots.map(k => ({ type: 'slot', item: k || null }));
  if (t.cat === 'tower' || t.cat === 'pillar') cells.push({ type: 'demolish', refund: Math.floor(t.price * 0.6) });
  else if (isMobileAlly(t)) cells.push({ type: 'rally' });
  return cells;
}
function demolish(t) {
  const refund = Math.floor(t.price * 0.6);
  G.gold += refund; G.stat.goldRefund += refund;
  const items = t.slots.filter(Boolean), m = items.length;
  items.forEach((it, k) => G.parts.push(mkPart(it, t.x - 16 * (m - 1) + 32 * k, t.y + 30, 0)));
  t.removed = true;
  G.towers = G.towers.filter(u => !u.removed);
  G.pillars = G.pillars.filter(u => !u.removed);
  G.stat.demolishes++;
  ev('demolish', { unit: unitKind(t), refund, x: Math.round(t.x), y: Math.round(t.y), parts: items });
  snd('demolish');
}
function popupZ() {
  const p = G.popup;
  if (p.type === 'shop') {
    const it = SHOP[p.index], kit = it[0], price = it[2];
    const isUnit = kit === 'soldierKit' || kit === 'golemKit';
    const fail = msg => { p.msg = msg; p.shake = 0; snd('ui_invalid'); };
    if (kit === 'golemKit' && !S.golemUnlocked) { fail('尚未解鎖'); return; }
    if (kit === 'pillarKit' && G.pillars.length + (G.hand === 'pillarKit' ? 1 : 0) >= LV.cap) { fail('已達上限'); return; }
    if (G.gold < price) { fail('金幣不足'); return; }
    if (!isUnit && (G.hand || G.flag)) { fail('手上要空著'); return; }
    if (isUnit && (G.flag || KITS[G.hand])) { fail('先放下手上的東西'); return; }
    G.gold -= price; G.stat.goldSpent += price;
    const nm = KIT_NAME[kit];
    G.stat.purchases[nm] = (G.stat.purchases[nm] || 0) + 1;
    if (isUnit) G.flag = { reason: 'purchase', kind: nm, unit: null }; else G.hand = kit;
    ev('purchase', { item: nm, price, goldAfter: G.gold });
    snd('purchase'); tutEv(2);
    closePopup();
    return;
  }
  const t = p.target, i = p.index, c = p.cells[i];
  if (p.mode === 'menu') {
    if (c.type === 'slot') {
      if (!c.item) { p.shake = 0; snd('ui_invalid'); return; }
      const cell = t.slots[i];
      G.hand = cell; t.slots[i] = null;
      if (t.cat === 'pillar') t.changeAge = 0;
      ev('take', { item: cell, from: unitKind(t) });
      snd('take_part');
      if (t.cat === 'corpse') tutEv(7);
      closePopup();
    } else if (c.type === 'demolish') {
      demolish(t); closePopup();
    } else if (c.type === 'rally') {
      G.flag = { reason: 'rally', kind: t.cat, unit: t };
      closePopup();
    }
  } else {
    const cell = t.slots[i], h = G.hand;
    t.slots[i] = h; G.hand = cell;
    snd('swap_part');
    doInstall(t, 'replace', h, cell);
    closePopup();
  }
}
function tryPlace() {
  const info = placeInfo(G.hand);
  if (!info.valid) { snd('ui_invalid'); return; }
  const k = G.hand;
  if (k === 'crossbowKit') G.towers.push(mkTower(info.x, info.y));
  else { G.pillars.push(mkPillar(info.x, info.y)); G.stat.pillarsMax = Math.max(G.stat.pillarsMax, G.pillars.length); }
  ev('place', { kind: info.kind, x: Math.round(info.x), y: Math.round(info.y) });
  G.hand = null;
  snd('place_unit'); tutEv(3);
}
function plantFlag() {
  const P = G.player, fi = flagInfo();
  if (!fi.valid) { snd('ui_invalid'); return; }
  const f = G.flag; G.flag = null;
  const fo = { x: P.x, y: P.y + 16, plantAge: 0 };
  let u = f.unit;
  if (f.reason === 'purchase') {
    u = f.kind === 'soldier' ? mkSoldier(CASTLE_DOOR.x, CASTLE_DOOR.y) : mkGolem(CASTLE_DOOR.x, CASTLE_DOOR.y, 'ally');
    u.state = 'returning';
    (f.kind === 'soldier' ? G.soldiers : G.golems).push(u);
    snd('unit_return');
  } else {
    if (u.flagObj) { const i = G.flags.indexOf(u.flagObj); if (i >= 0) G.flags.splice(i, 1); }
    if (u.state === 'away') { u.state = 'returning'; u.x = CASTLE_DOOR.x; u.y = CASTLE_DOOR.y; }
    else if (u.state === 'normal') u.state = 'returning';
    u.m = null;
  }
  u.home = { x: fo.x, y: fo.y }; u.flagObj = fo;
  G.flags.push(fo);
  G.stat.flags[f.reason === 'purchase' ? 'purchase' : 'rally']++;
  ev('flag_plant', { reason: f.reason, unit: u.cat, x: Math.round(fo.x), y: Math.round(fo.y) });
  snd('flag_plant'); tutEv(3);
}
function zPress() {
  const P = G.player;
  if (G.steal) { cancelSteal('key'); return; }
  if (G.popup) { popupZ(); return; }
  if (G.flag) { plantFlag(); return; }
  if (KITS[G.hand]) { tryPlace(); return; }
  if (G.hand) { // 魂件
    const t = findInstallTarget();
    if (!t) {
      G.parts.push(mkPart(G.hand, P.x, P.y, 0.6));
      ev('drop', { item: G.hand }); G.stat.drops++; G.hand = null; snd('drop_part');
      return;
    }
    if (t.cat === 'part') {
      const h = G.hand; G.hand = t.item; t.item = h; t.life = 10; t.permanent = h === 'shop';
      ev('ground_swap', { item: h, got: G.hand }); snd('swap_part');
      return;
    }
    const ei = t.slots.findIndex(s => !s);
    if (ei >= 0) {
      const h = G.hand;
      t.slots[ei] = h; G.hand = null;
      snd('install_part'); doInstall(t, 'direct', h, null);
      return;
    }
    const cells = t.slots.map(k => ({ type: 'slot', item: k || null }));
    let idx = 0;
    for (let j = 0; j < t.slots.length; j++) if (canFuseUnit(t) && wouldFuseAfterSwap(t, j, G.hand)) { idx = j; break; }
    openPopup({ type: 'soul', mode: 'replace', target: t, cells, index: idx, shake: 0.25, msg: '', x: 0, y: 0 });
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
  const cells = (t.cat === 'corpse') ? t.slots.map(k => ({ type: 'slot', item: k || null })) : menuCells(t);
  let idx = cells.findIndex(c => c.type === 'slot' && c.item);
  if (idx < 0) idx = cells.length - 1;
  openPopup({ type: 'soul', mode: 'menu', target: t, cells, index: idx, shake: 0.25, msg: '', x: 0, y: 0 });
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
function attachTop(t) { // 目標最上方附屬物的頂端(槽列頂)
  switch (t.cat) {
    case 'tower': return t.y - 44 - 10;
    case 'pillar': return t.y - 38 - 10;
    case 'soldier': return t.y - 36 - 10;
    case 'golem': return t.y - 48 - 10;
    case 'castle': return 348;
    case 'corpse': return t.y - t.half - 12 - 10;
    default: return t.y - t.half - 20 - 10;
  }
}
function layoutPopup(p) {
  const t = p.target;
  let y = attachTop(t) - 8 - 90;
  if (y - 90 < 50) y = t.y + t.half + (t.cat === 'golem' && t.team === 'neutral' ? 22 : 0) + 8 + 90;
  p.x = clamp(t.x, 160, 1120); p.y = clamp(y, 140, 630);
}
function popupDesc(p) {
  const c = p.cells[p.index];
  if (!c) return null;
  if (c.type === 'slot') {
    if (!c.item) return null;
    const d = DESC[c.item];
    return { name: d[0], text: d[1], materials: d[2] ? d[2].slice() : [] };
  }
  if (c.type === 'demolish') return { name: '拆除', text: '拆掉, 退還 ' + c.refund + ' 金', materials: [] };
  return { name: '重設集結點', text: '拿旗插到新位置駐守', materials: [] };
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
    const h = shopHolder();
    if (h && dist(G.player, h) <= 110) openPopup({ type: 'shop', target: null, index: 0, shake: 0.25, msg: '' });
  } else if (k === 'L' || k === 'R') {
    const p = G.popup;
    if (!p) return;
    const n = p.type === 'shop' ? 4 : p.cells.length;
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
if (document.addEventListener) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideAt = Date.now();
    else if (hideAt !== null) {
      if (G.screen === 'play' && G.stat) G.stat.hiddenSec += (Date.now() - hideAt) / 1000;
      hideAt = null;
    }
  });
}

// ───────── 繪製 ─────────
function slotCenterX(L, i, x) { return x - L * 10 + 10 + 20 * i; }
function attackKinds(u) { const k = u.slots[0]; return (k && ATTACK[k]) ? [k] : []; }
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
function visibleMobile(u) { return u.state === 'normal' || u.state === 'returning'; }
function entityDrawList() {
  const L = [];
  const T = G.target;
  L.push({ y: G.castle.y, f: () => Art.drawCastle(ctx, { x: 1180, y: 434, hitAge: G.castle.hitAge, hitDuration: 0.3, attackAge: G.castle.attackAge, attackDuration: 0.15, targeted: T === G.castle }) });
  G.towers.forEach(u => { if (u.state !== 'normal') return; L.push({ y: u.y, f: () => Art.drawCrossbow(ctx, { x: u.x, y: u.y, attackAge: u.attackAge, attackDuration: 0.15, moving: u.moving, charging: u.charging, resonating: u.ev.resonating, targeted: T === u }) }); });
  G.pillars.forEach(u => { if (u.state !== 'normal') return; L.push({ y: u.y, f: () => Art.drawPillar(ctx, { x: u.x, y: u.y, kinds: attackKinds(u), moving: u.moving, charging: u.charging, targeted: T === u }) }); });
  const mob = (u) => {
    const ret = u.state === 'returning';
    return {
      x: u.x, y: u.y, hp: ret ? u.maxHp : u.hp, maxHp: u.maxHp, hitAge: u.hitAge, hitDuration: 0.2, attackAge: u.attackAge, attackDuration: 0.15,
      moving: u.moving, charging: ret ? false : u.charging, resonating: ret ? false : u.ev.resonating, returning: ret, targeted: T === u
    };
  };
  G.soldiers.forEach(u => { if (visibleMobile(u)) L.push({ y: u.y, f: () => Art.drawSoldier(ctx, mob(u)) }); });
  G.golems.forEach(u => {
    if (!visibleMobile(u)) return;
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
  L.push({
    y: P.y, f: () => Art.drawPlayer(ctx, {
      x: P.x, y: P.y, moving: P.moving, handItem: G.hand, holdingFlag: !!G.flag, stealing: !!G.steal, stealProgress: G.steal ? Math.min(1, G.steal.t / 1.5) : 0,
      resonating: P.ev.resonating, attackAge: P.attackAge, attackDuration: 0.15
    })
  });
  L.sort((a, b) => a.y - b.y);
  return L;
}
function virtOf(u) { return u.ev.virt.map(v => ({ kind: v.kind, used: v.used })); }
function drawTut(afterPopup) {
  const T = S.tut;
  if (G.screen !== 'play') return;
  let v = null, doneAge = 0.6;
  if (T.fx) { v = T.fx.view; doneAge = T.fx.t; }
  else { if (!T.cur || !T.view) return; v = T.view; }
  if (!v) return;
  const sideV = v.side === 'left' || v.side === 'right';
  if (sideV !== afterPopup) return;
  Art.drawTutorial(ctx, { stage: v.stage, text: v.text, keys: v.keys, pressedKeys: v.pressedKeys, tipX: v.tipX, tipY: v.tipY, side: v.side, bodyX: v.bodyX, bodyY: v.bodyY, doneAge, doneDuration: 0.6 });
}
function drawScene() {
  const P = G.player, T = G.target;
  Art.drawBackground(ctx, { paths: LV.paths.map(p => p.map(q => [q[0], q[1]])) });
  const sh = shopHolder();
  if (sh) Art.drawShopZone(ctx, { x: sh.x, y: sh.y, radius: 110, active: dist(P, sh) <= 110 });
  G.pillars.forEach(p => { if (p.state === 'normal') Art.drawPillarRange(ctx, { x: p.x, y: p.y, radius: 150, kinds: attackKinds(p), changeAge: p.changeAge, changeDuration: 0.5 }); });
  // 共鳴線(接收者含玩家)
  for (const r of receivers()) {
    r.ev.virt.forEach(v => {
      const p = v.pillar;
      Art.drawResonanceLine(ctx, { x1: p.x, y1: p.y, x2: r.x, y2: r.y, kind: v.kind, active: v.used });
    });
  }
  (G.frostAlly || []).forEach(u => Art.drawFrostAura(ctx, { x: u.x, y: u.y, radius: 70, owner: 'ally' }));
  (G.frostEnemy || []).forEach(u => Art.drawFrostAura(ctx, { x: u.x, y: u.y, radius: 70, owner: 'enemy' }));
  G.flags.forEach(f => Art.drawRallyFlag(ctx, { x: f.x, y: f.y, plantAge: f.plantAge, plantDuration: 0.3 }));
  G.coins.forEach(c => Art.drawCoin(ctx, { x: c.x, y: c.y }));
  G.corpses.forEach(c => Art.drawCorpse(ctx, { kind: c.kind, x: c.x, y: c.y, life: c.life, maxLife: 15, targeted: T === c }));
  G.parts.forEach(p => Art.drawGroundPart(ctx, { item: p.item, x: p.x, y: p.y, spawnAge: p.spawnAge, spawnDuration: 0.6, life: p.permanent ? 10 : p.life, maxLife: 10, permanent: p.permanent, targeted: T === p }));
  if (G.flag) { const i = flagInfo(); Art.drawPlacePreview(ctx, { kind: 'flag', x: i.x, y: i.y, valid: i.valid }); }
  else if (KITS[G.hand]) { const i = placeInfo(G.hand); Art.drawPlacePreview(ctx, { kind: i.kind, x: i.x, y: i.y, valid: i.valid }); }
  entityDrawList().forEach(o => o.f());
  // 魂件槽列(玩家沒有)
  const sl = (u, x, y) => Art.drawSoulSlots(ctx, { x, y, slots: u.slots.slice(), virtual: u.state === 'normal' ? virtOf(u) : [] });
  G.towers.forEach(u => { if (u.state === 'normal') sl(u, u.x, u.y - 44); });
  G.pillars.forEach(u => { if (u.state === 'normal') Art.drawSoulSlots(ctx, { x: u.x, y: u.y - 38, slots: u.slots.slice(), virtual: [] }); });
  G.soldiers.forEach(u => { if (visibleMobile(u)) sl(u, u.x, u.y - 36); });
  G.golems.forEach(u => { if (!visibleMobile(u)) return; if (u.team === 'ally') sl(u, u.x, u.y - 48); else Art.drawSoulSlots(ctx, { x: u.x, y: u.y - 48, slots: u.slots.slice(), virtual: [] }); });
  sl(G.castle, 1180, 358);
  G.corpses.forEach(c => Art.drawSoulSlots(ctx, { x: c.x, y: c.y - c.half - 12, slots: c.slots.slice(), virtual: [] }));
  G.enemies.forEach(e => { if (T === e || stolenBy(e)) Art.drawSoulSlots(ctx, { x: e.x, y: e.y - e.half - 20, slots: e.slots.slice(), virtual: [] }); });
  if (G.rq.length) Art.drawRespawnQueue(ctx, { x: 1060, y: 380, kind: G.rq[0].cat === 'soldier' ? 'soldier' : 'golem', progress: Math.min(1, G.rqT / 5), count: G.rq.length });
  // 投射物與特效
  G.projs.forEach(p => Art.drawProjectile(ctx, { x: p.x, y: p.y, angle: p.angle, kind: p.kind, owner: p.owner }));
  G.beams.forEach(b => Art.drawPierceBeam(ctx, { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, frost: b.frost, age: b.age, duration: 0.15 }));
  G.areas.forEach(a => Art.drawAreaHit(ctx, { kind: a.kind, x: a.x, y: a.y, radius: a.radius, angle: a.angle, frost: a.frost, age: a.age, duration: 0.3 }));
  G.sparks.forEach(s => Art.drawHitSpark(ctx, { x: s.x, y: s.y, frost: s.frost, age: s.age, duration: 0.25 }));
  G.breaks.forEach(b => Art.drawUnitBreak(ctx, { kind: b.kind, x: b.x, y: b.y, age: b.age, duration: 0.5 }));
  if (G.steal) {
    const e = G.steal.enemy, L = e.slots.length;
    Art.drawStealLink(ctx, { x1: P.x, y1: P.y, x2: slotCenterX(L, G.steal.index, e.x), y2: e.y - e.half - 20, progress: Math.min(1, G.steal.t / 1.5) });
  }
  G.names.forEach(n => { if (n.unit.state !== 'gone' && n.unit.state !== 'away') Art.drawComboName(ctx, { x: n.unit.x, y: n.unit.y - n.unit.half - 44, name: n.name, isNew: n.isNew, age: n.age, duration: 1.5 }); });
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
    clockPaused: !G.clockOn, muted: S.muted
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
    const items = SHOP.map((s, i) => {
      const isP = s[0] === 'pillarKit';
      const count = G.pillars.length + (G.hand === 'pillarKit' ? 1 : 0);
      let state = G.gold < s[2] ? 'poor' : 'ok';
      if (s[0] === 'golemKit' && !S.golemUnlocked) state = 'locked';
      else if (isP && count >= LV.cap) state = 'max';
      return { item: s[0], name: s[1], price: s[2], state, count: isP ? count : null, cap: isP ? LV.cap : null };
    });
    Art.drawShopPopup(ctx, { items, cursorIndex: p.index, message: p.msg, shakeAge: p.shake, shakeDuration: 0.25 });
    return;
  }
  const t = p.target;
  let label = '';
  if (p.mode === 'replace') label = '互換';
  else {
    const c = p.cells[p.index];
    label = c.type === 'slot' ? (c.item ? '拿起' : '') : (c.type === 'demolish' ? '拆除' : '移防');
  }
  Art.drawSoulPopup(ctx, {
    mode: p.mode, x: p.x, y: p.y, title: popupTitle(t), cells: p.cells.map(c => Object.assign({}, c)), index: p.index,
    hand: p.mode === 'replace' ? G.hand : null, actionLabel: label, desc: popupDesc(p), shakeAge: p.shake, shakeDuration: 0.25
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
