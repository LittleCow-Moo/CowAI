import {
  EditMessageTextParams,
  Bot as TelegramBot,
} from "node-telegram-bot-api";

import dotenv from "dotenv";
import { JsonDB, Config } from "node-json-db";
import { WebSocket } from "ws";

dotenv.config({ quiet: true });
const bot = new TelegramBot(process.env.TELEGRAM || "");
var savedMsg = new JsonDB(new Config("savedMessages", true, true));
var tgMsg = new JsonDB(new Config("tgMsg", true, true));

bot.api.getMe().then((me) => {
  console.log("[Telegram] Bot ready", me.username);
});

bot.on("message", async (msg, _meta) => {
  if (msg.chat.type != "private") return;
  console.log("[Telegram] Message");
  bot.api.sendChatAction({ chat_id: msg.chat.id, action: "typing" });
  var messages = await tgMsg.getObjectDefault(`/${msg.chat.id}`, []);
  messages.push({ role: "user", parts: [{ text: msg.message.text }] });
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
      bot.api.sendMessage({ chat_id: msg.chat.id, text: parsed.message });
      clearTimeout(wsTimeout);
      ws.close();
    }
    if (parsed.type == "response") {
      var messages = await tgMsg.getObjectDefault(`/${msg.chat.id}`, []);
      messages.push({ role: "model", parts: [{ text: parsed.message }] });
      await tgMsg.push(`/${msg.chat.id}`, messages.slice(-5));
      try {
        await bot.api.sendMessage({
          chat_id: msg.chat.id,
          text: parsed.message,
          parse_mode: "Markdown",
        });
      } catch (e) {
        bot.api.sendMessage({ chat_id: msg.chat.id, text: parsed.message });
      }
      try {
        await savedMsg.delete(`/tg:${msg.chat.id}`);
      } catch (e) {}
    }
  });
});

bot.on("inline_query", (query) => {
  if (query.inlineQuery.query == "") {
    bot.api.answerInlineQuery({
      inline_query_id: query.inlineQuery.id,
      results: [],
    });
    return;
  }
  bot.api.answerInlineQuery({
    inline_query_id: query.inlineQuery.id,
    results: [
      {
        id: "8964",
        type: "article",
        title: "詢問牛牛問題",
        description: query.inlineQuery.query,
        thumbnail_url: "https://github.com/LittleCow-Moo.png",
        input_message_content: {
          message_text: "哞！牛牛正在思考你的問題......",
        },
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "查看問題",
                switch_inline_query_current_chat: query.inlineQuery.query,
              },
            ],
          ],
        },
      },
    ],
    cache_time: 10,
  });
});

bot.on("chosen_inline_result", (chosenResult) => {
  if (!("chosen_inline_result" in chosenResult.update)) {
    return;
  }

  const inlineMessageId =
    chosenResult.update.chosen_inline_result.inline_message_id;
  console.log(chosenResult.update, inlineMessageId);
  const ws = new WebSocket(
    `ws://localhost:38943/api/generate?key=${
      process.env.ADMIN_KEY
    }&messages=${JSON.stringify([
      {
        role: "user",
        parts: [{ text: chosenResult.update.chosen_inline_result.query }],
      },
    ])}`,
  );
  var editOptions: EditMessageTextParams = {
    inline_message_id: inlineMessageId,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "查看問題",
            switch_inline_query_current_chat:
              chosenResult.update.chosen_inline_result.query,
          },
        ],
      ],
    },
  };
  ws.on("message", async (data) => {
    const parsed = JSON.parse(data.toString());
    if (parsed.type == "welcome") {
      ws.send("");
    }
    if (parsed.type == "end") {
      try {
        await bot.api.editMessageText({
          text: parsed.full.slice(-4000),
          parse_mode: "Markdown",
          ...editOptions,
        });
      } catch (e) {
        bot.api.editMessageText({
          text: parsed.full.slice(-4000),
          ...editOptions,
        });
      }
      ws.close();
    }
    if (parsed.type == "error") {
      try {
        await bot.api.editMessageText({
          text: parsed.message.slice(-4000),
          parse_mode: "Markdown",
          ...editOptions,
        });
      } catch (e) {
        bot.api.editMessageText({
          text: parsed.message.slice(-4000),
          ...editOptions,
        });
      }
      ws.close();
    }
  });
});

bot.on("guest_message", (msg) => {
  if (!("guest_message" in msg.update)) {
    return;
  }
  const guestMsg = msg.update.guest_message;
  const ws = new WebSocket(
    `ws://localhost:38943/api/generate?key=${
      process.env.ADMIN_KEY
    }&messages=${JSON.stringify([
      {
        role: "user",
        parts: [{ text: guestMsg.text }],
      },
    ])}`,
  );
  ws.on("message", async (data) => {
    const parsed = JSON.parse(data.toString());
    if (parsed.type == "welcome") {
      ws.send("");
    }
    if (parsed.type == "end") {
      try {
        await bot.api.sendMessage({
          chat_id: guestMsg.chat.id,
          text: parsed.full.slice(-4000),
          parse_mode: "Markdown",
          reply_parameters: { message_id: guestMsg.message_id },
        });
      } catch (e) {
        await bot.api.sendMessage({
          chat_id: guestMsg.chat.id,
          text: parsed.full.slice(-4000),
          reply_parameters: { message_id: guestMsg.message_id },
        });
      }
      ws.close();
    }
    if (parsed.type == "error") {
      try {
        await bot.api.sendMessage({
          chat_id: guestMsg.chat.id,
          text: parsed.message.slice(-4000),
          parse_mode: "Markdown",
          reply_parameters: { message_id: guestMsg.message_id },
        });
      } catch (e) {
        await bot.api.sendMessage({
          chat_id: guestMsg.chat.id,
          text: parsed.full.slice(-4000),
          reply_parameters: { message_id: guestMsg.message_id },
        });
      }
      ws.close();
    }
  });
});

(async () => {
  await bot.startPolling();
})();
