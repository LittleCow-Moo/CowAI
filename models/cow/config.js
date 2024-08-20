const cow = require("../../cow");
module.exports = {
  id: "cow",
  baseModel: "gemini-1.5-flash",
  temperature: 1.2,
  topP: 1,
  tools: cow.tools,
};
