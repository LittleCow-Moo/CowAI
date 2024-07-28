require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cow = require("./cow");
const { WebSocketServer } = require("ws");
const { createServer } = require("http");
const u = require("url");
const express = require("express");
const { JsonDB, Config } = require("node-json-db");
const moment = require("moment");
const fs = require("fs");
const path = require("path");

var db = new JsonDB(new Config("rateLimit", true, true));
var savedMsg = new JsonDB(new Config("savedMessages", true, true));
if (!fs.existsSync("images/")) fs.mkdirSync("images")
db.push(`/max/${process.env.ADMIN_KEY}`,"infinity")

const genAI = new GoogleGenerativeAI(process.env.KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: cow.prompt,
  generationConfig: cow.config,
  tools: cow.tools,
});

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
    (async () => {
      if (prompt != "") {
        console.log(`[User] ${prompt}`);
        ws.asked.push(prompt);
        ws.messages.push({
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        });
      } else {
        console.log("[User] (empty prompt)");
      }
      const result = await model.generateContentStream({
        contents: ws.messages.slice(-1 * memory),
      });
      var calls = [];
      var message = "";
      process.stdout.write("[Cow] ");
      for await (const item of result.stream) {
        if (!item.candidates) break;
        if (!item.candidates[0].content) break;
        const part = item.candidates[0].content.parts[0];
        if (!part) break;
        if (part.functionCall) calls.push(part.functionCall);
        if (!part.text) break;
        process.stdout.write(part.text.trim());
        streaming
          ? ws.send(JSON.stringify({ type: "part", message: part.text.trim() }))
          : null;
        message += part.text.trim();
      }
      ws.messages.push({
        role: "model",
        parts: [
          {
            text: message,
          },
        ],
      });
      ws.send(JSON.stringify({ type: "response", message }));
      if (calls[0]) {
        for (const call of calls) {
          console.log();
          debug ? console.log(`[System] Function call received:`, call) : null;
          ws.send(
            JSON.stringify({
              type: "function",
              call,
              message: "Function call received.",
            })
          );
          const functionResponse = await cow.functions[call.name](call.args);
          debug
            ? console.log(
                `[System] ${call.name} result:`,
                functionResponse.response
              )
            : null;

          ws.send(
            JSON.stringify({
              type: "functionResponse",
              functionResponse,
            })
          );
          ws.messages.push({
            role: "function",
            parts: [{ functionResponse }],
          });
        }
        if (
          true &&
          ws.messages[ws.messages.length - 1].role == "function" &&
          ws.messages[ws.messages.length - 1].parts[0].functionResponse.name ==
            "Joke"
        ) {
          var content = `哞! ${
            ws.messages[ws.messages.length - 1].parts[0].functionResponse
              .response.content
          }`;

          ws.send(
            JSON.stringify({
              type: "part",
              message: content,
            })
          );
          ws.send(
            JSON.stringify({
              type: "response",
              message: content,
            })
          );
          ws.messages[ws.messages.length - 1] = {
            role: "model",
            parts: [
              {
                text: content,
              },
            ],
          };
          ws.send(JSON.stringify({ type: "end", message: "All done!" }));
          return console.log(`[Cow] ${content}`);
        }
        const result = await model.generateContentStream({
          contents: ws.messages.slice(-1 * memory),
        });
        process.stdout.write("[Cow] ");
        for await (const item of result.stream) {
          process.stdout.write(item.candidates[0].content.parts[0].text.trim());
          streaming
            ? ws.send(
                JSON.stringify({
                  type: "part",
                  message: item.candidates[0].content.parts[0].text.trim(),
                })
              )
            : null;
        }
        const response = await result.response;
        ws.messages.push({
          role: "model",
          parts: [
            {
              text: response.text().trim(),
            },
          ],
        });
        ws.send(
          JSON.stringify({ type: "response", message: response.text().trim() })
        );
      }
      console.log();
      console.log("[System] This is the end of the chat.");
      ws.send(JSON.stringify({ type: "end", message: "All done!" }));
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
  wss.handleUpgrade(request, socket, head, async (ws) => {
    ws.streamingResponse = !!query.streamingResponse;
    ws.key = query.key;
    ws.messages = query.messages
      ? JSON.parse(decodeURIComponent(query.messages))
      : [];
    if (query._readSavedMessages) {
      await savedMsg.reload();
      ws.messages = await savedMsg.getObject(`/${query._readSavedMessages}`);
    }
    ws.asked = [];
    wss.emit("connection", ws);
  });
});

server.listen(38943);

process.on("uncaughtException", (e) => {
  console.error("[System] Error occurred:", e);
});

const dbCleanup = async () => {
  const dbDate = await db.getData("/date");
  const nowDate = moment().format("yyyy-MM-DD");
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
