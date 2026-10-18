// 魂匠掠奪 美術 — 全部 Canvas 2D 幾何繪製, 不引外部資源
// 介面以 interface.json 為準; 說明見 style.md
(function () {
  'use strict';

  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  var C = {
    bg: '#2d3428', bgTuft: '#394230', bgStone: '#353c30',
    hudBg: '#14171d', hudLine: '#3a4050', text: '#f2f2ea', textDim: '#a8adb8', ink: '#101216',
    player: '#f6f6f2', playerLine: '#1b1e26', playerAccent: '#7fe6ff', hold: '#ffffff',
    ally: '#4a8cff', allyDark: '#22457e',
    neutral: '#b8a888', neutralDark: '#6a604c',
    enemy: '#d8404a', enemyDark: '#4a0e14', enemyHorn: '#f0d8c0',
    elite: '#9c1c30', eliteHalo: '#ff4cd2', crown: '#ffcc3a',
    harmless: '#8f8084', harmlessDark: '#4a4446',
    select: '#fff04a',
    coin: '#f5b52e', coinRim: '#8a5a10',
    hpAlly: '#5ce07a', hpEnemy: '#ff5a5a', hpMid: '#f0c040', hpBack: '#14161a',
    stone: '#8b8f99', stoneDark: '#4c505a', stoneLight: '#b4b8c2',
    zone: '#6fe08a',
    projAlly: '#9fe0ff', projEnemy: '#ff6a3a', spark: '#fff6c8',
    warn: '#ff3b3b',
    pad: '#454a56', padRim: '#d8b060', locked: '#24272e',
    slotBg: '#181b22', slotLine: '#5a6070',
    // 魂件(形狀為主通道, 顏色為第二通道)
    ranged: '#ff9838', melee: '#ff4f6a', seek: '#38d6e6', march: '#c06cff',
    shield: '#c4cedd', swift: '#4fdc6a', towerShell: '#c8a878'
  };

  // ---------- 小工具 ----------
  function now() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
  }
  function S(s) { return (s && typeof s === 'object') ? s : {}; }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function pick(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  var PARTS = ['ranged', 'melee', 'seek', 'march', 'shield', 'swift'];
  var ITEMS = PARTS.concat(['towerShell']);
  function partOrNull(v) { return ITEMS.indexOf(v) >= 0 ? v : null; }

  function hexRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    t = clamp(t, 0, 1);
    var x = hexRgb(a), y = hexRgb(b);
    var r = Math.round(x[0] + (y[0] - x[0]) * t), g = Math.round(x[1] + (y[1] - x[1]) * t), bl = Math.round(x[2] + (y[2] - x[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  function rgba(h, a) { var x = hexRgb(h); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; }

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 有深色描邊的文字(P10)
  function text(ctx, str, x, y, size, color, align, weight) {
    ctx.save();
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.18);
    ctx.strokeStyle = 'rgba(10,12,16,0.9)';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  // 計時欄位: 0 ≤ age < dur 表示正在播, 回傳 0~1 進度, 否則 -1
  function playing(age, dur) {
    age = num(age, -1); dur = num(dur, 0);
    if (dur <= 0 || age < 0 || age >= dur) return -1;
    return age / dur;
  }

  function hpBar(ctx, cx, cy, w, h, ratio, color) {
    ratio = clamp(num(ratio, 1), 0, 1);
    ctx.save();
    ctx.fillStyle = C.hpBack;
    ctx.fillRect(cx - w / 2 - 1, cy - h / 2 - 1, w + 2, h + 2);
    ctx.fillStyle = color;
    ctx.fillRect(cx - w / 2, cy - h / 2, w * ratio, h);
    ctx.restore();
  }

  // 互動目標外框: 框外, 寬 3(內緣貼判定框外 1px)
  function targetFrame(ctx, x, y, w, h) {
    var t = now();
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(10,12,16,0.7)';
    ctx.strokeRect(x - w / 2 - 2.5, y - h / 2 - 2.5, w + 5, h + 5);
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.select;
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 6);
    ctx.strokeRect(x - w / 2 - 2.5, y - h / 2 - 2.5, w + 5, h + 5);
    ctx.restore();
  }

  // 陣營底座: 我方實心藍 / 敵方暗紅 / 中立虛線土色
  function teamBase(ctx, y, rx, ry, team) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, y, rx, ry, 0, 0, Math.PI * 2);
    if (team === 'ally') {
      ctx.fillStyle = rgba(C.ally, 0.35); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = C.ally; ctx.stroke();
    } else if (team === 'enemy') {
      ctx.fillStyle = 'rgba(80,10,16,0.55)'; ctx.fill();
    } else if (team === 'harmless') {
      ctx.fillStyle = 'rgba(30,28,28,0.35)'; ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(20,20,16,0.3)'; ctx.fill();
      ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.strokeStyle = C.neutral; ctx.stroke();
    }
    ctx.restore();
  }

  function unitAnim(s) {
    var hit = playing(s.hitAge, s.hitDuration);
    var atk = playing(s.attackAge, s.attackDuration);
    var flash = hit >= 0 ? 1 - hit : 0;
    var bob = atk >= 0 ? -Math.sin(Math.PI * atk) * 3 : 0;
    var step = s.moving === true ? Math.sin(now() * 14) : 0;
    return { flash: flash, bob: bob, step: step, moving: s.moving === true };
  }

  // ---------- 魂件圖示(全遊戲同一套) ----------
  // 在 (cx, cy) 畫邊長約 sz 的圖示
  function partIcon(ctx, kind, cx, cy, sz, dim) {
    kind = partOrNull(kind);
    if (!kind) return;
    var col = C[kind];
    ctx.save();
    ctx.translate(cx, cy);
    var k = sz / 16;
    ctx.scale(k, k);
    if (dim) ctx.globalAlpha *= 0.55;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    if (kind === 'ranged') {
      // 箭: 斜桿 + 大三角箭頭 + 尾羽
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(3, -3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7, -7); ctx.lineTo(0, -5); ctx.lineTo(5, 0); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-7.5, 2.5); ctx.moveTo(-6, 6); ctx.lineTo(-2.5, 7.5); ctx.stroke();
    } else if (kind === 'melee') {
      // 爪痕: 三道弧形斜線
      ctx.lineWidth = 2.6;
      for (var i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-5 + i * 4.5, -7);
        ctx.quadraticCurveTo(-1 + i * 4.5, -1, -3 + i * 4.5, 7);
        ctx.stroke();
      }
    } else if (kind === 'seek') {
      // 眼睛
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0, -9, 8, 0); ctx.quadraticCurveTo(0, 9, -8, 0); ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'march') {
      // 攻城旗: 桿 + 方旗 + 往前的箭尖
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(-5, -8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(4, -8); ctx.lineTo(8, -4.5); ctx.lineTo(4, -1); ctx.lineTo(-5, -1); ctx.closePath(); ctx.fill();
    } else if (kind === 'shield') {
      // 盾
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(7, -5.5); ctx.lineTo(6, 2); ctx.quadraticCurveTo(4, 6, 0, 8.5);
      ctx.quadraticCurveTo(-4, 6, -6, 2); ctx.lineTo(-7, -5.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#59647a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
    } else if (kind === 'swift') {
      // 閃電
      ctx.beginPath();
      ctx.moveTo(2, -8.5); ctx.lineTo(-6, 1); ctx.lineTo(-0.5, 1); ctx.lineTo(-2.5, 8.5); ctx.lineTo(6, -1.5); ctx.lineTo(0.5, -1.5); ctx.closePath();
      ctx.fill();
    } else if (kind === 'towerShell') {
      // 塔殼: 有垛口的塔身剪影
      ctx.beginPath();
      ctx.moveTo(-6, 8); ctx.lineTo(-5, -3); ctx.lineTo(-7, -3); ctx.lineTo(-7, -8); ctx.lineTo(-4, -8); ctx.lineTo(-4, -6);
      ctx.lineTo(-1.5, -6); ctx.lineTo(-1.5, -8); ctx.lineTo(1.5, -8); ctx.lineTo(1.5, -6); ctx.lineTo(4, -6); ctx.lineTo(4, -8);
      ctx.lineTo(7, -8); ctx.lineTo(7, -3); ctx.lineTo(5, -3); ctx.lineTo(6, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a3226';
      ctx.fillRect(-1.6, 2, 3.2, 6);
    }
    ctx.restore();
  }

  // 一格槽: 中心 (cx, cy), 邊長 sz
  function slotCell(ctx, cx, cy, sz, kind, selected, iconScale) {
    kind = partOrNull(kind);
    ctx.save();
    var h = sz / 2;
    rr(ctx, cx - h, cy - h, sz, sz, sz * 0.18);
    ctx.fillStyle = selected ? '#3a3820' : C.slotBg;
    ctx.fill();
    if (kind) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = C.slotLine;
      ctx.stroke();
      partIcon(ctx, kind, cx, cy, sz * (iconScale || 0.82));
    } else {
      ctx.setLineDash([Math.max(2, sz * 0.12), Math.max(2, sz * 0.1)]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(160,166,180,0.55)';
      ctx.stroke();
    }
    ctx.restore();
    if (selected) {
      ctx.save();
      var p = 0.7 + 0.3 * Math.sin(now() * 8);
      var lw = Math.max(2.5, sz * 0.12);
      ctx.lineWidth = lw;
      ctx.strokeStyle = C.select;
      ctx.shadowColor = C.select;
      ctx.shadowBlur = sz * 0.5 * p;
      rr(ctx, cx - h + lw / 2 - 0.5, cy - h + lw / 2 - 0.5, sz - lw + 1, sz - lw + 1, sz * 0.18);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- 背景 ----------
  var tufts = null;
  function makeTufts() {
    var seed = 12345, out = [];
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (var i = 0; i < 140; i++) out.push({ x: rnd() * 1280, y: 50 + rnd() * 670, s: 0.6 + rnd() * 0.8, k: rnd() < 0.25 ? 1 : 0 });
    return out;
  }

  function drawBackground(ctx) {
    ctx.save();
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, 1280, 720);
    if (!tufts) tufts = makeTufts();
    for (var i = 0; i < tufts.length; i++) {
      var t = tufts[i];
      if (t.k) {
        ctx.fillStyle = C.bgStone;
        ctx.beginPath(); ctx.ellipse(t.x, t.y, 7 * t.s, 4 * t.s, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.strokeStyle = C.bgTuft; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(t.x - 4 * t.s, t.y); ctx.lineTo(t.x - 6 * t.s, t.y - 6 * t.s);
        ctx.moveTo(t.x, t.y); ctx.lineTo(t.x, t.y - 8 * t.s);
        ctx.moveTo(t.x + 4 * t.s, t.y); ctx.lineTo(t.x + 6 * t.s, t.y - 6 * t.s);
        ctx.stroke();
      }
    }
    // 四邊變暗: 暗示敵人從四邊進來
    var e = 70;
    var g;
    g = ctx.createLinearGradient(0, 50, 0, 50 + e); g.addColorStop(0, 'rgba(10,6,6,0.55)'); g.addColorStop(1, 'rgba(10,6,6,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 50, 1280, e);
    g = ctx.createLinearGradient(0, 720, 0, 720 - e); g.addColorStop(0, 'rgba(10,6,6,0.55)'); g.addColorStop(1, 'rgba(10,6,6,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 720 - e, 1280, e);
    g = ctx.createLinearGradient(0, 0, e, 0); g.addColorStop(0, 'rgba(10,6,6,0.55)'); g.addColorStop(1, 'rgba(10,6,6,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 50, e, 670);
    g = ctx.createLinearGradient(1280, 0, 1280 - e, 0); g.addColorStop(0, 'rgba(10,6,6,0.55)'); g.addColorStop(1, 'rgba(10,6,6,0)');
    ctx.fillStyle = g; ctx.fillRect(1280 - e, 50, e, 670);
    ctx.restore();
  }

  // ---------- 商店台 ----------
  function padContent(ctx, idx, dim) {
    ctx.save();
    if (dim) ctx.globalAlpha *= 0.5;
    if (idx === 0) {
      partIcon(ctx, 'towerShell', 0, 0, 34);
    } else if (idx === 1) {
      // 野狼頭
      ctx.fillStyle = '#8e9ab0';
      ctx.beginPath(); ctx.moveTo(-11, -6); ctx.lineTo(-8, -15); ctx.lineTo(-3, -8); ctx.lineTo(3, -8); ctx.lineTo(8, -15); ctx.lineTo(11, -6);
      ctx.lineTo(9, 5); ctx.lineTo(0, 13); ctx.lineTo(-9, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.arc(-4, -1, 1.8, 0, Math.PI * 2); ctx.arc(4, -1, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 8, 2.2, 0, Math.PI * 2); ctx.fill();
    } else {
      // 石像臉
      ctx.fillStyle = '#9a9488';
      rr(ctx, -11, -14, 22, 28, 4); ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.fillRect(-7, -5, 5, 2.5); ctx.fillRect(2, -5, 5, 2.5); ctx.fillRect(-5, 5, 10, 2);
    }
    ctx.restore();
  }

  function drawShopPad(ctx, state) {
    var s = S(state);
    var x = num(s.x, 0), y = num(s.y, 0);
    var idx = pick(s.index, [0, 1, 2], 0);
    var st = pick(s.state, ['ok', 'poor', 'locked'], 'locked');
    var standing = s.standing === true;
    var name = (typeof s.name === 'string') ? s.name : '';
    var price = num(s.price, 0);
    ctx.save();
    ctx.translate(x, y);
    // 台座
    rr(ctx, -27, -27, 54, 54, 8);
    ctx.fillStyle = st === 'locked' ? C.locked : (st === 'poor' ? '#353842' : C.pad);
    ctx.fill();
    rr(ctx, -21, -21, 42, 42, 6);
    ctx.fillStyle = st === 'locked' ? '#1c1e24' : '#2c3038';
    ctx.fill();
    if (standing && st !== 'locked') {
      ctx.save();
      rr(ctx, -21, -21, 42, 42, 6);
      ctx.fillStyle = rgba(C.select, 0.18 + 0.1 * Math.sin(now() * 6));
      ctx.fill();
      ctx.restore();
    }
    if (st === 'locked') {
      // 鎖
      ctx.strokeStyle = '#8a8e98'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -4, 7, Math.PI, 0); ctx.lineTo(7, 2); ctx.moveTo(-7, 2); ctx.lineTo(-7, -4); ctx.stroke();
      ctx.fillStyle = '#8a8e98';
      rr(ctx, -10, 0, 20, 14, 3); ctx.fill();
      ctx.fillStyle = C.ink; ctx.fillRect(-1.5, 4, 3, 6);
    } else {
      padContent(ctx, idx, st === 'poor');
    }
    // 外框
    rr(ctx, -27, -27, 54, 54, 8);
    if (standing) {
      ctx.lineWidth = 3; ctx.strokeStyle = C.select;
      ctx.shadowColor = C.select; ctx.shadowBlur = 10;
    } else {
      ctx.lineWidth = 2;
      ctx.strokeStyle = st === 'ok' ? C.padRim : (st === 'poor' ? '#6a6050' : '#3c3f48');
    }
    rr(ctx, -26.5, -26.5, 53, 53, 8);
    ctx.stroke();
    ctx.restore();
    // 框外下方文字 (x, y+40)
    if (st === 'locked') {
      text(ctx, '未解鎖', x, y + 40, 15, '#8a8e98');
    } else {
      ctx.save();
      ctx.font = 'bold 16px ' + FONT;
      var nw = ctx.measureText(name + ' ').width;
      var pw = ctx.measureText(String(price)).width;
      ctx.restore();
      var total = nw + 14 + pw;
      var left = x - total / 2;
      text(ctx, name + ' ', left, y + 40, 16, st === 'poor' ? C.textDim : C.text, 'left');
      coinShape(ctx, left + nw + 6, y + 40, 6, false);
      text(ctx, String(price), left + nw + 14, y + 40, 16, st === 'poor' ? C.hpEnemy : C.coin, 'left');
    }
  }

  // ---------- 主堡 ----------
  function castleImpl(ctx, s, showZone) {
    var x = num(s.x, 640), y = num(s.y, 385);
    var hit = playing(s.hitAge, s.hitDuration);
    var flash = hit >= 0 ? 1 - hit : 0;
    var zone = s.zoneActive === true;
    ctx.save();
    if (showZone) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, 150, 0, Math.PI * 2);
      ctx.fillStyle = rgba(C.zone, zone ? 0.13 : 0.05); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 149, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      if (zone) {
        ctx.strokeStyle = rgba(C.zone, 0.7);
      } else {
        ctx.setLineDash([10, 8]); ctx.strokeStyle = rgba(C.zone, 0.28);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.translate(x, y);
    var stone = mix(C.stone, '#ff3030', flash * 0.8);
    var dark = mix(C.stoneDark, '#801010', flash * 0.8);
    var light = mix(C.stoneLight, '#ff9090', flash * 0.8);
    // 影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 46, 52, 9, 0, 0, Math.PI * 2); ctx.fill();
    // 城牆
    ctx.fillStyle = stone;
    ctx.fillRect(-44, -24, 88, 70);
    ctx.fillStyle = dark;
    ctx.fillRect(-44, 36, 88, 10);
    // 四角塔
    var cx = [-40, 40];
    for (var i = 0; i < 2; i++) {
      ctx.fillStyle = light;
      ctx.fillRect(cx[i] - 14, -40, 28, 86);
      ctx.fillStyle = stone;
      for (var j = 0; j < 3; j++) ctx.fillRect(cx[i] - 14 + j * 10, -48, 8, 8);
      ctx.fillStyle = dark;
      ctx.fillRect(cx[i] - 3, -26, 6, 12);
    }
    // 主塔
    ctx.fillStyle = light;
    ctx.fillRect(-20, -46, 40, 50);
    ctx.fillStyle = stone;
    for (var k = 0; k < 4; k++) ctx.fillRect(-20 + k * 11, -54, 7, 8);
    // 藍色長旗幟(我方)
    ctx.fillStyle = mix(C.ally, '#ff3030', flash * 0.6);
    ctx.fillRect(-9, -40, 18, 30);
    ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(0, -16); ctx.lineTo(9, -10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, -28, 4, 0, Math.PI * 2); ctx.fill();
    // 城門
    ctx.fillStyle = '#2a2420';
    ctx.beginPath(); ctx.moveTo(-13, 46); ctx.lineTo(-13, 22); ctx.arc(0, 22, 13, Math.PI, 0); ctx.lineTo(13, 46); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (s.targeted === true) targetFrame(ctx, x, y, 112, 112);
  }
  function drawCastle(ctx, state) {
    ctx.save();
    castleImpl(ctx, S(state), true);
    ctx.restore();
  }

  // ---------- 箭塔 ----------
  function towerBody(ctx, a, team) {
    var stone = mix(C.stone, '#ffffff', a.flash * 0.75);
    var dark = mix(C.stoneDark, '#ffffff', a.flash * 0.5);
    var accent = team === 'ally' ? C.ally : C.neutral;
    teamBase(ctx, 18, 21, 5, team);
    ctx.save();
    ctx.translate(0, a.bob + (a.moving ? Math.abs(a.step) * -1.5 : 0));
    // 塔身(梯形)
    ctx.fillStyle = stone;
    ctx.beginPath(); ctx.moveTo(-14, 18); ctx.lineTo(-11, -8); ctx.lineTo(11, -8); ctx.lineTo(14, 18); ctx.closePath(); ctx.fill();
    // 平台 + 垛口
    ctx.fillStyle = dark;
    ctx.fillRect(-16, -12, 32, 6);
    ctx.fillStyle = stone;
    for (var i = 0; i < 4; i++) ctx.fillRect(-16 + i * 9, -18, 5, 6);
    // 藍色射口光
    ctx.fillStyle = mix(accent, '#ffffff', a.flash * 0.5);
    ctx.fillRect(-2.5, -3, 5, 10);
    ctx.fillStyle = dark;
    ctx.fillRect(-14, 14, 28, 4);
    if (a.moving) {
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(-9 + a.step * 2, 19, 3, 0, Math.PI * 2); ctx.arc(9 - a.step * 2, 19, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drawTower(ctx, state) {
    var s = S(state);
    var x = num(s.x, 0), y = num(s.y, 0);
    var a = unitAnim(s);
    ctx.save();
    ctx.translate(x, y);
    towerBody(ctx, a, 'ally');
    ctx.restore();
    var hp = num(s.hp, 1), mh = num(s.maxHp, 1);
    if (mh > 0 && hp < mh) hpBar(ctx, x, y - 30, 48, 4, hp / mh, C.hpAlly);
    if (s.targeted === true) targetFrame(ctx, x, y, 48, 48);
  }

  // ---------- 野狼 ----------
  function wolfBody(ctx, a, team) {
    var neutral = team !== 'ally';
    var fur = mix(neutral ? C.neutral : '#8e9ab0', '#ffffff', a.flash * 0.75);
    var furDark = neutral ? C.neutralDark : '#4e5870';
    teamBase(ctx, 13, 16, 4, neutral ? 'neutral' : 'ally');
    ctx.save();
    ctx.translate(0, a.bob);
    // 腿
    ctx.fillStyle = furDark;
    var st = a.step * 2;
    ctx.fillRect(-9 + st, 6, 3, 8); ctx.fillRect(-3 - st, 6, 3, 8); ctx.fillRect(3 + st, 6, 3, 8); ctx.fillRect(8 - st, 6, 3, 8);
    // 尾
    ctx.strokeStyle = fur; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-11, 2); ctx.quadraticCurveTo(-16, -2, -15, -8); ctx.stroke();
    // 身體
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.ellipse(-1, 3, 12, 6.5, 0, 0, Math.PI * 2); ctx.fill();
    // 頭
    ctx.beginPath(); ctx.arc(8, -4, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12, -6); ctx.lineTo(17, -2); ctx.lineTo(12, 1); ctx.closePath(); ctx.fill();
    // 耳(圓頭小耳, 避開敵人的尖角)
    ctx.beginPath(); ctx.ellipse(5, -11, 2.4, 4, -0.3, 0, Math.PI * 2); ctx.ellipse(10, -11, 2.4, 4, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(9.5, -5, 1.4, 0, Math.PI * 2); ctx.fill();
    // 項圈: 我方藍, 中立無
    if (!neutral) {
      ctx.strokeStyle = C.ally; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(4, -1); ctx.lineTo(6, 3); ctx.stroke();
    }
    ctx.restore();
  }
  function drawWolf(ctx, state) {
    var s = S(state);
    var x = num(s.x, 0), y = num(s.y, 0);
    var team = pick(s.team, ['neutral', 'ally'], 'neutral');
    var a = unitAnim(s);
    ctx.save();
    ctx.translate(x, y);
    wolfBody(ctx, a, team);
    ctx.restore();
    var hp = num(s.hp, 1), mh = num(s.maxHp, 1);
    if (team === 'ally' && mh > 0 && hp < mh) hpBar(ctx, x, y - 24, 36, 4, hp / mh, C.hpAlly);
    if (s.targeted === true) targetFrame(ctx, x, y, 36, 36);
  }

  // ---------- 石像 ----------
  function statueBody(ctx, a, team) {
    var neutral = team !== 'ally';
    var stone = mix(neutral ? '#8a8576' : '#9a9aa4', '#ffffff', a.flash * 0.75);
    var dark = neutral ? '#5a5648' : '#55586a';
    teamBase(ctx, 20, 24, 5, neutral ? 'neutral' : 'ally');
    ctx.save();
    ctx.translate(0, a.bob + (a.moving ? Math.abs(a.step) * -1.5 : 0));
    // 底座
    ctx.fillStyle = dark;
    ctx.fillRect(-20, 13, 40, 8);
    // 身
    ctx.fillStyle = stone;
    rr(ctx, -16, -20, 32, 35, 6); ctx.fill();
    // 肩
    ctx.fillRect(-21, -4, 6, 14); ctx.fillRect(15, -4, 6, 14);
    // 裂紋
    ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-12, 6); ctx.lineTo(-7, 10); ctx.lineTo(-9, 14); ctx.stroke();
    // 眼: 我方亮藍, 中立暗
    ctx.fillStyle = neutral ? '#3e3a30' : C.ally;
    if (!neutral) { ctx.shadowColor = C.ally; ctx.shadowBlur = 6; }
    ctx.fillRect(-10, -10, 7, 3.5); ctx.fillRect(3, -10, 7, 3.5);
    ctx.shadowBlur = 0;
    ctx.fillStyle = dark;
    ctx.fillRect(-6, 2, 12, 2.5);
    ctx.restore();
  }
  function drawStatue(ctx, state) {
    var s = S(state);
    var x = num(s.x, 0), y = num(s.y, 0);
    var team = pick(s.team, ['neutral', 'ally'], 'neutral');
    var a = unitAnim(s);
    ctx.save();
    ctx.translate(x, y);
    statueBody(ctx, a, team);
    ctx.restore();
    var hp = num(s.hp, 1), mh = num(s.maxHp, 1);
    if (team === 'ally' && mh > 0 && hp < mh) hpBar(ctx, x, y - 32, 52, 4, hp / mh, C.hpAlly);
    if (s.targeted === true) targetFrame(ctx, x, y, 52, 52);
  }

  // ---------- 敵人 ----------
  var ENEMY_SIZE = { imp: 32, archer: 32, shield: 40, swift: 32, elite: 60 };

  function horn(ctx, x, y, dir, len, droop) {
    ctx.beginPath();
    if (droop) {
      ctx.moveTo(x - 2.5, y - 1); ctx.lineTo(x + 2.5, y + 1); ctx.lineTo(x + dir * len * 0.9, y + len * 0.45);
    } else {
      ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.lineTo(x + dir * len * 0.45, y - len);
    }
    ctx.closePath();
    ctx.fill();
  }
  function eyes(ctx, dx, y, r, harmless, glow) {
    if (harmless) {
      ctx.strokeStyle = '#2a2426'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-dx - r, y); ctx.lineTo(-dx + r, y); ctx.moveTo(dx - r, y); ctx.lineTo(dx + r, y); ctx.stroke();
      return;
    }
    ctx.fillStyle = glow || '#fff4d0';
    // 怒眼(斜切)
    ctx.beginPath(); ctx.moveTo(-dx - r, y - r * 0.6); ctx.lineTo(-dx + r, y); ctx.lineTo(-dx - r, y + r * 0.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(dx + r, y - r * 0.6); ctx.lineTo(dx - r, y); ctx.lineTo(dx + r, y + r * 0.6); ctx.closePath(); ctx.fill();
  }

  function enemyBody(ctx, type, a, harmless) {
    var half = ENEMY_SIZE[type] / 2;
    var body = harmless ? C.harmless : (type === 'elite' ? C.elite : C.enemy);
    body = mix(body, '#ffffff', a.flash * 0.75);
    var hornC = harmless ? '#a89c9a' : C.enemyHorn;
    var lineC = harmless ? C.harmlessDark : C.enemyDark;
    teamBase(ctx, half - 4, half * 0.7, 3.5, harmless ? 'harmless' : 'enemy');
    ctx.save();
    if (harmless) { ctx.translate(0, half * 0.12); ctx.scale(1, 0.86); }
    ctx.translate(0, a.bob);
    ctx.lineWidth = 2; ctx.strokeStyle = lineC;
    if (harmless) ctx.setLineDash([3, 2.5]);
    var st = a.step;
    if (type === 'imp') {
      ctx.fillStyle = hornC; horn(ctx, -6, -6, -1, 9, harmless); horn(ctx, 6, -6, 1, 9, harmless);
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(0, 2 + st, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      eyes(ctx, 4.5, 0 + st, 2.6, harmless);
    } else if (type === 'archer') {
      // 兜帽水滴身 + 背上的弓
      ctx.fillStyle = hornC; horn(ctx, -5, -8, -1, 6, harmless); horn(ctx, 5, -8, 1, 6, harmless);
      ctx.strokeStyle = harmless ? '#7a7270' : '#c08a4a'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(4, 3 + st, 11, -1.1, 1.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4 + 11 * Math.cos(-1.1), 3 + st + 11 * Math.sin(-1.1)); ctx.lineTo(4 + 11 * Math.cos(1.1), 3 + st + 11 * Math.sin(1.1)); ctx.lineWidth = 1; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = lineC;
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.moveTo(0, -11 + st); ctx.quadraticCurveTo(11, 0 + st, 9, 9 + st); ctx.lineTo(-9, 9 + st); ctx.quadraticCurveTo(-11, 0 + st, 0, -11 + st); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      eyes(ctx, 3.5, 1 + st, 2.3, harmless);
    } else if (type === 'shield') {
      ctx.fillStyle = hornC; horn(ctx, -9, -10, -1, 8, harmless); horn(ctx, 9, -10, 1, 8, harmless);
      ctx.fillStyle = body;
      rr(ctx, -14, -11 + st, 28, 26, 7); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      eyes(ctx, 5, -4 + st, 2.8, harmless);
      // 前盾(鐵灰板)
      ctx.fillStyle = harmless ? '#8a8a8e' : '#9aa2b2';
      ctx.strokeStyle = '#3a3e48'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-11, 1 + st); ctx.lineTo(11, 1 + st); ctx.lineTo(10, 10 + st); ctx.quadraticCurveTo(0, 17 + st, -10, 10 + st); ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (type === 'swift') {
      // 前傾菱形身 + 後方速度線
      if (!harmless) {
        ctx.strokeStyle = rgba('#ffb0b0', 0.6); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-14, -3); ctx.lineTo(-8, -3); ctx.moveTo(-15, 3); ctx.lineTo(-9, 3); ctx.moveTo(-13, 9); ctx.lineTo(-8, 9); ctx.stroke();
        ctx.strokeStyle = lineC; ctx.lineWidth = 2;
      }
      ctx.fillStyle = hornC; horn(ctx, -2, -8, -1, 7, harmless); horn(ctx, 5, -8, -1, 7, harmless);
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.moveTo(12, 0 + st); ctx.lineTo(1, -10 + st); ctx.lineTo(-8, 2 + st); ctx.lineTo(1, 12 + st); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      eyes(ctx, 2.5, 0 + st, 2.2, harmless);
    } else {
      // 菁英: 光暈 + 金冠 + 大角
      if (!harmless) {
        var p = 0.75 + 0.25 * Math.sin(now() * 4);
        var g = ctx.createRadialGradient(0, 0, 14, 0, 0, 29);
        g.addColorStop(0, rgba(C.eliteHalo, 0.55 * p)); g.addColorStop(1, rgba(C.eliteHalo, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 29, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = hornC; horn(ctx, -12, -10, -1, 14, harmless); horn(ctx, 12, -10, 1, 14, harmless);
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(0, 3 + st, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      // 冠
      ctx.fillStyle = harmless ? '#a89a70' : C.crown;
      ctx.strokeStyle = '#5a3a08'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-9, -13 + st); ctx.lineTo(-10, -23 + st); ctx.lineTo(-4.5, -17 + st); ctx.lineTo(0, -25 + st); ctx.lineTo(4.5, -17 + st); ctx.lineTo(10, -23 + st); ctx.lineTo(9, -13 + st); ctx.closePath();
      ctx.fill(); ctx.stroke();
      eyes(ctx, 7, 1 + st, 4, harmless, '#ffe060');
      if (!harmless) {
        ctx.fillStyle = C.enemyDark;
        ctx.fillRect(-7, 10 + st, 14, 3);
      }
    }
    ctx.restore();
  }

  function drawEnemy(ctx, state) {
    var s = S(state);
    var type = pick(s.type, ['imp', 'archer', 'shield', 'swift', 'elite'], 'imp');
    var x = num(s.x, 0), y = num(s.y, 0);
    var a = unitAnim(s);
    var harmless = s.harmless === true;
    var sz = ENEMY_SIZE[type];
    ctx.save();
    ctx.translate(x, y);
    enemyBody(ctx, type, a, harmless);
    ctx.restore();
    var hp = num(s.hp, 1), mh = num(s.maxHp, 1);
    if (mh > 0 && hp < mh) hpBar(ctx, x, y - sz / 2 - 6, sz, 4, hp / mh, C.hpEnemy);
    if (s.targeted === true) targetFrame(ctx, x, y, sz, sz);
  }

  // ---------- 屍體 ----------
  var CORPSE_SIZE = { imp: 32, archer: 32, shield: 40, swift: 32, elite: 60, tower: 48, wolf: 36, statue: 52 };
  function drawCorpse(ctx, state) {
    var s = S(state);
    var kind = pick(s.kind, ['imp', 'archer', 'shield', 'swift', 'elite', 'tower', 'wolf', 'statue'], 'imp');
    var x = num(s.x, 0), y = num(s.y, 0);
    var life = num(s.life, 12), ml = num(s.maxLife, 12);
    var r = ml > 0 ? clamp(life / ml, 0, 1) : 0;
    var sz = CORPSE_SIZE[kind], h = sz / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.3 + 0.7 * r;
    // 地面污漬
    ctx.fillStyle = 'rgba(15,12,12,0.5)';
    ctx.beginPath(); ctx.ellipse(0, h * 0.35, h * 0.95, h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    if (kind === 'tower' || kind === 'statue') {
      // 碎石堆
      var col = kind === 'tower' ? '#6c707a' : '#76705f';
      var blocks = kind === 'tower'
        ? [[-16, 4, 12, 9], [-4, 6, 14, 10], [9, 2, 10, 9], [-9, -4, 11, 9], [3, -7, 9, 8]]
        : [[-20, 4, 14, 12], [-5, 6, 16, 12], [11, 2, 12, 12], [-11, -8, 14, 12], [4, -12, 12, 11]];
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        ctx.fillStyle = i % 2 ? col : mix(col, '#000000', 0.25);
        rr(ctx, b[0], b[1], b[2], b[3], 2); ctx.fill();
      }
      if (kind === 'statue') {
        ctx.fillStyle = '#3e3a30'; ctx.fillRect(-7, -4, 5, 2.5); ctx.fillRect(1, -4, 5, 2.5);
      }
    } else {
      var isEnemy = kind !== 'wolf';
      var body = isEnemy ? (kind === 'elite' ? '#5e3238' : '#6e4448') : '#6c7284';
      ctx.fillStyle = body;
      ctx.strokeStyle = 'rgba(10,8,8,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, h * 0.2, h * 0.85, h * 0.42, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (isEnemy) {
        // 倒下的角(橫向)
        ctx.fillStyle = '#8a7a72';
        ctx.beginPath(); ctx.moveTo(-h * 0.6, -h * 0.05); ctx.lineTo(-h * 0.35, -h * 0.12); ctx.lineTo(-h * 0.95, -h * 0.35); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(h * 0.6, -h * 0.05); ctx.lineTo(h * 0.35, -h * 0.12); ctx.lineTo(h * 0.95, -h * 0.35); ctx.closePath(); ctx.fill();
      }
      if (kind === 'elite') {
        ctx.fillStyle = '#9a8040';
        ctx.beginPath(); ctx.moveTo(h * 0.45, -h * 0.55); ctx.lineTo(h * 0.85, -h * 0.5); ctx.lineTo(h * 0.8, -h * 0.25); ctx.lineTo(h * 0.45, -h * 0.3); ctx.closePath(); ctx.fill();
      }
      // X 眼
      var ex = h * 0.3, ey = h * 0.12, er = Math.max(2, h * 0.13);
      ctx.strokeStyle = '#1a1416'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-ex - er, ey - er); ctx.lineTo(-ex + er, ey + er); ctx.moveTo(-ex + er, ey - er); ctx.lineTo(-ex - er, ey + er);
      ctx.moveTo(ex - er, ey - er); ctx.lineTo(ex + er, ey + er); ctx.moveTo(ex + er, ey - er); ctx.lineTo(ex - er, ey + er);
      ctx.stroke();
    }
    ctx.restore();
    if (s.targeted === true) targetFrame(ctx, x, y, sz, sz);
  }

  // ---------- 金幣 ----------
  function coinShape(ctx, x, y, r, ghost) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (ghost) {
      ctx.setLineDash([2, 2]); ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(C.coin, 0.6); ctx.stroke();
    } else {
      ctx.fillStyle = C.coin; ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.22); ctx.strokeStyle = C.coinRim; ctx.stroke();
      ctx.fillStyle = '#fff2b0';
      ctx.fillRect(x - r * 0.15, y - r * 0.5, r * 0.3, r);
    }
    ctx.restore();
  }
  function drawCoin(ctx, state) {
    var s = S(state);
    var x = num(s.x, 0), y = num(s.y, 0);
    var life = num(s.life, 15);
    ctx.save();
    if (life < 3) {
      var rate = life < 1 ? 12 : 6;
      if (Math.floor(now() * rate) % 2 === 1) ctx.globalAlpha = 0.2;
    }
    coinShape(ctx, x, y, 7, false);
    ctx.restore();
  }

  // ---------- 地上魂件 ----------
  function drawGroundPart(ctx, state) {
    var s = S(state);
    var x = num(s.x, 0), y = num(s.y, 0);
    var kind = partOrNull(s.kind);
    if (kind === 'towerShell') kind = null;
    ctx.save();
    ctx.translate(x, y);
    var p = (now() * 1.2) % 1;
    // 吸引脈動(收在 28×28 內): 告訴玩家「走過來撿」
    ctx.beginPath(); ctx.arc(0, 0, 9 + p * 4.5, 0, Math.PI * 2);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - p)) + ')'; ctx.stroke();
    // 菱形底
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(13, 0); ctx.lineTo(0, 13); ctx.lineTo(-13, 0); ctx.closePath();
    ctx.fillStyle = C.slotBg; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = kind ? C[kind] : C.slotLine; ctx.stroke();
    ctx.restore();
    if (kind) partIcon(ctx, kind, x, y, 14);
  }

  // ---------- 魂件槽列 ----------
  function drawSoulSlots(ctx, state) {
    var s = S(state);
    var x = num(s.x, 0), y = num(s.y, 0);
    var slots = Array.isArray(s.slots) ? s.slots : [];
    var n = slots.length;
    if (n <= 0) return;
    var hl = num(s.highlight, -1);
    var w = n * 20;
    ctx.save();
    // 底板(讓槽列在任何地面上都讀得到)
    rr(ctx, x - w / 2, y - 10, w, 20, 4);
    ctx.fillStyle = 'rgba(8,10,14,0.7)'; ctx.fill();
    for (var i = 0; i < n; i++) {
      var cx = x - w / 2 + 10 + i * 20;
      slotCell(ctx, cx, y, 18, slots[i], i === hl, 0.82);
    }
    ctx.restore();
  }

  // ---------- 拆魂連線 ----------
  function drawRipBeam(ctx, state) {
    var s = S(state);
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0);
    var p = clamp(num(s.progress, 0), 0, 1);
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    var nx = -dy / len, ny = dx / len;
    var t = now();
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 抖動的鎖鏈線, 越接近完成越粗越亮
    var segs = Math.max(4, Math.round(len / 12));
    var amp = 2 + p * 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (var i = 1; i < segs; i++) {
      var f = i / segs;
      var j = Math.sin(t * 40 + i * 2.3) * amp;
      ctx.lineTo(x1 + dx * f + nx * j, y1 + dy * f + ny * j);
    }
    ctx.lineTo(x2, y2);
    ctx.shadowColor = C.playerAccent;
    ctx.shadowBlur = 6 + p * 12;
    ctx.strokeStyle = rgba(C.playerAccent, 0.5 + 0.4 * p);
    ctx.lineWidth = 3 + p * 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 + p * 1.5;
    ctx.stroke();
    // 被拉向玩家的魂屑
    for (var k = 0; k < 4; k++) {
      var q = ((t * (1 + p * 2) + k / 4) % 1);
      var px = x2 - dx * q, py = y2 - dy * q;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.5 * p) + ')';
      ctx.beginPath(); ctx.arc(px, py, 1.5 + p * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // 槽位端的抓握圈(隨進度收緊)
    ctx.beginPath(); ctx.arc(x2, y2, 14 - p * 4, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(C.playerAccent, 0.5 + 0.5 * p); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  // ---------- 玩家 ----------
  function playerBody(ctx, s) {
    var hit = playing(s.hitAge, s.hitDuration);
    var flash = hit >= 0 ? 1 - hit : 0;
    var moving = s.moving === true;
    var step = moving ? Math.sin(now() * 16) : 0;
    var body = mix(C.player, '#ff3b3b', flash * 0.85);
    ctx.save();
    // 影
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 13, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, moving ? -Math.abs(step) * 1.5 : 0);
    // 腳
    ctx.fillStyle = C.playerLine;
    ctx.beginPath(); ctx.ellipse(-5 + step * 2, 11, 3.2, 2.2, 0, 0, Math.PI * 2); ctx.ellipse(5 - step * 2, 11, 3.2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    // 鎚(右手)
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(9, 6); ctx.lineTo(12, -6); ctx.stroke();
    ctx.fillStyle = C.playerAccent;
    ctx.strokeStyle = C.playerLine; ctx.lineWidth = 1.5;
    rr(ctx, 7.5, -12, 8, 6, 1.5); ctx.fill(); ctx.stroke();
    // 身體(白色圓身 + 深色粗描邊, 全畫面唯一的白色主體)
    ctx.fillStyle = body;
    ctx.strokeStyle = C.playerLine; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(-1, 1, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 青色圍巾
    ctx.fillStyle = C.playerAccent;
    ctx.beginPath(); ctx.moveTo(-10, -1); ctx.lineTo(8, -1); ctx.lineTo(8, 3); ctx.lineTo(-10, 3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(-14, 9); ctx.lineTo(-10, 9); ctx.lineTo(-6, 3); ctx.closePath(); ctx.fill();
    // 眼
    ctx.fillStyle = C.playerLine;
    ctx.beginPath(); ctx.arc(-4.5, -4, 1.6, 0, Math.PI * 2); ctx.arc(2, -4, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawPlayer(ctx, state) {
    var s = S(state);
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    ctx.translate(x, y);
    playerBody(ctx, s);
    // 進度環: 外緣半徑 24, 環寬 4, 從正上方順時針
    if (s.holding === true) {
      var p = clamp(num(s.holdProgress, 0), 0, 1);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(10,12,16,0.6)'; ctx.stroke();
      if (p > 0) {
        ctx.beginPath(); ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
        ctx.strokeStyle = C.hold;
        ctx.shadowColor = C.playerAccent; ctx.shadowBlur = 4 + 8 * p;
        ctx.stroke();
      }
    }
    ctx.restore();
    // 血條: 一直顯示
    var hp = num(s.hp, 100), mh = num(s.maxHp, 100);
    var r = mh > 0 ? hp / mh : 0;
    hpBar(ctx, x, y - 24, 40, 5, r, r < 0.3 ? C.hpEnemy : (r < 0.6 ? C.hpMid : C.hpAlly));
  }

  // ---------- 投射物 ----------
  function drawProjectile(ctx, state) {
    var s = S(state);
    var x = num(s.x, 0), y = num(s.y, 0), ang = num(s.angle, 0);
    var team = pick(s.team, ['ally', 'enemy'], 'enemy');
    ctx.save();
    ctx.translate(x, y);
    if (team === 'ally') {
      // 我方: 淡藍細箭(有方向)
      ctx.rotate(ang);
      ctx.strokeStyle = C.projAlly; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-4.5, 0); ctx.lineTo(1.5, 0); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(4.8, 0); ctx.lineTo(0.5, -2.8); ctx.lineTo(0.5, 2.8); ctx.closePath(); ctx.fill();
    } else {
      // 敵方: 橘紅火球(圓, 無方向)
      ctx.fillStyle = C.projEnemy;
      ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a1008'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ffe080';
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 擊中火花 ----------
  function drawHitSpark(ctx, state) {
    var s = S(state);
    var x = num(s.x, 0), y = num(s.y, 0);
    var dur = num(s.duration, 0.25);
    var p = dur > 0 ? clamp(num(s.age, 0) / dur, 0, 1) : 1;
    if (p >= 1) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = C.spark; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 + 0.3;
      var r0 = 3 + p * 4, r1 = 6 + p * 5.5;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, 5 * (1 - p), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- 邊緣預警 ----------
  function drawEdgeWarning(ctx, state) {
    var s = S(state);
    var edge = pick(s.edge, ['north', 'south', 'west', 'east'], 'north');
    var rem = num(s.remaining, 0);
    var R = {
      north: [0, 50, 1280, 24], south: [0, 696, 1280, 24],
      west: [0, 50, 24, 670], east: [1256, 50, 24, 670]
    }[edge];
    var t = now();
    var blink = 0.55 + 0.45 * Math.abs(Math.sin(t * (rem < 1 ? 12 : 6)));
    ctx.save();
    ctx.beginPath(); ctx.rect(R[0], R[1], R[2], R[3]); ctx.clip();
    ctx.fillStyle = 'rgba(60,4,4,' + (0.55 * blink) + ')';
    ctx.fillRect(R[0], R[1], R[2], R[3]);
    // 斜紋
    ctx.strokeStyle = rgba(C.warn, 0.55 * blink); ctx.lineWidth = 6;
    var horiz = edge === 'north' || edge === 'south';
    ctx.beginPath();
    if (horiz) {
      for (var xx = -30; xx < 1310; xx += 22) { ctx.moveTo(xx, R[1] + R[3]); ctx.lineTo(xx + 24, R[1]); }
    } else {
      for (var yy = 20; yy < 740; yy += 22) { ctx.moveTo(R[0], yy + 24); ctx.lineTo(R[0] + R[2], yy); }
    }
    ctx.stroke();
    // 指向場內的箭頭 + 倒數
    var n = Math.max(0, Math.ceil(rem));
    var marks = horiz ? [320, 640, 960] : [217, 385, 553];
    for (var i = 0; i < marks.length; i++) {
      var mx = horiz ? marks[i] : R[0] + R[2] / 2;
      var my = horiz ? R[1] + R[3] / 2 : marks[i];
      if (horiz) {
        text(ctx, String(n), mx, my, 18, '#ffffff');
        ctx.save(); ctx.translate(mx, my);
        ctx.fillStyle = 'rgba(255,220,220,' + blink + ')';
        ctx.beginPath();
        var d = edge === 'north' ? 1 : -1;
        ctx.moveTo(-26, -5 * d); ctx.lineTo(-20, 5 * d); ctx.lineTo(-14, -5 * d); ctx.closePath();
        ctx.moveTo(14, -5 * d); ctx.lineTo(20, 5 * d); ctx.lineTo(26, -5 * d); ctx.closePath();
        ctx.fill(); ctx.restore();
      } else {
        text(ctx, String(n), mx, my, 18, '#ffffff');
        ctx.save(); ctx.translate(mx, my);
        ctx.fillStyle = 'rgba(255,220,220,' + blink + ')';
        var e = edge === 'west' ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(-5 * e, -26); ctx.lineTo(5 * e, -20); ctx.lineTo(-5 * e, -14); ctx.closePath();
        ctx.moveTo(-5 * e, 14); ctx.lineTo(5 * e, 20); ctx.lineTo(-5 * e, 26); ctx.closePath();
        ctx.fill(); ctx.restore();
      }
    }
    // 內緣亮線
    ctx.fillStyle = rgba(C.warn, blink);
    if (edge === 'north') ctx.fillRect(0, 72, 1280, 2);
    else if (edge === 'south') ctx.fillRect(0, 696, 1280, 2);
    else if (edge === 'west') ctx.fillRect(22, 50, 2, 670);
    else ctx.fillRect(1256, 50, 2, 670);
    ctx.restore();
  }

  // ---------- 背包 ----------
  function bagImpl(ctx, cx, cy, items, selected) {
    items = Array.isArray(items) ? items : [];
    var sel = num(selected, 0);
    ctx.save();
    rr(ctx, cx - 100, cy - 36, 200, 72, 10);
    ctx.fillStyle = 'rgba(14,16,22,0.88)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.hudLine; ctx.stroke();
    for (var i = 0; i < 3; i++) {
      slotCell(ctx, cx - 64 + i * 64, cy, 56, items[i], i === sel, 0.68);
    }
    ctx.restore();
  }
  function drawBag(ctx, state) {
    var s = S(state);
    bagImpl(ctx, 124, 668, s.items, s.selected);
  }

  // ---------- HUD ----------
  function miniCastle(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = C.stoneLight;
    ctx.fillRect(x - 9, y - 5, 18, 12);
    ctx.fillRect(x - 9, y - 9, 4, 4); ctx.fillRect(x - 2, y - 9, 4, 4); ctx.fillRect(x + 5, y - 9, 4, 4);
    ctx.fillStyle = C.ally; ctx.fillRect(x - 2, y - 3, 4, 5);
    ctx.restore();
  }
  function drawHud(ctx, state) {
    var s = S(state);
    var gold = Math.floor(num(s.gold, 0));
    var chp = num(s.castleHp, 0), cmax = num(s.castleMaxHp, 20);
    var wave = Math.floor(num(s.wave, 0)), tw = Math.floor(num(s.totalWaves, 6));
    var next = num(s.nextWaveIn, -1), resp = num(s.respawnIn, -1);
    ctx.save();
    ctx.fillStyle = C.hudBg; ctx.fillRect(0, 0, 1280, 50);
    ctx.fillStyle = C.hudLine; ctx.fillRect(0, 48, 1280, 2);
    // 金幣
    coinShape(ctx, 30, 25, 10, false);
    text(ctx, String(gold), 48, 25, 26, C.coin, 'left');
    // 主堡生命
    miniCastle(ctx, 172, 26);
    var r = cmax > 0 ? clamp(chp / cmax, 0, 1) : 0;
    ctx.fillStyle = C.hpBack; ctx.fillRect(189, 17, 162, 16);
    ctx.fillStyle = r < 0.3 ? C.hpEnemy : (r < 0.6 ? C.hpMid : C.hpAlly);
    ctx.fillRect(190, 18, 160 * r, 14);
    text(ctx, Math.max(0, Math.ceil(chp)) + ' / ' + cmax, 362, 25, 18, C.text, 'left');
    // 波次
    text(ctx, wave <= 0 ? '準備中' : ('第 ' + wave + ' / ' + tw + ' 波'), 640, 25, 22, C.text);
    // 下一波
    if (next >= 0) {
      var n = Math.ceil(next);
      text(ctx, '下一波 ' + n + ' 秒', 1262, 25, 20, n <= 3 ? C.hpEnemy : C.textDim, 'right');
    }
    ctx.restore();
    // 倒下
    if (resp >= 0) {
      ctx.save();
      rr(ctx, 440, 318, 400, 84, 14);
      ctx.fillStyle = 'rgba(20,6,8,0.75)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.hpEnemy, 0.8); ctx.stroke();
      ctx.restore();
      text(ctx, '倒下了 ' + Math.ceil(resp), 640, 360, 48, '#ff8080');
    }
  }

  // ---------- 結算 ----------
  function drawResult(ctx, state) {
    var s = S(state);
    var win = s.win === true;
    var wave = Math.floor(num(s.wave, 0)), tw = Math.floor(num(s.totalWaves, 6));
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,12,0.72)';
    ctx.fillRect(0, 0, 1280, 720);
    rr(ctx, 390, 210, 500, 300, 18);
    ctx.fillStyle = 'rgba(20,23,30,0.95)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = win ? C.crown : C.hpEnemy; ctx.stroke();
    ctx.restore();
    text(ctx, win ? '勝利' : '主堡被攻陷', 640, 290, 60, win ? C.crown : '#ff6a6a');
    text(ctx, '第 ' + wave + ' / ' + tw + ' 波', 640, 375, 28, C.text);
    text(ctx, '按 Enter 重新開始', 640, 450, 22, C.textDim);
  }

  // ---------- 說明頁示意圖 ----------
  function keyCap(ctx, x, y, label, sz) {
    sz = sz || 30;
    ctx.save();
    rr(ctx, x - sz / 2, y - sz / 2 + 2, sz, sz, 5);
    ctx.fillStyle = '#7a7e88'; ctx.fill();
    rr(ctx, x - sz / 2, y - sz / 2, sz, sz - 2, 5);
    ctx.fillStyle = '#eceae2'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#2a2d34'; ctx.stroke();
    ctx.font = 'bold ' + Math.round(sz * 0.6) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1c22';
    ctx.fillText(label, x, y);
    ctx.restore();
  }
  function arrow(ctx, x1, y1, x2, y2, color, w, dashed, cx, cy) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([w * 2.5, w * 2]);
    ctx.beginPath(); ctx.moveTo(x1, y1);
    var ang;
    if (typeof cx === 'number') { ctx.quadraticCurveTo(cx, cy, x2, y2); ang = Math.atan2(y2 - cy, x2 - cx); }
    else { ctx.lineTo(x2, y2); ang = Math.atan2(y2 - y1, x2 - x1); }
    ctx.stroke();
    ctx.setLineDash([]);
    var hl = w * 3.2;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(ang - 0.45) * hl, y2 - Math.sin(ang - 0.45) * hl);
    ctx.lineTo(x2 - Math.cos(ang + 0.45) * hl, y2 - Math.sin(ang + 0.45) * hl);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  var IDLE = { hitAge: 1, hitDuration: 0.2, attackAge: 1, attackDuration: 0.15 };
  function U(o) { var r = {}, k; for (k in IDLE) r[k] = IDLE[k]; for (k in o) r[k] = o[k]; return r; }

  function page1(ctx) { // 800×450 守住主堡
    ctx.save();
    ctx.fillStyle = rgba(C.warn, 0.28);
    ctx.fillRect(0, 0, 800, 10); ctx.fillRect(0, 440, 800, 10); ctx.fillRect(0, 0, 10, 450); ctx.fillRect(790, 0, 10, 450);
    ctx.restore();
    castleImpl(ctx, { x: 400, y: 225, hitAge: 1, hitDuration: 0.3 }, false);
    text(ctx, '主堡', 400, 305, 22, C.text);
    var es = [
      ['imp', 330, 50], ['archer', 470, 55], ['shield', 400, 400], ['imp', 300, 398],
      ['swift', 60, 200], ['imp', 70, 290], ['elite', 730, 215], ['archer', 740, 330]
    ];
    for (var i = 0; i < es.length; i++) {
      var e = es[i];
      var dx = 400 - e[1], dy = 225 - e[2], d = Math.sqrt(dx * dx + dy * dy);
      var ux = dx / d, uy = dy / d;
      var r0 = ENEMY_SIZE[e[0]] / 2 + 8;
      arrow(ctx, e[1] + ux * r0, e[2] + uy * r0, e[1] + ux * (r0 + 60), e[2] + uy * (r0 + 60), rgba(C.warn, 0.85), 3, true);
      ctx.save(); ctx.translate(e[1], e[2]); enemyBody(ctx, e[0], unitAnim(U({ moving: true })), false); ctx.restore();
    }
  }

  function page2(ctx) { // 600×360 移動與撿錢
    drawCorpse(ctx, { kind: 'imp', x: 200, y: 170, life: 9, maxLife: 12, targeted: false });
    coinShape(ctx, 175, 140, 7, false);
    coinShape(ctx, 165, 190, 7, false);
    // 走過的路徑
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([8, 7]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(70, 300); ctx.quadraticCurveTo(200, 250, 228, 198); ctx.quadraticCurveTo(250, 160, 330, 152); ctx.lineTo(395, 150);
    ctx.stroke();
    ctx.restore();
    // 路徑上被撿走的金幣: 虛線空圈 + 閃光
    var picked = [[228, 198], [242, 170]];
    for (var i = 0; i < picked.length; i++) {
      coinShape(ctx, picked[i][0], picked[i][1], 7, true);
      ctx.save(); ctx.strokeStyle = C.coin; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (var k = 0; k < 4; k++) {
        var a = k * Math.PI / 2 + 0.78;
        ctx.beginPath(); ctx.moveTo(picked[i][0] + Math.cos(a) * 10, picked[i][1] + Math.sin(a) * 10);
        ctx.lineTo(picked[i][0] + Math.cos(a) * 14, picked[i][1] + Math.sin(a) * 14); ctx.stroke();
      }
      ctx.restore();
    }
    drawPlayer(ctx, { x: 430, y: 150, moving: true, hp: 100, maxHp: 100, hitAge: 0.2, hitDuration: 0.2, holding: false, holdProgress: 0 });
    keyCap(ctx, 430, 98, 'W', 30);
    keyCap(ctx, 378, 156, 'A', 30);
    keyCap(ctx, 430, 210, 'S', 30);
    keyCap(ctx, 482, 156, 'D', 30);
  }

  function page3(ctx) { // 780×420 搶魂件: 左 拆的當下 / 右 拆完
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(390, 20); ctx.lineTo(390, 400); ctx.stroke();
    ctx.restore();
    arrow(ctx, 372, 210, 410, 210, '#ffffff', 5, false);
    // 左
    drawEnemy(ctx, U({ type: 'imp', x: 230, y: 200, hp: 30, maxHp: 30, attackAge: 0.07, harmless: false, targeted: true }));
    drawSoulSlots(ctx, { x: 230, y: 164, slots: ['melee', 'march'], highlight: 0 });
    drawRipBeam(ctx, { x1: 180, y1: 212, x2: 220, y2: 164, progress: 0.5 });
    drawPlayer(ctx, { x: 180, y: 212, moving: false, hp: 55, maxHp: 100, hitAge: 0.06, hitDuration: 0.2, holding: true, holdProgress: 0.5 });
    drawHitSpark(ctx, { x: 192, y: 205, age: 0.08, duration: 0.25 });
    keyCap(ctx, 110, 196, 'J', 32);
    text(ctx, '按住', 110, 232, 18, C.text);
    bagImpl(ctx, 110, 352, [null, null, null], 0);
    // 右
    drawEnemy(ctx, U({ type: 'imp', x: 630, y: 200, hp: 30, maxHp: 30, moving: true, harmless: false, targeted: true }));
    drawSoulSlots(ctx, { x: 630, y: 164, slots: [null, 'march'], highlight: 1 });
    drawPlayer(ctx, { x: 580, y: 212, moving: false, hp: 55, maxHp: 100, hitAge: 0.2, hitDuration: 0.2, holding: false, holdProgress: 0 });
    bagImpl(ctx, 510, 352, ['melee', null, null], 0);
    arrow(ctx, 612, 152, 448, 312, rgba(C.melee, 0.9), 3, true, 470, 120);
  }

  function page4(ctx) { // 780×450 選格與裝上
    drawTower(ctx, U({ x: 300, y: 200, hp: 120, maxHp: 120, targeted: true }));
    drawSoulSlots(ctx, { x: 300, y: 156, slots: ['ranged', null, null], highlight: 0 });
    drawPlayer(ctx, { x: 236, y: 214, moving: false, hp: 100, maxHp: 100, hitAge: 0.2, hitDuration: 0.2, holding: false, holdProgress: 0 });
    keyCap(ctx, 232, 150, 'K', 30);
    arrow(ctx, 250, 151, 268, 154, C.select, 3, false);
    bagImpl(ctx, 150, 386, ['melee', 'towerShell', null], 0);
    keyCap(ctx, 30, 316, 'Q', 30);
    arrow(ctx, 44, 330, 62, 348, C.select, 3, false);
    // L: 背包選中格 → 箭塔第一個空格
    arrow(ctx, 92, 350, 296, 143, rgba(C.melee, 0.95), 3.5, true, 105, 60);
    keyCap(ctx, 150, 112, 'L', 30);
    // 結果
    arrow(ctx, 400, 200, 470, 200, '#ffffff', 6, false);
    drawTower(ctx, U({ x: 600, y: 200, hp: 120, maxHp: 120, targeted: true }));
    drawSoulSlots(ctx, { x: 600, y: 156, slots: ['ranged', 'melee', null], highlight: 0 });
    ctx.save();
    ctx.strokeStyle = rgba(C.melee, 0.85); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(600, 156, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    drawPlayer(ctx, { x: 536, y: 214, moving: false, hp: 100, maxHp: 100, hitAge: 0.2, hitDuration: 0.2, holding: false, holdProgress: 0 });
  }

  function page5(ctx) { // 780×420 購買與蓋塔
    castleImpl(ctx, { x: 250, y: 80, hitAge: 1, hitDuration: 0.3 }, false);
    drawShopPad(ctx, { x: 140, y: 185, index: 0, name: '塔殼', price: 10, state: 'ok', standing: true });
    drawShopPad(ctx, { x: 250, y: 215, index: 1, name: '野狼', price: 12, state: 'locked', standing: false });
    drawShopPad(ctx, { x: 360, y: 185, index: 2, name: '石像', price: 14, state: 'locked', standing: false });
    drawPlayer(ctx, { x: 140, y: 182, moving: false, hp: 100, maxHp: 100, hitAge: 0.2, hitDuration: 0.2, holding: false, holdProgress: 0 });
    keyCap(ctx, 78, 160, 'J', 30);
    bagImpl(ctx, 150, 350, ['towerShell', null, null], 0);
    arrow(ctx, 140, 242, 88, 308, rgba(C.towerShell, 0.9), 3, true);
    // 右側小圖
    ctx.save();
    rr(ctx, 470, 24, 290, 376, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    drawPlayer(ctx, { x: 560, y: 110, moving: false, hp: 100, maxHp: 100, hitAge: 0.2, hitDuration: 0.2, holding: false, holdProgress: 0 });
    slotCell(ctx, 640, 110, 56, 'towerShell', true, 0.68);
    keyCap(ctx, 715, 110, 'L', 32);
    arrow(ctx, 600, 160, 600, 220, '#ffffff', 5, false);
    drawTower(ctx, U({ x: 590, y: 310, hp: 120, maxHp: 120, targeted: false }));
    drawSoulSlots(ctx, { x: 590, y: 266, slots: [null, null, null], highlight: -1 });
    drawPlayer(ctx, { x: 655, y: 322, moving: false, hp: 100, maxHp: 100, hitAge: 0.2, hitDuration: 0.2, holding: false, holdProgress: 0 });
  }

  function page6(ctx) { // 720×405 招募中立單位
    castleImpl(ctx, { x: 560, y: 150, hitAge: 1, hitDuration: 0.3 }, false);
    drawWolf(ctx, U({ x: 130, y: 150, team: 'neutral', hp: 80, maxHp: 80, moving: true, targeted: false }));
    drawSoulSlots(ctx, { x: 130, y: 112, slots: ['melee', 'march'], highlight: -1 });
    arrow(ctx, 162, 150, 494, 150, rgba(C.march, 0.95), 4, true);
    // 進主堡 → 解鎖台 1
    arrow(ctx, 560, 214, 548, 272, 'rgba(255,255,255,0.6)', 2.5, true);
    drawShopPad(ctx, { x: 470, y: 320, index: 1, name: '野狼', price: 12, state: 'locked', standing: false });
    arrow(ctx, 508, 320, 578, 320, '#ffffff', 5, false);
    drawShopPad(ctx, { x: 625, y: 320, index: 1, name: '野狼', price: 12, state: 'ok', standing: false });
  }

  var PAGES = [
    { w: 800, h: 450, f: page1 },
    { w: 600, h: 360, f: page2 },
    { w: 780, h: 420, f: page3 },
    { w: 780, h: 450, f: page4 },
    { w: 780, h: 420, f: page5 },
    { w: 720, h: 405, f: page6 }
  ];

  function drawGuidePage(ctx, state) {
    var s = S(state);
    var page = Math.floor(num(s.page, 0));
    if (page < 0 || page >= PAGES.length) page = 0;
    var x = num(s.x, 0), y = num(s.y, 0), w = num(s.w, 520), h = num(s.h, 300);
    if (w <= 0 || h <= 0) return;
    var P = PAGES[page];
    ctx.save();
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = C.bg; ctx.fill();
    ctx.clip();
    var k = Math.min(w / P.w, h / P.h);
    ctx.translate(x + (w - P.w * k) / 2, y + (h - P.h * k) / 2);
    ctx.scale(k, k);
    P.f(ctx);
    ctx.restore();
    ctx.save();
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 10);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.stroke();
    ctx.restore();
  }

  window.Art = {
    canvas: { width: 1280, height: 720 },
    palette: C,
    drawBackground: drawBackground,
    drawShopPad: drawShopPad,
    drawCastle: drawCastle,
    drawTower: drawTower,
    drawWolf: drawWolf,
    drawStatue: drawStatue,
    drawEnemy: drawEnemy,
    drawCorpse: drawCorpse,
    drawCoin: drawCoin,
    drawGroundPart: drawGroundPart,
    drawSoulSlots: drawSoulSlots,
    drawRipBeam: drawRipBeam,
    drawPlayer: drawPlayer,
    drawProjectile: drawProjectile,
    drawHitSpark: drawHitSpark,
    drawEdgeWarning: drawEdgeWarning,
    drawBag: drawBag,
    drawHud: drawHud,
    drawResult: drawResult,
    drawGuidePage: drawGuidePage
  };
})();
