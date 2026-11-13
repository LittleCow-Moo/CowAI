import dotenv from "dotenv";
import linebot from "linebot";
import express from "express";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import fetch from "node-fetch";
import { JsonDB, Config } from "node-json-db";
import { WebSocket } from "ws";

dotenv.config({ quiet: true });
const savedMsg = new JsonDB(new Config("savedMessages", true, true));
const lineMsg = new JsonDB(new Config("lineMsg", true, true));

const app = express();
const bot = linebot({
  channelId: process.env.LINE_ID,
  channelSecret: process.env.LINE_SECRET,
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
});

const readTlsFile = (filePath: string | undefined, name: string) => {
  if (!filePath || !path.isAbsolute(filePath))
    throw new Error(`${name} must be an absolute path`);
  const resolvedPath = path.resolve(filePath);
  if (!fs.statSync(resolvedPath).isFile())
    throw new Error(`${name} must point to a file`);
  return fs.readFileSync(resolvedPath, "utf8");
};

bot.on("message", async (event) => {
  console.log("[Line] Message");
  if (event.message.type != "text")
    return event.reply("哞! 我看不懂文字以外的東西喔!");
  const messages = await lineMsg.getObjectDefault(`/${event.source.userId}`, []);
  messages.push({ role: "user", parts: [{ text: event.message.text }] });
  await lineMsg.push(`/${event.source.userId}`, messages.slice(-5));
  await savedMsg.push(`/line:${event.source.userId}`, messages.slice(-5));
  const ws = new WebSocket(
    `ws://localhost:38943/api/generate?key=${process.env.ADMIN_KEY}&_readSavedMessages=line:${event.source.userId}`,
  );
  let wsTimeout;
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
        } catch {}
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
      const messages = await lineMsg.getObjectDefault(
        `/${event.source.userId}`,
        [],
      );
      messages.push({ role: "model", parts: [{ text: parsed.message }] });
      await lineMsg.push(`/${event.source.userId}`, messages.slice(-5));
      bot.push(event.source.userId, parsed.message);
      try {
        await savedMsg.delete(`/line:${event.message.messageId}`);
      } catch {}
    }
  });
});

const linebotParser = bot.parser();
app.post("/webhook", linebotParser);
console.log("[Line] Bot ready");

https
  .createServer(
    {
      cert: readTlsFile(process.env.LINE_SSL_FULLCHAIN, "LINE_SSL_FULLCHAIN"),
      key: readTlsFile(process.env.LINE_SSL_PRIVKEY, "LINE_SSL_PRIVKEY"),
    },
    app,
  )
  .listen(12346);
