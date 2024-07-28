const fetch = require("node-fetch");
const moment = require("moment");

module.exports = {
  latest: async (args) => {
    return new Promise(async (resolve, reject) => {
      const request = await fetch(
        "https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0015-001?Authorization=rdec-key-123-45678-011121314&limit=1&format=JSON"
      );
      const json = await request.json();
      const eq1 = json.records.Earthquake[0];
      const request2 = await fetch(
        "https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0016-001?Authorization=rdec-key-123-45678-011121314&limit=1&format=JSON"
      );
      const json2 = await request2.json();
      const eq2 = json2.records.Earthquake[0];
      var eq =
        moment(eq1.EarthquakeInfo.OriginTime).unix() <
        moment(eq2.EarthquakeInfo.OriginTime).unix()
          ? eq2
          : eq1;
      let biggestinte = [];
      for (const area in eq.Intensity.ShakingArea) {
        if (area.AreaDesc || area.AreaDesc?.startsWith("最大震度")) {
          biggestinte.push(`${area.CountyName}最大${area.AreaIntensity}`);
        }
      }
      const interesult = biggestinte.join("\n");
      const message = `讀到的地震資訊:
描述文字: ${eq.ReportContent}
報告連結: ${eq.Web}
地震編號: ${
        eq.EarthquakeNo != (new Date().getFullYear() - 1911) * 1000
          ? String(eq.EarthquakeNo)
          : "無，小區域有感地震"
      }
時間: ${eq.EarthquakeInfo.OriginTime}
深度: ${eq.EarthquakeInfo.FocalDepth}km
芮氏規模: ${eq.EarthquakeInfo.EarthquakeMagnitude.MagnitudeValue}
震央Google地圖連結: https://www.google.com/maps/search/?api=1&query=${
        eq.EarthquakeInfo.Epicenter.EpicenterLatitude
      },${eq.EarthquakeInfo.Epicenter.EpicenterLongitude}
報告圖片連結: ${eq.ReportImageURI}
`;
      resolve({
        name: "LatestEarthquake",
        response: { message },
      });
    });
  },
  major: async (args) => {
    return new Promise(async (resolve, reject) => {
      const request = await fetch(
        "https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0015-001?Authorization=rdec-key-123-45678-011121314&limit=1&format=JSON"
      );
      const json = await request.json();
      const eq = json.records.Earthquake[0];
      let biggestinte = [];
      for (const area in eq.Intensity.ShakingArea) {
        if (area.AreaDesc || area.AreaDesc?.startsWith("最大震度")) {
          biggestinte.push(`${area.CountyName}最大${area.AreaIntensity}`);
        }
      }
      const interesult = biggestinte.join("\n");
      const message = `讀到的地震資訊:
描述文字: ${eq.ReportContent}
報告連結: ${eq.Web}
地震編號: ${eq.EarthquakeNo}
時間: ${eq.EarthquakeInfo.OriginTime}
深度: ${eq.EarthquakeInfo.FocalDepth}km
芮氏規模: ${eq.EarthquakeInfo.EarthquakeMagnitude.MagnitudeValue}
震央Google地圖連結: https://www.google.com/maps/search/?api=1&query=${eq.EarthquakeInfo.Epicenter.EpicenterLatitude},${eq.EarthquakeInfo.Epicenter.EpicenterLongitude}
報告圖片連結: ${eq.ReportImageURI}
`;
      resolve({
        name: "LatestMajorEarthquake",
        response: { message },
      });
    });
  },
  local: async (args) => {
    return new Promise(async (resolve, reject) => {
      const request = await fetch(
        "https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0016-001?Authorization=rdec-key-123-45678-011121314&limit=1&format=JSON"
      );
      const json = await request.json();
      const eq = json.records.Earthquake[0];
      let biggestinte = [];
      for (const area in eq.Intensity.ShakingArea) {
        if (area.AreaDesc || area.AreaDesc?.startsWith("最大震度")) {
          biggestinte.push(`${area.CountyName}最大${area.AreaIntensity}`);
        }
      }
      const interesult = biggestinte.join("\n");
      const message = `讀到的地震資訊:
描述文字: ${eq.ReportContent}
報告連結: ${eq.Web}
地震編號: 無，小區域有感地震
時間: ${eq.EarthquakeInfo.OriginTime}
深度: ${eq.EarthquakeInfo.FocalDepth}km
芮氏規模: ${eq.EarthquakeInfo.EarthquakeMagnitude.MagnitudeValue}
震央Google地圖連結: https://www.google.com/maps/search/?api=1&query=${eq.EarthquakeInfo.Epicenter.EpicenterLatitude},${eq.EarthquakeInfo.Epicenter.EpicenterLongitude}
報告圖片連結: ${eq.ReportImageURI}
`;
      resolve({
        name: "LatestLocalEarthquake",
        response: { message },
      });
    });
  },
  id: async (args) => {
    return new Promise(async (resolve, reject) => {
      const request = await fetch(
        "https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0015-001?Authorization=rdec-key-123-45678-011121314&format=JSON"
      );
      const json = await request.json();
      const filtered = json.records.Earthquake.filter((a) => {
        return a.EarthquakeNo == args.id;
      });
      if (!filtered[0])
        return resolve({
          name: "GetEarthquakeByID",
          response: { message: "找不到該地震，可能發生時間過久或不存在？" },
        });
      const eq = filtered[0];
      let biggestinte = [];
      for (const area in eq.Intensity.ShakingArea) {
        if (area.AreaDesc || area.AreaDesc?.startsWith("最大震度")) {
          biggestinte.push(`${area.CountyName}最大${area.AreaIntensity}`);
        }
      }
      const interesult = biggestinte.join("\n");
      const message = `讀到的地震資訊:
描述文字: ${eq.ReportContent}
報告連結: ${eq.Web}
地震編號: ${eq.EarthquakeNo}
時間: ${eq.EarthquakeInfo.OriginTime}
深度: ${eq.EarthquakeInfo.FocalDepth}km
芮氏規模: ${eq.EarthquakeInfo.EarthquakeMagnitude.MagnitudeValue}
震央Google地圖連結: https://www.google.com/maps/search/?api=1&query=${eq.EarthquakeInfo.Epicenter.EpicenterLatitude},${eq.EarthquakeInfo.Epicenter.EpicenterLongitude}
報告圖片連結: ${eq.ReportImageURI}
`;
      resolve({
        name: "GetEarthquakeByID",
        response: { message },
      });
    });
  },
};
