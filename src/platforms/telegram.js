require("dotenv").config({ quiet: true });
const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.TELEGRAM, {
  polling: true,
});
const { JsonDB, Config } = require("node-json-db");
var savedMsg = new JsonDB(new Config("savedMessages", true, true));
var tgMsg = new JsonDB(new Config("tgMsg", true, true));
const { WebSocket } = require("ws");

bot.getMe().then((me) => {
  console.log("[Telegram] Bot ready", me.username);
});

bot.on("message", async (msg, meta) => {
  if (msg.chat.type != "private") return;
  console.log("[Telegram] Message");
  var messages = await tgMsg.getObjectDefault(`/${msg.chat.id}`, []);
  messages.push({ role: "user", parts: [{ text: msg.text }] });
  await tgMsg.push(`/${msg.chat.id}`, messages.slice(-5));
  await savedMsg.push(`/tg:${msg.chat.id}`, messages.slice(-5));
  const ws = new WebSocket(
    `ws://localhost:38943/api/generate?key=${process.env.ADMIN_KEY}&_readSavedMessages=tg:${msg.chat.id}`
  );
  var wsTimeout;
  ws.on("message", async (data) => {
    const parsed = JSON.parse(data.toString());
    if (parsed.type == "welcome") {
      ws.send("");
      wsTimeout = setTimeout(async () => {
        try {
          await savedMsg.delete(`/tg:${msg.chat.id}`);
        } catch (e) {}
        ws.close();
      }, 60000);
    }
    if (parsed.type == "error") {
      event.reply(parsed.message);
      clearTimeout(wsTimeout);
      ws.close();
    }
    if (parsed.type == "response") {
      var messages = await tgMsg.getObjectDefault(
        `/${msg.chat.id}`,
        []
      );
      messages.push({ role: "model", parts: [{ text: parsed.message }] });
      await tgMsg.push(`/${msg.chat.id}`, messages.slice(-5));
      bot.sendMessage(msg.chat.id, parsed.message);
      try {
        await savedMsg.delete(`/tg:${msg.chat.id}`);
      } catch (e) {}
    }
  });
});
