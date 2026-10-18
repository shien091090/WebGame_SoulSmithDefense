// 魂匠掠奪 — 玩法驗證 Demo
// 邏輯(update)與繪製(render)分離; 繪製全部呼叫 Art.drawXxx
(function () {
  'use strict';

  var CW = (Art.canvas && Art.canvas.width) || 1280;
  var CH = (Art.canvas && Art.canvas.height) || 720;

  // 需要但 style.md / interface.json 沒有的圖形集中在這(目前無)
  var Placeholder = {};

  // ---------- 常數 ----------
  var CASTLE = { x: 640, y: 385, r: 56 };
  var ZONE_R = 150;
  var CASTLE_MAX_HP = 20;
  var TOTAL_WAVES = 6;
  var PADS = [
    { x: 530, y: 490, name: '塔殼', price: 10 },
    { x: 640, y: 520, name: '野狼', price: 12 },
    { x: 750, y: 490, name: '石像', price: 14 }
  ];
  var UD = {
    tower:  { w: 48, hp: 120 },
    wolf:   { w: 36, hp: 80 },
    statue: { w: 52, hp: 300 },
    castle: { w: 112, hp: 1 },
    imp:    { w: 32, hp: 30,  speed: 45, parts: ['melee', 'march'], coins: 2, dmg: 2 },
    archer: { w: 32, hp: 24,  speed: 40, parts: ['ranged', 'march'], coins: 2, dmg: 2 },
    shield: { w: 40, hp: 50,  speed: 38, parts: ['melee', 'shield', 'march'], coins: 3, dmg: 2 },
    swift:  { w: 32, hp: 35,  speed: 45, parts: ['melee', 'swift', 'march'], coins: 3, dmg: 2 },
    elite:  { w: 60, hp: 160, speed: 35, parts: ['ranged', 'shield', 'seek', 'march'], coins: 8, dmg: 6 }
  };
  var HIT_DUR = 0.2, CASTLE_HIT_DUR = 0.3, ATK_DUR = 0.15, SPARK_DUR = 0.25;
  var PLAYER_R = 16;

  function rep(t, n) { var a = []; for (var i = 0; i < n; i++) a.push(t); return a; }
  var WAVES = [
    { north: rep('imp', 5) },
    { east: rep('imp', 2).concat(rep('archer', 2)), west: rep('imp', 2).concat(rep('archer', 1)) },
    { north: rep('shield', 2), south: rep('shield', 2), east: rep('swift', 2), west: rep('swift', 1) },
    { south: rep('imp', 6), north: ['elite'] },
    { north: rep('shield', 2).concat(rep('archer', 2)), south: rep('shield', 2).concat(rep('archer', 2)), east: rep('swift', 2), west: rep('swift', 1) },
    { east: ['elite'].concat(rep('swift', 2)), west: ['elite'].concat(rep('swift', 2)), north: rep('shield', 2), south: rep('shield', 2) }
  ];
  function waveStart(k) { return 10 + k * 24; } // k 從 0 起算

  var GUIDE = [
    { title: '守住主堡', text: '撐過 6 波, 別讓敵人走進主堡' },
    { title: '移動與撿錢', text: 'WASD 移動, 走過金幣就撿起' },
    { title: '搶魂件', text: '貼近按住 J 拆魂件, 活的也行' },
    { title: '選格與裝上', text: 'K 選目標格, Q 選背包, L 裝上' },
    { title: '購買與蓋塔', text: '站上台子按 J 買, 塔殼按 L 蓋' },
    { title: '招募中立單位', text: '中立單位裝上進攻主堡會來投靠' }
  ];

  // ---------- 畫布 ----------
  var canvas = document.getElementById('c');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(CW * dpr);
  canvas.height = Math.round(CH * dpr);
  var ctx = canvas.getContext('2d');

  // ---------- 狀態 ----------
  var g = null;           // 一局的狀態
  var phase = 'guide';    // guide / play / result
  var guidePage = 0;
  var guideReturn = 'start'; // start: 關閉後開始新局; play: 關閉後回到遊戲
  var keys = { W: false, A: false, S: false, D: false, J: false };
  var jBlock = false;     // 說明頁關閉後, 要等 J 放開才接受按住
  var needRelease = false; // 拆完一次後要放開 J 才能再拆
  var nextId = 1;

  function newGame() {
    nextId = 1;
    g = {
      t: 0, gold: 20, castleHp: CASTLE_MAX_HP, win: false,
      units: [], corpses: [], coins: [], parts: [], projs: [], sparks: [],
      bag: [null, null, null], bagSel: 0,
      unlocked: [true, false, false],
      target: null, sel: -1,
      holdTarget: null, holdSel: -1, holdProgress: 0, holding: false,
      sched: [], spawnIdx: 0,
      p: { x: 640, y: 470, hp: 100, maxHp: 100, hitAge: HIT_DUR, moving: false, down: false, respawn: 0 }
    };
    var c = mkUnit('castle', 'castle', CASTLE.x, CASTLE.y, ['ranged', null, null]);
    c.hitAge = CASTLE_HIT_DUR;
    g.castle = c;
    mkUnit('tower', 'ally', 480, 250, ['ranged', null, null]);
    mkUnit('tower', 'ally', 860, 560, ['ranged', null, null]);
    mkUnit('wolf', 'neutral', 180, 140, ['melee', null]);
    mkUnit('wolf', 'neutral', 1100, 620, ['melee', null]);
    mkUnit('statue', 'neutral', 1100, 140, [null, null, null]);
    // 出怪排程
    for (var k = 0; k < WAVES.length; k++) {
      var w = WAVES[k];
      for (var e in w) {
        for (var i = 0; i < w[e].length; i++) g.sched.push({ t: waveStart(k) + i * 1.0, edge: e, type: w[e][i] });
      }
    }
    g.sched.sort(function (a, b) { return a.t - b.t; });
  }

  function mkUnit(kind, team, x, y, slots) {
    var d = UD[kind];
    var u = {
      id: nextId++, kind: kind, team: team, x: x, y: y, w: d.w,
      hp: d.hp, maxHp: d.hp, slots: slots,
      hitAge: HIT_DUR, attackAge: ATK_DUR, moving: false, cdR: 0, cdM: 0, dead: false
    };
    g.units.push(u);
    return u;
  }

  function mkEnemy(type, x, y) {
    var d = UD[type];
    var u = mkUnit(type, 'enemy', x, y, d.parts.slice());
    u.speed = d.speed;
    return u;
  }

  // ---------- 小工具 ----------
  function cnt(slots, kind) { var n = 0; for (var i = 0; i < slots.length; i++) if (slots[i] === kind) n++; return n; }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function firstPart(slots) { for (var i = 0; i < slots.length; i++) if (slots[i]) return i; return -1; }
  function freeBag() { for (var i = 0; i < 3; i++) if (!g.bag[i]) return i; return -1; }
  function isHarmless(u) {
    var s = u.slots;
    return !(cnt(s, 'ranged') || cnt(s, 'melee') || cnt(s, 'march') || cnt(s, 'seek'));
  }
  function slotCenter(o, i) {
    var len = o.slots.length;
    return { x: o.x - len * 10 + 10 + i * 20, y: o.y - o.w / 2 - (o.isCorpse ? 12 : 20) };
  }

  // ---------- 傷害 / 死亡 ----------
  function spark(x, y) { g.sparks.push({ x: x, y: y, age: 0 }); }

  function damagePlayer(amt) {
    var p = g.p;
    if (p.down) return;
    p.hp -= amt; p.hitAge = 0; spark(p.x, p.y);
    if (p.hp <= 0) { p.hp = 0; p.down = true; p.respawn = 4; g.holdProgress = 0; g.holding = false; }
  }

  function damageUnit(u, amt) {
    if (u.dead) return;
    var n = cnt(u.slots, 'shield');
    var mul = Math.max(0.25, Math.pow(0.5, n));
    u.hp -= amt * mul; u.hitAge = 0; spark(u.x, u.y);
    if (u.hp <= 0) killUnit(u);
  }

  function killUnit(u) {
    u.dead = true;
    g.corpses.push({ isCorpse: true, kind: u.kind, x: u.x, y: u.y, w: u.w, life: 12, slots: u.slots });
    if (u.team === 'enemy') {
      var c = UD[u.kind].coins;
      for (var i = 0; i < c; i++) {
        var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 40;
        g.coins.push({ x: u.x + Math.cos(a) * r, y: u.y + Math.sin(a) * r, life: 15 });
      }
    }
  }

  function shoot(u, tx, ty) {
    var a = Math.atan2(ty - u.y, tx - u.x);
    var n = cnt(u.slots, 'ranged');
    g.projs.push({
      x: u.x, y: u.y, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, angle: a,
      team: u.team === 'enemy' ? 'enemy' : 'ally', dmg: 8 * n, traveled: 0
    });
  }

  // ---------- 單位 AI ----------
  function moveToward(u, tx, ty, speed, dt) {
    var d = dist(u.x, u.y, tx, ty);
    if (d < 0.001) return;
    var s = Math.min(speed * dt, d);
    u.x += (tx - u.x) / d * s; u.y += (ty - u.y) / d * s;
    u.moving = true;
  }

  function updateUnit(u, dt, allyList, enemyList) {
    u.moving = false;
    u.hitAge = Math.min(u.hitAge + dt, u.kind === 'castle' ? CASTLE_HIT_DUR : HIT_DUR);
    u.attackAge = Math.min(u.attackAge + dt, ATK_DUR);
    u.cdR = Math.max(0, u.cdR - dt); u.cdM = Math.max(0, u.cdM - dt);
    var s = u.slots;
    var nR = cnt(s, 'ranged'), nM = cnt(s, 'melee'), nS = cnt(s, 'seek'), nMar = cnt(s, 'march'), nSw = cnt(s, 'swift');
    var spdMul = 1 + 0.6 * nSw, atkMul = Math.pow(0.7, nSw);
    var fixed = u.kind === 'castle';
    var baseSpeed = u.team === 'enemy' ? u.speed : 45;

    // 中立: 只對進攻主堡有反應
    if (u.team === 'neutral') {
      if (nMar > 0) {
        moveToward(u, CASTLE.x, CASTLE.y, 45 * spdMul, dt);
        if (dist(u.x, u.y, CASTLE.x, CASTLE.y) <= CASTLE.r + 10) {
          u.dead = true; // 不留屍體
          for (var i = 0; i < s.length; i++) if (s[i]) g.parts.push({ kind: s[i], x: 640, y: 460 });
          if (u.kind === 'wolf') g.unlocked[1] = true;
          if (u.kind === 'statue') g.unlocked[2] = true;
        }
      }
      return;
    }

    // 掃描敵對
    var list = u.team === 'enemy' ? allyList : enemyList;
    var best = null, bd = 1e9, mel = null, md = 1e9, hd;
    var i2, h, d, touch;
    for (i2 = 0; i2 < list.length; i2++) {
      h = list[i2]; if (h.dead) continue;
      d = dist(u.x, u.y, h.x, h.y);
      if (d < bd) { bd = d; best = h; }
      touch = u.w / 2 + h.w / 2 + 12;
      if (d <= touch && d < md) { md = d; mel = h; }
    }
    if (u.team === 'enemy' && !g.p.down) {
      d = dist(u.x, u.y, g.p.x, g.p.y);
      var pp = { isPlayer: true, x: g.p.x, y: g.p.y, w: PLAYER_R * 2 };
      if (d < bd) { bd = d; best = pp; }
      touch = u.w / 2 + PLAYER_R + 12;
      if (d <= touch && d < md) { md = d; mel = pp; }
    }

    var inRange = false;
    if (nR > 0 && best && bd <= 200) {
      inRange = true;
      if (u.cdR <= 0) { shoot(u, best.x, best.y); u.cdR = 1.0 * atkMul; u.attackAge = 0; }
    }
    if (nM > 0 && mel) {
      inRange = true;
      if (u.cdM <= 0) {
        if (mel.isPlayer) damagePlayer(12 * nM); else damageUnit(mel, 12 * nM);
        u.cdM = 0.8 * atkMul; u.attackAge = 0;
      }
    }
    if (inRange || fixed) return;

    if (nS > 0 && best && bd <= 240) {
      var stop = nR > 0 ? 180 : (u.w / 2 + best.w / 2 + 12);
      if (bd > stop) moveToward(u, best.x, best.y, Math.min(70 * nS, 140) * spdMul, dt);
      return;
    }
    if (nMar > 0) {
      var cd = dist(u.x, u.y, CASTLE.x, CASTLE.y);
      if (u.team === 'enemy') {
        moveToward(u, CASTLE.x, CASTLE.y, baseSpeed * spdMul, dt);
        if (dist(u.x, u.y, CASTLE.x, CASTLE.y) <= CASTLE.r + 10) {
          g.castleHp -= UD[u.kind].dmg;
          g.castle.hitAge = 0;
          u.dead = true; // 不留屍體、不掉金幣
        }
      } else if (cd > CASTLE.r + u.w / 2) {
        moveToward(u, CASTLE.x, CASTLE.y, baseSpeed * spdMul, dt);
      }
    }
  }

  // ---------- 玩家 ----------
  function padStanding() {
    for (var i = 0; i < PADS.length; i++) if (dist(g.p.x, g.p.y, PADS[i].x, PADS[i].y) <= 30) return i;
    return -1;
  }

  function pickTarget() {
    var p = g.p, best = null, bd = 1e9, i, o, d;
    for (i = 0; i < g.units.length; i++) {
      o = g.units[i]; if (o.dead) continue;
      d = dist(p.x, p.y, o.x, o.y);
      if (d <= o.w / 2 + 44 && d < bd) { bd = d; best = o; }
    }
    for (i = 0; i < g.corpses.length; i++) {
      o = g.corpses[i];
      d = dist(p.x, p.y, o.x, o.y);
      if (d <= o.w / 2 + 44 && d < bd) { bd = d; best = o; }
    }
    if (best !== g.target) { g.target = best; g.sel = best ? firstPart(best.slots) : -1; }
    else if (best && (g.sel < 0 || !best.slots[g.sel])) g.sel = firstPart(best.slots);
  }

  function updatePlayer(dt) {
    var p = g.p;
    p.hitAge = Math.min(p.hitAge + dt, HIT_DUR);
    if (p.down) {
      p.respawn -= dt; p.moving = false;
      g.target = null; g.sel = -1; g.holdProgress = 0; g.holding = false;
      if (p.respawn <= 0) { p.down = false; p.hp = p.maxHp; p.x = 640; p.y = 470; p.respawn = 0; }
      return;
    }
    var dx = (keys.D ? 1 : 0) - (keys.A ? 1 : 0), dy = (keys.S ? 1 : 0) - (keys.W ? 1 : 0);
    p.moving = dx !== 0 || dy !== 0;
    if (p.moving) {
      var l = Math.sqrt(dx * dx + dy * dy);
      p.x += dx / l * 230 * dt; p.y += dy / l * 230 * dt;
      p.x = Math.max(PLAYER_R, Math.min(CW - PLAYER_R, p.x));
      p.y = Math.max(50 + PLAYER_R, Math.min(CH - PLAYER_R, p.y));
    }
    if (dist(p.x, p.y, CASTLE.x, CASTLE.y) <= ZONE_R) p.hp = Math.min(p.maxHp, p.hp + 10 * dt);

    pickTarget();

    // 按住 J 拆魂件
    var t = g.target;
    var can = keys.J && !jBlock && !needRelease && padStanding() < 0 && t && g.sel >= 0 && t.slots[g.sel] && freeBag() >= 0;
    if (can) {
      if (g.holdTarget !== t || g.holdSel !== g.sel) { g.holdTarget = t; g.holdSel = g.sel; g.holdProgress = 0; }
      var live = !t.isCorpse && t.team === 'enemy';
      g.holdProgress += dt / (live ? 0.8 : 0.3);
      g.holding = true;
      if (g.holdProgress >= 1) {
        g.bag[freeBag()] = t.slots[g.sel];
        t.slots[g.sel] = null;
        g.holdProgress = 0; g.holding = false; g.holdTarget = null; needRelease = true;
        g.sel = firstPart(t.slots);
      }
    } else {
      g.holdProgress = 0; g.holding = false; g.holdTarget = null;
    }
    // 撿東西
    var i, o;
    for (i = g.coins.length - 1; i >= 0; i--) {
      o = g.coins[i];
      if (dist(p.x, p.y, o.x, o.y) <= 34) { g.gold += 2; g.coins.splice(i, 1); }
    }
    for (i = g.parts.length - 1; i >= 0; i--) {
      o = g.parts[i];
      if (freeBag() < 0) break;
      if (dist(p.x, p.y, o.x, o.y) <= 34) { g.bag[freeBag()] = o.kind; g.parts.splice(i, 1); }
    }
  }

  function doBuy() {
    var i = padStanding(); if (i < 0) return;
    var pad = PADS[i];
    if (!g.unlocked[i] || g.gold < pad.price) return;
    if (i === 0) {
      var f = freeBag(); if (f < 0) return;
      g.bag[f] = 'towerShell';
    } else if (i === 1) {
      mkUnit('wolf', 'ally', pad.x, pad.y + 50, ['melee', null]);
    } else {
      mkUnit('statue', 'ally', pad.x, pad.y + 50, [null, null, null]);
    }
    g.gold -= pad.price;
  }

  function doUse() {
    var item = g.bag[g.bagSel]; if (!item) return;
    if (item === 'towerShell') {
      var p = g.p, i;
      if (dist(p.x, p.y, CASTLE.x, CASTLE.y) <= 60) return;
      for (i = 0; i < PADS.length; i++) if (dist(p.x, p.y, PADS[i].x, PADS[i].y) <= 60) return;
      for (i = 0; i < g.units.length; i++) {
        var u = g.units[i];
        if (!u.dead && u.kind === 'tower' && dist(p.x, p.y, u.x, u.y) <= 60) return;
      }
      mkUnit('tower', 'ally', p.x, p.y, [null, null, null]);
      g.bag[g.bagSel] = null;
    } else {
      var t = g.target;
      if (!t || t.isCorpse || t.dead) return;
      for (var k = 0; k < t.slots.length; k++) {
        if (!t.slots[k]) {
          t.slots[k] = item; g.bag[g.bagSel] = null;
          if (g.sel < 0) g.sel = k;
          return;
        }
      }
    }
  }

  function doK() {
    var t = g.target; if (!t) return;
    var n = t.slots.length;
    for (var i = 1; i <= n; i++) {
      var k = ((g.sel < 0 ? -1 : g.sel) + i) % n;
      if (t.slots[k]) { g.sel = k; return; }
    }
  }

  // ---------- 主更新 ----------
  function update(dt) {
    if (phase !== 'play') return;
    g.t += dt;
    var i, o;

    // 出怪
    while (g.spawnIdx < g.sched.length && g.sched[g.spawnIdx].t <= g.t) {
      var s = g.sched[g.spawnIdx++], x, y;
      if (s.edge === 'north') { x = rnd(100, 1180); y = 60; }
      else if (s.edge === 'south') { x = rnd(100, 1180); y = 710; }
      else if (s.edge === 'west') { x = 10; y = rnd(80, 700); }
      else { x = 1270; y = rnd(80, 700); }
      mkEnemy(s.type, x, y);
    }

    updatePlayer(dt);

    // 單位
    var allyList = [], enemyList = [];
    for (i = 0; i < g.units.length; i++) {
      o = g.units[i];
      if (o.team === 'enemy') enemyList.push(o); else if (o.team === 'ally') allyList.push(o);
    }
    var snapshot = g.units.slice();
    for (i = 0; i < snapshot.length; i++) if (!snapshot[i].dead) updateUnit(snapshot[i], dt, allyList, enemyList);

    // 投射物
    for (i = g.projs.length - 1; i >= 0; i--) {
      o = g.projs[i];
      o.x += o.vx * dt; o.y += o.vy * dt; o.traveled += 400 * dt;
      var hit = false, list = o.team === 'ally' ? enemyList : allyList, j, h;
      for (j = 0; j < list.length && !hit; j++) {
        h = list[j]; if (h.dead) continue;
        if (dist(o.x, o.y, h.x, h.y) <= h.w / 2 + 5) { damageUnit(h, o.dmg); hit = true; }
      }
      if (!hit && o.team === 'enemy' && !g.p.down && dist(o.x, o.y, g.p.x, g.p.y) <= PLAYER_R + 5) { damagePlayer(o.dmg); hit = true; }
      if (hit || o.traveled > 320 || o.x < -20 || o.x > CW + 20 || o.y < -20 || o.y > CH + 20) g.projs.splice(i, 1);
    }

    // 時間類物件
    for (i = g.sparks.length - 1; i >= 0; i--) { g.sparks[i].age += dt; if (g.sparks[i].age >= SPARK_DUR) g.sparks.splice(i, 1); }
    for (i = g.coins.length - 1; i >= 0; i--) { g.coins[i].life -= dt; if (g.coins[i].life <= 0) g.coins.splice(i, 1); }
    for (i = g.corpses.length - 1; i >= 0; i--) {
      g.corpses[i].life -= dt;
      if (g.corpses[i].life <= 0) { if (g.target === g.corpses[i]) { g.target = null; g.sel = -1; } g.corpses.splice(i, 1); }
    }
    g.units = g.units.filter(function (u) { return !u.dead; });
    if (g.target && g.target.dead) { g.target = null; g.sel = -1; }

    // 結束條件(批次最尾端判一次)
    if (g.castleHp <= 0) { g.castleHp = 0; g.win = false; phase = 'result'; return; }
    if (g.spawnIdx >= g.sched.length) {
      var alive = false;
      for (i = 0; i < g.units.length; i++) {
        o = g.units[i];
        if (o.team === 'enemy' && !isHarmless(o)) { alive = true; break; }
      }
      if (!alive) {
        g.units = g.units.filter(function (u) { return u.team !== 'enemy'; });
        g.win = true; phase = 'result';
      }
    }
  }

  // ---------- 輸入(只有鍵盤) ----------
  var GAME_KEYS = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyJ: 1, KeyK: 1, KeyQ: 1, KeyL: 1, KeyH: 1, Enter: 1 };

  function closeGuide() {
    jBlock = keys.J; // J 還按著就要等放開
    keys.J = false;
    if (guideReturn === 'start') { newGame(); needRelease = false; }
    phase = 'play';
  }
  function openGuide() { guidePage = 0; guideReturn = 'play'; phase = 'guide'; }

  window.addEventListener('keydown', function (e) {
    if (GAME_KEYS[e.code]) e.preventDefault();
    if (e.repeat) return;
    var c = e.code;
    if (c === 'KeyW') keys.W = true;
    else if (c === 'KeyA') keys.A = true;
    else if (c === 'KeyS') keys.S = true;
    else if (c === 'KeyD') keys.D = true;

    if (phase === 'guide') {
      if (c === 'KeyJ') {
        if (guidePage < GUIDE.length - 1) guidePage++; else { keys.J = true; closeGuide(); }
      } else if (c === 'KeyA') {
        if (guidePage > 0) guidePage--;
      }
      return;
    }
    if (phase === 'result') {
      if (c === 'Enter') { newGame(); needRelease = false; jBlock = false; phase = 'play'; }
      return;
    }
    // play
    if (c === 'KeyH') { openGuide(); return; }
    if (g.p.down) { if (c === 'KeyJ') keys.J = true; return; }
    if (c === 'KeyJ') {
      keys.J = true;
      if (padStanding() >= 0) doBuy();
    } else if (c === 'KeyK') doK();
    else if (c === 'KeyQ') g.bagSel = (g.bagSel + 1) % 3;
    else if (c === 'KeyL') doUse();
  });

  window.addEventListener('keyup', function (e) {
    if (GAME_KEYS[e.code]) e.preventDefault();
    var c = e.code;
    if (c === 'KeyW') keys.W = false;
    else if (c === 'KeyA') keys.A = false;
    else if (c === 'KeyS') keys.S = false;
    else if (c === 'KeyD') keys.D = false;
    else if (c === 'KeyJ') { keys.J = false; jBlock = false; needRelease = false; }
  });

  window.addEventListener('blur', function () {
    keys.W = keys.A = keys.S = keys.D = keys.J = false;
  });

  // ---------- 繪製 ----------
  var FONT = '"Microsoft JhengHei", "PingFang TC", sans-serif';

  function renderGuide() {
    var fx = 320, fy = 100, fw = 640, fh = 360;
    ctx.fillStyle = '#14141c';
    ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd86b';
    ctx.font = 'bold 40px ' + FONT;
    ctx.fillText((guidePage + 1) + '. ' + GUIDE[guidePage].title, CW / 2, 55);
    ctx.strokeStyle = '#555a70'; ctx.lineWidth = 2;
    ctx.strokeRect(fx - 3, fy - 3, fw + 6, fh + 6);
    Art.drawGuidePage(ctx, { page: guidePage + 1, x: fx, y: fy, w: fw, h: fh });
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px ' + FONT;
    ctx.fillText(GUIDE[guidePage].text, CW / 2, 520);
    ctx.fillStyle = '#aab';
    ctx.font = '22px ' + FONT;
    ctx.fillText((guidePage + 1) + ' / ' + GUIDE.length, CW / 2, 600);
    var hint = (guidePage > 0 ? 'A 上一頁    ' : '') + (guidePage < GUIDE.length - 1 ? 'J 下一頁' : (guideReturn === 'start' ? 'J 開始遊戲' : 'J 回到遊戲'));
    ctx.fillText(hint, CW / 2, 650);
  }

  function unitState(u) {
    var t = g.target === u;
    var st = {
      x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp,
      hitAge: u.hitAge, hitDuration: u.kind === 'castle' ? CASTLE_HIT_DUR : HIT_DUR,
      attackAge: u.attackAge, attackDuration: ATK_DUR, moving: u.moving, targeted: t
    };
    return st;
  }

  function drawUnit(u) {
    var st = unitState(u);
    switch (u.kind) {
      case 'castle':
        st.zoneActive = dist(g.p.x, g.p.y, CASTLE.x, CASTLE.y) <= ZONE_R && !g.p.down;
        Art.drawCastle(ctx, st); break;
      case 'tower': Art.drawTower(ctx, st); break;
      case 'wolf': st.team = u.team; Art.drawWolf(ctx, st); break;
      case 'statue': st.team = u.team; Art.drawStatue(ctx, st); break;
      default: st.type = u.kind; st.harmless = isHarmless(u); Art.drawEnemy(ctx, st);
    }
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);
    if (phase === 'guide') { renderGuide(); return; }

    var i, o, st, p = g.p;
    Art.drawBackground(ctx, {});
    for (i = 0; i < PADS.length; i++) {
      var pad = PADS[i];
      var ps = !g.unlocked[i] ? 'locked' : (g.gold < pad.price ? 'poor' : 'ok');
      Art.drawShopPad(ctx, { x: pad.x, y: pad.y, index: i, name: pad.name, price: pad.price, state: ps, standing: !p.down && padStanding() === i });
    }
    for (i = 0; i < g.coins.length; i++) Art.drawCoin(ctx, { x: g.coins[i].x, y: g.coins[i].y, life: g.coins[i].life, maxLife: 15 });
    for (i = 0; i < g.parts.length; i++) Art.drawGroundPart(ctx, { kind: g.parts[i].kind, x: g.parts[i].x, y: g.parts[i].y });
    for (i = 0; i < g.corpses.length; i++) {
      o = g.corpses[i];
      Art.drawCorpse(ctx, { kind: o.kind, x: o.x, y: o.y, life: o.life, maxLife: 12, targeted: g.target === o });
    }
    var sorted = g.units.slice().sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < sorted.length; i++) drawUnit(sorted[i]);
    for (i = 0; i < sorted.length; i++) {
      o = sorted[i];
      Art.drawSoulSlots(ctx, { x: o.x, y: o.y - o.w / 2 - 20, slots: o.slots.slice(), highlight: g.target === o ? g.sel : -1 });
    }
    for (i = 0; i < g.corpses.length; i++) {
      o = g.corpses[i];
      Art.drawSoulSlots(ctx, { x: o.x, y: o.y - o.w / 2 - 12, slots: o.slots.slice(), highlight: g.target === o ? g.sel : -1 });
    }
    var t = g.target;
    if (g.holding && t && !t.isCorpse && t.team === 'enemy' && g.sel >= 0) {
      var c = slotCenter(t, g.sel);
      Art.drawRipBeam(ctx, { x1: p.x, y1: p.y, x2: c.x, y2: c.y, progress: Math.min(1, g.holdProgress) });
    }
    if (!p.down) {
      Art.drawPlayer(ctx, {
        x: p.x, y: p.y, moving: p.moving, hp: p.hp, maxHp: p.maxHp, hitAge: p.hitAge, hitDuration: HIT_DUR,
        holding: g.holding, holdProgress: g.holding ? Math.min(1, g.holdProgress) : 0
      });
    }
    for (i = 0; i < g.projs.length; i++) {
      o = g.projs[i];
      Art.drawProjectile(ctx, { x: o.x, y: o.y, angle: o.angle, team: o.team });
    }
    for (i = 0; i < g.sparks.length; i++) {
      o = g.sparks[i];
      Art.drawHitSpark(ctx, { x: o.x, y: o.y, age: o.age, duration: SPARK_DUR });
    }
    // 邊緣預警
    for (var k = 0; k < WAVES.length; k++) {
      var rem = waveStart(k) - g.t;
      if (rem > 0 && rem <= 3) {
        for (var e in WAVES[k]) Art.drawEdgeWarning(ctx, { edge: e, remaining: rem, total: 3 });
      }
    }
    Art.drawBag(ctx, { items: g.bag.slice(), selected: g.bagSel });
    var started = 0;
    for (k = 0; k < WAVES.length; k++) if (g.t >= waveStart(k)) started++;
    var nextIn = started < TOTAL_WAVES ? Math.ceil(waveStart(started) - g.t) : -1;
    Art.drawHud(ctx, {
      gold: g.gold, castleHp: Math.max(0, g.castleHp), castleMaxHp: CASTLE_MAX_HP,
      wave: started, totalWaves: TOTAL_WAVES, nextWaveIn: nextIn,
      respawnIn: p.down ? Math.max(1, Math.ceil(p.respawn)) : -1
    });
    if (phase === 'result') Art.drawResult(ctx, { win: g.win, wave: started, totalWaves: TOTAL_WAVES });
  }

  // ---------- 主迴圈 ----------
  var last = null;
  function frame(ts) {
    if (last === null) last = ts;
    var dt = Math.min((ts - last) / 1000, 1 / 30);
    if (dt < 0) dt = 0;
    last = ts;
    try { update(dt); render(); } catch (err) { console.error(err); }
    requestAnimationFrame(frame);
  }

  newGame();
  requestAnimationFrame(frame);
})();
