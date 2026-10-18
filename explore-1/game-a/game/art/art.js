/* 魂匠急行 — 美術繪製模組(Canvas 2D 幾何繪製, 無外部資源)
 * 全域物件 window.Art, 不用 ES module。
 * 每個 draw 函式自己 save/restore; 只畫, 不改任何狀態。
 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : globalThis;

  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  var palette = {
    bg: '#4a6a3d',          // 草地
    grassDark: '#41603a',
    grassTuft: '#5a7c48',
    lane: '#a2896a',        // 路線
    laneEdge: '#76603f',
    laneMark: '#8f7757',
    outline: '#191a22',     // 全物件深色外框
    ally: '#3f7fe0',        // 我方(藍): 箭塔、步兵、主堡、我方石魔像
    allyDark: '#22457f',
    allyLight: '#8db8ff',
    enemyImp: '#d9443b',    // 敵人(紅系 + 尖角)
    enemyArcher: '#c2385f',
    enemyBrute: '#9c2626',
    enemyDark: '#4a1010',
    enemyEye: '#ffe14a',
    neutral: '#8a8a84',     // 中立石魔像(灰、閉眼)
    neutralDark: '#585854',
    golemAlly: '#7f95b6',
    golemAllyDark: '#45556e',
    golemEye: '#9be4ff',
    player: '#9c6cff',      // 玩家魂匠(紫斗篷 + 米白臉 + 錘子)
    playerDark: '#4d2f99',
    playerFace: '#f4ecd8',
    soulRanged: '#ff9a2e',  // 魂件: 遠攻(橘, 箭)
    soulMelee: '#ff5fd2',   // 魂件: 近戰(洋紅, 劍)
    soulSeek: '#5ee05a',    // 魂件: 索敵(綠, 眼)
    soulMarch: '#3fd8e8',   // 魂件: 進攻主堡(青, 城)
    slotBg: '#15161f',
    slotEmpty: '#6a6f80',
    target: '#ffffff',      // 互動目標外框 / 選中格
    kitBg: '#efe3c4',       // 非魂件物品底(羊皮紙方牌)
    kitEdge: '#5a4630',
    stone: '#a9b9cc',       // 擴槽石
    coin: '#ffd23f',
    coinDark: '#a8770d',
    pad: '#6d6a62',
    padLight: '#8e8a80',
    projAlly: '#bfe3ff',
    projEnemy: '#ff5a3c',
    spark: '#fff3a0',
    warn: '#ff6a2a',        // 路線預警(橘紅)
    hpAlly: '#6be36b',
    hpEnemy: '#ff5252',
    hudBg: '#171923',
    text: '#f4f1e8',
    textDim: '#a7a9b4',
    corpseEnemy: '#7a6262',
    corpseAlly: '#5f6b7c',
    corpseGolem: '#6c6c68',
  };

  var SOUL_KINDS = ['ranged', 'melee', 'seek', 'march'];
  var ITEM_KINDS = ['ranged', 'melee', 'seek', 'march', 'slotStone', 'towerKit', 'soldierKit', 'golemKit'];
  var SOUL_COLOR = { ranged: palette.soulRanged, melee: palette.soulMelee, seek: palette.soulSeek, march: palette.soulMarch };
  var ENEMY_SIZE = { imp: 32, archer: 32, brute: 44 };
  var CORPSE_SIZE = { imp: 32, archer: 32, brute: 44, tower: 48, soldier: 32, golem: 56 };

  // ---------- 小工具 ----------
  function S(s) { return (s && typeof s === 'object') ? s : {}; }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function nowSec() {
    var t = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return t / 1000;
  }
  function hexRgb(h) {
    h = String(h).replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function mix(a, b, t) {
    var x = hexRgb(a), y = hexRgb(b);
    t = clamp(t, 0, 1);
    return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' + Math.round(x[1] + (y[1] - x[1]) * t) + ',' + Math.round(x[2] + (y[2] - x[2]) * t) + ')';
  }
  function toHex(c) {
    // mix() 回傳 rgb(); 轉回 hex 讓 mix 可以再疊
    if (c.charAt(0) === '#') return c;
    var m = c.match(/\d+/g) || [0, 0, 0];
    return '#' + m.slice(0, 3).map(function (v) { var s = (+v).toString(16); return s.length < 2 ? '0' + s : s; }).join('');
  }
  function flashColor(c, f) { return f > 0 ? toHex(mix(c, '#ffffff', f * 0.75)) : c; }
  function timerProgress(age, dur) {
    // 回傳 0~1: 1 = 事件剛發生, 0 = 沒在播
    age = num(age, 0); dur = num(dur, 0);
    if (!(dur > 0) || age < 0 || age >= dur) return 0;
    return 1 - age / dur;
  }
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
  function fillStroke(ctx, fill, stroke, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function text(ctx, str, x, y, size, color, align, weight, outline) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    if (outline) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size * 0.22);
      ctx.strokeStyle = outline;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }
  function targetFrameOutside(ctx, x, y, w, h) {
    // 外框寬 3, 內緣貼齊判定框外邊(屬框外)
    ctx.strokeStyle = palette.target;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(x - w / 2 - 1.5, y - h / 2 - 1.5, w + 3, h + 3);
  }
  function hpBar(ctx, x, y, w, hp, maxHp, color) {
    hp = num(hp, 0); maxHp = num(maxHp, 0);
    if (!(maxHp > 0) || !(hp < maxHp)) return;
    var r = clamp(hp / maxHp, 0, 1);
    ctx.fillStyle = 'rgba(10,10,14,0.85)';
    ctx.fillRect(x - w / 2, y - 2, w, 4);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y - 2, w * r, 4);
  }
  function normItem(k) { return ITEM_KINDS.indexOf(k) >= 0 ? k : null; }
  function normEnemy(t) { return ENEMY_SIZE[t] ? t : 'imp'; }
  function normCorpse(k) { return CORPSE_SIZE[k] ? k : 'imp'; }
  function normTeam(t) { return t === 'ally' ? 'ally' : 'neutral'; }
  function unitAnim(s) {
    return {
      t: nowSec(),
      hit: timerProgress(s.hitAge, s.hitDuration),
      attack: timerProgress(s.attackAge, s.attackDuration),
      moving: !!s.moving,
      dead: false,
    };
  }

  // ---------- 物件本體畫家(以 0,0 為中心) ----------
  function paintTower(ctx, c, o) {
    var step = o.moving ? Math.sin(o.t * 14) * 2 : 0;
    var bob = o.moving ? Math.abs(Math.sin(o.t * 14)) * -1.5 : 0;
    var up = o.attack > 0 ? -2 * o.attack : 0;
    ctx.lineJoin = 'round';
    if (o.moving) { // 走路的腳
      ctx.fillStyle = c.dark;
      rr(ctx, -14 + step, 17, 7, 9, 2); ctx.fill();
      rr(ctx, 7 - step, 17, 7, 9, 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(0, bob);
    rr(ctx, -17, -10, 34, 31, 3); fillStroke(ctx, c.body, palette.outline, 2);
    // 磚縫
    ctx.strokeStyle = c.dark; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-16, 5); ctx.lineTo(16, 5); ctx.moveTo(-16, 13); ctx.lineTo(16, 13); ctx.stroke();
    ctx.translate(0, up);
    // 塔頂 + 垛口
    rr(ctx, -21, -20, 42, 12, 2); fillStroke(ctx, c.light, palette.outline, 2);
    ctx.fillStyle = c.light;
    [-21, -5, 11].forEach(function (x) { ctx.beginPath(); ctx.rect(x, -23, 10, 4); fillStroke(ctx, c.light, palette.outline, 2); });
    // 箭孔
    ctx.fillStyle = palette.outline;
    ctx.fillRect(-2, -5, 4, 9);
    if (o.dead) { // 裂痕
      ctx.strokeStyle = palette.outline; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(-3, -10); ctx.lineTo(-8, 0); ctx.lineTo(2, 12); ctx.stroke();
    }
    if (o.attack > 0) { // 射擊閃光
      ctx.globalAlpha = o.attack;
      ctx.fillStyle = '#ffffff';
      circle(ctx, 0, -14, 4 + 3 * o.attack); ctx.fill();
    }
    ctx.restore();
  }

  function paintSoldier(ctx, c, o) {
    var step = o.moving ? Math.sin(o.t * 16) * 2 : 0;
    var bob = o.moving ? Math.abs(Math.sin(o.t * 16)) * -1.5 : 0;
    var up = o.attack > 0 ? -2 * o.attack : 0;
    ctx.lineJoin = 'round';
    if (o.moving) {
      ctx.fillStyle = c.dark;
      ctx.fillRect(-7 + step, 12, 5, 6);
      ctx.fillRect(2 - step, 12, 5, 6);
    }
    ctx.save();
    ctx.translate(0, bob + up);
    // 劍
    var swing = o.attack > 0 ? o.attack : 0;
    ctx.strokeStyle = swing > 0 ? '#ffffff' : '#d9dde6'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(9, 2); ctx.lineTo(13 - 6 * swing, -12 + 4 * swing); ctx.stroke();
    // 身體
    rr(ctx, -10, -2, 20, 15, 4); fillStroke(ctx, c.body, palette.outline, 2);
    // 頭
    circle(ctx, 0, -7, 8); fillStroke(ctx, o.dead ? c.light : palette.playerFace, palette.outline, 2);
    // 頭盔
    ctx.beginPath(); ctx.arc(0, -7, 8, Math.PI, 0); ctx.closePath(); fillStroke(ctx, c.light, palette.outline, 2);
    // 眼
    if (o.dead) xEyes(ctx, -3, -4, 3, -4, 2);
    else { ctx.fillStyle = palette.outline; ctx.fillRect(-4, -5, 2, 3); ctx.fillRect(2, -5, 2, 3); }
    // 盾
    circle(ctx, -10, 6, 5); fillStroke(ctx, c.dark, palette.outline, 2);
    ctx.fillStyle = c.light; circle(ctx, -10, 6, 1.8); ctx.fill();
    ctx.restore();
  }

  function paintGolem(ctx, c, o) {
    var step = o.moving ? Math.sin(o.t * 10) * 2 : 0;
    var bob = o.moving ? Math.abs(Math.sin(o.t * 10)) * -1.5 : 0;
    var up = o.attack > 0 ? -2 * o.attack : 0;
    ctx.lineJoin = 'round';
    if (o.moving) {
      ctx.fillStyle = c.dark;
      rr(ctx, -15 + step, 22, 10, 8, 2); ctx.fill();
      rr(ctx, 5 - step, 22, 10, 8, 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(0, bob);
    // 手臂
    var arm = o.attack > 0 ? -4 * o.attack : 0;
    rr(ctx, -27, -6 + arm, 8, 22, 3); fillStroke(ctx, c.dark, palette.outline, 2);
    rr(ctx, 19, -6 + arm, 8, 22, 3); fillStroke(ctx, c.dark, palette.outline, 2);
    // 身體
    rr(ctx, -19, -12, 38, 35, 5); fillStroke(ctx, c.body, palette.outline, 2);
    // 頭
    ctx.translate(0, up);
    rr(ctx, -12, -26, 24, 16, 4); fillStroke(ctx, c.body, palette.outline, 2);
    // 石紋
    ctx.strokeStyle = c.dark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-12, 2); ctx.lineTo(-4, 8); ctx.lineTo(-8, 16); ctx.moveTo(8, -6); ctx.lineTo(12, 4); ctx.stroke();
    if (c.band) { // 我方: 胸前藍帶
      ctx.fillStyle = c.band; ctx.fillRect(-18, -4, 36, 5);
    }
    // 眼
    if (o.dead) xEyes(ctx, -6, -18, 6, -18, 3);
    else if (c.eyesOpen) {
      ctx.fillStyle = c.eye;
      ctx.shadowColor = c.eye; ctx.shadowBlur = 6;
      ctx.fillRect(-8, -21, 5, 4); ctx.fillRect(3, -21, 5, 4);
      ctx.shadowBlur = 0;
    } else { // 中立: 閉眼
      ctx.strokeStyle = palette.outline; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-9, -18); ctx.lineTo(-3, -18); ctx.moveTo(3, -18); ctx.lineTo(9, -18); ctx.stroke();
    }
    ctx.restore();
  }

  function xEyes(ctx, x1, y1, x2, y2, r) {
    ctx.strokeStyle = palette.outline; ctx.lineWidth = 1.8;
    ctx.beginPath();
    [[x1, y1], [x2, y2]].forEach(function (p) {
      ctx.moveTo(p[0] - r, p[1] - r); ctx.lineTo(p[0] + r, p[1] + r);
      ctx.moveTo(p[0] + r, p[1] - r); ctx.lineTo(p[0] - r, p[1] + r);
    });
    ctx.stroke();
  }

  function enemyEyes(ctx, o, x1, x2, y) {
    if (o.dead) { xEyes(ctx, x1, y, x2, y, 2.2); return; }
    ctx.fillStyle = palette.enemyEye;
    ctx.beginPath(); ctx.moveTo(x1 - 3, y - 2); ctx.lineTo(x1 + 3, y); ctx.lineTo(x1 - 2, y + 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x2 + 3, y - 2); ctx.lineTo(x2 - 3, y); ctx.lineTo(x2 + 2, y + 2); ctx.closePath(); ctx.fill();
  }

  function paintImp(ctx, c, o) {
    var step = o.moving ? Math.sin(o.t * 16) * 2 : 0;
    var bob = o.moving ? Math.abs(Math.sin(o.t * 16)) * -1.5 : 0;
    var up = o.attack > 0 ? -2 * o.attack : 0;
    ctx.lineJoin = 'round';
    if (o.moving) {
      ctx.fillStyle = c.dark;
      ctx.fillRect(-7 + step, 13, 5, 5); ctx.fillRect(2 - step, 13, 5, 5);
    }
    ctx.save(); ctx.translate(0, bob + up);
    // 角
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-11, -15); ctx.lineTo(-3, -8); ctx.closePath(); fillStroke(ctx, c.dark, palette.outline, 1.5);
    ctx.beginPath(); ctx.moveTo(9, -4); ctx.lineTo(11, -15); ctx.lineTo(3, -8); ctx.closePath(); fillStroke(ctx, c.dark, palette.outline, 1.5);
    circle(ctx, 0, 3, 12); fillStroke(ctx, c.body, palette.outline, 2);
    enemyEyes(ctx, o, -5, 5, 0);
    // 牙
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(-4, 7); ctx.lineTo(-2, 11); ctx.lineTo(0, 7); ctx.lineTo(2, 11); ctx.lineTo(4, 7); ctx.closePath(); ctx.fill();
    if (o.attack > 0) clawSlash(ctx, 10, 2, o.attack, 6);
    ctx.restore();
  }

  function paintArcher(ctx, c, o) {
    var step = o.moving ? Math.sin(o.t * 16) * 2 : 0;
    var bob = o.moving ? Math.abs(Math.sin(o.t * 16)) * -1.5 : 0;
    var up = o.attack > 0 ? -2 * o.attack : 0;
    ctx.lineJoin = 'round';
    if (o.moving) {
      ctx.fillStyle = c.dark;
      ctx.fillRect(-7 + step, 12, 5, 5); ctx.fillRect(2 - step, 12, 5, 5);
    }
    ctx.save(); ctx.translate(0, bob + up);
    // 尖帽兜
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(12, 13); ctx.lineTo(-12, 13); ctx.closePath(); fillStroke(ctx, c.body, palette.outline, 2);
    // 臉洞
    ctx.beginPath(); ctx.ellipse(0, 2, 6, 5, 0, 0, Math.PI * 2); ctx.fillStyle = c.dark; ctx.fill();
    enemyEyes(ctx, o, -3, 3, 2);
    // 弓
    ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(6, 2, 9, -1.1, 1.1); ctx.stroke();
    ctx.strokeStyle = o.attack > 0 ? '#ffffff' : '#d8d0c0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(6 + 9 * Math.cos(-1.1), 2 + 9 * Math.sin(-1.1)); ctx.lineTo(6 + 9 * Math.cos(1.1) - (o.attack > 0 ? 0 : 0), 2 + 9 * Math.sin(1.1)); ctx.stroke();
    ctx.restore();
  }

  function paintBrute(ctx, c, o) {
    var step = o.moving ? Math.sin(o.t * 12) * 2 : 0;
    var bob = o.moving ? Math.abs(Math.sin(o.t * 12)) * -1.5 : 0;
    var up = o.attack > 0 ? -2 * o.attack : 0;
    ctx.lineJoin = 'round';
    if (o.moving) {
      ctx.fillStyle = c.dark;
      ctx.fillRect(-11 + step, 18, 7, 6); ctx.fillRect(4 - step, 18, 7, 6);
    }
    ctx.save(); ctx.translate(0, bob + up);
    // 背刺
    ctx.fillStyle = c.dark;
    for (var i = 0; i < 4; i++) {
      var bx = -12 + i * 8;
      ctx.beginPath(); ctx.moveTo(bx - 4, -8); ctx.lineTo(bx, -19); ctx.lineTo(bx + 4, -8); ctx.closePath(); fillStroke(ctx, c.dark, palette.outline, 1.5);
    }
    // 身體
    rr(ctx, -16, -10, 32, 29, 9); fillStroke(ctx, c.body, palette.outline, 2);
    // 拳
    circle(ctx, -16, 9, 5); fillStroke(ctx, c.dark, palette.outline, 2);
    circle(ctx, 16, 9, 5); fillStroke(ctx, c.dark, palette.outline, 2);
    // 角
    ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-19, -14); ctx.lineTo(-8, -9); ctx.closePath(); fillStroke(ctx, '#e8dcc0', palette.outline, 1.5);
    ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(19, -14); ctx.lineTo(8, -9); ctx.closePath(); fillStroke(ctx, '#e8dcc0', palette.outline, 1.5);
    enemyEyes(ctx, o, -6, 6, 0);
    ctx.fillStyle = palette.outline; ctx.fillRect(-6, 7, 12, 3);
    if (o.attack > 0) clawSlash(ctx, 14, 2, o.attack, 7);
    ctx.restore();
  }

  function clawSlash(ctx, x, y, a, len) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (var i = -1; i <= 1; i++) { ctx.moveTo(x - 1, y + i * 4 - len / 2); ctx.lineTo(x + 1, y + i * 4 + len / 2); }
    ctx.stroke();
    ctx.restore();
  }

  function paintPlayer(ctx, o) {
    var step = o.moving ? Math.sin(o.t * 18) * 2.2 : 0;
    var bob = o.moving ? Math.abs(Math.sin(o.t * 18)) * -1.5 : 0;
    ctx.lineJoin = 'round';
    // 腳下光圈: 玩家專屬, 讓魂匠在單位堆裡一眼找得到
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.ellipse(0, 12, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (o.moving) {
      ctx.fillStyle = palette.playerDark;
      ctx.fillRect(-7 + step, 10, 5, 5); ctx.fillRect(2 - step, 10, 5, 5);
    }
    ctx.save(); ctx.translate(0, bob);
    // 斗篷
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.quadraticCurveTo(13, -9, 12, 12); ctx.lineTo(-12, 12); ctx.quadraticCurveTo(-13, -9, 0, -13); ctx.closePath();
    fillStroke(ctx, palette.player, palette.outline, 2);
    // 臉
    circle(ctx, 0, -3, 6.5); fillStroke(ctx, palette.playerFace, palette.outline, 1.5);
    ctx.fillStyle = palette.outline; ctx.fillRect(-3, -4, 2, 2.5); ctx.fillRect(1, -4, 2, 2.5);
    // 錘子
    ctx.strokeStyle = '#7a4f26'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(8, 10); ctx.lineTo(11.5, -2); ctx.stroke();
    rr(ctx, 8, -7, 6.5, 6, 1); fillStroke(ctx, '#c9ced8', palette.outline, 1.5);
    ctx.restore();
  }

  // ---------- 魂件 / 物品圖示(全畫面共用一套) ----------
  function soulGlyph(ctx, kind, r) {
    ctx.strokeStyle = palette.outline;
    ctx.fillStyle = palette.outline;
    ctx.lineWidth = Math.max(1.4, r * 0.22);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var k = r;
    if (kind === 'ranged') { // 斜箭
      ctx.beginPath(); ctx.moveTo(-0.5 * k, 0.5 * k); ctx.lineTo(0.45 * k, -0.45 * k); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.6 * k, -0.6 * k); ctx.lineTo(0.05 * k, -0.5 * k); ctx.lineTo(0.5 * k, -0.05 * k); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-0.5 * k, 0.5 * k); ctx.lineTo(-0.6 * k, 0.2 * k); ctx.moveTo(-0.5 * k, 0.5 * k); ctx.lineTo(-0.2 * k, 0.6 * k); ctx.stroke();
    } else if (kind === 'melee') { // 直劍
      ctx.beginPath(); ctx.moveTo(0, -0.62 * k); ctx.lineTo(0, 0.25 * k); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.38 * k, 0.25 * k); ctx.lineTo(0.38 * k, 0.25 * k); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0.25 * k); ctx.lineTo(0, 0.6 * k); ctx.stroke();
    } else if (kind === 'seek') { // 眼
      ctx.beginPath();
      ctx.moveTo(-0.62 * k, 0); ctx.quadraticCurveTo(0, -0.62 * k, 0.62 * k, 0); ctx.quadraticCurveTo(0, 0.62 * k, -0.62 * k, 0); ctx.closePath();
      ctx.stroke();
      circle(ctx, 0, 0, 0.2 * k); ctx.fill();
    } else if (kind === 'march') { // 小城(主堡)
      var w = 0.56 * k;
      ctx.beginPath();
      ctx.moveTo(-w, 0.5 * k); ctx.lineTo(-w, -0.5 * k); ctx.lineTo(-w * 0.45, -0.5 * k); ctx.lineTo(-w * 0.45, -0.25 * k);
      ctx.lineTo(w * 0.0 - 0.12 * k, -0.25 * k); ctx.lineTo(-0.12 * k, -0.5 * k); ctx.lineTo(0.12 * k, -0.5 * k); ctx.lineTo(0.12 * k, -0.25 * k);
      ctx.lineTo(w * 0.45, -0.25 * k); ctx.lineTo(w * 0.45, -0.5 * k); ctx.lineTo(w, -0.5 * k); ctx.lineTo(w, 0.5 * k); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = SOUL_COLOR.march;
      ctx.beginPath(); ctx.arc(0, 0.5 * k, 0.18 * k, Math.PI, 0); ctx.closePath(); ctx.fill();
    }
    ctx.lineCap = 'butt';
  }

  // 圖示: 中心 (cx, cy), 邊長 s。魂件 = 彩色圓 + 深色符號; 其他物品 = 羊皮紙方牌 + 小圖
  function drawItemIcon(ctx, item, cx, cy, s) {
    item = normItem(item);
    if (!item) return;
    ctx.save();
    ctx.translate(cx, cy);
    if (SOUL_KINDS.indexOf(item) >= 0) {
      var r = s / 2 - 1;
      circle(ctx, 0, 0, r); fillStroke(ctx, SOUL_COLOR[item], palette.outline, 1.5);
      soulGlyph(ctx, item, r);
    } else {
      rr(ctx, -s / 2 + 1, -s / 2 + 1, s - 2, s - 2, s * 0.15); fillStroke(ctx, palette.kitBg, palette.kitEdge, 1.5);
      if (item === 'slotStone') {
        var h = s * 0.34;
        ctx.beginPath();
        for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * h, Math.sin(a) * h); }
        ctx.closePath(); fillStroke(ctx, palette.stone, palette.outline, 1.5);
        ctx.strokeStyle = palette.outline; ctx.lineWidth = Math.max(1.5, s * 0.08);
        ctx.beginPath(); ctx.moveTo(-h * 0.5, 0); ctx.lineTo(h * 0.5, 0); ctx.moveTo(0, -h * 0.5); ctx.lineTo(0, h * 0.5); ctx.stroke();
      } else {
        var o = { t: 0, hit: 0, attack: 0, moving: false, dead: false };
        if (item === 'towerKit') { ctx.scale(s / 64, s / 64); paintTower(ctx, allyColors(), o); }
        else if (item === 'soldierKit') { ctx.scale(s / 44, s / 44); ctx.translate(0, 1); paintSoldier(ctx, allyColors(), o); }
        else if (item === 'golemKit') { ctx.scale(s / 76, s / 76); ctx.translate(0, 1); paintGolem(ctx, golemColors('ally', 0), o); }
      }
    }
    ctx.restore();
  }

  function allyColors(f) {
    f = f || 0;
    return { body: flashColor(palette.ally, f), dark: flashColor(palette.allyDark, f), light: flashColor(palette.allyLight, f) };
  }
  function golemColors(team, f) {
    if (team === 'ally') return { body: flashColor(palette.golemAlly, f), dark: flashColor(palette.golemAllyDark, f), band: palette.ally, eye: palette.golemEye, eyesOpen: true };
    return { body: flashColor(palette.neutral, f), dark: flashColor(palette.neutralDark, f), band: null, eye: null, eyesOpen: false };
  }
  function enemyColors(type, f) {
    var b = type === 'archer' ? palette.enemyArcher : (type === 'brute' ? palette.enemyBrute : palette.enemyImp);
    return { body: flashColor(b, f), dark: flashColor(palette.enemyDark, f) };
  }
  var ENEMY_PAINTER = { imp: paintImp, archer: paintArcher, brute: paintBrute };

  function drawCastleShape(ctx, x, y, f, zoneActive, targeted, noZone) {
    // 主堡區(半徑 110 外緣)
    ctx.save();
    if (noZone) {
      // HUD 小圖示不畫範圍圈
    } else if (zoneActive) {
      circle(ctx, x, y, 108.75);
      ctx.fillStyle = 'rgba(255,240,200,0.08)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,200,0.85)'; ctx.lineWidth = 2.5; ctx.stroke();
    } else {
      circle(ctx, x, y, 109.25);
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(255,240,200,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    var body = f > 0 ? toHex(mix('#3466b8', '#ff3030', f)) : '#3466b8';
    var top = f > 0 ? toHex(mix('#5d8fe0', '#ff6060', f)) : '#5d8fe0';
    ctx.lineJoin = 'round';
    // 主體
    rr(ctx, -46, -30, 92, 82, 4); fillStroke(ctx, body, palette.outline, 2.5);
    // 兩側塔樓
    rr(ctx, -54, -42, 26, 94, 3); fillStroke(ctx, top, palette.outline, 2.5);
    rr(ctx, 28, -42, 26, 94, 3); fillStroke(ctx, top, palette.outline, 2.5);
    [-54, -41, 28, 41].forEach(function (bx) { ctx.beginPath(); ctx.rect(bx, -52, 13, 10); fillStroke(ctx, top, palette.outline, 2); });
    // 中央垛口
    [-28, -12, 4, 20].forEach(function (bx, i) { if (i % 2 === 0) { ctx.beginPath(); ctx.rect(bx, -40, 10, 10); fillStroke(ctx, body, palette.outline, 2); } });
    // 城門
    ctx.beginPath(); ctx.moveTo(-14, 52); ctx.lineTo(-14, 26); ctx.arc(0, 26, 14, Math.PI, 0); ctx.lineTo(14, 52); ctx.closePath();
    fillStroke(ctx, '#2a1d14', palette.outline, 2);
    // 窗
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(-45, -22, 5, 10); ctx.fillRect(40, -22, 5, 10); ctx.fillRect(-4, -14, 8, 12);
    // 旗
    ctx.strokeStyle = palette.outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, -54); ctx.stroke();
    ctx.fillStyle = palette.allyLight; ctx.beginPath(); ctx.moveTo(1, -54); ctx.lineTo(14, -49); ctx.lineTo(1, -44); ctx.closePath(); ctx.fill();
    if (targeted) {
      ctx.strokeStyle = palette.target; ctx.lineWidth = 3;
      ctx.strokeRect(-56 + 1.5, -56 + 1.5, 109, 109);
    }
    ctx.restore();
  }

  function drawKey(ctx, label, x, y, w) {
    w = w || 22;
    ctx.save();
    rr(ctx, x - w / 2, y - 11, w, 22, 4);
    fillStroke(ctx, '#f4f1e8', palette.outline, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x - w / 2 + 2, y + 6, w - 4, 3);
    text(ctx, label, x, y - 1, 14, palette.outline, 'center', 'bold');
    ctx.restore();
  }

  function drawCoinShape(ctx, x, y, r) {
    circle(ctx, x, y, r); fillStroke(ctx, palette.coin, palette.coinDark, 1.5);
    ctx.strokeStyle = palette.coinDark; ctx.lineWidth = 1.2;
    circle(ctx, x, y, r * 0.55); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    circle(ctx, x - r * 0.35, y - r * 0.35, r * 0.2); ctx.fill();
  }

  function drawLock(ctx, x, y, s) {
    ctx.strokeStyle = '#c9ccd6'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y - s * 0.15, s * 0.28, Math.PI, 0); ctx.stroke();
    rr(ctx, x - s * 0.4, y - s * 0.15, s * 0.8, s * 0.6, 3); fillStroke(ctx, '#c9ccd6', palette.outline, 1.5);
    ctx.fillStyle = palette.outline; circle(ctx, x, y + s * 0.12, s * 0.08); ctx.fill();
  }

  function shopCell(ctx, it, cx, cy, w, h) {
    it = S(it);
    var st = (it.state === 'poor' || it.state === 'locked') ? it.state : 'ok';
    var key = String(it.key == null ? '' : it.key);
    ctx.save();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 6);
    fillStroke(ctx, st === 'ok' ? '#2c3042' : '#1f2230', st === 'ok' ? '#6c7392' : '#3a3e50', 1.5);
    var kx = cx - w / 2 + 15, ky = cy - h / 2 + 15;
    if (st === 'locked') {
      ctx.globalAlpha = 0.6;
      drawKey(ctx, key, kx, ky);
      ctx.globalAlpha = 1;
      drawLock(ctx, cx, cy + 2, 26);
      ctx.restore();
      return;
    }
    if (st === 'poor') ctx.globalAlpha = 0.42;
    drawKey(ctx, key, kx, ky);
    var nameToItem = { '箭塔材料': 'towerKit', '箭塔': 'towerKit', '步兵': 'soldierKit', '擴槽石': 'slotStone', '石魔像': 'golemKit' };
    var keyToItem = { '1': 'towerKit', '2': 'soldierKit', '3': 'slotStone', '4': 'golemKit' };
    var icon = nameToItem[it.name] || keyToItem[key];
    drawItemIcon(ctx, icon, cx, cy - h / 2 + 22, 28);
    text(ctx, String(it.name == null ? '' : it.name), cx, cy + h / 2 - 27, 14, palette.text, 'center', 'bold');
    var price = String(num(it.price, 0));
    ctx.font = 'bold 14px ' + FONT;
    var pw = ctx.measureText(price).width || 16;
    drawCoinShape(ctx, cx - pw / 2 - 5, cy + h / 2 - 10, 5);
    text(ctx, price, cx + 4, cy + h / 2 - 10, 14, st === 'poor' ? '#ff7a7a' : palette.coin, 'center', 'bold');
    ctx.restore();
  }

  // ---------- 說明頁 ----------
  function tag(ctx, str, x, y, align, color) {
    text(ctx, str, x, y, 14, color || palette.text, align || 'center', 'bold', 'rgba(15,16,22,0.9)');
  }
  function arrowLine(ctx, x1, y1, x2, y2, color, dashed, lw) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw || 3;
    if (dashed) ctx.setLineDash([8, 6]);
    var a = Math.atan2(y2 - y1, x2 - x1), hl = 10 + (lw || 3);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.6, y2 - Math.sin(a) * hl * 0.6); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.5) * hl, y2 - Math.sin(a - 0.5) * hl);
    ctx.lineTo(x2 - Math.cos(a + 0.5) * hl, y2 - Math.sin(a + 0.5) * hl);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function guideGround(ctx, w, h) {
    rr(ctx, 0, 0, w, h, 8);
    ctx.fillStyle = palette.bg; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  }
  function divider(ctx, x, h) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, h - 14); ctx.stroke(); ctx.setLineDash([]);
  }
  var IDLE = { hitAge: 1, hitDuration: 0.2, attackAge: 1, attackDuration: 0.15, moving: false };
  function U(extra) { var o = {}, k; for (k in IDLE) o[k] = IDLE[k]; for (k in extra) o[k] = extra[k]; return o; }

  var GUIDE = [
    { // 1 守住主堡
      w: 480, h: 270,
      draw: function (ctx, A) {
        guideGround(ctx, 480, 270);
        ctx.save();
        ctx.scale(0.375, 0.375);
        A.drawBackground(ctx, true);
        A.drawCastle(ctx, { x: 640, y: 430, hitAge: 0.3, hitDuration: 0.3, zoneActive: false, targeted: false });
        A.drawEnemy(ctx, U({ type: 'imp', x: 250, y: 430, hp: 30, maxHp: 30, moving: true }));
        A.drawEnemy(ctx, U({ type: 'imp', x: 150, y: 430, hp: 30, maxHp: 30, moving: true }));
        A.drawEnemy(ctx, U({ type: 'archer', x: 1030, y: 430, hp: 24, maxHp: 24, moving: true }));
        A.drawEnemy(ctx, U({ type: 'imp', x: 1130, y: 430, hp: 30, maxHp: 30, moving: true }));
        A.drawEnemy(ctx, U({ type: 'brute', x: 640, y: 250, hp: 70, maxHp: 70, moving: true }));
        A.drawLaneWarning(ctx, { lane: 'north', remaining: 3.4, total: 5 });
        // 往主堡的方向箭頭
        arrowLine(ctx, 320, 380, 520, 380, 'rgba(255,255,255,0.85)', true, 8);
        arrowLine(ctx, 960, 380, 760, 380, 'rgba(255,255,255,0.85)', true, 8);
        arrowLine(ctx, 700, 190, 700, 340, 'rgba(255,255,255,0.85)', true, 8);
        ctx.restore();
        tag(ctx, '主堡', 240, 161 + 56 * 0.375 + 12);
        tag(ctx, '預警', 240 + 34, 90 * 0.375, 'left', '#ffb08a');
      },
    },
    { // 2 移動與撿錢
      w: 400, h: 240,
      draw: function (ctx, A) {
        guideGround(ctx, 400, 240);
        A.drawCorpse(ctx, { kind: 'imp', x: 230, y: 130, life: 8, maxLife: 10, targeted: false });
        // 走過的路徑
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([6, 7]);
        ctx.beginPath(); ctx.moveTo(70, 172); ctx.lineTo(284, 161); ctx.stroke();
        ctx.restore();
        // 已撿起的金幣: 淡圈 + 「+2」
        [[210, 162, 18], [196, 150, -18]].forEach(function (p) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,210,63,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
          circle(ctx, p[0], p[1], 7); ctx.stroke();
          ctx.restore();
          tag(ctx, '+2', p[0] + (p[2] > 0 ? 4 : -8), p[1] + p[2], 'center', palette.coin);
        });
        // 還在地上的金幣
        A.drawCoin(ctx, { x: 258, y: 104, life: 6, maxLife: 7 });
        A.drawCoin(ctx, { x: 196, y: 112, life: 6, maxLife: 7 });
        A.drawCoin(ctx, { x: 232, y: 96, life: 6, maxLife: 7 });
        A.drawPlayer(ctx, { x: 300, y: 160, moving: true, handItem: null, holding: false, holdProgress: 0 });
        drawKey(ctx, 'W', 300, 124);
        drawKey(ctx, 'A', 274, 200); drawKey(ctx, 'S', 300, 200); drawKey(ctx, 'D', 326, 200);
        // 迷你 HUD 金幣
        ctx.save();
        rr(ctx, 12, 12, 112, 34, 6); fillStroke(ctx, palette.hudBg, '#3a3e50', 1.5);
        drawCoinShape(ctx, 30, 29, 9);
        text(ctx, '34', 46, 29, 20, palette.coin, 'left', 'bold');
        text(ctx, '+4', 82, 29, 14, palette.hpAlly, 'left', 'bold');
        ctx.restore();
      },
    },
    { // 3 拆魂件
      w: 520, h: 260,
      draw: function (ctx, A) {
        guideGround(ctx, 520, 260);
        divider(ctx, 260, 260);
        // 左: 按住中
        A.drawTower(ctx, U({ x: 70, y: 160, hp: 120, maxHp: 120, targeted: true }));
        A.drawSoulSlots(ctx, { x: 70, y: 116, slots: ['ranged', null], highlight: 0 });
        A.drawPlayer(ctx, { x: 136, y: 165, moving: false, handItem: null, holding: true, holdProgress: 0.5 });
        drawKey(ctx, 'J', 160, 214); tag(ctx, '按住', 144, 214, 'right');
        drawKey(ctx, 'K', 118, 116); tag(ctx, '換格', 133, 116, 'left');
        // 中間箭頭
        arrowLine(ctx, 238, 160, 282, 160, '#ffffff', false, 4);
        // 右: 完成
        A.drawTower(ctx, U({ x: 330, y: 160, hp: 120, maxHp: 120, targeted: true }));
        A.drawSoulSlots(ctx, { x: 330, y: 116, slots: [null, null], highlight: -1 });
        A.drawPlayer(ctx, { x: 396, y: 165, moving: false, handItem: 'ranged', holding: false, holdProgress: 0 });
        // 角落: 屍體也能拆
        A.drawCorpse(ctx, { kind: 'imp', x: 474, y: 214, life: 7, maxLife: 10, targeted: false });
        A.drawSoulSlots(ctx, { x: 474, y: 214 - 16 - 12, slots: ['melee', 'march'], highlight: -1 });
        tag(ctx, '屍體', 474, 244);
      },
    },
    { // 4 裝魂件 / 丟下
      w: 520, h: 260,
      draw: function (ctx, A) {
        guideGround(ctx, 520, 260);
        divider(ctx, 372, 260);
        A.drawTower(ctx, U({ x: 56, y: 150, hp: 120, maxHp: 120, targeted: true }));
        A.drawSoulSlots(ctx, { x: 56, y: 106, slots: ['ranged', null], highlight: 0 });
        A.drawPlayer(ctx, { x: 122, y: 155, moving: false, handItem: 'ranged', holding: true, holdProgress: 0.6 });
        drawKey(ctx, 'J', 142, 206); tag(ctx, '按住', 126, 206, 'right');
        arrowLine(ctx, 166, 150, 210, 150, '#ffffff', false, 4);
        A.drawTower(ctx, U({ x: 250, y: 150, hp: 120, maxHp: 120, targeted: true }));
        A.drawSoulSlots(ctx, { x: 250, y: 106, slots: ['ranged', 'ranged'], highlight: 1 });
        A.drawPlayer(ctx, { x: 316, y: 155, moving: false, handItem: null, holding: false, holdProgress: 0 });
        // 右: 按 L 丟下
        ctx.save();
        ctx.globalAlpha = 0.35;
        drawItemIcon(ctx, 'ranged', 436, 100, 24);
        ctx.restore();
        A.drawPlayer(ctx, { x: 436, y: 134, moving: false, handItem: null, holding: false, holdProgress: 0 });
        arrowLine(ctx, 456, 104, 470, 162, 'rgba(255,255,255,0.85)', true, 2.5);
        A.drawGroundItem(ctx, { item: 'ranged', x: 470, y: 180, targeted: false });
        drawKey(ctx, 'L', 410, 190);
      },
    },
    { // 5 購買
      w: 700, h: 375,
      draw: function (ctx, A) {
        guideGround(ctx, 700, 375);
        A.drawCastle(ctx, { x: 130, y: 140, hitAge: 0.3, hitDuration: 0.3, zoneActive: true, targeted: false });
        A.drawPlayer(ctx, { x: 215, y: 190, moving: false, handItem: null, holding: false, holdProgress: 0 });
        ctx.save();
        ctx.translate(350 - 640, 318 - 600);
        A.drawShopPanel(ctx, { items: [
          { key: '1', name: '箭塔材料', price: 15, state: 'ok' },
          { key: '2', name: '步兵', price: 12, state: 'ok' },
          { key: '3', name: '擴槽石', price: 20, state: 'ok' },
          { key: '4', name: '石魔像', price: 18, state: 'locked' },
        ] });
        ctx.restore();
        divider(ctx, 320, 260);
        // 小圖 A: 箭塔材料 → 空地基 → 空箭塔
        A.drawBuildPad(ctx, { x: 487, y: 92, occupied: false, highlight: true });
        A.drawPlayer(ctx, { x: 412, y: 100, moving: false, handItem: 'towerKit', holding: true, holdProgress: 0.7 });
        drawKey(ctx, 'J', 432, 150); tag(ctx, '按住', 416, 150, 'right');
        arrowLine(ctx, 528, 92, 568, 92, '#ffffff', false, 4);
        A.drawBuildPad(ctx, { x: 630, y: 92, occupied: true, highlight: false });
        A.drawTower(ctx, U({ x: 630, y: 92, hp: 120, maxHp: 120, targeted: false }));
        A.drawSoulSlots(ctx, { x: 630, y: 48, slots: [null, null], highlight: -1 });
        // 小圖 B: 步兵 → 按 J 放在腳下
        A.drawPlayer(ctx, { x: 420, y: 222, moving: false, handItem: 'soldierKit', holding: false, holdProgress: 0 });
        drawKey(ctx, 'J', 456, 236);
        arrowLine(ctx, 490, 222, 540, 222, '#ffffff', false, 4);
        A.drawPlayer(ctx, { x: 596, y: 214, moving: false, handItem: null, holding: false, holdProgress: 0 });
        A.drawSoldier(ctx, U({ x: 626, y: 232, hp: 60, maxHp: 60, targeted: false }));
      },
    },
    { // 6 招募中立單位
      w: 480, h: 270,
      draw: function (ctx, A) {
        guideGround(ctx, 480, 270);
        A.drawCastle(ctx, { x: 236, y: 140, hitAge: 0.3, hitDuration: 0.3, zoneActive: false, targeted: false });
        A.drawGolem(ctx, U({ x: 56, y: 206, team: 'neutral', hp: 250, maxHp: 250, moving: true, targeted: false }));
        A.drawSoulSlots(ctx, { x: 56, y: 158, slots: ['march', null, null], highlight: -1 });
        arrowLine(ctx, 90, 194, 176, 162, '#ffffff', true, 3);
        tag(ctx, '中立', 56, 250);
        // 商店第 4 格: 鎖住 → 石魔像
        shopCell(ctx, { key: '4', name: '石魔像', price: 18, state: 'locked' }, 412, 62, 100, 80);
        arrowLine(ctx, 412, 108, 412, 140, '#ffffff', false, 4);
        shopCell(ctx, { key: '4', name: '石魔像', price: 18, state: 'ok' }, 412, 190, 100, 80);
      },
    },
  ];

  // ---------- 對外 API ----------
  var Art = {
    canvas: { width: 1280, height: 720 },
    palette: palette,

    drawBackground: function (ctx, _noHudShade) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, 1280, 720); ctx.clip();
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, 1280, 720);
      // 草地斑塊(固定亂數)
      var seed = 7;
      function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      ctx.fillStyle = palette.grassDark;
      for (var i = 0; i < 26; i++) {
        ctx.beginPath(); ctx.ellipse(rnd() * 1280, 50 + rnd() * 670, 40 + rnd() * 60, 18 + rnd() * 24, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = palette.grassTuft; ctx.lineWidth = 2;
      ctx.beginPath();
      for (var j = 0; j < 140; j++) {
        var gx = rnd() * 1280, gy = 50 + rnd() * 670;
        ctx.moveTo(gx - 3, gy); ctx.lineTo(gx - 1, gy - 5); ctx.moveTo(gx + 1, gy); ctx.lineTo(gx + 3, gy - 6);
      }
      ctx.stroke();
      // 三條路線
      var lanes = [[0, 402, 584, 56], [696, 402, 584, 56], [612, 50, 56, 324]];
      lanes.forEach(function (r) {
        ctx.fillStyle = palette.lane; ctx.fillRect(r[0], r[1], r[2], r[3]);
      });
      ctx.strokeStyle = palette.laneEdge; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 403.5); ctx.lineTo(584, 403.5); ctx.moveTo(0, 456.5); ctx.lineTo(584, 456.5);
      ctx.moveTo(696, 403.5); ctx.lineTo(1280, 403.5); ctx.moveTo(696, 456.5); ctx.lineTo(1280, 456.5);
      ctx.moveTo(613.5, 50); ctx.lineTo(613.5, 374); ctx.moveTo(666.5, 50); ctx.lineTo(666.5, 374);
      ctx.stroke();
      // 路面車轍
      ctx.strokeStyle = palette.laneMark; ctx.lineWidth = 2; ctx.setLineDash([14, 18]);
      ctx.beginPath();
      ctx.moveTo(0, 430); ctx.lineTo(584, 430); ctx.moveTo(696, 430); ctx.lineTo(1280, 430); ctx.moveTo(640, 50); ctx.lineTo(640, 374);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },

    drawBuildPad: function (ctx, state) {
      var s = S(state);
      var x = num(s.x, 0), y = num(s.y, 0);
      ctx.save();
      ctx.translate(x, y);
      rr(ctx, -31, -31, 62, 62, 6); fillStroke(ctx, palette.pad, palette.outline, 2);
      rr(ctx, -25, -25, 50, 50, 4); ctx.fillStyle = palette.padLight; ctx.fill();
      ctx.fillStyle = palette.outline;
      [[-25, -25], [25, -25], [-25, 25], [25, 25]].forEach(function (p) { circle(ctx, p[0] * 1.08, p[1] * 1.08, 2); ctx.fill(); });
      if (!s.occupied) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.strokeRect(-18, -18, 36, 36); ctx.setLineDash([]);
      }
      if (s.highlight && !s.occupied) {
        var p = 0.5 + 0.5 * Math.sin(nowSec() * 8);
        rr(ctx, -30, -30, 60, 60, 6);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.17 * p) + ')'; ctx.fill();
        ctx.strokeStyle = palette.target; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = palette.target; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
      }
      ctx.restore();
    },

    drawCastle: function (ctx, state) {
      var s = S(state);
      ctx.save();
      drawCastleShape(ctx, num(s.x, 640), num(s.y, 430), timerProgress(s.hitAge, s.hitDuration), !!s.zoneActive, !!s.targeted);
      ctx.restore();
    },

    drawTower: function (ctx, state) {
      var s = S(state), o = unitAnim(s);
      var x = num(s.x, 0), y = num(s.y, 0);
      ctx.save();
      ctx.translate(x, y);
      paintTower(ctx, allyColors(o.hit), o);
      ctx.restore();
      ctx.save();
      if (s.targeted) targetFrameOutside(ctx, x, y, 48, 48);
      hpBar(ctx, x, y - 30, 48, s.hp, s.maxHp, palette.hpAlly);
      ctx.restore();
    },

    drawSoldier: function (ctx, state) {
      var s = S(state), o = unitAnim(s);
      var x = num(s.x, 0), y = num(s.y, 0);
      ctx.save();
      ctx.translate(x, y);
      paintSoldier(ctx, allyColors(o.hit), o);
      ctx.restore();
      ctx.save();
      if (s.targeted) targetFrameOutside(ctx, x, y, 32, 32);
      hpBar(ctx, x, y - 22, 32, s.hp, s.maxHp, palette.hpAlly);
      ctx.restore();
    },

    drawGolem: function (ctx, state) {
      var s = S(state), o = unitAnim(s);
      var team = normTeam(s.team);
      var x = num(s.x, 0), y = num(s.y, 0);
      if (team === 'neutral') o.attack = 0;
      ctx.save();
      ctx.translate(x, y);
      paintGolem(ctx, golemColors(team, o.hit), o);
      ctx.restore();
      ctx.save();
      if (s.targeted) targetFrameOutside(ctx, x, y, 56, 56);
      if (team === 'ally') hpBar(ctx, x, y - 34, 56, s.hp, s.maxHp, palette.hpAlly);
      ctx.restore();
    },

    drawEnemy: function (ctx, state) {
      var s = S(state), o = unitAnim(s);
      var type = normEnemy(s.type), sz = ENEMY_SIZE[type];
      var x = num(s.x, 0), y = num(s.y, 0);
      ctx.save();
      ctx.translate(x, y);
      ENEMY_PAINTER[type](ctx, enemyColors(type, o.hit), o);
      ctx.restore();
      ctx.save();
      hpBar(ctx, x, y - sz / 2 - 6, sz, s.hp, s.maxHp, palette.hpEnemy);
      ctx.restore();
    },

    drawCorpse: function (ctx, state) {
      var s = S(state);
      var kind = normCorpse(s.kind), sz = CORPSE_SIZE[kind];
      var x = num(s.x, 0), y = num(s.y, 0);
      var maxLife = num(s.maxLife, 10); if (!(maxLife > 0)) maxLife = 10;
      var r = clamp(num(s.life, maxLife) / maxLife, 0, 1);
      var o = { t: 0, hit: 0, attack: 0, moving: false, dead: true };
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.75 * r;
      // 倒地: 壓扁貼地, 底邊對齊判定框底
      ctx.translate(x, y + sz / 2);
      ctx.scale(1, 0.55);
      ctx.translate(0, -sz / 2);
      var isEnemy = (kind === 'imp' || kind === 'archer' || kind === 'brute');
      var base = isEnemy ? palette.corpseEnemy : (kind === 'golem' ? palette.corpseGolem : palette.corpseAlly);
      var c = { body: base, dark: toHex(mix(base, '#000000', 0.35)), light: toHex(mix(base, '#ffffff', 0.2)), band: null, eyesOpen: false };
      if (isEnemy) ENEMY_PAINTER[kind](ctx, c, o);
      else if (kind === 'tower') paintTower(ctx, c, o);
      else if (kind === 'soldier') paintSoldier(ctx, c, o);
      else paintGolem(ctx, c, o);
      ctx.restore();
      ctx.save();
      if (s.targeted) targetFrameOutside(ctx, x, y, sz, sz);
      ctx.restore();
    },

    drawCoin: function (ctx, state) {
      var s = S(state);
      var x = num(s.x, 0), y = num(s.y, 0), life = num(s.life, 7);
      ctx.save();
      if (life < 2 && Math.floor(life * 8) % 2 === 1) ctx.globalAlpha = 0.2;
      drawCoinShape(ctx, x, y, 7);
      ctx.restore();
    },

    drawGroundItem: function (ctx, state) {
      var s = S(state);
      var x = num(s.x, 0), y = num(s.y, 0);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(x, y + 10, 11, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      drawItemIcon(ctx, s.item, x, y - 1, 26);
      if (s.targeted) targetFrameOutside(ctx, x, y, 28, 28);
      ctx.restore();
    },

    drawSoulSlots: function (ctx, state) {
      var s = S(state);
      var slots = Array.isArray(s.slots) ? s.slots : [];
      var n = slots.length;
      if (!n) return;
      var x = num(s.x, 0), y = num(s.y, 0), hl = Math.floor(num(s.highlight, -1));
      ctx.save();
      for (var i = 0; i < n; i++) {
        var cx = x - n * 10 + 10 + i * 20;
        var k = normItem(slots[i]);
        var isSoul = k && SOUL_KINDS.indexOf(k) >= 0;
        // 底
        ctx.fillStyle = palette.slotBg;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(cx - 9, y - 9, 18, 18);
        ctx.globalAlpha = 1;
        if (isSoul) {
          drawItemIcon(ctx, k, cx, y, 16);
        } else { // 空格: 虛線框
          ctx.strokeStyle = palette.slotEmpty; ctx.lineWidth = 1.2; ctx.setLineDash([2.5, 2.5]);
          ctx.strokeRect(cx - 6.5, y - 6.5, 13, 13);
          ctx.setLineDash([]);
        }
        if (i === hl) {
          ctx.strokeStyle = palette.target; ctx.lineWidth = 2.5;
          ctx.strokeRect(cx - 8.75, y - 8.75, 17.5, 17.5);
          ctx.strokeStyle = palette.outline; ctx.lineWidth = 1;
          ctx.strokeRect(cx - 9.5, y - 9.5, 19, 19);
        }
      }
      ctx.restore();
    },

    drawProjectile: function (ctx, state) {
      var s = S(state);
      var x = num(s.x, 0), y = num(s.y, 0), a = num(s.angle, 0);
      ctx.save();
      ctx.translate(x, y);
      if (s.team === 'enemy') { // 敵方: 紅色圓彈
        circle(ctx, 0, 0, 4); fillStroke(ctx, palette.projEnemy, palette.enemyDark, 1.5);
      } else { // 我方: 淡藍箭矢
        ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(4.4, 0); ctx.lineTo(-1, -2.5); ctx.lineTo(-4.4, -1.2); ctx.lineTo(-4.4, 1.2); ctx.lineTo(-1, 2.5); ctx.closePath();
        fillStroke(ctx, palette.projAlly, palette.allyDark, 1);
      }
      ctx.restore();
    },

    drawHitSpark: function (ctx, state) {
      var s = S(state);
      var dur = num(s.duration, 0.25); if (!(dur > 0)) dur = 0.25;
      var t = clamp(num(s.age, 0) / dur, 0, 1);
      if (t >= 1) return;
      var x = num(s.x, 0), y = num(s.y, 0);
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = palette.spark; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      var r1 = 3 + 4 * t, r2 = 6 + 4.5 * t;
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4 + 0.3;
        var rr2 = i % 2 ? r2 * 0.75 : r2;
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
      }
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      circle(ctx, 0, 0, 3.5 * (1 - t)); ctx.fill();
      ctx.restore();
    },

    drawLaneWarning: function (ctx, state) {
      var s = S(state);
      var lane = (s.lane === 'north' || s.lane === 'east') ? s.lane : 'west';
      var pos = { west: [40, 430, 0], east: [1240, 430, Math.PI], north: [640, 90, Math.PI / 2] }[lane];
      var rem = Math.max(0, num(s.remaining, 0));
      var shown = Math.max(1, Math.ceil(rem - 1e-6));
      var frac = rem - (shown - 1); // 這一秒還剩多少(0~1]
      var blink = rem < 2 ? (Math.floor(rem * 6) % 2 === 0) : true;
      ctx.save();
      ctx.translate(pos[0], pos[1]);
      // 指向主堡的箭頭(在圓外側)
      ctx.save();
      ctx.rotate(pos[2]);
      ctx.beginPath(); ctx.moveTo(31, 0); ctx.lineTo(19, -11); ctx.lineTo(19, 11); ctx.closePath();
      fillStroke(ctx, palette.warn, palette.outline, 2);
      ctx.restore();
      // 底圓
      circle(ctx, 0, 0, 20);
      fillStroke(ctx, blink ? palette.warn : '#8a2e10', palette.outline, 2);
      // 這一秒的進度環
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(frac, 0, 1)); ctx.stroke();
      text(ctx, String(shown), 0, 1, 22, '#ffffff', 'center', 'bold', palette.outline);
      ctx.restore();
    },

    drawPlayer: function (ctx, state) {
      var s = S(state);
      var x = num(s.x, 0), y = num(s.y, 0);
      ctx.save();
      ctx.translate(x, y);
      paintPlayer(ctx, { t: nowSec(), moving: !!s.moving });
      // 按住 J 進度環: 外緣半徑 24, 寬 4, 正上方順時針
      if (s.holding) {
        var p = clamp(num(s.holdProgress, 0), 0, 1);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(15,16,22,0.55)';
        circle(ctx, 0, 0, 22); ctx.stroke();
        if (p > 0) {
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
        }
      }
      ctx.restore();
      var item = normItem(s.handItem);
      if (item) {
        ctx.save();
        rr(ctx, x - 13, y - 34 - 13, 26, 26, 6);
        ctx.fillStyle = 'rgba(15,16,22,0.55)'; ctx.fill();
        drawItemIcon(ctx, item, x, y - 34, 22);
        ctx.restore();
      }
    },

    drawShopPanel: function (ctx, state) {
      var s = S(state);
      var items = Array.isArray(s.items) ? s.items : [];
      var cx = 640, cy = 600, W = 440, H = 96;
      ctx.save();
      rr(ctx, cx - W / 2 + 1, cy - H / 2 + 1, W - 2, H - 2, 10);
      fillStroke(ctx, 'rgba(23,25,35,0.92)', '#ffefc8', 2);
      var cw = 100, gap = 8;
      for (var i = 0; i < 4; i++) {
        var it = items[i] || { key: String(i + 1), name: '', price: 0, state: 'locked' };
        shopCell(ctx, it, cx - W / 2 + gap + cw / 2 + i * (cw + gap), cy, cw, 80);
      }
      ctx.restore();
    },

    drawHud: function (ctx, state) {
      var s = S(state);
      var gold = Math.floor(num(s.gold, 0));
      var hp = num(s.castleHp, 0), mhp = num(s.castleMaxHp, 20); if (!(mhp > 0)) mhp = 20;
      var wave = Math.floor(num(s.wave, 0)), tw = Math.floor(num(s.totalWaves, 6));
      var nw = num(s.nextWaveIn, -1);
      ctx.save();
      ctx.fillStyle = palette.hudBg; ctx.fillRect(0, 0, 1280, 50);
      ctx.fillStyle = '#2c3042'; ctx.fillRect(0, 48, 1280, 2);
      // 金幣
      drawCoinShape(ctx, 30, 25, 11);
      text(ctx, String(gold), 50, 26, 26, palette.coin, 'left', 'bold');
      // 主堡生命
      ctx.save();
      ctx.translate(200, 25); ctx.scale(0.22, 0.22);
      drawCastleShape(ctx, 0, 0, 0, false, false, true);
      ctx.restore();
      var low = hp <= 5;
      text(ctx, Math.max(0, Math.ceil(hp)) + ' / ' + mhp, 228, 26, 22, low ? palette.hpEnemy : palette.text, 'left', 'bold');
      var bx = 316, bw = 140;
      ctx.fillStyle = '#0c0d12'; ctx.fillRect(bx, 20, bw, 12);
      ctx.fillStyle = low ? palette.hpEnemy : palette.hpAlly; ctx.fillRect(bx, 20, bw * clamp(hp / mhp, 0, 1), 12);
      ctx.strokeStyle = '#3a3e50'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, 20, bw, 12);
      // 波次
      text(ctx, wave > 0 ? ('第 ' + wave + ' / ' + tw + ' 波') : ('準備中  0 / ' + tw + ' 波'), 640, 26, 24, palette.text, 'center', 'bold');
      // 下一波倒數
      if (nw >= 0) {
        var sec = Math.ceil(nw - 1e-9);
        var soon = sec <= 5;
        text(ctx, '下一波', 1180, 26, 16, palette.textDim, 'right', 'bold');
        text(ctx, sec + ' 秒', 1260, 26, 24, soon ? palette.warn : palette.text, 'right', 'bold');
      }
      ctx.restore();
    },

    drawResult: function (ctx, state) {
      var s = S(state);
      var win = !!s.win;
      var wave = Math.floor(num(s.wave, 0)), tw = Math.floor(num(s.totalWaves, 6));
      ctx.save();
      ctx.fillStyle = 'rgba(8,9,14,0.72)'; ctx.fillRect(0, 0, 1280, 720);
      rr(ctx, 400, 220, 480, 280, 16);
      fillStroke(ctx, '#1d2030', win ? palette.coin : palette.hpEnemy, 3);
      text(ctx, win ? '勝利' : '主堡被攻陷', 640, 300, 56, win ? palette.coin : palette.hpEnemy, 'center', 'bold');
      text(ctx, '第 ' + wave + ' / ' + tw + ' 波', 640, 375, 28, palette.text, 'center', 'bold');
      // 按 Enter 重新開始
      text(ctx, '按', 548, 445, 22, palette.textDim, 'right', 'bold');
      drawKey(ctx, 'Enter', 590, 445, 70);
      text(ctx, '重新開始', 634, 445, 22, palette.textDim, 'left', 'bold');
      ctx.restore();
    },

    drawGuidePage: function (ctx, state) {
      var s = S(state);
      var page = Math.floor(num(s.page, 0));
      var g = GUIDE[page];
      var x = num(s.x, 0), y = num(s.y, 0), w = num(s.w, 0), h = num(s.h, 0);
      if (!g || !(w > 0) || !(h > 0)) return;
      var sc = Math.min(w / g.w, h / g.h);
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.translate(x + (w - g.w * sc) / 2, y + (h - g.h * sc) / 2);
      ctx.scale(sc, sc);
      ctx.beginPath(); ctx.rect(0, 0, g.w, g.h); ctx.clip();
      g.draw(ctx, Art);
      ctx.restore();
    },
  };

  root.Art = Art;
})();
