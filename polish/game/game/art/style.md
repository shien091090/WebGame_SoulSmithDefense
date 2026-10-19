# 魂匠守衛者 美術規格(打磨版, 底版 deepen-1 / game-c「魂匠共鳴」)

> RD 只讀這份。`index.html` 必須宣告 `<meta charset="utf-8">`, 否則 art.js 的中文字會變亂碼。
> art.js 是一般 script(不是 module), 載入後提供 `window.Art`。全部 Canvas 2D 幾何繪製, 沒有外部資源; 字型只用系統字型(微軟正黑體 → 蘋方 → sans-serif)。
> 函式名、參數、state 欄位全部照 interface.json, 一個不多一個不少。上一版的 `drawGuidePage` 已刪除。

## 邏輯畫布尺寸

`window.Art.canvas = { width: 1280, height: 720 }`(= interface.json)。HUD 0~50, 遊戲區 y 50~720。

## 色票表

`window.Art.palette` 裡的名稱(沿用底版, 刪掉魂爐色 forge, 新增最後 4 列):

| 名稱 | 色碼 | 用途 |
|---|---|---|
| grass / bg / grassDark | #2e4733 / #2e4733 / #27402c | 草地底色與斑點 |
| grid | rgba(255,255,255,0.05) | 蓋塔格線(極淡, 路面蓋掉) |
| path / pathEdge / pathLight | #9a8158 / #6a5535 / #ad9469 | 路面 / 路邊 / 路中央較亮的磨損帶(寬 20, 不透明) |
| ally / allyDark / allyRim | #5b8fe0 / #2f4f86 / #cfe0ff | 我方單位藍邊、主堡旗 |
| enemy 等 | #b23a52(小鬼)、弓鬼 #963a86、冰鬼 #5a5aa8、鼓鬼 #8a4a3a、狂鬼 #7e1a30; 外描 #3a0d1a; 眼 #ffb347 | 敵人「鬼」 |
| player / playerRim / playerCloak | #fff1c9 / #ffb020 / #e0902a | 玩家魂匠(全場唯一奶白金邊圓) |
| neutral | #8d8b84 | 中立石魔像 |
| stone | #8d93a3 | 主堡、弩塔石材 |
| ranged / melee / frost / seek / march / drum | #f2c94c / #ef5350 / #8fd8ff / #6ad05a / #a77bff / #e57ad0 | 六種基本魂件意象色(遠攻 / 近戰 / 冰霜 / 索敵 / 進攻主堡 / 行軍) |
| combo | #ffd24a | HUD 組合圖示的金邊八角 |
| slotStone | #b9c3d6 | 擴槽石 |
| resonance | #e3d4ff | 共鳴微光、一般組合名稱的邊 |
| target | #ffffff | 互動目標外框 |
| cursor / gold / coin | #ffd24a / #ffd24a / #ffcc33 | 游標框、金幣數字、金幣 |
| valid / invalid | #5fe07a / #ff4a4a | 放置預覽可 / 不可 |
| allyShot / enemyShot | #fff3b0 / #ff4d7a | 我方箭 / 敵方彈 |
| slowmo | #9fd4ff | 慢動作冷色邊框 |
| hud / panel | #161b26 / #1d2331 | HUD 底、彈窗底 |
| **soulLight** | #cfe0ff | 新: 兵「歸隊中」拖尾與「潰散」魂光(和 allyRim 同色 = 我方的魂) |
| **swap** | #ff9a4a | 新: 替換彈窗的橘邊與互換箭頭 |
| **stun** | #ffe14a | 新: 敵人暈眩星星(與呆站問號同為黃 = 「這隻鬼現在不前進」) |
| **tutorPaper / tutorInk / tutorAccent / tutorDone** | #fff4d6 / #2a2016 / #e0902a / #2fae4e | 新: 教學泡泡專用(淺紙底、深墨字框、呼吸內框、完成綠勾); 全畫面只有教學用淺底 |
| keyFace / keyBase / keyInk / keyPressed | #ece7da / #3a3f4c / #1e2230 / #8fe6a0 | 按鍵圖示(教學、Z 提示、主堡區空白鍵); 按過 = 綠面 + 右下小勾 |

**色相張力(沿用底版, 請製作人驗收)**: 六種魂件色排滿色輪, 最近兩對 近戰—遠攻 44°、近戰—行軍 49°, 所以魂件辨識主通道是圖示形狀(斜箭 / 直劍 / 雪花 / 眼 / 城堡 / 鼓), 顏色第二通道。最差組合: 18px 小格裡近戰與行軍並排。本輪新增的 swap 橘(29°)只出現在替換彈窗的框與箭頭, 不填在任何魂件格上。

## 形狀語言

我方 = 帶藍邊的圓角方塊; 敵人 = 下緣波浪的「鬼」剪影 + 橘眼; 玩家 = 全場唯一的奶白金邊圓; 魂件 = 圓角方塊 + 深色線圖示; 借來的魂件 = 小一號虛線框半透明; 教學 = 全場唯一淺色紙底的泡泡; 扁平無外光, 只有範圍淡染與魂光用漸層。

## 理念落實

- P0 辨識度先於好看: 我方 / 敵 / 玩家 / 中立 用剪影分(方塊 / 鬼 / 圓 / 灰無邊方塊); 「歸隊中的兵」用半透明 + 虛線框 + 魂光拖尾, 和正常的兵、和屍體都分得開。
- P1 視覺權重跟著決策迫切度走: 地面層(魂柱範圍、主堡區、冰霜範圍)都 ≤ 12% 淡染; 最亮的是互動目標白框、彈窗游標金框、出怪預警與教學泡泡; Z 提示是半透明小底板, 權重低於它描述的物件。
- P2 規則上存在的東西畫面上就存在: 歸隊中(暫時不在戰鬥)、暈眩、呆站(失去進攻主堡)、主堡左側的出兵門、多條路線的共用段都畫出; 範圍外緣 = 判定邊界。
- P3 一個意義一種長相: 魂件圖示全畫面同一函式; 按鍵圖示在教學、Z 提示、主堡區同一套鍵帽; 我方的魂一律 soulLight(潰散、歸隊); 「這隻鬼不前進」的頭頂記號一律黃(問號 / 暈眩星); 開始畫面的裝飾只用合法狀態的魂柱。
- P4 關鍵區分走兩條通道: 拿取 vs 替換彈窗 = 藍灰邊 vs 橘粗邊 + 細分隔線 vs 互換箭頭; 潰散 vs 敵人死亡 = 往右飛散的藍白魂光且不留物 vs 原地灰色屍體 + 叉眼; 歸隊 vs 正常 = 半透明 + 虛線框 + 拖尾; 教學按鍵按過 = 綠面 + 小勾。
- P7 每個元素都要掙得版面: 教學泡泡不加「教學」標頭; Z 提示只有鍵 + 動詞; 拿掉底版的魂爐爐火(機制已刪)。
- P9 以最混亂的那一刻驗收: 互動目標純白粗框; 所有文字有深色底板或描邊; 教學泡泡在滿場時靠「全場唯一淺底」被找到。
- P13 事件要排隊: 教學一次一個泡泡, 完成特效 0.6 秒播完才換下一個(由 RD 排); 組合名稱 1.5 秒內淡出。
- P15 回饋強度與份量成正比: 火花(12)< 範圍斬擊(60)< 衝鋒撞擊(實心星爆 + 粗環 + 撞退方向衝擊線)< 穿透光束; 一般組合名 < 首次組合「新組合!」。
- P17 進度圖形與數字分工: 出怪預警中央數字 = 剩餘秒數, 外環只畫這一秒; 搶奪環沒有數字, 畫總進度。
- P18 重要資訊不只存在一瞬間: 首次組合的名稱只閃 1.5 秒, HUD「組合」5 格常駐點亮; 結算畫面留存組合數與星數。
- P19 資訊貼著物件: 槽列貼單位頭上、Z 提示貼玩家腳下、教學泡泡箭頭尖端貼在被指物件的附屬物頂端、主堡區鍵帽畫在主堡區圈內。
- P21 示意圖選分岔的例子: 本輪沒有說明頁; 教學泡泡指著實物, 不另畫示意圖。

## 繪製層級(照 interface.json drawOrder)

開始畫面: 只呼叫 drawTitle。關卡中: drawBackground → drawPillarRange → drawResonanceLine → drawFrostAura → drawCoin → drawCorpse → drawGroundPart → drawPlacePreview → 單位與敵人與玩家(依 y)→ drawSoulSlots → drawProjectile → drawPierceBeam → drawAreaHit → drawHitSpark → drawUnitBreak → drawStealLink → drawComboName → drawSpawnWarning → drawActionHint → drawTutorial(沒開彈窗時)→ drawHud → drawSlowMo → drawSoulPopup / drawShopPopup → drawTutorial(替換彈窗 + 階段 9)→ drawResult。

## 判讀約定

- 時間欄位: 0 ≤ Age < Duration 才播; Age ≥ Duration 或欄位缺漏 = 閒置。缺 Duration 時用介面預設(攻擊 0.15、受擊 0.2、主堡受擊 0.3、魂柱波紋 0.5、地上魂件彈出 0.6、潰散 0.5、暈眩 1.0、穿透 0.15、範圍 0.3、火花 0.25、組合名 1.5、抖動 0.25、教學完成 0.6、星星 1.2)。
- 半徑一律指外緣: 魂柱範圍 150、冰霜範圍 70、主堡區 110、旋風斬 / 冰霜重擊 60、衝鋒 30、搶奪環 24(環寬 4 往內)。線寬往內畫。
- 穿透光束: 最寬層 28 = 判定寬, 兩端平頭不外伸。
- 出怪預警數字 = ceil(remaining); 外環 = remaining − (數字 − 1)。箭頭依 angle 旋轉, 數字不轉。
- drawBackground: 每條路線的第 0 點往畫面外再延伸 40px; 最後一段 y = 434 的水平線收在 x = 1124。三層(路邊 56 / 路面 50 / 中央磨損帶 20)都是不透明色, 同一層所有路線畫完才畫下一層, 所以共用段不會變深、沒有接縫; 不畫虛線中線(兩條路的虛線在共用段會錯位)。入口畫 70px 暗化 + 兩側路標石(離中線 30~40, 在不能蓋塔的帶內)。paths 缺漏或不合法時畫第 1 關路線。
- drawTutorial: `stage` 刻意不讀(外觀只由 text、keys、pressedKeys 決定)。箭頭底邊寬 22, 底邊中心 x = tipX, 但夾在本體中心 ±136 內。完成特效: 0~0.18 秒整個泡泡(含箭頭)以本體中心放大到 1.15 倍, 0~0.12 秒浮出紙色罩 + 大綠勾, 0.27 秒起淡出到 0.6 秒消失。因為箭頭跟著放大, 播完成特效時尖端會離開原尖端至多 20×0.15 = 3px(介面要求以本體中心為軸, 照做)。
- drawSoulPopup: 標題畫在 (0, −42), 比介面的 −40 上移 2px — 最窄 168 寬、標題「小鬼的屍體」時, 13px 標題下緣會壓到右側「手上」小字上緣 0.5px。take 模式手上格一律畫空。
- drawActionHint: 底板寬依字長, 48~96; 「不能蓋」= 紅底紅框紅字 + Z 鍵變淡。
- drawTitle: 選中的卡片最後畫、放大 1.06 倍 + 金框 + 金色外光; 放大後和相鄰卡片仍有 14px 間隙。
- 表外值的預設外觀: 敵人 / 屍體種類未知 → 小鬼; drawAreaHit kind 未知 → 旋風斬; drawPlacePreview kind 未知 → 弩塔; drawUnitBreak kind 未知 → 步兵; 物品字串未知 → 只畫一個虛線空框; 商店品項缺漏 → 鎖住格; 教學 keys 的表外值 → 略過; drawSoulPopup mode 非 "replace" → 拿取彈窗; drawResult options 空 → [重來, 標題]。
- 時間性小動畫(呼吸、流動光點、雪點、暈眩星繞圈、魂光拖尾光點)用 `performance.now()` 自己跑, 不影響狀態。
- drawSlowMo 用 `saturation` 合成模式去色, 刻意作用於整張畫布(全畫面效果); 其他函式一律 source-over。

## 畫面文字歸屬

依介面 textOwnership, 下列文字都由美術畫, **RD 不要另畫**: drawTitle(大標題、「第 N 關」、關名、星、鎖、「← → 選關  Z 開始  X 靜音」)、drawComboName、drawActionHint(Z 鍵 + label)、drawSoulPopup(標題、「手上」、actionLabel、「Z 確定  X 關閉」)、drawShopPopup(「商店」、品名、價格、底部訊息、「← → 選  Z 購買  X 關閉」)、drawHud(「第 N 關」+ 關名、金幣、主堡 n / 20、「波次」n / N、「下一波」N 秒 /「準備中」、「組合」、「Z 互動  空白鍵 商店  X 靜音」)、drawSlowMo(「慢動作」)、drawResult(標題、關名、波次與主堡、組合數、按鈕文字、「← →  選  Z 確定」)、drawCastle(主堡區內的「空白鍵」鍵帽)、drawTutorial(提示文字、按鍵圖示、打勾、完成特效; 文字內容由 RD 傳 text)。

## 物件表

所有 x, y 是物件中心; `targeted: true` 時在 size 外畫一圈白框(內緣貼齊 size 外邊, 寬 3, 輕微呼吸)。

| 物件 | 函式 | state 欄位 | 各狀態視覺差異 |
|---|---|---|---|
| 開始畫面 | `drawTitle(ctx, s)` | levels[{name, unlocked, bestStars}], cursorIndex, muted, blinkTime | 草地 + 三叉路線意象 + 暗罩; 兩側裝飾魂柱; 金色大標題「魂匠守衛者」(隨 blinkTime 上下微動 2px); 5 張卡片: 解鎖 = 深藍底、「第 N 關」、關名 30px、3 顆星(亮 bestStars 顆); 未解鎖 = 更暗、灰鎖、灰關名、不畫星; 選中 = 1.06 倍 + 金框 + 金光; 底部提示「Z 開始」閃爍; 右上喇叭(muted 打紅叉) |
| 背景 | `drawBackground(ctx, s)` | paths | 草地 + 淡格線 + 依 paths 畫路(見判讀約定) |
| 魂柱範圍 | `drawPillarRange(ctx, s)` | x, y, radius, kinds, changeAge, changeDuration | 0 件: 淡白虛線空圈; 1 件: 意象色淡染 + 實線外圈; 2 件: 12 扇兩色交替; 換魂件時白芯波紋從中心擴到外緣 0.5 秒 |
| 共鳴線 | `drawResonanceLine(ctx, s)` | x1, y1, x2, y2, kind, active | false: 意象色 35% 細線(寬 1.2); true: 寬 3 + 白芯 + 往接收者流動的白點 |
| 主堡 | `drawCastle(ctx, s)` | x, y, hitAge, hitDuration, attackAge, attackDuration, zoneActive, targeted | 雙塔石堡 + 頂旗 + 正面藍軍旗(魂爐爐口拿掉); 左緣木城門(兵歸隊走出的門); 受擊整體紅閃; 攻擊上移 3px; 主堡區半徑 110 暖白虛線圈, zoneActive 時變亮變粗並在圈內左下 (x−48, y+74) 畫「空白鍵」鍵帽 |
| 弩塔 | `drawCrossbow(ctx, s)` | x, y, attackAge, attackDuration, moving, resonating, targeted | 藍邊石座 + 木弩; 攻擊後座 3px; moving: 底部輪子; resonating: 框內淡紫光圈 |
| 魂柱 | `drawPillar(ctx, s)` | x, y, kinds, targeted | 石柱 + 頂端菱形晶石; 有魂件時晶石染意象色(2 件左右分色)+ 6 道短光; 沒有時晶石灰、不放光 |
| 步兵 | `drawSoldier(ctx, s)` | x, y, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, charging, resonating, returning, targeted | 藍色方身 + 頭盔 + 劍盾; 受擊白閃; 攻擊左衝 3px; moving 輕跳; charging: 前傾 + 身後(右)3 條速度線; resonating: 框內淡紫光圈; **returning: 本體 42% 透明 + 淡藍虛線框 + 身後(右)錐形魂光拖尾與飄散光點, 不畫血條**; 血條只在 hp < maxHp 且非歸隊時畫 |
| 石魔像 | `drawGolem(ctx, s)` | x, y, team, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, charging, resonating, returning, targeted | team "neutral": 灰石暗眼無藍邊(忽略 charging / resonating / returning / 血條); "ally": 藍灰石 + 藍邊 + 亮眼 + 胸口符文; 其餘同步兵 |
| 潰散 | `drawUnitBreak(ctx, s)` | kind, x, y, age, duration | 0~0.45: 本體縮小淡出 + 中心白光; 6 道藍白魂光彗星從本體各處先後出發, 往右(主堡方向)略往上飛到框邊, 末 30% 淡出; 不留任何東西(敵人死亡會留灰屍體) |
| 敵人 | `drawEnemy(ctx, s)` | type, x, y, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, slowed, stunAge, stunDuration, targeted | 鬼剪影 + 橘眼; 五種造型同底版; 受擊白閃; 攻擊右移 3px; moving false: 頭上黃「?」; slowed: 冰藍色調 + 白外描; **暈眩: 頭頂 3 顆黃星繞圈(問號不畫)** |
| 屍體 | `drawCorpse(ctx, s)` | kind, x, y, life, maxLife, targeted | 扁倒的灰色鬼 + 叉眼; 框內底部細條 = life / 15; life < 3 時每秒 2 次閃爍、細條轉紅 |
| 地上的魂件 | `drawGroundPart(ctx, s)` | item, x, y, spawnAge, spawnDuration, targeted | 圖示 20px + 地影 + 白點線圈 + 輕微浮動; 彈出中: 從右上(主堡方向)彈出落地 + 白光 |
| 金幣 | `drawCoin(ctx, s)` | x, y | 金色圓幣 |
| 玩家 | `drawPlayer(ctx, s)` | x, y, moving, handItem, stealing, stealProgress | 奶白圓身 + 金橘邊 + 兜帽 + 錘徽; moving 輕跳; handItem: 身體右側淡光底 + 18px 圖示 + 兩隻小手; stealing: 繞身金色進度環(從正上方順時針); 頭上不畫槽列、沒有出手與微光 |
| Z 情境提示 | `drawActionHint(ctx, s)` | x, y, label | 半透明深色小底板 + 左側 16px Z 鍵 + 白色 label; 「不能蓋」= 紅底紅框淡紅字、Z 鍵變淡; label 空字串不畫 |
| 放置預覽 | `drawPlacePreview(ctx, s)` | kind, x, y, valid | 半透明單位輪廓 + 框; valid 綠, 否則紅 + 紅叉; pillar 另畫半徑 150 虛線圈 |
| 魂件槽列 | `drawSoulSlots(ctx, s)` | x, y, slots, virtual | 實體 18px 暗底格, 空格虛線; 虛魂件 14px 半透明虛線框, used 白框較亮; > 3 項畫前 2 + 「+N」 |
| 冰霜範圍 | `drawFrostAura(ctx, s)` | x, y, radius, owner | ally: 冰藍淡染 + 實線圈 + 白雪點; enemy: 粉紅淡染 + 虛線圈 + 粉雪點 |
| 投射物 | `drawProjectile(ctx, s)` | x, y, angle, kind, owner | ally normal: 黃白箭; ally ice: 冰藍箭 + 白箭頭 + 尾端白叉; enemy: 深紅圓彈 + 粉紅芯(冰則冰藍芯) |
| 穿透箭光束 | `drawPierceBeam(ctx, s)` | x1, y1, x2, y2, age, duration | 寬 28 黃光 + 白芯, 越到結束越淡 |
| 範圍斬擊 | `drawAreaHit(ctx, s)` | kind, x, y, radius, angle, age, duration | whirl: 三道紅白弧斬轉一圈; frostSmash: 冰藍環擴到外緣 + 冰屑; **charge: 0~0.25 白色實心星爆(內含粉紫星)+ 深框粉紫粗環外擴 + 朝 angle 噴出的 5 道白色衝擊線(中央最粗最長)** |
| 擊中火花 | `drawHitSpark(ctx, s)` | x, y, age, duration | 6 道黃白短線外擴 + 白點 |
| 搶奪連線 | `drawStealLink(ctx, s)` | x1, y1, x2, y2, progress | 金色鋸齒鏈(深色襯底), progress 越高越粗越亮; 白光球從敵人那格往玩家移動 |
| 組合名稱 | `drawComboName(ctx, s)` | x, y, name, isNew, age, duration | 一般: 暗底淡紫邊膠囊 + 白字 14px; isNew: 「新組合! 名稱」暗金底金邊金字 18px; 先彈 1.2 倍, 中心 +4 → −7 飄, 最後 40% 淡出 |
| 出怪點預警 | `drawSpawnWarning(ctx, s)` | x, y, angle, remaining, total | 閃爍紅光圓 + 中央白色秒數 + 外圈「這一秒」紅環 + 依 angle 指向前進方向的箭頭 |
| 新手教學泡泡 | `drawTutorial(ctx, s)` | stage, text, keys, pressedKeys, tipX, tipY, side, bodyX, bodyY, doneAge, doneDuration | 淺紙色底 + 深墨框圓角泡泡 + 指向尖端的三角箭頭; 內框琥珀色原地呼吸; 文字 17px 深墨字(本體中心 −14, 無鍵時置中); 鍵列(本體中心 +16): 方向鍵畫箭頭、Z / X 畫字母、空白鍵寬 52 寫「空白」; pressedKeys 裡的鍵 = 綠面 + 右下小勾; 完成特效見判讀約定 |
| HUD | `drawHud(ctx, s)` | level, levelName, gold, castleHp, castleMaxHp, wave, totalWaves, nextWaveIn, clockPaused, combos, muted | 版位照介面: 「第 N 關」+ 關名(x 16)、金幣(230)、心形 + 主堡 n / 20(350, ≤ 30% 轉紅)、「波次」n / N(500)、「下一波」N 秒(640, ≤ 6 轉橘; clockPaused 時改藍字「準備中」; −1 不顯示)、「組合」+ 5 格(780 / 840+32i; true 畫組合圖示, false 暗格虛線)、喇叭(1010, muted 紅叉)、右側操作提示 |
| 慢動作效果 | `drawSlowMo(ctx, s)` | (無) | 全畫面去色 + 冷藍罩 + 暗角 + 冰藍邊框 + (640,80)「慢動作」與 ▶▶ |
| 拿取 / 替換彈窗 | `drawSoulPopup(ctx, s)` | mode, x, y, w, h, title, slots, index, hand, actionLabel, shakeAge, shakeDuration | take: 深藍底藍灰細邊, 格子與手上格之間一條細分隔線; replace: 暗褐底 + 橘色粗邊 + 標題淡橘 + 分隔處畫橘色雙向互換箭頭; 游標 = 金色粗框 + 呼吸金光; 左下 actionLabel(金字), 右下「Z 確定  X 關閉」; 無效時左右抖動 ≤ 6px。已刪丟下格 |
| 商店彈窗 | `drawShopPopup(ctx, s)` | items, cursorIndex, message, shakeAge, shakeDuration | 同底版 |
| 結算畫面 | `drawResult(ctx, s)` | win, allClear, level, levelName, wave, totalWaves, castleHp, castleMaxHp, stars, starAge, starDuration, comboCount, options, cursorIndex | 全畫面暗罩 + 680×440 面板; 勝利金框金字「勝利」/ 第 5 關「全部通關!」, 失敗紅框紅字「主堡被攻陷」; 關名; 3 顆星(亮的依序在 0 / 0.4 / 0.8 秒跳出, 彈到 1.3 倍再回; 未亮 = 暗底灰框空星); 兩行數據; 按鈕: 選中 = 金底深字 + 亮框 + 外圈淡金, 其他深藍底; 底部「← → 選  Z 確定」 |

物品字串: 基本 ranged / melee / frost / seek / march / drum, 其他 slotStone / crossbowKit / pillarKit / soldierKit / golemKit(材料 = 木箱底 + 該單位小圖)。組合 pierce / iceArrow / whirl / frostSmash / charge 只用在 HUD 組合圖示。

## 尺寸表

| 物件 | 判定框 size | 實際繪製 |
|---|---|---|
| 開始畫面 | 1280×720 | 標題中心 (640,170) 76px; 卡片 200×150 中心 (200/420/640/860/1080, 400), 選中 212×159; 提示 (640,650) 22px; 喇叭 (1230,40) 36×36 |
| 魂柱範圍 | 300×300 | 外緣半徑 150 |
| 主堡 | 112×112 | 本體 x −56~+51(左緣城門到 −56), y −56~+52; 攻擊上移 3px; 主堡區圈半徑 110 與鍵帽(中心 (x−48, y+74), 約 44×19, 最遠角離中心 109)是允許的框外例外 |
| 弩塔 | 48×48 | 底座 44×44 |
| 魂柱 | 36×36 | 柱 + 晶石 + 光芒都在框內(光芒最高 y−18) |
| 步兵 | 32×32 | 血條中心 (x, y−22) 寬 32 高 4; 衝鋒速度線 / 歸隊拖尾到框外右側 ≤ 12px |
| 石魔像 | 56×56 | 血條中心 (x, y−34) 寬 56 高 4; 拖尾同上 |
| 潰散 | 步兵 96×96 / 石魔像 120×120 | 魂光頭最遠到框邊內 2px |
| 敵人 | 小鬼 / 弓鬼 / 冰鬼 32、鼓鬼 36、狂鬼 44 | 血條中心 (x, y−高/2−6); 暈眩星在框內上半部(最高 y−高/2+0.8) |
| 屍體 | 同敵人 | 剩餘時間細條在框內底部 |
| 地上的魂件 | 28×28 | 圖示 20; 彈出位移 ≤ 22px、閃光半徑 ≤ 24 |
| 金幣 | 16×16 | 半徑 7 |
| 玩家 | 32×32 | 身體半徑 14.5; 手上物品框 (x+17~x+39, y−11~y+11); 搶奪環外緣 24 |
| Z 情境提示 | 96×22 | 底板寬 48~96(依字長)× 22; Z 鍵 16×16 在底板左緣 +4 |
| 放置預覽 | 弩塔 / 魂柱 48、步兵 32、石魔像 56 | 魂柱範圍虛線圈外緣 150 |
| 魂件槽列 | 單格 20 | 實體格 18 / 格距 20; 虛魂件格 14 / 格距 16, 起點 = 實體列右緣 + 6, 最寬 48px |
| 冰霜範圍 | 140×140 | 外緣 70 |
| 投射物 | 10×10 | 箭長 10 |
| 範圍斬擊 | 120×120 | 外緣 = radius(60 / 30) |
| 擊中火花 | 24×24 | 半徑 ≤ 11 |
| 組合名稱 | 200×36(首次 280×48) | 底板高 20(首次 31), 字 14px(首次 18px) |
| 出怪點預警 | 64×64 | 光圓半徑 31, 箭頭尖端半徑 31.5 |
| 新手教學泡泡 | 300×72 | 本體 300×72(框線往內); 箭頭長 = 本體邊到尖端, 底寬 22; 鍵 26×26(空白鍵 52×26)間距 6; 完成特效放大 1.15 倍(345×83)屬允許例外 |
| HUD | 1280×50 | 組合格 26×26; 喇叭 28×28 |
| 拿取 / 替換彈窗 | w × 116(w = 168~312) | 抖動 ±6px 例外 |
| 商店彈窗 | 760×150 | 抖動 ±6px 例外 |
| 結算畫面 | 1280×720 | 面板 (300,150)~(980,590); 星 56×56(跳出時至多 1.3 倍); 按鈕 170×50 |

## 交付自查紀錄

- `node --check` 通過。
- 用會追蹤變換矩陣與剪裁的假 ctx(arc / ellipse 依實際角度取樣)呼叫介面全部 32 個函式共 1907 次: 每關 paths、開始畫面各游標 / 解鎖組合、每個教學階段 × 4 種尖端位置 × 完成進度 0~0.6、潰散 0~0.5 每 0.02 秒、衝鋒 4 個方向、暈眩、歸隊、兩種彈窗 × 1~4 格, 外加壞狀態(空物件、undefined、null、NaN、表外字串、負時間、極大座標)。結果: 不拋錯、save/restore 成對, 除上表列明的允許例外外沒有超出 size。
- 自查中修了兩處沿用自底版的超框: 魂柱放射光頂端超框 4px(改成 6 道不朝正上下的光)、我方箭尾超框 1px。
- 介面每個 state 欄位都有被讀到, 只有 drawTutorial 的 `stage` 刻意不讀(見判讀約定)。
- 匯出表只有介面上的 32 個函式, 沒有多出來的(drawGuidePage 已刪)。
