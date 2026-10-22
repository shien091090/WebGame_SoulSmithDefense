# 魂匠守衛者 — 音效說明(給 RD)

## 聲音風格
奇幻工坊的實體聲: 木、石、金屬的碰撞與弓弦負責動作, 魂件用晶亮的寶石 / 玻璃聲, 獎勵用鋼鼓與撥弦短樂句(組合、收編、勝利同一家族), 背景音樂是 Kevin MacLeod 的中世紀風曲子。

電擊系一律用「電流劈啪 / 嗡鳴」(faxcorp 電流音效包 + 真實雷聲), 治癒用柔和的合成鈴, 兩者都和既有的寶石 / 鋼鼓 / 撥弦家族分開。

新手教學與介面(打磨第 4 輪)用同一批素材包的「紙、書、玻璃、撥弦」: 暫停 / 圖鑑是實體的收合與書本, 引導卡是紙牌, 新任務是玻璃「叮」, 畢業是勝利樂句的輕量版。

Boss(打磨第 7 輪)是同一套實體聲的「大一號」: 真實錄音的冰裂、馬蹄、碎石、雷聲, 疊上既有的戰鼓(低音通鼓)與怪物吼聲; 雷霆魔王的電流沿用 faxcorp 電流包, 和電擊系同一種電。Boss 曲同樣是 Kevin MacLeod, 但換成有鐵砧與合唱的重打擊曲。

## 本輪(打磨第 7 輪)變更
- **新增事件**(名稱照 interface.json): `boss_intro_frost`、`boss_intro_bull`、`boss_intro_thunder`、`boss_die`
- **新增背景音樂** `boss`。**RD 不用自己切曲**: 呼叫 `boss_intro_*` 的那一刻, Sound 會自動讓 `battle` 在 0.3 秒內淡出, 2.0 秒時 `boss` 從頭淡入(0.5 秒)。RD 若在 2.0 秒照規格再呼叫 `Sound.playMusic('boss')` 也無害(不會重頭播)
- 其他事件的素材、音量、opts 都沒變(沿用第 6 輪)

## 上一輪(打磨第 6 輪)變更
- **不新增事件、不換音檔、音量不變**, sound.js 與 assets/ 沿用第 5 輪(檔案沒有改動)
- `ui_invalid` 多一個呼叫時機: 關卡預覽頁上, 第 1 關卡片有教學鎖時按 ← 想移過去、被擋下的那一刻
- 關卡預覽頁「操作鎖」期間(進頁面到推進動畫播完, 含新手教學完成大提示; 只接受 M)按 Z、←、→ **不呼叫任何音效**, 也不呼叫 `ui_invalid`
- 新的斬擊特效(近戰、冰霜重擊、雷霆斬命中)不另配音: 同一幀照舊呼叫 `melee_hit`(雷霆斬是 `thunder_slash`)
- 搬運箭頭出現 / 換下一件、檢查清單打勾都**不呼叫音效**(換件時本來就有 `take_part` / `install_part` / `swap_part`)
- 階段 22 等待提示「石魔像正在朝著主堡移動,請等待」第一次出現時呼叫 `quest_new`; 招募成功呼叫 `recruit`, 泡泡換成「去主堡看看」**不再**呼叫 `quest_new`

## 上上輪(打磨第 5 輪)變更
- **不新增事件、不換音檔、音量不變**, sound.js 與 assets/ 沿用第 4 輪
- `coin_pickup` 多一個呼叫時機: 第 2 關教學補金幣(階段 24、30, 金幣補上的那一刻), 跟同時出現的新任務 `quest_new` 疊播
- `ui_invalid` 的「被教學鎖擋下」改成「按 Z 放在教學不允許的位置、被擋下」那一刻(放置預覽階段不播, 只有真的按 Z 才播)
- 第 2 關階段 17 / 25 完成: `tutorial_done` 播在完成時, 0.6 秒後才開始預警並呼叫 `wave_warning`, 兩者不同一幀

## 更早(打磨第 4 輪)變更
- 新增事件(名稱照 interface.json): `quest_new`、`guide_pause`、`guide_card`、`combo_reveal`、`pause_on`、`pause_off`、`codex_open`、`codex_close`、`level_advance`、`level_unlock`、`tutorial_clear`
- 呼叫時機擴大(素材不變): `ui_confirm` 也用在引導卡最後一張按 Z、合成演出按 Z 關閉、新手教學完成大提示按 Z; `ui_invalid` 也用在被教學鎖擋下
- 背景音樂壓低: 除了彈窗, **Esc 暫停、圖鑑、引導卡、合成演出**期間也自動降到一半(由音效事件帶動, RD 不用另外接, 見背景音樂一節)
- `wave_start` 沿用原音檔(見事件表的時間點, 給動畫對齊用)
- 其餘事件的素材、音量、opts 都沒變(沿用第 3 輪)

## 更早(打磨第 3 輪)變更
- 新增事件: `shock_zap`、`thunder_slash`、`thunder_orb`、`blink`、`heal_ray`
- 呼叫時機擴大(素材不變): `charge_hit` 神聖之路撞到敵人也呼叫; `home_refund` 兵走回主堡也呼叫; `steal_done` 讀條中敵人倒下也呼叫
- 靜音鍵改成 M(見背景音樂一節)

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
| `Sound.playMusic(name)` | `'title'`、`'battle'` 或 `'boss'`, 循環播放; 切曲時前一首淡出。同一首重複呼叫不會重頭播(`boss` 一般不用呼叫, 見背景音樂一節) |
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
| ui_confirm | ui_confirm | 開始畫面 Z 進關、結算畫面 Z 執行按鈕、**引導卡最後一張按 Z、合成演出按 Z 關閉、新手教學完成大提示按 Z**。⚠ 引導卡與合成演出的音樂壓低靠這一聲解除, 結束時一定要呼叫 | — | sfx_ui_confirm.mp3 | −16 |
| ui_invalid | ui_invalid | 任何無效操作: 彈窗抖一下、商店買不了、不能蓋 / 不能插旗的位置按 Z、按 Z 放在教學不允許的位置被擋下(第 5 輪起放置預覽不再提前擋, 只在按 Z 那一刻播)、**關卡預覽頁按 ← 想選上教學鎖的第 1 關被擋下**(第 6 輪新增)。關卡預覽頁操作鎖期間按 Z / ← / → 不播 | — | sfx_ui_invalid.mp3 | −18 |
| popup_open | popup_open | 任何彈窗打開(進入慢動作)的那一刻 | — | sfx_popup_open.mp3(音高下滑) | −17 |
| popup_close | popup_close | 彈窗關閉(恢復正常速度)的那一刻; 不論是按 X 關、還是動作完成自動關 | — | sfx_popup_close.mp3(音高上揚) | −17 |
| take_part | take_part | 從選單拿起魂件、撿起地上的魂件 | — | sfx_take_part.mp3(寶石聲) | −18 |
| install_part | install_part | 魂件直接裝上單位(拿著魂件靠近單位按 Z 裝進空格) | — | sfx_install_part.mp3(金屬卡榫) | −16 |
| swap_part | swap_part | 替換彈窗互換、與地上的魂件互換 | — | sfx_swap_part.mp3(兩聲寶石) | −19 |
| drop_part | drop_part | 把手上的魂件丟在腳下 | — | sfx_drop_part.mp3(石頭落地) | −19 |
| fuse | fuse(新) | 同一單位上兩件基本魂件合成一件組合魂件的那一刻(裝上、互換、搶奪後皆可能) | — | sfx_fuse.mp3(鍛造金屬敲擊 + 法術上揚, 0.56 秒) | −13 |
| ground_expire | ground_expire(新) | 地上的魂件閃完消失的那一刻(「購買」不會消失, 不呼叫) | — | sfx_ground_expire.mp3(輕布料「噗」+ 降調小寶石, 0.3 秒; 每次音高隨機微變) | −24 |
| purchase | purchase | 商店購買成功 | — | sfx_purchase.mp3(錢幣) | −19 |
| place_unit | place_unit | 蓋下弩塔 / 魂柱 | — | sfx_place_unit.mp3(木頭重落地) | −14 |
| flag_plant | flag_plant(新) | 插下旗幟(買兵後、或「重設集結點」後) | — | sfx_flag_plant.mp3(木樁插土 + 旗布一甩, 0.5 秒) | −15 |
| demolish | demolish(新) | 單位選單「拆除」執行、建築消失的那一刻 | — | sfx_demolish.mp3(木板碎裂 + 碎石 + 尾端少量錢幣, 0.8 秒) | −13 |
| home_refund | home_refund | 我方單位(建築或兵)走回主堡、消失並退款的那一刻 | — | sfx_home_refund.mp3(一把錢幣 + 皮袋收口, 0.8 秒) | −19 |
| coin_pickup | coin_pickup | 撿到金幣(每枚); **第 2 關教學補金幣(階段 24、30)補上的那一刻呼叫一次**(第 5 輪新增) | — | sfx_coin_pickup.mp3(每次音高隨機微變) | −18 |
| steal_start | steal_start | 開始搶奪(讀條開始) | — | sfx_steal_start.mp3(鐵鍊拉扯) | −18 |
| steal_done | steal_done | 搶奪成功(讀條滿, 或讀條中敵人倒下) | — | sfx_steal_done.mp3(拔劍「唰」+ 寶石) | −14 |
| steal_cancel | steal_cancel | 搶奪取消(拉太遠、敵人死、再按 Z) | — | sfx_steal_cancel.mp3(低沉布料) | −21 |
| combo | combo | 單位頭上跳出組合名稱(非首次) | — | sfx_combo.mp3(短鋼鼓上行) | −15 |
| combo_new | combo_new | 跳出「新組合!」 | — | sfx_combo_new.mp3(長鋼鼓上行 + 玻璃) | −12 |
| arrow_shot | arrow_shot | 我方(含玩家)遠攻、冰箭射出 | — | sfx_arrow_shot.mp3(弓弦) | −24 |
| pierce_shot | pierce_shot | 穿透箭射出 | — | sfx_pierce_shot.mp3(低弓弦 + 光束) | −19 |
| melee_hit | melee_hit | 我方(含玩家)近戰、冰霜重擊命中(和第 6 輪新增的斬擊特效同一幀) | — | sfx_melee_hit.mp3(鈍擊) | −20 |
| whirl | whirl | 旋風斬發動 | — | sfx_whirl.mp3(揮砍風聲) | −18 |
| charge_hit | charge_hit | 衝鋒 / 神聖之路撞到敵人(撞退 + 暈眩) | — | sfx_charge_hit.mp3(重拳 + 木板) | −13 |
| shock_zap | shock_zap(新) | 電擊單獨放電、附電的連鎖、雷電球每次放電(每 0.5 秒)、雷鬼放電、瞬閃落地放電。**雷霆斬的連鎖不呼叫**。玩家、單位、敵人都用同一個事件名 | — | sfx_shock_zap.mp3(短促放電「啪」+ 低一點的電嗡, 0.27 秒; 每次音高隨機微變) | −24 |
| thunder_slash | thunder_slash(新) | 雷霆斬命中(每一擊一次, 和斬擊特效同一幀; 它的連鎖不另播 shock_zap) | — | sfx_thunder_slash.mp3(重拳 + 放電 + 真實雷聲炸裂, 1.0 秒) | −13 |
| thunder_orb | thunder_orb(新) | 雷電球發射的那一刻(球之後每 0.5 秒的放電另呼叫 shock_zap) | — | sfx_thunder_orb.mp3(0.26 秒電嗡漸強 → 揮出風聲 + 放電, 0.65 秒) | −18 |
| blink | blink(新) | 瞬閃發動: 瞬移到敵人面前、或瞬移回集結點, 都呼叫(魂柱自己瞬移也是) | — | sfx_blink.mp3(電光瞬移聲 + 輕揮風「咻」, 0.7 秒) | −17 |
| heal_ray | heal_ray(新) | 治癒光線射出(每道一次) | — | sfx_heal_ray.mp3(柔和的合成鈴, 穩定在 A 音, 0.8 秒; 每次音高隨機微變) | −20 |
| enemy_shot | enemy_shot | 弓鬼射我方兵 | — | sfx_enemy_shot.mp3(降調弓弦) | −23 |
| enemy_die | enemy_die | 敵人生命歸 0 | — | sfx_enemy_die.mp3(鬼魂嘶聲 + 寶石閃) | −18 |
| unit_down | unit_down | 我方兵生命歸 0、化成魂光 | — | sfx_unit_down.mp3(撥弦兩音下行) | −18 |
| unit_return | unit_return | 兵從主堡門走出(重生完、買的兵出發、行軍 / 衝鋒繞回) | — | sfx_unit_return.mp3(撥弦兩音上行) | −18 |
| recruit | recruit | 中立石魔像進入主堡 | — | sfx_recruit.mp3(鋼鼓上行 + 木擊) | −14 |
| wave_warning | wave_warning | 預警開始(每波一次, 不論幾個出怪點) | — | sfx_wave_warning.mp3(警鐘) | −14 |
| wave_start | wave_start | 第 k 波開始出怪, **和波次推進橫幅滑入同一幀**(第 1 關教學推進的波次也一樣) | — | sfx_wave_start.mp3(沿用。時間點: 戰鼓 0 / 0.3 / 0.6 秒三響, 號角 0.62 秒起長鳴到約 2.55 秒; 號角起點落在橫幅停住的 0.3~1.1 秒區間內) | −11 |
| castle_hit | castle_hit | 敵人進入主堡扣血(生命沒歸 0 時) | — | sfx_castle_hit.mp3(重門撞擊) | −11 |
| tutorial_done | tutorial_done | 新手任務完成特效(泡泡打勾)開始時 | — | sfx_tutorial_done.mp3(撥弦跳音) | −16 |
| quest_new | quest_new(新) | 新的新手任務泡泡第一次出現(同一個任務重出 / 重畫不再播); 階段 22 的等待提示第一次出現也播, 之後換成「去主堡看看」不再播 | — | sfx_quest_new.mp3(玻璃「叮」, 穩定 1470 Hz, 0.5 秒) | −21 |
| guide_pause | guide_pause(新) | 一段引導卡開始、整個遊戲暫停的那一刻(一段只播一次)。**同時把音樂壓到一半**, 直到 `ui_confirm` | — | sfx_guide_pause.mp3(悶擊「停」+ 下行鋼鼓樂句像磁帶一樣減速停下, 音高 437→128 Hz, 0.6 秒) | −15 |
| guide_card | guide_card(新) | 每張引導卡彈入: 第 1 張在 guide_pause 後 0.3 秒、之後每換一張(按 Z 換卡本身不另播) | — | sfx_guide_card.mp3(紙牌滑出, 0.28 秒) | −19 |
| combo_reveal | combo_reveal(新) | 某條配方第一次真的合成、演出開始那一幀(該幀不播 fuse / combo_new / combo)。**同時把音樂壓到一半**, 直到按 Z 關閉時的 `ui_confirm` | — | sfx_combo_reveal.mp3(0.9 秒反轉蓄力 → **0.90 秒撞擊**(重金屬 + 重拳 + 玻璃)→ 組合鋼鼓上行, 共 1.6 秒; 動畫的撞擊點對 0.9 秒) | −10 |
| pause_on | pause_on(新) | 關卡中按 Esc 暫停。**同時把音樂壓到一半** | — | sfx_pause_on.mp3(收合「咻」, 0.15 秒) | −19 |
| pause_off | pause_off(新) | 按 Esc 繼續(解除暫停)。音樂恢復(若圖鑑等其他壓低原因還在, 維持一半) | — | sfx_pause_off.mp3(展開, 0.15 秒; 與 pause_on 同一組) | −19 |
| codex_open | codex_open(新) | 按 C 打開組合圖鑑。**同時把音樂壓到一半** | — | sfx_codex_open.mp3(書封打開 + 翻頁, 0.46 秒) | −17 |
| codex_close | codex_close(新) | 圖鑑關閉(不論按 C 還是其他方式關) | — | sfx_codex_close.mp3(闔書「啪」, 0.18 秒) | −16 |
| level_advance | level_advance(新) | 關卡預覽頁推進動畫, 玩家記號開始從這關跳往下一關的那一刻 | — | sfx_level_advance.mp3(輕揮風 + 撥弦兩音上行 + 輕落地, 0.36 秒) | −17 |
| level_unlock | level_unlock(新) | 推進動畫中下一關的鎖碎開那一刻 | — | sfx_level_unlock.mp3(鎖頭「喀」+ 玻璃碎裂 + 明亮餘韻, 0.6 秒) | −17(峰值限制, 實際比目標 −14 輕一點) |
| tutorial_clear | tutorial_clear(新) | 「恭喜完成新手任務!」大提示出現 | — | sfx_tutorial_clear.mp3(與 level_win 同一段勝利旋律, 只用鋼鼓 + 撥弦 + 鐵琴、升四度加快, 2.0 秒) | −12 |
| level_win | level_win | 結算勝利出現 | — | sfx_level_win.mp3(鋼鼓 + 銅管 + 弦樂, 3 秒) | −11 |
| level_lose | level_lose | 結算失敗出現 | — | sfx_level_lose.mp3(撥弦下行 + 薩克斯) | −13 |
| star | star | 結算時每顆星跳出(第 1、2、3 顆各呼叫一次) | `index`: 0 / 1 / 2 | sfx_star.mp3(金屬鈴, 逐顆升高) | −15 |
| boss_intro_frost | boss_intro_frost(第 7 輪新增) | 第 3 關霜角巨怪出場演出開始那一刻(遊戲暫停的同一幀)。**同時自動切音樂**(battle 淡出 → 2.0 秒 boss 淡入) | — | sfx_boss_intro_frost.mp3(2.75 秒。0.30 秒冰裂聲起、越裂越大聲 → **1.50 秒冰塊爆碎**(全檔最響)→ 1.7 秒巨獸咆哮, 2.5 秒後淡出) | −10 |
| boss_intro_bull | boss_intro_bull(第 7 輪新增) | 第 4 關蠻角牛王出場演出開始那一刻。**同時自動切音樂** | — | sfx_boss_intro_bull.mp3(2.7 秒。0.30 秒低沉轟隆 + 一記重鼓 → 1.0 秒蹄聲由遠而近 → **1.40 秒煞車刮地**(碎石)→ 1.8 / 2.05 秒兩聲噴鼻息) | −10(峰值限制, 實際約 −13) |
| boss_intro_thunder | boss_intro_thunder(第 7 輪新增) | 第 5 關雷霆魔王出場演出開始那一刻。**同時自動切音樂** | — | sfx_boss_intro_thunder.mp3(2.8 秒。0.1 秒遠雷醞釀 → **0.60 / 0.85 / 1.10 秒三聲落雷**(峰值 −12 / −7 / −1.5 dB, 一聲比一聲大)→ 1.10 秒落地爆裂 → 1.3 秒起電流嗡鳴到淡出。三段裡最響) | −9 |
| boss_die | boss_die(第 7 輪新增) | Boss 生命歸 0 那一刻, **取代** enemy_die(這一下不呼叫 enemy_die) | — | sfx_boss_die.mp3(1.3 秒。重擊 + 巨獸哀嚎 → 0.35 秒轟然倒地(重鼓)→ 0.5 秒起金幣嘩啦三把 + 上揚鋼鼓短句) | −11 |

全部素材都是現成的線上素材加工, 沒有程式產生的音效。

治癒領域、聖光軌跡、醫鬼補血是持續效果, 規格不配音效, 沒有對應事件(不要呼叫)。

## 背景音樂
| 曲名 | 何時 | 素材 | 備註 |
|---|---|---|---|
| title | 開始畫面: `Sound.playMusic('title')` | music_title.mp3(Kevin MacLeod〈Village Consort〉, 3 分 35 秒整首) | 循環, 首尾交叉淡化 1.2 秒 |
| battle | 進入關卡: `Sound.playMusic('battle')`(重玩、下一關也呼叫; 已在播就不會重頭) | music_battle.mp3(Kevin MacLeod〈Heroic Age〉, 1 分 37 秒整首) | 循環, 首尾交叉淡化 1.2 秒 |
| boss | 第 3~5 關 Boss 出場: **由 `boss_intro_*` 音效自動帶動**, RD 不用呼叫 | music_boss.mp3(Kevin MacLeod〈Burnt Spirit〉, 1 分 55 秒整首, 140 BPM, 打擊 + 鐵砧 + 合唱 + 低音銅管) | 循環, 首尾交叉淡化 1.2 秒; 音量設得比 battle 約大 1 dB |

- Boss 音樂的時間軸(全部由 Sound 處理): 呼叫 `boss_intro_*` → `battle` 0.3 秒內淡出 → 出場音效獨佔前段 → 2.0 秒 `boss` 從頭淡入 0.5 秒 → 一直循環到結算(Boss 倒下後也不切回)
  - 重來這關: 照舊呼叫 `Sound.playMusic('battle')`, 會從 boss 切回 battle
  - 出場演出開始時開著彈窗(慢動作)的話, `boss` 淡入後照樣是一半音量 + 放慢, 等 `popup_close` 才恢復(壓低原因跨 battle → boss 保留)
  - 2.0 秒前若呼叫了 `playMusic` 別首、`stopMusic`、或 `level_win` / `level_lose`, 就不會再接 boss
  - 靜音中出場也照樣換曲(只是無聲), 取消靜音就聽得到 boss

- 結算畫面: 呼叫 `Sound.stopMusic()`。另外 `level_win` / `level_lose` 播放時 Sound 也會自動淡出音樂, 漏呼叫也不會疊在一起
- 壓低音樂: **RD 不用另外處理, 由音效事件自動帶動**。各原因可以同時存在, 全部解除才恢復:

| 原因 | 開始(呼叫這個音效時) | 結束(呼叫這個音效時) | 效果 |
|---|---|---|---|
| 彈窗(慢動作) | `popup_open` | `popup_close` | 音量一半 + 放慢 0.85 倍(音高跟著變低, 像時間變慢) |
| Esc 暫停 | `pause_on` | `pause_off` | 音量一半 |
| 圖鑑 | `codex_open` | `codex_close` | 音量一半 |
| 引導卡 | `guide_pause` | `ui_confirm`(最後一張按 Z) | 音量一半 |
| 合成演出 | `combo_reveal` | `ui_confirm`(按 Z 關閉) | 音量一半 |

  - 開始 / 結束要成對呼叫, 不能漏結束那一聲。靜音中、或同一幀連續呼叫也照樣記得(壓低狀態不受靜音與限頻影響)
  - 保險: `playMusic` 換曲或 `stopMusic` 時, 會清掉舊的壓低原因(例: 從暫停狀態直接離開關卡、沒播 `pause_off`); 但 150 毫秒內剛設的會保留, 所以同一幀「先 `guide_pause` 再 `playMusic('battle')`」也不會被誤清
- 靜音: **任何時候按 M**(開始畫面、關卡中含彈窗 / 暫停 / 圖鑑 / 引導卡 / 合成演出開著、結算畫面)時呼叫 `Sound.setMuted(!Sound.isMuted())`。靜音時音樂照走只是無聲, 取消靜音會從當下位置繼續

## 同時觸發的處理
Sound 內建的保險(RD 照規格做了也不衝突):
- 同一個事件 25 毫秒內只播一次(等於同一幀只播一次); `shock_zap` 150 毫秒(規格: 每 0.15 秒最多一次, 玩家、單位、敵人共用)、`arrow_shot` 100 毫秒、`thunder_slash` / `thunder_orb` 60 毫秒、`blink` 50 毫秒、`heal_ray` 80 毫秒、`enemy_shot` / `pierce_shot` / `whirl` 60 毫秒、`melee_hit` / `charge_hit` 50 毫秒、`coin_pickup` / `enemy_die` 40 毫秒、`ground_expire` 80 毫秒內只播一次(arrow_shot 的 100 毫秒是玩家與單位共用)
- 同一個事件最多同時 4 聲(弓聲、`shock_zap`、`thunder_slash`、`heal_ray` 3 聲; `level_unlock` 2 聲; `level_win`、`level_lose`、`wave_start`、`wave_warning`、`combo_reveal`、`tutorial_clear`、`guide_pause`、三個 `boss_intro_*` 各 1 聲; `boss_die` 2 聲), 超過時切掉最舊的
- 不同事件之間互不打斷, 全部疊播

要 RD 決定的(照規格):
- 最後一隻敵人倒下 → 勝利: `enemy_die` 照播, `level_win` 疊著播
- 敵人突破主堡 → 主堡生命歸 0: 只播 `level_lose`, **不播** `castle_hit`
- 裝上 / 互換造成合成: `install_part`(或 `swap_part`)與 `fuse` 同一幀都呼叫(疊播)。合成出的組合是這次開網頁第一次出現時, 把 `fuse` 換成 `combo_new`(只播一個), 不另播 `combo`
- 同一幀跳出多個組合名稱(換魂柱魂件讓整片單位一起變招): 該幀只呼叫一次; 有任何一個是首次就只播 `combo_new`, 否則只播 `combo`; 同一幀已呼叫 `fuse` 時不播 `combo`(`combo_new` 仍照上一條)
- 拆除: 只播 `demolish`, 不另播 `coin_pickup`; 拆除掉出的魂件不播 `drop_part`
- 建築走回主堡: 只播 `home_refund`, 掉出的魂件不播 `drop_part`
- 買兵插旗: 插下時播 `flag_plant`; 兵從主堡門走出時再播 `unit_return`(兩個時間點, 不同幀)
- `steal_done` 不帶組合音; 讀條中的敵人倒下而完成搶奪時, `enemy_die` 與 `steal_done` 同一幀都呼叫(疊播)
- 雷霆斬命中: 只呼叫 `thunder_slash`, 它的連鎖不呼叫 `shock_zap`
- 其他攻擊帶附電(例: 弩塔遠攻 + 電擊、玩家近戰 + 電擊): 該攻擊自己的音(`arrow_shot`、`melee_hit`…)與 `shock_zap` 同一幀都呼叫(疊播)
- 瞬閃到敵人面前: `blink` 與落地放電的 `shock_zap` 同一幀都呼叫; 瞬移回集結點只呼叫 `blink`
- 雷電球: 發射時 `thunder_orb`, 之後每次放電 `shock_zap`
- 神聖之路撞到敵人: 照衝鋒呼叫 `charge_hit`
- 治癒光線與被治療者的其他音不衝突, 照常疊播
- 多件地上魂件同時到期: 每件都可呼叫 `ground_expire`, Sound 會把 80 毫秒內的併成一聲
- 教學完成與觸發完成的動作音效(例 `install_part`)同一幀都呼叫
- 波次預警與戰鬥音效疊播, 不用壓
- 開彈窗那一下若同時有別的音(例 Z 拿起後開替換彈窗), 照常都呼叫
- (第 4 輪)第一次合成: 合成那一幀呼叫 `install_part`(或 `swap_part`)與 `combo_reveal`, **不呼叫** `fuse`、`combo_new`、`combo`; 演出按 Z 關閉呼叫 `ui_confirm`; 若這一下也完成新手任務, `tutorial_done` 等演出關掉、泡泡完成特效開始時才呼叫
- (第 4 輪)引導卡: 暫停那一刻只呼叫 `guide_pause`(同一幀其他音效照常疊著); 0.3 秒後第 1 張卡出現呼叫 `guide_card`; 換卡只呼叫新卡的 `guide_card`; 最後一張按 Z 呼叫 `ui_confirm`。新手任務完成緊接著出引導卡時, `tutorial_done` 與 `guide_pause` 先後呼叫(各自在自己的時間點), 不同一幀
- (第 4 輪)任務接任務: `tutorial_done` 在完成時, `quest_new` 在 0.6 秒後新泡泡出現時
- (第 4 輪)新手畢業與推進: 大提示出現呼叫 `tutorial_clear`, 按 Z 呼叫 `ui_confirm`, 之後推進動畫依序呼叫 `level_advance`(記號起跳)、`level_unlock`(鎖碎開)
- (第 4 輪)Esc 暫停期間不再呼叫新的遊戲音效(正在播的會自己播完); 暫停中的介面操作音(例: 開圖鑑 `codex_open`)照常呼叫
- (第 5 輪)教學補金幣: 補上那一刻 `coin_pickup` 與新任務的 `quest_new` 同一幀都呼叫(疊播); 補金幣只呼叫一次 `coin_pickup`, 不論補了多少
- (第 5 輪)第 2 關階段 17 / 25 完成: `tutorial_done` 在完成時, 0.6 秒後特效播完才開始預警, `wave_warning` 接在後面(不同一幀)
- (第 6 輪)斬擊特效: 不是音效事件, 命中那一幀照舊呼叫 `melee_hit` 或 `thunder_slash`(只呼叫一個, 依攻擊種類); 敵人近戰打我方兵維持不配音
- (第 6 輪)搬運箭頭出現、換下一件、清單打勾: 都不呼叫音效
- (第 6 輪)第 1 關第 2 波清空: 最後一隻的 `enemy_die` 與 2.0 秒後階段 15 引導卡的 `guide_pause` 各在自己的時間點呼叫, 不疊
- (第 6 輪)階段 22: 等待提示第一次出現 `quest_new`; 招募成功 `recruit`, 泡泡換字不再呼叫 `quest_new`
- (第 6 輪)關卡預覽頁: 操作鎖期間按 Z / ← / → 什麼都不呼叫; 操作鎖結束後, 按 ← 被第 1 關教學鎖擋下才呼叫 `ui_invalid`(游標有移動才呼叫 `ui_move`, 被擋下時不呼叫 `ui_move`)
- (第 7 輪)Boss 出場: 演出開始那一幀只呼叫該 Boss 的一個 `boss_intro_*`(遊戲已暫停, 不會有戰鬥音效疊上), 不另外呼叫 `wave_start` 或其他音效。音樂由這一聲自動處理, RD 不用呼叫 `stopMusic` / `playMusic`。同一幀若同時觸發第一次合成演出: 先照規則演合成(`combo_reveal` … 按 Z 的 `ui_confirm`), **合成關掉、Boss 演出真正開始時**才呼叫 `boss_intro_*`
- (第 7 輪)Boss 倒下: 只呼叫 `boss_die`, 不呼叫 `enemy_die`; 牠是最後一隻敵人時 `level_win` 照常疊著呼叫(Sound 會同時淡出音樂); 讀條中的 Boss 倒下 → `boss_die` 與 `steal_done` 同一幀都呼叫
- (第 7 輪)Boss 進主堡: 照一般呼叫 `castle_hit`; 讓主堡生命歸 0 時只呼叫 `level_lose`
- (第 7 輪)Boss 的放電照一般呼叫 `shock_zap`(同樣 0.15 秒限頻); 近戰不配音; 被搶奪照一般 `steal_start` / `steal_done` / `steal_cancel`
- (第 7 輪)最後一波橫幅多一行「BOSS 來襲」: 不另加音效, `wave_start` 照舊

## 理念或經驗落實
- 「即時回饋音聽起來延遲」: 按鍵直接回饋的音(ui_*、take/install/swap/drop、steal_*, 本輪新增的 fuse、flag_plant、demolish 也是)都量過出到峰值一成的時間, 全部在 0.025 秒內(新增的三個量得 0.000 秒); 音效以 mp3 base64 內嵌、頁面載入時就離線解碼, init 後用 Web Audio 播, 不受 HTMLAudio 首次載入延遲影響
- 「mp3 開頭填充」: 每個檔頭放 20 毫秒數位靜音, 解碼後找第一個明顯樣本自動算出要跳過多少(Node 量得編碼延遲約 25 毫秒), 各瀏覽器解碼器差異自動校正
- 「背景音樂合成太快、一直重複很膩」: 兩首都用現成整首曲子(title 3 分 35 秒、battle 1 分 37 秒), 不截短循環; battle 選 129 BPM 明亮進行曲而不是快節奏電子
- 「CC BY 音樂的署名文字」: 照 incompetech 固定格式寫進 credits.md, 需要放在遊戲畫面上
- 「素材包頁面同列多種授權」: artisticdude 的 Battle Sound Effects 頁面同時列 CC-BY / CC-BY-SA / GPL / CC0, 選 CC0 並在 credits 寫明
- 「成對事件取同一段素材」: popup_open / popup_close 用 Kenney 同一組的下滑 / 上揚掃頻; unit_down / unit_return 用同一把撥弦的兩音下行 / 上行
- 「小眾聲音改搜近義大類詞」: 戰鼓在 OpenGameArt 只找到每 0.1 秒一擊的密集循環, 挑不出單獨重擊 → 改到 BigSoundBank 搜 drum, 取 CC0 的低音通鼓單擊降速成戰鼓, 自己排三響
- 「規格寫比某音輕 / 重時量響度來設」: 新事件依角色定響度 — 地上魂件消失 −24(全表最輕一級, 可惜但不刺耳)、拆除 / 合成 −13(跟衝鋒撞擊同級)、插旗 −15、退款 −19(錢幣峰值高, 壓峰值後與 purchase 同級)
- 第 2 輪新增的聲音沿用上一版同一批素材包(Kenney、rubberduck), 合成音用「鍛造金屬敲擊 + 法術上揚」接在魂匠主題上, 跟組合音(鋼鼓)分開, 兩者疊播時聽得出是兩件事
- (第 3 輪)「小眾聲音改搜近義大類詞 / BigSoundBank 補寫實錄音」: 雷聲在 OpenGameArt 沒有短單響, 改用 BigSoundBank 的單發雷聲(CC0), 用 5 毫秒包絡找出最陡的那次起音(+23 dB)截 0.95 秒疊在重拳上, 讓雷霆斬比 melee_hit 重約 7 dB、還多一聲雷
- (第 3 輪)「即時回饋音 0.03 秒內到峰值一成」: 新事件不是按鍵直接回饋, 仍量過 — shock_zap / thunder_slash / blink / heal_ray 都在 0.007 秒內; thunder_orb 刻意先蓄電漸強, 0.023 秒內就有電嗡墊著
- (第 3 輪)「規格寫頻繁要小聲」: shock_zap 定在 −24(跟 arrow_shot 同級, 全表最輕一級), 再加上 0.15 秒限頻、最多 3 聲; 治癒光線每秒可能好幾道, 定 −20 並用柔和合成鈴, 避免跟金幣 / 寶石的清脆聲混在一起
- (第 3 輪)「成對事件取同一段素材」的延伸: 電擊系四個事件(shock_zap、thunder_slash、thunder_orb、blink)都取自同一個 faxcorp 電流音效包, 聽起來是同一種電; 放電「啪」那一層在 shock_zap、thunder_slash、thunder_orb 共用, 玩家一聽就知道「這下有電」

- (第 4 輪)「成對事件取同一段素材」: `pause_on` / `pause_off` 用 Kenney 同一組的 close / open; `codex_open` / `codex_close` 都是 Kenney RPG 包的書本聲; `tutorial_clear` 與 `level_win` 取 Fupi 同一段勝利旋律(畢業版只用三種輕樂器、升四度加快、截到 2 秒), 一聽就知道是「小一號的勝利」
- (第 4 輪)「要像磁帶減速的音, 單音變速聽不出減速」: `guide_pause` 不拿單音變速, 而是拿一段下行的鋼鼓樂句(一個音接著好幾個音)當來源, 前 0.08 秒原速、之後速度沿 k^0.7 曲線降到 0.3, 驗收每 50 毫秒的音高一路往下(437→128 Hz)、後段仍在 −28 dB 以上, 才算聽得出「停下來」; 開頭再墊一記悶擊, 0.001 秒就出聲
- (第 4 輪)「即時回饋音 0.03 秒內到峰值一成」: 按鍵直接觸發的新音都量過 — pause_on 0.000、pause_off 0.009、codex_open 0.013、codex_close 0.018(跳過書本聲開頭 0.055 秒)、guide_card 0.009(跳過紙牌聲開頭 0.055 秒, 原本 0.034 超標)
- (第 4 輪)「規格寫比某音大 / 短時量響度來設」: `combo_reveal` 比 `combo_new`(−12)大一級定 −10, 且多了蓄力與撞擊; `tutorial_clear` −12、2 秒, 比 `level_win`(−11、3 秒)小又短; `quest_new` 規格要「輕、不打斷」, 定 −21(全表倒數第三輕)
- (第 4 輪)「素材找不到才程式產生」: 11 個新事件全部用前幾輪已核對授權的 CC0 包(Kenney 四個包 + 本輪新加的 Kenney Casino Audio、rubberduck、artisticdude、Fupi)加工, 沒有程式產生的音效

- (第 5 輪)「沿用任務保留上一版素材與音量」: 規格寫明不新增音檔, 教學補金幣直接沿用 `coin_pickup`(−18, 已是「清脆、想一直撿」的金幣聲), 與 `quest_new`(−21 玻璃叮)疊播時一個是錢幣碰撞、一個是穩定高音, 音色分得開

- (第 6 輪)「沿用任務保留上一版素材與音量」: 規格允許 `melee_hit` 太輕時換成更有「砍中」感的同類音, 但使用者對音效沒有意見、這一輪改的是畫面; 依「必須隔一次實際回饋才改」的精神不換, 保留 −20 的鈍擊。若試玩覺得斬擊畫面配鈍擊不搭, 下一輪再換素材(事件名不變)
- (第 6 輪)「成對事件 / 不加多餘聲音」: 搬運箭頭換件一定伴隨拿起 / 裝上 / 互換音, 不再加提示音, 避免同一幀兩聲搶辨識

- (第 7 輪)「規格指定演出音的撞擊點時間」: 三段出場音都以「時間軸固定、不裁開頭」建置, 每層照規格重點拍擺放; 驗收用解碼器扣掉執行時的起播位置量峰值 — 冰塊爆碎全檔最響、峰值在 1.55 秒(起音 1.50); 煞車 1.41 秒起; 三聲落雷 0.61 / 0.86 / 1.12 秒, 峰值 −12 / −7 / −1.5 dB(一聲比一聲大); Boss 倒下 0.02 秒就出聲
- (第 7 輪)「小眾聲音改搜近義大類詞 / BigSoundBank 補寫實錄音」: 牛的蹄聲與噴鼻息 CC0 找不到牛(BigSoundBank 搜 bull 0 筆), 改用馬奔跑與馬噴氣錄音降速 0.75~0.85 倍(音高變低、體型變大); 煞車刮地用踩碎石錄音降速 0.7 倍; 冰裂用 BigSoundBank 的真實冰裂錄音(Cracking ice), 不用合成玻璃
- (第 7 輪)「要戰鼓重擊單響」: 三段出場與 Boss 倒下的「重」都沿用開戰音同一記低音通鼓(降速 0.5~0.7 倍), 跟 `wave_start` 的戰鼓同一個聲音, 玩家聽得出是同一場戰鬥的大事件
- (第 7 輪)「電擊系出自同一包」: 雷霆魔王的落雷「啪」、落地爆裂與之後的電流嗡鳴都取自 faxcorp 電流包, 跟 `shock_zap` / `thunder_slash` 同一種電; 雷聲另取 BigSoundBank 三支起音最陡的雷(+26~+41 dB), 跟 `thunder_slash` 用的那支錯開
- (第 7 輪)「一把金幣噴出來」: Boss 倒下掉 10 枚金幣, 用 Coin Splash 錯開疊三層(0.5 / 0.62 / 0.77 秒、速度 1.0 / 1.18 / 0.9), 收尾的上揚鋼鼓選 Kenney 同一個鋼鼓包裡音高一路往上(267→353 Hz)、前幾輪沒用過的一支, 不跟 `combo` / `level_win` 混淆
- (第 7 輪)「背景音樂優先找現成整首」: Boss 曲用 incompetech 整首 1 分 55 秒, 不截短循環; 從曲庫篩 135~180 BPM、Action / Driving / Dark、有打擊樂的管弦曲, 量三首候選後選低頻打擊密度最高(9.3 次/秒, battle 為 8.6)、整首響度平穩(每 5 秒都在 −13~−15 dB, 沒有安靜前奏, 2.0 秒淡入就是全力)的〈Burnt Spirit〉; 128 kbps 重新編碼後 1.84 MB
- (第 7 輪)「壓低音樂狀態不能漏」: battle → boss 換曲時保留壓低原因(出場時開著的彈窗演完還在), 冒煙測試驗過「彈窗中出場 → boss 淡入仍一半音量 + 放慢 → popup_close 恢復」、出場後 2 秒內換曲 / 結算 / 重來不會再接 boss、靜音中出場照樣換曲

聲音的輕重與辨識度都待試玩確認(音效 agent 聽不到聲音, 全部是用量測選的)。
