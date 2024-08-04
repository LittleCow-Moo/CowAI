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

client.on("ready", () => {
  console.log("[Discord] Bot ready", client.user.tag);
  client.user.setPresence({
    activities: [
      {
        type: 4,
        name: "custom",
        state: "牛牛 v1.1.0 | @" + client.user.tag,
      },
    ],
  });
});

client.on("messageCreate", async (message) => {
  if (!(message.mentions.has(client.user) || !message.guild)) return;
  if (message.author.id == client.user.id) return;
  message.content = Discord.cleanContent(
    message.content,
    client.channels.cache.get("1246648286144630837")
  )
    .replaceAll("@牛牛AI ", "")
    .replaceAll("@牛牛AI", "");
  console.log("[Discord] Message", message.content);
  var pulledMessages = Object.values(
    (await message.channel.messages.fetch({ limit: 5 })).toJSON()
  );
  for (const [i, a] of pulledMessages.entries()) {
    if (a.content == "COW_CLEAR_CONTEXT") {
      pulledMessages = pulledMessages.slice(i, -1);
    }
  }
  pulledMessages = pulledMessages
    .map((a) => {
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
    })
    .reverse();
  await savedMsg.push(`/discord:${message.id}`, pulledMessages);
  const ws = new WebSocket(
    `ws://localhost:38943/api/generate?key=${process.env.ADMIN_KEY}&streamingResponse&_readSavedMessages=discord:${message.id}`
  );
  var replyMessage;
  var sentReply = false;
  var wsTimeout;
  var response = "";
  ws.on("message", async (data) => {
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
        replyMessage = await message.reply(parsed.message);
        return;
      }
      if (sentReply && replyMessage) {
        replyMessage = await replyMessage.edit(parsed.full);
      }
    }
    if (parsed.type == "error") {
      sentReply = true;
      replyMessage = await message.reply(parsed.message);
      clearTimeout(wsTimeout);
      ws.close();
    }
    if (parsed.type == "response") {
      if (!sentReply) {
        sentReply = true;
        replyMessage = await message.reply(parsed.full);
      }
    }
    if (parsed.type == "end") {
      try {
        replyMessage = await replyMessage.edit(response);
      } catch (e) {
      } finally {
        try {
          await savedMsg.delete(`/discord:${message.id}`);
        } catch (e) {}
      }
    }
  });
});
client.on("interactionCreate", (slash) => {
  if (slash.type != Discord.InteractionType.ApplicationCommand) return;
  switch (slash.commandName) {
    case "clear":
      slash.reply("COW_CLEAR_CONTEXT");
      break;
  }
});

client.login(process.env.DISCORD);
