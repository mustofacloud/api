// theater.js — versi bypass Cloudflare dengan cloudscraper
// ---------------------------------------------
// Install dulu:
//   npm install cloudscraper cheerio
// ---------------------------------------------

const cloudscraper = require("cloudscraper");
const cheerio = require("cheerio");

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
];

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const defaultHeaders = {
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://google.com/",
};

/**
 * Ambil HTML dengan cloudscraper, otomatis retry dan User-Agent acak
 */
const fetchWithCloudscraper = async (url, retries = 3) => {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const html = await cloudscraper.get({
        uri: url,
        headers: {
          ...defaultHeaders,
          "User-Agent": randomUserAgent(),
        },
        gzip: true,
      });
      return html;
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️ Gagal fetch (${i + 1}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Gagal ambil data dari ${url}: ${lastErr.message}`);
};

/**
 * Fungsi utama untuk mengambil HTML jadwal teater
 */
const fetchData = async () => {
  const url = "https://jkt48.com/theater/schedule";
  try {
    const html = await fetchWithCloudscraper(url);
    return html;
  } catch (error) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

/**
 * Parse data jadwal teater dari HTML
 */
const parseData = (html) => {
  const $ = cheerio.load(html);

  // Target table
  const table = $(
    "body > div.container > div.row > div > div > div:nth-child(5) > div.table-responsive.table-pink__scroll table"
  );

  const scheduleData = [];

  table.find("tbody tr").each((index, element) => {
    const showInfoFull = $(element).find("td:nth-child(1)").text().trim();
    const setlist = $(element).find("td:nth-child(2)").text().trim();
    const members = $(element)
      .find("td:nth-child(3) a")
      .map((i, el) => $(el).text().trim())
      .get();
    const birthdayMembers = $(element)
      .find('a[style="color:#616D9D"]')
      .map((i, el) => $(el).text().trim())
      .get();

    if (showInfoFull.includes("Show")) {
      const showInfo = parseShowInfo(showInfoFull);
      scheduleData.push({
        showInfo,
        setlist,
        birthdayMembers,
        members,
      });
    } else {
      scheduleData.push({
        showInfo: showInfoFull,
        setlist,
        birthdayMembers,
        members: [],
      });
    }
  });

  return scheduleData;
};

/**
 * Ekstraksi tanggal & waktu dari teks jadwal
 */
const parseShowInfo = (showInfoFull) => {
  const regex = /(\w+), (\d{1,2}\.\d{1,2}\.\d{4})Show (\d{1,2}:\d{2})/;
  const match = showInfoFull.match(regex);
  if (match) {
    const day = match[1];
    const date = match[2];
    const time = match[3];
    return `${day}, ${date} ${time}`;
  }
  return showInfoFull;
};

module.exports = { fetchData, parseData, parseShowInfo };
