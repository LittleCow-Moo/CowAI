require("dotenv").config();
var linebot = require("linebot");
const express = require("express");
const https = require("https");
const fs = require("node:fs");
const fetch = require("node-fetch");
const { JsonDB, Config } = require("node-json-db");
const { WebSocket } = require("ws");
var savedMsg = new JsonDB(new Config("savedMessages", true, true));
var lineMsg = new JsonDB(new Config("lineMsg", true, true));

const app = express();
var bot = linebot({
  channelId: process.env.LINE_ID,
  channelSecret: process.env.LINE_SECRET,
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
});

bot.on("message", async (event) => {
  console.log("[Line] Message");
  if (event.message.type != "text")
    return event.reply("哞! 我看不懂文字以外的東西喔!");
  var messages = await lineMsg.getObjectDefault(`/${event.source.userId}`, []);
  messages.push({ role: "user", parts: [{ text: event.message.text }] });
  await lineMsg.push(`/${event.source.userId}`, messages.slice(-5));
  await savedMsg.push(`/line:${event.source.userId}`, messages.slice(-5));
  const ws = new WebSocket(
    `ws://localhost:38943/api/generate?key=${process.env.ADMIN_KEY}&_readSavedMessages=line:${event.source.userId}`
  );
  var wsTimeout;
  ws.on("message", async (data) => {
    const parsed = JSON.parse(data.toString());
    if (parsed.type == "welcome") {
      fetch("https://api.line.me/v2/bot/chat/loading/start", {
        method: "POST",
        body: JSON.stringify({
          chatId: event.source.userId,
          loadingSeconds: 30,
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}`,
        },
      });
      ws.send("");
      wsTimeout = setTimeout(async () => {
        try {
          await savedMsg.delete(`/line:${event.message.messageId}`);
        } catch (e) {}
        ws.close();
      }, 60000);
    }
    if (parsed.type == "error") {
      event.reply(parsed.message);
      clearTimeout(wsTimeout);
      ws.close();
    }
    if (parsed.type == "function") {
      fetch("https://api.line.me/v2/bot/chat/loading/start", {
        method: "POST",
        body: JSON.stringify({
          chatId: event.source.userId,
          loadingSeconds: 30,
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}`,
        },
      });
    }
    if (parsed.type == "response") {
      var messages = await lineMsg.getObjectDefault(
        `/${event.source.userId}`,
        []
      );
      messages.push({ role: "model", parts: [{ text: parsed.message }] });
      await lineMsg.push(`/${event.source.userId}`, messages.slice(-5));
      bot.push(event.source.userId, parsed.message);
      try {
        await savedMsg.delete(`/line:${event.message.messageId}`);
      } catch (e) {}
    }
  });
});

const linebotParser = bot.parser();
app.post("/webhook", linebotParser);
console.log("[Line] Bot ready");

https
  .createServer(
    {
      cert: fs.readFileSync(
        process.env.LINE_SSL_FULLCHAIN,
        "utf8"
      ),
      key: fs.readFileSync(
        process.env.LINE_SSL_PRIVKEY,
        "utf8"
      ),
    },
    app
  )
  .listen(12346);
