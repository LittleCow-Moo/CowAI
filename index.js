require("dotenv").config();
require("./gemini");
if (process.env.ENABLE_DISCORD == "true") require("./discord");
if (process.env.ENABLE_TELEGRAM == "true") require("./telegram");
if (process.env.ENABLE_LINE == "true") require("./line");
