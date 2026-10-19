# 魂匠守衛者 — 音效說明(給 RD)

## 聲音風格
奇幻工坊的實體聲: 木、石、金屬的碰撞與弓弦負責動作, 魂件用晶亮的寶石 / 玻璃聲, 獎勵用鋼鼓與撥弦短樂句(組合、收編、勝利同一家族), 背景音樂是 Kevin MacLeod 的中世紀風曲子。

## 接法
- `index.html` 在 `game.js` 之前加 `<script src="audio/sound.js"></script>`。全域物件 `window.Sound`, 不是 ES module
- **第一次按鍵時呼叫 `Sound.init()`**(keydown 處理裡, 每次呼叫都無害)。init 之前的 `play` 一律靜默丟棄; `playMusic` 會被記住, init 時才開始播(所以開始畫面一出現就可以先呼叫 `Sound.playMusic('title')`)
- 事件名一律照 interface.json(底線小寫), 未知名稱靜默忽略
- 音效在頁面載入時就預先解碼, 第一鍵即可出聲

## API
| 呼叫 | 說明 |
|---|---|
| `Sound.init()` | 第一次使用者按鍵時呼叫; 重複呼叫無害 |
| `Sound.play(name, opts)` | 一次性音效。opts 可省略, 欄位見下 |
| `Sound.playMusic(name)` | `'title'` 或 `'battle'`, 循環播放; 切曲時前一首淡出。同一首重複呼叫不會重頭播 |
| `Sound.stopMusic()` | 淡出停止背景音樂 |
| `Sound.setMuted(bool)` | 靜音開關, 同時作用於音樂與音效。狀態存在 Sound 裡, 換關不會重置 |
| `Sound.isMuted()` | 目前是否靜音(HUD / 開始畫面喇叭圖示可直接讀這個) |

opts 欄位(全部可省略):
- `volume`: 0~1, 乘在該事件的音量上, 預設 1。一般不需要
- `index`: 只有 `star` 用, 第幾顆星(0 / 1 / 2), 音高逐顆升高

## 事件表
音量 = 檔案最響 50 毫秒的響度(dBFS), 已燒進檔案, RD 不用另外調。全部不循環。

| 事件名 | 對應音效清單 | 何時呼叫 | opts | 素材 | 音量 |
|---|---|---|---|---|---|
| ui_move | ui_move | 開始畫面、結算畫面、彈窗中 ← → 移動游標(游標真的有移動時) | — | sfx_ui_move.mp3(Kenney 滴答) | −22 |
| ui_confirm | ui_confirm | 開始畫面 Z 進關、結算畫面 Z 執行按鈕 | — | sfx_ui_confirm.mp3 | −16 |
| ui_invalid | ui_invalid | 任何無效操作: 彈窗抖一下、商店買不起、不能蓋的位置按 Z | — | sfx_ui_invalid.mp3 | −18 |
| popup_open | popup_open | 任何彈窗打開(進入慢動作)的那一刻 | — | sfx_popup_open.mp3(音高下滑) | −17 |
| popup_close | popup_close | 彈窗關閉(恢復正常速度)的那一刻; 不論是按 X 關、還是動作完成自動關 | — | sfx_popup_close.mp3(音高上揚) | −17 |
| take_part | take_part | 從彈窗拿起魂件、撿起地上的魂件 | — | sfx_take_part.mp3(寶石聲) | −18 |
| install_part | install_part | 魂件直接裝上單位(拿著魂件靠近單位按 Z 裝進空格) | — | sfx_install_part.mp3(金屬卡榫) | −16 |
| swap_part | swap_part | 替換彈窗互換、與地上的魂件互換 | — | sfx_swap_part.mp3(兩聲寶石) | −19 |
| drop_part | drop_part | 把手上的魂件 / 擴槽石丟在腳下 | — | sfx_drop_part.mp3(石頭落地) | −19 |
| slot_expand | slot_expand | 擴槽石用掉(單位多一格) | — | sfx_slot_expand.mp3(法術 + 上揚) | −15 |
| purchase | purchase | 商店購買成功 | — | sfx_purchase.mp3(錢幣) | −19 |
| place_unit | place_unit | 蓋下弩塔 / 魂柱、放下兵 | — | sfx_place_unit.mp3(木頭重落地) | −14 |
| coin_pickup | coin_pickup | 撿到金幣(每枚) | — | sfx_coin_pickup.mp3(每次音高隨機微變) | −18 |
| steal_start | steal_start | 開始搶奪(讀條開始) | — | sfx_steal_start.mp3(鐵鍊拉扯) | −18 |
| steal_done | steal_done | 搶奪成功(讀條滿) | — | sfx_steal_done.mp3(拔劍「唰」+ 寶石) | −14 |
| steal_cancel | steal_cancel | 搶奪取消(拉太遠、敵人死、再按 Z) | — | sfx_steal_cancel.mp3(低沉布料) | −21 |
| combo | combo | 單位頭上跳出組合名稱(非首次) | — | sfx_combo.mp3(短鋼鼓上行) | −15 |
| combo_new | combo_new | 跳出「新組合!」 | — | sfx_combo_new.mp3(長鋼鼓上行 + 玻璃) | −12 |
| arrow_shot | arrow_shot | 我方遠攻、冰箭射出 | — | sfx_arrow_shot.mp3(弓弦) | −24 |
| pierce_shot | pierce_shot | 穿透箭射出 | — | sfx_pierce_shot.mp3(低弓弦 + 光束) | −19 |
| melee_hit | melee_hit | 我方近戰、冰霜重擊命中 | — | sfx_melee_hit.mp3(鈍擊) | −20 |
| whirl | whirl | 旋風斬發動 | — | sfx_whirl.mp3(揮砍風聲) | −18 |
| charge_hit | charge_hit | 衝鋒撞到敵人 | — | sfx_charge_hit.mp3(重拳 + 木板) | −13 |
| enemy_shot | enemy_shot | 弓鬼射我方兵 | — | sfx_enemy_shot.mp3(降調弓弦) | −23 |
| enemy_die | enemy_die | 敵人生命歸 0 | — | sfx_enemy_die.mp3(鬼魂嘶聲 + 寶石閃) | −18 |
| unit_down | unit_down | 我方兵生命歸 0、化成魂光 | — | sfx_unit_down.mp3(撥弦兩音下行) | −18 |
| unit_return | unit_return | 兵從主堡走出 | — | sfx_unit_return.mp3(撥弦兩音上行) | −18 |
| recruit | recruit | 中立石魔像進入主堡 | — | sfx_recruit.mp3(鋼鼓上行 + 木擊) | −14 |
| wave_warning | wave_warning | 預警開始(每波一次, 不論幾個出怪點) | — | sfx_wave_warning.mp3(警鐘) | −14 |
| wave_start | wave_start | 第 k 波開始出怪 | — | sfx_wave_start.mp3(低沉號角, 2.4 秒) | −12 |
| castle_hit | castle_hit | 敵人進入主堡扣血(生命沒歸 0 時) | — | sfx_castle_hit.mp3(重門撞擊) | −11 |
| tutorial_done | tutorial_done | 教學階段完成特效開始時 | — | sfx_tutorial_done.mp3(撥弦跳音) | −16 |
| level_win | level_win | 結算勝利出現 | — | sfx_level_win.mp3(鋼鼓 + 銅管 + 弦樂, 3 秒) | −11 |
| level_lose | level_lose | 結算失敗出現 | — | sfx_level_lose.mp3(撥弦下行 + 薩克斯) | −13 |
| star | star | 結算時每顆星跳出(第 1、2、3 顆各呼叫一次) | `index`: 0 / 1 / 2 | sfx_star.mp3(金屬鈴, 逐顆升高) | −15 |

全部素材都是現成的線上素材加工, 沒有程式產生的音效。

## 背景音樂
| 曲名 | 何時 | 素材 | 備註 |
|---|---|---|---|
| title | 開始畫面: `Sound.playMusic('title')` | music_title.mp3(Kevin MacLeod〈Village Consort〉, 3 分 35 秒整首) | 循環, 首尾交叉淡化 1.2 秒 |
| battle | 進入關卡: `Sound.playMusic('battle')`(重玩、下一關也呼叫; 已在播就不會重頭) | music_battle.mp3(Kevin MacLeod〈Heroic Age〉, 1 分 37 秒整首) | 循環, 首尾交叉淡化 1.2 秒 |

- 結算畫面: 呼叫 `Sound.stopMusic()`。另外 `level_win` / `level_lose` 播放時 Sound 也會自動淡出音樂, 漏呼叫也不會疊在一起
- 彈窗(慢動作)壓音樂: **RD 不用另外處理**。`play('popup_open')` 時 Sound 自動把音樂降到一半音量、放慢到 0.85 倍(音高跟著變低, 聽起來像時間變慢); `play('popup_close')` 恢復。所以每次開彈窗、關彈窗都要各呼叫一次, 不能漏 close
- 靜音: X 切換時呼叫 `Sound.setMuted(!Sound.isMuted())`。靜音時音樂照走只是無聲, 取消靜音會從當下位置繼續

## 同時觸發的處理
Sound 內建的保險(RD 照規格做了也不衝突):
- 同一個事件 25 毫秒內只播一次(等於同一幀只播一次); `arrow_shot` 100 毫秒、`enemy_shot` / `pierce_shot` / `whirl` 60 毫秒、`melee_hit` / `charge_hit` 50 毫秒、`coin_pickup` / `enemy_die` 40 毫秒內只播一次
- 同一個事件最多同時 4 聲(弓聲 3 聲; `level_win`、`level_lose`、`wave_start`、`wave_warning` 各 1 聲), 超過時切掉最舊的
- 不同事件之間互不打斷, 全部疊播

要 RD 決定的(照規格):
- 最後一隻敵人倒下 → 勝利: `enemy_die` 照播, `level_win` 疊著播
- 敵人突破主堡 → 主堡生命歸 0: 只播 `level_lose`, **不播** `castle_hit`
- 同一幀跳出多個組合名稱: 該幀只呼叫一次; 有任何一個是首次就只播 `combo_new`, 否則只播 `combo`
- 直接裝上同時造成組合: `install_part` 與 `combo` / `combo_new` 同一幀都呼叫(疊播)
- `steal_done` 單獨播, 不帶組合音
- 教學完成與觸發完成的動作音效(例 `install_part`)同一幀都呼叫
- 波次預警與戰鬥音效疊播, 不用壓
- 開彈窗那一下若同時有別的音(例 Z 拿起後開替換彈窗), 照常都呼叫

## 理念或經驗落實
- 「即時回饋音聽起來延遲」: 按鍵直接回饋的音(ui_*、take/install/swap/drop、steal_*)都量過出到峰值一成的時間, 全部在 0.025 秒內; 音效以 mp3 base64 內嵌、頁面載入時就離線解碼, init 後用 Web Audio 播, 不受 HTMLAudio 首次載入延遲影響
- 「mp3 開頭填充」: 每個檔頭放 20 毫秒數位靜音, 解碼後找第一個明顯樣本自動算出要跳過多少(Node 量得編碼延遲約 25 毫秒), 各瀏覽器解碼器差異自動校正
- 「背景音樂合成太快、一直重複很膩」: 兩首都用現成整首曲子(title 3 分 35 秒、battle 1 分 37 秒), 不截短循環; battle 選 129 BPM 明亮進行曲而不是快節奏電子
- 「CC BY 音樂的署名文字」: 照 incompetech 固定格式寫進 credits.md, 需要放在遊戲畫面上
- 「素材包頁面同列多種授權」: artisticdude 的 Battle Sound Effects 頁面同時列 CC-BY / CC-BY-SA / GPL / CC0, 選 CC0 並在 credits 寫明
- 「成對事件取同一段素材」: popup_open / popup_close 用 Kenney 同一組的下滑 / 上揚掃頻; unit_down / unit_return 用同一把撥弦的兩音下行 / 上行

聲音的輕重與辨識度都待試玩確認(音效 agent 聽不到聲音, 全部是用量測選的)。
