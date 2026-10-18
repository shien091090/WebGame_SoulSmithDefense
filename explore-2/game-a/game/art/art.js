// 魂匠親征 — 美術繪製模組(Canvas 2D 幾何繪製, 無外部資源)
// 全域物件 window.Art; 所有函式只負責「給狀態, 畫出來」
(function () {
  'use strict';

  var FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';

  var palette = {
    bg: '#2f4d36',
    grassDot: '#3a5c40',
    road: '#9a8661',
    roadEdge: '#6c5c40',
    roadMid: '#b3a07a',
    hudBg: '#14171e',
    text: '#ffffff',
    textDim: '#aab2c0',
    // 陣營
    ally: '#6cd0ff',          // 我方投射物 / 光束 / 旋風 / 冰霜圈外緣
    enemy: '#ff4a5e',         // 敵方投射物 / 光束 / 旋風 / 冰霜圈外緣 / 預警
    // 我方單位本體
    allyMain: '#4f78b0',
    allyDark: '#25406a',
    allyLight: '#a8c8f0',
    // 中立
    neutralMain: '#85868a',
    neutralDark: '#4b4c50',
    neutralLight: '#b0b1b4',
    // 敵人本體
    enemyMain: '#c8364c',
    enemyDark: '#6e1424',
    enemyLight: '#ff8a98',
    enemyEye: '#ffe25a',
    // 玩家
    player: '#a070ff',
    playerDark: '#4a2a8c',
    playerRing: '#ffffff',
    soul: '#e6dcff',          // 魂件能量(魂件堆、搶奪連線)
    // 魂件
    itemRanged: '#7ee06a',
    itemMelee: '#ff5a4a',
    itemSeek: '#ff7ad9',
    itemMarch: '#ffd23f',
    itemGuard: '#6a9cff',
    itemFrost: '#bff0ff',
    itemStone: '#c8c8cc',
    slotEmpty: '#7a808c',
    slotBg: '#15171d',
    // 其他
    coin: '#f2b134',
    coinRim: '#9c6a0c',
    hpAlly: '#5fe07a',
    hpEnemy: '#ff5a5a',
    hpBg: '#1a1a1a',
    target: '#fff27a',        // 互動目標外框
    cursor: '#ffe94a',        // 彈窗游標
    ice: '#9fe6ff',           // 減速色調
    valid: '#5ef08a',
    invalid: '#ff5050',
    castleMain: '#4a6fa6',
    castleDark: '#22385e',
    castleLight: '#9cc0ee',
    zone: '#8fd8ff',
    combo: '#ffd86a',
    slowmo: '#bfe6ff'
  };

  // ---------- 小工具 ----------
  function now() {
    return ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) / 1000;
  }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function obj(s) { return (s && typeof s === 'object') ? s : {}; }
  function prog(age, dur) {
    age = num(age, 0); dur = num(dur, 0);
    if (dur <= 0) return 1;
    return clamp(age / dur, 0, 1);
  }
  function playing(age, dur) {
    age = num(age, NaN); dur = num(dur, NaN);
    return isFinite(age) && isFinite(dur) && dur > 0 && age >= 0 && age < dur;
  }
  function hexRgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (!isFinite(n)) n = 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    var A = hexRgb(a), B = hexRgb(b);
    t = clamp(num(t, 0), 0, 1);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function rgba(h, a) { var c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
  function txt(ctx, s, x, y, o) {
    o = o || {};
    s = (s === undefined || s === null) ? '' : String(s);
    ctx.font = (o.weight || 'bold') + ' ' + (o.size || 14) + 'px ' + FONT;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.base || 'middle';
    if (o.stroke !== false) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.sw || 3;
      ctx.strokeStyle = o.strokeColor || 'rgba(0,0,0,0.85)';
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = o.color || '#ffffff';
    ctx.fillText(s, x, y);
  }
  function textW(ctx, s, size, weight) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    var m = ctx.measureText(String(s));
    return (m && isFinite(m.width)) ? m.width : String(s).length * size;
  }
  function team(t) { return t === 'enemy' ? 'enemy' : 'ally'; }
  function teamColor(t) { return team(t) === 'enemy' ? palette.enemy : palette.ally; }

  var ENEMY_SIZE = { imp: 32, archer: 32, brute: 44, shield: 40, frost: 32 };
  function enemyType(t) { return ENEMY_SIZE[t] ? t : 'imp'; }

  var ITEM_COLOR = {
    ranged: palette.itemRanged, melee: palette.itemMelee, seek: palette.itemSeek,
    march: palette.itemMarch, guard: palette.itemGuard, frost: palette.itemFrost, slotStone: palette.itemStone
  };

  // ---------- 魂件圖示(18 格基準, k 為放大倍率) ----------
  function itemIcon(ctx, kind, cx, cy, k) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    var c = ITEM_COLOR[kind];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (!c) {
      // 表外值: 灰點(不畫成任何合法圖示)
      ctx.fillStyle = palette.slotEmpty;
      circle(ctx, 0, 0, 2); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = c; ctx.strokeStyle = c;
    if (kind === 'ranged') {            // 斜向箭
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(4, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(0.5, -5); ctx.lineTo(5, -0.5); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-6.5, 1.5); ctx.moveTo(-5, 5); ctx.lineTo(-1.5, 6.5); ctx.stroke();
    } else if (kind === 'melee') {      // 直劍
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(1.8, -4.5); ctx.lineTo(1.8, 2.5); ctx.lineTo(-1.8, 2.5); ctx.lineTo(-1.8, -4.5); ctx.closePath(); ctx.fill();
      ctx.fillRect(-5, 2.5, 10, 2);
      ctx.fillRect(-1, 4.5, 2, 3);
    } else if (kind === 'seek') {       // 眼
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(0, -7, 7, 0); ctx.quadraticCurveTo(0, 7, -7, 0); ctx.closePath(); ctx.stroke();
      circle(ctx, 0, 0, 2.6); ctx.fill();
    } else if (kind === 'march') {      // 雙箭頭 >>
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(-1, 0); ctx.lineTo(-6, 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(5, 0); ctx.lineTo(0, 5); ctx.stroke();
    } else if (kind === 'guard') {      // 盾
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(6, -5); ctx.lineTo(5.5, 1); ctx.quadraticCurveTo(3.5, 5.5, 0, 7.5); ctx.quadraticCurveTo(-3.5, 5.5, -5.5, 1); ctx.lineTo(-6, -5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = palette.slotBg;
      ctx.fillRect(-0.8, -4.5, 1.6, 9);
    } else if (kind === 'frost') {      // 雪花
      ctx.lineWidth = 1.6;
      for (var i = 0; i < 3; i++) {
        var a = i * Math.PI / 3 + Math.PI / 2;
        var dx = Math.cos(a) * 7, dy = Math.sin(a) * 7;
        ctx.beginPath(); ctx.moveTo(-dx, -dy); ctx.lineTo(dx, dy); ctx.stroke();
      }
      circle(ctx, 0, 0, 1.6); ctx.fill();
    } else if (kind === 'slotStone') {  // 擴槽石: 石塊 + 加號
      ctx.fillStyle = '#5a5a62';
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(7, -1); ctx.lineTo(4, 7); ctx.lineTo(-4, 7); ctx.lineTo(-7, -1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(3, 1); ctx.moveTo(0, -2); ctx.lineTo(0, 4); ctx.stroke();
    }
    ctx.restore();
  }

  // 單格(cell 為邊長): 空格 = 虛線框, 有魂件 = 實心深底 + 該色邊
  function slotCell(ctx, kind, cx, cy, cell) {
    var h = cell / 2;
    var k = cell / 18;
    if (kind === null || kind === undefined || kind === '') {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      rr(ctx, cx - h + 1, cy - h + 1, cell - 2, cell - 2, 3 * k); ctx.fill();
      ctx.setLineDash([3 * k, 2 * k]);
      ctx.strokeStyle = palette.slotEmpty; ctx.lineWidth = 1.2 * k;
      rr(ctx, cx - h + 1, cy - h + 1, cell - 2, cell - 2, 3 * k); ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    var col = ITEM_COLOR[kind] || palette.slotEmpty;
    ctx.fillStyle = kind === 'slotStone' ? '#2c2c33' : palette.slotBg;
    rr(ctx, cx - h, cy - h, cell, cell, 3 * k); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.6 * k;
    rr(ctx, cx - h + 0.8 * k, cy - h + 0.8 * k, cell - 1.6 * k, cell - 1.6 * k, 3 * k); ctx.stroke();
    itemIcon(ctx, kind, cx, cy, k * 0.92);
  }

  // ---------- 共用單位零件 ----------
  function hpBar(ctx, cx, cy, w, hp, max, col) {
    var p = clamp(num(hp, 0) / Math.max(1, num(max, 1)), 0, 1);
    ctx.fillStyle = palette.hpBg;
    ctx.fillRect(cx - w / 2, cy - 2, w, 4);
    ctx.fillStyle = col;
    ctx.fillRect(cx - w / 2, cy - 2, w * p, 4);
  }
  function targetFrame(ctx, cx, cy, w, h) {
    ctx.strokeStyle = palette.target;
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - w / 2 - 1.5, cy - h / 2 - 1.5, w + 3, h + 3);
  }
  function downTimer(ctx, cx, cy, d, remaining, total) {
    var r = d / 2;
    var p = 1 - clamp(num(remaining, 0) / Math.max(0.001, num(total, 6)), 0, 1);
    ctx.fillStyle = 'rgba(10,12,18,0.85)';
    circle(ctx, cx, cy, r); ctx.fill();
    ctx.fillStyle = '#e8eef8';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 1;
    circle(ctx, cx, cy, r - 0.5); ctx.stroke();
  }
  function feet(ctx, half, col) {
    var ph = Math.sin(now() * 14);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(-half * 0.4, half - 3 - Math.max(0, ph) * 2, half * 0.2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(half * 0.4, half - 3 - Math.max(0, -ph) * 2, half * 0.2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  }

  // 依 state 算出本體顏色(受擊變白、減速變冰藍、倒下變灰)
  function bodyCols(base, st, extra) {
    var m = base.main, d = base.dark, l = base.light;
    if (extra && extra.slowed) { m = mix(m, palette.ice, 0.5); d = mix(d, palette.ice, 0.35); l = mix(l, palette.ice, 0.5); }
    if (playing(st.hitAge, st.hitDuration)) {
      var t = 0.75 * (1 - prog(st.hitAge, st.hitDuration));
      m = mix(toHex(m), '#ffffff', t); l = mix(toHex(l), '#ffffff', t); d = mix(toHex(d), '#ffffff', t * 0.6);
    }
    return { main: m, dark: d, light: l };
  }
  function toHex(c) {
    if (c.charAt(0) === '#') return c;
    var m = c.match(/\d+/g) || [0, 0, 0];
    return '#' + m.slice(0, 3).map(function (v) { var s = (+v).toString(16); return s.length < 2 ? '0' + s : s; }).join('');
  }
  function attackLift(st) {
    if (!playing(st.attackAge, st.attackDuration)) return 0;
    return -3 * Math.sin(Math.PI * prog(st.attackAge, st.attackDuration));
  }

  // ---------- 本體畫法(以中心為原點) ----------
  function bodyTower(ctx, c, atk) {
    ctx.fillStyle = c.dark;
    rr(ctx, -18, -4, 36, 24, 3); ctx.fill();
    ctx.fillStyle = c.main;
    rr(ctx, -16, -6, 32, 24, 3); ctx.fill();
    // 頂部雉堞
    ctx.fillStyle = c.light;
    ctx.fillRect(-21, -14, 42, 9);
    for (var i = 0; i < 4; i++) ctx.fillRect(-21 + i * 12, -21, 7, 8);
    ctx.fillStyle = c.dark;
    ctx.fillRect(-21, -6, 42, 2);
    // 箭孔
    ctx.fillStyle = atk ? '#ffffff' : '#0e1622';
    ctx.fillRect(-2, -1, 4, 11);
    ctx.fillRect(-5, 3, 10, 3);
  }
  function bodySoldier(ctx, c) {
    // 矛
    ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(12, 13); ctx.lineTo(12, -12); ctx.stroke();
    ctx.fillStyle = '#e8eef8';
    ctx.beginPath(); ctx.moveTo(12, -15); ctx.lineTo(14.5, -10); ctx.lineTo(9.5, -10); ctx.closePath(); ctx.fill();
    // 身體
    ctx.fillStyle = c.dark;
    rr(ctx, -10, 0, 20, 13, 4); ctx.fill();
    // 頭盔
    ctx.fillStyle = c.main;
    circle(ctx, 0, -3, 10); ctx.fill();
    ctx.fillStyle = c.light;
    ctx.fillRect(-1.5, -14, 3, 6);
    ctx.fillStyle = '#0e1622';
    ctx.fillRect(-6, -4, 12, 3);
  }
  function bodyGolem(ctx, c, neutral) {
    ctx.fillStyle = c.dark;
    rr(ctx, -26, -6, 10, 22, 4); ctx.fill();
    rr(ctx, 16, -6, 10, 22, 4); ctx.fill();
    ctx.fillStyle = c.main;
    rr(ctx, -19, -22, 38, 42, 8); ctx.fill();
    ctx.fillStyle = c.light;
    rr(ctx, -15, -19, 30, 8, 3); ctx.fill();
    // 裂紋
    ctx.strokeStyle = c.dark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-3, 9); ctx.lineTo(-6, 15); ctx.moveTo(9, 2); ctx.lineTo(5, 8); ctx.stroke();
    // 眼
    ctx.fillStyle = neutral ? '#2e2f33' : '#9ff4ff';
    ctx.fillRect(-10, -8, 6, 4);
    ctx.fillRect(4, -8, 6, 4);
  }
  function horns(ctx, half, col, n) {
    ctx.fillStyle = col;
    var top = -half + 1;
    if (n === 3) {
      ctx.beginPath(); ctx.moveTo(-3, top + 6); ctx.lineTo(0, top); ctx.lineTo(3, top + 6); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(-half * 0.62, top + 9); ctx.lineTo(-half * 0.55, top); ctx.lineTo(-half * 0.25, top + 7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(half * 0.62, top + 9); ctx.lineTo(half * 0.55, top); ctx.lineTo(half * 0.25, top + 7); ctx.closePath(); ctx.fill();
  }
  function demonEyes(ctx, y, gap, s) {
    ctx.fillStyle = palette.enemyEye;
    ctx.beginPath(); ctx.moveTo(-gap - s, y - s * 0.6); ctx.lineTo(-gap + s, y); ctx.lineTo(-gap - s, y + s * 0.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(gap + s, y - s * 0.6); ctx.lineTo(gap - s, y); ctx.lineTo(gap + s, y + s * 0.5); ctx.closePath(); ctx.fill();
  }
  function bodyEnemy(ctx, type, c) {
    if (type === 'brute') {
      horns(ctx, 22, c.dark, 3);
      ctx.fillStyle = c.dark;
      circle(ctx, -16, 8, 6); ctx.fill(); circle(ctx, 16, 8, 6); ctx.fill();
      ctx.fillStyle = c.main;
      rr(ctx, -15, -13, 30, 32, 9); ctx.fill();
      ctx.fillStyle = c.light; ctx.fillRect(-9, 10, 18, 3);
      demonEyes(ctx, -3, 5, 3.2);
    } else if (type === 'shield') {
      horns(ctx, 20, c.dark, 2);
      ctx.fillStyle = c.main;
      circle(ctx, -4, 3, 14); ctx.fill();
      demonEyes(ctx, 0, 4, 2.6);
      // 盾(朝右, 敵人前進方向)
      ctx.fillStyle = '#5d6878';
      rr(ctx, 4, -15, 15, 33, 4); ctx.fill();
      ctx.fillStyle = '#a9b5c6';
      rr(ctx, 6, -13, 11, 29, 3); ctx.fill();
      ctx.fillStyle = '#5d6878';
      ctx.fillRect(10, -10, 3, 23);
    } else if (type === 'archer') {
      horns(ctx, 16, c.dark, 2);
      ctx.fillStyle = c.main;
      circle(ctx, -2, 3, 11); ctx.fill();
      ctx.fillStyle = c.dark;   // 兜帽
      ctx.beginPath(); ctx.arc(-2, 1, 11, Math.PI, 0); ctx.closePath(); ctx.fill();
      demonEyes(ctx, 3, 3.5, 2.4);
      // 弓
      ctx.strokeStyle = '#d6a860'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(6, 3, 10, -Math.PI * 0.42, Math.PI * 0.42); ctx.stroke();
      ctx.strokeStyle = '#f2e6c8'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(6 + 10 * Math.cos(-Math.PI * 0.42), 3 + 10 * Math.sin(-Math.PI * 0.42)); ctx.lineTo(6 + 10 * Math.cos(Math.PI * 0.42), 3 + 10 * Math.sin(Math.PI * 0.42)); ctx.stroke();
    } else if (type === 'frost') {
      ctx.fillStyle = c.main;
      circle(ctx, 0, 3, 12); ctx.fill();
      // 冰冠
      ctx.fillStyle = '#d8f6ff';
      ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-7, -14); ctx.lineTo(-4, -8); ctx.lineTo(0, -15); ctx.lineTo(4, -8); ctx.lineTo(7, -14); ctx.lineTo(9, -6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7fd4f0'; ctx.lineWidth = 1; ctx.stroke();
      demonEyes(ctx, 3, 3.5, 2.4);
      ctx.fillStyle = '#d8f6ff';
      ctx.fillRect(-4, 9, 8, 2);
    } else { // imp
      horns(ctx, 16, c.dark, 2);
      ctx.fillStyle = c.main;
      circle(ctx, 0, 3, 12); ctx.fill();
      demonEyes(ctx, 1, 3.5, 2.6);
      ctx.fillStyle = c.dark;
      ctx.fillRect(-4, 8, 8, 2);
    }
  }
  function bodyPlayer(ctx, c, ring) {
    // 錘
    ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(12, -5); ctx.stroke();
    ctx.fillStyle = '#e8eef8';
    ctx.save(); ctx.translate(12, -6); ctx.rotate(0.35); ctx.fillRect(-4, -2.5, 8, 5); ctx.restore();
    ctx.fillStyle = c.main;
    circle(ctx, 0, 0, 12); ctx.fill();
    ctx.fillStyle = c.dark;
    ctx.beginPath(); ctx.arc(0, -1, 12, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    circle(ctx, -4, 1, 1.8); ctx.fill(); circle(ctx, 4, 1, 1.8); ctx.fill();
    ctx.strokeStyle = ring; ctx.lineWidth = 2.5;
    circle(ctx, 0, 0, 14.5); ctx.stroke();
  }

  // 我方 / 中立單位共通流程
  function drawUnit(ctx, st, half, timerD, base, bodyFn, opts) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var downed = num(st.downedRemaining, 0) > 0 && !(opts && opts.neutral);
    var c = downed ? { main: base.dark, dark: '#2a2c30', light: '#7a7c80' } : bodyCols(base, st);
    if (downed) {
      c = { main: mix(toHex(base.main), '#777777', 0.75), dark: mix(toHex(base.dark), '#333333', 0.7), light: mix(toHex(base.light), '#999999', 0.75) };
    }
    ctx.save();
    ctx.translate(x, y);
    // 影
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, half - 3, half * 0.75, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    if (downed) {
      ctx.globalAlpha = 0.85;
      ctx.rotate(0.55);
      ctx.scale(0.78, 0.78);
      bodyFn(ctx, c, false);
    } else {
      var atk = playing(st.attackAge, st.attackDuration);
      ctx.translate(0, attackLift(st));
      bodyFn(ctx, c, atk);
      if (st.moving) feet(ctx, half, c.dark);
    }
    ctx.restore();
    if (downed) downTimer(ctx, 0, 0, timerD, st.downedRemaining, st.downedTotal);
    ctx.restore();
    if (!downed && !(opts && opts.neutral) && num(st.hp, 1) < num(st.maxHp, 1)) {
      hpBar(ctx, x, y - half - 6, half * 2, st.hp, st.maxHp, palette.hpAlly);
    }
    if (st.targeted) {
      ctx.save(); targetFrame(ctx, x, y, half * 2, half * 2); ctx.restore();
    }
  }

  var ALLY = { main: palette.allyMain, dark: palette.allyDark, light: palette.allyLight };
  var NEUTRAL = { main: palette.neutralMain, dark: palette.neutralDark, light: palette.neutralLight };
  var GOLEM_ALLY = { main: '#5f80b6', dark: '#2c4570', light: '#a6c0e8' };
  var ENEMY = { main: palette.enemyMain, dark: palette.enemyDark, light: palette.enemyLight };
  var BRUTE = { main: '#a32438', dark: '#4e0c18', light: '#e0707e' };
  var FROSTE = { main: '#b04870', dark: '#5a1a34', light: '#f0a0c0' };

  // ---------- 背景 ----------
  var GRASS = (function () {
    var a = [], s = 7;
    function r() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < 260; i++) a.push([r() * 1280, 50 + r() * 670, 1 + r() * 2.2]);
    return a;
  })();
  var PATHS = [
    [[0, 170], [560, 170], [720, 400]],
    [[0, 630], [560, 630], [720, 400]],
    [[720, 400], [1094, 400]]
  ];
  function strokePaths(ctx, w, col, dash) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    ctx.setLineDash(dash || []);
    for (var i = 0; i < PATHS.length; i++) {
      var p = PATHS[i];
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (var j = 1; j < p.length; j++) ctx.lineTo(p[j][0], p[j][1]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawBackground(ctx) {
    ctx.save();
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = palette.grassDot;
    for (var i = 0; i < GRASS.length; i++) { ctx.fillRect(GRASS[i][0], GRASS[i][1], GRASS[i][2], GRASS[i][2] * 2); }
    // 路的外緣: 匯流段終點用圓頭接主堡, 其餘 butt
    strokePaths(ctx, 60, palette.roadEdge);
    strokePaths(ctx, 56, palette.road);
    // 匯流處補圓
    ctx.fillStyle = palette.road;
    circle(ctx, 720, 400, 28); ctx.fill();
    strokePaths(ctx, 2, rgba(palette.roadMid, 0.6), [10, 14]);
    ctx.restore();
  }

  // ---------- 主堡 ----------
  function drawCastle(ctx, st) {
    st = obj(st);
    var x = num(st.x, 1150), y = num(st.y, 400);
    var zone = !!st.zoneActive;
    ctx.save();
    // 主堡區(畫在本體下面)
    ctx.fillStyle = rgba(palette.zone, zone ? 0.16 : 0.06);
    circle(ctx, x, y, 120); ctx.fill();
    ctx.strokeStyle = rgba(palette.zone, zone ? 0.85 : 0.3);
    ctx.lineWidth = zone ? 3 : 2;
    ctx.setLineDash([12, 8]);
    circle(ctx, x, y, zone ? 118.5 : 119); ctx.stroke();
    ctx.setLineDash([]);
    var hit = playing(st.hitAge, st.hitDuration) ? (1 - prog(st.hitAge, st.hitDuration)) : 0;
    var m = mix(palette.castleMain, '#ff3a3a', hit * 0.8), d = mix(palette.castleDark, '#7a0a0a', hit * 0.8), l = mix(palette.castleLight, '#ffb0b0', hit * 0.8);
    ctx.translate(x, y);
    // 四角塔
    ctx.fillStyle = d;
    rr(ctx, -54, -40, 108, 94, 6); ctx.fill();
    ctx.fillStyle = m;
    rr(ctx, -46, -36, 92, 84, 5); ctx.fill();
    var corners = [[-42, -42], [42, -42]];
    for (var i = 0; i < 2; i++) {
      ctx.fillStyle = d; rr(ctx, corners[i][0] - 14, -56, 28, 50, 4); ctx.fill();
      ctx.fillStyle = l; ctx.fillRect(corners[i][0] - 14, -56, 28, 7);
      ctx.fillStyle = d; ctx.fillRect(corners[i][0] - 4, -56, 8, 4);
    }
    ctx.fillStyle = l;
    ctx.fillRect(-28, -36, 56, 7);
    for (var j = 0; j < 4; j++) ctx.fillRect(-28 + j * 16, -44, 8, 8);
    // 門
    ctx.fillStyle = '#0e1622';
    ctx.beginPath(); ctx.moveTo(-14, 54); ctx.lineTo(-14, 26); ctx.arc(0, 26, 14, Math.PI, 0); ctx.lineTo(14, 54); ctx.closePath(); ctx.fill();
    // 旗
    ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, -8); ctx.stroke();
    ctx.fillStyle = palette.ally;
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(16, -25); ctx.lineTo(0, -20); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (st.targeted) { ctx.save(); targetFrame(ctx, x, y, 112, 112); ctx.restore(); }
  }

  function drawTower(ctx, st) { ctx.save(); drawUnit(ctx, st, 24, 24, ALLY, function (c2, cc, atk) { bodyTower(c2, cc, atk); }); ctx.restore(); }
  function drawSoldier(ctx, st) { ctx.save(); drawUnit(ctx, st, 16, 16, ALLY, function (c2, cc) { bodySoldier(c2, cc); }); ctx.restore(); }
  function drawGolem(ctx, st) {
    st = obj(st);
    var neutral = st.team === 'neutral';
    ctx.save();
    drawUnit(ctx, st, 28, 28, neutral ? NEUTRAL : GOLEM_ALLY, function (c2, cc) { bodyGolem(c2, cc, neutral); }, { neutral: neutral });
    ctx.restore();
  }

  function drawEnemy(ctx, st) {
    st = obj(st);
    var type = enemyType(st.type);
    var s = ENEMY_SIZE[type], half = s / 2;
    var x = num(st.x, 0), y = num(st.y, 0);
    var base = type === 'brute' ? BRUTE : (type === 'frost' ? FROSTE : ENEMY);
    var c = bodyCols(base, st, { slowed: !!st.slowed });
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0, half - 3, half * 0.7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(playing(st.attackAge, st.attackDuration) ? 3 * Math.sin(Math.PI * prog(st.attackAge, st.attackDuration)) : 0, 0);
    if (st.moving) {
      var bob = Math.sin(now() * 12) * 1.2;
      ctx.translate(0, bob);
    }
    bodyEnemy(ctx, type, c);
    ctx.restore();
    ctx.restore();
    if (num(st.hp, 1) < num(st.maxHp, 1)) hpBar(ctx, x, y - half - 6, s, st.hp, st.maxHp, palette.hpEnemy);
    if (st.targeted) { ctx.save(); targetFrame(ctx, x, y, s, s); ctx.restore(); }
  }

  function blinkAlpha(life) {
    life = num(life, 15);
    if (life >= 3) return 1;
    return (Math.floor(life * 5) % 2 === 0) ? 1 : 0.3;
  }

  function drawCorpse(ctx, st) {
    st = obj(st);
    var type = enemyType(st.kind);
    var s = ENEMY_SIZE[type], half = s / 2;
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = blinkAlpha(st.life);
    var m = '#6e4048', d = '#3a1c22';
    if (type === 'frost') m = '#6a4a64';
    // 平躺的身體
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, half * 0.35, half * 0.9, half * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = m;
    ctx.beginPath(); ctx.ellipse(0, half * 0.2, half * 0.82, half * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    // 倒下的角
    ctx.fillStyle = d;
    ctx.beginPath(); ctx.moveTo(-half * 0.75, -half * 0.05); ctx.lineTo(-half * 0.98, -half * 0.35); ctx.lineTo(-half * 0.5, -half * 0.12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(half * 0.75, -half * 0.05); ctx.lineTo(half * 0.98, -half * 0.35); ctx.lineTo(half * 0.5, -half * 0.12); ctx.closePath(); ctx.fill();
    // X 眼
    ctx.strokeStyle = '#e8d8c8'; ctx.lineWidth = 1.6;
    var ey = half * 0.12, ex = half * 0.3, es = Math.max(2, half * 0.14);
    ctx.beginPath();
    ctx.moveTo(-ex - es, ey - es); ctx.lineTo(-ex + es, ey + es); ctx.moveTo(-ex + es, ey - es); ctx.lineTo(-ex - es, ey + es);
    ctx.moveTo(ex - es, ey - es); ctx.lineTo(ex + es, ey + es); ctx.moveTo(ex + es, ey - es); ctx.lineTo(ex - es, ey + es);
    ctx.stroke();
    if (type === 'shield') { ctx.fillStyle = '#6a7484'; rr(ctx, half * 0.2, half * 0.35, half * 0.7, half * 0.45, 3); ctx.fill(); }
    if (type === 'archer') { ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, half * 0.75, half * 0.55, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    if (type === 'frost') { ctx.fillStyle = '#b8d8e4'; ctx.fillRect(-4, -half * 0.3, 8, 3); }
    ctx.restore();
    if (st.targeted) { ctx.save(); targetFrame(ctx, x, y, s, s); ctx.restore(); }
  }

  function drawSoulPile(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = blinkAlpha(st.life);
    var g = ctx.createRadialGradient(0, 2, 2, 0, 2, 16);
    g.addColorStop(0, rgba(palette.soul, 0.55));
    g.addColorStop(1, rgba(palette.soul, 0));
    ctx.fillStyle = g;
    circle(ctx, 0, 2, 16); ctx.fill();
    ctx.fillStyle = '#2a2440';
    ctx.beginPath(); ctx.ellipse(0, 9, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    var orbs = [[-6, 5, 5], [6, 5, 5], [0, -3, 5.5]];
    for (var i = 0; i < orbs.length; i++) {
      ctx.fillStyle = palette.soul;
      circle(ctx, orbs[i][0], orbs[i][1], orbs[i][2]); ctx.fill();
      ctx.strokeStyle = palette.player; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    circle(ctx, -1.5, -5, 1.5); ctx.fill();
    ctx.restore();
    if (st.targeted) { ctx.save(); targetFrame(ctx, x, y, 32, 32); ctx.restore(); }
  }

  function coinShape(ctx, x, y, r) {
    ctx.fillStyle = palette.coinRim;
    circle(ctx, x, y, r); ctx.fill();
    ctx.fillStyle = palette.coin;
    circle(ctx, x, y, r - 1.5); ctx.fill();
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 1;
    circle(ctx, x, y, r * 0.5); ctx.stroke();
  }
  function drawCoin(ctx, st) {
    st = obj(st);
    ctx.save();
    coinShape(ctx, num(st.x, 0), num(st.y, 0), 7.5);
    ctx.restore();
  }

  function kitIcon(ctx, cx, cy) {
    ctx.fillStyle = '#20283a';
    rr(ctx, cx - 9, cy - 9, 18, 18, 3); ctx.fill();
    ctx.strokeStyle = palette.allyLight; ctx.lineWidth = 1.2;
    rr(ctx, cx - 8.5, cy - 8.5, 17, 17, 3); ctx.stroke();
    ctx.fillStyle = palette.allyLight;
    ctx.fillRect(cx - 5, cy - 2, 10, 7);
    ctx.fillRect(cx - 6, cy - 6, 3, 4); ctx.fillRect(cx - 1.5, cy - 6, 3, 4); ctx.fillRect(cx + 3, cy - 6, 3, 4);
  }

  function drawPlayer(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var base = { main: palette.player, dark: palette.playerDark, light: '#d8c4ff' };
    var c = bodyCols(base, st);
    var inv = num(st.invulnRemaining, 0) > 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0, 13, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    if (inv) ctx.globalAlpha = (Math.floor(now() * 10) % 2 === 0) ? 1 : 0.3;
    ctx.translate(0, attackLift(st));
    var ring = playing(st.attackAge, st.attackDuration) ? '#fff6c0' : palette.playerRing;
    bodyPlayer(ctx, c, ring);
    if (st.moving) feet(ctx, 16, c.dark);
    ctx.restore();
    if (st.stealing) {
      var p = clamp(num(st.stealProgress, 0), 0, 1);
      ctx.strokeStyle = 'rgba(20,10,40,0.6)'; ctx.lineWidth = 4;
      circle(ctx, 0, 0, 22); ctx.stroke();
      ctx.strokeStyle = palette.soul; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
    }
    ctx.restore();
    if (st.carryingKit) { ctx.save(); kitIcon(ctx, x + 26, y); ctx.restore(); }
    if (num(st.hp, 1) < num(st.maxHp, 1)) { ctx.save(); hpBar(ctx, x, y + 22, 32, st.hp, st.maxHp, palette.hpAlly); ctx.restore(); }
  }

  function drawTowerPreview(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var ok = !!st.valid;
    var col = ok ? palette.valid : palette.invalid;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = col;
    rr(ctx, -16, -6, 32, 24, 3); ctx.fill();
    ctx.fillRect(-21, -14, 42, 9);
    for (var i = 0; i < 4; i++) ctx.fillRect(-21 + i * 12, -21, 7, 8);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(-23, -23, 46, 46);
    ctx.setLineDash([]);
    if (!ok) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(12, 12); ctx.moveTo(12, -12); ctx.lineTo(-12, 12); ctx.stroke();
      ctx.strokeStyle = palette.invalid; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.restore();
  }

  function drawSoulSlots(ctx, st) {
    st = obj(st);
    var slots = Array.isArray(st.slots) ? st.slots : [];
    var n = slots.length;
    if (!n) return;
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    for (var i = 0; i < n; i++) {
      var cx = x + (i - (n - 1) / 2) * 20;
      slotCell(ctx, slots[i], cx, y, 18);
    }
    ctx.restore();
  }

  function drawFrostAura(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), r = Math.max(0, num(st.radius, 70));
    var en = team(st.team) === 'enemy';
    ctx.save();
    ctx.fillStyle = rgba(palette.itemFrost, 0.12);
    circle(ctx, x, y, r); ctx.fill();
    ctx.strokeStyle = rgba(en ? palette.enemy : palette.ally, 0.6);
    ctx.lineWidth = 2;
    ctx.setLineDash(en ? [6, 6] : []);
    circle(ctx, x, y, r - 1); ctx.stroke();
    ctx.setLineDash([]);
    // 冰晶點綴(貼近外緣)
    ctx.strokeStyle = rgba(palette.itemFrost, 0.55); ctx.lineWidth = 1.2;
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3 + 0.3, px = x + Math.cos(a) * r * 0.78, py = y + Math.sin(a) * r * 0.78;
      ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py); ctx.moveTo(px, py - 3); ctx.lineTo(px, py + 3); ctx.stroke();
    }
    ctx.restore();
  }

  function drawProjectile(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), a = num(st.angle, 0);
    var col = teamColor(st.team);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    if (st.kind === 'ice') {
      ctx.fillStyle = '#e6fbff';
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(0, -3.6); ctx.lineTo(-4.5, 0); ctx.lineTo(0, 3.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.strokeStyle = '#7fd4f0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-2, -2.5); ctx.lineTo(2, 2.5); ctx.moveTo(-2, 2.5); ctx.lineTo(2, -2.5); ctx.stroke();
    } else {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4.5, -2.6); ctx.lineTo(-3, 0); ctx.lineTo(-4.5, 2.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      circle(ctx, 2.5, 0, 1.4); ctx.fill();
    }
    ctx.restore();
  }

  function drawPierceBeam(ctx, st) {
    st = obj(st);
    var p = prog(st.age, st.duration);
    var col = teamColor(st.team);
    var x1 = num(st.x1, 0), y1 = num(st.y1, 0), x2 = num(st.x2, x1), y2 = num(st.y2, y1);
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = rgba(col, 0.35); ctx.lineWidth = 26;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  function drawWhirl(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), R = Math.max(10, num(st.radius, 60));
    var p = prog(st.age, st.duration);
    var col = teamColor(st.team);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = rgba(col, 0.1 * (1 - p));
    circle(ctx, 0, 0, R); ctx.fill();
    ctx.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
    ctx.lineCap = 'round';
    var rot = p * Math.PI * 2;
    for (var i = 0; i < 3; i++) {
      var a0 = rot + i * Math.PI * 2 / 3;
      ctx.strokeStyle = col; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(0, 0, R - 5, a0, a0 + 1.3); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, R - 2, a0 + 0.6, a0 + 1.3); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHitSpark(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), p = prog(st.age, st.duration);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 + 0.2;
      var r0 = 2 + 6 * p, r1 = 6 + 5.5 * p;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    circle(ctx, 0, 0, 4 * (1 - p)); ctx.fill();
    ctx.restore();
  }

  function drawStealLink(ctx, st) {
    st = obj(st);
    var x1 = num(st.x1, 0), y1 = num(st.y1, 0), x2 = num(st.x2, x1), y2 = num(st.y2, y1);
    var p = clamp(num(st.progress, 0), 0, 1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(palette.player, 0.5 + 0.3 * p); ctx.lineWidth = 4 + 4 * p;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = mix(palette.soul, '#ffffff', p); ctx.lineWidth = 1.5 + 1.5 * p;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -now() * 40;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = palette.soul; ctx.lineWidth = 2 + p;
    ctx.strokeRect(x2 - 11, y2 - 11, 22, 22);
    ctx.restore();
  }

  function drawComboName(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var isNew = !!st.isNew;
    var dur = Math.max(0.01, num(st.duration, 1.5));
    var age = clamp(num(st.age, 0), 0, dur);
    var label = (isNew ? '新組合! ' : '') + (st.name === undefined || st.name === null ? '' : String(st.name));
    var fs = isNew ? 19 : 15, h = isNew ? 28 : 20, boxH = isNew ? 48 : 36, maxW = isNew ? 280 : 200;
    ctx.save();
    var w = Math.min(textW(ctx, label, fs, 'bold') + 20, maxW / 1.2);
    var popT = 0.2, scale = 1, cy;
    var bottom = y + boxH / 2;
    if (age < popT) {
      scale = 1 + 0.2 * Math.sin(Math.PI * age / popT);
      cy = bottom - h * scale / 2;
    } else {
      var q = (age - popT) / Math.max(0.01, dur - popT);
      cy = bottom - h / 2 - 14 * q;
    }
    var alpha = age / dur > 0.6 ? (1 - age / dur) / 0.4 : 1;
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(x, cy);
    ctx.scale(scale, scale);
    if (isNew) {
      ctx.fillStyle = palette.combo;
      rr(ctx, -w / 2, -h / 2, w, h, 6); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      rr(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 6); ctx.stroke();
      txt(ctx, label, 0, 1, { size: fs, color: '#2a1a00', stroke: false });
    } else {
      ctx.fillStyle = 'rgba(16,18,26,0.88)';
      rr(ctx, -w / 2, -h / 2, w, h, 5); ctx.fill();
      ctx.strokeStyle = palette.combo; ctx.lineWidth = 1.5;
      rr(ctx, -w / 2 + 0.75, -h / 2 + 0.75, w - 1.5, h - 1.5, 5); ctx.stroke();
      txt(ctx, label, 0, 1, { size: fs, color: palette.combo, stroke: false });
    }
    ctx.restore();
  }

  function drawSpawnWarning(ctx, st) {
    st = obj(st);
    var cy = st.gate === 'south' ? 630 : 170, cx = 40;
    var rem = Math.max(0, num(st.remaining, 0));
    var rate = rem < 2 ? 6 : 2.5;
    var pulse = 0.55 + 0.45 * Math.abs(Math.sin(now() * Math.PI * rate / 2));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = rgba(palette.enemy, 0.25 + 0.3 * pulse);
    rr(ctx, -30, -30, 60, 60, 8); ctx.fill();
    ctx.strokeStyle = rgba(palette.enemy, 0.6 + 0.4 * pulse); ctx.lineWidth = 3;
    rr(ctx, -28.5, -28.5, 57, 57, 8); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-16, -20); ctx.lineTo(-6, -10); ctx.lineTo(-16, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -20); ctx.lineTo(8, -10); ctx.lineTo(-2, 0); ctx.stroke();
    txt(ctx, Math.ceil(rem), 4, 15, { size: 18, color: '#ffffff' });
    ctx.restore();
  }

  // 商店單格(cw×ch, 以中心畫)
  function shopCell(ctx, cx, cy, cw, ch, it) {
    it = obj(it);
    var state = (it.state === 'ok' || it.state === 'poor' || it.state === 'locked') ? it.state : 'poor';
    ctx.save();
    ctx.fillStyle = state === 'ok' ? '#2a3448' : '#1e222c';
    rr(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 6); ctx.fill();
    ctx.strokeStyle = state === 'ok' ? '#8fb8e8' : '#444a56'; ctx.lineWidth = 1.5;
    rr(ctx, cx - cw / 2 + 0.75, cy - ch / 2 + 0.75, cw - 1.5, ch - 1.5, 6); ctx.stroke();
    if (state === 'poor') ctx.globalAlpha = 0.45;
    // 鍵帽
    keycap(ctx, cx - cw / 2 + 15, cy - ch / 2 + 15, it.key === undefined ? '?' : String(it.key), 20);
    if (state === 'locked') {
      ctx.globalAlpha = 0.7;
      lockIcon(ctx, cx + 6, cy + 2);
    } else {
      txt(ctx, it.name === undefined ? '' : it.name, cx + 6, cy - 6, { size: 14, color: '#ffffff', stroke: false });
      var price = String(num(it.price, 0));
      var pw = textW(ctx, price, 13, 'bold');
      coinShape(ctx, cx - pw / 2 - 4, cy + 18, 6);
      txt(ctx, price, cx + 5, cy + 18, { size: 13, color: state === 'poor' ? '#ff8080' : '#ffe08a', stroke: false });
    }
    ctx.restore();
  }
  function lockIcon(ctx, cx, cy) {
    ctx.strokeStyle = '#aab2c0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy - 6, 6, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#aab2c0';
    rr(ctx, cx - 9, cy - 6, 18, 14, 2); ctx.fill();
    ctx.fillStyle = '#1e222c';
    ctx.fillRect(cx - 1.5, cy - 2, 3, 6);
  }
  function keycap(ctx, cx, cy, label, s) {
    s = s || 22;
    ctx.fillStyle = '#8a8f9a';
    rr(ctx, cx - s / 2, cy - s / 2 + 2, s, s, 4); ctx.fill();
    ctx.fillStyle = '#e8eaee';
    rr(ctx, cx - s / 2, cy - s / 2, s, s - 2, 4); ctx.fill();
    txt(ctx, label, cx, cy - 1, { size: Math.round(s * 0.58), color: '#1a1d24', stroke: false });
  }

  function drawShopPanel(ctx, st) {
    st = obj(st);
    var items = Array.isArray(st.items) ? st.items : [];
    var cx = num(st.x, 640), cy = num(st.y, 672);
    ctx.save();
    ctx.fillStyle = 'rgba(12,14,20,0.9)';
    rr(ctx, cx - 330, cy - 42, 660, 84, 8); ctx.fill();
    ctx.strokeStyle = rgba(palette.zone, 0.7); ctx.lineWidth = 2;
    rr(ctx, cx - 329, cy - 41, 658, 82, 8); ctx.stroke();
    var cw = 103, gap = 6, x0 = cx - 330 + 6;
    for (var i = 0; i < 6; i++) {
      shopCell(ctx, x0 + cw / 2 + i * (cw + gap), cy, cw, 72, items[i] || { key: String(i + 1), state: 'poor', name: '', price: 0 });
    }
    ctx.restore();
  }

  function drawHud(ctx, st) {
    st = obj(st);
    ctx.save();
    ctx.fillStyle = palette.hudBg;
    ctx.fillRect(0, 0, 1280, 50);
    ctx.fillStyle = '#2c3240';
    ctx.fillRect(0, 48, 1280, 2);
    // 金幣
    coinShape(ctx, 28, 25, 11);
    txt(ctx, Math.max(0, Math.floor(num(st.gold, 0))), 48, 25, { size: 24, align: 'left', color: '#ffe08a', stroke: false });
    // 主堡生命
    var chp = num(st.castleHp, 0), cmax = Math.max(1, num(st.castleMaxHp, 20));
    miniCastle(ctx, 190, 25);
    ctx.fillStyle = '#2a2f3a'; ctx.fillRect(210, 18, 150, 14);
    ctx.fillStyle = chp / cmax <= 0.3 ? palette.hpEnemy : palette.castleLight;
    ctx.fillRect(210, 18, 150 * clamp(chp / cmax, 0, 1), 14);
    txt(ctx, Math.max(0, Math.ceil(chp)) + ' / ' + cmax, 370, 25, { size: 18, align: 'left', stroke: false });
    // 玩家生命
    var php = num(st.playerHp, 0), pmax = Math.max(1, num(st.playerMaxHp, 100));
    ctx.fillStyle = palette.player; circle(ctx, 490, 25, 9); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(ctx, 490, 25, 10.5); ctx.stroke();
    ctx.fillStyle = '#2a2f3a'; ctx.fillRect(510, 18, 150, 14);
    ctx.fillStyle = palette.hpAlly; ctx.fillRect(510, 18, 150 * clamp(php / pmax, 0, 1), 14);
    txt(ctx, Math.max(0, Math.ceil(php)) + ' / ' + pmax, 670, 25, { size: 18, align: 'left', stroke: false });
    // 波次
    var wave = Math.max(0, Math.floor(num(st.wave, 0))), tw = Math.max(1, Math.floor(num(st.totalWaves, 6)));
    txt(ctx, '第 ' + wave + ' / ' + tw + ' 波', 880, 25, { size: 22, stroke: false });
    var nw = num(st.nextWaveIn, -1);
    if (nw >= 0) {
      txt(ctx, '下一波', 1080, 25, { size: 16, align: 'right', color: palette.textDim, stroke: false });
      txt(ctx, Math.ceil(nw) + ' 秒', 1092, 25, { size: 22, align: 'left', color: nw <= 6 ? palette.enemyLight : '#ffffff', stroke: false });
    }
    ctx.restore();
  }
  function miniCastle(ctx, cx, cy) {
    ctx.fillStyle = palette.castleMain;
    ctx.fillRect(cx - 10, cy - 6, 20, 15);
    ctx.fillStyle = palette.castleLight;
    ctx.fillRect(cx - 11, cy - 11, 6, 7); ctx.fillRect(cx - 3, cy - 11, 6, 7); ctx.fillRect(cx + 5, cy - 11, 6, 7);
    ctx.fillStyle = '#0e1622';
    ctx.fillRect(cx - 3, cy + 2, 6, 7);
  }

  function slowTint(ctx, x, y, w, h, lineW) {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = 'rgb(128,128,128)';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.fillStyle = 'rgba(80,130,220,0.16)';
    ctx.fillRect(x, y, w, h);
    var g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.65);
    g.addColorStop(0, 'rgba(10,20,50,0)');
    g.addColorStop(1, 'rgba(10,20,50,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = palette.slowmo; ctx.lineWidth = lineW;
    ctx.strokeRect(x + lineW / 2, y + lineW / 2, w - lineW, h - lineW);
  }
  function drawSlowMo(ctx) {
    ctx.save();
    slowTint(ctx, 0, 0, 1280, 720, 8);
    ctx.strokeStyle = rgba(palette.slowmo, 0.5); ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, 1252, 692);
    ctx.fillStyle = 'rgba(10,16,30,0.85)';
    rr(ctx, 640 - 70, 80 - 18, 140, 36, 8); ctx.fill();
    ctx.strokeStyle = palette.slowmo; ctx.lineWidth = 2;
    rr(ctx, 640 - 69, 80 - 17, 138, 34, 8); ctx.stroke();
    hourglass(ctx, 640 - 44, 80);
    txt(ctx, '慢動作', 640 + 12, 81, { size: 20, color: '#dff4ff', stroke: false });
    ctx.restore();
  }
  function hourglass(ctx, cx, cy) {
    ctx.fillStyle = palette.slowmo;
    ctx.beginPath(); ctx.moveTo(cx - 7, cy - 10); ctx.lineTo(cx + 7, cy - 10); ctx.lineTo(cx, cy); ctx.lineTo(cx + 7, cy + 10); ctx.lineTo(cx - 7, cy + 10); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
  }

  function drawSoulPopup(ctx, st) {
    st = obj(st);
    var x = num(st.x, 640), y = num(st.y, 360);
    var top = Array.isArray(st.topSlots) ? st.topSlots : [];
    var bot = Array.isArray(st.bottomSlots) ? st.bottomSlots : [];
    var w = num(st.w, Math.max(top.length, 3) * 48 + 64), h = num(st.h, 140);
    var row = st.row === 'bottom' ? 'bottom' : 'top';
    var idx = Math.floor(num(st.index, 0));
    var dx = 0;
    if (playing(st.shakeAge, st.shakeDuration)) {
      var p = prog(st.shakeAge, st.shakeDuration);
      dx = 6 * Math.sin(p * Math.PI * 6) * (1 - p);
    }
    ctx.save();
    ctx.translate(x + dx, y);
    ctx.fillStyle = 'rgba(22,26,38,0.96)';
    rr(ctx, -w / 2, -h / 2, w, h, 10); ctx.fill();
    ctx.strokeStyle = '#d8ccff'; ctx.lineWidth = 2;
    rr(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 10); ctx.stroke();
    // 標題
    txt(ctx, st.title === undefined || st.title === null ? '' : st.title, 0, -52, { size: 15, stroke: false });
    ctx.fillStyle = '#3a4054';
    ctx.fillRect(-w / 2 + 10, -41, w - 20, 1);
    // 排標
    txt(ctx, '目標', -w / 2 + 17, -18, { size: 12, color: palette.textDim, stroke: false });
    txt(ctx, '身上', -w / 2 + 17, 30, { size: 12, color: '#d8c4ff', stroke: false });
    function rowCells(arr, cy, isRow) {
      var n = arr.length;
      for (var i = 0; i < n; i++) {
        var cx = (i - (n - 1) / 2) * 48;
        slotCell(ctx, arr[i], cx, cy, 40);
      }
      if (isRow && n > 0) {
        var ci = clamp(idx, 0, n - 1);
        var ccx = (ci - (n - 1) / 2) * 48;
        ctx.strokeStyle = palette.cursor; ctx.lineWidth = 3;
        ctx.strokeRect(ccx - 23, cy - 23, 46, 46);
        ctx.fillStyle = palette.cursor;
        ctx.beginPath(); ctx.moveTo(ccx - 5, cy - 27); ctx.lineTo(ccx + 5, cy - 27); ctx.lineTo(ccx, cy - 22); ctx.closePath(); ctx.fill();
      }
    }
    rowCells(top, -18, row === 'top');
    rowCells(bot, 30, row === 'bottom');
    // 底部提示
    var act = st.actionLabel === undefined || st.actionLabel === null ? '' : String(st.actionLabel);
    if (act) txt(ctx, act, -w / 2 + 12, 60, { size: 13, align: 'left', color: palette.cursor, stroke: false });
    else txt(ctx, '—', -w / 2 + 12, 60, { size: 13, align: 'left', color: '#6a7080', stroke: false });
    txt(ctx, 'J 確定  K 關閉', w / 2 - 10, 60, { size: 11, align: 'right', color: palette.textDim, weight: 'normal', stroke: false });
    ctx.restore();
  }

  function drawResult(ctx, st) {
    st = obj(st);
    var win = !!st.win;
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,14,0.72)';
    ctx.fillRect(0, 0, 1280, 720);
    txt(ctx, win ? '勝利' : '主堡被攻陷', 640, 280, { size: 64, color: win ? '#ffd86a' : '#ff6a78', sw: 6 });
    var wave = Math.max(0, Math.floor(num(st.wave, 0))), tw = Math.max(1, Math.floor(num(st.totalWaves, 6)));
    txt(ctx, '第 ' + wave + ' / ' + tw + ' 波', 640, 360, { size: 28 });
    keycap(ctx, 588, 440, 'J', 32);
    txt(ctx, '重新開始', 612, 440, { size: 24, align: 'left' });
    txt(ctx, '按', 562, 440, { size: 24, align: 'right' });
    ctx.restore();
  }

  // ================= 說明頁示意圖 =================
  var GUIDE_SIZE = [[480, 270], [400, 240], [560, 280], [520, 260], [440, 260], [480, 240], [580, 300], [480, 270]];

  function at(ctx, x, y, s, fn) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); fn(); ctx.restore(); }
  function label(ctx, s, x, y, align) {
    txt(ctx, s, x, y, { size: 13, align: align || 'center', color: '#ffffff', sw: 4 });
  }
  function arrowLine(ctx, x1, y1, x2, y2, col, dashed) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * 8, y2 - Math.sin(a) * 8); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    if (dashed) ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * 8, y2 - Math.sin(a) * 8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.5) * 12, y2 - Math.sin(a - 0.5) * 12);
    ctx.lineTo(x2 - Math.cos(a + 0.5) * 12, y2 - Math.sin(a + 0.5) * 12);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function grassPanel(ctx, x, y, w, h) {
    ctx.fillStyle = palette.bg;
    rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8); ctx.stroke();
  }
  function idle(o) {
    var b = { hitAge: 0.2, hitDuration: 0.2, attackAge: 0.15, attackDuration: 0.15, moving: false, downedRemaining: 0, downedTotal: 6, targeted: false };
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) b[k] = o[k];
    return b;
  }
  function playerSt(o) {
    var b = idle({ hp: 100, maxHp: 100, invulnRemaining: 0, invulnTotal: 2, stealing: false, stealProgress: 0, carryingKit: false });
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) b[k] = o[k];
    return b;
  }

  var GUIDE = [];

  // 第 1 頁 守住主堡: 全景
  GUIDE[0] = function (ctx) {
    var s = 480 / 1280;
    at(ctx, 0, 0, s, function () {
      drawBackground(ctx);
      drawCastle(ctx, { x: 1150, y: 400, hitAge: 0.3, hitDuration: 0.3, zoneActive: false, targeted: false });
      var imps = [[230, 170], [420, 170], [640, 285], [300, 630], [900, 400]];
      for (var i = 0; i < imps.length; i++) {
        (function (p) { at(ctx, p[0], p[1], 1.8, function () { drawEnemy(ctx, idle({ type: 'imp', x: 0, y: 0, hp: 30, maxHp: 30, moving: true, slowed: false })); }); })(imps[i]);
      }
      at(ctx, 40, 170, 1.4, function () { ctx.translate(-40, -170); drawSpawnWarning(ctx, { gate: 'north', remaining: 4, total: 6 }); });
    });
    // 流向箭頭
    arrowLine(ctx, 102, 64, 144, 64, '#ffffff', true);
    arrowLine(ctx, 130, 236, 180, 236, '#ffffff', true);
    arrowLine(ctx, 284, 150, 322, 150, '#ffffff', true);
    label(ctx, '主堡', 431, 112);
    label(ctx, '北入口', 44, 40);
    label(ctx, '南入口', 44, 256);
  };

  // 第 2 頁 移動與撿錢
  GUIDE[1] = function (ctx) {
    grassPanel(ctx, 0, 0, 400, 240);
    drawCorpse(ctx, { kind: 'imp', x: 120, y: 120, life: 12, maxLife: 15, targeted: false });
    drawSoulSlots(ctx, { x: 120, y: 92, slots: ['melee', 'march'] });
    // 未撿的金幣
    drawCoin(ctx, { x: 92, y: 150 }); drawCoin(ctx, { x: 150, y: 96 });
    // 玩家走過的路徑
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(30, 220); ctx.quadraticCurveTo(110, 200, 140, 160); ctx.quadraticCurveTo(170, 130, 230, 140); ctx.lineTo(290, 150); ctx.stroke();
    ctx.restore();
    // 已撿起的金幣: 淡圈 + 往上飄的 +2
    var picked = [[118, 182], [158, 150]];
    for (var i = 0; i < picked.length; i++) {
      ctx.save();
      ctx.strokeStyle = rgba(palette.coin, 0.6); ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      circle(ctx, picked[i][0], picked[i][1], 7.5); ctx.stroke();
      ctx.restore();
      txt(ctx, '+2', picked[i][0] + 2, picked[i][1] - 16, { size: 12, color: '#ffe08a' });
    }
    drawPlayer(ctx, playerSt({ x: 290, y: 150, moving: true }));
    drawSoulSlots(ctx, { x: 290, y: 114, slots: ['melee', null, null] });
    // WASD 鍵帽貼在玩家旁
    keycap(ctx, 350, 128, 'W', 22);
    keycap(ctx, 326, 154, 'A', 22);
    keycap(ctx, 350, 154, 'S', 22);
    keycap(ctx, 374, 154, 'D', 22);
    // HUD 金幣讀數
    ctx.fillStyle = 'rgba(20,23,30,0.9)';
    rr(ctx, 270, 12, 118, 30, 6); ctx.fill();
    coinShape(ctx, 288, 27, 8);
    txt(ctx, '40 → 44', 302, 27, { size: 15, align: 'left', color: '#ffe08a', stroke: false });
  };

  // 第 3 頁 拿魂件
  GUIDE[2] = function (ctx) {
    // 左格: 彈窗開著(慢動作)
    grassPanel(ctx, 0, 0, 272, 280);
    drawTower(ctx, idle({ x: 78, y: 222, hp: 150, maxHp: 150, targeted: true }));
    drawPlayer(ctx, playerSt({ x: 148, y: 232 }));
    drawSoulSlots(ctx, { x: 78, y: 178, slots: ['ranged', null] });
    drawSoulSlots(ctx, { x: 148, y: 196, slots: ['melee', null, null] });
    ctx.save(); ctx.beginPath(); rr(ctx, 0, 0, 272, 280, 8); ctx.clip(); slowTint(ctx, 0, 0, 272, 280, 4); ctx.restore();
    drawSoulPopup(ctx, { x: 136, y: 82, w: 208, h: 140, title: '箭塔', topSlots: ['ranged', null], bottomSlots: ['melee', null, null], row: 'top', index: 0, actionLabel: '拿到身上', shakeAge: 0.25, shakeDuration: 0.25 });
    // 方向鍵貼在游標旁
    var kx = 206, ky = 163;
    keycap(ctx, kx - 39, ky, '←', 18); keycap(ctx, kx - 19, ky, '→', 18); keycap(ctx, kx + 1, ky, '↑', 18); keycap(ctx, kx + 21, ky, '↓', 18);
    label(ctx, '選格', kx + 48, ky);
    // 中間箭頭
    arrowLine(ctx, 274, 140, 286, 140, '#ffffff', false);
    // 右格: 彈窗關閉後
    ctx.save(); ctx.translate(288, 0);
    grassPanel(ctx, 0, 0, 272, 280);
    drawCorpse(ctx, { kind: 'imp', x: 52, y: 70, life: 12, maxLife: 15, targeted: false });
    drawSoulSlots(ctx, { x: 52, y: 42, slots: ['melee', 'march'] });
    label(ctx, '屍體也能拿', 52, 100);
    drawTower(ctx, idle({ x: 60, y: 222, hp: 150, maxHp: 150 }));
    drawEnemy(ctx, idle({ type: 'imp', x: 222, y: 150, hp: 22, maxHp: 30, moving: true }));
    drawPlayer(ctx, playerSt({ x: 140, y: 230 }));
    drawSoulSlots(ctx, { x: 60, y: 178, slots: [null, null] });
    drawSoulSlots(ctx, { x: 222, y: 114, slots: ['melee', 'march'] });
    drawSoulSlots(ctx, { x: 140, y: 194, slots: ['melee', 'ranged', null] });
    // 正要打中的那一發(小鬼的血已少一截 = 前一發打中過)
    var ang = Math.atan2(150 - 230, 222 - 140);
    drawProjectile(ctx, { x: 140 + 82 * 0.8, y: 230 - 80 * 0.8, angle: ang, team: 'ally', kind: 'normal' });
    ctx.restore();
  };

  // 第 4 頁 裝魂件
  GUIDE[3] = function (ctx) {
    grassPanel(ctx, 0, 0, 344, 260);
    drawTower(ctx, idle({ x: 150, y: 214, hp: 150, maxHp: 150, targeted: true }));
    drawPlayer(ctx, playerSt({ x: 218, y: 224 }));
    drawSoulSlots(ctx, { x: 150, y: 170, slots: [null, null] });
    drawSoulSlots(ctx, { x: 218, y: 188, slots: ['melee', 'ranged', null] });
    ctx.save(); ctx.beginPath(); rr(ctx, 0, 0, 344, 260, 8); ctx.clip(); slowTint(ctx, 0, 0, 344, 260, 4); ctx.restore();
    var px = 172, py = 80;
    drawSoulPopup(ctx, { x: px, y: py, w: 208, h: 140, title: '箭塔', topSlots: [null, null], bottomSlots: ['melee', 'ranged', null], row: 'bottom', index: 1, actionLabel: '裝上去', shakeAge: 0.25, shakeDuration: 0.25 });
    // 下排第 1 格(游標)→ 上排第 0 格: 目的格虛線框 + 斜箭頭
    ctx.save();
    ctx.strokeStyle = palette.cursor; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.strokeRect(px - 24 - 22, py - 18 - 22, 44, 44);
    ctx.restore();
    arrowLine(ctx, px - 4, py + 14, px - 20, py - 8, palette.cursor, false);
    arrowLine(ctx, 348, 180, 362, 180, '#ffffff', false);
    // 右側小圖: 裝完後
    ctx.save(); ctx.translate(366, 0);
    grassPanel(ctx, 0, 0, 154, 260);
    drawEnemy(ctx, idle({ type: 'imp', x: 120, y: 90, hp: 22, maxHp: 30, moving: true }));
    drawTower(ctx, idle({ x: 50, y: 196, hp: 150, maxHp: 150, attackAge: 0.07 }));
    drawSoulSlots(ctx, { x: 120, y: 54, slots: ['melee', 'march'] });
    drawSoulSlots(ctx, { x: 50, y: 152, slots: ['ranged', null] });
    var a2 = Math.atan2(90 - 196, 120 - 50);
    drawProjectile(ctx, { x: 88, y: 140, angle: a2, team: 'ally', kind: 'normal' });
    ctx.restore();
  };

  // 第 5 頁 搶活鬼
  GUIDE[4] = function (ctx) {
    grassPanel(ctx, 0, 0, 440, 260);
    var ex = 270, ey = 140, px = 212, py = 150;
    // 保持距離: 敵人半邊長 16 + 68 = 84
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    circle(ctx, ex, ey, 84); ctx.stroke();
    ctx.restore();
    label(ctx, '離太遠就斷', ex + 64, ey - 84, 'left');
    drawEnemy(ctx, idle({ type: 'imp', x: ex, y: ey, hp: 30, maxHp: 30 }));
    drawPlayer(ctx, playerSt({ x: px, y: py, stealing: true, stealProgress: 0.5 }));
    drawSoulSlots(ctx, { x: ex, y: ey - 36, slots: ['melee', 'march'] });
    drawSoulSlots(ctx, { x: px, y: py - 36, slots: ['melee', null, null] });
    drawStealLink(ctx, { x1: px, y1: py, x2: ex + 10, y2: ey - 36, progress: 0.5 });
  };

  // 第 6 頁 被打倒
  GUIDE[5] = function (ctx) {
    grassPanel(ctx, 0, 0, 228, 240);
    drawEnemy(ctx, idle({ type: 'imp', x: 140, y: 180, hp: 30, maxHp: 30, attackAge: 0.07 }));
    drawPlayer(ctx, playerSt({ x: 110, y: 150, hp: 5, hitAge: 0.05 }));
    drawSoulSlots(ctx, { x: 140, y: 144, slots: ['melee', 'march'] });
    drawSoulSlots(ctx, { x: 110, y: 114, slots: ['melee', 'ranged', null] });
    drawHitSpark(ctx, { x: 110, y: 150, age: 0.08, duration: 0.25 });
    arrowLine(ctx, 232, 150, 248, 150, '#ffffff', false);
    ctx.save(); ctx.translate(252, 0);
    grassPanel(ctx, 0, 0, 228, 240);
    ctx.save(); ctx.beginPath(); rr(ctx, 0, 0, 228, 240, 8); ctx.clip();
    at(ctx, 190, 54, 0.5, function () { drawCastle(ctx, { x: 0, y: 0, hitAge: 0.3, hitDuration: 0.3, zoneActive: false, targeted: false }); });
    ctx.restore();
    drawSoulPile(ctx, { x: 110, y: 150, life: 14, maxLife: 15, targeted: false });
    drawSoulSlots(ctx, { x: 110, y: 122, slots: ['melee', 'ranged'] });
    drawPlayer(ctx, playerSt({ x: 190, y: 150, invulnRemaining: 1.6 }));
    drawSoulSlots(ctx, { x: 190, y: 114, slots: [null, null, null] });
    label(ctx, '掉在原地', 110, 182);
    label(ctx, '主堡旁重生', 176, 200);
    ctx.restore();
  };

  // 第 7 頁 購買
  GUIDE[6] = function (ctx) {
    // 主堡區
    grassPanel(ctx, 0, 0, 182, 200);
    ctx.save(); ctx.beginPath(); rr(ctx, 0, 0, 182, 200, 8); ctx.clip();
    at(ctx, 55, 95, 0.55, function () { drawCastle(ctx, { x: 0, y: 0, hitAge: 0.3, hitDuration: 0.3, zoneActive: true, targeted: false }); });
    ctx.restore();
    drawPlayer(ctx, playerSt({ x: 120, y: 96 }));
    drawSoulSlots(ctx, { x: 120, y: 60, slots: ['melee', null, null] });
    // 蓋塔
    ctx.save(); ctx.translate(192, 0);
    grassPanel(ctx, 0, 0, 188, 200);
    ctx.save(); ctx.beginPath(); rr(ctx, 0, 0, 188, 200, 8); ctx.clip();
    ctx.fillStyle = palette.roadEdge; ctx.fillRect(0, 26, 188, 60);
    ctx.fillStyle = palette.road; ctx.fillRect(0, 28, 188, 56);
    ctx.restore();
    drawPlayer(ctx, playerSt({ x: 86, y: 148, carryingKit: true }));
    drawSoulSlots(ctx, { x: 86, y: 112, slots: ['melee', null, null] });
    drawTowerPreview(ctx, { x: 86, y: 148, valid: true });
    keycap(ctx, 70, 186, 'J', 20);
    label(ctx, '蓋塔', 84, 186, 'left');
    ctx.restore();
    // 步兵跟隨
    ctx.save(); ctx.translate(390, 0);
    grassPanel(ctx, 0, 0, 190, 200);
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var i = 0; i < 4; i++) { circle(ctx, 70 + i * 16, 130 - i * 6, 2.5); ctx.fill(); }
    ctx.restore();
    drawSoldier(ctx, idle({ x: 56, y: 136, hp: 80, maxHp: 80, moving: true }));
    drawPlayer(ctx, playerSt({ x: 140, y: 104, moving: true }));
    drawSoulSlots(ctx, { x: 56, y: 100, slots: ['melee', 'seek'] });
    drawSoulSlots(ctx, { x: 140, y: 68, slots: ['melee', null, null] });
    label(ctx, '步兵會跟著你', 95, 182);
    ctx.restore();
    // 商店面板
    at(ctx, 290, 254, 0.86, function () {
      drawShopPanel(ctx, { x: 0, y: 0, items: [
        { key: '1', name: '箭塔材料', price: 15, state: 'ok' },
        { key: '2', name: '步兵', price: 12, state: 'ok' },
        { key: '3', name: '遠攻', price: 10, state: 'ok' },
        { key: '4', name: '近戰', price: 10, state: 'ok' },
        { key: '5', name: '擴槽石', price: 20, state: 'ok' },
        { key: '6', name: '石魔像', price: 18, state: 'locked' }
      ] });
    });
  };

  // 第 8 頁 招募中立單位
  GUIDE[7] = function (ctx) {
    grassPanel(ctx, 0, 0, 480, 270);
    ctx.save(); ctx.beginPath(); rr(ctx, 0, 0, 480, 270, 8); ctx.clip();
    at(ctx, 400, 180, 0.7, function () { drawCastle(ctx, { x: 0, y: 0, hitAge: 0.3, hitDuration: 0.3, zoneActive: false, targeted: false }); });
    ctx.restore();
    drawGolem(ctx, idle({ team: 'neutral', x: 80, y: 180, hp: 260, maxHp: 260, moving: true }));
    drawSoulSlots(ctx, { x: 80, y: 132, slots: ['march', null, null] });
    arrowLine(ctx, 120, 180, 352, 180, '#ffffff', true);
    // 商店第 6 格: 鎖住 → 石魔像
    shopCell(ctx, 170, 52, 103, 72, { key: '6', name: '石魔像', price: 18, state: 'locked' });
    arrowLine(ctx, 228, 52, 262, 52, '#ffffff', false);
    shopCell(ctx, 322, 52, 103, 72, { key: '6', name: '石魔像', price: 18, state: 'ok' });
  };

  function drawGuidePage(ctx, st) {
    st = obj(st);
    var page = Math.floor(num(st.page, 0));
    if (page < 0 || page >= GUIDE.length) return;
    var x = num(st.x, 0), y = num(st.y, 0), w = Math.max(1, num(st.w, GUIDE_SIZE[page][0])), h = Math.max(1, num(st.h, GUIDE_SIZE[page][1]));
    var vw = GUIDE_SIZE[page][0], vh = GUIDE_SIZE[page][1];
    var s = Math.min(w / vw, h / vh);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - vw * s) / 2, y + (h - vh * s) / 2);
    ctx.scale(s, s);
    ctx.beginPath(); ctx.rect(0, 0, vw, vh); ctx.clip();
    GUIDE[page](ctx);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: 1280, height: 720 },
    palette: palette,
    drawBackground: drawBackground,
    drawCastle: drawCastle,
    drawTower: drawTower,
    drawSoldier: drawSoldier,
    drawGolem: drawGolem,
    drawEnemy: drawEnemy,
    drawCorpse: drawCorpse,
    drawSoulPile: drawSoulPile,
    drawCoin: drawCoin,
    drawPlayer: drawPlayer,
    drawTowerPreview: drawTowerPreview,
    drawSoulSlots: drawSoulSlots,
    drawFrostAura: drawFrostAura,
    drawProjectile: drawProjectile,
    drawPierceBeam: drawPierceBeam,
    drawWhirl: drawWhirl,
    drawHitSpark: drawHitSpark,
    drawStealLink: drawStealLink,
    drawComboName: drawComboName,
    drawSpawnWarning: drawSpawnWarning,
    drawShopPanel: drawShopPanel,
    drawHud: drawHud,
    drawSlowMo: drawSlowMo,
    drawSoulPopup: drawSoulPopup,
    drawResult: drawResult,
    drawGuidePage: drawGuidePage
  };
})();
