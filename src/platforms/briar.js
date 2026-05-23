require("dotenv").config({ quiet: true });
const { JsonDB, Config } = require("node-json-db");
var savedMsg = new JsonDB(new Config("savedMessages", true, true));
const { WebSocket } = require("ws");
const os = require("os");
const fetch = require("node-fetch");
var briarLink = "";
var contacts = [];

async function httpRequestJson(method, path, body = null) {
  const host = process.env.BRIAR_API_HOST;
  const token = process.env.BRIAR_AUTH_TOKEN;
  if (!host) {
    console.warn("[Briar] BRIAR_API_HOST not set");
    return null;
  }
  const useTls = process.env.BRIAR_USE_TLS === "true" || /^https?:/.test(host);
  const normalizedHost = host
    .replace(/^https?:\/\//, "")
    .replace(/^wss?:\/\//, "");
  const protocol = useTls ? "https" : "http";
  const url = `${protocol}://${normalizedHost}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    let bodyData = undefined;
    if (body != null) {
      headers["Content-Type"] = "application/json";
      bodyData = JSON.stringify(body);
    }
    const res = await fetch(url, {
      method: method || "GET",
      headers,
      body: bodyData,
    });
    if (!res.ok) {
      const respBody = await res.text().catch(() => "");
      console.warn(
        `[Briar] httpRequestJson ${method} ${path} failed: ${res.status} ${res.statusText} ${respBody}`,
      );
      return null;
    }
    const json = await res.json().catch(() => null);
    return json;
  } catch (err) {
    console.warn(
      "[Briar] httpRequestJson error",
      err && err.message ? err.message : err,
    );
    return null;
  }
}

let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30_000;

function scheduleReconnect() {
  const delay = Math.min(
    MAX_RECONNECT_DELAY,
    1000 * Math.pow(2, reconnectAttempts),
  );
  reconnectAttempts += 1;
  console.warn(
    `[Briar] WS reconnecting in ${delay}ms (attempt ${reconnectAttempts})`,
  );
  setTimeout(() => createWs(), delay);
}

function createWs() {
  const host = process.env.BRIAR_API_HOST;
  const token = process.env.BRIAR_AUTH_TOKEN;

  const useTls = process.env.BRIAR_USE_TLS === "true" || /^https?:/.test(host);
  const normalizedHost = host
    .replace(/^https?:\/\//, "")
    .replace(/^wss?:\/\//, "");
  const protocol = useTls ? "wss" : "ws";
  const url = `${protocol}://${normalizedHost}/v1/ws`;

  const headers = {};

  try {
    const ws = new WebSocket(url, { headers });
    globalThis.botWs = ws;

    ws.on("open", () => {
      reconnectAttempts = 0;

      try {
        ws.send(token);
        // Fetch and display the contact link once for this connection (inline, no exported/one-time function)
        (async () => {
          try {
            const host = process.env.BRIAR_API_HOST;
            if (!host) {
              console.warn(
                "[Briar] BRIAR_API_HOST not set; skipping contact link fetch",
              );
              return;
            }
            const useTls =
              process.env.BRIAR_USE_TLS === "true" || /^https?:/.test(host);
            const normalizedHost = host
              .replace(/^https?:\/\//, "")
              .replace(/^wss?:\/\//, "");
            const protocol = useTls ? "https" : "http";
            const url = `${protocol}://${normalizedHost}/v1/contacts/add/link`;

            const json = await httpRequestJson("GET", "/v1/contacts/add/link");
            if (json && json.link) {
              console.log(`[Briar] Bot ready ${json.link}`);
              globalThis.briarLink = json.link;
            } else {
              console.warn(
                "[Briar] /v1/contacts/add/link returned invalid JSON or failed",
              );
            }
          } catch (err) {
            console.warn(
              "[Briar] Error fetching contact link",
              err && err.message ? err.message : err,
            );
          }
        })();
      } catch (e) {
        console.error("[Briar] Failed to send auth token on open", e);
      }
    });

    ws.on("error", (err) => {
      console.error("[Briar] WS error", err && err.message ? err.message : err);
    });

    ws.on("close", (code, reason) => {
      console.warn(`[Briar] WS closed (code=${code})`);
      scheduleReconnect();
    });

    ws.on("message", async (_data) => {
      // TBD: Bot Logic
      const data = JSON.parse(_data);
      if (data.name != "ConversationMessageReceivedEvent") return;
      await httpRequestJson(
        "POST",
        `/v1/contacts/${data.data.contactId}/read`,
        { messageId: data.data.id },
      );
      if (/^briar:\/\/(?:[a-z2-7]{53})$/gm.exec(data.data.text)) {
        try {
          await httpRequestJson("POST", "/v1/contacts/add/pending", {
            link: data.data.text,
            alias: data.data.text.substr(-53),
          });
          await httpRequestJson("POST", `/v1/messages/${data.data.contactId}`, {
            text: `哞！我的 Briar 連結是: ${briarLink}`,
          });
        } catch (e) {}
        return;
      }
      contacts = [...(await httpRequestJson("GET", "/v1/contacts"))];
      var username =
        (contacts.filter((a) => a.contactId == data.data.contactId) || [])[0]
          ?.author?.name || "";
      var messages = await Promise.all(
        (await httpRequestJson("GET", `/v1/messages/${data.data.contactId}`))
          .filter(
            (a) =>
              a.type == "PrivateMessage" &&
              !a.text.startsWith("briar://") &&
              !a.text.startsWith("哞！我的 Briar 連結是: "),
          )
          .map((a) => {
            const isModel = !!a.local;
            return {
              role: isModel ? "model" : "user",
              parts: [
                {
                  text: `${!isModel && username ? `${username}說: ` : ""}${a.content.text.body}`,
                },
              ],
            };
          })
          .slice(-5),
      );
      await savedMsg.push(`/briar:${message.id}`, pulledMessages);
      const cowws = new WebSocket(
        `ws://localhost:38943/api/generate?key=${process.env.ADMIN_KEY}&_readSavedMessages=briar:${message.id}`,
      );
      cowws.on("message", async (cowdata) => {
        const parsed = JSON.parse(cowdata);
        if (parsed.type == "welcome") {
          cowws.send("");
        }
        if (parsed.type == "end") {
          await httpRequestJson("POST", `/v1/messages/${data.data.contactId}`, {
            text: parsed.full,
          });
          cowws.close();
        }
        if (parsed.type == "error") {
          await httpRequestJson("POST", `/v1/messages/${data.data.contactId}`, {
            text: parsed.message,
          });
          cowws.close();
        }
      });
    });
  } catch (err) {
    console.error("[Briar] Failed to create Briar WebSocket", err);
    scheduleReconnect();
  }
}

createWs();
