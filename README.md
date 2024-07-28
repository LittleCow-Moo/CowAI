# 牛牛 AI

<center>
<img src="https://cowgl.xyz/cow.png" width="128" height="128" /><br>
牛牛AI是一隻聰明的AI牛。<br>
<img src="https://img.shields.io/github/package-json/v/LittleCow-moo/CowAI?logo=github&style=for-the-badge&label=版本" alt="Version"> <img src="https://img.shields.io/github/license/LittleCow-moo/CowAI?style=for-the-badge&logo=github&label=許可證" alt="License"> <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/程式碼樣式-Prettier-ff69b4.svg?style=for-the-badge" alt="Prettier"></a><br>
這個專案目前是個未完成品，可能有很多 bug 及無法調整的內建設定，請見諒。

</center>
<br>

# 執行

1. `git clone`這個 repo
2. `cd`到這個 repo
3. `npm i`

4. (可選) 簽個 SSL 給 LINE Bot 用 (?)
5. 把`.env`填成這樣子：

```env
KEY= # Google Gemini API Key
ADMIN_KEY= # 設定一個管理員專用的Cow AI API Key。這個API Key將會繞過速率限制，並且會被使用在其他平台中。

ENABLE_DISCORD=[true/false] # 是否要啟用Discord機器人
DISCORD= # Discord Bot Token

ENABLE_TELEGRAM=[true/false] # 是否要啟用Telegram機器人
TELEGRAM= # Telegram Bot Secret

ENABLE_LINE=[true/false] # 是否要啟用LINE Bot
LINE_ID= # LINE Messaging API Channel ID
LINE_SECRET= # LINE Messaging API Channel Secret
LINE_ACCESS_TOKEN= # LINE Messaging API Channel Access Token
LINE_SSL_FULLCHAIN= # 你簽給LINE Bot的SSL的fullchain.pem的檔案路徑
LINE_SSL_PRIVKEY=# 你簽給LINE Bot的SSL的privkey.pem的路徑

HF_ACCESS_TOKEN= # HuggingFace Access Token (作畫功能使用，要有read權限)
```

6. `node .`

# 使用

如果一切都正常運作，那 AI 機器人應該就會在 Discord, Telegram, 和 LINE 上線了。除了這三個平台的機器人外，它還會開一個 HTTP 端口`38943`用以通訊。
