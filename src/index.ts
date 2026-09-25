import dotenv from "dotenv";
import crypto from "node:crypto";

dotenv.config({ quiet: true });
if (!process.env.ADMIN_KEY || process.env.ADMIN_KEY == "")
  throw new Error(
    `Please set an admin key in \`.env\`. I have generated one for you: \`${crypto.randomUUID()}\``,
  );
const checkMissingField = (field: string): true => {
  if (!process.env[field] || process.env[field] == "") {
    throw new Error(`Please provide ${field} in \`.env\`.`);
  } else return true;
};
checkMissingField("KEY");
checkMissingField("HF_ACCESS_TOKEN");
checkMissingField("PSE_ID");
checkMissingField("PSE_KEY");
checkMissingField("API_DOMAIN");
if (process.env.ENABLE_AI_GATEWAY == "true") checkMissingField("AI_GATEWAY");
import "./platforms/gemini.js";
if (process.env.ENABLE_DISCORD == "true" && checkMissingField("DISCORD"))
  void import("./platforms/discord.js");
if (process.env.ENABLE_TELEGRAM == "true" && checkMissingField("TELEGRAM"))
  void import("./platforms/telegram.js");
if (
  process.env.ENABLE_LINE == "true" &&
  checkMissingField("LINE_ID") &&
  checkMissingField("LINE_SECRET") &&
  checkMissingField("LINE_ACCESS_TOKEN") &&
  checkMissingField("LINE_SSL_FULLCHAIN") &&
  checkMissingField("LINE_SSL_PRIVKEY")
)
  void import("./platforms/line.js");
if (
  process.env.ENABLE_IRC == "true" &&
  checkMissingField("IRC_HOST") &&
  checkMissingField("IRC_PORT") &&
  checkMissingField("IRC_NICK") &&
  checkMissingField("IRC_PASSWORD") &&
  checkMissingField("IRC_CHANNEL")
)
  void import("./platforms/irc.js");

if (
  process.env.ENABLE_KEYBASE == "true" &&
  (process.env.KEYBASE_USE_SERVICE == "true" ||
    (checkMissingField("KEYBASE_USERNAME") &&
      checkMissingField("KEYBASE_PAPERKEY")))
)
  void import("./platforms/keybase.js");

if (
  process.env.ENABLE_BRIAR == "true" &&
  checkMissingField("BRIAR_API_HOST") &&
  checkMissingField("BRIAR_AUTH_TOKEN")
)
  void import("./platforms/briar.js");
