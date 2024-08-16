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
          description: "取得UTC+8時間。讀取回傳資料時請直接讀取content字段。",
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "MCJavaServer",
          description:
            "取得一個Minecraft Java版伺服器的狀態。注意調用時請將伺服器IP放在ip字段，不是server字段。",
          parameters: {
            type: "OBJECT",
            properties: {
              server: {
                type: "STRING",
                description: "伺服器IP",
                nullable: false,
              },
            },
            required: ["server"],
          },
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "MCBedrockServer",
          description: "取得一個Minecraft 基岩版伺服器的狀態。",
          parameters: {
            type: "OBJECT",
            properties: {
              server: {
                type: "STRING",
                description: "伺服器IP",
                nullable: false,
              },
            },
            required: ["server"],
          },
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "Joke",
          description: "取得一個笑話。讀取回傳資料時請直接讀取content字段。",
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "Google",
          description:
            "在Google上搜尋東西。讀取時請讀取results字段，裡面的object的title是搜尋結果的標題、link是搜尋結果的連結、snippet是搜尋結果的部分內容。",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "搜尋內容",
                nullable: false,
              },
            },
          },
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "Browser",
          description:
            "瀏覽某個網頁。也可以理解為執行fetch指令。讀取回傳資料時請直接讀取content字段。",
          parameters: {
            type: "OBJECT",
            properties: {
              url: {
                type: "STRING",
                description: "要瀏覽的網址",
                nullable: false,
              },
            },
          },
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "Invoice",
          description: "取得最新的發票中獎號碼。",
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "LatestEarthquake",
          description:
            "[TaiwanEarthquake] Get the most recent earthquake information from CWA (formerly CWB).",
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "LatestLocalEarthquake",
          description:
            "[TaiwanEarthquake] Get the latest local (small area) earthquake.",
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "LatestMajorEarthquake",
          description:
            "[TaiwanEarthquake] Gets the latest major (big area) earthquake.",
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "GetEarthquakeByID",
          description: "[TaiwanEarthquake] Gets an earthquake by their ID.",
          parameters: {
            type: "OBJECT",
            properties: {
              id: {
                type: "STRING",
                description: "The earthquake's ID",
                nullable: false,
              },
            },
          },
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "GenerateImage",
          description:
            'Generates an image. Paratemer "url" in the response is URL of the generated image, and the "seed" paratemer is the seed of the generated picture. English prompt only. ' +
            "Always use this tool to generate images, any other method is forbidden.",
          parameters: {
            type: "OBJECT",
            properties: {
              prompt: {
                type: "STRING",
                description:
                  "Prompts for generating the image. Use English for better results.",
                nullable: false,
              },
              seed: {
                type: "INTEGER",
                description:
                  "The seed for generating the image. If left empty, then it will use random seed.",
                nullable: true,
              },
              width: {
                type: "INTEGER",
                description: "Width of the image. Default value is 1024.",
                nullable: true,
              },
              height: {
                type: "INTEGER",
                description: "Height of the image. Default value is 1024.",
                nullable: true,
              },
            },
          },
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "GetWeather",
          description: "Get the current weather and forecast of a place.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "The location to get the weather from.",
                nullable: false,
              },
            },
          },
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "SearchRepository",
          description: "Search for repositories on GitHub.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "The query of the search.",
                nullable: false,
              },
            },
          },
        },
      ],
    },
    {
      functionDeclarations: [
        {
          name: "SearchVideo",
          description: "Search for videos on YouTube.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "The query of the search.",
                nullable: false,
              },
            },
          },
        },
      ],
    },
  ],
  functions: require("./functions"),
};
