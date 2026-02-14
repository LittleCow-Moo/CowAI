require("dotenv").config({ quiet: true });
const Bot = require("keybase-bot");
const { JsonDB, Config } = require("node-json-db");
var savedMsg = new JsonDB(new Config("savedMessages", true, true));
const { WebSocket } = require("ws");
const os = require("os");

const bot = new Bot();

async function main() {
  try {
    if (process.env.KEYBASE_USE_SERVICE == "true") {
      await bot.initFromRunningService(os.homedir());
    } else {
      const username = process.env.KEYBASE_USERNAME;
      const paperkey = process.env.KEYBASE_PAPERKEY;
      await bot.init(username, paperkey);
    }
    const info = bot.myInfo();
    console.log(`[Keybase] Bot ready ${info.username}`);

    const onError = (e) => console.error(e);
    console.log(`Listening for messages...`);
    await bot.chat.watchAllChannelsForNewMessages(async (message) => {
      if (message.content.type !== "text") {
        // I copied this from the example and do not want to implement multimodal for now :P
        return;
      }
      if (!message.content.text.body.includes(`@${info.username}`)) {
        return;
      }

      const pulledMessages = await Promise.all(
        (
          await bot.chat.read(message.conversationId, {
            peek: true,
            pagination: { num: 10 },
          })
        ).messages
          .filter((a) => a.content.type == "text")
          .slice(-5)
          .map((a) => {
            const isModel = a.sender.username || "" == info.username;
            return {
              role: isModel ? "model" : "user",
              parts: [
                { text: `${!isModel ? `${userInfo}說: ` : ""}${a.content}` },
              ],
            };
          }),
      );
      await savedMsg.push(`/keybase:${message.id}`, pulledMessages);
      const ws = new WebSocket(
        `ws://localhost:38943/api/generate?key=${process.env.ADMIN_KEY}&_readSavedMessages=keybase:${message.id}`,
      );
      ws.on("message", async (data) => {
        const parsed = JSON.parse(data);
        if (parsed.type == "welcome") {
          ws.send("");
        }
        if (parsed.type == "end") {
          bot.chat.send(message.conversationId, {
            body: parsed.full.slice(-4000),
          });
          ws.close();
        }
        if (parsed.type == "error") {
          bot.chat.send(message.conversationId, {
            body: parsed.message.slice(-4000),
          });
          ws.close();
        }
      });
    }, onError);
  } catch (error) {
    console.error(error);
  }
}

async function shutDown() {
  await bot.deinit();
  process.exit();
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);

main();
