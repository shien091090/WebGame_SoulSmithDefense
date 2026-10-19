// 魂匠共鳴 — 美術(Canvas 2D 幾何繪製, 無外部資源)
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
    allyShot: '#fff3b0', enemyShot: '#ff4d7a', slowmo: '#9fd4ff', forge: '#ff8a2a',
    ranged: '#f2c94c', melee: '#ef5350', frost: '#8fd8ff', seek: '#6ad05a', march: '#a77bff', drum: '#e57ad0',
    slotStone: '#b9c3d6', combo: '#ffd24a'
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
      for (var i = 0; i < 8; i++) {
        var a = i * PI / 4;
        ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, -11 + Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * 15, -11 + Math.sin(a) * 6.5); ctx.stroke();
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
  var ROUTE_N = [[-10, 194], [720, 194], [720, 434]];
  var ROUTE_S = [[-10, 626], [720, 626], [720, 434]];
  var ROUTE_M = [[720, 434], [1124, 434]];
  function strokeRoute(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
  function drawBackground(ctx) {
    ctx.save();
    ctx.fillStyle = C.grass; ctx.fillRect(0, 0, 1280, 720);
    // 草地斑點
    ctx.fillStyle = C.grassDark;
    for (var i = 0; i < 60; i++) {
      var gx = (i * 211) % 1280, gy = 60 + (i * 137) % 650;
      ctx.beginPath(); ctx.ellipse(gx, gy, 18, 8, 0, 0, TAU); ctx.fill();
    }
    // 蓋塔格線
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (var c = 0; c <= 27; c++) { ctx.moveTo(c * 48 + 0.5, 50); ctx.lineTo(c * 48 + 0.5, 50 + 14 * 48); }
    for (var r = 0; r <= 14; r++) { ctx.moveTo(0, 50 + r * 48 + 0.5); ctx.lineTo(1296, 50 + r * 48 + 0.5); }
    ctx.stroke();
    // 路線
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    ctx.strokeStyle = C.pathEdge; ctx.lineWidth = 56;
    strokeRoute(ctx, ROUTE_N); strokeRoute(ctx, ROUTE_S); strokeRoute(ctx, ROUTE_M);
    ctx.strokeStyle = C.path; ctx.lineWidth = 50;
    strokeRoute(ctx, ROUTE_N); strokeRoute(ctx, ROUTE_S); strokeRoute(ctx, ROUTE_M);
    ctx.strokeStyle = C.pathLight; ctx.lineWidth = 2; ctx.setLineDash([10, 14]);
    strokeRoute(ctx, ROUTE_N); strokeRoute(ctx, ROUTE_S); strokeRoute(ctx, ROUTE_M);
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
    if (zone) keycap(ctx, '空白鍵', x + 70, y - 88, { size: 11 });
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
    // 魂爐爐口
    ctx.fillStyle = '#2a1c14';
    ctx.beginPath(); ctx.moveTo(-17, 50); ctx.lineTo(-17, 26); ctx.arc(0, 26, 17, PI, 0); ctx.lineTo(17, 50); ctx.closePath(); ctx.fill();
    var fl = 0.75 + 0.25 * Math.sin(now() * 6);
    var g = ctx.createRadialGradient(0, 40, 2, 0, 36, 18);
    g.addColorStop(0, '#fff2a0'); g.addColorStop(0.5, C.forge); g.addColorStop(1, 'rgba(255,90,20,0.2)');
    ctx.globalAlpha = fl; ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-13, 50); ctx.lineTo(-13, 28); ctx.arc(0, 28, 13, PI, 0); ctx.lineTo(13, 50); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#c9a050'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-17, 50); ctx.lineTo(-17, 26); ctx.arc(0, 26, 17, PI, 0); ctx.lineTo(17, 50); ctx.stroke();
    if (ph >= 0) {
      ctx.globalAlpha = 0.55 * (1 - ph); ctx.fillStyle = '#ff3a3a';
      ctx.fillRect(-51, -56, 102, 108);
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
  function mobile(ctx, s, S, bodyFn) {
    var x = num(s.x, 0), y = num(s.y, 0), hs = S / 2;
    var downDur = num(s.downDuration, 5) || 5, downAge = num(s.downAge, downDur);
    var down = downAge >= 0 && downAge < downDur;
    ctx.save(); ctx.translate(x, y);
    if (down) {
      ctx.save(); ctx.translate(0, hs * 0.3); ctx.rotate(PI / 2); ctx.scale(0.62, 0.86);
      ctx.globalAlpha = 0.75; bodyFn(true); ctx.restore();
      // 剩餘時間圓餅
      var rem = clamp(1 - downAge / downDur, 0, 1), pr = Math.max(5, S * 0.2), py = -hs + pr + 1;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(0, py, pr, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, py); ctx.arc(0, py, pr - 1.5, -PI / 2, -PI / 2 + TAU * rem); ctx.closePath(); ctx.fill();
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
    if (!down && hp < mh) { ctx.save(); hpBar(ctx, x, y - hs - 6, S, hp, mh); ctx.restore(); }
    if (bool(s.targeted)) targetFrame(ctx, x, y, S, S);
  }
  function drawSoldier(ctx, s) {
    s = s || {};
    mobile(ctx, s, 32, function (down) {
      if (down) soldierBody(ctx, '#7c8798', '#4a5262', '#b8c0cc');
      else soldierBody(ctx, C.ally, C.allyDark, C.allyRim);
    });
  }
  function drawGolem(ctx, s) {
    s = s || {};
    var team = s.team === 'ally' ? 'ally' : 'neutral';
    if (team === 'neutral') {
      s = { x: s.x, y: s.y, hp: 1, maxHp: 1, hitAge: s.hitAge, hitDuration: s.hitDuration, attackAge: s.attackAge, attackDuration: s.attackDuration, moving: s.moving, charging: false, resonating: false, downAge: 5, downDuration: 5, targeted: s.targeted };
    }
    mobile(ctx, s, 56, function () { golemBody(ctx, team); });
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
    if (!moving) txt(ctx, '?', 0, -hs + 9, { size: 14, color: '#ffe14a', stroke: '#1a0a10', sw: 3 });
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
    var pa = prog(s.attackAge, num(s.attackDuration, 0.15));
    var dy = pa >= 0 ? -3 * Math.sin(pa * PI) : 0;
    var bob = bool(s.moving) ? -Math.abs(Math.sin(now() * 10)) * 1.5 : 0;
    ctx.save(); ctx.translate(0, dy + bob);
    // 影
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 13, 10, 2.5, 0, 0, TAU); ctx.fill();
    playerBody(ctx);
    if (pa >= 0) {
      ctx.globalAlpha = 1 - pa; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 1, 13.5, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (bool(s.resonating)) {
      var t = 0.6 + 0.4 * Math.sin(now() * 5);
      ctx.globalAlpha = 0.9 * t; ctx.strokeStyle = C.resonance; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 14.75, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // 手上物品: 捧在右側
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
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(3, 0); ctx.stroke();
      ctx.strokeStyle = ice ? C.frost : C.allyShot; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(3, 0); ctx.stroke();
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
      var r2 = Math.max(2, (R - 2) * (0.4 + 0.6 * p));
      ctx.globalAlpha = fade; ctx.strokeStyle = C.drum; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r2, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      for (var k = 0; k < 6; k++) {
        var b = k * TAU / 6;
        ctx.beginPath(); ctx.moveTo(Math.cos(b) * r2 * 0.35, Math.sin(b) * r2 * 0.35); ctx.lineTo(Math.cos(b) * r2 * 0.8, Math.sin(b) * r2 * 0.8); ctx.stroke();
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
    // 朝右箭頭
    ctx.fillStyle = '#ffd0a0';
    ctx.beginPath(); ctx.moveTo(31, 0); ctx.lineTo(23, -7); ctx.lineTo(23, 7); ctx.closePath(); ctx.fill();
    txt(ctx, String(sec), -1, 1, { size: 20, color: '#ffffff', stroke: '#2a0000', sw: 3 });
    ctx.restore();
  }

  // ---------- HUD / UI ----------
  function goldChip(ctx, x, y, gold) {
    coinGlyph(ctx, x + 9, y, 8);
    txt(ctx, String(gold), x + 22, y + 1, { size: 20, align: 'left', color: C.gold });
  }
  function drawHud(ctx, s) {
    s = s || {};
    ctx.save();
    ctx.fillStyle = C.hud; ctx.fillRect(0, 0, 1280, 50);
    ctx.fillStyle = '#2c3446'; ctx.fillRect(0, 48, 1280, 2);
    var gold = Math.max(0, Math.floor(num(s.gold, 0)));
    goldChip(ctx, 14, 25, gold);
    // 主堡生命
    var hp = Math.max(0, Math.ceil(num(s.castleHp, 0))), mhp = Math.max(1, num(s.castleMaxHp, 20));
    var cx = 140;
    txt(ctx, '主堡', cx, 25, { size: 12, align: 'left', color: C.textDim, weight: 'normal' });
    ctx.fillStyle = '#ff5a6a';
    ctx.beginPath(); ctx.moveTo(cx + 44, 31); ctx.bezierCurveTo(cx + 30, 22, cx + 34, 13, cx + 44, 19); ctx.bezierCurveTo(cx + 54, 13, cx + 58, 22, cx + 44, 31); ctx.fill();
    txt(ctx, hp + ' / ' + mhp, cx + 62, 26, { size: 20, align: 'left', color: hp <= mhp * 0.3 ? '#ff6a6a' : C.text });
    // 波次
    var wave = Math.max(0, Math.floor(num(s.wave, 0))), tw = Math.max(1, Math.floor(num(s.totalWaves, 6)));
    txt(ctx, '波次', 300, 25, { size: 12, align: 'left', color: C.textDim, weight: 'normal' });
    txt(ctx, wave + ' / ' + tw, 332, 26, { size: 20, align: 'left' });
    var nw = num(s.nextWaveIn, -1);
    if (nw >= 0) {
      var ns = Math.ceil(nw);
      txt(ctx, '下一波', 420, 25, { size: 12, align: 'left', color: C.textDim, weight: 'normal' });
      txt(ctx, ns + ' 秒', 462, 26, { size: 20, align: 'left', color: ns <= 6 ? '#ff8a5a' : C.text });
    }
    // 魂爐
    var forge = arr(s.forge);
    ctx.fillStyle = '#222a3a'; rr(ctx, 640, 6, 330, 38, 6); ctx.fill();
    ctx.fillStyle = C.forge; ctx.beginPath(); ctx.arc(660, 25, 7, PI, 0); ctx.lineTo(667, 31); ctx.lineTo(653, 31); ctx.closePath(); ctx.fill();
    txt(ctx, '魂爐', 674, 25, { size: 14, align: 'left', color: '#ffc080' });
    for (var i = 0; i < 5; i++) {
      var fx = 732 + i * 32;
      ctx.fillStyle = 'rgba(8,10,16,0.9)'; rr(ctx, fx - 14, 11, 28, 28, 4); ctx.fill();
      if (forge[i] === true) itemIcon(ctx, FORGE_ORDER[i], fx, 25, 24);
      else { ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); rr(ctx, fx - 12.5, 12.5, 25, 25, 3); ctx.stroke(); ctx.setLineDash([]); }
    }
    txt(ctx, '每波開始送出', 892, 25, { size: 12, align: 'left', color: C.textDim, weight: 'normal' });
    // 操作提示
    txt(ctx, 'Z 互動   X 自己   空白鍵 商店', 1266, 25, { size: 13, align: 'right', color: C.textDim, weight: 'normal' });
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
    // mode: 'slot' | 'drop' | 'hand'
    ctx.save();
    if (mode === 'drop') {
      ctx.fillStyle = '#3a2420'; rr(ctx, cx - 20, cy - 20, 40, 40, 5); ctx.fill();
      ctx.strokeStyle = '#c88a70'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      rr(ctx, cx - 19, cy - 19, 38, 38, 5); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#f0c0a8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 5, cy - 7); ctx.lineTo(cx, cy - 2); ctx.lineTo(cx + 5, cy - 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 10, cy + 1); ctx.lineTo(cx + 10, cy + 1); ctx.stroke();
      txt(ctx, '丟下', cx, cy + 11, { size: 11, color: '#f0c0a8' });
    } else {
      ctx.fillStyle = mode === 'hand' ? '#3a3326' : '#0f131c'; rr(ctx, cx - 20, cy - 20, 40, 40, 5); ctx.fill();
      ctx.strokeStyle = mode === 'hand' ? 'rgba(255,210,120,0.6)' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
      rr(ctx, cx - 19.5, cy - 19.5, 39, 39, 5); ctx.stroke();
      if (typeof item === 'string' && item) itemIcon(ctx, item, cx, cy, 30);
      else if (mode !== 'hand') {
        ctx.strokeStyle = 'rgba(220,225,235,0.4)'; ctx.setLineDash([3, 3]);
        rr(ctx, cx - 13, cy - 13, 26, 26, 3); ctx.stroke(); ctx.setLineDash([]);
      }
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
    var slots = arr(s.slots).slice(0, 4), drop = bool(s.dropCell);
    var nCells = Math.max(1, slots.length + (drop ? 1 : 0));
    var w = clamp(num(s.w, nCells * 48 + 120), 168, 312), h = num(s.h, 116) || 116;
    var x = num(s.x, 640) + shakeOff(s.shakeAge, num(s.shakeDuration, 0.25)), y = num(s.y, 360);
    var idx = Math.floor(num(s.index, 0));
    ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = C.panel; rr(ctx, -w / 2, -h / 2, w, h, 10); ctx.fill();
    ctx.strokeStyle = '#4a5670'; ctx.lineWidth = 2; rr(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 9); ctx.stroke();
    txt(ctx, str(s.title), 0, -40, { size: 13, maxW: w - 24 });
    for (var i = 0; i < nCells; i++) {
      var cx = -w / 2 + 40 + 48 * i;
      if (i < slots.length) popupCell(ctx, cx, -4, slots[i], i === idx, 'slot');
      else popupCell(ctx, cx, -4, null, i === idx, 'drop');
    }
    // 分隔線 + 手上
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w / 2 - 86, -26); ctx.lineTo(w / 2 - 86, 18); ctx.stroke();
    txt(ctx, '手上', w / 2 - 44, -29, { size: 10, color: '#ffd28a', weight: 'normal' });
    popupCell(ctx, w / 2 - 44, -4, s.hand, false, 'hand');
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
  function drawResult(ctx, s) {
    s = s || {};
    var win = bool(s.win);
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,18,0.72)'; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = C.panel; rr(ctx, 400, 200, 480, 320, 16); ctx.fill();
    ctx.strokeStyle = win ? C.gold : '#ff5a5a'; ctx.lineWidth = 3; rr(ctx, 401.5, 201.5, 477, 317, 15); ctx.stroke();
    txt(ctx, win ? '勝利' : '主堡被攻陷', 640, 270, { size: 48, color: win ? C.gold : '#ff6a6a', stroke: '#000', sw: 4 });
    var w = Math.max(0, Math.floor(num(s.wave, 0))), tw = Math.max(1, Math.floor(num(s.totalWaves, 6)));
    txt(ctx, '第 ' + w + ' / ' + tw + ' 波', 640, 345, { size: 24 });
    var cc = clamp(Math.floor(num(s.comboCount, 0)), 0, 5);
    txt(ctx, '發現組合 ' + cc + ' / 5', 640, 395, { size: 24, color: '#ffd28a' });
    txt(ctx, '按 Z 重新開始', 640, 470, { size: 18, color: C.textDim });
    ctx.restore();
  }

  // ---------- 說明頁示意圖 ----------
  var GUIDE_SIZE = [[480, 270], [400, 240], [560, 300], [560, 260], [560, 280], [600, 320], [600, 320], [480, 270]];
  function grassPanel(ctx, x, y, w, h) {
    ctx.fillStyle = C.grass; rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8); ctx.stroke();
  }
  function clipRect(ctx, x, y, w, h) { ctx.beginPath(); rr(ctx, x, y, w, h, 8); ctx.clip(); }
  function tag(ctx, s, x, y, size) {
    txt(ctx, s, x, y, { size: size || 12, color: '#ffffff', stroke: 'rgba(0,0,0,0.75)', sw: 3 });
  }
  function at(ctx, x, y, k, fn) { ctx.save(); ctx.translate(x, y); ctx.scale(k, k); fn(); ctx.restore(); }
  function pathBand(ctx, pts, w) {
    ctx.save(); ctx.lineJoin = 'round';
    ctx.strokeStyle = C.pathEdge; ctx.lineWidth = w; strokeRoute(ctx, pts);
    ctx.strokeStyle = C.path; ctx.lineWidth = w - 6; strokeRoute(ctx, pts);
    ctx.restore();
  }
  var IDLE = { attackAge: 1, attackDuration: 0.15, hitAge: 1, hitDuration: 0.2, downAge: 5, downDuration: 5 };
  function mix(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function imp(x, y, extra) { return mix(IDLE, mix({ type: 'imp', x: x, y: y, hp: 40, maxHp: 40, moving: true, slowed: false, targeted: false }, extra || {})); }

  function page0(ctx) { // 守住主堡: Y 型全景
    var k = 480 / 1280;
    ctx.save(); clipRect(ctx, 0, 0, 480, 270); ctx.scale(k, k);
    drawBackground(ctx);
    var E = 1.6; // 單位誇大倍率(只放大本體, 不動位置)
    var big = function (x, y, fn) { ctx.save(); ctx.translate(x, y); ctx.scale(E, E); ctx.translate(-x, -y); fn(); ctx.restore(); };
    big(1180, 434, function () { drawCastle(ctx, mix(IDLE, { x: 1180, y: 434, hitAge: 1, hitDuration: 0.3, zoneActive: false, targeted: false })); });
    [120, 220, 320, 420, 540].forEach(function (ix) { big(ix, 194, function () { drawEnemy(ctx, imp(ix, 194)); }); });
    big(560, 626, function () { drawEnemy(ctx, imp(560, 626)); });
    big(456, 266, function () { drawCrossbow(ctx, mix(IDLE, { x: 456, y: 266, attackAge: 0.07, moving: false, resonating: false, targeted: false })); });
    big(456, 554, function () { drawCrossbow(ctx, mix(IDLE, { x: 456, y: 554, attackAge: 0.07, moving: false, resonating: false, targeted: false })); });
    big(502, 228, function () { drawProjectile(ctx, { x: 502, y: 228, angle: Math.atan2(-72, 84), kind: 'normal', owner: 'ally' }); });
    big(510, 590, function () { drawProjectile(ctx, { x: 510, y: 590, angle: Math.atan2(72, 104), kind: 'normal', owner: 'ally' }); });
    big(40, 626, function () { drawSpawnWarning(ctx, { x: 40, y: 626, remaining: 3.4, total: 6 }); });
    tag(ctx, '入口', 60, 120, 34); tag(ctx, '入口', 60, 700, 34);
    tag(ctx, '匯流', 720, 520, 30);
    tag(ctx, '主堡', 1180, 600, 34);
    ctx.restore();
  }
  function page1(ctx) { // 移動與撿錢
    grassPanel(ctx, 0, 0, 400, 240);
    ctx.save(); clipRect(ctx, 0, 0, 400, 240);
    drawCorpse(ctx, { kind: 'imp', x: 110, y: 150, life: 12, maxLife: 15, targeted: false });
    drawCoin(ctx, { x: 140, y: 175 }); drawCoin(ctx, { x: 86, y: 178 });
    // 被吸過來的金幣 + 軌跡
    ctx.strokeStyle = 'rgba(255,220,90,0.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.moveTo(150, 138); ctx.lineTo(205, 140); ctx.stroke(); ctx.setLineDash([]);
    drawCoin(ctx, { x: 212, y: 140 });
    drawPlayer(ctx, mix(IDLE, { x: 250, y: 142, moving: true, resonating: false, handItem: null, stealing: false, stealProgress: 0 }));
    drawSoulSlots(ctx, { x: 250, y: 106, slots: ['melee', null, null], virtual: [] });
    keycap(ctx, '↑', 340, 120, { size: 13 }); keycap(ctx, '←', 316, 146, { size: 13 }); keycap(ctx, '↓', 340, 146, { size: 13 }); keycap(ctx, '→', 364, 146, { size: 13 });
    // 迷你金幣讀數(同 HUD)
    ctx.fillStyle = C.hud; rr(ctx, 12, 12, 104, 34, 6); ctx.fill();
    goldChip(ctx, 18, 29, 14);
    txt(ctx, '+2', 98, 29, { size: 14, color: C.valid });
    tag(ctx, '你', 250, 176, 12);
    ctx.restore();
  }
  function page2(ctx) { // 拿魂件
    // 左: 慢動作中的彈窗
    grassPanel(ctx, 0, 0, 330, 300);
    ctx.save(); clipRect(ctx, 0, 0, 330, 300);
    pathBand(ctx, [[-10, 275], [340, 275]], 56);
    drawCrossbow(ctx, mix(IDLE, { x: 110, y: 205, moving: false, resonating: false, targeted: true }));
    drawPlayer(ctx, mix(IDLE, { x: 168, y: 212, moving: false, resonating: false, handItem: null, stealing: false, stealProgress: 0 }));
    drawSoulSlots(ctx, { x: 110, y: 161, slots: ['ranged', null], virtual: [] });
    drawSoulSlots(ctx, { x: 168, y: 176, slots: ['melee', null, null], virtual: [] });
    slowMoRect(ctx, 0, 0, 330, 300, 165, 14, 13);
    drawSoulPopup(ctx, { x: 170, y: 86, w: 216, h: 116, title: '弩塔', slots: ['ranged', null], dropCell: false, index: 0, hand: null, actionLabel: '拿起', shakeAge: 1, shakeDuration: 0.25 });
    keycap(ctx, '← →', 36, 82, { size: 12 });
    ctx.restore();
    // 右上: 拿起後
    grassPanel(ctx, 340, 0, 220, 140);
    ctx.save(); clipRect(ctx, 340, 0, 220, 140);
    tag(ctx, '拿起後', 450, 14, 12);
    drawCrossbow(ctx, mix(IDLE, { x: 392, y: 98, moving: false, resonating: false, targeted: false }));
    drawSoulSlots(ctx, { x: 392, y: 54, slots: [null, null], virtual: [] });
    drawPlayer(ctx, mix(IDLE, { x: 466, y: 104, moving: false, resonating: false, handItem: 'ranged', stealing: false, stealProgress: 0 }));
    drawSoulSlots(ctx, { x: 466, y: 68, slots: ['melee', null, null], virtual: [] });
    ctx.restore();
    // 右下: 屍體與活鬼
    grassPanel(ctx, 340, 150, 220, 150);
    ctx.save(); clipRect(ctx, 340, 150, 220, 150);
    drawCorpse(ctx, { kind: 'imp', x: 378, y: 252, life: 10, maxLife: 15, targeted: false });
    drawSoulSlots(ctx, { x: 378, y: 224, slots: ['melee', 'march'], virtual: [] });
    drawEnemy(ctx, imp(522, 246, { targeted: true }));
    drawSoulSlots(ctx, { x: 522, y: 210, slots: ['melee', 'march'], virtual: [] });
    drawPlayer(ctx, mix(IDLE, { x: 462, y: 268, moving: false, resonating: false, handItem: null, stealing: true, stealProgress: 0.6 }));
    drawStealLink(ctx, { x1: 462, y1: 268, x2: 512, y2: 210, progress: 0.6 });
    tag(ctx, '屍體', 378, 288, 12); tag(ctx, '活鬼(撐住)', 512, 288, 12);
    ctx.restore();
  }
  function swapPanel(ctx, ox, popup, before, after) {
    grassPanel(ctx, ox, 0, 275, 260);
    ctx.save(); clipRect(ctx, ox, 0, 275, 260);
    // 上: 彈窗(慢動作中)
    ctx.fillStyle = 'rgba(40,90,170,0.18)'; ctx.fillRect(ox, 0, 275, 120);
    at(ctx, ox + 137, 62, 0.85, function () { drawSoulPopup(ctx, popup); });
    // 下: 前 → 後
    at(ctx, ox, 128, 0.8, function () {
      before(); arrowLine(ctx, 150, 100, 186, 100, '#ffffff', 3); after();
    });
    ctx.restore();
  }
  function page3(ctx) { // 裝上與互換
    var cb = function (x, y, slots) {
      drawCrossbow(ctx, mix(IDLE, { x: x, y: y, moving: false, resonating: false, targeted: false }));
      drawSoulSlots(ctx, { x: x, y: y - 44, slots: slots, virtual: [] });
    };
    var pl = function (x, y, hand) {
      drawPlayer(ctx, mix(IDLE, { x: x, y: y, moving: false, resonating: false, handItem: hand, stealing: false, stealProgress: 0 }));
      drawSoulSlots(ctx, { x: x, y: y - 36, slots: ['melee', null, null], virtual: [] });
    };
    swapPanel(ctx, 0,
      { x: 0, y: 0, w: 216, h: 116, title: '弩塔', slots: ['ranged', null], dropCell: false, index: 1, hand: 'melee', actionLabel: '裝上', shakeAge: 1, shakeDuration: 0.25 },
      function () { cb(40, 110, ['ranged', null]); pl(100, 118, 'melee'); },
      function () { cb(225, 110, ['ranged', 'melee']); pl(290, 118, null); });
    swapPanel(ctx, 285,
      { x: 0, y: 0, w: 216, h: 116, title: '弩塔', slots: ['ranged', null], dropCell: false, index: 0, hand: 'frost', actionLabel: '互換', shakeAge: 1, shakeDuration: 0.25 },
      function () { cb(40, 110, ['ranged', null]); pl(100, 118, 'frost'); },
      function () { cb(225, 110, ['frost', null]); pl(290, 118, 'ranged'); });
  }
  function page4(ctx) { // 裝在自己身上
    grassPanel(ctx, 0, 0, 300, 280);
    ctx.save(); clipRect(ctx, 0, 0, 300, 280);
    drawPlayer(ctx, mix(IDLE, { x: 150, y: 232, moving: false, resonating: false, handItem: 'ranged', stealing: false, stealProgress: 0 }));
    drawSoulSlots(ctx, { x: 150, y: 196, slots: ['melee', null, null], virtual: [] });
    slowMoRect(ctx, 0, 0, 300, 280, 150, 14, 13);
    at(ctx, 150, 98, 0.9, function () {
      drawSoulPopup(ctx, { x: 0, y: 0, w: 312, h: 116, title: '自己', slots: ['melee', null, null], dropCell: true, index: 1, hand: 'ranged', actionLabel: '裝上', shakeAge: 1, shakeDuration: 0.25 });
    });
    ctx.restore();
    // 右上: 裝上後出手
    grassPanel(ctx, 310, 0, 250, 150);
    ctx.save(); clipRect(ctx, 310, 0, 250, 150);
    tag(ctx, '裝上後', 435, 14, 12);
    drawPlayer(ctx, mix(IDLE, { x: 352, y: 100, attackAge: 0.05, moving: false, resonating: false, handItem: null, stealing: false, stealProgress: 0 }));
    drawSoulSlots(ctx, { x: 352, y: 64, slots: ['melee', 'ranged', null], virtual: [] });
    drawProjectile(ctx, { x: 438, y: 100, angle: 0, kind: 'normal', owner: 'ally' });
    drawEnemy(ctx, imp(512, 100));
    ctx.restore();
    // 右下: 反過來
    grassPanel(ctx, 310, 160, 250, 120);
    ctx.save(); clipRect(ctx, 310, 160, 250, 120);
    // 身上格 → 手上
    popupCell(ctx, 340, 196, 'melee', true, 'slot');
    arrowLine(ctx, 364, 196, 392, 196, '#ffffff', 2.5);
    popupCell(ctx, 416, 196, 'melee', false, 'hand');
    keycap(ctx, 'Z', 378, 178, { size: 11 });
    tag(ctx, '拿回手上', 500, 196, 12);
    // 丟下格 → 腳下
    popupCell(ctx, 340, 250, null, true, 'drop');
    arrowLine(ctx, 364, 250, 392, 250, '#ffffff', 2.5);
    drawGroundPart(ctx, { item: 'ranged', x: 414, y: 252, spawnAge: 1, spawnDuration: 0.6, targeted: false });
    keycap(ctx, 'Z', 378, 232, { size: 11 });
    tag(ctx, '丟在腳下', 500, 250, 12);
    ctx.restore();
  }
  function page5(ctx) { // 魂柱共鳴
    grassPanel(ctx, 0, 0, 600, 320);
    ctx.save(); clipRect(ctx, 0, 0, 600, 320);
    ctx.translate(60, 0); ctx.scale(0.8, 0.8); ctx.translate(-100, 20);
    pathBand(ctx, [[450, -40], [450, 420]], 56);
    var P = { x: 300, y: 210 };
    drawPillarRange(ctx, { x: P.x, y: P.y, radius: 150, kinds: ['frost'], changeAge: 1, changeDuration: 0.5 });
    var A = { x: 300, y: 80 }, B = { x: 380, y: 320 }, Pl = { x: 190, y: 250 }, Cx = { x: 600, y: 200 };
    [A, B, Pl].forEach(function (t) { drawResonanceLine(ctx, { x1: P.x, y1: P.y, x2: t.x, y2: t.y, kind: 'frost', active: true }); });
    drawEnemy(ctx, imp(450, 100, { slowed: true }));
    drawEnemy(ctx, imp(450, 230));
    drawEnemy(ctx, imp(450, 330, { slowed: true }));
    drawPillar(ctx, { x: P.x, y: P.y, kinds: ['frost'], targeted: false });
    drawCrossbow(ctx, mix(IDLE, { x: A.x, y: A.y, attackAge: 0.05, moving: false, resonating: true, targeted: false }));
    drawCrossbow(ctx, mix(IDLE, { x: B.x, y: B.y, attackAge: 0.05, moving: false, resonating: true, targeted: false }));
    drawCrossbow(ctx, mix(IDLE, { x: Cx.x, y: Cx.y, attackAge: 0.05, moving: false, resonating: false, targeted: false }));
    drawPlayer(ctx, mix(IDLE, { x: Pl.x, y: Pl.y, moving: false, resonating: true, handItem: null, stealing: false, stealProgress: 0 }));
    var used = [{ kind: 'frost', used: true }];
    drawSoulSlots(ctx, { x: P.x, y: P.y - 38, slots: ['frost'], virtual: [] });
    drawSoulSlots(ctx, { x: A.x, y: A.y - 44, slots: ['ranged', null], virtual: used });
    drawSoulSlots(ctx, { x: B.x, y: B.y - 44, slots: ['ranged', null], virtual: used });
    drawSoulSlots(ctx, { x: Cx.x, y: Cx.y - 44, slots: ['ranged', null], virtual: [] });
    drawSoulSlots(ctx, { x: Pl.x, y: Pl.y - 36, slots: ['melee', null, null], virtual: used });
    drawProjectile(ctx, { x: 380, y: 90, angle: Math.atan2(20, 150), kind: 'ice', owner: 'ally' });
    drawProjectile(ctx, { x: 418, y: 325, angle: Math.atan2(10, 70), kind: 'ice', owner: 'ally' });
    drawProjectile(ctx, { x: 528, y: 215, angle: Math.atan2(30, -150), kind: 'normal', owner: 'ally' });
    drawComboName(ctx, { x: A.x, y: A.y - 68, name: '冰箭', isNew: false, age: 0.5, duration: 1.5 });
    drawComboName(ctx, { x: B.x, y: B.y - 68, name: '冰箭', isNew: false, age: 0.5, duration: 1.5 });
    tag(ctx, '借來的', 372, 36, 15);
    tag(ctx, '圈外', 600, 250, 16);
    ctx.restore();
  }
  function page6(ctx) { // 購買與蓋塔
    grassPanel(ctx, 0, 0, 600, 200);
    ctx.save(); clipRect(ctx, 0, 0, 600, 200);
    pathBand(ctx, [[-10, 168], [440, 168]], 30);
    at(ctx, 500, 165, 0.55, function () {
      drawCastle(ctx, mix(IDLE, { x: 0, y: 0, hitAge: 1, hitDuration: 0.3, zoneActive: true, targeted: true }));
      drawPlayer(ctx, mix(IDLE, { x: -90, y: 10, moving: false, resonating: false, handItem: null, stealing: false, stealProgress: 0 }));
    });
    slowMoRect(ctx, 0, 0, 600, 200, 80, 188, 12);
    at(ctx, 300, 64, 0.76, function () {
      ctx.translate(-640, -400);
      drawShopPopup(ctx, {
        items: [
          { item: 'crossbowKit', name: '弩塔', price: 15, state: 'ok' }, { item: 'pillarKit', name: '魂柱', price: 12, state: 'ok' },
          { item: 'soldierKit', name: '步兵', price: 12, state: 'ok' }, { item: 'ranged', name: '遠攻', price: 8, state: 'ok' },
          { item: 'melee', name: '近戰', price: 8, state: 'ok' }, { item: 'frost', name: '冰霜', price: 12, state: 'ok' },
          { item: 'slotStone', name: '擴槽石', price: 20, state: 'ok' }, { item: 'golemKit', name: '石魔像', price: 18, state: 'locked' }
        ], cursorIndex: 1, message: '', shakeAge: 1, shakeDuration: 0.25
      });
    });
    ctx.restore();
    // 下: 放置預覽 合法 / 不合法
    var sub = function (ox, onPath) {
      grassPanel(ctx, ox, 210, 290, 110);
      ctx.save(); clipRect(ctx, ox, 210, 290, 110);
      var cx = ox + 145, py = onPath ? 265 : 292;
      pathBand(ctx, [[ox - 10, py], [ox + 300, py]], 22);
      var k = 0.36, E = 1.5;
      var cy = onPath ? py : 252;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
      drawPlacePreview(ctx, { kind: 'pillar', x: 0, y: 0, valid: !onPath });
      ctx.restore();
      at(ctx, cx, cy, k * E, function () {
        drawPlacePreview(ctx, { kind: 'pillar', x: 0, y: 0, valid: !onPath });
      });
      at(ctx, cx + 4, cy + 4, k * E, function () {
        drawPlayer(ctx, mix(IDLE, { x: 0, y: 0, moving: false, resonating: false, handItem: 'pillarKit', stealing: false, stealProgress: 0 }));
      });
      tag(ctx, onPath ? '路上: 不可放' : '路旁: 可放', ox + 50, 226, 12);
      ctx.restore();
    };
    sub(0, false); sub(310, true);
  }
  function page7(ctx) { // 招募中立單位
    grassPanel(ctx, 0, 0, 480, 270);
    ctx.save(); clipRect(ctx, 0, 0, 480, 270);
    at(ctx, 420, 110, 0.7, function () { drawCastle(ctx, mix(IDLE, { x: 0, y: 0, hitAge: 1, hitDuration: 0.3, zoneActive: false, targeted: false })); });
    drawGolem(ctx, mix(IDLE, { x: 90, y: 118, team: 'neutral', hp: 220, maxHp: 220, moving: true, charging: false, resonating: false, targeted: false }));
    drawSoulSlots(ctx, { x: 90, y: 70, slots: ['march', null, null], virtual: [] });
    arrowLine(ctx, 130, 118, 370, 114, 'rgba(255,255,255,0.85)', 3, [8, 6]);
    tag(ctx, '中立石魔像', 90, 162, 12);
    // 商店格: 鎖住 → 解鎖
    at(ctx, 170, 222, 0.7, function () { shopCell(ctx, 0, 0, { item: 'golemKit', name: '石魔像', price: 18, state: 'locked' }, false); });
    arrowLine(ctx, 206, 222, 262, 222, '#ffffff', 3);
    at(ctx, 300, 222, 0.7, function () { shopCell(ctx, 0, 0, { item: 'golemKit', name: '石魔像', price: 18, state: 'ok' }, false); });
    tag(ctx, '商店', 90, 222, 12);
    ctx.restore();
  }
  var PAGES = [page0, page1, page2, page3, page4, page5, page6, page7];
  function drawGuidePage(ctx, s) {
    s = s || {};
    var pg = clamp(Math.floor(num(s.page, 0)), 0, PAGES.length - 1);
    var x = num(s.x, 0), y = num(s.y, 0), w = Math.max(1, num(s.w, GUIDE_SIZE[pg][0])), h = Math.max(1, num(s.h, GUIDE_SIZE[pg][1]));
    var VW = GUIDE_SIZE[pg][0], VH = GUIDE_SIZE[pg][1];
    var k = Math.min(w / VW, h / VH);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - VW * k) / 2, y + (h - VH * k) / 2);
    ctx.scale(k, k);
    PAGES[pg](ctx);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: 1280, height: 720 },
    palette: C,
    drawBackground: drawBackground,
    drawPillarRange: drawPillarRange,
    drawResonanceLine: drawResonanceLine,
    drawCastle: drawCastle,
    drawCrossbow: drawCrossbow,
    drawPillar: drawPillar,
    drawSoldier: drawSoldier,
    drawGolem: drawGolem,
    drawEnemy: drawEnemy,
    drawCorpse: drawCorpse,
    drawGroundPart: drawGroundPart,
    drawCoin: drawCoin,
    drawPlayer: drawPlayer,
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
    drawHud: drawHud,
    drawSlowMo: drawSlowMo,
    drawSoulPopup: drawSoulPopup,
    drawShopPopup: drawShopPopup,
    drawResult: drawResult,
    drawGuidePage: drawGuidePage
  };
})();
