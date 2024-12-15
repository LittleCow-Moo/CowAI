require("dotenv").config();
const IRC = require("irc-framework");
var bot = new IRC.Client();
bot.connect({
  host: process.env.IRC_HOST,
  port: parseInt(process.env.IRC_PORT),
  nick: process.env.IRC_NICK,
  username: process.env.IRC_NICK,
  account: {
    name: process.env.IRC_NICK,
    password: process.env.IRC_PASSWORD,
  },
});
const { JsonDB, Config } = require("node-json-db");
var savedMsg = new JsonDB(new Config("savedMessages", true, true));
var ircMsg = new JsonDB(new Config("ircMsg", true, true));
const { WebSocket } = require("ws");

bot.on("registered", () => {
  console.log(
    "[IRC] Bot ready,",
    `${process.env.IRC_NICK} on ${process.env.IRC_HOST}:${process.env.IRC_PORT}`
  );
  globalThis.defaultChannel = bot.channel(process.env.IRC_CHANNEL);
  defaultChannel.join();
});

bot.on("message", async (event) => {
  if (event.message.match(/^cow!join /)) {
    var toJoin = event.message.split(" ")[1];
    event.reply("Joining " + toJoin + "...");
    bot.join(toJoin);
    return;
  }
  if (event.message.split(" ").includes(process.env.IRC_NICK)) {
    if (event.from_server) return;
    if (!event.target.startsWith("#")) return;
    console.log("[IRC] Message");
    var messages = await ircMsg.getObjectDefault(`/${event.target}`, []);
    messages.push({ role: "user", parts: [{ text: msg.text }] });
    await ircMsg.push(`/${event.target}`, messages.slice(-5));
    await savedMsg.push(`/irc:${event.target}`, messages.slice(-5));
    const ws = new WebSocket(
      `ws://localhost:38943/api/generate?key=${process.env.ADMIN_KEY}&_readSavedMessages=irc:${event.target}`
    );
    var wsTimeout;
    ws.on("message", async (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type == "welcome") {
        ws.send("");
        wsTimeout = setTimeout(async () => {
          try {
            await savedMsg.delete(`/irc:${event.target}`);
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
        var messages = await ircMsg.getObjectDefault(`/${event.target}`, []);
        messages.push({ role: "model", parts: [{ text: parsed.message }] });
        await ircMsg.push(`/${event.target}`, messages.slice(-5));
        bot.say(event.target, parsed.message);
        try {
          await savedMsg.delete(`/irc:${event.target}`);
        } catch (e) {}
      }
    });
  }
});