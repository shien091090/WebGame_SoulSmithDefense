/* 魂匠惑亂 — 美術繪製 (deepen-1 / game-b)
 * 全域 window.Art; 全部 Canvas 2D 幾何, 無外部資源。
 * 每個函式只負責「給我狀態, 我畫出來」, 自己 save / restore。
 */
(function () {
  'use strict';

  var W = 1280, H = 720;
  var PI = Math.PI, TAU = Math.PI * 2;
  var FONT = "'Microsoft JhengHei','PingFang TC','Noto Sans TC','Heiti TC',sans-serif";

  var palette = {
    bg: '#2f4030', grassDark: '#2a3a2a', grid: 'rgba(255,255,255,0.05)',
    path: '#a08a64', pathEdge: '#6b583c',
    hud: '#151821', hudEdge: '#3a4158',
    text: '#f2f4f8', textDim: '#9aa3b5', outline: 'rgba(8,10,16,0.9)',
    player: '#2ec4b6', playerDark: '#0f5f58', playerFace: '#f4efe2', steal: '#46e0ff',
    ally: '#4a8cff', allyDark: '#1f3f78', allyLight: '#9cc4ff',
    stone: '#6b7790', stoneLight: '#8792ab', stoneDark: '#2c3342',
    neutral: '#d3d8de', neutralEdge: '#8d96a3',
    enemy: '#c9473c', enemyDark: '#5a1712',
    confused: '#9b4dff', confusedDark: '#3b1470', confusedGlow: '#ead2ff',
    slowed: '#aee8ff',
    corpse: '#6d5f5a', corpseDark: '#2e2522',
    allyFx: '#c99bff', enemyFx: '#ff6a3a',
    target: '#ffe94a',
    coin: '#f2a93b', coinDark: '#8a5512', coinLight: '#ffe0a0',
    valid: '#5cff8a', invalid: '#ff4a4a',
    ranged: '#3fae4a', melee: '#e08a2a', frost: '#3c8fe0', blast: '#d63a3a', march: '#cdbb8e',
    slotStone: '#8f97a6', kit: '#7a5a36',
    panel: 'rgba(22,25,38,0.96)', panelEdge: '#c9d2e8', cell: '#2a3046', cellEdge: '#4a5370',
    warn: '#ff8a6a', win: '#7dffa0', lose: '#ff6a5a', slowFrame: '#9fd0ff'
  };

  var ROUTE = [[-10, 626], [528, 626], [528, 146], [1008, 146], [1008, 386], [1124, 386]];

  // ---------- 小工具 ----------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function playing(age, dur) { var a = num(age, -1), d = num(dur, 0); return d > 0 && a >= 0 && a < d; }
  function prog(age, dur) { return clamp(num(age, 0) / Math.max(1e-6, num(dur, 1)), 0, 1); }
  function now() {
    if (typeof performance !== 'undefined' && performance && performance.now) return performance.now() / 1000;
    return Date.now() / 1000;
  }
  var ITEMS = ['ranged', 'melee', 'frost', 'blast', 'march', 'pierce', 'iceArrow', 'bomb', 'whirl', 'frostSmash',
    'slotStone', 'towerKit', 'soldierKit', 'wispKit'];
  var COMBO = { pierce: 1, iceArrow: 1, bomb: 1, whirl: 1, frostSmash: 1 };
  function normItem(it) { return ITEMS.indexOf(it) >= 0 ? it : null; }
  var ESIZE = { imp: 32, archer: 32, ice: 32, blaster: 36, giant: 52 };
  function normType(t) { return ESIZE[t] ? t : 'imp'; }
  function owner(o) { return o === 'enemy' ? 'enemy' : 'ally'; }
  function fxCol(o) { return owner(o) === 'enemy' ? palette.enemyFx : palette.allyFx; }
  function arr(a) { return Array.isArray(a) ? a : []; }
  function str(s) { return (typeof s === 'string') ? s : (typeof s === 'number' && isFinite(s) ? String(s) : ''); }

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -PI / 2, 0);
    ctx.lineTo(x + w, y + h - r);
    ctx.arc(x + w - r, y + h - r, r, 0, PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + h - r, r, PI / 2, PI);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, PI, PI * 1.5);
    ctx.closePath();
  }
  function setFont(ctx, size, bold) { ctx.font = (bold ? 'bold ' : '') + Math.round(size) + 'px ' + FONT; }
  function txt(ctx, s, x, y, size, color, align, bold, outline) {
    setFont(ctx, size, bold !== false);
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    if (outline !== false) {
      ctx.strokeStyle = outline || palette.outline;
      ctx.lineWidth = Math.max(2, size / 5);
      ctx.lineJoin = 'round';
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function measure(ctx, s, size, bold) {
    setFont(ctx, size, bold !== false);
    var m = ctx.measureText(s);
    return (m && num(m.width, 0)) || s.length * size;
  }
  // 鍵帽: align 'left' | 'center' | 'right'; 回傳寬度
  function keycap(ctx, label, x, y, h, align) {
    var fs = Math.round(h * 0.62);
    var w = Math.max(h, measure(ctx, label, fs, true) + h * 0.55);
    var lx = align === 'left' ? x : (align === 'right' ? x - w : x - w / 2);
    ctx.save();
    rr(ctx, lx, y - h / 2, w, h, h * 0.22);
    ctx.fillStyle = '#e8ecf2'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#5a6278'; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(lx + 2, y + h / 2 - 3, w - 4, 2);
    txt(ctx, label, lx + w / 2, y - 0.5, fs, '#1b1f2a', 'center', true, false);
    ctx.restore();
    return w;
  }
  // 一排「鍵帽 + 說明」, 右對齊在 rightX
  function hintRow(ctx, pairs, rightX, y, h, fs, color) {
    var parts = [], total = 0, i;
    for (i = 0; i < pairs.length; i++) {
      var kw = Math.max(h, measure(ctx, pairs[i][0], Math.round(h * 0.62), true) + h * 0.55);
      var tw = measure(ctx, pairs[i][1], fs, false);
      parts.push([kw, tw]);
      total += kw + 4 + tw + (i < pairs.length - 1 ? 12 : 0);
    }
    var cx = rightX - total;
    for (i = 0; i < pairs.length; i++) {
      keycap(ctx, pairs[i][0], cx, y, h, 'left');
      cx += parts[i][0] + 4;
      txt(ctx, pairs[i][1], cx, y, fs, color || palette.textDim, 'left', false, false);
      cx += parts[i][1] + 12;
    }
    return total;
  }
  function targetRing(ctx, w, h) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = palette.target;
    ctx.setLineDash([]);
    ctx.strokeRect(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3);
    ctx.restore();
  }
  function coinIcon(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = palette.coin; ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.2); ctx.strokeStyle = palette.coinDark; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU);
    ctx.lineWidth = Math.max(1, r * 0.14); ctx.strokeStyle = palette.coinLight; ctx.stroke();
    ctx.restore();
  }
  function spiral(ctx, x, y, r, color, lw) {
    ctx.save();
    ctx.beginPath();
    for (var i = 0; i <= 24; i++) {
      var t = i / 24, a = t * PI * 3.2, rad = r * (0.15 + 0.85 * t);
      var px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = lw || 1.4; ctx.lineCap = 'round';
    ctx.strokeStyle = color; ctx.stroke();
    ctx.restore();
  }
  function drawRoad(ctx, pts) {
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) { if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]); }
    ctx.strokeStyle = palette.pathEdge; ctx.lineWidth = 56; ctx.stroke();
    ctx.strokeStyle = palette.path; ctx.lineWidth = 46; ctx.stroke();
    ctx.setLineDash([3, 16]); ctx.strokeStyle = 'rgba(70,52,30,0.35)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }

  // ---------- 魂件圖示(全遊戲同一套) ----------
  var TILE = {
    ranged: ['ranged', 'ranged'], melee: ['melee', 'melee'], frost: ['frost', 'frost'], blast: ['blast', 'blast'],
    march: ['march', 'march'],
    pierce: ['ranged', 'ranged'], iceArrow: ['ranged', 'frost'], bomb: ['ranged', 'blast'],
    whirl: ['melee', 'melee'], frostSmash: ['melee', 'frost'],
    towerKit: ['kit', 'kit'], soldierKit: ['kit', 'kit'], wispKit: ['kit', 'kit']
  };
  function glyph(ctx, item, u) {
    var dark = item === 'march';
    var col = dark ? '#3a2c18' : '#ffffff';
    var sh = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.5)';
    function L(ax, ay, bx, by) { ctx.moveTo(ax * u, ay * u); ctx.lineTo(bx * u, by * u); }
    function A(ax, ay, bx, by, hs) {
      var a = Math.atan2(by - ay, bx - ax);
      L(ax, ay, bx, by);
      ctx.moveTo((bx - hs * Math.cos(a - 0.6)) * u, (by - hs * Math.sin(a - 0.6)) * u);
      ctx.lineTo(bx * u, by * u);
      ctx.lineTo((bx - hs * Math.cos(a + 0.6)) * u, (by - hs * Math.sin(a + 0.6)) * u);
    }
    function SN(cx, cy, r) { for (var k = 0; k < 3; k++) { var a = k * PI / 3 + PI / 2; L(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx - Math.cos(a) * r, cy - Math.sin(a) * r); } }
    function S(fn, lw) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = sh; ctx.lineWidth = (lw + 1.4) * u; ctx.beginPath(); fn(); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = lw * u; ctx.beginPath(); fn(); ctx.stroke();
    }
    function F(fn, c) {
      ctx.beginPath(); fn();
      ctx.lineWidth = 1.2 * u; ctx.strokeStyle = sh; ctx.stroke();
      ctx.fillStyle = c || col; ctx.fill();
    }
    function C(cx, cy, r) { ctx.moveTo((cx + r) * u, cy * u); ctx.arc(cx * u, cy * u, r * u, 0, TAU); }
    switch (item) {
      case 'ranged': S(function () { A(-6, 6, 6, -6, 5); L(-6, 6, -8.5, 3.5); L(-6, 6, -3.5, 8.5); }, 2.2); break;
      case 'melee': S(function () { L(0, -8.5, 0, 4); L(-5, 3.5, 5, 3.5); L(0, 4, 0, 8.5); }, 2.4); break;
      case 'frost': S(function () { SN(0, 0, 8); }, 2.2); S(function () { C(0, 0, 2.2); }, 1.2); break;
      case 'blast':
        S(function () { for (var k = 0; k < 8; k++) { var a = k * PI / 4; L(Math.cos(a) * 5.5, Math.sin(a) * 5.5, Math.cos(a) * 8.5, Math.sin(a) * 8.5); } }, 1.8);
        F(function () { C(0, 0, 4.2); });
        break;
      case 'march':
        F(function () {
          ctx.rect(1 * u, -3 * u, 7 * u, 9 * u);
          ctx.rect(1 * u, -6.5 * u, 2 * u, 3.5 * u); ctx.rect(6 * u, -6.5 * u, 2 * u, 3.5 * u);
        });
        S(function () { A(-8.5, 1.5, -1.5, 1.5, 3.5); }, 2.2);
        break;
      case 'pierce': S(function () { A(-7, 3, 3, -7, 4); A(-3, 7, 7, -3, 4); }, 2); break;
      case 'iceArrow': S(function () { A(-7.5, 7.5, 1.5, -1.5, 4); }, 2.2); S(function () { SN(4.5, -4.5, 3.8); }, 1.6); break;
      case 'bomb':
        S(function () { L(-8, 8, -2, 2); L(-8, 8, -8, 4.5); L(-8, 8, -4.5, 8); }, 2);
        F(function () { C(2.5, -2.5, 4.6); });
        S(function () { L(5.5, -5.5, 7.5, -8); }, 1.4);
        break;
      case 'whirl':
        S(function () {
          ctx.moveTo(Math.cos(-0.3) * 6.5 * u, Math.sin(-0.3) * 6.5 * u);
          ctx.arc(0, 0, 6.5 * u, -0.3, 2.2);
          ctx.moveTo(Math.cos(PI - 0.3) * 6.5 * u, Math.sin(PI - 0.3) * 6.5 * u);
          ctx.arc(0, 0, 6.5 * u, PI - 0.3, PI + 2.2);
          var e1 = 2.2, e2 = PI + 2.2;
          L(Math.cos(e1) * 6.5, Math.sin(e1) * 6.5, Math.cos(e1) * 6.5 + 3, Math.sin(e1) * 6.5 - 1);
          L(Math.cos(e2) * 6.5, Math.sin(e2) * 6.5, Math.cos(e2) * 6.5 - 3, Math.sin(e2) * 6.5 + 1);
        }, 2.2);
        F(function () { C(0, 0, 1.8); });
        break;
      case 'frostSmash':
        S(function () { L(-7.5, 7.5, 1, -1); }, 2.2);
        S(function () { L(-1.5, -5.5, 5.5, 1.5); }, 4.6);
        S(function () { SN(-4, -4, 3.4); }, 1.5);
        break;
      case 'slotStone': S(function () { L(0, -5.5, 0, 5.5); L(-5.5, 0, 5.5, 0); }, 2.6); break;
      case 'towerKit':
        F(function () { ctx.rect(-5 * u, -3 * u, 10 * u, 9 * u); ctx.rect(-5 * u, -6.5 * u, 3 * u, 3.5 * u); ctx.rect(2 * u, -6.5 * u, 3 * u, 3.5 * u); }, palette.ally);
        break;
      case 'soldierKit':
        F(function () {
          ctx.moveTo(-5.5 * u, -6 * u); ctx.lineTo(5.5 * u, -6 * u); ctx.lineTo(5.5 * u, 0);
          ctx.quadraticCurveTo(5 * u, 5 * u, 0, 7.5 * u); ctx.quadraticCurveTo(-5 * u, 5 * u, -5.5 * u, 0); ctx.closePath();
        }, palette.ally);
        S(function () { L(0, -4, 0, 4); L(-3, -1, 3, -1); }, 1.4);
        break;
      case 'wispKit':
        F(function () {
          ctx.moveTo(-5.5 * u, -1 * u); ctx.arc(0, -1 * u, 5.5 * u, PI, TAU); ctx.lineTo(5.5 * u, 6.5 * u);
          ctx.lineTo(3 * u, 5 * u); ctx.lineTo(0, 6.5 * u); ctx.lineTo(-3 * u, 5 * u); ctx.lineTo(-5.5 * u, 6.5 * u); ctx.closePath();
        }, '#eef3ff');
        break;
    }
  }
  function itemIcon(ctx, item, x, y, s) {
    item = normItem(item);
    if (!item) return;
    var u = s / 22, h = s / 2;
    ctx.save();
    ctx.translate(x, y);
    if (item === 'slotStone') {
      ctx.beginPath();
      for (var k = 0; k < 6; k++) {
        var a = k * PI / 3 + PI / 6;
        var px = Math.cos(a) * (h - 0.5), py = Math.sin(a) * (h - 0.5);
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = palette.slotStone; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(-h * 0.25, -h * 0.3, h * 0.35, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
      glyph(ctx, item, u);
      ctx.restore();
      return;
    }
    var cols = TILE[item];
    var ca = palette[cols[0]], cb = palette[cols[1]];
    rr(ctx, -h + 0.5, -h + 0.5, s - 1, s - 1, s * 0.22);
    ctx.fillStyle = ca; ctx.fill();
    if (cb !== ca) {
      ctx.save();
      rr(ctx, -h + 0.5, -h + 0.5, s - 1, s - 1, s * 0.22);
      ctx.clip();
      ctx.beginPath(); ctx.moveTo(h, -h); ctx.lineTo(h, h); ctx.lineTo(-h, h); ctx.closePath();
      ctx.fillStyle = cb; ctx.fill();
      ctx.restore();
    }
    if (cols[0] === 'kit') {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-h + 2, -h * 0.33); ctx.lineTo(h - 2, -h * 0.33); ctx.moveTo(-h + 2, h * 0.33); ctx.lineTo(h - 2, h * 0.33); ctx.stroke();
    }
    if (COMBO[item]) {
      ctx.lineWidth = Math.max(1.5, 1.9 * u); ctx.strokeStyle = '#ffffff';
      rr(ctx, -h + 1.2, -h + 1.2, s - 2.4, s - 2.4, s * 0.2); ctx.stroke();
      ctx.lineWidth = Math.max(0.8, 0.8 * u); ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      rr(ctx, -h + 2.9 * u + 1, -h + 2.9 * u + 1, s - 5.8 * u - 2, s - 5.8 * u - 2, s * 0.14); ctx.stroke();
    } else {
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      rr(ctx, -h + 0.5, -h + 0.5, s - 1, s - 1, s * 0.22); ctx.stroke();
    }
    glyph(ctx, item, u);
    ctx.restore();
  }
  function emptyCell(ctx, cx, cy, s) {
    ctx.save();
    rr(ctx, cx - s / 2 + 0.5, cy - s / 2 + 0.5, s - 1, s - 1, s * 0.2);
    ctx.fillStyle = '#0b0d14'; ctx.fill();
    ctx.setLineDash([3, 2]); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(235,240,255,0.9)'; ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(235,240,255,0.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); var q = s * 0.18;
    ctx.moveTo(cx - q, cy); ctx.lineTo(cx + q, cy); ctx.moveTo(cx, cy - q); ctx.lineTo(cx, cy + q); ctx.stroke();
    ctx.restore();
  }

  // ---------- 敵人造型 ----------
  var EYES = { imp: [-4.5, 0, 4.5, 0, 2.6], archer: [-3.5, 3, 3.5, 3, 2.4], ice: [-4.5, 4, 4.5, 4, 2.6], blaster: [-5, 1, 5, 1, 2.6], giant: [-8, -1, 8, -1, 3.4] };
  var SPIR = { imp: [0, -6, 3.6], archer: [0, -4, 3], ice: [0, -2, 3.4], blaster: [0, -6, 3.6], giant: [0, -10, 5] };
  function silhouette(ctx, type) {
    if (type === 'giant') { rr(ctx, -21, -17, 42, 40, 10); return; }
    ctx.beginPath();
    if (type === 'archer') {
      ctx.moveTo(0, -14); ctx.lineTo(11, 8); ctx.quadraticCurveTo(11, 13, 6, 13);
      ctx.lineTo(-6, 13); ctx.quadraticCurveTo(-11, 13, -11, 8); ctx.closePath();
    } else if (type === 'ice') ctx.arc(0, 3, 12, 0, TAU);
    else if (type === 'blaster') ctx.arc(0, 3, 14, 0, TAU);
    else ctx.arc(0, 2, 12.5, 0, TAU);
  }
  // mode: 'normal' | 'confused' | 'dead'
  function figure(ctx, type, body, dark, mode) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 身後配件
    if (type === 'imp') {
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(-8.5, -7); ctx.lineTo(-11, -15); ctx.lineTo(-3, -10); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8.5, -7); ctx.lineTo(11, -15); ctx.lineTo(3, -10); ctx.closePath(); ctx.fill();
    } else if (type === 'giant') {
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(-15, -13); ctx.lineTo(-22, -25); ctx.lineTo(-7, -17); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(15, -13); ctx.lineTo(22, -25); ctx.lineTo(7, -17); ctx.closePath(); ctx.fill();
    } else if (type === 'archer') {
      ctx.beginPath(); ctx.arc(3, 2, 12, -1.15, 1.15);
      ctx.strokeStyle = mode === 'dead' ? '#5a4c40' : '#8a5a2b'; ctx.lineWidth = 2.6; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3 + Math.cos(-1.15) * 12, 2 + Math.sin(-1.15) * 12); ctx.lineTo(3 + Math.cos(1.15) * 12, 2 + Math.sin(1.15) * 12);
      ctx.strokeStyle = 'rgba(240,230,210,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // 本體
    silhouette(ctx, type);
    ctx.fillStyle = body; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = dark; ctx.stroke();
    if (mode === 'confused') {
      silhouette(ctx, type);
      ctx.lineWidth = 1; ctx.strokeStyle = palette.confusedGlow; ctx.stroke();
    }
    // 身前配件
    if (type === 'ice') {
      var cr = [[-6, -9], [0, -11], [6, -9]];
      for (var i = 0; i < 3; i++) {
        var cx = cr[i][0], cy = cr[i][1];
        ctx.beginPath(); ctx.moveTo(cx, cy - 4.5); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx - 3, cy); ctx.closePath();
        ctx.fillStyle = mode === 'dead' ? '#8a9aa4' : '#bfe8ff'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = '#3a6f99'; ctx.stroke();
      }
    } else if (type === 'blaster') {
      ctx.beginPath(); ctx.moveTo(-13.6, 6); ctx.lineTo(13.6, 6);
      ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-8, 8); ctx.moveTo(0, 4); ctx.lineTo(0, 8); ctx.moveTo(8, 4); ctx.lineTo(8, 8);
      ctx.strokeStyle = '#e8c070'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, -9); ctx.quadraticCurveTo(8, -14, 11, -14);
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2; ctx.stroke();
      if (mode !== 'dead') {
        ctx.beginPath();
        for (var k = 0; k < 4; k++) { var a = k * PI / 2 + PI / 4; ctx.moveTo(12, -14); ctx.lineTo(12 + Math.cos(a) * 3.2, -14 + Math.sin(a) * 3.2); }
        ctx.strokeStyle = '#ffb02e'; ctx.lineWidth = 1.6; ctx.stroke();
      }
    } else if (type === 'giant') {
      ctx.fillStyle = '#f2ead8';
      ctx.beginPath(); ctx.moveTo(-8, 13); ctx.lineTo(-6, 6); ctx.lineTo(-4, 13); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, 13); ctx.lineTo(6, 6); ctx.lineTo(4, 13); ctx.closePath(); ctx.fill();
    }
    // 眼睛
    var e = EYES[type];
    if (mode === 'dead') {
      ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (var j = 0; j < 2; j++) {
        var ex = e[j * 2], ey = e[j * 2 + 1], r = e[4];
        ctx.moveTo(ex - r, ey - r); ctx.lineTo(ex + r, ey + r); ctx.moveTo(ex + r, ey - r); ctx.lineTo(ex - r, ey + r);
      }
      ctx.stroke();
    } else if (mode === 'confused') {
      ctx.save();
      ctx.shadowColor = '#ff9bff'; ctx.shadowBlur = 5;
      ctx.fillStyle = '#ffe2ff';
      for (var q = 0; q < 2; q++) { ctx.beginPath(); ctx.arc(e[q * 2], e[q * 2 + 1], e[4] + 0.4, 0, TAU); ctx.fill(); }
      ctx.restore();
      var sp = SPIR[type];
      spiral(ctx, sp[0], sp[1], sp[2], palette.confusedGlow, type === 'giant' ? 2 : 1.5);
    } else {
      for (var m = 0; m < 2; m++) {
        var ox = e[m * 2], oy = e[m * 2 + 1], rr2 = e[4];
        ctx.beginPath(); ctx.arc(ox, oy, rr2, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.beginPath(); ctx.arc(ox + (m === 0 ? 0.6 : -0.6), oy + 0.4, rr2 * 0.5, 0, TAU); ctx.fillStyle = '#140808'; ctx.fill();
        ctx.beginPath();
        var sx = m === 0 ? -1 : 1;
        ctx.moveTo(ox + sx * rr2 * 1.2, oy - rr2 * 1.6); ctx.lineTo(ox - sx * rr2 * 1.0, oy - rr2 * 1.0);
        ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  }

  // ---------- 背景 ----------
  function drawBackground(ctx) {
    ctx.save();
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    // 草地斑塊(固定亂數)
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    ctx.fillStyle = palette.grassDark;
    for (var i = 0; i < 60; i++) {
      var px = rnd() * W, py = 50 + rnd() * (H - 50), r = 10 + rnd() * 26;
      ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.55, 0, 0, TAU); ctx.fill();
    }
    // 蓋塔格線
    ctx.strokeStyle = palette.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; gx <= 27; gx++) { ctx.moveTo(gx * 48 + 0.5, 50); ctx.lineTo(gx * 48 + 0.5, 50 + 48 * 14); }
    for (var gy = 0; gy <= 14; gy++) { ctx.moveTo(0, 50 + gy * 48 + 0.5); ctx.lineTo(27 * 48, 50 + gy * 48 + 0.5); }
    ctx.stroke();
    drawRoad(ctx, ROUTE);
    ctx.restore();
  }

  // ---------- 主堡 ----------
  function drawCastle(ctx, s) {
    s = s || {};
    var x = num(s.x, 1180), y = num(s.y, 386);
    ctx.save();
    ctx.translate(x, y);
    // 主堡區(允許超出 size)
    var act = !!s.zoneActive;
    ctx.beginPath(); ctx.arc(0, 0, 109, 0, TAU);
    ctx.fillStyle = act ? 'rgba(255,233,140,0.13)' : 'rgba(255,233,140,0.05)'; ctx.fill();
    ctx.lineWidth = act ? 2.5 : 1.5;
    ctx.setLineDash(act ? [] : [6, 6]);
    ctx.strokeStyle = act ? 'rgba(255,233,140,0.85)' : 'rgba(255,233,140,0.3)'; ctx.stroke();
    ctx.setLineDash([]);
    if (act) keycap(ctx, '空白鍵', 0, 90, 20, 'center');
    // 本體
    var dy = playing(s.attackAge, s.attackDuration) ? -2.5 * Math.sin(PI * prog(s.attackAge, s.attackDuration)) : 0;
    ctx.save();
    ctx.translate(0, dy);
    ctx.beginPath(); ctx.arc(0, 0, 54, 0, TAU);
    ctx.fillStyle = palette.stone; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = palette.stoneDark; ctx.stroke();
    // 城垛
    ctx.fillStyle = palette.stoneLight;
    for (var k = 0; k < 12; k++) {
      var a = k * TAU / 12;
      ctx.save(); ctx.rotate(a); ctx.fillRect(40, -5, 10, 10); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = palette.stoneDark; ctx.stroke();
    // 主樓
    rr(ctx, -24, -26, 48, 52, 6);
    ctx.fillStyle = '#7f8ba6'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = palette.stoneDark; ctx.stroke();
    ctx.fillStyle = palette.ally; ctx.fillRect(-24, -26, 48, 9);
    ctx.beginPath(); ctx.moveTo(-8, 26); ctx.lineTo(-8, 12); ctx.arc(0, 12, 8, PI, TAU); ctx.lineTo(8, 26); ctx.closePath();
    ctx.fillStyle = palette.stoneDark; ctx.fill();
    // 旗
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -48); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(16, -43); ctx.lineTo(0, -38); ctx.closePath();
    ctx.fillStyle = palette.ally; ctx.fill();
    // 被突破閃紅(只改顏色)
    if (playing(s.hitAge, s.hitDuration)) {
      var hp = prog(s.hitAge, s.hitDuration);
      ctx.beginPath(); ctx.arc(0, 0, 54, 0, TAU);
      ctx.fillStyle = 'rgba(255,60,50,' + (0.6 * (1 - hp)).toFixed(3) + ')'; ctx.fill();
    }
    ctx.restore();
    if (s.targeted) targetRing(ctx, 112, 112);
    ctx.restore();
  }

  // ---------- 我方單位 ----------
  function towerBody(ctx, attacking) {
    rr(ctx, -20, -20, 40, 40, 6);
    ctx.fillStyle = palette.stone; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = palette.stoneDark; ctx.stroke();
    ctx.fillStyle = palette.stoneLight; ctx.lineWidth = 1;
    var cs = [[-20, -20], [11, -20], [-20, 11], [11, 11]];
    for (var i = 0; i < 4; i++) { ctx.fillRect(cs[i][0], cs[i][1], 9, 9); ctx.strokeRect(cs[i][0] + 0.5, cs[i][1] + 0.5, 8, 8); }
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU);
    ctx.fillStyle = palette.ally; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = palette.allyDark; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(0, -5); ctx.lineTo(0, 5);
    ctx.strokeStyle = attacking ? '#ffffff' : palette.allyDark; ctx.lineWidth = 2.2; ctx.stroke();
  }
  function drawTower(ctx, s) {
    s = s || {};
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    var atk = playing(s.attackAge, s.attackDuration);
    var dy = atk ? -2 * Math.sin(PI * prog(s.attackAge, s.attackDuration)) : 0;
    if (s.moving) {
      ctx.fillStyle = '#222630';
      ctx.beginPath(); ctx.arc(-14, 19, 4, 0, TAU); ctx.arc(14, 19, 4, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-23, -6); ctx.lineTo(-23, 6); ctx.moveTo(23, -6); ctx.lineTo(23, 6); ctx.stroke();
    }
    ctx.save(); ctx.translate(0, dy); towerBody(ctx, atk); ctx.restore();
    if (s.targeted) targetRing(ctx, 48, 48);
    ctx.restore();
  }
  function soldierBody(ctx, moving, phase) {
    if (moving) {
      ctx.fillStyle = palette.allyDark;
      ctx.beginPath(); ctx.ellipse(-5, 12.5 + phase, 3, 2, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5, 12.5 - phase, 3, 2, 0, 0, TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(12, -12); ctx.lineTo(12, 13); ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, -15.5); ctx.lineTo(14.5, -10.5); ctx.lineTo(9.5, -10.5); ctx.closePath(); ctx.fillStyle = '#d8dde6'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 3, 10, 0, TAU);
    ctx.fillStyle = palette.ally; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = palette.allyDark; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 2, 10.5, PI, TAU); ctx.closePath(); ctx.fillStyle = '#2d5fb8'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -8.5); ctx.lineTo(0, -13); ctx.strokeStyle = palette.allyLight; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-3.2, 5, 1.5, 0, TAU); ctx.arc(3.2, 5, 1.5, 0, TAU); ctx.fill();
    rr(ctx, -15.5, -1, 9, 13, 3);
    ctx.fillStyle = palette.allyLight; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = palette.allyDark; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, 1.5); ctx.lineTo(-11, 9.5); ctx.moveTo(-14, 5); ctx.lineTo(-8, 5); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke();
  }
  function drawSoldier(ctx, s) {
    s = s || {};
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    var dy = playing(s.attackAge, s.attackDuration) ? -2 * Math.sin(PI * prog(s.attackAge, s.attackDuration)) : 0;
    var ph = s.moving ? Math.sin(now() * 10) * 1.2 : 0;
    ctx.save(); ctx.translate(0, dy); soldierBody(ctx, !!s.moving, ph); ctx.restore();
    if (s.targeted) targetRing(ctx, 32, 32);
    ctx.restore();
  }
  function wispBody(ctx, team, fy, moving, atk) {
    var neutral = team !== 'ally';
    ctx.beginPath();
    ctx.moveTo(-10, fy - 1); ctx.arc(0, fy - 1, 10, PI, TAU); ctx.lineTo(10, fy + 8);
    ctx.quadraticCurveTo(8, fy + 5, 6.5, fy + 8); ctx.quadraticCurveTo(5, fy + 11, 3.3, fy + 8);
    ctx.quadraticCurveTo(1.6, fy + 5, 0, fy + 8); ctx.quadraticCurveTo(-1.6, fy + 11, -3.3, fy + 8);
    ctx.quadraticCurveTo(-5, fy + 5, -6.5, fy + 8); ctx.quadraticCurveTo(-8, fy + 11, -10, fy + 8);
    ctx.closePath();
    if (neutral) {
      ctx.fillStyle = 'rgba(214,220,228,0.72)'; ctx.fill();
      ctx.setLineDash([3, 2]); ctx.lineWidth = 1.5; ctx.strokeStyle = palette.neutralEdge; ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#6b7380'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(-3.5, fy - 1, 2.2, 0, TAU); ctx.moveTo(5.7, fy - 1); ctx.arc(3.5, fy - 1, 2.2, 0, TAU); ctx.stroke();
    } else {
      ctx.save(); ctx.shadowColor = palette.ally; ctx.shadowBlur = atk ? 8 : 4;
      ctx.fillStyle = '#6fb2ff'; ctx.fill(); ctx.restore();
      ctx.lineWidth = 1.6; ctx.strokeStyle = palette.allyDark; ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(-3.5, fy - 1, 2.4, 0, TAU); ctx.arc(3.5, fy - 1, 2.4, 0, TAU); ctx.fill();
      ctx.fillStyle = palette.allyDark;
      ctx.beginPath(); ctx.arc(-3.5, fy - 0.6, 1.1, 0, TAU); ctx.arc(3.5, fy - 0.6, 1.1, 0, TAU); ctx.fill();
    }
    if (moving) {
      ctx.strokeStyle = neutral ? 'rgba(214,220,228,0.6)' : 'rgba(111,178,255,0.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-6, fy + 10.5); ctx.lineTo(-6, fy + 13); ctx.moveTo(0, fy + 10.5); ctx.lineTo(0, fy + 13.5); ctx.moveTo(6, fy + 10.5); ctx.lineTo(6, fy + 13); ctx.stroke();
    }
  }
  function drawWisp(ctx, s) {
    s = s || {};
    var team = s.team === 'ally' ? 'ally' : 'neutral';
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    ctx.beginPath(); ctx.ellipse(0, 13, 8, 2.4, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    var atk = playing(s.attackAge, s.attackDuration);
    var fy = -3 + Math.sin(now() * 2.6) * 1.0 - (atk ? 1.5 * Math.sin(PI * prog(s.attackAge, s.attackDuration)) : 0);
    wispBody(ctx, team, fy, !!s.moving, atk);
    if (s.targeted) targetRing(ctx, 32, 32);
    ctx.restore();
  }

  // ---------- 敵人 / 屍體 ----------
  function drawEnemy(ctx, s) {
    s = s || {};
    var type = normType(s.type), sz = ESIZE[type], hh = sz / 2;
    var conf = s.team === 'confused';
    var body = conf ? palette.confused : palette.enemy, dark = conf ? palette.confusedDark : palette.enemyDark;
    var sc = hh / (type === 'giant' ? 26 : (type === 'blaster' ? 18 : 16));
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    // 魂亂守點底座
    if (conf && !s.moving) {
      ctx.beginPath(); ctx.ellipse(0, hh - 3, hh - 3, 2.6, 0, 0, TAU);
      ctx.lineWidth = 1.8; ctx.strokeStyle = palette.confusedGlow; ctx.stroke();
    }
    var atk = playing(s.attackAge, s.attackDuration);
    var dy = atk ? -3 * Math.sin(PI * prog(s.attackAge, s.attackDuration)) : 0;
    ctx.save();
    ctx.translate(0, dy);
    ctx.scale(sc, sc);
    figure(ctx, type, body, dark, conf ? 'confused' : 'normal');
    if (s.slowed) {
      silhouette(ctx, type);
      ctx.fillStyle = 'rgba(174,232,255,0.42)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = palette.slowed; ctx.stroke();
    }
    if (playing(s.hitAge, s.hitDuration)) {
      silhouette(ctx, type);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.75 * (1 - prog(s.hitAge, s.hitDuration))).toFixed(3) + ')'; ctx.fill();
    }
    ctx.restore();
    // 一般敵人停下: 問號(框內右上)
    if (!conf && !s.moving) {
      txt(ctx, '?', hh - 5, -hh + 8, type === 'giant' ? 15 : 12, '#ffffff', 'center', true);
    }
    // 血條(框外上方)
    var hp = num(s.hp, 0), mx = num(s.maxHp, 0);
    if (mx > 0 && hp < mx) {
      var by = -hh - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(-hh, by - 2, sz, 4);
      ctx.fillStyle = conf ? '#d6a6ff' : '#ff5a4a';
      ctx.fillRect(-hh, by - 2, sz * clamp(hp / mx, 0, 1), 4);
    }
    if (s.targeted) targetRing(ctx, sz, sz);
    ctx.restore();
  }
  function drawCorpse(ctx, s) {
    s = s || {};
    var type = normType(s.kind), sz = ESIZE[type], hh = sz / 2;
    var sc = hh / (type === 'giant' ? 26 : (type === 'blaster' ? 18 : 16));
    var maxLife = Math.max(3, num(s.maxLife, 15));
    var life = clamp(num(s.life, maxLife), 0, maxLife);
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    var alpha = 1;
    if (life < 3) alpha = (Math.floor(life * 6) % 2 === 0) ? 0.3 : 0.95;
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.ellipse(0, hh * 0.45, hh * 0.85, hh * 0.32, 0, 0, TAU);
    ctx.fillStyle = 'rgba(30,20,18,0.45)'; ctx.fill();
    ctx.save();
    ctx.translate(0, hh * 0.22);
    ctx.scale(sc, sc * 0.68);
    figure(ctx, type, palette.corpse, palette.corpseDark, 'dead');
    ctx.restore();
    ctx.globalAlpha = 1;
    if (s.targeted) targetRing(ctx, sz, sz);
    ctx.restore();
  }

  // ---------- 地上物 ----------
  function drawGroundPart(ctx, s) {
    s = s || {};
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    ctx.beginPath(); ctx.ellipse(0, 10, 11, 3, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -0.5, 13, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.stroke();
    itemIcon(ctx, s.item, 0, -1, 20);
    if (s.targeted) targetRing(ctx, 28, 28);
    ctx.restore();
  }
  function drawCoin(ctx, s) {
    s = s || {};
    coinIcon(ctx, num(s.x, 0), num(s.y, 0), 7);
  }

  // ---------- 玩家 ----------
  function playerBody(ctx) {
    ctx.beginPath(); ctx.ellipse(0, 13.5, 10, 2.4, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    // 鎚
    ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(-12.5, -6); ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 2.2; ctx.stroke();
    rr(ctx, -15.5, -11, 7, 5.5, 1.2); ctx.fillStyle = '#c8ccd6'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#3a3f4c'; ctx.stroke();
    // 斗篷
    ctx.beginPath();
    ctx.moveTo(0, -15); ctx.quadraticCurveTo(10, -12, 11.5, 12); ctx.quadraticCurveTo(0, 15.5, -11.5, 12); ctx.quadraticCurveTo(-10, -12, 0, -15);
    ctx.closePath();
    ctx.fillStyle = palette.player; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(6, 8); ctx.strokeStyle = palette.playerDark; ctx.lineWidth = 2; ctx.stroke();
    // 臉
    ctx.beginPath(); ctx.arc(0, -3, 6.5, 0, TAU); ctx.fillStyle = palette.playerFace; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = palette.playerDark; ctx.stroke();
    ctx.fillStyle = '#10302d';
    ctx.beginPath(); ctx.arc(-2.4, -3, 1.3, 0, TAU); ctx.arc(2.4, -3, 1.3, 0, TAU); ctx.fill();
  }
  function handHeld(ctx, item, hx, hy) {
    if (!normItem(item)) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(hx, hy, 12.5, 0, TAU); ctx.fillStyle = 'rgba(70,224,255,0.22)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, 3); ctx.lineTo(hx - 8, hy + 8); ctx.strokeStyle = palette.player; ctx.lineWidth = 2.5; ctx.stroke();
    itemIcon(ctx, item, hx, hy, 22);
    ctx.fillStyle = palette.playerFace; ctx.strokeStyle = palette.playerDark; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hx - 8, hy + 8.5, 2.6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx + 8, hy + 8.5, 2.6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawPlayer(ctx, s) {
    s = s || {};
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    if (s.stealing) {
      var p = clamp(num(s.stealProgress, 0), 0, 1);
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
      if (p > 0) {
        ctx.beginPath(); ctx.arc(0, 0, 22, -PI / 2, -PI / 2 + TAU * p);
        ctx.strokeStyle = palette.steal; ctx.lineWidth = 4; ctx.stroke();
      }
    }
    var atk = playing(s.attackAge, s.attackDuration);
    var dy = atk ? -2.5 * Math.sin(PI * prog(s.attackAge, s.attackDuration)) : 0;
    var bob = s.moving ? Math.abs(Math.sin(now() * 12)) * -1.2 : 0;
    ctx.save(); ctx.translate(0, dy + bob); playerBody(ctx); ctx.restore();
    handHeld(ctx, s.handItem, 28, 0);
    ctx.restore();
  }

  // ---------- 放置預覽 ----------
  function drawPlacePreview(ctx, s) {
    s = s || {};
    var kind = (s.kind === 'soldier' || s.kind === 'wisp') ? s.kind : 'tower';
    var ok = !!s.valid;
    var col = ok ? palette.valid : palette.invalid;
    var hs = kind === 'tower' ? 24 : 16;
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    if (kind === 'tower') {
      ctx.fillStyle = ok ? 'rgba(92,255,138,0.16)' : 'rgba(255,74,74,0.16)';
      ctx.fillRect(-24, -24, 48, 48);
      ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.strokeRect(-23, -23, 46, 46);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU);
      ctx.fillStyle = ok ? 'rgba(92,255,138,0.16)' : 'rgba(255,74,74,0.16)'; ctx.fill();
      ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 0.5;
    if (kind === 'tower') { ctx.save(); ctx.scale(0.8, 0.8); towerBody(ctx, false); ctx.restore(); }
    else if (kind === 'soldier') { ctx.save(); ctx.scale(0.85, 0.85); soldierBody(ctx, false, 0); ctx.restore(); }
    else { ctx.save(); ctx.scale(0.85, 0.85); wispBody(ctx, 'ally', -1, false, false); ctx.restore(); }
    ctx.globalAlpha = 1;
    if (!ok) {
      var q = hs - 6;
      ctx.beginPath(); ctx.moveTo(-q, -q); ctx.lineTo(q, q); ctx.moveTo(q, -q); ctx.lineTo(-q, q);
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = palette.invalid; ctx.lineWidth = 3.5; ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 魂件槽列 ----------
  function drawSoulSlots(ctx, s) {
    s = s || {};
    var slots = arr(s.slots), n = slots.length;
    if (n === 0) return;
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    rr(ctx, x - n * 10, y - 10, n * 20, 20, 4);
    ctx.fillStyle = 'rgba(10,12,20,0.78)'; ctx.fill();
    for (var i = 0; i < n; i++) {
      var cx = x - n * 10 + 10 + 20 * i;
      var it = normItem(slots[i]);
      if (it) itemIcon(ctx, it, cx, y, 18); else emptyCell(ctx, cx, y, 18);
    }
    ctx.restore();
  }

  // ---------- 特效 ----------
  function drawFrostAura(ctx, s) {
    s = s || {};
    var r = clamp(num(s.radius, 70), 0, 70);
    if (r <= 0) return;
    var col = fxCol(s.owner);
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, TAU);
    ctx.fillStyle = 'rgba(170,225,255,0.11)'; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(200,240,255,0.55)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r - 3, 0, TAU);
    ctx.setLineDash([7, 6]); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.globalAlpha = 0.75; ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(220,245,255,0.45)'; ctx.lineWidth = 1.2;
    for (var k = 0; k < 6; k++) {
      var a = k * TAU / 6 + 0.3, px = Math.cos(a) * r * 0.62, py = Math.sin(a) * r * 0.62;
      ctx.beginPath();
      for (var j = 0; j < 3; j++) { var b = j * PI / 3; ctx.moveTo(px + Math.cos(b) * 3.5, py + Math.sin(b) * 3.5); ctx.lineTo(px - Math.cos(b) * 3.5, py - Math.sin(b) * 3.5); }
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawProjectile(ctx, s) {
    s = s || {};
    var kind = (s.kind === 'ice' || s.kind === 'bomb') ? s.kind : 'normal';
    var ow = owner(s.owner), col = fxCol(ow);
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    ctx.rotate(num(s.angle, 0));
    if (kind === 'bomb') {
      ctx.beginPath(); ctx.arc(0, 0, 5.6, 0, TAU);
      ctx.fillStyle = '#2a2230'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(-4.4, -4.4); ctx.strokeStyle = '#ffb02e'; ctx.lineWidth = 1.5; ctx.stroke();
      if (ow === 'ally') { ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(0, 2); ctx.lineTo(-2, 0); ctx.lineTo(0, -2); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, TAU); ctx.fillStyle = palette.enemyFx; ctx.fill(); }
    } else {
      var core = kind === 'ice' ? '#bdeeff' : '#ffffff';
      if (ow === 'ally') {
        ctx.beginPath(); ctx.moveTo(4.3, 0); ctx.lineTo(0, 2.4); ctx.lineTo(-4.3, 0); ctx.lineTo(0, -2.4); ctx.closePath();
        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 4; ctx.fillStyle = core; ctx.fill(); ctx.restore();
        ctx.lineWidth = 1.3; ctx.strokeStyle = col; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU);
        ctx.fillStyle = kind === 'ice' ? '#9fd8f0' : palette.enemyFx; ctx.fill();
        ctx.lineWidth = 1.4; ctx.strokeStyle = kind === 'ice' ? palette.enemyFx : '#7a1a0a'; ctx.stroke();
      }
      if (kind === 'ice') {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(-1.6, -1.6); ctx.lineTo(1.6, 1.6); ctx.moveTo(1.6, -1.6); ctx.lineTo(-1.6, 1.6); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawPierceBeam(ctx, s) {
    s = s || {};
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0);
    var p = prog(s.age, s.duration), a = 1 - p;
    var col = fxCol(s.owner);
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.35 * a;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = col; ctx.lineWidth = 26; ctx.stroke();
    ctx.globalAlpha = 0.85 * a;
    ctx.lineWidth = 10; ctx.stroke();
    ctx.globalAlpha = a;
    ctx.strokeStyle = owner(s.owner) === 'enemy' ? '#ffe0c8' : '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  function drawAreaHit(ctx, s) {
    s = s || {};
    var kind = (s.kind === 'blast' || s.kind === 'frostSmash') ? s.kind : 'whirl';
    var r = clamp(num(s.radius, 60), 0, 70);
    if (r <= 0) return;
    var p = prog(s.age, s.duration), col = fxCol(s.owner);
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    if (kind === 'whirl') {
      var rot = p * TAU;
      ctx.globalAlpha = 1 - p * 0.6;
      ctx.lineCap = 'round';
      for (var k = 0; k < 3; k++) {
        var a0 = rot + k * TAU / 3;
        ctx.beginPath(); ctx.arc(0, 0, r - 4, a0, a0 + 1.0);
        ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r - 4, a0 + 0.35, a0 + 1.0);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, TAU); ctx.lineWidth = 1.5; ctx.strokeStyle = col; ctx.globalAlpha = 0.4 * (1 - p); ctx.stroke();
    } else if (kind === 'blast') {
      var rb = r * (0.35 + 0.65 * Math.sin(p * PI / 2));
      ctx.globalAlpha = 1 - p;
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rb);
      g.addColorStop(0, 'rgba(255,240,200,0.9)'); g.addColorStop(0.5, 'rgba(255,150,60,0.55)'); g.addColorStop(1, 'rgba(255,90,40,0.05)');
      ctx.beginPath(); ctx.arc(0, 0, rb, 0, TAU); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, Math.max(1, rb - 2), 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.stroke();
    } else {
      var rf = r * (0.3 + 0.7 * p);
      ctx.globalAlpha = 1 - p * 0.8;
      ctx.beginPath(); ctx.arc(0, 0, Math.max(1, rf - 3), 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = '#bfeeff'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, Math.max(1, rf - 1), 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.3;
      for (var j = 0; j < 6; j++) {
        var aa = j * TAU / 6, px = Math.cos(aa) * (rf - 3), py = Math.sin(aa) * (rf - 3);
        ctx.beginPath();
        for (var t = 0; t < 3; t++) { var b = t * PI / 3; ctx.moveTo(px + Math.cos(b) * 3, py + Math.sin(b) * 3); ctx.lineTo(px - Math.cos(b) * 3, py - Math.sin(b) * 3); }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawHitSpark(ctx, s) {
    s = s || {};
    var p = prog(s.age, s.duration);
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    ctx.globalAlpha = 1 - p;
    ctx.beginPath(); ctx.arc(0, 0, 6 * (1 - p) + 1, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.lineCap = 'round'; ctx.strokeStyle = '#ffd2a8'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (var k = 0; k < 6; k++) {
      var a = k * TAU / 6 + 0.4, r0 = 3 + 4 * p, r1 = 6 + 5 * p;
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    }
    ctx.stroke();
    ctx.restore();
  }
  function drawStealLink(ctx, s) {
    s = s || {};
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0);
    var p = clamp(num(s.progress, 0), 0, 1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3 + 3 * p + 2; ctx.stroke();
    ctx.setLineDash([6, 5]); ctx.lineDashOffset = -now() * 30;
    ctx.globalAlpha = 0.55 + 0.45 * p;
    ctx.strokeStyle = palette.steal; ctx.lineWidth = 2 + 3 * p; ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x2, y2, 11, 0, TAU); ctx.lineWidth = 2 + p; ctx.stroke();
    ctx.restore();
  }
  var CN = {
    fuse: { W: 200, H: 36, pre: '合成! ', fs: 13 },
    newCombo: { W: 280, H: 48, pre: '新組合! ', fs: 18 },
    confuse: { W: 160, H: 36, pre: '魂亂!', fs: 14 },
    drop: { W: 200, H: 36, pre: '掉落! ', fs: 13 }
  };
  function drawComboName(ctx, s) {
    s = s || {};
    var kind = CN[s.kind] ? s.kind : 'fuse', k = CN[kind];
    if (!playing(s.age, s.duration)) return;
    var p = prog(s.age, s.duration);
    var label = kind === 'confuse' ? '魂亂!' : k.pre + str(s.name);
    var sc = p < 0.06 ? 0.85 + (p / 0.06) * 0.35 : (p < 0.16 ? 1.2 - ((p - 0.06) / 0.1) * 0.2 : 1);
    var off = 4 - 11 * p;
    var alpha = p > 0.7 ? (1 - p) / 0.3 : 1;
    var ph = Math.floor(Math.min((k.H - 8) / 1.2, k.H - 14) - 2);
    var fs = k.fs;
    var cap = k.W / 1.2 - 4;
    var tw = measure(ctx, label, fs, true);
    if (tw + ph > cap) { fs = Math.max(9, fs * (cap - ph) / tw); tw = measure(ctx, label, fs, true); }
    var pw = Math.min(cap, tw + ph);
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0) + off);
    ctx.scale(sc, sc);
    ctx.globalAlpha = clamp(alpha, 0, 1);
    rr(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);
    var fill, edge, tc, lw = 1.5;
    if (kind === 'newCombo') { fill = '#ffffff'; edge = palette.confused; tc = '#2a1450'; lw = 3; }
    else if (kind === 'confuse') { fill = palette.confused; edge = palette.confusedGlow; tc = '#ffffff'; lw = 2; }
    else if (kind === 'drop') { fill = 'rgba(20,16,32,0.92)'; edge = palette.win; tc = '#b8ffcc'; }
    else { fill = 'rgba(20,16,32,0.92)'; edge = '#ffffff'; tc = '#ffffff'; }
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = edge; ctx.stroke();
    txt(ctx, label, 0, 0.5, fs, tc, 'center', true, false);
    ctx.restore();
  }
  function drawSpawnWarning(ctx, s) {
    s = s || {};
    var rem = clamp(num(s.remaining, 0), 0, Math.max(1, num(s.total, 6)));
    var t = now();
    var blink = 0.55 + 0.45 * Math.sin(t * (rem < 2 ? 16 : 8));
    ctx.save();
    ctx.translate(40, 626);
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU);
    ctx.fillStyle = 'rgba(255,60,45,' + (0.15 + 0.3 * blink).toFixed(3) + ')'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#ff4a3a'; ctx.stroke();
    var frac = rem - Math.ceil(rem) + 1;
    if (rem > 0) {
      ctx.beginPath(); ctx.arc(0, 0, 30, -PI / 2, -PI / 2 + TAU * clamp(frac, 0, 1));
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(18, -9); ctx.lineTo(28, 0); ctx.lineTo(18, 9); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.fill();
    txt(ctx, String(Math.max(0, Math.ceil(rem))), -2, 1, 22, '#ffffff', 'center', true);
    ctx.restore();
  }

  // ---------- HUD ----------
  function castleGlyph(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = palette.stoneLight;
    ctx.fillRect(-8, -4, 16, 12); ctx.fillRect(-8, -8, 4, 4); ctx.fillRect(-2, -8, 4, 4); ctx.fillRect(4, -8, 4, 4);
    ctx.fillStyle = palette.ally; ctx.fillRect(-8, -4, 16, 3);
    ctx.fillStyle = palette.stoneDark; ctx.fillRect(-2.5, 2, 5, 6);
    ctx.restore();
  }
  function confusedBadge(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = palette.confused; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = palette.confusedGlow; ctx.stroke();
    spiral(ctx, x, y, r * 0.62, '#ffffff', 1.6);
    ctx.restore();
  }
  function drawHud(ctx, s) {
    s = s || {};
    ctx.save();
    ctx.fillStyle = palette.hud; ctx.fillRect(0, 0, W, 50);
    ctx.fillStyle = palette.hudEdge; ctx.fillRect(0, 48, W, 2);
    var y = 25;
    coinIcon(ctx, 28, y, 10);
    txt(ctx, String(Math.floor(num(s.gold, 0))), 46, y, 22, palette.coinLight, 'left', true, false);
    // 主堡
    var hp = Math.floor(num(s.castleHp, 0)), mx = Math.floor(num(s.castleMaxHp, 20));
    castleGlyph(ctx, 146, y, 1.1);
    txt(ctx, '主堡', 162, y, 14, palette.textDim, 'left', false, false);
    txt(ctx, hp + ' / ' + mx, 196, y, 20, hp <= Math.max(1, mx * 0.25) ? palette.lose : palette.text, 'left', true, false);
    // 波次
    var wave = Math.floor(num(s.wave, 0)), tw = Math.floor(num(s.totalWaves, 6));
    txt(ctx, '波次', 300, y, 14, palette.textDim, 'left', false, false);
    txt(ctx, wave + ' / ' + tw, 334, y, 20, palette.text, 'left', true, false);
    var nw = num(s.nextWaveIn, -1);
    if (nw >= 0) {
      txt(ctx, '下一波', 410, y, 14, palette.textDim, 'left', false, false);
      txt(ctx, Math.ceil(nw) + ' 秒', 458, y, 20, palette.text, 'left', true, false);
    }
    // 魂亂數
    confusedBadge(ctx, 572, y, 10);
    txt(ctx, '魂亂', 588, y, 14, palette.textDim, 'left', false, false);
    txt(ctx, String(Math.max(0, Math.floor(num(s.confusedAlive, 0)))), 622, y, 20, palette.confusedGlow, 'left', true, false);
    // 操作提示
    hintRow(ctx, [['Z', '互動'], ['X', '自己'], ['空白鍵', '商店']], 1264, y, 22, 14, palette.textDim);
    ctx.restore();
  }

  // ---------- 慢動作 ----------
  function slowFrame(ctx, x, y, w, h, lw) {
    ctx.save();
    ctx.lineWidth = lw; ctx.strokeStyle = palette.slowFrame;
    ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.strokeRect(x + lw + 2.5, y + lw + 2.5, w - 2 * lw - 5, h - 2 * lw - 5);
    ctx.restore();
  }
  function slowTag(ctx, x, y, sc) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    rr(ctx, -66, -17, 132, 34, 10);
    ctx.fillStyle = 'rgba(10,20,40,0.88)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = palette.slowFrame; ctx.stroke();
    // 沙漏
    ctx.beginPath(); ctx.moveTo(-48, -9); ctx.lineTo(-36, -9); ctx.lineTo(-42, 0); ctx.lineTo(-36, 9); ctx.lineTo(-48, 9); ctx.lineTo(-42, 0); ctx.closePath();
    ctx.lineWidth = 1.8; ctx.strokeStyle = palette.slowFrame; ctx.stroke();
    txt(ctx, '慢動作', 10, 0.5, 20, '#e6f2ff', 'center', true, false);
    ctx.restore();
  }
  function drawSlowMo(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(40,70,130,0.16)';
    ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(640, 360, 280, 640, 360, 780);
    g.addColorStop(0, 'rgba(5,10,25,0)'); g.addColorStop(1, 'rgba(5,10,25,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    slowFrame(ctx, 0, 0, W, H, 8);
    slowTag(ctx, 640, 80, 1);
    ctx.restore();
  }

  // ---------- 魂件彈窗 ----------
  // kind: 'slot' | 'drop' | 'hand'; 以 40×40 為基準縮放到 size
  function popCell(ctx, cx, cy, kind, item, sel, size) {
    ctx.save();
    ctx.translate(cx, cy);
    var k = (size || 40) / 40;
    ctx.scale(k, k);
    if (kind === 'drop') {
      rr(ctx, -20, -20, 40, 40, 10);
      ctx.fillStyle = '#3a2620'; ctx.fill();
      ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = '#c09070'; ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, -1); ctx.moveTo(-5, -6); ctx.lineTo(0, -1); ctx.lineTo(5, -6);
      ctx.moveTo(-9, 2.5); ctx.lineTo(9, 2.5);
      ctx.lineCap = 'round'; ctx.strokeStyle = '#f0d8c0'; ctx.lineWidth = 2.2; ctx.stroke();
      txt(ctx, '丟下', 0, 12, 10, '#f0d8c0', 'center', true, false);
    } else {
      rr(ctx, -20, -20, 40, 40, 6);
      ctx.fillStyle = palette.cell; ctx.fill();
      ctx.lineWidth = kind === 'hand' ? 2 : 1.5;
      ctx.strokeStyle = kind === 'hand' ? palette.player : palette.cellEdge; ctx.stroke();
      var it = normItem(item);
      if (it) itemIcon(ctx, it, 0, 0, 32);
      else if (kind === 'slot') emptyCell(ctx, 0, 0, 30);
    }
    if (sel) {
      rr(ctx, -20, -20, 40, 40, 6);
      ctx.fillStyle = 'rgba(255,233,74,0.12)'; ctx.fill();
      rr(ctx, -23, -23, 46, 46, 8);
      ctx.lineWidth = 4; ctx.strokeStyle = palette.target; ctx.stroke();
    }
    ctx.restore();
  }
  function drawSoulPopup(ctx, s) {
    s = s || {};
    var slots = arr(s.slots), drop = !!s.dropCell;
    var n = slots.length + (drop ? 1 : 0);
    var w = num(s.w, n * 48 + 120), h = num(s.h, 116);
    var idx = Math.floor(num(s.index, 0));
    var shake = 0;
    if (playing(s.shakeAge, s.shakeDuration)) {
      var sp = prog(s.shakeAge, s.shakeDuration);
      shake = Math.sin(sp * PI * 6) * 6 * (1 - sp);
    }
    ctx.save();
    ctx.translate(num(s.x, 640) + shake, num(s.y, 360));
    rr(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 10);
    ctx.fillStyle = palette.panel; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = palette.panelEdge; ctx.stroke();
    txt(ctx, str(s.title), 0, -40, 15, palette.text, 'center', true, false);
    for (var i = 0; i < n; i++) {
      var cx = -w / 2 + 40 + 48 * i;
      if (i < slots.length) popCell(ctx, cx, -4, 'slot', slots[i], i === idx, 40);
      else popCell(ctx, cx, -4, 'drop', null, i === idx, 40);
    }
    // 分隔線 + 手上
    ctx.beginPath(); ctx.moveTo(w / 2 - 86, -28); ctx.lineTo(w / 2 - 86, 20);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(201,210,232,0.45)'; ctx.stroke();
    txt(ctx, '手上', w / 2 - 44, -31, 11, palette.player, 'center', true, false);
    popCell(ctx, w / 2 - 44, -4, 'hand', s.hand, false, 40);
    // 底部
    var act = str(s.actionLabel);
    if (act) txt(ctx, act, -w / 2 + 14, 40, 15, act === '塞進去' ? '#d6a6ff' : palette.text, 'left', true, false);
    hintRow(ctx, [['Z', '確定'], ['X', '關閉']], w / 2 - 12, 40, 16, 11, palette.textDim);
    ctx.restore();
  }

  // ---------- 商店彈窗 ----------
  function lockGlyph(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(0, -4, 5.5, PI, TAU); ctx.lineWidth = 2.4; ctx.strokeStyle = '#aab2c2'; ctx.stroke();
    rr(ctx, -8, -4, 16, 12, 2.5); ctx.fillStyle = '#aab2c2'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 1, 1.8, 0, TAU); ctx.fillStyle = '#2a3046'; ctx.fill();
    ctx.restore();
  }
  function shopCell(ctx, cx, cy, it, sel) {
    it = it || {};
    var st = (it.state === 'poor' || it.state === 'locked') ? it.state : 'ok';
    ctx.save();
    ctx.translate(cx, cy);
    rr(ctx, -40, -36, 80, 72, 8);
    ctx.fillStyle = st === 'locked' ? '#171a24' : (st === 'poor' ? '#20242f' : palette.cell); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = palette.cellEdge; ctx.stroke();
    if (st === 'locked') {
      lockGlyph(ctx, 0, -14, 1.3);
    } else {
      ctx.globalAlpha = st === 'poor' ? 0.42 : 1;
      itemIcon(ctx, it.item, 0, -17, 30);
      txt(ctx, str(it.name), 0, 11, 12, palette.text, 'center', true, false);
      ctx.globalAlpha = 1;
    }
    var price = str(it.price);
    var pc = st === 'poor' ? palette.lose : (st === 'locked' ? '#6a7286' : palette.coinLight);
    var pw = measure(ctx, price, 12, true);
    coinIcon(ctx, -pw / 2 - 4, 26, 5);
    txt(ctx, price, -pw / 2 + 4, 26, 12, pc, 'left', true, false);
    if (sel) {
      rr(ctx, -40, -36, 80, 72, 8); ctx.fillStyle = 'rgba(255,233,74,0.10)'; ctx.fill();
      rr(ctx, -43, -39, 86, 78, 10); ctx.lineWidth = 4; ctx.strokeStyle = palette.target; ctx.stroke();
    }
    ctx.restore();
  }
  function drawShopPopup(ctx, s) {
    s = s || {};
    var items = arr(s.items), cur = Math.floor(num(s.cursorIndex, 0));
    var shake = 0;
    if (playing(s.shakeAge, s.shakeDuration)) {
      var sp = prog(s.shakeAge, s.shakeDuration);
      shake = Math.sin(sp * PI * 6) * 6 * (1 - sp);
    }
    ctx.save();
    ctx.translate(640 + shake, 400);
    rr(ctx, -379, -74, 758, 148, 12);
    ctx.fillStyle = palette.panel; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = palette.panelEdge; ctx.stroke();
    txt(ctx, '商店', 0, -60, 16, palette.text, 'center', true, false);
    var n = items.length;
    var x0 = -(n - 1) * 44;
    for (var i = 0; i < n; i++) shopCell(ctx, x0 + 88 * i, -4, items[i], i === cur);
    var msg = str(s.message);
    if (msg) txt(ctx, msg, -366, 57, 14, palette.warn, 'left', true, false);
    hintRow(ctx, [['← →', '選'], ['Z', '購買'], ['X', '關閉']], 366, 57, 18, 12, palette.textDim);
    ctx.restore();
  }

  // ---------- 結算 ----------
  function drawResult(ctx, s) {
    s = s || {};
    var win = !!s.win;
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,16,0.72)'; ctx.fillRect(0, 0, W, H);
    rr(ctx, 380, 190, 520, 340, 16);
    ctx.fillStyle = 'rgba(24,27,40,0.97)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = win ? palette.win : palette.lose; ctx.stroke();
    txt(ctx, win ? '勝利' : '主堡被攻陷', 640, 250, 44, win ? palette.win : palette.lose, 'center', true);
    var wave = Math.floor(num(s.wave, 0)), tw = Math.floor(num(s.totalWaves, 6));
    txt(ctx, '第 ' + wave + ' / ' + tw + ' 波', 640, 320, 24, palette.text, 'center', true, false);
    txt(ctx, '發現組合 ' + Math.floor(num(s.comboCount, 0)) + ' / 5', 640, 362, 24, palette.text, 'center', true, false);
    var cc = '魂亂敵人 ' + Math.floor(num(s.confusedCount, 0)) + ' 隻';
    var cw = measure(ctx, cc, 24, true);
    confusedBadge(ctx, 640 - cw / 2 - 18, 404, 11);
    txt(ctx, cc, 640, 404, 24, palette.confusedGlow, 'center', true, false);
    var t1 = measure(ctx, '按', 20, true), t2 = measure(ctx, '重新開始', 20, true);
    var total = t1 + 8 + 30 + 8 + t2, sx = 640 - total / 2;
    txt(ctx, '按', sx, 470, 20, palette.text, 'left', true, false);
    keycap(ctx, 'Z', sx + t1 + 8, 470, 30, 'left');
    txt(ctx, '重新開始', sx + t1 + 46, 470, 20, palette.text, 'left', true, false);
    ctx.restore();
  }

  // ---------- 說明頁示意圖 ----------
  function gLabel(ctx, s, x, y, color, align) { txt(ctx, s, x, y, 12, color || '#ffffff', align || 'center', true); }
  function gGrass(ctx, x, y, w, h, grid) {
    ctx.save();
    ctx.fillStyle = palette.bg; ctx.fillRect(x, y, w, h);
    if (grid) {
      ctx.strokeStyle = palette.grid; ctx.lineWidth = 1; ctx.beginPath();
      for (var gx = x + 0.5; gx <= x + w; gx += 48) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
      for (var gy = y + 0.5; gy <= y + h; gy += 48) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
      ctx.stroke();
    }
    ctx.restore();
  }
  function gFrame(ctx, x, y, w, h) {
    ctx.save();
    rr(ctx, x, y, w, h, 8); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(230,236,250,0.55)'; ctx.stroke();
    ctx.restore();
  }
  function gTint(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(60,85,140,0.35)'; ctx.fillRect(x, y, w, h);
    slowFrame(ctx, x, y, w, h, 4);
    ctx.restore();
  }
  function gArrow(ctx, x1, y1, x2, y2, col, dash) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 5; ctx.stroke();
    if (dash) ctx.setLineDash([6, 5]);
    ctx.strokeStyle = col || '#ffffff'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2 - 9 * Math.cos(a - 0.5), y2 - 9 * Math.sin(a - 0.5)); ctx.lineTo(x2, y2); ctx.lineTo(x2 - 9 * Math.cos(a + 0.5), y2 - 9 * Math.sin(a + 0.5));
    ctx.stroke();
    ctx.restore();
  }
  function idleEnemy(type, x, y, extra) {
    var o = { type: type, x: x, y: y, team: 'normal', hp: 40, maxHp: 40, hitAge: 0.2, hitDuration: 0.2, attackAge: 0.15, attackDuration: 0.15, moving: true, slowed: false, targeted: false };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function idleUnit(x, y, extra) {
    var o = { x: x, y: y, attackAge: 0.15, attackDuration: 0.15, moving: false, targeted: false };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function pl(x, y, extra) {
    var o = { x: x, y: y, moving: false, attackAge: 0.15, attackDuration: 0.15, handItem: null, stealing: false, stealProgress: 0 };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function chevron(ctx, x, y, a, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.6); ctx.lineTo(s * 0.4, 0); ctx.lineTo(-s * 0.5, s * 0.6);
    ctx.lineWidth = s * 0.28; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.stroke();
    ctx.restore();
  }

  var GUIDE_SIZE = [[480, 270], [400, 240], [560, 300], [560, 260], [560, 280], [600, 280], [600, 300], [480, 270]];

  // 第 1 頁 守住主堡: 整張地圖縮 0.375
  function gPage1(ctx) {
    ctx.save();
    ctx.scale(0.375, 0.375);
    drawBackground(ctx);
    var segs = [[[60, 626], [528, 626]], [[528, 626], [528, 146]], [[528, 146], [1008, 146]], [[1008, 146], [1008, 386]], [[1008, 386], [1124, 386]]];
    for (var i = 0; i < segs.length; i++) {
      var a = segs[i][0], b = segs[i][1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (var d = 60; d < len - 30; d += 120) chevron(ctx, a[0] + Math.cos(ang) * d, a[1] + Math.sin(ang) * d, ang, 26);
    }
    drawSpawnWarning(ctx, { remaining: 3.4, total: 6 });
    drawCastle(ctx, { x: 1180, y: 386, hitAge: 0.3, hitDuration: 0.3, attackAge: 0.15, attackDuration: 0.15, zoneActive: false, targeted: false });
    var imps = [[150, 626], [250, 626], [350, 626], [450, 626], [528, 500], [528, 345]];
    for (var j = 0; j < imps.length; j++) drawEnemy(ctx, idleEnemy('imp', imps[j][0], imps[j][1]));
    drawTower(ctx, idleUnit(456, 410, { attackAge: 0.05 }));
    drawTower(ctx, idleUnit(600, 218, { attackAge: 0.05 }));
    drawSoulSlots(ctx, { x: 456, y: 366, slots: ['ranged', null] });
    drawSoulSlots(ctx, { x: 600, y: 174, slots: ['ranged', null] });
    drawProjectile(ctx, { x: 494, y: 458, angle: Math.atan2(90, 72), kind: 'normal', owner: 'ally' });
    drawProjectile(ctx, { x: 562, y: 282, angle: Math.atan2(127, -72), kind: 'normal', owner: 'ally' });
    ctx.restore();
    gLabel(ctx, '出怪點', 6, 210, '#ffb0a0', 'left');
    gLabel(ctx, '主堡', 442, 178, '#ffffff', 'center');
    gLabel(ctx, '箭塔', 171, 142, '#cfe0ff', 'center');
  }
  // 第 2 頁 移動與撿錢
  function gPage2(ctx) {
    gGrass(ctx, 0, 0, 400, 240, true);
    drawCorpse(ctx, { kind: 'imp', x: 80, y: 170, life: 12, maxLife: 15, targeted: false });
    drawSoulSlots(ctx, { x: 80, y: 142, slots: ['melee', 'march', null] });
    // 金幣飛向玩家
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,224,160,0.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(108, 166); ctx.lineTo(150, 156); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,224,160,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(112, 174); ctx.lineTo(146, 164); ctx.stroke();
    ctx.restore();
    drawCoin(ctx, { x: 162, y: 154 });
    gArrow(ctx, 174, 151, 200, 145, palette.coinLight);
    drawPlayer(ctx, pl(232, 140, { moving: true }));
    drawSoulSlots(ctx, { x: 232, y: 104, slots: ['melee', null, null] });
    keycap(ctx, '↑', 232, 78, 22, 'center');
    keycap(ctx, '↓', 232, 176, 22, 'center');
    keycap(ctx, '←', 196, 140, 22, 'center');
    keycap(ctx, '→', 290, 140, 22, 'center');
    // 金幣讀數(HUD 樣式)
    ctx.save();
    rr(ctx, 292, 10, 100, 34, 8); ctx.fillStyle = palette.hud; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = palette.hudEdge; ctx.stroke();
    coinIcon(ctx, 310, 27, 9);
    txt(ctx, '42', 324, 27, 20, palette.coinLight, 'left', true, false);
    txt(ctx, '+2', 380, 27, 14, palette.win, 'right', true);
    ctx.restore();
  }
  // 第 3 頁 拿魂件
  function gPage3(ctx) {
    gGrass(ctx, 0, 0, 560, 300, true);
    // 主圖(慢動作)
    drawTower(ctx, idleUnit(120, 222, { targeted: true }));
    drawSoulSlots(ctx, { x: 120, y: 178, slots: ['ranged', null] });
    drawPlayer(ctx, pl(184, 228));
    drawSoulSlots(ctx, { x: 184, y: 192, slots: ['melee', null, null] });
    gTint(ctx, 0, 0, 372, 300);
    slowTag(ctx, 300, 278, 0.6);
    drawSoulPopup(ctx, { x: 186, y: 72, w: 216, h: 116, title: '箭塔', slots: ['ranged', null], dropCell: false, index: 0, hand: null, actionLabel: '拿起', shakeAge: 0.25, shakeDuration: 0.25 });
    keycap(ctx, '←', 34, 72, 22, 'center');
    keycap(ctx, '→', 60, 72, 22, 'center');
    // 拿起後
    gFrame(ctx, 382, 6, 172, 140);
    gLabel(ctx, '拿起後', 392, 22, '#ffffff', 'left');
    gArrow(ctx, 298, 72, 378, 72);
    drawPlayer(ctx, pl(440, 104, { handItem: 'ranged' }));
    drawSoulSlots(ctx, { x: 440, y: 68, slots: ['melee', null, null] });
    // 屍體與活鬼
    gFrame(ctx, 382, 154, 172, 140);
    drawCorpse(ctx, { kind: 'imp', x: 418, y: 262, life: 10, maxLife: 15, targeted: false });
    drawSoulSlots(ctx, { x: 418, y: 234, slots: ['melee', 'march', null] });
    gLabel(ctx, '屍體', 418, 287, '#ffffff', 'center');
    drawEnemy(ctx, idleEnemy('imp', 490, 222, { targeted: true }));
    drawSoulSlots(ctx, { x: 490, y: 186, slots: ['melee', 'march', null] });
    gLabel(ctx, '活鬼', 512, 214, '#ffb0a0', 'left');
    drawPlayer(ctx, pl(524, 264, { stealing: true, stealProgress: 0.6 }));
    drawStealLink(ctx, { x1: 524, y1: 264, x2: 470, y2: 186, progress: 0.6 });
  }
  function resultStrip(ctx, x, y, slots, hand) {
    gLabel(ctx, '結果', x, y, '#ffffff', 'left');
    ctx.save(); ctx.translate(x + 50, y); ctx.scale(0.55, 0.55); towerBody(ctx, false); ctx.restore();
    drawSoulSlots(ctx, { x: x + 92, y: y, slots: slots });
    if (hand) {
      gLabel(ctx, '手上', x + 140, y, palette.player, 'left');
      popCell(ctx, x + 186, y, 'hand', hand, false, 26);
    }
  }
  // 第 4 頁 裝上與互換
  function gPage4(ctx) {
    gGrass(ctx, 0, 0, 560, 260, true);
    var halves = [
      { ox: 0, hand: 'melee', idx: 1, act: '裝上', res: ['ranged', 'melee'], resHand: null },
      { ox: 284, hand: 'frost', idx: 0, act: '互換', res: ['frost', null], resHand: 'ranged' }
    ];
    for (var i = 0; i < 2; i++) {
      var h = halves[i], ox = h.ox;
      drawTower(ctx, idleUnit(ox + 80, 182, { targeted: true }));
      drawSoulSlots(ctx, { x: ox + 80, y: 138, slots: ['ranged', null] });
      drawPlayer(ctx, pl(ox + 142, 188, { handItem: h.hand }));
      drawSoulSlots(ctx, { x: ox + 142, y: 152, slots: ['melee', null, null] });
      gTint(ctx, ox, 0, 276, 212);
      drawSoulPopup(ctx, { x: ox + 140, y: 62, w: 216, h: 116, title: '箭塔', slots: ['ranged', null], dropCell: false, index: h.idx, hand: h.hand, actionLabel: h.act, shakeAge: 0.25, shakeDuration: 0.25 });
      resultStrip(ctx, ox + 10, 236, h.res, h.resHand);
    }
  }
  // 第 5 頁 裝在自己身上
  function gPage5(ctx) {
    gGrass(ctx, 0, 0, 560, 280, true);
    drawPlayer(ctx, pl(175, 238, { handItem: 'ranged' }));
    drawSoulSlots(ctx, { x: 175, y: 202, slots: ['melee', null, null] });
    gTint(ctx, 0, 0, 352, 280);
    drawSoulPopup(ctx, { x: 176, y: 74, w: 312, h: 116, title: '自己', slots: ['melee', null, null], dropCell: true, index: 1, hand: 'ranged', actionLabel: '裝上', shakeAge: 0.25, shakeDuration: 0.25 });
    // 裝好後
    gFrame(ctx, 362, 6, 192, 132);
    gLabel(ctx, '裝好後', 372, 22, '#ffffff', 'left');
    drawPlayer(ctx, pl(398, 96, { attackAge: 0.07 }));
    drawSoulSlots(ctx, { x: 398, y: 60, slots: ['melee', 'ranged', null] });
    drawEnemy(ctx, idleEnemy('imp', 522, 96));
    drawProjectile(ctx, { x: 462, y: 96, angle: 0, kind: 'normal', owner: 'ally' });
    // 反過來
    gFrame(ctx, 362, 146, 192, 128);
    popCell(ctx, 392, 180, 'slot', 'melee', true, 30);
    gArrow(ctx, 412, 180, 470, 180);
    keycap(ctx, 'Z', 441, 166, 16, 'center');
    popCell(ctx, 492, 180, 'hand', 'melee', false, 30);
    gLabel(ctx, '拿回手上', 441, 198, '#ffffff', 'center');
    popCell(ctx, 392, 240, 'drop', null, true, 30);
    gArrow(ctx, 412, 240, 470, 240);
    keycap(ctx, 'Z', 441, 226, 16, 'center');
    drawGroundPart(ctx, { item: 'melee', x: 492, y: 240, targeted: false });
    gLabel(ctx, '丟在腳下', 441, 258, '#ffffff', 'center');
  }
  // 第 6 頁 塞進敵人
  function gPage6(ctx) {
    gGrass(ctx, 0, 0, 600, 280, true);
    ctx.save(); ctx.fillStyle = palette.pathEdge; ctx.fillRect(0, 178, 600, 56); ctx.fillStyle = palette.path; ctx.fillRect(0, 183, 600, 46); ctx.restore();
    drawEnemy(ctx, idleEnemy('imp', 110, 206, { targeted: true }));
    drawSoulSlots(ctx, { x: 110, y: 170, slots: ['melee', 'march', null] });
    drawPlayer(ctx, pl(160, 240, { handItem: 'ranged' }));
    gTint(ctx, 0, 0, 296, 280);
    drawSoulPopup(ctx, { x: 150, y: 72, w: 264, h: 116, title: '小鬼(活)', slots: ['melee', 'march', null], dropCell: false, index: 2, hand: 'ranged', actionLabel: '塞進去', shakeAge: 0.25, shakeDuration: 0.25 });
    gArrow(ctx, 304, 206, 344, 206);
    // 魂亂後
    drawEnemy(ctx, idleEnemy('imp', 420, 206, { team: 'confused', hp: 72, maxHp: 80, attackAge: 0.07 }));
    drawSoulSlots(ctx, { x: 420, y: 170, slots: ['melee', 'march', 'ranged'] });
    drawEnemy(ctx, idleEnemy('imp', 462, 206, { hp: 26, maxHp: 40, attackAge: 0.07 }));
    drawProjectile(ctx, { x: 441, y: 203, angle: 0, kind: 'normal', owner: 'ally' });
    drawHitSpark(ctx, { x: 462, y: 206, age: 0.15, duration: 0.25 });
    drawHitSpark(ctx, { x: 420, y: 206, age: 0.17, duration: 0.25 });
    drawComboName(ctx, { x: 420, y: 146, kind: 'confuse', name: '', age: 0.35, duration: 1.0 });
    gLabel(ctx, '魂亂', 420, 248, '#d6a6ff', 'center');
    gLabel(ctx, '一般', 466, 248, '#ffb0a0', 'center');
  }
  // 第 7 頁 購買與蓋塔
  function gPage7(ctx) {
    gGrass(ctx, 0, 0, 600, 300, false);
    // 主堡區(縮 0.75)
    ctx.save(); ctx.translate(210, 214); ctx.scale(0.75, 0.75);
    drawCastle(ctx, { x: 0, y: 0, hitAge: 0.3, hitDuration: 0.3, attackAge: 0.15, attackDuration: 0.15, zoneActive: true, targeted: false });
    drawPlayer(ctx, pl(-80, 8));
    ctx.restore();
    gTint(ctx, 0, 0, 600, 126);
    gTint(ctx, 0, 126, 300, 174);
    ctx.save(); ctx.translate(300 - 640 * 0.78, 64 - 400 * 0.78); ctx.scale(0.78, 0.78);
    drawShopPopup(ctx, {
      items: [
        { item: 'towerKit', name: '箭塔', price: 15, state: 'ok' }, { item: 'soldierKit', name: '步兵', price: 12, state: 'ok' },
        { item: 'ranged', name: '遠攻', price: 8, state: 'ok' }, { item: 'melee', name: '近戰', price: 8, state: 'ok' },
        { item: 'frost', name: '冰霜', price: 12, state: 'ok' }, { item: 'blast', name: '爆裂', price: 12, state: 'ok' },
        { item: 'slotStone', name: '擴槽石', price: 20, state: 'poor' }, { item: 'wispKit', name: '遊魂', price: 16, state: 'locked' }
      ], cursorIndex: 0, message: '', shakeAge: 0.25, shakeDuration: 0.25
    });
    ctx.restore();
    // 放下(沒有彈窗, 不蓋慢動作)
    ctx.save();
    rr(ctx, 308, 132, 286, 164, 8); ctx.clip();
    gGrass(ctx, 308, 132, 286, 164, true);
    drawRoad(ctx, [[300, 262], [600, 262]]);
    drawPlacePreview(ctx, { kind: 'tower', x: 372, y: 182, valid: true });
    drawPlayer(ctx, pl(372, 182, { handItem: 'towerKit' }));
    drawPlacePreview(ctx, { kind: 'tower', x: 516, y: 262, valid: false });
    drawPlayer(ctx, pl(516, 262, { handItem: 'towerKit' }));
    ctx.restore();
    gFrame(ctx, 308, 132, 286, 164);
  }
  // 第 8 頁 招募中立單位
  function gPage8(ctx) {
    gGrass(ctx, 0, 0, 480, 270, false);
    ctx.save(); ctx.translate(400, 110); ctx.scale(0.8, 0.8);
    drawCastle(ctx, { x: 0, y: 0, hitAge: 0.3, hitDuration: 0.3, attackAge: 0.15, attackDuration: 0.15, zoneActive: false, targeted: false });
    ctx.restore();
    drawWisp(ctx, { x: 100, y: 110, team: 'neutral', attackAge: 0.15, attackDuration: 0.15, moving: true, targeted: false });
    drawSoulSlots(ctx, { x: 100, y: 74, slots: ['march', null, null] });
    gArrow(ctx, 124, 110, 348, 110, '#e6ebf2', true);
    gLabel(ctx, '商店', 160, 228, '#ffffff', 'center');
    ctx.save(); ctx.translate(240, 228); ctx.scale(0.8, 0.8); shopCell(ctx, 0, 0, { item: 'wispKit', name: '遊魂', price: 16, state: 'locked' }, false); ctx.restore();
    gArrow(ctx, 278, 228, 320, 228);
    ctx.save(); ctx.translate(360, 228); ctx.scale(0.8, 0.8); shopCell(ctx, 0, 0, { item: 'wispKit', name: '遊魂', price: 16, state: 'ok' }, false); ctx.restore();
  }
  var GUIDE = [gPage1, gPage2, gPage3, gPage4, gPage5, gPage6, gPage7, gPage8];

  function drawGuidePage(ctx, s) {
    s = s || {};
    var page = Math.floor(num(s.page, 0));
    if (page < 0 || page >= GUIDE.length) return;
    var x = num(s.x, 0), y = num(s.y, 0), w = Math.max(1, num(s.w, GUIDE_SIZE[page][0])), h = Math.max(1, num(s.h, GUIDE_SIZE[page][1]));
    var vw = GUIDE_SIZE[page][0], vh = GUIDE_SIZE[page][1];
    var k = Math.min(w / vw, h / vh);
    ctx.save();
    ctx.translate(x + (w - vw * k) / 2, y + (h - vh * k) / 2);
    ctx.scale(k, k);
    ctx.beginPath(); ctx.rect(0, 0, vw, vh); ctx.clip();
    GUIDE[page](ctx);
    ctx.restore();
    ctx.save();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(230,236,250,0.35)';
    ctx.strokeRect(x + (w - vw * k) / 2, y + (h - vh * k) / 2, vw * k, vh * k);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: palette,
    drawBackground: drawBackground,
    drawCastle: drawCastle,
    drawTower: drawTower,
    drawSoldier: drawSoldier,
    drawWisp: drawWisp,
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
