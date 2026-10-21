# 魂匠守衛者 美術規格(打磨第 4 輪, 沿用打磨第 3 輪)

> RD 只讀這份。`index.html` 必須宣告 `<meta charset="utf-8">`, 否則 art.js 的中文字會變亂碼。
> art.js 是一般 script(不是 module), 載入後提供 `window.Art`。全部 Canvas 2D 幾何繪製, 沒有外部資源; 字型只用系統字型(微軟正黑體 → 蘋方 → sans-serif)。
> 函式名、參數、state 欄位全部照 interface.json, 一個不多一個不少(共 51 個函式)。**本輪新增** `drawTutorialClear`、`drawGuide`、`drawTutorialWarn`、`drawSpawnMark`、`drawWavePanel`、`drawWaveBanner`、`drawComboReveal`、`drawCodex`、`drawPause`; 沒有刪除函式。打磨沒有說明頁, 沒有 `drawGuidePage`。

## 邏輯畫布尺寸

`window.Art.canvas = { width: 1280, height: 720 }`(= interface.json)。HUD 0~50, 遊戲區 y 50~720; 左上角 x 8~228、y 54~112 是波次面板。

## 色票表

`window.Art.palette` 裡的名稱(沿用上一版; 本輪新增 / 異動以粗體標出):

| 名稱 | 色碼 | 用途 |
|---|---|---|
| grass / bg / grassDark | #2e4733 / #2e4733 / #27402c | 草地底色與斑點 |
| grid | rgba(255,255,255,0.05) | 蓋塔格線(極淡, 路面蓋掉) |
| path / pathEdge / pathLight | #9a8158 / #6a5535 / #ad9469 | 路面 / 路邊 / 路中央磨損帶(不透明); **開始畫面卡片之間的小路也用這三色** |
| ally / allyDark / allyRim | #5b8fe0 / #2f4f86 / #cfe0ff | 我方單位藍邊、主堡旗、集結旗 |
| enemy 等 | 小鬼 #b23a52、**輕快小鬼 #e88aa0**、弓鬼 #963a86、冰鬼 #5a5aa8、衝鬼 #8a4a3a、雷鬼 #4b3f9a、醫鬼 #2f6e5a、狂鬼 #7e1a30; 外描 #3a0d1a; 眼 #ffb347 | 敵人「鬼」。輕快小鬼和小鬼同色相(346° / 348°)、灰階 169 vs 97, 另靠瘦身形 + 白綁帶分 |
| player / playerRim / playerCloak | #fff1c9 / #ffb020 / #e0902a | 玩家魂匠(全場唯一奶白金邊圓); **開始畫面的玩家記號同一個角色** |
| neutral / neutralDark / neutralTag / neutralInk | #8d8b84 / #55534e / #3e3d39 / #d9d6cb | 中立石魔像與「中立」小牌 |
| stone / stoneDark | #8d93a3 / #5d6272 | 主堡、弩塔石材 |
| ranged / melee / frost / shock / heal | #f2c94c / #ef5350 / #8fd8ff / #d27cff / #52e39a | 會共鳴的 5 種魂件(沿用) |
| seek / march / charge | #6ad05a / #8f86ff / #e57ad0 | 不共鳴的基本魂件(沿用) |
| combo | #ffd24a | 組合魂件金邊八角、組合魂柱晶石金框、組合虛魂件金虛線框 |
| rooted / rootedDark | #c9a46a / #5e4426 | 不動如山「紮根」 |
| resonance | #e3d4ff | 共鳴微光、一般組合名稱的邊 |
| target | #ffffff | 互動目標外框 |
| cursor / gold / coin | #ffd24a / #ffd24a / #ffcc33 | 游標框、金幣數字、金幣; **波次面板與橫幅的波數、「新組合!」、教學完成大字** |
| hp | #6ee06e | 生命條(兵、敵人、**主堡血量牌**) |
| valid / invalid | #5fe07a / #ff4a4a | 放置預覽可 / 不可 |
| allyShot / enemyShot | #fff3b0 / #ff4d7a | 我方箭 / 敵方彈、敵方電擊連鎖 |
| slowmo | #9fd4ff | 慢動作冷色邊框 |
| hud / panel / descPanel | #161b26 / #1d2331 / #2b3347 | HUD 底、彈窗底(**合成演出面板、圖鑑面板、暫停面板、教學完成面板同一個底**)、說明區 |
| soulLight | #cfe0ff | 歸隊拖尾、潰散魂光、重生中圓盤 |
| swap / stun | #ff9a4a / #ffe14a | 替換彈窗橘邊 / 暈眩星星 |
| tutorPaper / tutorInk / tutorAccent / tutorDone | #fff4d6 / #2a2016 / #e0902a / #2fae4e | **教學專用(全畫面唯一淺紙底)**: 新手任務泡泡、**「新手任務」標籤(琥珀底)**、**引導卡**、**教學擋下提示**、**檢查清單** |
| keyFace / keyBase / keyInk / keyPressed | #ece7da / #3a3f4c / #1e2230 / #8fe6a0 | 鍵帽(全畫面同一套; **本輪多 C 與 Esc**) |
| shop / shopDeep / shopZone | #ffb84a / #3b2410 / #ffcf70 | 購買徽章、購買光座、購買區、商店提示 |
| optionCell | #2f2a22 | 單位選單的選項格(拆除 / 重設集結點) |

只出現在函式內、不進 palette 的本輪新色: 引導卡聚光燈描邊與箭頭 #ffd25a(暖黃)、教學擋下提示框 #c8483a(磚紅)、波次面板「完成新手任務後開始」#f0b060(教學琥珀)、圖鑑「已組過」章 #5fd07a、教學關卡片綠 #1c3324 / #25432f / 框 #4f9a5e、新芽 #7ee08a、低血量血量牌暗紅 → 亮紅閃爍。

**色相張力(請製作人驗收)**:
- 沿用上一版: 8 種基本魂件排滿色輪, 只有會共鳴的 5 色兩兩拉開(最近 44°); 不共鳴的 3 色吸收撞色(最差 電擊—衝鋒 33°), 靠圖示形狀分。
- **引導卡聚光燈描邊 #ffd25a 和游標金 #ffd24a 幾乎同色**(介面指定「暖黃色系」)。引導卡出現時遊戲整個暫停、彈窗會先關掉, 同一畫面不會有游標框; 兩者再靠形狀分(聚光燈 = 圓圈 + 粗箭頭, 游標 = 方框)。
- 教學的「完成」綠 #2fae4e、圖鑑「已組過」#5fd07a、教學關卡片綠 #4f9a5e 都是綠色系, 意思同為「已完成 / 新手的」, 不和治癒薄荷綠 #52e39a(150°)混在同一個物件上。

## 形狀語言

我方 = 帶藍邊的圓角方塊; 敵人 = 下緣波浪的「鬼」剪影 + 橘眼; 玩家 = 全場唯一的奶白金邊圓; 基本魂件 = 單色圓角方塊 + 深色線圖示; 組合魂件 = 金邊八角 + 兩件材料色斜分; 購買 = 圓形金環徽章; 借來的魂件 = 小一號虛線框半透明; 電擊 = 鋸齒閃電; 治癒 = 十字 + 往上飄; 不動如山 = 底部岩塊; **教學 = 全場唯一淺色紙底(泡泡、引導卡、擋下提示), 深墨框字**; **暫停類全畫面(圖鑑、暫停、合成演出)= 黑壓暗 + 深色面板**; 扁平無外光, 只有範圍淡染、魂光、電 / 治癒光與演出閃光用漸層。

## 理念落實

- P0 辨識度先於好看: 我方 / 敵 / 玩家 / 中立 用剪影分; 魂件三類用三種外形分; 輕快小鬼 = 小鬼剪影瘦一圈 + 淺色 + 白綁帶, 縮圖尺度和一般小鬼分得出; 教學鎖住的格子 / 品項畫鎖頭(不只變暗), 和「金幣不足」一眼分開。
- P1 視覺權重跟著決策迫切度走: 地面層 ≤ 16% 淡染; 波次面板倒數 ≤ 6 秒(預警中)才變警示色並脈動; 波次橫幅只在 (640,200) 停 0.8 秒就縮進面板, 半透明讓底下單位看得見; 主堡血量牌平常是深底小牌, 生命 ≤ 5 才變紅閃。
- P2 規則上存在的東西畫面上就存在: 教學鎖 = 格子鎖頭 + 商店鎖頭 + 「教學中不能動」灰字 + 「不能裝 / 不能搶」紅字提示 + 擋下提示; 地上魂件 frozen 時不閃爍(計時真的停了); 波次時鐘停住時面板寫「完成新手任務後開始」+ 沙漏; 主堡生命常駐在主堡身上。
- P3 一個意義一種長相: 教學一律淺紙底深墨字(泡泡、引導卡、擋下提示、檢查清單), 和全畫面所有深色面板相反; 合成演出 / 圖鑑 / 選單 / 說明區的魂件圖示都是同一個函式; 開始畫面的玩家記號就是 drawPlayer 的角色; 「新組合!」在頭上名稱與合成演出都是金色; 鍵帽全畫面同一套。
- P4 關鍵區分走兩條通道: 教學鎖住 vs 金幣不足 = 亮度(0.22 vs 0.4)+ 鎖頭 / 虛線框; 教學關卡片 vs 一般關 = 底色(綠 vs 藍灰)+ 新芽圖示; 暫停 vs 慢動作 = 中性黑壓暗 + 暫停雙槓 vs 冷藍去色 + 冰藍邊框 + 「慢動作」。
- P7 每個元素都要掙得版面: HUD 拿掉主堡生命與波次(各自搬到主堡與左上面板, 不重述); 波次面板的倒數條只在 countdown 畫, 「教學中 / 最後一波」不畫空條。
- P9 以最混亂的那一刻驗收: 波次橫幅 72% 半透明; 擋下提示用紙底 + 磚紅框, 壓在任何地面上都讀得到; 聚光燈描邊在 0.6 壓暗上用最亮的暖黃。
- P13 事件要排隊: 引導卡、合成演出、圖鑑、暫停同一幀至多一個(由 RD 排); 教學泡泡完成特效 0.6 秒播完才換下一個; 波次橫幅飛進面板後面板才 +1 並閃(兩段不同時)。
- P15 回饋強度與份量成正比: 組合名稱(頭上 1.5 秒)< 第一次合成演出(全畫面暫停); 波次推進(橫幅)< 教學全部完成(全畫面放射光 + 彩帶); 一般格子按鈕抖動 < 教學擋下提示。
- P17 進度圖形與數字分工: 波次面板數字 = 下一波還有幾秒, 進度條 = 這段間隔走了多少(RD 傳的 progress); 引導卡進度環 = 「還要等多久才能按 Z」, 環沒有數字; 主堡血量牌數字給精確值、條給比例。
- P18 重要資訊不能只存在一瞬間: 第一次合成演出閃過後, 配方留在組合圖鑑(C 隨時查)並蓋「已組過」章; 波次推進橫幅閃過後, 波數常駐在左上面板。
- P19 資訊貼著物件: 血量牌在主堡身上、擋下提示在玩家腳下、教學泡泡箭頭尖端貼物件、引導卡聚光燈直接圈住物件 + 箭頭碰到圈、「!」標示立在出怪點上。

## 繪製層級(照 interface.json drawOrder)

開始畫面: drawTitle → drawTutorialClear(大提示出現時)。
關卡中: drawBackground → drawShopZone → drawHolyTrail → drawPillarRange → drawResonanceLine → drawFrostAura → drawHealAura → drawRallyFlag → drawCoin → drawCorpse → drawGroundPart → drawPlacePreview → 單位與敵人與玩家(依 y)→ drawSoulSlots → drawRespawnQueue → drawShopHint → drawProjectile → drawThunderOrb → drawPierceBeam → drawHealBeam → drawAreaHit → drawShockChain → drawHitSpark → drawBlink → drawUnitBreak → drawStealLink → drawComboName → drawSpawnWarning → drawSpawnMark → drawActionHint → drawTutorialWarn → drawTutorial(指著場上物件)→ drawHud → drawWavePanel → drawWaveBanner → drawSlowMo → drawSoulPopup / drawShopPopup → drawTutorial(指著商店格 / 貼著彈窗)→ drawGuide → drawComboReveal → drawCodex → drawPause → drawResult。

## 判讀約定

- 時間欄位: 0 ≤ Age < Duration 才播; Age ≥ Duration 或欄位缺漏 = 閒置。缺 Duration 時用介面預設(攻擊 0.15、受擊 0.2、主堡受擊 0.3、魂柱波紋 0.5、插旗 0.3、地上魂件彈出 0.6、**金幣落地 0.4**、潰散 0.5、暈眩 1.0、穿透 0.15、範圍 0.3、連鎖 0.2、瞬閃 0.3、治癒光線 0.3、雷電球脈衝 0.15、火花 0.25、組合名 1.5、抖動 0.25、教學完成 0.6、星星 1.2、**擋下提示 1.2、面板 bump 0.4、波次橫幅 1.6、記號跳 0.8、開鎖 0.6、引導卡 phase 0.3 / 卡片彈入 0.3 / 閱讀 1.5、關閉淡出 0.3**)。
- 半徑一律指外緣: 購買區 110、魂柱範圍 150、冰霜圈 70、治癒領域 100、雷電球電場 60、範圍攻擊 60 / 30、搶奪環 24、重生圓盤 15、**引導卡聚光燈 r = 挖空外緣(柔邊往內, 寬 min(12, 0.3r)), 描邊在 r + 2.5(寬 3, 涵蓋 r+1~r+4)、引導卡進度環外緣 20(環寬 3)**。
- **drawCastle 血量牌**: hp 夾在 0~maxHp(無條件進位); hp ≤ 5 時底板暗紅 ↔ 亮紅、生命條紅色, 以約 1 秒週期只改顏色閃爍。正面藍色軍旗本輪上移到主堡中段(讓出血量牌)。
- **drawCoin**: spawnAge 在播時金幣往上抬 14 × sin(π × p), 地上影子在 (x, y+5) 隨高度縮小; 位置平移由 RD 更新。
- **drawEnemy swift**: 只在 type = "imp" 時有效; 其他 type 傳 true 也照一般外觀。
- **drawGroundPart frozen**: 不閃爍、剩餘細條不轉紅, 其他照一般外觀。
- **drawActionHint**: 「不能蓋」「不能插」「不能裝」「不能搶」= 紅底紅框紅字 + Z 鍵變淡。
- **drawTutorial**: `stage` 刻意不讀(外觀只由 text、keys / checklist、pressedKeys、side 決定)。checklist 有項目時 keys 一律不畫(即使 RD 傳了); 項目的 item 只認 pierce / melee / seek、to 只認 soldier / crossbow, 表外值畫虛線空框。「新手任務」標籤和本體一起縮放、一起淡出。箭頭與完成特效沿用上一版。
- **drawGuide**: phase 不是 intro / outro 一律當 card。**intro 期間壓暗已帶挖空**(聚光燈圓內不壓暗), 但不畫描邊、箭頭與卡片 — 介面寫「還不畫聚光燈」, 我把聚光燈理解成描邊; 挖空讓壓暗淡入時目標本來就亮著, 不會在 0.3 秒時突然「開洞」。spots 最多 2 個, r 夾在 20~154; arrows 只取前 spots.length 項。兩個聚光燈重疊時, 重疊處仍是挖空(用逐圈剪裁, 不用 evenodd 一次填)。卡片文字: text 用 \n 分行、最多 2 行(23px, 行距 30), 超過 400 寬整行等比縮; sub 16px 最寬 300(避開右下的鍵帽與進度環)。text / sub 裡的 [Z] [X] [C] [M] [Esc] [空白鍵] [←][→][↑][↓] 畫成 22×22 鍵帽。index / total: total 夾在 1~10。
- **drawTutorialWarn**: 文字最寬 196(整塊 240×30 左側是禁止記號)。
- **drawSpawnMark**: 上下彈跳 0~−7px、外圈亮度脈動, 都在 48×64 內; 不畫字。
- **drawWavePanel**: status 表外值當 countdown; wave 夾在 0~totalWaves; nextWaveIn 無條件進位, ≤ 6 時第二行與進度條變警示橘紅並脈動。bump 期間只有第一行的數字(wave)放大到 1.3 倍, 面板整塊亮一下。
- **drawWaveBanner**: 動畫時間軸以 duration 等比換算(duration = 1.6 時就是介面寫的 0.3 / 1.1 / 1.6 秒)。翻牌是 wave−1 往上出、wave 從下進, 剪在數字格內; last 時不翻、不畫「共 N 波」, 金框改紅框。
- **drawComboReveal**: a、b 只認基本魂件、result 只認組合魂件, 表外值畫虛線空框; 「[Z] 確定」要 ready 為 true 且 age ≥ 1.5 才畫。age 超過 1.5 當 1.5。
- **drawCodex**: entries 固定照索引畫 11 列(第 0~5 左欄、6~10 右欄), 缺的列畫空框不跳號; opened 只認 true。
- **drawTitle**: tutorial 為 true 的卡片 = 綠色系底 + 綠框 + 右上角新芽(未解鎖時新芽變淡); 名稱超過 5 個字用 25px。玩家記號推進時: 前 80% 時間沿弧線跳(最高點比兩端高 60), 後 20% 落地壓扁(以底邊為軸寬 1.15 / 高 0.82); 閒置時微微上下浮 1.5px。開鎖: 前 15% 鎖頭抖、之後碎成 7 片往外飛並淡出, 卡片暗罩從 0.72 淡到 0、內緣金光一閃。
- **drawShopPopup**: state 認 ok / poor / max / locked, 其他當 ok; message「教學期間不能買」用教學琥珀色, 其他訊息照舊紅橘。
- **drawSoulPopup**: cells 每項的 locked 只認 true; 游標停在 locked 格、或 actionLabel 是「教學中不能動」時, actionLabel 畫灰色。
- **drawResult**: options 空時勝利預設 [繼續, 重玩]、失敗預設 [重來, 關卡預覽]。
- 敵人 moving = false 會畫頭上問號(= 失去進攻主堡、呆站); 請只在「身上沒有進攻主堡而停住」時傳 false(沿用上一版的請求)。
- 表外值的預設外觀: 敵人 / 消散種類未知 → 小鬼; drawAreaHit kind 未知 → 旋風斬; drawPlacePreview kind 未知 → 弩塔; drawUnitBreak / drawRespawnQueue kind 未知 → 步兵; drawGolem team 不是 "ally" → 中立; drawTutorial side 未知 → up; owner 不是 "enemy" → 我方; 物品字串未知 → 虛線空框; drawSoulPopup mode 非 "replace" → 選單; cells 空 → 一格空魂件格。
- 時間性小動畫(呼吸、流動光點、電弧抖動、暈眩星、拖尾、光座脈動、輕快小鬼綁帶飄動、聚光燈描邊脈動、波次面板警示脈動、「[Z] 確定」閃爍)用 `performance.now()` 自己跑, 不影響狀態。教學完成大提示的光芒與彩帶只看 age。
- drawSlowMo 用 `saturation` 合成模式去色, 刻意作用於整張畫布; 其他函式一律 source-over。

## 畫面文字歸屬

依介面 textOwnership, 下列文字與鍵帽都由美術畫, **RD 不要另畫**: drawTitle(大標題、「第 N 關」、關名、星、鎖、「[←][→] 選關  [Z] 開始  [M] 靜音」)、**drawTutorialClear(「恭喜完成新手任務!」「[Z] 繼續」)**、drawGolem(「中立」)、**drawCastle(血量牌「hp/maxHp」)**、drawRespawnQueue、drawShopHint、drawComboName、drawActionHint、drawSoulPopup(含「教學中不能動」)、drawShopPopup(含「教學期間不能買」)、drawHud(關名、金幣、喇叭、「[Z] 互動  [C] 圖鑑  [Esc] 暫停  [M] 靜音」)、**drawWavePanel(「第 w / N 波」「開戰前」「下一波 S 秒」「完成新手任務後開始」「最後一波!」)**、**drawWaveBanner(「第 N 波」「共 T 波」「最後一波!」)**、drawSlowMo、**drawPause(「暫停」「[Esc] 繼續」)**、**drawCodex(「組合圖鑑」「已發現 n / 10」「已組過」「[C] 關閉」與 RD 傳的名稱 / 效果)**、**drawComboReveal(「新組合!」「[Z] 確定」與 RD 傳的名稱 / 效果 / 材料名)**、drawResult。
新手教學三個函式: **drawTutorial**(text 由 RD 傳, 美術畫; 「新手任務」標籤、鍵帽、檢查清單、打勾、完成特效由美術畫)、**drawGuide**(text / sub 由 RD 傳, 美術畫; 「下一張」「繼續」、進度環、小圓點由美術畫)、**drawTutorialWarn**(text 由 RD 傳, 美術畫)。drawShopZone、drawSpawnMark 不畫任何字。

## 物件表

所有 x, y 是物件中心(集結旗例外: 旗桿插地點); `targeted: true` 時在 size 外畫一圈白框(內緣貼齊 size 外邊, 寬 3)。沒標「本輪」的列與上一版相同。

| 物件 | 函式 | state 欄位 | 各狀態視覺差異 |
|---|---|---|---|
| 開始畫面(關卡預覽) | `drawTitle(ctx, s)` | levels[{name, unlocked, bestStars, tutorial}], cursorIndex, muted, blinkTime, tokenIndex, tokenFrom, tokenAge, tokenDuration, unlockIndex, unlockAge, unlockDuration | **本輪**: 標題 (640,150); 卡片間小路; 教學關綠底綠框 + 新芽; 玩家記號 40×40 在 (200+220×tokenIndex, 297), 推進時弧線跳 + 落地壓扁; 開鎖: 鎖頭抖 → 碎 7 片飛散、卡片由暗變亮; 選中卡放大 1.06 + 金框外光 |
| 教學完成大提示 | `drawTutorialClear(ctx, s)` | age, ready, closing, closeAge, closeDuration | **新**: 黑壓暗 0.55 + 緩轉金色放射光 + 彩帶(0~2.5 秒); 面板 680×220 深底金框, 0~0.4 秒 0.3 → 1.1 → 1.0; 金色粗大字; ready: 閃爍「[Z] 繼續」; closing: 整體淡出 |
| 背景 | `drawBackground(ctx, s)` | paths | 沿用 |
| 購買區 | `drawShopZone(ctx, s)` | x, y, radius, active | 沿用 |
| 商店提示 | `drawShopHint(ctx, s)` | x, y | 沿用 |
| 聖光軌跡 | `drawHolyTrail(ctx, s)` | points[[x, y, life], ...], maxLife | 沿用 |
| 魂柱範圍 | `drawPillarRange(ctx, s)` | x, y, radius, kinds, changeAge, changeDuration | 沿用 |
| 共鳴線 | `drawResonanceLine(ctx, s)` | x1, y1, x2, y2, kind, active | 沿用 |
| 主堡 | `drawCastle(ctx, s)` | x, y, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, targeted | **本輪**: 血量牌 100×20 中心 (x, y+38): 深底 + 小愛心 + 生命條 + 「hp/maxHp」; hp ≤ 5 紅牌慢閃; 受擊連牌一起紅閃; 攻擊上移 3px 連牌一起動 |
| 重生中提示 | `drawRespawnQueue(ctx, s)` | x, y, kind, progress, count | 沿用 |
| 弩塔 | `drawCrossbow(ctx, s)` | x, y, attackAge, attackDuration, moving, charging, rooted, resonating, targeted | 沿用 |
| 魂柱 | `drawPillar(ctx, s)` | x, y, kinds, moving, charging, rooted, targeted | 沿用 |
| 步兵 | `drawSoldier(ctx, s)` | x, y, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, charging, rooted, healing, resonating, returning, targeted | 沿用 |
| 石魔像 | `drawGolem(ctx, s)` | x, y, team, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, charging, rooted, healing, resonating, returning, targeted | 沿用 |
| 集結旗 | `drawRallyFlag(ctx, s)` | x, y, plantAge, plantDuration | 沿用 |
| 潰散 | `drawUnitBreak(ctx, s)` | kind, x, y, age, duration | 沿用 |
| 敵人 | `drawEnemy(ctx, s)` | type, x, y, hp, maxHp, hitAge, hitDuration, attackAge, attackDuration, moving, slowed, stunAge, stunDuration, healing, swift, targeted | **本輪 swift(只對小鬼)**: 身形寬 0.84、體色淺粉 #e88aa0、額頭白綁帶 + 兩條往後飄的帶尾; 受擊 / 減速疊層跟著瘦身形。其餘沿用 |
| 敵人倒下消散 | `drawCorpse(ctx, s)` | kind, x, y, life, maxLife | 沿用 |
| 地上的魂件 | `drawGroundPart(ctx, s)` | item, x, y, spawnAge, spawnDuration, life, maxLife, permanent, frozen, targeted | **本輪 frozen**: 不閃爍、細條不轉紅 |
| 金幣 | `drawCoin(ctx, s)` | x, y, spawnAge, spawnDuration | **本輪**: 落地中往上抬(最多 14px)+ 地上影子 |
| 玩家 | `drawPlayer(ctx, s)` | x, y, moving, handItem, holdingFlag, stealing, stealProgress, resonating, attackAge, attackDuration | 沿用 |
| Z 情境提示 | `drawActionHint(ctx, s)` | x, y, label | **本輪**: 「不能裝」「不能搶」也畫成紅 |
| 教學擋下提示 | `drawTutorialWarn(ctx, s)` | x, y, text, age, duration | **新**: 240×30 紙底 + 磚紅框; 左側紅圓白槓禁止記號; 磚紅深字; 0~0.15 秒 1.1 → 1.0, 最後 0.3 秒淡出 |
| 放置預覽 | `drawPlacePreview(ctx, s)` | kind, x, y, valid | 沿用 |
| 魂件槽列 | `drawSoulSlots(ctx, s)` | x, y, slots, virtual | 沿用 |
| 冰霜圈 | `drawFrostAura(ctx, s)` | x, y, radius, owner | 沿用 |
| 治癒領域 | `drawHealAura(ctx, s)` | x, y, radius, owner | 沿用 |
| 治癒光線 | `drawHealBeam(ctx, s)` | x1, y1, x2, y2, age, duration | 沿用 |
| 投射物 | `drawProjectile(ctx, s)` | x, y, angle, kind, owner | 沿用 |
| 雷電球 | `drawThunderOrb(ctx, s)` | x, y, pulseAge, pulseDuration | 沿用 |
| 穿透箭光束 | `drawPierceBeam(ctx, s)` | x1, y1, x2, y2, frost, age, duration | 沿用 |
| 範圍攻擊 | `drawAreaHit(ctx, s)` | kind, x, y, radius, angle, frost, age, duration | 沿用 |
| 電擊連鎖 | `drawShockChain(ctx, s)` | segments, owner, age, duration | 沿用 |
| 擊中火花 | `drawHitSpark(ctx, s)` | x, y, frost, age, duration | 沿用 |
| 瞬閃 | `drawBlink(ctx, s)` | x1, y1, x2, y2, age, duration | 沿用 |
| 搶奪連線 | `drawStealLink(ctx, s)` | x1, y1, x2, y2, progress | 沿用 |
| 組合名稱 | `drawComboName(ctx, s)` | x, y, name, isNew, age, duration | 沿用 |
| 出怪點「!」標示 | `drawSpawnMark(ctx, s)` | x, y, t | **新**: 暗紅圓牌 + 紅環 + 奶油色「!」符號 + 往下指路口的尖角; 隨 t 上下彈跳(≤ 7px)、外圈亮度脈動; 和出怪預警同一套配色 |
| 出怪點預警 | `drawSpawnWarning(ctx, s)` | x, y, angle, remaining, total | 沿用 |
| 新手任務泡泡 | `drawTutorial(ctx, s)` | stage, text, keys, pressedKeys, checklist, tipX, tipY, side, bodyX, bodyY, doneAge, doneDuration | **本輪**: 本體左上角「新手任務」琥珀標籤 72×18(中心 (bodyX−110, bodyY−36)); checklist 3 項 88×26 小卡: [魂件] → [單位], done = 淺綠底綠框 + 右側白勾綠圓、未完成 = 米色底 50% 淡。其餘沿用 |
| 暫停式引導卡 | `drawGuide(ctx, s)` | phase, phaseAge, phaseDuration, text, sub, index, total, last, spots, arrows, cardX, cardY, cardAge, cardDuration, readAge, readDuration, ready | **新**: 全畫面黑 0.6 壓暗, 聚光燈圓內挖空(柔邊往內); 描邊暖黃寬 3 亮度脈動; 粗箭頭(桿 8、三角 20×16)同色; 卡片 440×140 紙底深墨框 + 琥珀內框; 主句 23px、小字 16px; 右下 [Z] 26×26 + 進度環(琥珀 → 滿了綠), ready 前鍵帽與「下一張 / 繼續」35% 暗; 底部小圓點; intro: 壓暗淡入; outro: 卡片上飛 80 + 全部淡出 |
| HUD | `drawHud(ctx, s)` | level, levelName, gold, muted | **本輪**: 「第 N 關」+ 關名(x 16)、金幣(x 340)、喇叭 (860,25)、右側「[Z] 互動  [C] 圖鑑  [Esc] 暫停  [M] 靜音」(總寬約 260, 左緣約 1004) |
| 波次面板 | `drawWavePanel(ctx, s)` | x, y, wave, totalWaves, status, nextWaveIn, progress, bumpAge, bumpDuration | **新**: 220×58 深底淡金框; 第一行 22px「第 w / N 波」(w 金色)/「開戰前」; 第二行 14px: countdown「下一波 S 秒」+ 200×4 進度條(≤ 6 秒警示橘紅脈動)/ tutorial 沙漏 +「完成新手任務後開始」琥珀 / last「最後一波!」紅; bump: 面板亮一下 + 數字 1.3 倍彈 |
| 波次推進橫幅 | `drawWaveBanner(ctx, s)` | wave, totalWaves, last, age, duration | **新**: 560×96 半透明深底金框; 48px「第 N 波」(數字翻牌)+ 右下「共 T 波」; last: 紅框紅字「最後一波!」; 0~0.3 從左滑入、0.3~1.1 停住 + 一道掃光、1.1~1.6 縮到 0.39 倍飛進 (118,83) 並淡到 0.6 |
| 慢動作效果 | `drawSlowMo(ctx)` | (無) | 沿用 |
| 單位選單 / 替換彈窗 | `drawSoulPopup(ctx, s)` | mode, x, y, title, cells[{type, item/refund, locked}], index, hand, actionLabel, desc{name, text, materials, alt}, shakeAge, shakeDuration | **本輪 locked**: 格子壓暗 60% + 右下角 16×16 暗底鎖頭(魂件圖示照畫); 「教學中不能動」灰字 |
| 第一次合成演出 | `drawComboReveal(ctx, s)` | a, b, result, name, text, aName, bName, age, ready, closing, closeAge, closeDuration | **新**: 0~0.3 壓暗到 0.7; 0.3~0.9 材料 A / B(64)從兩側滑入 + 中間金「+」; 0.9~1.05 撞向中央 + 白光圈擴到 90; 1.05~1.2 組合圖示 96 彈 1.25; 1.2~1.5 面板 600×200 深底金框上滑淡入(「新組合!」、圖示 56、名稱 26px、效果 18px、[A] + [B] 小圖示與名稱); ready: 閃爍「[Z] 確定」; closing 淡出 |
| 組合圖鑑 | `drawCodex(ctx, s)` | entries[{a, b, result, aName, bName, name, text, opened}], foundCount | **新**: 壓暗 0.7 + 面板 1040×620; 標題、「已發現 n / 10」; 兩欄 11 列, 每列 [A] + [B] = [組合] 名稱 / 效果; opened: 右上綠框「已組過」章; 中間一條淡分隔線; 底部「[C] 關閉」 |
| 暫停 | `drawPause(ctx)` | (無) | **新**: 黑壓暗 0.5 + 面板 360×160 灰框; 白色暫停雙槓 + 「暫停」40px; 「[Esc] 繼續」 |
| 商店彈窗 | `drawShopPopup(ctx, s)` | items[{item, name, price, state, count, cap}], cursorIndex, message, shakeAge, shakeDuration | **本輪 locked**: 格底更黑 + 虛線框, 圖示 22%、品名 / 價格 45% 灰, 圖示位置疊 20×20 米色鎖頭(暗圓底); 游標仍可停上去(格內微亮 + 金框); 「教學期間不能買」琥珀色 |
| 結算畫面 | `drawResult(ctx, s)` | win, allClear, level, levelName, wave, totalWaves, castleHp, castleMaxHp, stars, starAge, starDuration, comboCount, options, cursorIndex | **本輪**: 按鈕 2 顆(545 / 735), 字照 options |

物品字串(conventions.itemKinds), 圖示全畫面同一套(沿用): 基本 8 種 = 單色圓角方塊 + 深色線圖示; 組合 10 種 = 金邊八角 + 兩材料色斜分; shop = 圓形金環徽章; crossbowKit / pillarKit / soldierKit / golemKit = 木箱底 + 單位小圖。

## 尺寸表

| 物件 | 判定框 size | 實際繪製 |
|---|---|---|
| 開始畫面 | 1280×720 | 標題中心 (640,150) 76px; 卡片 200×150 中心 (200+220i, 400), 選中 212×159; 小路 y 389~411(x 200~1080, 卡片蓋住); 記號 40×40 中心 (200+220i, 297)(y 277~317), 跳躍頂點 y 237, 壓扁最寬 46、都在 48×48 內; 開鎖碎片最遠 x ±97、y −71~+87(卡片外 ≤ 20); 新芽 (卡片 x+76, y−52) 約 18×21 |
| 教學完成大提示 | 壓暗 1280×720 / 面板 680×220 | 面板中心 (640,360); 大字中心 (640,340) 46px; 「[Z] 繼續」(640,420); 彈入最大 748×242(允許) |
| 主堡 | 112×112 | 血量牌 100×20 中心 (1180,472)(x 1130~1230、y 462~482); 愛心 14×14 中心 (1142,472); 生命條 x 1152~1200、高 8; 數字右緣 1228(最寬 25, 不壓條); 軍旗 y 426~454 |
| 金幣 | 16×16 | 半徑 7; 落地中往上至多 14(框外上方, 允許) |
| 敵人 | 同上一版 | 輕快小鬼身形寬約 27, 帶尾到 x−15, 都在 32×32 內 |
| 教學擋下提示 | 240×30 | 彈入最大 264×33(允許); 禁止記號圓心 (x−102, y) 半徑 9; 文字中心 x+8、最寬 196 |
| 出怪點「!」標示 | 48×64 | 牌身半徑 19、外圈外緣 23(中心 y−2); 尖角到 y+28; 彈跳 0~−7 → 全部在 x±24、y−32~+28 |
| 新手任務泡泡 | 本體 300×72 / 標籤 72×18 | 標籤 x bodyX−146~−74、y bodyY−45~−27; 清單項 88×26 中心 (bodyX + (k−1)×96, bodyY+16): 魂件圖示 20 在 −30、箭頭 −17~−6、單位小圖 20 在 +6、完成勾直徑 14 在 +31; 完成特效 345×83(允許) |
| 引導卡 | 壓暗 1280×720 / 卡片 440×140 | 卡片彈入最大 462×147(允許); 主句中心 y −16(有 sub)/ −6, 兩行時 ±15; sub 中心 +26、最寬 300; [Z] 26×26 中心 (+180, +44), 進度環外緣 20; 「下一張 / 繼續」右緣 +158; 小圓點 y +54、直徑 8(未選為 6.5 空心)、間距 14; 箭頭桿寬 8、三角 20×16; 聚光燈圓可伸出畫面(介面允許) |
| HUD | 1280×50 | 右側提示鍵帽 22×22 / Esc 32×22, 總寬約 260, 右緣 1264、左緣約 1004 |
| 波次面板 | 220×58 | 範圍 x 8~228、y 54~112; 第一行中心 y−12(數字彈到 1.3 倍上緣約 y−26, 未超出面板); 第二行中心 y+10; 進度條 x−100~+100、y+21~+25 |
| 波次推進橫幅 | 560×96 | 停住時 x 360~920、y 152~248; 縮到 0.39 倍 ≈ 218×37 中心 (118,83); 翻牌剪在數字格內 |
| 單位選單 / 替換彈窗 | 320×180 | 鎖頭底 16×16 在格右下(格中心 +3~+19); actionLabel 最寬 120 |
| 第一次合成演出 | 壓暗 1280×720 / 面板 600×200 | 材料 64×64(y 250); 閃光外緣 ≤ 90; 組合圖示 96(彈到 120); 面板停在中心 (640,470); 面板內版位照介面 |
| 組合圖鑑 | 壓暗 1280×720 / 面板 1040×620 / 列 480×76 | 列中心 x 380 / 900、y 165 + 84i; 名稱最寬 170、效果最寬 236; 「已組過」56×18 中心 (列 x+204, 列 y−24) |
| 暫停 | 壓暗 1280×720 / 面板 360×160 | 面板中心 (640,360); 暫停雙槓 x 562~586、y 320~350; 「暫停」(640,335) 40px; 「[Esc] 繼續」(640,395) |
| 商店彈窗 | 480×150 | 鎖頭 20×20 中心 (格 x, −14.5), 暗圓底半徑 14 |
| 結算畫面 | 1280×720 | 按鈕 2 顆中心 x 545 / 735 |
| 其他物件 | — | 與上一版相同(購買區 110、商店提示 88×24、聖光軌跡 40 寬、魂柱範圍 150、重生中 132×36、弩塔 48、魂柱 36、步兵 32、石魔像 56 + 中立牌、集結旗 24×40、潰散 96 / 120、地上魂件 28、玩家 32、Z 提示 96×22、放置預覽、槽列、冰霜圈 70、治癒領域 100、治癒光線 8 寬、投射物 10、雷電球 120、穿透 28、範圍 120、連鎖 ≤ 12 寬、火花 24、瞬閃 ≤ 12 寬、組合名稱 200×36 / 280×48、出怪預警 64) |

## 交付自查紀錄

- `node --check` 通過; 匯出表 = 介面的 51 個函式, 沒有多出或缺少。
- 用會追蹤變換矩陣、剪裁、線寬, 並依實際角度取樣 arc / ellipse 與二次 / 三次曲線的假 ctx, 對**匯出表全部 51 個函式**呼叫約 8400 次(5 個時間點 × 各狀態): 開始畫面 5 個游標 × 記號跳躍 0~0.8 每 0.05 × 開鎖 0~0.6 每 0.04、教學完成大提示 0~3.2 秒 × 關閉、主堡 hp 20 / 13 / 5 / 1 / 0 × 受擊 × 攻擊、金幣落地 0~0.4、小鬼 swift × 移動 / 減速 / 治癒 / 攻擊、19 種魂件 × frozen × life、Z 提示 5 種 label、擋下提示 0~1.2、「!」標示 0~3 秒、波次面板 3 種 status × wave 0 / 1 / 3 × bump 0~0.4 × 倒數 24 / 6 / 1、波次橫幅 0~1.6 × last、教學泡泡 4 方向 × 4 種按鍵列 × 3 種清單 × 完成進度 0~0.6、引導卡 5 組聚光燈(含兩圈重疊、半徑 154、伸出畫面)× 3 個 phase × 卡片彈入 × 閱讀進度、卡片長字串 × 9 個小圓點、合成演出 0~1.5 × 關閉、圖鑑 11 列、暫停、選單 2 組格子(全鎖 / 不鎖)× 游標 × 3 種 actionLabel、商店 3 / 4 格 × 4 種狀態 × 3 種訊息、結算勝 / 敗, 外加每個函式 4 組壞狀態(空物件、undefined、null、表外字串 / NaN / 非陣列 / 極大值)。結果: 不拋錯、save/restore 成對、合成模式不殘留。
- 超框: 擋下提示、「!」標示、波次面板、波次橫幅三段、主堡(含血量牌)、金幣、輕快小鬼、Z 提示、教學泡泡(非完成特效時)、引導卡卡片(含彈入最大一幀)、選單、商店都在框內。剩下的報警是已知且允許的: 開始畫面與背景的路線伸到畫布外(畫布裁掉)、第 1 關出怪點的聚光燈 (40,290) r 56 左緣伸出畫面 16~20px(介面「照畫」)。開始畫面記號與開鎖碎片在整張畫面裡量不出來, 以尺寸表的數學驗算為準。
- 介面每個 state 欄位都有被讀到, 只有 drawTutorial 的 `stage` 刻意不讀(見判讀約定)。上一版 drawHud 的 castleHp / castleMaxHp / wave / totalWaves / nextWaveIn / clockPaused 已不再讀。
- `globalCompositeOperation` 只有 drawSlowMo 用 `saturation`(全畫面), 用完設回 source-over。
