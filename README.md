# 牛牛 AI

<div align="center">
<img src="https://avatars.githubusercontent.com/u/88564180" width="200" height="200" /><br>
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
CUSTOM_BASE_URL= # 自訂Gemini API的Base URL。若填寫這個項目，將會覆蓋ENABLE_AI_GATEWAY。
ENABLE_AI_GATEWAY=[true/false] # 是否要啟用Cloudflare AI 閘道
AI_GATEWAY= # 如果ENABLE_AI_GATEWAY為true，請填寫此項。
# AI 閘道網址看起來應該會像這樣: https://gateway.ai.cloudflare.com/v1/[帳號ID]/[Gateway ID]/google-ai-studio
# 只需填寫 "[帳號ID]/[Gateway ID]" 部分即可。
AI_GATEWAY_TOKEN= # AI 閘道權杖，填入空字串則不使用權杖
API_DOMAIN= # CowAI API的網域，產生圖片連結時使用
ENABLE_OPENAI=[true/false] # 是否啟用API格式支援，啟用則API位於/api/oai/v1

ENABLE_DISCORD=[true/false] # 是否要啟用Discord機器人
DISCORD= # Discord Bot Token
DISCORD_ALLOWED_BOTS= # 列出允許使用牛牛的Discord機器人ID，以逗點(`,`)分隔。

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
IRC_ENABLE_TLS=[true/false] # 是否使用TLS連線到IRC伺服器
IRC_NICK= # IRC機器人的Nick & Account
IRC_PASSWORD= # IRC機器人的密碼
IRC_CHANNEL= # IRC機器人要自動加入的頻道，例如機器人的支援頻道等

ENABLE_KEYBASE=[true/false] # 是否要啟用Keybase機器人
KEYBASE_USERNAME= # 機器人帳號的使用者名稱
KEYBASE_PAPERKEY # 機器人帳號的 Paper Key，用來登入
KEYBASE_USE_SERVICE=[true/false] # 是否要改用電腦上已經在執行的Keybase服務，如果為true則上面兩項不用填
KEYBASE_HOMEDIR= # 有Keybase登入資料的Home directory在哪裡，我加這個選項是因為我這個面板會亂改home directory :skull:

ENABLE_BRIAR=[true/false] # 是否要啟用Briar機器人
BRIAR_API_HOST= # briar-headless的API網址*的Host部分* (例如: http://localhost:7000, 輸入localhost:7000)
BRIAR_AUTH_TOKEN # 存取briar-heasless API使用的Auth Token
BRIAR_USE_TLS=[true/false] # (可選) 存取briar-heasless API時是否要使用https / wss

HF_ACCESS_TOKEN= # HuggingFace Access Token (作畫功能使用，要有read權限)
PSE_ID= # Google Programmable Search Engine ID (Google 搜尋功能用)
PSE_KEY= # Google Programmable Search Engine API Key (Google 搜尋功能用)
```

6. `npm start`

# 使用

如果一切都正常運作，那 AI 機器人應該就會在所設定的平台上線了。除了平台的機器人外，它還會開一個 HTTP 端口`38943`用以通訊。

## Briar 說明

為了能夠不離開 Briar 就能把機器人加為聯絡人，我想出了一個神奇的方法(?)

0. 機器人擁有者(A)請先參考 `briar-headless` 的說明和它加聯絡人
1. 機器人擁有者(A)和其他人(B)加為聯絡人，並且在加對方(B)的聯絡人時，順便詢問是否要機器人的聯絡人
2. 如果是，機器人擁有者(A)將對方(B)的 Briar 連結透過 Briar 發送給機器人
3. 此時機器人會回覆它的 Briar 連結，機器人擁有者(A)再透過 Briar 將機器人連結發給對方(B)
4. 對方(B)把機器人加為聯絡人，開始和機器人聊天
5. 之後如果B認識了其他人，也可以重複以上的步驟幫助對方取得機器人的聯絡人