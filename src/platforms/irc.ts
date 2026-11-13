import dotenv from "dotenv";
import IRC from "irc-framework";
const bot = new IRC.Client();
bot.connect({
  host: process.env.IRC_HOST,
  port: parseInt(process.env.IRC_PORT),
  nick: process.env.IRC_NICK,
  username: process.env.IRC_NICK,
  account: {
    name: process.env.IRC_NICK,
    password: process.env.IRC_PASSWORD,
  },
  ...((process.env.IRC_ENABLE_TLS || "") == "true"
    ? { rejectUnauthorized: false, tls: true }
    : {}),
});
import { JsonDB, Config } from "node-json-db";
const savedMsg = new JsonDB(new Config("savedMessages", true, true));
const ircMsg = new JsonDB(new Config("ircMsg", true, true));
import { WebSocket } from "ws";

dotenv.config({ quiet: true });

bot.on("registered", async () => {
  bot.say(
    "NickServ",
    `IDENTIFY littlecow ${process.env.IRC_NICK} ${process.env.IRC_PASSWORD}`,
  );
  console.log(
    "[IRC] Bot ready,",
    `${process.env.IRC_NICK} on ${process.env.IRC_HOST}:${process.env.IRC_PORT}`,
  );
  const defaultChannel = bot.channel(process.env.IRC_CHANNEL || "");
  defaultChannel.join();
  const channels = await ircMsg.getObjectDefault(`/channels`, []);
  for (const channel of channels) {
    try {
      bot.channel(channel).join();
    } catch {}
  }
});

bot.on("message", async (event) => {
  if (event.message.match(/^cow!join /)) {
    const toJoin = event.message.split(" ")[1];
    event.reply("Joining " + toJoin + "...");
    bot.join(toJoin);
    await ircMsg.push("/channels[]", toJoin, true);
    return;
  }
  if (event.from_server) return;
  if (!event.target.startsWith("#")) return;
  const splittedMessage = event.message.split(" ");
  const messages = await ircMsg.getObjectDefault(`/${event.target}`, []);
  messages.push({
    role: "user",
    parts: [{ text: event.nick + "說: " + event.message }],
  });
  await ircMsg.push(`/${event.target}`, messages.slice(-5));
  if (
    splittedMessage.includes(process.env.IRC_NICK) ||
    event.message.startsWith(`${process.env.IRC_NICK}: `)
  ) {
    event.message = splittedMessage
      .filter((a) => a != process.env.IRC_NICK)
      .join(" ");
    console.log("[IRC] Message");
    await savedMsg.push(`/irc:${event.target}`, messages.slice(-5));
    const ws = new WebSocket(
      `ws://localhost:38943/api/generate?key=${
        process.env.ADMIN_KEY
      }&_readSavedMessages=irc:${encodeURIComponent(event.target)}`,
    );
    let wsTimeout;
    ws.on("message", async (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type == "welcome") {
        ws.send("");
        wsTimeout = setTimeout(async () => {
          try {
            await savedMsg.delete(`/irc:${event.target}`);
          } catch {}
          ws.close();
        }, 60000);
      }
      if (parsed.type == "error") {
        event.reply(parsed.message);
        clearTimeout(wsTimeout);
        ws.close();
      }
      if (parsed.type == "response") {
        const messages = await ircMsg.getObjectDefault(`/${event.target}`, []);
        messages.push({ role: "model", parts: [{ text: parsed.message }] });
        await ircMsg.push(`/${event.target}`, messages.slice(-5));
        bot.say(event.target, parsed.message);
        try {
          await savedMsg.delete(`/irc:${event.target}`);
        } catch {}
      }
    });
  }
});
