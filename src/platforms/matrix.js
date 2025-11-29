const { JsonDB, Config } = require("node-json-db");
var savedMsg = new JsonDB(new Config("savedMessages", true, true));
const { WebSocket } = require("ws");
const supportedMime = require("./../utils/cow").supportedMime;

function isMentioningMe(event) {
  if (event.getType() !== "m.room.message") {
    return false;
  }
  if (event.getSender() === process.env.MATRIX_USER_ID) {
    return false;
  }
  const pushAction = event.getPushAction();
  if (pushAction && pushAction.notify) {
    return true;
  }
  const messageBody = event.getContent().body;
  if (messageBody && messageBody.includes(process.env.MATRIX_USER_ID)) {
    return true;
  }
  return false;
}

(async () => {
  const sdk = await import("matrix-js-sdk");
  const client = sdk.createClient({
    baseUrl: process.env.MATRIX_BASE_URL,
    accessToken: process.env.MATRIX_ACCESS_TOKEN,
    userId: process.env.MATRIX_USER_ID,
  });
  client.startClient();
  client.on("sync", async function (state, prevState, res) {
    if (state === "PREPARED") {
      console.log("[Matrix] Bot ready", client.getUserId());
    } else if (state === "ERROR") {
      console.error("[Matrix] Matrix client sync error:", res);
    }
  });
  client.on(RoomEvent.MyMembership, (room, membership, _prevMembership) => {
    if (membership === sdk.KnownMembership.Invite) {
      client.joinRoom(room.roomId).then(function () {
        console.log("[Matrix] Auto-joined %s", room.roomId);
      });
    }
  });

  client.on(sdk.RoomEvent.Timeline, async (event, room, toStartOfTimeline) => {
    if (toStartOfTimeline) return;
    if (event.getType() !== "m.room.message") return;
    if (event.getSender() === process.env.MATRIX_USER_ID) return;
    if (!isMentioningMe(event)) return;
    var messages = [event];

    try {
      const scrollbackResult = await client.scrollback(room, 30);
      const timelineEvents = scrollbackResult.getLiveTimeline().getEvents();
      messages = timelineEvents.filter(
        (event) => event.getType() === "m.room.message"
      );
      console.log("Previous messages:", messages);
    } catch (e) {}

    messages
      .map(async (a) => {
        const sender = a.getSender();
        const role = sender == process.env.MATRIX_USER_ID ? "model" : "user";
        var parts = [];
        var unknown = false;
        const content = event.getContent();
        let senderDisplayName = sender;
        try {
          const member = room.getMember(sender);
          if (member && member.name) {
            senderDisplayName = member.name;
          }
        } catch (e) {}
        switchType: switch (a.type) {
          case "m.text":
            parts.push({ text: `${senderDisplayName}說: ${content.body}` });
            break;
          case "m.image":
            const imageUrl = content.url;
            if (!imageUrl) {
              unknown = true;
              break switchType;
            }
            parts.push({ text: `${senderDisplayName}傳送了一個檔案` });
            const downloadUrl = client.mxcUrlToHttp(imageUrl);
            const response = await fetch(downloadUrl, {
              headers: {
                Authorization: `Bearer ${client.getAccessToken()}`,
              },
            });
            const arrayBuffer = await response.arrayBuffer();
            const data = Buffer.from(arrayBuffer).toString("base64");
            var mime = response.headers.get("content-type");
            if (!mime) {
              unknown = true;
              break switchType;
            }
            if (supportedMime.indexOf(mime) == -1) {
              unknown = true;
              break switchType;
            }
            const imageBuffer = await downloadFromMatrix(imageUrl);
            if (imageBuffer) {
              parts.push({
                inlineData: {
                  mimeType: mime,
                  data,
                },
              });
            } else {
              unknown = true;
              break switchType;
            }
            break;
          default:
            unknown = true;
            break;
        }
        if (!unknown) {
          return { role, parts };
        } else {
          return null;
        }
      })
      .filter((a) => !a);
    await savedMsg.push(`/matrix:${room}`, messages.slice(-5));
    const ws = new WebSocket(
      `ws://localhost:38943/api/generate?key=${process.env.ADMIN_KEY}&_readSavedMessages=matrix:${room}`
    );
    var wsTimeout;
    ws.on("message", async (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type == "welcome") {
        ws.send("");
        wsTimeout = setTimeout(async () => {
          try {
            await savedMsg.delete(`/matrix:${room}`);
          } catch (e) {}
          ws.close();
        }, 60000);
      }
      if (parsed.type == "error") {
        await client.sendEvent(room, "m.room.message", {
          msgtype: "m.text",
          body: parsed.message,
          "m.relates_to": {
            "m.in_reply_to": {
              event_id: event.event.event_id,
            },
          },
        });
        clearTimeout(wsTimeout);
        ws.close();
      }
      if (parsed.type == "response") {
        await client.sendEvent(room, "m.room.message", {
          msgtype: "m.text",
          body: parsed.message,
          "m.relates_to": {
            "m.in_reply_to": {
              event_id: event.event.event_id,
            },
          },
        });
        try {
          await savedMsg.delete(`/matrix:${room}`);
        } catch (e) {}
      }
    });
  });
})();
