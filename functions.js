require("dotenv").config();
const jokes = require("./jokes");
const fetch = require("node-fetch");
const xml = require("xml-js");
const TaiwanEarthquake = require("./taiwanearthquake");
const moment = require("moment-timezone");
const fs = require("fs");
const download = require("download");
const weather = require("weather-js");
const yts = require("yt-search");
const { JSDOM } = require("jsdom");
const qr = require("qrcode");
const crypto = require("crypto");
const FormData = require("form-data");
const { Readable } = require("stream");
const parseDecimalNCR = (str) => {
  return str.replace(/&#(\d+);/g, (_match, dec) => {
    return String.fromCharCode(dec);
  });
};
const google = async (query) => {
  var fetched = (await (
    await fetch(
      `https://customsearch.googleapis.com/customsearch/v1?cx=${
        process.env.PSE_ID
      }&q=${encodeURIComponent(query)}&num=10&key=${process.env.PSE_KEY}`
    )
  ).json()) || { items: [] };
  fetched = (fetched.items || []).map((a) => {
    const snippet = a.pagemap
      ? !a.pagemap.metatags[0]
        ? a.snippet
        : parseDecimalNCR(a.pagemap.metatags[0]["og:description"] || "")
      : a.snippet;
    return { title: a.title, link: a.link, snippet };
  });
  return fetched;
};

const Time = () => {
  return {
    name: "Time",
    response: { content: moment().format("yyyy年MM月DD日 HH:mm:ss") },
  };
};
const MCJavaServer = async (args) => {
  const ip = Object.values(args)[0];
  const response = await fetch(`https://api.mcsrvstat.us/3/${ip}`);
  var body = await response.json();
  if (body.icon) delete body.icon;
  return {
    name: "MCJavaServer",
    response: { content: body },
  };
};
const MCBedrockServer = async (args) => {
  const ip = Object.values(args)[0];
  const response = await fetch(
    `https://api.mcstatus.io/v2/status/bedrock/${ip}`
  );
  const body = await response.json();
  return {
    name: "MCBedrockServer",
    response: { content: body },
  };
};
const Joke = () => {
  return {
    name: "Joke",
    response: { content: jokes[Math.floor(Math.random() * jokes.length)] },
  };
};
const GoogleSearch = async (args) => {
  const results = await google(args.query);
  return {
    name: "GoogleSearch",
    response: {
      results,
    },
  };
};
const Browser = async (args) => {
  const response = await fetch(`https://r.jina.ai/${args.url}`);
  const body = await response.text();
  return {
    name: "Browser",
    response: { content: body },
  };
};
const Invoice = async () => {
  const response = await fetch("https://invoice.etax.nat.gov.tw/invoice.xml");
  const body = await response.text();
  const resu = xml.xml2js(body, {
    ignoreComment: true,
    alwaysChildren: true,
  });
  const title =
    resu.elements[0].elements[0].elements[4].elements[0].elements[0].cdata;
  const content =
    resu.elements[0].elements[0].elements[4].elements[3].elements[0].cdata.split(
      "</p><p>"
    );
  content[0] = content[0].split("<p>")[1];
  content[content.length - 1] = content[content.length - 1].split("</p>")[0];
  return {
    name: "Invoice",
    response: { month: title, numbers: content },
  };
};

const GenerateImage = async (args) => {
  const prompt = args.prompt || args.image || args.description;
  if (!prompt)
    return {
      name: "GenerateImage",
      response: {
        error:
          'No prompt specified. Make sure to put your prompt in the "prompt" property.',
      },
    };
  const Client = (await import("@gradio/client")).Client;
  const client = await Client.connect(
    "https://black-forest-labs-flux-1-schnell.hf.space",
    {
      hf_token: process.env.HF_ACCESS_TOKEN,
    }
  );
  const seed = args.seed
    ? typeof args.seed == "number"
      ? args.seed
      : parseInt(args.seed)
    : 0;
  const width = args.width
    ? typeof args.width == "number"
      ? args.width
      : parseInt(args.width)
    : 1024;
  const height = args.height
    ? typeof args.height == "number"
      ? args.height
      : parseInt(args.height)
    : 1024;
  const result = (
    await client.predict("/infer", {
      prompt,
      seed,
      randomize_seed: !args.seed ? true : false,
      width,
      height,
    })
  ).data;
  const id = result[0].path.split("/tmp/gradio/")[1].split("/")[0];
  fs.writeFileSync(`images/${id}.webp`, await download(result[0].url));
  return {
    name: "GenerateImage",
    response: {
      url: `https://cowai.cowgl.xyz/api/images/${id}.webp`,
      seed: result[1],
    },
  };
};
const GetWeather = async (args) => {
  return new Promise(async (resolve, reject) => {
    const query = args.query || args.location;
    if (!query)
      return resolve({
        name: "GetWeather",
        response: {
          error: "No query provided",
        },
      });
    weather.find({ search: query, degreeType: "C" }, function (err, result) {
      if (err)
        return resolve({
          name: "GetWeather",
          response: {
            error: err.stack,
          },
        });
      var result = [...result][0];
      if (result.location.imagerelativeurl)
        delete result.location.imagerelativeurl;
      if (result.current.imageUrl) delete result.current.imageUrl;
      if (result.current.date && result.current.observationtime) {
        const converted = moment.tz(
          `${result.current.date}T${result.current.observationtime}+00:00`,
          "Asia/Taipei"
        );
        result.current.date = converted.format("yyyy-MM-DD");
        result.current.observationtime = converted.format("HH:mm:ss");
        result.location.timezone = "+8";
      }
      resolve({
        name: "GetWeather",
        response: result,
      });
    });
  });
};
const SearchRepository = async (args) => {
  const query = args.query || args.q;
  if (!query)
    return {
      name: "SearchRepository",
      response: {
        error:
          'No query specified. Make sure to put your query in the "query" property.',
      },
    };
  const { Octokit } = await import("@octokit/rest");
  const octokit = new Octokit();
  const { data } = await octokit.rest.search.repos({ q: query });
  return {
    name: "SearchRepository",
    response: {
      result: data,
    },
  };
};
const SearchVideo = async (args) => {
  const query = args.query || args.q;
  if (!query)
    return resolve({
      name: "SearchVideo",
      response: {
        error:
          'No query specified. Make sure to put your query in the "query" property.',
      },
    });
  const videos = (await yts(query)).videos;
  return {
    name: "SearchVideo",
    response: {
      result: videos,
    },
  };
};
const SearchMinecraftWiki = async (args) => {
  const results = await google(`${args.query} site:minecraft.wiki`);
  return {
    name: "SearchMinecraftWiki",
    response: {
      results,
    },
  };
};
const StopWorkSchoolChecker = async (args) => {
  const page = await (
    await fetch("https://www.dgpa.gov.tw/typh/daily/nds.html")
  ).text();
  const dom = new JSDOM(page);
  const document = dom.window.document;
  const response = [...document.querySelectorAll("td")]
    .filter((a) =>
      a.attributes.headers
        ? a.attributes.headers.value.includes("city_Name")
        : false
    )
    .map((a) => {
      return [
        a.children[0].innerHTML.trim(),
        (a.parentElement.children[2] || a.parentElement.children[1]).innerHTML
          .replaceAll(/\<[\x00-\x7F]+\>/gm, "")
          .trim()
          .replaceAll("  ", "\n"),
      ];
    })
    .reduce((a, b, c) => {
      a[b[0]] = b[1];
      return a;
    }, {});
  return {
    name: "StopWorkSchoolChecker",
    response,
  };
};
const GenerateQR = async (args) => {
  const content = String(args.content || "") || "";
  const url = await qr.toDataURL(content, {
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    width: 512,
    options: {
      type: "image/webp",
    },
  });
  const buffer = new Buffer.from(url.split(",")[1], "base64");
  const id = crypto.randomBytes(20).toString("hex");
  fs.writeFileSync(`images/qr/${id}.webp`, buffer);
  return {
    name: "GenerateQR",
    response: {
      url: `https://cowai.cowgl.xyz/api/images/qr/${id}.webp`,
    },
  };
};

const ScanQR = async (message) => {
  const filtered = message.parts.filter((a) => {
    if (!a.inlineData) return false;
    return a.inlineData.mimeType.startsWith("image/");
  });
  if (!filtered[0])
    return {
      name: "ScanQR",
      response: {
        error: "No images found in the message.",
      },
    };
  const data = filtered[0].inlineData.data.startsWith("http")
    ? await download(filtered[0].inlineData.data)
    : filtered[0].inlineData.data.startsWith("data")
    ? Buffer.from(filtered[0].inlineData.data, "base64")
    : Buffer.from(filtered[0].inlineData.data, "base64url");
  const createFormData = () => {
    const formData = new FormData();
    formData.append("file", Readable.from(data), {
      filename: "image." + filtered[0].inlineData.mimeType.split("/")[1],
      contentType: filtered[0].inlineData.mimeType,
    });
    return formData;
  };
  const uploadQR = async (
    url = "https://api.qrserver.com/v1/read-qr-code",
    redirectCount = 0
  ) => {
    if (redirectCount > 5) {
      throw new Error("Too many redirects");
    }
    const formData = createFormData();
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      redirect: "manual",
    });
    if (response.status >= 300 && response.status < 400) {
      const newLocation = response.headers.get("location");
      if (!newLocation) {
        throw new Error("Redirect location is missing");
      }
      return await uploadQR(newLocation, redirectCount + 1);
    } else if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`Error ${response.status}`);
    }
  };
  try {
    const result = await uploadQR();
    return { name: "ScanQR", response: { result } };
  } catch (error) {
    return { name: "ScanQR", response: { error: error.message } };
  }
};

const available_functions = {
  Time,
  MCJavaServer,
  MCBedrockServer,
  Joke,
  GoogleSearch,
  Browser,
  Invoice,
  LatestEarthquake: TaiwanEarthquake.latest,
  LatestMajorEarthquake: TaiwanEarthquake.major,
  LatestLocalEarthquake: TaiwanEarthquake.local,
  GetEarthquakeByID: TaiwanEarthquake.id,
  GenerateImage,
  GetWeather,
  SearchRepository,
  SearchVideo,
  SearchMinecraftWiki,
  StopWorkSchoolChecker,
  GenerateQR,

  ScanQR,
};
module.exports = available_functions;
