module.exports = {
  prompt: require("fs").readFileSync("prompt.md").toString("utf-8"),
  /**
   * @params {require("@google/generative-ai").GenerationConfig} config
   */
  config: {
    temperature: 1.2, //1.1,
    topP: 1,
    //responseMimeType: "text/plain"
    //frequencyPenalty: 0.5,
    //presencePenalty: 0.1,
    //maxOutputTokens: 3072,
  },
  tools: [
    {
      functionDeclarations: [
        {
          name: "Time",
          description:
            "取得現在時間（台北時間，`UTC+8`），結果位於 `content` 項。",
        },
        {
          name: "MCJavaServer",
          description: "取得一個 Minecraft Java版線上多人伺服器的狀態。",
          parameters: {
            type: "OBJECT",
            properties: {
              server: {
                type: "STRING",
                description: "伺服器IP，例如 `cowgl.xyz`。",
              },
            },
            required: ["server"],
          },
        },
        {
          name: "MCBedrockServer",
          description: "取得一個 Minecraft 基岩版線上多人伺服器的狀態。",
          parameters: {
            type: "OBJECT",
            properties: {
              server: {
                type: "STRING",
                description: "伺服器IP，例如 `cowgl.xyz`。",
              },
            },
            required: ["server"],
          },
        },
        {
          name: "Joke",
          description: "從笑話特輯隨機取得一個笑話，結果位於 `content` 項。",
        },
        {
          name: "GoogleSearch",
          description:
            "使用 Google 搜尋內容。結果位於 `result` 項，其中的 `title` 表示該結果的網頁標題、`link` 表示該結果的連結、`snippet` 提供該結果的部分預覽（預覽可能不是即時的，如果需要請另外直接瀏覽該網頁）。",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description:
                  "Google 搜尋關鍵字（例如：`Minecraft`），也支援如 `site:` 等過濾選項。",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "Browser",
          description: "瀏覽指定網頁。結果位於 `content` 項。",
          parameters: {
            type: "OBJECT",
            properties: {
              url: {
                type: "STRING",
                description: "目標網頁的網址，例如： `https://example.com`。",
              },
            },
            required: ["url"],
          },
        },
        {
          name: "Invoice",
          description:
            "取得台灣最新的統一發票中獎號碼，回傳結果包含中獎號碼及月份資訊。",
        },
        {
          name: "LatestEarthquake",
          description: "從中央氣象署取得台灣最近的地震報告。",
        },
        {
          name: "LatestLocalEarthquake",
          description: "從中央氣象署取得台灣最近的顯著有感地震報告。",
        },
        {
          name: "LatestMajorEarthquake",
          description: "從中央氣象署取得台灣最近的小區域有感地震報告。",
        },
        {
          name: "GetEarthquakeByID",
          description: "從中央氣象署取得台灣指定地震編號的地震報告。",
          parameters: {
            type: "OBJECT",
            properties: {
              id: {
                type: "STRING",
                description:
                  "地震編號，由民國年份與序號構成，例如 `113447` 是指在民國 113 年，序號 `447` 的地震。",
              },
            },
            required: ["id"],
          },
        },
        {
          name: "GenerateImage",
          description:
            "生成（繪製）一張圖片。結果中 `url` 項表示生成結果的圖片連結，`seed` 項為採用的種子碼。",
          parameters: {
            type: "OBJECT",
            properties: {
              prompt: {
                type: "STRING",
                description:
                  "想產生的圖片的提示詞（描述），像是圖片主題、風格、背景設計等等，僅支援英文，詳細明確的描述能提供較符合的結果，例如：`A Minecraft cow in a lush green meadow under a vibrant blue sky, with soft white clouds drifting across the horizon. The cow should have a gentle, friendly expression, its brown and white patterned fur meticulously rendered. The meadow should be filled with tall, swaying grass, with wildflowers blooming in bright colors. The sun should be shining brightly, casting long shadows from the cow and the surrounding trees. The overall scene should evoke a feeling of tranquility and peace.`。",
              },
              seed: {
                type: "INTEGER",
                description:
                  "圖片的種子碼，相同的種子碼可能有助於提供同種樣式的圖片，一般會使用隨機產生的種子碼，不需設定。將本欄位留空即表示使用隨機種子。",
                nullable: true,
              },
              width: {
                type: "INTEGER",
                description: "圖片寬度，單位：像素。預設情況採用 `1024`。",
                nullable: true,
              },
              height: {
                type: "INTEGER",
                description: "圖片高度，單位：像素。預設情況採用 `1024`。",
                nullable: true,
              },
            },
            required: ["prompt"],
          },
        },
        {
          name: "GetWeather",
          description: "取得指定地區的目前天氣狀況及天氣預報。",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "目標查詢地區，例如：`臺中市`。",
              },
            },
          },
        },
        {
          name: "SearchRepository",
          description: "搜尋 GitHub 儲存庫。",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "用於搜尋 GitHub 儲存庫的關鍵字，例如：`CowAI`。",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "SearchVideo",
          description: "搜尋 YouTube 上的影片。",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description:
                  "用於搜尋 YouTube 影片的關鍵字，例如：`Never Gonna Give You Up`。",
              },
            },
          },
        },
        {
          name: "SearchMinecraftWiki",
          description:
            "使用 Minecraft Wiki 搜尋內容。結果位於 `result` 項，其中的 `title` 表示該結果的網頁標題、`link` 表示該結果的連結、`snippet` 提供該結果的部分預覽（預覽可能不是即時的，如果需要請另外直接瀏覽該網頁）。",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "Minecraft Wiki 搜尋關鍵字。",
              },
            },
            required: ["query"],
          },
        },
      ],
    },
  ],
  functions: require("./functions"),
  utils: {
    toolCallFix: (input) => {
      var returns = [];
      var returningInput = input;
      const regex = /print\(default_api\.(\w+)\((.*?)\)\)/g;
      const matches = [...input.matchAll(regex)];
      for (const match of matches) {
        returningInput = returningInput.replaceAll(match[0], "");
        const methodName = match[1];
        const argsString = match[2];
        const args = {};
        const argPairs =
          argsString.match(/(\w+)\s*=\s*("[^"]*"|'[^']*'|[^,]+)/g) || [];
        for (const arg of argPairs) {
          const [key, value] = arg.split("=").map((s) => s.trim());
          if (key && value !== undefined) {
            args[key] = value.replace(/(^["']|["']$)/g, "");
          }
        }
        returns.push({
          name: methodName,
          args: args,
        });
      }
      return { calls: returns, replaced: returningInput };
    },
  },
};
