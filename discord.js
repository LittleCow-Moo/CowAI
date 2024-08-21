require("dotenv").config();
const Discord = require("discord.js");
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
const { JsonDB, Config } = require("node-json-db");
var savedMsg = new JsonDB(new Config("savedMessages", true, true));
const { WebSocket } = require("ws");
const { websocketData } = require("websocket-iterator");

client.on("ready", () => {
  console.log("[Discord] Bot ready", client.user.tag);
  client.user.setPresence({
    activities: [
      {
        type: 4,
        name: "custom",
        state: `牛牛 v${require("./package.json").version} | @${
          client.user.tag
        }`,
      },
    ],
  });
});

client.on("messageCreate", async (message) => {
  if (!(message.mentions.has(client.user) || !message.guild)) return;
  if (message.author.id == client.user.id) return;
  if (message.author.bot) return;
  message.content = Discord.cleanContent(
    message.content,
    client.channels.cache.get("1246648286144630837")
  )
    .replaceAll("@牛牛AI ", "")
    .replaceAll("@牛牛AI", "");
  console.log("[Discord] Message:", message.content);
  var pulledMessages = Object.values(
    (await message.channel.messages.fetch({ limit: 5 })).toJSON()
  ).reverse();
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
  pulledMessages = pulledMessages.map((a) => {
    a.content = Discord.cleanContent(
      a.content,
      client.channels.cache.get("1246648286144630837")
    )
      .replaceAll("@牛牛AI ", "")
      .replaceAll("@牛牛AI", "");
    return a.author.id != client.user.id
      ? {
          role: "user",
          parts: [{ text: `@${a.author.username}說: ${a.content}` }],
        }
      : { role: "model", parts: [{ text: a.content }] };
  });
  console.log("[Discord] Pulled messages:", pulledMessages);
  await savedMsg.push(`/discord:${message.id}`, pulledMessages);
  const ws = new WebSocket(
    `ws://localhost:38943/api/generate?key=${process.env.ADMIN_KEY}&streamingResponse&_readSavedMessages=discord:${message.id}`
  );
  var replyMessage;
  var sentReply = false;
  var wsTimeout;
  var response = "";
  globalThis.WebSocket = WebSocket;
  for await (const data of websocketData(ws)) {
    const parsed = JSON.parse(data.toString());
    if (parsed.type == "welcome") {
      await message.channel.sendTyping();
      ws.send("");
      wsTimeout = setTimeout(async () => {
        try {
          await savedMsg.delete(`/discord:${message.id}`);
        } catch (e) {}
        ws.close();
      }, 60000);
    }
    if (parsed.type == "part") {
      response += parsed.message;
      if (parsed.first && !sentReply) {
        sentReply = true;
        replyMessage = await message.reply(parsed.message.slice(-2000));
        continue;
      }
      if (sentReply && replyMessage) {
        replyMessage = await replyMessage.edit(parsed.full.slice(-2000));
      }
    }
    if (parsed.type == "error") {
      sentReply = true;
      replyMessage = await message.reply(parsed.message.slice(-2000));
      clearTimeout(wsTimeout);
      ws.close();
    }
    if (parsed.type == "response") {
      if (!sentReply) {
        sentReply = true;
        replyMessage = await message.reply(parsed.full.slice(-2000));
      }
    }
    if (parsed.type == "end") {
      try {
        if (!sentReply) {
          sentReply = true;
          replyMessage = await message.reply(parsed.full.slice(-2000));
        } else {
          replyMessage = await replyMessage.edit(parsed.full.slice(-2000));
        }
      } catch (e) {
      } finally {
        try {
          await savedMsg.delete(`/discord:${message.id}`);
        } catch (e) {}
      }
    }
  }
});
client.on("interactionCreate", (slash) => {
  if (slash.type != Discord.InteractionType.ApplicationCommand) return;
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
        ])}`
      );
      ws.on("message", async (data) => {
        const parsed = JSON.parse(data);
        if (parsed.type == "welcome") {
          await slash.deferReply({ ephemeral: hide });
          ws.send("");
        }
        if (parsed.type == "end") {
          slash.editReply({
            content: parsed.full.slice(-2000),
            ephemeral: hide,
          });
          ws.close();
        }
        if (parsed.type == "error") {
          slash.editReply({
            content: parsed.message.slice(-2000),
            ephemeral: hide,
          });
          ws.close();
        }
      });
  }
});

client.login(process.env.DISCORD);
