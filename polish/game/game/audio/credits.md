# 音效與音樂來源

所有音效檔都是從下列素材加工而成(共同加工: 轉單聲道 44.1 kHz、剪掉頭尾靜音、統一響度、檔頭加 20 毫秒靜音、以 96 kbps mp3 重新編碼)。表中「剪輯」欄只寫共同加工以外的處理。

素材來源頁:

| 代號 | 素材包 | 頁面 | 作者 | 授權 |
|---|---|---|---|---|
| K-UI | Interface Sounds | https://kenney.nl/assets/interface-sounds | Kenney (kenney.nl) | CC0 |
| K-IMP | Impact Sounds | https://kenney.nl/assets/impact-sounds | Kenney (kenney.nl) | CC0 |
| K-RPG | RPG Audio | https://kenney.nl/assets/rpg-audio | Kenney (kenney.nl) | CC0 |
| K-JIN | Music Jingles | https://kenney.nl/assets/music-jingles | Kenney (kenney.nl) | CC0 |
| AD-RPG | RPG Sound Pack | https://opengameart.org/content/rpg-sound-pack | artisticdude | CC0 |
| AD-BAT | Battle Sound Effects | https://opengameart.org/content/battle-sound-effects | artisticdude | 頁面同列 CC-BY 3.0 / CC-BY-SA 3.0 / GPL / CC0, 選 CC0 |
| RD-80 | 80 CC0 RPG SFX | https://opengameart.org/content/80-cc0-rpg-sfx | rubberduck | CC0 |
| SS-HORN | Their Coming (generic horn sound) | https://opengameart.org/content/their-coming-generic-horn-sound | StumpyStrust | CC0(作者希望附連結, 非必要) |
| FU-WIN | Win Jingle | https://opengameart.org/content/win-jingle | Fupi | CC0 |
| KM | incompetech 曲庫 | https://incompetech.com/music/royalty-free/ | Kevin MacLeod | CC BY 4.0 |

## 檔案清單(每列一個 assets/ 內的檔)

| 檔名 | 對應事件 | 原始素材(代號 / 原檔名) | 作者 | 授權 | 剪輯 |
|---|---|---|---|---|---|
| sfx_ui_move.mp3 | ui_move | K-UI / tick_002.ogg | Kenney | CC0 | 無 |
| sfx_ui_confirm.mp3 | ui_confirm | K-UI / confirmation_001.ogg | Kenney | CC0 | 無 |
| sfx_ui_invalid.mp3 | ui_invalid | K-UI / error_004.ogg | Kenney | CC0 | 無 |
| sfx_popup_open.mp3 | popup_open | K-UI / minimize_006.ogg | Kenney | CC0 | 無(量得音高 551→279 Hz 下滑) |
| sfx_popup_close.mp3 | popup_close | K-UI / maximize_006.ogg | Kenney | CC0 | 無(量得音高 261→596 Hz 上揚) |
| sfx_take_part.mp3 | take_part | RD-80 / item_gem_01.ogg | rubberduck | CC0 | 無 |
| sfx_install_part.mp3 | install_part | K-RPG / metalLatch.ogg + K-IMP / impactMetal_medium_001.ogg | Kenney | CC0 | 兩層疊合(金屬撞擊 −8 dB) |
| sfx_swap_part.mp3 | swap_part | RD-80 / item_gem_03.ogg + item_gem_01.ogg | rubberduck | CC0 | 第二聲升高 1.12 倍、延後 0.09 秒 |
| sfx_drop_part.mp3 | drop_part | RD-80 / item_stone_04.ogg | rubberduck | CC0 | 無 |
| sfx_slot_expand.mp3 | slot_expand | RD-80 / spell_02.ogg + K-UI / maximize_008.ogg | rubberduck、Kenney | CC0 | 兩層疊合(上揚音 −4 dB) |
| sfx_purchase.mp3 | purchase | RD-80 / item_coins_02.ogg | rubberduck | CC0 | 無 |
| sfx_place_unit.mp3 | place_unit | K-IMP / impactWood_heavy_000.ogg + impactSoft_heavy_001.ogg | Kenney | CC0 | 兩層疊合(悶擊 −4 dB) |
| sfx_coin_pickup.mp3 | coin_pickup | AD-RPG / inventory/coin3.wav | artisticdude | CC0 | 無 |
| sfx_steal_start.mp3 | steal_start | RD-80 / chain_02.ogg | rubberduck | CC0 | 無 |
| sfx_steal_done.mp3 | steal_done | AD-RPG / battle/sword-unsheathe.wav + RD-80 / item_gem_01.ogg | artisticdude、rubberduck | CC0 | 兩層疊合(寶石聲 −6 dB、延後 0.08 秒) |
| sfx_steal_cancel.mp3 | steal_cancel | AD-RPG / inventory/cloth-heavy.wav | artisticdude | CC0 | 降速 0.8 倍(音高變低) |
| sfx_combo.mp3 | combo | K-JIN / jingles_STEEL08.ogg | Kenney | CC0 | 截前 0.65 秒、尾端淡出 0.2 秒 |
| sfx_combo_new.mp3 | combo_new | K-JIN / jingles_STEEL02.ogg + K-UI / glass_001.ogg | Kenney | CC0 | 兩層疊合(玻璃聲 −6 dB) |
| sfx_arrow_shot.mp3 | arrow_shot | AD-BAT / Bow.wav | artisticdude | CC0 | 截前 0.3 秒 |
| sfx_pierce_shot.mp3 | pierce_shot | AD-BAT / Bow.wav + RD-80 / spell_02.ogg | artisticdude、rubberduck | CC0 | 弓聲降速 0.85 倍; 法術聲升速 1.2 倍、−5 dB |
| sfx_melee_hit.mp3 | melee_hit | K-IMP / impactPunch_medium_000.ogg | Kenney | CC0 | 截前 0.3 秒 |
| sfx_whirl.mp3 | whirl | AD-BAT / swish_3.wav | artisticdude | CC0 | 無 |
| sfx_charge_hit.mp3 | charge_hit | K-IMP / impactPunch_heavy_000.ogg + impactPlank_medium_001.ogg | Kenney | CC0 | 兩層疊合(木板聲 −4 dB), 各截 0.4~0.45 秒 |
| sfx_enemy_shot.mp3 | enemy_shot | AD-BAT / Bow.wav | artisticdude | CC0 | 降速 0.7 倍(較低沉), 截 0.4 秒 |
| sfx_enemy_die.mp3 | enemy_die | AD-RPG / NPC/shade/shade1.wav + RD-80 / item_gem_02.ogg | artisticdude、rubberduck | CC0 | 鬼聲截 0.45 秒; 寶石聲 −8 dB、延後 0.05 秒 |
| sfx_unit_down.mp3 | unit_down | K-JIN / jingles_PIZZI00.ogg | Kenney | CC0 | 無 |
| sfx_unit_return.mp3 | unit_return | K-JIN / jingles_PIZZI08.ogg | Kenney | CC0 | 無 |
| sfx_recruit.mp3 | recruit | K-JIN / jingles_STEEL10.ogg + K-IMP / impactWood_heavy_002.ogg | Kenney | CC0 | 兩層疊合(木擊 −6 dB) |
| sfx_wave_warning.mp3 | wave_warning | K-IMP / impactBell_heavy_001.ogg | Kenney | CC0 | 無 |
| sfx_wave_start.mp3 | wave_start | SS-HORN / theircoming3.ogg | StumpyStrust | CC0 | 截前 2.4 秒、尾端淡出 0.8 秒 |
| sfx_castle_hit.mp3 | castle_hit | K-RPG / doorClose_1.ogg + K-IMP / impactPunch_heavy_001.ogg | Kenney | CC0 | 兩層疊合(重擊 −3 dB) |
| sfx_tutorial_done.mp3 | tutorial_done | K-JIN / jingles_PIZZI16.ogg | Kenney | CC0 | 無 |
| sfx_level_win.mp3 | level_win | FU-WIN / WinSteelDrums.wav + WinBrass.wav + WinPizzicato.wav + WinStrings.wav | Fupi | CC0 | 四個分軌自行混音(撥弦、弦樂 −3 dB), 截前 3 秒、淡出 0.5 秒 |
| sfx_level_lose.mp3 | level_lose | K-JIN / jingles_PIZZI01.ogg + jingles_SAX03.ogg | Kenney | CC0 | 兩層疊合(薩克斯 −6 dB) |
| sfx_star.mp3 | star | AD-RPG / inventory/metal-ringing.wav | artisticdude | CC0 | 無(播放時依第幾顆星升高音高) |
| music_title.mp3 | 背景音樂 title | KM / Village Consort.mp3(https://incompetech.com/music/royalty-free/mp3-royaltyfree/Village%20Consort.mp3) | Kevin MacLeod | CC BY 4.0 | 整首, 由 320 kbps 重新編碼為 96 kbps 立體聲(壓到 3 MB 內) |
| music_battle.mp3 | 背景音樂 battle | KM / Heroic Age.mp3(https://incompetech.com/music/royalty-free/mp3-royaltyfree/Heroic%20Age.mp3) | Kevin MacLeod | CC BY 4.0 | 整首, 由 320 kbps 重新編碼為 128 kbps 立體聲(壓到 3 MB 內) |

## 需要在遊戲中顯示的署名(CC BY 4.0)

```
"Village Consort" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Heroic Age" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```

CC0 素材不需署名, 上表僅供追溯。
