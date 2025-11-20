// news.js — versi bypass Cloudflare menggunakan cloudscraper
// ----------------------------------------------------------
// Install:
//   npm install cloudscraper cheerio
// ----------------------------------------------------------

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

// --------------------------------------------------------------------

const defaultHeaders = {
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://google.com/",
};

// Fetch wrapper menggunakan cloudscraper
const fetchWithCloudscraper = async (url, retries = 3) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await cloudscraper.get({
        uri: url,
        headers: {
          ...defaultHeaders,
          "User-Agent": randomUserAgent(),
        },
        gzip: true,
      });
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Retry (${i + 1}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw new Error(`Gagal fetch: ${lastError.message}`);
};

// ===================== FETCH LIST =====================

const fetchNewsData = async () => {
  const url = "https://jkt48.com/news/list?lang=id";
  return await fetchWithCloudscraper(url);
};

// ===================== PARSE LIST =====================

const parseNewsData = (html) => {
  const $ = cheerio.load(html);
  const list = [];

  $(".entry-news__list").each((index, el) => {
    const item = $(el);

    const badge = item.find(".entry-news__list--label img").attr("src");
    const title = item.find(".entry-news__list--item h3").text().trim();
    const waktu = item.find(".entry-news__list--item time").text().trim();
    const href = item.find(".entry-news__list--item h3 a").attr("href");

    if (!href) return;

    const berita_id = href.replace("/news/detail/id/", "").replace("?lang=id", "");

    list.push({
      index,
      judul: title,
      waktu,
      berita_id,
      badge_url: badge ? "https://jkt48.com" + badge : null,
      source_url: "https://jkt48.com" + href,
      detail: null, // default null
    });
  });

  return { berita: list };
};

// ===================== FETCH DETAIL =====================
// Sesuai struktur respon.json yang kamu upload

const fetchNewsDetail = async (berita_id) => {
  const url = `https://jkt48.com/news/detail/id/${berita_id}?lang=id`;

  try {
    const html = await fetchWithCloudscraper(url);
    const $ = cheerio.load(html);

    const root = $(".entry-news__detail");

    if (root.length === 0) {
      console.error("❌ '.entry-news__detail' tidak ditemukan.");
      return null;
    }

    // Title
    const title = root.find("h3").first().text().trim();

    // Date
    const date = root.find(".metadata2").first().text().trim();

    // URL
    const fullUrl = url;

    // ===================== PARAGRAPH =====================
    const paragraphs = [];
    root.find("p").each((i, el) => {
      const t = $(el).text().trim();
      if (t) paragraphs.push(t);
    });

    const detailText = paragraphs.join("\n\n");

    // ===================== IMAGES =====================
    const images = [];
    root.find("img").each((i, img) => {
      let src = $(img).attr("src");
      if (!src) return;
      if (!src.startsWith("http")) src = "https://jkt48.com" + src;
      images.push(src);
    });

    // ===================== FINAL FORMAT =====================
    return {
      id: berita_id,
      title: title,
      url: fullUrl,
      date: date,
      detail: detailText,
      image: images,
    };

  } catch (err) {
    console.error(`❌ Detail error (${berita_id}):`, err.message);
    return null;
  }
};

// ===================== EXPORT =====================

module.exports = {
  fetchNewsData,
  parseNewsData,
  fetchNewsDetail,
};
