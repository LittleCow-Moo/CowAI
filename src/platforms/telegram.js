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
  bot.sendChatAction(msg.chat.id, "typing");
  var messages = await tgMsg.getObjectDefault(`/${msg.chat.id}`, []);
  messages.push({ role: "user", parts: [{ text: msg.text }] });
  await tgMsg.push(`/${msg.chat.id}`, messages.slice(-5));
  await savedMsg.push(`/tg:${msg.chat.id}`, messages.slice(-5));
  const ws = new WebSocket(
    `ws://localhost:38943/api/generate?key=${process.env.ADMIN_KEY}&_readSavedMessages=tg:${msg.chat.id}`,
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
      var messages = await tgMsg.getObjectDefault(`/${msg.chat.id}`, []);
      messages.push({ role: "model", parts: [{ text: parsed.message }] });
      await tgMsg.push(`/${msg.chat.id}`, messages.slice(-5));
      bot.sendMessage(msg.chat.id, parsed.message, {
        parse_mode: "Markdown",
      });
      try {
        await savedMsg.delete(`/tg:${msg.chat.id}`);
      } catch (e) {}
    }
  });
});

bot.on("inline_query", (query) => {
  if (query.query == "") {
    bot.answerInlineQuery(query.id, []);
    return;
  }
  bot.answerInlineQuery(
    query.id,
    [
      {
        id: 8964,
        type: "article",
        title: "詢問牛牛問題",
        description: query.query,
        thumb_url: "https://cowgl.xyz/cow.png",
        input_message_content: {
          message_text: "哞！牛牛正在思考你的問題......",
        },
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "查看問題",
                switch_inline_query_current_chat: query.query,
              },
            ],
          ],
        },
      },
    ],
    { cache_time: 10 },
  );
});

bot.on("chosen_inline_result", (chosenResult) => {
  const inlineMessageId = chosenResult.inline_message_id;
  console.log(chosenResult, inlineMessageId);
  const ws = new WebSocket(
    `ws://localhost:38943/api/generate?key=${
      process.env.ADMIN_KEY
    }&messages=${JSON.stringify([
      {
        role: "user",
        parts: [{ text: chosenResult.query }],
      },
    ])}`,
  );
  ws.on("message", async (data) => {
    const parsed = JSON.parse(data);
    if (parsed.type == "welcome") {
      ws.send("");
    }
    if (parsed.type == "end") {
      bot.editMessageText(parsed.full.slice(-4000), {
        inline_message_id: inlineMessageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "查看問題",
                switch_inline_query_current_chat: chosenResult.query,
              },
            ],
          ],
        },
      });
      ws.close();
    }
    if (parsed.type == "error") {
      bot.editMessageText(parsed.message.slice(-4000), {
        inline_message_id: inlineMessageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "查看問題",
                switch_inline_query_current_chat: chosenResult.query,
              },
            ],
          ],
        },
      });
      ws.close();
    }
  });
});
