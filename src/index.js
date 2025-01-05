require("dotenv").config();
require("./platforms/gemini");
if (process.env.ENABLE_DISCORD == "true") require("./platforms/discord");
if (process.env.ENABLE_TELEGRAM == "true") require("./platforms/telegram");
if (process.env.ENABLE_LINE == "true") require("./platforms/line");
if (process.env.ENABLE_IRC == "true") require("./platforms/irc");
