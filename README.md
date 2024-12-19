# 牛牛 AI

<div align="center">
<img src="https://cowgl.xyz/cow.png" width="200" height="200" /><br>
牛牛AI是一隻聰明的AI牛。<br>

![Version](https://img.shields.io/github/package-json/v/LittleCow-moo/CowAI?logo=github&style=for-the-badge&label=版本) ![License](https://img.shields.io/github/license/LittleCow-moo/CowAI?style=for-the-badge&logo=github&label=許可證) ![WakaTime](https://wakatime.com/badge/github/LittleCow-Moo/CowAI.svg?style=for-the-badge) [![Prettier](https://img.shields.io/badge/程式碼樣式-Prettier-ff69b4.svg?style=for-the-badge)](https://github.com/prettier/prettier)<br>
這個專案目前是個未完成品，可能有很多 bug 及無法調整的內建設定，請見諒。

</div>

# 執行

1. `git clone`這個 repo
2. `cd`到這個 repo
3. `npm i`

4. (可選) 簽個 SSL 給 LINE Bot 用 (?)
5. 把`.env`填成這樣子：

```env
KEY= # Google Gemini API Key
ADMIN_KEY= # 設定一個管理員專用的Cow AI API Key。這個API Key將會繞過速率限制，並且會被使用在其他平台中。
ENABLE_AI_GATEWAY=[true/false] # 是否要啟用Cloudflare AI Gateway
AI_GATEWAY= # 如果ENABLE_AI_GATEWAY為true，請填寫此項。
# AI Gateway網址看起來應該會像這樣: https://gateway.ai.cloudflare.com/v1/[帳號ID]/[Gateway ID]/google-ai-studio
# 只需填寫 "[帳號ID]/[Gateway ID]" 部分即可。
AI_GATEWAY_TOKEN= # AI Gateway權杖，填入空字串則不使用權杖

ENABLE_DISCORD=[true/false] # 是否要啟用Discord機器人
DISCORD= # Discord Bot Token

ENABLE_TELEGRAM=[true/false] # 是否要啟用Telegram機器人
TELEGRAM= # Telegram Bot Secret

ENABLE_LINE=[true/false] # 是否要啟用LINE Bot
LINE_ID= # LINE Messaging API Channel ID
LINE_SECRET= # LINE Messaging API Channel Secret
LINE_ACCESS_TOKEN= # LINE Messaging API Channel Access Token
LINE_SSL_FULLCHAIN= # 你簽給LINE Bot的SSL的fullchain.pem的檔案路徑
LINE_SSL_PRIVKEY= # 你簽給LINE Bot的SSL的privkey.pem的路徑

ENABLE_IRC=[true/false] # 是否要啟用IRC機器人
IRC_HOST= # 要連接的IRC伺服器
IRC_PORT= # 要連接的IRC伺服器端口
# 經過我的測試，只能使用明文傳輸的IRC伺服器
IRC_NICK= # IRC機器人的Nick & Account
IRC_PASSWORD= # IRC機器人的密碼
IRC_CHANNEL= # IRC機器人要自動加入的頻道，例如機器人的支援頻道等

HF_ACCESS_TOKEN= # HuggingFace Access Token (作畫功能使用，要有read權限)
PSE_ID= # Google Programmable Search Engine ID (Google 搜尋功能用)
PSE_KEY= # Google Programmable Search Engine API Key (Google 搜尋功能用)
```

6. `node .`

# 使用

如果一切都正常運作，那 AI 機器人應該就會在 Discord, Telegram, LINE, 和 IRC 上線了。除了這三個平台的機器人外，它還會開一個 HTTP 端口`38943`用以通訊。
