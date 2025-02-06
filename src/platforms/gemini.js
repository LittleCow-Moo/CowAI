require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cow = require("./../utils/cow");
const { WebSocketServer } = require("ws");
const { createServer } = require("http");
const u = require("url");
const express = require("express");
const { JsonDB, Config } = require("node-json-db");
const moment = require("moment");
const fs = require("fs");

var db = new JsonDB(new Config("rateLimit", true, true));
var savedMsg = new JsonDB(new Config("savedMessages", true, true));
if (!fs.existsSync("images/")) fs.mkdirSync("images");
db.push(`/max/${process.env.ADMIN_KEY}`, "infinity");

const requestOptions =
  process.env.ENABLE_AI_GATEWAY == "true"
    ? {
        baseUrl: `https://gateway.ai.cloudflare.com/v1/${process.env.AI_GATEWAY}/google-ai-studio`,
        customHeaders: new Headers(
          String(process.env.AI_GATEWAY_TOKEN || "") != ""
            ? {
                "cf-aig-authorization": `Bearer ${process.env.AI_GATEWAY_TOKEN}`,
              }
            : {}
        ),
      }
    : {};

const genAI = new GoogleGenerativeAI(process.env.KEY);
var models = {
  cow: () => {
    return genAI.getGenerativeModel(
      {
        model: "gemini-2.0-flash",
        systemInstruction: cow.prompt.replaceAll(
          "{time}",
          moment().format("yyyy年MM月DD日 HH:mm:ss")
        ),
        generationConfig: cow.config,
        tools: cow.tools,
        safetySettings: cow.safetySettings,
      },
      requestOptions
    );
  },
  mathcow: () => {
    return genAI.getGenerativeModel(
      {
        model: "gemini-2.0-flash-thinking-exp-01-21",
        systemInstruction: cow.mathPrompt,
        safetySettings: cow.safetySettings,
      },
      requestOptions
    );
  },
};
const enabledModels = ["cow", "mathcow"];

const debug = true;
const memory = 5;
const wss = new WebSocketServer({ noServer: true });
const app = express();
var allowedKeys = [];
(async () => {
  allowedKeys = await db.getObjectDefault("/keys", []);
})();

wss.on("connection", (ws) => {
  console.log("[System] Connection");
  const streaming = ws.streamingResponse;
  ws.send(JSON.stringify({ type: "welcome", message: "Connected." }));
  ws.on("message", async (message) => {
    const used = await db.getObjectDefault(`/used/${ws.key}`, 0);
    const max = await db.getObjectDefault(`/max/${ws.key}`, 50);
    if (used >= max) {
      return ws.send(
        JSON.stringify({
          type: "limited",
          message: "Daily message limit exceeded.",
        })
      );
    }
    await db.push(`/used/${ws.key}`, used + 1);
    var prompt = message.toString();
    ws.send(JSON.stringify({ type: "confirm", message: prompt }));
    var full = "";
    (async () => {
      if (prompt != "") {
        console.log(`[User] ${prompt}`);
        var inlineData = [];
        const attachment =
          /(https?:\/\/[a-zA-Z0-9%/.]*\.(?:png|jpeg|jpg|webp|heic|heif|wav|mp3|aiff|aac|ogg|flac|mpeg|x-wav))/im.exec(
            prompt
          );
        fetchAttachment: if (attachment && attachment[0]) {
          const response = await fetch(attachment[0]);
          const arrayBuffer = await response.arrayBuffer();
          const data = Buffer.from(arrayBuffer).toString("base64");
          var mime = response.headers.get("content-type");
          if (!mime) break fetchAttachment;
          if (cow.supportedMime.indexOf(mime) == -1) break fetchAttachment;
          if (mime == "audio/mpeg") mime = "audio/mp3";
          if (mime == "audio/x-wav") mime = "audio/wav";
          prompt = prompt.replace(attachment[0], "");
          inlineData.push({
            inlineData: {
              mimeType: mime,
              data,
            },
          });
        }
        ws.asked.push(prompt);
        ws.messages.push({
          role: "user",
          parts: [
            {
              text: prompt,
            },
            ...inlineData,
          ],
        });
      } else {
        console.log("[User] (empty prompt)");
      }
      var first = true;
      var memoryThisTurn = memory;
      var currentModel = ws.model;
      const run = async () => {
        const result = await models[currentModel]().generateContentStream({
          contents: ws.messages.slice(-1 * memoryThisTurn),
        });
        var calls = [];
        var message = "";
        process.stdout.write("[Cow] ");
        for await (const item of result.stream) {
          if (!item.candidates) continue;
          if (!item.candidates[0].content) continue;
          if (!item.candidates[0].content.parts) continue;
          const part = item.candidates[0].content.parts[0];
          if (!part) continue;
          if (part.functionCall)
            calls.push({ functionCall: part.functionCall });
          if (!part.text) continue;
          var callsFix = cow.utils.toolCallFix(part.text || "");
          if (callsFix.calls[0]) {
            for (const call of callsFix.calls) {
              calls.push({ functionCall: call });
              part.text = callsFix.replaced;
            }
          }
          process.stdout.write(part.text || "");
          message += part.text || "";
          full += part.text || "";
          streaming
            ? ws.send(
                JSON.stringify({
                  type: "part",
                  message: part.text,
                  full,
                  first,
                })
              )
            : null;
          if (first == true) first = false;
        }
        if (message != "") {
          ws.messages.push({
            role: "model",
            parts: [
              {
                text: message,
              },
              ...calls,
            ],
          });
          ws.send(JSON.stringify({ type: "response", message, full }));
        } else {
          ws.messages.push({
            role: "model",
            parts: calls,
          });
        }
        if (calls[0]) {
          memoryThisTurn++;
          var functionResponses = [];
          for (const call of calls) {
            if (!call.functionCall.name) continue;
            console.log();
            debug
              ? console.log(`[System] Function call received:`, call)
              : null;
            ws.send(
              JSON.stringify({
                type: "function",
                call,
                message: "Function call received.",
              })
            );
            var functionResponse;
            if (["ScanQR"].indexOf(call.functionCall.name) != -1) {
              functionResponse = await cow.functions[call.functionCall.name](
                ws.messages.slice(-2)[0]
              );
            } else if (["CallMathCow"].indexOf(call.functionCall.name) != -1) {
              console.log("[System] Model decided to use MathCow");
              calls = [];
              currentModel = "mathcow";
              ws.messages.pop();
              await run();
              return;
            } else {
              functionResponse = await cow.functions[call.functionCall.name](
                call.functionCall.args
              );
            }
            debug
              ? console.log(
                  `[System] ${call.functionCall.name} result:`,
                  functionResponse.response
                )
              : null;
            ws.send(
              JSON.stringify({
                type: "functionResponse",
                functionResponse,
              })
            );
            functionResponses.push({ functionResponse });
          }
          ws.messages.push({
            role: "function",
            parts: functionResponses,
          });
          calls = [];
          await run();
        }
      };
      await run();
      console.log();
      console.log("[System] This is the end of the chat.");
      ws.send(JSON.stringify({ type: "end", message: "All done!", full }));
    })().catch(async (e) => {
      console.error("[System] Error occurred:", e);
      await db.push(`/used/${ws.key}`, used);
      ws.send(JSON.stringify({ type: "error", message: e.toString() }));
    });
  });
});

wss.on("close", () => {
  console.log("[System] Disconnection");
});

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.get("/api/usage", async (req, res) => {
  if (!req.query.key)
    return res.status(401).json({
      type: "error",
      message: "Please provide a key to lookup usage info.",
    });
  if (!allowedKeys.includes(req.query.key))
    return res.status(401).json({ type: "error", message: "Key not found." });
  const used = await db.getObjectDefault(`/used/${req.query.key}`, 0);
  const max = await db.getObjectDefault(`/max/${req.query.key}`, 50);
  res.json({ type: "usage", used, max });
});

app.get("/api/waste", async (req, res) => {
  if (!req.query.key)
    return res.status(401).json({
      type: "error",
      message: "Please provide a key to waste a use.",
    });
  const used = await db.getObjectDefault(`/used/${req.query.key}`, 0);
  const max = await db.getObjectDefault(`/max/${req.query.key}`, 50);
  if (used >= max) {
    return ws.send(
      JSON.stringify({
        type: "limited",
        message: "Daily message limit exceeded.",
      })
    );
  }
  await db.push(`/used/${req.query.key}`, used + 1);
  res.json({ type: "response", message: "Successfully wasted a use." });
});

app.get("/api/images/:id.webp", (req, res) => {
  const imagePath = `images/${req.params.id}.webp`;
  if (!fs.existsSync(imagePath))
    return res.status(404).json({ type: "error", message: "Image not found." });
  res.sendFile(`${process.cwd()}/${imagePath}`);
});

app.get("/api/images/qr/:id.webp", (req, res) => {
  const imagePath = `images/qr/${req.params.id}.webp`;
  if (!fs.existsSync(imagePath))
    return res
      .status(404)
      .json({ type: "error", message: "QR Code not found." });
  res.sendFile(`${process.cwd()}/${imagePath}`);
});

const server = createServer(app);

server.on("upgrade", (request, socket, head) => {
  let url = u.parse(request.url);
  if (url.pathname != "/api/generate") {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }
  const query =
    url.query
      ?.split("&")
      ?.map((a) => {
        return a.split("=");
      })
      ?.reduce((a, v) => ({ ...a, [v[0]]: v[1] || true }), {}) || {};
  if (!query.key || !allowedKeys.includes(query.key)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  if (query.model && !enabledModels.includes(query.model)) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, async (ws) => {
    ws.streamingResponse = !!query.streamingResponse;
    ws.key = query.key;
    ws.messages = query.messages
      ? JSON.parse(decodeURIComponent(query.messages))
      : [];
    if (query._readSavedMessages) {
      await savedMsg.reload();
      ws.messages = await savedMsg.getObject(
        `/${decodeURIComponent(query._readSavedMessages)}`
      );
    }
    ws.asked = [];
    ws.model = query.model || "cow";
    wss.emit("connection", ws);
  });
});

server.listen(38943);

process.on("uncaughtException", (e) => {
  console.error("[System] Error occurred:", e);
});

const dbCleanup = async () => {
  const nowDate = moment().format("yyyy-MM-DD");
  try {
    savedMsg.reload();
    await savedMsg.delete("/");
  } catch (e) {}
  var dbDate;
  try {
    dbDate = await db.getData("/date");
  } catch (e) {
    await db.push("/date", nowDate);
  }
  if (dbDate != nowDate) {
    try {
      await db.delete("/used");
    } catch (e) {
      console.log(e);
    } finally {
      console.log("[System] Cleanup completed.");
      await db.push("/date", nowDate);
    }
  }
};

dbCleanup();
setInterval(dbCleanup, 60000);
