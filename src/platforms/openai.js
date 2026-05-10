const express = require("express");
const crypto = require("node:crypto");
const { JsonDB, Config } = require("node-json-db");
const { WebSocket } = require("ws");
var db = new JsonDB(new Config("rateLimit", true, true));
var savedMsg = new JsonDB(new Config("savedMessages", true, true));

const models = [
  {
    id: "cow",
    object: "model",
    created: 1720007766,
    owned_by: "littlecow",
  },
  {
    id: "mathcow",
    object: "model",
    created: 1723958460,
    owned_by: "littlecow",
  },
];

const MESSAGE_MEMORY = 5;

const parseJsonObject = (text, fallback = {}) => {
  if (typeof text !== "string" || text.trim() === "") return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
};

const extractTextContent = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      if (typeof part.text === "string") return part.text;
      if (part.type === "text" && typeof part.text === "string") return part.text;
      return "";
    })
    .join("");
};

const isFunctionCallTurn = (message) =>
  message?.role === "model" &&
  Array.isArray(message.parts) &&
  message.parts.some((part) => part?.functionCall);

const isFunctionResponseTurn = (message) =>
  message?.role === "user" &&
  Array.isArray(message.parts) &&
  message.parts.some((part) => part?.functionResponse);

const trimMessagesSafely = (messages, limit = MESSAGE_MEMORY) => {
  if (!Array.isArray(messages) || messages.length <= limit) return messages || [];
  let start = messages.length - limit;
  while (
    start > 0 &&
    isFunctionResponseTurn(messages[start]) &&
    isFunctionCallTurn(messages[start - 1])
  ) {
    start--;
  }
  return messages.slice(start);
};

const convertOpenAIToGeminiMessages = (messages = []) => {
  const callIdToFunctionName = {};
  for (const message of messages) {
    if (message?.role !== "assistant" || !Array.isArray(message.tool_calls)) continue;
    for (const call of message.tool_calls) {
      if (!call?.id || call.type !== "function" || !call.function?.name) continue;
      callIdToFunctionName[call.id] = call.function.name;
    }
  }

  return messages
    .map((message) => {
      if (!message || typeof message !== "object") return null;

      if (message.role === "assistant") {
        const parts = [];
        const text = extractTextContent(message.content);
        if (text !== "") parts.push({ text });
        if (Array.isArray(message.tool_calls)) {
          for (const call of message.tool_calls) {
            if (call?.type !== "function" || !call.function?.name) continue;
            parts.push({
              functionCall: {
                name: call.function.name,
                args: parseJsonObject(call.function.arguments, {}),
              },
            });
          }
        }
        if (!parts[0]) return null;
        return { role: "model", parts };
      }

      if (message.role === "tool") {
        const functionName =
          message.name || callIdToFunctionName[message.tool_call_id] || "tool";
        const output = extractTextContent(message.content);
        return {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: functionName,
                response: { output },
              },
            },
          ],
        };
      }

      const text = extractTextContent(message.content);
      if (text === "") return null;
      return {
        role: "user",
        parts: [{ text }],
      };
    })
    .filter((message) => message && Array.isArray(message.parts) && message.parts[0]);
};

module.exports = (app) => {
  var allowedKeys = [];
  (async () => {
    allowedKeys = await db.getObjectDefault("/keys", []);
  })();
  app.use(express.json());
  const checkApiKey = (req, res, next) => {
    const apiKey = req.headers["authorization"];
    if (apiKey && apiKey.startsWith("Bearer ")) {
      if (!allowedKeys.includes(apiKey.replace("Bearer ", "")))
        return res.status(401).json({ error: "Unauthorized" });

      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };
  app.post("/api/oai/v1/chat/completions", checkApiKey, async (req, res) => {
    const { messages, model = "cow", stream } = req.body;
    const pushId = crypto.randomUUID();
    const id = `chatcmpl-${crypto.randomBytes(4).toString("hex")}`;
    const created = Math.floor(Date.now() / 1000);
    const convertedMessages = trimMessagesSafely(
      convertOpenAIToGeminiMessages(messages),
      MESSAGE_MEMORY
    );
    await savedMsg.push(
      `/openai:${pushId}`,
      convertedMessages
    );
    const ws = new WebSocket(
      `ws://192.168.0.5:38943/api/generate?key=${req.headers[
        "authorization"
      ].replace(
        "Bearer ",
        ""
      )}&streamingResponse&_readSavedMessages=openai:${pushId}`
    );

    if (!stream) {
      ws.on("message", (data) => {
        const parsed = JSON.parse(data);
        if (parsed.type === "welcome") {
          ws.send("");
        }
        if (parsed.type === "end") {
          res.json({
            id,
            object: "chat.completion",
            created,
            model: model,
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: parsed.full,
                },
                finish_reason: "stop",
              },
            ],
          });
          ws.close();
        }
      });
    } else {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      var index = 0;
      ws.on("message", (data) => {
        const parsed = JSON.parse(data);
        if (parsed.type === "welcome") {
          ws.send("");
        }
        if (parsed.type === "part") {
          res.write(
            `data: ${JSON.stringify({
              id,
              object: "chat.completion.chunk",
              created,
              model,
              choices: [
                {
                  index,
                  delta: { content: parsed.message },
                  logprobs: null,
                  finish_reason: null,
                },
              ],
            })}\n\n`
          );
          index++;
        }
        if (parsed.type === "end") {
          res.write("data: [DONE]\n\n");
          res.end();
          ws.close();
        }
      });
    }
  });

  app.get("/api/oai/v1/models", (req, res) => {
    res.json({
      object: "list",
      data: models,
    });
  });
  app.get("/api/oai/v1/models/:id", (req, res) => {
    res.json(models.filter((model) => model.id === req.params.id)[0]);
  });
  return app;
};
