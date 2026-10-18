// 魂匠收編 — 美術(Canvas 2D 幾何繪製, 無外部資源)
// 全域物件 window.Art; 每個函式自己 save/restore。
(function () {
  'use strict';

  // ---------------- 色票 ----------------
  var palette = {
    bg: '#2f4230',          // 草地
    grassDot: '#3a5038',
    road: '#7a6548',        // 路面
    roadEdge: '#4d3f2c',
    camp: '#160d1a',        // 敵營裂口
    campGlow: '#d9434b',
    enemy: '#d9434b', enemyDark: '#6e1820', enemyLight: '#ff9a9e',
    ally: '#3f86e0', allyDark: '#173a6e', allyLight: '#a8cfff',
    neutral: '#8b8d93', neutralDark: '#45474d', neutralLight: '#c4c6cc',
    player: '#9a6bff', playerDark: '#3c2280', playerLight: '#dccbff',
    stone: '#9a978f', stoneDark: '#5b5953',
    ranged: '#f2913d',      // 遠攻: 橘箭
    melee: '#dfe6ea',       // 近戰: 銀劍
    guard: '#45c46a',       // 鐵壁: 綠盾(也是吸引範圍色)
    seek: '#3fd6e0',        // 索敵: 青眼
    march: '#e65cc8',       // 進攻主堡: 洋紅城堡
    slotStone: '#b9b2c8',   // 擴槽石: 灰紫寶石
    cellBg: '#1b1f2b',
    kitBg: '#c9a46a',       // 單位材料: 木箱
    coin: '#ffd34d', coinDark: '#a8761a',
    targeted: '#ffffff',
    hpBack: '#1a1a1a',
    ui: '#151a26', uiEdge: '#59607a', text: '#f4f4f8', textDim: '#a9adbd',
    bad: '#ff4d4d', good: '#7be08a',
    slowmo: '#7fd8ff',
    gold: '#ffcf3f'
  };

  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

  // ---------------- 工具 ----------------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function pick(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function S(s) { return s || {}; }
  var TEAMS = ['enemy', 'ally', 'neutral'];
  var DEMONS = ['imp', 'archer', 'shield', 'elite'];
  var PARTS = ['ranged', 'melee', 'guard', 'seek', 'march'];
  var ITEMS = PARTS.concat(['slotStone', 'towerKit', 'soldierKit', 'wolfKit', 'impKit', 'archerKit', 'shieldKit', 'eliteKit']);
  var UNIT_KINDS = ['soldier', 'wolf', 'imp', 'archer', 'shield', 'elite'];
  var DEMON_SIZE = { imp: 32, archer: 32, shield: 40, elite: 60 };
  var DEMON_NAME = { imp: '小鬼', archer: '弓鬼', shield: '盾鬼', elite: '魂王鬼' };
  var KIT_KIND = { towerKit: 'tower', soldierKit: 'soldier', wolfKit: 'wolf', impKit: 'imp', archerKit: 'archer', shieldKit: 'shield', eliteKit: 'elite' };
  var SHOP_ICON = ['towerKit', 'soldierKit', 'ranged', 'melee', 'slotStone', 'wolfKit', 'impKit', 'archerKit', 'shieldKit', 'eliteKit'];

  function hex2rgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    t = clamp(num(t, 0), 0, 1);
    var A = hex2rgb(a), B = hex2rgb(b);
    var r = Math.round(A[0] + (B[0] - A[0]) * t), g = Math.round(A[1] + (B[1] - A[1]) * t), bl = Math.round(A[2] + (B[2] - A[2]) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }
  function teamCol(team) {
    if (team === 'enemy') return { body: palette.enemy, dark: palette.enemyDark, light: palette.enemyLight };
    if (team === 'neutral') return { body: palette.neutral, dark: palette.neutralDark, light: palette.neutralLight };
    return { body: palette.ally, dark: palette.allyDark, light: palette.allyLight };
  }
  // 計時器: 0 ≤ age < dur 才算在播, 回傳 0~1 進度; 不在播回傳 -1
  function playT(age, dur) {
    age = num(age, -1); dur = num(dur, 0);
    if (dur <= 0 || age < 0 || age >= dur) return -1;
    return age / dur;
  }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

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
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }

  // 帶深色描邊的字(P10)
  function text(ctx, str, x, y, px, color, align, bold, outline) {
    ctx.font = (bold ? 'bold ' : '') + px + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    if (outline !== false) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, px / 5);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(String(str), x, y);
    }
    ctx.fillStyle = color || palette.text;
    ctx.fillText(String(str), x, y);
  }
  function textW(ctx, str, px, bold) {
    ctx.font = (bold ? 'bold ' : '') + px + 'px ' + FONT;
    var m = ctx.measureText ? ctx.measureText(String(str)) : null;
    var w = m && typeof m.width === 'number' ? m.width : NaN;
    return isFinite(w) ? w : String(str).length * px;
  }

  // 互動目標外框: 內緣貼齊判定框, 寬 3, 畫在框外
  function targetFrame(ctx, x, y, w, h) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = palette.targeted;
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 6;
    ctx.strokeRect(x - w / 2 - 1.5, y - h / 2 - 1.5, w + 3, h + 3);
    ctx.restore();
  }
  function hpBar(ctx, x, y, w, hp, maxHp, team) {
    maxHp = num(maxHp, 0); hp = num(hp, 0);
    if (maxHp <= 0 || hp >= maxHp) return;
    var f = clamp(hp / maxHp, 0, 1);
    ctx.save();
    ctx.fillStyle = palette.hpBack;
    ctx.fillRect(x - w / 2, y - 2, w, 4);
    ctx.fillStyle = team === 'enemy' ? '#ff5a5a' : '#6fe08a';
    ctx.fillRect(x - w / 2, y - 2, w * f, 4);
    ctx.restore();
  }
  function legPhase() { return Math.floor(now() / 140) % 2 === 0 ? 1 : -1; }

  // ---------------- 魂件 / 物品圖示(全畫面同一套) ----------------
  // 在 (cx,cy) 畫 s×s 的圖示格。style: 'cell'(深底格) | 'bare'(只畫符號)
  function glyph(ctx, item, cx, cy, s) {
    var u = s / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (item === 'ranged') {
      ctx.strokeStyle = palette.ranged; ctx.fillStyle = palette.ranged;
      ctx.lineWidth = Math.max(1.5, u * 0.18);
      ctx.beginPath(); ctx.moveTo(-u * 0.6, u * 0.6); ctx.lineTo(u * 0.45, -u * 0.45); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(u * 0.7, -u * 0.7); ctx.lineTo(u * 0.15, -u * 0.55); ctx.lineTo(u * 0.55, -u * 0.15); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-u * 0.6, u * 0.6); ctx.lineTo(-u * 0.75, u * 0.25); ctx.moveTo(-u * 0.6, u * 0.6); ctx.lineTo(-u * 0.25, u * 0.75); ctx.stroke();
    } else if (item === 'melee') {
      ctx.fillStyle = palette.melee; ctx.strokeStyle = '#7d8a92'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -u * 0.8); ctx.lineTo(u * 0.16, -u * 0.6); ctx.lineTo(u * 0.16, u * 0.3); ctx.lineTo(-u * 0.16, u * 0.3); ctx.lineTo(-u * 0.16, -u * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9a046';
      ctx.fillRect(-u * 0.5, u * 0.3, u * 1.0, u * 0.16);
      ctx.fillRect(-u * 0.1, u * 0.46, u * 0.2, u * 0.3);
    } else if (item === 'guard') {
      ctx.fillStyle = palette.guard; ctx.strokeStyle = '#1d5c30'; ctx.lineWidth = Math.max(1, u * 0.1);
      ctx.beginPath(); ctx.moveTo(-u * 0.62, -u * 0.62); ctx.lineTo(u * 0.62, -u * 0.62); ctx.lineTo(u * 0.62, 0); ctx.quadraticCurveTo(u * 0.55, u * 0.55, 0, u * 0.78); ctx.quadraticCurveTo(-u * 0.55, u * 0.55, -u * 0.62, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9f5d4'; ctx.fillRect(-u * 0.08, -u * 0.45, u * 0.16, u * 0.85); ctx.fillRect(-u * 0.38, -u * 0.18, u * 0.76, u * 0.16);
    } else if (item === 'seek') {
      ctx.fillStyle = palette.seek; ctx.strokeStyle = palette.seek; ctx.lineWidth = Math.max(1.2, u * 0.12);
      ctx.beginPath(); ctx.moveTo(-u * 0.8, 0); ctx.quadraticCurveTo(0, -u * 0.8, u * 0.8, 0); ctx.quadraticCurveTo(0, u * 0.8, -u * 0.8, 0); ctx.closePath(); ctx.stroke();
      circle(ctx, 0, 0, u * 0.28); ctx.fill();
      ctx.fillStyle = '#0b2a2e'; circle(ctx, 0, 0, u * 0.12); ctx.fill();
    } else if (item === 'march') {
      ctx.fillStyle = palette.march;
      ctx.beginPath();
      ctx.moveTo(-u * 0.7, u * 0.7); ctx.lineTo(-u * 0.7, -u * 0.35); ctx.lineTo(-u * 0.45, -u * 0.35); ctx.lineTo(-u * 0.45, -u * 0.1);
      ctx.lineTo(-u * 0.2, -u * 0.1); ctx.lineTo(-u * 0.2, -u * 0.7); ctx.lineTo(u * 0.2, -u * 0.7); ctx.lineTo(u * 0.2, -u * 0.1);
      ctx.lineTo(u * 0.45, -u * 0.1); ctx.lineTo(u * 0.45, -u * 0.35); ctx.lineTo(u * 0.7, -u * 0.35); ctx.lineTo(u * 0.7, u * 0.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a0f33';
      ctx.beginPath(); ctx.moveTo(-u * 0.18, u * 0.7); ctx.lineTo(-u * 0.18, u * 0.3); ctx.arc(0, u * 0.3, u * 0.18, Math.PI, 0); ctx.lineTo(u * 0.18, u * 0.7); ctx.closePath(); ctx.fill();
    } else if (item === 'slotStone') {
      ctx.fillStyle = palette.slotStone; ctx.strokeStyle = '#5d566c'; ctx.lineWidth = Math.max(1, u * 0.1);
      ctx.beginPath();
      for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; var px = Math.cos(a) * u * 0.78, py = Math.sin(a) * u * 0.78; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-u * 0.09, -u * 0.42, u * 0.18, u * 0.84); ctx.fillRect(-u * 0.42, -u * 0.09, u * 0.84, u * 0.18);
    } else if (KIT_KIND[item]) {
      unitMini(ctx, KIT_KIND[item], 0, 0, s * 0.9, 'ally', 1);
    }
    ctx.restore();
  }
  // 圖示格: 魂件/擴槽石 = 深底 + 彩框; 單位材料 = 木箱底
  function itemCell(ctx, item, cx, cy, s) {
    if (ITEMS.indexOf(item) < 0) return;
    ctx.save();
    var kit = !!KIT_KIND[item];
    rr(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.2);
    ctx.fillStyle = kit ? palette.kitBg : palette.cellBg; ctx.fill();
    ctx.lineWidth = Math.max(1, s / 14);
    ctx.strokeStyle = kit ? '#6e5228' : (palette[item] || palette.uiEdge);
    rr(ctx, cx - s / 2 + ctx.lineWidth / 2, cy - s / 2 + ctx.lineWidth / 2, s - ctx.lineWidth, s - ctx.lineWidth, s * 0.2);
    ctx.stroke();
    glyph(ctx, item, cx, cy, s * (kit ? 0.86 : 0.8));
    ctx.restore();
  }
  function emptyCell(ctx, cx, cy, s) {
    ctx.save();
    rr(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.2);
    ctx.fillStyle = 'rgba(10,12,18,0.45)'; ctx.fill();
    ctx.setLineDash([Math.max(2, s / 8), Math.max(2, s / 10)]);
    ctx.lineWidth = Math.max(1, s / 16);
    ctx.strokeStyle = 'rgba(200,205,220,0.55)';
    rr(ctx, cx - s / 2 + 1, cy - s / 2 + 1, s - 2, s - 2, s * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  // ---------------- 單位本體(原尺寸, 以 0,0 為中心) ----------------
  // o: { team, facing, hit(0~1), harmless, moving, corpse, ghost }
  function eyes(ctx, team, o, ex, ey, r) {
    // ex: 兩眼中心相對偏移(已含 facing)
    ctx.save();
    if (o.corpse) {
      ctx.strokeStyle = '#2a1416'; ctx.lineWidth = Math.max(1.2, r * 0.5);
      [-1, 1].forEach(function (k) {
        var x = ex + k * r * 1.6, y = ey;
        ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - r * 0.7); ctx.lineTo(x + r * 0.7, y + r * 0.7); ctx.moveTo(x + r * 0.7, y - r * 0.7); ctx.lineTo(x - r * 0.7, y + r * 0.7); ctx.stroke();
      });
    } else if (team === 'neutral') {
      ctx.fillStyle = '#26272b';
      [-1, 1].forEach(function (k) { circle(ctx, ex + k * r * 1.6, ey, r * 0.85); ctx.fill(); });
    } else if (team === 'enemy') {
      ctx.fillStyle = o.harmless ? '#ffe9a8' : '#ffe14d';
      [-1, 1].forEach(function (k) {
        var x = ex + k * r * 1.6;
        ctx.beginPath();
        if (o.harmless) { ctx.ellipse(x, ey + r * 0.2, r * 0.8, r * 0.35, 0, 0, Math.PI * 2); }
        else { ctx.moveTo(x - r, ey - r * 0.55 * -k); ctx.lineTo(x + r, ey + r * 0.55 * -k); ctx.lineTo(x, ey + r * 0.7); ctx.closePath(); }
        ctx.fill();
      });
    } else {
      [-1, 1].forEach(function (k) {
        var x = ex + k * r * 1.6;
        ctx.fillStyle = '#ffffff'; circle(ctx, x, ey, r); ctx.fill();
        ctx.fillStyle = '#10264a'; circle(ctx, x + (o.facing || 1) * r * 0.3, ey, r * 0.5); ctx.fill();
      });
    }
    ctx.restore();
  }
  function bodyFill(base, o) {
    var c = base;
    if (o.corpse) c = mix(c, '#555055', 0.55);
    if (o.hit > 0) c = mix(c, '#ffffff', o.hit * 0.75);
    return c;
  }
  function outline(ctx, col, o, lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = col;
    if (o.team === 'neutral' && !o.corpse) ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 我方記號: 頭帶(白藍), 只畫在我方
  function allyBand(ctx, w, y, o) {
    if (o.team !== 'ally' || o.corpse) return;
    ctx.save();
    ctx.fillStyle = '#e8f2ff';
    ctx.fillRect(-w / 2, y, w, Math.max(2, w * 0.14));
    ctx.fillStyle = palette.ally;
    ctx.fillRect(-(o.facing || -1) * w / 2 - 1, y, 2, Math.max(2, w * 0.14) + 3);
    ctx.restore();
  }

  function bodyDemon(ctx, type, o) {
    var size = DEMON_SIZE[type], u = size / 2;
    var tc = teamCol(o.team);
    var f = o.facing || 1;
    var fill = bodyFill(tc.body, o), dark = o.corpse ? '#2b2224' : tc.dark;
    var squash = (o.harmless && !o.corpse) ? 0.9 : 1;
    ctx.save();
    if (squash !== 1) { ctx.translate(0, u * (1 - squash)); ctx.scale(1, squash); }
    if (type === 'elite' && !o.corpse) {
      // 珍貴光暈(框內)
      var g = ctx.createRadialGradient ? ctx.createRadialGradient(0, 0, u * 0.5, 0, 0, u) : null;
      if (g) { g.addColorStop(0, 'rgba(255,207,63,0.0)'); g.addColorStop(0.75, o.team === 'neutral' ? 'rgba(200,200,200,0.15)' : 'rgba(255,207,63,0.35)'); g.addColorStop(1, 'rgba(255,207,63,0)'); ctx.fillStyle = g; circle(ctx, 0, 0, u); ctx.fill(); }
      ctx.strokeStyle = o.team === 'neutral' ? 'rgba(200,200,200,0.4)' : 'rgba(255,207,63,0.85)';
      ctx.lineWidth = 2; circle(ctx, 0, 0, u - 1.5); ctx.stroke();
    }
    var R = type === 'elite' ? u * 0.62 : (type === 'shield' ? u * 0.7 : u * 0.72);
    var by = type === 'elite' ? u * 0.08 : u * 0.18;
    // 角 / 兜帽
    ctx.fillStyle = mix(fill, '#000000', 0.25);
    if (type === 'archer') {
      ctx.beginPath(); ctx.moveTo(-R * 0.85, by - R * 0.3); ctx.lineTo(f * R * -0.2, -u * 0.98); ctx.lineTo(R * 0.85, by - R * 0.3); ctx.closePath(); ctx.fill();
    } else if (type !== 'elite') {
      var hl = (o.harmless || o.team === 'neutral') ? 0.55 : 1;
      [-1, 1].forEach(function (k) {
        ctx.beginPath(); ctx.moveTo(k * R * 0.35, by - R * 0.7); ctx.lineTo(k * R * 0.8, by - R * 0.55); ctx.lineTo(k * R * 0.75, by - R * 0.7 - (u * 0.95 + by - R * 0.7) * hl * 0.98); ctx.closePath(); ctx.fill();
      });
    }
    // 身體
    if (type === 'shield') { rr(ctx, -R, by - R, R * 2, R * 2, R * 0.45); }
    else { circle(ctx, 0, by, R); }
    ctx.fillStyle = fill; ctx.fill();
    outline(ctx, dark, o, Math.max(1.5, u * 0.1));
    allyBand(ctx, R * 1.6, by - R * 0.62, o);
    // 皇冠
    if (type === 'elite') {
      ctx.fillStyle = o.corpse ? '#7a6a3a' : (o.team === 'neutral' ? '#a9a48c' : palette.gold);
      ctx.strokeStyle = '#6b4f0a'; ctx.lineWidth = 1.2;
      var cw = R * 1.1, cy0 = by - R * 0.78;
      ctx.beginPath(); ctx.moveTo(-cw / 2, cy0); ctx.lineTo(-cw / 2, cy0 - u * 0.24); ctx.lineTo(-cw / 4, cy0 - u * 0.12); ctx.lineTo(0, cy0 - u * 0.3); ctx.lineTo(cw / 4, cy0 - u * 0.12); ctx.lineTo(cw / 2, cy0 - u * 0.24); ctx.lineTo(cw / 2, cy0); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    eyes(ctx, o.team, o, f * R * 0.18, by - R * 0.05, Math.max(1.6, R * 0.17));
    // 武器(無害 / 中立 / 屍體不畫)
    if (!o.harmless && !o.corpse && o.team !== 'neutral') {
      var wc = '#5a3a1e';
      if (type === 'imp') {
        ctx.strokeStyle = wc; ctx.lineWidth = u * 0.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(f * u * 0.72, u * 0.62); ctx.lineTo(f * u * 0.78, -u * 0.35); ctx.stroke();
        ctx.fillStyle = '#3b2412'; circle(ctx, f * u * 0.78, -u * 0.42, u * 0.18); ctx.fill();
      } else if (type === 'archer') {
        ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = u * 0.13;
        ctx.beginPath(); ctx.arc(f * u * 0.5, by, u * 0.42, -Math.PI / 2 * 0.95, Math.PI / 2 * 0.95, f < 0); ctx.stroke();
        ctx.strokeStyle = '#eeeeee'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(f * u * 0.5, by - u * 0.42); ctx.lineTo(f * u * 0.5, by + u * 0.42); ctx.stroke();
      } else if (type === 'shield') {
        ctx.strokeStyle = palette.melee; ctx.lineWidth = u * 0.12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-f * u * 0.6, u * 0.2); ctx.lineTo(-f * u * 0.85, -u * 0.8); ctx.stroke();
      } else if (type === 'elite') {
        ctx.strokeStyle = palette.melee; ctx.lineWidth = u * 0.09; ctx.lineCap = 'round';
        [-1, 1].forEach(function (k) { ctx.beginPath(); ctx.moveTo(k * u * 0.62, u * 0.35); ctx.lineTo(k * u * 0.82, -u * 0.5); ctx.stroke(); });
      }
    }
    // 盾鬼的盾(種類辨識, 恆在)
    if (type === 'shield') {
      ctx.fillStyle = o.corpse ? '#6a6466' : (o.team === 'neutral' ? '#77797e' : mix('#9aa3ad', '#ffffff', o.hit * 0.6));
      ctx.strokeStyle = '#3a3f46'; ctx.lineWidth = 1.5;
      rr(ctx, f > 0 ? u * 0.38 : -u * 0.92, -u * 0.35, u * 0.54, u * 1.2, u * 0.15); ctx.fill(); ctx.stroke();
    }
    // 無害: 洩氣的嘴
    if ((o.harmless || o.team === 'neutral') && !o.corpse) {
      ctx.strokeStyle = 'rgba(30,20,20,0.8)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(f * R * 0.18 - R * 0.25, by + R * 0.42); ctx.quadraticCurveTo(f * R * 0.18, by + R * 0.28, f * R * 0.18 + R * 0.25, by + R * 0.42); ctx.stroke();
    }
    // 腳
    if (o.moving && !o.corpse) {
      var lp = legPhase();
      ctx.fillStyle = dark;
      ctx.fillRect(-R * 0.5 - 2, u - 4 - (lp > 0 ? 2 : 0), 4, 4);
      ctx.fillRect(R * 0.5 - 2, u - 4 - (lp < 0 ? 2 : 0), 4, 4);
    }
    ctx.restore();
  }

  function bodyWolf(ctx, o) {
    var u = 18, f = o.facing || 1;
    var tc = teamCol(o.team);
    var fill = bodyFill(tc.body, o), dark = tc.dark;
    ctx.save();
    // 尾
    ctx.strokeStyle = fill; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-f * u * 0.55, u * 0.05); ctx.quadraticCurveTo(-f * u * 0.9, -u * 0.1, -f * u * 0.85, -u * 0.45); ctx.stroke();
    // 腿
    var lp = o.moving ? legPhase() : 0;
    ctx.strokeStyle = dark; ctx.lineWidth = 3;
    [-0.45, -0.15, 0.2, 0.5].forEach(function (k, i) {
      var lift = (i % 2 === 0 ? lp : -lp) > 0 ? 3 : 0;
      ctx.beginPath(); ctx.moveTo(f * k * u, u * 0.3); ctx.lineTo(f * k * u, u * 0.88 - lift); ctx.stroke();
    });
    // 身
    ctx.beginPath(); ctx.ellipse(0, u * 0.12, u * 0.66, u * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill(); outline(ctx, dark, o, 1.5);
    // 頭
    var hx = f * u * 0.5, hy = -u * 0.22;
    ctx.fillStyle = mix(fill, '#000000', 0.15);
    [-1, 1].forEach(function (k) { ctx.beginPath(); ctx.moveTo(hx + k * u * 0.22 - u * 0.1, hy - u * 0.2); ctx.lineTo(hx + k * u * 0.22, hy - u * 0.62); ctx.lineTo(hx + k * u * 0.22 + u * 0.1, hy - u * 0.2); ctx.closePath(); ctx.fill(); });
    circle(ctx, hx, hy, u * 0.32); ctx.fillStyle = fill; ctx.fill(); outline(ctx, dark, o, 1.5);
    ctx.beginPath(); ctx.ellipse(hx + f * u * 0.3, hy + u * 0.08, u * 0.18, u * 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = mix(fill, '#ffffff', 0.3); ctx.fill();
    if (o.team === 'neutral') { ctx.fillStyle = '#26272b'; circle(ctx, hx + f * u * 0.08, hy - u * 0.06, 2); ctx.fill(); }
    else { ctx.fillStyle = '#ffffff'; circle(ctx, hx + f * u * 0.08, hy - u * 0.06, 2.4); ctx.fill(); ctx.fillStyle = '#10264a'; circle(ctx, hx + f * u * 0.12, hy - u * 0.06, 1.2); ctx.fill(); }
    // 我方: 項圈
    if (o.team === 'ally') { ctx.fillStyle = '#e8f2ff'; ctx.fillRect(hx - f * u * 0.32 - 1.5, hy + u * 0.05, 3, u * 0.32); }
    ctx.restore();
  }

  function bodySoldier(ctx, o) {
    var u = 16, f = o.facing || -1;
    var fill = bodyFill(palette.ally, o);
    ctx.save();
    // 槍
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * u * 0.75, u * 0.85); ctx.lineTo(f * u * 0.75, -u * 0.6); ctx.stroke();
    ctx.fillStyle = palette.melee;
    ctx.beginPath(); ctx.moveTo(f * u * 0.75, -u * 0.98); ctx.lineTo(f * u * 0.75 - 3, -u * 0.58); ctx.lineTo(f * u * 0.75 + 3, -u * 0.58); ctx.closePath(); ctx.fill();
    // 身
    rr(ctx, -u * 0.55, -u * 0.05, u * 1.1, u * 0.85, 4);
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = palette.allyDark; ctx.stroke();
    // 頭盔
    circle(ctx, 0, -u * 0.35, u * 0.45); ctx.fillStyle = mix(fill, '#ffffff', 0.15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8f2ff'; ctx.fillRect(-u * 0.45, -u * 0.38, u * 0.9, 3);
    ctx.fillStyle = '#10264a'; circle(ctx, f * u * 0.18, -u * 0.25, 1.6); ctx.fill();
    // 腳
    var lp = o.moving ? legPhase() : 0;
    ctx.fillStyle = palette.allyDark;
    ctx.fillRect(-u * 0.4, u * 0.8 - (lp > 0 ? 2 : 0), 4, 3);
    ctx.fillRect(u * 0.15, u * 0.8 - (lp < 0 ? 2 : 0), 4, 3);
    ctx.restore();
  }

  function bodyTower(ctx, o) {
    var u = 24;
    var fill = bodyFill(palette.stone, o);
    ctx.save();
    // 基座
    rr(ctx, -u * 0.8, -u * 0.45, u * 1.6, u * 1.25, 4);
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = palette.stoneDark; ctx.stroke();
    // 城垛
    ctx.fillStyle = fill;
    for (var i = 0; i < 4; i++) { ctx.fillRect(-u * 0.8 + i * u * 0.43, -u * 0.72, u * 0.3, u * 0.3); ctx.strokeRect(-u * 0.8 + i * u * 0.43, -u * 0.72, u * 0.3, u * 0.3); }
    // 我方藍旗帶
    ctx.fillStyle = bodyFill(palette.ally, o);
    ctx.fillRect(-u * 0.8, -u * 0.32, u * 1.6, u * 0.28);
    ctx.fillStyle = '#e8f2ff'; ctx.fillRect(-u * 0.8, -u * 0.06, u * 1.6, 2);
    // 箭孔
    ctx.fillStyle = '#20232a';
    ctx.fillRect(-2, u * 0.08, 4, u * 0.4); ctx.fillRect(-u * 0.18, u * 0.2, u * 0.36, 3);
    if (o.moving) {
      var lp = legPhase();
      ctx.fillStyle = palette.stoneDark;
      ctx.fillRect(-u * 0.6, u * 0.8 - (lp > 0 ? 2 : 0), 7, 4); ctx.fillRect(u * 0.6 - 7, u * 0.8 - (lp < 0 ? 2 : 0), 7, 4);
    }
    ctx.restore();
  }

  // 單位小頭像(材料、重生列、商店、預覽): 縮放原尺寸本體
  function unitMini(ctx, kind, cx, cy, s, team, alpha) {
    var native = kind === 'tower' ? 48 : (kind === 'soldier' ? 32 : (kind === 'wolf' ? 36 : DEMON_SIZE[kind] || 32));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s / native, s / native);
    if (alpha != null) ctx.globalAlpha *= alpha;
    var o = { team: team || 'ally', facing: -1, hit: 0 };
    if (kind === 'tower') bodyTower(ctx, o);
    else if (kind === 'soldier') bodySoldier(ctx, o);
    else if (kind === 'wolf') bodyWolf(ctx, o);
    else bodyDemon(ctx, pick(kind, DEMONS, 'imp'), o);
    ctx.restore();
  }
  function silhouette(ctx, kind, cx, cy, s) {
    // 灰色剪影: 先畫一份再用 source-atop 塗灰
    ctx.save();
    unitMini(ctx, kind, cx, cy, s, 'neutral', 0.35);
    ctx.restore();
  }

  // ---------------- 公開繪製函式 ----------------
  var LANES = {
    top: [[0, 170], [1040, 170], [1124, 385]],
    mid: [[0, 385], [1124, 385]],
    bottom: [[0, 600], [1040, 600], [1124, 385]]
  };
  var grassDots = (function () {
    var arr = [], seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 260; i++) arr.push([rnd() * 1280, 50 + rnd() * 670, 1 + rnd() * 2]);
    return arr;
  })();

  function drawBackground(ctx) {
    ctx.save();
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = palette.grassDot;
    for (var i = 0; i < grassDots.length; i++) { var d = grassDots[i]; ctx.fillRect(d[0], d[1], d[2], d[2] * 2); }
    // 路線
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    ['top', 'mid', 'bottom'].forEach(function (k) {
      var p = LANES[k];
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (var j = 1; j < p.length; j++) ctx.lineTo(p[j][0], p[j][1]);
      ctx.strokeStyle = palette.roadEdge; ctx.lineWidth = 56; ctx.stroke();
      ctx.strokeStyle = palette.road; ctx.lineWidth = 48; ctx.stroke();
    });
    // 路中淡虛線(推進方向感)
    ctx.setLineDash([10, 14]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,240,210,0.12)';
    ['top', 'mid', 'bottom'].forEach(function (k) {
      var p = LANES[k];
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (var j = 1; j < p.length; j++) ctx.lineTo(p[j][0], p[j][1]);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    // 敵營裂口 x 0~40
    var g = ctx.createLinearGradient ? ctx.createLinearGradient(0, 0, 44, 0) : null;
    if (g) { g.addColorStop(0, '#0a050d'); g.addColorStop(0.7, 'rgba(22,13,26,0.85)'); g.addColorStop(1, 'rgba(22,13,26,0)'); ctx.fillStyle = g; }
    else ctx.fillStyle = palette.camp;
    ctx.fillRect(0, 50, 44, 670);
    [170, 385, 600].forEach(function (y) {
      ctx.fillStyle = 'rgba(217,67,75,0.35)';
      ctx.beginPath(); ctx.ellipse(10, y, 12, 30, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a050d';
      ctx.beginPath(); ctx.moveTo(0, y - 30); ctx.lineTo(14, y - 18); ctx.lineTo(6, y - 6); ctx.lineTo(16, y + 8); ctx.lineTo(4, y + 20); ctx.lineTo(0, y + 30); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  function drawBuildPad(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    var st = pick(s.state, ['empty', 'occupied', 'rebuilding'], 'empty');
    ctx.save();
    rr(ctx, x - 32, y - 32, 64, 64, 8);
    ctx.fillStyle = '#5e5a52'; ctx.fill();
    rr(ctx, x - 28, y - 28, 56, 56, 6);
    ctx.fillStyle = '#77736a'; ctx.fill();
    ctx.fillStyle = '#4d4a44';
    [[-22, -22], [22, -22], [-22, 22], [22, 22]].forEach(function (c) { circle(ctx, x + c[0], y + c[1], 2.5); ctx.fill(); });
    if (st === 'empty') {
      ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(230,225,210,0.35)';
      rr(ctx, x - 20, y - 20, 40, 40, 4); ctx.stroke(); ctx.setLineDash([]);
    }
    if (st === 'rebuilding') {
      var tot = num(s.rebuildTotal, 8), rem = clamp(num(s.rebuildRemaining, 0), 0, tot > 0 ? tot : 8);
      var f = tot > 0 ? 1 - rem / tot : 1;
      ctx.save(); ctx.globalAlpha = 0.35; bodyTowerAt(ctx, x, y, 0.8); ctx.restore();
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; circle(ctx, x, y, 18); ctx.stroke();
      ctx.strokeStyle = palette.allyLight; ctx.beginPath(); ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
      text(ctx, Math.ceil(rem), x, y, 13, palette.text, 'center', true);
    }
    if (s.highlight === true && st === 'empty') {
      var pulse = 0.6 + 0.4 * Math.sin(now() / 160);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(168,207,255,' + (0.6 + 0.4 * pulse) + ')';
      rr(ctx, x - 30, y - 30, 60, 60, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(168,207,255,' + (0.18 + 0.12 * pulse) + ')';
      rr(ctx, x - 28, y - 28, 56, 56, 6); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 3, y - 13, 6, 26); ctx.fillRect(x - 13, y - 3, 26, 6);
    }
    ctx.restore();
  }
  function bodyTowerAt(ctx, x, y, sc) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); bodyTower(ctx, { team: 'ally', hit: 0 }); ctx.restore(); }

  function hitAmt(s) { var t = playT(s.hitAge, s.hitDuration); return t < 0 ? 0 : 1 - t; }
  function lunge(s, facing) { var t = playT(s.attackAge, s.attackDuration); return t < 0 ? 0 : Math.sin(Math.PI * t) * 3 * (facing || 1); }

  function drawCastle(ctx, state) {
    var s = S(state), x = num(s.x, 1180), y = num(s.y, 385);
    var hit = hitAmt(s);
    var at = playT(s.attackAge, s.attackDuration);
    ctx.save();
    // 主堡區(畫在本體下)
    circle(ctx, x, y, 120);
    ctx.fillStyle = s.zoneActive === true ? 'rgba(168,207,255,0.16)' : 'rgba(168,207,255,0.05)'; ctx.fill();
    ctx.setLineDash(s.zoneActive === true ? [] : [8, 8]);
    ctx.lineWidth = s.zoneActive === true ? 3 : 2;
    ctx.strokeStyle = s.zoneActive === true ? 'rgba(168,207,255,0.85)' : 'rgba(168,207,255,0.3)';
    circle(ctx, x, y, 120 - ctx.lineWidth / 2); ctx.stroke(); ctx.setLineDash([]);
    var dy = at < 0 ? 0 : -Math.sin(Math.PI * at) * 3;
    ctx.translate(x, y + dy);
    var stone = mix('#a7a398', '#ff5a5a', hit * 0.8);
    var roof = mix(palette.ally, '#ff5a5a', hit * 0.8);
    // 城牆
    rr(ctx, -50, -20, 100, 72, 6); ctx.fillStyle = stone; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = palette.stoneDark; ctx.stroke();
    // 兩側塔
    [-38, 38].forEach(function (tx) {
      rr(ctx, tx - 14, -38, 28, 70, 4); ctx.fillStyle = stone; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx - 17, -38); ctx.lineTo(tx, -54); ctx.lineTo(tx + 17, -38); ctx.closePath(); ctx.fillStyle = roof; ctx.fill(); ctx.stroke();
    });
    // 主塔
    rr(ctx, -18, -34, 36, 56, 4); ctx.fillStyle = mix(stone, '#ffffff', 0.08); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-22, -34); ctx.lineTo(0, -55); ctx.lineTo(22, -34); ctx.closePath(); ctx.fillStyle = roof; ctx.fill(); ctx.stroke();
    // 城門
    ctx.fillStyle = '#2a2420';
    ctx.beginPath(); ctx.moveTo(-12, 52); ctx.lineTo(-12, 30); ctx.arc(0, 30, 12, Math.PI, 0); ctx.lineTo(12, 52); ctx.closePath(); ctx.fill();
    // 我方旗帶
    ctx.fillStyle = '#e8f2ff'; ctx.fillRect(-50, 0, 100, 3);
    ctx.restore();
    if (s.targeted === true) targetFrame(ctx, x, y, 112, 112);
  }

  function drawTower(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    ctx.translate(x, y - Math.abs(lunge(s, 1)));
    bodyTower(ctx, { team: 'ally', hit: hitAmt(s), moving: s.moving === true });
    ctx.restore();
    ctx.save();
    hpBar(ctx, x, y - 24 - 6, 48, s.hp, s.maxHp, 'ally');
    if (s.targeted === true) targetFrame(ctx, x, y, 48, 48);
    ctx.restore();
  }

  function drawSoldier(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), f = s.facing === 1 ? 1 : -1;
    ctx.save();
    ctx.translate(x + lunge(s, f), y);
    bodySoldier(ctx, { team: 'ally', facing: f, hit: hitAmt(s), moving: s.moving === true });
    ctx.restore();
    ctx.save();
    hpBar(ctx, x, y - 16 - 6, 32, s.hp, s.maxHp, 'ally');
    if (s.targeted === true) targetFrame(ctx, x, y, 32, 32);
    ctx.restore();
  }

  function drawWolf(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), f = s.facing === -1 ? -1 : 1;
    var team = s.team === 'ally' ? 'ally' : 'neutral';
    ctx.save();
    ctx.translate(x + lunge(s, f), y);
    if (team === 'neutral') ctx.globalAlpha *= 0.88;
    bodyWolf(ctx, { team: team, facing: f, hit: hitAmt(s), moving: s.moving === true });
    ctx.restore();
    ctx.save();
    if (team !== 'neutral') hpBar(ctx, x, y - 18 - 6, 36, s.hp, s.maxHp, 'ally');
    if (s.targeted === true) targetFrame(ctx, x, y, 36, 36);
    ctx.restore();
  }

  function drawDemon(ctx, state) {
    var s = S(state), type = pick(s.type, DEMONS, 'imp'), team = pick(s.team, TEAMS, 'enemy');
    var x = num(s.x, 0), y = num(s.y, 0), f = s.facing === -1 ? -1 : 1, sz = DEMON_SIZE[type];
    var harmless = team === 'neutral' ? true : s.harmless === true;
    ctx.save();
    ctx.translate(x + (harmless ? 0 : lunge(s, f)), y);
    if (team === 'neutral') ctx.globalAlpha *= 0.85;
    bodyDemon(ctx, type, { team: team, facing: f, hit: hitAmt(s), harmless: harmless, moving: s.moving === true });
    ctx.restore();
    ctx.save();
    if (team !== 'neutral') hpBar(ctx, x, y - sz / 2 - 6, sz, s.hp, s.maxHp, team);
    if (s.targeted === true) targetFrame(ctx, x, y, sz, sz);
    ctx.restore();
  }

  function drawCorpse(ctx, state) {
    var s = S(state), kind = pick(s.kind, DEMONS, 'imp'), sz = DEMON_SIZE[kind];
    var x = num(s.x, 0), y = num(s.y, 0);
    var maxLife = num(s.maxLife, 15), life = clamp(num(s.life, maxLife), 0, maxLife > 0 ? maxLife : 15);
    ctx.save();
    if (life < 3) { var on = Math.floor(life * 6) % 2 === 0; ctx.globalAlpha *= on ? 1 : 0.3; }
    // 地上暗漬
    ctx.fillStyle = 'rgba(60,10,14,0.45)';
    ctx.beginPath(); ctx.ellipse(x, y + sz * 0.18, sz * 0.48, sz * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    // 倒地: 旋轉 90°(仰躺)
    ctx.save();
    ctx.translate(x, y + sz * 0.05);
    ctx.rotate(Math.PI / 2);
    ctx.scale(0.88, 0.88);
    bodyDemon(ctx, kind, { team: 'enemy', facing: 1, hit: 0, corpse: true, harmless: true });
    ctx.restore();
    // 剩餘時間細條(框內底部)
    if (maxLife > 0) {
      var f = life / maxLife;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - sz * 0.4, y + sz / 2 - 4, sz * 0.8, 3);
      ctx.fillStyle = life < 3 ? palette.bad : '#d9d2c4'; ctx.fillRect(x - sz * 0.4, y + sz / 2 - 4, sz * 0.8 * f, 3);
    }
    ctx.restore();
    if (s.targeted === true) targetFrame(ctx, x, y, sz, sz);
  }

  function drawGroundPart(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    var item = pick(s.item, PARTS.concat(['slotStone']), null);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y + 10, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (item) {
      var bob = Math.sin(now() / 300) * 1.5;
      itemCell(ctx, item, x, y - 1 + bob, 24);
    }
    ctx.restore();
    if (s.targeted === true) targetFrame(ctx, x, y, 28, 28);
  }

  function drawCoin(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    circle(ctx, x, y, 7.5); ctx.fillStyle = palette.coin; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = palette.coinDark; ctx.stroke();
    ctx.fillStyle = '#fff3b0'; ctx.fillRect(x - 1, y - 4, 2, 8);
    ctx.restore();
  }

  function drawPlayer(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    var moving = s.moving === true;
    ctx.save();
    ctx.translate(x, y);
    // 影
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 13, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
    // 袍(梯形)
    var bob = moving ? (legPhase() > 0 ? -1 : 0) : 0;
    ctx.translate(0, bob);
    ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(8, -4); ctx.lineTo(13, 14); ctx.lineTo(-13, 14); ctx.closePath();
    ctx.fillStyle = palette.player; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = palette.playerDark; ctx.stroke();
    // 兜帽
    circle(ctx, 0, -7, 8.5); ctx.fillStyle = mix(palette.player, '#000000', 0.15); ctx.fill(); ctx.stroke();
    // 白面
    circle(ctx, 0, -6, 5); ctx.fillStyle = '#f2ecff'; ctx.fill();
    ctx.fillStyle = palette.playerDark; ctx.fillRect(-3, -7, 2, 2); ctx.fillRect(1, -7, 2, 2);
    // 胸口魂晶(菱形, 玩家專屬)
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, 5); ctx.lineTo(0, 10); ctx.lineTo(-4, 5); ctx.closePath();
    ctx.fillStyle = palette.playerLight; ctx.fill();
    ctx.restore();
    // 搶奪圓環: 外緣半徑 24, 寬 4, 從正上方順時針
    if (s.stealing === true) {
      var p = clamp(num(s.stealProgress, 0), 0, 1);
      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(20,10,40,0.6)'; circle(ctx, x, y, 22); ctx.stroke();
      ctx.strokeStyle = palette.playerLight;
      ctx.shadowColor = palette.player; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
      ctx.restore();
    }
    // 手上物品: 頭上 (x, y-34), 24×24
    var hand = pick(s.handItem, ITEMS, null);
    if (hand) {
      ctx.save();
      itemCell(ctx, hand, x, y - 34, 24);
      ctx.restore();
    }
  }

  function drawPlacePreview(ctx, state) {
    var s = S(state), kind = pick(s.kind, UNIT_KINDS, 'soldier');
    var x = num(s.x, 0), y = num(s.y, 0);
    var sz = kind === 'wolf' ? 36 : (kind === 'soldier' ? 32 : DEMON_SIZE[kind]);
    ctx.save();
    if (s.valid === true) {
      unitMini(ctx, kind, x, y, sz * 0.92, 'ally', 0.45);
      ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(168,207,255,0.9)';
      ctx.strokeRect(x - sz / 2 + 1, y - sz / 2 + 1, sz - 2, sz - 2); ctx.setLineDash([]);
      // 朝左小箭頭(框內)
      var ay = y + sz / 2 - 6;
      ctx.fillStyle = '#e8f2ff';
      ctx.beginPath(); ctx.moveTo(x - sz / 2 + 3, ay); ctx.lineTo(x - sz / 2 + 10, ay - 4); ctx.lineTo(x - sz / 2 + 10, ay + 4); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - sz / 2 + 10, ay - 1.5, 10, 3);
    } else {
      ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = palette.bad;
      var r = sz * 0.32;
      ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
    }
    ctx.restore();
  }

  function drawSoulSlots(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    var slots = Array.isArray(s.slots) ? s.slots.slice(0, 4) : [];
    var n = slots.length;
    if (!n) return;
    ctx.save();
    var x0 = x - n * 10 + 10;
    for (var i = 0; i < n; i++) {
      var it = pick(slots[i], PARTS, null);
      if (it) itemCell(ctx, it, x0 + i * 20, y, 18); else emptyCell(ctx, x0 + i * 20, y, 18);
    }
    ctx.restore();
  }

  function drawGuardAura(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), r = clamp(num(s.radius, 100), 0, 140);
    ctx.save();
    circle(ctx, x, y, r); ctx.fillStyle = 'rgba(69,196,106,0.09)'; ctx.fill();
    ctx.setLineDash([10, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(69,196,106,0.55)';
    circle(ctx, x, y, r - 1); ctx.stroke();
    if (r >= 140) { ctx.setLineDash([]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(69,196,106,0.35)'; circle(ctx, x, y, r - 6); ctx.stroke(); }
    ctx.restore();
  }

  function drawProjectile(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), a = num(s.angle, 0);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    if (s.team === 'enemy') {
      ctx.fillStyle = palette.enemy; ctx.strokeStyle = '#ffd0d0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(0, -3.5); ctx.lineTo(-4.5, 0); ctx.lineTo(0, 3.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = palette.allyLight;
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(1, -2.5); ctx.lineTo(-4.5, -1.2); ctx.lineTo(-4.5, 1.2); ctx.lineTo(1, 2.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, -0.8, 6, 1.6);
    }
    ctx.restore();
  }

  function drawAreaHit(ctx, state) {
    var s = S(state), kind = pick(s.kind, ['rain', 'whirl', 'quake'], 'whirl');
    var x = num(s.x, 0), y = num(s.y, 0), r = clamp(num(s.radius, kind === 'quake' ? 90 : 60), 0, 90);
    var dur = num(s.duration, 0.3), t = playT(s.age, dur);
    if (t < 0) return;
    var enemy = s.team === 'enemy';
    var col = enemy ? '255,90,90' : '168,207,255';
    ctx.save();
    if (kind === 'rain') {
      circle(ctx, x, y, r); ctx.fillStyle = 'rgba(' + col + ',' + (0.18 * (1 - t)) + ')'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(' + col + ',' + (0.8 * (1 - t)) + ')'; circle(ctx, x, y, r - 1); ctx.stroke();
      var pts = [[0, 0], [-0.5, -0.3], [0.45, -0.35], [-0.35, 0.45], [0.4, 0.4], [0, -0.65], [-0.7, 0.1], [0.7, 0.05], [0.05, 0.7]];
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - t * 0.6) + ')'; ctx.lineWidth = 2;
      for (var i = 0; i < pts.length; i++) {
        var px = x + pts[i][0] * r, py = y + pts[i][1] * r;
        var len = r * 0.22, drop = (1 - t) * len;
        ctx.beginPath(); ctx.moveTo(px, py - drop - len * 0.4); ctx.lineTo(px, py - drop); ctx.stroke();
        if (t > 0.5) { ctx.fillStyle = 'rgba(' + col + ',0.9)'; circle(ctx, px, py, 2); ctx.fill(); }
      }
    } else if (kind === 'whirl') {
      var rot = t * Math.PI * 2.2;
      ctx.lineCap = 'round';
      for (var k = 0; k < 3; k++) {
        var a0 = rot + k * Math.PI * 2 / 3;
        ctx.lineWidth = 6 * (1 - t) + 2;
        ctx.strokeStyle = 'rgba(' + col + ',' + (0.9 * (1 - t) + 0.1) + ')';
        ctx.beginPath(); ctx.arc(x, y, r - 5, a0, a0 + 1.4); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,' + (1 - t) + ')';
        ctx.beginPath(); ctx.arc(x, y, r * 0.65, a0 + 0.3, a0 + 1.2); ctx.stroke();
      }
    } else {
      var rr2 = r * (0.4 + 0.6 * t);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(' + col + ',' + (1 - t) + ')'; circle(ctx, x, y, Math.min(r - 2, rr2)); ctx.stroke();
      circle(ctx, x, y, r); ctx.fillStyle = 'rgba(80,50,30,' + (0.25 * (1 - t)) + ')'; ctx.fill();
      ctx.strokeStyle = 'rgba(30,18,10,' + (0.9 - t * 0.6) + ')'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      for (var c = 0; c < 7; c++) {
        var a = c * Math.PI * 2 / 7 + 0.3, L = (r - 4) * Math.min(1, 0.3 + t * 1.5);
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a + 0.15) * L * 0.5, y + Math.sin(a + 0.15) * L * 0.5);
        ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawHitSpark(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    var t = playT(s.age, num(s.duration, 0.25));
    if (t < 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(255,250,220,' + (1 - t) + ')'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    var r0 = 3 + 4 * t, r1 = 6 + 6 * t;
    for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 + 0.3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,' + (1 - t) + ')'; circle(ctx, 0, 0, 4 * (1 - t)); ctx.fill();
    ctx.restore();
  }

  function drawStealLink(ctx, state) {
    var s = S(state), x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0);
    var p = clamp(num(s.progress, 0), 0, 1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 2 + 3 * p;
    ctx.strokeStyle = 'rgba(154,107,255,' + (0.5 + 0.5 * p) + ')';
    ctx.shadowColor = palette.player; ctx.shadowBlur = 4 + 8 * p;
    ctx.setLineDash([8, 5]); ctx.lineDashOffset = -now() / 30;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 2; ctx.strokeStyle = palette.playerLight;
    circle(ctx, x2, y2, 12); ctx.stroke();
    ctx.restore();
  }

  function drawComboName(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    var dur = num(s.duration, 1.5), age = num(s.age, -1);
    var t = playT(age, dur);
    if (t < 0) return;
    var isNew = s.isNew === true;
    var label = (isNew ? '新技能! ' : '') + (s.name == null ? '' : String(s.name));
    var px = isNew ? 18 : 14, ph = isNew ? 28 : 18;
    var sc = age < 0.15 ? 1 + 0.2 * Math.sin(Math.PI * age / 0.15) : 1;
    var fy = age > 0.3 ? -16 * clamp((age - 0.3) / (dur - 0.3 > 0 ? dur - 0.3 : 1), 0, 1) : 0;
    var alpha = age > dur - 0.5 ? clamp((dur - age) / 0.5, 0, 1) : 1;
    var cy = y + 7 + fy;
    var tw = textW(ctx, label, px, true);
    var maxW = (isNew ? 280 : 200) / 1.2;
    var pw = Math.min(maxW, tw + 20);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, cy); ctx.scale(sc, sc);
    rr(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);
    ctx.fillStyle = isNew ? 'rgba(60,30,0,0.9)' : 'rgba(15,18,28,0.85)'; ctx.fill();
    ctx.lineWidth = isNew ? 2.5 : 1.5; ctx.strokeStyle = isNew ? palette.gold : '#cfd4e6';
    rr(ctx, -pw / 2 + 1, -ph / 2 + 1, pw - 2, ph - 2, ph / 2); ctx.stroke();
    if (tw + 20 > maxW) { var k = (maxW - 20) / tw; ctx.scale(k, 1); }
    text(ctx, label, 0, 1, px, isNew ? palette.gold : '#ffffff', 'center', true);
    ctx.restore();
  }

  function drawSpawnWarning(ctx, state) {
    var s = S(state), lane = pick(s.lane, ['top', 'mid', 'bottom'], 'mid');
    var cy = lane === 'top' ? 170 : (lane === 'mid' ? 385 : 600), cx = 40;
    var total = num(s.total, 6), rem = clamp(num(s.remaining, total), 0, total > 0 ? total : 6);
    var pulse = 0.5 + 0.5 * Math.sin(now() / 120);
    ctx.save();
    rr(ctx, cx - 30, cy - 30, 60, 60, 10);
    ctx.fillStyle = 'rgba(80,0,8,' + (0.55 + 0.25 * pulse) + ')'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,90,90,' + (0.6 + 0.4 * pulse) + ')'; ctx.stroke();
    // 這一秒剩餘的環(P17)
    var sec = Math.ceil(rem), frac = rem - (sec - 1);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,220,220,0.9)';
    ctx.beginPath(); ctx.arc(cx, cy, 25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(frac, 0, 1)); ctx.stroke();
    // 朝右箭頭
    ctx.fillStyle = '#ffd6d6';
    ctx.beginPath(); ctx.moveTo(cx + 22, cy); ctx.lineTo(cx + 12, cy - 9); ctx.lineTo(cx + 12, cy + 9); ctx.closePath(); ctx.fill();
    text(ctx, sec, cx - 3, cy + 1, 22, '#ffffff', 'center', true);
    ctx.restore();
  }

  function drawRespawnList(ctx, state) {
    var s = S(state);
    var items = Array.isArray(s.items) ? s.items : [];
    var n = items.length;
    if (!n) return;
    var shown = Math.min(n, 7);
    var cx = 1160, cy = 290;
    ctx.save();
    var x0 = cx - shown * 15 + 15;
    rr(ctx, cx - shown * 15 - 2, cy - 16, shown * 30 + 4, 32, 8);
    ctx.fillStyle = 'rgba(15,18,28,0.6)'; ctx.fill();
    for (var i = 0; i < shown; i++) {
      var ix = x0 + i * 30;
      if (n > 7 && i === 6) {
        circle(ctx, ix, cy, 13); ctx.fillStyle = 'rgba(23,58,110,0.9)'; ctx.fill();
        text(ctx, '+' + (n - 6), ix, cy + 1, 12, '#ffffff', 'center', true);
        continue;
      }
      var it = items[i] || {};
      var kind = pick(it.kind, UNIT_KINDS, 'soldier');
      var tot = num(it.total, 8), rem = clamp(num(it.remaining, tot), 0, tot > 0 ? tot : 8);
      var f = tot > 0 ? 1 - rem / tot : 1;
      circle(ctx, ix, cy, 13); ctx.fillStyle = 'rgba(23,58,110,0.75)'; ctx.fill();
      unitMini(ctx, kind, ix, cy, 20, 'ally', 0.55);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; circle(ctx, ix, cy, 12.5); ctx.stroke();
      ctx.strokeStyle = palette.allyLight;
      ctx.beginPath(); ctx.arc(ix, cy, 12.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
    }
    ctx.restore();
  }

  function keyCap(ctx, label, cx, cy, s, active) {
    ctx.save();
    rr(ctx, cx - s / 2, cy - s / 2, s, s, 4);
    ctx.fillStyle = active === false ? '#3a3d48' : '#e9ebf2'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#2a2d36'; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(cx - s / 2 + 2, cy + s / 2 - 4, s - 4, 2);
    text(ctx, label, cx, cy, Math.round(s * 0.6), active === false ? '#9a9dab' : '#1b1e27', 'center', true, false);
    ctx.restore();
  }

  function shopCell(ctx, it, idx, cx, cy, w, h) {
    it = it || {};
    var st = pick(it.state, ['ok', 'poor', 'locked'], 'locked');
    var key = it.key == null ? String((idx + 1) % 10) : String(it.key);
    var icon = SHOP_ICON[idx] || 'towerKit';
    ctx.save();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 6);
    ctx.fillStyle = st === 'ok' ? '#26304a' : '#1c1f29'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = st === 'ok' ? '#6d7fb0' : '#3a3e4c'; ctx.stroke();
    keyCap(ctx, key, cx - w / 2 + 13, cy - h / 2 + 13, 18, st !== 'locked');
    var ix = cx - w / 2 + 22, iy = cy + 8;
    if (st === 'locked') {
      silhouette(ctx, KIT_KIND[icon] || 'imp', cx + 6, cy + 2, 34);
      // 鎖
      ctx.fillStyle = '#8a8d99'; ctx.strokeStyle = '#8a8d99'; ctx.lineWidth = 2;
      rr(ctx, cx + w / 2 - 22, cy - 2, 14, 11, 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + w / 2 - 15, cy - 2, 4.5, Math.PI, 0); ctx.stroke();
    } else {
      ctx.globalAlpha *= st === 'poor' ? 0.45 : 1;
      itemCell(ctx, icon, ix, iy, 26);
      var name = it.name == null ? '' : String(it.name);
      var px = 13, tw = textW(ctx, name, px, true), avail = w - 46;
      ctx.save();
      ctx.translate(cx - w / 2 + 40, cy - 6);
      if (tw > avail) ctx.scale(avail / tw, 1);
      text(ctx, name, 0, 0, px, '#ffffff', 'left', true);
      ctx.restore();
      // 價格
      var pr = it.price == null ? '' : String(num(+it.price, 0));
      circle(ctx, cx - w / 2 + 46, cy + 14, 5); ctx.fillStyle = palette.coin; ctx.fill();
      ctx.globalAlpha = st === 'poor' ? 1 : ctx.globalAlpha;
      text(ctx, pr, cx - w / 2 + 55, cy + 14, 13, st === 'poor' ? '#ff7a7a' : palette.coin, 'left', true);
    }
    ctx.restore();
  }

  function drawShopPanel(ctx, state) {
    var s = S(state);
    var items = Array.isArray(s.items) ? s.items : [];
    var cx = num(s.x, 640), cy = num(s.y, 630);
    ctx.save();
    rr(ctx, cx - 300, cy - 75, 600, 150, 12);
    ctx.fillStyle = 'rgba(14,17,26,0.9)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = palette.allyLight;
    rr(ctx, cx - 299, cy - 74, 598, 148, 12); ctx.stroke();
    var cw = (600 - 24 - 32) / 5, ch = (150 - 24 - 8) / 2;
    for (var i = 0; i < 10; i++) {
      var r = i < 5 ? 0 : 1, c = i % 5;
      shopCell(ctx, items[i], i, cx - 300 + 12 + cw / 2 + c * (cw + 8), cy - 75 + 12 + ch / 2 + r * (ch + 8), cw, ch);
    }
    ctx.restore();
  }

  function castleIcon(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24);
    ctx.fillStyle = '#c9c5ba';
    ctx.fillRect(-10, -4, 20, 14); ctx.fillRect(-11, -9, 6, 6); ctx.fillRect(5, -9, 6, 6); ctx.fillRect(-3, -11, 6, 8);
    ctx.fillStyle = palette.ally; ctx.beginPath(); ctx.moveTo(-4, -11); ctx.lineTo(0, -15); ctx.lineTo(4, -11); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawHud(ctx, state) {
    var s = S(state);
    var gold = Math.max(0, Math.floor(num(s.gold, 0)));
    var hpMax = Math.max(1, num(s.castleMaxHp, 20)), hp = clamp(num(s.castleHp, hpMax), 0, hpMax);
    var wave = Math.max(0, Math.floor(num(s.wave, 0))), tw = Math.max(0, Math.floor(num(s.totalWaves, 6)));
    var nxt = num(s.nextWaveIn, -1);
    var rec = Math.max(0, Math.floor(num(s.recruited, 0))), rt = Math.max(0, Math.floor(num(s.recruitTotal, 5)));
    ctx.save();
    ctx.fillStyle = 'rgba(12,14,22,0.92)'; ctx.fillRect(0, 0, 1280, 50);
    ctx.fillStyle = '#3a4058'; ctx.fillRect(0, 48, 1280, 2);
    // 金幣
    circle(ctx, 32, 25, 11); ctx.fillStyle = palette.coin; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = palette.coinDark; ctx.stroke();
    text(ctx, gold, 52, 26, 26, palette.coin, 'left', true);
    // 主堡生命
    castleIcon(ctx, 200, 27, 28);
    text(ctx, hp + ' / ' + hpMax, 222, 26, 22, '#ffffff', 'left', true);
    ctx.fillStyle = '#2a2d3a'; ctx.fillRect(320, 19, 140, 12);
    ctx.fillStyle = hp / hpMax > 0.3 ? '#6fe08a' : '#ff5a5a'; ctx.fillRect(320, 19, 140 * hp / hpMax, 12);
    ctx.lineWidth = 1; ctx.strokeStyle = '#59607a'; ctx.strokeRect(320.5, 19.5, 139, 11);
    // 波次
    text(ctx, '第 ' + wave + ' / ' + tw + ' 波', 640, 26, 24, '#ffffff', 'center', true);
    if (nxt >= 0) text(ctx, '下一波 ' + Math.ceil(nxt) + ' 秒', 790, 26, 18, '#ffb4b4', 'left', true);
    // 收編
    unitMini(ctx, 'imp', 1080, 25, 26, 'ally', 1);
    text(ctx, '收編 ' + rec + ' / ' + rt, 1102, 26, 22, palette.allyLight, 'left', true);
    ctx.restore();
  }

  function drawSlowMo(ctx) {
    ctx.save();
    // 去色
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = 'rgba(128,128,128,0.75)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.globalCompositeOperation = 'source-over';
    // 偏冷
    ctx.fillStyle = 'rgba(40,80,140,0.18)';
    ctx.fillRect(0, 0, 1280, 720);
    // 暗角
    var g = ctx.createRadialGradient ? ctx.createRadialGradient(640, 360, 300, 640, 360, 780) : null;
    if (g) { g.addColorStop(0, 'rgba(0,0,10,0)'); g.addColorStop(1, 'rgba(0,0,10,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720); }
    // 外框
    ctx.lineWidth = 8; ctx.strokeStyle = palette.slowmo;
    ctx.strokeRect(4, 4, 1272, 712);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(127,216,255,0.5)';
    ctx.strokeRect(14, 14, 1252, 692);
    // 字
    rr(ctx, 640 - 70, 80 - 18, 140, 36, 18);
    ctx.fillStyle = 'rgba(10,30,50,0.8)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = palette.slowmo; ctx.stroke();
    text(ctx, '慢動作', 640, 81, 22, palette.slowmo, 'center', true);
    ctx.restore();
  }

  function drawSoulPopup(ctx, state) {
    var s = S(state);
    var slots = Array.isArray(s.slots) ? s.slots.slice(0, 4) : [];
    var n = slots.length;
    var w = num(s.w, n * 48 + 120), h = num(s.h, 116);
    var x = num(s.x, 640), y = num(s.y, 360);
    var idx = Math.floor(num(s.index, 0));
    var sh = playT(s.shakeAge, num(s.shakeDuration, 0.25));
    var dx = sh < 0 ? 0 : Math.sin(sh * Math.PI * 6) * 6 * (1 - sh);
    ctx.save();
    ctx.translate(x + dx, y);
    rr(ctx, -w / 2, -h / 2, w, h, 10);
    ctx.fillStyle = 'rgba(16,14,30,0.95)'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = sh >= 0 ? palette.bad : palette.player;
    rr(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 10); ctx.stroke();
    text(ctx, s.title == null ? '' : String(s.title), 0, -40, 16, '#ffffff', 'center', true);
    for (var i = 0; i < n; i++) {
      var cx = -w / 2 + 40 + 48 * i;
      var it = pick(slots[i], PARTS, null);
      if (i === idx) {
        rr(ctx, cx - 23, -27, 46, 46, 9); ctx.fillStyle = 'rgba(154,107,255,0.35)'; ctx.fill();
      }
      if (it) itemCell(ctx, it, cx, -4, 40); else emptyCell(ctx, cx, -4, 40);
      if (i === idx) {
        ctx.save();
        ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.shadowColor = palette.player; ctx.shadowBlur = 8;
        rr(ctx, cx - 23, -27, 46, 46, 9); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(cx, 20); ctx.lineTo(cx - 5, 27); ctx.lineTo(cx + 5, 27); ctx.closePath(); ctx.fill();
      }
    }
    // 分隔線 + 手上
    var hx = w / 2 - 44;
    ctx.strokeStyle = 'rgba(200,190,240,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hx - 30, -30); ctx.lineTo(hx - 30, 22); ctx.stroke();
    text(ctx, '手上', hx, -33, 11, palette.textDim, 'center', false);
    var hand = pick(s.hand, PARTS.concat(['slotStone']), null);
    if (hand) itemCell(ctx, hand, hx, -4, 40); else emptyCell(ctx, hx, -4, 40);
    // 底部
    var al = s.actionLabel == null ? '' : String(s.actionLabel);
    if (al) text(ctx, al, -w / 2 + 16, 40, 16, palette.gold, 'left', true);
    text(ctx, 'J 確定  K 關閉', w / 2 - 12, 40, 11, palette.textDim, 'right', false);
    ctx.restore();
  }

  function drawResult(ctx, state) {
    var s = S(state), win = s.win === true;
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,14,0.75)'; ctx.fillRect(0, 0, 1280, 720);
    rr(ctx, 640 - 260, 360 - 150, 520, 300, 16);
    ctx.fillStyle = 'rgba(20,24,38,0.95)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = win ? palette.gold : palette.bad; ctx.stroke();
    text(ctx, win ? '勝利' : '主堡被攻陷', 640, 280, 48, win ? palette.gold : '#ff7a7a', 'center', true);
    text(ctx, '第 ' + Math.floor(num(s.wave, 0)) + ' / ' + Math.floor(num(s.totalWaves, 6)) + ' 波', 640, 350, 26, '#ffffff', 'center', true);
    text(ctx, '收編兵種 ' + Math.floor(num(s.recruited, 0)) + ' / ' + Math.floor(num(s.recruitTotal, 5)), 640, 395, 26, palette.allyLight, 'center', true);
    keyCap(ctx, 'J', 560, 458, 30, true);
    text(ctx, '按 J 重新開始', 660, 458, 22, '#ffffff', 'center', true);
    ctx.restore();
  }

  // ---------------- 說明頁示意圖 ----------------
  var GUIDE_SIZE = [[480, 270], [400, 240], [560, 280], [440, 260], [560, 260], [600, 260], [600, 300]];
  function label(ctx, str, x, y, px, color) {
    ctx.save();
    var w = textW(ctx, str, px, true) + 10;
    rr(ctx, x - w / 2, y - px * 0.75, w, px * 1.5, px * 0.5);
    ctx.fillStyle = 'rgba(10,12,20,0.78)'; ctx.fill();
    text(ctx, str, x, y + 1, px, color || '#ffffff', 'center', true, false);
    ctx.restore();
  }
  function arrow(ctx, x1, y1, x2, y2, col, lw) {
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw || 2.5; ctx.lineCap = 'round';
    var a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * 6, y2 - Math.sin(a) * 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - Math.cos(a - 0.5) * 10, y2 - Math.sin(a - 0.5) * 10); ctx.lineTo(x2 - Math.cos(a + 0.5) * 10, y2 - Math.sin(a + 0.5) * 10); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function panelBg(ctx, x, y, w, h) {
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.fillStyle = palette.bg; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke(); ctx.restore();
  }
  function roadStrip(ctx, x1, x2, y) {
    ctx.save(); ctx.fillStyle = palette.roadEdge; ctx.fillRect(x1, y - 28, x2 - x1, 56);
    ctx.fillStyle = palette.road; ctx.fillRect(x1, y - 24, x2 - x1, 48); ctx.restore();
  }
  function popupW(n) { return n * 48 + 120; }

  var guidePages = [
    // 1 守住主堡: 全景
    function (ctx) {
      ctx.save();
      ctx.scale(480 / 1280, 270 / 720);
      drawBackground(ctx);
      drawCastle(ctx, { x: 1180, y: 385, hitAge: 0.3, hitDuration: 0.3, attackAge: 0.15, attackDuration: 0.15 });
      drawSpawnWarning(ctx, { lane: 'mid', remaining: 3.4, total: 6 });
      [[300, 170, 1], [560, 170, 1], [1080, 280, 1], [420, 385, 1], [760, 385, 1], [480, 600, 1], [900, 600, 1]].forEach(function (p) {
        ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(1.8, 1.8);
        bodyDemon(ctx, 'imp', { team: 'enemy', facing: 1, hit: 0, moving: true }); ctx.restore();
      });
      // 方向箭頭
      [[640, 125], [640, 340], [640, 555]].forEach(function (a) { arrow(ctx, a[0] - 60, a[1], a[0] + 60, a[1], 'rgba(255,154,158,0.9)', 8); });
      ctx.restore();
      label(ctx, '敵營', 34, 40, 14, '#ff9a9e');
      label(ctx, '主堡', 442, 200, 14, palette.allyLight);
    },
    // 2 移動與撿錢
    function (ctx) {
      panelBg(ctx, 0, 0, 400, 240);
      drawCorpse(ctx, { kind: 'imp', x: 90, y: 150, life: 12, maxLife: 15 });
      [[60, 120], [125, 125], [70, 190]].forEach(function (c) { drawCoin(ctx, { x: c[0], y: c[1] }); });
      // 已走過的路徑與被撿起的金幣
      ctx.save();
      ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(220,203,255,0.7)';
      ctx.beginPath(); ctx.moveTo(140, 195); ctx.lineTo(200, 190); ctx.lineTo(250, 160); ctx.stroke(); ctx.setLineDash([]);
      [[155, 194], [205, 188]].forEach(function (c) {
        ctx.strokeStyle = 'rgba(255,211,77,0.6)'; ctx.lineWidth = 1.5; circle(ctx, c[0], c[1], 7.5); ctx.stroke();
        text(ctx, '+2', c[0], c[1] - 14, 12, palette.coin, 'center', true);
      });
      ctx.restore();
      drawPlayer(ctx, { x: 270, y: 150, moving: true, handItem: null, stealing: false, stealProgress: 0 });
      keyCap(ctx, 'W', 270, 108, 20); keyCap(ctx, 'A', 236, 150, 20); keyCap(ctx, 'S', 270, 190, 20); keyCap(ctx, 'D', 304, 150, 20);
      // 迷你 HUD 金幣
      ctx.save();
      rr(ctx, 270, 12, 120, 34, 8); ctx.fillStyle = 'rgba(12,14,22,0.92)'; ctx.fill();
      circle(ctx, 290, 29, 9); ctx.fillStyle = palette.coin; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = palette.coinDark; ctx.stroke();
      text(ctx, '40', 306, 30, 16, '#a9adbd', 'left', true);
      arrow(ctx, 330, 29, 348, 29, palette.coin, 2);
      text(ctx, '44', 352, 30, 18, palette.coin, 'left', true);
      ctx.restore();
    },
    // 3 拿魂件
    function (ctx) {
      panelBg(ctx, 0, 0, 560, 280);
      roadStrip(ctx, 0, 560, 230);
      drawTower(ctx, { x: 200, y: 200, hp: 150, maxHp: 150, hitAge: 0.2, hitDuration: 0.2, attackAge: 0.15, attackDuration: 0.15, targeted: true });
      drawSoulSlots(ctx, { x: 200, y: 156, slots: ['ranged', null] });
      drawPlayer(ctx, { x: 260, y: 215, moving: false, handItem: null });
      // 慢動作效果(縮在框內)
      ctx.save();
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,0.75)'; ctx.fillRect(0, 0, 560, 280);
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(40,80,140,0.2)'; ctx.fillRect(0, 0, 560, 280);
      ctx.lineWidth = 5; ctx.strokeStyle = palette.slowmo; ctx.strokeRect(2.5, 2.5, 555, 275);
      ctx.restore();
      label(ctx, '慢動作', 60, 24, 13, palette.slowmo);
      var w = popupW(2);
      drawSoulPopup(ctx, { x: 200, y: 80, w: w, h: 116, title: '箭塔', slots: ['ranged', null], index: 0, hand: null, actionLabel: '拿起', shakeAge: 0.25, shakeDuration: 0.25 });
      // ← → 在槽列兩側, J 指動作, K 關閉
      keyCap(ctx, '←', 200 - w / 2 - 18, 76, 22); keyCap(ctx, '→', 200 + w / 2 + 18, 76, 22);
      keyCap(ctx, 'J', 200 - w / 2 - 18, 120, 22);
      arrow(ctx, 200 - w / 2 - 6, 120, 200 - w / 2 + 12, 120, '#ffffff', 2);
      label(ctx, 'K 關閉', 200 + w / 2 + 34, 120, 12, '#ffffff');
      // 角落小圖: 屍體也能拿
      ctx.save();
      rr(ctx, 400, 150, 150, 120, 8); ctx.fillStyle = 'rgba(12,14,22,0.75)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke();
      ctx.restore();
      drawCorpse(ctx, { kind: 'imp', x: 475, y: 225, life: 12, maxLife: 15, targeted: true });
      drawSoulSlots(ctx, { x: 475, y: 225 - 16 - 12, slots: ['melee', 'march'] });
      label(ctx, '屍體也能拿', 475, 166, 12, '#ffffff');
    },
    // 4 搶活鬼
    function (ctx) {
      panelBg(ctx, 0, 0, 440, 260);
      roadStrip(ctx, 0, 440, 150);
      ctx.save(); ctx.translate(220, 140); ctx.scale(1.2, 1.2); ctx.translate(-220, -140);
      var ix = 250, iy = 150, px = 190, py = 158;
      // 虛線框: 離太遠就斷(半徑 = 16 + 68)
      ctx.save(); ctx.setLineDash([7, 5]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; circle(ctx, ix, iy, 84); ctx.stroke(); ctx.restore();
      drawDemon(ctx, { type: 'imp', team: 'enemy', x: ix, y: iy, hp: 30, maxHp: 30, hitAge: 0.2, hitDuration: 0.2, attackAge: 0.15, attackDuration: 0.15, moving: true, facing: 1, harmless: false });
      drawSoulSlots(ctx, { x: ix, y: iy - 16 - 20, slots: ['melee', 'march'] });
      drawPlayer(ctx, { x: px, y: py, moving: false, handItem: null, stealing: true, stealProgress: 0.5 });
      drawStealLink(ctx, { x1: px, y1: py, x2: ix + 10, y2: iy - 36, progress: 0.5 });
      ctx.restore();
      label(ctx, '離太遠就斷', 220, 22, 13, '#ffffff');
    },
    // 5 裝上與互換
    function (ctx) {
      panelBg(ctx, 0, 0, 225, 260); panelBg(ctx, 233, 0, 225, 260); panelBg(ctx, 466, 0, 94, 260);
      var w = popupW(2);
      function scaledPopup(cx, cy, st) { ctx.save(); ctx.translate(cx, cy); ctx.scale(0.92, 0.92); st.x = 0; st.y = 0; drawSoulPopup(ctx, st); ctx.restore(); }
      // 左: 裝上
      scaledPopup(112, 62, { w: w, h: 116, title: '箭塔', slots: ['ranged', null], index: 1, hand: 'melee', actionLabel: '裝上', shakeAge: 0.25, shakeDuration: 0.25 });
      arrow(ctx, 112, 122, 112, 150, '#ffffff', 2.5);
      drawTower(ctx, { x: 112, y: 222, hp: 150, maxHp: 150 });
      drawSoulSlots(ctx, { x: 112, y: 178, slots: ['ranged', 'melee'] });
      drawPlayer(ctx, { x: 175, y: 226, handItem: null });
      // 右: 互換
      scaledPopup(345, 62, { w: w, h: 116, title: '箭塔', slots: ['ranged', null], index: 0, hand: 'melee', actionLabel: '互換', shakeAge: 0.25, shakeDuration: 0.25 });
      arrow(ctx, 345, 122, 345, 150, '#ffffff', 2.5);
      drawTower(ctx, { x: 330, y: 222, hp: 150, maxHp: 150 });
      drawSoulSlots(ctx, { x: 330, y: 178, slots: ['melee', null] });
      drawPlayer(ctx, { x: 400, y: 226, handItem: 'ranged' });
      // 角落: K 丟下
      drawPlayer(ctx, { x: 500, y: 120, handItem: 'melee' });
      keyCap(ctx, 'K', 535, 80, 22);
      arrow(ctx, 505, 142, 510, 178, '#ffffff', 2);
      drawGroundPart(ctx, { item: 'melee', x: 513, y: 200 });
      label(ctx, '丟在地上', 513, 236, 11, '#ffffff');
    },
    // 6 收編
    function (ctx) {
      panelBg(ctx, 0, 0, 196, 190); panelBg(ctx, 202, 0, 196, 190); panelBg(ctx, 404, 0, 196, 260);
      panelBg(ctx, 0, 196, 398, 64);
      text(ctx, '1', 14, 14, 14, palette.gold, 'center', true);
      text(ctx, '2', 216, 14, 14, palette.gold, 'center', true);
      text(ctx, '3', 418, 14, 14, palette.gold, 'center', true);
      // 1: 搶最後一件 [近戰, 空]
      drawDemon(ctx, { type: 'imp', team: 'enemy', x: 120, y: 120, hp: 30, maxHp: 30, moving: false, facing: 1, harmless: false });
      drawSoulSlots(ctx, { x: 120, y: 84, slots: ['melee', null] });
      drawPlayer(ctx, { x: 65, y: 130, stealing: true, stealProgress: 0.7 });
      drawStealLink(ctx, { x1: 65, y1: 130, x2: 110, y2: 84, progress: 0.7 });
      // 2: 迷魂 [空,空] → 裝進攻主堡 → [進攻主堡, 空]
      drawDemon(ctx, { type: 'imp', team: 'neutral', x: 300, y: 140, moving: false, facing: 1, harmless: true, targeted: true });
      drawSoulSlots(ctx, { x: 270, y: 70, slots: [null, null] });
      arrow(ctx, 296, 70, 318, 70, '#ffffff', 2);
      drawSoulSlots(ctx, { x: 345, y: 70, slots: ['march', null] });
      drawPlayer(ctx, { x: 245, y: 150, handItem: 'march' });
      label(ctx, '迷魂', 340, 165, 12, palette.neutralLight);
      // 3: 走進主堡 → 商店 7 解鎖
      ctx.save();
      ctx.beginPath(); ctx.rect(404, 0, 196, 260); ctx.clip();
      drawCastle(ctx, { x: 600, y: 95, hitAge: 0.3, hitDuration: 0.3 });
      ctx.restore();
      ctx.save(); ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(230,92,200,0.8)';
      ctx.beginPath(); ctx.moveTo(445, 110); ctx.lineTo(540, 100); ctx.stroke(); ctx.restore();
      drawDemon(ctx, { type: 'imp', team: 'neutral', x: 485, y: 105, moving: true, facing: 1, harmless: true });
      drawSoulSlots(ctx, { x: 485, y: 69, slots: ['march', null] });
      shopCell(ctx, { key: '7', state: 'locked' }, 6, 452, 210, 84, 54);
      arrow(ctx, 498, 210, 510, 210, '#ffffff', 2);
      shopCell(ctx, { key: '7', name: '小鬼兵', price: 8, state: 'ok' }, 6, 556, 210, 84, 54);
      // 野狼也能
      drawWolf(ctx, { x: 60, y: 230, team: 'neutral', facing: 1 });
      drawSoulSlots(ctx, { x: 120, y: 228, slots: ['march', null] });
      label(ctx, '中立野狼也能這樣招募', 260, 228, 13, '#ffffff');
    },
    // 7 購買與放兵
    function (ctx) {
      panelBg(ctx, 0, 0, 600, 150);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 600, 150); ctx.clip();
      drawCastle(ctx, { x: 110, y: 75, zoneActive: true, hitAge: 0.3, hitDuration: 0.3 });
      ctx.restore();
      drawPlayer(ctx, { x: 40, y: 120, handItem: null });
      var items = [
        { key: '1', name: '箭塔材料', price: 15, state: 'ok' }, { key: '2', name: '步兵', price: 12, state: 'ok' },
        { key: '3', name: '遠攻魂件', price: 10, state: 'ok' }, { key: '4', name: '近戰魂件', price: 10, state: 'ok' },
        { key: '5', name: '擴槽石', price: 20, state: 'poor' }, { key: '6', state: 'locked' }, { key: '7', state: 'locked' },
        { key: '8', state: 'locked' }, { key: '9', state: 'locked' }, { key: '0', state: 'locked' }];
      ctx.save(); ctx.translate(405, 75); ctx.scale(0.62, 0.62); drawShopPanel(ctx, { items: items, x: 0, y: 0 }); ctx.restore();
      // 左下: 蓋塔
      panelBg(ctx, 0, 158, 296, 142);
      drawBuildPad(ctx, { x: 90, y: 230, state: 'empty', rebuildRemaining: 0, rebuildTotal: 8, highlight: true });
      drawPlayer(ctx, { x: 160, y: 240, handItem: 'towerKit' });
      keyCap(ctx, 'J', 205, 240, 22);
      label(ctx, '蓋塔', 240, 240, 13, '#ffffff');
      // 右下: 放兵
      panelBg(ctx, 304, 158, 296, 142);
      ctx.save(); ctx.beginPath(); ctx.rect(304, 158, 296, 142); ctx.clip(); roadStrip(ctx, 304, 600, 225); ctx.restore();
      drawPlacePreview(ctx, { kind: 'soldier', x: 400, y: 225, valid: true });
      arrow(ctx, 376, 225, 330, 225, palette.allyLight, 3);
      drawPlayer(ctx, { x: 440, y: 255, handItem: 'soldierKit' });
      keyCap(ctx, 'J', 470, 200, 22);
      label(ctx, '放下, 會往敵營推進', 520, 278, 12, '#ffffff');
    }
  ];

  function drawGuidePage(ctx, state) {
    var s = S(state);
    var page = clamp(Math.floor(num(s.page, 0)), 0, guidePages.length - 1);
    var x = num(s.x, 0), y = num(s.y, 0), w = Math.max(1, num(s.w, GUIDE_SIZE[page][0])), h = Math.max(1, num(s.h, GUIDE_SIZE[page][1]));
    var vw = GUIDE_SIZE[page][0], vh = GUIDE_SIZE[page][1];
    var sc = Math.min(w / vw, h / vh);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - vw * sc) / 2, y + (h - vh * sc) / 2);
    ctx.scale(sc, sc);
    ctx.beginPath(); ctx.rect(0, 0, vw, vh); ctx.clip();
    guidePages[page](ctx);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: 1280, height: 720 },
    palette: palette,
    drawBackground: drawBackground,
    drawBuildPad: drawBuildPad,
    drawCastle: drawCastle,
    drawTower: drawTower,
    drawSoldier: drawSoldier,
    drawWolf: drawWolf,
    drawDemon: drawDemon,
    drawCorpse: drawCorpse,
    drawGroundPart: drawGroundPart,
    drawCoin: drawCoin,
    drawPlayer: drawPlayer,
    drawPlacePreview: drawPlacePreview,
    drawSoulSlots: drawSoulSlots,
    drawGuardAura: drawGuardAura,
    drawProjectile: drawProjectile,
    drawAreaHit: drawAreaHit,
    drawHitSpark: drawHitSpark,
    drawStealLink: drawStealLink,
    drawComboName: drawComboName,
    drawSpawnWarning: drawSpawnWarning,
    drawRespawnList: drawRespawnList,
    drawShopPanel: drawShopPanel,
    drawHud: drawHud,
    drawSlowMo: drawSlowMo,
    drawSoulPopup: drawSoulPopup,
    drawResult: drawResult,
    drawGuidePage: drawGuidePage
  };
})();
