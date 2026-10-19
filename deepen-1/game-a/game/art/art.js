/* 魂匠陣紋 — art.js
 * 全部以 Canvas 2D 幾何繪製, 不引任何外部資源。全域物件 window.Art, 不用 ES module。
 * 每個函式自己 save / restore; 只畫, 不改任何遊戲狀態。
 */
(function () {
  'use strict';

  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  var PAL = {
    bg: '#22382a',
    grass: '#2a4630',
    grassTuft: '#33553a',
    grid: 'rgba(255,255,255,0.055)',
    path: '#9c8459',
    pathEdge: '#6f5a3a',
    pathRut: 'rgba(80,62,36,0.35)',
    hud: '#13151c',
    hudLine: '#3b4054',
    text: '#f4f1e8',
    textDim: '#aaa8ba',
    player: '#2fd6c3',
    playerDark: '#137266',
    team: '#2fd6c3',
    stone: '#8e909d',
    stoneDark: '#5b5d69',
    stoneLight: '#babcc7',
    wood: '#8a5a32',
    woodDark: '#5b3a1e',
    steel: '#9aa7c0',
    enemy: '#3b2542',
    enemyEdge: '#170c1d',
    enemyEye: '#ff4a3a',
    danger: '#ff4a3a',
    neutral: '#7f8188',
    wolfAlly: '#c08a52',
    ranged: '#f2c230',
    melee: '#ff5c9a',
    frost: '#2f86e8',
    seek: '#5bd36f',
    march: '#8f3fd6',
    comboEdge: '#ffd75e',
    coin: '#ffbf2e',
    coinEdge: '#a86e08',
    slowed: '#bff0ff',
    target: '#ffffff',
    valid: '#7dffa0',
    invalid: '#ff4a3a',
    linkFrost: '#4da3ff',
    linkBlade: '#ff5c9a',
    linkArrow: '#f2c230',
    panel: '#1b1d27',
    panelEdge: '#9fe0ff',
    cell: '#2a2d3b',
    cellEdge: '#4d5370',
    cursor: '#ffffff',
    slowTint: '#9fe0ff',
    bone: '#e2d6b4',
    ice: '#a8dcff',
    win: '#ffd75e',
    lose: '#ff4a3a'
  };

  var BASIC = ['ranged', 'melee', 'frost', 'seek', 'march'];
  var COMBO = {
    pierce: ['ranged', 'ranged'],
    iceArrow: ['ranged', 'frost'],
    whirl: ['melee', 'melee'],
    frostSmash: ['melee', 'frost'],
    counter: ['seek', 'march']
  };
  var KITS = { towerKit: 'tower', steleKit: 'stele', soldierKit: 'soldier', wolfKit: 'wolf' };
  var ENEMY_TYPES = ['imp', 'archer', 'ice', 'swift', 'frostArmor'];
  var LINK_COL = { frost: PAL.linkFrost, blade: PAL.linkBlade, arrow: PAL.linkArrow };
  var PATH_PTS = [[0, 146], [960, 146], [960, 434], [336, 434], [336, 626], [1124, 626]];

  // ---------- 小工具 ----------
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function pick(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function obj(s) { return (s && typeof s === 'object') ? s : {}; }
  function str(v) { return (v === null || v === undefined) ? '' : String(v); }
  function prog(age, dur) {
    dur = num(dur, 0); age = num(age, dur);
    if (!(dur > 0)) return 1;
    return clamp(age / dur, 0, 1);
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
    t = clamp(t, 0, 1);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function rgba(h, a) { var A = hexRgb(h); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + clamp(a, 0, 1) + ')'; }
  function tinter(tc, ta) { return function (c) { return ta > 0 ? mix(c, tc, ta) : c; }; }
  function font(px, w) { return (w || 'bold') + ' ' + Math.round(px) + 'px ' + FONT; }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
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
  function measure(ctx, s) {
    var m = ctx.measureText ? ctx.measureText(s) : null;
    return (m && isFinite(m.width)) ? m.width : String(s).length * 10;
  }
  // 文字(預設深色描邊, 保證壓在任何底色上可讀)
  function txt(ctx, s, x, y, px, color, align, opt) {
    opt = opt || {};
    ctx.font = font(px, opt.weight);
    ctx.textAlign = align || 'center';
    ctx.textBaseline = opt.base || 'middle';
    if (opt.outline !== false) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = opt.outlineW || Math.max(2, px * 0.22);
      ctx.strokeStyle = opt.outlineColor || 'rgba(8,8,14,0.9)';
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  // 互動目標外框: 內緣貼齊 size 外邊, 寬 3
  function targetFrame(ctx, w, h) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = PAL.target;
    ctx.strokeRect(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
    ctx.restore();
  }
  function keycap(ctx, label, x, y, w, h) {
    w = w || 22; h = h || 22;
    ctx.save();
    rr(ctx, x - w / 2, y - h / 2, w, h, 4);
    ctx.fillStyle = '#e9e6dc';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2b2b33';
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x - w / 2 + 2, y + h / 2 - 5, w - 4, 3);
    txt(ctx, label, x, y - 1, Math.min(14, h * 0.6), '#1d1d24', 'center', { outline: false });
    ctx.restore();
  }
  function shakeDx(age, dur) {
    var p = prog(age, dur);
    if (p >= 1) return 0;
    return Math.sin(p * Math.PI * 6) * 6 * (1 - p);
  }

  // ---------- 魂件圖示(全畫面共用同一套) ----------
  function itemColor(k) { return PAL[k] || '#888888'; }
  function itemKind(item) {
    if (BASIC.indexOf(item) >= 0) return 'basic';
    if (COMBO.hasOwnProperty(item)) return 'combo';
    if (item === 'slotStone') return 'stone';
    if (KITS.hasOwnProperty(item)) return 'kit';
    return null;
  }
  function glyphShape(ctx, k, u, col, lw) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var i, a;
    function ln(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1 * u, y1 * u); ctx.lineTo(x2 * u, y2 * u); ctx.stroke(); }
    function tri(a1, b1, a2, b2, a3, b3) { ctx.beginPath(); ctx.moveTo(a1 * u, b1 * u); ctx.lineTo(a2 * u, b2 * u); ctx.lineTo(a3 * u, b3 * u); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    function star(cx, cy, r) { for (i = 0; i < 3; i++) { a = i * Math.PI / 3; ln(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r); } }
    switch (k) {
      case 'ranged':
        ln(-0.55, 0.55, 0.38, -0.38);
        tri(0.62, -0.62, 0.14, -0.5, 0.5, -0.14);
        ln(-0.55, 0.55, -0.55, 0.22); ln(-0.55, 0.55, -0.22, 0.55);
        break;
      case 'melee':
        ctx.lineWidth = lw * 1.4; ln(-0.3, 0.3, 0.58, -0.58); ctx.lineWidth = lw;
        ln(-0.5, 0.04, -0.04, 0.5);
        ln(-0.32, 0.32, -0.6, 0.6);
        break;
      case 'frost':
        for (i = 0; i < 3; i++) {
          a = i * Math.PI / 3 + Math.PI / 2;
          ln(-Math.cos(a) * 0.62, -Math.sin(a) * 0.62, Math.cos(a) * 0.62, Math.sin(a) * 0.62);
        }
        for (i = 0; i < 6; i++) {
          a = i * Math.PI / 3 + Math.PI / 2;
          var bx = Math.cos(a) * 0.4, by = Math.sin(a) * 0.4;
          ln(bx, by, bx + Math.cos(a + 0.8) * 0.2, by + Math.sin(a + 0.8) * 0.2);
          ln(bx, by, bx + Math.cos(a - 0.8) * 0.2, by + Math.sin(a - 0.8) * 0.2);
        }
        break;
      case 'seek':
        ctx.beginPath();
        ctx.moveTo(-0.68 * u, 0);
        ctx.quadraticCurveTo(0, -0.62 * u, 0.68 * u, 0);
        ctx.quadraticCurveTo(0, 0.62 * u, -0.68 * u, 0);
        ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 0.2 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        break;
      case 'march':
        ctx.beginPath();
        var pts = [[-0.5, 0.58], [0.5, 0.58], [0.5, -0.56], [0.28, -0.56], [0.28, -0.32], [0.1, -0.32], [0.1, -0.56], [-0.1, -0.56], [-0.1, -0.32], [-0.28, -0.32], [-0.28, -0.56], [-0.5, -0.56]];
        ctx.moveTo(pts[0][0] * u, pts[0][1] * u);
        for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * u, pts[i][1] * u);
        ctx.closePath(); ctx.stroke(); ctx.fill();
        break;
      case 'pierce':
        ln(-0.7, 0, 0.42, 0);
        tri(0.72, 0, 0.36, -0.26, 0.36, 0.26);
        ln(-0.22, -0.4, -0.22, 0.4); ln(0.14, -0.4, 0.14, 0.4);
        break;
      case 'iceArrow':
        ln(-0.55, 0.55, 0.25, -0.25);
        ln(-0.55, 0.55, -0.55, 0.22); ln(-0.55, 0.55, -0.22, 0.55);
        star(0.36, -0.36, 0.28);
        break;
      case 'whirl':
        ctx.beginPath(); ctx.arc(0, 0, 0.52 * u, -0.3, 2.0); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 0.52 * u, Math.PI - 0.3, Math.PI + 2.0); ctx.stroke();
        tri(Math.cos(2.0) * 0.52 - 0.2, Math.sin(2.0) * 0.52 + 0.02, Math.cos(2.0) * 0.52 + 0.1, Math.sin(2.0) * 0.52 + 0.14, Math.cos(2.0) * 0.52 + 0.06, Math.sin(2.0) * 0.52 - 0.18);
        tri(-Math.cos(2.0) * 0.52 + 0.2, -Math.sin(2.0) * 0.52 - 0.02, -Math.cos(2.0) * 0.52 - 0.1, -Math.sin(2.0) * 0.52 - 0.14, -Math.cos(2.0) * 0.52 - 0.06, -Math.sin(2.0) * 0.52 + 0.18);
        ctx.beginPath(); ctx.arc(0, 0, 0.12 * u, 0, Math.PI * 2); ctx.fill();
        break;
      case 'frostSmash':
        ln(-0.55, 0.55, 0.12, -0.12);
        ctx.lineWidth = lw * 2.4; ln(-0.06, -0.5, 0.5, 0.06); ctx.lineWidth = lw;
        star(-0.36, -0.36, 0.22);
        break;
      case 'counter':
        ctx.beginPath();
        ctx.moveTo(0.42 * u, 0.6 * u);
        ctx.lineTo(0.42 * u, -0.08 * u);
        ctx.arc(0, -0.08 * u, 0.42 * u, 0, Math.PI, true);
        ctx.lineTo(-0.42 * u, 0.22 * u);
        ctx.stroke();
        tri(-0.42, 0.62, -0.68, 0.24, -0.16, 0.24);
        break;
    }
  }
  function glyph(ctx, k, s) {
    var u = s / 2, lw = Math.max(1.2, s * 0.085);
    ctx.save();
    glyphShape(ctx, k, u, 'rgba(10,10,18,0.85)', lw * 2.1);
    glyphShape(ctx, k, u, '#ffffff', lw);
    ctx.restore();
  }
  function stoneShape(ctx, s) {
    var r = s * 0.48, i, a;
    ctx.beginPath();
    for (i = 0; i < 6; i++) { a = Math.PI / 6 + i * Math.PI / 3; if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath();
    ctx.fillStyle = '#7d8aa3'; ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.07); ctx.strokeStyle = '#d6e0f0'; ctx.stroke();
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, s * 0.13); ctx.strokeStyle = 'rgba(10,10,18,0.8)';
    ctx.beginPath(); ctx.moveTo(-s * 0.22, 0); ctx.lineTo(s * 0.22, 0); ctx.moveTo(0, -s * 0.22); ctx.lineTo(0, s * 0.22); ctx.stroke();
    ctx.lineWidth = Math.max(1, s * 0.07); ctx.strokeStyle = '#ffffff'; ctx.stroke();
  }
  // item 圖示, 中心 (cx, cy), 邊長 s
  function itemIcon(ctx, item, cx, cy, s) {
    var kind = itemKind(item);
    if (!kind) return;
    ctx.save();
    ctx.translate(cx, cy);
    var h = s / 2, r = s * 0.2;
    if (kind === 'basic') {
      rr(ctx, -h, -h, s, s, r);
      ctx.fillStyle = itemColor(item); ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.06); ctx.strokeStyle = mix(itemColor(item), '#000000', 0.5); ctx.stroke();
      glyph(ctx, item, s * 0.78);
    } else if (kind === 'combo') {
      var pair = COMBO[item];
      ctx.save();
      rr(ctx, -h, -h, s, s, r); ctx.clip();
      ctx.fillStyle = itemColor(pair[0]); ctx.fillRect(-h, -h, s, s);
      ctx.beginPath(); ctx.moveTo(h, -h); ctx.lineTo(h, h); ctx.lineTo(-h, h); ctx.closePath();
      ctx.fillStyle = pair[0] === pair[1] ? mix(itemColor(pair[1]), '#000000', 0.25) : itemColor(pair[1]); ctx.fill();
      ctx.restore();
      var bw = Math.max(1.5, s * 0.1);
      rr(ctx, -h + bw / 2, -h + bw / 2, s - bw, s - bw, Math.max(0, r - bw / 2));
      ctx.lineWidth = bw; ctx.strokeStyle = PAL.comboEdge; ctx.stroke();
      // 角飾: 組合魂件專屬的四角小菱
      ctx.fillStyle = '#fff6c8';
      var d = s * 0.09, c = h - bw * 0.5;
      [[-c, -c], [c, -c], [-c, c], [c, c]].forEach(function (p) {
        ctx.beginPath(); ctx.moveTo(p[0], p[1] - d); ctx.lineTo(p[0] + d, p[1]); ctx.lineTo(p[0], p[1] + d); ctx.lineTo(p[0] - d, p[1]); ctx.closePath(); ctx.fill();
      });
      glyph(ctx, item, s * 0.7);
    } else if (kind === 'stone') {
      stoneShape(ctx, s);
    } else if (kind === 'kit') {
      rr(ctx, -h, -h, s, s, r);
      ctx.fillStyle = '#e9dcc0'; ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.06); ctx.strokeStyle = '#8a7650'; ctx.stroke();
      var unit = KITS[item];
      var base = unit === 'tower' ? 48 : (unit === 'wolf' ? 36 : 32);
      var sc = (s * 0.82) / base;
      ctx.scale(sc, sc);
      unitBody(ctx, unit, {});
    }
    ctx.restore();
  }

  // ---------- 單位本體(以原點為中心, 原尺寸) ----------
  function unitBody(ctx, unit, o) {
    if (unit === 'tower') towerBody(ctx, o);
    else if (unit === 'stele') steleBody(ctx, o);
    else if (unit === 'soldier') soldierBody(ctx, o);
    else if (unit === 'wolf') wolfBody(ctx, o.team === 'neutral' ? 'neutral' : 'ally', o);
  }
  function towerBody(ctx, o) {
    var C = tinter(o.tc || '#ffffff', o.ta || 0);
    ctx.lineJoin = 'round';
    // 石基座
    ctx.beginPath();
    ctx.moveTo(-18, 2); ctx.lineTo(18, 2); ctx.lineTo(21, 21); ctx.lineTo(-21, 21); ctx.closePath();
    ctx.fillStyle = C(PAL.stone); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C(PAL.stoneDark); ctx.stroke();
    ctx.strokeStyle = C('#74768a'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-19, 11); ctx.lineTo(19, 11); ctx.moveTo(-4, 2); ctx.lineTo(-4, 11); ctx.moveTo(8, 11); ctx.lineTo(8, 21); ctx.stroke();
    // 木平台
    rr(ctx, -20, -6, 40, 9, 2);
    ctx.fillStyle = C(PAL.wood); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C(PAL.woodDark); ctx.stroke();
    // 弩: 弓臂 + 弦 + 朝上的弩箭
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -8); ctx.quadraticCurveTo(0, -22, 14, -8);
    ctx.lineWidth = 3.5; ctx.strokeStyle = C(PAL.woodDark); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = C('#e8e2cc');
    ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(0, -6); ctx.lineTo(14, -8); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = C('#d8d2c0');
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -19); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(-3.5, -16); ctx.lineTo(3.5, -16); ctx.closePath();
    ctx.fillStyle = C('#e8e2cc'); ctx.fill();
    // 我方小旗
    ctx.lineWidth = 1.5; ctx.strokeStyle = C('#333333');
    ctx.beginPath(); ctx.moveTo(17, -5); ctx.lineTo(17, -20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(17, -20); ctx.lineTo(23, -17); ctx.lineTo(17, -14); ctx.closePath();
    ctx.fillStyle = C(PAL.team); ctx.fill();
    if (o.moving) {
      // 移動中: 底部輪子 + 後方揚塵
      ctx.fillStyle = C('#3a3a44');
      ctx.beginPath(); ctx.arc(-13, 20, 3.5, 0, Math.PI * 2); ctx.arc(13, 20, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(230,220,190,0.55)';
      ctx.beginPath(); ctx.arc(-21, 18, 2.5, 0, Math.PI * 2); ctx.arc(21, 18, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  function steleBody(ctx, o) {
    var C = tinter(o.tc || '#ffffff', o.ta || 0);
    ctx.lineJoin = 'round';
    ctx.translate(0, 0.5); ctx.scale(0.92, 0.92);
    // 底座
    rr(ctx, -14, 9, 28, 6, 2);
    ctx.fillStyle = C(PAL.stoneDark); ctx.fill();
    // 碑身(圓頂)
    ctx.beginPath();
    ctx.moveTo(-10, 10); ctx.lineTo(-10, -6); ctx.arc(0, -6, 10, Math.PI, 0); ctx.lineTo(10, 10); ctx.closePath();
    ctx.fillStyle = C('#a3a5b3'); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C(PAL.stoneDark); ctx.stroke();
    // 碑頂發光紋: 一顆菱形 + 兩側向外的弧(會和別人連線)
    ctx.save();
    ctx.shadowColor = '#eaf6ff'; ctx.shadowBlur = 5;
    ctx.fillStyle = C('#f2fbff');
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(4, -7); ctx.lineTo(0, -2); ctx.lineTo(-4, -7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C('#eaf6ff'); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -7, 8, -0.6, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -7, 8, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    // 碑面刻線
    ctx.strokeStyle = C('#6d6f7c'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(5, 2); ctx.moveTo(-5, 6); ctx.lineTo(5, 6); ctx.stroke();
  }
  function soldierBody(ctx, o) {
    var C = tinter(o.tc || '#ffffff', o.ta || 0);
    var step = o.moving ? 3 : 0;
    ctx.translate(0, 1); ctx.scale(0.84, 0.84);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 腳
    ctx.strokeStyle = C('#3a3f4c'); ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-4 - step, 15); ctx.moveTo(4, 8); ctx.lineTo(4 + step, 15); ctx.stroke();
    // 身體
    rr(ctx, -8, -3, 16, 13, 4);
    ctx.fillStyle = C('#5c6a85'); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C('#2c3344'); ctx.stroke();
    // 劍(右)
    ctx.strokeStyle = C('#e6e9f0'); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(10, 4); ctx.lineTo(14, -10); ctx.stroke();
    ctx.strokeStyle = C(PAL.woodDark); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(7, 3); ctx.lineTo(13, 5); ctx.stroke();
    // 頭盔
    ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2);
    ctx.fillStyle = C(PAL.steel); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C('#2c3344'); ctx.stroke();
    ctx.fillStyle = C('#1e2230');
    ctx.fillRect(-5, -8, 10, 2.5);
    // 我方羽飾
    ctx.fillStyle = C(PAL.team);
    ctx.beginPath(); ctx.moveTo(-2, -14); ctx.quadraticCurveTo(2, -19, 7, -15); ctx.lineTo(2, -13); ctx.closePath(); ctx.fill();
    // 盾(左)
    ctx.beginPath(); ctx.moveTo(-15, -2); ctx.lineTo(-7, -2); ctx.lineTo(-7, 7); ctx.quadraticCurveTo(-11, 12, -15, 7); ctx.closePath();
    ctx.fillStyle = C('#8c6a3a'); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C('#4a3518'); ctx.stroke();
    ctx.fillStyle = C(PAL.team);
    ctx.beginPath(); ctx.arc(-11, 3, 2, 0, Math.PI * 2); ctx.fill();
  }
  function wolfBody(ctx, team, o) {
    var C = tinter(o.tc || '#ffffff', o.ta || 0);
    var neutral = team === 'neutral';
    var fur = neutral ? PAL.neutral : PAL.wolfAlly;
    var furDark = neutral ? '#55575e' : '#7a5530';
    var stride = o.moving ? 3 : 0;
    ctx.scale(0.88, 0.88);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 腿
    ctx.strokeStyle = C(furDark); ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 8); ctx.lineTo(-8 - stride, 16);
    ctx.moveTo(-3, 8); ctx.lineTo(-3 + stride, 16);
    ctx.moveTo(5, 8); ctx.lineTo(5 + stride, 16);
    ctx.moveTo(9, 8); ctx.lineTo(9 - stride, 16);
    ctx.stroke();
    // 尾
    ctx.beginPath(); ctx.moveTo(-12, 2); ctx.quadraticCurveTo(-18, -2, -16, -10);
    ctx.lineWidth = 4; ctx.strokeStyle = C(fur); ctx.stroke();
    // 身
    ctx.beginPath(); ctx.ellipse(-1, 4, 13, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = C(fur); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C(furDark); ctx.stroke();
    // 頭
    ctx.beginPath(); ctx.arc(10, -5, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 耳
    ctx.beginPath(); ctx.moveTo(6, -9); ctx.lineTo(7, -16); ctx.lineTo(11, -11); ctx.closePath();
    ctx.moveTo(11, -11); ctx.lineTo(14, -16); ctx.lineTo(15, -9); ctx.closePath();
    ctx.fillStyle = C(furDark); ctx.fill();
    // 吻
    ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(17.5, -3); ctx.lineTo(13, -1); ctx.closePath();
    ctx.fillStyle = C(fur); ctx.fill(); ctx.stroke();
    // 眼: 中立 = 暗灰, 我方 = 亮
    ctx.fillStyle = neutral ? '#3a3a40' : C('#fff6d0');
    ctx.beginPath(); ctx.arc(11, -6, 1.5, 0, Math.PI * 2); ctx.fill();
    if (!neutral) {
      // 我方圍巾
      ctx.fillStyle = C(PAL.team);
      ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(8, 2); ctx.lineTo(4, 6); ctx.lineTo(1, 1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(3, 3); ctx.lineTo(0, 9); ctx.lineTo(3, 8); ctx.closePath(); ctx.fill();
    }
  }
  function castleBody(ctx, o) {
    var C = tinter(o.tc || '#ffffff', o.ta || 0);
    ctx.lineJoin = 'round';
    function crenel(x, y, w, n) {
      var cw = w / (n * 2 - 1);
      for (var i = 0; i < n; i++) ctx.rect(x + i * cw * 2, y, cw, 6);
    }
    // 兩側塔
    ctx.beginPath(); ctx.rect(-52, -30, 26, 80); ctx.rect(26, -30, 26, 80); crenel(-52, -36, 26, 3); crenel(26, -36, 26, 3);
    ctx.fillStyle = C(PAL.stone); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C(PAL.stoneDark); ctx.stroke();
    // 中牆
    ctx.beginPath(); ctx.rect(-26, -4, 52, 54); crenel(-26, -10, 52, 5);
    ctx.fillStyle = C('#a2a4b0'); ctx.fill(); ctx.stroke();
    // 主樓
    ctx.beginPath(); ctx.rect(-16, -36, 32, 40); crenel(-16, -42, 32, 3);
    ctx.fillStyle = C(PAL.stoneLight); ctx.fill(); ctx.stroke();
    // 門
    ctx.beginPath(); ctx.moveTo(-10, 50); ctx.lineTo(-10, 30); ctx.arc(0, 30, 10, Math.PI, 0); ctx.lineTo(10, 50); ctx.closePath();
    ctx.fillStyle = C('#2a2016'); ctx.fill();
    // 窗
    ctx.fillStyle = C('#2a2a36');
    ctx.fillRect(-4, -26, 8, 10); ctx.fillRect(-43, -14, 8, 10); ctx.fillRect(35, -14, 8, 10);
    // 旗
    ctx.lineWidth = 2; ctx.strokeStyle = C('#333333');
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(0, -55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -55); ctx.lineTo(16, -50); ctx.lineTo(0, -45); ctx.closePath();
    ctx.fillStyle = C(PAL.team); ctx.fill();
  }
  // 鬼的身形: 圓頂 + 波浪下緣
  function ghostPath(ctx, w, h, topY) {
    var hw = w / 2, r = hw, bot = topY + h;
    ctx.beginPath();
    ctx.moveTo(-hw, bot - 3);
    ctx.lineTo(-hw, topY + r);
    ctx.arc(0, topY + r, r, Math.PI, 0);
    ctx.lineTo(hw, bot - 3);
    var n = 3, seg = w / n;
    for (var i = 0; i < n; i++) {
      var x0 = hw - i * seg;
      ctx.quadraticCurveTo(x0 - seg / 4, bot + 2, x0 - seg / 2, bot - 3);
      ctx.quadraticCurveTo(x0 - seg * 3 / 4, bot - 8, x0 - seg, bot - 3);
    }
    ctx.closePath();
  }
  function enemyEyes(ctx, C, y, gap, dead) {
    if (dead) {
      ctx.strokeStyle = '#d8d0d8'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      [-gap, gap].forEach(function (ex) {
        ctx.beginPath(); ctx.moveTo(ex - 2.5, y - 2.5); ctx.lineTo(ex + 2.5, y + 2.5); ctx.moveTo(ex + 2.5, y - 2.5); ctx.lineTo(ex - 2.5, y + 2.5); ctx.stroke();
      });
      return;
    }
    ctx.fillStyle = C(PAL.enemyEye);
    [-1, 1].forEach(function (sd) {
      ctx.beginPath();
      ctx.moveTo(sd * gap - 3, y - 2 * sd * -1 - 1);
      ctx.lineTo(sd * gap + 3, y + 2 * sd * -1 - 1);
      ctx.lineTo(sd * gap + 2.5 * sd, y + 2.5);
      ctx.lineTo(sd * gap - 2.5 * sd, y + 2.5);
      ctx.closePath(); ctx.fill();
    });
  }
  function enemyBody(ctx, type, o) {
    var C = tinter(o.tc || '#ffffff', o.ta || 0);
    var dead = !!o.dead;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var body = PAL.enemy, edge = PAL.enemyEdge;
    if (type === 'imp') {
      // 兩支小角
      ctx.fillStyle = C('#5a3a2a');
      ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-8, -16); ctx.lineTo(-3, -11); ctx.closePath();
      ctx.moveTo(9, -8); ctx.lineTo(8, -16); ctx.lineTo(3, -11); ctx.closePath(); ctx.fill();
      ghostPath(ctx, 24, 26, -12);
      ctx.fillStyle = C(body); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C(edge); ctx.stroke();
      enemyEyes(ctx, C, -2, 5, dead);
    } else if (type === 'archer') {
      // 尖兜帽
      ctx.beginPath();
      ctx.moveTo(-12, 11); ctx.lineTo(-12, -2); ctx.quadraticCurveTo(-10, -12, 0, -16); ctx.quadraticCurveTo(10, -12, 12, -2); ctx.lineTo(12, 11);
      ctx.quadraticCurveTo(8, 15, 4, 11); ctx.quadraticCurveTo(0, 15, -4, 11); ctx.quadraticCurveTo(-8, 15, -12, 11);
      ctx.closePath();
      ctx.fillStyle = C('#2c1f36'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C(edge); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -1, 7, 6, 0, 0, Math.PI * 2); ctx.fillStyle = C('#140a18'); ctx.fill();
      enemyEyes(ctx, C, -1, 3.5, dead);
      // 骨弓(右)
      ctx.strokeStyle = C(PAL.bone); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(7, 2, 8, -1.1, 1.1); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(7 + Math.cos(-1.1) * 8, 2 + Math.sin(-1.1) * 8); ctx.lineTo(7 + Math.cos(1.1) * 8, 2 + Math.sin(1.1) * 8); ctx.stroke();
    } else if (type === 'ice') {
      // 冰晶冠
      ctx.fillStyle = C(PAL.ice); ctx.strokeStyle = C('#4d7fa8'); ctx.lineWidth = 1;
      [[-7, -9, -9, -16], [0, -11, 0, -16], [7, -9, 9, -16]].forEach(function (p) {
        ctx.beginPath(); ctx.moveTo(p[0] - 3, p[1] + 1); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[0] + 3, p[1] + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      ghostPath(ctx, 24, 26, -12);
      ctx.fillStyle = C('#2c3a5c'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C(edge); ctx.stroke();
      enemyEyes(ctx, C, -2, 5, dead);
    } else if (type === 'swift') {
      // 流線水滴, 頭朝右, 尾巴拖向左
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-15, -5); ctx.lineTo(-9, -5); ctx.moveTo(-15, 3); ctx.lineTo(-7, 3); ctx.moveTo(-13, 9); ctx.lineTo(-8, 9); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12, 2);
      ctx.quadraticCurveTo(-4, -12, 6, -11);
      ctx.arc(5, 0, 11, -Math.PI / 2, Math.PI / 2);
      ctx.quadraticCurveTo(-4, 11, -12, 2);
      ctx.closePath();
      ctx.fillStyle = C('#4a2342'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C(edge); ctx.stroke();
      if (dead) enemyEyes(ctx, C, -2, 4, true);
      else {
        ctx.fillStyle = C(PAL.enemyEye);
        ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(12, -2); ctx.lineTo(5, 0); ctx.closePath(); ctx.fill();
      }
    } else { // frostArmor 44×44
      ctx.fillStyle = C(PAL.ice); ctx.strokeStyle = C('#4d7fa8'); ctx.lineWidth = 1;
      [[-15, -6, -20, -14], [-11, -9, -14, -19], [15, -6, 20, -14], [11, -9, 14, -19]].forEach(function (p) {
        ctx.beginPath(); ctx.moveTo(p[0] - 3, p[1] + 2); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[0] + 3, p[1] + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      ghostPath(ctx, 34, 36, -17);
      ctx.fillStyle = C('#33284a'); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = C(edge); ctx.stroke();
      // 鐵甲帶與頭盔
      ctx.fillStyle = C('#7c8394');
      ctx.fillRect(-15, -8, 30, 5);
      ctx.fillRect(-14, 6, 28, 4);
      ctx.beginPath(); ctx.arc(0, -10, 11, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = C('#8b93a6'); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = C('#3c4252'); ctx.stroke();
      enemyEyes(ctx, C, -3, 6, dead);
    }
  }
  function playerBody(ctx, o) {
    var lean = o.moving ? 0.1 : 0;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 腳下標記光(玩家專屬)
    ctx.beginPath(); ctx.ellipse(0, 13, 13, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(47,214,195,0.35)'; ctx.fill();
    ctx.rotate(lean);
    // 鎚(左手)
    ctx.strokeStyle = '#4a3218'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-8, 6); ctx.lineTo(-12, -6); ctx.stroke();
    ctx.save(); ctx.translate(-12, -7); ctx.rotate(-0.32);
    rr(ctx, -5, -3, 10, 6, 1.5); ctx.fillStyle = '#c9ccd6'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#2a2d38'; ctx.stroke();
    ctx.restore();
    // 袍(白描邊, 全場唯一白描邊的角色)
    ctx.beginPath();
    ctx.moveTo(-6, -4); ctx.lineTo(6, -4); ctx.lineTo(11, 13); ctx.lineTo(-11, 13); ctx.closePath();
    ctx.fillStyle = PAL.player; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.strokeStyle = PAL.playerDark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 12); ctx.stroke();
    // 兜帽 + 臉
    ctx.beginPath(); ctx.arc(0, -7, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = PAL.player; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -6, 5, 0, Math.PI * 2); ctx.fillStyle = '#f6dcbc'; ctx.fill();
    ctx.fillStyle = '#1e1e28';
    ctx.beginPath(); ctx.arc(-2, -6.5, 1.1, 0, Math.PI * 2); ctx.arc(2, -6.5, 1.1, 0, Math.PI * 2); ctx.fill();
    if (o.moving) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(-15.5, 4); ctx.moveTo(-14, 9); ctx.lineTo(-15.5, 9); ctx.stroke();
    }
  }

  // ---------- 匯出函式 ----------
  var Art = {};
  Art.canvas = { width: 1280, height: 720 };
  Art.palette = PAL;

  // 背景: 草地 + 格線 + 路線
  var TUFTS = (function () {
    var out = [], seed = 1337;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (var i = 0; i < 220; i++) out.push([rnd() * 1280, 50 + rnd() * 670, 0.6 + rnd() * 0.8]);
    return out;
  })();
  function pathStroke(ctx, pts, w, color) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; ctx.stroke();
  }
  Art.drawBackground = function (ctx) {
    ctx.save();
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(0, 0, 1280, 720);
    // 草叢點(圓點, 不用尖角)
    ctx.fillStyle = PAL.grassTuft;
    for (var t = 0; t < TUFTS.length; t++) {
      var p = TUFTS[t];
      ctx.beginPath(); ctx.ellipse(p[0], p[1], 5 * p[2], 2.5 * p[2], 0, 0, Math.PI * 2); ctx.fill();
    }
    // 蓋塔格線(格子中心 (24+48i, 74+48j))
    ctx.strokeStyle = PAL.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i <= 26; i++) { ctx.moveTo(i * 48 + 0.5, 50); ctx.lineTo(i * 48 + 0.5, 50 + 14 * 48); }
    for (var j = 0; j <= 14; j++) { ctx.moveTo(0, 50 + j * 48 + 0.5); ctx.lineTo(1280, 50 + j * 48 + 0.5); }
    ctx.stroke();
    // 路線: 全寬 56(邊色在內側)
    pathStroke(ctx, PATH_PTS, 56, PAL.pathEdge);
    pathStroke(ctx, PATH_PTS, 48, PAL.path);
    ctx.setLineDash([14, 18]);
    pathStroke(ctx, PATH_PTS, 2, PAL.pathRut);
    ctx.setLineDash([]);
    ctx.restore();
  };

  // 陣紋
  function capsulePath(ctx, len, R) {
    ctx.beginPath();
    ctx.arc(0, 0, R, Math.PI / 2, Math.PI * 1.5);
    ctx.lineTo(len, -R);
    ctx.arc(len, 0, R, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
  }
  function linkLine(ctx, kind, a, b, col, k) {
    // 在已旋轉的座標系上, 從 x=a 畫到 x=b, 寬度 ≤ 8(tick 時至多 10)
    if (b - a < 0.5) return;
    var x;
    var boost = k;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = col; ctx.shadowBlur = 6 + 6 * boost;
    if (kind === 'blade') {
      // 刃紋: 鋸齒線(振幅 3)
      var amp = 2.5 + 1 * boost;
      ctx.beginPath(); ctx.moveTo(a, 0);
      var up = true;
      for (x = a + 5; x < b; x += 5) { ctx.lineTo(x, up ? -amp : amp); up = !up; }
      ctx.lineTo(b, 0);
      ctx.lineWidth = 2.5 + 1.5 * boost; ctx.strokeStyle = boost > 0 ? mix(col, '#ffffff', 0.45 * boost) : col; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(a, 0); ctx.lineTo(b, 0); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke();
    } else if (kind === 'frost') {
      // 霜紋: 雙細線 + 冰晶菱
      ctx.lineWidth = 1.6; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(a, -2.6); ctx.lineTo(b, -2.6); ctx.moveTo(a, 2.6); ctx.lineTo(b, 2.6); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#e6f4ff';
      for (x = a + 11; x < b - 4; x += 22) {
        ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + 3, 0); ctx.lineTo(x, 4); ctx.lineTo(x - 3, 0); ctx.closePath(); ctx.fill();
      }
    } else {
      // 箭紋: 直線 + 等距羽標
      ctx.lineWidth = 3 + 2 * boost; ctx.strokeStyle = boost > 0 ? mix(col, '#ffffff', 0.45 * boost) : col;
      ctx.beginPath(); ctx.moveTo(a, 0); ctx.lineTo(b, 0); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (x = a + 9; x < b - 3; x += 16) { ctx.moveTo(x - 2.5, -3.5 - boost); ctx.lineTo(x, 0); ctx.lineTo(x - 2.5, 3.5 + boost); }
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a, 0); ctx.lineTo(b, 0); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
    }
    ctx.restore();
  }
  Art.drawLink = function (ctx, state) {
    var s = obj(state);
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0);
    var kind = pick(s.kind, ['frost', 'blade', 'arrow'], 'arrow');
    var R = Math.max(0, num(s.reach, 80));
    var col = LINK_COL[kind];
    var form = prog(s.formAge, s.formDuration);
    var k = kind === 'frost' ? 0 : 1 - prog(s.tickAge, s.tickDuration);
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(Math.atan2(dy, dx));
    // (2) 判定帶: 外緣 = reach
    if (R > 1) {
      capsulePath(ctx, len, R);
      ctx.fillStyle = rgba(col, (kind === 'frost' ? 0.12 : 0.10) * (0.4 + 0.6 * form));
      ctx.fill();
      capsulePath(ctx, len, R - 1);
      ctx.setLineDash([10, 7]);
      ctx.lineWidth = 2; ctx.strokeStyle = rgba(col, 0.38 * (0.4 + 0.6 * form));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // (1) 線段: 從兩端往中間長出
    var half = len * form / 2;
    linkLine(ctx, kind, 0, half, col, k);
    linkLine(ctx, kind, len - half, len, col, k);
    // 端點小光點
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.arc(len, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  Art.drawCastle = function (ctx, state) {
    var s = obj(state);
    var x = num(s.x, 1180), y = num(s.y, 626);
    var hit = prog(s.hitAge, s.hitDuration), atk = prog(s.attackAge, s.attackDuration);
    var zone = !!s.zoneActive;
    ctx.save();
    ctx.translate(x, y);
    // 主堡區(半徑 110 外緣), 畫在本體下面
    ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2);
    ctx.fillStyle = rgba(PAL.team, zone ? 0.16 : 0.05); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 109, 0, Math.PI * 2);
    if (!zone) ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(PAL.team, zone ? 0.85 : 0.3); ctx.stroke();
    ctx.setLineDash([]);
    if (zone) keycap(ctx, '空白鍵', -92, -66, 52, 20);
    // 本體
    var dy = atk < 1 ? -3 * Math.sin(atk * Math.PI) : 0;
    ctx.save();
    ctx.translate(0, dy);
    castleBody(ctx, { tc: PAL.danger, ta: hit < 1 ? 0.65 * (1 - hit) : 0 });
    ctx.restore();
    if (s.targeted) targetFrame(ctx, 112, 112);
    ctx.restore();
  };

  function unitDraw(ctx, s, unit, w, h, extra) {
    var x = num(s.x, 0), y = num(s.y, 0);
    var atk = prog(s.attackAge, s.attackDuration);
    var dy = atk < 1 ? -4 * Math.sin(atk * Math.PI) : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.save();
    ctx.translate(0, dy);
    unitBody(ctx, unit, extra);
    ctx.restore();
    if (s.targeted) targetFrame(ctx, w, h);
    ctx.restore();
  }
  Art.drawTower = function (ctx, state) {
    var s = obj(state);
    unitDraw(ctx, s, 'tower', 48, 48, { moving: !!s.moving });
  };
  Art.drawStele = function (ctx, state) {
    var s = obj(state);
    unitDraw(ctx, { x: s.x, y: s.y, targeted: s.targeted }, 'stele', 32, 32, {});
  };
  Art.drawSoldier = function (ctx, state) {
    var s = obj(state);
    unitDraw(ctx, s, 'soldier', 32, 32, { moving: !!s.moving });
  };
  Art.drawWolf = function (ctx, state) {
    var s = obj(state);
    unitDraw(ctx, s, 'wolf', 36, 36, { moving: !!s.moving, team: pick(s.team, ['neutral', 'ally'], 'neutral') });
  };

  var ENEMY_SIZE = { imp: 32, archer: 32, ice: 32, swift: 32, frostArmor: 44 };
  Art.drawEnemy = function (ctx, state) {
    var s = obj(state);
    var type = pick(s.type, ENEMY_TYPES, 'imp');
    var sz = ENEMY_SIZE[type];
    var x = num(s.x, 0), y = num(s.y, 0);
    var hit = prog(s.hitAge, s.hitDuration);
    ctx.save();
    ctx.translate(x, y);
    var tc = null, ta = 0;
    if (hit < 1) { tc = '#ffffff'; ta = 0.75 * (1 - hit); }
    else if (s.slowed) { tc = PAL.slowed; ta = 0.45; }
    ctx.save();
    if (sz === 32) ctx.scale(0.94, 0.94);
    enemyBody(ctx, type, { tc: tc || '#ffffff', ta: ta });
    // 減速中且同時受擊: 受擊閃白優先, 減速改在下緣一條冰藍細線(框內)
    if (hit < 1 && s.slowed) {
      ctx.strokeStyle = PAL.slowed; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-sz * 0.35, sz / 2 - 2); ctx.lineTo(sz * 0.35, sz / 2 - 2); ctx.stroke();
    }
    ctx.restore();
    if (s.moving === false) {
      // 呆站: 頭頂問號(框內)
      txt(ctx, '?', sz / 2 - 9, -sz / 2 + 9, 13, '#ffe680', 'center', { outlineW: 3 });
    }
    var hp = num(s.hp, 0), mx = num(s.maxHp, 0);
    if (mx > 0 && hp < mx) {
      var f = clamp(hp / mx, 0, 1);
      var by = -sz / 2 - 6;
      ctx.fillStyle = '#120a10';
      ctx.fillRect(-sz / 2, by - 2, sz, 4);
      ctx.fillStyle = PAL.danger;
      ctx.fillRect(-sz / 2, by - 2, sz * f, 4);
    }
    if (s.targeted) targetFrame(ctx, sz, sz);
    ctx.restore();
  };

  Art.drawCorpse = function (ctx, state) {
    var s = obj(state);
    var type = pick(s.kind, ENEMY_TYPES, 'imp');
    var sz = ENEMY_SIZE[type];
    var x = num(s.x, 0), y = num(s.y, 0);
    var life = num(s.life, 15), maxLife = num(s.maxLife, 15);
    var blinkOff = life < 3 && (Math.floor(life * 6) % 2 === 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = blinkOff ? 0.25 : 0.9;
    // 倒下: 壓扁並貼地, 灰化, 叉叉眼
    ctx.save();
    ctx.translate(0, sz * 0.18);
    ctx.scale(0.94, 0.55);
    enemyBody(ctx, type, { tc: '#8a8090', ta: 0.55, dead: true });
    ctx.restore();
    // 剩餘時間: 框內底部細條
    if (maxLife > 0) {
      var f = clamp(life / maxLife, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-sz / 2 + 3, sz / 2 - 4, sz - 6, 3);
      ctx.fillStyle = life < 3 ? PAL.danger : '#d8d0d8';
      ctx.fillRect(-sz / 2 + 3, sz / 2 - 4, (sz - 6) * f, 3);
    }
    ctx.globalAlpha = 1;
    if (s.targeted) targetFrame(ctx, sz, sz);
    ctx.restore();
  };

  Art.drawGroundPart = function (ctx, state) {
    var s = obj(state);
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.ellipse(0, 10, 12, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 10, 12, 3.5, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
    itemIcon(ctx, s.item, 0, -3, 20);
    if (s.targeted) targetFrame(ctx, 28, 28);
    ctx.restore();
  };

  Art.drawCoin = function (ctx, state) {
    var s = obj(state);
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = PAL.coin; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.coinEdge; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(140,90,0,0.8)'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(-2.5, -2.5, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  function heldItem(ctx, item, cx, cy) {
    if (!itemKind(item)) return;
    ctx.save();
    ctx.translate(cx, cy);
    // 捧著: 底下一雙手 + 白色外光框(和頭上槽列的深色格子不同)
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 5;
    rr(ctx, -9.5, -11, 19, 19, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
    ctx.shadowBlur = 0;
    itemIcon(ctx, item, 0, -1.5, 16);
    ctx.fillStyle = '#f6dcbc'; ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(-5.5, 8.5, 4.5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(5.5, 8.5, 4.5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  Art.drawPlayer = function (ctx, state) {
    var s = obj(state);
    var x = num(s.x, 0), y = num(s.y, 0);
    var atk = prog(s.attackAge, s.attackDuration);
    var push = atk < 1 ? 4 * Math.sin(atk * Math.PI) : 0;
    ctx.save();
    ctx.translate(x, y);
    // 搶奪環: 外緣半徑 24, 寬 4, 從正上方順時針
    if (s.stealing) {
      var p = clamp(num(s.stealProgress, 0), 0, 1);
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,20,25,0.6)'; ctx.stroke();
      if (p > 0) {
        ctx.beginPath(); ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
        ctx.strokeStyle = PAL.player; ctx.lineCap = 'butt'; ctx.stroke();
      }
    }
    ctx.save();
    ctx.translate(push * 0.6, -push * 0.8);
    playerBody(ctx, { moving: !!s.moving });
    ctx.restore();
    if (s.handItem) heldItem(ctx, s.handItem, 28, 0);
    ctx.restore();
  };

  var PREVIEW_SIZE = { tower: 48, stele: 32, soldier: 32, wolf: 36 };
  Art.drawPlacePreview = function (ctx, state) {
    var s = obj(state);
    var kind = pick(s.kind, ['tower', 'stele', 'soldier', 'wolf'], 'tower');
    var valid = !!s.valid;
    var col = valid ? PAL.valid : PAL.invalid;
    var frame = (kind === 'tower' || kind === 'stele') ? 48 : PREVIEW_SIZE[kind];
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    ctx.fillStyle = rgba(col, 0.18);
    ctx.fillRect(-frame / 2, -frame / 2, frame, frame);
    ctx.lineWidth = 2; ctx.strokeStyle = col;
    if (kind === 'soldier' || kind === 'wolf') ctx.setLineDash([5, 4]);
    ctx.strokeRect(-frame / 2 + 1, -frame / 2 + 1, frame - 2, frame - 2);
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.5;
    unitBody(ctx, kind, { tc: col, ta: 0.35, team: 'ally' });
    ctx.globalAlpha = 1;
    if (!valid) {
      var d = frame / 2 - 6;
      ctx.lineCap = 'round';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.moveTo(-d, -d); ctx.lineTo(d, d); ctx.moveTo(d, -d); ctx.lineTo(-d, d); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = PAL.invalid; ctx.stroke();
    }
    ctx.restore();
  };

  function slotRow(ctx, x, y, slots) {
    var n = slots.length;
    if (n < 1) return;
    ctx.save();
    ctx.translate(x, y);
    rr(ctx, -n * 10, -10, n * 20, 20, 4);
    ctx.fillStyle = 'rgba(12,12,20,0.78)'; ctx.fill();
    for (var i = 0; i < n; i++) {
      var cx = -(n - 1) * 10 + i * 20;
      var it = slots[i];
      if (itemKind(it)) {
        itemIcon(ctx, it, cx, 0, 16);
      } else {
        ctx.setLineDash([3, 2]);
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(200,200,215,0.55)';
        ctx.strokeRect(cx - 7.5, -7.5, 15, 15);
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }
  Art.drawSoulSlots = function (ctx, state) {
    var s = obj(state);
    var slots = Array.isArray(s.slots) ? s.slots.slice(0, 4) : [];
    slotRow(ctx, num(s.x, 0), num(s.y, 0), slots);
  };

  var AURA_DOTS = [[0.3, 40], [1.4, 55], [2.3, 33], [3.3, 58], [4.2, 44], [5.3, 52]];
  Art.drawFrostAura = function (ctx, state) {
    var s = obj(state);
    var r = clamp(num(s.radius, 70), 0, 70);
    if (r <= 0) return;
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,236,255,0.12)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.setLineDash([2, 6]); ctx.lineCap = 'round';
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(225,245,255,0.7)'; ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(235,248,255,0.55)'; ctx.lineWidth = 1;
    for (var i = 0; i < AURA_DOTS.length; i++) {
      var a = AURA_DOTS[i][0], d = AURA_DOTS[i][1] * r / 70;
      var px = Math.cos(a) * d, py = Math.sin(a) * d;
      ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py); ctx.moveTo(px, py - 3); ctx.lineTo(px, py + 3); ctx.stroke();
    }
    ctx.restore();
  };

  Art.drawProjectile = function (ctx, state) {
    var s = obj(state);
    var kind = pick(s.kind, ['normal', 'ice'], 'normal');
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    ctx.rotate(num(s.angle, 0));
    if (kind === 'ice') {
      ctx.beginPath(); ctx.moveTo(4.2, 0); ctx.lineTo(0, -2.8); ctx.lineTo(-4.2, 0); ctx.lineTo(0, 2.8); ctx.closePath();
      ctx.fillStyle = '#e6f6ff'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.frost; ctx.stroke();
      ctx.fillStyle = PAL.frost;
      ctx.beginPath(); ctx.arc(-3.5, 0, 1.2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.lineCap = 'round';
      ctx.lineWidth = 2; ctx.strokeStyle = '#3a2a08';
      ctx.beginPath(); ctx.moveTo(-4.5, 0); ctx.lineTo(2, 0); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.strokeStyle = PAL.ranged; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(1, -2.6); ctx.lineTo(1, 2.6); ctx.closePath();
      ctx.fillStyle = '#fff3c0'; ctx.fill();
    }
    ctx.restore();
  };

  Art.drawPierceBeam = function (ctx, state) {
    var s = obj(state);
    var p = prog(s.age, s.duration);
    if (p >= 1) return;
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0);
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    var a = 1 - p;
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.lineCap = 'butt';
    // 外帶(判定線寬 28)
    ctx.fillStyle = rgba(PAL.ranged, 0.28 * a);
    ctx.fillRect(0, -14, len, 28);
    ctx.fillStyle = rgba('#fff3c0', 0.6 * a);
    ctx.fillRect(0, -6 * (1 - 0.4 * p), len, 12 * (1 - 0.4 * p));
    ctx.fillStyle = rgba('#ffffff', a);
    ctx.fillRect(0, -1.5, len, 3);
    // 射手端閃光
    ctx.beginPath(); ctx.arc(0, 0, 10 * a + 2, -Math.PI / 2, Math.PI / 2);
    ctx.fillStyle = rgba('#ffffff', 0.8 * a); ctx.fill();
    ctx.restore();
  };

  Art.drawAreaHit = function (ctx, state) {
    var s = obj(state);
    var kind = pick(s.kind, ['whirl', 'frostSmash'], 'whirl');
    var R = clamp(num(s.radius, 60), 0, 60);
    var p = prog(s.age, s.duration);
    if (p >= 1 || R <= 4) return;
    var a = 1 - p;
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    if (kind === 'whirl') {
      var rot = p * Math.PI * 2;
      ctx.lineCap = 'round';
      for (var i = 0; i < 3; i++) {
        var st = rot + i * Math.PI * 2 / 3;
        ctx.beginPath(); ctx.arc(0, 0, R - 4, st, st + 1.4);
        ctx.lineWidth = 6; ctx.strokeStyle = rgba(PAL.melee, 0.85 * a); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R - 4, st + 0.4, st + 1.4);
        ctx.lineWidth = 2; ctx.strokeStyle = rgba('#ffffff', a); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, R - 1, 0, Math.PI * 2);
      ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(PAL.melee, 0.4 * a); ctx.stroke();
    } else {
      var rr2 = 8 + Math.max(0, R - 14) * Math.min(1, p * 1.6);
      ctx.beginPath(); ctx.arc(0, 0, rr2, 0, Math.PI * 2);
      ctx.fillStyle = rgba(PAL.slowed, 0.18 * a); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = rgba(PAL.frost, 0.9 * a); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = rgba('#ffffff', a); ctx.stroke();
      ctx.fillStyle = rgba('#e6f6ff', a);
      for (var j = 0; j < 6; j++) {
        var an = j * Math.PI / 3 + 0.3;
        var px = Math.cos(an) * rr2, py = Math.sin(an) * rr2;
        ctx.save(); ctx.translate(px, py); ctx.rotate(an);
        ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(0, -3); ctx.lineTo(-4, 0); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  };

  Art.drawHitSpark = function (ctx, state) {
    var s = obj(state);
    var p = prog(s.age, s.duration);
    if (p >= 1) return;
    var a = 1 - p;
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    ctx.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var an = i * Math.PI / 4 + 0.2;
      var r0 = 2 + 5 * p, r1 = 6 + 4.5 * Math.min(1, p * 2);
      ctx.beginPath(); ctx.moveTo(Math.cos(an) * r0, Math.sin(an) * r0); ctx.lineTo(Math.cos(an) * r1, Math.sin(an) * r1);
      ctx.lineWidth = i % 2 ? 1.5 : 2.5; ctx.strokeStyle = rgba(i % 2 ? '#fff3c0' : '#ffffff', a); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 3 * a + 1, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#ffffff', a); ctx.fill();
    ctx.restore();
  };

  Art.drawStealLink = function (ctx, state) {
    var s = obj(state);
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0);
    var p = clamp(num(s.progress, 0), 0, 1);
    var dx = x1 - x2, dy = y1 - y2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1);
    ctx.lineWidth = 1.5 + 2 * p; ctx.strokeStyle = rgba(PAL.player, 0.45 + 0.5 * p); ctx.stroke();
    ctx.setLineDash([]);
    // 往玩家流動的魂光點(由敵人 → 玩家)
    for (var i = 0; i < 5; i++) {
      var f = (i / 5 + p * 2.5) % 1;
      ctx.beginPath(); ctx.arc(x2 + dx * f, y2 + dy * f, 2 + 1.5 * p, 0, Math.PI * 2);
      ctx.fillStyle = rgba('#e6fffb', 0.5 + 0.5 * p); ctx.fill();
    }
    // 被搶那一格: 青色鉤框
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.player;
    ctx.strokeRect(x2 - 10, y2 - 10, 20, 20);
    ctx.restore();
  };

  function linkKindFromName(name) {
    if (name.indexOf('霜') >= 0) return 'frost';
    if (name.indexOf('刃') >= 0) return 'blade';
    return 'arrow';
  }
  Art.drawComboName = function (ctx, state) {
    var s = obj(state);
    var kind = pick(s.kind, ['fuse', 'newCombo', 'link', 'newLink'], 'fuse');
    var name = str(s.name);
    var p = prog(s.age, s.duration);
    if (p >= 1) return;
    var big = kind === 'newCombo' || kind === 'newLink';
    var boxW = big ? 280 : 200, boxH = big ? 48 : 36;
    // 位移從 +4 飄到 −7; 彈跳最大 1.2 倍 → 底板高受兩者疊加限制
    var drift = 4 - 11 * p;
    var sc = p < 0.16 ? 1 + 0.2 * Math.sin(p / 0.16 * Math.PI) : 1;
    var ph = big ? 30 : 20;
    var maxW = Math.floor((boxW - 4) / 1.2);
    var label = kind === 'fuse' ? '合成! ' + name : kind === 'newCombo' ? '新組合! ' + name : kind === 'newLink' ? '新陣紋! ' + name : name;
    var px = big ? 18 : 14;
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0) + drift);
    ctx.scale(sc, sc);
    ctx.globalAlpha = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
    ctx.font = font(px);
    var tw = measure(ctx, label);
    while (tw > maxW - 20 && px > 10) { px -= 1; ctx.font = font(px); tw = measure(ctx, label); }
    var pw = Math.min(maxW, tw + 24);
    var isCombo = kind === 'fuse' || kind === 'newCombo';
    if (isCombo) {
      // 組合類: 方角底板 + 金邊(呼應組合魂件的金鑲邊)
      rr(ctx, -pw / 2, -ph / 2, pw, ph, 3);
      ctx.fillStyle = big ? PAL.comboEdge : '#2a2112'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = big ? '#fff6c8' : PAL.comboEdge; ctx.stroke();
      if (big) {
        rr(ctx, -pw / 2 + 3, -ph / 2 + 3, pw - 6, ph - 6, 2);
        ctx.lineWidth = 1; ctx.strokeStyle = '#8a6a10'; ctx.stroke();
      }
      txt(ctx, label, 0, 0, px, big ? '#2a1a00' : '#ffe9a0', 'center', { outline: !big });
    } else {
      // 陣紋類: 膠囊底板 + 該紋種色(呼應陣紋)
      var col = LINK_COL[linkKindFromName(name)];
      rr(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);
      ctx.fillStyle = big ? col : 'rgba(14,16,24,0.88)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = big ? '#ffffff' : col; ctx.stroke();
      txt(ctx, label, 0, 0, px, big ? '#10121a' : col, 'center', { outline: !big });
    }
    ctx.restore();
  };

  Art.drawSpawnWarning = function (ctx, state) {
    var s = obj(state);
    var total = num(s.total, 6), rem = clamp(num(s.remaining, 0), 0, Math.max(total, 0));
    if (rem <= 0) return;
    var blink = (rem % 0.5) > 0.25;
    var secFrac = rem - Math.floor(rem); // 這一秒還剩多少
    if (secFrac === 0) secFrac = 1;
    ctx.save();
    ctx.translate(40, 146);
    ctx.beginPath(); ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.fillStyle = blink ? 'rgba(255,74,58,0.9)' : 'rgba(150,30,25,0.9)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,6,6,0.9)'; ctx.stroke();
    // 本秒剩餘環
    ctx.beginPath(); ctx.arc(0, 0, 29, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * secFrac);
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    // 朝右箭頭
    ctx.beginPath(); ctx.moveTo(6, -14); ctx.lineTo(22, 0); ctx.lineTo(6, 14); ctx.lineTo(6, 6); ctx.lineTo(-2, 6); ctx.lineTo(-2, -6); ctx.lineTo(6, -6); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.fill();
    txt(ctx, String(Math.ceil(rem)), -13, 1, 20, '#ffffff', 'center', { outlineW: 4 });
    ctx.restore();
  };

  function coinIcon(ctx, x, y, r) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = PAL.coin; ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.2); ctx.strokeStyle = PAL.coinEdge; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(140,90,0,0.8)'; ctx.stroke();
  }
  Art.drawHud = function (ctx, state) {
    var s = obj(state);
    var gold = Math.floor(num(s.gold, 0));
    var hp = Math.max(0, num(s.castleHp, 0)), hpMax = Math.max(1, num(s.castleMaxHp, 20));
    var wave = Math.floor(num(s.wave, 0)), tw = Math.floor(num(s.totalWaves, 6));
    var next = num(s.nextWaveIn, -1);
    ctx.save();
    ctx.fillStyle = PAL.hud; ctx.fillRect(0, 0, 1280, 50);
    ctx.fillStyle = PAL.hudLine; ctx.fillRect(0, 48, 1280, 2);
    // 金幣
    coinIcon(ctx, 26, 25, 10);
    txt(ctx, String(gold), 44, 26, 24, '#ffe08a', 'left');
    // 主堡生命
    ctx.save(); ctx.translate(162, 25); ctx.scale(0.24, 0.24); castleBody(ctx, {}); ctx.restore();
    var low = hp <= hpMax * 0.25;
    txt(ctx, Math.ceil(hp) + ' / ' + hpMax, 184, 26, 22, low ? PAL.danger : PAL.text, 'left');
    var bx = 278, bw = 120;
    ctx.fillStyle = '#2a2d3a'; ctx.fillRect(bx, 20, bw, 10);
    ctx.fillStyle = low ? PAL.danger : PAL.team; ctx.fillRect(bx, 20, bw * clamp(hp / hpMax, 0, 1), 10);
    ctx.lineWidth = 1; ctx.strokeStyle = '#555a70'; ctx.strokeRect(bx + 0.5, 20.5, bw - 1, 9);
    // 波次
    txt(ctx, '第 ' + wave + ' / ' + tw + ' 波', 450, 26, 22, PAL.text, 'left');
    if (next >= 0) {
      txt(ctx, '下一波', 600, 26, 16, PAL.textDim, 'left');
      txt(ctx, Math.ceil(next) + ' 秒', 654, 26, 22, Math.ceil(next) <= 6 ? '#ffb36b' : PAL.text, 'left');
    }
    // 右側操作提示
    var items = [['Z', '互動'], ['X', '自己'], ['空白鍵', '商店']];
    var x = 1266;
    for (var i = items.length - 1; i >= 0; i--) {
      ctx.font = font(14, 'normal');
      var lw = measure(ctx, items[i][1]);
      txt(ctx, items[i][1], x, 26, 14, PAL.textDim, 'right', { weight: 'normal', outline: false });
      x -= lw + 6;
      var kw = items[i][0].length > 1 ? 46 : 22;
      keycap(ctx, items[i][0], x - kw / 2, 25, kw, 20);
      x -= kw + 16;
    }
    ctx.restore();
  };

  Art.drawSlowMo = function (ctx) {
    ctx.save();
    // 去色(全畫面合成, 作用範圍本來就是整張)
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // 偏冷
    ctx.fillStyle = 'rgba(40,80,140,0.16)';
    ctx.fillRect(0, 0, 1280, 720);
    // 暗角
    if (ctx.createRadialGradient) {
      var g = ctx.createRadialGradient(640, 360, 280, 640, 360, 760);
      if (g && g.addColorStop) {
        g.addColorStop(0, 'rgba(0,8,24,0)');
        g.addColorStop(1, 'rgba(0,8,24,0.6)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1280, 720);
      }
    }
    // 外框
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(159,224,255,0.9)';
    ctx.strokeRect(4, 4, 1272, 712);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.strokeRect(12, 12, 1256, 696);
    // 字樣
    rr(ctx, 640 - 78, 80 - 20, 156, 40, 20);
    ctx.fillStyle = 'rgba(10,22,40,0.85)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.slowTint; ctx.stroke();
    // 沙漏小圖
    ctx.save(); ctx.translate(640 - 50, 80);
    ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(7, -10); ctx.lineTo(-7, 10); ctx.lineTo(7, 10); ctx.closePath();
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.slowTint; ctx.stroke();
    ctx.restore();
    txt(ctx, '慢動作', 652, 81, 22, '#e6f7ff', 'center');
    ctx.restore();
  };

  function popupCellBg(ctx, cx, cy) {
    rr(ctx, cx - 20, cy - 20, 40, 40, 6);
    ctx.fillStyle = PAL.cell; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.cellEdge; ctx.stroke();
  }
  function emptyMark(ctx, cx, cy) {
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(200,200,215,0.45)';
    ctx.strokeRect(cx - 13, cy - 13, 26, 26);
    ctx.setLineDash([]);
  }
  function soulPopup(ctx, s) {
    var x = num(s.x, 640), y = num(s.y, 360);
    var slots = Array.isArray(s.slots) ? s.slots.slice(0, 4) : [];
    var drop = !!s.dropCell;
    var n = Math.max(1, slots.length + (drop ? 1 : 0));
    var w = num(s.w, n * 48 + 120), h = num(s.h, 116);
    if (w < n * 48 + 120) w = n * 48 + 120;
    if (h < 116) h = 116;
    var idx = Math.floor(num(s.index, 0));
    var dx = shakeDx(s.shakeAge, s.shakeDuration);
    ctx.save();
    ctx.translate(x + dx, y);
    rr(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 10);
    ctx.fillStyle = 'rgba(22,24,34,0.97)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.panelEdge; ctx.stroke();
    txt(ctx, str(s.title), 0, -43, 14, PAL.text, 'center');
    var i, cx;
    for (i = 0; i < n; i++) {
      cx = -w / 2 + 40 + 48 * i;
      if (i < slots.length) {
        popupCellBg(ctx, cx, -4);
        if (itemKind(slots[i])) itemIcon(ctx, slots[i], cx, -4, 32);
        else emptyMark(ctx, cx, -4);
      } else {
        // 丟下格: 斜線底 + 往下箭頭落到地面
        ctx.save();
        rr(ctx, cx - 20, -24, 40, 40, 6);
        ctx.fillStyle = '#2e2620'; ctx.fill();
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,190,120,0.14)'; ctx.lineWidth = 4;
        ctx.beginPath();
        for (var k = -40; k < 40; k += 9) { ctx.moveTo(cx + k, -24); ctx.lineTo(cx + k + 40, 16); }
        ctx.stroke();
        ctx.restore();
        rr(ctx, cx - 20, -24, 40, 40, 6);
        ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = '#c8a070'; ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#ffd9a8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx, -19); ctx.lineTo(cx, -7); ctx.moveTo(cx - 5, -12); ctx.lineTo(cx, -6); ctx.lineTo(cx + 5, -12);
        ctx.moveTo(cx - 9, -2); ctx.lineTo(cx + 9, -2); ctx.stroke();
        txt(ctx, '丟下', cx, 8, 11, '#ffd9a8', 'center', { outlineW: 2 });
      }
    }
    // 分隔線 + 手上格
    var hx = w / 2 - 44;
    ctx.strokeStyle = 'rgba(159,224,255,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(w / 2 - 86, -32); ctx.lineTo(w / 2 - 86, 24); ctx.stroke();
    txt(ctx, '手上', hx, -30, 11, PAL.player, 'center', { outlineW: 2 });
    rr(ctx, hx - 20, -24, 40, 40, 6);
    ctx.fillStyle = '#20343a'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.player; ctx.stroke();
    if (itemKind(s.hand)) itemIcon(ctx, s.hand, hx, -4, 32);
    else emptyMark(ctx, hx, -4);
    // 游標
    if (idx >= 0 && idx < n) {
      cx = -w / 2 + 40 + 48 * idx;
      ctx.save();
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
      ctx.lineWidth = 3; ctx.strokeStyle = PAL.cursor;
      rr(ctx, cx - 23, -27, 46, 46, 8); ctx.stroke();
      ctx.restore();
    }
    // 底部一行
    var act = str(s.actionLabel);
    if (act) {
      keycap(ctx, 'Z', -w / 2 + 20, 40, 18, 18);
      txt(ctx, act, -w / 2 + 34, 40, 15, '#ffe9a0', 'left');
    }
    txt(ctx, 'Z 確定  X 關閉', w / 2 - 12, 40, 11, PAL.textDim, 'right', { weight: 'normal', outlineW: 2 });
    ctx.restore();
  }
  Art.drawSoulPopup = function (ctx, state) { soulPopup(ctx, obj(state)); };

  function lockIcon(ctx, cx, cy, s) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.lineWidth = s * 0.14; ctx.strokeStyle = '#9a9cab';
    ctx.beginPath(); ctx.arc(0, -s * 0.12, s * 0.24, Math.PI, 0); ctx.stroke();
    rr(ctx, -s * 0.36, -s * 0.12, s * 0.72, s * 0.5, s * 0.08);
    ctx.fillStyle = '#9a9cab'; ctx.fill();
    ctx.fillStyle = '#2a2d3b'; ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function shopCell(ctx, cx, cy, e, row, selected) {
    e = obj(e);
    var st = pick(e.state, ['ok', 'poor', 'locked'], 'ok');
    var undiscovered = row === 1 && st === 'locked';
    ctx.save();
    ctx.translate(cx, cy);
    rr(ctx, -40, -36, 80, 72, 8);
    ctx.fillStyle = undiscovered ? '#211d2e' : (st === 'locked' ? '#1f2029' : PAL.cell); ctx.fill();
    if (undiscovered) ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5; ctx.strokeStyle = undiscovered ? '#7e6aa8' : (row === 1 ? PAL.comboEdge : PAL.cellEdge); ctx.stroke();
    ctx.setLineDash([]);
    if (undiscovered) {
      txt(ctx, '???', 0, -8, 22, '#b9a6e6', 'center');
    } else if (st === 'locked') {
      lockIcon(ctx, 0, -10, 28);
    } else {
      itemIcon(ctx, e.item, 0, -14, 30);
      txt(ctx, str(e.name), 0, 11, 12, PAL.text, 'center', { outlineW: 2 });
    }
    // 價格
    var price = String(Math.floor(num(e.price, 0)));
    var priceCol = st === 'poor' ? PAL.danger : (st === 'locked' ? '#777a88' : '#ffe08a');
    coinIcon(ctx, -12, 26, 5);
    txt(ctx, price, -4, 27, 13, priceCol, 'left', { outlineW: 2 });
    if (st === 'poor') {
      rr(ctx, -40, -36, 80, 72, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
      txt(ctx, price, -4, 27, 13, PAL.danger, 'left', { outlineW: 2 });
    }
    if (selected) {
      ctx.save();
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
      ctx.lineWidth = 3; ctx.strokeStyle = PAL.cursor;
      rr(ctx, -43, -39, 86, 78, 10); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  function shopPopup(ctx, s) {
    var row0 = Array.isArray(s.row0) ? s.row0.slice(0, 8) : [];
    var row1 = Array.isArray(s.row1) ? s.row1.slice(0, 5) : [];
    var cr = num(s.cursorRow, 0) === 1 ? 1 : 0;
    var ci = Math.floor(num(s.cursorIndex, 0));
    var dx = shakeDx(s.shakeAge, s.shakeDuration);
    ctx.save();
    ctx.translate(640 + dx, 400);
    rr(ctx, -379, -119, 758, 238, 12);
    ctx.fillStyle = 'rgba(22,24,34,0.97)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.panelEdge; ctx.stroke();
    txt(ctx, '商店', 0, -102, 18, PAL.text, 'center');
    var i;
    for (i = 0; i < row0.length; i++) shopCell(ctx, i * 88 - (row0.length - 1) * 44, -32, row0[i], 0, cr === 0 && ci === i);
    for (i = 0; i < row1.length; i++) shopCell(ctx, i * 88 - (row1.length - 1) * 44, 56, row1[i], 1, cr === 1 && ci === i);
    var r1left = -(row1.length * 88 - 8) / 2;
    txt(ctx, '組合魂件', r1left - 16, 56, 13, PAL.comboEdge, 'right', { outlineW: 2 });
    var msg = str(s.message);
    if (msg) txt(ctx, msg, -364, 106, 14, PAL.danger, 'left');
    txt(ctx, '←→↑↓ 選  Z 購買  X 關閉', 364, 106, 12, PAL.textDim, 'right', { weight: 'normal', outlineW: 2 });
    ctx.restore();
  }
  Art.drawShopPopup = function (ctx, state) { shopPopup(ctx, obj(state)); };

  Art.drawResult = function (ctx, state) {
    var s = obj(state);
    var win = !!s.win;
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,14,0.7)';
    ctx.fillRect(0, 0, 1280, 720);
    rr(ctx, 640 - 280, 360 - 170, 560, 340, 16);
    ctx.fillStyle = 'rgba(24,26,36,0.97)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = win ? PAL.win : PAL.lose; ctx.stroke();
    txt(ctx, win ? '勝利' : '主堡被攻陷', 640, 250, 46, win ? PAL.win : PAL.lose, 'center', { outlineW: 6 });
    txt(ctx, '第 ' + Math.floor(num(s.wave, 0)) + ' / ' + Math.floor(num(s.totalWaves, 6)) + ' 波', 640, 318, 24, PAL.text, 'center');
    txt(ctx, '發現組合 ' + Math.floor(num(s.comboCount, 0)) + ' / 5', 640, 358, 22, PAL.comboEdge, 'center');
    txt(ctx, '發現陣紋 ' + Math.floor(num(s.linkCount, 0)) + ' / 3', 640, 394, 22, '#bfe4ff', 'center');
    keycap(ctx, 'Z', 578, 460, 28, 28);
    txt(ctx, '按 Z 重新開始', 600, 460, 20, PAL.text, 'left');
    ctx.restore();
  };

  // ---------- 說明頁示意圖 ----------
  function tag(ctx, text, x, y, k, col) {
    k = k || 1;
    var px = 13 * k;
    ctx.save();
    ctx.font = font(px);
    var w = measure(ctx, text) + 12 * k, h = 20 * k;
    rr(ctx, x - w / 2, y - h / 2, w, h, 5 * k);
    ctx.fillStyle = 'rgba(10,12,20,0.85)'; ctx.fill();
    ctx.lineWidth = 1.5 * k; ctx.strokeStyle = col || 'rgba(255,255,255,0.6)'; ctx.stroke();
    txt(ctx, text, x, y + 0.5 * k, px, col || '#ffffff', 'center', { outline: false });
    ctx.restore();
  }
  function arrow(ctx, x1, y1, x2, y2, col, lw, dashed) {
    var a = Math.atan2(y2 - y1, x2 - x1), hl = 6 + lw * 2;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw;
    if (dashed) ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.8, y2 - Math.sin(a) * hl * 0.8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.45) * hl, y2 - Math.sin(a - 0.45) * hl);
    ctx.lineTo(x2 - Math.cos(a + 0.45) * hl, y2 - Math.sin(a + 0.45) * hl);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function grassPatch(ctx, w, h) {
    ctx.fillStyle = PAL.grass; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PAL.grassTuft;
    for (var t = 0; t < TUFTS.length; t++) {
      var px = TUFTS[t][0] % w, py = (TUFTS[t][1] - 50) % h;
      if (t % 3) continue;
      ctx.beginPath(); ctx.ellipse(px, py, 5 * TUFTS[t][2], 2.5 * TUFTS[t][2], 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  function pathBand(ctx, pts) { pathStroke(ctx, pts, 56, PAL.pathEdge); pathStroke(ctx, pts, 48, PAL.path); }
  function slowRegion(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(70,110,160,0.32)'; ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(159,224,255,0.9)'; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.restore();
  }
  function slowLabel(ctx, x, y) { tag(ctx, '慢動作', x, y, 1, PAL.slowTint); }
  function sub(ctx, cx, cy, sc, fn) { ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); fn(); ctx.restore(); }
  function divider(ctx, x1, y1, x2, y2) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }

  var GUIDE_VSIZE = [[1280, 720], [400, 240], [560, 300], [560, 260], [560, 280], [560, 300], [600, 320], [480, 270]];
  var GUIDE = [];

  // 第 1 頁 守住主堡: 路線全景
  GUIDE[0] = function (ctx, k) {
    Art.drawBackground(ctx);
    // 路線方向小箭頭
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.5)';
    [[200, 146, 0], [760, 146, 0], [960, 300, Math.PI / 2], [640, 434, Math.PI], [336, 530, Math.PI / 2], [700, 626, 0], [960, 626, 0]].forEach(function (p) {
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(p[2]);
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -12); ctx.lineTo(-8, 12); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
    Art.drawLink(ctx, { x1: 408, y1: 218, x2: 600, y2: 218, kind: 'arrow', reach: 80, tickAge: 0.03, tickDuration: 0.15, formAge: 0.4, formDuration: 0.4 });
    Art.drawCastle(ctx, { x: 1180, y: 626, hitAge: 0.3, hitDuration: 0.3, attackAge: 0.15, attackDuration: 0.15, zoneActive: false, targeted: false });
    Art.drawTower(ctx, { x: 408, y: 218, attackAge: 0.15, attackDuration: 0.15, moving: false, targeted: false });
    Art.drawTower(ctx, { x: 600, y: 218, attackAge: 0.15, attackDuration: 0.15, moving: false, targeted: false });
    var imp = function (x, y, hp, hit) { Art.drawEnemy(ctx, { type: 'imp', x: x, y: y, hp: hp, maxHp: 40, hitAge: hit, hitDuration: 0.2, moving: true, slowed: false, targeted: false }); };
    imp(170, 146, 40, 0.2); imp(500, 146, 22, 0.06); imp(960, 330, 40, 0.2); imp(620, 434, 40, 0.2);
    Art.drawSpawnWarning(ctx, { remaining: 3.4, total: 6 });
    tag(ctx, '出怪點', 70, 205, k, '#ffb0a8');
    tag(ctx, '主堡', 1180, 520, k, PAL.team);
    tag(ctx, '陣紋', 504, 300, k, PAL.linkArrow);
  };
  // 第 2 頁 移動與撿錢
  GUIDE[1] = function (ctx, k) {
    grassPatch(ctx, 400, 240);
    Art.drawCorpse(ctx, { kind: 'imp', x: 90, y: 160, life: 12, maxLife: 15, targeted: false });
    Art.drawSoulSlots(ctx, { x: 90, y: 132, slots: ['melee', 'march'] });
    // 金幣飛向玩家(拖尾); 三枚都在玩家 90 內(吸取距離), 才會飛
    ctx.save(); ctx.strokeStyle = 'rgba(255,191,46,0.45)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    [[164, 150], [192, 140], [218, 132]].forEach(function (c) { ctx.beginPath(); ctx.moveTo(c[0] - 18, c[1] + 6); ctx.lineTo(c[0] - 7, c[1] + 2); ctx.stroke(); });
    ctx.restore();
    Art.drawCoin(ctx, { x: 164, y: 150 }); Art.drawCoin(ctx, { x: 192, y: 140 }); Art.drawCoin(ctx, { x: 218, y: 132 });
    Art.drawPlayer(ctx, { x: 240, y: 124, moving: true, attackAge: 0.15, attackDuration: 0.15, handItem: null, stealing: false, stealProgress: 0 });
    Art.drawSoulSlots(ctx, { x: 240, y: 88, slots: ['melee', null, null] });
    keycap(ctx, '↑', 316, 98); keycap(ctx, '←', 292, 124); keycap(ctx, '↓', 316, 124); keycap(ctx, '→', 340, 124);
    // 迷你金幣讀數
    rr(ctx, 12, 12, 108, 34, 8); ctx.fillStyle = 'rgba(19,21,28,0.92)'; ctx.fill();
    coinIcon(ctx, 32, 29, 9);
    txt(ctx, '42', 48, 30, 20, '#ffe08a', 'left');
    txt(ctx, '+2', 96, 30, 16, PAL.valid, 'center');
  };
  // 第 3 頁 拿魂件
  GUIDE[2] = function (ctx, k) {
    grassPatch(ctx, 560, 300);
    // 左: 彈窗(慢動作)
    Art.drawTower(ctx, { x: 100, y: 230, attackAge: 0.15, attackDuration: 0.15, moving: false, targeted: true });
    Art.drawSoulSlots(ctx, { x: 100, y: 186, slots: ['ranged', null] });
    Art.drawPlayer(ctx, { x: 168, y: 236, moving: false, attackAge: 0.15, attackDuration: 0.15, handItem: null, stealing: false, stealProgress: 0 });
    Art.drawSoulSlots(ctx, { x: 168, y: 200, slots: ['melee', null, null] });
    slowRegion(ctx, 0, 0, 316, 300);
    soulPopup(ctx, { x: 158, y: 92, title: '箭塔', slots: ['ranged', null], dropCell: false, index: 0, hand: null, actionLabel: '拿起', shakeAge: 0.25, shakeDuration: 0.25 });
    keycap(ctx, '←', 34, 92); keycap(ctx, '→', 282, 92);
    slowLabel(ctx, 158, 20);
    divider(ctx, 322, 10, 322, 290);
    // 右上: 拿起後
    arrow(ctx, 328, 70, 352, 70, '#ffffff', 2.5);
    Art.drawPlayer(ctx, { x: 420, y: 80, moving: false, attackAge: 0.15, attackDuration: 0.15, handItem: 'ranged', stealing: false, stealProgress: 0 });
    Art.drawSoulSlots(ctx, { x: 420, y: 44, slots: ['melee', null, null] });
    tag(ctx, '拿著', 448, 112, k, PAL.player);
    divider(ctx, 330, 142, 552, 142);
    // 右下: 屍體 / 活鬼
    Art.drawCorpse(ctx, { kind: 'imp', x: 370, y: 236, life: 10, maxLife: 15, targeted: false });
    Art.drawSoulSlots(ctx, { x: 370, y: 208, slots: ['melee', 'march'] });
    tag(ctx, '屍體', 370, 274, k);
    Art.drawEnemy(ctx, { type: 'imp', x: 512, y: 244, hp: 40, maxHp: 40, hitAge: 0.2, hitDuration: 0.2, moving: true, slowed: false, targeted: true });
    Art.drawSoulSlots(ctx, { x: 512, y: 208, slots: ['melee', 'march'] });
    Art.drawPlayer(ctx, { x: 448, y: 248, moving: false, attackAge: 0.15, attackDuration: 0.15, handItem: null, stealing: true, stealProgress: 0.6 });
    Art.drawStealLink(ctx, { x1: 448, y1: 248, x2: 502, y2: 208, progress: 0.6 });
    tag(ctx, '活鬼', 512, 282, k, '#ffb0a8');
  };
  // 第 4 頁 裝上與互換
  GUIDE[3] = function (ctx, k) {
    grassPatch(ctx, 560, 260);
    function half(ox, slots, idx, hand, label, after, afterHand) {
      slowRegion(ctx, ox + 4, 4, 272, 128);
      soulPopup(ctx, { x: ox + 140, y: 66, title: '箭塔', slots: slots, dropCell: false, index: idx, hand: hand, actionLabel: label, shakeAge: 0.25, shakeDuration: 0.25 });
      arrow(ctx, ox + 140, 138, ox + 140, 160, '#ffffff', 2.5);
      Art.drawTower(ctx, { x: ox + 100, y: 216, attackAge: 0.15, attackDuration: 0.15, moving: false, targeted: false });
      Art.drawSoulSlots(ctx, { x: ox + 100, y: 172, slots: after });
      Art.drawPlayer(ctx, { x: ox + 166, y: 220, moving: false, attackAge: 0.15, attackDuration: 0.15, handItem: afterHand, stealing: false, stealProgress: 0 });
      Art.drawSoulSlots(ctx, { x: ox + 166, y: 184, slots: ['melee', null, null] });
    }
    half(0, ['ranged', null], 1, 'melee', '裝上', ['ranged', 'melee'], null);
    divider(ctx, 280, 8, 280, 252);
    half(280, ['ranged', null], 0, 'frost', '互換', ['frost', null], 'ranged');
  };
  // 第 5 頁 裝在自己身上
  GUIDE[4] = function (ctx, k) {
    grassPatch(ctx, 560, 280);
    slowRegion(ctx, 4, 4, 332, 140);
    // 自身彈窗 w = 4×48+120 = 312
    soulPopup(ctx, { x: 170, y: 76, title: '自己', slots: ['melee', null, null], dropCell: true, index: 1, hand: 'ranged', actionLabel: '裝上', shakeAge: 0.25, shakeDuration: 0.25 });
    // 反過來: 身上格 → 拿回手上; 丟下格 → 腳下
    var c0 = 170 - 156 + 40, cd = c0 + 144;
    arrow(ctx, c0, 148, c0 + 30, 196, '#ffffff', 2, true);
    Art.drawPlayer(ctx, { x: c0 + 50, y: 226, moving: false, attackAge: 0.15, attackDuration: 0.15, handItem: 'melee', stealing: false, stealProgress: 0 });
    Art.drawSoulSlots(ctx, { x: c0 + 50, y: 190, slots: [null, null, null] });
    tag(ctx, '拿回', c0 + 60, 262, k);
    arrow(ctx, cd, 148, cd + 40, 214, '#ffd9a8', 2, true);
    Art.drawGroundPart(ctx, { item: 'ranged', x: cd + 70, y: 230, targeted: false });
    Art.drawPlayer(ctx, { x: cd + 110, y: 222, moving: false, attackAge: 0.15, attackDuration: 0.15, handItem: null, stealing: false, stealProgress: 0 });
    tag(ctx, '丟下', cd + 70, 262, k, '#ffd9a8');
    divider(ctx, 344, 10, 344, 270);
    // 右: 身上 [近戰, 遠攻] 的玩家朝小鬼射擊
    Art.drawPlayer(ctx, { x: 396, y: 150, moving: false, attackAge: 0.05, attackDuration: 0.15, handItem: null, stealing: false, stealProgress: 0 });
    Art.drawSoulSlots(ctx, { x: 396, y: 114, slots: ['melee', 'ranged', null] });
    Art.drawProjectile(ctx, { x: 466, y: 150, angle: 0, kind: 'normal' });
    Art.drawEnemy(ctx, { type: 'imp', x: 528, y: 150, hp: 40, maxHp: 40, hitAge: 0.2, hitDuration: 0.2, moving: true, slowed: false, targeted: false });
    tag(ctx, '出手', 462, 196, k, PAL.ranged);
  };
  // 第 6 頁 陣紋
  GUIDE[5] = function (ctx, k) {
    grassPatch(ctx, 560, 300);
    pathBand(ctx, [[0, 164], [560, 164]]);
    Art.drawLink(ctx, { x1: 110, y1: 92, x2: 302, y2: 92, kind: 'arrow', reach: 80, tickAge: 0.03, tickDuration: 0.15, formAge: 0.4, formDuration: 0.4 });
    // 不同種: 打叉虛線
    ctx.save(); ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.moveTo(326, 92); ctx.lineTo(426, 92); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 4; ctx.strokeStyle = PAL.invalid; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(368, 84); ctx.lineTo(384, 100); ctx.moveTo(384, 84); ctx.lineTo(368, 100); ctx.stroke();
    ctx.restore();
    var tw = function (x, slots) {
      Art.drawTower(ctx, { x: x, y: 92, attackAge: 0.15, attackDuration: 0.15, moving: false, targeted: false });
      Art.drawSoulSlots(ctx, { x: x, y: 48, slots: slots });
    };
    tw(110, ['ranged', null]); tw(302, ['ranged', null]); tw(450, ['melee', null]);
    Art.drawEnemy(ctx, { type: 'imp', x: 206, y: 164, hp: 18, maxHp: 40, hitAge: 0.05, hitDuration: 0.2, moving: true, slowed: false, targeted: false });
    Art.drawEnemy(ctx, { type: 'imp', x: 470, y: 164, hp: 40, maxHp: 40, hitAge: 0.2, hitDuration: 0.2, moving: true, slowed: false, targeted: false });
    tag(ctx, '箭紋', 206, 126, k, PAL.linkArrow);
    tag(ctx, '不同種', 376, 124, k, '#ffb0a8');
    // 小圖: 自己也算一端
    ctx.save();
    ctx.beginPath(); ctx.rect(300, 206, 252, 88); ctx.clip();
    grassPatch(ctx, 600, 300);
    sub(ctx, 340, 254, 0.55, function () {
      Art.drawLink(ctx, { x1: 0, y1: 0, x2: 180, y2: 0, kind: 'arrow', reach: 80, tickAge: 0.15, tickDuration: 0.15, formAge: 0.4, formDuration: 0.4 });
      Art.drawTower(ctx, { x: 0, y: 0, attackAge: 0.15, attackDuration: 0.15, moving: false, targeted: false });
      Art.drawSoulSlots(ctx, { x: 0, y: -44, slots: ['ranged', null] });
      Art.drawPlayer(ctx, { x: 180, y: 0, moving: false, attackAge: 0.15, attackDuration: 0.15, handItem: null, stealing: false, stealProgress: 0 });
      Art.drawSoulSlots(ctx, { x: 180, y: -36, slots: ['ranged', null, null] });
    });
    ctx.restore();
    ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.strokeRect(301, 207, 250, 86); ctx.restore();
    tag(ctx, '你', 470, 280, k, PAL.player);
  };
  // 第 7 頁 購買與蓋塔
  GUIDE[6] = function (ctx, k) {
    grassPatch(ctx, 600, 320);
    // 下左: 主堡區裡的玩家(主堡自己在區內時會畫空白鍵鍵帽, 不另畫)
    sub(ctx, 110, 300, 0.85, function () {
      Art.drawCastle(ctx, { x: 0, y: 0, hitAge: 0.3, hitDuration: 0.3, attackAge: 0.15, attackDuration: 0.15, zoneActive: true, targeted: false });
      Art.drawPlayer(ctx, { x: 95, y: -40, moving: false, attackAge: 0.15, attackDuration: 0.15, handItem: null, stealing: false, stealProgress: 0 });
    });
    // 商店開著 = 慢動作: 上方整條 + 左下主堡那一角(L 形), 右下放置是之後的時刻, 不蓋
    ctx.save();
    ctx.fillStyle = 'rgba(70,110,160,0.32)';
    ctx.fillRect(0, 0, 600, 208); ctx.fillRect(0, 208, 226, 112);
    ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(598, 2); ctx.lineTo(598, 206); ctx.lineTo(224, 206); ctx.lineTo(224, 318); ctx.lineTo(2, 318); ctx.closePath();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(159,224,255,0.9)'; ctx.stroke();
    ctx.restore();
    var row0 = [
      { item: 'towerKit', name: '箭塔', price: 15, state: 'ok' }, { item: 'steleKit', name: '魂碑', price: 6, state: 'ok' },
      { item: 'soldierKit', name: '步兵', price: 12, state: 'ok' }, { item: 'ranged', name: '遠攻', price: 8, state: 'ok' },
      { item: 'melee', name: '近戰', price: 8, state: 'ok' }, { item: 'frost', name: '冰霜', price: 12, state: 'ok' },
      { item: 'slotStone', name: '擴槽石', price: 20, state: 'ok' }, { item: 'wolfKit', name: '野狼', price: 14, state: 'locked' }];
    var row1 = ['穿透箭', '冰箭', '旋風斬', '冰霜重擊', '逆襲'].map(function (n, i) { return { item: ['pierce', 'iceArrow', 'whirl', 'frostSmash', 'counter'][i], name: n, price: 24, state: 'locked' }; });
    sub(ctx, 300 - 640 * 0.74, 104 - 400 * 0.74, 0.74, function () {
      shopPopup(ctx, { row0: row0, row1: row1, cursorRow: 0, cursorIndex: 0, message: '', shakeAge: 0.25, shakeDuration: 0.25 });
    });
    slowLabel(ctx, 548, 199);
    // 下右: 放置預覽(緊貼路邊的格子中心離中線 72 → 可蓋; 路上那格中心離中線 24 → 不可)
    sub(ctx, 236, 220, 1, function () {
      pathBand(ctx, [[0, 84], [364, 84]]);
      Art.drawPlacePreview(ctx, { kind: 'tower', x: 64, y: 12, valid: true });
      Art.drawPlayer(ctx, { x: 64, y: 12, moving: false, attackAge: 0.15, attackDuration: 0.15, handItem: 'towerKit', stealing: false, stealProgress: 0 });
      Art.drawPlacePreview(ctx, { kind: 'tower', x: 260, y: 60, valid: false });
      Art.drawPlayer(ctx, { x: 260, y: 60, moving: false, attackAge: 0.15, attackDuration: 0.15, handItem: 'towerKit', stealing: false, stealProgress: 0 });
    });
    tag(ctx, '可蓋', 372, 232, k, PAL.valid);
    tag(ctx, '不可', 434, 280, k, PAL.invalid);
  };
  // 第 8 頁 招募中立單位
  GUIDE[7] = function (ctx, k) {
    grassPatch(ctx, 480, 270);
    Art.drawCastle(ctx, { x: 412, y: 96, hitAge: 0.3, hitDuration: 0.3, attackAge: 0.15, attackDuration: 0.15, zoneActive: false, targeted: false });
    arrow(ctx, 104, 110, 350, 104, '#ffffff', 3, true);
    Art.drawWolf(ctx, { x: 72, y: 112, team: 'neutral', attackAge: 0.15, attackDuration: 0.15, moving: true, targeted: false });
    Art.drawSoulSlots(ctx, { x: 72, y: 74, slots: ['march', null] });
    tag(ctx, '中立', 72, 150, k, '#c8c8c8');
    // 商店第 0 排最後一格: 鎖住 → 野狼
    shopCell(ctx, 150, 222, { item: 'wolfKit', name: '野狼', price: 14, state: 'locked' }, 0, false);
    arrow(ctx, 200, 222, 244, 222, '#ffffff', 3);
    shopCell(ctx, 300, 222, { item: 'wolfKit', name: '野狼', price: 14, state: 'ok' }, 0, false);
    tag(ctx, '解鎖', 222, 196, k, PAL.valid);
  };

  Art.drawGuidePage = function (ctx, state) {
    var s = obj(state);
    var page = Math.floor(num(s.page, 0));
    if (page < 0 || page >= GUIDE.length) return;
    var x = num(s.x, 0), y = num(s.y, 0), w = Math.max(1, num(s.w, 1)), h = Math.max(1, num(s.h, 1));
    var vs = GUIDE_VSIZE[page];
    var sc = Math.min(w / vs[0], h / vs[1]);
    if (!(sc > 0)) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#121419'; ctx.fillRect(x, y, w, h);
    ctx.translate(x + (w - vs[0] * sc) / 2, y + (h - vs[1] * sc) / 2);
    ctx.scale(sc, sc);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, vs[0], vs[1]); ctx.clip();
    GUIDE[page](ctx, 1 / sc);
    ctx.restore();
    ctx.lineWidth = 2 / sc; ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(0, 0, vs[0], vs[1]);
    ctx.restore();
  };

  window.Art = Art;
})();
