require("dotenv").config();
require("./gemini");
if (process.env.ENABLE_DISCORD == "true") require("./platforms/discord");
if (process.env.ENABLE_TELEGRAM == "true") require("./platforms/telegram");
if (process.env.ENABLE_LINE == "true") require("./platforms/line");
