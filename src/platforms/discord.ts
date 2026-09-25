import dotenv from "dotenv";
import * as Discord from "discord.js";
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.DirectMessages,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [Discord.Partials.Channel, Discord.Partials.Message],
});
import { JsonDB, Config } from "node-json-db";
var savedMsg = new JsonDB(new Config("savedMessages", true, true));
import { WebSocket } from "ws";
import { websocketData } from "websocket-iterator";
import fetch from "node-fetch";
import cow from "./../utils/cow.js";
import packageInfo from "../../package.json" with { type: "json" };

dotenv.config({ quiet: true });
const supportedMime = cow.supportedMime;
const allowedBotsList = (process.env.DISCORD_ALLOWED_BOTS || "").split(",");

client.on("clientReady", () => {
  console.log("[Discord] Bot ready", client.user.tag);
  client.user.setPresence({
    activities: [
      {
        type: 4,
        name: "custom",
        state: `🐮 @${client.user.tag} | 牛牛 v${packageInfo.version}`,
      },
    ],
  });
});

client.on("messageCreate", async (message) => {
  if (!(message.mentions.has(client.user) || !message.guild)) return;
  if (message.author.id == client.user.id) return;
  if (message.author.bot && allowedBotsList.indexOf(message.author.id) == -1)
    return;
  const botChatTurn = message.author.bot;
  message.content = Discord.cleanContent(
    message.content,
    client.channels.cache.get(
      "1246648286144630837",
    ) as Discord.TextBasedChannel,
  )
    .replaceAll("@牛牛AI ", "")
    .replaceAll("@牛牛AI", "");
  console.log("[Discord] Message:", message.content);
  type DiscordPulledMessage = {
    content: string;
    attachments: { first: () => { proxyURL: string } | undefined };
    author: { username: string; id: string };
  };
  var pulledMessages: DiscordPulledMessage[] = Object.values(
    (await message.channel.messages.fetch({ limit: 5 })).toJSON(),
  ).reverse() as unknown as DiscordPulledMessage[];
  var parsePulledMessages = () => {
    for (const [i, a] of pulledMessages.entries()) {
      if (a.content == "COW_CLEAR_CONTEXT") {
        pulledMessages = pulledMessages.slice(i + 1);
        parsePulledMessages();
        break;
      }
    }
  };
  parsePulledMessages();
  if (pulledMessages.length == 0) return;
  const parsedMessages = await Promise.all(
    pulledMessages.map(async (a, index) => {
      a.content = Discord.cleanContent(
        a.content,
        client.channels.cache.get(
          "1246648286144630837",
        ) as Discord.TextBasedChannel,
      )
        .replaceAll("@牛牛AI ", "")
        .replaceAll("@牛牛AI", "");
      var returning = [];
      const attachment = a.attachments.first();
      const attachmentUrl =
        /(https?:\/\/[a-zA-Z0-9%\/._-]*\.(?:png|jpeg|jpg|webp|heic|heif|wav|mp3|aiff|aac|ogg|flac|mpeg|x-wav)(?:\?[a-zA-Z0-9%=&]*|))/im.exec(
          a.content,
        );
      var att;
      fetchAttachment: if (
        index == pulledMessages.length - 1 &&
        (attachment || (!attachment && attachmentUrl))
      ) {
        att = attachment ? attachment.proxyURL : attachmentUrl[0];
        const response = await fetch(att);
        const arrayBuffer = await response.arrayBuffer();
        const data = Buffer.from(arrayBuffer).toString("base64");
        var mime = response.headers.get("content-type");
        if (!mime) break fetchAttachment;
        if (supportedMime.indexOf(mime) == -1) break fetchAttachment;
        console.log("[Discord] Attachment detected:", att);
        if (mime == "audio/mpeg") mime = "audio/mp3";
        if (mime == "audio/x-wav") mime = "audio/wav";
        returning.push({
          inlineData: {
            mimeType: mime,
            data,
          },
        });
        a.content = a.content.replace(att, "");
      }
      const userInfo = `@${a.author.username} (Discord ID: ${a.author.id})`;
      returning.push({
        text:
          a.content != ""
            ? `${userInfo}說: ${a.content}`
            : att
              ? `${userInfo}傳送了一個檔案`
              : `${userInfo}提及了你`,
      });
      return a.author.id != client.user.id
        ? returning[0]
          ? {
              role: "user",
              parts: returning,
            }
          : null
        : { role: "model", parts: [{ text: a.content }] };
    }),
  );
  const filteredMessages = parsedMessages.filter((a) => !!a);
  console.log("[Discord] Pulled messages:", filteredMessages);
  await savedMsg.push(`/discord:${message.id}`, filteredMessages);
  const ws = new WebSocket(
    `ws://localhost:38943/api/generate?key=${process.env.ADMIN_KEY}&streamingResponse&_readSavedMessages=discord:${message.id}`,
  );
  var replyMessage;
  var sentReply = false;
  var wsTimeout;
  var response = "";
  let processedLength = 0;
  for await (const data of websocketData(
    ws as unknown as globalThis.WebSocket,
  )) {
    const parsed = JSON.parse(data.toString());
    if (parsed.type === "welcome") {
      await message.channel.sendTyping();
      ws.send("");
      wsTimeout = setTimeout(async () => {
        await savedMsg.delete(`/discord:${message.id}`);
        ws.close();
      }, 60000);
    }
    if (parsed.type === "part") {
      response += parsed.message;
      if (parsed.first && !sentReply) {
        sentReply = true;
        if (parsed.message.trim() && !botChatTurn) {
          replyMessage = await splitAndSend(parsed.message);
        }
        processedLength = response.length;
        continue;
      }
      if (sentReply && replyMessage && response.length > processedLength) {
        const newContent = response.slice(processedLength);
        if (newContent.trim()) {
          const accumulatedContent = replyMessage.content + newContent;
          if (accumulatedContent.length <= 2000) {
            replyMessage = await replyMessage.edit(accumulatedContent);
          } else {
            const parts = accumulatedContent.match(/[\s\S]{1,2000}(?!\S)/g) || [
              accumulatedContent,
            ];
            await replyMessage.edit(parts[0]);
            for (let i = 1; i < parts.length; i++) {
              replyMessage = await message.channel.send(parts[i]);
            }
          }
          processedLength = response.length;
        }
      }
    }
    if (parsed.type === "error") {
      sentReply = true;
      if (parsed.message.trim() && !botChatTurn) {
        replyMessage = await splitAndSend(parsed.message);
      }
      clearTimeout(wsTimeout);
      ws.close();
    }
    if (parsed.type === "response") {
      if (!sentReply) {
        sentReply = true;
        if (parsed.full.trim() && !botChatTurn) {
          replyMessage = await splitAndSend(parsed.full);
        }
      }
    }
    if (parsed.type === "end") {
      if (!sentReply) {
        sentReply = true;
        if (parsed.full.trim() && !botChatTurn) {
          replyMessage = await splitAndSend(parsed.full);
        }
      } else if (parsed.full.trim()) {
        const newContent = parsed.full.slice(processedLength);
        if (newContent.trim() && !botChatTurn) {
          replyMessage = await splitAndEdit(replyMessage, newContent);
        }
      }
      await savedMsg.delete(`/discord:${message.id}`);
      ws.close();
    }
  }
  if (botChatTurn) await splitAndSend(response);
  async function splitAndSend(text) {
    if (!text.trim()) return;
    if (text.length <= 2000) {
      return await message.reply(text);
    }
    const parts = text.match(/[\s\S]{1,2000}(?!\S)/g) || [text];
    let sentMessage;
    for (const part of parts) {
      sentMessage = await message.reply(part);
    }
    return sentMessage;
  }
  async function splitAndEdit(replyMessage, text) {
    if (!text.trim()) return replyMessage;
    if (text.length <= 2000) {
      return await replyMessage.edit(text);
    }
    const parts = text.match(/[\s\S]{1,2000}(?!\S)/g) || [text];
    await replyMessage.edit(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      await message.channel.send(parts[i]);
    }
    return replyMessage;
  }
});
client.on("interactionCreate", (slash) => {
  if (!slash.isChatInputCommand()) return;
  switch (slash.commandName) {
    case "clear":
      slash.reply("COW_CLEAR_CONTEXT");
      break;
    case "cow":
      const question = slash.options.getString("question") || "";
      const hide = slash.options.getBoolean("hidden", false) || false;
      const ws = new WebSocket(
        `ws://localhost:38943/api/generate?key=${
          process.env.ADMIN_KEY
        }&messages=${JSON.stringify([
          {
            role: "user",
            parts: [{ text: question }],
          },
        ])}`,
      );
      ws.on("message", async (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type == "welcome") {
          await slash.deferReply({ ephemeral: hide });
          ws.send("");
        }
        if (parsed.type == "end") {
          slash.editReply({
            content: parsed.full.slice(-2000),
          });
          ws.close();
        }
        if (parsed.type == "error") {
          slash.editReply({
            content: parsed.message.slice(-2000),
          });
          ws.close();
        }
      });
  }
});

client.login(process.env.DISCORD);
