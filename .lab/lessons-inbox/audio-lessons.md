# 音效經驗提案(SoulSmithDefense polish 音效)

## 提案 1 → 放進「技術」, 合併到「本機沒有 ffmpeg, Python 與 npm 又被權限擋住…」那條, 再加一段(續)

- `辨識` **能用 Node 解碼量測了, 但剪輯、疊層、變速後還是寫不回 mp3 / ogg, 只能內嵌 PCM 或不改原檔** → 本機缺的是編碼器 → 用同一招從 npm registry 抓 `lamejs@1.2.1` 的 tarball(純 JS mp3 編碼器, 免編譯), 解到暫存資料夾; 套件的 `require` 進入點在 Node 下回傳空物件, 改用 `vm.createContext` 執行 `lame.all.js` 後取全域的 `lamejs`, `new Mp3Encoder(聲道數, 44100, kbps)`, 每 1152 樣本呼叫一次 `encodeBuffer`(Int16Array), 最後 `flush`。這樣整條流程(解碼 → 視窗化 sinc 變速 → 疊層 → 統一響度 → 編碼 mp3)都在 Node 裡完成, 35 個短音效單聲道 96 kbps 共約 290 KB; 320 kbps 的整首曲子轉成 96~128 kbps 就壓到 3 MB 內, 不必截段。lamejs 不寫 LAME 標頭, 解碼器不會自動去掉編碼延遲: 用 mpg123-decoder 驗算, 每個檔一律晚 25 毫秒左右 → 檔頭補 20 毫秒數位靜音, 執行時解碼後找第一個 |樣本| > 0.02 的位置, 扣掉原音本來的柔和前段, 當作起播位置。(SoulSmithDefense polish 音效 build, 瀏覽器實測待試玩)

## 提案 2 → 放進「技術」(新條目, 待試玩驗證; 製作人可等試玩回饋後再決定要不要收)

- `辨識` **規格要「慢動作時背景音樂降一半並壓低音色」, 但音樂用 HTMLAudio 播(file:// 下接 Web Audio 濾波器, 媒體元素來源可能被當成跨來源而沒有聲音)** → 不經 Web Audio: 音量 × 0.5, 再把 `preservesPitch`(與 `mozPreservesPitch` / `webkitPreservesPitch`)設 false、`playbackRate` 設 0.85, 音高與速度一起往下, 聽起來像時間被拉慢, 跟慢動作畫面一致; 關彈窗時恢復 1.0。這個行為掛在 `popup_open` / `popup_close` 兩個音效事件上, RD 不用多接介面。(SoulSmithDefense polish 音效 build, 改播放速率時有沒有爆音待試玩)
