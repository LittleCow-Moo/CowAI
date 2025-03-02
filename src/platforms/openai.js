const crypto = require("crypto");
const { JsonDB, Config } = require("node-json-db");
const { WebSocket } = require("ws");
const app = express();
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
    await savedMsg.push(
      `/openai:${pushId}`,
      messages
        .map((a) => {
          return {
            role: a.role == "user" ? "user" : "model",
            parts: [{ text: a.content }],
          };
        })
        .slice(-5)
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
      let fullResponse = "";
      ws.on("message", (data) => {
        const parsed = JSON.parse(data);
        if (parsed.type === "welcome") {
          ws.send("");
        }
        if (parsed.type === "response") {
          fullResponse += parsed.message;
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
                  content: fullResponse,
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
