// 魂匠煉成(組合實驗) — 美術繪製模組
// 全域物件, 不用 ES module。所有畫面以 Canvas 2D 幾何繪製, 無外部資源。
(function () {
  'use strict';

  // ---------- 色票 ----------
  var palette = {
    bg: '#2c3a2b',          // 草地
    bgDot: '#34452f',       // 草地紋理點
    path: '#8c7652',        // 敵人路線
    pathEdge: '#5a4a31',    // 路線邊
    pathArrow: '#a99169',   // 路線上的行進方向記號
    portal: '#4a1420',      // 出怪口
    portalRim: '#ff4d4d',
    ally: '#4f8fe6',        // 我方本體藍
    allyLight: '#8fb9f5',
    allyDark: '#2a5aa6',    // 我方底座(我方的字典詞)
    enemy: '#d9413b',       // 敵人紅
    enemyDark: '#3a0d0d',   // 敵人外描
    runner: '#f06a3a',
    armor: '#9aa1ab',
    bat: '#a8304e',
    neutral: '#8b9a7a',     // 中立樹精
    neutralRim: '#d8d8c6',
    treant: '#4fb05e',
    trunk: '#7a5634',
    player: '#f3ecd8',      // 玩家斗篷
    playerTrim: '#ffc83a',
    gold: '#ffcc33',
    goldDark: '#a87a10',
    outline: '#0e1626',
    frost: '#7fdcff',       // 減速覆蓋
    hpAlly: '#5be08a',
    hpEnemy: '#ff5050',
    hpBack: '#1a1a1a',
    target: '#ffffff',      // 面板目標外框
    panel: '#141822',
    panelLine: '#39425a',
    cell: '#1d2332',
    cellLine: '#56607a',
    text: '#f2f2f2',
    textDim: '#9aa3b5',
    danger: '#ff5050',
    slowMoFrame: '#7fdcff',
    valid: '#7dff9a',
    invalid: '#ff3b3b',
    corpseAlly: '#6f7a8c',
    corpseEnemy: '#7d5c5a',
    corpseTreant: '#6e6c57'
  };

  // 魂件六色(圖示形狀是主通道, 顏色第二通道)
  var PART_COLOR = {
    ranged: '#9ee05a', melee: '#ff8f3f', seek: '#c48cff',
    march: '#e8e2d0', frost: '#5fd4ff', blast: '#ffd23f'
  };
  var PART_NAME = { ranged: '遠攻', melee: '近戰', seek: '索敵', march: '進攻主堡', frost: '冰霜', blast: '爆裂' };
  // 組合代表色(0~7)
  var COMBO_COLOR = ['#c6ff5c', '#7fe3ff', '#ffab3d', '#ff6f61', '#8aa8ff', '#e07bff', '#e4fbff', '#ff5fae'];
  var COMBO_NAME = ['穿透箭', '冰箭', '爆裂彈', '旋風斬', '冰霜重擊', '突襲', '冰爆', '自爆衝鋒'];

  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  var ENEMY_SIZE = { imp: 32, runner: 32, armored: 44, bat: 24 };
  var CORPSE_SIZE = { imp: 32, runner: 32, armored: 44, bat: 24, tower: 48, soldier: 32, treant: 52 };

  var PATH = [[640, 130], [80, 130], [80, 430], [640, 430], [640, 730], [80, 730], [80, 1000], [360, 1000], [360, 1090]];

  // ---------- 小工具 ----------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d === undefined ? 0 : d); }
  function now() { return ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) / 1000; }
  function prog(age, dur) {
    dur = num(dur, 0); if (!(dur > 0)) return -1;
    var a = num(age, dur); if (a < 0 || a >= dur) return -1;
    return a / dur;
  }
  function partKind(k) { return PART_COLOR.hasOwnProperty(k) ? k : null; }
  function comboIdx(c) { c = num(c, -1); c = Math.floor(c); return (c >= 0 && c < 8) ? c : -1; }
  function enemyType(t) { return ENEMY_SIZE.hasOwnProperty(t) ? t : 'imp'; }
  function arr(a) { return Array.isArray(a) ? a : []; }
  function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) {
    var x = hex2rgb(a), y = hex2rgb(b);
    var r = Math.round(x[0] + (y[0] - x[0]) * t), g = Math.round(x[1] + (y[1] - x[1]) * t), bl = Math.round(x[2] + (y[2] - x[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
  function txt(ctx, s, x, y, size, color, align, bold, outline) {
    ctx.font = (bold === false ? '' : 'bold ') + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    if (outline) { ctx.lineWidth = Math.max(3, size * 0.22); ctx.strokeStyle = outline; ctx.lineJoin = 'round'; ctx.strokeText(String(s), x, y); }
    ctx.fillStyle = color; ctx.fillText(String(s), x, y);
  }

  // ---------- 魂件圖示(s = 圖示邊長) ----------
  function partIcon(ctx, kind, cx, cy, s, color) {
    kind = partKind(kind);
    ctx.save();
    ctx.translate(cx, cy);
    var k = s / 20; ctx.scale(k, k);
    var c = color || (kind ? PART_COLOR[kind] : palette.textDim);
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.4;
    if (kind === 'ranged') { // 斜向箭
      ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(6, -6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, -9); ctx.lineTo(1, -7); ctx.lineTo(7, -1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(-9, 2); ctx.moveTo(-7, 7); ctx.lineTo(-2, 9); ctx.stroke();
    } else if (kind === 'melee') { // 劍
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 5); ctx.lineWidth = 3; ctx.stroke();
      ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(6, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, 9); ctx.stroke();
    } else if (kind === 'seek') { // 準星
      circle(ctx, 0, 0, 6); ctx.stroke();
      circle(ctx, 0, 0, 1.8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -9.5); ctx.lineTo(0, -4); ctx.moveTo(0, 9.5); ctx.lineTo(0, 4);
      ctx.moveTo(-9.5, 0); ctx.lineTo(-4, 0); ctx.moveTo(9.5, 0); ctx.lineTo(4, 0); ctx.stroke();
    } else if (kind === 'march') { // 小城堡
      ctx.beginPath();
      ctx.moveTo(-8, 9); ctx.lineTo(-8, -6); ctx.lineTo(-5, -6); ctx.lineTo(-5, -3); ctx.lineTo(-2, -3); ctx.lineTo(-2, -6);
      ctx.lineTo(2, -6); ctx.lineTo(2, -3); ctx.lineTo(5, -3); ctx.lineTo(5, -6); ctx.lineTo(8, -6); ctx.lineTo(8, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = palette.panel; rrect(ctx, -2.5, 3, 5, 6, 2.5); ctx.fill();
    } else if (kind === 'frost') { // 雪花
      for (var i = 0; i < 3; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 3);
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 9);
        ctx.moveTo(-3, -7); ctx.lineTo(0, -5); ctx.lineTo(3, -7);
        ctx.moveTo(-3, 7); ctx.lineTo(0, 5); ctx.lineTo(3, 7); ctx.stroke(); ctx.restore();
      }
    } else if (kind === 'blast') { // 炸彈
      circle(ctx, -1, 2, 6.5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(3, -3); ctx.quadraticCurveTo(6, -8, 9, -7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, -10); ctx.lineTo(9, -4); ctx.moveTo(6, -7); ctx.lineTo(10, -7); ctx.lineWidth = 1.6; ctx.stroke();
    } else {
      ctx.font = 'bold 16px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 1);
    }
    ctx.restore();
  }

  // ---------- 組合圖示 ----------
  function comboIcon(ctx, combo, cx, cy, s, color) {
    var c = comboIdx(combo);
    ctx.save();
    ctx.translate(cx, cy);
    var k = s / 20; ctx.scale(k, k);
    var col = color || (c >= 0 ? COMBO_COLOR[c] : palette.textDim);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.4;
    if (c === 0) { // 穿透箭: 箭穿過兩道牆
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(-3, -3); ctx.moveTo(-3, 3); ctx.lineTo(-3, 8);
      ctx.moveTo(2, -8); ctx.lineTo(2, -3); ctx.moveTo(2, 3); ctx.lineTo(2, 8); ctx.stroke();
    } else if (c === 1) { // 冰箭: 箭 + 菱形冰晶頭
      ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(3, -3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(6, -1); ctx.lineTo(1, -3); ctx.lineTo(3, -9); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-6, 0); ctx.moveTo(-9, -3); ctx.lineTo(-3, -3); ctx.stroke();
    } else if (c === 2) { // 爆裂彈: 彈 + 爆線
      circle(ctx, 0, 0, 4.5); ctx.fill();
      for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6.5, Math.sin(a) * 6.5); ctx.lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5); ctx.stroke(); }
    } else if (c === 3) { // 旋風斬: 迴旋
      ctx.beginPath(); ctx.arc(0, 0, 7.5, -0.3, Math.PI * 1.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 3.5, Math.PI * 0.7, Math.PI * 2.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7, -6); ctx.lineTo(8.5, 0); ctx.lineTo(3, -1.5); ctx.closePath(); ctx.fill();
    } else if (c === 4) { // 冰霜重擊: 劍 + 冰點
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(4, 2); ctx.stroke();
      ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-1, 5); ctx.lineTo(7, -3); ctx.moveTo(4, 2); ctx.lineTo(8, 6); ctx.stroke();
      circle(ctx, -7, 6, 1.8); ctx.fill(); circle(ctx, -2, 9, 1.5); ctx.fill(); circle(ctx, 8, -8, 1.5); ctx.fill();
    } else if (c === 5) { // 突襲: 閃電
      ctx.beginPath(); ctx.moveTo(3, -10); ctx.lineTo(-5, 1); ctx.lineTo(0, 1); ctx.lineTo(-3, 10); ctx.lineTo(6, -2); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill();
    } else if (c === 6) { // 冰爆: 環中雪花
      circle(ctx, 0, 0, 8.5); ctx.lineWidth = 2; ctx.stroke();
      for (var j = 0; j < 3; j++) { ctx.save(); ctx.rotate(j * Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, -5.5); ctx.lineTo(0, 5.5); ctx.stroke(); ctx.restore(); }
    } else if (c === 7) { // 自爆衝鋒: 炸彈 + 衝刺線
      circle(ctx, 3, 2, 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(8, -8); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-5, -2); ctx.moveTo(-10, 3); ctx.lineTo(-4, 3); ctx.moveTo(-9, 8); ctx.lineTo(-3, 8); ctx.stroke();
    } else {
      ctx.font = 'bold 16px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 1);
    }
    ctx.restore();
  }

  // ---------- 單位共用 ----------
  function allyPlate(ctx, w, y, h) {
    ctx.fillStyle = palette.allyDark; ctx.strokeStyle = palette.outline; ctx.lineWidth = 1.5;
    rrect(ctx, -w / 2, y, w, h, h / 2); ctx.fill(); ctx.stroke();
  }
  function moveDust(ctx, half) {
    var t = now(); var ph = Math.floor(t * 6) % 2;
    ctx.fillStyle = 'rgba(230,220,190,0.55)';
    circle(ctx, ph ? -half * 0.55 : half * 0.55, half - 3, 2.6); ctx.fill();
    circle(ctx, ph ? -half * 0.8 : half * 0.8, half - 5, 1.8); ctx.fill();
  }
  function frostOverlay(ctx, half) {
    ctx.save();
    ctx.globalAlpha = 0.32; ctx.fillStyle = palette.frost;
    rrect(ctx, -half + 1, -half + 1, half * 2 - 2, half * 2 - 2, half * 0.4); ctx.fill();
    ctx.globalAlpha = 0.95; ctx.strokeStyle = '#e6f8ff'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    var pts = [[-half + 5, -half + 5], [half - 5, half - 6]];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      for (var j = 0; j < 3; j++) {
        var a = j * Math.PI / 3;
        ctx.beginPath(); ctx.moveTo(p[0] - Math.cos(a) * 3.5, p[1] - Math.sin(a) * 3.5); ctx.lineTo(p[0] + Math.cos(a) * 3.5, p[1] + Math.sin(a) * 3.5); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function hpBar(ctx, x, y, w, hp, maxHp, enemy) {
    hp = num(hp, 0); maxHp = num(maxHp, 0);
    if (!(maxHp > 0) || hp >= maxHp) return;
    var r = Math.max(0, Math.min(1, hp / maxHp));
    ctx.fillStyle = palette.hpBack; ctx.fillRect(x - w / 2, y - 2, w, 4);
    ctx.fillStyle = enemy ? palette.hpEnemy : palette.hpAlly; ctx.fillRect(x - w / 2, y - 2, w * r, 4);
  }
  function targetFrame(ctx, x, y, w, h) {
    ctx.strokeStyle = palette.target; ctx.lineWidth = 3;
    ctx.strokeRect(x - w / 2 - 1.5, y - h / 2 - 1.5, w + 3, h + 3);
  }
  // 依共用狀態畫單位, body(ctx, flash) 在本地座標畫本體
  function drawUnit(ctx, s, w, h, body, opts) {
    s = s || {}; opts = opts || {};
    var x = num(s.x), y = num(s.y);
    var hit = prog(s.hitAge, s.hitDuration);
    var atk = prog(s.attackAge, s.attackDuration);
    var flash = hit >= 0 ? (1 - hit) * 0.75 : 0;
    var dy = atk >= 0 ? -3 * Math.sin(atk * Math.PI) : 0;
    ctx.save();
    ctx.translate(x, y + dy);
    body(ctx, flash, atk);
    if (s.moving) moveDust(ctx, h / 2);
    if (s.slowed) frostOverlay(ctx, Math.min(w, h) / 2);
    ctx.restore();
    ctx.save();
    if (opts.hp !== false) hpBar(ctx, x, y - h / 2 - 6, w, s.hp, s.maxHp, opts.enemy);
    if (opts.targetable && s.targeted) targetFrame(ctx, x, y, w, h);
    ctx.restore();
  }

  // ---------- 本體畫法 ----------
  function towerBody(ctx, flash, atk) {
    flash = flash || 0;
    allyPlate(ctx, 44, 10, 12);
    ctx.strokeStyle = palette.outline; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.fillStyle = mix(palette.ally, '#ffffff', flash);
    ctx.beginPath(); ctx.moveTo(-15, 12); ctx.lineTo(15, 12); ctx.lineTo(12, -12); ctx.lineTo(-12, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = mix(palette.allyLight, '#ffffff', flash);
    ctx.beginPath();
    ctx.moveTo(-16, -11); ctx.lineTo(-16, -22); ctx.lineTo(-10, -22); ctx.lineTo(-10, -18); ctx.lineTo(-3, -18); ctx.lineTo(-3, -22);
    ctx.lineTo(3, -22); ctx.lineTo(3, -18); ctx.lineTo(10, -18); ctx.lineTo(10, -22); ctx.lineTo(16, -22); ctx.lineTo(16, -11); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = (atk !== undefined && atk >= 0) ? '#fff6b0' : '#0b1222';
    rrect(ctx, -2.5, -7, 5, 12, 2); ctx.fill();
  }
  function soldierBody(ctx, flash) {
    flash = flash || 0;
    ctx.fillStyle = palette.allyDark; ctx.strokeStyle = palette.outline; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 11.5, 13, 3.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#dfe6f0'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(9, 5); ctx.lineTo(13, -13); ctx.stroke();
    ctx.strokeStyle = palette.outline; ctx.lineWidth = 2;
    ctx.fillStyle = mix(palette.ally, '#ffffff', flash);
    circle(ctx, 0, 0, 10.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = mix(palette.allyLight, '#ffffff', flash);
    ctx.beginPath(); ctx.arc(0, 0, 10.5, Math.PI, 0); ctx.lineTo(10.5, -2); ctx.lineTo(-10.5, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(ctx, -3.5, 2.5, 1.8); ctx.fill(); circle(ctx, 3.5, 2.5, 1.8); ctx.fill();
    ctx.fillStyle = '#e8eef8'; rrect(ctx, -15, -3, 8, 12, 3); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = palette.ally; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-11, -1); ctx.lineTo(-11, 7); ctx.moveTo(-14, 2.5); ctx.lineTo(-8, 2.5); ctx.stroke();
  }
  function treantBody(ctx, flash, team) {
    flash = flash || 0;
    var neutral = team !== 'ally';
    if (!neutral) allyPlate(ctx, 40, 17, 8);
    ctx.strokeStyle = palette.outline; ctx.lineWidth = 2;
    ctx.fillStyle = mix(neutral ? '#6e6250' : palette.trunk, '#ffffff', flash);
    rrect(ctx, -6, 2, 12, 17, 3); ctx.fill(); ctx.stroke();
    var leaf = mix(neutral ? palette.neutral : palette.treant, '#ffffff', flash);
    ctx.fillStyle = leaf;
    circle(ctx, -11, -3, 10); ctx.fill(); ctx.stroke();
    circle(ctx, 11, -3, 10); ctx.fill(); ctx.stroke();
    circle(ctx, 0, -9, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = leaf; circle(ctx, -9, -2, 8.5); ctx.fill(); circle(ctx, 9, -2, 8.5); ctx.fill();
    ctx.fillStyle = '#16210f'; circle(ctx, -4.5, -6, 2.2); ctx.fill(); circle(ctx, 4.5, -6, 2.2); ctx.fill();
    ctx.strokeStyle = '#16210f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -3, 3.5, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    if (neutral) {
      ctx.strokeStyle = palette.neutralRim; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      circle(ctx, 0, 0, 24.5); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function hornPair(ctx, y, spread, hgt, col) {
    ctx.fillStyle = col; ctx.strokeStyle = palette.enemyDark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-spread - 3, y + 3); ctx.lineTo(-spread - 2, y - hgt); ctx.lineTo(-spread + 4, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(spread + 3, y + 3); ctx.lineTo(spread + 2, y - hgt); ctx.lineTo(spread - 4, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function angryEyes(ctx, y, gap, sz) {
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath(); ctx.moveTo(-gap - sz, y - sz * 0.6); ctx.lineTo(-gap + sz * 0.6, y); ctx.lineTo(-gap - sz, y + sz * 0.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(gap + sz, y - sz * 0.6); ctx.lineTo(gap - sz * 0.6, y); ctx.lineTo(gap + sz, y + sz * 0.5); ctx.closePath(); ctx.fill();
  }
  function enemyBody(ctx, type, flash) {
    flash = flash || 0;
    var dk = palette.enemyDark;
    ctx.lineJoin = 'round';
    if (type === 'runner') {
      ctx.strokeStyle = 'rgba(255,170,130,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(-9, -4); ctx.moveTo(-15, 2); ctx.lineTo(-7, 2); ctx.moveTo(-15, 8); ctx.lineTo(-9, 8); ctx.stroke();
      var c = mix(palette.runner, '#ffffff', flash);
      hornPair(ctx, -8, 5, 7, c);
      ctx.fillStyle = c; ctx.strokeStyle = dk; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, 12); ctx.quadraticCurveTo(-10, -9, 4, -10); ctx.quadraticCurveTo(15, -6, 14, 4); ctx.quadraticCurveTo(10, 13, -8, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      angryEyes(ctx, -1, 4, 3.4);
    } else if (type === 'armored') {
      var b = mix('#b8322e', '#ffffff', flash), a = mix(palette.armor, '#ffffff', flash);
      ctx.fillStyle = b; ctx.strokeStyle = dk; ctx.lineWidth = 2.5;
      circle(ctx, 0, 3, 17); ctx.fill(); ctx.stroke();
      ctx.fillStyle = a; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(-14, 2, 6, 9, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(14, 2, 6, 9, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-13, 0); ctx.lineTo(-13, -12); ctx.lineTo(-7, -19); ctx.lineTo(7, -19); ctx.lineTo(13, -12); ctx.lineTo(13, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#20232a'; rrect(ctx, -9, -10, 18, 4.5, 2); ctx.fill();
      ctx.fillStyle = '#ffe14d'; ctx.fillRect(-6, -9, 3.5, 2.5); ctx.fillRect(2.5, -9, 3.5, 2.5);
      ctx.fillStyle = '#5c626c'; circle(ctx, -9, -3, 1.6); ctx.fill(); circle(ctx, 9, -3, 1.6); ctx.fill(); circle(ctx, 0, -16, 1.6); ctx.fill();
      ctx.fillStyle = a; ctx.strokeStyle = dk; rrect(ctx, -8, 8, 16, 10, 3); ctx.fill(); ctx.stroke();
    } else if (type === 'bat') {
      var bc = mix(palette.bat, '#ffffff', flash);
      ctx.fillStyle = bc; ctx.strokeStyle = dk; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(-11.5, -7); ctx.lineTo(-9, -1); ctx.lineTo(-11.5, 3); ctx.lineTo(-6, 2); ctx.lineTo(-3, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(11.5, -7); ctx.lineTo(9, -1); ctx.lineTo(11.5, 3); ctx.lineTo(6, 2); ctx.lineTo(3, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-3, -10); ctx.lineTo(-1, -5); ctx.lineTo(1, -5); ctx.lineTo(3, -10); ctx.lineTo(4, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
      circle(ctx, 0, 0, 5.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe14d'; circle(ctx, -2, -0.5, 1.3); ctx.fill(); circle(ctx, 2, -0.5, 1.3); ctx.fill();
    } else { // imp
      var ic = mix(palette.enemy, '#ffffff', flash);
      hornPair(ctx, -8, 6, 7, ic);
      ctx.fillStyle = ic; ctx.strokeStyle = dk; ctx.lineWidth = 2;
      circle(ctx, 0, 2, 12); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(-6, 15); ctx.lineTo(-3, 13); ctx.moveTo(3, 13); ctx.lineTo(6, 15); ctx.lineTo(8, 12); ctx.stroke();
      angryEyes(ctx, 0, 4, 3.2);
      ctx.strokeStyle = dk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-4, 7); ctx.lineTo(-1.5, 5.5); ctx.lineTo(1.5, 7); ctx.lineTo(4, 5.5); ctx.stroke();
    }
  }
  function playerBody(ctx, atk) {
    // 錘子(攻擊時揮動)
    var sw = (atk !== undefined && atk >= 0) ? Math.sin(atk * Math.PI) : 0;
    ctx.save();
    ctx.translate(6, 6); ctx.rotate(0.3 - sw * 0.9);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -11); ctx.stroke();
    ctx.fillStyle = '#c9ced8'; ctx.strokeStyle = palette.outline; ctx.lineWidth = 1.5;
    rrect(ctx, -4, -15, 8, 5.5, 1.5); ctx.fill(); ctx.stroke();
    ctx.restore();
    // 斗篷
    ctx.fillStyle = palette.player; ctx.strokeStyle = palette.playerTrim; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(9, -10, 9, 0); ctx.lineTo(12, 13); ctx.lineTo(-12, 13); ctx.lineTo(-9, 0); ctx.quadraticCurveTo(-9, -10, 0, -14); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1b1430'; circle(ctx, 0, -3, 5.5); ctx.fill();
    ctx.fillStyle = palette.playerTrim; circle(ctx, -2.2, -3.5, 1.4); ctx.fill(); circle(ctx, 2.2, -3.5, 1.4); ctx.fill();
    // 胸前魂核
    ctx.fillStyle = palette.playerTrim; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(3, 7.5); ctx.lineTo(0, 11); ctx.lineTo(-3, 7.5); ctx.closePath(); ctx.fill();
  }
  function castleBody(ctx, flash) {
    flash = flash || 0;
    var stone = mix('#8c9bb3', '#ff5050', flash), roof = mix(palette.ally, '#ff5050', flash), dark = palette.outline;
    ctx.lineJoin = 'round';
    allyPlate(ctx, 108, 40, 14);
    ctx.fillStyle = stone; ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
    // 兩側塔
    rrect(ctx, -52, -26, 26, 70, 4); ctx.fill(); ctx.stroke();
    rrect(ctx, 26, -26, 26, 70, 4); ctx.fill(); ctx.stroke();
    // 主體
    ctx.fillRect(-34, -14, 68, 56); ctx.strokeRect(-34, -14, 68, 56);
    // 城垛
    for (var i = 0; i < 4; i++) { ctx.fillRect(-32 + i * 18, -22, 10, 9); ctx.strokeRect(-32 + i * 18, -22, 10, 9); }
    // 塔頂
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(-55, -26); ctx.lineTo(-39, -54); ctx.lineTo(-23, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(23, -26); ctx.lineTo(39, -54); ctx.lineTo(55, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 門
    ctx.fillStyle = '#2a1d14';
    ctx.beginPath(); ctx.moveTo(-12, 42); ctx.lineTo(-12, 16); ctx.arc(0, 16, 12, Math.PI, 0); ctx.lineTo(12, 42); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0b1222'; rrect(ctx, -42, -10, 6, 12, 3); ctx.fill(); rrect(ctx, 36, -10, 6, 12, 3); ctx.fill();
  }
  function corpseBody(ctx, kind) {
    var col = (kind === 'tower' || kind === 'soldier') ? palette.corpseAlly : (kind === 'treant' ? palette.corpseTreant : palette.corpseEnemy);
    var half = CORPSE_SIZE[kind] / 2;
    ctx.fillStyle = col; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    if (kind === 'tower') {
      // 倒塌的石堆
      ctx.beginPath(); ctx.moveTo(-22, 20); ctx.lineTo(-18, 6); ctx.lineTo(-8, 10); ctx.lineTo(-4, -2); ctx.lineTo(8, 4); ctx.lineTo(14, -4); ctx.lineTo(22, 8); ctx.lineTo(22, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#566173'; rrect(ctx, -16, 12, 10, 6, 1.5); ctx.fill(); rrect(ctx, 4, 10, 12, 7, 1.5); ctx.fill();
      return;
    }
    if (kind === 'treant') {
      ctx.beginPath(); ctx.ellipse(0, 12, 24, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a4a36'; rrect(ctx, -18, 6, 30, 8, 3); ctx.fill(); ctx.stroke();
    } else {
      var rx = half - 2, ry = half * 0.5;
      ctx.beginPath(); ctx.ellipse(0, half - ry - 1, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // X 眼
    var ey = kind === 'treant' ? 10 : half - half * 0.5 - 2, g = Math.max(3, half * 0.28), r = Math.max(1.6, half * 0.12);
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-g - r, ey - r); ctx.lineTo(-g + r, ey + r); ctx.moveTo(-g + r, ey - r); ctx.lineTo(-g - r, ey + r);
    ctx.moveTo(g - r, ey - r); ctx.lineTo(g + r, ey + r); ctx.moveTo(g + r, ey - r); ctx.lineTo(g - r, ey + r);
    ctx.stroke();
  }

  // ---------- 格子(魂件格 / 背包格 / 目標格共用) ----------
  function partCell(ctx, cx, cy, size, kind, borderOverride, iconScale) {
    kind = partKind(kind);
    var h = size / 2;
    ctx.fillStyle = palette.cell;
    rrect(ctx, cx - h, cy - h, size, size, Math.max(2, size * 0.18)); ctx.fill();
    if (kind) {
      ctx.strokeStyle = borderOverride || PART_COLOR[kind]; ctx.lineWidth = Math.max(1.5, size * 0.07);
      ctx.stroke();
      partIcon(ctx, kind, cx, cy, size * (iconScale || 0.72));
    } else {
      ctx.strokeStyle = borderOverride || palette.cellLine; ctx.lineWidth = Math.max(1, size * 0.05);
      if (!borderOverride) ctx.setLineDash([Math.max(2, size * 0.12), Math.max(2, size * 0.1)]);
      ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function cursorIcon(ctx, x, y, k) {
    k = k || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.5, 13); ctx.lineTo(7.5, 20); ctx.lineTo(10.5, 18.5); ctx.lineTo(7.5, 12); ctx.lineTo(13, 12); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function clickRipple(ctx, x, y, r) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
    circle(ctx, x, y, r); ctx.stroke(); circle(ctx, x, y, r * 0.55); ctx.stroke();
  }
  function arrowLine(ctx, pts, color, width, dashed) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (dashed) ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 3) ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    else for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke(); ctx.setLineDash([]);
    var a = pts[pts.length - 1], b = pts[pts.length - 2];
    var ang = Math.atan2(a[1] - b[1], a[0] - b[0]), L = 6 + (width || 3) * 2.2;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]);
    ctx.lineTo(a[0] - Math.cos(ang - 0.45) * L, a[1] - Math.sin(ang - 0.45) * L);
    ctx.lineTo(a[0] - Math.cos(ang + 0.45) * L, a[1] - Math.sin(ang + 0.45) * L); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function shopCell(ctx, cx, cy, item) {
    item = item || {};
    var st = (item.state === 'poor' || item.state === 'locked' || item.state === 'active') ? item.state : 'ok';
    var w = 84, h = 50, kind = partKind(item.kind);
    ctx.save();
    ctx.globalAlpha = st === 'poor' ? 0.45 : 1;
    ctx.fillStyle = st === 'active' ? '#3b3420' : (st === 'locked' ? '#15181f' : palette.cell);
    rrect(ctx, cx - w / 2 + 1, cy - h / 2 + 1, w - 2, h - 2, 8); ctx.fill();
    ctx.strokeStyle = st === 'active' ? palette.gold : (st === 'locked' ? '#3a4050' : palette.cellLine);
    ctx.lineWidth = st === 'active' ? 3 : 1.5; ctx.stroke();
    if (st === 'locked') {
      ctx.fillStyle = '#7a8296'; ctx.strokeStyle = '#7a8296'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy - 4, 6, Math.PI, 0); ctx.stroke();
      rrect(ctx, cx - 9, cy - 4, 18, 13, 3); ctx.fill();
      ctx.restore(); return;
    }
    var ix = cx - 23;
    if (kind) partIcon(ctx, kind, ix, cy, 26);
    else {
      var nm = String(item.name || '');
      ctx.save(); ctx.translate(ix, cy);
      if (nm.indexOf('箭塔') >= 0) { ctx.scale(0.55, 0.55); towerBody(ctx, 0); }
      else if (nm.indexOf('樹精') >= 0) { ctx.scale(0.5, 0.5); treantBody(ctx, 0, 'ally'); }
      else { ctx.scale(0.75, 0.75); soldierBody(ctx, 0); }
      ctx.restore();
    }
    txt(ctx, item.name === undefined ? '' : String(item.name).slice(0, 4), cx + 14, cy - 10, String(item.name || '').length > 2 ? 13 : 17, palette.text, 'center');
    ctx.fillStyle = palette.gold; circle(ctx, cx + 1, cy + 12, 5); ctx.fill();
    txt(ctx, num(item.price, 0), cx + 18, cy + 12, 17, st === 'poor' ? palette.danger : palette.gold, 'center');
    ctx.restore();
  }

  // ---------- 匯出 ----------
  var Art = {
    canvas: { width: 720, height: 1280 },
    palette: palette,
    partColor: PART_COLOR,
    comboColor: COMBO_COLOR,

    drawBackground: function (ctx) {
      ctx.save();
      ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, 720, 1280);
      // 固定的草地紋理
      ctx.fillStyle = palette.bgDot;
      var seed = 7;
      for (var i = 0; i < 260; i++) {
        seed = (seed * 9301 + 49297) % 233280; var px = seed / 233280 * 720;
        seed = (seed * 9301 + 49297) % 233280; var py = seed / 233280 * 1280;
        ctx.fillRect(px, py, 3, 2);
      }
      // 路線
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(PATH[0][0], PATH[0][1]);
      for (var j = 1; j < PATH.length; j++) ctx.lineTo(PATH[j][0], PATH[j][1]);
      ctx.strokeStyle = palette.pathEdge; ctx.lineWidth = 56; ctx.stroke();
      ctx.strokeStyle = palette.path; ctx.lineWidth = 48; ctx.stroke();
      // 行進方向小箭頭
      ctx.fillStyle = palette.pathArrow;
      for (var k = 0; k < PATH.length - 1; k++) {
        var a = PATH[k], b = PATH[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
        for (var d = 60; d < L - 30; d += 120) {
          ctx.save(); ctx.translate(a[0] + dx * d / L, a[1] + dy * d / L); ctx.rotate(ang);
          ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -7); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill(); ctx.restore();
        }
      }
      // 出怪口
      ctx.fillStyle = palette.portal; ctx.strokeStyle = palette.portalRim; ctx.lineWidth = 4;
      circle(ctx, 640, 130, 30); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,77,77,0.6)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(640, 130, 18, 0.3, Math.PI * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(640, 130, 9, Math.PI, Math.PI * 2.6); ctx.stroke();
      ctx.restore();
    },

    drawCastle: function (ctx, s) {
      s = s || {};
      var x = num(s.x, 360), y = num(s.y, 1090);
      var hit = prog(s.hitAge, s.hitDuration);
      ctx.save();
      // 主堡區(半徑 130 外緣)
      var zoneOn = !!s.zoneActive;
      ctx.fillStyle = zoneOn ? 'rgba(255,204,51,0.14)' : 'rgba(255,204,51,0.05)';
      circle(ctx, x, y, 130); ctx.fill();
      ctx.strokeStyle = zoneOn ? 'rgba(255,204,51,0.85)' : 'rgba(255,204,51,0.3)'; ctx.lineWidth = zoneOn ? 3 : 2;
      ctx.setLineDash([10, 8]); circle(ctx, x, y, 130 - (zoneOn ? 1.5 : 1)); ctx.stroke(); ctx.setLineDash([]);
      ctx.translate(x, y);
      castleBody(ctx, hit >= 0 ? (1 - hit) * 0.8 : 0);
      ctx.restore();
      if (s.targeted) { ctx.save(); targetFrame(ctx, x, y, 112, 112); ctx.restore(); }
    },

    drawTower: function (ctx, s) {
      drawUnit(ctx, s, 48, 48, function (c, f, a) { towerBody(c, f, a); }, { targetable: true });
    },
    drawSoldier: function (ctx, s) {
      drawUnit(ctx, s, 32, 32, function (c, f) { soldierBody(c, f); }, { targetable: true });
    },
    drawTreant: function (ctx, s) {
      s = s || {};
      var team = s.team === 'ally' ? 'ally' : 'neutral';
      drawUnit(ctx, s, 52, 52, function (c, f) { treantBody(c, f, team); }, { targetable: true, hp: team === 'ally' });
    },
    drawEnemy: function (ctx, s) {
      s = s || {};
      var t = enemyType(s.type), z = ENEMY_SIZE[t];
      drawUnit(ctx, s, z, z, function (c, f) { enemyBody(c, t, f); }, { enemy: true });
    },
    drawPlayer: function (ctx, s) {
      s = s || {};
      var x = num(s.x), y = num(s.y), atk = prog(s.attackAge, s.attackDuration);
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 13.5, 11, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      playerBody(ctx, atk);
      if (s.moving) moveDust(ctx, 16);
      ctx.restore();
      if (s.targeted) { ctx.save(); targetFrame(ctx, x, y, 32, 32); ctx.restore(); }
    },
    drawCorpse: function (ctx, s) {
      s = s || {};
      var kind = CORPSE_SIZE.hasOwnProperty(s.kind) ? s.kind : 'imp', z = CORPSE_SIZE[kind];
      var x = num(s.x), y = num(s.y), maxL = num(s.maxLife, 12); if (!(maxL > 0)) maxL = 12;
      var r = Math.max(0, Math.min(1, num(s.life, maxL) / maxL));
      ctx.save();
      ctx.globalAlpha = 0.2 + 0.7 * r;
      ctx.translate(x, y);
      corpseBody(ctx, kind);
      ctx.restore();
      if (s.targeted) { ctx.save(); targetFrame(ctx, x, y, z, z); ctx.restore(); }
    },
    drawCoin: function (ctx, s) {
      s = s || {};
      var x = num(s.x), y = num(s.y);
      ctx.save();
      ctx.fillStyle = palette.gold; ctx.strokeStyle = palette.goldDark; ctx.lineWidth = 2;
      circle(ctx, x, y, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = palette.goldDark; ctx.lineWidth = 1; circle(ctx, x, y, 3.8); ctx.stroke();
      ctx.fillStyle = '#fff6c8'; circle(ctx, x - 2.5, y - 2.5, 1.5); ctx.fill();
      ctx.restore();
    },
    drawGroundPart: function (ctx, s) {
      s = s || {};
      var x = num(s.x), y = num(s.y), kind = partKind(s.kind);
      ctx.save();
      ctx.globalAlpha = 0.35; ctx.fillStyle = kind ? PART_COLOR[kind] : palette.textDim;
      circle(ctx, x, y, 14); ctx.fill();
      ctx.globalAlpha = 1;
      partCell(ctx, x, y, 22, kind);
      ctx.restore();
    },
    drawSoulSlots: function (ctx, s) {
      s = s || {};
      var slots = arr(s.slots), n = Math.max(0, Math.min(3, slots.length));
      if (!n) return;
      var x = num(s.x), y = num(s.y), x0 = x - (n - 1) * 10;
      ctx.save();
      var pairs = arr(s.pairs), paired = {};
      for (var p = 0; p < pairs.length; p++) {
        var pr = pairs[p] || {}, c = comboIdx(pr.combo), a = Math.floor(num(pr.a, -1)), b = Math.floor(num(pr.b, -1));
        if (c < 0 || a < 0 || b < 0 || a >= n || b >= n) continue;
        paired[a] = COMBO_COLOR[c]; paired[b] = COMBO_COLOR[c];
      }
      // 背襯讓格列在任何地面上可讀
      ctx.fillStyle = 'rgba(8,10,16,0.7)';
      rrect(ctx, x0 - 10, y - 10, n * 20, 20, 4); ctx.fill();
      for (var i = 0; i < n; i++) partCell(ctx, x0 + i * 20, y, 18, slots[i], paired[i], 0.74);
      // 配對連線(格列上方 6px 內)
      for (var q = 0; q < pairs.length; q++) {
        var pq = pairs[q] || {}, cq = comboIdx(pq.combo), aq = Math.floor(num(pq.a, -1)), bq = Math.floor(num(pq.b, -1));
        if (cq < 0 || aq < 0 || bq < 0 || aq >= n || bq >= n || aq === bq) continue;
        var xa = x0 + Math.min(aq, bq) * 20, xb = x0 + Math.max(aq, bq) * 20, col = COMBO_COLOR[cq];
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(xa, y - 9); ctx.lineTo(xa, y - 13); ctx.lineTo(xb, y - 13); ctx.lineTo(xb, y - 9); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(xa, y - 9); ctx.lineTo(xa, y - 13); ctx.lineTo(xb, y - 13); ctx.lineTo(xb, y - 9); ctx.stroke();
      }
      ctx.restore();
    },
    drawProjectile: function (ctx, s) {
      s = s || {};
      var x = num(s.x), y = num(s.y), ang = num(s.angle, 0), enemy = s.team === 'enemy';
      var kind = (s.kind === 'pierce' || s.kind === 'frost' || s.kind === 'blast') ? s.kind : 'normal';
      ctx.save(); ctx.translate(x, y);
      if (kind === 'pierce') {
        ctx.rotate(ang);
        ctx.fillStyle = enemy ? palette.hpEnemy : COMBO_COLOR[0]; ctx.strokeStyle = '#102000'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(5, -3); ctx.lineTo(-12, -1.5); ctx.lineTo(-12, 1.5); ctx.lineTo(5, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-6, -0.75, 12, 1.5);
      } else if (kind === 'frost') {
        ctx.rotate(ang);
        ctx.fillStyle = enemy ? palette.hpEnemy : '#7fe3ff'; ctx.strokeStyle = '#0a3a55'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(5.2, 0); ctx.lineTo(0, -4.5); ctx.lineTo(-5.2, 0); ctx.lineTo(0, 4.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; circle(ctx, 0.5, 0, 1.8); ctx.fill();
      } else if (kind === 'blast') {
        ctx.fillStyle = enemy ? palette.hpEnemy : '#ffab3d'; ctx.strokeStyle = '#3a1a00'; ctx.lineWidth = 1.5;
        circle(ctx, 0, 0, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff1a8'; circle(ctx, -1.5, -1.5, 2.2); ctx.fill();
      } else {
        ctx.fillStyle = enemy ? palette.hpEnemy : '#e9ffd0'; ctx.strokeStyle = enemy ? palette.enemyDark : '#3c6b14'; ctx.lineWidth = 1.5;
        circle(ctx, 0, 0, 4); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    },
    drawAreaEffect: function (ctx, s) {
      s = s || {};
      var x = num(s.x), y = num(s.y), R = Math.max(0, num(s.radius, 0)), t = prog(s.age, s.duration);
      if (t < 0 || R <= 0) return;
      var kind = s.kind, fade = 1 - t;
      ctx.save(); ctx.translate(x, y);
      if (kind === 'nova') { // 冰爆: 冷色實心 + 冰刺
        ctx.globalAlpha = 0.35 * fade; ctx.fillStyle = '#7fe3ff'; circle(ctx, 0, 0, R); ctx.fill();
        ctx.globalAlpha = fade; ctx.strokeStyle = '#e4fbff'; ctx.lineWidth = 3; circle(ctx, 0, 0, R - 1.5); ctx.stroke();
        ctx.strokeStyle = '#bff2ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 + 0.3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); ctx.lineTo(Math.cos(a) * R * (0.5 + 0.45 * Math.min(1, t * 2.5)), Math.sin(a) * R * (0.5 + 0.45 * Math.min(1, t * 2.5))); ctx.stroke(); }
      } else if (kind === 'whirl') { // 旋風斬: 三道旋轉弧
        ctx.rotate(t * Math.PI * 1.6);
        ctx.strokeStyle = COMBO_COLOR[3]; ctx.lineCap = 'round';
        for (var w = 0; w < 3; w++) {
          ctx.globalAlpha = fade; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(0, 0, R - 2.5, w * Math.PI * 2 / 3, w * Math.PI * 2 / 3 + 1.4); ctx.stroke();
          ctx.globalAlpha = 0.5 * fade; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, R * 0.68, w * Math.PI * 2 / 3 + 0.5, w * Math.PI * 2 / 3 + 1.6); ctx.stroke();
        }
      } else if (kind === 'selfDestruct') { // 自爆: 洋紅雙環 + 實心
        ctx.globalAlpha = 0.45 * fade; ctx.fillStyle = COMBO_COLOR[7]; circle(ctx, 0, 0, R); ctx.fill();
        ctx.globalAlpha = fade; ctx.strokeStyle = '#ffd1ea'; ctx.lineWidth = 5; circle(ctx, 0, 0, R - 2.5); ctx.stroke();
        ctx.strokeStyle = COMBO_COLOR[7]; ctx.lineWidth = 4; circle(ctx, 0, 0, Math.max(1, R * (0.3 + 0.5 * t))); ctx.stroke();
      } else if (kind === 'deathBlast') { // 單件爆裂死亡: 鋸齒爆芒
        ctx.globalAlpha = 0.85 * fade; ctx.fillStyle = '#ff7a2a'; ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (var k = 0; k < 24; k++) { var ak = k * Math.PI / 12, rr = (k % 2 ? 0.62 : 1) * R - 1; if (k === 0) ctx.moveTo(Math.cos(ak) * rr, Math.sin(ak) * rr); else ctx.lineTo(Math.cos(ak) * rr, Math.sin(ak) * rr); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff3b0'; circle(ctx, 0, 0, R * 0.3 * fade); ctx.fill();
      } else { // blast: 爆裂彈, 圓滑琥珀圓 + 外擴亮環
        ctx.globalAlpha = 0.4 * fade; ctx.fillStyle = '#ffab3d'; circle(ctx, 0, 0, R); ctx.fill();
        ctx.globalAlpha = fade; ctx.strokeStyle = '#ffe2a8'; ctx.lineWidth = 3; circle(ctx, 0, 0, Math.max(1, R * (0.5 + 0.5 * t) - 1.5)); ctx.stroke();
        ctx.fillStyle = '#fff6d0'; circle(ctx, 0, 0, R * 0.25 * fade); ctx.fill();
      }
      ctx.restore();
    },
    drawHitSpark: function (ctx, s) {
      s = s || {};
      var t = prog(s.age, s.duration); if (t < 0) return;
      var x = num(s.x), y = num(s.y);
      ctx.save(); ctx.translate(x, y);
      ctx.globalAlpha = 1 - t; ctx.strokeStyle = '#fff4b0'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      var r0 = 3 + 5 * t, r1 = 6 + 4.8 * t;
      for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 + 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke(); }
      ctx.fillStyle = '#ffffff'; circle(ctx, 0, 0, 3.5 * (1 - t)); ctx.fill();
      ctx.restore();
    },
    drawMoveMarker: function (ctx, s) {
      s = s || {};
      var t = prog(s.age, s.duration); if (t < 0) return;
      var x = num(s.x), y = num(s.y);
      ctx.save(); ctx.translate(x, y);
      ctx.globalAlpha = 1 - t * 0.8;
      ctx.strokeStyle = palette.player; ctx.lineWidth = 2.5;
      circle(ctx, 0, 0, 14 - 8 * t); ctx.stroke();
      ctx.strokeStyle = palette.playerTrim; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
      ctx.restore();
    },
    drawPlacementGhost: function (ctx, s) {
      s = s || {};
      var x = num(s.x), y = num(s.y);
      ctx.save(); ctx.translate(x, y);
      if (s.kind === 'rally') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 13, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-6, 14); ctx.lineTo(-6, -14); ctx.stroke();
        ctx.fillStyle = palette.ally; ctx.strokeStyle = palette.outline; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(14, -9); ctx.lineTo(-5, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        var ok = s.valid !== false;
        ctx.globalAlpha = 0.5; towerBody(ctx, 0);
        ctx.globalAlpha = 1;
        if (ok) {
          ctx.strokeStyle = palette.valid; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
          ctx.strokeRect(-23, -23, 46, 46); ctx.setLineDash([]);
        } else {
          ctx.fillStyle = 'rgba(255,40,40,0.35)'; ctx.fillRect(-24, -24, 48, 48);
          ctx.strokeStyle = palette.invalid; ctx.lineWidth = 2; ctx.strokeRect(-23, -23, 46, 46);
          ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(14, 14); ctx.moveTo(14, -14); ctx.lineTo(-14, 14); ctx.stroke();
        }
      }
      ctx.restore();
    },
    drawComboBanner: function (ctx, s) {
      s = s || {};
      var dur = num(s.duration, 2.5), t = prog(s.age, dur); if (t < 0) return;
      var age = t * dur, c = comboIdx(s.combo);
      var col = c >= 0 ? COMBO_COLOR[c] : palette.textDim;
      var name = (s.name !== undefined && s.name !== null && s.name !== '') ? String(s.name) : (c >= 0 ? COMBO_NAME[c] : '?');
      var alpha = Math.min(1, age / 0.15, (dur - age) / 0.5);
      var sc = age < 0.25 ? 1 + 0.06 * Math.sin(age / 0.25 * Math.PI) : 1;
      ctx.save();
      ctx.translate(360, 190); ctx.scale(sc, sc); ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = 'rgba(14,18,28,0.94)'; rrect(ctx, -260, -36, 520, 72, 14); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 3; rrect(ctx, -258.5, -34.5, 517, 69, 13); ctx.stroke();
      ctx.fillStyle = col; rrect(ctx, -248, -26, 52, 52, 10); ctx.fill();
      comboIcon(ctx, c, -222, 0, 38, '#10131c');
      txt(ctx, '發現組合: ' + name, 30, 0, 30, palette.text, 'center', true, '#000000');
      ctx.restore();
    },
    drawHud: function (ctx, s) {
      s = s || {};
      ctx.save();
      ctx.fillStyle = palette.panel; ctx.fillRect(0, 0, 720, 100);
      ctx.strokeStyle = palette.panelLine; ctx.lineWidth = 2;
      ctx.fillStyle = palette.panelLine; ctx.fillRect(0, 98, 720, 2); ctx.fillRect(12, 49, 696, 2);
      // 金幣
      ctx.fillStyle = palette.gold; ctx.strokeStyle = palette.goldDark; ctx.lineWidth = 2; circle(ctx, 30, 25, 11); ctx.fill(); ctx.stroke();
      txt(ctx, Math.floor(num(s.gold, 0)), 50, 26, 28, palette.gold, 'left');
      // 主堡生命
      var hp = num(s.castleHp, 0), mhp = num(s.castleMaxHp, 20);
      ctx.save(); ctx.translate(176, 25); ctx.scale(0.24, 0.24); castleBody(ctx, 0); ctx.restore();
      txt(ctx, Math.max(0, Math.ceil(hp)) + '/' + mhp, 196, 26, 28, hp <= 5 ? palette.danger : palette.text, 'left');
      // 波次
      txt(ctx, '波次 ' + Math.floor(num(s.wave, 0)) + '/' + Math.floor(num(s.totalWaves, 6)), 410, 26, 26, palette.text, 'center');
      var nw = num(s.nextWaveIn, -1);
      if (nw >= 0) txt(ctx, '下一波 ' + Math.ceil(nw) + ' 秒', 706, 26, 24, nw <= 5 ? '#ffb070' : palette.textDim, 'right');
      // 下一波預告
      var next = arr(s.nextWave).slice(0, 4);
      if (next.length) {
        txt(ctx, '下一波', 12, 75, 17, palette.textDim, 'left');
        for (var i = 0; i < next.length; i++) {
          var it = next[i] || {}, et = enemyType(it.type), bx = 92 + i * 66;
          ctx.save(); ctx.translate(bx, 75); var sc = 26 / ENEMY_SIZE[et]; ctx.scale(sc, sc); enemyBody(ctx, et, 0); ctx.restore();
          txt(ctx, '×' + Math.floor(num(it.count, 0)), bx + 15, 76, 18, palette.text, 'left');
        }
      }
      // 圖鑑
      txt(ctx, '圖鑑', 362, 75, 15, palette.textDim, 'left');
      var disc = arr(s.discovered);
      for (var j = 0; j < 8; j++) {
        var cx = 414 + j * 39, on = !!disc[j];
        ctx.fillStyle = on ? COMBO_COLOR[j] : palette.cell; rrect(ctx, cx - 17, 58, 34, 34, 7); ctx.fill();
        ctx.strokeStyle = on ? '#ffffff' : palette.cellLine; ctx.lineWidth = on ? 1.5 : 1; ctx.stroke();
        if (on) comboIcon(ctx, j, cx, 75, 26, '#10131c');
        else txt(ctx, '?', cx, 76, 20, '#6c7489', 'center');
      }
      ctx.restore();
      if (s.slowMo) {
        ctx.save();
        ctx.strokeStyle = palette.slowMoFrame; ctx.globalAlpha = 0.35; ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, 710, 1270);
        ctx.restore();
      }
    },
    drawBottomPanel: function (ctx, s) {
      s = s || {};
      ctx.save();
      ctx.fillStyle = palette.panel; ctx.fillRect(0, 1160, 720, 120);
      ctx.strokeStyle = palette.panelLine; ctx.lineWidth = 2;
      ctx.fillStyle = palette.panelLine; ctx.fillRect(0, 1160, 720, 2); ctx.fillRect(339, 1170, 2, 102);
      // 背包
      txt(ctx, '背包', 12, 1172, 14, palette.textDim, 'left');
      var bag = arr(s.bag);
      var bx = [56, 136, 216, 296];
      for (var i = 0; i < 4; i++) partCell(ctx, bx[i], 1220, 68, bag[i], null, 0.62);
      var mode = (s.mode === 'target' || s.mode === 'shop') ? s.mode : 'none';
      if (mode === 'target') {
        txt(ctx, s.targetName === undefined || s.targetName === null ? '' : String(s.targetName), 520, 1176, 18, palette.text, 'center');
        var slots = arr(s.targetSlots).slice(0, 3), tx = [420, 500, 580], pairs = arr(s.targetPairs), paired = {};
        for (var p = 0; p < pairs.length; p++) {
          var pr = pairs[p] || {}, c = comboIdx(pr.combo), a = Math.floor(num(pr.a, -1)), b = Math.floor(num(pr.b, -1));
          if (c < 0 || a < 0 || b < 0 || a >= slots.length || b >= slots.length || a === b) continue;
          paired[a] = COMBO_COLOR[c]; paired[b] = COMBO_COLOR[c];
          var xa = tx[Math.min(a, b)], xb = tx[Math.max(a, b)];
          ctx.strokeStyle = COMBO_COLOR[c]; ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(xa, 1264); ctx.lineTo(xa, 1272); ctx.lineTo(xb, 1272); ctx.lineTo(xb, 1264); ctx.stroke();
        }
        for (var k = 0; k < slots.length; k++) {
          partCell(ctx, tx[k], 1228, 68, slots[k], paired[k], 0.62);
          if (paired[k]) { ctx.strokeStyle = paired[k]; ctx.lineWidth = 4; rrect(ctx, tx[k] - 34, 1194, 68, 68, 12); ctx.stroke(); }
        }
        // 關閉
        ctx.fillStyle = '#2a3042'; rrect(ctx, 666, 1178, 36, 36, 8); ctx.fill();
        ctx.strokeStyle = palette.cellLine; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = palette.text; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(676, 1188); ctx.lineTo(692, 1204); ctx.moveTo(692, 1188); ctx.lineTo(676, 1204); ctx.stroke();
      } else if (mode === 'shop') {
        var items = arr(s.shopItems).slice(0, 7);
        var pos = [[390, 1192], [476, 1192], [562, 1192], [648, 1192], [390, 1248], [476, 1248], [562, 1248]];
        for (var m = 0; m < items.length; m++) shopCell(ctx, pos[m][0], pos[m][1], items[m]);
        txt(ctx, '商店', 648, 1248, 18, palette.gold, 'center');
      } else {
        txt(ctx, '點單位看魂件', 530, 1206, 17, '#5c6478', 'center', false);
        txt(ctx, '回主堡旁可購買', 530, 1236, 17, '#5c6478', 'center', false);
      }
      ctx.restore();
    },
    drawResult: function (ctx, s) {
      s = s || {};
      ctx.save();
      ctx.fillStyle = 'rgba(5,7,12,0.78)'; ctx.fillRect(0, 0, 720, 1280);
      ctx.fillStyle = palette.panel; rrect(ctx, 90, 420, 540, 400, 20); ctx.fill();
      var win = !!s.win;
      ctx.strokeStyle = win ? palette.gold : palette.danger; ctx.lineWidth = 4; ctx.stroke();
      txt(ctx, win ? '勝利' : '主堡被攻陷', 360, 500, 56, win ? palette.gold : palette.danger, 'center', true, '#000000');
      txt(ctx, '第 ' + Math.floor(num(s.wave, 0)) + ' / ' + Math.floor(num(s.totalWaves, 6)) + ' 波', 360, 590, 32, palette.text, 'center');
      txt(ctx, '發現組合 ' + Math.floor(num(s.discoveredCount, 0)) + ' / ' + Math.floor(num(s.totalCombos, 8)), 360, 650, 32, palette.text, 'center');
      txt(ctx, '點擊畫面重新開始', 360, 750, 24, palette.textDim, 'center', false);
      ctx.restore();
    },

    // ---------- 說明頁示意圖(只畫在 x,y,w,h 框內; 標題 / 說明文字 / 頁碼 / 翻頁提示由 RD 畫) ----------
    drawGuidePage: function (ctx, s) {
      s = s || {};
      var page = Math.floor(num(s.page, 0));
      var g = GUIDE[page]; if (!g) return;
      var bx = num(s.x), by = num(s.y), bw = Math.max(1, num(s.w, g.w)), bh = Math.max(1, num(s.h, g.h));
      var k = Math.min(bw / g.w, bh / g.h);
      ctx.save();
      ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
      ctx.translate(bx + (bw - g.w * k) / 2, by + (bh - g.h * k) / 2);
      ctx.scale(k, k);
      ctx.fillStyle = palette.bg; rrect(ctx, 0, 0, g.w, g.h, 12); ctx.fill();
      ctx.beginPath(); ctx.rect(0, 0, g.w, g.h); ctx.clip();
      g.draw(ctx);
      ctx.restore();
    }
  };

  // ---------- 說明頁 ----------
  function at(ctx, x, y, k, fn) { ctx.save(); ctx.translate(x, y); ctx.scale(k, k); fn(); ctx.restore(); }
  function label(ctx, s, x, y, size, color) { txt(ctx, s, x, y, size || 17, color || palette.text, 'center', true, '#000000'); }
  var IDLE = { hitAge: 1, hitDuration: 0.2, attackAge: 1, attackDuration: 0.15, moving: false, slowed: false };
  function st(o) { var r = {}, k; for (k in IDLE) r[k] = IDLE[k]; for (k in o) r[k] = o[k]; return r; }

  var GUIDE = [
    { w: 300, h: 420, draw: function (ctx) { // 1 守住主堡
      var k = 0.396, ox = (300 - 720 * k) / 2;
      ctx.save(); ctx.translate(ox, 0); ctx.scale(k, k); ctx.translate(0, -100);
      Art.drawBackground(ctx);
      Art.drawCastle(ctx, { x: 360, y: 1090, hitAge: 0.3, hitDuration: 0.3, zoneActive: false, targeted: false });
      // 路上的小鬼(放大 1.8 倍讓縮圖看得到)
      var imps = [[420, 130], [80, 300], [380, 430], [640, 600], [260, 730], [80, 920]];
      for (var i = 0; i < imps.length; i++) at(ctx, imps[i][0], imps[i][1], 1.8, function () { Art.drawEnemy(ctx, st({ type: 'imp', x: 0, y: 0, hp: 30, maxHp: 30, moving: true })); });
      // 行進方向粗箭頭
      arrowLine(ctx, [[600, 130], [520, 130]], '#ffffff', 8);
      arrowLine(ctx, [[80, 1000], [300, 1000]], '#ffffff', 8);
      ctx.restore();
      label(ctx, '出怪口', ox + 640 * k - 10, 30 * k + 32, 17);
      label(ctx, '主堡', ox + 360 * k + 70, (1090 - 100) * k - 8, 17);
    } },
    { w: 400, h: 240, draw: function (ctx) { // 2 移動與撿錢
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(40, 140); ctx.lineTo(170, 140); ctx.stroke(); ctx.setLineDash([]);
      arrowLine(ctx, [[200, 140], [318, 140]], '#ffffff', 3);
      // 已撿起的金幣: +2
      txt(ctx, '+2', 105, 108, 18, palette.gold, 'center', true, '#000000');
      ctx.strokeStyle = 'rgba(255,204,51,0.6)'; ctx.lineWidth = 2; circle(ctx, 105, 140, 9); ctx.stroke();
      at(ctx, 250, 140, 1.4, function () { Art.drawCoin(ctx, { x: 0, y: 0 }); });
      at(ctx, 290, 140, 1.4, function () { Art.drawCoin(ctx, { x: 0, y: 0 }); });
      at(ctx, 175, 140, 1.6, function () { Art.drawPlayer(ctx, { x: 0, y: 0, moving: true, attackAge: 0.15, attackDuration: 0.15, targeted: false }); });
      label(ctx, '你', 175, 96, 18);
      at(ctx, 345, 140, 1.6, function () { Art.drawMoveMarker(ctx, { x: 0, y: 0, age: 0.05, duration: 0.5 }); });
      cursorIcon(ctx, 347, 143, 1.6);
      label(ctx, '點地面', 345, 96, 17);
    } },
    { w: 520, h: 320, draw: function (ctx) { // 3 拆與裝
      // 上半: 被點的箭塔
      at(ctx, 120, 92, 1.5, function () {
        Art.drawTower(ctx, st({ x: 0, y: 0, hp: 150, maxHp: 150, targeted: true }));
        Art.drawSoulSlots(ctx, { x: 0, y: -44, slots: ['ranged', null, null], pairs: [] });
      });
      cursorIcon(ctx, 128, 100, 1.4);
      // 角落: 屍體、自己
      at(ctx, 330, 100, 1.3, function () {
        Art.drawCorpse(ctx, { kind: 'imp', x: 0, y: 0, life: 10, maxLife: 12, targeted: true });
        Art.drawSoulSlots(ctx, { x: 0, y: -28, slots: ['melee', 'march'], pairs: [] });
      });
      label(ctx, '屍體', 330, 140, 16);
      at(ctx, 450, 100, 1.3, function () {
        Art.drawPlayer(ctx, { x: 0, y: 0, moving: false, attackAge: 0.15, attackDuration: 0.15, targeted: true });
        Art.drawSoulSlots(ctx, { x: 0, y: -36, slots: ['ranged', null], pairs: [] });
      });
      label(ctx, '自己', 450, 140, 16);
      // 下半: 底部面板(縮 0.722)
      var k = 520 / 720, py = 196;
      at(ctx, 0, py - 1160 * k, k, function () {
        Art.drawBottomPanel(ctx, { bag: [null, null, null, null], mode: 'target', targetName: '箭塔', targetSlots: ['ranged', null, null], targetPairs: [], shopItems: [] });
      });
      function P(x, y) { return [x * k, py + (y - 1160) * k]; }
      // 拆: 目標遠攻 → 背包
      var a0 = P(420, 1192), b0 = P(56, 1186);
      arrowLine(ctx, [a0, [(a0[0] + b0[0]) / 2, py - 40], b0], palette.gold, 3);
      label(ctx, '拆', (a0[0] + b0[0]) / 2, py - 30, 18, palette.gold);
      // 背包裡的遠攻(虛影)
      ctx.save(); ctx.globalAlpha = 0.45; var c0 = P(56, 1220); partIcon(ctx, 'ranged', c0[0], c0[1], 30); ctx.restore();
      // 裝: 背包 → 目標空格
      var a1 = P(56, 1258), b1 = P(500, 1264);
      arrowLine(ctx, [a1, [(a1[0] + b1[0]) / 2, 318], b1], palette.valid, 3);
      label(ctx, '裝', 96, 304, 18, palette.valid);
    } },
    { w: 480, h: 280, draw: function (ctx) { // 4 魂件會組合
      at(ctx, 120, 170, 2, function () {
        Art.drawTower(ctx, st({ x: 0, y: 0, hp: 150, maxHp: 150 }));
        Art.drawSoulSlots(ctx, { x: 0, y: -44, slots: ['ranged', 'ranged', null], pairs: [{ a: 0, b: 1, combo: 0 }] });
      });
      // 「?」新效果
      ctx.fillStyle = palette.cell; ctx.strokeStyle = COMBO_COLOR[0]; ctx.lineWidth = 3;
      circle(ctx, 120, 30, 22); ctx.fill(); ctx.stroke();
      txt(ctx, '?', 120, 32, 28, COMBO_COLOR[0], 'center');
      arrowLine(ctx, [[110, 64], [116, 56]], COMBO_COLOR[0], 2);
      // 圖鑑一排「?」
      var x0 = 268, y0 = 120;
      ctx.fillStyle = palette.panel; rrect(ctx, x0 - 14, y0 - 30, 210, 112, 10); ctx.fill();
      for (var i = 0; i < 8; i++) {
        var cx = x0 + 8 + (i % 4) * 48, cy = y0 + Math.floor(i / 4) * 48;
        ctx.fillStyle = palette.cell; rrect(ctx, cx - 18, cy - 18, 36, 36, 7); ctx.fill();
        ctx.strokeStyle = palette.cellLine; ctx.lineWidth = 1; ctx.stroke();
        txt(ctx, '?', cx, cy + 1, 22, '#6c7489', 'center');
      }
      label(ctx, '圖鑑', 360, 60, 18, palette.text);
      arrowLine(ctx, [[150, 30], [210, 30], [250, 100]], '#ffffff', 3, true);
    } },
    { w: 560, h: 320, draw: function (ctx) { // 5 購買
      // 上: 主堡區 + 玩家 + 商店面板
      at(ctx, 75, 62, 0.42, function () {
        Art.drawCastle(ctx, { x: 0, y: 0, hitAge: 0.3, hitDuration: 0.3, zoneActive: true, targeted: false });
        Art.drawPlayer(ctx, { x: 70, y: 80, moving: false, attackAge: 0.15, attackDuration: 0.15, targeted: false });
      });
      var shop = [{ name: '箭塔', price: 15, state: 'ok', kind: null }, { name: '步兵', price: 10, state: 'ok', kind: null }, { name: '樹精', price: 15, state: 'locked', kind: null },
        { name: '遠攻', price: 8, state: 'ok', kind: 'ranged' }, { name: '近戰', price: 8, state: 'ok', kind: 'melee' }, { name: '冰霜', price: 14, state: 'ok', kind: 'frost' }, { name: '爆裂', price: 14, state: 'ok', kind: 'blast' }];
      var k = 0.62;
      at(ctx, 170 - 340 * k, 14 - 1160 * k, k, function () {
        ctx.save(); ctx.beginPath(); ctx.rect(340, 1160, 380, 120); ctx.clip();
        Art.drawBottomPanel(ctx, { bag: [null, null, null, null], mode: 'shop', targetName: '', targetSlots: [], targetPairs: [], shopItems: shop });
        ctx.restore();
      });
      // 三格小圖
      for (var c = 0; c < 3; c++) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; rrect(ctx, 8 + c * 184, 124, 176, 188, 10); ctx.fill(); }
      // (1) 魂件 → 背包
      at(ctx, 52, 170, 1, function () { shopCell(ctx, 0, 0, shop[5]); });
      cursorIcon(ctx, 58, 176, 1.1);
      partCell(ctx, 130, 262, 52, 'frost', null, 0.62);
      arrowLine(ctx, [[60, 198], [80, 250], [100, 262]], palette.gold, 3);
      label(ctx, '背包', 130, 300, 15);
      // (2) 箭塔: 預覽 → 蓋下
      ctx.save(); ctx.fillStyle = palette.pathEdge; ctx.fillRect(194, 132, 18, 176); ctx.fillStyle = palette.path; ctx.fillRect(196, 132, 14, 176); ctx.restore();
      at(ctx, 254, 166, 0.9, function () { shopCell(ctx, 0, 0, shop[0]); });
      at(ctx, 310, 260, 1, function () { Art.drawPlacementGhost(ctx, { kind: 'tower', x: 0, y: 0, valid: true }); });
      cursorIcon(ctx, 314, 264, 1.1);
      arrowLine(ctx, [[270, 194], [300, 228]], palette.gold, 3);
      label(ctx, '路旁空地', 290, 298, 14);
      // (3) 步兵: 集合點, 從主堡走過去
      at(ctx, 420, 166, 0.9, function () { shopCell(ctx, 0, 0, shop[1]); });
      at(ctx, 420, 268, 0.32, function () { castleBody(ctx, 0); });
      at(ctx, 525, 210, 1, function () { Art.drawPlacementGhost(ctx, { kind: 'rally', x: 0, y: 0, valid: true }); });
      arrowLine(ctx, [[448, 258], [510, 224]], '#ffffff', 2.5, true);
      at(ctx, 474, 244, 0.9, function () { Art.drawSoldier(ctx, st({ x: 0, y: 0, hp: 70, maxHp: 70, moving: true })); });
      cursorIcon(ctx, 528, 214, 1.1);
    } },
    { w: 480, h: 280, draw: function (ctx) { // 6 招募中立單位
      at(ctx, 80, 110, 1.5, function () {
        Art.drawTreant(ctx, st({ x: 0, y: 0, team: 'neutral', hp: 200, maxHp: 200, moving: true }));
        Art.drawSoulSlots(ctx, { x: 0, y: -46, slots: ['march', null, null], pairs: [] });
      });
      label(ctx, '中立', 80, 168, 16, palette.neutralRim);
      arrowLine(ctx, [[130, 110], [300, 110]], '#ffffff', 3, true);
      at(ctx, 360, 104, 0.6, function () { Art.drawCastle(ctx, { x: 0, y: 0, hitAge: 0.3, hitDuration: 0.3, zoneActive: false, targeted: false }); });
      label(ctx, '主堡', 360, 168, 16);
      // 商店樹精: 鎖 → 可買
      at(ctx, 170, 230, 1, function () { shopCell(ctx, 0, 0, { name: '樹精', price: 15, state: 'locked', kind: null }); });
      arrowLine(ctx, [[220, 230], [262, 230]], palette.gold, 3);
      at(ctx, 312, 230, 1, function () { shopCell(ctx, 0, 0, { name: '樹精', price: 15, state: 'ok', kind: null }); });
    } }
  ];

  window.Art = Art;
})();
