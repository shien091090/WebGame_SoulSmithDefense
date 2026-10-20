# 魂匠守衛者 美術規格(打磨第 2 輪, 沿用打磨第 1 輪)

> RD 只讀這份。`index.html` 必須宣告 `<meta charset="utf-8">`, 否則 art.js 的中文字會變亂碼。
> art.js 是一般 script(不是 module), 載入後提供 `window.Art`。全部 Canvas 2D 幾何繪製, 沒有外部資源; 字型只用系統字型(微軟正黑體 → 蘋方 → sans-serif)。
> 函式名、參數、state 欄位全部照 interface.json, 一個不多一個不少(共 35 個函式)。本輪新增 `drawShopZone`、`drawRespawnQueue`、`drawRallyFlag`; 沒有刪除函式。

## 邏輯畫布尺寸

`window.Art.canvas = { width: 1280, height: 720 }`(= interface.json)。HUD 0~50, 遊戲區 y 50~720。

## 色票表

`window.Art.palette` 裡的名稱(沿用上一版; 刪掉 slotStone, 新增最後 5 列):

| 名稱 | 色碼 | 用途 |
|---|---|---|
| grass / bg / grassDark | #2e4733 / #2e4733 / #27402c | 草地底色與斑點 |
| grid | rgba(255,255,255,0.05) | 蓋塔格線(極淡, 路面蓋掉) |
| path / pathEdge / pathLight | #9a8158 / #6a5535 / #ad9469 | 路面 / 路邊 / 路中央磨損帶(不透明) |
| ally / allyDark / allyRim | #5b8fe0 / #2f4f86 / #cfe0ff | 我方單位藍邊、主堡旗、集結旗 |
| enemy 等 | #b23a52(小鬼)、弓鬼 #963a86、冰鬼 #5a5aa8、鼓鬼 #8a4a3a、狂鬼 #7e1a30; 外描 #3a0d1a; 眼 #ffb347 | 敵人「鬼」 |
| player / playerRim / playerCloak | #fff1c9 / #ffb020 / #e0902a | 玩家魂匠(全場唯一奶白金邊圓) |
| neutral / neutralDark | #8d8b84 / #55534e | 中立石魔像 |
| stone / stoneDark | #8d93a3 / #5d6272 | 主堡、弩塔石材 |
| ranged / melee / frost / seek / march / drum | #f2c94c / #ef5350 / #8fd8ff / #6ad05a / #a77bff / #e57ad0 | 六種基本魂件意象色(遠攻 / 近戰 / 冰霜 / 自動索敵 / 進攻主堡 / 行軍) |
| combo | #ffd24a | 組合魂件的金邊八角、組合魂柱晶石的金框、組合虛魂件的金色虛線框 |
| resonance | #e3d4ff | 共鳴微光(弩塔、兵、**玩家**)、一般組合名稱的邊 |
| target | #ffffff | 互動目標外框 |
| cursor / gold / coin | #ffd24a / #ffd24a / #ffcc33 | 游標框、金幣數字、金幣 |
| valid / invalid | #5fe07a / #ff4a4a | 放置預覽可 / 不可 |
| allyShot / enemyShot | #fff3b0 / #ff4d7a | 我方箭 / 敵方彈 |
| slowmo | #9fd4ff | 慢動作冷色邊框 |
| hud / panel / descPanel | #161b26 / #1d2331 / #2b3347 | HUD 底、彈窗底、彈窗說明區(比面板亮一階) |
| soulLight | #cfe0ff | 兵「歸隊中」拖尾、「潰散」魂光、**重生中圓盤** |
| swap | #ff9a4a | 替換彈窗的橘邊與互換箭頭 |
| stun | #ffe14a | 敵人暈眩星星 |
| tutorPaper / tutorInk / tutorAccent / tutorDone | #fff4d6 / #2a2016 / #e0902a / #2fae4e | 教學泡泡專用(全畫面唯一淺紙底) |
| keyFace / keyBase / keyInk / keyPressed | #ece7da / #3a3f4c / #1e2230 / #8fe6a0 | 鍵帽(全畫面同一套) |
| **shop / shopDeep** | #ffb84a / #3b2410 | 新: 「購買」魂件徽章(圓形深褐底 + 粗金環 + 金色攤位)、地上購買的光座 |
| **shopZone** | #ffcf70 | 新: 購買區地面圈(長虛線) |
| **neutralTag / neutralInk** | #3e3d39 / #d9d6cb | 新: 中立石魔像的「中立」小牌(深灰底灰白字) |
| **optionCell** | #2f2a22 | 新: 單位選單的選項格(拆除 / 重設集結點)暖褐底 |

**色相張力(請製作人驗收)**:
- 六種魂件色排滿色輪, 最近兩對 近戰—遠攻 44°、近戰—行軍 49°, 魂件辨識主通道是圖示形狀, 顏色第二通道(沿用)。
- **新的最差組合: 購買區(金 #ffcf70)與遠攻魂柱範圍(黃 #f2c94c)同一個色名**, 開局主堡在第 1 關魂柱建議位置附近時會同框。兩者靠線型分: 購買區 = 長虛線(12/7)單圈 + 極淡填色; 遠攻魂柱 = 實線外圈 + 內側細點線; 組合魂柱 = 雙實線。驗收用「遠攻魂柱範圍和購買區重疊」那一幀。
- 「購買」徽章的金和組合魂件的金邊同色系: 靠外形分(購買 = 全場唯一的圓形徽章 + 深褐實心底; 組合 = 八角 + 兩色斜分)。

## 形狀語言

我方 = 帶藍邊的圓角方塊; 敵人 = 下緣波浪的「鬼」剪影 + 橘眼; 玩家 = 全場唯一的奶白金邊圓; 基本魂件 = 單色圓角方塊 + 深色線圖示; 組合魂件 = 金邊八角 + 兩件材料色斜分; 購買 = 圓形金環徽章; 借來的魂件 = 小一號虛線框半透明; 選單的選項格 = 暖褐大圓角格; 教學 = 全場唯一淺色紙底的泡泡; 扁平無外光, 只有範圍淡染與魂光用漸層。

## 理念落實

- P0 辨識度先於好看: 我方 / 敵 / 玩家 / 中立 用剪影分(方塊 / 鬼 / 圓 / 灰無邊方塊 + 「中立」牌); 魂件三類用三種外形分(方塊 / 八角 / 圓徽章), 18px 小格裡也分得出。
- P1 視覺權重跟著決策迫切度走: 地面層(購買區、魂柱範圍、冰霜圈)都 ≤ 12% 淡染, 購買區只有玩家站進去時才變亮並長出空白鍵鍵帽; 最亮的是互動目標白框、游標金框、出怪預警與教學泡泡; 重生中提示是半透明小底板。
- P2 規則上存在的東西畫面上就存在: 地上魂件的剩餘時間(底部細條 + 最後 3 秒閃爍)、購買不會消失(金色光座、沒有剩餘條)、重生排隊人數、集結旗立到兵走到為止、建築也會衝鋒(速度線)、附冰(冰藍 + 冰屑); 範圍外緣 = 判定邊界。
- P3 一個意義一種長相: 魂件圖示全畫面同一函式(槽列 / 地上 / 手上 / 彈窗 / 說明區材料); 同一面集結旗畫在地上、玩家手上、放置預覽、選單「重設集結點」格; 鍵帽全畫面同一套; 「快消失」的閃爍節奏地上魂件與屍體共用; 我方的魂一律 soulLight(潰散、歸隊、重生圓盤); 附冰一律「冰藍 + 小菱形冰屑」; 「多一圈外框 = 組合」用在圖示、魂柱範圍(雙實線)、晶石(金框)、虛魂件(金虛線)。
- P4 關鍵區分走兩條通道: 選單 vs 替換 = 藍灰細邊 + 細分隔線 vs 橘粗邊 + 互換箭頭; 魂件格 vs 選項格 = 深藍黑小圓角 + 虛線空格 vs 暖褐大圓角實線框 + 下方小字; 購買區 vs 遠攻魂柱範圍 = 金長虛線 vs 黃實線; 附冰 vs 一般 = 冰藍色 + 冰屑形狀; 中立牌 vs 敵我 = 深灰 + 字。
- P7 每個元素都要掙得版面: HUD 拿掉組合區塊(使用者回饋); 魂柱上限只在商店魂柱格顯示; 購買區鍵帽只在站進去時出現; Z 提示只有鍵 + 動詞; 說明區沒有游標魂件時留空。
- P9 以最混亂的那一刻驗收: 互動目標純白粗框; 所有文字有深色底板或描邊; 教學泡泡在滿場時靠「全場唯一淺底」被找到; 附冰在一團火花裡靠冰屑的形狀被認出。
- P13 事件要排隊: 教學一次一個泡泡, 完成特效 0.6 秒播完才換下一個(由 RD 排); 組合名稱 1.5 秒內淡出。
- P15 回饋強度與份量成正比: 火花(12)< 範圍斬擊(60)< 衝鋒撞擊(實心星爆 + 粗環 + 衝擊線)< 穿透光束; 一般組合名 < 首次「新組合!」; 附冰只加冰藍與冰屑, 不放大範圍。
- P17 進度圖形與數字分工: 出怪預警中央數字 = 剩餘秒數, 外環只畫這一秒; 搶奪環沒有數字, 畫總進度; 重生圓盤畫排頭這一隻的 5 秒, 「×N」是人數(圖形和數字講不同的量)。
- P18 重要資訊不只存在一瞬間: 首次組合名稱只閃 1.5 秒, 但組合魂件留在槽上、選單說明區寫出名稱與兩件材料; 結算畫面留存組合數與星數。
- P19 資訊貼著物件: 槽列貼單位頭上、Z 提示貼玩家腳下、教學泡泡箭頭尖端貼被指物件或彈窗側邊、購買區鍵帽畫在圈內、中立牌掛在石魔像腳下、魂柱上限貼在商店魂柱格角落。
- P21 示意圖選分岔的例子: 本輪沒有說明頁; 教學泡泡指著實物, 不另畫示意圖。

## 繪製層級(照 interface.json drawOrder)

開始畫面: 只呼叫 drawTitle。關卡中: drawBackground → drawShopZone(有購買區時)→ drawPillarRange → drawResonanceLine → drawFrostAura → drawRallyFlag → drawCoin → drawCorpse → drawGroundPart → drawPlacePreview → 單位與敵人與玩家(依 y)→ drawSoulSlots → drawRespawnQueue → drawProjectile → drawPierceBeam → drawAreaHit → drawHitSpark → drawUnitBreak → drawStealLink → drawComboName → drawSpawnWarning → drawActionHint → drawTutorial(指著場上物件時)→ drawHud → drawSlowMo → drawSoulPopup / drawShopPopup → drawTutorial(貼著彈窗, side left / right)→ drawResult。

## 判讀約定

- 時間欄位: 0 ≤ Age < Duration 才播; Age ≥ Duration 或欄位缺漏 = 閒置。缺 Duration 時用介面預設(攻擊 0.15、受擊 0.2、主堡受擊 0.3、魂柱波紋 0.5、插旗 0.3、地上魂件彈出 0.6、潰散 0.5、暈眩 1.0、穿透 0.15、範圍 0.3、火花 0.25、組合名 1.5、抖動 0.25、教學完成 0.6、星星 1.2)。
- 半徑一律指外緣: 購買區 110、魂柱範圍 150、冰霜圈 70、旋風斬 / 冰霜重擊 60、衝鋒 30、搶奪環 24(環寬 4 往內)、重生圓盤 15(環寬 4 往內)。線寬往內畫。
- 穿透光束: 最寬層 28 = 判定寬, 兩端平頭不外伸; 附冰的冰屑在中線 ±9 內。
- 出怪預警數字 = ceil(remaining); 外環 = remaining − (數字 − 1)。
- **kinds / kind 只認攻擊類**(遠攻、近戰、冰霜與四種攻擊組合): 傳入移動類、購買或表外字串時, 魂柱範圍 / 晶石畫成空的、共鳴線畫白色。kinds 只讀第 0 項。
- **組合魂件的「融合色」**: 兩件材料色; 同材料組合(穿透箭 = 遠攻 + 遠攻、旋風斬 = 近戰 + 近戰)第二色取材料色的淡色(往白混 55%), 否則和基本魂件同色。組合範圍靠「12 扇兩色交替 + 雙實線外框」和基本範圍(單色 + 實線 + 內側點線)分開。
- **地上魂件閃爍**: life < 3 時每 0.25 秒在 30% / 100% 不透明間切換(和屍體同一個函式); 剩餘細條在框內底部(y+12~14), 寬 = 22 × life / maxLife, < 3 秒轉紅。permanent 為 true 時忽略 life, 不閃、不畫細條, 改畫金色光座。
- **集結旗插下**: 0~0.135 秒旗子從上方 5px 往下戳, 同時由 0.875 倍長到 1 倍(頂端始終不超出 y−40); 0.09 秒起地面一圈塵土外擴淡出(最多到框外 8px)。
- **衝鋒(弩塔、魂柱、兵)**: 本體前傾(斜切 0.12 + 縮 0.85 倍)+ 身後**右側** 3 條白色速度線(框外 ≤ 12px)。介面沒傳衝鋒方向, 預設單位往出怪點(畫面左邊)衝; 第 4 關從下 / 上衝時速度線仍在右側, 若試玩讀成「方向不對」請製作人加方向欄位。
- **玩家共鳴出手**: 本體往右推 3px + 身體外緣一圈白光(長在本體上), 0.15 秒。
- drawTutorial: `stage` 刻意不讀(外觀只由 text、keys、pressedKeys、side 決定)。箭頭長 = 本體邊到尖端, 底邊寬 20; up / down 時底邊中心 x = tipX 但夾在本體中心 ±136 內; left / right 時底邊在本體右 / 左緣(x = ±150), 中心 y = tipY 夾在 ±24 內。完成特效: 0~0.18 秒整個泡泡(含箭頭)以本體中心放大到 1.15 倍, 0~0.12 秒浮出紙色罩 + 大綠勾, 0.27 秒起淡出到 0.6 秒消失; 放大時尖端會離開原尖端至多 20×0.15 = 3px(介面要求以本體中心為軸, 照做)。**上一版底邊寬 22, 本輪改回介面的 20。**
- drawSoulPopup: 版位全部照介面(標題 (0,−70)、格子 (−120+48i, −30)、手上格 (116,−30)、分隔線 x = 70、說明區 y 10~62、底部 y 78)。介面寫說明區是「淺色底板」, 但「全畫面唯一淺底」是教學泡泡的字典詞(P3), 所以說明區只比面板亮一階(#2b3347, 替換彈窗用 #3a302a), 字是白 / 淡灰。cells 的項目若是字串(舊格式)也接受, 當成魂件格。
- drawShopPopup: 魂柱格「已有 / 上限」只在 count、cap 都是數字時畫; state "max" = 圖示與品名變暗、count/cap 與價格標紅灰。
- drawActionHint: 底板寬依字長, 48~96; 「不能蓋」「不能插」= 紅底紅框紅字 + Z 鍵變淡。
- drawTitle: 選中的卡片最後畫、放大 1.06 倍 + 金框 + 金色外光; 「[Z] 開始」那組隨 blinkTime 閃爍。
- 表外值的預設外觀: 敵人 / 屍體種類未知 → 小鬼; drawAreaHit kind 未知 → 旋風斬; drawPlacePreview kind 未知 → 弩塔; drawUnitBreak / drawRespawnQueue kind 未知 → 步兵; drawGolem team 不是 "ally" → 中立; drawTutorial side 未知 → up; 物品字串未知 → 只畫一個虛線空框; 商店品項缺漏 → 鎖住格; 教學 keys 的表外值 → 略過; drawSoulPopup mode 非 "replace" → 選單; cells 空 → 一格空魂件格; drawResult options 空 → [重來, 標題]。
- 時間性小動畫(呼吸、流動光點、雪點、暈眩星繞圈、魂光拖尾、購買光座脈動、購買區虛線緩轉)用 `performance.now()` 自己跑, 不影響狀態。
- drawSlowMo 用 `saturation` 合成模式去色, 刻意作用於整張畫布(全畫面效果); 其他函式一律 source-over。

## 畫面文字歸屬

依介面 textOwnership, 下列文字與鍵帽都由美術畫, **RD 不要另畫**: drawTitle(大標題、「第 N 關」、關名、星、鎖、「[←][→] 選關  [Z] 開始  [X] 靜音」)、drawGolem(中立時的「中立」牌)、drawRespawnQueue(「重生中」、「×N」)、drawShopZone(圈內的空白鍵鍵帽)、drawComboName、drawActionHint(Z 鍵帽 + label)、drawSoulPopup(標題、「手上」、選項格下的「+N 金」/「移防」、說明區名稱 / 材料 / 說明、actionLabel、「[Z] 確定  [X] 關閉」)、drawShopPopup(「商店」、品名、價格、已有 / 上限、底部訊息、「[←][→] 選  [Z] 購買  [X] 關閉」)、drawHud(「第 N 關」+ 關名、金幣、主堡 n / 20、「波次」n / N、「下一波」N 秒 /「準備中」、喇叭、「[Z] 互動  [空白] 商店  [X] 靜音」)、drawSlowMo(「慢動作」)、drawResult(標題、關名、波次與主堡、組合數、按鈕文字、「[←][→] 選  [Z] 確定」)、drawTutorial(提示文字、按鍵鍵帽、已按過的綠面打勾、完成特效; 文字內容由 RD 傳 text)。

## 物件表

所有 x, y 是物件中心(集結旗例外: 旗桿插地點); `targeted: true` 時在 size 外畫一圈白框(內緣貼齊 size 外邊, 寬 3, 輕微呼吸)。

| 物件 | 函式 | state 欄位 | 各狀態視覺差異 |
|---|---|---|---|
| 開始畫面 | `drawTitle(ctx, s)` | levels[{name, unlocked, bestStars}], cursorIndex, muted, blinkTime | 草地 + 三叉路線 + 暗罩; 兩側裝飾魂柱(遠攻 / 冰霜); 金色大標題(微動 2px); 5 張卡片: 解鎖 = 深藍底 + 「第 N 關」+ 關名 + 3 顆星(亮 bestStars 顆); 未解鎖 = 更暗、灰鎖、灰關名、無星; 選中 = 1.06 倍 + 金框 + 金光; 底部鍵帽提示, [Z] 開始閃爍; 右上喇叭(muted 紅叉) |
| 背景 | `drawBackground(ctx, s)` | paths | 草地 + 淡格線 + 依 paths 畫路(三層不透明, 共用段無接縫; 入口暗化 + 路標石) |
| **購買區** | `drawShopZone(ctx, s)` | x, y, radius, active | 新。暖金長虛線圈 + 極淡金填色(4.5%), 虛線緩慢轉動; active: 線變粗變亮、填色 11%, 圈內 (x, y+86) 畫空白鍵鍵帽 44×22 |
| 魂柱範圍 | `drawPillarRange(ctx, s)` | x, y, radius, kinds, changeAge, changeDuration | 0 件: 淡白虛線空圈; 基本攻擊魂件: 意象色 9% 淡染 + 實線外圈 + 內側點線; 組合魂件: 12 扇兩材料色交替淡染 + 雙實線外框; 換魂件時波紋從中心擴到外緣 0.5 秒 |
| 共鳴線 | `drawResonanceLine(ctx, s)` | x1, y1, x2, y2, kind, active | false: 意象色 35% 細線(寬 1.2); true: 寬 3 + 白芯 + 往接收者流動的白點; 組合魂件另疊第二材料色的虛線段 |
| 主堡 | `drawCastle(ctx, s)` | x, y, hitAge, hitDuration, attackAge, attackDuration, targeted | 雙塔石堡 + 頂旗 + 正面藍軍旗 + 左緣木城門; 受擊整體紅閃; 攻擊上移 3px。**本輪不再畫主堡區圈與鍵帽**(改由 drawShopZone) |
| **重生中提示** | `drawRespawnQueue(ctx, s)` | x, y, kind, progress, count | 新。半透明深底板 132×36 + 淡藍細框; 左圓盤: 深底 + 淡環, progress 以 soulLight 從正上方順時針填滿, 中央排頭小圖示(步兵 / 石魔像); 「重生中」淡藍字; 右邊「×count」白字(兩位數、三位數照實寫) |
| 弩塔 | `drawCrossbow(ctx, s)` | x, y, attackAge, attackDuration, moving, charging, resonating, targeted | 藍邊石座 + 木弩; 攻擊後座 3px; moving: 底部輪子; **charging: 前傾 + 右側 3 條速度線(+ 輪子)**; resonating: 框內淡紫光圈 |
| 魂柱 | `drawPillar(ctx, s)` | x, y, kinds, moving, charging, targeted | 石柱 + 頂端菱形晶石; 基本攻擊魂件: 晶石染意象色 + 6 道短光; 組合: 晶石兩色 + 金框 + 兩色光; 沒有: 晶石灰、不放光; **moving: 底座兩顆小輪; charging: 前傾 + 右側速度線** |
| 步兵 | `drawSoldier(ctx, s)` | x, y, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, charging, resonating, returning, targeted | 藍色方身 + 頭盔 + 劍盾; 受擊白閃; 攻擊左衝 3px; moving 輕跳; charging: 前傾 + 右側速度線; resonating: 框內淡紫光圈; returning: 42% 透明 + 淡藍虛線框 + 右側魂光拖尾, 不畫血條; 血條只在 hp < maxHp 且非歸隊時畫 |
| 石魔像 | `drawGolem(ctx, s)` | x, y, team, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, charging, resonating, returning, targeted | "neutral": 灰石暗眼無藍邊 + **腳下吊著「中立」牌(深灰底灰白字, 兩條吊繩)**, 忽略 charging / resonating / returning / 血條; "ally": 藍灰石 + 藍邊 + 亮眼 + 胸口符文, 不畫牌; 其餘同步兵 |
| **集結旗** | `drawRallyFlag(ctx, s)` | x, y, plantAge, plantDuration | 新。木旗桿 + 金色桿頭 + 往右飄的藍色燕尾旗 + 淡藍菱形徽; 地面小影子; 插下時往下一戳 + 塵土圈(見判讀約定) |
| 潰散 | `drawUnitBreak(ctx, s)` | kind, x, y, age, duration | 沿用。本體縮小淡出 + 中心白光; 6 道藍白魂光往右(主堡方向)飛到框邊; 不留東西 |
| 敵人 | `drawEnemy(ctx, s)` | type, x, y, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, slowed, stunAge, stunDuration, targeted | 沿用。鬼剪影 + 橘眼; 受擊白閃; 攻擊右移 3px; moving false: 頭上黃「?」; slowed: 冰藍色調 + 白外描; 暈眩: 頭頂 3 顆黃星繞圈(問號不畫) |
| 屍體 | `drawCorpse(ctx, s)` | kind, x, y, life, maxLife, targeted | 沿用。扁倒的灰色鬼 + 叉眼; 框內底部細條 = life / 15; life < 3 時閃爍、細條轉紅 |
| 地上的魂件 | `drawGroundPart(ctx, s)` | item, x, y, spawnAge, spawnDuration, life, maxLife, permanent, targeted | 圖示 20px + 地影 + 白點線圈 + 輕微浮動 + **框內底部剩餘細條**; **life < 3: 閃爍、細條轉紅**; **permanent(購買): 金色光座(36×36 內)+ 金環 + 緩慢脈動, 沒有白點線圈與細條, 不閃**; 彈出中: 從右上彈出落地 + 白光 |
| 金幣 | `drawCoin(ctx, s)` | x, y | 金色圓幣 |
| 玩家 | `drawPlayer(ctx, s)` | x, y, moving, handItem, holdingFlag, stealing, stealProgress, resonating, attackAge, attackDuration | 奶白圓身 + 金橘邊 + 兜帽 + 錘徽; moving 輕跳; handItem: 右側淡光底 + 18px 圖示 + 兩隻小手; **holdingFlag: 只畫舉在右側的集結旗(0.85 倍, 一隻手握桿), 不畫 handItem**; stealing: 繞身金色進度環; **resonating: 身上一圈淡紫微光(框內)**; **出手: 往右推 3px + 身體外緣白光**; 頭上不畫槽列 |
| Z 情境提示 | `drawActionHint(ctx, s)` | x, y, label | 半透明深色小底板 + 左側 16px Z 鍵帽 + 白色 label; 「不能蓋」「不能插」= 紅底紅框淡紅字、Z 鍵變淡; label 空字串不畫 |
| 放置預覽 | `drawPlacePreview(ctx, s)` | kind, x, y, valid | crossbow / pillar: 48×48 格子框 + 半透明輪廓, 綠 / 紅 + 紅叉; pillar 另畫半徑 150 虛線圈; **flag: 玩家腳下(插地點 (x, y+16))半透明綠 / 紅旗 + 插地點虛線小圈, 不可插時旗面上紅叉** |
| 魂件槽列 | `drawSoulSlots(ctx, s)` | x, y, slots, virtual | 實體 18px 暗底格, 空格虛線; 基本 / 組合 / 購買三種外形; 虛魂件 14px 半透明虛線框, used 白框較亮, 組合虛魂件斜分兩色 + 金色虛線框; > 3 項畫前 2 + 「+N」 |
| 冰霜圈 | `drawFrostAura(ctx, s)` | x, y, radius, owner | 沿用。ally: 冰藍淡染 + 實線圈 + 白雪點; enemy: 粉紅淡染 + 虛線圈 + 粉雪點 |
| 投射物 | `drawProjectile(ctx, s)` | x, y, angle, kind, owner | 沿用。ally normal: 黃白箭; ally ice: 冰藍箭 + 白箭頭 + 尾端白叉; enemy: 深紅圓彈 + 粉紅芯(冰則冰藍芯) |
| 穿透箭光束 | `drawPierceBeam(ctx, s)` | x1, y1, x2, y2, frost, age, duration | 一般: 寬 28 黃光 + 淡黃芯 + 白芯; **frost: 寬 28 冰藍光 + 淡藍芯 + 白芯 + 沿線左右交錯的冰屑**; 越到結束越淡 |
| 範圍攻擊 | `drawAreaHit(ctx, s)` | kind, x, y, radius, angle, frost, age, duration | whirl: 三道紅白弧斬轉一圈 + 紅淡染; **whirl frost: 淡染改冰藍、白芯改淡藍、每道斬擊內側多一道冰藍弧 + 冰屑**; frostSmash: 冰藍環擴到外緣 + 冰屑(frost 一律忽略); charge: 白色星爆(粉紫芯)+ 深框粉紫粗環 + 朝 angle 的 5 道衝擊線; **charge frost: 星芯與環換冰藍、反方向噴 4 顆冰屑** |
| 擊中火花 | `drawHitSpark(ctx, s)` | x, y, frost, age, duration | 6 道黃白短線外擴 + 白點; **frost: 短線改冰藍 + 3 顆冰屑** |
| 搶奪連線 | `drawStealLink(ctx, s)` | x1, y1, x2, y2, progress | 沿用。金色鋸齒鏈, progress 越高越粗越亮; 白光球從敵人往玩家移動 |
| 組合名稱 | `drawComboName(ctx, s)` | x, y, name, isNew, age, duration | 沿用。一般: 暗底淡紫邊膠囊 + 白字 14px; isNew: 「新組合! 名稱」暗金底金邊金字 18px; 先彈 1.2 倍, 中心 +4 → −7 飄, 最後 40% 淡出 |
| 出怪點預警 | `drawSpawnWarning(ctx, s)` | x, y, angle, remaining, total | 沿用。閃爍紅光圓 + 中央秒數 + 外圈「這一秒」紅環 + 依 angle 的箭頭 |
| 新手教學泡泡 | `drawTutorial(ctx, s)` | stage, text, keys, pressedKeys, tipX, tipY, side, bodyX, bodyY, doneAge, doneDuration | 淺紙色底 + 深墨框圓角泡泡 + 指向尖端的三角箭頭(**side 新增 left / right: 箭頭從本體右 / 左緣水平指向彈窗側邊**); 內框琥珀色原地呼吸; 文字 17px 深墨字(本體中心 −14, 無鍵時置中); 鍵帽列(本體中心 +16, 26×26, 空白 52×26, 間距 6); pressedKeys 裡的鍵 = 綠面 + 右下小勾; 完成特效見判讀約定 |
| HUD | `drawHud(ctx, s)` | level, levelName, gold, castleHp, castleMaxHp, wave, totalWaves, nextWaveIn, clockPaused, muted | 「第 N 關」+ 關名(x 16)、金幣(230)、心形 + 主堡 n / 20(350, ≤ 30% 轉紅)、「波次」n / N(500)、「下一波」N 秒(640, ≤ 6 轉橘; clockPaused 時藍字「準備中」; −1 不顯示)、**喇叭 (860,25)**、**右側鍵帽提示(右緣 1264)**; **組合區塊已拿掉** |
| 慢動作效果 | `drawSlowMo(ctx)` | (無) | 沿用。全畫面去色 + 冷藍罩 + 暗角 + 冰藍邊框 + (640,80)「慢動作」 |
| 單位選單 / 替換彈窗 | `drawSoulPopup(ctx, s)` | mode, x, y, title, cells, index, hand, actionLabel, desc, shakeAge, shakeDuration | 固定 320×180。menu: 深藍底藍灰細邊, x = 70 細分隔線, 手上格空; replace: 暗褐底 + 橘粗邊 + 淡橘標題 + 分隔處橘色互換箭頭, 手上格畫 hand。魂件格 = 深藍黑小圓角, 空格虛線; 選項格 = 暖褐大圓角 + 淡金實線框: 拆除畫鎚子 + 碎塊、下方金字「+N 金」; 重設集結點畫集結旗、下方淡橘字「移防」; 游標 = 金色粗框 + 呼吸金光; 說明區: 名稱(白 15px)、右側材料「[圖示] + [圖示]」、第二行說明(淡灰 13px), desc null 時只留底板; 左下 actionLabel(金字), 右下鍵帽「[Z] 確定  [X] 關閉」; 無效時左右抖動 ≤ 6px |
| 商店彈窗 | `drawShopPopup(ctx, s)` | items[{item, name, price, state, count, cap}], cursorIndex, message, shakeAge, shakeDuration | 480×150, 4 格: 木箱底 + 單位小圖 + 品名 + 金幣價格; poor: 變暗、價格紅; locked: 只畫鎖、價格灰; **max: 變暗、價格灰、count/cap 紅**; 魂柱格右上角小字「count/cap」; 游標 = 亮底 + 金框; 左下 message 紅字, 右下鍵帽提示 |
| 結算畫面 | `drawResult(ctx, s)` | win, allClear, level, levelName, wave, totalWaves, castleHp, castleMaxHp, stars, starAge, starDuration, comboCount, options, cursorIndex | 沿用, 底部提示改鍵帽。全畫面暗罩 + 680×440 面板; 勝利金框金字 / 全部通關 / 失敗紅框紅字; 3 顆星依序跳出(彈到 1.3 倍); 兩行數據; 選中按鈕金底深字 + 外圈淡金 |

物品字串(conventions.itemKinds): 基本 ranged / melee / frost / seek / march / drum = 單色方塊; 組合 pierce / iceArrow / whirl / frostSmash / charge = 金邊八角 + 兩材料色; shop = 圓形金環徽章 + 攤位圖; 材料 crossbowKit / pillarKit / soldierKit / golemKit = 木箱底 + 單位小圖。擴槽石已刪(傳 "slotStone" 會畫成虛線空框)。

## 尺寸表

| 物件 | 判定框 size | 實際繪製 |
|---|---|---|
| 開始畫面 | 1280×720 | 標題中心 (640,170) 76px; 卡片 200×150 中心 (200/420/640/860/1080, 400), 選中 212×159(和鄰卡仍有 14px 間隙); 鍵帽提示 (640,650) 鍵帽 22, 字 20px; 喇叭 (1230,40) 36×36 |
| 購買區 | 220×220 | 外緣半徑 110(線寬往內); 鍵帽中心 (x, y+86) 44×22, 最遠角離中心 99.5 |
| 魂柱範圍 | 300×300 | 外緣半徑 150 |
| 主堡 | 112×112 | 本體 x −56~+51, y −56~+52; 攻擊上移 3px |
| 重生中提示 | 132×36 | 底板 (x−66~x+66, y−18~y+18); 圓盤中心 (x−48, y) 外緣 15、環寬 4; 小圖示半徑 ≤ 11; 「重生中」左緣 x−28(13px); 「×N」右緣 x+60(15px, 最寬 40) |
| 弩塔 | 48×48 | 底座 44×44; 衝鋒速度線到 x+35(框外 11px) |
| 魂柱 | 36×36 | 柱 + 晶石 + 光芒 + 輪子都在框內; 衝鋒速度線到 x+29 |
| 步兵 | 32×32 | 血條中心 (x, y−22) 寬 32 高 4; 衝鋒速度線 / 歸隊拖尾到框外右側 ≤ 12px |
| 石魔像 | 56×56 | 血條中心 (x, y−34) 寬 56; 拖尾同上; 中立牌 40×18 中心 (x, y+40), 底 y+49 |
| 集結旗 | 24×40(x−4~x+20、y−40~y) | 旗桿在 x, 旗面 x+1~x+19.5; 插下塵土到框外 ≤ 8px |
| 潰散 | 步兵 96×96 / 石魔像 120×120 | 魂光頭最遠到框邊內 2px |
| 敵人 | 小鬼 / 弓鬼 / 冰鬼 32、鼓鬼 36、狂鬼 44 | 血條中心 (x, y−高/2−6); 暈眩星在框內上半部 |
| 屍體 | 同敵人 | 剩餘時間細條在框內底部 |
| 地上的魂件 | 28×28 | 圖示 20; 剩餘細條 (x−11~x+11, y+12~y+14); 購買光座半徑 ≤ 17(36×36 內); 彈出位移 ≤ 22px、閃光半徑 ≤ 24 |
| 金幣 | 16×16 | 半徑 7 |
| 玩家 | 32×32 | 身體半徑 14.5; 出手右推 3px; 手上物品框 (x+17~x+39, y−11~y+11); 舉旗 (x+17~x+38, y−23~y+11); 搶奪環外緣 24 |
| Z 情境提示 | 96×22 | 底板寬 48~96(依字長)× 22; Z 鍵帽 16×16 在底板左緣 +4, 字在鍵帽右側 +4 |
| 放置預覽 | 弩塔 / 魂柱 48、旗幟 24×40 | 魂柱範圍虛線圈外緣 150; 旗幟框 x−4~x+20、y−24~y+16 |
| 魂件槽列 | 單格 20 | 實體格 18 / 格距 20; 虛魂件格 14 / 格距 16, 起點 = 實體列右緣 + 6, 最寬 48px |
| 冰霜圈 | 140×140 | 外緣 70 |
| 投射物 | 10×10 | 箭長 10 |
| 穿透箭光束 | 線寬 28 | 最寬層 28, 冰屑在中線 ±12 內 |
| 範圍攻擊 | 120×120 | 外緣 = radius(60 / 30), 附冰的冰屑也在內 |
| 擊中火花 | 24×24 | 半徑 ≤ 11 |
| 組合名稱 | 200×36(首次 280×48) | 底板高 20(首次 31), 字 14px(首次 18px) |
| 出怪點預警 | 64×64 | 光圓半徑 31, 箭頭尖端半徑 31.5 |
| 新手教學泡泡 | 300×72 | 本體 300×72(框線往內); 箭頭長 20、底寬 20; 鍵帽 26×26(空白 52×26)間距 6; 完成特效放大 1.15 倍(345×83)屬允許例外 |
| HUD | 1280×50 | 喇叭 (860,25) 28×28; 右側提示鍵帽 22×22(空白 44×22), 鍵帽與字隔 4、組間隔 14, 總寬約 206, 左緣約 1058(≥ 900) |
| 單位選單 / 替換彈窗 | 320×180 | 格子 40×40(游標框 45×45); 選項格下方字 11px 在 y −7.5~3.5; 說明區 296×52; 底部鍵帽 22; 抖動 ±6px 例外 |
| 商店彈窗 | 480×150 | 格 80×72(游標框 85×77); 圖示 28; count/cap 11px 中心 (格 x+24, −32); 底部鍵帽 22; 抖動 ±6px 例外 |
| 結算畫面 | 1280×720 | 面板 (300,150)~(980,590); 星 56×56(跳出時至多 1.3 倍); 按鈕 170×50; 鍵帽提示 (640,560) |

## 交付自查紀錄

- `node --check` 通過。
- 用會追蹤變換矩陣與剪裁的假 ctx(arc / ellipse 依實際角度取樣、文字依字數估寬)呼叫介面全部 35 個函式共約 2.4 萬次: 每關 paths、開始畫面各游標 / 解鎖組合、12 種魂件 + 材料在槽列 / 地上 / 手上、地上魂件 life 10 / 2.8 / 2.6 與購買、彈出 0~0.6、集結旗插下 0~0.3、重生隊伍 1 / 9 / 12 / 123 人、建築與兵的衝鋒 / 移動 / 共鳴 / 歸隊、中立牌、教學 17 種提示 × 4 個方向 × 完成進度 0~0.6、選單與替換彈窗 × 6 種格子組合 × 說明有無 × 抖動、商店 4 種狀態組合 × 訊息、附冰的光束 / 斬擊 / 衝鋒 / 火花, 外加壞狀態(空物件、undefined、null、NaN、表外字串、極大座標、陣列欄位傳非陣列)。結果: 不拋錯、save/restore 成對、合成模式不殘留; 除上表列明的允許例外外沒有超出 size(背景與開始畫面的路線伸到畫布外由畫布裁掉; 穿透光束的報警是假 ctx 對平頭線端多算半個線寬)。
- 自查中修了一處新畫法超框: 集結旗插下時的塵土點往左超出 4px(縮短飛散距離)。
- HUD 右側提示左緣 ≥ 900、右緣 ≤ 1264 有自動檢查。
- 介面每個 state 欄位都有被讀到, 只有 drawTutorial 的 `stage` 刻意不讀(見判讀約定)。上一輪的 zoneActive、combos、w、h、slots(彈窗)已不再讀。
- 匯出表 = 介面的 35 個函式, 沒有多出來的。
