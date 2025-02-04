require("dotenv").config();
if (!process.env.ADMIN_KEY || process.env.ADMIN_KEY == "")
  throw new Error(
    `Please set an admin key in \`.env\`. I have generated one for you: \`${require("crypto").randomUUID()}\``
  );
const checkMissingField = (field) => {
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
require("./platforms/gemini");
if (process.env.ENABLE_DISCORD == "true" && checkMissingField("DISCORD"))
  require("./platforms/discord");
if (process.env.ENABLE_TELEGRAM == "true" && checkMissingField("TELEGRAM"))
  require("./platforms/telegram");
if (
  process.env.ENABLE_LINE == "true" &&
  checkMissingField("LINE_ID") &&
  checkMissingField("LINE_SECRET") &&
  checkMissingField("LINE_ACCESS_TOKEN") &&
  checkMissingField("LINE_SSL_FULLCHAIN") &&
  checkMissingField("LINE_SSL_PRIVKEY")
)
  require("./platforms/line");
if (
  process.env.ENABLE_IRC == "true" &&
  checkMissingField("IRC_HOST") &&
  checkMissingField("IRC_PORT") &&
  checkMissingField("IRC_NICK") &&
  checkMissingField("IRC_PASSWORD") &&
  checkMissingField("IRC_CHANNEL")
)
  require("./platforms/irc");
