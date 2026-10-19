// 魂匠守衛者(打磨版) — 美術(Canvas 2D 幾何繪製, 無外部資源)
// 全域物件 window.Art; 每個函式自己 save/restore。
(function () {
  'use strict';
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var PI = Math.PI, TAU = Math.PI * 2;

  var C = {
    bg: '#2e4733', grass: '#2e4733', grassDark: '#27402c', grid: 'rgba(255,255,255,0.05)',
    path: '#9a8158', pathEdge: '#6a5535', pathLight: '#ad9469',
    ally: '#5b8fe0', allyDark: '#2f4f86', allyRim: '#cfe0ff',
    enemy: '#b23a52', enemyDark: '#3a0d1a', enemyEye: '#ffb347',
    player: '#fff1c9', playerRim: '#ffb020', playerCloak: '#e0902a',
    neutral: '#8d8b84', neutralDark: '#55534e',
    stone: '#8d93a3', stoneDark: '#5d6272',
    target: '#ffffff', resonance: '#e3d4ff', gold: '#ffd24a', coin: '#ffcc33',
    hud: '#161b26', panel: '#1d2331', panelLight: '#2a3244', text: '#f2f2f2', textDim: '#a9b0bf',
    valid: '#5fe07a', invalid: '#ff4a4a', cursor: '#ffd24a', hp: '#6ee06e',
    allyShot: '#fff3b0', enemyShot: '#ff4d7a', slowmo: '#9fd4ff',
    ranged: '#f2c94c', melee: '#ef5350', frost: '#8fd8ff', seek: '#6ad05a', march: '#a77bff', drum: '#e57ad0',
    slotStone: '#b9c3d6', combo: '#ffd24a',
    soulLight: '#cfe0ff', swap: '#ff9a4a', stun: '#ffe14a',
    tutorPaper: '#fff4d6', tutorInk: '#2a2016', tutorAccent: '#e0902a', tutorDone: '#2fae4e',
    keyFace: '#ece7da', keyBase: '#3a3f4c', keyInk: '#1e2230', keyPressed: '#8fe6a0'
  };

  var BASIC = ['ranged', 'melee', 'frost', 'seek', 'march', 'drum'];
  var COMBO = { pierce: ['ranged', 'ranged'], iceArrow: ['ranged', 'frost'], whirl: ['melee', 'melee'], frostSmash: ['melee', 'frost'], charge: ['drum', 'melee'] };
  var FORGE_ORDER = ['pierce', 'iceArrow', 'whirl', 'frostSmash', 'charge'];
  var KITS = { crossbowKit: 'crossbow', pillarKit: 'pillar', soldierKit: 'soldier', golemKit: 'golem' };
  var ENEMY_SIZE = { imp: 32, archer: 32, ice: 32, drummer: 36, brute: 44 };

  // ---------- 小工具 ----------
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function bool(v) { return v === true; }
  function str(v) { return typeof v === 'string' ? v : ''; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function isBasic(k) { return BASIC.indexOf(k) >= 0; }
  function isCombo(k) { return Object.prototype.hasOwnProperty.call(COMBO, k); }
  function enemyType(t) { return Object.prototype.hasOwnProperty.call(ENEMY_SIZE, t) ? t : 'imp'; }
  // 回傳 0~1 的播放進度, 沒在播回傳 -1
  function prog(age, dur) {
    dur = num(dur, 0); age = num(age, dur);
    if (!(dur > 0) || age < 0 || age >= dur) return -1;
    return age / dur;
  }
  function now() { return (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) / 1000; }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function txt(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = (o.weight || 'bold') + ' ' + (o.size || 14) + 'px ' + FONT;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.base || 'middle';
    if (o.stroke) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw || 3;
      if (o.maxW) ctx.strokeText(s, x, y, o.maxW); else ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = o.color || C.text;
    if (o.maxW) ctx.fillText(s, x, y, o.maxW); else ctx.fillText(s, x, y);
  }
  // 互動目標外框: 內緣貼齊 size 外邊, 寬 3
  function targetFrame(ctx, x, y, w, h) {
    ctx.save();
    var a = 0.75 + 0.25 * Math.sin(now() * 8);
    ctx.globalAlpha = a;
    ctx.strokeStyle = C.target; ctx.lineWidth = 3; ctx.setLineDash([]);
    rr(ctx, x - w / 2 - 1.5, y - h / 2 - 1.5, w + 3, h + 3, 4);
    ctx.stroke();
    ctx.restore();
  }
  function hpBar(ctx, x, y, w, hp, maxHp) {
    var r = clamp(hp / (maxHp || 1), 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x - w / 2, y - 2, w, 4);
    ctx.fillStyle = r > 0.5 ? C.hp : r > 0.25 ? '#f0c040' : '#ff5a4a';
    ctx.fillRect(x - w / 2, y - 2, w * r, 4);
  }
  function inGlow(ctx, w, h, r) {
    // 共鳴微光: 畫在框內
    var t = 0.6 + 0.4 * Math.sin(now() * 5);
    ctx.save();
    ctx.globalAlpha = 0.85 * t;
    ctx.strokeStyle = C.resonance; ctx.lineWidth = 2.5;
    rr(ctx, -w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, r);
    ctx.stroke();
    ctx.globalAlpha = 0.18 * t; ctx.fillStyle = C.resonance;
    rr(ctx, -w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, r); ctx.fill();
    ctx.restore();
  }
  function keycap(ctx, label, cx, cy, o) {
    o = o || {};
    var size = o.size || 12;
    ctx.save();
    ctx.font = 'bold ' + size + 'px ' + FONT;
    var w = Math.max(size + 8, ctx.measureText(label).width + 10), h = size + 8;
    ctx.fillStyle = '#3a3f4c'; rr(ctx, cx - w / 2, cy - h / 2 + 2, w, h, 4); ctx.fill();
    ctx.fillStyle = '#ece7da'; rr(ctx, cx - w / 2, cy - h / 2, w, h, 4); ctx.fill();
    ctx.strokeStyle = '#2a2d36'; ctx.lineWidth = 1; rr(ctx, cx - w / 2, cy - h / 2, w, h, 4); ctx.stroke();
    txt(ctx, label, cx, cy + 0.5, { size: size, color: '#1e2230' });
    ctx.restore();
    return w;
  }
  function arrowLine(ctx, x1, y1, x2, y2, color, lw, dash) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw || 3; ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    var a = Math.atan2(y2 - y1, x2 - x1), hl = 6 + (lw || 3) * 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.6, y2 - Math.sin(a) * hl * 0.6); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.5) * hl, y2 - Math.sin(a - 0.5) * hl);
    ctx.lineTo(x2 - Math.cos(a + 0.5) * hl, y2 - Math.sin(a + 0.5) * hl);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function coinGlyph(ctx, x, y, r) {
    ctx.fillStyle = '#8a5a00'; ctx.beginPath(); ctx.arc(x, y + 1, r, 0, TAU); ctx.fill();
    ctx.fillStyle = C.coin; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff2a8'; ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.stroke();
  }
  // 按鍵圖示(教學泡泡、Z 提示共用): key = left|right|up|down|z|x|space; 外接框 = (cx±w/2, cy±h/2)
  var KEY_NAMES = { left: 1, right: 1, up: 1, down: 1, z: 1, x: 1, space: 1 };
  function keyIcon(ctx, key, cx, cy, w, h, pressed) {
    ctx.save();
    var x0 = cx - w / 2, y0 = cy - h / 2, r = Math.min(5, h * 0.22);
    ctx.fillStyle = C.keyBase; rr(ctx, x0, y0, w, h, r); ctx.fill();
    ctx.fillStyle = pressed ? C.keyPressed : C.keyFace; rr(ctx, x0, y0, w, h - Math.max(1.5, h * 0.1), r); ctx.fill();
    ctx.strokeStyle = C.keyInk; ctx.lineWidth = 1; rr(ctx, x0 + 0.5, y0 + 0.5, w - 1, h - 1, r); ctx.stroke();
    var gy = cy - h * 0.05, k = h * 0.28;
    ctx.fillStyle = C.keyInk; ctx.strokeStyle = C.keyInk;
    if (key === 'left' || key === 'right' || key === 'up' || key === 'down') {
      var ang = { right: 0, down: PI / 2, left: PI, up: -PI / 2 }[key];
      ctx.save(); ctx.translate(cx, gy); ctx.rotate(ang);
      ctx.lineWidth = Math.max(1.5, h * 0.11); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-k, 0); ctx.lineTo(k * 0.3, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k * 0.1, -k * 0.75); ctx.lineTo(k * 0.1, k * 0.75); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (key === 'z' || key === 'x') {
      txt(ctx, key.toUpperCase(), cx, gy + 0.5, { size: Math.round(h * 0.62), color: C.keyInk });
    } else if (key === 'space') {
      txt(ctx, '空白', cx, gy + 0.5, { size: Math.round(h * 0.46), color: C.keyInk, maxW: w - 6 });
    }
    if (pressed) {
      // 右下角小勾(框內)
      ctx.strokeStyle = C.tutorDone; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var bx = x0 + w - 7, by = y0 + h - 8;
      ctx.beginPath(); ctx.moveTo(bx - 3.5, by); ctx.lineTo(bx - 1, by + 2.5); ctx.lineTo(bx + 3.5, by - 2.5); ctx.stroke();
    }
    ctx.restore();
  }
  function starPath(ctx, cx, cy, R, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -PI / 2 + i * PI / 5, rad = i % 2 ? r : R;
      if (i) ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); else ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    ctx.closePath();
  }
  function bigStar(ctx, cx, cy, R, lit) {
    ctx.save();
    if (lit) {
      ctx.fillStyle = '#7a5200'; starPath(ctx, cx, cy, R, R * 0.45); ctx.fill();
      ctx.fillStyle = C.gold; starPath(ctx, cx, cy, R * 0.86, R * 0.39); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; starPath(ctx, cx - R * 0.12, cy - R * 0.14, R * 0.3, R * 0.14); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; starPath(ctx, cx, cy, R, R * 0.45); ctx.fill();
      ctx.strokeStyle = 'rgba(200,205,220,0.45)'; ctx.lineWidth = Math.max(1, R * 0.08); ctx.lineJoin = 'round';
      starPath(ctx, cx, cy, R * 0.92, R * 0.41); ctx.stroke();
    }
    ctx.restore();
  }
  // 喇叭圖示, 外接框 size × size
  function speaker(ctx, cx, cy, size, muted) {
    ctx.save(); ctx.translate(cx, cy);
    var u = size / 28;
    ctx.scale(u, u);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, -14, -14, 28, 28, 6); ctx.fill();
    ctx.fillStyle = muted ? '#8a909e' : '#e8ecf4';
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-5, -4); ctx.lineTo(1, -9); ctx.lineTo(1, 9); ctx.lineTo(-5, 4); ctx.lineTo(-9, 4); ctx.closePath(); ctx.fill();
    ctx.lineCap = 'round';
    if (muted) {
      ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(4, -5); ctx.lineTo(11, 5); ctx.moveTo(11, -5); ctx.lineTo(4, 5); ctx.stroke();
    } else {
      ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(2, 0, 5, -PI / 3.2, PI / 3.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(2, 0, 9.5, -PI / 3.4, PI / 3.4); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 魂件圖示(全畫面共用一套) ----------
  function glyph(ctx, kind, s, color) {
    // 在 (0,0) 為中心, s = 半寬單位
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.2, s * 0.2);
    var i, a;
    switch (kind) {
      case 'ranged': // 斜向箭
        ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.7); ctx.lineTo(s * 0.55, -s * 0.55); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.8, -s * 0.8); ctx.lineTo(s * 0.15, -s * 0.65); ctx.lineTo(s * 0.65, -s * 0.15); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.7); ctx.lineTo(-s * 0.75, s * 0.3); ctx.moveTo(-s * 0.7, s * 0.7); ctx.lineTo(-s * 0.3, s * 0.75); ctx.stroke();
        break;
      case 'melee': // 直劍
        ctx.beginPath(); ctx.moveTo(0, -s * 0.85); ctx.lineTo(0, s * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.3); ctx.lineTo(s * 0.45, s * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, s * 0.3); ctx.lineTo(0, s * 0.8); ctx.stroke();
        break;
      case 'frost': // 雪花
        for (i = 0; i < 3; i++) {
          a = i * PI / 3;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.8, Math.sin(a) * s * 0.8); ctx.lineTo(-Math.cos(a) * s * 0.8, -Math.sin(a) * s * 0.8); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, s * 0.18, 0, TAU); ctx.fill();
        break;
      case 'seek': // 眼睛
        ctx.beginPath(); ctx.moveTo(-s * 0.85, 0); ctx.quadraticCurveTo(0, -s * 0.8, s * 0.85, 0); ctx.quadraticCurveTo(0, s * 0.8, -s * 0.85, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, TAU); ctx.fill();
        break;
      case 'march': // 城堡剪影(進攻主堡)
        ctx.beginPath();
        ctx.moveTo(-s * 0.7, s * 0.75); ctx.lineTo(-s * 0.7, -s * 0.6); ctx.lineTo(-s * 0.4, -s * 0.6); ctx.lineTo(-s * 0.4, -s * 0.3);
        ctx.lineTo(-s * 0.15, -s * 0.3); ctx.lineTo(-s * 0.15, -s * 0.6); ctx.lineTo(s * 0.15, -s * 0.6); ctx.lineTo(s * 0.15, -s * 0.3);
        ctx.lineTo(s * 0.4, -s * 0.3); ctx.lineTo(s * 0.4, -s * 0.6); ctx.lineTo(s * 0.7, -s * 0.6); ctx.lineTo(s * 0.7, s * 0.75); ctx.closePath();
        ctx.fill();
        break;
      case 'drum': // 戰鼓
        ctx.beginPath(); ctx.ellipse(0, -s * 0.35, s * 0.62, s * 0.22, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.62, -s * 0.35); ctx.lineTo(-s * 0.62, s * 0.4); ctx.moveTo(s * 0.62, -s * 0.35); ctx.lineTo(s * 0.62, s * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, s * 0.4, s * 0.62, s * 0.22, 0, 0, PI); ctx.stroke();
        ctx.lineWidth = Math.max(1, s * 0.13);
        ctx.beginPath(); ctx.moveTo(-s * 0.62, -s * 0.2); ctx.lineTo(0, s * 0.5); ctx.lineTo(s * 0.62, -s * 0.2); ctx.stroke();
        break;
      case 'pierce': // 長箭穿過兩點
        ctx.beginPath(); ctx.moveTo(-s * 0.85, 0); ctx.lineTo(s * 0.55, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.9, 0); ctx.lineTo(s * 0.45, -s * 0.35); ctx.lineTo(s * 0.45, s * 0.35); ctx.closePath(); ctx.fill();
        ctx.lineWidth = Math.max(1, s * 0.14);
        ctx.beginPath(); ctx.arc(-s * 0.3, 0, s * 0.22, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(s * 0.15, 0, s * 0.22, 0, TAU); ctx.stroke();
        break;
      case 'iceArrow': // 箭 + 雪花頭
        ctx.beginPath(); ctx.moveTo(-s * 0.75, s * 0.75); ctx.lineTo(s * 0.2, -s * 0.2); ctx.stroke();
        ctx.save(); ctx.translate(s * 0.42, -s * 0.42); ctx.lineWidth = Math.max(1, s * 0.15);
        for (i = 0; i < 3; i++) { a = i * PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4); ctx.lineTo(-Math.cos(a) * s * 0.4, -Math.sin(a) * s * 0.4); ctx.stroke(); }
        ctx.restore();
        break;
      case 'whirl': // 旋風
        ctx.beginPath(); ctx.arc(0, 0, s * 0.62, -PI * 0.15, PI * 1.35); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, s * 0.28, PI * 0.85, PI * 2.35); ctx.stroke();
        a = PI * 1.35;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62);
        ctx.lineTo(Math.cos(a) * s * 0.62 + s * 0.38, Math.sin(a) * s * 0.62 - s * 0.05);
        ctx.lineTo(Math.cos(a) * s * 0.62 + s * 0.05, Math.sin(a) * s * 0.62 + s * 0.38); ctx.closePath(); ctx.fill();
        break;
      case 'frostSmash': // 錘 + 雪花
        ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.8); ctx.lineTo(s * 0.15, -s * 0.1); ctx.stroke();
        ctx.save(); ctx.translate(s * 0.3, -s * 0.3); ctx.rotate(PI / 4);
        ctx.fillRect(-s * 0.55, -s * 0.25, s * 1.1, s * 0.5); ctx.restore();
        ctx.lineWidth = Math.max(1, s * 0.12);
        ctx.beginPath(); ctx.moveTo(-s * 0.85, -s * 0.2); ctx.lineTo(-s * 0.35, -s * 0.2); ctx.moveTo(-s * 0.6, -s * 0.45); ctx.lineTo(-s * 0.6, s * 0.05); ctx.stroke();
        break;
      case 'charge': // 雙箭頭往前衝
        ctx.lineWidth = Math.max(1.4, s * 0.24);
        ctx.beginPath(); ctx.moveTo(-s * 0.7, -s * 0.55); ctx.lineTo(-s * 0.15, 0); ctx.lineTo(-s * 0.7, s * 0.55); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -s * 0.55); ctx.lineTo(s * 0.55, 0); ctx.lineTo(0, s * 0.55); ctx.stroke();
        break;
    }
  }
  function darken(hex, f) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r * f) + ',' + Math.round(g * f) + ',' + Math.round(b * f) + ')';
  }
  // 物品圖示: 中心 (cx,cy), 邊長 s
  function itemIcon(ctx, item, cx, cy, s, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    if (alpha != null) ctx.globalAlpha *= alpha;
    var h = s / 2;
    if (isBasic(item)) {
      var col = C[item];
      ctx.fillStyle = darken(col, 0.55); rr(ctx, -h, -h, s, s, s * 0.22); ctx.fill();
      ctx.fillStyle = col; rr(ctx, -h + 1, -h + 1, s - 2, s - 3, s * 0.2); ctx.fill();
      glyph(ctx, item, h * 0.78, '#1b1d26');
    } else if (isCombo(item)) {
      var pr = COMBO[item];
      // 八角形 + 金邊 + 斜分雙色
      var oct = function (r) {
        ctx.beginPath();
        for (var i = 0; i < 8; i++) { var a = PI / 8 + i * PI / 4; var px = Math.cos(a) * r, py = Math.sin(a) * r; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.closePath();
      };
      var R = h / Math.cos(PI / 8);
      ctx.fillStyle = C.combo; oct(R); ctx.fill();
      ctx.save(); oct(R - Math.max(1.5, s * 0.1)); ctx.clip();
      ctx.fillStyle = C[pr[0]]; ctx.fillRect(-h, -h, s, s);
      ctx.fillStyle = C[pr[1]]; ctx.beginPath(); ctx.moveTo(h, -h); ctx.lineTo(h, h); ctx.lineTo(-h, h); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 1; oct(R - 0.5); ctx.stroke();
      glyph(ctx, item, h * 0.72, '#141620');
    } else if (item === 'slotStone') {
      ctx.fillStyle = '#4b5468';
      ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(h, 0); ctx.lineTo(0, h); ctx.lineTo(-h, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.slotStone;
      ctx.beginPath(); ctx.moveTo(0, -h + 2); ctx.lineTo(h - 2, 0); ctx.lineTo(0, h - 2); ctx.lineTo(-h + 2, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1e2230'; ctx.lineWidth = Math.max(1.5, s * 0.12); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-h * 0.4, 0); ctx.lineTo(h * 0.4, 0); ctx.moveTo(0, -h * 0.4); ctx.lineTo(0, h * 0.4); ctx.stroke();
    } else if (KITS[item]) {
      // 單位材料: 木箱底 + 單位小圖
      ctx.fillStyle = '#6b4a2a'; rr(ctx, -h, -h, s, s, 3); ctx.fill();
      ctx.fillStyle = '#8a6440'; rr(ctx, -h + 1.5, -h + 1.5, s - 3, s - 3, 2); ctx.fill();
      var u = KITS[item], k = s / ({ crossbow: 56, pillar: 42, soldier: 38, golem: 62 }[u]);
      ctx.save(); ctx.scale(k, k);
      if (u === 'crossbow') crossbowBody(ctx, 0, false);
      else if (u === 'pillar') pillarBody(ctx, []);
      else if (u === 'soldier') soldierBody(ctx, C.ally, C.allyDark, C.allyRim);
      else golemBody(ctx, 'ally');
      ctx.restore();
    } else {
      // 未知物品: 只畫空框, 不冒充任何合法符號
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([2, 2]); ctx.lineWidth = 1;
      rr(ctx, -h + 0.5, -h + 0.5, s - 1, s - 1, 3); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 單位本體(以 0,0 為中心) ----------
  function crossbowBody(ctx, recoil, moving) {
    // 底座 44x44
    ctx.fillStyle = C.allyDark; rr(ctx, -22, -22, 44, 44, 7); ctx.fill();
    ctx.fillStyle = C.stone; rr(ctx, -19, -19, 38, 38, 5); ctx.fill();
    ctx.fillStyle = C.stoneDark; rr(ctx, -19, 8, 38, 11, 4); ctx.fill();
    ctx.strokeStyle = C.ally; ctx.lineWidth = 2; rr(ctx, -21, -21, 42, 42, 6); ctx.stroke();
    // 弩
    ctx.save(); ctx.translate(0, recoil);
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-3, -16, 6, 24);
    ctx.strokeStyle = '#7a4e26'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-16, -2); ctx.quadraticCurveTo(0, -18, 16, -2); ctx.stroke();
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-16, -2); ctx.lineTo(0, 4); ctx.lineTo(16, -2); ctx.stroke();
    ctx.fillStyle = C.allyShot; ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(-3, -13); ctx.lineTo(3, -13); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (moving) {
      ctx.fillStyle = '#2b2b2b';
      ctx.beginPath(); ctx.arc(-15, 19, 4, 0, TAU); ctx.arc(15, 19, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#bbb'; ctx.beginPath(); ctx.arc(-15, 19, 1.5, 0, TAU); ctx.arc(15, 19, 1.5, 0, TAU); ctx.fill();
    }
  }
  function kindColors(kinds) {
    var out = [];
    for (var i = 0; i < kinds.length && out.length < 2; i++) if (isBasic(kinds[i])) out.push(C[kinds[i]]);
    return out;
  }
  function pillarBody(ctx, kinds) {
    var cols = kindColors(kinds);
    // 底座
    ctx.fillStyle = C.allyDark; rr(ctx, -16, 9, 32, 9, 3); ctx.fill();
    ctx.fillStyle = '#c9c3b5'; rr(ctx, -14, 10, 28, 6, 2); ctx.fill();
    // 柱身
    ctx.fillStyle = '#d9d2c2';
    ctx.beginPath(); ctx.moveTo(-7, 10); ctx.lineTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(7, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a69f90'; ctx.beginPath(); ctx.moveTo(2, 10); ctx.lineTo(2.5, -5); ctx.lineTo(5, -5); ctx.lineTo(7, 10); ctx.closePath(); ctx.fill();
    // 頂端晶石 + 放射光
    if (cols.length) {
      var t = 0.7 + 0.3 * Math.sin(now() * 4);
      ctx.save(); ctx.globalAlpha = t;
      // 6 道放射光(不朝正上 / 正下), 全部收在 36×36 框內
      var RAY = [0, PI / 4, 3 * PI / 4, PI, 5 * PI / 4, 7 * PI / 4];
      for (var i = 0; i < RAY.length; i++) {
        var a = RAY[i];
        ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 9, -11 + Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * 15, -11 + Math.sin(a) * 8.5); ctx.stroke();
      }
      ctx.restore();
    }
    var gem = function () { ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(6, -11); ctx.lineTo(0, -5); ctx.lineTo(-6, -11); ctx.closePath(); };
    if (!cols.length) { ctx.fillStyle = '#6c6f78'; gem(); ctx.fill(); }
    else {
      ctx.save(); gem(); ctx.clip();
      ctx.fillStyle = cols[0]; ctx.fillRect(-6, -17, 12, 12);
      if (cols[1]) { ctx.fillStyle = cols[1]; ctx.fillRect(0, -17, 6, 12); }
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-3, -15, 2, 4);
      ctx.restore();
    }
    ctx.strokeStyle = '#1e2230'; ctx.lineWidth = 1; gem(); ctx.stroke();
  }
  function soldierBody(ctx, body, dark, rim) {
    ctx.fillStyle = dark; rr(ctx, -12, -11, 24, 26, 6); ctx.fill();
    ctx.fillStyle = body; rr(ctx, -11, -10, 22, 24, 5); ctx.fill();
    // 頭盔
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, -6, 9, PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rim; ctx.fillRect(-6, -5, 12, 3);
    // 劍
    ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(13, -9); ctx.lineTo(13, 7); ctx.stroke();
    ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, 7); ctx.lineTo(15, 7); ctx.stroke();
    // 盾
    ctx.fillStyle = rim; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(-7, -2); ctx.lineTo(-7, 6); ctx.lineTo(-10.5, 10); ctx.lineTo(-14, 6); ctx.closePath(); ctx.fill();
  }
  function golemBody(ctx, team) {
    var neutral = team !== 'ally';
    var st = neutral ? C.neutral : '#8494ad', dk = neutral ? C.neutralDark : '#4a5672';
    ctx.fillStyle = dk; rr(ctx, -22, -17, 44, 41, 9); ctx.fill();
    ctx.fillStyle = st; rr(ctx, -20, -15, 40, 37, 8); ctx.fill();
    // 手臂
    ctx.fillStyle = dk; rr(ctx, -27, -9, 9, 24, 4); ctx.fill(); rr(ctx, 18, -9, 9, 24, 4); ctx.fill();
    // 頭
    ctx.fillStyle = dk; rr(ctx, -11, -27, 22, 15, 4); ctx.fill();
    ctx.fillStyle = st; rr(ctx, -9.5, -25.5, 19, 12, 3); ctx.fill();
    // 裂紋
    ctx.strokeStyle = dk; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-4, 2); ctx.lineTo(-8, 12); ctx.moveTo(8, -8); ctx.lineTo(12, 4); ctx.stroke();
    // 眼
    ctx.fillStyle = neutral ? '#3a3936' : '#bfe0ff';
    ctx.fillRect(-6, -21, 4, 3); ctx.fillRect(2, -21, 4, 3);
    if (!neutral) {
      ctx.strokeStyle = C.ally; ctx.lineWidth = 2; rr(ctx, -21, -16, 42, 39, 8.5); ctx.stroke();
      ctx.fillStyle = C.allyRim; ctx.beginPath(); ctx.arc(0, 4, 3.5, 0, TAU); ctx.fill();
    }
  }
  function ghostPath(ctx, w, h) {
    var r = w / 2, top = -h / 2, by = h / 2, n = 3, seg = w / n;
    ctx.beginPath();
    ctx.moveTo(-r, top + r);
    ctx.arc(0, top + r, r, PI, 0);
    ctx.lineTo(r, by);
    for (var i = 0; i < n; i++) {
      var x1 = r - seg * i, x2 = x1 - seg;
      ctx.quadraticCurveTo(x1 - seg / 2, by - 9, x2, by);
    }
    ctx.closePath();
  }
  var ENEMY_COL = { imp: '#b23a52', archer: '#963a86', ice: '#5a5aa8', drummer: '#8a4a3a', brute: '#7e1a30' };
  function enemyBody(ctx, type, S, opt) {
    opt = opt || {};
    var body = opt.body || ENEMY_COL[type];
    var hs = S / 2;
    // 背後道具
    if (type === 'drummer' && !opt.flat) {
      ctx.fillStyle = darken(C.drum, 0.7); rr(ctx, 4, -2, 13, 13, 3); ctx.fill();
      ctx.strokeStyle = C.drum; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(4, 1); ctx.lineTo(10.5, 9); ctx.lineTo(17, 1); ctx.stroke();
      ctx.fillStyle = C.drum; ctx.fillRect(4, -2, 13, 2.5);
    }
    ctx.fillStyle = C.enemyDark; ghostPath(ctx, S - 1, S - 1); ctx.fill();
    ctx.fillStyle = body; ghostPath(ctx, S - 4, S - 4); ctx.fill();
    if (opt.tint) { ctx.fillStyle = opt.tint; ghostPath(ctx, S - 4, S - 4); ctx.fill(); }
    // 頭飾
    if (type === 'imp' && !opt.flat) {
      ctx.fillStyle = C.enemyDark;
      ctx.beginPath(); ctx.moveTo(-9, -hs + 6); ctx.lineTo(-12, -hs + 1); ctx.lineTo(-5, -hs + 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(9, -hs + 6); ctx.lineTo(12, -hs + 1); ctx.lineTo(5, -hs + 4); ctx.closePath(); ctx.fill();
    } else if (type === 'ice') {
      ctx.fillStyle = C.frost;
      for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 6, -hs + 2); ctx.lineTo(i * 6 + 3, -hs + 8); ctx.lineTo(i * 6 - 3, -hs + 8); ctx.closePath(); ctx.fill(); }
    } else if (type === 'archer' && !opt.flat) {
      ctx.strokeStyle = '#d8b878'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-hs + 6, 2, 9, -PI / 2.4, PI / 2.4); ctx.stroke();
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-hs + 6 + Math.cos(PI / 2.4) * 9, 2 - Math.sin(PI / 2.4) * 9); ctx.lineTo(-hs + 6 + Math.cos(PI / 2.4) * 9, 2 + Math.sin(PI / 2.4) * 9); ctx.stroke();
    } else if (type === 'brute' && !opt.flat) {
      ctx.fillStyle = '#4a2a1a'; ctx.save(); ctx.translate(hs - 7, 4); ctx.rotate(0.3); rr(ctx, -3, -12, 6, 20, 3); ctx.fill(); ctx.restore();
    }
    // 眼
    var ey = -hs * 0.12, ex = S * 0.17;
    if (opt.dead) {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.8;
      for (var s = -1; s <= 1; s += 2) {
        ctx.beginPath(); ctx.moveTo(s * ex - 3, ey - 3); ctx.lineTo(s * ex + 3, ey + 3); ctx.moveTo(s * ex + 3, ey - 3); ctx.lineTo(s * ex - 3, ey + 3); ctx.stroke();
      }
    } else {
      ctx.fillStyle = C.enemyDark;
      ctx.beginPath(); ctx.ellipse(-ex, ey, 4, 4.5, 0, 0, TAU); ctx.ellipse(ex, ey, 4, 4.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C.enemyEye;
      ctx.beginPath(); ctx.arc(-ex, ey, 2.2, 0, TAU); ctx.arc(ex, ey, 2.2, 0, TAU); ctx.fill();
    }
  }
  function playerBody(ctx) {
    // 斗篷底
    ctx.fillStyle = C.playerRim; ctx.beginPath(); ctx.arc(0, 1, 14.5, 0, TAU); ctx.fill();
    ctx.fillStyle = C.player; ctx.beginPath(); ctx.arc(0, 1, 12.5, 0, TAU); ctx.fill();
    // 兜帽
    ctx.fillStyle = C.playerCloak; ctx.beginPath(); ctx.arc(0, -3, 9, PI * 1.05, -PI * 0.05); ctx.lineTo(7, -1); ctx.lineTo(-7, -1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(-4.5, -2.5, 3, 3); ctx.fillRect(1.5, -2.5, 3, 3);
    // 鍛錘徽記
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-1, 3, 2, 9);
    ctx.fillStyle = '#4a4f5c'; rr(ctx, -5, 3, 10, 4, 1); ctx.fill();
  }

  // ---------- 背景 ----------
  var DEFAULT_PATHS = [[[0, 290], [600, 290], [600, 434], [1180, 434]]];
  function strokeRoute(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
  function normPaths(p) {
    var out = [];
    arr(p).slice(0, 3).forEach(function (line) {
      var pts = [];
      arr(line).forEach(function (q) { if (Array.isArray(q) && isFinite(+q[0]) && isFinite(+q[1])) pts.push([+q[0], +q[1]]); });
      if (pts.length >= 2) out.push(pts);
    });
    return out.length ? out : DEFAULT_PATHS;
  }
  // 起點往畫面外延伸 40(路從畫面外進來); 最後一段水平線收在主堡左緣 x = 1124
  function routePts(pts) {
    var a = pts[0], b = pts[1], dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1;
    var out = [[a[0] + dx / L * 40, a[1] + dy / L * 40]];
    for (var i = 0; i < pts.length; i++) out.push([pts[i][0], pts[i][1]]);
    var n = out.length, last = out[n - 1], prev = out[n - 2];
    if (last[1] === prev[1] && last[0] > 1124 && prev[0] < 1124) out[n - 1] = [1124, last[1]];
    return out;
  }
  // 入口: 由畫面邊往內 70 的暗化 + 兩側路標石
  function entryShade(ctx, pts) {
    var a = pts[0], b = pts[1];
    ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
    var g = ctx.createLinearGradient(-40, 0, 72, 0);
    g.addColorStop(0, 'rgba(12,8,4,0.65)'); g.addColorStop(1, 'rgba(12,8,4,0)');
    ctx.fillStyle = g; ctx.fillRect(-40, -25, 112, 50);
    ctx.fillStyle = '#4c4a42';
    rr(ctx, 76, -40, 12, 10, 3); ctx.fill(); rr(ctx, 76, 30, 12, 10, 3); ctx.fill();
    ctx.restore();
  }
  function grassAndGrid(ctx) {
    ctx.fillStyle = C.grass; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = C.grassDark;
    for (var i = 0; i < 60; i++) {
      var gx = (i * 211) % 1280, gy = 60 + (i * 137) % 650;
      ctx.beginPath(); ctx.ellipse(gx, gy, 18, 8, 0, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (var c = 0; c <= 27; c++) { ctx.moveTo(c * 48 + 0.5, 50); ctx.lineTo(c * 48 + 0.5, 50 + 14 * 48); }
    for (var r = 0; r <= 14; r++) { ctx.moveTo(0, 50 + r * 48 + 0.5); ctx.lineTo(1280, 50 + r * 48 + 0.5); }
    ctx.stroke();
  }
  // 多條路線: 每一層都是不透明色, 先畫完所有路的邊、再畫所有路面 → 重疊處同色、無接縫
  function roads(ctx, paths) {
    var rs = paths.map(routePts);
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; ctx.setLineDash([]);
    ctx.strokeStyle = C.pathEdge; ctx.lineWidth = 56; rs.forEach(function (p) { strokeRoute(ctx, p); });
    ctx.strokeStyle = C.path; ctx.lineWidth = 50; rs.forEach(function (p) { strokeRoute(ctx, p); });
    ctx.strokeStyle = C.pathLight; ctx.lineWidth = 20; rs.forEach(function (p) { strokeRoute(ctx, p); });
    paths.forEach(function (p) { entryShade(ctx, p); });
  }
  function drawBackground(ctx, s) {
    s = s || {};
    ctx.save();
    grassAndGrid(ctx);
    roads(ctx, normPaths(s.paths));
    ctx.restore();
  }

  // ---------- 地面層 ----------
  function drawPillarRange(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0), R = clamp(num(s.radius, 150), 0, 150);
    var cols = kindColors(arr(s.kinds));
    ctx.save();
    if (!cols.length) {
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.arc(x, y, R - 0.75, 0, TAU); ctx.stroke();
    } else {
      // 淡染地面
      var g = ctx.createRadialGradient(x, y, R * 0.2, x, y, R);
      ctx.globalAlpha = 1;
      if (cols.length === 1) {
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = cols[0]; ctx.globalAlpha = 0.09;
        ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.75; ctx.strokeStyle = cols[0]; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, R - 1.25, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
        ctx.beginPath(); ctx.arc(x, y, R - 8, 0, TAU); ctx.stroke();
      } else {
        // 兩件: 12 扇交替
        var n = 12;
        for (var i = 0; i < n; i++) {
          var a0 = i * TAU / n, a1 = a0 + TAU / n, col = cols[i % 2];
          ctx.fillStyle = col; ctx.globalAlpha = 0.09;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R, a0, a1); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 0.8; ctx.strokeStyle = col; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(x, y, R - 1.25, a0, a1); ctx.stroke();
        }
        ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.setLineDash([2, 6]); ctx.strokeStyle = cols[1];
        ctx.beginPath(); ctx.arc(x, y, R - 8, 0, TAU); ctx.stroke();
      }
    }
    var p = prog(s.changeAge, num(s.changeDuration, 0.5));
    if (p >= 0) {
      ctx.setLineDash([]);
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = cols[0] || '#ffffff'; ctx.lineWidth = 4;
      var rr2 = Math.max(2, (R - 2) * (0.1 + 0.9 * p));
      ctx.beginPath(); ctx.arc(x, y, rr2, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, rr2, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  function drawResonanceLine(ctx, s) {
    s = s || {};
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, x1), y2 = num(s.y2, y1);
    var col = isBasic(s.kind) ? C[s.kind] : '#ffffff';
    ctx.save();
    ctx.lineCap = 'round';
    if (!bool(s.active)) {
      ctx.globalAlpha = 0.35; ctx.strokeStyle = col; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    } else {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      // 往接收者流動的光點
      var L = Math.hypot(x2 - x1, y2 - y1);
      if (L > 1) {
        var t = now(), step = 26, off = (t * 60) % step;
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 1;
        for (var d = off; d < L; d += step) {
          var f = d / L;
          ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 2, 0, TAU); ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  function drawFrostAura(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0), R = clamp(num(s.radius, 70), 0, 70);
    var enemy = s.owner === 'enemy';
    ctx.save();
    ctx.fillStyle = enemy ? 'rgba(200,60,120,0.10)' : 'rgba(143,216,255,0.12)';
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.lineWidth = 2;
    if (enemy) { ctx.strokeStyle = 'rgba(230,80,140,0.75)'; ctx.setLineDash([6, 5]); }
    else ctx.strokeStyle = 'rgba(160,225,255,0.7)';
    ctx.beginPath(); ctx.arc(x, y, R - 1, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    // 雪點(緩慢繞行)
    var t = now() * 0.4;
    ctx.fillStyle = enemy ? 'rgba(255,170,210,0.8)' : 'rgba(220,245,255,0.85)';
    for (var i = 0; i < 6; i++) {
      var a = t + i * TAU / 6, rr3 = R * 0.72;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr3, y + Math.sin(a) * rr3, 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawCoin(ctx, s) {
    s = s || {};
    ctx.save();
    coinGlyph(ctx, num(s.x, 0), num(s.y, 0) - 0.5, 7);
    ctx.restore();
  }
  function drawCorpse(ctx, s) {
    s = s || {};
    var type = enemyType(s.kind), S = ENEMY_SIZE[type];
    var x = num(s.x, 0), y = num(s.y, 0), life = num(s.life, 15), maxLife = num(s.maxLife, 15) || 15;
    ctx.save();
    var a = 1;
    if (life < 3) a = (Math.floor(life * 4) % 2) ? 0.3 : 1;
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.save(); ctx.translate(0, S * 0.18); ctx.scale(1, 0.62);
    enemyBody(ctx, type, S, { body: '#6b5a66', flat: true, dead: true });
    ctx.restore();
    // 剩餘時間細條(框內底部)
    var r = clamp(life / maxLife, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-S / 2 + 2, S / 2 - 3, S - 4, 2);
    ctx.fillStyle = life < 3 ? '#ff6a5a' : '#d8d0d8'; ctx.fillRect(-S / 2 + 2, S / 2 - 3, (S - 4) * r, 2);
    ctx.restore();
    if (bool(s.targeted)) targetFrame(ctx, x, y, S, S);
  }
  function drawGroundPart(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    var p = prog(s.spawnAge, num(s.spawnDuration, 0.6));
    ctx.save();
    var ox = 0, oy = 0;
    if (p >= 0) {
      // 從主堡方向(右上)彈出落地
      var q = 1 - p;
      ox = 22 * q * q; oy = -22 * Math.sin(p * PI) * (1 - p * 0.3);
      // 落地閃光
      var fa = p > 0.55 ? (1 - p) / 0.45 : p / 0.55;
      ctx.globalAlpha = 0.8 * fa;
      ctx.fillStyle = '#fff4c0';
      ctx.beginPath(); ctx.arc(x, y, 14 + 10 * p, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // 影
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 11, 11, 3, 0, 0, TAU); ctx.fill();
    // 地上光圈(地上的東西 = 可撿)
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.arc(x, y, 13.5, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    var bob = p >= 0 ? 0 : Math.sin(now() * 3) * 1;
    itemIcon(ctx, s.item, x + ox, y + oy - 1 + bob, 20);
    ctx.restore();
    if (bool(s.targeted)) targetFrame(ctx, x, y, 28, 28);
  }
  function drawPlacePreview(ctx, s) {
    s = s || {};
    var kind = ({ crossbow: 1, pillar: 1, soldier: 1, golem: 1 }[s.kind]) ? s.kind : 'crossbow';
    var x = num(s.x, 0), y = num(s.y, 0), ok = bool(s.valid);
    var col = ok ? C.valid : C.invalid;
    ctx.save();
    if (kind === 'pillar') {
      ctx.strokeStyle = col; ctx.globalAlpha = 0.8; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(x, y, 149, 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    var S = { crossbow: 48, pillar: 48, soldier: 32, golem: 56 }[kind];
    ctx.translate(x, y);
    ctx.fillStyle = ok ? 'rgba(95,224,122,0.18)' : 'rgba(255,74,74,0.2)';
    rr(ctx, -S / 2, -S / 2, S, S, 4); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(ctx, -S / 2 + 1, -S / 2 + 1, S - 2, S - 2, 4); ctx.stroke();
    ctx.globalAlpha = 0.5;
    if (kind === 'crossbow') crossbowBody(ctx, 0, false);
    else if (kind === 'pillar') pillarBody(ctx, []);
    else if (kind === 'soldier') { ctx.save(); ctx.scale(0.9, 0.9); soldierBody(ctx, C.ally, C.allyDark, C.allyRim); ctx.restore(); }
    else { ctx.save(); ctx.scale(0.9, 0.9); golemBody(ctx, 'ally'); ctx.restore(); }
    ctx.globalAlpha = 1;
    if (!ok) {
      ctx.strokeStyle = C.invalid; ctx.lineWidth = 4; ctx.lineCap = 'round';
      var k = S * 0.3;
      ctx.beginPath(); ctx.moveTo(-k, -k); ctx.lineTo(k, k); ctx.moveTo(k, -k); ctx.lineTo(-k, k); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 單位 ----------
  function drawCastle(ctx, s) {
    s = s || {};
    var x = num(s.x, 1180), y = num(s.y, 434);
    var zone = bool(s.zoneActive);
    ctx.save();
    // 主堡區
    ctx.fillStyle = zone ? 'rgba(255,240,200,0.10)' : 'rgba(255,240,200,0.04)';
    ctx.beginPath(); ctx.arc(x, y, 110, 0, TAU); ctx.fill();
    ctx.strokeStyle = zone ? 'rgba(255,235,190,0.9)' : 'rgba(255,235,190,0.35)';
    ctx.lineWidth = zone ? 2.5 : 1.5; ctx.setLineDash([4, 7]);
    ctx.beginPath(); ctx.arc(x, y, 110 - ctx.lineWidth / 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (zone) keycap(ctx, '空白鍵', x - 48, y + 74, { size: 11 });
    // 本體
    var pa = prog(s.attackAge, num(s.attackDuration, 0.15));
    var dy = pa >= 0 ? -3 * Math.sin(pa * PI) : 0;
    ctx.translate(x, y + dy);
    var ph = prog(s.hitAge, num(s.hitDuration, 0.3));
    // 牆
    ctx.fillStyle = C.stoneDark; rr(ctx, -48, -34, 96, 86, 6); ctx.fill();
    ctx.fillStyle = C.stone; rr(ctx, -45, -31, 90, 80, 5); ctx.fill();
    // 塔
    var tower = function (tx) {
      ctx.fillStyle = C.stoneDark; ctx.fillRect(tx - 13, -50, 26, 70);
      ctx.fillStyle = '#a3a9b8'; ctx.fillRect(tx - 11, -48, 22, 66);
      ctx.fillStyle = C.stoneDark;
      for (var i = 0; i < 3; i++) ctx.fillRect(tx - 13 + i * 9.5, -56, 7, 7);
    };
    tower(-38); tower(38);
    // 旗
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(0, -54); ctx.stroke();
    ctx.fillStyle = C.ally; ctx.beginPath(); ctx.moveTo(1, -54); ctx.lineTo(18, -49); ctx.lineTo(1, -44); ctx.closePath(); ctx.fill();
    // 牆面石紋
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-25, -10); ctx.lineTo(25, -10); ctx.moveTo(-25, 10); ctx.lineTo(25, 10); ctx.stroke();
    // 正面藍色軍旗(靜態; 原魂爐爐口拿掉)
    ctx.fillStyle = C.allyDark; rr(ctx, -12, 14, 24, 32, 3); ctx.fill();
    ctx.fillStyle = C.ally; ctx.beginPath(); ctx.moveTo(-10, 16); ctx.lineTo(10, 16); ctx.lineTo(10, 40); ctx.lineTo(0, 34); ctx.lineTo(-10, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.allyRim; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(5, 25); ctx.lineTo(0, 30); ctx.lineTo(-5, 25); ctx.closePath(); ctx.fill();
    // 左側城門: 兵歸隊時從這裡走出 (1124,434)
    var door = function () { ctx.beginPath(); ctx.moveTo(-55, 20); ctx.lineTo(-55, -4); ctx.arc(-46.5, -4, 8.5, PI, 0); ctx.lineTo(-38, 20); ctx.closePath(); };
    ctx.fillStyle = C.stoneDark; door(); ctx.fill();
    ctx.save(); door(); ctx.clip();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-54, -12, 14, 32);
    ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-50.5, -12); ctx.lineTo(-50.5, 20); ctx.moveTo(-43.5, -12); ctx.lineTo(-43.5, 20); ctx.moveTo(-54, 6); ctx.lineTo(-40, 6); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#2a2d36'; ctx.lineWidth = 1.5; door(); ctx.stroke();
    if (ph >= 0) {
      ctx.globalAlpha = 0.55 * (1 - ph); ctx.fillStyle = '#ff3a3a';
      ctx.fillRect(-56, -56, 107, 108);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (bool(s.targeted)) targetFrame(ctx, x, y, 112, 112);
  }
  function drawCrossbow(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    var pa = prog(s.attackAge, num(s.attackDuration, 0.15));
    ctx.save(); ctx.translate(x, y);
    crossbowBody(ctx, pa >= 0 ? 3 * Math.sin(pa * PI) : 0, bool(s.moving));
    if (bool(s.resonating)) inGlow(ctx, 48, 48, 7);
    ctx.restore();
    if (bool(s.targeted)) targetFrame(ctx, x, y, 48, 48);
  }
  function drawPillar(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save(); ctx.translate(x, y);
    pillarBody(ctx, arr(s.kinds));
    ctx.restore();
    if (bool(s.targeted)) targetFrame(ctx, x, y, 36, 36);
  }
  // 歸隊中的魂光拖尾: 身後(右, 主堡方向)錐形淡光, 至多畫到框外 12px
  function soulTrail(ctx, hs) {
    var g = ctx.createLinearGradient(-hs * 0.2, 0, hs + 12, 0);
    g.addColorStop(0, 'rgba(207,224,255,0.55)'); g.addColorStop(1, 'rgba(207,224,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-hs * 0.2, -hs * 0.65);
    ctx.quadraticCurveTo(hs, -hs * 0.45, hs + 12, 0);
    ctx.quadraticCurveTo(hs, hs * 0.45, -hs * 0.2, hs * 0.65); ctx.closePath(); ctx.fill();
    var t = now();
    ctx.fillStyle = C.soulLight;
    for (var i = 0; i < 3; i++) {
      var f = ((t * 1.6 + i / 3) % 1);
      ctx.globalAlpha = 0.8 * (1 - f);
      ctx.beginPath(); ctx.arc(hs * 0.4 + (hs * 0.6 + 8) * f, (i - 1) * hs * 0.3 * (1 - f), 1.8, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function mobile(ctx, s, S, bodyFn) {
    var x = num(s.x, 0), y = num(s.y, 0), hs = S / 2;
    var returning = bool(s.returning);
    ctx.save(); ctx.translate(x, y);
    if (returning) {
      soulTrail(ctx, hs);
      var bobR = bool(s.moving) ? Math.abs(Math.sin(now() * 8)) * -1.5 : 0;
      ctx.save(); ctx.translate(0, bobR);
      ctx.globalAlpha = 0.42; bodyFn(false);
      ctx.globalAlpha = 0.9; ctx.strokeStyle = C.soulLight; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      rr(ctx, -hs + 1.5, -hs + 2.5, S - 3, S - 4, 6); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    } else {
      var pa = prog(s.attackAge, num(s.attackDuration, 0.15));
      var ax = pa >= 0 ? -3 * Math.sin(pa * PI) : 0;
      var charging = bool(s.charging);
      if (charging) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hs + 2, i * hs * 0.45); ctx.lineTo(hs + 11, i * hs * 0.45); ctx.stroke(); }
        ax = -1;
      }
      var bob = bool(s.moving) && !charging ? Math.abs(Math.sin(now() * 8)) * -1.5 : 0;
      ctx.save(); ctx.translate(ax, bob);
      if (charging) { ctx.transform(1, 0, -0.12, 1, 0, 0); ctx.scale(0.85, 0.85); }
      bodyFn(false);
      var ph = prog(s.hitAge, num(s.hitDuration, 0.2));
      if (ph >= 0) { ctx.globalAlpha = 0.7 * (1 - ph); ctx.fillStyle = '#ffffff'; rr(ctx, -hs + 3, -hs + 3, S - 6, S - 6, 6); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.restore();
      if (bool(s.resonating)) inGlow(ctx, S, S, 6);
    }
    ctx.restore();
    var hp = num(s.hp, 1), mh = num(s.maxHp, 1);
    if (!returning && hp < mh) { ctx.save(); hpBar(ctx, x, y - hs - 6, S, hp, mh); ctx.restore(); }
    if (bool(s.targeted)) targetFrame(ctx, x, y, S, S);
  }
  function drawSoldier(ctx, s) {
    s = s || {};
    mobile(ctx, s, 32, function () { soldierBody(ctx, C.ally, C.allyDark, C.allyRim); });
  }
  function drawGolem(ctx, s) {
    s = s || {};
    var team = s.team === 'ally' ? 'ally' : 'neutral';
    if (team === 'neutral') {
      s = { x: s.x, y: s.y, hp: 1, maxHp: 1, hitAge: s.hitAge, hitDuration: s.hitDuration, attackAge: s.attackAge, attackDuration: s.attackDuration, moving: s.moving, charging: false, resonating: false, returning: false, targeted: s.targeted };
    }
    mobile(ctx, s, 56, function () { golemBody(ctx, team); });
  }
  // 潰散: 本體化成魂光往右(主堡方向)飛散; 和敵人死亡(留下灰色屍體)分開
  var BREAK_SEEDS = [[-0.30, -0.10, 0.00], [0.25, 0.15, 0.08], [-0.05, 0.35, 0.04], [0.10, -0.38, 0.12], [-0.40, 0.25, 0.02], [0.35, -0.20, 0.10]];
  function drawUnitBreak(ctx, s) {
    s = s || {};
    var kind = s.kind === 'golem' ? 'golem' : 'soldier';
    var p = prog(s.age, num(s.duration, 0.5)); if (p < 0) return;
    var H = kind === 'golem' ? 60 : 48, S = kind === 'golem' ? 56 : 32;
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save(); ctx.translate(x, y);
    // 1. 本體淡出 + 中心柔光(0~0.45)
    if (p < 0.45) {
      var q = p / 0.45;
      ctx.save(); ctx.globalAlpha = 0.7 * (1 - q); ctx.scale(1 - 0.25 * q, 1 - 0.25 * q);
      if (kind === 'golem') golemBody(ctx, 'ally'); else soldierBody(ctx, C.ally, C.allyDark, C.allyRim);
      ctx.restore();
      var gr = S * 0.5 * (0.6 + 0.4 * q);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(207,224,255,0)');
      ctx.globalAlpha = 1 - q; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, gr, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // 2. 魂光彗星: 由本體各處往右飛到框邊, 末段淡出
    var headR = kind === 'golem' ? 4 : 3;
    for (var i = 0; i < BREAK_SEEDS.length; i++) {
      var sd = BREAK_SEEDS[i];
      var lp = clamp((p - sd[2]) / (1 - sd[2]), 0, 1); if (lp <= 0) continue;
      var e = 1 - (1 - lp) * (1 - lp);
      var sx = sd[0] * S, sy = sd[1] * S;
      var hx = sx + (H - headR - 2 - sx) * e, hy = sy * (1 - 0.5 * e) - 8 * e;
      var tail = (kind === 'golem' ? 22 : 16) * Math.min(1, lp * 3);
      var tx = Math.max(-H + 1, hx - tail);
      var a = lp > 0.7 ? (1 - lp) / 0.3 : 1;
      ctx.globalAlpha = a;
      var lg = ctx.createLinearGradient(tx, hy, hx, hy);
      lg.addColorStop(0, 'rgba(207,224,255,0)'); lg.addColorStop(1, 'rgba(207,224,255,0.9)');
      ctx.strokeStyle = lg; ctx.lineWidth = headR * 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, hy + 3 * e); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(hx, hy, headR * (1 - 0.3 * lp), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawEnemy(ctx, s) {
    s = s || {};
    var type = enemyType(s.type), S = ENEMY_SIZE[type], hs = S / 2;
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save(); ctx.translate(x, y);
    var pa = prog(s.attackAge, num(s.attackDuration, 0.15));
    var ax = pa >= 0 ? 3 * Math.sin(pa * PI) : 0;
    var moving = s.moving !== false;
    var bob = moving ? Math.sin(now() * 6 + x * 0.05) * 1.2 : 0;
    var ph = prog(s.hitAge, num(s.hitDuration, 0.2));
    var tint = null;
    if (bool(s.slowed)) tint = 'rgba(150,220,255,0.5)';
    ctx.save(); ctx.translate(ax, bob);
    enemyBody(ctx, type, S, { tint: tint });
    if (ph >= 0) { ctx.globalAlpha = 0.8 * (1 - ph); ctx.fillStyle = '#ffffff'; ghostPath(ctx, S - 4, S - 4); ctx.fill(); ctx.globalAlpha = 1; }
    if (bool(s.slowed)) {
      ctx.strokeStyle = 'rgba(220,245,255,0.9)'; ctx.lineWidth = 1.5; ghostPath(ctx, S - 4, S - 4); ctx.stroke();
    }
    ctx.restore();
    var pst = prog(s.stunAge, num(s.stunDuration, 1.0));
    if (pst >= 0) {
      // 暈眩: 頭頂 3 顆繞圈的星星(框內上半部), 優先於呆站問號
      var st = now() * 7;
      for (var si = 0; si < 3; si++) {
        var sa = st + si * TAU / 3, sx = Math.cos(sa) * (hs - 7.5), sy = -hs + 7.5 + Math.sin(sa) * 2.5;
        ctx.fillStyle = '#3a2a00'; starPath(ctx, sx, sy, 4.2, 1.9); ctx.fill();
        ctx.fillStyle = C.stun; starPath(ctx, sx, sy, 3.2, 1.4); ctx.fill();
      }
    } else if (!moving) txt(ctx, '?', 0, -hs + 9, { size: 14, color: '#ffe14a', stroke: '#1a0a10', sw: 3 });
    ctx.restore();
    var hp = num(s.hp, 1), mh = num(s.maxHp, 1);
    if (hp < mh) { ctx.save(); hpBar(ctx, x, y - hs - 6, S, hp, mh); ctx.restore(); }
    if (bool(s.targeted)) targetFrame(ctx, x, y, S, S);
  }
  function drawPlayer(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    var stealing = bool(s.stealing), sp = clamp(num(s.stealProgress, 0), 0, 1);
    if (stealing) {
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.stroke();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 22, -PI / 2, -PI / 2 + TAU * sp); ctx.stroke();
    }
    ctx.translate(x, y);
    var bob = bool(s.moving) ? -Math.abs(Math.sin(now() * 10)) * 1.5 : 0;
    ctx.save(); ctx.translate(0, bob);
    // 影
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 13, 10, 2.5, 0, 0, TAU); ctx.fill();
    playerBody(ctx);
    ctx.restore();
    // 手上物品: 捧在右側, 圖示中心 (x+28, y), 22×22
    var hi = s.handItem;
    if (typeof hi === 'string' && hi) {
      ctx.fillStyle = 'rgba(255,241,201,0.25)'; rr(ctx, 17, -11, 22, 22, 6); ctx.fill();
      itemIcon(ctx, hi, 28, -1, 18);
      ctx.fillStyle = C.player; ctx.strokeStyle = C.playerRim; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(21, 9, 2.8, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(35, 9, 2.8, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 魂件槽列 ----------
  function slotCell(ctx, cx, cy, size, item) {
    var h = size / 2;
    ctx.fillStyle = 'rgba(16,20,30,0.88)'; rr(ctx, cx - h, cy - h, size, size, 3); ctx.fill();
    if (typeof item === 'string' && item) itemIcon(ctx, item, cx, cy, size - 2);
    else {
      ctx.strokeStyle = 'rgba(220,225,235,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      rr(ctx, cx - h + 1.5, cy - h + 1.5, size - 3, size - 3, 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function drawSoulSlots(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0);
    var slots = arr(s.slots).slice(0, 4), L = slots.length;
    var virt = arr(s.virtual);
    ctx.save();
    if (L > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, x - L * 10, y - 10, L * 20, 20, 4); ctx.fill();
      for (var i = 0; i < L; i++) slotCell(ctx, x - L * 10 + 10 + 20 * i, y, 18, slots[i]);
    }
    if (virt.length) {
      var sx = x + L * 10 + 6;
      var show = virt.length <= 3 ? virt.length : 2;
      for (var j = 0; j < show; j++) {
        var v = virt[j] || {}, k = isBasic(v.kind) ? v.kind : null, used = bool(v.used);
        var cx = sx + 7 + 16 * j;
        var col = k ? C[k] : '#ffffff';
        ctx.globalAlpha = used ? 0.9 : 0.45;
        ctx.fillStyle = 'rgba(16,20,30,0.6)'; rr(ctx, cx - 7, y - 7, 14, 14, 3); ctx.fill();
        if (k) {
          ctx.globalAlpha = used ? 0.55 : 0.22; ctx.fillStyle = col; rr(ctx, cx - 7, y - 7, 14, 14, 3); ctx.fill();
          ctx.globalAlpha = used ? 1 : 0.55;
          ctx.save(); ctx.translate(cx, y); glyph(ctx, k, 5, used ? '#ffffff' : col); ctx.restore();
        }
        ctx.globalAlpha = used ? 1 : 0.6;
        ctx.strokeStyle = used ? '#ffffff' : col; ctx.lineWidth = 1; ctx.setLineDash([2, 1.5]);
        rr(ctx, cx - 6.5, y - 6.5, 13, 13, 3); ctx.stroke(); ctx.setLineDash([]);
      }
      if (virt.length > 3) {
        var cx3 = sx + 7 + 32;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgba(16,20,30,0.7)'; rr(ctx, cx3 - 7, y - 7, 14, 14, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([2, 1.5]);
        rr(ctx, cx3 - 6.5, y - 6.5, 13, 13, 3); ctx.stroke(); ctx.setLineDash([]);
        txt(ctx, '+' + (virt.length - 2), cx3, y + 0.5, { size: 9, color: '#ffffff', maxW: 13 });
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ---------- 特效 ----------
  function drawProjectile(ctx, s) {
    s = s || {};
    var x = num(s.x, 0), y = num(s.y, 0), a = num(s.angle, 0);
    var enemy = s.owner === 'enemy', ice = s.kind === 'ice';
    ctx.save(); ctx.translate(x, y);
    if (enemy) {
      ctx.fillStyle = 'rgba(255,77,122,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a0a24'; ctx.beginPath(); ctx.arc(0, 0, 3.8, 0, TAU); ctx.fill();
      ctx.fillStyle = ice ? C.frost : C.enemyShot; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, TAU); ctx.fill();
    } else {
      ctx.rotate(a);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(20,20,30,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.stroke();
      ctx.strokeStyle = ice ? C.frost : C.allyShot; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.stroke();
      ctx.fillStyle = ice ? '#ffffff' : C.ranged;
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(1, -3.2); ctx.lineTo(1, 3.2); ctx.closePath(); ctx.fill();
      if (ice) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(-1, 3); ctx.moveTo(-1, -3); ctx.lineTo(-3, 3); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawPierceBeam(ctx, s) {
    s = s || {};
    var p = prog(s.age, num(s.duration, 0.15)); if (p < 0) return;
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, x1), y2 = num(s.y2, y1);
    ctx.save(); ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.35 * (1 - p); ctx.strokeStyle = C.ranged; ctx.lineWidth = 28;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.globalAlpha = 0.9 * (1 - p); ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 8 * (1 - p * 0.5);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }
  function drawAreaHit(ctx, s) {
    s = s || {};
    var p = prog(s.age, num(s.duration, 0.3)); if (p < 0) return;
    var kind = ({ whirl: 1, frostSmash: 1, charge: 1 }[s.kind]) ? s.kind : 'whirl';
    var x = num(s.x, 0), y = num(s.y, 0);
    var R = clamp(num(s.radius, kind === 'charge' ? 30 : 60), 4, 60);
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
    var fade = 1 - p;
    if (kind === 'whirl') {
      ctx.rotate(p * TAU);
      for (var i = 0; i < 3; i++) {
        var a0 = i * TAU / 3;
        ctx.globalAlpha = fade; ctx.strokeStyle = C.melee; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(0, 0, R - 3, a0, a0 + 1.4); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, R - 3, a0 + 0.3, a0 + 1.4); ctx.stroke();
      }
      ctx.globalAlpha = 0.15 * fade; ctx.fillStyle = C.melee; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    } else if (kind === 'frostSmash') {
      var r = Math.max(2, (R - 2) * (0.25 + 0.75 * p));
      ctx.globalAlpha = 0.25 * fade; ctx.fillStyle = C.frost; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = fade; ctx.strokeStyle = C.frost; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#e8f8ff';
      for (var j = 0; j < 6; j++) {
        var a = j * TAU / 6 + 0.3, d = Math.min(R - 5, r * 0.75);
        ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(0, -2.5); ctx.lineTo(-4, 0); ctx.lineTo(0, 2.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    } else {
      // 衝鋒撞擊: 0~0.2 實心白粉衝擊閃 + 粗衝擊環; 朝撞退方向噴出的錐形衝擊線
      var ang = num(s.angle, 0);
      if (p < 0.25) {
        var fq = p / 0.25, fr = (R - 3) * (0.55 + 0.45 * fq);
        ctx.globalAlpha = 1 - fq;
        ctx.fillStyle = '#ffffff'; starPath(ctx, 0, 0, fr, fr * 0.45); ctx.fill();
        ctx.fillStyle = C.drum; starPath(ctx, 0, 0, fr * 0.55, fr * 0.25); ctx.fill();
      }
      var r2 = Math.max(2, (R - 3) * (0.35 + 0.65 * p));
      ctx.globalAlpha = fade; ctx.strokeStyle = '#3a0a30'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, r2, 0, TAU); ctx.stroke();
      ctx.strokeStyle = C.drum; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r2, 0, TAU); ctx.stroke();
      ctx.rotate(ang);
      var spreads = [-0.55, -0.27, 0, 0.27, 0.55];
      for (var k = 0; k < spreads.length; k++) {
        var b = spreads[k], len = k === 2 ? 1 : 0.82;
        var d0 = (R - 3) * (0.15 + 0.5 * p), d1 = Math.min(R - 3, (R - 3) * (0.5 + 0.6 * p) * len);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = k === 2 ? 3.5 : 2.5;
        ctx.beginPath(); ctx.moveTo(Math.cos(b) * d0, Math.sin(b) * d0); ctx.lineTo(Math.cos(b) * d1, Math.sin(b) * d1); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawHitSpark(ctx, s) {
    s = s || {};
    var p = prog(s.age, num(s.duration, 0.25)); if (p < 0) return;
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 2.5;
    for (var i = 0; i < 6; i++) {
      var a = i * TAU / 6 + 0.4, r0 = 3 + 5 * p, r1 = Math.min(11, 6 + 6 * p);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 4 * (1 - p) + 1, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawStealLink(ctx, s) {
    s = s || {};
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, x1), y2 = num(s.y2, y1);
    var p = clamp(num(s.progress, 0), 0, 1);
    var L = Math.hypot(x2 - x1, y2 - y1); if (L < 1) return;
    var ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 鋸齒鎖鏈線(和共鳴的直線分開)
    var seg = 8, amp = 3 + 2 * p, n = Math.max(2, Math.floor(L / seg));
    var path = function () {
      ctx.beginPath(); ctx.moveTo(x1, y1);
      for (var i = 1; i < n; i++) { var d = L * i / n, o = (i % 2 ? amp : -amp); ctx.lineTo(x1 + ux * d + nx * o, y1 + uy * d + ny * o); }
      ctx.lineTo(x2, y2);
    };
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4; path(); ctx.stroke();
    ctx.globalAlpha = 0.5 + 0.5 * p; ctx.strokeStyle = C.gold; ctx.lineWidth = 2 + 1.5 * p; path(); ctx.stroke();
    // 被拉回的光球
    var f = 1 - p;
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 3 + 2 * p, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawComboName(ctx, s) {
    s = s || {};
    var p = prog(s.age, num(s.duration, 1.5)); if (p < 0) return;
    var x = num(s.x, 0), y = num(s.y, 0), isNew = bool(s.isNew);
    var label = (isNew ? '新組合! ' : '') + str(s.name);
    var W = isNew ? 280 : 200, H = isNew ? 48 : 36;
    // 彈一下(0~0.15)後往上飄 +4 → −7, 最後 40% 淡出
    var sc = p < 0.08 ? 1 + 0.2 * (p / 0.08) : p < 0.16 ? 1.2 - 0.2 * ((p - 0.08) / 0.08) : 1;
    var dy = 4 - 11 * p;
    var alpha = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
    var ph = isNew ? 31 : 20, fs = isNew ? 18 : 14;
    ctx.save();
    ctx.translate(x, y + dy); ctx.scale(sc, sc);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold ' + fs + 'px ' + FONT;
    var maxPw = W / 1.2 - 4;
    var pw = Math.min(maxPw, ctx.measureText(label).width + (isNew ? 28 : 20));
    ctx.fillStyle = isNew ? '#3a2a05' : 'rgba(20,18,36,0.88)';
    rr(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
    ctx.strokeStyle = isNew ? C.gold : C.resonance; ctx.lineWidth = isNew ? 2.5 : 1.5;
    rr(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.stroke();
    txt(ctx, label, 0, 0.5, { size: fs, color: isNew ? C.gold : '#ffffff', maxW: pw - 12 });
    ctx.restore();
  }
  function drawSpawnWarning(ctx, s) {
    s = s || {};
    var x = num(s.x, 40), y = num(s.y, 194);
    var total = num(s.total, 6) || 6, rem = clamp(num(s.remaining, total), 0, total);
    var sec = Math.ceil(rem), frac = rem - (sec - 1);
    ctx.save(); ctx.translate(x, y);
    var blink = 0.65 + 0.35 * Math.sin(now() * 9);
    ctx.globalAlpha = blink;
    ctx.fillStyle = 'rgba(255,60,40,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 31, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#4a0c0c'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
    // 這一秒的剩餘環
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ff5a3a'; ctx.beginPath(); ctx.arc(0, 0, 26, -PI / 2, -PI / 2 + TAU * clamp(frac, 0, 1)); ctx.stroke();
    // 前進方向箭頭(依 angle 旋轉, 尖端在半徑 31 內)
    ctx.save(); ctx.rotate(num(s.angle, 0));
    ctx.fillStyle = '#2a0000';
    ctx.beginPath(); ctx.moveTo(31.5, 0); ctx.lineTo(21, -9); ctx.lineTo(21, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd0a0';
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(22.5, -6.5); ctx.lineTo(22.5, 6.5); ctx.closePath(); ctx.fill();
    ctx.restore();
    txt(ctx, String(sec), -1, 1, { size: 20, color: '#ffffff', stroke: '#2a0000', sw: 3 });
    ctx.restore();
  }

  // ---------- HUD / UI ----------
  function goldChip(ctx, x, y, gold) {
    coinGlyph(ctx, x + 9, y, 8);
    txt(ctx, String(gold), x + 22, y + 1, { size: 20, align: 'left', color: C.gold });
  }
  function heartGlyph(ctx, cx, cy) {
    ctx.fillStyle = '#ff5a6a';
    ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.bezierCurveTo(cx - 14, cy - 3, cx - 10, cy - 12, cx, cy - 6); ctx.bezierCurveTo(cx + 10, cy - 12, cx + 14, cy - 3, cx, cy + 6); ctx.fill();
  }
  function drawHud(ctx, s) {
    s = s || {};
    ctx.save();
    ctx.fillStyle = C.hud; ctx.fillRect(0, 0, 1280, 50);
    ctx.fillStyle = '#2c3446'; ctx.fillRect(0, 48, 1280, 2);
    // 關卡(x = 16)
    var lv = clamp(Math.floor(num(s.level, 1)), 1, 5);
    txt(ctx, '第 ' + lv + ' 關', 16, 25, { size: 13, align: 'left', color: C.textDim, weight: 'normal' });
    txt(ctx, str(s.levelName), 70, 25, { size: 17, align: 'left', color: C.text, maxW: 140 });
    // 金幣(x = 230)
    goldChip(ctx, 230, 25, Math.max(0, Math.floor(num(s.gold, 0))));
    // 主堡生命(x = 350)
    var hp = Math.max(0, Math.ceil(num(s.castleHp, 0))), mhp = Math.max(1, Math.floor(num(s.castleMaxHp, 20)));
    heartGlyph(ctx, 360, 26);
    txt(ctx, hp + ' / ' + mhp, 376, 26, { size: 20, align: 'left', color: hp <= mhp * 0.3 ? '#ff6a6a' : C.text });
    // 波次(x = 500)
    var wave = Math.max(0, Math.floor(num(s.wave, 0))), tw = Math.max(1, Math.floor(num(s.totalWaves, 4)));
    txt(ctx, '波次', 500, 25, { size: 12, align: 'left', color: C.textDim, weight: 'normal' });
    txt(ctx, wave + ' / ' + tw, 530, 26, { size: 20, align: 'left' });
    // 倒數(x = 640)
    var nw = num(s.nextWaveIn, -1);
    if (bool(s.clockPaused)) {
      txt(ctx, '準備中', 640, 26, { size: 17, align: 'left', color: '#9fd4ff' });
    } else if (nw >= 0) {
      var ns = Math.ceil(nw);
      txt(ctx, '下一波', 640, 25, { size: 12, align: 'left', color: C.textDim, weight: 'normal' });
      txt(ctx, ns + ' 秒', 680, 26, { size: 20, align: 'left', color: ns <= 6 ? '#ff8a5a' : C.text, maxW: 92 });
    }
    // 已發現的組合(標籤 x = 780, 圖示中心 840 + 32i)
    var combos = arr(s.combos);
    txt(ctx, '組合', 780, 25, { size: 13, align: 'left', color: C.textDim, weight: 'normal' });
    for (var i = 0; i < 5; i++) {
      var fx = 840 + i * 32;
      ctx.fillStyle = 'rgba(8,10,16,0.9)'; rr(ctx, fx - 13, 12, 26, 26, 4); ctx.fill();
      if (combos[i] === true) itemIcon(ctx, FORGE_ORDER[i], fx, 25, 24);
      else { ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); rr(ctx, fx - 11.5, 13.5, 23, 23, 3); ctx.stroke(); ctx.setLineDash([]); }
    }
    // 喇叭(1010,25) 28×28
    speaker(ctx, 1010, 25, 28, bool(s.muted));
    // 操作提示(右緣 1264)
    txt(ctx, 'Z 互動   空白鍵 商店   X 靜音', 1264, 25, { size: 13, align: 'right', color: C.textDim, weight: 'normal' });
    ctx.restore();
  }
  // Z 情境提示: 玩家腳下, 本體 96×22
  function drawActionHint(ctx, s) {
    s = s || {};
    var label = str(s.label); if (!label) return;
    var x = num(s.x, 0), y = num(s.y, 0), bad = label === '不能蓋';
    ctx.save();
    ctx.font = 'bold 13px ' + FONT;
    var tw = ctx.measureText(label).width;
    var W = Math.min(96, Math.max(48, 4 + 16 + 5 + tw + 8)), H = 22;
    var x0 = x - W / 2;
    ctx.fillStyle = bad ? 'rgba(60,12,12,0.66)' : 'rgba(12,16,26,0.6)'; rr(ctx, x0, y - H / 2, W, H, 6); ctx.fill();
    ctx.strokeStyle = bad ? 'rgba(255,110,100,0.8)' : 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
    rr(ctx, x0 + 0.5, y - H / 2 + 0.5, W - 1, H - 1, 6); ctx.stroke();
    ctx.globalAlpha = bad ? 0.55 : 1;
    keyIcon(ctx, 'z', x0 + 4 + 8, y, 16, 16, false);
    ctx.globalAlpha = 1;
    txt(ctx, label, x0 + 25, y + 0.5, { size: 13, align: 'left', color: bad ? '#ff9a8a' : '#ffffff', maxW: W - 29 });
    ctx.restore();
  }
  // ---------- 新手教學泡泡 ----------
  function keyW(k) { return k === 'space' ? 52 : 26; }
  function drawTutorial(ctx, s) {
    s = s || {};
    var bx = num(s.bodyX, 640), by = num(s.bodyY, 360);
    var side = s.side === 'down' ? 'down' : 'up';
    var tx = num(s.tipX, bx), ty = num(s.tipY, side === 'up' ? by + 56 : by - 56);
    var text = str(s.text);
    var keys = arr(s.keys).filter(function (k) { return KEY_NAMES[k] === 1; }).slice(0, 4);
    var pressed = arr(s.pressedKeys);
    var dd = num(s.doneDuration, 0.6) || 0.6, da = num(s.doneAge, dd);
    var dp = (da >= 0 && da < dd) ? da / dd : -1;
    var sc = 1, alpha = 1;
    if (dp >= 0) {
      var e = Math.min(1, dp / 0.3);
      sc = 1 + 0.15 * (1 - (1 - e) * (1 - e));
      alpha = dp < 0.45 ? 1 : 1 - (dp - 0.45) / 0.55;
    }
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(bx, by); ctx.scale(sc, sc);
    // 箭頭(本體 → 尖端), 底邊在本體邊緣、x = 尖端 x
    var edge = side === 'up' ? 36 : -36;
    var lx = clamp(tx - bx, -136, 136), ltx = tx - bx, lty = ty - by;
    var arrowPath = function (inset) {
      ctx.beginPath();
      ctx.moveTo(lx - 11, edge - (side === 'up' ? inset : -inset));
      ctx.lineTo(ltx, lty);
      ctx.lineTo(lx + 11, edge - (side === 'up' ? inset : -inset));
      ctx.closePath();
    };
    ctx.fillStyle = C.tutorPaper; ctx.strokeStyle = C.tutorInk; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    arrowPath(0); ctx.fill(); ctx.stroke();
    // 本體: 淺紙色底 + 深墨框(和全畫面所有深色面板明暗相反)
    rr(ctx, -148.75, -34.75, 297.5, 69.5, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.tutorPaper; arrowPath(3); ctx.fill(); // 蓋掉箭頭與本體交界的框線
    // 原地呼吸的內框(不外擴、不放大)
    var br = 0.35 + 0.35 * Math.sin(now() * 3.2);
    ctx.globalAlpha = clamp(alpha, 0, 1) * br;
    ctx.strokeStyle = C.tutorAccent; ctx.lineWidth = 2;
    rr(ctx, -144, -30, 288, 60, 9); ctx.stroke();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    // 文字 + 按鍵列
    var ty0 = keys.length ? -14 : 0;
    txt(ctx, text, 0, ty0, { size: 17, color: C.tutorInk, maxW: 280 });
    if (keys.length) {
      var tot = 0, i;
      for (i = 0; i < keys.length; i++) tot += keyW(keys[i]) + (i ? 6 : 0);
      var kx = -tot / 2;
      for (i = 0; i < keys.length; i++) {
        var w = keyW(keys[i]);
        keyIcon(ctx, keys[i], kx + w / 2, 16, w, 26, pressed.indexOf(keys[i]) >= 0);
        kx += w + 6;
      }
    }
    // 完成: 紙色罩住內容 + 大綠勾
    if (dp >= 0) {
      var cq = Math.min(1, dp / 0.2);
      ctx.fillStyle = 'rgba(255,244,214,' + (0.75 * cq) + ')'; rr(ctx, -146, -32, 292, 64, 10); ctx.fill();
      ctx.fillStyle = C.tutorDone; ctx.beginPath(); ctx.arc(0, 0, 24 * (0.6 + 0.4 * cq), 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-10, 1); ctx.lineTo(-3, 9); ctx.lineTo(11, -8); ctx.stroke();
    }
    ctx.restore();
  }
  function slowMoRect(ctx, x, y, w, h, lx, ly, fs) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = 'rgba(128,128,128,0.7)'; ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(40,90,170,0.18)'; ctx.fillRect(x, y, w, h);
    var g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, 'rgba(0,10,30,0)'); g.addColorStop(1, 'rgba(0,10,30,0.55)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    var bw = Math.max(3, Math.min(w, h) * 0.012);
    ctx.strokeStyle = C.slowmo; ctx.globalAlpha = 0.85; ctx.lineWidth = bw;
    ctx.strokeRect(x + bw / 2 + 2, y + bw / 2 + 2, w - bw - 4, h - bw - 4);
    ctx.globalAlpha = 1;
    // 慢動作字樣 + 暫緩符號
    txt(ctx, '慢動作', lx + fs * 0.5, ly, { size: fs, color: '#dff2ff', stroke: '#0a1a30', sw: Math.max(2, fs * 0.16) });
    ctx.fillStyle = '#dff2ff';
    var gx = lx - fs * 1.4;
    ctx.beginPath(); ctx.moveTo(gx - fs * 0.45, ly - fs * 0.35); ctx.lineTo(gx, ly); ctx.lineTo(gx - fs * 0.45, ly + fs * 0.35); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(gx, ly - fs * 0.35); ctx.lineTo(gx + fs * 0.45, ly); ctx.lineTo(gx, ly + fs * 0.35); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawSlowMo(ctx) {
    ctx.save();
    slowMoRect(ctx, 0, 0, 1280, 720, 640, 80, 26);
    ctx.restore();
  }
  function shakeOff(age, dur) {
    var p = prog(age, dur); if (p < 0) return 0;
    return Math.sin(p * PI * 6) * 6 * (1 - p);
  }
  function popupCell(ctx, cx, cy, item, focused, mode) {
    // mode: 'slot' | 'hand'
    ctx.save();
    ctx.fillStyle = mode === 'hand' ? '#3a3326' : '#0f131c'; rr(ctx, cx - 20, cy - 20, 40, 40, 5); ctx.fill();
    ctx.strokeStyle = mode === 'hand' ? 'rgba(255,210,120,0.6)' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    rr(ctx, cx - 19.5, cy - 19.5, 39, 39, 5); ctx.stroke();
    if (typeof item === 'string' && item) itemIcon(ctx, item, cx, cy, 30);
    else if (mode !== 'hand') {
      ctx.strokeStyle = 'rgba(220,225,235,0.4)'; ctx.setLineDash([3, 3]);
      rr(ctx, cx - 13, cy - 13, 26, 26, 3); ctx.stroke(); ctx.setLineDash([]);
    }
    if (focused) {
      ctx.strokeStyle = C.cursor; ctx.lineWidth = 3;
      rr(ctx, cx - 22.5, cy - 22.5, 45, 45, 6); ctx.stroke();
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(now() * 8); ctx.fillStyle = C.cursor;
      rr(ctx, cx - 20, cy - 20, 40, 40, 5); ctx.fill();
    }
    ctx.restore();
  }
  function drawSoulPopup(ctx, s) {
    s = s || {};
    var slots = arr(s.slots).slice(0, 4);
    if (!slots.length) slots = [null];
    var replace = s.mode === 'replace';
    var w = clamp(num(s.w, slots.length * 48 + 120), 168, 312), h = num(s.h, 116) || 116;
    var x = num(s.x, 640) + shakeOff(s.shakeAge, num(s.shakeDuration, 0.25)), y = num(s.y, 360);
    var idx = Math.floor(num(s.index, 0));
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = replace ? '#2a2220' : C.panel; rr(ctx, -w / 2, -h / 2, w, h, 10); ctx.fill();
    ctx.strokeStyle = replace ? C.swap : '#4a5670'; ctx.lineWidth = replace ? 3 : 2;
    rr(ctx, -w / 2 + ctx.lineWidth / 2, -h / 2 + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, 9); ctx.stroke();
    // 標題上移 2px: 最窄 168 寬時避開右側「手上」小字
    txt(ctx, str(s.title), 0, -42, { size: 13, maxW: w - 24, color: replace ? '#ffd2b0' : C.text });
    for (var i = 0; i < slots.length; i++) popupCell(ctx, -w / 2 + 40 + 48 * i, -4, slots[i], i === idx, 'slot');
    // 分隔: take = 細線; replace = 橘色雙向互換箭頭
    var sx = w / 2 - 86;
    if (replace) {
      ctx.strokeStyle = C.swap; ctx.fillStyle = C.swap; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx - 6, -9); ctx.lineTo(sx + 6, -9); ctx.moveTo(sx - 6, 1); ctx.lineTo(sx + 6, 1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 9, -9); ctx.lineTo(sx + 4, -13); ctx.lineTo(sx + 4, -5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx - 9, 1); ctx.lineTo(sx - 4, -3); ctx.lineTo(sx - 4, 5); ctx.closePath(); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, -26); ctx.lineTo(sx, 18); ctx.stroke();
    }
    txt(ctx, '手上', w / 2 - 44, -29, { size: 10, color: '#ffd28a', weight: 'normal' });
    popupCell(ctx, w / 2 - 44, -4, replace ? s.hand : null, false, 'hand');
    // 底部
    var al = str(s.actionLabel);
    if (al) txt(ctx, al, -w / 2 + 14, 40, { size: 14, align: 'left', color: C.cursor });
    txt(ctx, 'Z 確定  X 關閉', w / 2 - 12, 40, { size: 11, align: 'right', color: C.textDim, weight: 'normal' });
    ctx.restore();
  }
  function lockGlyph(ctx, cx, cy, s) {
    ctx.strokeStyle = '#9aa0ae'; ctx.lineWidth = s * 0.16;
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.15, s * 0.3, PI, 0); ctx.stroke();
    ctx.fillStyle = '#9aa0ae'; rr(ctx, cx - s * 0.45, cy - s * 0.15, s * 0.9, s * 0.65, s * 0.1); ctx.fill();
    ctx.fillStyle = '#2a2f3a'; ctx.beginPath(); ctx.arc(cx, cy + s * 0.12, s * 0.09, 0, TAU); ctx.fill();
  }
  function shopCell(ctx, cx, cy, it, focused) {
    it = it || {};
    var st = ({ ok: 1, poor: 1, locked: 1 }[it.state]) ? it.state : 'ok';
    ctx.save();
    ctx.fillStyle = focused ? '#323c52' : '#151a26'; rr(ctx, cx - 40, cy - 36, 80, 72, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; rr(ctx, cx - 39.5, cy - 35.5, 79, 71, 6); ctx.stroke();
    if (st === 'locked') {
      lockGlyph(ctx, cx, cy - 12, 30);
      txt(ctx, '???', cx, cy + 12, { size: 12, color: '#6a7080' });
    } else {
      ctx.globalAlpha = st === 'poor' ? 0.4 : 1;
      itemIcon(ctx, it.item, cx, cy - 14, 30);
      txt(ctx, str(it.name), cx, cy + 10, { size: 12, color: C.text, maxW: 74 });
      ctx.globalAlpha = 1;
    }
    var price = Math.floor(num(it.price, 0));
    coinGlyph(ctx, cx - 12, cy + 26, 5);
    txt(ctx, String(price), cx - 4, cy + 26.5, { size: 13, align: 'left', color: st === 'poor' ? '#ff6a5a' : st === 'locked' ? '#6a7080' : C.gold });
    if (focused) {
      ctx.strokeStyle = C.cursor; ctx.lineWidth = 3; rr(ctx, cx - 42.5, cy - 38.5, 85, 77, 8); ctx.stroke();
    }
    ctx.restore();
  }
  function drawShopPopup(ctx, s) {
    s = s || {};
    var items = arr(s.items).slice(0, 8), cur = Math.floor(num(s.cursorIndex, 0));
    var x = 640 + shakeOff(s.shakeAge, num(s.shakeDuration, 0.25)), y = 400;
    ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = C.panel; rr(ctx, -380, -75, 760, 150, 12); ctx.fill();
    ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 2; rr(ctx, -379, -74, 758, 148, 11); ctx.stroke();
    txt(ctx, '商店', 0, -60, { size: 15, color: '#ffd28a' });
    for (var i = 0; i < 8; i++) shopCell(ctx, -308 + 88 * i, -4, items[i] || { state: 'locked' }, i === cur);
    var msg = str(s.message);
    if (msg) txt(ctx, msg, -366, 58, { size: 13, align: 'left', color: '#ff7a6a' });
    txt(ctx, '← → 選   Z 購買   X 關閉', 366, 58, { size: 12, align: 'right', color: C.textDim, weight: 'normal' });
    ctx.restore();
  }
  // ---------- 結算畫面 ----------
  function button(ctx, cx, cy, w, h, label, focused) {
    ctx.save();
    if (focused) {
      ctx.fillStyle = 'rgba(255,210,74,0.25)'; rr(ctx, cx - w / 2 - 5, cy - h / 2 - 5, w + 10, h + 10, 12); ctx.fill();
    }
    ctx.fillStyle = focused ? C.gold : '#2a3244'; rr(ctx, cx - w / 2, cy - h / 2, w, h, 9); ctx.fill();
    ctx.strokeStyle = focused ? '#fff2b0' : '#4a5670'; ctx.lineWidth = focused ? 3 : 1.5;
    rr(ctx, cx - w / 2 + ctx.lineWidth / 2, cy - h / 2 + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, 8); ctx.stroke();
    txt(ctx, label, cx, cy + 1, { size: 20, color: focused ? '#1e1606' : C.text, maxW: w - 16 });
    ctx.restore();
  }
  function drawResult(ctx, s) {
    s = s || {};
    var win = bool(s.win), all = win && bool(s.allClear);
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,18,0.72)'; ctx.fillRect(0, 0, 1280, 720);
    // 面板 (640,370) 680×440
    ctx.fillStyle = C.panel; rr(ctx, 300, 150, 680, 440, 18); ctx.fill();
    ctx.strokeStyle = win ? C.gold : '#ff5a5a'; ctx.lineWidth = 3; rr(ctx, 301.5, 151.5, 677, 437, 17); ctx.stroke();
    var title = all ? '全部通關!' : win ? '勝利' : '主堡被攻陷';
    txt(ctx, title, 640, 200, { size: 44, color: win ? C.gold : '#ff6a6a', stroke: '#000', sw: 4 });
    var lv = clamp(Math.floor(num(s.level, 1)), 1, 5);
    txt(ctx, '第 ' + lv + ' 關  ' + str(s.levelName), 640, 245, { size: 20, color: C.textDim, maxW: 600 });
    // 星星: 第 k 顆在 starAge ≥ 0.4k 跳出(彈到 1.3 倍再回 1)
    var stars = win ? clamp(Math.floor(num(s.stars, 0)), 0, 3) : 0;
    var sd = num(s.starDuration, 1.2) || 1.2, sa = num(s.starAge, sd);
    for (var k = 0; k < 3; k++) {
      var cx = 560 + 80 * k;
      var lit = k < stars && sa >= 0.4 * k;
      var sc = 1;
      if (lit && sa < sd) {
        var q = (sa - 0.4 * k) / 0.3;
        if (q < 1) sc = q < 0.5 ? 1 + 0.6 * q : 1.3 - 0.6 * (q - 0.5);
      }
      ctx.save(); ctx.translate(cx, 310); ctx.scale(sc, sc);
      bigStar(ctx, 0, 0, 27, lit);
      ctx.restore();
    }
    var w = Math.max(0, Math.floor(num(s.wave, 0))), tw = Math.max(1, Math.floor(num(s.totalWaves, 4)));
    var hp = Math.max(0, Math.ceil(num(s.castleHp, 0))), mhp = Math.max(1, Math.floor(num(s.castleMaxHp, 20)));
    txt(ctx, '第 ' + w + ' / ' + tw + ' 波     主堡 ' + hp + ' / ' + mhp, 640, 380, { size: 22, maxW: 620 });
    var cc = clamp(Math.floor(num(s.comboCount, 0)), 0, 5);
    txt(ctx, '發現組合 ' + cc + ' / 5', 640, 415, { size: 22, color: '#ffd28a' });
    // 按鈕一排 y = 510, 170×50, 間距 20
    var opts = arr(s.options).slice(0, 3).map(str);
    if (!opts.length) opts = ['重來', '標題'];
    var cur = Math.floor(num(s.cursorIndex, 0));
    var bx0 = 640 - ((opts.length - 1) * 190) / 2;
    for (var i = 0; i < opts.length; i++) button(ctx, bx0 + 190 * i, 510, 170, 50, opts[i], i === cur);
    txt(ctx, '← → 選   Z 確定', 640, 560, { size: 14, color: C.textDim, weight: 'normal' });
    ctx.restore();
  }

  // ---------- 開始畫面 ----------
  var TITLE_PATHS = [[[0, 146], [720, 146], [720, 434], [1180, 434]], [[0, 434], [1180, 434]], [[0, 674], [720, 674], [720, 434], [1180, 434]]];
  function levelCard(ctx, i, lv, selected) {
    lv = lv || {};
    var unlocked = lv.unlocked === true;
    var cx = 640 + (i - 2) * 220, cy = 400;
    ctx.save(); ctx.translate(cx, cy);
    if (selected) ctx.scale(1.06, 1.06);
    if (selected) {
      ctx.save(); ctx.shadowColor = 'rgba(255,210,74,0.9)'; ctx.shadowBlur = 16;
      ctx.fillStyle = '#243247'; rr(ctx, -100, -75, 200, 150, 12); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = selected ? '#243247' : unlocked ? '#1b2433' : '#11151d'; rr(ctx, -100, -75, 200, 150, 12); ctx.fill();
    ctx.strokeStyle = selected ? C.gold : unlocked ? '#4a5670' : '#262b36'; ctx.lineWidth = selected ? 4 : 2;
    rr(ctx, -100 + ctx.lineWidth / 2, -75 + ctx.lineWidth / 2, 200 - ctx.lineWidth, 150 - ctx.lineWidth, 11); ctx.stroke();
    txt(ctx, '第 ' + (i + 1) + ' 關', 0, -50, { size: 15, color: unlocked ? C.textDim : '#4a5060', weight: 'normal' });
    if (unlocked) {
      txt(ctx, str(lv.name), 0, -8, { size: 30, color: selected ? '#ffffff' : '#dfe4ee', maxW: 180 });
      var bs = clamp(Math.floor(num(lv.bestStars, 0)), 0, 3);
      for (var k = 0; k < 3; k++) bigStar(ctx, -36 + 36 * k, 42, 14, k < bs);
    } else {
      lockGlyph(ctx, 0, -6, 44);
      txt(ctx, str(lv.name), 0, 44, { size: 15, color: '#4a5060', maxW: 180 });
    }
    ctx.restore();
  }
  function drawTitle(ctx, s) {
    s = s || {};
    var t = num(s.blinkTime, 0);
    ctx.save();
    grassAndGrid(ctx);
    roads(ctx, TITLE_PATHS);
    ctx.fillStyle = 'rgba(8,12,20,0.55)'; ctx.fillRect(0, 0, 1280, 720);
    // 兩側裝飾: 遊戲內的魂柱(合法狀態: 裝著遠攻 / 冰霜)
    ctx.save(); ctx.translate(372, 170); ctx.scale(1.6, 1.6); pillarBody(ctx, ['ranged']); ctx.restore();
    ctx.save(); ctx.translate(908, 170); ctx.scale(1.6, 1.6); pillarBody(ctx, ['frost']); ctx.restore();
    // 大標題
    var wob = Math.sin(t * 1.6) * 2;
    txt(ctx, '魂匠守衛者', 640, 170 + wob, { size: 76, color: C.gold, stroke: '#2a1a00', sw: 8 });
    // 關卡卡片(選中的最後畫, 放大後疊在最上)
    var lvls = arr(s.levels);
    var cur = Math.floor(num(s.cursorIndex, 0));
    for (var i = 0; i < 5; i++) if (i !== cur) levelCard(ctx, i, lvls[i], false);
    if (cur >= 0 && cur < 5) levelCard(ctx, cur, lvls[cur], true);
    // 底部提示(Z 開始 閃爍)
    var segs = [['← → 選關', 1], ['Z 開始', 0.55 + 0.45 * Math.cos(t * 5)], ['X 靜音', 1]];
    ctx.font = 'bold 22px ' + FONT;
    var gap = 40, total = 0, j;
    for (j = 0; j < segs.length; j++) total += ctx.measureText(segs[j][0]).width + (j ? gap : 0);
    var hx = 640 - total / 2;
    for (j = 0; j < segs.length; j++) {
      var sw = ctx.measureText(segs[j][0]).width;
      ctx.globalAlpha = segs[j][1];
      txt(ctx, segs[j][0], hx + sw / 2, 650, { size: 22, color: j === 1 ? '#ffffff' : C.textDim, stroke: 'rgba(0,0,0,0.6)', sw: 3 });
      ctx.globalAlpha = 1;
      hx += sw + gap;
    }
    speaker(ctx, 1230, 40, 36, bool(s.muted));
    ctx.restore();
  }

  window.Art = {
    canvas: { width: 1280, height: 720 },
    palette: C,
    drawTitle: drawTitle,
    drawBackground: drawBackground,
    drawPillarRange: drawPillarRange,
    drawResonanceLine: drawResonanceLine,
    drawCastle: drawCastle,
    drawCrossbow: drawCrossbow,
    drawPillar: drawPillar,
    drawSoldier: drawSoldier,
    drawGolem: drawGolem,
    drawUnitBreak: drawUnitBreak,
    drawEnemy: drawEnemy,
    drawCorpse: drawCorpse,
    drawGroundPart: drawGroundPart,
    drawCoin: drawCoin,
    drawPlayer: drawPlayer,
    drawActionHint: drawActionHint,
    drawPlacePreview: drawPlacePreview,
    drawSoulSlots: drawSoulSlots,
    drawFrostAura: drawFrostAura,
    drawProjectile: drawProjectile,
    drawPierceBeam: drawPierceBeam,
    drawAreaHit: drawAreaHit,
    drawHitSpark: drawHitSpark,
    drawStealLink: drawStealLink,
    drawComboName: drawComboName,
    drawSpawnWarning: drawSpawnWarning,
    drawTutorial: drawTutorial,
    drawHud: drawHud,
    drawSlowMo: drawSlowMo,
    drawSoulPopup: drawSoulPopup,
    drawShopPopup: drawShopPopup,
    drawResult: drawResult
  };
})();
