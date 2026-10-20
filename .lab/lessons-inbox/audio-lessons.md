# 音效經驗提案(SoulSmithDefense 打磨第 3 輪 build)

## 放進「素材來源」分類(新條目)

- `辨識` **要一整套「電擊 / 雷電」系音效(短促劈啪、帶電重擊、蓄電發射、閃電瞬移), 搜 electric / zap 多半是要署名的 AI 站或付費包; BigSoundBank 搜 electric 的「Electric strike」其實是電子門鎖的嗡嗡聲, 不是電弧** → 只看標題會選錯, 要讀頁面說明 → OpenGameArt 上 faxcorp 的「Electricity Game Sound Pack」(CC0, `https://opengameart.org/node/150369`, 免登入, 16 個 WAV 可直接用 `https://opengameart.org/sites/default/files/<檔名>` 下載)一包湊得齊: `groundhit.wav` 0.22 秒、7 毫秒到峰值一成的放電「啪」, `charge.wav` 4 秒穩定電嗡(截一段再以 dB 線性漸強就是蓄電), `teleport.wav` 0.7 秒瞬移; 同一包做出所有電擊事件, 聽起來是同一種電。雷聲用 BigSoundBank 的「Thunder #2」(CC0, 編號 3113, 單發雷聲無雨聲), 用 5 毫秒包絡找最陡的那次起音(本例 2.225 秒處 +23 dB)截 1 秒內疊在重拳上, 就是「帶電重砍 + 一聲雷」。治癒音: Someoneman 的「Cure Magic」(CC0, `https://opengameart.org/content/cure-magic`, zip 內 8 支約 1 秒的合成鈴), 用每 80 毫秒自相關音高挑最穩定的一支(本例 Cure3 穩在 441 / 221 Hz), 比和弦亂跳的那幾支柔和。(SoulSmithDefense 打磨第 3 輪 build, 聽感待試玩)
