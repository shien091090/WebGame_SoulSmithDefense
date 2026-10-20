# 魂匠守衛者 美術規格(打磨第 3 輪, 沿用打磨第 2 輪)

> RD 只讀這份。`index.html` 必須宣告 `<meta charset="utf-8">`, 否則 art.js 的中文字會變亂碼。
> art.js 是一般 script(不是 module), 載入後提供 `window.Art`。全部 Canvas 2D 幾何繪製, 沒有外部資源; 字型只用系統字型(微軟正黑體 → 蘋方 → sans-serif)。
> 函式名、參數、state 欄位全部照 interface.json, 一個不多一個不少(共 42 個函式)。**本輪新增** `drawShopHint`、`drawHolyTrail`、`drawHealAura`、`drawHealBeam`、`drawThunderOrb`、`drawShockChain`、`drawBlink`; 沒有刪除函式。

## 邏輯畫布尺寸

`window.Art.canvas = { width: 1280, height: 720 }`(= interface.json)。HUD 0~50, 遊戲區 y 50~720。

## 色票表

`window.Art.palette` 裡的名稱(沿用上一版; 本輪異動以粗體標出):

| 名稱 | 色碼 | 用途 |
|---|---|---|
| grass / bg / grassDark | #2e4733 / #2e4733 / #27402c | 草地底色與斑點 |
| grid | rgba(255,255,255,0.05) | 蓋塔格線(極淡, 路面蓋掉) |
| path / pathEdge / pathLight | #9a8158 / #6a5535 / #ad9469 | 路面 / 路邊 / 路中央磨損帶(不透明) |
| ally / allyDark / allyRim | #5b8fe0 / #2f4f86 / #cfe0ff | 我方單位藍邊、主堡旗、集結旗 |
| enemy 等 | 小鬼 #b23a52、弓鬼 #963a86、冰鬼 #5a5aa8、衝鬼 #8a4a3a、**雷鬼 #4b3f9a**、**醫鬼 #2f6e5a**、狂鬼 #7e1a30; 外描 #3a0d1a; 眼 #ffb347 | 敵人「鬼」 |
| player / playerRim / playerCloak | #fff1c9 / #ffb020 / #e0902a | 玩家魂匠(全場唯一奶白金邊圓) |
| neutral / neutralDark / neutralTag / neutralInk | #8d8b84 / #55534e / #3e3d39 / #d9d6cb | 中立石魔像與「中立」小牌 |
| stone / stoneDark | #8d93a3 / #5d6272 | 主堡、弩塔石材 |
| ranged / melee / frost | #f2c94c / #ef5350 / #8fd8ff | 遠攻(黃)/ 近戰(紅)/ 冰霜(冰藍), 沿用 |
| **shock** | **#d27cff** | 新: 電擊(紫電)。電擊圖示、雷鬼、電擊連鎖、雷電球、瞬閃、瞬閃落地放電 |
| **heal** | **#52e39a** | 新: 治癒(薄荷綠)。治癒圖示、醫鬼十字、治癒領域、治癒光線、聖光軌跡、healing 狀態 |
| seek | #6ad05a | 自動索敵(綠), 沿用 |
| **march** | **#8f86ff**(原 #a77bff) | 進攻主堡。往藍偏 17°, 讓開電擊紫 |
| **charge** | **#e57ad0**(接收原 drum 的洋紅) | 衝鋒(本輪改基本魂件)、衝鋒撞擊特效、衝鬼角尖。**drum 已刪除** |
| combo | #ffd24a | 組合魂件的金邊八角、組合魂柱晶石金框、組合虛魂件金虛線框 |
| **rooted / rootedDark** | #c9a46a / #5e4426 | 新: 不動如山「紮根」的岩塊與下半圈土色框 |
| resonance | #e3d4ff | 共鳴微光(弩塔、兵、玩家)、一般組合名稱的邊 |
| target | #ffffff | 互動目標外框 |
| cursor / gold / coin | #ffd24a / #ffd24a / #ffcc33 | 游標框、金幣數字、金幣 |
| valid / invalid | #5fe07a / #ff4a4a | 放置預覽可 / 不可 |
| allyShot / enemyShot | #fff3b0 / #ff4d7a | 我方箭 / 敵方彈; enemyShot 也是**敵方電擊連鎖**的顏色 |
| slowmo | #9fd4ff | 慢動作冷色邊框 |
| hud / panel / descPanel | #161b26 / #1d2331 / #2b3347 | HUD 底、彈窗底、彈窗說明區 |
| soulLight | #cfe0ff | 兵「歸隊中」拖尾、「潰散」魂光、重生中圓盤 |
| swap / stun | #ff9a4a / #ffe14a | 替換彈窗橘邊 / 暈眩星星 |
| tutorPaper / tutorInk / tutorAccent / tutorDone | #fff4d6 / #2a2016 / #e0902a / #2fae4e | 教學泡泡專用(全畫面唯一淺紙底) |
| keyFace / keyBase / keyInk / keyPressed | #ece7da / #3a3f4c / #1e2230 / #8fe6a0 | 鍵帽(全畫面同一套; 本輪鍵帽多一個 M) |
| shop / shopDeep / shopZone | #ffb84a / #3b2410 / #ffcf70 | 購買徽章、地上購買光座、購買區圈、**商店提示底板框與字** |
| optionCell | #2f2a22 | 單位選單的選項格(拆除 / 重設集結點)暖褐底 |

**色相張力(請製作人驗收)** — 8 種基本魂件已排滿色輪, 本輪的排法是**先保會共鳴的 5 色**:
- 會共鳴的 5 種(遠攻、近戰、冰霜、電擊、治癒)會出現在大面積、看不到圖示的地方(魂柱範圍淡染、共鳴線、虛魂件小格), 只能靠顏色分, 所以這 5 色兩兩拉開: 色相 遠攻 45° / 近戰 1° / 治癒 150° / 冰霜 201° / 電擊 279°, 最近一對 遠攻—近戰 44°(沿用)、冰霜—治癒 51°(灰階差 24, 另靠治癒的十字粒子與冰霜的雪點分)。
- 不共鳴的 3 種(自動索敵、進攻主堡、衝鋒)只出現在帶圖示的槽位與彈窗, 讓它們吸收撞色: **最差組合 電擊—衝鋒 33°(灰階差 1)、電擊—進攻主堡 35°、治癒—自動索敵 38°**, 都靠圖示形狀分(閃電 / 牛角頭 / 城堡 / 十字 / 眼睛)。驗收用「同一個槽列裡 電擊 + 衝鋒 + 進攻主堡」那一格(例: 中立石魔像 [電擊, 衝鋒, 進攻主堡])。
- 進攻主堡 #a77bff → #8f86ff 是為了讓開電擊紫(原本只差 18°)。
- 敵方電擊連鎖用敵方彈的粉紅 #ff4d7a, 和我方紫電靠「顏色 + 端點芯色(暗紅 / 白)」分。
- 沿用: 購買區(金 #ffcf70)與遠攻魂柱範圍(黃)同色名, 靠線型分(長虛線 vs 實線 + 內側點線)。

## 形狀語言

我方 = 帶藍邊的圓角方塊; 敵人 = 下緣波浪的「鬼」剪影 + 橘眼; 玩家 = 全場唯一的奶白金邊圓; 基本魂件 = 單色圓角方塊 + 深色線圖示; 組合魂件 = 金邊八角 + 兩件材料色斜分; 購買 = 圓形金環徽章; 借來的魂件 = 小一號虛線框半透明; 電擊 = 鋸齒閃電; 治癒 = 十字 + 往上飄; 不動如山 = 底部岩塊; 教學 = 全場唯一淺色紙底的泡泡; 扁平無外光, 只有範圍淡染、魂光與電 / 治癒光用漸層。

## 理念落實

- P0 辨識度先於好看: 我方 / 敵 / 玩家 / 中立 用剪影分; 魂件三類用三種外形分(方塊 / 八角 / 圓徽章); 新敵人各帶一個頭飾剪影(衝鬼牛角 + 前傾、雷鬼閃電冠、醫鬼白十字), 縮圖尺度就分得出。
- P1 視覺權重跟著決策迫切度走: 地面層(購買區、聖光軌跡、魂柱範圍、冰霜圈、治癒領域)都 ≤ 16% 淡染, 治癒領域只有 5%(治癒魂柱旁會疊好幾層); 購買區只在玩家走近才畫; 最亮的是互動目標白框、游標金框、出怪預警與教學泡泡。醫鬼的白十字是敵人身上最亮的頭飾(「先打牠」)。
- P2 規則上存在的東西畫面上就存在: 雷電球畫出 60 的電場外緣、治癒領域畫出 100 的外緣、聖光軌跡畫出 40 寬的帶; 不動如山(受傷減半、不移動)有獨立外觀; 敵人正被補血有 healing 外觀; 範圍外緣 = 判定邊界。
- P3 一個意義一種長相: 魂件圖示全畫面同一函式; 電擊意象(紫電鋸齒 + 白芯)用在電擊 / 雷霆斬 / 雷電球 / 瞬閃圖示、雷鬼、連鎖、雷電球、瞬閃、落地放電; 治癒意象(薄荷綠 + 十字)用在治癒 / 治癒光線 / 神聖之路圖示、醫鬼、治癒領域、光線、聖光軌跡、healing; 衝鬼頭上的牛角 = 衝鋒圖示的牛角; 鍵帽全畫面同一套。
- P4 關鍵區分走兩條通道: 敵我陣營的範圍 / 連鎖 = 顏色 + 線型或端點(治癒領域 實線 vs 虛線 + 暗紅描邊十字; 電擊連鎖 紫 + 白端點 vs 粉紅 + 暗紅端點); 不動如山(底部岩塊 + 下半圈土框)vs 共鳴(整圈淡紫)= 顏色 + 形狀; 治癒光線(≤ 8 寬柔光 + 十字)vs 穿透箭(28 寬硬黃光)vs 共鳴線(細線 + 流動白點)= 寬度 + 粒子形狀。
- P7 每個元素都要掙得版面: HUD 拿掉空白鍵提示, 商店提示只在站進購買區時出現在單位下方; 購買區圈內不再畫鍵帽(不和商店提示重述)。
- P9 以最混亂的那一刻驗收: 治癒領域重疊 3 層仍只約 15%; 所有電弧帶深色襯線, 疊在草地、路、範圍上都讀得到。
- P13 事件要排隊: 教學一次一個泡泡, 完成特效 0.6 秒播完才換下一個(由 RD 排)。
- P15 回饋強度與份量成正比: 火花(12)< 連鎖電弧(細鋸齒)< 範圍斬擊 / 落地放電(60)< 衝鋒撞擊 < 穿透光束; 一般組合名 < 首次「新組合!」。
- P17 進度圖形與數字分工: 出怪預警中央數字 = 剩餘秒數, 外環只畫這一秒; 重生圓盤畫排頭這一隻的 5 秒, 「×N」是人數。
- P18 重要資訊不能只存在一瞬間: 組合名稱只閃 1.5 秒, 但組合魂件留在槽上、說明區寫名稱與材料(不動如山另畫「/ [衝鋒]」); 結算留存組合數 n / 10。
- P19 資訊貼著物件: 槽列貼單位頭上、Z 提示貼玩家腳下、商店提示貼帶購買的單位正下方、教學泡泡箭頭尖端貼被指物件、中立牌掛在石魔像腳下。

## 繪製層級(照 interface.json drawOrder)

開始畫面: 只呼叫 drawTitle。關卡中: drawBackground → drawShopZone(玩家靠近時)→ drawHolyTrail → drawPillarRange → drawResonanceLine → drawFrostAura → drawHealAura → drawRallyFlag → drawCoin → drawCorpse(倒下消散)→ drawGroundPart → drawPlacePreview → 單位與敵人與玩家(依 y)→ drawSoulSlots → drawRespawnQueue → drawShopHint → drawProjectile → drawThunderOrb → drawPierceBeam → drawHealBeam → drawAreaHit → drawShockChain → drawHitSpark → drawBlink → drawUnitBreak → drawStealLink → drawComboName → drawSpawnWarning → drawActionHint → drawTutorial(指著場上物件時)→ drawHud → drawSlowMo → drawSoulPopup / drawShopPopup → drawTutorial(貼著彈窗, side left / right)→ drawResult。

## 判讀約定

- 時間欄位: 0 ≤ Age < Duration 才播; Age ≥ Duration 或欄位缺漏 = 閒置。缺 Duration 時用介面預設(攻擊 0.15、受擊 0.2、主堡受擊 0.3、魂柱波紋 0.5、插旗 0.3、地上魂件彈出 0.6、潰散 0.5、暈眩 1.0、穿透 0.15、範圍 0.3、連鎖 0.2、瞬閃 0.3、治癒光線 0.3、雷電球脈衝 0.15、火花 0.25、組合名 1.5、抖動 0.25、教學完成 0.6、星星 1.2)。暈眩的 stunDuration 照 RD 傳的值(1.0 或 0.5)播。
- 半徑一律指外緣: 購買區 110、魂柱範圍 150、冰霜圈 70、治癒領域 100、雷電球電場 60、旋風斬 / 冰霜重擊 / 落地放電 60、衝鋒 30、搶奪環 24(環寬 4 往內)、重生圓盤 15(環寬 4 往內)。線寬往內畫。聖光軌跡 40 = 全寬(中線兩側各 20)。
- 穿透光束: 最寬層 28 = 判定寬, 兩端平頭不外伸。
- 出怪預警數字 = ceil(remaining); 外環 = remaining − (數字 − 1)。
- **kinds / kind / virtual 只認會共鳴的 12 種**: 傳入移動類、購買或表外字串時, 魂柱範圍 / 晶石畫成空的、共鳴線畫白色、虛魂件畫成空虛線格。kinds 只讀第 0 項。
- **組合魂件的「融合色」**: 兩件材料色; 同材料組合(穿透箭、旋風斬)第二色取材料色的淡色。不共鳴的組合(瞬閃 = 電擊 + 自動索敵、神聖之路 = 治癒 + 衝鋒、不動如山 = 進攻主堡 + 自動索敵)只出現在圖示, 一樣用兩材料色。
- **rooted 優先**: rooted 為 true 時本函式忽略 moving / charging(不畫輪子、速度線、行走輕跳), 即使 RD 傳了 true。
- **healing**: 兵與敵人一樣的畫法(框內薄荷綠微光 + 兩個往上飄的小十字), 敵人的微光貼鬼剪影。
- **敵人 moving = false 會畫頭上問號(= 失去進攻主堡、呆站)**。請只在「身上沒有進攻主堡而停住」時傳 false; 敵人追兵、停下來打兵、被暈眩、被撞退時都傳 true(暈眩時星星優先, 問號本來就不畫)。建議製作人之後把欄位改成規則語意的名字。
- **drawCorpse(倒下消散)**: life 從 0.6 數到 0; 灰掉的鬼往下塌扁(高 1 → 0.45)、貼著框底沉下、淡出, 原地 4 團灰紫煙往上散; life → 0 完全消失, 不閃爍、不畫槽列、不畫互動框(已刪 targeted)。和我方潰散(藍白魂光往右飛)用「暗色、原地、往上」分開。
- **drawHolyTrail**: 每段亮度 = 兩端 life / maxLife 平均, 分 6 階; 同階連續的段一筆畫完(圓角接), 只在整條的兩端畫往外的半圓頭, 避免點很密(每 12px 一點)時半透明圓頭層層疊深。沿線每 4 點一個小十字。點座標非數字的那一點略過; 少於 2 點不畫。
- **drawShockChain**: 每段鋸齒每 1/30 秒換一次形狀(以時間為種子); segments 只畫前 8 段, 段資料不是 4 個數字的略過。
- **drawShopPopup**: items 有幾項畫幾格(3 或 4), 第 i 格中心 x = (i − (n−1)/2) × 88; state 只認 ok / poor / max, 其他當 ok。魂柱格「count/cap」只在兩者都是數字時畫。
- **drawSoulPopup 說明區材料**: materials 為 2 件時畫「[A] + [B]」右對齊到 x = 140; desc.alt 是基本魂件時接著畫「/ [alt]」(整串寬 80, 落在 x 60~140)。cells 的項目若是字串(舊格式)也接受, 當成魂件格。說明區是比面板亮一階的深色底(「淺底」是教學泡泡的字典詞)。
- **衝鋒(弩塔、魂柱、兵)**: 本體前傾 + 身後右側 3 條白色速度線(框外 ≤ 12px)。介面沒傳衝鋒方向, 預設單位往畫面左邊衝; 第 4 關從上 / 下衝時速度線仍在右側(沿用上一版的已知限制)。
- **衝鬼前傾**: 上半身往右(主堡方向 = 牠的前進方向)斜 0.16 並縮 0.86 倍收在框內, 受擊白閃、減速外描、healing 微光都套同一個姿勢。
- drawTutorial: `stage` 刻意不讀(外觀只由 text、keys、pressedKeys、side 決定; 13 階段只是文字與按鍵不同)。箭頭長 = 本體邊到尖端, 底邊寬 20; up / down 時底邊中心 x = tipX 但夾在本體中心 ±136 內; left / right 時底邊在本體右 / 左緣, 中心 y = tipY 夾在 ±24 內。**本輪修正: 箭頭頂點往內縮 1.3px, 讓描邊外緣剛好落在尖端(上一版描邊超出尖端 1.3px)**。完成特效: 0~0.18 秒整個泡泡以本體中心放大到 1.15 倍, 0~0.12 秒浮出紙色罩 + 大綠勾, 0.27 秒起淡出到 0.6 秒消失。
- drawActionHint: 底板寬依字長 48~96; 「不能蓋」「不能插」= 紅底紅框紅字 + Z 鍵變淡。
- drawTitle: 選中的卡片最後畫、放大 1.06 倍 + 金框 + 金色外光; 「[Z] 開始」那組隨 blinkTime 閃爍。
- 表外值的預設外觀: 敵人 / 消散種類未知 → 小鬼; drawAreaHit kind 未知 → 旋風斬; drawPlacePreview kind 未知 → 弩塔; drawUnitBreak / drawRespawnQueue kind 未知 → 步兵; drawGolem team 不是 "ally" → 中立; drawTutorial side 未知 → up; drawHealAura / drawFrostAura / drawShockChain owner 不是 "enemy" → 我方; 物品字串未知(含已刪的 "drum")→ 只畫一個虛線空框; 教學 keys 的表外值 → 略過; drawSoulPopup mode 非 "replace" → 選單; cells 空 → 一格空魂件格; drawResult options 空 → [重來, 標題]。
- 時間性小動畫(呼吸、流動光點、雪點、十字往上飄、電弧抖動、暈眩星繞圈、魂光拖尾、購買光座脈動、購買區虛線緩轉、雷電球電場緩轉)用 `performance.now()` 自己跑, 不影響狀態。
- drawSlowMo 用 `saturation` 合成模式去色, 刻意作用於整張畫布(全畫面效果); 其他函式一律 source-over。

## 畫面文字歸屬

依介面 textOwnership, 下列文字與鍵帽都由美術畫, **RD 不要另畫**: drawTitle(大標題、「第 N 關」、關名、星、鎖、「[←][→] 選關  [Z] 開始  [M] 靜音」)、drawGolem(中立時的「中立」牌)、drawRespawnQueue(「重生中」、「×N」)、**drawShopHint(「[空白] 商店」)**、drawComboName、drawActionHint(Z 鍵帽 + label)、drawSoulPopup(標題、「手上」、選項格下的「+N 金」/「移防」、說明區名稱 / 材料 / 說明、actionLabel、「[Z] 確定  [X] 關閉」)、drawShopPopup(「商店」、品名、價格、已有 / 上限、底部訊息、「[←][→] 選  [Z] 購買  [X] 關閉」)、drawHud(「第 N 關」+ 關名、金幣、主堡 n / 20、「波次」n / N、「下一波」N 秒 /「準備中」、喇叭、「[Z] 互動  [M] 靜音」)、drawSlowMo(「慢動作」)、drawResult(標題、關名、波次與主堡、「發現組合 n / 10」、按鈕文字、「[←][→] 選  [Z] 確定」)、drawTutorial(提示文字、按鍵鍵帽、已按過的綠面打勾、完成特效; 文字內容由 RD 傳 text)。**drawShopZone 本輪起不畫任何字或鍵帽。**

## 物件表

所有 x, y 是物件中心(集結旗例外: 旗桿插地點); `targeted: true` 時在 size 外畫一圈白框(內緣貼齊 size 外邊, 寬 3, 輕微呼吸)。

| 物件 | 函式 | state 欄位 | 各狀態視覺差異 |
|---|---|---|---|
| 開始畫面 | `drawTitle(ctx, s)` | levels[{name, unlocked, bestStars}], cursorIndex, muted, blinkTime | 草地 + 三叉路線 + 暗罩; 兩側裝飾魂柱; 金色大標題; 5 張卡片(解鎖 / 未解鎖鎖頭 / 選中放大金框); 底部鍵帽提示 **[M] 靜音**; 右上喇叭(muted 紅叉) |
| 背景 | `drawBackground(ctx, s)` | paths | 沿用。草地 + 淡格線 + 依 paths 畫路(共用段無接縫; 入口暗化 + 路標石) |
| 購買區 | `drawShopZone(ctx, s)` | x, y, radius, active | 暖金長虛線圈 + 極淡金填色, 虛線緩轉; active: 線變粗變亮、填色 11%。**本輪刪除圈內鍵帽** |
| **商店提示** | `drawShopHint(ctx, s)` | x, y | 新。88×24 深褐半透明底板 + 金細框; [空白] 鍵帽 44×22 + 隔 4px 金色「商店」, 整組置中 |
| **聖光軌跡** | `drawHolyTrail(ctx, s)` | points[[x, y, life], ...], maxLife | 新。40 寬薄荷綠光帶(16% × 亮度)+ 14 寬淡白芯; 越舊越淡、life 0 消失; 兩端圓頭; 沿線小十字 |
| 魂柱範圍 | `drawPillarRange(ctx, s)` | x, y, radius, kinds, changeAge, changeDuration | 0 件: 淡白虛線空圈; 基本會共鳴魂件: 意象色 9% 淡染 + 實線外圈 + 內側點線(本輪多電擊紫、治癒綠); 組合: 12 扇兩材料色交替淡染 + 雙實線外框(本輪多雷霆斬、雷電球、治癒光線); 換魂件時波紋 0.5 秒 |
| 共鳴線 | `drawResonanceLine(ctx, s)` | x1, y1, x2, y2, kind, active | 沿用。false: 意象色 35% 細線; true: 寬 3 + 白芯 + 往接收者流動的白點; 組合另疊第二材料色虛線段 |
| 主堡 | `drawCastle(ctx, s)` | x, y, hitAge, hitDuration, attackAge, attackDuration, targeted | 沿用。雙塔石堡 + 左緣木城門; 受擊紅閃; 攻擊上移 3px |
| 重生中提示 | `drawRespawnQueue(ctx, s)` | x, y, kind, progress, count | 沿用。半透明底板 132×36; 左圓盤進度 + 排頭小圖示; 「重生中」+「×count」 |
| 弩塔 | `drawCrossbow(ctx, s)` | x, y, attackAge, attackDuration, moving, charging, **rooted**, resonating, targeted | 藍邊石座 + 木弩; 攻擊後座 3px; moving: 輪子; charging: 前傾 + 右側速度線; **rooted: 框內底部一排岩塊 + 下半圈土色粗框(不畫輪子、速度線)**; resonating: 整圈淡紫微光 |
| 魂柱 | `drawPillar(ctx, s)` | x, y, kinds, moving, charging, **rooted**, targeted | 石柱 + 頂端菱形晶石(會共鳴的魂件染色 + 6 道短光; 組合晶石兩色 + 金框; 沒有則灰); moving: 小輪; charging: 前傾 + 速度線; **rooted: 同弩塔的岩塊 + 土框** |
| 步兵 | `drawSoldier(ctx, s)` | x, y, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, charging, **rooted**, **healing**, resonating, returning, targeted | 藍色方身 + 頭盔 + 劍盾; 受擊白閃; 攻擊左衝 3px; moving 輕跳; charging: 前傾 + 速度線; **rooted: 腳下岩塊 + 下半圈土框, 不輕跳**; **healing: 框內薄荷綠微光 + 兩個往上飄的小十字**; resonating: 淡紫微光; returning: 半透明 + 淡藍虛線框 + 右側魂光拖尾, 不畫血條; 血條只在 hp < maxHp 且非歸隊時畫 |
| 石魔像 | `drawGolem(ctx, s)` | x, y, team, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, charging, **rooted**, **healing**, resonating, returning, targeted | "neutral": 灰石暗眼 + 腳下「中立」牌, 忽略 charging / rooted / healing / resonating / returning / 血條; "ally": 藍灰石 + 藍邊 + 胸口符文; 其餘同步兵 |
| 集結旗 | `drawRallyFlag(ctx, s)` | x, y, plantAge, plantDuration | 沿用。木旗桿 + 藍色燕尾旗; 插下時往下一戳 + 塵土圈 |
| 潰散 | `drawUnitBreak(ctx, s)` | kind, x, y, age, duration | 沿用。本體縮小淡出 + 6 道藍白魂光往右(主堡方向)飛 |
| 敵人 | `drawEnemy(ctx, s)` | type, x, y, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, slowed, stunAge, stunDuration, **healing**, targeted | 鬼剪影 + 橘眼。**衝鬼(drummer): 頭上一對前彎牛角(角尖洋紅)+ 身體前傾, 刪除戰鼓**; **雷鬼(thunder): 靛紫身 + 頭頂紫電閃電冠 + 胸前鋸齒紋**; **醫鬼(healer): 墨綠身 + 額頭白底薄荷綠十字**; 受擊白閃; 攻擊右移 3px; moving false: 頭上黃「?」; slowed: 冰藍色調 + 白外描; 暈眩: 頭頂 3 顆黃星繞圈; **healing: 鬼剪影內薄荷綠微光 + 小十字往上飄** |
| **敵人倒下消散** | `drawCorpse(ctx, s)` | kind, x, y, life, maxLife | **改**: 0.6 秒塌扁、下沉、淡出 + 4 團灰紫煙往上散(見判讀約定); 刪除 targeted、剩餘細條、閃爍 |
| 地上的魂件 | `drawGroundPart(ctx, s)` | item, x, y, spawnAge, spawnDuration, life, maxLife, permanent, targeted | 沿用。圖示 20px + 地影 + 白點線圈 + 框內底部剩餘細條; life < 3 閃爍、細條轉紅; permanent(購買): 金色光座 + 脈動; 彈出中: 從右上彈出落地 + 白光 |
| 金幣 | `drawCoin(ctx, s)` | x, y | 沿用。金色圓幣 |
| 玩家 | `drawPlayer(ctx, s)` | x, y, moving, handItem, holdingFlag, stealing, stealProgress, resonating, attackAge, attackDuration | 沿用。奶白圓身 + 金橘邊 + 兜帽; handItem 捧在右側(新魂件照同一套圖示); holdingFlag: 只畫舉著的集結旗; stealing: 繞身金色進度環; resonating: 淡紫微光; 出手: 往右推 3px + 白光 |
| Z 情境提示 | `drawActionHint(ctx, s)` | x, y, label | 沿用。半透明小底板 + 16px Z 鍵帽 + 白字; 「不能蓋」「不能插」紅 |
| 放置預覽 | `drawPlacePreview(ctx, s)` | kind, x, y, valid | 沿用。格子框 + 半透明輪廓綠 / 紅叉; pillar 另畫 150 虛線圈; flag: 腳下半透明旗 |
| 魂件槽列 | `drawSoulSlots(ctx, s)` | x, y, slots, virtual | 實體 18px 暗底格, 空格虛線; 基本 / 組合 / 購買三種外形; 虛魂件 14px 半透明虛線框, used 較亮, 組合虛魂件斜分兩色 + 金色虛線框; > 3 項畫前 2 + 「+N」 |
| 冰霜圈 | `drawFrostAura(ctx, s)` | x, y, radius, owner | 沿用。ally: 冰藍淡染 + 實線圈 + 白雪點; enemy: 粉紅淡染 + 虛線圈 + 粉雪點 |
| **治癒領域** | `drawHealAura(ctx, s)` | x, y, radius, owner | 新。薄荷綠 5% 淡染 + 細圈 + 5 個往上飄的小十字; ally: 實線圈、淡白十字; enemy: 虛線圈、綠十字帶暗紅描邊 |
| **治癒光線** | `drawHealBeam(ctx, s)` | x1, y1, x2, y2, age, duration | 新。8 寬薄荷綠柔光 + 淡綠芯 + 白芯, 沿線流向友軍的白十字; 末端白綠光團 + 白十字(24×24 內); 越接近結束越淡 |
| 投射物 | `drawProjectile(ctx, s)` | x, y, angle, kind, owner | 沿用。ally normal: 黃白箭; ally ice: 冰藍箭; enemy: 深紅圓彈 |
| **雷電球** | `drawThunderOrb(ctx, s)` | x, y, pulseAge, pulseDuration | 新。中心 20px 白紫漸層電球 + 深紫邊 + 3 道跳動白電弧(24×24 內); 半徑 60 淡紫電場(6%)+ 緩轉虛線外圈; 脈衝中: 電場 20%、外圈變實線變亮(不放大) |
| 穿透箭光束 | `drawPierceBeam(ctx, s)` | x1, y1, x2, y2, frost, age, duration | 沿用。寬 28 黃光 / 附冰冰藍 + 冰屑 |
| 範圍攻擊 | `drawAreaHit(ctx, s)` | kind, x, y, radius, angle, frost, age, duration | whirl / frostSmash 沿用; charge: 星爆 + 粗環改用衝鋒洋紅(原行軍色); **shockBurst: 白紫閃光 + 外擴紫環(深紫襯)+ 7 道從中心劈出的鋸齒電弧; frost: 環內一圈冰藍 + 4 顆冰屑** |
| **電擊連鎖** | `drawShockChain(ctx, s)` | segments, owner, age, duration | 新。每段鋸齒閃電(偏離 ≤ 4 + 線寬 → 全寬 ≤ 12)三層: 深色襯 / 主色 / 亮芯; 兩端直徑 9 亮點。ally: 紫電 + 白芯 + 白點芯; enemy: 粉紅 + 淡粉芯 + 暗紅點芯; 形狀每 1/30 秒抖動, 越到結束越淡 |
| 擊中火花 | `drawHitSpark(ctx, s)` | x, y, frost, age, duration | 沿用。6 道黃白短線 / 附冰冰藍 + 冰屑 |
| **瞬閃** | `drawBlink(ctx, s)` | x1, y1, x2, y2, age, duration | 新。起點紫色殘影光 + 虛線小圈擴散淡出; 起點 → 終點一道鋸齒紫電(同連鎖三層); 前 60% 終點白紫一閃 |
| 搶奪連線 | `drawStealLink(ctx, s)` | x1, y1, x2, y2, progress | 沿用。金色鋸齒鏈 + 白光球 |
| 組合名稱 | `drawComboName(ctx, s)` | x, y, name, isNew, age, duration | 沿用。一般: 暗底淡紫邊膠囊; isNew: 「新組合! 名稱」金色; 彈 1.2 倍、上飄淡出 |
| 出怪點預警 | `drawSpawnWarning(ctx, s)` | x, y, angle, remaining, total | 沿用 |
| 新手教學泡泡 | `drawTutorial(ctx, s)` | stage, text, keys, pressedKeys, tipX, tipY, side, bodyX, bodyY, doneAge, doneDuration | 沿用。淺紙色底 + 深墨框泡泡 + 指向尖端的三角箭頭(up / down / left / right); 內框琥珀色原地呼吸; 文字 17px; 鍵帽列; pressedKeys 綠面 + 勾; 完成: 放大 1.15 + 綠勾 + 淡出。13 個階段同一套外觀 |
| HUD | `drawHud(ctx, s)` | level, levelName, gold, castleHp, castleMaxHp, wave, totalWaves, nextWaveIn, clockPaused, muted | 「第 N 關」+ 關名(x 16)、金幣(230)、心形 + 主堡(350)、波次(500)、下一波 / 準備中(640)、喇叭 (860,25)、**右側「[Z] 互動  [M] 靜音」(刪除空白鍵商店)** |
| 慢動作效果 | `drawSlowMo(ctx)` | (無) | 沿用。全畫面去色 + 冷藍罩 + 暗角 + 冰藍邊框 + 「慢動作」 |
| 單位選單 / 替換彈窗 | `drawSoulPopup(ctx, s)` | mode, x, y, title, cells, index, hand, actionLabel, desc{name, text, materials, **alt**}, shakeAge, shakeDuration | 沿用版面。**說明區材料多「/ [alt]」**(不動如山: [進攻主堡] + [自動索敵] / [衝鋒]); 拆除格 refund 0 照寫「+0 金」 |
| 商店彈窗 | `drawShopPopup(ctx, s)` | items[{item, name, price, state, count, cap}], cursorIndex, message, shakeAge, shakeDuration | **3~4 格置中排列, 刪除 locked**; poor: 變暗、價格紅; max: 變暗、價格灰、count/cap 紅; 魂柱格右上角「count/cap」; 游標亮底 + 金框; 左下 message, 右下鍵帽提示 |
| 結算畫面 | `drawResult(ctx, s)` | win, allClear, level, levelName, wave, totalWaves, castleHp, castleMaxHp, stars, starAge, starDuration, comboCount, options, cursorIndex | 沿用。**「發現組合 n / 10」**(comboCount 夾在 0~10) |

物品字串(conventions.itemKinds), 圖示全畫面同一套:
- 基本 8 種 = 單色圓角方塊 + 深色線圖示: ranged 斜箭、melee 直劍、frost 雪花、**shock 閃電**、**heal 十字**、seek 眼睛、march 城堡、**charge 牛角頭(本輪改成基本魂件外觀, 沒有金邊八角)**
- 組合 10 種 = 金邊八角 + 兩材料色斜分: pierce 長箭穿兩點、iceArrow 箭 + 雪花頭、whirl 旋風、frostSmash 錘 + 雪花、**thunderSlash 劍 + 閃電**、**thunderOrb 圓 + 閃電**、**blink 折線閃現箭**、**healRay 光線 + 十字**、**holyPath 彎路 + 十字**、**steadfast 山**
- shop = 圓形金環徽章 + 攤位圖; 材料 crossbowKit / pillarKit / soldierKit / golemKit = 木箱底 + 單位小圖
- "drum" 已刪除, 傳入會畫成虛線空框

## 尺寸表

| 物件 | 判定框 size | 實際繪製 |
|---|---|---|
| 開始畫面 | 1280×720 | 標題中心 (640,170) 76px; 卡片 200×150 中心 (200/420/640/860/1080, 400), 選中 212×159; 鍵帽提示 (640,650); 喇叭 (1230,40) 36×36。背景路線伸到畫布外由畫布裁掉 |
| 購買區 | 220×220 | 外緣半徑 110(線寬往內) |
| 商店提示 | 88×24 | 底板 88×24; 鍵帽 44×22; 「商店」13px; 主堡時範圍 x 1136~1224、y 496~520 |
| 聖光軌跡 | 線狀 | 全寬 40(折線 ± 20, 兩端半圓頭半徑 20); 白芯寬 14; 小十字在中線 ± 10 內 |
| 魂柱範圍 | 300×300 | 外緣半徑 150 |
| 主堡 | 112×112 | 攻擊上移 3px(允許 ≤ 4) |
| 重生中提示 | 132×36 | 圓盤中心 (x−48, y) 外緣 15 |
| 弩塔 | 48×48 | 底座 44×44; 岩塊高 ≈ 8 在框內底部; 衝鋒速度線到框外 11px |
| 魂柱 | 36×36 | 岩塊高 ≈ 6 在框內底部; 衝鋒速度線到 x+29 |
| 步兵 | 32×32 | 血條中心 (x, y−22) 寬 32; 岩塊高 ≈ 5; 治癒十字半臂 3.6 在框內; 速度線 / 拖尾到框外右側 ≤ 12px |
| 石魔像 | 56×56 | 血條中心 (x, y−34) 寬 56; 岩塊高 ≈ 9; 中立牌 40×18 中心 (x, y+40) |
| 集結旗 | 24×40 | 插下塵土到框外 ≤ 8px |
| 潰散 | 步兵 96 / 石魔像 120 | 沿用 |
| 敵人 | 小鬼 / 弓鬼 / 冰鬼 32、衝鬼 / 雷鬼 / 醫鬼 36、狂鬼 44 | 衝鬼前傾後最寬 ≈ 35.6 仍在框內; 牛角頂 y−17; 攻擊右移 3px、移動上下浮 1.2px(允許); 血條中心 (x, y−高/2−6) |
| 敵人倒下消散 | 同敵人 | 本體與煙都在框內(煙團半徑 ≤ 0.2 × 寬, 圓心夾在框頂之下) |
| 地上的魂件 | 28×28 | 圖示 20; 購買光座 ≤ 36×36; 彈出位移與閃光 ≤ 24px |
| 金幣 | 16×16 | 半徑 7 |
| 玩家 | 32×32 | 手上物品框 (x+17~x+39, y−11~y+11); 舉旗頂 y−23; 搶奪環外緣 24 |
| Z 情境提示 | 96×22 | 底板寬 48~96 |
| 放置預覽 | 弩塔 / 魂柱 48、旗幟 24×40 | 魂柱範圍虛線圈外緣 150 |
| 魂件槽列 | 單格 20 | 實體格 18 / 格距 20; 虛魂件格 14 / 格距 16, 起點 = 實體列右緣 + 6, 最寬 48px |
| 冰霜圈 | 140×140 | 外緣 70 |
| 治癒領域 | 200×200 | 外緣 100; 十字粒子在半徑 ≤ 0.85 × 100 內 |
| 治癒光線 | 線狀 | 全寬 8, 兩端圓頭不外伸; 末端光團半徑 ≤ 12(24×24 內) |
| 投射物 | 10×10 | 沿用 |
| 雷電球 | 120×120 | 球體半徑 10(電弧到 11.6, 24×24 內); 電場外緣 60 |
| 穿透箭光束 | 線寬 28 | 最寬層 28 |
| 範圍攻擊 | 120×120 | 外緣 = radius(60 / 30); shockBurst 環外緣 ≤ radius − 1.5 |
| 電擊連鎖 | 線狀 | 鋸齒偏離 ≤ 4 + 襯線半寬 2 = 全寬 ≤ 12; 端點直徑 9 |
| 擊中火花 | 24×24 | 半徑 ≤ 11 |
| 瞬閃 | 線狀 | 軌跡全寬 ≤ 12; 起點殘影半徑 ≤ 19、終點閃光半徑 ≤ 20(各在 40×40 內) |
| 組合名稱 | 200×36(首次 280×48) | 沿用 |
| 出怪點預警 | 64×64 | 沿用 |
| 新手教學泡泡 | 300×72 | 本體 300×72; 箭頭長 20、底寬 20, 描邊外緣到尖端為止; 完成特效 345×83 屬允許例外 |
| HUD | 1280×50 | 右側提示鍵帽 22×22, 「[Z] 互動  [M] 靜音」總寬約 120, 右緣 1264 |
| 單位選單 / 替換彈窗 | 320×180 | 說明區材料串最寬 80(x 60~140); 抖動 ±6px 例外 |
| 商店彈窗 | 480×150 | 格 80×72; n = 3 → 格中心 x −88 / 0 / 88; n = 4 → −132 / −44 / 44 / 132; 抖動 ±6px 例外 |
| 結算畫面 | 1280×720 | 沿用 |

## 交付自查紀錄

- `node --check` 通過。
- 用會追蹤變換矩陣、剪裁、線寬, 並依實際角度取樣 arc / ellipse、取樣二次 / 三次曲線的假 ctx, 對**匯出表全部 42 個函式**(含原樣搬過來的)呼叫約 2100 次: 5 關 paths、開始畫面各游標、19 種魂件 + 材料在槽列 / 地上 / 手上、7 種敵人 × 移動 / 減速 / 治癒 / 兩種暈眩長度 / 攻擊、倒下消散 life 0.6~0.01、建築與兵的 moving / charging / rooted / resonating / healing / returning 組合、中立牌、治癒領域與冰霜圈 × 陣營、聖光軌跡(轉彎、重合點、空陣列、life 0)、電擊連鎖 × 陣營 × 超過 8 段、雷電球脈衝、瞬閃、落地放電 × 附冰、教學 16 種提示 × 4 方向 × 完成進度 0~0.6、選單 / 替換彈窗 × 4 種格子組合 × 5 種說明(含不動如山的 alt)、商店 3 / 4 格 × 3 種狀態 × 訊息、結算 3 種結果, 外加 5 組壞狀態(空物件、undefined、null、NaN / 表外字串 / 非陣列、極大座標)。結果: 不拋錯、save/restore 成對、合成模式不殘留。
- 超框: 除上表列明的允許例外外沒有超出 size。剩下的報警都是已知誤報: 開始畫面的路線伸到畫布外(畫布裁掉)、穿透光束平頭線端被假 ctx 多算半個線寬、主堡攻擊上移 3px(允許)。
- 本輪自查修掉一處沿用下來的超出: 教學泡泡箭頭的描邊超出尖端 1.3px(頂點內縮)。
- 介面每個 state 欄位都有被讀到, 只有 drawTutorial 的 `stage` 刻意不讀(見判讀約定)。上一輪的 drawCorpse.targeted 已不再讀。
- 匯出表 = 介面的 42 個函式, 沒有多出來的。
