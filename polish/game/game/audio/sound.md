# 魂匠守衛者 — 音效說明(給 RD)

## 聲音風格
奇幻工坊的實體聲: 木、石、金屬的碰撞與弓弦負責動作, 魂件用晶亮的寶石 / 玻璃聲, 獎勵用鋼鼓與撥弦短樂句(組合、收編、勝利同一家族), 背景音樂是 Kevin MacLeod 的中世紀風曲子。

電擊系一律用「電流劈啪 / 嗡鳴」(faxcorp 電流音效包 + 真實雷聲), 治癒用柔和的合成鈴, 兩者都和既有的寶石 / 鋼鼓 / 撥弦家族分開。

## 本輪(打磨第 3 輪)變更
- 新增事件(名稱照 interface.json): `shock_zap`、`thunder_slash`、`thunder_orb`、`blink`、`heal_ray`
- 呼叫時機擴大(素材不變): `charge_hit` 神聖之路撞到敵人也呼叫; `home_refund` 兵走回主堡也呼叫; `steal_done` 讀條中敵人倒下也呼叫
- 靜音鍵改成 M(見背景音樂一節)
- 其餘事件的素材、音量、opts 都沒變(沿用第 2 輪)

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
| ui_invalid | ui_invalid | 任何無效操作: 彈窗抖一下、商店買不了、不能蓋 / 不能插旗的位置按 Z | — | sfx_ui_invalid.mp3 | −18 |
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
| coin_pickup | coin_pickup | 撿到金幣(每枚) | — | sfx_coin_pickup.mp3(每次音高隨機微變) | −18 |
| steal_start | steal_start | 開始搶奪(讀條開始) | — | sfx_steal_start.mp3(鐵鍊拉扯) | −18 |
| steal_done | steal_done | 搶奪成功(讀條滿, 或讀條中敵人倒下) | — | sfx_steal_done.mp3(拔劍「唰」+ 寶石) | −14 |
| steal_cancel | steal_cancel | 搶奪取消(拉太遠、敵人死、再按 Z) | — | sfx_steal_cancel.mp3(低沉布料) | −21 |
| combo | combo | 單位頭上跳出組合名稱(非首次) | — | sfx_combo.mp3(短鋼鼓上行) | −15 |
| combo_new | combo_new | 跳出「新組合!」 | — | sfx_combo_new.mp3(長鋼鼓上行 + 玻璃) | −12 |
| arrow_shot | arrow_shot | 我方(含玩家)遠攻、冰箭射出 | — | sfx_arrow_shot.mp3(弓弦) | −24 |
| pierce_shot | pierce_shot | 穿透箭射出 | — | sfx_pierce_shot.mp3(低弓弦 + 光束) | −19 |
| melee_hit | melee_hit | 我方(含玩家)近戰、冰霜重擊命中 | — | sfx_melee_hit.mp3(鈍擊) | −20 |
| whirl | whirl | 旋風斬發動 | — | sfx_whirl.mp3(揮砍風聲) | −18 |
| charge_hit | charge_hit | 衝鋒 / 神聖之路撞到敵人(撞退 + 暈眩) | — | sfx_charge_hit.mp3(重拳 + 木板) | −13 |
| shock_zap | shock_zap(新) | 電擊單獨放電、附電的連鎖、雷電球每次放電(每 0.5 秒)、雷鬼放電、瞬閃落地放電。**雷霆斬的連鎖不呼叫**。玩家、單位、敵人都用同一個事件名 | — | sfx_shock_zap.mp3(短促放電「啪」+ 低一點的電嗡, 0.27 秒; 每次音高隨機微變) | −24 |
| thunder_slash | thunder_slash(新) | 雷霆斬命中(每一擊一次; 它的連鎖不另播 shock_zap) | — | sfx_thunder_slash.mp3(重拳 + 放電 + 真實雷聲炸裂, 1.0 秒) | −13 |
| thunder_orb | thunder_orb(新) | 雷電球發射的那一刻(球之後每 0.5 秒的放電另呼叫 shock_zap) | — | sfx_thunder_orb.mp3(0.26 秒電嗡漸強 → 揮出風聲 + 放電, 0.65 秒) | −18 |
| blink | blink(新) | 瞬閃發動: 瞬移到敵人面前、或瞬移回集結點, 都呼叫(魂柱自己瞬移也是) | — | sfx_blink.mp3(電光瞬移聲 + 輕揮風「咻」, 0.7 秒) | −17 |
| heal_ray | heal_ray(新) | 治癒光線射出(每道一次) | — | sfx_heal_ray.mp3(柔和的合成鈴, 穩定在 A 音, 0.8 秒; 每次音高隨機微變) | −20 |
| enemy_shot | enemy_shot | 弓鬼射我方兵 | — | sfx_enemy_shot.mp3(降調弓弦) | −23 |
| enemy_die | enemy_die | 敵人生命歸 0 | — | sfx_enemy_die.mp3(鬼魂嘶聲 + 寶石閃) | −18 |
| unit_down | unit_down | 我方兵生命歸 0、化成魂光 | — | sfx_unit_down.mp3(撥弦兩音下行) | −18 |
| unit_return | unit_return | 兵從主堡門走出(重生完、買的兵出發、行軍 / 衝鋒繞回) | — | sfx_unit_return.mp3(撥弦兩音上行) | −18 |
| recruit | recruit | 中立石魔像進入主堡 | — | sfx_recruit.mp3(鋼鼓上行 + 木擊) | −14 |
| wave_warning | wave_warning | 預警開始(每波一次, 不論幾個出怪點) | — | sfx_wave_warning.mp3(警鐘) | −14 |
| wave_start | wave_start(本輪重做) | 第 k 波開始出怪 | — | sfx_wave_start.mp3(戰鼓三響 + 號角長鳴, 2.6 秒) | −11 |
| castle_hit | castle_hit | 敵人進入主堡扣血(生命沒歸 0 時) | — | sfx_castle_hit.mp3(重門撞擊) | −11 |
| tutorial_done | tutorial_done | 教學階段完成特效開始時 | — | sfx_tutorial_done.mp3(撥弦跳音) | −16 |
| level_win | level_win | 結算勝利出現 | — | sfx_level_win.mp3(鋼鼓 + 銅管 + 弦樂, 3 秒) | −11 |
| level_lose | level_lose | 結算失敗出現 | — | sfx_level_lose.mp3(撥弦下行 + 薩克斯) | −13 |
| star | star | 結算時每顆星跳出(第 1、2、3 顆各呼叫一次) | `index`: 0 / 1 / 2 | sfx_star.mp3(金屬鈴, 逐顆升高) | −15 |

全部素材都是現成的線上素材加工, 沒有程式產生的音效。

治癒領域、聖光軌跡、醫鬼補血是持續效果, 規格不配音效, 沒有對應事件(不要呼叫)。

## 背景音樂
| 曲名 | 何時 | 素材 | 備註 |
|---|---|---|---|
| title | 開始畫面: `Sound.playMusic('title')` | music_title.mp3(Kevin MacLeod〈Village Consort〉, 3 分 35 秒整首) | 循環, 首尾交叉淡化 1.2 秒 |
| battle | 進入關卡: `Sound.playMusic('battle')`(重玩、下一關也呼叫; 已在播就不會重頭) | music_battle.mp3(Kevin MacLeod〈Heroic Age〉, 1 分 37 秒整首) | 循環, 首尾交叉淡化 1.2 秒 |

- 結算畫面: 呼叫 `Sound.stopMusic()`。另外 `level_win` / `level_lose` 播放時 Sound 也會自動淡出音樂, 漏呼叫也不會疊在一起
- 彈窗(慢動作)壓音樂: **RD 不用另外處理**。`play('popup_open')` 時 Sound 自動把音樂降到一半音量、放慢到 0.85 倍(音高跟著變低, 聽起來像時間變慢); `play('popup_close')` 恢復。所以每次開彈窗、關彈窗都要各呼叫一次, 不能漏 close
- 靜音: **任何時候按 M**(開始畫面、關卡中含彈窗開著、結算畫面)時呼叫 `Sound.setMuted(!Sound.isMuted())`。靜音時音樂照走只是無聲, 取消靜音會從當下位置繼續

## 同時觸發的處理
Sound 內建的保險(RD 照規格做了也不衝突):
- 同一個事件 25 毫秒內只播一次(等於同一幀只播一次); `shock_zap` 150 毫秒(規格: 每 0.15 秒最多一次, 玩家、單位、敵人共用)、`arrow_shot` 100 毫秒、`thunder_slash` / `thunder_orb` 60 毫秒、`blink` 50 毫秒、`heal_ray` 80 毫秒、`enemy_shot` / `pierce_shot` / `whirl` 60 毫秒、`melee_hit` / `charge_hit` 50 毫秒、`coin_pickup` / `enemy_die` 40 毫秒、`ground_expire` 80 毫秒內只播一次(arrow_shot 的 100 毫秒是玩家與單位共用)
- 同一個事件最多同時 4 聲(弓聲、`shock_zap`、`thunder_slash`、`heal_ray` 3 聲; `level_win`、`level_lose`、`wave_start`、`wave_warning` 各 1 聲), 超過時切掉最舊的
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

聲音的輕重與辨識度都待試玩確認(音效 agent 聽不到聲音, 全部是用量測選的)。
