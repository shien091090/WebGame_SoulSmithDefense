/* 魂匠佈陣 — 美術(Canvas 2D 幾何繪製, 無外部資源)
 * 全域物件 window.Art; 函式簽章依 interface.json。說明見 style.md。 */
(function () {
  'use strict';

  // ---------- 小工具 ----------
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
  function font(px, bold) { return (bold ? 'bold ' : '') + px + 'px ' + FONT; }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function str(v) { return v == null ? '' : String(v); }
  function obj(s) { return (s && typeof s === 'object') ? s : {}; }
  function nowSec() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : 0; }
  // 一次性特效進度: 正在播回傳 0~1, 否則 -1
  function prog(age, dur) {
    age = num(age, -1); dur = num(dur, 0);
    if (dur <= 0 || age < 0 || age >= dur) return -1;
    return age / dur;
  }
  function hexToRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function mix(a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b);
    var r = [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * t); });
    return 'rgb(' + r[0] + ',' + r[1] + ',' + r[2] + ')';
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
  function textW(ctx, s, px) {
    var m = ctx.measureText ? ctx.measureText(s) : null;
    return (m && isFinite(m.width) && m.width > 0) ? m.width : s.length * px;
  }
  // 帶深色描邊的字(P10)
  function txt(ctx, s, x, y, px, color, align, bold, outline, maxW) {
    ctx.font = font(px, bold !== false);
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    if (outline !== false) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, px * 0.22);
      ctx.strokeStyle = outline || 'rgba(8,10,16,0.9)';
      if (maxW) ctx.strokeText(s, x, y, maxW); else ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color;
    if (maxW) ctx.fillText(s, x, y, maxW); else ctx.fillText(s, x, y);
  }
  function ellipse(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }
  // 互動目標外框: 內緣貼齊 size 外邊, 寬 3, 在框外
  function targetFrame(ctx, w, h) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = PAL.target;
    ctx.setLineDash([]);
    ctx.strokeRect(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3);
    ctx.restore();
  }

  // ---------- 色票 ----------
  var PAL = {
    bg: '#2c4630', grass: '#3a5c3a', grassPatch: '#355536', grid: 'rgba(255,255,255,0.07)',
    path: '#a88b5e', pathEdge: '#6a5233', pathRut: 'rgba(80,60,35,0.35)',
    ally: '#3f80dc', allyLight: '#9cc8ff', allyDark: '#102a50', allyBase: '#56637a',
    neutral: '#86888d', neutralDark: '#3a3c40',
    enemyImp: '#d9475a', enemyArmor: '#b53a4f', enemyBat: '#9b55c9', enemySwarm: '#ea6a86', enemySwift: '#ec6a35',
    enemyDark: '#3a0c16', steel: '#aab4c2', steelDark: '#4e5662',
    corpse: '#6c6470',
    player: '#fff1cf', playerScarf: '#ff9a2e', playerDark: '#3a2410', hammer: '#9aa1ab',
    soul: '#ff6fd8',
    target: '#ffe84a',
    coin: '#ffc93a', coinDark: '#7a4f00',
    ranged: '#58b947', melee: '#c9d0db', seek: '#9a6cf0', march: '#d8336a', frost: '#4fd2f0', blast: '#ff8a1f',
    slotStone: '#cfc6ff', kit: '#9b6b3a',
    valid: '#5fe08a', invalid: '#ff4545',
    ice: '#9fe8ff', hp: '#ff4d4d',
    hudBg: '#151a24', hudPanel: '#2b2440', gold: '#ffd75e', text: '#f2f2f2', textDim: '#9aa3b2',
    codexBg: '#10141c', codexFound: '#2a3b58', codexLine: '#e8c25a',
    popupBg: '#1b2133', warn: '#ff4a4a'
  };

  var PART_KINDS = ['ranged', 'melee', 'seek', 'march', 'frost', 'blast'];
  var ITEM_KINDS = PART_KINDS.concat(['slotStone', 'towerKit', 'soldierKit', 'golemKit']);
  function normItem(k) { return ITEM_KINDS.indexOf(k) >= 0 ? k : null; }

  var ENEMY_SIZE = { imp: [32, 32], armor: [40, 40], bat: [32, 32], swarm: [20, 20], swift: [32, 32] };
  var ENEMY_COLOR = { imp: PAL.enemyImp, armor: PAL.enemyArmor, bat: PAL.enemyBat, swarm: PAL.enemySwarm, swift: PAL.enemySwift };
  var TRAIT_NAME = { imp: '普通', armor: '鐵甲', bat: '飛行', swarm: '成群', swift: '疾速' };
  function normEnemy(t) { return ENEMY_SIZE[t] ? t : 'imp'; }
  function normCorpse(t) { return (t === 'imp' || t === 'armor' || t === 'bat' || t === 'swift') ? t : 'imp'; }

  var PATH = [[0, 130], [1060, 130], [1060, 300], [220, 300], [220, 470], [1124, 470]];

  // ---------- 魂件 / 物品圖示(全畫面共用同一套) ----------
  function partIcon(ctx, kind, cx, cy, s) {
    kind = normItem(kind);
    ctx.save();
    ctx.translate(cx, cy);
    var h = s / 2, k = s / 24;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (kind && PART_KINDS.indexOf(kind) >= 0) {
      rr(ctx, -h, -h, s, s, s * 0.24);
      ctx.fillStyle = PAL[kind]; ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.07); ctx.strokeStyle = '#11151e'; ctx.stroke();
      ctx.scale(k, k);
      var g = kind === 'melee' ? '#1d2330' : '#ffffff';
      ctx.strokeStyle = g; ctx.fillStyle = g; ctx.lineWidth = 2.4;
      if (kind === 'ranged') { // 斜箭
        ctx.beginPath(); ctx.moveTo(-6.5, 6.5); ctx.lineTo(6.5, -6.5);
        ctx.moveTo(6.5, -6.5); ctx.lineTo(0.5, -6.5); ctx.moveTo(6.5, -6.5); ctx.lineTo(6.5, -0.5);
        ctx.moveTo(-6.5, 6.5); ctx.lineTo(-6.5, 2.5); ctx.moveTo(-6.5, 6.5); ctx.lineTo(-2.5, 6.5);
        ctx.stroke();
      } else if (kind === 'melee') { // 劍
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 4); ctx.stroke();
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(-5.5, 3.5); ctx.lineTo(5.5, 3.5); ctx.moveTo(0, 4); ctx.lineTo(0, 8.5); ctx.stroke();
      } else if (kind === 'seek') { // 眼
        ctx.beginPath(); ctx.moveTo(-8.5, 0); ctx.quadraticCurveTo(0, -8, 8.5, 0); ctx.quadraticCurveTo(0, 8, -8.5, 0); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, Math.PI * 2); ctx.fill();
      } else if (kind === 'march') { // 旗
        ctx.beginPath(); ctx.moveTo(-5, 8.5); ctx.lineTo(-5, -8.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-5, -8.5); ctx.lineTo(7.5, -4.5); ctx.lineTo(-5, -0.5); ctx.closePath(); ctx.fill();
      } else if (kind === 'frost') { // 雪花
        ctx.lineWidth = 2;
        for (var i = 0; i < 3; i++) {
          var a = i * Math.PI / 3 + Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
          ctx.beginPath(); ctx.moveTo(-c * 8.5, -sn * 8.5); ctx.lineTo(c * 8.5, sn * 8.5); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      } else if (kind === 'blast') { // 爆星
        ctx.beginPath();
        for (var j = 0; j < 16; j++) {
          var r = j % 2 ? 3.6 : 8.8, an = j * Math.PI / 8 - Math.PI / 2;
          if (j) ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); else ctx.moveTo(Math.cos(an) * r, Math.sin(an) * r);
        }
        ctx.closePath(); ctx.fill();
      }
    } else if (kind === 'slotStone') { // 菱形寶石 + 加號(類別不同: 不是方塊)
      ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(h * 0.85, 0); ctx.lineTo(0, h); ctx.lineTo(-h * 0.85, 0); ctx.closePath();
      ctx.fillStyle = PAL.slotStone; ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.07); ctx.strokeStyle = '#11151e'; ctx.stroke();
      ctx.scale(k, k);
      ctx.strokeStyle = '#2a2350'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-4.5, 0); ctx.lineTo(4.5, 0); ctx.moveTo(0, -4.5); ctx.lineTo(0, 4.5); ctx.stroke();
    } else if (kind === 'towerKit' || kind === 'soldierKit' || kind === 'golemKit') { // 木箱 + 單位小圖
      rr(ctx, -h, -h, s, s, s * 0.1);
      ctx.fillStyle = PAL.kit; ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.07); ctx.strokeStyle = '#2a1808'; ctx.stroke();
      ctx.scale(k, k);
      ctx.strokeStyle = 'rgba(40,24,8,0.6)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(12, -4); ctx.moveTo(-12, 4); ctx.lineTo(12, 4); ctx.stroke();
      ctx.fillStyle = PAL.ally; ctx.strokeStyle = PAL.allyDark; ctx.lineWidth = 1.5;
      if (kind === 'towerKit') {
        ctx.beginPath();
        ctx.moveTo(-6, 8); ctx.lineTo(-6, -5); ctx.lineTo(-6, -8); ctx.lineTo(-3, -8); ctx.lineTo(-3, -6); ctx.lineTo(-1, -6); ctx.lineTo(-1, -8);
        ctx.lineTo(1, -8); ctx.lineTo(1, -6); ctx.lineTo(3, -6); ctx.lineTo(3, -8); ctx.lineTo(6, -8); ctx.lineTo(6, 8); ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else if (kind === 'soldierKit') {
        ctx.beginPath(); ctx.arc(0, -2, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        rr(ctx, -5, 3, 10, 6, 2); ctx.fill(); ctx.stroke();
      } else {
        rr(ctx, -7, -7, 14, 14, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#8fe4ff'; ctx.fillRect(-4, -3, 2.5, 2); ctx.fillRect(1.5, -3, 2.5, 2);
      }
    } else { // 未知: 空的虛線格(不畫成任何合法圖示)
      rr(ctx, -h, -h, s, s, s * 0.24);
      ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.stroke();
    }
    ctx.restore();
  }

  function emptyCell(ctx, cx, cy, s) {
    ctx.save();
    rr(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.24);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
    ctx.setLineDash([Math.max(2, s * 0.15), Math.max(2, s * 0.12)]);
    ctx.lineWidth = Math.max(1, s * 0.06); ctx.strokeStyle = 'rgba(220,228,240,0.55)';
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 敵人造型(敵人 / 屍體 / HUD 預告共用) ----------
  function ghostPath(ctx, l, t, w, h, waves) {
    var r = w / 2;
    ctx.beginPath();
    ctx.moveTo(l, t + r);
    ctx.arc(l + r, t + r, r, Math.PI, 0);
    ctx.lineTo(l + w, t + h);
    var sw = w / waves;
    for (var i = 0; i < waves; i++) {
      var x0 = l + w - i * sw;
      ctx.quadraticCurveTo(x0 - sw / 2, t + h - sw * 0.9, x0 - sw, t + h);
    }
    ctx.closePath();
  }
  function eyes(ctx, cx, cy, gap, r, mode) {
    if (mode === 'x') {
      ctx.strokeStyle = '#1a0a10'; ctx.lineWidth = Math.max(1.2, r * 0.6); ctx.lineCap = 'round';
      [-gap, gap].forEach(function (dx) {
        ctx.beginPath();
        ctx.moveTo(cx + dx - r, cy - r); ctx.lineTo(cx + dx + r, cy + r);
        ctx.moveTo(cx + dx + r, cy - r); ctx.lineTo(cx + dx - r, cy + r);
        ctx.stroke();
      });
      return;
    }
    [-gap, gap].forEach(function (dx) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx + dx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a0a10'; ctx.beginPath(); ctx.arc(cx + dx + r * 0.25, cy + r * 0.15, r * 0.5, 0, Math.PI * 2); ctx.fill();
    });
  }
  // o: { body, eyes:'open'|'x', shadow:bool }; 以 (0,0) 為中心, 原生尺寸
  function paintEnemy(ctx, type, o) {
    type = normEnemy(type);
    var body = o.body || ENEMY_COLOR[type];
    var em = o.eyes || 'open';
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = PAL.enemyDark;
    if (type === 'imp') {
      ctx.fillStyle = body; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(-7, -15.5); ctx.lineTo(-3, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, -7); ctx.lineTo(7, -15.5); ctx.lineTo(3, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ghostPath(ctx, -12, -12, 24, 27, 3); ctx.fill(); ctx.stroke();
      eyes(ctx, 0, -2, 5, 3, em);
    } else if (type === 'armor') {
      ctx.lineWidth = 2.5;
      ctx.fillStyle = body; ghostPath(ctx, -15, -15, 30, 33, 3); ctx.fill(); ctx.stroke();
      // 頭盔
      ctx.fillStyle = o.steel || PAL.steel; ctx.strokeStyle = PAL.steelDark;
      ctx.beginPath(); ctx.arc(0, 0, 15, Math.PI, 0); ctx.lineTo(15, -1); ctx.lineTo(-15, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1d24'; ctx.fillRect(-10, -7, 20, 4);
      if (em === 'x') { eyes(ctx, 0, -5, 4, 2, 'x'); }
      else { ctx.fillStyle = '#ff5050'; ctx.fillRect(-7, -6.5, 3, 3); ctx.fillRect(4, -6.5, 3, 3); }
      // 胸甲 + 護肩
      ctx.fillStyle = o.steel || PAL.steel;
      rr(ctx, -11, 2, 22, 10, 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-13.8, 2, 4.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(13.8, 2, 4.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.steelDark;
      [-7, 0, 7].forEach(function (x) { ctx.beginPath(); ctx.arc(x, 7, 1.2, 0, Math.PI * 2); ctx.fill(); });
    } else if (type === 'bat') {
      if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ellipse(ctx, 0, 13.5, 9, 2.5); ctx.fill(); }
      ctx.lineWidth = 1.8;
      ctx.fillStyle = mix(o.bodyHex || ENEMY_COLOR.bat, '#2a1038', 0.35);
      [-1, 1].forEach(function (sd) {
        ctx.beginPath();
        ctx.moveTo(sd * 6, -9);
        ctx.lineTo(sd * 15.5, -13);
        ctx.lineTo(sd * 15, -3);
        ctx.quadraticCurveTo(sd * 12.5, -6, sd * 10.5, -2.5);
        ctx.quadraticCurveTo(sd * 8.5, -5, sd * 6, -2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = body;
      ghostPath(ctx, -8, -14, 16, 16, 2); ctx.fill(); ctx.stroke();
      eyes(ctx, 0, -7, 3.2, 2, em);
    } else if (type === 'swarm') {
      ctx.fillStyle = body; ctx.lineWidth = 1.6;
      ghostPath(ctx, -8, -8, 16, 17, 2); ctx.fill(); ctx.stroke();
      eyes(ctx, 0, -2, 3, 2, em);
    } else { // swift
      ctx.strokeStyle = 'rgba(255,236,210,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-15.5, -6); ctx.lineTo(-9.5, -6);
      ctx.moveTo(-15.5, 0); ctx.lineTo(-7.5, 0);
      ctx.moveTo(-15.5, 6); ctx.lineTo(-9.5, 6);
      ctx.stroke();
      ctx.save();
      ctx.translate(3, 0);
      ctx.transform(1, 0, -0.35, 1, 0, 0);
      ctx.fillStyle = body; ctx.strokeStyle = PAL.enemyDark; ctx.lineWidth = 2;
      ghostPath(ctx, -8, -12, 16, 27, 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      eyes(ctx, 5, -3, 3.5, 2.4, em);
    }
    ctx.restore();
  }
  function enemyIcon(ctx, type, cx, cy, box) {
    type = normEnemy(type);
    var sz = ENEMY_SIZE[type], sc = box / Math.max(sz[0], sz[1]);
    if (type === 'swarm') sc *= 0.75; // 成群 = 小隻: 預告圖示也維持比較小
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    paintEnemy(ctx, type, {});
    ctx.restore();
  }

  // ---------- 我方單位造型 ----------
  function paintTower(ctx, k, moving) {
    var dy = -3 * k;
    ctx.save();
    ctx.lineJoin = 'round';
    rr(ctx, -22, 10, 44, 13, 3); ctx.fillStyle = PAL.allyBase; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.allyDark; ctx.stroke();
    ctx.translate(0, dy);
    ctx.fillStyle = PAL.ally;
    ctx.beginPath();
    ctx.moveTo(-15, 14); ctx.lineTo(-15, -22); ctx.lineTo(-8, -22); ctx.lineTo(-8, -17); ctx.lineTo(-4, -17); ctx.lineTo(-4, -22);
    ctx.lineTo(4, -22); ctx.lineTo(4, -17); ctx.lineTo(8, -17); ctx.lineTo(8, -22); ctx.lineTo(15, -22); ctx.lineTo(15, 14); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.allyLight; ctx.fillRect(-13, -15, 26, 3);
    ctx.fillStyle = '#0b1830';
    ctx.fillRect(-2, -9, 4, 15); ctx.fillRect(-6, -4, 12, 3);
    if (k > 0) {
      ctx.fillStyle = 'rgba(255,240,160,' + k + ')';
      ctx.beginPath(); ctx.arc(0, -20, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (moving) {
      ctx.save();
      ctx.fillStyle = '#20252e'; ctx.strokeStyle = PAL.allyLight; ctx.lineWidth = 1.2;
      [-13, 13].forEach(function (x) { ctx.beginPath(); ctx.arc(x, 20.5, 3.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
      ctx.restore();
    }
  }
  function paintSoldier(ctx, k, moving) {
    var ph = moving ? Math.sin(nowSec() * 12) * 2.5 : 0;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = PAL.allyDark;
    ctx.fillRect(-6, 8 + Math.max(0, ph), 4, 7 - Math.max(0, ph));
    ctx.fillRect(2, 8 + Math.max(0, -ph), 4, 7 - Math.max(0, -ph));
    ctx.strokeStyle = PAL.allyDark; ctx.lineWidth = 1.8;
    rr(ctx, -8, -2, 16, 12, 3); ctx.fillStyle = PAL.ally; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -7.5, 7, 0, Math.PI * 2); ctx.fillStyle = PAL.allyLight; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0b1830'; ctx.fillRect(-5, -8, 10, 2.5);
    rr(ctx, -15, -1, 7, 12, 2); ctx.fillStyle = PAL.allyLight; ctx.fill(); ctx.stroke();
    var sx = 11 + 2.5 * k;
    ctx.strokeStyle = '#d8dde6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, 12); ctx.lineTo(sx, -11); ctx.stroke();
    ctx.fillStyle = '#e8edf5'; ctx.strokeStyle = PAL.allyDark; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, -15.5); ctx.lineTo(sx + 2.5, -10); ctx.lineTo(sx - 2.5, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function paintGolem(ctx, ally, k, moving) {
    var body = ally ? '#5b7fb0' : PAL.neutral;
    var dark = ally ? PAL.allyDark : PAL.neutralDark;
    var ph = moving ? Math.sin(nowSec() * 9) * 2 : 0;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.fillStyle = mix(ally ? '#5b7fb0' : '#86888d', '#000000', 0.25);
    rr(ctx, -16, 18 + Math.max(0, ph), 12, 9 - Math.max(0, ph), 3); ctx.fill(); ctx.stroke();
    rr(ctx, 4, 18 + Math.max(0, -ph), 12, 9 - Math.max(0, -ph), 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = body;
    rr(ctx, -20, -14, 40, 34, 7); ctx.fill(); ctx.stroke();
    var ay = -3 * k;
    rr(ctx, -27.5, -10 + ay, 10, 24, 4); ctx.fill(); ctx.stroke();
    rr(ctx, 17.5, -10 + ay, 10, 24, 4); ctx.fill(); ctx.stroke();
    rr(ctx, -12, -27, 24, 15, 4); ctx.fill(); ctx.stroke();
    // 裂紋
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-6, 2); ctx.lineTo(-9, 10); ctx.moveTo(8, 6); ctx.lineTo(13, 12); ctx.stroke();
    if (ally) {
      ctx.fillStyle = '#8fe4ff';
      ctx.fillRect(-8, -22, 5, 3.5); ctx.fillRect(3, -22, 5, 3.5);
      ctx.strokeStyle = PAL.allyLight; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(6, 2); ctx.lineTo(0, 10); ctx.lineTo(-6, 2); ctx.closePath(); ctx.stroke();
    } else {
      ctx.strokeStyle = '#2a2a2c'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(-3, -20); ctx.moveTo(3, -20); ctx.lineTo(8, -20); ctx.stroke();
    }
    ctx.restore();
  }
  function paintCastle(ctx, hitK, atkK) {
    var body = hitK > 0 ? mix(PAL.ally, '#ff3030', hitK * 0.85) : PAL.ally;
    var light = hitK > 0 ? mix(PAL.allyLight, '#ffb0b0', hitK) : PAL.allyLight;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(ctx, 0, 48, 52, 7); ctx.fill();
    ctx.strokeStyle = PAL.allyDark; ctx.lineWidth = 2.5;
    ctx.fillStyle = body;
    rr(ctx, -44, -16, 88, 62, 4); ctx.fill(); ctx.stroke();
    [-1, 1].forEach(function (sd) {
      var x0 = sd < 0 ? -54 : 28;
      ctx.fillStyle = body;
      rr(ctx, x0, -32, 26, 80, 3); ctx.fill(); ctx.stroke();
      for (var i = 0; i < 3; i++) { ctx.fillRect(x0 + 1 + i * 9, -38, 6, 6); ctx.strokeRect(x0 + 1 + i * 9, -38, 6, 6); }
      ctx.fillStyle = '#0b1830'; ctx.fillRect(x0 + 11, -16, 4, 12);
    });
    var my = -2 * atkK;
    ctx.fillStyle = body;
    rr(ctx, -20, -44, 40, 34, 3); ctx.fill(); ctx.stroke();
    for (var j = 0; j < 4; j++) { ctx.fillRect(-19 + j * 10.5, -50 + my, 7, 6); ctx.strokeRect(-19 + j * 10.5, -50 + my, 7, 6); }
    ctx.fillStyle = light; ctx.fillRect(-40, -12, 80, 4);
    // 魂火紋章(攻擊時亮)
    ctx.fillStyle = atkK > 0 ? mix('#9cc8ff', '#ffffff', atkK) : '#9cc8ff';
    ctx.beginPath(); ctx.moveTo(0, -38); ctx.quadraticCurveTo(9, -27, 0, -18); ctx.quadraticCurveTo(-9, -27, 0, -38); ctx.fill();
    // 城門
    ctx.fillStyle = '#0b1830';
    ctx.beginPath(); ctx.moveTo(-12, 46); ctx.lineTo(-12, 26); ctx.arc(0, 26, 12, Math.PI, 0); ctx.lineTo(12, 46); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---------- 背景 ----------
  function grassFill(ctx, x, y, w, h, ox, oy) {
    ctx.save();
    ctx.fillStyle = PAL.grass; ctx.fillRect(x, y, w, h);
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = PAL.grid; ctx.lineWidth = 1;
    ox = ox || 0; oy = oy || 0;
    ctx.beginPath();
    for (var gx = x + ((48 - ox % 48) % 48); gx <= x + w; gx += 48) { ctx.moveTo(gx + 0.5, y); ctx.lineTo(gx + 0.5, y + h); }
    for (var gy = y + ((48 - oy % 48) % 48); gy <= y + h; gy += 48) { ctx.moveTo(x, gy + 0.5); ctx.lineTo(x + w, gy + 0.5); }
    ctx.stroke();
    ctx.restore();
  }
  function pathStroke(ctx, pts, w, color, cap) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.lineCap = cap || 'butt';
    ctx.stroke();
  }
  function paintPath(ctx) {
    var pts = PATH.slice(); pts[0] = [-10, 130];
    pathStroke(ctx, pts, 60, PAL.pathEdge);
    pathStroke(ctx, pts, 54, PAL.path);
    ctx.save(); ctx.setLineDash([10, 14]);
    pathStroke(ctx, pts, 2, PAL.pathRut);
    ctx.restore();
    // 淡淡的方向 V 字
    ctx.save();
    ctx.strokeStyle = 'rgba(70,50,25,0.28)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var i = 0; i < PATH.length - 1; i++) {
      var a = PATH[i], b = PATH[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      var ux = dx / L, uy = dy / L;
      for (var d = 70; d < L - 40; d += 140) {
        var cx = a[0] + ux * d, cy = a[1] + uy * d;
        ctx.beginPath();
        ctx.moveTo(cx - ux * 6 - uy * 8, cy - uy * 6 + ux * 8);
        ctx.lineTo(cx + ux * 4, cy + uy * 4);
        ctx.lineTo(cx - ux * 6 + uy * 8, cy - uy * 6 - ux * 8);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function paintBackground(ctx) {
    ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = PAL.grass; ctx.fillRect(0, 50, 1280, 600);
    // 固定位置的草地斑塊(決定性, 不閃)
    ctx.fillStyle = PAL.grassPatch;
    for (var i = 0; i < 40; i++) {
      var px = (i * 337 + 91) % 1280, py = 60 + (i * 211 + 37) % 580;
      ellipse(ctx, px, py, 26 + (i % 5) * 6, 10 + (i % 3) * 4); ctx.fill();
    }
    // 蓋塔格線
    ctx.strokeStyle = PAL.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var c = 0; c <= 27; c++) { ctx.moveTo(c * 48 + 0.5, 50); ctx.lineTo(c * 48 + 0.5, 626); }
    for (var r = 0; r <= 12; r++) { ctx.moveTo(0, 50 + r * 48 + 0.5); ctx.lineTo(1296, 50 + r * 48 + 0.5); }
    ctx.stroke();
    paintPath(ctx);
  }

  // ---------- HUD 子元件 ----------
  function coinGlyph(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = PAL.coin; ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.22); ctx.strokeStyle = PAL.coinDark; ctx.stroke();
    ctx.fillStyle = PAL.coinDark; ctx.fillRect(x - r * 0.28, y - r * 0.28, r * 0.56, r * 0.56);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x - r * 0.45, y - r * 0.45, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function castleGlyph(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 112, s / 112);
    paintCastle(ctx, 0, 0);
    ctx.restore();
  }
  function goldReadout(ctx, x, y, gold) {
    coinGlyph(ctx, x + 10, y, 9);
    txt(ctx, String(Math.max(0, Math.floor(num(gold, 0)))), x + 25, y + 1, 22, PAL.gold, 'left');
  }
  // 下一波預告板(HUD 與說明頁共用)
  function previewPanel(ctx, x, y, w, h, title, types) {
    ctx.save();
    rr(ctx, x, y, w, h, 6);
    ctx.fillStyle = PAL.hudPanel; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.codexLine; ctx.stroke();
    var cy = y + h / 2;
    txt(ctx, title, x + 12, cy, 16, PAL.gold, 'left', true, undefined, 126);
    var list = Array.isArray(types) ? types.slice(0, 5) : [];
    for (var i = 0; i < list.length; i++) {
      var t = normEnemy(list[i]), ex = x + 142 + i * 96;
      rr(ctx, ex, y + 4, 90, h - 8, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
      enemyIcon(ctx, t, ex + 18, cy, 28);
      txt(ctx, TRAIT_NAME[t], ex + 37, cy + 1, 16, PAL.text, 'left');
    }
    ctx.restore();
  }
  function keycap(ctx, label, cx, cy, s) {
    ctx.save();
    var w = Math.max(s, textW(ctx, label, s * 0.6) + s * 0.5);
    rr(ctx, cx - w / 2, cy - s / 2, w, s, s * 0.2);
    ctx.fillStyle = '#eef1f6'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#2a3040'; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(cx - w / 2 + 2, cy + s / 2 - 4, w - 4, 2);
    txt(ctx, label, cx, cy - 1, Math.round(s * 0.58), '#1a1f2a', 'center', true, false);
    ctx.restore();
  }
  function tag(ctx, label, x, y, align) {
    ctx.save();
    ctx.font = font(12, true);
    var w = textW(ctx, label, 12) + 10;
    var lx = align === 'left' ? x : (align === 'right' ? x - w : x - w / 2);
    rr(ctx, lx, y - 9, w, 18, 4);
    ctx.fillStyle = 'rgba(12,14,22,0.82)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
    txt(ctx, label, lx + w / 2, y + 0.5, 12, '#ffffff', 'center', true, false);
    ctx.restore();
  }
  function arrowLine(ctx, x1, y1, x2, y2, color, lw, dashed) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([lw * 2.5, lw * 2]);
    var a = Math.atan2(y2 - y1, x2 - x1), hl = lw * 3.2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.8, y2 - Math.sin(a) * hl * 0.8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.5) * hl, y2 - Math.sin(a - 0.5) * hl);
    ctx.lineTo(x2 - Math.cos(a + 0.5) * hl, y2 - Math.sin(a + 0.5) * hl);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // 商店格(商店面板與說明頁共用)
  var SHOP_KIND = ['towerKit', 'soldierKit', 'ranged', 'melee', 'slotStone', 'golemKit'];
  function shopCell(ctx, cx, cy, w, h, it, idx) {
    it = obj(it);
    var st = (it.state === 'poor' || it.state === 'locked') ? it.state : 'ok';
    var x0 = cx - w / 2, y0 = cy - h / 2;
    ctx.save();
    rr(ctx, x0, y0, w, h, 6);
    ctx.fillStyle = st === 'locked' ? '#1b1f28' : '#2a3550'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = st === 'ok' ? PAL.allyLight : 'rgba(255,255,255,0.18)'; ctx.stroke();
    if (st === 'poor') ctx.globalAlpha = 0.45;
    // 按鍵
    rr(ctx, x0 + 5, y0 + 5, 19, 19, 4);
    ctx.fillStyle = st === 'locked' ? '#6b7180' : PAL.gold; ctx.fill();
    txt(ctx, str(it.key || (idx + 1)), x0 + 14.5, y0 + 15, 14, '#1a1408', 'center', true, false);
    if (st === 'locked') {
      // 鎖
      ctx.strokeStyle = '#8b93a3'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx + 6, cy - 4, 7, Math.PI, 0); ctx.stroke();
      rr(ctx, cx - 4, cy - 4, 20, 16, 3); ctx.fillStyle = '#8b93a3'; ctx.fill();
      ctx.fillStyle = '#1b1f28'; ctx.fillRect(cx + 4.5, cy + 1, 3, 6);
    } else {
      partIcon(ctx, SHOP_KIND[idx] || null, x0 + 23, cy + 10, 24);
      txt(ctx, str(it.name), x0 + 38 + (w - 42) / 2, cy - 12, 13, PAL.text, 'center', true, undefined, w - 44);
      coinGlyph(ctx, x0 + 46, cy + 12, 6);
      txt(ctx, String(num(it.price, 0)), x0 + 57, cy + 13, 16, st === 'poor' ? '#ff6b6b' : PAL.gold, 'left');
    }
    ctx.restore();
  }

  // 慢動作效果(全畫面與說明頁共用)
  function slowMoRect(ctx, x, y, w, h, lx, ly, fs) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#808080'; ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(70,110,190,0.16)'; ctx.fillRect(x, y, w, h);
    var cx = x + w / 2, cy = y + h / 2;
    var g = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.32, cx, cy, Math.max(w, h) * 0.72);
    g.addColorStop(0, 'rgba(5,10,30,0)');
    g.addColorStop(1, 'rgba(5,10,30,0.6)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    var bw = Math.max(4, Math.min(w, h) * 0.012);
    ctx.lineWidth = bw; ctx.strokeStyle = 'rgba(160,215,255,0.95)';
    ctx.strokeRect(x + bw / 2 + 2, y + bw / 2 + 2, w - bw - 4, h - bw - 4);
    ctx.lineWidth = Math.max(1, bw * 0.3); ctx.setLineDash([bw * 2, bw * 1.5]); ctx.strokeStyle = 'rgba(160,215,255,0.6)';
    ctx.strokeRect(x + bw * 2.5, y + bw * 2.5, w - bw * 5, h - bw * 5);
    ctx.setLineDash([]);
    // 「慢動作」+ 兩道慢速 V 字
    ctx.font = font(fs, true);
    var tw = textW(ctx, '慢動作', fs);
    rr(ctx, lx - tw / 2 - fs * 1.4, ly - fs * 0.8, tw + fs * 2.8, fs * 1.6, fs * 0.4);
    ctx.fillStyle = 'rgba(10,20,40,0.7)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(160,215,255,0.9)'; ctx.stroke();
    txt(ctx, '慢動作', lx + fs * 0.35, ly + 1, fs, '#d6f0ff', 'center', true);
    ctx.strokeStyle = '#d6f0ff'; ctx.lineWidth = Math.max(2, fs * 0.1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var ax = lx - tw / 2 - fs * 0.6;
    for (var i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(ax + i * fs * 0.35, ly - fs * 0.3); ctx.lineTo(ax + i * fs * 0.35 + fs * 0.25, ly); ctx.lineTo(ax + i * fs * 0.35, ly + fs * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ======================================================================
  //  匯出函式
  // ======================================================================
  var Art = {
    canvas: { width: 1280, height: 720 },
    palette: PAL,

    drawBackground: function (ctx) {
      ctx.save();
      paintBackground(ctx);
      ctx.restore();
    },

    drawCastle: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 1180), y = num(s.y, 470);
      var hk = prog(s.hitAge, s.hitDuration), ak = prog(s.attackAge, s.attackDuration);
      ctx.save();
      ctx.translate(x, y);
      // 主堡區(允許超出 size 的地面圈, 畫在本體下面)
      var on = !!s.zoneActive;
      ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2);
      ctx.fillStyle = on ? 'rgba(150,205,255,0.16)' : 'rgba(150,205,255,0.05)'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, on ? 108.5 : 109, 0, Math.PI * 2);
      ctx.lineWidth = on ? 3 : 2; ctx.setLineDash(on ? [] : [8, 7]);
      ctx.strokeStyle = on ? 'rgba(190,228,255,0.9)' : 'rgba(190,228,255,0.3)'; ctx.stroke();
      ctx.setLineDash([]);
      paintCastle(ctx, hk < 0 ? 0 : 1 - hk, ak < 0 ? 0 : 1 - ak);
      if (s.targeted) targetFrame(ctx, 112, 112);
      ctx.restore();
    },

    drawTower: function (ctx, s) {
      s = obj(s);
      var ak = prog(s.attackAge, s.attackDuration);
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      paintTower(ctx, ak < 0 ? 0 : 1 - ak, !!s.moving);
      if (s.targeted) targetFrame(ctx, 48, 48);
      ctx.restore();
    },

    drawSoldier: function (ctx, s) {
      s = obj(s);
      var ak = prog(s.attackAge, s.attackDuration);
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      paintSoldier(ctx, ak < 0 ? 0 : 1 - ak, !!s.moving);
      if (s.targeted) targetFrame(ctx, 32, 32);
      ctx.restore();
    },

    drawGolem: function (ctx, s) {
      s = obj(s);
      var ak = prog(s.attackAge, s.attackDuration);
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      paintGolem(ctx, s.team === 'ally', ak < 0 ? 0 : 1 - ak, !!s.moving);
      if (s.targeted) targetFrame(ctx, 56, 56);
      ctx.restore();
    },

    drawEnemy: function (ctx, s) {
      s = obj(s);
      var type = normEnemy(s.type), sz = ENEMY_SIZE[type], W = sz[0], H = sz[1];
      var base = ENEMY_COLOR[type];
      var body = base;
      if (s.slowed) body = mix(base, PAL.ice, 0.55);
      var hk = prog(s.hitAge, s.hitDuration);
      if (hk >= 0) body = mix(s.slowed ? '#9fd0e0' : base, '#ffffff', 0.75 * (1 - hk));
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      paintEnemy(ctx, type, { body: body, bodyHex: base, steel: s.slowed ? mix(PAL.steel, PAL.ice, 0.5) : undefined });
      if (s.moving === false) {
        var fs = Math.max(10, Math.round(H * 0.4));
        txt(ctx, '?', W / 2 - fs * 0.62, -H / 2 + fs * 0.62, fs, PAL.target, 'center', true);
      }
      var hp = num(s.hp, 0), mx = num(s.maxHp, 0);
      if (mx > 0 && hp < mx) {
        var r = clamp(hp / mx, 0, 1);
        ctx.fillStyle = '#1a0606'; ctx.fillRect(-W / 2, -H / 2 - 8, W, 4);
        ctx.fillStyle = PAL.hp; ctx.fillRect(-W / 2, -H / 2 - 8, W * r, 4);
      }
      if (s.targeted) targetFrame(ctx, W, H);
      ctx.restore();
    },

    drawCorpse: function (ctx, s) {
      s = obj(s);
      var type = normCorpse(s.kind), sz = ENEMY_SIZE[type], W = sz[0], H = sz[1];
      var life = num(s.life, 15), mx = num(s.maxLife, 15);
      var blinkOff = life < 3 && Math.floor(life * 5) % 2 === 1;
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      ctx.save();
      ctx.globalAlpha = blinkOff ? 0.25 : 1;
      ctx.save();
      ctx.translate(0, H * 0.18); ctx.scale(1, 0.62);
      paintEnemy(ctx, type, { body: mix(ENEMY_COLOR[type], PAL.corpse, 0.68), bodyHex: '#6c6470', eyes: 'x', shadow: false, steel: '#7d8490' });
      ctx.restore();
      // 剩餘時間細條(框內頂端)
      var r = mx > 0 ? clamp(life / mx, 0, 1) : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-W * 0.4, -H / 2 + 2, W * 0.8, 3);
      ctx.fillStyle = life < 3 ? '#ff8080' : '#d9d4e0'; ctx.fillRect(-W * 0.4, -H / 2 + 2, W * 0.8 * r, 3);
      ctx.restore();
      if (s.targeted) targetFrame(ctx, W, H);
      ctx.restore();
    },

    drawGroundPart: function (ctx, s) {
      s = obj(s);
      var item = s.item === 'slotStone' || PART_KINDS.indexOf(s.item) >= 0 ? s.item : null;
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ellipse(ctx, 0, 10.5, 11, 3); ctx.fill();
      partIcon(ctx, item, 0, -1, 22);
      if (s.targeted) targetFrame(ctx, 28, 28);
      ctx.restore();
    },

    drawCoin: function (ctx, s) {
      s = obj(s);
      ctx.save();
      coinGlyph(ctx, num(s.x, 0), num(s.y, 0), 7);
      ctx.restore();
    },

    drawPlayer: function (ctx, s) {
      s = obj(s);
      var moving = !!s.moving;
      var t = nowSec();
      var bob = moving ? Math.sin(t * 14) * 1 : 0;
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ellipse(ctx, 0, 13, 10, 3); ctx.fill();
      if (moving) {
        var ph = Math.sin(t * 14) * 3;
        ctx.fillStyle = PAL.playerDark;
        ellipse(ctx, -5 + ph, 14, 3, 1.8); ctx.fill();
        ellipse(ctx, 5 - ph, 14, 3, 1.8); ctx.fill();
      }
      ctx.translate(0, bob);
      ctx.strokeStyle = PAL.playerDark; ctx.lineWidth = 2;
      // 袍
      ctx.beginPath(); ctx.moveTo(-9, 1); ctx.lineTo(9, 1); ctx.lineTo(11.5, 13); ctx.lineTo(-11.5, 13); ctx.closePath();
      ctx.fillStyle = PAL.player; ctx.fill(); ctx.stroke();
      // 圍巾
      rr(ctx, -9, -0.5, 18, 4.5, 2); ctx.fillStyle = PAL.playerScarf; ctx.fill();
      // 頭與兜帽
      ctx.beginPath(); ctx.arc(0, -6, 7.5, 0, Math.PI * 2); ctx.fillStyle = PAL.player; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -6, 8.5, Math.PI * 1.02, -0.02 * Math.PI); ctx.lineTo(6, -6); ctx.quadraticCurveTo(0, -11, -6, -6); ctx.closePath();
      ctx.fillStyle = '#7a4a22'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.playerDark;
      ctx.beginPath(); ctx.arc(-2.6, -4.5, 1.2, 0, Math.PI * 2); ctx.arc(2.6, -4.5, 1.2, 0, Math.PI * 2); ctx.fill();
      // 鎚
      ctx.strokeStyle = '#6b4320'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(7.5, 11); ctx.lineTo(11.5, -5); ctx.stroke();
      rr(ctx, 8, -10, 7.5, 5.5, 1.5); ctx.fillStyle = PAL.hammer; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = PAL.playerDark; ctx.stroke();
      ctx.translate(0, -bob);
      // 搶奪進度環(允許超框: 外緣半徑 24, 環寬 4)
      if (s.stealing) {
        var p = clamp(num(s.stealProgress, 0), 0, 1);
        ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,25,0.6)'; ctx.stroke();
        if (p > 0) {
          ctx.beginPath(); ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
          ctx.strokeStyle = PAL.soul; ctx.stroke();
        }
      }
      // 手上物品(頭上框外, 中心 (0,-34), 24×24)
      var hand = normItem(s.handItem);
      if (hand) {
        ctx.beginPath(); ctx.arc(0, -34, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,241,207,0.28)'; ctx.fill();
        partIcon(ctx, hand, 0, -34, 20);
      }
      ctx.restore();
    },

    drawPlacePreview: function (ctx, s) {
      s = obj(s);
      var kind = (s.kind === 'soldier' || s.kind === 'golem') ? s.kind : 'tower';
      var ok = !!s.valid, col = ok ? PAL.valid : PAL.invalid;
      var sz = kind === 'tower' ? 48 : (kind === 'soldier' ? 32 : 56);
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = ok ? 'rgba(95,224,138,0.18)' : 'rgba(255,69,69,0.2)';
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      ctx.lineWidth = 2; ctx.strokeStyle = col;
      if (kind !== 'tower') ctx.setLineDash([5, 4]);
      ctx.strokeRect(-sz / 2 + 1, -sz / 2 + 1, sz - 2, sz - 2);
      ctx.setLineDash([]);
      // 半透明剪影
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = col; ctx.strokeStyle = col;
      if (kind === 'tower') {
        ctx.beginPath();
        ctx.moveTo(-14, 18); ctx.lineTo(-14, -18); ctx.lineTo(-8, -18); ctx.lineTo(-8, -13); ctx.lineTo(-4, -13); ctx.lineTo(-4, -18);
        ctx.lineTo(4, -18); ctx.lineTo(4, -13); ctx.lineTo(8, -13); ctx.lineTo(8, -18); ctx.lineTo(14, -18); ctx.lineTo(14, 18); ctx.closePath();
        ctx.fill();
      } else if (kind === 'soldier') {
        ctx.beginPath(); ctx.arc(0, -6, 6.5, 0, Math.PI * 2); ctx.fill();
        rr(ctx, -8, 1, 16, 12, 3); ctx.fill();
      } else {
        rr(ctx, -11, -24, 22, 13, 4); ctx.fill();
        rr(ctx, -19, -10, 38, 30, 6); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!ok) {
        ctx.strokeStyle = PAL.invalid; ctx.lineWidth = 4; ctx.lineCap = 'round';
        var d = sz * 0.32;
        ctx.beginPath(); ctx.moveTo(-d, -d); ctx.lineTo(d, d); ctx.moveTo(d, -d); ctx.lineTo(-d, d); ctx.stroke();
      }
      ctx.restore();
    },

    drawSoulSlots: function (ctx, s) {
      s = obj(s);
      var slots = Array.isArray(s.slots) && s.slots.length ? s.slots.slice(0, 4) : [null];
      var n = slots.length;
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      rr(ctx, -n * 10, -10, n * 20, 20, 4);
      ctx.fillStyle = 'rgba(10,12,20,0.72)'; ctx.fill();
      for (var i = 0; i < n; i++) {
        var cx = -n * 10 + 10 + i * 20;
        var k = PART_KINDS.indexOf(slots[i]) >= 0 ? slots[i] : null;
        if (k) partIcon(ctx, k, cx, 0, 17); else emptyCell(ctx, cx, 0, 15);
      }
      ctx.restore();
    },

    drawFrostAura: function (ctx, s) {
      s = obj(s);
      var r = clamp(num(s.radius, 70), 4, 70);
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(150,230,255,0.11)'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
      ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(170,235,255,0.5)'; ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(200,245,255,0.45)'; ctx.lineWidth = 1.5;
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3 + 0.3, px = Math.cos(a) * (r - 10), py = Math.sin(a) * (r - 10);
        ctx.beginPath();
        ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py);
        ctx.moveTo(px - 1.5, py - 2.6); ctx.lineTo(px + 1.5, py + 2.6);
        ctx.moveTo(px + 1.5, py - 2.6); ctx.lineTo(px - 1.5, py + 2.6);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawProjectile: function (ctx, s) {
      s = obj(s);
      var kind = (s.kind === 'ice' || s.kind === 'bomb') ? s.kind : 'normal';
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      ctx.rotate(num(s.angle, 0));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (kind === 'normal') {
        ctx.strokeStyle = '#f4f0d8'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(2, 0); ctx.stroke();
        ctx.fillStyle = PAL.ranged;
        ctx.beginPath(); ctx.moveTo(4.8, 0); ctx.lineTo(0.5, -2.8); ctx.lineTo(0.5, 2.8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = PAL.ranged; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-4.2, -2); ctx.moveTo(-4, 0); ctx.lineTo(-4.2, 2); ctx.stroke();
      } else if (kind === 'ice') {
        ctx.fillStyle = 'rgba(159,232,255,0.35)';
        ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PAL.ice; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(4.8, 0); ctx.lineTo(0, -2.6); ctx.lineTo(-4.6, 0); ctx.lineTo(0, 2.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = '#3a2a22'; ctx.strokeStyle = PAL.blast; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, 5.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffe070';
        ctx.beginPath(); ctx.arc(3, -3, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },

    drawPierceBeam: function (ctx, s) {
      s = obj(s);
      var p = prog(s.age, s.duration); if (p < 0) return;
      var k = 1 - p;
      var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0);
      ctx.save();
      ctx.lineCap = 'butt';
      ctx.globalAlpha = k;
      [[24, 'rgba(200,255,120,0.22)'], [11, 'rgba(200,255,120,0.55)'], [3.5, '#ffffff']].forEach(function (l) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.lineWidth = l[0]; ctx.strokeStyle = l[1]; ctx.stroke();
      });
      ctx.restore();
    },

    drawAreaHit: function (ctx, s) {
      s = obj(s);
      var p = prog(s.age, s.duration); if (p < 0) return;
      var kind = (s.kind === 'blast' || s.kind === 'frostSmash') ? s.kind : 'whirl';
      var R = clamp(num(s.radius, 60), 6, 70);
      var e = 1 - Math.pow(1 - p, 2), k = 1 - p;
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      ctx.lineCap = 'round';
      if (kind === 'whirl') { // 白色旋轉斬弧
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(210,235,255,' + (0.14 * k) + ')'; ctx.fill();
        var rot = p * Math.PI * 2;
        ctx.strokeStyle = 'rgba(235,248,255,' + k + ')';
        for (var i = 0; i < 2; i++) {
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(0, 0, R - 4, rot + i * Math.PI, rot + i * Math.PI + Math.PI * 0.75); ctx.stroke();
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(0, 0, R * 0.62, rot + i * Math.PI + 0.3, rot + i * Math.PI + Math.PI * 0.6); ctx.stroke();
        }
      } else if (kind === 'blast') { // 橘色實心爆炸
        var rr0 = (R - 4) * (0.3 + 0.7 * e), lw = 2 + 5 * k;
        var g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, rr0));
        g.addColorStop(0, 'rgba(255,240,150,' + (0.85 * k) + ')');
        g.addColorStop(0.6, 'rgba(255,138,31,' + (0.55 * k) + ')');
        g.addColorStop(1, 'rgba(255,90,20,' + (0.15 * k) + ')');
        ctx.beginPath(); ctx.arc(0, 0, rr0, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, rr0, 0, Math.PI * 2);
        ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(255,170,60,' + k + ')'; ctx.stroke();
      } else { // 冰霜重擊: 青色環 + 冰晶
        var r1 = (R - 5) * (0.25 + 0.75 * e);
        ctx.beginPath(); ctx.arc(0, 0, r1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(150,230,255,' + (0.18 * k) + ')'; ctx.fill();
        ctx.lineWidth = 3 + 3 * k; ctx.strokeStyle = 'rgba(160,236,255,' + k + ')'; ctx.stroke();
        ctx.fillStyle = 'rgba(235,252,255,' + k + ')';
        for (var j = 0; j < 8; j++) {
          var a = j * Math.PI / 4, c = Math.cos(a), sn = Math.sin(a), rd = r1 * 0.78;
          ctx.beginPath();
          ctx.moveTo(c * (rd + 5), sn * (rd + 5));
          ctx.lineTo(c * rd - sn * 2.2, sn * rd + c * 2.2);
          ctx.lineTo(c * (rd - 4), sn * (rd - 4));
          ctx.lineTo(c * rd + sn * 2.2, sn * rd - c * 2.2);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();
    },

    drawHitSpark: function (ctx, s) {
      s = obj(s);
      var p = prog(s.age, s.duration); if (p < 0) return;
      var k = 1 - p;
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      ctx.strokeStyle = 'rgba(255,246,192,' + k + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3 + 0.4, c = Math.cos(a), sn = Math.sin(a);
        ctx.beginPath(); ctx.moveTo(c * (3 + 4 * p), sn * (3 + 4 * p)); ctx.lineTo(c * (6 + 4.5 * p), sn * (6 + 4.5 * p)); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,' + k + ')';
      ctx.beginPath(); ctx.arc(0, 0, 3 * k + 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    drawStealLink: function (ctx, s) {
      s = obj(s);
      var p = clamp(num(s.progress, 0), 0, 1);
      var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0);
      var t = nowSec();
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.55 * p;
      ctx.strokeStyle = PAL.soul; ctx.lineWidth = 1.5 + 2.5 * p; ctx.lineCap = 'round';
      ctx.setLineDash([6, 5]); ctx.lineDashOffset = t * 30;
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x2, y2, 11, 0, Math.PI * 2); ctx.lineWidth = 1.5 + 1.5 * p; ctx.stroke();
      ctx.fillStyle = '#ffd6f5';
      for (var i = 0; i < 3; i++) {
        var f = (t * 1.4 + i / 3) % 1;
        ctx.beginPath(); ctx.arc(x2 + (x1 - x2) * f, y2 + (y1 - y2) * f, 1.5 + 2 * p, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },

    drawComboName: function (ctx, s) {
      s = obj(s);
      var dur = num(s.duration, 1.5), a = num(s.age, -1);
      if (dur <= 0 || a < 0 || a >= dur) return;
      var isNew = !!s.isNew;
      var label = (isNew ? '新組合! ' : '') + str(s.name);
      var fs = isNew ? 18 : 14, ph = isNew ? 30 : 20, maxW = isNew ? 228 : 164;
      var sc = a < 0.08 ? 0.6 + (a / 0.08) * 0.6 : (a < 0.18 ? 1.2 - ((a - 0.08) / 0.1) * 0.2 : 1);
      var popEnd = 0.3, oy = a < popEnd ? 4 : 4 - 11 * Math.min(1, (a - popEnd) / Math.max(0.01, dur - popEnd));
      var alpha = a > dur - 0.5 ? clamp((dur - a) / 0.5, 0, 1) : 1;
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0) + oy);
      ctx.scale(sc, sc);
      ctx.globalAlpha = alpha;
      ctx.font = font(fs, true);
      var pw = clamp(textW(ctx, label, fs) + (isNew ? 24 : 16), 40, maxW);
      rr(ctx, -pw / 2, -ph / 2, pw, ph, ph * 0.35);
      if (isNew) {
        var g = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
        g.addColorStop(0, '#ffe58a'); g.addColorStop(1, '#ffb020');
        ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        txt(ctx, label, 0, 1, fs, '#2a1a00', 'center', true, false, pw - 12);
      } else {
        ctx.fillStyle = 'rgba(20,26,40,0.9)'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.allyLight; ctx.stroke();
        txt(ctx, label, 0, 1, fs, '#ffffff', 'center', true, false, pw - 10);
      }
      ctx.restore();
    },

    drawSpawnWarning: function (ctx, s) {
      s = obj(s);
      var rem = num(s.remaining, 0), tot = num(s.total, 6);
      if (rem <= 0) return;
      var t = nowSec();
      var speed = rem < 2 ? 14 : 7;
      var blink = 0.55 + 0.45 * Math.abs(Math.sin(t * speed));
      ctx.save();
      ctx.translate(40, 130);
      ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,60,60,' + (0.3 * blink) + ')'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,74,74,' + blink + ')'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * blink) + ')';
      ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(8, -11); ctx.lineTo(8, 11); ctx.closePath(); ctx.fill();
      txt(ctx, String(Math.ceil(Math.min(rem, tot > 0 ? tot : rem))), -7, 1, 20, '#ffffff', 'center', true);
      ctx.restore();
    },

    drawShopPanel: function (ctx, s) {
      s = obj(s);
      var items = Array.isArray(s.items) ? s.items : [];
      ctx.save();
      ctx.translate(640, 600);
      rr(ctx, -330, -42, 660, 84, 8);
      ctx.fillStyle = 'rgba(14,18,28,0.93)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = PAL.codexLine;
      rr(ctx, -329, -41, 658, 82, 8); ctx.stroke();
      var cw = 102, gap = 6, x0 = -330 + 8;
      for (var i = 0; i < 6; i++) shopCell(ctx, x0 + cw / 2 + i * (cw + gap), 0, cw, 68, items[i], i);
      ctx.restore();
    },

    drawHud: function (ctx, s) {
      s = obj(s);
      ctx.save();
      ctx.fillStyle = PAL.hudBg; ctx.fillRect(0, 0, 1280, 50);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 48, 1280, 2);
      // 左半: 金幣 / 主堡 / 波次 / 倒數
      goldReadout(ctx, 14, 25, s.gold);
      castleGlyph(ctx, 150, 25, 30);
      var hp = Math.max(0, Math.ceil(num(s.castleHp, 0))), hmx = num(s.castleMaxHp, 20);
      txt(ctx, hp + ' / ' + hmx, 172, 26, 22, hp <= 5 ? '#ff6b6b' : PAL.text, 'left');
      txt(ctx, '波次', 330, 15, 12, PAL.textDim, 'left', true, false);
      txt(ctx, num(s.wave, 0) + ' / ' + num(s.totalWaves, 6), 330, 34, 20, PAL.text, 'left');
      var nw = num(s.nextWaveIn, -1);
      if (nw >= 0) {
        txt(ctx, '下一波倒數', 450, 15, 12, PAL.textDim, 'left', true, false);
        txt(ctx, Math.ceil(nw) + ' 秒', 450, 34, 20, nw <= 6 ? '#ff8a8a' : PAL.text, 'left');
      }
      // 右半: 下一波預告(更醒目)
      previewPanel(ctx, 646, 4, 628, 42, str(s.previewTitle), s.previewTypes);
      ctx.restore();
    },

    drawCodex: function (ctx, s) {
      s = obj(s);
      var entries = Array.isArray(s.entries) ? s.entries : [];
      ctx.save();
      ctx.fillStyle = PAL.codexBg; ctx.fillRect(0, 650, 1280, 70);
      ctx.fillStyle = PAL.codexLine; ctx.fillRect(0, 650, 1280, 3);
      txt(ctx, '圖鑑', 20, 672, 15, PAL.gold, 'left', true);
      txt(ctx, Math.max(0, num(s.foundCount, 0)) + ' / 6', 20, 698, 22, PAL.text, 'left');
      var x0 = 120, cw = (1272 - x0 - 5 * 8) / 6;
      for (var i = 0; i < 6; i++) {
        var e = obj(entries[i]);
        var cx = x0 + i * (cw + 8), cy = 685;
        rr(ctx, cx, 659, cw, 54, 6);
        if (e.found) {
          ctx.fillStyle = PAL.codexFound; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = PAL.codexLine; ctx.stroke();
          txt(ctx, str(e.name), cx + cw / 2, 673, 15, '#ffffff', 'center', true, undefined, cw - 12);
          var parts = Array.isArray(e.parts) ? e.parts : [];
          partIcon(ctx, parts[0], cx + cw / 2 - 22, 698, 20);
          txt(ctx, '+', cx + cw / 2, 698, 16, PAL.textDim, 'center', true, false);
          partIcon(ctx, parts[1], cx + cw / 2 + 22, 698, 20);
        } else {
          ctx.fillStyle = '#191d26'; ctx.fill();
          ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
          ctx.setLineDash([]);
          txt(ctx, '???', cx + cw / 2, 673, 15, '#6f7686', 'center', true, false);
          [-22, 22].forEach(function (dx) {
            emptyCell(ctx, cx + cw / 2 + dx, 698, 18);
            txt(ctx, '?', cx + cw / 2 + dx, 698, 12, '#6f7686', 'center', true, false);
          });
          txt(ctx, '+', cx + cw / 2, 698, 16, '#6f7686', 'center', true, false);
        }
      }
      ctx.restore();
    },

    drawSlowMo: function (ctx) {
      ctx.save();
      slowMoRect(ctx, 0, 0, 1280, 720, 640, 80, 24);
      ctx.restore();
    },

    drawSoulPopup: function (ctx, s) {
      s = obj(s);
      var slots = Array.isArray(s.slots) && s.slots.length ? s.slots.slice(0, 4) : [null, null];
      var n = slots.length;
      var w = num(s.w, n * 48 + 120), h = num(s.h, 116);
      var idx = Math.floor(num(s.index, 0)); idx = ((idx % n) + n) % n;
      var sp = prog(s.shakeAge, s.shakeDuration);
      var shake = sp < 0 ? 0 : Math.sin(sp * Math.PI * 6) * 6 * (1 - sp);
      ctx.save();
      ctx.translate(num(s.x, 0) + shake, num(s.y, 0));
      rr(ctx, -w / 2, -h / 2, w, h, 10);
      ctx.fillStyle = 'rgba(27,33,51,0.97)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = PAL.allyLight;
      rr(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 9); ctx.stroke();
      var hx = w / 2 - 44;
      txt(ctx, str(s.title), 0, -40, 16, '#ffffff', 'center', true, undefined, Math.max(40, 2 * (hx - 16)));
      // 槽位
      for (var i = 0; i < n; i++) {
        var sx = -w / 2 + 40 + i * 48;
        var k = PART_KINDS.indexOf(slots[i]) >= 0 ? slots[i] : null;
        if (k) partIcon(ctx, k, sx, -4, 38); else emptyCell(ctx, sx, -4, 38);
        if (i === idx) {
          ctx.save();
          ctx.lineWidth = 3.5; ctx.strokeStyle = PAL.target;
          rr(ctx, sx - 23.5, -27.5, 47, 47, 8); ctx.stroke();
          ctx.fillStyle = PAL.target;
          ctx.beginPath(); ctx.moveTo(sx, 20); ctx.lineTo(sx - 6, 27); ctx.lineTo(sx + 6, 27); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
      // 分隔線 + 手上格
      var sepX = -w / 2 + 40 + (n - 1) * 48 + 20 + (hx - 20 - (-w / 2 + 40 + (n - 1) * 48 + 20)) / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sepX, -28); ctx.lineTo(sepX, 18); ctx.stroke();
      txt(ctx, '手上', hx, -31, 11, PAL.textDim, 'center', true, false);
      rr(ctx, hx - 20, -24, 40, 40, 8);
      ctx.fillStyle = 'rgba(255,241,207,0.1)'; ctx.fill();
      var hand = normItem(s.hand);
      if (hand) partIcon(ctx, hand, hx, -4, 34); else emptyCell(ctx, hx, -4, 34);
      // 底列
      var al = str(s.actionLabel);
      if (al) txt(ctx, al, -w / 2 + 14, 40, 16, PAL.target, 'left', true);
      txt(ctx, 'J 確定  K 關閉', w / 2 - 12, 40, 12, PAL.textDim, 'right', true, false);
      ctx.restore();
    },

    drawResult: function (ctx, s) {
      s = obj(s);
      var win = !!s.win;
      ctx.save();
      ctx.fillStyle = 'rgba(6,8,14,0.78)'; ctx.fillRect(0, 0, 1280, 720);
      rr(ctx, 380, 190, 520, 320, 16);
      ctx.fillStyle = '#1b2133'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = win ? PAL.gold : PAL.warn; ctx.stroke();
      txt(ctx, win ? '勝利' : '主堡被攻陷', 640, 262, 54, win ? PAL.gold : '#ff6b6b', 'center', true);
      txt(ctx, '第 ' + num(s.wave, 0) + ' / ' + num(s.totalWaves, 6) + ' 波', 640, 340, 26, PAL.text, 'center', true);
      txt(ctx, '發現組合 ' + num(s.foundCount, 0) + ' / 6', 640, 385, 26, PAL.text, 'center', true);
      keycap(ctx, 'J', 572, 452, 30);
      txt(ctx, '按 J 重新開始', 660, 452, 20, PAL.textDim, 'center', true, false);
      ctx.restore();
    },

    drawGuidePage: function (ctx, s) {
      s = obj(s);
      var page = Math.floor(num(s.page, 0));
      var g = GUIDE[page];
      if (!g) return;
      var x = num(s.x, 0), y = num(s.y, 0), w = num(s.w, g.w), h = num(s.h, g.h);
      if (w <= 0 || h <= 0) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      rr(ctx, x, y, w, h, 8); ctx.fillStyle = '#121722'; ctx.fill();
      var sc = Math.min(w / g.w, h / g.h);
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(sc, sc);
      ctx.translate(-g.w / 2, -g.h / 2);
      g.draw(ctx);
      ctx.restore();
    }
  };

  // ======================================================================
  //  說明頁示意圖(虛擬尺寸 g.w × g.h, 等比縮放置中進 RD 給的框)
  // ======================================================================
  // 把遊戲座標的一塊區域 (gx,gy,gw,gh) 等比映射進虛擬區 (vx,vy,vw,vh)
  function scene(ctx, vx, vy, vw, vh, gx, gy, gw, gh, fn) {
    var sc = Math.min(vw / gw, vh / gh);
    ctx.save();
    ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
    ctx.translate(vx + (vw - gw * sc) / 2, vy + (vh - gh * sc) / 2);
    ctx.scale(sc, sc);
    ctx.translate(-gx, -gy);
    fn(ctx, sc);
    ctx.restore();
  }
  function big(ctx, x, y, k, fn) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); fn(ctx); ctx.restore();
  }
  function box(ctx, x, y, w, h) {
    ctx.save();
    grassFill(ctx, x, y, w, h);
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.stroke();
    ctx.restore();
  }
  var A = Art;
  var IDLE = { attackAge: 1, attackDuration: 0.15, hitAge: 1, hitDuration: 0.3 };
  function st(o) { var r = {}; for (var k in IDLE) r[k] = IDLE[k]; for (var j in o) r[j] = o[j]; return r; }
  function slotsAt(ctx, x, y, slots, k) { big(ctx, x, y, k || 1, function (c) { A.drawSoulSlots(c, { x: 0, y: 0, slots: slots }); }); }

  var GUIDE = [
    { // 1 守住主堡
      w: 480, h: 270,
      draw: function (ctx) {
        scene(ctx, 0, 22, 480, 225, 0, 50, 1280, 600, function (c, sc) {
          A.drawBackground(c);
          A.drawCastle(c, st({ x: 1180, y: 470, zoneActive: false, targeted: false }));
          var K = 1.8;
          big(c, 40, 130, 1.5, function (q) { q.translate(-40, -130); A.drawSpawnWarning(q, { remaining: 2.4, total: 6 }); });
          [[504, 218, 0.05], [888, 362, 0.05]].forEach(function (t) {
            big(c, t[0], t[1], K, function (q) { A.drawTower(q, st({ x: 0, y: 0, attackAge: t[2], moving: false, targeted: false })); });
          });
          [[230, 130], [560, 130], [880, 130], [1060, 230], [820, 300], [430, 300]].forEach(function (p) {
            big(c, p[0], p[1], K, function (q) { A.drawEnemy(q, { type: 'imp', x: 0, y: 0, hp: 40, maxHp: 40, hitAge: 1, hitDuration: 0.2, moving: true, slowed: false, targeted: false }); });
          });
          // 箭: 箭塔 → 小鬼, 飛到半路
          [[504, 218, 430, 300], [888, 362, 820, 300]].forEach(function (l) {
            var a = Math.atan2(l[3] - l[1], l[2] - l[0]);
            big(c, (l[0] + l[2]) / 2, (l[1] + l[3]) / 2, K, function (q) { A.drawProjectile(q, { x: 0, y: 0, angle: a, kind: 'normal' }); });
          });
          // 路線走向(虛線 + 箭頭指向主堡)
          c.save();
          c.globalAlpha = 0.75;
          c.setLineDash([22, 18]); c.lineWidth = 6; c.strokeStyle = '#ffffff'; c.lineJoin = 'round';
          c.beginPath(); c.moveTo(90, 130);
          for (var i = 1; i < PATH.length - 1; i++) c.lineTo(PATH[i][0], PATH[i][1]);
          c.lineTo(1080, 470); c.stroke();
          c.restore();
          arrowLine(c, 1040, 470, 1110, 470, 'rgba(255,255,255,0.85)', 7, false);
        });
        var v = function (gx, gy) { return [gx * 0.375, 22 + (gy - 50) * 0.375]; };
        var p1 = v(70, 195); tag(ctx, '出怪點', p1[0], p1[1], 'left');
        var p2 = v(1180, 375); tag(ctx, '主堡', p2[0], p2[1]);
        var p3 = v(504, 150); tag(ctx, '箭塔', p3[0] + 26, p3[1] + 6, 'left');
      }
    },
    { // 2 看預告
      w: 480, h: 240,
      draw: function (ctx) {
        // 上: HUD 預告放大, 虛線圈住
        ctx.save(); ctx.fillStyle = PAL.hudBg; rr(ctx, 4, 4, 246, 46, 6); ctx.fill(); ctx.restore();
        previewPanel(ctx, 6, 6, 240, 42, '下一波: 第 2 波', ['armor']);
        ctx.save();
        ctx.setLineDash([7, 5]); ctx.lineWidth = 3; ctx.strokeStyle = PAL.target;
        rr(ctx, 1.5, 1.5, 251, 51, 8); ctx.stroke();
        ctx.restore();
        tag(ctx, '畫面上方預告', 262, 27, 'left');
        // 下: 同一支普通箭, 鐵甲鬼只少一小截 / 小鬼少一大截
        box(ctx, 0, 58, 480, 182);
        [[112, 'armor', 87.5, 90], [200, 'imp', 30, 40]].forEach(function (L) {
          var y = L[0];
          big(ctx, 90, y, 1.2, function (q) { A.drawTower(q, st({ x: 0, y: 0, attackAge: 0.05 })); });
          ctx.save(); ctx.setLineDash([5, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(244,240,216,0.75)';
          ctx.beginPath(); ctx.moveTo(122, y - 6); ctx.lineTo(292, y); ctx.stroke(); ctx.restore();
          big(ctx, 330, y, 1.8, function (q) {
            A.drawEnemy(q, { type: L[1], x: 0, y: 0, hp: L[2], maxHp: L[3], hitAge: 0.05, hitDuration: 0.2, moving: true, slowed: false, targeted: false });
            A.drawHitSpark(q, { x: -7, y: 2, age: 0.05, duration: 0.25 });
          });
        });
        arrowLine(ctx, 236, 50, 294, 80, 'rgba(255,232,74,0.85)', 2.5, true);
      }
    },
    { // 3 移動與撿錢
      w: 400, h: 240,
      draw: function (ctx) {
        box(ctx, 0, 0, 400, 240);
        var K = 1.6;
        big(ctx, 80, 150, K, function (q) { A.drawCorpse(q, { kind: 'imp', x: 0, y: 0, life: 12, maxLife: 15, targeted: false }); });
        // 遠的那枚(距玩家 > 90)停著; 近的兩枚(< 90)朝玩家飛
        big(ctx, 112, 172, K, function (q) { A.drawCoin(q, { x: 0, y: 0 }); });
        ctx.save(); ctx.strokeStyle = 'rgba(255,201,58,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(160, 168); ctx.lineTo(188, 160); ctx.moveTo(196, 146); ctx.lineTo(222, 143); ctx.stroke(); ctx.restore();
        big(ctx, 196, 157, K, function (q) { A.drawCoin(q, { x: 0, y: 0 }); });
        big(ctx, 232, 142, K, function (q) { A.drawCoin(q, { x: 0, y: 0 }); });
        big(ctx, 285, 140, K, function (q) { A.drawPlayer(q, { x: 0, y: 0, moving: false, handItem: null, stealing: false, stealProgress: 0 }); });
        tag(ctx, '你', 285, 186);
        // WASD 鍵帽(玩家右上)
        keycap(ctx, 'W', 352, 40, 24);
        keycap(ctx, 'A', 324, 68, 24);
        keycap(ctx, 'S', 352, 68, 24);
        keycap(ctx, 'D', 380, 68, 24);
        // 金幣讀數 + 增加
        ctx.save(); rr(ctx, 8, 8, 120, 36, 6); ctx.fillStyle = PAL.hudBg; ctx.fill(); ctx.restore();
        goldReadout(ctx, 14, 26, 42);
        txt(ctx, '+2', 76, 26, 16, '#7dff9a', 'left', true);
      }
    },
    { // 4 拿魂件
      w: 560, h: 280,
      draw: function (ctx) {
        box(ctx, 0, 0, 380, 280);
        big(ctx, 110, 222, 1.3, function (q) { A.drawTower(q, st({ x: 0, y: 0, targeted: true })); });
        slotsAt(ctx, 110, 222 - 44 * 1.3, ['ranged', null], 1.3);
        big(ctx, 180, 226, 1.3, function (q) { A.drawPlayer(q, { x: 0, y: 0, moving: false, handItem: null, stealing: false, stealProgress: 0 }); });
        slowMoRect(ctx, 0, 0, 380, 280, 300, 252, 15);
        A.drawSoulPopup(ctx, { x: 190, y: 92, w: 216, h: 116, title: '箭塔', slots: ['ranged', null], index: 0, hand: null, actionLabel: '拿起', shakeAge: 1, shakeDuration: 0.25 });
        keycap(ctx, '←', 132, 16, 22);
        keycap(ctx, '→', 160, 16, 22);
        // 角落: 屍體也能拿 / 活鬼要撐一下(搶奪)
        box(ctx, 390, 0, 170, 134);
        big(ctx, 475, 92, 1.6, function (q) { A.drawCorpse(q, { kind: 'imp', x: 0, y: 0, life: 12, maxLife: 15, targeted: false }); });
        slotsAt(ctx, 475, 92 - 28 * 1.6, ['melee', 'march'], 1.3);
        tag(ctx, '屍體', 396, 120, 'left');
        box(ctx, 390, 146, 170, 134);
        var ix = 520, iy = 230, K = 1.5;
        big(ctx, ix, iy, K, function (q) {
          A.drawEnemy(q, { type: 'imp', x: 0, y: 0, hp: 40, maxHp: 40, hitAge: 1, hitDuration: 0.2, moving: true, slowed: false, targeted: true });
        });
        var sy = iy - 36 * K;
        slotsAt(ctx, ix, sy, ['melee', 'march'], K);
        var px = 446, py = 236;
        A.drawStealLink(ctx, { x1: px, y1: py, x2: ix - 10 * K, y2: sy, progress: 0.6 });
        big(ctx, px, py, K, function (q) { A.drawPlayer(q, { x: 0, y: 0, moving: false, handItem: null, stealing: true, stealProgress: 0.6 }); });
        tag(ctx, '活鬼', 554, 270, 'right');
      }
    },
    { // 5 裝上與互換
      w: 560, h: 260,
      draw: function (ctx) {
        [[0, 1, 'melee', '裝上', ['ranged', 'melee'], null], [285, 0, 'melee', '互換', ['melee', null], 'ranged']].forEach(function (c) {
          var ox = c[0];
          box(ctx, ox, 0, 275, 260);
          A.drawSoulPopup(ctx, { x: ox + 137, y: 64, w: 216, h: 116, title: '箭塔', slots: ['ranged', null], index: c[1], hand: c[2], actionLabel: c[3], shakeAge: 1, shakeDuration: 0.25 });
          arrowLine(ctx, ox + 137, 128, ox + 137, 150, '#ffffff', 4, false);
          big(ctx, ox + 100, 220, 1.1, function (q) { A.drawTower(q, st({ x: 0, y: 0 })); });
          slotsAt(ctx, ox + 100, 220 - 44 * 1.1, c[4], 1.25);
          big(ctx, ox + 168, 226, 1.1, function (q) { A.drawPlayer(q, { x: 0, y: 0, moving: false, handItem: c[5], stealing: false, stealProgress: 0 }); });
        });
      }
    },
    { // 6 蓋塔與購買
      w: 580, h: 300,
      draw: function (ctx) {
        scene(ctx, 0, 0, 580, 146, 520, 368, 773, 195, function (c) {
          A.drawBackground(c);
          A.drawCastle(c, st({ x: 1180, y: 470, zoneActive: true, targeted: false }));
          big(c, 1104, 528, 1.2, function (q) { A.drawPlayer(q, { x: 0, y: 0, moving: false, handItem: null, stealing: false, stealProgress: 0 }); });
        });
        tag(ctx, '主堡區', 430, 20, 'right');
        big(ctx, 290, 180, 0.8, function (q) {
          q.translate(-640, -600);
          A.drawShopPanel(q, { items: [
            { key: '1', name: '箭塔材料', price: 15, state: 'ok' },
            { key: '2', name: '步兵', price: 12, state: 'ok' },
            { key: '3', name: '遠攻魂件', price: 8, state: 'ok' },
            { key: '4', name: '近戰魂件', price: 8, state: 'ok' },
            { key: '5', name: '擴槽石', price: 20, state: 'ok' },
            { key: '6', name: '石魔像', price: 18, state: 'locked' }
          ] });
        });
        // 下排: 可蓋 / 不可蓋 / K 丟下
        box(ctx, 0, 222, 188, 78);
        A.drawPlacePreview(ctx, { kind: 'tower', x: 60, y: 272, valid: true });
        A.drawPlayer(ctx, { x: 60, y: 272, moving: false, handItem: 'towerKit', stealing: false, stealProgress: 0 });
        tag(ctx, '路旁: 可蓋', 182, 286, 'right');
        box(ctx, 196, 222, 188, 78);
        ctx.save(); ctx.beginPath(); ctx.rect(196, 222, 188, 78); ctx.clip();
        ctx.fillStyle = PAL.pathEdge; ctx.fillRect(196, 245, 188, 60);
        ctx.fillStyle = PAL.path; ctx.fillRect(196, 248, 188, 54);
        ctx.restore();
        A.drawPlacePreview(ctx, { kind: 'tower', x: 256, y: 272, valid: false });
        A.drawPlayer(ctx, { x: 256, y: 272, moving: false, handItem: 'towerKit', stealing: false, stealProgress: 0 });
        tag(ctx, '路上: 不行', 378, 286, 'right');
        box(ctx, 392, 222, 188, 78);
        A.drawPlayer(ctx, { x: 430, y: 276, moving: false, handItem: 'melee', stealing: false, stealProgress: 0 });
        keycap(ctx, 'K', 486, 256, 24);
        arrowLine(ctx, 472, 278, 506, 278, '#ffffff', 3, false);
        A.drawPlayer(ctx, { x: 530, y: 276, moving: false, handItem: null, stealing: false, stealProgress: 0 });
        A.drawGroundPart(ctx, { item: 'melee', x: 560, y: 284, targeted: false });
      }
    },
    { // 7 招募中立單位
      w: 480, h: 270,
      draw: function (ctx) {
        scene(ctx, 0, 0, 480, 270, 700, 330, 640, 360, function (c) {
          A.drawBackground(c);
          A.drawCastle(c, st({ x: 1180, y: 470, zoneActive: false, targeted: false }));
          var gx = 820, gy = 580;
          // 直線走向主堡(到主堡邊緣)
          var a = Math.atan2(470 - gy, 1180 - gx);
          arrowLine(c, gx + Math.cos(a) * 40, gy + Math.sin(a) * 40, 1180 - Math.cos(a) * 70, 470 - Math.sin(a) * 70, 'rgba(255,255,255,0.9)', 5, true);
          big(c, gx, gy, 1.2, function (q) { A.drawGolem(q, st({ x: 0, y: 0, team: 'neutral', moving: true, targeted: false })); });
          slotsAt(c, gx, gy - 48 * 1.2, ['march', null, null], 1.4);
        });
        tag(ctx, '中立石魔像', 18, 252, 'left');
        // 商店第 6 格: 鎖住 → 石魔像
        shopCell(ctx, 270, 226, 92, 60, { key: '6', name: '', price: 18, state: 'locked' }, 5);
        arrowLine(ctx, 320, 226, 352, 226, '#ffffff', 3, false);
        shopCell(ctx, 410, 226, 102, 60, { key: '6', name: '石魔像', price: 18, state: 'ok' }, 5);
      }
    }
  ];

  window.Art = Art;
})();
