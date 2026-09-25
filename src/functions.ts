import dotenv from "dotenv";
import jokes from "./utils/jokes";
import fetch from "node-fetch";
import xml from "xml-js";
import TaiwanEarthquake from "./utils/taiwanearthquake";
import moment from "moment-timezone";
import fs from "node:fs";
import download from "download";
import weather from "weather-js";
import yts from "yt-search";
import { JSDOM } from "jsdom";
import qr from "qrcode";
import crypto from "node:crypto";

dotenv.config({ quiet: true });
type FunctionArgs = Record<string, unknown> & {
  query?: string; q?: string; location?: string; prompt?: string;
  image?: string; description?: string; seed?: number | string;
  width?: number | string; height?: number | string; content?: string; id?: string;
};
const parseDecimalNCR = (str: string): string => {
  return str.replace(/&#(\d+);/g, (_match: string, dec: string) => {
    return String.fromCharCode(Number(dec));
  });
};
type GoogleItem = {
  title?: string;
  link?: string;
  snippet?: string;
  pagemap?: { metatags?: Array<Record<string, string>> };
};
type WeatherResult = {
  location: Record<string, string>;
  current: Record<string, string>;
};

const google = async (query: string): Promise<GoogleItem[]> => {
  var fetched = (await (
    await fetch(
      `https://customsearch.googleapis.com/customsearch/v1?cx=${
        process.env.PSE_ID
      }&q=${encodeURIComponent(query)}&num=10&key=${process.env.PSE_KEY}`
    )
  ).json()) || { items: [] };
  fetched = (fetched.items || []).map((a: GoogleItem) => {
    const snippet = a.pagemap
      ? !(a.pagemap.metatags || [])[0]
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
const MCJavaServer = async (args: FunctionArgs) => {
  const ip = Object.values(args)[0];
  const response = await fetch(`https://api.mcsrvstat.us/3/${ip}`);
  var body = await response.json();
  if (body.icon) delete body.icon;
  return {
    name: "MCJavaServer",
    response: { content: body },
  };
};
const MCBedrockServer = async (args: FunctionArgs) => {
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
const GoogleSearch = async (args: FunctionArgs) => {
  const results = await google(args.query);
  return {
    name: "GoogleSearch",
    response: {
      results,
    },
  };
};
const Browser = async (args: FunctionArgs) => {
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

const GenerateImage = async (args: FunctionArgs) => {
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
      : parseInt(String(args.seed), 10)
    : 0;
  const width = args.width
    ? typeof args.width == "number"
      ? args.width
      : parseInt(String(args.width), 10)
    : 1024;
  const height = args.height
    ? typeof args.height == "number"
      ? args.height
      : parseInt(String(args.height), 10)
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
      url: `https://${process.env.API_DOMAIN}/api/images/${id}.webp`,
      seed: result[1],
    },
  };
};
const GetWeather = async (args: FunctionArgs) => {
  return new Promise(async (resolve, reject) => {
    const query = args.query || args.location;
    if (!query)
      return resolve({
        name: "GetWeather",
        response: {
          error: "No query provided",
        },
      });
    weather.find({ search: query, degreeType: "C" }, function (err: unknown, result: unknown) {
      const weatherError = err instanceof Error ? err : null;
      if (err)
        return resolve({
          name: "GetWeather",
          response: {
            error: weatherError?.stack || String(err),
          },
        });
      const weatherResults = result as WeatherResult[];
      const weatherResult = weatherResults[0];
      if (weatherResult.location.imagerelativeurl)
        delete weatherResult.location.imagerelativeurl;
      if (weatherResult.current.imageUrl) delete weatherResult.current.imageUrl;
      if (weatherResult.current.date && weatherResult.current.observationtime) {
        const converted = moment.tz(
          `${weatherResult.current.date}T${weatherResult.current.observationtime}+00:00`,
          "Asia/Taipei"
        );
        weatherResult.current.date = converted.format("yyyy-MM-DD");
        weatherResult.current.observationtime = converted.format("HH:mm:ss");
        weatherResult.location.timezone = "+8";
      }
      resolve({
        name: "GetWeather",
        response: weatherResult,
      });
    });
  });
};
const SearchRepository = async (args: FunctionArgs) => {
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
const SearchVideo = async (args: FunctionArgs) => {
  const query = args.query || args.q;
  if (!query)
    return {
      name: "SearchVideo",
      response: {
        error:
          'No query specified. Make sure to put your query in the "query" property.',
      },
    };
  const videos = (await yts(query)).videos;
  return {
    name: "SearchVideo",
    response: {
      result: videos,
    },
  };
};
const SearchMinecraftWiki = async (args: FunctionArgs) => {
  const results = await google(`${args.query} site:minecraft.wiki`);
  return {
    name: "SearchMinecraftWiki",
    response: {
      results,
    },
  };
};
const StopWorkSchoolChecker = async (_args: FunctionArgs) => {
  const page = await (
    await fetch("https://www.dgpa.gov.tw/typh/daily/nds.html")
  ).text();
  const dom = new JSDOM(page);
  const document = dom.window.document;
  const response = [...document.querySelectorAll("td")]
    .filter((a) => {
      const headers = a.attributes.getNamedItem("headers");
      return headers
        ? headers.value.includes("city_Name")
        : false
    })
    .map((a) => {
      return [
        a.children[0].innerHTML.trim(),
        (a.parentElement.children[2] || a.parentElement.children[1]).innerHTML
          .replaceAll(/\<[\x00-\x7F]+\>/gm, "")
          .trim()
          .replaceAll("  ", "\n"),
      ];
    })
    .reduce<Record<string, string>>((a: Record<string, string>, b: unknown[]) => {
      const key = String(b[0]);
      a[key] = String(b[1]);
      return a;
    }, {});
  return {
    name: "StopWorkSchoolChecker",
    response,
  };
};
const GenerateQR = async (args: FunctionArgs) => {
  const content = String(args.content || "") || "";
  const url = await qr.toDataURL(content, {
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    width: 512,
    type: "image/webp",
  });
  const buffer = Buffer.from(url.split(",")[1], "base64");
  const id = crypto.randomBytes(20).toString("hex");
  fs.writeFileSync(`images/qr/${id}.webp`, buffer);
  return {
    name: "GenerateQR",
    response: {
      url: `https://${process.env.API_DOMAIN}/api/images/qr/${id}.webp`,
    },
  };
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
};
export default available_functions;
